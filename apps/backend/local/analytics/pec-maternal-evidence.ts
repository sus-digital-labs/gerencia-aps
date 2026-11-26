import { validCns, validCpf } from "./pec-identity-sql";

// Internal person identifiers stay inside PostgreSQL.
const clinician = "left(cbo.nu_cbo, 4) IN ('2231','2235','2251','2252','2253')";
const labCbo = `(${clinician} OR left(cbo.nu_cbo, 4) IN ('2234','3222'))`;
const measurementCbo = `(${clinician} OR left(cbo.nu_cbo, 4) IN
  ('2232','2234','2236','2237','2238','2239','2241','3222','3224') OR cbo.nu_cbo = '515105')`;
const professionalIdentity = validCns("btrim(prof.nu_cns)");
const compactCodes = (field: string) =>
  `regexp_split_to_array(upper(regexp_replace(coalesce(${field}, ''), '[.-]', '', 'g')), '[|,;[:space:]]+')`;
const visitReasons = [
  "st_mot_vis_cad_att", "st_mot_vis_visita_periodica", "st_mot_vis_busca_ativa", "st_mot_vis_acompanhamento",
  "st_mot_vis_egresso_internacao", "st_mot_vis_ctrl_ambnte_vetor", "st_mot_vis_convte_atvidd_cltva",
  "st_mot_vis_orintacao_prevncao", "st_mot_vis_outros",
].map(field => `f.${field} = 1`).join(" OR ");

export const pregnancyCiaps = "ABP001,W03,W78,W79,W81,W84,W85";
export const pregnancyCids = "^(O(1[0-6]|2[0-689]|3[0-6]|4[0134678]|98)[0-9]?|O75[23]|O99[0-7]|Z321|Z(33|34|35|36)[0-9]?|Z640)$";
export const postpartumCiaps = "ABP002,48,49,P29,W18,W19,W70,W90,W91,W92,W93,W94,W95,W96";
export const postpartumCids = "^(F53[0189]?|M830|O10[0-9]?|O152|O266|O72[23]|O(85|86|87|90|91|92|94|98|99)[0-9]?|Z37[0-79]|Z(38|39)[0-9]?)$";
export const pregnancyExclusionCids = "^(O0[2-6][0-9]?|Z303)$";
const childProducts = "9,17,22,24,26,29,39,42,43,46,47,56,58,59,106,107";

export function maternalEvidenceCtes(population: "child" | "pregnancy") {
  // Persisted dates bound the local monitoring window without certifying Siaps coverage.
  const facts = [
    "tb_fat_atendimento_individual", "tb_fat_proced_atend", "tb_fat_visita_domiciliar",
    "tb_fat_vacinacao", "tb_fat_atividade_coletiva",
    ...(population === "pregnancy" ? ["tb_fat_atendimento_odonto"] : []),
  ];
  const coverage = facts.map(table => `SELECT min(co_dim_tempo) AS starts, max(co_dim_tempo) AS ends
    FROM ${table} WHERE co_dim_tempo BETWEEN 20100101 AND (SELECT max_day FROM today)`).join(" UNION ALL ");
  const cohortFilter = population === "child"
    ? "AND (b.dt_registro::date + interval '24 months')::date >= $3::date" : "";
  const prenatalPeople = population === "pregnancy"
    ? `prenatal_population AS (
      SELECT DISTINCT pr.co_cidadao AS person FROM ta_pre_natal n
      JOIN tb_prontuario pr ON pr.co_seq_prontuario = n.co_prontuario
      WHERE (n.dt_ultima_menstruacao AT TIME ZONE 'America/Bahia')::date >= $3::date - 336
         OR (n.dt_desfecho AT TIME ZONE 'America/Bahia')::date >= $3::date - 42
    ),` : "";
  const prenatalJoin = population === "pregnancy" ? "JOIN prenatal_population prenatal ON prenatal.person = c.co_cidadao" : "";
  return `
WITH requested_scope AS (
  SELECT $1::text AS cnes, $2::text AS ine,
         EXISTS (
           SELECT 1 FROM tb_equipe e
           JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
           JOIN tb_tipo_equipe te ON te.co_seq_tipo_equipe = e.tp_equipe
           WHERE u.nu_cnes = $1 AND e.nu_ine = $2 AND te.nu_ms = '76' AND e.st_ativo = 1
         ) AS is_eap
), today AS (
  SELECT to_char((now() AT TIME ZONE 'America/Bahia')::date, 'YYYYMMDD')::bigint AS max_day
), local_aps_units AS (
  SELECT DISTINCT u.nu_cnes AS cnes
  FROM tb_equipe e JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
  JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe = e.tp_equipe
  WHERE t.nu_ms IN ('70', '71', '72', '76') AND u.nu_cnes ~ '^[0-9]{7}$'
), source_windows AS (
  ${coverage}
), source_coverage AS (
  SELECT CASE WHEN count(starts) = count(*) THEN to_date(max(starts)::text, 'YYYYMMDD') END AS covered_since,
         CASE WHEN count(ends) = count(*) THEN to_date(min(ends)::text, 'YYYYMMDD') END AS covered_through
  FROM source_windows
), source_cutoff AS (
  SELECT d.dt_registro::date AS cutoff, s.covered_since, s.covered_through
  FROM source_coverage s LEFT JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = (
    SELECT max(f.co_dim_tempo) FROM tb_fat_atendimento_individual f
    WHERE f.co_dim_tempo BETWEEN 20100101 AND (SELECT max_day FROM today)
  )
), months AS (
  SELECT s::date AS month_start,
         least((s + interval '1 month' - interval '1 day')::date, c.cutoff) AS assessed_on
  FROM generate_series($3::date, $4::date, interval '1 month') s
  CROSS JOIN source_cutoff c
  WHERE s::date <= c.cutoff
), bounds AS (
  SELECT (min(month_start) - interval '24 months')::date AS earliest_event,
         max(assessed_on) AS last_event
  FROM months
), candidates AS (
  SELECT DISTINCT a.co_cidadao
  FROM ta_cidadao_vinculacao_equipe a CROSS JOIN requested_scope s CROSS JOIN bounds b
  WHERE a.nu_cnes = s.cnes AND a.nu_ine = s.ine AND a.co_cidadao > 0
    AND a.dt_auditoria < b.last_event + 1
), links AS (
  SELECT a.co_cidadao, a.dt_auditoria, a.co_seq_tacidadaovinculacaoequp,
         a.co_tipo_auditoria, a.nu_cnes, a.nu_ine, a.st_usar_cadastro_individual,
         a.st_saida_cadastro_obito, a.st_saida_cadastro_territorio, a.dt_atualizacao_cadastro
  FROM ta_cidadao_vinculacao_equipe a
  JOIN candidates c ON c.co_cidadao = a.co_cidadao
  CROSS JOIN bounds b
  WHERE a.dt_auditoria < b.last_event + 1
), ${prenatalPeople}
people AS (
  SELECT c.co_cidadao AS person, f.co_seq_fat_cidadao_pec AS fact_person,
         b.dt_registro::date AS birth,
         CASE WHEN ${validCpf("btrim(f.nu_cpf_cidadao)")} THEN btrim(f.nu_cpf_cidadao) END AS cpf,
         CASE WHEN ${validCns("btrim(f.nu_cns)")} THEN btrim(f.nu_cns) END AS cns,
         citizen.dt_obito AS death_date
  FROM candidates c
  ${prenatalJoin}
  JOIN tb_cidadao citizen ON citizen.co_seq_cidadao = c.co_cidadao
  JOIN tb_fat_cidadao_pec f ON f.co_cidadao = c.co_cidadao AND coalesce(f.st_deletar, 0) = 0
  JOIN tb_dim_tempo b ON b.co_seq_dim_tempo = f.co_dim_tempo_nascimento
  WHERE b.dt_registro::date BETWEEN DATE '1900-01-01' AND (SELECT last_event FROM bounds)
    ${cohortFilter}
    AND nullif(btrim(citizen.no_cidadao), '') IS NOT NULL
    AND (${validCpf("btrim(f.nu_cpf_cidadao)")} OR ${validCns("btrim(f.nu_cns)")})
    AND NOT EXISTS (
      SELECT 1 FROM tb_fat_cidadao_pec d
      WHERE d.co_seq_fat_cidadao_pec <> f.co_seq_fat_cidadao_pec
        AND coalesce(d.st_deletar, 0) = 0
        AND (d.co_cidadao = f.co_cidadao
          OR (f.nu_cpf_cidadao ~ '^[0-9]{11}$' AND d.nu_cpf_cidadao = f.nu_cpf_cidadao)
          OR (f.nu_cns ~ '^[0-9]{15}$' AND d.nu_cns = f.nu_cns))
    )
), individual_events AS (
  SELECT DISTINCT p.person, day.dt_registro::date AS day,
         f.co_seq_fat_atd_ind AS source_id,
         f.nu_uuid_ficha, f.nu_atendimento,
         ${clinician} AS clinician, ${measurementCbo} AS measurement_cbo, ${labCbo} AS lab_cbo,
         visit_mode.nu_identificador AS mode,
         (f.nu_peso > 0) AS weight, (f.nu_altura > 0) AS height,
         (f.nu_pressao_sistolica > 0 OR f.nu_pressao_diastolica > 0) AS pressure,
         ${compactCodes("f.ds_filtro_ciaps")} AS ciaps,
         ${compactCodes("f.ds_filtro_cids")} AS cids,
         ${compactCodes("f.ds_filtro_proced_avaliados")} AS performed
  FROM people p
  JOIN tb_fat_atendimento_individual f ON f.co_fat_cidadao_pec = p.fact_person
  JOIN tb_dim_tempo day ON day.co_seq_dim_tempo = f.co_dim_tempo
  CROSS JOIN bounds b
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude_1
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo_1
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = f.co_dim_profissional_1 AND ${professionalIdentity}
  LEFT JOIN tb_dim_tipo_participacao_atend visit_mode ON visit_mode.co_seq_dim_tp_particip_atend = f.co_dim_tp_particip_cidadao
  WHERE f.co_dim_tempo BETWEEN to_char(b.earliest_event, 'YYYYMMDD')::bigint AND to_char(b.last_event, 'YYYYMMDD')::bigint
    AND f.dt_nascimento = p.birth AND btrim(f.nu_uuid_ficha) <> '' AND f.nu_atendimento > 0
    AND ((p.cpf ~ '^[0-9]{11}$' AND f.nu_cpf_cidadao = p.cpf) OR (p.cns ~ '^[0-9]{15}$' AND f.nu_cns = p.cns))
), procedure_events AS (
  SELECT DISTINCT p.person, day.dt_registro::date AS day,
         ${clinician} AS clinician, ${measurementCbo} AS measurement_cbo, ${labCbo} AS lab_cbo,
         left(cbo.nu_cbo, 4) IN ('2232','3224') AS dental_cbo,
         (f.nu_peso > 0) AS weight, (f.nu_altura > 0) AS height,
         (f.nu_pressao_sistolica > 0 OR f.nu_pressao_diastolica > 0) AS pressure,
         ${compactCodes("f.ds_filtro_procedimento")} AS performed
  FROM people p
  JOIN tb_fat_proced_atend f ON f.co_fat_cidadao_pec = p.fact_person
  JOIN tb_dim_tempo day ON day.co_seq_dim_tempo = f.co_dim_tempo
  CROSS JOIN bounds b
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = f.co_dim_profissional AND ${professionalIdentity}
  WHERE f.co_dim_tempo BETWEEN to_char(b.earliest_event, 'YYYYMMDD')::bigint AND to_char(b.last_event, 'YYYYMMDD')::bigint
    AND f.dt_nascimento = p.birth AND btrim(f.nu_uuid_ficha) <> '' AND f.nu_atendimento > 0
    AND ((p.cpf ~ '^[0-9]{11}$' AND f.nu_cpf_cidadao = p.cpf) OR (p.cns ~ '^[0-9]{15}$' AND f.nu_cns = p.cns))
), home_events AS (
  SELECT DISTINCT p.person, day.dt_registro::date AS day, f.nu_uuid_ficha,
         ds.nu_identificador AS outcome,
         (f.st_acomp_recem_nascido = 1 OR f.st_acomp_crianca = 1) AS child,
         (${visitReasons}) AS has_reason,
         (f.nu_peso > 0) AS weight, (f.nu_altura > 0) AS height,
         btrim(f.nu_medicao_pressao_arterial) ~ '^[1-9][0-9]{0,2}[/ ][1-9][0-9]{0,2}$' AS pressure
  FROM people p
  JOIN tb_fat_visita_domiciliar f ON f.co_fat_cidadao_pec = p.fact_person
  JOIN tb_dim_tempo day ON day.co_seq_dim_tempo = f.co_dim_tempo
  CROSS JOIN bounds b
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo AND cbo.nu_cbo IN ('515105','322255')
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = f.co_dim_profissional AND ${professionalIdentity}
  JOIN tb_dim_desfecho_visita ds ON ds.co_seq_dim_desfecho_visita = f.co_dim_desfecho_visita AND ds.nu_identificador IN ('1','2','3')
  WHERE f.co_dim_tempo BETWEEN to_char(b.earliest_event, 'YYYYMMDD')::bigint AND to_char(b.last_event, 'YYYYMMDD')::bigint
    AND f.dt_nascimento = p.birth AND btrim(f.nu_uuid_ficha) <> ''
    AND ((p.cpf ~ '^[0-9]{11}$' AND f.nu_cpf_cidadao = p.cpf) OR (p.cns ~ '^[0-9]{15}$' AND f.nu_cns = p.cns))
), collective_events AS (
  SELECT DISTINCT p.person, d.dt_registro::date AS day,
         ${measurementCbo} AS measurement_cbo, left(cbo.nu_cbo, 4) IN ('2232','3224') AS dental_cbo,
         (part.nu_participante_peso > 0) AS weight, (part.nu_participante_altura > 0) AS height,
         ${compactCodes("activity.ds_filtro_pratica_em_saude")} AS practices,
         procedure.co_proced AS procedure_code
  FROM people p
  JOIN tb_fat_atvdd_coletiva_part part ON part.co_fat_cidadao_pec = p.fact_person
  JOIN tb_fat_atividade_coletiva activity ON activity.co_seq_fat_atividade_coletiva = part.co_fat_atividade_coletiva
  JOIN tb_dim_tipo_atividade type ON type.co_seq_dim_tipo_atividade = activity.co_dim_tipo_atividade
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = activity.co_dim_tempo
  CROSS JOIN bounds b
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = activity.co_dim_unidade_saude
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  CROSS JOIN LATERAL (
    SELECT activity.co_dim_profissional AS professional, activity.co_dim_cbo AS cbo
    UNION
    SELECT participant.co_dim_profssinal_participante, participant.co_dim_cbo_participante
    FROM tb_fat_atvdd_coletiva_propart participant
    WHERE participant.co_fat_atividade_coletiva = activity.co_seq_fat_atividade_coletiva
  ) actor
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = actor.professional AND ${professionalIdentity}
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = actor.cbo
  LEFT JOIN tb_dim_procedimento procedure ON procedure.co_seq_dim_procedimento = activity.co_dim_procedimento
  WHERE d.dt_registro::date BETWEEN b.earliest_event AND b.last_event
    AND type.nu_identificador IN ('05','06','5','6')
    AND part.dt_participante_nascimento = p.birth AND nullif(btrim(activity.nu_uuid_ficha), '') IS NOT NULL
    AND ((p.cpf IS NOT NULL AND part.nu_cpf_participante = p.cpf) OR (p.cns IS NOT NULL AND btrim(part.nu_participante_cns) = p.cns))
), measurement_days AS (
  SELECT person, day, bool_or(weight) AND bool_or(height) AS pair, bool_or(pressure) AS pressure
  FROM (
    SELECT person, day, weight, height, pressure FROM individual_events WHERE measurement_cbo
    UNION ALL
    SELECT person, day,
           weight OR performed && ARRAY['0101040024','0101040083'] OR (clinician AND '0301010269' = ANY(performed)),
           height OR performed && ARRAY['0101040024','0101040075'] OR (clinician AND '0301010269' = ANY(performed)),
           pressure OR '0301100039' = ANY(performed)
    FROM procedure_events WHERE measurement_cbo
    UNION ALL
    SELECT person, day, weight, height, pressure FROM home_events WHERE outcome = '1'
    UNION ALL
    SELECT person, day,
           weight OR practices && ARRAY['01','1'], height OR practices && ARRAY['01','1'],
           coalesce(procedure_code = '0301100039', false)
    FROM collective_events WHERE measurement_cbo
  ) evidence
  GROUP BY person, day
), vaccine_events AS (
  SELECT DISTINCT p.person, d.dt_registro::date AS day, vax.nu_identificador::integer AS product
  FROM people p
  JOIN tb_fat_vacinacao f ON f.co_fat_cidadao_pec = p.fact_person
  JOIN tb_fat_vacinacao_vacina v ON v.co_fat_vacinacao = f.co_seq_fat_vacinacao
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = v.co_dim_tempo_vacina_aplicada
  CROSS JOIN bounds b
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = v.co_dim_unidade_saude
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  JOIN tb_dim_imunobiologico vax ON vax.co_seq_dim_imunobiologico = v.co_dim_imunobiologico
  JOIN tb_dim_dose_imunobiologico dose ON dose.co_seq_dim_dose_imunobiologico = v.co_dim_dose_imunobiologico
  JOIN tb_dim_estrategia_vacinacao strategy ON strategy.co_seq_dim_estrategia_vacnacao = v.co_dim_estrategia_vacinacao
  JOIN tb_dim_imunobiologico_fabrcnt factory ON factory.co_seq_dim_imunobiol_fabrc = v.co_dim_imunobiologico_fabrc
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = v.co_dim_profissional AND ${professionalIdentity}
  WHERE d.dt_registro::date BETWEEN b.earliest_event AND b.last_event
    AND f.dt_nascimento = p.birth
    AND ((p.cpf ~ '^[0-9]{11}$' AND f.nu_cpf_cidadao = p.cpf) OR (p.cns ~ '^[0-9]{15}$' AND f.nu_cns = p.cns))
    AND vax.nu_identificador IN (${childProducts.split(",").map(code => `'${code}'`).join(",")}, '57')
    AND dose.nu_identificador ~ '^[0-9]+$' AND strategy.nu_identificador ~ '^[0-9]+$'
    AND nullif(btrim(v.no_lote), '') IS NOT NULL AND nullif(btrim(factory.no_fabricante), '') IS NOT NULL
)
`;
}

// Resolve the latest record even when it points outside the requested team.
export function historicallyLinked(candidate: "child_landmarks" | "pregnancy_landmarks", key: "person" | "episode") {
  return `
SELECT snapshot.* FROM (
  SELECT DISTINCT ON (c.month_start, c.${key}) c.*,
         l.co_tipo_auditoria AS audit_type, l.nu_cnes AS last_cnes, l.nu_ine AS last_ine,
         l.st_usar_cadastro_individual AS active_registration,
         l.st_saida_cadastro_obito AS death, l.st_saida_cadastro_territorio AS exit,
         l.dt_atualizacao_cadastro::date AS registration_updated
  FROM ${candidate} c
  JOIN links l ON l.co_cidadao = c.person AND l.dt_auditoria < c.reference_day + 1
  ORDER BY c.month_start, c.${key}, l.dt_auditoria DESC, l.co_seq_tacidadaovinculacaoequp DESC
) snapshot
JOIN requested_scope s ON s.cnes = snapshot.last_cnes AND s.ine = snapshot.last_ine
WHERE snapshot.audit_type IN ('I','U') AND snapshot.active_registration = 1
  AND snapshot.death = 0 AND snapshot.exit = 0 AND snapshot.registration_updated <= snapshot.reference_day
  AND (snapshot.death_date IS NULL OR snapshot.death_date > snapshot.reference_day)`;
}
