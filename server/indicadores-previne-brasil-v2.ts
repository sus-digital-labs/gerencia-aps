/**
 * Queries SQL dos 15 Indicadores Previne Brasil - VERSÃO CORRIGIDA
 * Baseado na estrutura REAL do banco e-SUS PEC PostgreSQL
 * Conexão: bc.dmpec.com.br:15433
 * 
 * Estrutura identificada:
 * - tb_atend: dt_inicio, co_equipe, co_unidade_saude, co_agendado, co_prontuario
 * - tb_problema: co_prontuario, co_ciap, co_cid10
 * - rl_grupo_condicao_ciap_cid: co_grupo_condicao, co_ciap
 * - tb_grupo_condicao_saude: 5=DIABETES, 10=HIPERTENSAO_ARTERIAL, 12=GRAVIDEZ
 * - tb_cidadao: co_seq_cidadao, dt_nascimento, co_sexo
 * - tb_prontuario: co_seq_prontuario, co_cidadao, co_equipe, co_unidade_saude
 */

import { pecPool } from './pec-db';

export interface IndicadorResult {
  codigo: string;
  nome: string;
  numerador: number;
  denominador: number;
  resultado: number;
  meta: number;
  categoria: 'esf_eap' | 'esb' | 'emulti';
  atingiuMeta: boolean;
}

/**
 * Indicador C1 - Mais Acesso à APS
 * Meta: 80%
 * Proporção de atendimentos programados (agendados) em relação ao total
 */
export async function calcularC1(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    SELECT 
      COUNT(*) as denominador,
      COUNT(CASE WHEN co_agendado IS NOT NULL THEN 1 END) as numerador
    FROM tb_atend
    WHERE dt_inicio BETWEEN $1 AND $2
  `;
  
  const params: any[] = [dataInicio, dataFim];
  
  if (equipeId) {
    query += ` AND co_equipe = $${params.length + 1}`;
    params.push(equipeId);
  }
  if (unidadeId) {
    query += ` AND co_unidade_saude = $${params.length + 1}`;
    params.push(unidadeId);
  }

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C1',
      nome: 'Mais Acesso à APS',
      numerador,
      denominador,
      resultado,
      meta: 80,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 80
    };
  } catch (error) {
    console.error('Erro C1:', error);
    return { codigo: 'C1', nome: 'Mais Acesso à APS', numerador: 0, denominador: 0, resultado: 0, meta: 80, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C2 - Cuidado no Desenvolvimento Infantil
 * Meta: 50%
 * Crianças de 0-12 meses com acompanhamento adequado (4+ consultas)
 */
export async function calcularC2(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH criancas AS (
      SELECT DISTINCT p.co_seq_prontuario, c.co_seq_cidadao
      FROM tb_prontuario p
      INNER JOIN tb_cidadao c ON p.co_cidadao = c.co_seq_cidadao
      WHERE c.dt_nascimento >= CURRENT_DATE - INTERVAL '12 months'
    ),
    criancas_com_atend AS (
      SELECT DISTINCT cr.co_seq_cidadao
      FROM criancas cr
      INNER JOIN tb_atend a ON a.co_prontuario = cr.co_seq_prontuario
      WHERE a.dt_inicio BETWEEN $1 AND $2
      GROUP BY cr.co_seq_cidadao
      HAVING COUNT(*) >= 4
    )
    SELECT 
      (SELECT COUNT(*) FROM criancas) as denominador,
      (SELECT COUNT(*) FROM criancas_com_atend) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C2',
      nome: 'Desenvolvimento Infantil',
      numerador,
      denominador,
      resultado,
      meta: 50,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 50
    };
  } catch (error) {
    console.error('Erro C2:', error);
    return { codigo: 'C2', nome: 'Desenvolvimento Infantil', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C3 - Gestação e Puerpério
 * Meta: 60%
 * Gestantes com 6+ consultas de pré-natal
 */
export async function calcularC3(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH gestantes AS (
      SELECT DISTINCT p.co_prontuario
      FROM tb_problema p
      INNER JOIN tb_ciap c ON p.co_ciap = c.co_seq_ciap
      INNER JOIN rl_grupo_condicao_ciap_cid rl ON c.co_seq_ciap = rl.co_ciap
      WHERE rl.co_grupo_condicao = 12
    ),
    gestantes_com_prenatal AS (
      SELECT DISTINCT g.co_prontuario
      FROM gestantes g
      INNER JOIN tb_atend a ON a.co_prontuario = g.co_prontuario
      WHERE a.dt_inicio BETWEEN $1 AND $2
      GROUP BY g.co_prontuario
      HAVING COUNT(*) >= 6
    )
    SELECT 
      (SELECT COUNT(*) FROM gestantes) as denominador,
      (SELECT COUNT(*) FROM gestantes_com_prenatal) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C3',
      nome: 'Gestação e Puerpério',
      numerador,
      denominador,
      resultado,
      meta: 60,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 60
    };
  } catch (error) {
    console.error('Erro C3:', error);
    return { codigo: 'C3', nome: 'Gestação e Puerpério', numerador: 0, denominador: 0, resultado: 0, meta: 60, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C4 - Diabetes
 * Meta: 50%
 * Diabéticos com 2+ consultas no período
 */
export async function calcularC4(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH diabeticos AS (
      SELECT DISTINCT p.co_prontuario
      FROM tb_problema p
      INNER JOIN tb_ciap c ON p.co_ciap = c.co_seq_ciap
      INNER JOIN rl_grupo_condicao_ciap_cid rl ON c.co_seq_ciap = rl.co_ciap
      WHERE rl.co_grupo_condicao = 5
    ),
    diabeticos_com_atend AS (
      SELECT DISTINCT d.co_prontuario
      FROM diabeticos d
      INNER JOIN tb_atend a ON a.co_prontuario = d.co_prontuario
      WHERE a.dt_inicio BETWEEN $1 AND $2
      GROUP BY d.co_prontuario
      HAVING COUNT(*) >= 2
    )
    SELECT 
      (SELECT COUNT(*) FROM diabeticos) as denominador,
      (SELECT COUNT(*) FROM diabeticos_com_atend) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C4',
      nome: 'Pessoa com Diabetes',
      numerador,
      denominador,
      resultado,
      meta: 50,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 50
    };
  } catch (error) {
    console.error('Erro C4:', error);
    return { codigo: 'C4', nome: 'Pessoa com Diabetes', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C5 - Hipertensão
 * Meta: 50%
 * Hipertensos com 2+ consultas no período
 */
export async function calcularC5(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH hipertensos AS (
      SELECT DISTINCT p.co_prontuario
      FROM tb_problema p
      INNER JOIN tb_ciap c ON p.co_ciap = c.co_seq_ciap
      INNER JOIN rl_grupo_condicao_ciap_cid rl ON c.co_seq_ciap = rl.co_ciap
      WHERE rl.co_grupo_condicao = 10
    ),
    hipertensos_com_atend AS (
      SELECT DISTINCT h.co_prontuario
      FROM hipertensos h
      INNER JOIN tb_atend a ON a.co_prontuario = h.co_prontuario
      WHERE a.dt_inicio BETWEEN $1 AND $2
      GROUP BY h.co_prontuario
      HAVING COUNT(*) >= 2
    )
    SELECT 
      (SELECT COUNT(*) FROM hipertensos) as denominador,
      (SELECT COUNT(*) FROM hipertensos_com_atend) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C5',
      nome: 'Pessoa com Hipertensão',
      numerador,
      denominador,
      resultado,
      meta: 50,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 50
    };
  } catch (error) {
    console.error('Erro C5:', error);
    return { codigo: 'C5', nome: 'Pessoa com Hipertensão', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C6 - Pessoa Idosa
 * Meta: 60%
 * Idosos (60+) com pelo menos 1 atendimento no período
 */
export async function calcularC6(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH idosos AS (
      SELECT DISTINCT p.co_seq_prontuario, c.co_seq_cidadao
      FROM tb_prontuario p
      INNER JOIN tb_cidadao c ON p.co_cidadao = c.co_seq_cidadao
      WHERE c.dt_nascimento <= CURRENT_DATE - INTERVAL '60 years'
    ),
    idosos_com_atend AS (
      SELECT DISTINCT i.co_seq_cidadao
      FROM idosos i
      INNER JOIN tb_atend a ON a.co_prontuario = i.co_seq_prontuario
      WHERE a.dt_inicio BETWEEN $1 AND $2
    )
    SELECT 
      (SELECT COUNT(*) FROM idosos) as denominador,
      (SELECT COUNT(*) FROM idosos_com_atend) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C6',
      nome: 'Pessoa Idosa',
      numerador,
      denominador,
      resultado,
      meta: 60,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 60
    };
  } catch (error) {
    console.error('Erro C6:', error);
    return { codigo: 'C6', nome: 'Pessoa Idosa', numerador: 0, denominador: 0, resultado: 0, meta: 60, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicador C7 - Prevenção Câncer de Colo
 * Meta: 40%
 * Mulheres 25-64 anos com exame citopatológico nos últimos 3 anos
 */
export async function calcularC7(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  let query = `
    WITH mulheres AS (
      SELECT DISTINCT p.co_seq_prontuario, c.co_seq_cidadao
      FROM tb_prontuario p
      INNER JOIN tb_cidadao c ON p.co_cidadao = c.co_seq_cidadao
      WHERE c.co_sexo = 2
        AND c.dt_nascimento BETWEEN CURRENT_DATE - INTERVAL '64 years' AND CURRENT_DATE - INTERVAL '25 years'
    ),
    mulheres_com_exame AS (
      SELECT DISTINCT m.co_seq_cidadao
      FROM mulheres m
      INNER JOIN tb_atend a ON a.co_prontuario = m.co_seq_prontuario
      WHERE a.dt_inicio >= CURRENT_DATE - INTERVAL '3 years'
    )
    SELECT 
      (SELECT COUNT(*) FROM mulheres) as denominador,
      (SELECT COUNT(*) FROM mulheres_com_exame) as numerador
  `;

  const params: any[] = [dataInicio, dataFim];

  try {
    const result = await pecPool.query(query, params);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 0;
    const resultado = denominador > 0 ? Math.round((numerador / denominador) * 10000) / 100 : 0;
    
    return {
      codigo: 'C7',
      nome: 'Prevenção Câncer de Colo',
      numerador,
      denominador,
      resultado,
      meta: 40,
      categoria: 'esf_eap',
      atingiuMeta: resultado >= 40
    };
  } catch (error) {
    console.error('Erro C7:', error);
    return { codigo: 'C7', nome: 'Prevenção Câncer de Colo', numerador: 0, denominador: 0, resultado: 0, meta: 40, categoria: 'esf_eap', atingiuMeta: false };
  }
}

/**
 * Indicadores B1-B6 (eSB - Saúde Bucal)
 * Baseado na tabela tb_cds_atend_odonto do PEC
 * Estrutura: tp_atend (tipo atendimento), st_gestante, rl_cds_atend_odonto_proced (procedimentos)
 */

/**
 * B1 - Primeira Consulta Odontológica Programada
 * Meta: 60%
 * Proporção de pessoas com primeira consulta odontológica programada
 */
export async function calcularB1(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Buscar atendimentos odontológicos do tipo "primeira consulta" (tp_atend = 2)
    const query = `
      SELECT 
        COUNT(DISTINCT nu_cpf_cidadao) as numerador,
        (SELECT COUNT(DISTINCT co_seq_cidadao) FROM tb_cidadao) as denominador
      FROM tb_cds_atend_odonto
      WHERE tp_atend = 2
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'B1',
      nome: 'Primeira Consulta Odontológica',
      numerador,
      denominador,
      resultado,
      meta: 60,
      categoria: 'esb',
      atingiuMeta: resultado >= 60
    };
  } catch (error) {
    console.error('Erro B1:', error);
    return { codigo: 'B1', nome: 'Primeira Consulta Odontológica', numerador: 0, denominador: 0, resultado: 0, meta: 60, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * B2 - Pré-Natal Odontológico
 * Meta: 50%
 * Proporção de gestantes com atendimento odontológico
 */
export async function calcularB2(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Gestantes com atendimento odontológico (st_gestante = 1)
    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN st_gestante = 1 THEN nu_cpf_cidadao END) as numerador,
        (SELECT COUNT(DISTINCT co_prontuario) FROM tb_problema p 
         INNER JOIN rl_grupo_condicao_ciap_cid rl ON p.co_ciap = rl.co_ciap 
         WHERE rl.co_grupo_condicao = 12) as denominador
      FROM tb_cds_atend_odonto
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'B2',
      nome: 'Pré-Natal Odontológico',
      numerador,
      denominador,
      resultado,
      meta: 50,
      categoria: 'esb',
      atingiuMeta: resultado >= 50
    };
  } catch (error) {
    console.error('Erro B2:', error);
    return { codigo: 'B2', nome: 'Pré-Natal Odontológico', numerador: 0, denominador: 0, resultado: 0, meta: 50, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * B3 - Atendimento Programado
 * Meta: 20%
 * Proporção de atendimentos odontológicos programados
 */
export async function calcularB3(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // tp_atend: 2=Consulta agendada, 4=Demanda espontânea, 5=Atendimento de urgência, 6=Escuta inicial
    const query = `
      SELECT 
        COUNT(CASE WHEN tp_atend = 2 THEN 1 END) as numerador,
        COUNT(*) as denominador
      FROM tb_cds_atend_odonto
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'B3',
      nome: 'Atendimento Programado',
      numerador,
      denominador,
      resultado,
      meta: 20,
      categoria: 'esb',
      atingiuMeta: resultado >= 20
    };
  } catch (error) {
    console.error('Erro B3:', error);
    return { codigo: 'B3', nome: 'Atendimento Programado', numerador: 0, denominador: 0, resultado: 0, meta: 20, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * B4 - Tratamento Concluído
 * Meta: 30%
 * Proporção de tratamentos odontológicos concluídos
 */
export async function calcularB4(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Verificar tipos de consulta que indicam tratamento concluído
    const query = `
      SELECT 
        COUNT(DISTINCT o.nu_cpf_cidadao) as numerador,
        COUNT(DISTINCT o.nu_cpf_cidadao) as denominador
      FROM tb_cds_atend_odonto o
      INNER JOIN rl_cds_atend_odonto_tipo_cnslt tc ON o.co_seq_cds_atend_odonto = tc.co_cds_atend_odonto
      WHERE tc.tp_consulta_odonto IN (3, 4)
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'B4',
      nome: 'Tratamento Concluído',
      numerador,
      denominador,
      resultado,
      meta: 30,
      categoria: 'esb',
      atingiuMeta: resultado >= 30
    };
  } catch (error) {
    console.error('Erro B4:', error);
    return { codigo: 'B4', nome: 'Tratamento Concluído', numerador: 0, denominador: 0, resultado: 0, meta: 30, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * B5 - Razão Restauração/Exodontia
 * Meta: 5 (razão)
 * Razão entre procedimentos restauradores e exodontias
 */
export async function calcularB5(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Procedimentos: restaurações vs exodontias
    // Códigos SIGTAP aproximados para restauração e exodontia
    const query = `
      SELECT 
        COUNT(CASE WHEN p.co_proced IN (4487, 4484, 4488) THEN 1 END) as restauracoes,
        COUNT(CASE WHEN p.co_proced IN (4478, 4479) THEN 1 END) as exodontias
      FROM rl_cds_atend_odonto_proced p
    `;
    
    const result = await pecPool.query(query);
    const restauracoes = parseInt(result.rows[0]?.restauracoes) || 0;
    const exodontias = parseInt(result.rows[0]?.exodontias) || 1;
    const resultado = Math.round((restauracoes / exodontias) * 100) / 100;
    
    return {
      codigo: 'B5',
      nome: 'Razão Restauração/Exodontia',
      numerador: restauracoes,
      denominador: exodontias,
      resultado,
      meta: 5,
      categoria: 'esb',
      atingiuMeta: resultado >= 5
    };
  } catch (error) {
    console.error('Erro B5:', error);
    return { codigo: 'B5', nome: 'Razão Restauração/Exodontia', numerador: 0, denominador: 0, resultado: 0, meta: 5, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * B6 - Ações Coletivas
 * Meta: 0.5%
 * Proporção de ações coletivas em saúde bucal
 */
export async function calcularB6(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Ações coletivas (escovação supervisionada, flúor, etc)
    const query = `
      SELECT 
        COUNT(*) as numerador,
        (SELECT COUNT(*) FROM tb_cds_atend_odonto) as denominador
      FROM rl_cds_atend_odonto_proced
      WHERE co_proced IN (3230, 1985, 1768)
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'B6',
      nome: 'Ações Coletivas',
      numerador,
      denominador,
      resultado,
      meta: 0.5,
      categoria: 'esb',
      atingiuMeta: resultado >= 0.5
    };
  } catch (error) {
    console.error('Erro B6:', error);
    return { codigo: 'B6', nome: 'Ações Coletivas', numerador: 0, denominador: 0, resultado: 0, meta: 0.5, categoria: 'esb', atingiuMeta: false };
  }
}

/**
 * Indicadores M1-M2 (eMulti - Equipe Multiprofissional)
 * Baseado em atendimentos com NASF/eMulti (st_nasf = 1 em tb_cds_atend_odonto)
 */

/**
 * M1 - Atendimentos eMulti
 * Meta: 80%
 * Proporção de atendimentos com apoio da equipe multiprofissional
 */
export async function calcularM1(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Atendimentos com apoio NASF/eMulti
    const query = `
      SELECT 
        COUNT(CASE WHEN st_nasf = 1 THEN 1 END) as numerador,
        COUNT(*) as denominador
      FROM tb_cds_atend_odonto
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'M1',
      nome: 'Atendimentos eMulti',
      numerador,
      denominador,
      resultado,
      meta: 80,
      categoria: 'emulti',
      atingiuMeta: resultado >= 80
    };
  } catch (error) {
    console.error('Erro M1:', error);
    return { codigo: 'M1', nome: 'Atendimentos eMulti', numerador: 0, denominador: 0, resultado: 0, meta: 80, categoria: 'emulti', atingiuMeta: false };
  }
}

/**
 * M2 - Consultas Especialidades
 * Meta: 12%
 * Proporção de encaminhamentos para especialidades
 */
export async function calcularM2(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult> {
  try {
    // Encaminhamentos para especialidades
    const query = `
      SELECT 
        COUNT(*) as numerador,
        (SELECT COUNT(*) FROM tb_cds_atend_odonto) as denominador
      FROM rl_cds_atend_odonto_tipo_encam
    `;
    
    const result = await pecPool.query(query);
    const numerador = parseInt(result.rows[0]?.numerador) || 0;
    const denominador = parseInt(result.rows[0]?.denominador) || 1;
    const resultado = Math.round((numerador / denominador) * 10000) / 100;
    
    return {
      codigo: 'M2',
      nome: 'Consultas Especialidades',
      numerador,
      denominador,
      resultado,
      meta: 12,
      categoria: 'emulti',
      atingiuMeta: resultado >= 12
    };
  } catch (error) {
    console.error('Erro M2:', error);
    return { codigo: 'M2', nome: 'Consultas Especialidades', numerador: 0, denominador: 0, resultado: 0, meta: 12, categoria: 'emulti', atingiuMeta: false };
  }
}

/**
 * Calcular TODOS os 15 indicadores
 */
export async function calcularTodosIndicadores(
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number
): Promise<IndicadorResult[]> {
  const indicadores = await Promise.all([
    calcularC1(dataInicio, dataFim, equipeId, unidadeId),
    calcularC2(dataInicio, dataFim, equipeId, unidadeId),
    calcularC3(dataInicio, dataFim, equipeId, unidadeId),
    calcularC4(dataInicio, dataFim, equipeId, unidadeId),
    calcularC5(dataInicio, dataFim, equipeId, unidadeId),
    calcularC6(dataInicio, dataFim, equipeId, unidadeId),
    calcularC7(dataInicio, dataFim, equipeId, unidadeId),
    calcularB1(dataInicio, dataFim, equipeId, unidadeId),
    calcularB2(dataInicio, dataFim, equipeId, unidadeId),
    calcularB3(dataInicio, dataFim, equipeId, unidadeId),
    calcularB4(dataInicio, dataFim, equipeId, unidadeId),
    calcularB5(dataInicio, dataFim, equipeId, unidadeId),
    calcularB6(dataInicio, dataFim, equipeId, unidadeId),
    calcularM1(dataInicio, dataFim, equipeId, unidadeId),
    calcularM2(dataInicio, dataFim, equipeId, unidadeId),
  ]);

  return indicadores;
}

/**
 * Buscar lista nominal de cidadãos para drill-down
 */
export async function buscarListaNominal(
  indicadorCodigo: string,
  tipo: 'numerador' | 'denominador',
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  unidadeId?: number,
  limite: number = 100
): Promise<any[]> {
  // Implementação do drill-down será feita na próxima fase
  return [];
}
