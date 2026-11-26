import { pecLocalPerson, validCns } from "./pec-identity-sql";

const eligible = (column: string, date: string) => `(${column}=ANY($6::text[])
  AND (${date}>=20251201 OR NOT (${column}=ANY($7::text[]))))`;

const identityAtEvent = (date: string, birth: string) => `CASE
  WHEN p.dt_nascimento=${birth} AND p.dt_nascimento<=${date}
    AND (p.dt_obito>${date} OR (p.dt_obito IS NULL AND p.st_faleceu=0))
  THEN ${pecLocalPerson("p")}
  END`;

function attendanceFact(table: "tb_fat_atendimento_individual" | "tb_fat_atendimento_odonto", model: "MIAI" | "MIAOI") {
  const dental = model === "MIAOI";
  const pk = dental ? "co_seq_fat_atd_odnt" : "co_seq_fat_atd_ind";
  return `
    SELECT '${model}' AS model, f.${pk} AS id, f.co_dim_tempo AS day, f.nu_uuid_ficha AS form,
      f.nu_atendimento AS item, f.co_fat_cidadao_pec AS citizen, f.dt_nascimento AS birth,
      f.co_dim_profissional_1 AS actor_1, f.co_dim_profissional_2 AS actor_2,
      f.co_dim_cbo_1 AS cbo_1, f.co_dim_cbo_2 AS cbo_2,
      (f.co_dim_unidade_saude_1 IN (SELECT id FROM unit_dim)
        AND f.co_dim_equipe_1 IN (SELECT id FROM team_dim)) IS TRUE AS scope_1,
      (f.co_dim_unidade_saude_2 IN (SELECT id FROM unit_dim)
        AND f.co_dim_equipe_2 IN (SELECT id FROM team_dim)) IS TRUE AS scope_2
    FROM ${table} f
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha
      AND k.nu_identificador IN ('${dental ? "5" : "4"}','9')
    WHERE f.co_dim_tempo >= (SELECT first_key FROM bounds) AND f.co_dim_tempo < (SELECT end_key FROM bounds)
      AND ((f.co_dim_unidade_saude_1 IN (SELECT id FROM unit_dim)
        AND f.co_dim_equipe_1 IN (SELECT id FROM team_dim))
        OR (f.co_dim_unidade_saude_2 IN (SELECT id FROM unit_dim)
          AND f.co_dim_equipe_2 IN (SELECT id FROM team_dim)))`;
}

// O INE pode constar em mais de um CNES no PEC. Este resultado mede a dupla
// selecionada, com CNES e INE do mesmo profissional no registro ou na lotação.
// $1–$3 são competência, início e fim exclusivo de cada janela de quatro meses.
// $4 CNES, $5 INE, $6 CBOs, $7 CBOs com início em dezembro/2025, $8 fim do mês atual.
export const emultiActionsSql = `WITH periods AS (
    SELECT month, start_key, end_key FROM unnest($1::text[], $2::bigint[], $3::bigint[]) p(month, start_key, end_key)
  ), bounds AS (
    SELECT min(start_key) AS first_key, max(end_key) AS end_key FROM periods
  ), source_ranges AS (
    SELECT
      (SELECT min(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo>=20130101) AS individual_start,
      (SELECT min(co_dim_tempo) FROM tb_fat_atendimento_odonto WHERE co_dim_tempo>=20130101) AS dental_start,
      (SELECT min(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo>=20130101) AS collective_start,
      (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo<$8) AS individual_end,
      (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_odonto WHERE co_dim_tempo<$8) AS dental_end,
      (SELECT max(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo<$8) AS collective_end
  ), coverage AS (
    SELECT to_char(n.dt_registro, 'YYYY-MM-DD') AS cutoff, to_char(o.dt_registro, 'YYYY-MM-DD') AS starts_on
    FROM source_ranges r
    LEFT JOIN tb_dim_tempo n ON n.co_seq_dim_tempo=least(r.individual_end,r.dental_end,r.collective_end)
      AND r.individual_end IS NOT NULL AND r.dental_end IS NOT NULL AND r.collective_end IS NOT NULL
      AND n.co_seq_dim_tempo::text=to_char(n.dt_registro, 'YYYYMMDD')
    LEFT JOIN tb_dim_tempo o ON o.co_seq_dim_tempo=greatest(r.individual_start,r.dental_start,r.collective_start)
      AND r.individual_start IS NOT NULL AND r.dental_start IS NOT NULL AND r.collective_start IS NOT NULL
      AND o.co_seq_dim_tempo::text=to_char(o.dt_registro, 'YYYYMMDD')
  ), team_dim AS (
    SELECT co_seq_dim_equipe AS id FROM tb_dim_equipe WHERE nu_ine=$5
  ), unit_dim AS (
    SELECT co_seq_dim_unidade_saude AS id FROM tb_dim_unidade_saude WHERE nu_cnes=$4
  ), scope_team AS (
    SELECT e.co_seq_equipe AS team, u.co_seq_unidade_saude AS unit
    FROM tb_equipe e JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=e.co_unidade_saude
    JOIN tb_tipo_equipe te ON te.co_seq_tipo_equipe=e.tp_equipe AND te.nu_ms='72'
    WHERE e.nu_ine=$5 AND u.nu_cnes=$4
  ), professions AS (
    -- Grupos ocupacionais do PEC. O catálogo explícito da ficha também habilita o profissional eMulti.
    SELECT c.co_seq_dim_cbo AS id, c.nu_cbo,
      coalesce(bool_or(g.nu_grupo_cbo IN ('8','9','10','12')), false) AS higher_level,
      coalesce(bool_or(g.nu_grupo_cbo IN ('1','3','4','5','6','8','9','10','11','12')), false) AS collective_level
    FROM tb_dim_cbo c LEFT JOIN tb_dim_grupo_cbo g ON g.co_dim_cbo=c.co_seq_dim_cbo
    GROUP BY c.co_seq_dim_cbo, c.nu_cbo
  ), professionals AS (
    SELECT co_seq_dim_profissional AS id,
      CASE WHEN ${validCns("btrim(nu_cns)")} THEN btrim(nu_cns) END AS cns
    FROM tb_dim_profissional
  ), visits AS (
    ${attendanceFact("tb_fat_atendimento_individual", "MIAI")}
    UNION ALL ${attendanceFact("tb_fat_atendimento_odonto", "MIAOI")}
  ), actors AS (
    SELECT v.*, primary_actor.cns AS p1, secondary_actor.cns AS p2,
      (v.scope_1 AND ${eligible("c1.nu_cbo", "v.day")}) IS TRUE AS em1,
      (v.scope_2 AND ${eligible("c2.nu_cbo", "v.day")}) IS TRUE AS em2,
      (c1.higher_level OR ${eligible("c1.nu_cbo", "v.day")}) IS TRUE AS level_1,
      (c2.higher_level OR ${eligible("c2.nu_cbo", "v.day")}) IS TRUE AS level_2,
      ${identityAtEvent("t.dt_registro", "v.birth")} AS person
    FROM visits v
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=v.day AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    LEFT JOIN professionals primary_actor ON primary_actor.id=v.actor_1
    LEFT JOIN professionals secondary_actor ON secondary_actor.id=v.actor_2
    LEFT JOIN professions c1 ON c1.id=v.cbo_1
    LEFT JOIN professions c2 ON c2.id=v.cbo_2
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=v.citizen
    LEFT JOIN tb_cidadao p ON p.co_seq_cidadao=cp.co_cidadao
  ), visit_events AS (
    SELECT model, id, day, NULLIF(btrim(form), '') AS form, item, person, p1, p2,
      array_remove(ARRAY[CASE WHEN em1 THEN p1 END, CASE WHEN em2 THEN p2 END], NULL) AS emulti,
      (p1<>p2 AND level_1 AND level_2) IS TRUE AS shared,
      (p1 IS NOT NULL AND (p2 IS NULL OR p1=p2) AND em1 AND model='MIAI') AS specific
    FROM actors WHERE em1 OR em2
  ), visit_keys AS (
    SELECT model, form, item, count(DISTINCT (day, person, p1, p2, emulti, shared, specific)) AS versions
    FROM visit_events WHERE form IS NOT NULL AND item IS NOT NULL
    GROUP BY model, form, item
  ), individual AS (
    SELECT DISTINCT ON (v.model, v.form, v.item, CASE WHEN v.form IS NULL OR v.item IS NULL THEN v.id END)
      v.day, v.person, v.emulti, v.shared, v.specific,
      (k.versions=1 AND v.person IS NOT NULL AND cardinality(v.emulti)>0 AND (v.shared OR v.specific)) IS TRUE AS valid
    FROM visit_events v LEFT JOIN visit_keys k USING (model, form, item)
    ORDER BY v.model, v.form, v.item, CASE WHEN v.form IS NULL OR v.item IS NULL THEN v.id END, v.id
  ), assignments AS (
    SELECT DISTINCT l.co_unico_lotacao
    FROM ta_lotacao l JOIN scope_team s ON s.team=l.co_equipe AND s.unit=l.co_unidade_saude
    WHERE l.co_unico_lotacao IS NOT NULL
  ), versions AS (
    SELECT l.co_prof, l.co_cbo, l.co_equipe, l.co_unidade_saude, l.co_tipo_auditoria,
      l.dt_desativacao_lotacao::date AS deactivated, l.dt_auditoria::date AS effective_from,
      lead(l.dt_auditoria::date) OVER (PARTITION BY l.co_unico_lotacao
        ORDER BY l.dt_auditoria, l.co_seq_talotacao) AS effective_until
    FROM ta_lotacao l JOIN assignments a USING (co_unico_lotacao)
  ), roster AS (
    SELECT btrim(p.nu_cns) AS cns, replace(c.co_cbo_2002, '-', '') AS cbo,
      h.effective_from, h.effective_until, h.deactivated
    FROM versions h JOIN scope_team s ON s.team=h.co_equipe AND s.unit=h.co_unidade_saude
    JOIN tb_prof p ON p.co_seq_prof=h.co_prof
    JOIN tb_cbo c ON c.co_cbo=h.co_cbo
    WHERE h.co_tipo_auditoria IN ('I','U')
  ), activities AS (
    SELECT a.co_seq_fat_atividade_coletiva AS id, a.co_dim_tempo AS day, t.dt_registro AS date,
      NULLIF(btrim(a.nu_uuid_ficha), '') AS form, k.nu_identificador AS kind,
      a.nu_participantes AS headcount, a.nu_participantes_registrados AS registered,
      p.cns AS primary_cns, a.co_dim_equipe AS team, a.co_dim_unidade_saude AS unit,
      (a.co_dim_equipe IN (SELECT id FROM team_dim) AND ${eligible("c.nu_cbo", "a.co_dim_tempo")}) IS TRUE AS primary_emulti,
      (c.collective_level OR ${eligible("c.nu_cbo", "a.co_dim_tempo")}) IS TRUE AS primary_level
    FROM tb_fat_atividade_coletiva a
    JOIN tb_dim_tipo_ficha f ON f.co_seq_dim_tipo_ficha=a.co_dim_tipo_ficha AND f.nu_identificador='6'
    JOIN tb_dim_tipo_atividade k ON k.co_seq_dim_tipo_atividade=a.co_dim_tipo_atividade
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=a.co_dim_tempo AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    LEFT JOIN professions c ON c.id=a.co_dim_cbo
    LEFT JOIN professionals p ON p.id=a.co_dim_profissional
    WHERE a.co_dim_unidade_saude IN (SELECT id FROM unit_dim)
      AND a.co_dim_tempo >= (SELECT first_key FROM bounds) AND a.co_dim_tempo < (SELECT end_key FROM bounds)
      AND (k.nu_identificador IN ('4','5','6','7') OR (k.nu_identificador IN ('1','2','3') AND EXISTS (
        SELECT 1 FROM tb_fat_atvdd_coletiva_int i WHERE i.co_fat_atividade_coletiva=a.co_seq_fat_atividade_coletiva
          AND i.co_dim_tempo=a.co_dim_tempo AND i.nu_uuid_ficha=a.nu_uuid_ficha AND i.st_tema_reuniao_disc_proj_tera=1
      )))
  ), collective_actors AS (
    SELECT id, primary_cns AS cns, primary_emulti AS emulti, primary_level AS eligible FROM activities
    UNION ALL
    SELECT a.id, p.cns,
      (${eligible("c.nu_cbo", "a.day")} AND EXISTS (
        SELECT 1 FROM roster r WHERE r.cns=p.cns AND r.cbo=c.nu_cbo AND r.effective_from<=a.date
          AND (r.effective_until IS NULL OR r.effective_until>a.date)
          AND (r.deactivated IS NULL OR r.deactivated>a.date)
      )) IS TRUE,
      (c.collective_level OR ${eligible("c.nu_cbo", "a.day")}) IS TRUE
    FROM activities a JOIN tb_fat_atvdd_coletiva_propart pp ON pp.co_fat_atividade_coletiva=a.id
      AND pp.nu_uuid_ficha=a.form AND pp.co_dim_tempo=a.day AND pp.co_dim_equipe=a.team AND pp.co_dim_unidade_saude=a.unit
    LEFT JOIN professionals p ON p.id=pp.co_dim_profssinal_participante
    LEFT JOIN professions c ON c.id=pp.co_dim_cbo_participante
  ), collective_teams AS (
    SELECT id, array_agg(DISTINCT cns ORDER BY cns) FILTER (WHERE emulti AND cns IS NOT NULL) AS emulti,
      count(DISTINCT cns) FILTER (WHERE eligible) AS distinct_professionals,
      bool_or(cns IS NULL) AS missing_actor
    FROM collective_actors GROUP BY id HAVING bool_or(emulti)
  ), members AS (
    SELECT a.id, ${identityAtEvent("a.date", "m.dt_participante_nascimento")} AS person
    FROM activities a JOIN collective_teams ct ON ct.id=a.id
    JOIN tb_fat_atvdd_coletiva_part m ON m.co_fat_atividade_coletiva=a.id
      AND m.nu_uuid_ficha=a.form AND m.co_dim_tempo=a.day AND m.co_dim_equipe=a.team AND m.co_dim_unidade_saude=a.unit
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=m.co_fat_cidadao_pec
    LEFT JOIN tb_cidadao p ON p.co_seq_cidadao=cp.co_cidadao
  ), member_sets AS (
    SELECT id, count(person)=count(*) AS all_identified,
      array_agg(DISTINCT person ORDER BY person) FILTER (WHERE person IS NOT NULL) AS people
    FROM members GROUP BY id
  ), collective_events AS (
    SELECT a.id, a.day, a.form, a.kind, t.emulti,
      CASE WHEN m.all_identified AND cardinality(m.people)=a.registered AND a.registered=a.headcount
        THEN m.people END AS group_key,
      t.distinct_professionals>=2 AS shared,
      (a.form IS NOT NULL AND a.primary_cns IS NOT NULL AND NOT t.missing_actor
        AND cardinality(t.emulti)>0 AND t.distinct_professionals>0) IS TRUE AS valid
    FROM activities a JOIN collective_teams t ON t.id=a.id LEFT JOIN member_sets m ON m.id=a.id
  ), collective_keys AS (
    SELECT form, count(DISTINCT (day, kind, emulti, group_key, shared, valid)) AS versions
    FROM collective_events WHERE form IS NOT NULL GROUP BY form
  ), collective AS (
    SELECT DISTINCT ON (a.form, CASE WHEN a.form IS NULL THEN a.id END)
      a.day, a.emulti, a.group_key, a.shared, (a.valid AND k.versions=1) IS TRUE AS valid
    FROM collective_events a LEFT JOIN collective_keys k USING (form)
    ORDER BY a.form, CASE WHEN a.form IS NULL THEN a.id END, a.id
  ), care_candidates AS (
    SELECT NULLIF(btrim(f.nu_uuid_cuidado_compartilhado), '') AS request_id, f.co_dim_tempo AS day,
      (f.co_sequencial_evolucao>1 AND f.dt_evolucao::date=t.dt_registro AND f.dt_evolucao>=f.dt_criacao_cuidado
        AND author.cns=executor.cns AND author.cns<>requester.cns
        AND NULLIF(btrim(f.nu_uuid_evolucao), '') IS NOT NULL
        AND ${identityAtEvent("t.dt_registro", "f.dt_nascimento_cidadao")} IS NOT NULL) IS TRUE AS valid
    FROM tb_fat_cuidado_compartilhado f
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=f.co_dim_tempo
      AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    JOIN tb_dim_conduta_cuidado k ON k.co_seq_dim_conduta_cuidado=f.co_dim_conduta_evolucao
      AND k.nu_identificador IN ('2','3','4','5','6','8','9','10','11','12')
    JOIN professions c ON c.id=f.co_dim_cbo_evolucao
    LEFT JOIN professionals author ON author.id=f.co_dim_profissional_evolucao
    LEFT JOIN professionals executor ON executor.id=f.co_dim_profissional_executante
    LEFT JOIN professionals requester ON requester.id=f.co_dim_profissional_solicitant
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec
    LEFT JOIN tb_cidadao p ON p.co_seq_cidadao=cp.co_cidadao
    WHERE f.st_executante=1 AND f.co_dim_tempo < (SELECT end_key FROM bounds)
      AND f.co_dim_unidade_saude_evolucao IN (SELECT id FROM unit_dim)
      AND f.co_dim_equipe_evolucao IN (SELECT id FROM team_dim)
      AND f.co_dim_unidade_saude_executant IN (SELECT id FROM unit_dim)
      AND f.co_dim_equipe_executante IN (SELECT id FROM team_dim)
      AND ${eligible("c.nu_cbo", "f.co_dim_tempo")}
  ), care AS (
    SELECT min(day) AS day, true AS shared, true AS valid FROM care_candidates
    WHERE valid AND request_id IS NOT NULL GROUP BY request_id
    UNION ALL
    SELECT day, true, false FROM care_candidates WHERE NOT valid OR request_id IS NULL
  ), actions AS (
    SELECT i.day, i.shared, i.valid, false AS ambiguous
    FROM individual i
    WHERE NOT i.valid OR i.shared OR NOT EXISTS (
      SELECT 1 FROM individual s WHERE s.valid AND s.shared AND s.day=i.day AND s.person=i.person AND s.emulti && i.emulti
    )
    UNION ALL
    SELECT g.day, g.shared, g.valid,
      (g.valid AND NOT g.shared AND EXISTS (
        SELECT 1 FROM collective s WHERE s.valid AND s.shared AND s.day=g.day AND s.emulti && g.emulti
          AND (s.group_key IS NULL OR g.group_key IS NULL)
      ))
    FROM collective g
    WHERE NOT g.valid OR g.shared OR NOT EXISTS (
      SELECT 1 FROM collective s WHERE s.valid AND s.shared AND s.day=g.day AND s.emulti && g.emulti AND s.group_key=g.group_key
    )
    UNION ALL
    SELECT day, shared, valid, false FROM care
  )
  SELECT coverage.cutoff, coverage.starts_on, p.month,
    count(*) FILTER (WHERE a.valid AND a.shared) AS numerator, count(*) FILTER (WHERE a.valid) AS denominator,
    count(*) FILTER (WHERE NOT a.valid) AS excluded, count(*) FILTER (WHERE a.ambiguous) AS ambiguous
  FROM periods p CROSS JOIN coverage LEFT JOIN actions a ON a.day>=p.start_key AND a.day<p.end_key
  GROUP BY coverage.cutoff, coverage.starts_on, p.month`;
