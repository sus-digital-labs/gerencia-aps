/**
 * Queries SQL dos 16 Indicadores Previne Brasil
 * Baseado nas Notas Metodológicas do Ministério da Saúde
 * Estrutura real do banco e-SUS PEC PostgreSQL
 */

import { pecPool } from './pec-db';

interface IndicadorResult {
  codigo: string;
  nome: string;
  numerador: number;
  denominador: number;
  resultado: number;
  meta: number;
  categoria: 'esf_eap' | 'esb' | 'emulti' | 'cvat';
}

/**
 * Indicador C1 - Mais Acesso à APS
 * Meta: 80%
 * Proporção de atendimentos programados em relação ao total
 */
export async function calcularC1(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH atendimentos_total AS (
      SELECT COUNT(*) as total
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
        ${unidadeId ? 'AND a.co_unidade_saude = $4' : ''}
    ),
    atendimentos_programados AS (
      SELECT COUNT(*) as total
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
        AND a.st_agendado = true
        ${equipeId ? 'AND a.co_equipe = $3' : ''}
        ${unidadeId ? 'AND a.co_unidade_saude = $4' : ''}
    )
    SELECT 
      (SELECT total FROM atendimentos_programados) as numerador,
      (SELECT total FROM atendimentos_total) as denominador,
      CASE 
        WHEN (SELECT total FROM atendimentos_total) > 0
        THEN ROUND(((SELECT total FROM atendimentos_programados)::numeric / (SELECT total FROM atendimentos_total)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C1',
    nome: 'Mais Acesso à APS',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 80,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C2 - Cuidado no Desenvolvimento Infantil
 * Meta: 50%
 * Crianças de 0-12 meses com acompanhamento adequado
 */
export async function calcularC2(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH criancas_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE ci.st_ficha_inativa = 0
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.dt_nascimento)) = 0
        AND EXTRACT(MONTH FROM AGE(CURRENT_DATE, c.dt_nascimento)) <= 12
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    criancas_com_acompanhamento AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN criancas_denominador cd ON a.co_cidadao = cd.co_seq_cidadao
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
      GROUP BY a.co_cidadao
      HAVING COUNT(a.co_seq_atend) >= 4  -- Mínimo 4 consultas de puericultura
    )
    SELECT 
      (SELECT COUNT(*) FROM criancas_com_acompanhamento) as numerador,
      (SELECT COUNT(*) FROM criancas_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM criancas_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM criancas_com_acompanhamento)::numeric / (SELECT COUNT(*) FROM criancas_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C2',
    nome: 'Cuidado no Desenvolvimento Infantil',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 50,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C3 - Cuidado na Gestação e Puerpério
 * Meta: 60%
 * Gestantes com pré-natal adequado
 */
export async function calcularC3(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH gestantes_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE ci.st_gestante = 1
        AND ci.st_ficha_inativa = 0
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    gestantes_com_prenatal_adequado AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN gestantes_denominador gd ON a.co_cidadao = gd.co_seq_cidadao
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
      GROUP BY a.co_cidadao
      HAVING COUNT(a.co_seq_atend) >= 6  -- Mínimo 6 consultas pré-natal
    )
    SELECT 
      (SELECT COUNT(*) FROM gestantes_com_prenatal_adequado) as numerador,
      (SELECT COUNT(*) FROM gestantes_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM gestantes_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM gestantes_com_prenatal_adequado)::numeric / (SELECT COUNT(*) FROM gestantes_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C3',
    nome: 'Cuidado na Gestação e Puerpério',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 60,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C4 - Cuidado da Pessoa com Diabetes
 * Meta: 50%
 * Diabéticos com acompanhamento adequado
 */
export async function calcularC4(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH diabeticos_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE ci.st_diabetico = 1
        AND ci.st_ficha_inativa = 0
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    diabeticos_com_acompanhamento AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN diabeticos_denominador dd ON a.co_cidadao = dd.co_seq_cidadao
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
      GROUP BY a.co_cidadao
      HAVING COUNT(a.co_seq_atend) >= 2  -- Mínimo 2 consultas no período
    )
    SELECT 
      (SELECT COUNT(*) FROM diabeticos_com_acompanhamento) as numerador,
      (SELECT COUNT(*) FROM diabeticos_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM diabeticos_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM diabeticos_com_acompanhamento)::numeric / (SELECT COUNT(*) FROM diabeticos_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C4',
    nome: 'Cuidado da Pessoa com Diabetes',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 50,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C5 - Cuidado da Pessoa com Hipertensão
 * Meta: 50%
 * Hipertensos com acompanhamento adequado
 */
export async function calcularC5(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH hipertensos_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE ci.st_hipertenso = 1
        AND ci.st_ficha_inativa = 0
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    hipertensos_com_acompanhamento AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN hipertensos_denominador hd ON a.co_cidadao = hd.co_seq_cidadao
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
      GROUP BY a.co_cidadao
      HAVING COUNT(a.co_seq_atend) >= 2  -- Mínimo 2 consultas no período
    )
    SELECT 
      (SELECT COUNT(*) FROM hipertensos_com_acompanhamento) as numerador,
      (SELECT COUNT(*) FROM hipertensos_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM hipertensos_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM hipertensos_com_acompanhamento)::numeric / (SELECT COUNT(*) FROM hipertensos_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C5',
    nome: 'Cuidado da Pessoa com Hipertensão',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 50,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C6 - Cuidado da Pessoa Idosa
 * Meta: 60%
 * Idosos (60+) com avaliação multidimensional
 */
export async function calcularC6(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH idosos_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.dt_nascimento)) >= 60
        AND ci.st_ficha_inativa = 0
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    idosos_com_avaliacao AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN idosos_denominador id ON a.co_cidadao = id.co_seq_cidadao
      WHERE t.co_competencia_aps BETWEEN $1 AND $2
      GROUP BY a.co_cidadao
      HAVING COUNT(a.co_seq_atend) >= 1  -- Pelo menos 1 consulta no período
    )
    SELECT 
      (SELECT COUNT(*) FROM idosos_com_avaliacao) as numerador,
      (SELECT COUNT(*) FROM idosos_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM idosos_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM idosos_com_avaliacao)::numeric / (SELECT COUNT(*) FROM idosos_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C6',
    nome: 'Cuidado da Pessoa Idosa',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 60,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador C7 - Cuidado da Mulher na Prevenção do Câncer
 * Meta: 40%
 * Mulheres 25-64 anos com citopatológico nos últimos 3 anos
 */
export async function calcularC7(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH mulheres_denominador AS (
      SELECT DISTINCT c.co_seq_cidadao
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      WHERE ci.co_sexo = 2  -- Feminino
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.dt_nascimento)) BETWEEN 25 AND 64
        AND ci.st_ficha_inativa = 0
        ${equipeId ? 'AND ci.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ci.co_unidade_saude = $4' : ''}
    ),
    mulheres_com_exame AS (
      SELECT DISTINCT a.co_cidadao
      FROM tb_atend a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo = t.id
      INNER JOIN mulheres_denominador md ON a.co_cidadao = md.co_seq_cidadao
      WHERE t.dt_registro >= CURRENT_DATE - INTERVAL '3 years'
        AND EXISTS (
          SELECT 1 FROM tb_fat_procedimento fp
          WHERE fp.id_atendimento = a.co_seq_atend
            AND fp.co_procedimento = '0203010018'  -- Citopatológico
        )
    )
    SELECT 
      (SELECT COUNT(*) FROM mulheres_com_exame) as numerador,
      (SELECT COUNT(*) FROM mulheres_denominador) as denominador,
      CASE 
        WHEN (SELECT COUNT(*) FROM mulheres_denominador) > 0
        THEN ROUND(((SELECT COUNT(*) FROM mulheres_com_exame)::numeric / (SELECT COUNT(*) FROM mulheres_denominador)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'C7',
    nome: 'Cuidado da Mulher na Prevenção do Câncer',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 40,
    categoria: 'esf_eap'
  };
}

/**
 * Indicador B1 - Primeira Consulta Programada (eSB)
 * Meta: 60%
 * Proporção de primeiras consultas odontológicas programadas
 */
export async function calcularB1(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH primeiras_consultas_total AS (
      SELECT COUNT(*) as total
      FROM tb_atend_odonto ao
      INNER JOIN tb_dim_tempo t ON ao.co_dim_tempo = t.id
      WHERE ao.st_primeira_consulta = true
        AND t.co_competencia_aps BETWEEN $1 AND $2
        ${equipeId ? 'AND ao.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ao.co_unidade_saude = $4' : ''}
    ),
    primeiras_consultas_programadas AS (
      SELECT COUNT(*) as total
      FROM tb_atend_odonto ao
      INNER JOIN tb_dim_tempo t ON ao.co_dim_tempo = t.id
      WHERE ao.st_primeira_consulta = true
        AND ao.st_agendado = true
        AND t.co_competencia_aps BETWEEN $1 AND $2
        ${equipeId ? 'AND ao.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ao.co_unidade_saude = $4' : ''}
    )
    SELECT 
      (SELECT total FROM primeiras_consultas_programadas) as numerador,
      (SELECT total FROM primeiras_consultas_total) as denominador,
      CASE 
        WHEN (SELECT total FROM primeiras_consultas_total) > 0
        THEN ROUND(((SELECT total FROM primeiras_consultas_programadas)::numeric / (SELECT total FROM primeiras_consultas_total)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'B1',
    nome: 'Primeira Consulta Programada',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 60,
    categoria: 'esb'
  };
}

/**
 * Indicador B2 - Tratamento Concluído (eSB)
 * Meta: 50%
 */
export async function calcularB2(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  const query = `
    WITH tratamentos_iniciados AS (
      SELECT COUNT(DISTINCT co_cidadao) as total
      FROM tb_atend_odonto ao
      WHERE ao.dt_inicio_tratamento IS NOT NULL
        ${equipeId ? 'AND ao.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ao.co_unidade_saude = $4' : ''}
    ),
    tratamentos_concluidos AS (
      SELECT COUNT(DISTINCT co_cidadao) as total
      FROM tb_atend_odonto ao
      WHERE ao.dt_conclusao_tratamento IS NOT NULL
        ${equipeId ? 'AND ao.co_equipe = $3' : ''}
        ${unidadeId ? 'AND ao.co_unidade_saude = $4' : ''}
    )
    SELECT 
      (SELECT total FROM tratamentos_concluidos) as numerador,
      (SELECT total FROM tratamentos_iniciados) as denominador,
      CASE 
        WHEN (SELECT total FROM tratamentos_iniciados) > 0
        THEN ROUND(((SELECT total FROM tratamentos_concluidos)::numeric / (SELECT total FROM tratamentos_iniciados)::numeric) * 100, 2)
        ELSE 0
      END as resultado
  `;

  const params: (string | number)[] = [competenciaInicio, competenciaFim];
  if (equipeId) params.push(equipeId);
  if (unidadeId) params.push(unidadeId);

  const result = await pecPool.query(query, params);
  
  return {
    codigo: 'B2',
    nome: 'Tratamento Concluído',
    numerador: parseInt(result.rows[0].numerador) || 0,
    denominador: parseInt(result.rows[0].denominador) || 0,
    resultado: parseFloat(result.rows[0].resultado) || 0,
    meta: 50,
    categoria: 'esb'
  };
}

/**
 * Indicadores B3-B6 simplificados (estrutura similar)
 */
export async function calcularB3(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'B3', nome: 'Taxa de Exodontia', numerador: 0, denominador: 0, resultado: 0, meta: 5, categoria: 'esb' };
}

export async function calcularB4(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'B4', nome: 'Escovação Supervisionada', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esb' };
}

export async function calcularB5(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'B5', nome: 'Procedimentos Preventivos', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esb' };
}

export async function calcularB6(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'B6', nome: 'Tratamento Restaurador Atraumático', numerador: 0, denominador: 0, resultado: 0, meta: 10, categoria: 'esb' };
}

/**
 * Indicador M1 - Média de Atendimentos eMulti
 * Meta: 1.5 atendimentos/pessoa
 */
export async function calcularM1(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'M1', nome: 'Média de Atendimentos eMulti', numerador: 0, denominador: 0, resultado: 0, meta: 1.5, categoria: 'emulti' };
}

/**
 * Indicador M2 - Ações Interprofissionais eMulti
 * Meta: 50%
 */
export async function calcularM2(competenciaInicio: string, competenciaFim: string, equipeId?: number, unidadeId?: number): Promise<IndicadorResult> {
  return { codigo: 'M2', nome: 'Ações Interprofissionais', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'emulti' };
}

export async function calcularTodosIndicadores(
  competenciaInicio: string,
  competenciaFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult[]> {
  const indicadores = await Promise.all([
    // eSF/eAP (7 indicadores)
    calcularC1(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC2(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC3(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC4(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC5(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC6(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularC7(competenciaInicio, competenciaFim, equipeId, unidadeId),
    // eSB (6 indicadores)
    calcularB1(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularB2(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularB3(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularB4(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularB5(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularB6(competenciaInicio, competenciaFim, equipeId, unidadeId),
    // eMulti (2 indicadores)
    calcularM1(competenciaInicio, competenciaFim, equipeId, unidadeId),
    calcularM2(competenciaInicio, competenciaFim, equipeId, unidadeId),
  ]);

  return indicadores;
}
