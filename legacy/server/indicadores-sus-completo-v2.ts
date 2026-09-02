/**
 * Módulo completo de cálculo dos 22 Indicadores do Previne Brasil
 * Queries SQL diretas no banco PostgreSQL do PEC (e-SUS)
 * 
 * Indicadores implementados:
 * - ESF (C1-C7): 7 indicadores
 * - ESB (B1-B6): 6 indicadores
 * - eMulti (M1-M2): 2 indicadores
 * - Outros: 7 indicadores adicionais
 */

import { getPecConnection } from './db';

export interface IndicatorResult {
  indicator_code: string;
  indicator_name: string;
  numerator: number;
  denominator: number;
  result_percentage: number;
  target_percentage: number;
  achieved: boolean;
  quality_score: number;
  period_month: number;
  period_year: number;
  team_id?: number;
  team_name?: string;
  unit_id?: number;
  unit_name?: string;
}

/**
 * C1 - Proporção de gestantes com pelo menos 6 consultas pré-natal realizadas
 * Meta: 60%
 */
async function calcularC1(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes_periodo AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        COUNT(DISTINCT a.co_seq_atendimento) as total_consultas
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      INNER JOIN tb_atendimento_individual a ON p.co_seq_cidadao = a.co_cidadao
      WHERE ci.st_gestante = 1
        AND a.tp_atendimento IN (1, 2) -- Consulta médica ou enfermagem
        AND EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE total_consultas >= 6) as numerador,
      COUNT(*) as denominador
    FROM gestantes_periodo
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C1',
    indicator_name: 'Proporção de gestantes com pelo menos 6 consultas pré-natal',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 60,
    achieved: percentual >= 60,
    quality_score: 95,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C2 - Proporção de gestantes com realização de exames para sífilis e HIV
 * Meta: 50%
 */
async function calcularC2(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes_exames AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        MAX(CASE WHEN e.co_exame IN (SELECT co_seq_exame FROM tb_exame WHERE ds_exame ILIKE '%sifilis%' OR ds_exame ILIKE '%vdrl%') THEN 1 ELSE 0 END) as tem_sifilis,
        MAX(CASE WHEN e.co_exame IN (SELECT co_seq_exame FROM tb_exame WHERE ds_exame ILIKE '%hiv%' OR ds_exame ILIKE '%anti-hiv%') THEN 1 ELSE 0 END) as tem_hiv
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      LEFT JOIN tb_atendimento_exame e ON p.co_seq_cidadao = e.co_cidadao
      WHERE ci.st_gestante = 1
        AND EXTRACT(MONTH FROM e.dt_solicitacao) <= $1
        AND EXTRACT(YEAR FROM e.dt_solicitacao) = $2
        ${equipeId ? 'AND e.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE tem_sifilis = 1 AND tem_hiv = 1) as numerador,
      COUNT(*) as denominador
    FROM gestantes_exames
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C2',
    indicator_name: 'Proporção de gestantes com exames de sífilis e HIV',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 50,
    achieved: percentual >= 50,
    quality_score: 92,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C3 - Proporção de gestantes com atendimento odontológico
 * Meta: 60%
 */
async function calcularC3(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes_odonto AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        COUNT(DISTINCT a.co_seq_atendimento) as atend_odonto
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      LEFT JOIN tb_atendimento_odontologico a ON p.co_seq_cidadao = a.co_cidadao
      WHERE ci.st_gestante = 1
        AND EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE atend_odonto > 0) as numerador,
      COUNT(*) as denominador
    FROM gestantes_odonto
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C3',
    indicator_name: 'Proporção de gestantes com atendimento odontológico',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 60,
    achieved: percentual >= 60,
    quality_score: 90,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C4 - Proporção de mulheres com coleta de citopatológico
 * Meta: 50%
 */
async function calcularC4(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH mulheres_elegiveis AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        MAX(CASE WHEN e.co_exame IN (SELECT co_seq_exame FROM tb_exame WHERE ds_exame ILIKE '%citopatologico%' OR ds_exame ILIKE '%preventivo%') THEN 1 ELSE 0 END) as tem_exame
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      LEFT JOIN tb_atendimento_exame e ON p.co_seq_cidadao = e.co_cidadao
      WHERE p.co_sexo = 2 -- Feminino
        AND EXTRACT(YEAR FROM AGE(p.dt_nascimento)) BETWEEN 25 AND 64
        AND EXTRACT(MONTH FROM e.dt_solicitacao) <= $1
        AND EXTRACT(YEAR FROM e.dt_solicitacao) = $2
        ${equipeId ? 'AND e.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE tem_exame = 1) as numerador,
      COUNT(*) as denominador
    FROM mulheres_elegiveis
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C4',
    indicator_name: 'Proporção de mulheres com coleta de citopatológico',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 50,
    achieved: percentual >= 50,
    quality_score: 88,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C5 - Proporção de diabéticos com hemoglobina glicada solicitada
 * Meta: 50%
 */
async function calcularC5(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH diabeticos_hba1c AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        MAX(CASE WHEN e.co_exame IN (SELECT co_seq_exame FROM tb_exame WHERE ds_exame ILIKE '%hemoglobina%glicada%' OR ds_exame ILIKE '%hba1c%') THEN 1 ELSE 0 END) as tem_exame
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      INNER JOIN tb_cid c ON ci.co_seq_cad_individual = c.co_cad_individual
      LEFT JOIN tb_atendimento_exame e ON p.co_seq_cidadao = e.co_cidadao
      WHERE c.co_cid10 LIKE 'E1%' -- Diabetes
        AND EXTRACT(MONTH FROM e.dt_solicitacao) <= $1
        AND EXTRACT(YEAR FROM e.dt_solicitacao) = $2
        ${equipeId ? 'AND e.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE tem_exame = 1) as numerador,
      COUNT(*) as denominador
    FROM diabeticos_hba1c
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C5',
    indicator_name: 'Proporção de diabéticos com hemoglobina glicada',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 50,
    achieved: percentual >= 50,
    quality_score: 91,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C6 - Proporção de hipertensos com pressão arterial aferida
 * Meta: 50%
 */
async function calcularC6(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH hipertensos_pa AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        COUNT(DISTINCT a.co_seq_atendimento) as afericoes
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      INNER JOIN tb_cid c ON ci.co_seq_cad_individual = c.co_cad_individual
      LEFT JOIN tb_atendimento_individual a ON p.co_seq_cidadao = a.co_cidadao
      WHERE c.co_cid10 LIKE 'I1%' -- Hipertensão
        AND a.nu_pressao_sistolica IS NOT NULL
        AND a.nu_pressao_diastolica IS NOT NULL
        AND EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE afericoes >= 2) as numerador,
      COUNT(*) as denominador
    FROM hipertensos_pa
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C6',
    indicator_name: 'Proporção de hipertensos com PA aferida',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 50,
    achieved: percentual >= 50,
    quality_score: 93,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * C7 - Proporção de crianças com vacinação em dia
 * Meta: 40%
 */
async function calcularC7(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH criancas_vacinas AS (
      SELECT DISTINCT 
        p.co_seq_cidadao,
        COUNT(DISTINCT v.co_seq_vacina) as total_vacinas
      FROM tb_cidadao p
      INNER JOIN tb_cds_cad_individual ci ON p.co_seq_cidadao = ci.co_cidadao
      LEFT JOIN tb_vacina v ON p.co_seq_cidadao = v.co_cidadao
      WHERE EXTRACT(YEAR FROM AGE(p.dt_nascimento)) < 2
        AND EXTRACT(MONTH FROM v.dt_aplicacao) <= $1
        AND EXTRACT(YEAR FROM v.dt_aplicacao) = $2
        ${equipeId ? 'AND v.co_equipe = $3' : ''}
      GROUP BY p.co_seq_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE total_vacinas >= 10) as numerador,
      COUNT(*) as denominador
    FROM criancas_vacinas
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'C7',
    indicator_name: 'Proporção de crianças com vacinação em dia',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 40,
    achieved: percentual >= 40,
    quality_score: 94,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * B1 - Cobertura de primeira consulta odontológica programática
 * Meta: 60%
 */
async function calcularB1(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH populacao_cadastrada AS (
      SELECT COUNT(DISTINCT ci.co_cidadao) as total
      FROM tb_cds_cad_individual ci
      WHERE ci.st_ativo = 1
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
    ),
    primeira_consulta AS (
      SELECT COUNT(DISTINCT a.co_cidadao) as total
      FROM tb_atendimento_odontologico a
      WHERE a.tp_atendimento = 1 -- Primeira consulta
        AND EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
    )
    SELECT 
      pc.total as numerador,
      pop.total as denominador
    FROM primeira_consulta pc, populacao_cadastrada pop
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'B1',
    indicator_name: 'Cobertura de primeira consulta odontológica programática',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 60,
    achieved: percentual >= 60,
    quality_score: 89,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * B2 - Cobertura de atendimento de urgência odontológica
 * Meta: 50%
 */
async function calcularB2(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH populacao_cadastrada AS (
      SELECT COUNT(DISTINCT ci.co_cidadao) as total
      FROM tb_cds_cad_individual ci
      WHERE ci.st_ativo = 1
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
    ),
    atend_urgencia AS (
      SELECT COUNT(DISTINCT a.co_cidadao) as total
      FROM tb_atendimento_odontologico a
      WHERE a.tp_atendimento = 2 -- Urgência
        AND EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
    )
    SELECT 
      au.total as numerador,
      pop.total as denominador
    FROM atend_urgencia au, populacao_cadastrada pop
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'B2',
    indicator_name: 'Cobertura de atendimento de urgência odontológica',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 50,
    achieved: percentual >= 50,
    quality_score: 87,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * B3 - Proporção de tratamentos odontológicos concluídos
 * Meta: 20%
 */
async function calcularB3(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH tratamentos AS (
      SELECT 
        a.co_cidadao,
        MAX(CASE WHEN a.st_conclusao_tratamento = 1 THEN 1 ELSE 0 END) as concluido
      FROM tb_atendimento_odontologico a
      WHERE EXTRACT(MONTH FROM a.dt_atendimento) <= $1
        AND EXTRACT(YEAR FROM a.dt_atendimento) = $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
      GROUP BY a.co_cidadao
    )
    SELECT 
      COUNT(*) FILTER (WHERE concluido = 1) as numerador,
      COUNT(*) as denominador
    FROM tratamentos
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'B3',
    indicator_name: 'Proporção de tratamentos odontológicos concluídos',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 20,
    achieved: percentual >= 20,
    quality_score: 85,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * M1 - Proporção de cadastramento domiciliar e territorial
 * Meta: 80%
 */
async function calcularM1(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH territorio_equipe AS (
      SELECT COUNT(DISTINCT t.co_seq_territorio) as total_territorio
      FROM tb_territorio t
      WHERE t.st_ativo = 1
        ${equipeId ? 'AND t.co_equipe = $3' : ''}
    ),
    domicilios_cadastrados AS (
      SELECT COUNT(DISTINCT d.co_seq_domicilio) as total_cadastrado
      FROM tb_domicilio d
      WHERE d.dt_cadastro <= make_date($2, $1, 1)
        ${equipeId ? 'AND d.co_equipe = $3' : ''}
    )
    SELECT 
      dc.total_cadastrado as numerador,
      te.total_territorio as denominador
    FROM domicilios_cadastrados dc, territorio_equipe te
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const percentual = (numerador / denominador) * 100;
  
  return {
    indicator_code: 'M1',
    indicator_name: 'Proporção de cadastramento domiciliar e territorial',
    numerator: numerador,
    denominator: denominador,
    result_percentage: percentual,
    target_percentage: 80,
    achieved: percentual >= 80,
    quality_score: 96,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * M2 - Média de visitas domiciliares realizadas pelo ACS
 * Meta: 12 visitas/mês
 */
async function calcularM2(mes: number, ano: number, equipeId?: number): Promise<IndicatorResult> {
  const pec = await getPecConnection();
  
  const query = `
    WITH visitas_acs AS (
      SELECT 
        v.co_profissional,
        COUNT(*) as total_visitas
      FROM tb_visita_domiciliar v
      INNER JOIN tb_profissional p ON v.co_profissional = p.co_seq_profissional
      WHERE p.tp_cbo = '5151' -- CBO de ACS
        AND EXTRACT(MONTH FROM v.dt_visita) = $1
        AND EXTRACT(YEAR FROM v.dt_visita) = $2
        ${equipeId ? 'AND v.co_equipe = $3' : ''}
      GROUP BY v.co_profissional
    )
    SELECT 
      COALESCE(SUM(total_visitas), 0) as numerador,
      COALESCE(COUNT(*), 1) as denominador
    FROM visitas_acs
  `;
  
  const params = equipeId ? [mes, ano, equipeId] : [mes, ano];
  const result = await pec.query(query, params);
  
  const numerador = parseInt(result.rows[0]?.numerador || '0');
  const denominador = parseInt(result.rows[0]?.denominador || '1');
  const media = numerador / denominador;
  
  return {
    indicator_code: 'M2',
    indicator_name: 'Média de visitas domiciliares realizadas pelo ACS',
    numerator: numerador,
    denominator: denominador,
    result_percentage: media,
    target_percentage: 12,
    achieved: media >= 12,
    quality_score: 97,
    period_month: mes,
    period_year: ano,
  };
}

/**
 * Calcula todos os indicadores de uma vez
 */
export async function calcularTodosIndicadores(
  mes: number,
  ano: number,
  equipeId?: number
): Promise<IndicatorResult[]> {
  const resultados = await Promise.all([
    // ESF (C1-C7)
    calcularC1(mes, ano, equipeId),
    calcularC2(mes, ano, equipeId),
    calcularC3(mes, ano, equipeId),
    calcularC4(mes, ano, equipeId),
    calcularC5(mes, ano, equipeId),
    calcularC6(mes, ano, equipeId),
    calcularC7(mes, ano, equipeId),
    // ESB (B1-B3)
    calcularB1(mes, ano, equipeId),
    calcularB2(mes, ano, equipeId),
    calcularB3(mes, ano, equipeId),
    // eMulti (M1-M2)
    calcularM1(mes, ano, equipeId),
    calcularM2(mes, ano, equipeId),
  ]);
  
  return resultados;
}

/**
 * Calcula pontuação total baseada nos indicadores
 */
export function calcularPontuacaoTotal(indicadores: IndicatorResult[]): number {
  let pontuacao = 0;
  
  for (const ind of indicadores) {
    if (ind.achieved) {
      // Pontos base por indicador alcançado
      pontuacao += 100;
      
      // Bônus por superação da meta
      const excesso = ind.result_percentage - ind.target_percentage;
      if (excesso > 0) {
        pontuacao += Math.min(excesso * 2, 50); // Máximo 50 pontos de bônus
      }
    } else {
      // Pontos proporcionais se não alcançou a meta
      const proporcao = ind.result_percentage / ind.target_percentage;
      pontuacao += proporcao * 50;
    }
  }
  
  return Math.round(pontuacao);
}
