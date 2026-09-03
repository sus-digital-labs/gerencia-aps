import { publicProcedure, protectedProcedure, router } from './_core/trpc';
import { queryPEC } from './pec-db';
import { z } from 'zod';

// ==================== CIDADÃOS ====================

const getCidadaosInput = z.object({
  limit: z.number().default(100),
  offset: z.number().default(0),
  search: z.string().optional(),
});

export const getCidadaos = publicProcedure
  .input(getCidadaosInput)
  .query(async ({ input }: { input: z.infer<typeof getCidadaosInput> }) => {
    const { limit, offset, search } = input;
    
    let sql = `
      SELECT 
        co_seq_cidadao as id,
        no_cidadao as nome,
        nu_cpf as cpf,
        dt_nascimento as data_nascimento,
        CASE co_sexo 
          WHEN 1 THEN 'Masculino'
          WHEN 2 THEN 'Feminino'
          ELSE 'Não informado'
        END as sexo,
        no_nome_mae as nome_mae,
        nu_telefone_celular as telefone
      FROM tb_cidadao
      WHERE st_ativo = true
    `;
    
    if (search) {
      sql += ` AND (no_cidadao ILIKE $3 OR nu_cpf ILIKE $3)`;
    }
    
    sql += ` ORDER BY no_cidadao LIMIT $1 OFFSET $2`;
    
    const params = search ? [limit, offset, `%${search}%`] : [limit, offset];
    const rows = await queryPEC(sql, params);
    
    return {
      data: rows,
      total: rows.length,
    };
  });

// ==================== EQUIPES ====================

export const getEquipes = publicProcedure
  .query(async () => {
    const sql = `
      SELECT 
        co_seq_equipe as id,
        no_equipe as nome,
        nu_ine as ine,
        CASE tp_equipe
          WHEN 1 THEN 'eSF'
          WHEN 2 THEN 'eAP'
          WHEN 3 THEN 'eSB'
          WHEN 76 THEN 'eMulti'
          ELSE 'Outro'
        END as tipo,
        dt_ativacao as data_ativacao,
        st_ativa as ativa
      FROM tb_equipe
      WHERE st_ativa = true
      ORDER BY no_equipe
    `;
    
    return await queryPEC(sql);
  });

// ==================== PROFISSIONAIS ====================

export const getProfissionais = publicProcedure
  .query(async () => {
    const sql = `
      SELECT 
        p.co_seq_prof as id,
        p.no_profissional as nome,
        p.nu_cns as cns,
        p.nu_cpf as cpf,
        CASE p.co_cbo
          WHEN 223505 THEN 'Médico'
          WHEN 223565 THEN 'Enfermeiro'
          WHEN 322230 THEN 'Técnico de Enfermagem'
          WHEN 515105 THEN 'ACS'
          WHEN 223293 THEN 'Dentista'
          ELSE 'Outro'
        END as cargo
      FROM tb_prof p
      WHERE p.st_ativo = true
      ORDER BY p.no_profissional
      LIMIT 100
    `;
    
    return await queryPEC(sql);
  });

// ==================== VISITAS DOMICILIARES ====================

const getVisitasInput = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
  limit: z.number().default(100),
});

export const getVisitasDomiciliares = publicProcedure
  .input(getVisitasInput)
  .query(async ({ input }: { input: z.infer<typeof getVisitasInput> }) => {
    const { dataInicio, dataFim, limit } = input;
    
    const sql = `
      SELECT 
        v.co_seq_cds_visita_domiciliar as id,
        v.dt_visita as data_visita,
        c.no_cidadao as cidadao,
        p.no_profissional as profissional,
        e.no_equipe as equipe,
        CASE v.tp_desfecho
          WHEN 1 THEN 'Visita realizada'
          WHEN 2 THEN 'Visita recusada'
          WHEN 3 THEN 'Ausente'
          ELSE 'Outro'
        END as desfecho
      FROM tb_cds_visita_domiciliar v
      LEFT JOIN tb_cidadao c ON v.co_cidadao = c.co_seq_cidadao
      LEFT JOIN tb_prof p ON v.co_profissional = p.co_seq_prof
      LEFT JOIN tb_equipe e ON v.co_equipe = e.co_seq_equipe
      WHERE v.dt_visita BETWEEN $1 AND $2
      ORDER BY v.dt_visita DESC
      LIMIT $3
    `;
    
    return await queryPEC(sql, [dataInicio, dataFim, limit]);
  });

// ==================== ATENDIMENTOS ====================

const getAtendimentosInput = z.object({
  dataInicio: z.string(),
  dataFim: z.string(),
  limit: z.number().default(100),
});

export const getAtendimentos = publicProcedure
  .input(getAtendimentosInput)
  .query(async ({ input }: { input: z.infer<typeof getAtendimentosInput> }) => {
    const { dataInicio, dataFim, limit } = input;
    
    const sql = `
      SELECT 
        a.co_seq_atend as id,
        a.dt_atend as data_atendimento,
        c.no_cidadao as cidadao,
        p.no_profissional as profissional,
        e.no_equipe as equipe,
        CASE a.tp_atendimento
          WHEN 1 THEN 'Consulta'
          WHEN 2 THEN 'Procedimento'
          WHEN 3 THEN 'Visita domiciliar'
          ELSE 'Outro'
        END as tipo
      FROM tb_atend a
      LEFT JOIN tb_cidadao c ON a.co_cidadao = c.co_seq_cidadao
      LEFT JOIN tb_prof p ON a.co_profissional = p.co_seq_prof
      LEFT JOIN tb_equipe e ON a.co_equipe = e.co_seq_equipe
      WHERE a.dt_atend BETWEEN $1 AND $2
        AND a.st_ativo = true
      ORDER BY a.dt_atend DESC
      LIMIT $3
    `;
    
    return await queryPEC(sql, [dataInicio, dataFim, limit]);
  });

// ==================== INDICADORES ====================

const getIndicadorInput = z.object({
  mes: z.number(),
  ano: z.number(),
});

export const getIndicadorC1 = publicProcedure
  .input(getIndicadorInput)
  .query(async ({ input }: { input: z.infer<typeof getIndicadorInput> }) => {
    const { mes, ano } = input;
    
    // C1 - Mais Acesso à APS
    const sql = `
      SELECT 
        COUNT(DISTINCT a.co_cidadao) as numerador,
        (SELECT COUNT(*) FROM tb_cidadao WHERE st_ativo = true) as denominador
      FROM tb_atend a
      WHERE EXTRACT(MONTH FROM a.dt_atend) = $1
        AND EXTRACT(YEAR FROM a.dt_atend) = $2
        AND a.st_ativo = true
    `;
    
    const result = await queryPEC(sql, [mes, ano]);
    const { numerador, denominador } = result[0] || { numerador: 0, denominador: 1 };
    
    return {
      numerador: parseInt(numerador),
      denominador: parseInt(denominador),
      percentual: denominador > 0 ? (numerador / denominador) * 100 : 0,
      meta: 60,
    };
  });

// ==================== ESTATÍSTICAS GERAIS ====================

export const getEstatisticasGerais = publicProcedure
  .query(async () => {
    const sql = `
      SELECT 
        (SELECT COUNT(*) FROM tb_cidadao WHERE st_ativo = true) as total_cidadaos,
        (SELECT COUNT(*) FROM tb_equipe WHERE st_ativa = true) as total_equipes,
        (SELECT COUNT(*) FROM tb_prof WHERE st_ativo = true) as total_profissionais,
        (SELECT COUNT(*) FROM tb_atend WHERE st_ativo = true AND dt_atend >= CURRENT_DATE - INTERVAL '30 days') as atendimentos_mes,
        (SELECT COUNT(*) FROM tb_cds_visita_domiciliar WHERE dt_visita >= CURRENT_DATE - INTERVAL '30 days') as visitas_mes
    `;
    
    const result = await queryPEC(sql);
    return result[0] || {};
  });

// ==================== ROUTER PEC ====================

export const pecRouter = router({
  cidadaos: getCidadaos,
  equipes: getEquipes,
  profissionais: getProfissionais,
  visitasDomiciliares: getVisitasDomiciliares,
  atendimentos: getAtendimentos,
  indicadorC1: getIndicadorC1,
  estatisticasGerais: getEstatisticasGerais,
});
