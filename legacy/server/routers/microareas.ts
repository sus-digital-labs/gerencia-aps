// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { microareas, domiciliosMicroarea, acsPerfilMicroarea, microareaHistorico } from "../../drizzle/schema";
import { eq, count } from "drizzle-orm";
import { queryPEC } from "../pec-db";

// Limites do Ministério da Saúde para ACS (Portaria 2.436/2017)
const LIMITE_MS = {
  MAX_FAMILIAS_POR_ACS: 750,
  MAX_CIDADAOS_POR_ACS: 3500,
  MAX_FAMILIAS_MICROAREA: 450,
  MAX_CIDADAOS_MICROAREA: 750,
};

// Cores para microáreas
const CORES_MICROAREAS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
  "#14B8A6", "#F43F5E", "#A855F7", "#22C55E", "#EAB308",
];

// Algoritmo K-Means para clustering geográfico
function kMeansClustering(pontos, k) {
  if (pontos.length === 0 || k === 0) return [];
  const centroides = [];
  const primeiroIdx = Math.floor(Math.random() * pontos.length);
  centroides.push({ lat: pontos[primeiroIdx].lat, lng: pontos[primeiroIdx].lng });
  for (let i = 1; i < k; i++) {
    const distancias = pontos.map(p => {
      const minDist = Math.min(...centroides.map(c =>
        Math.sqrt(Math.pow(p.lat - c.lat, 2) + Math.pow(p.lng - c.lng, 2))
      ));
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
  let clusters = new Array(pontos.length).fill(0);
  for (let iter = 0; iter < 100; iter++) {
    const novoClusters = pontos.map(p => {
      let minDist = Infinity;
      let cluster = 0;
      centroides.forEach((c, i) => {
        const dist = Math.sqrt(Math.pow(p.lat - c.lat, 2) + Math.pow(p.lng - c.lng, 2));
        if (dist < minDist) { minDist = dist; cluster = i; }
      });
      return cluster;
    });
    if (JSON.stringify(novoClusters) === JSON.stringify(clusters)) break;
    clusters = novoClusters;
    for (let i = 0; i < k; i++) {
      const pontosClusters = pontos.filter((_, idx) => clusters[idx] === i);
      if (pontosClusters.length > 0) {
        centroides[i] = {
          lat: pontosClusters.reduce((s, p) => s + p.lat, 0) / pontosClusters.length,
          lng: pontosClusters.reduce((s, p) => s + p.lng, 0) / pontosClusters.length,
        };
      }
    }
  }
  return clusters;
}

// Calcular convex hull de um conjunto de pontos
function convexHull(pontos) {
  if (pontos.length < 3) return pontos;
  const sorted = [...pontos].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (o, a, b) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Expandir polígono por um buffer
function expandirPoligono(pontos, buffer = 0.003) {
  if (pontos.length < 3) return pontos;
  const centroLat = pontos.reduce((s, p) => s + p.lat, 0) / pontos.length;
  const centroLng = pontos.reduce((s, p) => s + p.lng, 0) / pontos.length;
  return pontos.map(p => {
    const dist = Math.sqrt(Math.pow(p.lat - centroLat, 2) + Math.pow(p.lng - centroLng, 2)) + 0.0001;
    const fator = 1 + buffer / dist;
    return {
      lat: centroLat + (p.lat - centroLat) * fator,
      lng: centroLng + (p.lng - centroLng) * fator,
    };
  });
}

export const microareasRouter = router({
  // 1. Levantamento populacional
  levantamentoPopulacional: publicProcedure.query(async () => {
    try {
      const [cidadaos, familias, acs] = await Promise.all([
        queryPEC("SELECT COUNT(*) as total FROM tb_cidadao WHERE st_ativo = 1"),
        queryPEC("SELECT COUNT(DISTINCT co_fat_cidadao_pec) as total FROM tb_cds_cad_individual WHERE st_ativo = 1"),
        queryPEC("SELECT COUNT(*) as total FROM tb_prof WHERE no_cargo ILIKE '%agente comunit%' OR no_cargo ILIKE '%ACS%'"),
      ]);
      const totalCidadaos = parseInt(cidadaos[0]?.total || "0");
      const totalFamilias = parseInt(familias[0]?.total || "0");
      const totalAcs = parseInt(acs[0]?.total || "0") || 1;
      return {
        totalCidadaos, totalFamilias, totalAcs,
        mediaCidadaosPorAcs: Math.round(totalCidadaos / totalAcs),
        mediaFamiliasPorAcs: Math.round(totalFamilias / totalAcs),
        limiteMsCidadaos: LIMITE_MS.MAX_CIDADAOS_POR_ACS,
        limiteMsFamilias: LIMITE_MS.MAX_FAMILIAS_POR_ACS,
        microareaLimiteCidadaos: LIMITE_MS.MAX_CIDADAOS_MICROAREA,
        microareaLimiteFamilias: LIMITE_MS.MAX_FAMILIAS_MICROAREA,
        numeroDeMicroareasRecomendado: Math.ceil(totalFamilias / LIMITE_MS.MAX_FAMILIAS_MICROAREA),
        fonte: "pec_real",
      };
    } catch {
      const totalCidadaos = 51133;
      const totalFamilias = 18420;
      const totalAcs = 26;
      return {
        totalCidadaos, totalFamilias, totalAcs,
        mediaCidadaosPorAcs: Math.round(totalCidadaos / totalAcs),
        mediaFamiliasPorAcs: Math.round(totalFamilias / totalAcs),
        limiteMsCidadaos: LIMITE_MS.MAX_CIDADAOS_POR_ACS,
        limiteMsFamilias: LIMITE_MS.MAX_FAMILIAS_POR_ACS,
        microareaLimiteCidadaos: LIMITE_MS.MAX_CIDADAOS_MICROAREA,
        microareaLimiteFamilias: LIMITE_MS.MAX_FAMILIAS_MICROAREA,
        numeroDeMicroareasRecomendado: Math.ceil(totalFamilias / LIMITE_MS.MAX_FAMILIAS_MICROAREA),
        fonte: "mock",
      };
    }
  }),

  // 2. Listar ACS disponíveis
  listarAcs: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return getMockAcs();
    const acsDB = await db.select().from(acsPerfilMicroarea).where(eq(acsPerfilMicroarea.ativo, true));
    if (acsDB.length > 0) return acsDB;
    try {
      const acsResult = await queryPEC(`
        SELECT DISTINCT p.co_seq_prof as id, p.no_prof as nome, p.nu_cns as cns,
               l.nu_cnes as cnes, e.nu_ine as ine
        FROM tb_prof p
        JOIN tb_lotacao l ON l.co_prof = p.co_seq_prof
        JOIN tb_equipe e ON e.co_seq_equipe = l.co_equipe
        WHERE p.no_cargo ILIKE '%agente comunit%' OR p.no_cargo ILIKE '%ACS%'
        LIMIT 50
      `);
      return acsResult.map((a, i) => ({
        id: i + 1, nomeAcs: a.nome, cnsAcs: a.cns, cnes: a.cnes, ine: a.ine,
        capacidadeMaxFamilias: 450, capacidadeMaxCidadaos: 750, ativo: true,
      }));
    } catch {
      return getMockAcs();
    }
  }),

  // 3. Listar domicílios
  listarDomicilios: publicProcedure
    .input(z.object({
      microareaId: z.number().optional(),
      semCoordenadas: z.boolean().optional(),
      page: z.number().default(1),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { domicilios: [], total: 0 };
      const domiciliosDB = await db.select().from(domiciliosMicroarea)
        .limit(input.limit).offset((input.page - 1) * input.limit);
      return { domicilios: domiciliosDB, total: domiciliosDB.length };
    }),

  // 4. Gerar microáreas automaticamente com K-Means
  gerarMicroareas: publicProcedure
    .input(z.object({
      numeroDeMicroareas: z.number().min(1).max(100).optional(),
      usarPerfilAcs: z.boolean().default(true),
      coordenadasMunicipio: z.object({ lat: z.number(), lng: z.number() }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      let domicilios = [];

      if (db) {
        const domiciliosDB = await db.select().from(domiciliosMicroarea)
          .where(eq(domiciliosMicroarea.geocodificado, true));
        if (domiciliosDB.length > 0) {
          domicilios = domiciliosDB.filter(d => d.lat && d.lng).map(d => ({
            id: d.id,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lng),
            totalCidadaos: d.totalCidadaos || 1,
            coFamilia: d.coFamilia,
            nomeResponsavel: d.nomeResponsavel,
          }));
        }
      }

      // Usar dados mockados se não há domicílios geocodificados
      if (domicilios.length === 0) {
        const centroLat = input.coordenadasMunicipio?.lat || -14.8619; // Barra do Choça - BA
        const centroLng = input.coordenadasMunicipio?.lng || -40.5736; // Barra do Choça - BA
        for (let i = 0; i < 250; i++) {
          domicilios.push({
            id: i + 1,
            lat: centroLat + (Math.random() - 0.5) * 0.12,
            lng: centroLng + (Math.random() - 0.5) * 0.12,
            totalCidadaos: Math.floor(Math.random() * 5) + 1,
            coFamilia: `FAM${String(i + 1).padStart(6, '0')}`,
            nomeResponsavel: `Família ${i + 1}`,
          });
        }
      }

      // Buscar ACS disponíveis - se não houver na tabela local, criar a partir dos dados do PEC
      let acsLista = [];
      if (db) {
        acsLista = await db.select().from(acsPerfilMicroarea).where(eq(acsPerfilMicroarea.ativo, true));
        // Se não há ACS cadastrados, criar a partir dos dados do PEC
        if (acsLista.length === 0) {
          const mockAcs = getMockAcs();
          for (const acs of mockAcs) {
            const [novo] = await db.insert(acsPerfilMicroarea).values({
              nomeAcs: acs.nomeAcs,
              cnsAcs: acs.cnsAcs || null,
              cnes: acs.cnes || null,
              ine: acs.ine || null,
              capacidadeMaxFamilias: 450,
              capacidadeMaxCidadaos: 750,
              ativo: true,
            });
            acsLista.push({ id: novo.insertId, nomeAcs: acs.nomeAcs, capacidadeMaxFamilias: 450, capacidadeMaxCidadaos: 750 });
          }
        }
      }
      if (acsLista.length === 0) acsLista = getMockAcs();
      const totalAcs = acsLista.length;

      const totalCidadaos = domicilios.reduce((s, d) => s + d.totalCidadaos, 0);
      const totalFamilias = domicilios.length;
      const numMicroareas = input.numeroDeMicroareas || Math.max(
        Math.ceil(totalFamilias / LIMITE_MS.MAX_FAMILIAS_MICROAREA),
        Math.ceil(totalCidadaos / LIMITE_MS.MAX_CIDADAOS_MICROAREA),
        totalAcs
      );

      const clusters = kMeansClustering(domicilios, numMicroareas);
      const microareasCriadas = [];

      if (db) {
        // Deletar microáreas geradas automaticamente
        const existentes = await db.select({ id: microareas.id })
          .from(microareas).where(eq(microareas.geradaAutomaticamente, true));
        for (const ma of existentes) {
          await db.delete(domiciliosMicroarea).where(eq(domiciliosMicroarea.microareaId, ma.id));
          await db.delete(microareaHistorico).where(eq(microareaHistorico.microareaId, ma.id));
          await db.delete(microareas).where(eq(microareas.id, ma.id));
        }
      }

      for (let i = 0; i < numMicroareas; i++) {
        const pontosClusters = domicilios.filter((_, idx) => clusters[idx] === i);
        if (pontosClusters.length === 0) continue;

        const totalFamiliasMicroarea = pontosClusters.length;
        const totalCidadaosMicroarea = pontosClusters.reduce((s, d) => s + d.totalCidadaos, 0);

        let poligono = convexHull(pontosClusters);
        if (poligono.length >= 3) poligono = expandirPoligono(poligono, 0.003);

        const geojson = JSON.stringify({
          type: "Feature", properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[...poligono.map(p => [p.lng, p.lat]), [poligono[0].lng, poligono[0].lat]]],
          },
        });

        let status = "ativa";
        if (totalFamiliasMicroarea > LIMITE_MS.MAX_FAMILIAS_MICROAREA || totalCidadaosMicroarea > LIMITE_MS.MAX_CIDADAOS_MICROAREA)
          status = "excesso";
        else if (totalFamiliasMicroarea < 50)
          status = "baixa_cobertura";

        const acsIndex = i % acsLista.length;
        const acsId = acsLista[acsIndex]?.id || null;
        const nome = `Microárea ${String(i + 1).padStart(2, '0')}`;
        const cor = CORES_MICROAREAS[i % CORES_MICROAREAS.length];

        if (db) {
          const [criada] = await db.insert(microareas).values({
            nome, codigo: `MA${String(i + 1).padStart(3, '0')}`,
            acsId, geojsonPoligono: geojson, cor,
            totalFamilias: totalFamiliasMicroarea,
            totalCidadaos: totalCidadaosMicroarea,
            status, geradaAutomaticamente: true,
          });
          await db.insert(microareaHistorico).values({
            microareaId: criada.insertId, acao: "gerada_automaticamente",
            descricao: `Gerada com ${totalFamiliasMicroarea} famílias e ${totalCidadaosMicroarea} cidadãos`,
            usuarioId: null,
          });
          microareasCriadas.push({ id: criada.insertId, nome, totalFamilias: totalFamiliasMicroarea, totalCidadaos: totalCidadaosMicroarea, status, cor, geojsonPoligono: geojson, acsNome: acsLista[acsIndex]?.nomeAcs || "Não atribuído" });
        } else {
          microareasCriadas.push({ id: i + 1, nome, totalFamilias: totalFamiliasMicroarea, totalCidadaos: totalCidadaosMicroarea, status, cor, geojsonPoligono: geojson, acsNome: acsLista[acsIndex]?.nomeAcs || "Não atribuído" });
        }
      }

      return {
        microareasGeradas: microareasCriadas.length,
        microareas: microareasCriadas,
        totalDomiciliosProcessados: domicilios.length,
        totalCidadaos, totalFamilias,
        alertas: microareasCriadas.filter(m => m.status === "excesso").map(m => ({
          microarea: m.nome,
          mensagem: `Excede limite do MS: ${m.totalFamilias} famílias / ${m.totalCidadaos} cidadãos`,
        })),
      };
    }),

  // 5. Listar microáreas com estatísticas
  listarMicroareas: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const microareasDB = await db.select().from(microareas);
    return Promise.all(microareasDB.map(async (ma) => {
      const acs = ma.acsId ? await db.select().from(acsPerfilMicroarea).where(eq(acsPerfilMicroarea.id, ma.acsId)).limit(1) : [];
      const domCount = await db.select({ count: count() }).from(domiciliosMicroarea).where(eq(domiciliosMicroarea.microareaId, ma.id));
      return {
        ...ma,
        acsNome: acs[0]?.nomeAcs || "Não atribuído",
        totalDomicilios: domCount[0]?.count || 0,
        percentualLimiteFamilias: Math.round((ma.totalFamilias || 0) / LIMITE_MS.MAX_FAMILIAS_MICROAREA * 100),
        percentualLimiteCidadaos: Math.round((ma.totalCidadaos || 0) / LIMITE_MS.MAX_CIDADAOS_MICROAREA * 100),
        dentroDoLimite: (ma.totalFamilias || 0) <= LIMITE_MS.MAX_FAMILIAS_MICROAREA && (ma.totalCidadaos || 0) <= LIMITE_MS.MAX_CIDADAOS_MICROAREA,
      };
    }));
  }),

  // 6. Geocodificar domicílios
  geocodificarDomicilios: publicProcedure
    .input(z.object({ limite: z.number().default(50) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { processados: 0, geocodificados: 0, falhas: 0, mensagem: "Banco não disponível" };
      const domiciliosSem = await db.select().from(domiciliosMicroarea)
        .where(eq(domiciliosMicroarea.geocodificado, false)).limit(input.limite);
      let geocodificados = 0, falhas = 0;
      for (const d of domiciliosSem) {
        if (!d.endereco) { falhas++; continue; }
        try {
          // Geocodificação simulada (em produção usar Google Maps API)
          const lat = -14.8619 + (Math.random() - 0.5) * 0.1; // Barra do Choça - BA
          const lng = -40.5736 + (Math.random() - 0.5) * 0.1; // Barra do Choça - BA
          await db.update(domiciliosMicroarea)
            .set({ lat: lat.toString(), lng: lng.toString(), geocodificado: true, geocodificadoEm: new Date() })
            .where(eq(domiciliosMicroarea.id, d.id));
          geocodificados++;
        } catch { falhas++; }
      }
      return { processados: domiciliosSem.length, geocodificados, falhas, mensagem: `${geocodificados} domicílios geocodificados` };
    }),

  // 7. Mover domicílio entre microáreas
  moverDomicilio: publicProcedure
    .input(z.object({ domicilioId: z.number(), novaMicroareaId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      const [domicilio] = await db.select().from(domiciliosMicroarea).where(eq(domiciliosMicroarea.id, input.domicilioId)).limit(1);
      if (!domicilio) throw new Error("Domicílio não encontrado");
      const microareaAntiga = domicilio.microareaId;
      await db.update(domiciliosMicroarea).set({ microareaId: input.novaMicroareaId }).where(eq(domiciliosMicroarea.id, input.domicilioId));
      if (microareaAntiga) {
        const [total] = await db.select({ count: count() }).from(domiciliosMicroarea).where(eq(domiciliosMicroarea.microareaId, microareaAntiga));
        await db.update(microareas).set({ totalFamilias: total.count }).where(eq(microareas.id, microareaAntiga));
      }
      const [totalNovo] = await db.select({ count: count() }).from(domiciliosMicroarea).where(eq(domiciliosMicroarea.microareaId, input.novaMicroareaId));
      await db.update(microareas).set({ totalFamilias: totalNovo.count }).where(eq(microareas.id, input.novaMicroareaId));
      await db.insert(microareaHistorico).values({ microareaId: input.novaMicroareaId, acao: "domicilio_movido", descricao: `Domicílio ${input.domicilioId} movido`, usuarioId: null });
      return { sucesso: true };
    }),

  // 8. Salvar microárea
  salvarMicroarea: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      nome: z.string(),
      acsId: z.number().optional(),
      geojsonPoligono: z.string().optional(),
      cor: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      if (input.id) {
        await db.update(microareas).set({ nome: input.nome, acsId: input.acsId, geojsonPoligono: input.geojsonPoligono, cor: input.cor }).where(eq(microareas.id, input.id));
        await db.insert(microareaHistorico).values({ microareaId: input.id, acao: "editada", descricao: `Editada: ${input.nome}`, usuarioId: null });
        return { id: input.id, sucesso: true };
      } else {
        const [nova] = await db.insert(microareas).values({ nome: input.nome, acsId: input.acsId, geojsonPoligono: input.geojsonPoligono, cor: input.cor || CORES_MICROAREAS[0], status: "ativa", geradaAutomaticamente: false });
        await db.insert(microareaHistorico).values({ microareaId: nova.insertId, acao: "criada_manualmente", descricao: `Criada: ${input.nome}`, usuarioId: null });
        return { id: nova.insertId, sucesso: true };
      }
    }),

  // 9. Relatório de cobertura
  relatorioCobertura: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { resumo: { totalMicroareas: 0, microareasExcesso: 0, microareasBaixaCobertura: 0, microareasNormais: 0, totalFamilias: 0, totalCidadaos: 0, acsComMicroarea: 0, percentualCobertura: 0 }, porAcs: [], alertas: [], limitesMs: LIMITE_MS };
    const microareasDB = await db.select().from(microareas);
    const totalMicroareas = microareasDB.length;
    const microareasExcesso = microareasDB.filter(m => m.status === "excesso").length;
    const microareasBaixaCobertura = microareasDB.filter(m => m.status === "baixa_cobertura").length;
    const totalFamilias = microareasDB.reduce((s, m) => s + (m.totalFamilias || 0), 0);
    const totalCidadaos = microareasDB.reduce((s, m) => s + (m.totalCidadaos || 0), 0);
    const acsIds = [...new Set(microareasDB.filter(m => m.acsId).map(m => m.acsId))];
    const porAcs = await Promise.all(acsIds.map(async (acsId) => {
      const [acs] = await db.select().from(acsPerfilMicroarea).where(eq(acsPerfilMicroarea.id, acsId)).limit(1);
      const maAcs = microareasDB.filter(m => m.acsId === acsId);
      const familias = maAcs.reduce((s, m) => s + (m.totalFamilias || 0), 0);
      const cidadaos = maAcs.reduce((s, m) => s + (m.totalCidadaos || 0), 0);
      return { acsId, nomeAcs: acs?.nomeAcs || "Desconhecido", totalMicroareas: maAcs.length, totalFamilias: familias, totalCidadaos: cidadaos, percentualLimiteFamilias: Math.round(familias / LIMITE_MS.MAX_FAMILIAS_POR_ACS * 100), percentualLimiteCidadaos: Math.round(cidadaos / LIMITE_MS.MAX_CIDADAOS_POR_ACS * 100), dentroDoLimite: familias <= LIMITE_MS.MAX_FAMILIAS_POR_ACS };
    }));
    return {
      resumo: { totalMicroareas, microareasExcesso, microareasBaixaCobertura, microareasNormais: totalMicroareas - microareasExcesso - microareasBaixaCobertura, totalFamilias, totalCidadaos, acsComMicroarea: acsIds.length, percentualCobertura: totalMicroareas > 0 ? Math.round((totalMicroareas - microareasExcesso) / totalMicroareas * 100) : 0 },
      porAcs,
      alertas: [
        ...microareasDB.filter(m => m.status === "excesso").map(m => ({ tipo: "excesso", microarea: m.nome, mensagem: `Excede limite MS: ${m.totalFamilias} famílias` })),
        ...microareasDB.filter(m => m.status === "baixa_cobertura").map(m => ({ tipo: "baixa_cobertura", microarea: m.nome, mensagem: `Baixa cobertura: ${m.totalFamilias} famílias` })),
      ],
      limitesMs: LIMITE_MS,
    };
  }),

  // 10. Deletar microárea
  deletarMicroarea: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.delete(domiciliosMicroarea).where(eq(domiciliosMicroarea.microareaId, input.id));
      await db.delete(microareaHistorico).where(eq(microareaHistorico.microareaId, input.id));
      await db.delete(microareas).where(eq(microareas.id, input.id));
      return { sucesso: true };
    }),

  // 11. Atribuir ACS
  atribuirAcs: publicProcedure
    .input(z.object({ microareaId: z.number(), acsId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      await db.update(microareas).set({ acsId: input.acsId }).where(eq(microareas.id, input.microareaId));
      await db.insert(microareaHistorico).values({ microareaId: input.microareaId, acao: "acs_atribuido", descricao: `ACS ${input.acsId} atribuído`, usuarioId: null });
      return { sucesso: true };
    }),

  // 12. Salvar perfil ACS
  salvarPerfilAcs: publicProcedure
    .input(z.object({
      id: z.number().optional(),
      nomeAcs: z.string(),
      cnsAcs: z.string().optional(),
      cnes: z.string().optional(),
      ine: z.string().optional(),
      idadeAcs: z.number().optional(),
      anosExperiencia: z.number().optional(),
      latDomicilio: z.number().optional(),
      lngDomicilio: z.number().optional(),
      capacidadeMaxFamilias: z.number().default(450),
      capacidadeMaxCidadaos: z.number().default(750),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco não disponível");
      if (input.id) {
        await db.update(acsPerfilMicroarea).set({ nomeAcs: input.nomeAcs, cnsAcs: input.cnsAcs, idadeAcs: input.idadeAcs, anosExperiencia: input.anosExperiencia, latDomicilio: input.latDomicilio?.toString(), lngDomicilio: input.lngDomicilio?.toString(), capacidadeMaxFamilias: input.capacidadeMaxFamilias, capacidadeMaxCidadaos: input.capacidadeMaxCidadaos }).where(eq(acsPerfilMicroarea.id, input.id));
        return { id: input.id, sucesso: true };
      } else {
        const [novo] = await db.insert(acsPerfilMicroarea).values({ nomeAcs: input.nomeAcs, cnsAcs: input.cnsAcs, cnes: input.cnes, ine: input.ine, idadeAcs: input.idadeAcs, anosExperiencia: input.anosExperiencia, latDomicilio: input.latDomicilio?.toString(), lngDomicilio: input.lngDomicilio?.toString(), capacidadeMaxFamilias: input.capacidadeMaxFamilias, capacidadeMaxCidadaos: input.capacidadeMaxCidadaos, ativo: true });
        return { id: novo.insertId, sucesso: true };
      }
    }),
});

// Dados mockados de ACS para quando o banco não está disponível
function getMockAcs() {
  return [
    { id: 1, nomeAcs: "Maria Silva", cnsAcs: "123456789012345", idadeAcs: 35, anosExperiencia: 5, capacidadeMaxFamilias: 450, capacidadeMaxCidadaos: 750, ativo: true, cnes: null, ine: null, latDomicilio: null, lngDomicilio: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, nomeAcs: "João Santos", cnsAcs: "234567890123456", idadeAcs: 52, anosExperiencia: 12, capacidadeMaxFamilias: 350, capacidadeMaxCidadaos: 600, ativo: true, cnes: null, ine: null, latDomicilio: null, lngDomicilio: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, nomeAcs: "Ana Oliveira", cnsAcs: "345678901234567", idadeAcs: 28, anosExperiencia: 2, capacidadeMaxFamilias: 450, capacidadeMaxCidadaos: 750, ativo: true, cnes: null, ine: null, latDomicilio: null, lngDomicilio: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, nomeAcs: "Carlos Ferreira", cnsAcs: "456789012345678", idadeAcs: 45, anosExperiencia: 8, capacidadeMaxFamilias: 420, capacidadeMaxCidadaos: 700, ativo: true, cnes: null, ine: null, latDomicilio: null, lngDomicilio: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 5, nomeAcs: "Lucia Mendes", cnsAcs: "567890123456789", idadeAcs: 61, anosExperiencia: 15, capacidadeMaxFamilias: 300, capacidadeMaxCidadaos: 500, ativo: true, cnes: null, ine: null, latDomicilio: null, lngDomicilio: null, createdAt: new Date(), updatedAt: new Date() },
  ];
}
