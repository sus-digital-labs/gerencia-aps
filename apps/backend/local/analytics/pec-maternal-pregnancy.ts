import {
  historicallyLinked, maternalEvidenceCtes, postpartumCiaps, postpartumCids,
  pregnancyCiaps, pregnancyCids, pregnancyExclusionCids,
} from "./pec-maternal-evidence";

const syphilis = "ARRAY['0214010074','0214010082','0214010252','0202031098','0202031110','0202031179']";
const hiv = "ARRAY['0214010040','0214010058','0214010279','0213010780','0213010500','0202030300']";
const hbv = "ARRAY['0214010104','0214010236','0202030784','0202030970','0213010208']";
const hcv = "ARRAY['0214010090','0214010309','0202030059','0202030679']";

export const pregnancyCareQuery = `${maternalEvidenceCtes("pregnancy")},
prenatal_versions AS (
  SELECT DISTINCT ON (m.month_start, n.co_seq_pre_natal)
         m.month_start, m.assessed_on, p.person, p.fact_person, p.birth, p.cpf, p.cns, p.death_date,
         n.co_seq_pre_natal AS episode, n.co_problema, n.co_prontuario,
         (n.dt_ultima_menstruacao AT TIME ZONE 'America/Bahia')::date AS dum,
         (n.dt_desfecho AT TIME ZONE 'America/Bahia')::date AS outcome,
         n.co_tipo_auditoria
  FROM months m
  JOIN ta_pre_natal n ON n.dt_auditoria < m.assessed_on + 1
  JOIN tb_prontuario medical_record ON medical_record.co_seq_prontuario = n.co_prontuario
  JOIN people p ON p.person = medical_record.co_cidadao
  ORDER BY m.month_start, n.co_seq_pre_natal, n.dt_auditoria DESC, n.co_seq_taprenatal DESC
), candidate_episodes AS (
  SELECT *
  FROM prenatal_versions
  WHERE co_tipo_auditoria IN ('I','U') AND dum BETWEEN birth AND assessed_on
    AND (outcome IS NULL OR outcome BETWEEN dum AND assessed_on)
), problem_versions AS (
  SELECT DISTINCT ON (m.month_start, p.co_seq_problema)
         m.month_start, p.co_seq_problema, p.co_prontuario, p.co_tipo_auditoria,
         c.co_ciap AS ciap, replace(cid.nu_cid10, '.', '') AS cid
  FROM (SELECT DISTINCT month_start, assessed_on, co_problema FROM candidate_episodes) m
  JOIN ta_problema p ON p.co_seq_problema = m.co_problema AND p.dt_auditoria < m.assessed_on + 1
  LEFT JOIN tb_ciap c ON c.co_seq_ciap = p.co_ciap
  LEFT JOIN tb_cid10 cid ON cid.co_cid10 = p.co_cid10
  ORDER BY m.month_start, p.co_seq_problema, p.dt_auditoria DESC, p.co_seq_taproblema DESC
), diagnosed_records AS (
  SELECT ep.*, (coalesce(problem.ciap, '') IN ('W82','W83') OR coalesce(problem.cid, '') ~ '${pregnancyExclusionCids}') AS excluded_condition
  FROM candidate_episodes ep
  JOIN problem_versions problem ON problem.month_start = ep.month_start
    AND problem.co_seq_problema = ep.co_problema AND problem.co_prontuario = ep.co_prontuario
  WHERE problem.co_tipo_auditoria IN ('I','U')
    AND (problem.ciap = ANY(string_to_array('${pregnancyCiaps},W82,W83', ','))
      OR problem.cid ~ '${pregnancyCids}' OR problem.cid ~ '${pregnancyExclusionCids}')
), ordered_records AS (
  SELECT *, max(coalesce(outcome, dum + 294) + 42) OVER (
    PARTITION BY month_start, person ORDER BY dum, episode ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
  ) AS previous_end
  FROM diagnosed_records
), grouped_records AS (
  SELECT *, sum(CASE WHEN previous_end IS NULL OR dum > previous_end THEN 1 ELSE 0 END) OVER (
    PARTITION BY month_start, person ORDER BY dum, episode
  ) AS episode_group
  FROM ordered_records
), episodes AS (
  SELECT month_start, assessed_on, person, fact_person, birth, cpf, cns, death_date,
         min(episode) AS episode, min(dum) AS dum,
         coalesce(min(outcome), min(dum) + 294) AS gestation_end,
         count(DISTINCT outcome) > 1 AS ambiguous_end,
         count(outcome) = 0 AS estimated_end,
         bool_or(excluded_condition) AS excluded_condition
  FROM grouped_records
  GROUP BY month_start, assessed_on, person, fact_person, birth, cpf, cns, death_date, episode_group
), pregnancy_landmarks AS (
  SELECT *, least(assessed_on, gestation_end + 42) AS reference_day,
         gestation_end + 42 <= assessed_on AS completed,
         gestation_end <= assessed_on AND gestation_end + 42 > assessed_on AS postpartum
  FROM episodes
  WHERE gestation_end + 42 >= month_start
), linked_episodes AS (
  ${historicallyLinked("pregnancy_landmarks", "episode")}
), pregnancy_cohort AS (
  SELECT ep.* FROM linked_episodes ep
  WHERE NOT ep.excluded_condition AND NOT ep.ambiguous_end
    AND NOT EXISTS (
      SELECT 1 FROM individual_events e WHERE e.person = ep.person
        AND e.day BETWEEN ep.dum AND least(ep.gestation_end, ep.assessed_on)
        AND (e.ciaps && ARRAY['W82','W83'] OR EXISTS (SELECT 1 FROM unnest(e.cids) cid WHERE cid ~ '${pregnancyExclusionCids}'))
    )
), episode_events AS (
  SELECT cohort.month_start, cohort.episode, cohort.person, cohort.dum, cohort.gestation_end, cohort.completed,
         cohort.postpartum, cohort.estimated_end, cohort.assessed_on,
         least(cohort.gestation_end, cohort.assessed_on) AS prenatal_until
  FROM pregnancy_cohort cohort
), episode_consultations AS (
  SELECT episode.month_start, episode.episode,
    min(e.day) FILTER (WHERE e.day <= episode.prenatal_until AND diagnosis.prenatal) AS first_prenatal,
    count(DISTINCT (e.nu_uuid_ficha, e.nu_atendimento)) FILTER (
      WHERE e.day <= episode.prenatal_until AND diagnosis.prenatal
    ) >= 7 AS b,
    bool_or(diagnosis.postpartum
      AND e.day BETWEEN episode.gestation_end AND least(episode.gestation_end + 42, episode.assessed_on)) AS i
  FROM episode_events episode
  JOIN individual_events e ON e.person = episode.person AND e.day BETWEEN episode.dum AND episode.assessed_on
  CROSS JOIN LATERAL (
    SELECT (e.ciaps && string_to_array('${pregnancyCiaps}', ',') OR EXISTS (
      SELECT 1 FROM unnest(e.cids) cid WHERE cid ~ '${pregnancyCids}'
    )) AS prenatal,
    (e.ciaps && string_to_array('${postpartumCiaps}', ',') OR EXISTS (
      SELECT 1 FROM unnest(e.cids) cid WHERE cid ~ '${postpartumCids}'
    )) AS postpartum
  ) diagnosis
  WHERE e.clinician AND (e.mode IN ('2','3','4','5','6') OR '0301010250' = ANY(e.performed))
  GROUP BY episode.month_start, episode.episode
), episode_measurements AS (
  SELECT ep.month_start, ep.episode,
    count(DISTINCT e.day) FILTER (WHERE e.pressure) >= 7 AS c,
    count(DISTINCT e.day) FILTER (WHERE e.pair) >= 7 AS d
  FROM episode_events ep JOIN measurement_days e ON e.person = ep.person AND e.day BETWEEN ep.dum AND ep.prenatal_until
  GROUP BY ep.month_start, ep.episode
), episode_visits AS (
  SELECT ep.month_start, ep.episode,
    count(DISTINCT (e.day, e.nu_uuid_ficha)) FILTER (
      WHERE e.has_reason AND e.day > consult.first_prenatal AND e.day <= ep.prenatal_until
    ) >= 3 AS e,
    bool_or(e.has_reason AND e.day BETWEEN ep.gestation_end AND least(ep.gestation_end + 42, ep.assessed_on)) AS j
  FROM episode_events ep JOIN home_events e ON e.person = ep.person AND e.day BETWEEN ep.dum AND ep.assessed_on
  LEFT JOIN episode_consultations consult USING (month_start, episode)
  GROUP BY ep.month_start, ep.episode
), episode_vaccines AS (
  SELECT ep.month_start, ep.episode, true AS f
  FROM episode_events ep JOIN vaccine_events event ON event.person = ep.person AND event.product = 57
    AND event.day BETWEEN ep.dum + 140 AND ep.prenatal_until
  GROUP BY ep.month_start, ep.episode
), tests AS (
  SELECT person, day, performed FROM individual_events WHERE lab_cbo
  UNION SELECT person, day, performed FROM procedure_events WHERE lab_cbo
  UNION
  SELECT e.person, coalesce(exam.dt_realizacao, e.day), ARRAY[procedure.co_proced::text]
  FROM individual_events e
  JOIN tb_fat_atd_ind_procedimentos evaluation ON evaluation.co_fat_atd_ind = e.source_id
  JOIN tb_dim_procedimento procedure ON procedure.co_seq_dim_procedimento = evaluation.co_dim_procedimento_avaliado
  LEFT JOIN tb_fat_atd_ind_exames exam ON exam.co_fat_atd_ind = e.source_id
    AND exam.co_dim_procedimento = evaluation.co_dim_procedimento_avaliado
  WHERE e.lab_cbo
), episode_tests AS (
  SELECT ep.month_start, ep.episode,
    coalesce(bool_or(e.performed && ${syphilis}) FILTER (WHERE e.day <= ep.dum + 91), false)
      AND coalesce(bool_or(e.performed && ${hiv}) FILTER (WHERE e.day <= ep.dum + 91), false)
      AND coalesce(bool_or(e.performed && ${hbv}) FILTER (WHERE e.day <= ep.dum + 91), false)
      AND coalesce(bool_or(e.performed && ${hcv}) FILTER (WHERE e.day <= ep.dum + 91), false) AS g,
    coalesce(bool_or(e.performed && ${syphilis}) FILTER (WHERE e.day >= ep.dum + 196), false)
      AND coalesce(bool_or(e.performed && ${hiv}) FILTER (WHERE e.day >= ep.dum + 196), false) AS h
  FROM episode_events ep JOIN tests e ON e.person = ep.person AND e.day BETWEEN ep.dum AND ep.prenatal_until
  GROUP BY ep.month_start, ep.episode
), episode_dental AS (
  SELECT ep.month_start, ep.episode, true AS k
  FROM pregnancy_cohort ep
  JOIN tb_fat_atendimento_odonto f ON f.co_fat_cidadao_pec = ep.fact_person
  JOIN tb_dim_tempo day ON day.co_seq_dim_tempo = f.co_dim_tempo
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude_1
  JOIN local_aps_units aps ON aps.cnes = u.nu_cnes
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo_1 AND left(cbo.nu_cbo,4) IN ('2232','3224')
  JOIN tb_dim_profissional prof ON prof.co_seq_dim_profissional = f.co_dim_profissional_1
  WHERE day.dt_registro::date BETWEEN ep.dum AND least(ep.gestation_end, ep.assessed_on)
    AND f.dt_nascimento = ep.birth AND btrim(f.nu_uuid_ficha) <> '' AND f.nu_atendimento > 0
    AND prof.nu_cns ~ '^[0-9]{15}$' AND prof.nu_cns !~ '^([0-9])\\1{14}$'
    AND ((ep.cpf ~ '^[0-9]{11}$' AND f.nu_cpf_cidadao = ep.cpf) OR (ep.cns ~ '^[0-9]{15}$' AND f.nu_cns = ep.cns))
  GROUP BY ep.month_start, ep.episode
  UNION
  SELECT ep.month_start, ep.episode, true AS k
  FROM episode_events ep JOIN procedure_events e ON e.person = ep.person AND e.dental_cbo
    AND e.day BETWEEN ep.dum AND ep.prenatal_until
  GROUP BY ep.month_start, ep.episode
  UNION
  SELECT ep.month_start, ep.episode, true AS k
  FROM episode_events ep JOIN collective_events e ON e.person = ep.person AND e.dental_cbo
    AND e.practices && ARRAY['02','04','2','4'] AND e.day BETWEEN ep.dum AND ep.prenatal_until
  GROUP BY ep.month_start, ep.episode
), pregnancy_observations AS (
  SELECT ep.month_start, ep.dum AS begins, ep.completed, ep.postpartum,
         (ep.estimated_end AND ep.gestation_end <= ep.assessed_on) AS estimated,
         consult.first_prenatal <= ep.dum + 84 AS a, consult.b, measured.c, measured.d, (scope.is_eap OR visited.e) AS e,
         vaccine.f, screened.g, screened.h, consult.i, (scope.is_eap OR visited.j) AS j, dental.k
  FROM episode_events ep CROSS JOIN requested_scope scope
  LEFT JOIN episode_consultations consult USING (month_start, episode)
  LEFT JOIN episode_measurements measured USING (month_start, episode)
  LEFT JOIN episode_visits visited USING (month_start, episode)
  LEFT JOIN episode_vaccines vaccine USING (month_start, episode)
  LEFT JOIN episode_tests screened USING (month_start, episode)
  LEFT JOIN episode_dental dental USING (month_start, episode)
)
SELECT to_char(m.month_start,'YYYY-MM') AS month, c.cutoff::text AS cutoff,
       m.assessed_on::text AS "assessedOn",
       coalesce(c.covered_through >= m.assessed_on
         AND c.covered_since <= coalesce(min(o.begins), m.month_start), false) AS "localWindowCovered",
       count(*) FILTER (WHERE NOT o.completed)::integer AS ongoing,
       count(*) FILTER (WHERE o.completed)::integer AS completed,
       count(*) FILTER (WHERE o.postpartum)::integer AS postpartum,
       count(*) FILTER (WHERE o.estimated)::integer AS "missingOutcome",
       (SELECT count(*)::integer FROM linked_episodes ep WHERE ep.month_start = m.month_start AND ep.ambiguous_end) AS "excludedRecords",
       jsonb_build_object(
         ${"ABCDEFGHIJK".split("").map(id => `'${id}', ARRAY[
           count(*) FILTER (WHERE o.${id.toLowerCase()} AND NOT o.completed),
           count(*) FILTER (WHERE o.${id.toLowerCase()} AND o.completed)
         ]`).join(",\n         ")}
       ) AS criteria
FROM source_cutoff c LEFT JOIN months m ON true
LEFT JOIN pregnancy_observations o ON o.month_start = m.month_start
GROUP BY m.month_start, m.assessed_on, c.cutoff, c.covered_since, c.covered_through
ORDER BY m.month_start
`;
