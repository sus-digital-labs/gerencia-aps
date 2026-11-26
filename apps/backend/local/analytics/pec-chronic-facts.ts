import { chronicCareCurrentMethodFrom } from "./pec-chronic-rules";

export const consultationCbo = "cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253)[0-9]{2}$'";
const historicalMeasurementCbo = "(cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253|3222)[0-9]{2}$' OR cbo.nu_cbo = '515105')";
const currentPressureCbo = "cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253|2232|2234|2236|2237|2238|2239|2241|3222|3224)[0-9]{2}$'";
const currentAnthropometryCbo = "(cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253|2232|2234|2236|2237|2238|2239|2241|3222)[0-9]{2}$' OR cbo.nu_cbo = '515105')";
const hba1cCbo = "cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253|2232|2237|3222)[0-9]{2}$'";
const footCbo = "cbo.nu_cbo ~ '^(2235|2231|2251|2252|2253|2234|2236|2239)[0-9]{2}$'";
const hba1c = "('0202010503', 'ABEX008')";
const anthropometry = "('0101040024', '0101040083', '0101040075')";
const measurementCbo = (alias: string, current: string) =>
  `(CASE WHEN ${alias}.month >= '${chronicCareCurrentMethodFrom}' THEN ${current} ELSE ${historicalMeasurementCbo} END)`;
const validMeasurement = (field: string) => `${field} > 0 AND ${field} < 'Infinity'::float8`;
export const chronicSigtapCodes = ["0301100039", "0101040024", "0101040083", "0101040075", "0202010503", "0301040095",
  "0301010030", "0301010064", "0301010250"] as const;
const chronicProcedures = chronicSigtapCodes.map(code => `'${code}'`).join(", ");

export const dayKey = (date: string) => `to_char(${date}, 'YYYYMMDD')::integer`;

// As fontes estabelecem evidência positiva da prática na cópia. A ausência de
// uma ocorrência local não prova que a pessoa deixou de receber o cuidado.
export const chronicCareFacts = `cohort_members AS (
  SELECT month, array_agg(DISTINCT person) AS people FROM cohort GROUP BY month
), cohort_facts AS (
  SELECT DISTINCT f.month, f.person, f.fact_person, f.birth, ${dayKey("f.upper_day")} AS upper_key,
    ${dayKey("f.upper_day - interval '12 months'")} AS lower_key
  FROM fact_people f JOIN cohort_members c ON c.month = f.month AND f.person = ANY(c.people)
), individual_practices AS (
  SELECT p.month, p.person, d.dt_registro::date AS day,
    (${consultationCbo} AND kind.nu_identificador IN ('1','2','3','5','6','7','8')) AS consultation,
    (${measurementCbo("p", currentPressureCbo)} AND a.nu_pressao_sistolica > 0 AND a.nu_pressao_diastolica > 0) AS pressure,
    (${measurementCbo("p", currentAnthropometryCbo)} AND ${validMeasurement("a.nu_peso")}) AS weight,
    (${measurementCbo("p", currentAnthropometryCbo)} AND ${validMeasurement("a.nu_altura")}) AS height
  FROM cohort_facts p JOIN tb_fat_atendimento_individual a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = a.co_dim_tempo AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha
  JOIN tb_dim_tipo_atendimento kind ON kind.co_seq_dim_tipo_atendimento = a.co_dim_tipo_atendimento
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = a.co_dim_cbo_1
  JOIN health_professionals pro ON pro.id = a.co_dim_profissional_1
  JOIN aps_units unit ON unit.id = a.co_dim_unidade_saude_1
  WHERE form.nu_identificador IN ('4','9') AND NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL AND a.nu_atendimento IS NOT NULL
), visits AS (
  SELECT p.month, p.person, d.dt_registro::date AS day,
    (${measurementCbo("p", currentPressureCbo)}
      AND a.nu_medicao_pressao_arterial ~ '^[1-9][0-9]{1,2}[[:space:]]*/[[:space:]]*[1-9][0-9]{1,2}$') AS pressure,
    (${validMeasurement("a.nu_peso")}) AS weight,
    (${validMeasurement("a.nu_altura")}) AS height
  FROM cohort_facts p JOIN tb_fat_visita_domiciliar a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = a.co_dim_tempo AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_desfecho_visita outcome ON outcome.co_seq_dim_desfecho_visita = a.co_dim_desfecho_visita
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha AND form.nu_identificador IN ('8','9')
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = a.co_dim_cbo
  JOIN health_professionals pro ON pro.id = a.co_dim_profissional
  JOIN aps_units unit ON unit.id = a.co_dim_unidade_saude
  WHERE cbo.nu_cbo IN ('515105','322255') AND outcome.nu_identificador IN ('1','2','3')
    AND 1 IN (a.st_mot_vis_cad_att, a.st_mot_vis_visita_periodica, a.st_mot_vis_busca_ativa,
      a.st_mot_vis_acompanhamento, a.st_mot_vis_egresso_internacao, a.st_mot_vis_ctrl_ambnte_vetor,
      a.st_mot_vis_convte_atvidd_cltva, a.st_mot_vis_orintacao_prevncao, a.st_mot_vis_outros)
    AND NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL
), collective_practices AS (
  SELECT p.month, p.person, d.dt_registro::date AS day, a.co_dim_tempo AS day_key,
    a.co_dim_profissional, a.co_dim_cbo, a.co_dim_unidade_saude, procedure.co_seq_dim_procedimento AS pressure_procedure,
    (${measurementCbo("p", currentAnthropometryCbo)} AND (ext.st_prat_saude_antropometria = 1 OR ${validMeasurement("a.nu_participante_peso")})) AS weight,
    (${measurementCbo("p", currentAnthropometryCbo)} AND (ext.st_prat_saude_antropometria = 1 OR ${validMeasurement("a.nu_participante_altura")})) AS height
  FROM cohort_facts p
  JOIN tb_fat_atvdd_coletiva_part a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = a.co_dim_tempo AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_tipo_atividade kind ON kind.co_seq_dim_tipo_atividade = a.co_dim_tipo_atividade
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha AND form.nu_identificador IN ('6','9')
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = a.co_dim_cbo
  JOIN health_professionals pro ON pro.id = a.co_dim_profissional
  JOIN aps_units unit ON unit.id = a.co_dim_unidade_saude
  LEFT JOIN tb_fat_atvdd_coletiva_ext ext ON ext.co_fat_atividade_coletiva = a.co_fat_atividade_coletiva
    AND ext.co_dim_tempo = a.co_dim_tempo
  LEFT JOIN tb_dim_procedimento procedure ON procedure.co_seq_dim_procedimento = ext.co_dim_procedimento
    AND procedure.co_proced = '0301100039'
  WHERE kind.nu_identificador IN ('04','05','06','07','4','5','6','7')
    AND NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL
    AND (ext.st_prat_saude_antropometria = 1 OR ${validMeasurement("a.nu_participante_peso")}
      OR ${validMeasurement("a.nu_participante_altura")} OR procedure.co_seq_dim_procedimento IS NOT NULL)
), procedure_records AS (
  SELECT p.month, p.person, a.co_dim_tempo AS day, a.co_dim_profissional AS worker_id,
    a.co_dim_cbo AS cbo_id, a.co_dim_unidade_saude AS unit_id, a.co_dim_procedimento AS procedure_id,
    false AS requested, false AS individual_record
  FROM cohort_facts p JOIN tb_fat_proced_atend_proced a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha AND form.nu_identificador IN ('7','9')
  WHERE NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL AND a.nu_atendimento IS NOT NULL
  UNION ALL
  SELECT p.month, p.person, a.co_dim_tempo, a.co_dim_profissional_1, a.co_dim_cbo_1, a.co_dim_unidade_saude_1,
    event.procedure_id, event.requested, true
  FROM cohort_facts p JOIN tb_fat_atd_ind_procedimentos a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha AND form.nu_identificador IN ('4','9')
  CROSS JOIN LATERAL (VALUES (a.co_dim_procedimento_avaliado, false), (a.co_dim_procedimento_solicitado, true)) event(procedure_id, requested)
  WHERE NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL AND a.nu_atendimento IS NOT NULL
  UNION ALL
  SELECT p.month, p.person, a.co_dim_tempo, a.co_dim_profissional_1, a.co_dim_cbo_1, a.co_dim_unidade_saude_1,
    a.co_dim_procedimento, false, true
  FROM cohort_facts p JOIN tb_fat_atd_ind_exames a ON a.co_fat_cidadao_pec = p.fact_person
    AND a.co_dim_tempo >= p.lower_key AND a.co_dim_tempo < p.upper_key
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha AND form.nu_identificador IN ('4','9')
  JOIN tb_dim_procedimento exam ON exam.co_seq_dim_procedimento = a.co_dim_procedimento AND exam.co_proced IN ${hba1c}
  WHERE NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL AND a.nu_atendimento IS NOT NULL
  UNION ALL
  SELECT a.month, a.person, a.day_key, a.co_dim_profissional, a.co_dim_cbo, a.co_dim_unidade_saude,
    a.pressure_procedure, false, false
  FROM collective_practices a WHERE a.pressure_procedure IS NOT NULL
), historical_cbo_procedure AS (
  SELECT * FROM jsonb_to_recordset($6::jsonb) AS entry(code text,cbo text,first_month text,last_month text)
), local_cbo_procedure AS (
  SELECT DISTINCT proc.co_proced, cbo.co_cbo_2002, r.dt_competencia
  FROM tb_proced proc
  JOIN rl_proced_cbo r ON r.co_proced = proc.co_seq_proced AND r.st_ativo = 1
  JOIN tb_cbo cbo ON cbo.co_cbo = r.co_cbo
  WHERE r.dt_competencia NOT BETWEEN $7 AND $8 AND proc.co_proced IN (${chronicProcedures})
), qualified_procedures AS (
  SELECT a.month, a.person, d.dt_registro::date AS day, proc.co_proced,
    (proc.co_proced = '0301100039' AND ${measurementCbo("a", currentPressureCbo)}) AS pressure,
    (proc.co_proced IN ${anthropometry} AND ${measurementCbo("a", currentAnthropometryCbo)}) AS anthropometry,
    (proc.co_proced IN ${hba1c} AND ${hba1cCbo}) AS hemoglobin,
    (proc.co_proced = '0301040095' AND ${footCbo}) AS feet,
    ((proc.co_proced = '0301010030' AND cbo.nu_cbo ~ '^2235[0-9]{2}$')
      OR (proc.co_proced = '0301010064' AND cbo.nu_cbo ~ '^(2231|2251|2252|2253)[0-9]{2}$')
      OR (proc.co_proced = '0301010250' AND ${consultationCbo})) AS consultation
  FROM procedure_records a
  JOIN tb_dim_procedimento proc ON proc.co_seq_dim_procedimento = a.procedure_id
    AND proc.co_proced IN (${chronicProcedures},'ABEX008')
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = a.day AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = a.cbo_id
  JOIN health_professionals pro ON pro.id = a.worker_id
  JOIN aps_units unit ON unit.id = a.unit_id
  LEFT JOIN historical_cbo_procedure historical ON historical.code = proc.co_proced AND historical.cbo = cbo.nu_cbo
    AND to_char(d.dt_registro,'YYYYMM') BETWEEN historical.first_month AND historical.last_month
  LEFT JOIN local_cbo_procedure r ON r.co_proced = proc.co_proced AND r.co_cbo_2002 = cbo.nu_cbo
    AND r.dt_competencia = to_char(d.dt_registro,'YYYYMM')
  WHERE (NOT a.requested OR proc.co_proced IN ${hba1c})
    AND (proc.co_proced IN ('ABEX008','0301010250') OR (a.individual_record AND proc.co_proced IN ${hba1c})
      OR historical.code IS NOT NULL OR r.co_proced IS NOT NULL)
), measurements AS (
  SELECT month, person, day, weight, height FROM individual_practices
  UNION ALL
  SELECT month, person, day, weight, height FROM visits
  UNION ALL
  SELECT month, person, day, weight, height FROM collective_practices
  UNION ALL
  SELECT month, person, day, co_proced IN ('0101040024','0101040083'), co_proced IN ('0101040024','0101040075')
  FROM qualified_procedures WHERE anthropometry
), combined_measurements AS (
  SELECT month, person, day FROM measurements GROUP BY month, person, day HAVING bool_or(weight) AND bool_or(height)
), influenza AS (
  SELECT DISTINCT p.month, p.person
  FROM cohort_facts p
  JOIN tb_fat_vacinacao a ON a.co_fat_cidadao_pec = p.fact_person AND a.co_dim_tempo < p.upper_key AND a.dt_nascimento = p.birth
  JOIN tb_fat_vacinacao_vacina v ON v.co_fat_vacinacao = a.co_seq_fat_vacinacao
    AND v.co_dim_tempo_vacina_aplicada >= p.lower_key
    AND v.co_dim_tempo_vacina_aplicada < p.upper_key
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = v.co_dim_tempo_vacina_aplicada
    AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_imunobiologico product ON product.co_seq_dim_imunobiologico = v.co_dim_imunobiologico
  JOIN tb_dim_dose_imunobiologico dose ON dose.co_seq_dim_dose_imunobiologico = v.co_dim_dose_imunobiologico
  JOIN tb_dim_estrategia_vacinacao strategy ON strategy.co_seq_dim_estrategia_vacnacao = v.co_dim_estrategia_vacinacao
  JOIN tb_dim_imunobiologico_fabrcnt manufacturer ON manufacturer.co_seq_dim_imunobiol_fabrc = v.co_dim_imunobiologico_fabrc
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = a.co_dim_tipo_ficha
  JOIN health_professionals pro ON pro.id = v.co_dim_profissional
  JOIN aps_units unit ON unit.id = v.co_dim_unidade_saude
  WHERE product.nu_identificador IN ('33','77') AND dose.nu_identificador = '9'
    AND strategy.nu_identificador ~ '^[0-9]+$' AND NULLIF(btrim(v.no_lote), '') IS NOT NULL
    AND NULLIF(btrim(manufacturer.no_fabricante), '') IS NOT NULL
    AND form.nu_identificador IN ('9','14') AND NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL
    AND v.nu_uuid_ficha = a.nu_uuid_ficha AND v.nu_atendimento = a.nu_atendimento
    AND coalesce(v.st_aplicado_exterior, 0) = 0
), practice_facts AS (
  SELECT month, person, day, consultation, pressure, false AS anthropometry,
    false AS visit, false AS hemoglobin, false AS feet, false AS influenza
  FROM individual_practices
  UNION ALL
  SELECT month, person, day, false, pressure, false, true, false, false, false FROM visits
  UNION ALL
  SELECT month, person, day, consultation, pressure, false, false, hemoglobin, feet, false FROM qualified_procedures
  UNION ALL
  SELECT month, person, day, false, false, true, false, false, false, false FROM combined_measurements
  UNION ALL
  SELECT month, person, NULL::date, false, false, false, false, false, false, true FROM influenza
), practice_by_person AS (
  SELECT f.month, f.person,
    bool_or(consultation) AS consultation_twelve,
    bool_or(consultation AND day >= (p.upper_day - interval '6 months')::date) AS consultation_six,
    bool_or(pressure AND day >= (p.upper_day - interval '6 months')::date) AS pressure,
    bool_or(anthropometry) AS anthropometry,
    max(day) FILTER (WHERE visit) - min(day) FILTER (WHERE visit) >= 30 AS visits,
    bool_or(hemoglobin) AS hemoglobin, bool_or(feet) AS feet, bool_or(influenza) AS influenza
  FROM practice_facts f JOIN periods p ON p.month = f.month
  GROUP BY f.month, f.person
)`;
