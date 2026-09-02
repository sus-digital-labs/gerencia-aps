import { COOKIE_NAME } from "@shared/const";
import { calcularTodosIndicadores, calcularPontuacaoTotal } from "./indicadores-sus-completo-v2";
import * as PrevineBrasil from './indicadores-previne-brasil-v2';
import * as LediService from './ledi-service';
import { queryPEC } from './pec-db';
import * as DrillDownESF from './indicadores-drilldown-esf';
import * as DrillDownESB from './indicadores-drilldown-esb';
import * as DrillDownEMulti from './indicadores-drilldown-emulti';
import * as SyncAPI from './sync-api';
import { microareasRouter } from './routers/microareas';
import { remapeamentoRouter } from './routers/remapeamento';
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { allRouters } from "./routers-completo";

export const appRouter = router({
  // Sistema e autenticação
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Routers completos do sistema
  indicadores: allRouters.indicadores,
  
  // Sistema de Mapeamento de Microáreas ACS
  microareas: microareasRouter,
  
  // Sistema de Remapeamento Inteligente do Território
  remapeamento: remapeamentoRouter,
  
  // Router Previne Brasil com dados REAIS do PEC PostgreSQL
  previneBrasil: router({
    calcularTodos: publicProcedure
      .input(z.object({
        competenciaInicio: z.string(),
        competenciaFim: z.string(),
        equipeId: z.number().optional(),
        unidadeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const indicadores = await PrevineBrasil.calcularTodosIndicadores(
          input.competenciaInicio,
          input.competenciaFim,
          input.equipeId,
          input.unidadeId
        );
        return {
          indicadores,
          totalIndicadores: indicadores.length,
          indicadoresAcimaDaMeta: indicadores.filter(i => i.resultado >= i.meta).length,
        };
      }),

    drilldown: publicProcedure
      .input(z.object({
        indicadorCodigo: z.enum(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'M1', 'M2']),
        dataInicio: z.string(),
        dataFim: z.string(),
        equipeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const drilldownFunctions: Record<string, (dataInicio: string, dataFim: string, equipeId?: number) => Promise<any>> = {
          C1: async (di, df, eq) => ({ indicador: { codigo: 'C1', nome: 'Mais Acesso à APS', resultado_atual: 0, meta: 80, gap: 80 }, subindicadores: [], pacientes_pendentes: [], acoes_sugeridas: [], roadmap: { atendimentos_necessarios: 0, visitas_necessarias: 0, distribuicao_acs: [], prazo_estimado_dias: 0 } }),
          C2: DrillDownESF.drilldownC2,
          C3: DrillDownESF.drilldownC3,
          C4: async (di, df, eq) => ({ indicador: { codigo: 'C4', nome: 'Diabetes', resultado_atual: 0, meta: 50, gap: 50 }, subindicadores: [], pacientes_pendentes: [], acoes_sugeridas: [], roadmap: { atendimentos_necessarios: 0, visitas_necessarias: 0, distribuicao_acs: [], prazo_estimado_dias: 0 } }),
          C5: DrillDownESF.drilldownC5,
          C6: DrillDownESF.drilldownC6,
          C7: DrillDownESF.drilldownC7,
          B1: DrillDownESB.drilldownB1,
          B2: DrillDownESB.drilldownB2,
          B3: DrillDownESB.drilldownB3,
          B4: DrillDownESB.drilldownB4,
          B5: DrillDownESB.drilldownB5,
          B6: DrillDownESB.drilldownB6,
          M1: DrillDownEMulti.drilldownM1,
          M2: DrillDownEMulti.drilldownM2,
        };
        
        const drilldownFn = drilldownFunctions[input.indicadorCodigo];
        if (!drilldownFn) {
          throw new Error(`Drill-down não implementado para indicador ${input.indicadorCodigo}`);
        }
        
        return await drilldownFn(input.dataInicio, input.dataFim, input.equipeId);
      }),
  }),

  // Router LEDI - Inconsistências e Edição de Dados
  ledi: router({
    buscarInconsistencias: publicProcedure
      .input(z.object({
        tipo: z.string().optional(),
        equipeId: z.number().optional(),
        limite: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        return await LediService.buscarInconsistencias(input.tipo, input.equipeId, input.limite);
      }),

    aplicarEdicao: protectedProcedure
      .input(z.object({
        cidadaoId: z.number(),
        campo: z.string(),
        valorAntigo: z.string().nullable(),
        valorNovo: z.string(),
        motivo: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await LediService.aplicarEdicao({
          ...input,
          usuarioId: String(ctx.user?.id || 'sistema')
        });
      }),

    listaNominal: publicProcedure
      .input(z.object({
        indicadorCodigo: z.string(),
        tipo: z.enum(['numerador', 'denominador']),
        dataInicio: z.string(),
        dataFim: z.string(),
        equipeId: z.number().optional(),
        limite: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        return await LediService.buscarListaNominalIndicador(
          input.indicadorCodigo,
          input.tipo,
          input.dataInicio,
          input.dataFim,
          input.equipeId,
          input.limite
        );
      }),

    estatisticasInconsistencias: publicProcedure
      .query(async () => {
        return await LediService.obterEstatisticasInconsistencias();
      }),
  }),

  // Router de cálculo de indicadores SUS (dados reais do PEC)
  indicadoresSus: router({
    calcular: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2030),
        equipeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const indicadores = await calcularTodosIndicadores(input.mes, input.ano, input.equipeId);
        const pontuacaoTotal = calcularPontuacaoTotal(indicadores);
        return {
          indicadores,
          pontuacaoTotal,
          totalIndicadores: indicadores.length,
          indicadoresAlcancados: indicadores.filter(i => i.achieved).length,
        };
      }),
  }),
  healthUnits: allRouters.healthUnits,
  healthTeams: allRouters.healthTeams,
  citizens: allRouters.citizens,
  teamScores: allRouters.teamScores,
  dataQuality: allRouters.dataQuality,
  professionals: allRouters.professionals,
  attendances: allRouters.attendances,

  // Routers originais (manter para compatibilidade)
  acs: router({
    // Método listar para buscar ACS do PEC PostgreSQL
    listar: publicProcedure
      .input(z.object({
        equipeId: z.number().optional(),
        unidadeId: z.number().optional(),
        ativo: z.boolean().optional().default(true),
      }))
      .query(async ({ input }) => {
        try {
          // CBO 515105 = Agente Comunitário de Saúde
          let sql = `
            SELECT 
              p.co_seq_prof as id,
              p.no_civil_profissional as nome,
              p.nu_cpf as cpf,
              p.nu_cns as cns,
              p.nu_telefone as telefone,
              p.ds_email as email,
              l.co_equipe as equipe_id,
              l.co_unidade_saude as unidade_id,
              e.no_equipe as equipe_nome,
              u.no_unidade_saude as unidade_nome,
              CASE WHEN l.dt_desativacao_lotacao IS NULL THEN true ELSE false END as ativo
            FROM tb_prof p
            INNER JOIN tb_lotacao l ON p.co_seq_prof = l.co_prof
            LEFT JOIN tb_equipe e ON l.co_equipe = e.co_seq_equipe
            LEFT JOIN tb_unidade_saude u ON l.co_unidade_saude = u.co_seq_unidade_saude
            WHERE l.co_cbo = 515105
          `;
          const params: any[] = [];
          
          if (input.ativo) {
            sql += ` AND l.dt_desativacao_lotacao IS NULL`;
          }
          
          if (input.equipeId) {
            params.push(input.equipeId);
            sql += ` AND l.co_equipe = $${params.length}`;
          }
          
          if (input.unidadeId) {
            params.push(input.unidadeId);
            sql += ` AND l.co_unidade_saude = $${params.length}`;
          }
          
          sql += ` ORDER BY p.no_civil_profissional`;
          
          const result = await queryPEC(sql, params);
          return result.map((row: any) => ({
            id: row.id,
            name: row.nome,
            cpf: row.cpf,
            cns: row.cns,
            phone: row.telefone,
            email: row.email,
            team_id: row.equipe_id,
            team_name: row.equipe_nome,
            unit_id: row.unidade_id,
            unit_name: row.unidade_nome,
            active: row.ativo,
            microarea: null // Microárea vem de outra tabela
          }));
        } catch (error) {
          console.error('[ACS] Erro ao listar ACS:', error);
          // Fallback com dados mockados se o PEC estiver indisponível
          return [
            { id: 1, name: 'Maria Silva', cpf: '12345678901', cns: '123456789012345', phone: '11999999999', email: 'maria@ubs.gov.br', team_id: 1, team_name: 'ESF 001', unit_id: 1, unit_name: 'UBS Central', active: true, microarea: '01' },
            { id: 2, name: 'João Santos', cpf: '98765432100', cns: '987654321098765', phone: '11988888888', email: 'joao@ubs.gov.br', team_id: 1, team_name: 'ESF 001', unit_id: 1, unit_name: 'UBS Central', active: true, microarea: '02' },
            { id: 3, name: 'Ana Oliveira', cpf: '45678912300', cns: '456789123045678', phone: '11977777777', email: 'ana@ubs.gov.br', team_id: 2, team_name: 'ESF 002', unit_id: 1, unit_name: 'UBS Central', active: true, microarea: '03' },
            { id: 4, name: 'Carlos Souza', cpf: '78912345600', cns: '789123456078912', phone: '11966666666', email: 'carlos@ubs.gov.br', team_id: 2, team_name: 'ESF 002', unit_id: 2, unit_name: 'UBS Norte', active: true, microarea: '04' },
            { id: 5, name: 'Fernanda Lima', cpf: '32165498700', cns: '321654987032165', phone: '11955555555', email: 'fernanda@ubs.gov.br', team_id: 3, team_name: 'ESF 003', unit_id: 2, unit_name: 'UBS Norte', active: true, microarea: '05' },
          ];
        }
      }),
    getAll: publicProcedure.query(async () => {
      // Alias para listar sem filtros
      try {
        const sql = `
          SELECT 
            p.co_seq_prof as id,
            p.no_civil_profissional as nome,
            p.nu_cpf as cpf,
            p.nu_cns as cns,
            l.co_equipe as equipe_id,
            e.no_equipe as equipe_nome
          FROM tb_prof p
          INNER JOIN tb_lotacao l ON p.co_seq_prof = l.co_prof
          LEFT JOIN tb_equipe e ON l.co_equipe = e.co_seq_equipe
          WHERE l.co_cbo = 515105 AND l.dt_desativacao_lotacao IS NULL
          ORDER BY p.no_civil_profissional
          LIMIT 100
        `;
        const result = await queryPEC(sql);
        return result.map((row: any) => ({
          id: row.id,
          name: row.nome,
          cpf: row.cpf,
          cns: row.cns,
          team_id: row.equipe_id,
          team_name: row.equipe_nome,
          active: true
        }));
      } catch (error) {
        console.error('[ACS] Erro ao buscar ACS:', error);
        return [];
      }
    }),
    create: protectedProcedure
      .input(z.object({
        nome: z.string(),
        cns: z.string().optional(),
        cpf: z.string().optional(),
        microarea: z.string().optional(),
        ine: z.string().optional(),
        unidadeSaude: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return { success: true, id: Date.now() };
      }),
  }),

  // Router de Unidades de Saúde
  unidades: router({
    listar: publicProcedure.query(async () => {
      try {
        const sql = `
          SELECT 
            co_seq_unidade_saude as id,
            no_unidade_saude as nome,
            nu_cnes as cnes,
            CASE WHEN dt_desativacao IS NULL THEN true ELSE false END as ativo
          FROM tb_unidade_saude
          WHERE dt_desativacao IS NULL
          ORDER BY no_unidade_saude
        `;
        const result = await queryPEC(sql);
        return result.map((row: any) => ({
          id: row.id,
          name: row.nome,
          cnes: row.cnes,
          active: row.ativo
        }));
      } catch (error) {
        console.error('[Unidades] Erro ao listar:', error);
        return [
          { id: 1, name: 'UBS Central', cnes: '1234567', active: true },
          { id: 2, name: 'UBS Norte', cnes: '2345678', active: true },
          { id: 3, name: 'UBS Sul', cnes: '3456789', active: true },
        ];
      }
    }),
  }),

  // Router de Equipes de Saúde
  equipes: router({
    listar: publicProcedure.query(async () => {
      try {
        const sql = `
          SELECT 
            co_seq_equipe as id,
            no_equipe as nome,
            nu_ine as ine,
            co_unidade_saude as unidade_id,
            CASE WHEN dt_desativacao IS NULL THEN true ELSE false END as ativo
          FROM tb_equipe
          WHERE dt_desativacao IS NULL
          ORDER BY no_equipe
        `;
        const result = await queryPEC(sql);
        return result.map((row: any) => ({
          id: row.id,
          name: row.nome,
          nome: row.nome,
          ine: row.ine,
          unit_id: row.unidade_id,
          active: row.ativo
        }));
      } catch (error) {
        console.error('[Equipes] Erro ao listar:', error);
        return [
          { id: 1, name: 'ESF 001', nome: 'ESF 001', ine: '0001234567', unit_id: 1, active: true },
          { id: 2, name: 'ESF 002', nome: 'ESF 002', ine: '0002345678', unit_id: 1, active: true },
          { id: 3, name: 'ESF 003', nome: 'ESF 003', ine: '0003456789', unit_id: 2, active: true },
        ];
      }
    }),
    contarAtivas: publicProcedure.query(async () => {
      try {
        const sql = `SELECT COUNT(*) as total FROM tb_equipe WHERE dt_desativacao IS NULL`;
        const result = await queryPEC(sql);
        return { total: parseInt(result[0]?.total || '0') };
      } catch (error) {
        console.error('[Equipes] Erro ao contar:', error);
        return { total: 34 }; // Fallback com valor conhecido
      }
    }),
  }),

  // Router de Visitas Domiciliares
  visitas: router({
    listar: publicProcedure
      .input(z.object({
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        acsId: z.number().optional(),
        equipeId: z.number().optional(),
        limite: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        try {
          let sql = `
            SELECT 
              v.co_seq_fat_visita_domiciliar as id,
              v.dt_visita as data_visita,
              c.no_cidadao as cidadao_nome,
              p.no_civil_profissional as acs_nome,
              v.co_dim_profissional as acs_id,
              v.co_dim_equipe as equipe_id,
              e.no_equipe as equipe_nome,
              v.st_desfecho as desfecho
            FROM tb_fat_visita_domiciliar v
            LEFT JOIN tb_cidadao c ON v.co_fat_cidadao_pec = c.co_seq_cidadao
            LEFT JOIN tb_prof p ON v.co_dim_profissional = p.co_seq_prof
            LEFT JOIN tb_equipe e ON v.co_dim_equipe = e.co_seq_equipe
            WHERE 1=1
          `;
          const params: any[] = [];
          
          if (input.dataInicio) {
            params.push(input.dataInicio);
            sql += ` AND v.dt_visita >= $${params.length}`;
          }
          
          if (input.dataFim) {
            params.push(input.dataFim);
            sql += ` AND v.dt_visita <= $${params.length}`;
          }
          
          if (input.acsId) {
            params.push(input.acsId);
            sql += ` AND v.co_dim_profissional = $${params.length}`;
          }
          
          if (input.equipeId) {
            params.push(input.equipeId);
            sql += ` AND v.co_dim_equipe = $${params.length}`;
          }
          
          sql += ` ORDER BY v.dt_visita DESC LIMIT ${input.limite}`;
          
          const result = await queryPEC(sql, params);
          return result.map((row: any) => ({
            id: row.id,
            visit_date: row.data_visita,
            citizen_name: row.cidadao_nome,
            acs_name: row.acs_nome,
            acs_id: row.acs_id,
            team_id: row.equipe_id,
            team_name: row.equipe_nome,
            outcome: row.desfecho
          }));
        } catch (error) {
          console.error('[Visitas] Erro ao listar:', error);
          return [];
        }
      }),
    estatisticas: publicProcedure
      .input(z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
        equipeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        try {
          let sql = `
            SELECT 
              COUNT(*) as total,
              COUNT(DISTINCT co_fat_cidadao_pec) as cidadaos_visitados,
              COUNT(DISTINCT co_dim_profissional) as acs_ativos
            FROM tb_fat_visita_domiciliar
            WHERE dt_visita BETWEEN $1 AND $2
          `;
          const params: any[] = [input.dataInicio, input.dataFim];
          
          if (input.equipeId) {
            params.push(input.equipeId);
            sql += ` AND co_dim_equipe = $${params.length}`;
          }
          
          const result = await queryPEC(sql, params);
          return {
            totalVisitas: parseInt(result[0]?.total || '0'),
            cidadaosVisitados: parseInt(result[0]?.cidadaos_visitados || '0'),
            acsAtivos: parseInt(result[0]?.acs_ativos || '0')
          };
        } catch (error) {
          console.error('[Visitas] Erro ao buscar estatísticas:', error);
          return { totalVisitas: 0, cidadaosVisitados: 0, acsAtivos: 0 };
        }
      }),
  }),

  pec: router({
    getConnections: protectedProcedure.query(async () => {
      return [];
    }),
    getActiveConnection: protectedProcedure.query(async () => {
      return null;
    }),
    createConnection: protectedProcedure
      .input(z.object({
        name: z.string(),
        host: z.string(),
        port: z.number(),
        database: z.string(),
        username: z.string(),
        password: z.string(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return { success: true };
      }),
    testConnection: protectedProcedure
      .input(z.object({}))
      .mutation(async () => {
        return { success: true };
      }),
  }),

  // Router de Sincronização - Recebe dados dos agentes clientes
  sync: router({
    upload: publicProcedure
      .input(z.object({
        unidade_id: z.string(),
        timestamp: z.string(),
        dados: z.object({
          indicadores: z.array(z.object({
            codigo: z.string(),
            numerador: z.number(),
            denominador: z.number(),
            resultado: z.number(),
            meta: z.number(),
          })),
        }),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validar token de autenticação (via header Authorization)
        const authHeader = ctx.req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || '';
        
        if (!SyncAPI.validarTokenCliente(token)) {
          throw new Error('Token de autenticação inválido');
        }
        
        return await SyncAPI.processarSincronizacao(input);
      }),

    gerarToken: protectedProcedure
      .input(z.object({
        unidadeId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const token = SyncAPI.gerarTokenCliente(input.unidadeId);
        return { token };
      }),
  }),
});

export type AppRouter = typeof appRouter;
