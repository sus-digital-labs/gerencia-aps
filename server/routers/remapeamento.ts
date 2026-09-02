// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  territorios, areas, acsPerfil, microareas, familias, cidadaos,
  redistribuicaoLogs, transferenciaSolicitacoes, transferenciaMensagens,
  configuracaoTerritorio
} from "../../drizzle/schema";
import { eq, and, isNull, sql, desc, asc } from "drizzle-orm";
import { queryPEC } from "../pec-db";
import { notifyOwner } from "../_core/notification";

// ============================================================
// CONSTANTES - Limites PNAB (Portaria 2.436/2017)
// ============================================================
const LIMITE_PNAB_DEFAULT = {
  MAX_FAMILIAS_POR_ACS: 150,
  MAX_CIDADAOS_POR_ACS: 750,
};

// Coordenadas de Barra do Choça - BA
const BARRA_DO_CHOCA = { lat: -14.8619, lng: -40.5736 };

// Cores para microáreas
const CORES_MICROAREAS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#F43F5E", "#A855F7", "#22C55E", "#EAB308",
  "#0EA5E9", "#D946EF", "#FB923C", "#4ADE80", "#FACC15",
];

// ============================================================
// ALGORITMOS GEOESPACIAIS
// ============================================================

/** Distância haversine em km entre dois pontos */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** K-Means++ geográfico para clustering de pontos */
function kMeansPP(pontos: Array<{ lat: number; lng: number; id: number }>, k: number): number[] {
  if (pontos.length === 0 || k <= 0) return [];
  if (pontos.length <= k) return pontos.map((_, i) => i);

  // Inicialização K-Means++
  const centroides: Array<{ lat: number; lng: number }> = [];
  const primeiroIdx = Math.floor(Math.random() * pontos.length);
  centroides.push({ lat: pontos[primeiroIdx].lat, lng: pontos[primeiroIdx].lng });

  for (let i = 1; i < k; i++) {
    const distancias = pontos.map((p) => {
      const minDist = Math.min(
        ...centroides.map((c) => haversineKm(p.lat, p.lng, c.lat, c.lng))
      );
      return minDist * minDist;
    });
    const totalDist = distancias.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    let idx = 0;
    for (let j = 0; j < distancias.length; j++) {
      r -= distancias[j];
      if (r <= 0) { idx = j; break; }
    }
    centroides.push({ lat: pontos[idx].lat, lng: pontos[idx].lng });
  }

  // Iterações K-Means
  let clusters = new Array(pontos.length).fill(0);
  for (let iter = 0; iter < 100; iter++) {
    const novosClusters = pontos.map((p) => {
      let minDist = Infinity;
      let cluster = 0;
      centroides.forEach((c, i) => {
        const dist = haversineKm(p.lat, p.lng, c.lat, c.lng);
        if (dist < minDist) { minDist = dist; cluster = i; }
      });
      return cluster;
    });
    if (JSON.stringify(novosClusters) === JSON.stringify(clusters)) break;
    clusters = novosClusters;
    for (let i = 0; i < k; i++) {
      const pts = pontos.filter((_, idx) => clusters[idx] === i);
      if (pts.length > 0) {
        centroides[i] = {
          lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
          lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
        };
      }
    }
  }
  return clusters;
}

/** Convex hull de pontos (algoritmo de Graham scan) */
function convexHull(pontos: Array<{ lat: number; lng: number }>): Array<{ lat: number; lng: number }> {
  if (pontos.length < 3) return pontos;
  const sorted = [...pontos].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (o: any, a: any, b: any) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const lower: any[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: any[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Gerar polígono GeoJSON a partir de pontos */
function gerarPoligonoGeoJSON(pontos: Array<{ lat: number; lng: number }>): string {
  if (pontos.length === 0) return JSON.stringify({ type: "Polygon", coordinates: [[]] });
  const hull = convexHull(pontos);
  if (hull.length < 3) {
    // Criar buffer artificial de 200m ao redor do centróide
    const centLat = pontos.reduce((s, p) => s + p.lat, 0) / pontos.length;
    const centLng = pontos.reduce((s, p) => s + p.lng, 0) / pontos.length;
    const delta = 0.002;
    const coords = [
      [centLng - delta, centLat - delta],
      [centLng + delta, centLat - delta],
      [centLng + delta, centLat + delta],
      [centLng - delta, centLat + delta],
      [centLng - delta, centLat - delta],
    ];
    return JSON.stringify({ type: "Polygon", coordinates: [coords] });
  }
  const coords = hull.map((p) => [p.lng, p.lat]);
  coords.push(coords[0]); // fechar polígono
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

/** Calcular área aproximada de polígono em km² (fórmula de Shoelace) */
function calcularAreaKm2(pontos: Array<{ lat: number; lng: number }>): number {
  if (pontos.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pontos.length; i++) {
    const j = (i + 1) % pontos.length;
    area += pontos[i].lng * pontos[j].lat;
    area -= pontos[j].lng * pontos[i].lat;
  }
  // Converter graus² para km² (aproximação)
  return Math.abs(area / 2) * 111.32 * 111.32;
}

/** Resolver geocodificação via Google Maps API (proxy Manus) */
async function geocodificarEndereco(endereco: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco + ", Barra do Choça, BA, Brasil")}&key=PROXY`;
    // Usar o proxy interno do Manus para Google Maps
    const response = await fetch(
      `https://maps-proxy.manus.computer/maps/api/geocode/json?address=${encodeURIComponent(endereco + ", Barra do Choça, BA, Brasil")}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// ROUTER PRINCIPAL
// ============================================================

export const remapeamentoRouter = router({

  // ─────────────────────────────────────────────────────────
  // CONFIGURAÇÃO DO MUNICÍPIO
  // ─────────────────────────────────────────────────────────

  /** Buscar configuração do território municipal */
  getConfiguracao: publicProcedure.query(async () => {
    const db = getDb();
    const config = await db.select().from(configuracaoTerritorio).limit(1);
    if (config.length > 0) return config[0];
    // Retornar configuração padrão para Barra do Choça
    return {
      id: null,
      codigoIbge: "2903201",
      nomeMunicipio: "Barra do Choça",
      limiteFamiliasPorAcs: 150,
      limiteCidadaosPorAcs: 750,
      latCentro: BARRA_DO_CHOCA.lat,
      lngCentro: BARRA_DO_CHOCA.lng,
      zoomInicial: 13,
    };
  }),

  /** Salvar configuração do território */
  salvarConfiguracao: protectedProcedure
    .input(z.object({
      codigoIbge: z.string().optional(),
      nomeMunicipio: z.string().optional(),
      limiteFamiliasPorAcs: z.number().default(150),
      limiteCidadaosPorAcs: z.number().default(750),
      latCentro: z.number().optional(),
      lngCentro: z.number().optional(),
      zoomInicial: z.number().default(13),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(configuracaoTerritorio).limit(1);
      if (existing.length > 0) {
        await db.update(configuracaoTerritorio)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(configuracaoTerritorio.id, existing[0].id));
      } else {
        await db.insert(configuracaoTerritorio).values(input);
      }
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────
  // HIERARQUIA: TERRITÓRIOS, ÁREAS, ACS
  // ─────────────────────────────────────────────────────────

  /** Listar territórios com estatísticas */
  listarTerritorios: publicProcedure.query(async () => {
    const db = getDb();
    return await db.select().from(territorios).where(eq(territorios.ativo, true));
  }),

  /** Listar áreas (UBS) com estatísticas */
  listarAreas: publicProcedure
    .input(z.object({ territorioId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const query = db.select().from(areas).where(eq(areas.ativo, true));
      return await query;
    }),

  /** Listar ACS com estatísticas */
  listarAcs: publicProcedure
    .input(z.object({ areaId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      return await db.select().from(acsPerfil).where(eq(acsPerfil.ativo, true));
    }),

  // ─────────────────────────────────────────────────────────
  // MICROÁREAS
  // ─────────────────────────────────────────────────────────

  /** Listar microáreas com estatísticas e status PNAB */
  listarMicroareas: publicProcedure
    .input(z.object({
      areaId: z.number().optional(),
      acsId: z.number().optional(),
      apenasBloqueadas: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const lista = await db.select().from(microareas);
      return lista.map((m) => ({
        ...m,
        statusPnab: calcularStatusPnab(m.totalFamilias || 0, m.totalCidadaos || 0),
        percentualCapacidadeFamilias: Math.round(((m.totalFamilias || 0) / LIMITE_PNAB_DEFAULT.MAX_FAMILIAS_POR_ACS) * 100),
        percentualCapacidadeCidadaos: Math.round(((m.totalCidadaos || 0) / LIMITE_PNAB_DEFAULT.MAX_CIDADAOS_POR_ACS) * 100),
      }));
    }),

  /** Criar microárea manualmente */
  criarMicroarea: protectedProcedure
    .input(z.object({
      nome: z.string(),
      areaId: z.number().optional(),
      acsId: z.number().optional(),
      geojsonPoligono: z.string().optional(),
      cor: z.string().optional(),
      locked: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(microareas).values({
        nome: input.nome,
        areaId: input.areaId,
        acsId: input.acsId,
        geojsonPoligono: input.geojsonPoligono,
        cor: input.cor || CORES_MICROAREAS[0],
        locked: input.locked,
        geradaAutomaticamente: false,
      });
      await db.insert(redistribuicaoLogs).values({
        acao: "geracao_automatica",
        microareaDestinoId: result.insertId,
        usuarioId: ctx.user?.id,
        descricao: `Microárea "${input.nome}" criada manualmente`,
      });
      return { id: result.insertId, success: true };
    }),

  /** Atualizar microárea */
  atualizarMicroarea: protectedProcedure
    .input(z.object({
      id: z.number(),
      nome: z.string().optional(),
      acsId: z.number().optional(),
      geojsonPoligono: z.string().optional(),
      cor: z.string().optional(),
      locked: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...dados } = input;
      const anterior = await db.select().from(microareas).where(eq(microareas.id, id)).limit(1);
      await db.update(microareas).set({ ...dados, updatedAt: new Date() }).where(eq(microareas.id, id));
      if (input.locked !== undefined) {
        await db.insert(redistribuicaoLogs).values({
          acao: input.locked ? "bloqueio_microarea" : "desbloqueio_microarea",
          microareaDestinoId: id,
          usuarioId: ctx.user?.id,
          descricao: `Microárea ${input.locked ? "bloqueada" : "desbloqueada"}`,
          dadosAnteriores: JSON.stringify(anterior[0]),
        });
      }
      return { success: true };
    }),

  /** Toggle campo locked de microárea */
  toggleLocked: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [m] = await db.select().from(microareas).where(eq(microareas.id, input.id)).limit(1);
      if (!m) throw new Error("Microárea não encontrada");
      const novoLocked = !m.locked;
      await db.update(microareas).set({ locked: novoLocked, updatedAt: new Date() }).where(eq(microareas.id, input.id));
      await db.insert(redistribuicaoLogs).values({
        acao: novoLocked ? "bloqueio_microarea" : "desbloqueio_microarea",
        microareaDestinoId: input.id,
        usuarioId: ctx.user?.id,
        descricao: `Microárea "${m.nome}" ${novoLocked ? "bloqueada" : "desbloqueada"}`,
      });
      return { locked: novoLocked, success: true };
    }),

  /** Deletar microárea */
  deletarMicroarea: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(microareas).where(eq(microareas.id, input.id));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────
  // FAMÍLIAS (entidade unificada família+domicílio)
  // ─────────────────────────────────────────────────────────

  /** Listar famílias de uma microárea com filtros */
  listarFamilias: publicProcedure
    .input(z.object({
      microareaId: z.number().optional(),
      apenasSemCoordenada: z.boolean().optional(),
      temCrianca: z.boolean().optional(),
      temIdoso: z.boolean().optional(),
      temGestante: z.boolean().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select().from(familias);
      if (input.microareaId) {
        query = query.where(eq(familias.microareaId, input.microareaId));
      }
      return await query.limit(input.limit).offset(input.offset);
    }),

  /** Transferir família para outra microárea */
  transferirFamilia: protectedProcedure
    .input(z.object({
      familiaId: z.number(),
      microareaDestinoId: z.number(),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [familia] = await db.select().from(familias).where(eq(familias.id, input.familiaId)).limit(1);
      if (!familia) throw new Error("Família não encontrada");

      const microareaOrigem = familia.microareaId;
      await db.update(familias)
        .set({ microareaId: input.microareaDestinoId, updatedAt: new Date() })
        .where(eq(familias.id, input.familiaId));

      // Atualizar contadores
      if (microareaOrigem) {
        await db.execute(sql`
          UPDATE microareas SET totalFamilias = totalFamilias - 1,
          totalCidadaos = totalCidadaos - ${familia.totalCidadaos || 0}
          WHERE id = ${microareaOrigem}
        `);
      }
      await db.execute(sql`
        UPDATE microareas SET totalFamilias = totalFamilias + 1,
        totalCidadaos = totalCidadaos + ${familia.totalCidadaos || 0}
        WHERE id = ${input.microareaDestinoId}
      `);

      // Log de auditoria
      await db.insert(redistribuicaoLogs).values({
        acao: "transferencia_familia",
        microareaOrigemId: microareaOrigem,
        microareaDestinoId: input.microareaDestinoId,
        familiaId: input.familiaId,
        usuarioId: ctx.user?.id,
        descricao: input.motivo || `Família transferida manualmente`,
        dadosAnteriores: JSON.stringify({ microareaId: microareaOrigem }),
        dadosNovos: JSON.stringify({ microareaId: input.microareaDestinoId }),
      });

      // Notificar ACS da microárea de destino
      let notificacaoEnviada = false;
      try {
        const [microareaDestino] = await db.select().from(microareas)
          .where(eq(microareas.id, input.microareaDestinoId)).limit(1);
        const [microareaOrigemData] = microareaOrigem
          ? await db.select().from(microareas).where(eq(microareas.id, microareaOrigem)).limit(1)
          : [null as typeof microareas.$inferSelect | null];

        if (microareaDestino?.acsId) {
          const [acsDestino] = await db.select().from(acsPerfil)
            .where(eq(acsPerfil.id, microareaDestino.acsId)).limit(1);

          if (acsDestino) {
            const nomeAcs = acsDestino.nomeCompleto || 'ACS';
            const nomeOrigem = microareaOrigemData?.nome || 'outra microárea';
            const nomeDestino = microareaDestino.nome || `Microárea ${input.microareaDestinoId}`;
            const endFamilia = (familia as any).enderecoCompleto || (familia as any).logradouro || 'Endereço não informado';
            const totalPessoas = familia.totalCidadaos || 0;

            await notifyOwner({
              title: `Nova família adicionada à microárea ${nomeDestino} — ACS ${nomeAcs}`,
              content: [
                `Olá, ${nomeAcs}!`,
                ``,
                `Uma família foi transferida para a sua microárea **${nomeDestino}**.`,
                ``,
                `**Detalhes da transferência:**`,
                `- Endereço: ${endFamilia}`,
                `- Cidadãos: ${totalPessoas} pessoa(s)`,
                `- Origem: ${nomeOrigem}`,
                `- Responsável: ${ctx.user?.name || 'Sistema'}`,
                `- Data/hora: ${new Date().toLocaleString('pt-BR')}`,
                ``,
                `Acesse o Remapeamento Inteligente para visualizar sua microárea atualizada.`,
              ].join('\n'),
            });
            notificacaoEnviada = true;
          }
        }
      } catch (notifErr) {
        // Não falhar a transferência se a notificação falhar
        console.warn('[remapeamento] Falha ao enviar notificação ao ACS:', notifErr);
      }

      return { success: true, notificacaoEnviada };
    }),

  // ─────────────────────────────────────────────────────────
  // PIPELINE DE INGESTÃO E GEOCODIFICAÇÃO
  // ─────────────────────────────────────────────────────────

  /** Importar dados do PEC: cidadãos, famílias, ACS, UBS */
  importarDadosPEC: protectedProcedure
    .input(z.object({
      limite: z.number().default(500),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const resultado = { familias: 0, cidadaos: 0, acs: 0, erros: [] as string[] };

      try {
        // Importar ACS do PEC
        const acsQuery = await queryPEC(`
          SELECT DISTINCT
            p.no_profissional as nome,
            p.nu_cns as cns,
            p.nu_cpf_profissional as cpf,
            ubs.nu_cnes as cnes,
            eq.nu_ine as ine
          FROM tb_profissional p
          LEFT JOIN tb_equipe eq ON eq.co_seq_equipe = p.co_equipe
          LEFT JOIN tb_unidade_saude ubs ON ubs.co_seq_cnes = eq.co_unidade_saude
          WHERE p.no_profissional IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM tb_cbo c WHERE c.co_cbo = p.co_cbo AND c.no_cbo ILIKE '%agente comunitário%'
          )
          LIMIT 50
        `);

        for (const acs of (acsQuery || [])) {
          try {
            await db.insert(acsPerfil).values({
              nome: acs.nome,
              cns: acs.cns,
              cpf: acs.cpf,
              cnes: acs.cnes,
              ine: acs.ine,
            }).onDuplicateKeyUpdate({ set: { nome: acs.nome } });
            resultado.acs++;
          } catch (e) {
            resultado.erros.push(`ACS ${acs.nome}: ${e.message}`);
          }
        }

        // Importar famílias do PEC (tb_cds_cad_individual)
        const familiasQuery = await queryPEC(`
          SELECT
            f.co_fat_cidadao_pec as co_familia,
            f.nu_prontuario as co_prontuario,
            COALESCE(f.no_mae_cidadao, f.no_cidadao) as nome_responsavel,
            f.nu_cns as cns_responsavel,
            e.ds_logradouro as logradouro,
            e.nu_numero as numero,
            e.ds_complemento as complemento,
            e.no_bairro as bairro,
            e.nu_cep as cep,
            e.st_geo_referenciado as geo_ref,
            e.nu_latitude as lat,
            e.nu_longitude as lng
          FROM tb_fat_cidadao_pec f
          LEFT JOIN tb_endereco e ON e.co_cidadao = f.co_cidadao
          WHERE f.st_ativo = true
          LIMIT ${input.limite}
        `);

        for (const fam of (familiasQuery || [])) {
          try {
            const enderecoCompleto = [
              fam.logradouro, fam.numero, fam.complemento,
              fam.bairro, "Barra do Choça - BA"
            ].filter(Boolean).join(", ");

            const lat = fam.lat ? parseFloat(fam.lat) : null;
            const lng = fam.lng ? parseFloat(fam.lng) : null;

            await db.insert(familias).values({
              coFamilia: String(fam.co_familia || ""),
              coProntuario: String(fam.co_prontuario || ""),
              nomeResponsavel: fam.nome_responsavel,
              cnsResponsavel: fam.cns_responsavel,
              logradouro: fam.logradouro,
              numero: fam.numero,
              complemento: fam.complemento,
              bairro: fam.bairro,
              cep: fam.cep,
              municipio: "Barra do Choça",
              uf: "BA",
              enderecoCompleto,
              lat: lat ? String(lat) : null,
              lng: lng ? String(lng) : null,
              geocodificado: !!(lat && lng),
              fonteCoordenada: lat && lng ? "familia" : "geocodificado",
            });
            resultado.familias++;
          } catch (e) {
            resultado.erros.push(`Família ${fam.co_familia}: ${e.message}`);
          }
        }

      } catch (e) {
        resultado.erros.push(`Erro geral: ${e.message}`);
      }

      return resultado;
    }),

  /** Status da geocodificação */
  statusGeocodificacao: publicProcedure.query(async () => {
    const db = getDb();
    const total = await db.execute(sql`SELECT COUNT(*) as total FROM familias`);
    const geocodificadas = await db.execute(sql`SELECT COUNT(*) as total FROM familias WHERE geocodificado = true`);
    const semCoordenada = await db.execute(sql`SELECT COUNT(*) as total FROM familias WHERE geocodificado = false AND enderecoCompleto IS NOT NULL`);

    const totalNum = Number(total[0]?.[0]?.total || 0);
    const geocodNum = Number(geocodificadas[0]?.[0]?.total || 0);
    const semCoordNum = Number(semCoordenada[0]?.[0]?.total || 0);

    return {
      total: totalNum,
      geocodificadas: geocodNum,
      pendentes: semCoordNum,
      percentual: totalNum > 0 ? Math.round((geocodNum / totalNum) * 100) : 0,
    };
  }),

  /** Geocodificar famílias sem coordenadas (lote) */
  geocodificarFamilias: protectedProcedure
    .input(z.object({ limite: z.number().default(10) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const semCoordenada = await db.select().from(familias)
        .where(and(eq(familias.geocodificado, false)))
        .limit(input.limite);

      let geocodificadas = 0;
      let falhas = 0;

      for (const familia of semCoordenada) {
        if (!familia.enderecoCompleto) { falhas++; continue; }
        const coords = await geocodificarEndereco(familia.enderecoCompleto);
        if (coords) {
          await db.update(familias).set({
            lat: String(coords.lat),
            lng: String(coords.lng),
            geocodificado: true,
            geocodificadoEm: new Date(),
            fonteCoordenada: "geocodificado",
            updatedAt: new Date(),
          }).where(eq(familias.id, familia.id));
          geocodificadas++;
        } else {
          falhas++;
        }
      }

      // Herdar coordenadas para cidadãos sem lat/lng
      await db.execute(sql`
        UPDATE cidadaos_territorio c
        JOIN familias f ON c.familiaId = f.id
        SET c.latEfetivo = f.lat, c.lngEfetivo = f.lng, c.coordenadaHerdada = true
        WHERE c.lat IS NULL AND f.lat IS NOT NULL
      `);

      return { geocodificadas, falhas, total: semCoordenada.length };
    }),

  /** Herdar coordenadas da família para cidadãos sem lat/lng */
  herdarCoordenadas: protectedProcedure.mutation(async () => {
    const db = getDb();
    // Cidadãos com coordenadas próprias: usar as próprias
    await db.execute(sql`
      UPDATE cidadaos_territorio
      SET latEfetivo = lat, lngEfetivo = lng, coordenadaHerdada = false
      WHERE lat IS NOT NULL AND lng IS NOT NULL
    `);
    // Cidadãos sem coordenadas: herdar da família
    await db.execute(sql`
      UPDATE cidadaos_territorio c
      JOIN familias f ON c.familiaId = f.id
      SET c.latEfetivo = f.lat, c.lngEfetivo = f.lng, c.coordenadaHerdada = true
      WHERE c.lat IS NULL AND f.lat IS NOT NULL
    `);
    const resultado = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN coordenadaHerdada = false THEN 1 ELSE 0 END) as proprias,
        SUM(CASE WHEN coordenadaHerdada = true THEN 1 ELSE 0 END) as herdadas
      FROM cidadaos_territorio WHERE latEfetivo IS NOT NULL
    `);
    return resultado[0]?.[0] || { total: 0, proprias: 0, herdadas: 0 };
  }),

  // ─────────────────────────────────────────────────────────
  // MOTOR DE REDISTRIBUIÇÃO INTELIGENTE
  // ─────────────────────────────────────────────────────────

  /** Gerar microáreas automaticamente via K-Means++ */
  gerarMicroareasAutomatico: protectedProcedure
    .input(z.object({
      quantidadeMicroareas: z.number().min(1).max(50),
      areaId: z.number().optional(),
      respeitarLocked: z.boolean().default(true),
      limparExistentes: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Buscar famílias com coordenadas
      const familiasComCoord = await db.select({
        id: familias.id,
        lat: familias.lat,
        lng: familias.lng,
        totalCidadaos: familias.totalCidadaos,
        microareaId: familias.microareaId,
      }).from(familias)
        .where(sql`familias.lat IS NOT NULL AND familias.lng IS NOT NULL`);

      if (familiasComCoord.length === 0) {
        throw new Error("Nenhuma família com coordenadas encontrada. Execute a geocodificação primeiro.");
      }

      // Filtrar famílias de microáreas bloqueadas (se respeitarLocked)
      let familiasParaCluster = familiasComCoord;
      if (input.respeitarLocked) {
        const microareasBloqueadas = await db.select({ id: microareas.id })
          .from(microareas).where(eq(microareas.locked, true));
        const idsBloqueados = new Set(microareasBloqueadas.map((m) => m.id));
        familiasParaCluster = familiasComCoord.filter(
          (f) => !f.microareaId || !idsBloqueados.has(f.microareaId)
        );
      }

      const pontos = familiasParaCluster.map((f) => ({
        id: f.id,
        lat: parseFloat(String(f.lat)),
        lng: parseFloat(String(f.lng)),
        totalCidadaos: f.totalCidadaos || 1,
      }));

      // Executar K-Means++
      const clusters = kMeansPP(pontos, input.quantidadeMicroareas);

      // Limpar microáreas não bloqueadas se solicitado
      if (input.limparExistentes) {
        const microareasNaoBloqueadas = await db.select({ id: microareas.id })
          .from(microareas).where(eq(microareas.locked, false));
        for (const m of microareasNaoBloqueadas) {
          await db.delete(microareas).where(eq(microareas.id, m.id));
        }
      }

      // Criar microáreas por cluster
      const microareasCriadas = [];
      const config = await db.select().from(configuracaoTerritorio).limit(1);
      const limitesFamilias = config[0]?.limiteFamiliasPorAcs || LIMITE_PNAB_DEFAULT.MAX_FAMILIAS_POR_ACS;
      const limitesCidadaos = config[0]?.limiteCidadaosPorAcs || LIMITE_PNAB_DEFAULT.MAX_CIDADAOS_POR_ACS;

      for (let i = 0; i < input.quantidadeMicroareas; i++) {
        const pontosCluster = pontos.filter((_, idx) => clusters[idx] === i);
        if (pontosCluster.length === 0) continue;

        const totalFamilias = pontosCluster.length;
        const totalCidadaos = pontosCluster.reduce((s, p) => s + p.totalCidadaos, 0);
        const poligono = gerarPoligonoGeoJSON(pontosCluster);
        const areaKm2 = calcularAreaKm2(pontosCluster);
        const densidade = areaKm2 > 0 ? totalCidadaos / areaKm2 : 0;

        let status: "normal" | "excesso" | "baixa_cobertura" | "vazia" = "normal";
        if (totalFamilias > limitesFamilias || totalCidadaos > limitesCidadaos) status = "excesso";
        else if (totalFamilias < 10) status = "baixa_cobertura";

        const [result] = await db.insert(microareas).values({
          nome: `Microárea ${String(i + 1).padStart(2, "0")}`,
          codigo: `MA${String(i + 1).padStart(2, "0")}`,
          areaId: input.areaId,
          geojsonPoligono: poligono,
          cor: CORES_MICROAREAS[i % CORES_MICROAREAS.length],
          locked: false,
          totalFamilias,
          totalCidadaos,
          areaKm2: String(areaKm2.toFixed(4)),
          densidadePopulacional: String(densidade.toFixed(4)),
          status,
          geradaAutomaticamente: true,
        });

        const microareaId = result.insertId;

        // Vincular famílias à microárea
        for (const ponto of pontosCluster) {
          await db.update(familias)
            .set({ microareaId, updatedAt: new Date() })
            .where(eq(familias.id, ponto.id));
        }

        microareasCriadas.push({
          id: microareaId,
          nome: `Microárea ${String(i + 1).padStart(2, "0")}`,
          totalFamilias,
          totalCidadaos,
          status,
        });
      }

      // Log de auditoria
      await db.insert(redistribuicaoLogs).values({
        acao: "geracao_automatica",
        usuarioId: ctx.user?.id,
        descricao: `Geradas ${microareasCriadas.length} microáreas automaticamente via K-Means++ com ${familiasParaCluster.length} famílias`,
        dadosNovos: JSON.stringify({ microareas: microareasCriadas }),
      });

      return { microareas: microareasCriadas, totalFamilias: familiasParaCluster.length };
    }),

  /** Redistribuir famílias entre microáreas vizinhas */
  redistribuirFamilias: protectedProcedure
    .input(z.object({
      microareaDestinoId: z.number(),
      quantidadeFamilias: z.number().min(1),
      respeitarLocked: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [destino] = await db.select().from(microareas)
        .where(eq(microareas.id, input.microareaDestinoId)).limit(1);
      if (!destino) throw new Error("Microárea destino não encontrada");

      // Buscar microáreas vizinhas (não bloqueadas)
      const vizinhas = await db.select().from(microareas)
        .where(and(
          input.respeitarLocked ? eq(microareas.locked, false) : sql`1=1`,
          sql`microareas.id != ${input.microareaDestinoId}`,
          sql`microareas.totalFamilias > 0`
        ));

      if (vizinhas.length === 0) throw new Error("Nenhuma microárea vizinha disponível para redistribuição");

      // Calcular centróide do destino
      const familiasDestino = await db.select({ lat: familias.lat, lng: familias.lng })
        .from(familias).where(eq(familias.microareaId, input.microareaDestinoId));
      const centLat = familiasDestino.length > 0
        ? familiasDestino.reduce((s, f) => s + parseFloat(String(f.lat || 0)), 0) / familiasDestino.length
        : BARRA_DO_CHOCA.lat;
      const centLng = familiasDestino.length > 0
        ? familiasDestino.reduce((s, f) => s + parseFloat(String(f.lng || 0)), 0) / familiasDestino.length
        : BARRA_DO_CHOCA.lng;

      // Algoritmo proporcional: redistribuir proporcionalmente à população e distância
      const totalPopVizinhas = vizinhas.reduce((s, v) => s + (v.totalFamilias || 0), 0);
      let familiasTransferidas = 0;

      for (const vizinha of vizinhas) {
        const share = (vizinha.totalFamilias || 0) / totalPopVizinhas;
        const qtdTransferir = Math.round(input.quantidadeFamilias * share);
        if (qtdTransferir === 0) continue;

        // Buscar famílias mais próximas do destino
        const familiasVizinha = await db.select()
          .from(familias)
          .where(and(
            eq(familias.microareaId, vizinha.id),
            sql`familias.lat IS NOT NULL`
          ))
          .limit(qtdTransferir * 3);

        // Ordenar por distância ao centróide do destino
        const ordenadas = familiasVizinha
          .map((f) => ({
            ...f,
            distancia: haversineKm(
              parseFloat(String(f.lat || 0)), parseFloat(String(f.lng || 0)),
              centLat, centLng
            ),
          }))
          .sort((a, b) => a.distancia - b.distancia)
          .slice(0, qtdTransferir);

        for (const fam of ordenadas) {
          await db.update(familias)
            .set({ microareaId: input.microareaDestinoId, updatedAt: new Date() })
            .where(eq(familias.id, fam.id));
          familiasTransferidas++;
        }

        // Atualizar contadores
        await db.execute(sql`
          UPDATE microareas SET totalFamilias = totalFamilias - ${ordenadas.length} WHERE id = ${vizinha.id}
        `);
      }

      // Atualizar contador do destino
      await db.execute(sql`
        UPDATE microareas SET totalFamilias = totalFamilias + ${familiasTransferidas} WHERE id = ${input.microareaDestinoId}
      `);

      // Log
      await db.insert(redistribuicaoLogs).values({
        acao: "redistribuicao_automatica",
        microareaDestinoId: input.microareaDestinoId,
        usuarioId: ctx.user?.id,
        descricao: `Redistribuídas ${familiasTransferidas} famílias para microárea "${destino.nome}"`,
      });

      return { familiasTransferidas, success: true };
    }),

  // ─────────────────────────────────────────────────────────
  // AUDITORIA E SOLICITAÇÕES DE TRANSFERÊNCIA
  // ─────────────────────────────────────────────────────────

  /** Listar logs de redistribuição */
  listarLogs: publicProcedure
    .input(z.object({
      microareaId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      return await db.select().from(redistribuicaoLogs)
        .orderBy(desc(redistribuicaoLogs.createdAt))
        .limit(input.limit);
    }),

  /** Criar solicitação de transferência entre ACS */
  criarSolicitacao: protectedProcedure
    .input(z.object({
      microareaOrigemId: z.number(),
      microareaDestinoId: z.number(),
      familiaId: z.number().optional(),
      motivo: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(transferenciaSolicitacoes).values({
        microareaOrigemId: input.microareaOrigemId,
        microareaDestinoId: input.microareaDestinoId,
        familiaId: input.familiaId,
        motivo: input.motivo,
        status: "pendente",
        solicitanteId: ctx.user?.id,
      });
      return { id: result.insertId, success: true };
    }),

  /** Listar solicitações de transferência */
  listarSolicitacoes: publicProcedure
    .input(z.object({
      status: z.enum(["pendente", "aceita", "negada", "em_discussao", "cancelada"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select().from(transferenciaSolicitacoes)
        .orderBy(desc(transferenciaSolicitacoes.createdAt));
      return await query.limit(100);
    }),

  /** Responder solicitação (aceitar/negar/discutir) */
  responderSolicitacao: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["aceita", "negada", "em_discussao"]),
      motivo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [solicitacao] = await db.select().from(transferenciaSolicitacoes)
        .where(eq(transferenciaSolicitacoes.id, input.id)).limit(1);
      if (!solicitacao) throw new Error("Solicitação não encontrada");

      await db.update(transferenciaSolicitacoes).set({
        status: input.status,
        respostaMotivo: input.motivo,
        aprovadorId: ctx.user?.id,
        updatedAt: new Date(),
      }).where(eq(transferenciaSolicitacoes.id, input.id));

      // Se aceita, executar transferência
      if (input.status === "aceita" && solicitacao.familiaId) {
        await db.update(familias).set({
          microareaId: solicitacao.microareaDestinoId,
          updatedAt: new Date(),
        }).where(eq(familias.id, solicitacao.familiaId));

        await db.insert(redistribuicaoLogs).values({
          acao: "transferencia_familia",
          microareaOrigemId: solicitacao.microareaOrigemId,
          microareaDestinoId: solicitacao.microareaDestinoId,
          familiaId: solicitacao.familiaId,
          usuarioId: ctx.user?.id,
          descricao: `Transferência aceita via solicitação #${input.id}`,
        });
      }

      return { success: true };
    }),

  /** Enviar mensagem em solicitação */
  enviarMensagem: protectedProcedure
    .input(z.object({
      solicitacaoId: z.number(),
      mensagem: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.insert(transferenciaMensagens).values({
        solicitacaoId: input.solicitacaoId,
        usuarioId: ctx.user?.id || 0,
        mensagem: input.mensagem,
      });
      // Atualizar status para em_discussao
      await db.update(transferenciaSolicitacoes).set({
        status: "em_discussao",
        updatedAt: new Date(),
      }).where(eq(transferenciaSolicitacoes.id, input.solicitacaoId));
      return { success: true };
    }),

  /** Listar mensagens de uma solicitação */
  listarMensagens: publicProcedure
    .input(z.object({ solicitacaoId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return await db.select().from(transferenciaMensagens)
        .where(eq(transferenciaMensagens.solicitacaoId, input.solicitacaoId))
        .orderBy(asc(transferenciaMensagens.createdAt));
    }),

  // ─────────────────────────────────────────────────────────
  // ANALYTICS E RELATÓRIOS
  // ─────────────────────────────────────────────────────────

  /** Levantamento populacional completo */
  levantamentoPopulacional: publicProcedure.query(async () => {
    const db = getDb();
    const totalFamilias = await db.execute(sql`SELECT COUNT(*) as total FROM familias`);
    const totalCidadaos = await db.execute(sql`SELECT COUNT(*) as total FROM cidadaos_territorio`);
    const totalAcs = await db.execute(sql`SELECT COUNT(*) as total FROM acs_perfil WHERE ativo = true`);
    const totalMicroareas = await db.execute(sql`SELECT COUNT(*) as total FROM microareas`);
    const microareasBloqueadas = await db.execute(sql`SELECT COUNT(*) as total FROM microareas WHERE locked = true`);
    const microareasExcesso = await db.execute(sql`SELECT COUNT(*) as total FROM microareas WHERE status = 'excesso'`);
    const geocodificadas = await db.execute(sql`SELECT COUNT(*) as total FROM familias WHERE geocodificado = true`);

    const famNum = Number(totalFamilias[0]?.[0]?.total || 0);
    const cidNum = Number(totalCidadaos[0]?.[0]?.total || 0);
    const acsNum = Number(totalAcs[0]?.[0]?.total || 0);
    const maNum = Number(totalMicroareas[0]?.[0]?.total || 0);
    const geocodNum = Number(geocodificadas[0]?.[0]?.total || 0);

    return {
      totalFamilias: famNum,
      totalCidadaos: cidNum,
      totalAcs: acsNum,
      totalMicroareas: maNum,
      microareasBloqueadas: Number(microareasBloqueadas[0]?.[0]?.total || 0),
      microareasExcesso: Number(microareasExcesso[0]?.[0]?.total || 0),
      mediaFamiliasPorAcs: acsNum > 0 ? Math.round(famNum / acsNum) : 0,
      mediaCidadaosPorAcs: acsNum > 0 ? Math.round(cidNum / acsNum) : 0,
      percentualGeocodificado: famNum > 0 ? Math.round((geocodNum / famNum) * 100) : 0,
      limitePnab: LIMITE_PNAB_DEFAULT,
    };
  }),

  /** Obter configuração de mapa */
  getMapConfig: publicProcedure.query(async () => {
    const db = getDb();
    const configs = await db.select().from(configuracaoTerritorio).limit(1);
    const cfg = configs[0];
    return {
      mapProvider: cfg?.mapProvider || "free",
      googleMapsApiKey: cfg?.googleMapsApiKey || "",
      mapTileStyle: cfg?.mapTileStyle || "carto-dark",
      latCentro: cfg?.latCentro ? Number(cfg.latCentro) : -14.8619,
      lngCentro: cfg?.lngCentro ? Number(cfg.lngCentro) : -40.5736,
      zoomInicial: cfg?.zoomInicial || 13,
    };
  }),

  /** Salvar configuração de mapa */
  saveMapConfig: protectedProcedure
    .input(z.object({
      mapProvider: z.enum(["free", "google"]),
      googleMapsApiKey: z.string().optional(),
      mapTileStyle: z.string(),
      latCentro: z.number().optional(),
      lngCentro: z.number().optional(),
      zoomInicial: z.number().min(1).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(configuracaoTerritorio).limit(1);
      if (existing.length > 0) {
        await db.update(configuracaoTerritorio)
          .set({
            mapProvider: input.mapProvider,
            googleMapsApiKey: input.googleMapsApiKey || null,
            mapTileStyle: input.mapTileStyle,
            latCentro: input.latCentro?.toString() as any,
            lngCentro: input.lngCentro?.toString() as any,
            zoomInicial: input.zoomInicial,
          })
          .where(eq(configuracaoTerritorio.id, existing[0].id));
      } else {
        await db.insert(configuracaoTerritorio).values({
          mapProvider: input.mapProvider,
          googleMapsApiKey: input.googleMapsApiKey || null,
          mapTileStyle: input.mapTileStyle,
          latCentro: input.latCentro?.toString() as any,
          lngCentro: input.lngCentro?.toString() as any,
          zoomInicial: input.zoomInicial,
        });
      }
      return { success: true };
    }),

  /** Preview redistribuição automática (sem persistir) */
  previewRedistribuicao: protectedProcedure
    .input(z.object({
      numMicroareas: z.number().min(1).max(50).default(8),
      respeitarLocked: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Estado atual
      const acsLista = await db.select().from(acsPerfil).where(eq(acsPerfil.ativo, true));
      const microareasAtuais = await db.select().from(microareas);
      const familiasLista = await db.select().from(familias);

      // Calcular distribuição atual por ACS
      const estadoAtual = acsLista.map((acs) => {
        const masAcs = microareasAtuais.filter((m) => m.acsId === acs.id);
        const totalFam = masAcs.reduce((s, m) => s + (m.totalFamilias || 0), 0);
        const totalCid = masAcs.reduce((s, m) => s + (m.totalCidadaos || 0), 0);
        return {
          acsId: acs.id,
          nomeAcs: acs.nomeCompleto,
          familias: totalFam,
          cidadaos: totalCid,
          statusPnab: calcularStatusPnab(totalFam, totalCid),
          microareas: masAcs.length,
        };
      });

      // Simular distribuição proposta (K-Means simplificado para preview)
      const familiasComCoord = familiasLista.filter((f) => f.lat && f.lng);
      const totalFamGlobal = familiasLista.length;
      const numAcs = acsLista.length;
      const famPorAcs = numAcs > 0 ? Math.round(totalFamGlobal / numAcs) : 0;

      const estadoProposto = acsLista.map((acs, idx) => {
        // Distribuição balanceada proposta
        const famProposto = famPorAcs;
        const cidProposto = Math.round(famProposto * (totalFamGlobal > 0 ? familiasLista.reduce((s, f) => s + (f.totalCidadaos || 1), 0) / totalFamGlobal : 1));
        return {
          acsId: acs.id,
          nomeAcs: acs.nomeCompleto,
          familias: famProposto,
          cidadaos: cidProposto,
          statusPnab: calcularStatusPnab(famProposto, cidProposto),
          microareas: Math.ceil(input.numMicroareas / numAcs),
          delta: famProposto - (estadoAtual.find((e) => e.acsId === acs.id)?.familias || 0),
        };
      });

      return {
        estadoAtual,
        estadoProposto,
        totalFamilias: totalFamGlobal,
        totalCidadaos: familiasLista.reduce((s, f) => s + (f.totalCidadaos || 0), 0),
        numAcs,
        familiasComCoord: familiasComCoord.length,
        percentualGeocodificado: totalFamGlobal > 0 ? Math.round((familiasComCoord.length / totalFamGlobal) * 100) : 0,
      };
    }),

  /** Relatório de cobertura por ACS */
  relatorioCobertura: publicProcedure.query(async () => {
    const db = getDb();
    const acsLista = await db.select().from(acsPerfil).where(eq(acsPerfil.ativo, true));
    const microareasLista = await db.select().from(microareas);

    return acsLista.map((acs) => {
      const microareasAcs = microareasLista.filter((m) => m.acsId === acs.id);
      const totalFamilias = microareasAcs.reduce((s, m) => s + (m.totalFamilias || 0), 0);
      const totalCidadaos = microareasAcs.reduce((s, m) => s + (m.totalCidadaos || 0), 0);
      return {
        acs,
        microareas: microareasAcs,
        totalFamilias,
        totalCidadaos,
        percentualCapacidadeFamilias: Math.round((totalFamilias / LIMITE_PNAB_DEFAULT.MAX_FAMILIAS_POR_ACS) * 100),
        percentualCapacidadeCidadaos: Math.round((totalCidadaos / LIMITE_PNAB_DEFAULT.MAX_CIDADAOS_POR_ACS) * 100),
        statusPnab: calcularStatusPnab(totalFamilias, totalCidadaos),
      };
    });
  }),
});

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function calcularStatusPnab(totalFamilias: number, totalCidadaos: number): string {
  if (totalFamilias === 0 && totalCidadaos === 0) return "vazia";
  if (totalFamilias > LIMITE_PNAB_DEFAULT.MAX_FAMILIAS_POR_ACS ||
    totalCidadaos > LIMITE_PNAB_DEFAULT.MAX_CIDADAOS_POR_ACS) return "excesso";
  if (totalFamilias < 20) return "baixa_cobertura";
  return "normal";
}
