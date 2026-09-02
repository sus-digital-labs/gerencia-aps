/**
 * Módulo de Queries SQL Diretas no PEC PostgreSQL
 * 
 * Este módulo contém TODAS as queries SQL para acessar dados reais do e-SUS PEC
 * Tabelas principais:
 * - tb_dim_cidadao: Dados cadastrais dos cidadãos
 * - tb_fat_atendimento_individual: Atendimentos individuais
 * - tb_fat_visita_domiciliar: Visitas domiciliares
 * - tb_dim_profissional: Profissionais de saúde
 * - tb_dim_equipe: Equipes de saúde
 * - tb_dim_unidade_saude: Unidades de saúde
 * - tb_fat_procedimento: Procedimentos realizados
 * - tb_cds_cad_individual: Cadastro individual (ficha de cadastro)
 */

import { getPecConnection } from './db';

// ============================================
// INDICADORES PREVINE BRASIL 2024/2025
// ============================================

/**
 * Indicador 1: Proporção de gestantes com pelo menos 6 consultas pré-natal realizadas
 * Meta: 60%
 */
export async function calcularIndicador1(params: {
  competencia: string; // YYYYMM
  cnes?: string;
  ine?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes AS (
      SELECT DISTINCT
        c.co_seq_dim_cidadao,
        c.nu_cns,
        c.no_cidadao,
        COUNT(DISTINCT a.co_seq_fat_atendimento_individual) as total_consultas
      FROM tb_dim_cidadao c
      INNER JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
      INNER JOIN tb_fat_atendimento_individual a ON c.co_seq_dim_cidadao = a.co_dim_cidadao_fk
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE 1=1
        AND cad.st_gestante = 1
        AND t.nu_competencia = $1
        ${params.cnes ? 'AND a.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $2)' : ''}
        ${params.ine ? 'AND a.co_dim_equipe_fk IN (SELECT co_seq_dim_equipe FROM tb_dim_equipe WHERE nu_ine = $3)' : ''}
      GROUP BY c.co_seq_dim_cidadao, c.nu_cns, c.no_cidadao
    )
    SELECT
      COUNT(*) FILTER (WHERE total_consultas >= 6) as numerador,
      COUNT(*) as denominador,
      ROUND((COUNT(*) FILTER (WHERE total_consultas >= 6)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as percentual
    FROM gestantes;
  `;
  
  const values = [params.competencia];
  if (params.cnes) values.push(params.cnes);
  if (params.ine) values.push(params.ine);
  
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 2: Proporção de gestantes com realização de exames para sífilis e HIV
 * Meta: 60%
 */
export async function calcularIndicador2(params: {
  competencia: string;
  cnes?: string;
  ine?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes_exames AS (
      SELECT DISTINCT
        c.co_seq_dim_cidadao,
        c.nu_cns,
        c.no_cidadao,
        MAX(CASE WHEN p.co_procedimento IN ('0202031179', '0202031187') THEN 1 ELSE 0 END) as tem_sifilis,
        MAX(CASE WHEN p.co_procedimento IN ('0202031063', '0202031071') THEN 1 ELSE 0 END) as tem_hiv
      FROM tb_dim_cidadao c
      INNER JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
      INNER JOIN tb_fat_procedimento p ON c.co_seq_dim_cidadao = p.co_dim_cidadao_fk
      INNER JOIN tb_dim_tempo t ON p.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE 1=1
        AND cad.st_gestante = 1
        AND t.nu_competencia = $1
        ${params.cnes ? 'AND p.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $2)' : ''}
      GROUP BY c.co_seq_dim_cidadao, c.nu_cns, c.no_cidadao
    )
    SELECT
      COUNT(*) FILTER (WHERE tem_sifilis = 1 AND tem_hiv = 1) as numerador,
      COUNT(*) as denominador,
      ROUND((COUNT(*) FILTER (WHERE tem_sifilis = 1 AND tem_hiv = 1)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as percentual
    FROM gestantes_exames;
  `;
  
  const values = [params.competencia];
  if (params.cnes) values.push(params.cnes);
  
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 3: Proporção de gestantes com atendimento odontológico realizado
 * Meta: 60%
 */
export async function calcularIndicador3(params: {
  competencia: string;
  cnes?: string;
  ine?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH gestantes_odonto AS (
      SELECT DISTINCT
        c.co_seq_dim_cidadao,
        c.nu_cns,
        c.no_cidadao,
        COUNT(DISTINCT a.co_seq_fat_atendimento_individual) as total_atend_odonto
      FROM tb_dim_cidadao c
      INNER JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
      INNER JOIN tb_fat_atendimento_individual a ON c.co_seq_dim_cidadao = a.co_dim_cidadao_fk
      INNER JOIN tb_dim_profissional prof ON a.co_dim_profissional_fk = prof.co_seq_dim_profissional
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE 1=1
        AND cad.st_gestante = 1
        AND prof.co_cbo IN ('223293', '223252') -- CBO Cirurgião Dentista
        AND t.nu_competencia = $1
      GROUP BY c.co_seq_dim_cidadao, c.nu_cns, c.no_cidadao
    )
    SELECT
      COUNT(*) FILTER (WHERE total_atend_odonto >= 1) as numerador,
      COUNT(*) as denominador,
      ROUND((COUNT(*) FILTER (WHERE total_atend_odonto >= 1)::numeric / NULLIF(COUNT(*), 0)) * 100, 2) as percentual
    FROM gestantes_odonto;
  `;
  
  const values = [params.competencia];
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 4: Proporção de mulheres com coleta de citopatológico na APS
 * Meta: 40%
 */
export async function calcularIndicador4(params: {
  competencia: string;
  cnes?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH mulheres_alvo AS (
      SELECT DISTINCT c.co_seq_dim_cidadao
      FROM tb_dim_cidadao c
      WHERE c.co_dim_sexo = 2 -- Feminino
        AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.dt_nascimento)) BETWEEN 25 AND 64
    ),
    mulheres_com_exame AS (
      SELECT DISTINCT p.co_dim_cidadao_fk
      FROM tb_fat_procedimento p
      INNER JOIN tb_dim_tempo t ON p.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE p.co_procedimento = '0203010086' -- Coleta de citopatológico
        AND t.nu_competencia >= TO_CHAR(CURRENT_DATE - INTERVAL '3 years', 'YYYYMM')
        ${params.cnes ? 'AND p.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $1)' : ''}
    )
    SELECT
      COUNT(DISTINCT e.co_dim_cidadao_fk) as numerador,
      COUNT(DISTINCT a.co_seq_dim_cidadao) as denominador,
      ROUND((COUNT(DISTINCT e.co_dim_cidadao_fk)::numeric / NULLIF(COUNT(DISTINCT a.co_seq_dim_cidadao), 0)) * 100, 2) as percentual
    FROM mulheres_alvo a
    LEFT JOIN mulheres_com_exame e ON a.co_seq_dim_cidadao = e.co_dim_cidadao_fk;
  `;
  
  const values = params.cnes ? [params.cnes] : [];
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 5: Proporção de diabéticos com hemoglobina glicada solicitada
 * Meta: 50%
 */
export async function calcularIndicador5(params: {
  competencia: string;
  cnes?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH diabeticos AS (
      SELECT DISTINCT c.co_seq_dim_cidadao
      FROM tb_dim_cidadao c
      INNER JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
      WHERE cad.st_diabete = 1
    ),
    diabeticos_com_hba1c AS (
      SELECT DISTINCT p.co_dim_cidadao_fk
      FROM tb_fat_procedimento p
      INNER JOIN tb_dim_tempo t ON p.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE p.co_procedimento IN ('0202010473', '0202010465') -- Hemoglobina glicada
        AND t.nu_competencia >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYYMM')
        ${params.cnes ? 'AND p.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $1)' : ''}
    )
    SELECT
      COUNT(DISTINCT h.co_dim_cidadao_fk) as numerador,
      COUNT(DISTINCT d.co_seq_dim_cidadao) as denominador,
      ROUND((COUNT(DISTINCT h.co_dim_cidadao_fk)::numeric / NULLIF(COUNT(DISTINCT d.co_seq_dim_cidadao), 0)) * 100, 2) as percentual
    FROM diabeticos d
    LEFT JOIN diabeticos_com_hba1c h ON d.co_seq_dim_cidadao = h.co_dim_cidadao_fk;
  `;
  
  const values = params.cnes ? [params.cnes] : [];
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 6: Proporção de hipertensos com pressão arterial aferida
 * Meta: 50%
 */
export async function calcularIndicador6(params: {
  competencia: string;
  cnes?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH hipertensos AS (
      SELECT DISTINCT c.co_seq_dim_cidadao
      FROM tb_dim_cidadao c
      INNER JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
      WHERE cad.st_hipertensao_arterial = 1
    ),
    hipertensos_com_pa AS (
      SELECT DISTINCT a.co_dim_cidadao_fk
      FROM tb_fat_atendimento_individual a
      INNER JOIN tb_dim_tempo t ON a.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE a.nu_pressao_arterial_sistolica IS NOT NULL
        AND a.nu_pressao_arterial_diastolica IS NOT NULL
        AND t.nu_competencia >= TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYYMM')
        ${params.cnes ? 'AND a.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $1)' : ''}
    )
    SELECT
      COUNT(DISTINCT p.co_dim_cidadao_fk) as numerador,
      COUNT(DISTINCT h.co_seq_dim_cidadao) as denominador,
      ROUND((COUNT(DISTINCT p.co_dim_cidadao_fk)::numeric / NULLIF(COUNT(DISTINCT h.co_seq_dim_cidadao), 0)) * 100, 2) as percentual
    FROM hipertensos h
    LEFT JOIN hipertensos_com_pa p ON h.co_seq_dim_cidadao = p.co_dim_cidadao_fk;
  `;
  
  const values = params.cnes ? [params.cnes] : [];
  const result = await pec.query(query, values);
  return result.rows[0];
}

/**
 * Indicador 7: Proporção de crianças de 1 ano vacinadas
 * Meta: 95%
 */
export async function calcularIndicador7(params: {
  competencia: string;
  cnes?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    WITH criancas_1ano AS (
      SELECT DISTINCT c.co_seq_dim_cidadao
      FROM tb_dim_cidadao c
      WHERE EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.dt_nascimento)) = 1
    ),
    criancas_vacinadas AS (
      SELECT DISTINCT v.co_dim_cidadao_fk
      FROM tb_fat_vacinacao v
      INNER JOIN tb_dim_tempo t ON v.co_dim_tempo_fk = t.co_seq_dim_tempo
      WHERE v.co_imunobiologico IN ('83', '84', '85', '86', '87') -- Vacinas obrigatórias 1º ano
        AND t.nu_competencia <= $1
        ${params.cnes ? 'AND v.co_dim_unidade_saude_fk IN (SELECT co_seq_dim_unidade_saude FROM tb_dim_unidade_saude WHERE nu_cnes = $2)' : ''}
      GROUP BY v.co_dim_cidadao_fk
      HAVING COUNT(DISTINCT v.co_imunobiologico) >= 5
    )
    SELECT
      COUNT(DISTINCT v.co_dim_cidadao_fk) as numerador,
      COUNT(DISTINCT c.co_seq_dim_cidadao) as denominador,
      ROUND((COUNT(DISTINCT v.co_dim_cidadao_fk)::numeric / NULLIF(COUNT(DISTINCT c.co_seq_dim_cidadao), 0)) * 100, 2) as percentual
    FROM criancas_1ano c
    LEFT JOIN criancas_vacinadas v ON c.co_seq_dim_cidadao = v.co_dim_cidadao_fk;
  `;
  
  const values = [params.competencia];
  if (params.cnes) values.push(params.cnes);
  
  const result = await pec.query(query, values);
  return result.rows[0];
}

// ============================================
// BUSCA DE CIDADÃOS
// ============================================

export async function buscarCidadaos(params: {
  termo: string;
  limite?: number;
}) {
  const pec = await getPecConnection();
  
  const query = `
    SELECT
      c.co_seq_dim_cidadao as id,
      c.nu_cns as cns,
      c.nu_cpf_cidadao as cpf,
      c.no_cidadao as nome,
      c.dt_nascimento as dataNascimento,
      s.no_sexo as sexo,
      c.no_nome_mae as nomeMae,
      u.no_unidade_saude as unidadeSaude,
      e.no_equipe as equipe
    FROM tb_dim_cidadao c
    LEFT JOIN tb_dim_sexo s ON c.co_dim_sexo = s.co_seq_dim_sexo
    LEFT JOIN tb_cds_cad_individual cad ON c.co_seq_dim_cidadao = cad.co_dim_cidadao_fk
    LEFT JOIN tb_dim_unidade_saude u ON cad.co_dim_unidade_saude_fk = u.co_seq_dim_unidade_saude
    LEFT JOIN tb_dim_equipe e ON cad.co_dim_equipe_fk = e.co_seq_dim_equipe
    WHERE 1=1
      AND (
        LOWER(c.no_cidadao) LIKE LOWER($1)
        OR c.nu_cns LIKE $1
        OR c.nu_cpf_cidadao LIKE $1
      )
    ORDER BY c.no_cidadao
    LIMIT $2;
  `;
  
  const termo = `%${params.termo}%`;
  const limite = params.limite || 50;
  
  const result = await pec.query(query, [termo, limite]);
  return result.rows;
}

// ============================================
// VISITAS DOMICILIARES
// ============================================

export async function listarVisitasDomiciliares(params: {
  competencia: string;
  ineEquipe?: string;
  cnsProfissional?: string;
}) {
  const pec = await getPecConnection();
  
  const query = `
    SELECT
      v.co_seq_fat_visita_domiciliar as id,
      v.dt_visita as dataVisita,
      c.no_cidadao as cidadao,
      c.nu_cns as cnsCidadao,
      prof.no_profissional as profissional,
      e.no_equipe as equipe,
      tv.ds_tipo_visita as tipoVisita,
      v.st_visita_realizada as visitaRealizada,
      v.ds_motivo_visita as motivoVisita
    FROM tb_fat_visita_domiciliar v
    INNER JOIN tb_dim_cidadao c ON v.co_dim_cidadao_fk = c.co_seq_dim_cidadao
    INNER JOIN tb_dim_profissional prof ON v.co_dim_profissional_fk = prof.co_seq_dim_profissional
    INNER JOIN tb_dim_equipe e ON v.co_dim_equipe_fk = e.co_seq_dim_equipe
    INNER JOIN tb_dim_tipo_visita tv ON v.co_dim_tipo_visita_fk = tv.co_seq_dim_tipo_visita
    INNER JOIN tb_dim_tempo t ON v.co_dim_tempo_fk = t.co_seq_dim_tempo
    WHERE t.nu_competencia = $1
      ${params.ineEquipe ? 'AND e.nu_ine = $2' : ''}
      ${params.cnsProfissional ? 'AND prof.nu_cns = $3' : ''}
    ORDER BY v.dt_visita DESC;
  `;
  
  const values = [params.competencia];
  if (params.ineEquipe) values.push(params.ineEquipe);
  if (params.cnsProfissional) values.push(params.cnsProfissional);
  
  const result = await pec.query(query, values);
  return result.rows;
}

// ============================================
// QUALIDADE DE DADOS
// ============================================

export async function analisarQualidadeDados() {
  const pec = await getPecConnection();
  
  const query = `
    WITH stats AS (
      SELECT
        COUNT(*) as total_cidadaos,
        COUNT(nu_cpf_cidadao) as com_cpf,
        COUNT(nu_cns) as com_cns,
        COUNT(dt_nascimento) as com_data_nascimento,
        COUNT(no_nome_mae) as com_nome_mae,
        COUNT(CASE WHEN st_faleceu = 1 THEN 1 END) as falecidos
      FROM tb_dim_cidadao
    )
    SELECT
      total_cidadaos,
      com_cpf,
      com_cns,
      com_data_nascimento,
      com_nome_mae,
      falecidos,
      ROUND((com_cpf::numeric / NULLIF(total_cidadaos, 0)) * 100, 2) as percentual_cpf,
      ROUND((com_cns::numeric / NULLIF(total_cidadaos, 0)) * 100, 2) as percentual_cns,
      ROUND((com_data_nascimento::numeric / NULLIF(total_cidadaos, 0)) * 100, 2) as percentual_data_nascimento,
      ROUND((com_nome_mae::numeric / NULLIF(total_cidadaos, 0)) * 100, 2) as percentual_nome_mae
    FROM stats;
  `;
  
  const result = await pec.query(query);
  return result.rows[0];
}

export async function detectarDuplicatas() {
  const pec = await getPecConnection();
  
  const query = `
    SELECT
      nu_cpf_cidadao as cpf,
      COUNT(*) as total_duplicatas,
      STRING_AGG(no_cidadao, ', ') as nomes
    FROM tb_dim_cidadao
    WHERE nu_cpf_cidadao IS NOT NULL
    GROUP BY nu_cpf_cidadao
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
    LIMIT 100;
  `;
  
  const result = await pec.query(query);
  return result.rows;
}
