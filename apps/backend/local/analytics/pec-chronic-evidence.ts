import { chronicCareFacts, consultationCbo, dayKey } from "./pec-chronic-facts";
import { chronicCareCurrentMethodFrom } from "./pec-chronic-rules";

function validCpf(value: string) {
  return String.raw`CASE WHEN ${value} ~ '^[0-9]{11}$' AND ${value} !~ '^([0-9])\1{10}$' THEN (
    SELECT mod(mod(10 * sum(substr(${value}, i, 1)::int * (11 - i)) FILTER (WHERE i <= 9), 11), 10) = substr(${value}, 10, 1)::int
      AND mod(mod(10 * sum(substr(${value}, i, 1)::int * (12 - i)), 11), 10) = substr(${value}, 11, 1)::int
    FROM generate_series(1, 10) i
  ) ELSE false END`;
}

function validCns(value: string) {
  return String.raw`CASE WHEN ${value} ~ '^[12789][0-9]{14}$' AND ${value} !~ '^([0-9])\1{14}$' THEN (
    SELECT mod(sum(substr(${value}, i, 1)::int * (16 - i)), 11) = 0
    FROM generate_series(1, 15) i
  ) ELSE false END`;
}

function diabetes(cid: string, ciap: string, allowBareE10 = "false") {
  return `(${ciap} IN ('T89','T90') OR ${cid} ~ '^(E10[.]?[0-9]|E(11|14)([.]?[0-9])?)$'
    OR (${cid} = 'E10' AND ${allowBareE10}))`;
}

function hypertension(cid: string, ciap: string) {
  return `(${ciap} IN ('K86','K87') OR ${cid} ~ '^(I10|I11([.]?[09])?|I12([.]?[09])?|I13([.]?[0129])?|I15([.]?[01289])?|O10([.]?[012349])?|O11)$')`;
}

const lastPossibleDay = dayKey("$5::date + interval '1 month' - interval '1 day'");

// A consulta usa a trilha I/U/D e devolve somente agregados.
export const chronicCareQuery = `
WITH source_bounds AS (
  SELECT
    (SELECT min(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo BETWEEN 20130101 AND ${lastPossibleDay}) AS first_key,
    (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo BETWEEN 20130101 AND ${lastPossibleDay}) AS last_attendance,
    (SELECT max(co_dim_tempo) FROM tb_fat_visita_domiciliar WHERE co_dim_tempo BETWEEN 20130101 AND ${lastPossibleDay}) AS last_visit,
    (SELECT max(co_dim_tempo) FROM tb_fat_proced_atend_proced WHERE co_dim_tempo BETWEEN 20130101 AND ${lastPossibleDay}) AS last_procedure,
    (SELECT max(co_dim_tempo) FROM tb_fat_vacinacao WHERE co_dim_tempo BETWEEN 20130101 AND ${lastPossibleDay}) AS last_vaccine_record,
    (SELECT max(co_dim_tempo_vacina_aplicada) FROM tb_fat_vacinacao_vacina
      WHERE co_dim_tempo_vacina_aplicada BETWEEN 20130101 AND ${lastPossibleDay}) AS last_vaccine_application
), selected_team AS (
  SELECT min(t.nu_ms) AS type FROM tb_equipe e
  JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe = e.tp_equipe
  JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
  WHERE u.nu_cnes = $1 AND e.nu_ine = $2 AND e.st_ativo = 1
  HAVING count(DISTINCT t.nu_ms) = 1
), coverage AS (
  SELECT to_char(first_day.dt_registro, 'YYYY-MM-DD') AS "attendanceHistoryStarts",
    to_char(last_day.dt_registro, 'YYYY-MM-DD') AS cutoff,
    to_char(last_vaccine.dt_registro, 'YYYY-MM-DD') AS "vaccinationCutoff",
    ARRAY(SELECT DISTINCT dt_competencia FROM rl_proced_cbo WHERE dt_competencia NOT BETWEEN $7 AND $8) AS "installedSigtapMonths",
    team.type AS "teamType"
  FROM source_bounds b LEFT JOIN selected_team team ON true
  LEFT JOIN tb_dim_tempo first_day ON first_day.co_seq_dim_tempo = b.first_key
    AND first_day.co_seq_dim_tempo = ${dayKey("first_day.dt_registro")}
  LEFT JOIN tb_dim_tempo last_day ON last_day.co_seq_dim_tempo = least(b.last_attendance, b.last_procedure,
      CASE WHEN team.type IS DISTINCT FROM '76' THEN b.last_visit END)
    AND last_day.co_seq_dim_tempo = ${dayKey("last_day.dt_registro")}
    AND b.last_attendance IS NOT NULL AND b.last_procedure IS NOT NULL AND (team.type = '76' OR b.last_visit IS NOT NULL)
  LEFT JOIN tb_dim_tempo last_vaccine
    ON last_vaccine.co_seq_dim_tempo = least(b.last_vaccine_record, b.last_vaccine_application)
    AND b.last_vaccine_record IS NOT NULL AND b.last_vaccine_application IS NOT NULL
    AND last_vaccine.co_seq_dim_tempo = ${dayKey("last_vaccine.dt_registro")}
), periods AS (
  SELECT to_char(month_start, 'YYYY-MM') AS month, (month_start + interval '1 month')::date AS upper_day,
    (month_start + interval '1 month - 1 day')::date AS end_day
  FROM generate_series($3::date, least($4::date, $5::date - interval '1 month'), '1 month'::interval) AS months(month_start)
  WHERE (month_start + interval '1 month - 1 day')::date <= (SELECT cutoff::date FROM coverage)
), ever_linked AS (
  SELECT DISTINCT l.co_cidadao AS person
  FROM ta_cidadao_vinculacao_equipe l
  WHERE l.nu_cnes = $1 AND l.nu_ine = $2
    AND l.co_tipo_auditoria IN ('I','U') AND l.dt_auditoria < (SELECT max(upper_day) FROM periods)
), linkage_history AS (
  SELECT x.person, l.dt_auditoria, l.co_tipo_auditoria,
    l.nu_cnes, l.nu_ine, l.dt_atualizacao_cadastro, l.st_saida_cadastro_obito, l.st_saida_cadastro_territorio,
    lead(l.dt_auditoria) OVER (PARTITION BY x.person ORDER BY l.dt_auditoria, l.co_seq_tacidadaovinculacaoequp) AS next_audit
  FROM ever_linked x JOIN ta_cidadao_vinculacao_equipe l ON l.co_cidadao = x.person
  WHERE l.dt_auditoria < (SELECT max(upper_day) FROM periods)
), linked AS (
  SELECT p.month, p.upper_day, p.end_day, l.person
  FROM periods p JOIN linkage_history l ON l.dt_auditoria < p.upper_day AND (l.next_audit IS NULL OR l.next_audit >= p.upper_day)
  WHERE l.co_tipo_auditoria IN ('I','U') AND l.nu_cnes = $1 AND l.nu_ine = $2
    AND l.dt_atualizacao_cadastro < (p.upper_day::timestamp AT TIME ZONE 'America/Bahia')
    AND l.st_saida_cadastro_obito = 0 AND l.st_saida_cadastro_territorio = 0
), citizen_history AS (
  SELECT c.co_seq_cidadao AS person, c.dt_auditoria, c.co_tipo_auditoria,
    c.dt_nascimento AS birth, btrim(c.nu_cpf) AS cpf, btrim(c.nu_cns) AS cns,
    NULLIF(btrim(c.no_cidadao), '') IS NOT NULL AS has_name, c.st_ativo, c.st_fora_area, c.st_faleceu, c.dt_obito,
    lead(c.dt_auditoria) OVER (PARTITION BY c.co_seq_cidadao ORDER BY c.dt_auditoria, c.co_seq_tacidadao) AS next_audit
  FROM ta_cidadao c JOIN (SELECT DISTINCT person FROM linked) l ON l.person = c.co_seq_cidadao
  WHERE c.dt_auditoria < (SELECT max(upper_day) FROM periods)
), citizen_at_close AS (
  SELECT l.*, c.co_tipo_auditoria, c.birth, c.cpf, c.cns, c.has_name, c.st_ativo, c.st_fora_area, c.st_faleceu, c.dt_obito
  FROM linked l JOIN citizen_history c ON c.person = l.person
    AND c.dt_auditoria < l.upper_day AND (c.next_audit IS NULL OR c.next_audit >= l.upper_day)
), identity_documents AS (
  SELECT c.month, c.upper_day, c.end_day, c.person, c.birth,
    CASE WHEN ${validCpf("c.cpf")} THEN c.cpf END AS cpf,
    CASE WHEN ${validCns("c.cns")} THEN c.cns END AS cns
  FROM citizen_at_close c
  -- Após a unificação do PEC, o cadastro principal continua ativo e elegível.
  WHERE c.co_tipo_auditoria IN ('I','U') AND c.st_ativo = 1 AND c.st_fora_area = 0
    AND coalesce(c.st_faleceu, 0) = 0 AND (c.dt_obito IS NULL OR c.dt_obito > c.end_day) AND c.has_name AND c.birth <= c.end_day
), duplicate_documents AS (
  SELECT month, 'cpf' AS type, cpf AS value FROM identity_documents WHERE cpf IS NOT NULL
  GROUP BY month, cpf HAVING count(*) > 1
  UNION ALL
  SELECT month, 'cns' AS type, cns AS value FROM identity_documents WHERE cns IS NOT NULL
  GROUP BY month, cns HAVING count(*) > 1
), identified AS (
  SELECT i.*
  FROM identity_documents i
  WHERE (i.cpf IS NOT NULL OR i.cns IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM duplicate_documents d WHERE d.month = i.month
      AND ((d.type = 'cpf' AND d.value = i.cpf) OR (d.type = 'cns' AND d.value = i.cns)))
), fact_people AS (
  SELECT i.month, i.upper_day, i.end_day, i.person, i.birth, cp.co_seq_fat_cidadao_pec AS fact_person
  FROM identified i
  JOIN tb_fat_cidadao_pec cp ON cp.co_cidadao = i.person AND coalesce(cp.st_deletar, 0) = 0
  WHERE (i.cpf = btrim(cp.nu_cpf_cidadao) OR i.cns = btrim(cp.nu_cns))
    AND (i.cpf IS NULL OR NULLIF(btrim(cp.nu_cpf_cidadao), '') IS NULL OR i.cpf = btrim(cp.nu_cpf_cidadao))
    AND (i.cns IS NULL OR NULLIF(btrim(cp.nu_cns), '') IS NULL OR i.cns = btrim(cp.nu_cns))
), health_professionals AS (
  SELECT co_seq_dim_profissional AS id FROM tb_dim_profissional WHERE ${validCns("btrim(nu_cns)")}
), aps_units AS (
  SELECT DISTINCT d.co_seq_dim_unidade_saude AS id
  FROM tb_dim_unidade_saude d
  JOIN tb_unidade_saude u ON u.nu_cnes = d.nu_cnes
  JOIN tb_equipe e ON e.co_unidade_saude = u.co_seq_unidade_saude
  JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe = e.tp_equipe AND t.nu_ms IN ('70','76')
), diagnosis_facts AS (
  SELECT f.fact_person, c.code, NULLIF(btrim(a.nu_uuid_problema), '') AS problem, min(a.co_dim_tempo) AS first_day,
    min(a.co_dim_tempo) FILTER (WHERE c.historical) AS historical_first_day
  FROM (SELECT DISTINCT fact_person FROM fact_people) f
  JOIN tb_fat_atd_ind_problemas a ON a.co_fat_cidadao_pec = f.fact_person
    AND a.co_dim_tempo >= 20130101 AND a.co_dim_tempo < (SELECT ${dayKey("max(p.upper_day)")} FROM periods p)
  JOIN tb_fat_atendimento_individual encounter ON encounter.co_seq_fat_atd_ind = a.co_fat_atd_ind
    AND encounter.co_fat_cidadao_pec = f.fact_person AND encounter.co_dim_tempo = a.co_dim_tempo
  JOIN tb_dim_tempo d ON d.co_seq_dim_tempo = a.co_dim_tempo AND d.co_seq_dim_tempo = ${dayKey("d.dt_registro")}
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = encounter.co_dim_cbo_1
  JOIN tb_dim_tipo_ficha form ON form.co_seq_dim_tipo_ficha = encounter.co_dim_tipo_ficha
  JOIN health_professionals pro ON pro.id = encounter.co_dim_profissional_1
  JOIN aps_units u ON u.id = encounter.co_dim_unidade_saude_1
  LEFT JOIN tb_dim_cid cid ON cid.co_seq_dim_cid = a.co_dim_cid
  LEFT JOIN tb_dim_ciap ciap ON ciap.co_seq_dim_ciap = a.co_dim_ciap
  CROSS JOIN LATERAL (VALUES
    ('C4', ${diabetes("cid.nu_cid", "ciap.nu_ciap", "true")}, ${diabetes("cid.nu_cid", "ciap.nu_ciap")}),
    ('C5', ${hypertension("cid.nu_cid", "ciap.nu_ciap")}, true)) c(code, eligible, historical)
  WHERE c.eligible AND form.nu_identificador IN ('4','9')
    AND a.st_avaliado IS DISTINCT FROM 0 AND ${consultationCbo}
  GROUP BY f.fact_person, c.code, NULLIF(btrim(a.nu_uuid_problema), '')
), diagnoses AS (
  SELECT DISTINCT f.month, f.upper_day, f.person, d.code, d.problem
  FROM fact_people f JOIN diagnosis_facts d ON d.fact_person = f.fact_person AND d.first_day < ${dayKey("f.upper_day")}
    AND (f.month >= '${chronicCareCurrentMethodFrom}' OR d.historical_first_day < ${dayKey("f.upper_day")})
), problem_at_close AS (
  SELECT DISTINCT ON (d.month, d.person, d.code, d.problem, t.co_seq_problema) d.*,
    t.co_tipo_auditoria, t.co_ultimo_problema_evolucao, t.co_prontuario, t.co_unico_problema, t.co_ciap, t.co_cid10
  FROM diagnoses d JOIN ta_problema t ON t.nu_uuid_problema = d.problem AND t.dt_auditoria < d.upper_day
  JOIN tb_prontuario p ON p.co_seq_prontuario = t.co_prontuario AND p.co_cidadao = d.person
  ORDER BY d.month, d.person, d.code, d.problem, t.co_seq_problema, t.dt_auditoria DESC, t.co_seq_taproblema DESC
), evolution_at_close AS (
  SELECT DISTINCT ON (p.month, p.co_ultimo_problema_evolucao) p.month, t.co_seq_problema_evolucao,
    t.co_tipo_auditoria, t.co_situacao_problema, t.co_atend_prof, t.co_unico_problema, t.co_sequencial_evolucao,
    t.dt_inicio_problema, t.dt_fim_problema
  FROM (SELECT DISTINCT month, upper_day, co_ultimo_problema_evolucao FROM problem_at_close) p
  JOIN ta_problema_evolucao t ON t.co_seq_problema_evolucao = p.co_ultimo_problema_evolucao
    AND t.dt_auditoria < p.upper_day
  ORDER BY p.month, p.co_ultimo_problema_evolucao, t.dt_auditoria DESC, t.co_seq_taproblemaevolucao DESC
), verified_problem AS (
  SELECT p.month, p.person, p.code, p.problem,
    CASE WHEN count(*) = 1 THEN min(e.co_situacao_problema) FILTER (WHERE
      p.co_tipo_auditoria IN ('I','U') AND e.co_tipo_auditoria IN ('I','U')
      AND e.co_unico_problema = p.co_unico_problema AND e.co_sequencial_evolucao >= 0
      AND ap.st_cancelado = 0 AND a.co_prontuario = p.co_prontuario AND a.st_atend = 4
      AND ap.dt_inicio < p.upper_day AND ap.dt_inicio >= '2013-01-01'::date
      AND (e.dt_inicio_problema IS NULL OR e.dt_inicio_problema <= ap.dt_inicio::date)
      AND (e.dt_fim_problema IS NULL OR e.dt_inicio_problema IS NULL OR e.dt_fim_problema >= e.dt_inicio_problema)
      AND CASE WHEN p.code = 'C4' THEN ${diabetes("cid.nu_cid10", "ciap.co_ciap", `p.month >= '${chronicCareCurrentMethodFrom}'`)}
        ELSE ${hypertension("cid.nu_cid10", "ciap.co_ciap")} END
      AND e.co_situacao_problema IN (0,1,2)
    ) END AS status
  FROM problem_at_close p
  -- Cada evolução vem dos problemas acima. O FULL JOIN preserva os problemas
  -- sem evolução e favorece hash/merge no PostgreSQL 9.6.
  FULL JOIN evolution_at_close e ON e.month = p.month AND e.co_seq_problema_evolucao = p.co_ultimo_problema_evolucao
  LEFT JOIN tb_atend_prof ap ON ap.co_seq_atend_prof = e.co_atend_prof
  LEFT JOIN tb_atend a ON a.co_seq_atend = ap.co_atend
  LEFT JOIN tb_cid10 cid ON cid.co_cid10 = p.co_cid10
  LEFT JOIN tb_ciap ciap ON ciap.co_seq_ciap = p.co_ciap
  GROUP BY p.month, p.person, p.code, p.problem
), condition_people AS (
  SELECT d.month, d.person, d.code, coalesce(bool_or(v.status = 0), false) AS eligible,
    bool_or(v.status IS NULL) AS unverified
  FROM diagnoses d FULL JOIN verified_problem v ON v.month = d.month AND v.person = d.person
    AND v.code = d.code AND v.problem = d.problem
  GROUP BY d.month, d.person, d.code
), cohort AS (
  SELECT month, person, code FROM condition_people WHERE eligible
  UNION ALL
  SELECT month, person, 'C6' AS code FROM identified WHERE birth <= (end_day - interval '60 years')::date
), ${chronicCareFacts}, cohort_evidence AS (
  SELECT c.month, c.code, count(*)::int AS eligible,
    count(*) FILTER (WHERE CASE WHEN c.code = 'C6' THEN f.consultation_twelve ELSE f.consultation_six END)::int AS consultation,
    count(*) FILTER (WHERE f.pressure)::int AS pressure,
    count(*) FILTER (WHERE f.anthropometry)::int AS anthropometry,
    count(*) FILTER (WHERE f.visits)::int AS visits,
    count(*) FILTER (WHERE f.hemoglobin)::int AS hemoglobin,
    count(*) FILTER (WHERE f.feet)::int AS feet,
    count(*) FILTER (WHERE f.influenza)::int AS influenza
  FROM cohort c LEFT JOIN practice_by_person f ON f.month = c.month AND f.person = c.person
  GROUP BY c.month, c.code
), identity_balance AS (
  SELECT month, count(*) AS quantity FROM linked GROUP BY month
  UNION ALL
  SELECT month, -count(*) AS quantity FROM identified GROUP BY month
), nonqualified_people AS (
  SELECT month, sum(quantity)::int AS excluded FROM identity_balance GROUP BY month
), unresolved_conditions AS (
  SELECT month, code, count(*) FILTER (WHERE unverified AND NOT eligible)::int AS unverified
  FROM condition_people GROUP BY month, code
), evidence AS (
  SELECT p.month, c.code, coalesce(e.eligible, 0) AS eligible,
    coalesce(e.consultation, 0) AS consultation, coalesce(e.pressure, 0) AS pressure,
    coalesce(e.anthropometry, 0) AS anthropometry, coalesce(e.visits, 0) AS visits,
    coalesce(e.hemoglobin, 0) AS hemoglobin, coalesce(e.feet, 0) AS feet,
    coalesce(e.influenza, 0) AS influenza,
    coalesce(n.excluded, 0) AS "identityExcluded", coalesce(u.unverified, 0) AS "conditionUnverified"
  FROM periods p CROSS JOIN (VALUES ('C4'), ('C5'), ('C6')) c(code)
  LEFT JOIN cohort_evidence e ON e.month = p.month AND e.code = c.code
  LEFT JOIN nonqualified_people n ON n.month = p.month
  LEFT JOIN unresolved_conditions u ON u.month = p.month AND u.code = c.code
)
SELECT coverage.*, evidence.* FROM coverage LEFT JOIN evidence ON true`;
