import { pecLocalPerson, validCns } from "./pec-identity-sql";

export { validCns };
export const localPerson = pecLocalPerson("p");

// $1 CNES, $2 INE, $3 primeiro mês, $4 após o último mês, $5 após o mês corrente,
// $6 CBOs, $7 início da janela de histórico. As datas numéricas são chaves YYYYMMDD do PEC.
const dentalConsultations = `source_range AS (
    SELECT
      (SELECT min(co_dim_tempo) FROM tb_fat_atendimento_odonto WHERE co_dim_tempo > 0) AS first_consultation_day,
      (SELECT min(co_dim_tempo) FROM tb_fat_atend_odonto_proced WHERE co_dim_tempo > 0) AS first_procedure_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_odonto WHERE co_dim_tempo < $5) AS last_consultation_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_atend_odonto_proced WHERE co_dim_tempo < $5) AS last_procedure_day
  ), coverage AS (
    SELECT to_char(n.dt_registro, 'YYYY-MM-DD') AS cutoff, to_char(o.dt_registro, 'YYYY-MM-DD') AS history_start
    FROM source_range r
    LEFT JOIN tb_dim_tempo n ON n.co_seq_dim_tempo=least(r.last_consultation_day, r.last_procedure_day)
      AND r.last_consultation_day IS NOT NULL AND r.last_procedure_day IS NOT NULL
      AND n.co_seq_dim_tempo::text=to_char(n.dt_registro, 'YYYYMMDD')
    LEFT JOIN tb_dim_tempo o ON o.co_seq_dim_tempo=greatest(r.first_consultation_day, r.first_procedure_day)
      AND r.first_consultation_day IS NOT NULL AND r.first_procedure_day IS NOT NULL
      AND o.co_seq_dim_tempo::text=to_char(o.dt_registro, 'YYYYMMDD')
  ), candidates AS (
    SELECT t.dt_registro AS day, f.co_dim_tempo AS date_key, NULLIF(btrim(f.nu_uuid_ficha), '') AS form,
      f.nu_atendimento AS item, COALESCE(u.nu_cnes=$1 AND e.nu_ine=$2, false) AS scoped,
      p.co_seq_cidadao AS citizen,
      CASE WHEN f.dt_nascimento=p.dt_nascimento AND p.dt_nascimento<=t.dt_registro
        THEN ${localPerson}
      END AS person,
      CASE WHEN ${validCns("btrim(pro.nu_cns)")} THEN btrim(pro.nu_cns) END AS dentist,
      (ct.nu_identificador='1') IS TRUE AS first_marked,
      (ct.nu_identificador='1' AND EXISTS (
        SELECT 1 FROM tb_fat_atend_odonto_proced fp
        JOIN tb_dim_procedimento dp ON dp.co_seq_dim_procedimento=fp.co_dim_procedimento
        WHERE fp.co_fat_atd_odnt=f.co_seq_fat_atd_odnt AND fp.co_dim_tempo=f.co_dim_tempo
          AND fp.nu_uuid_ficha=f.nu_uuid_ficha AND fp.nu_atendimento=f.nu_atendimento
          AND dp.co_proced='0301010153' AND fp.qt_procedimentos>0
      )) IS TRUE AS first_qualified,
      (f.st_conduta_tratamento_concluid=1) IS TRUE AS completed
    FROM tb_fat_atendimento_odonto f
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('5','9')
    JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo=f.co_dim_cbo_1 AND cbo.nu_cbo=ANY($6::text[])
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=f.co_dim_tempo
      AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    LEFT JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=f.co_dim_equipe_1
    LEFT JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=f.co_dim_unidade_saude_1
    LEFT JOIN tb_dim_tipo_consulta_odonto ct ON ct.co_seq_dim_tipo_cnsulta_odonto=f.co_dim_tipo_consulta
    LEFT JOIN tb_dim_profissional pro ON pro.co_seq_dim_profissional=f.co_dim_profissional_1
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec
    LEFT JOIN tb_cidadao p ON p.co_seq_cidadao=cp.co_cidadao
    WHERE f.co_dim_tempo >= $7 AND f.co_dim_tempo < $4
      AND (ct.nu_identificador='1' OR f.st_conduta_tratamento_concluid=1)
  ), conflicting_forms AS (
    SELECT form, item FROM candidates WHERE form IS NOT NULL AND item IS NOT NULL
    GROUP BY form, item
    HAVING count(DISTINCT (date_key, person, dentist, scoped, first_marked, first_qualified, completed))>1
  ), checked AS (
    SELECT c.*, c.form IS NOT NULL AND c.item IS NOT NULL AND c.person IS NOT NULL
      AND c.dentist IS NOT NULL AND f.form IS NULL AS valid
    FROM candidates c LEFT JOIN conflicting_forms f USING (form, item)
  ), daily AS (
    -- A história do mesmo paciente e dentista acompanha o par dentro da cópia PEC.
    -- Só os eventos do CNES/INE selecionado entram nas contagens mensais.
    SELECT person, dentist, day, date_key, bool_or(first_marked OR completed) AS relevant,
      bool_or(first_qualified) AS programmatic,
      min(citizen) FILTER (WHERE scoped AND first_qualified) AS scoped_first,
      min(citizen) FILTER (WHERE scoped AND completed) AS scoped_completion
    FROM checked WHERE valid
    GROUP BY person, dentist, day, date_key
  ), history AS (
    SELECT *,
      max(day) FILTER (WHERE relevant) OVER (
        PARTITION BY person, dentist ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS prior_event,
      max(day) FILTER (WHERE programmatic) OVER (
        PARTITION BY person, dentist ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS latest_first
    FROM daily
  ), counted_events AS (
    SELECT (date_key / 100)::int AS competence,
      person, dentist,
      CASE WHEN prior_event IS NULL OR prior_event < day - interval '12 months' THEN scoped_first END AS first_citizen,
      CASE WHEN latest_first >= day - interval '12 months' THEN scoped_completion END AS completion_citizen
    FROM history
    WHERE date_key >= $3 AND (scoped_first IS NOT NULL OR scoped_completion IS NOT NULL)
  ), counted_pairs AS (
    SELECT competence, person, dentist, min(first_citizen) AS first_citizen, min(completion_citizen) AS completion_citizen
    FROM counted_events GROUP BY competence, person, dentist
  )`;

export const b2ContributionSelection = `${dentalConsultations}, nominal_contributions AS (
  SELECT min(least(first_citizen, completion_citizen)) AS citizen,
    count(completion_citizen) AS numerator, count(first_citizen) AS denominator
  FROM counted_pairs
  WHERE competence = to_char(to_date($4::text, 'YYYYMMDD') - interval '1 month', 'YYYYMM')::int
    AND (first_citizen IS NOT NULL OR completion_citizen IS NOT NULL)
  GROUP BY person
)`;

export const dentalConsultationsSql = `WITH ${dentalConsultations}, monthly AS (
    SELECT competence, count(first_citizen) AS first_count, count(completion_citizen) AS completion_count
    FROM counted_pairs GROUP BY competence
  ), exclusions AS (
    SELECT (date_key / 100)::int AS competence,
      count(*) FILTER (WHERE first_marked AND (NOT valid OR NOT first_qualified)) AS first_excluded,
      count(*) FILTER (WHERE NOT valid OR (first_marked AND NOT first_qualified)) AS b2_excluded
    FROM checked WHERE scoped AND date_key >= $3 GROUP BY competence
  )
  SELECT coverage.cutoff, coverage.history_start, statistics.*
  FROM coverage LEFT JOIN (
    SELECT competence, coalesce(m.first_count, 0) AS first_count,
      coalesce(m.completion_count, 0) AS completion_count, coalesce(x.first_excluded, 0) AS first_excluded,
      coalesce(x.b2_excluded, 0) AS b2_excluded
    FROM monthly m FULL JOIN exclusions x USING (competence)
  ) statistics ON true`;

// $1–$5 como acima, $6 CBOs elegíveis para escovação supervisionada.
export const supervisedBrushingSql = `WITH source_range AS (
    SELECT (SELECT min(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo > 0) AS first_activity,
      (SELECT min(co_dim_tempo) FROM tb_fat_atvdd_coletiva_ext WHERE co_dim_tempo > 0) AS first_practice,
      (SELECT min(co_dim_tempo) FROM tb_fat_atvdd_coletiva_part WHERE co_dim_tempo > 0) AS first_participant,
      (SELECT max(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo < $5) AS activity_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_atvdd_coletiva_ext WHERE co_dim_tempo < $5) AS practice_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_atvdd_coletiva_part WHERE co_dim_tempo < $5) AS participant_day
  ), coverage AS (
    SELECT to_char(t.dt_registro, 'YYYY-MM-DD') AS cutoff, to_char(o.dt_registro, 'YYYY-MM-DD') AS history_start
    FROM source_range r
    LEFT JOIN tb_dim_tempo t
      ON t.co_seq_dim_tempo=least(r.activity_day, r.practice_day, r.participant_day)
      AND r.activity_day IS NOT NULL AND r.practice_day IS NOT NULL AND r.participant_day IS NOT NULL
      AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    LEFT JOIN tb_dim_tempo o
      ON o.co_seq_dim_tempo=greatest(r.first_activity, r.first_practice, r.first_participant)
      AND r.first_activity IS NOT NULL AND r.first_practice IS NOT NULL AND r.first_participant IS NOT NULL
      AND o.co_seq_dim_tempo::text=to_char(o.dt_registro, 'YYYYMMDD')
  ), activities AS (
    SELECT a.co_seq_fat_atividade_coletiva AS id, a.nu_uuid_ficha AS form,
      a.co_dim_tempo AS date_key, t.dt_registro AS day,
      a.co_dim_equipe AS team, a.co_dim_unidade_saude AS unit,
      a.nu_participantes_registrados AS registered,
      (${validCns("btrim(pro.nu_cns)")} AND NULLIF(btrim(a.nu_uuid_ficha), '') IS NOT NULL
        AND ext.brushing AND (ext.procedure OR d.co_proced='0101020031')) IS TRUE AS valid
    FROM tb_fat_atividade_coletiva a
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=a.co_dim_tipo_ficha AND k.nu_identificador='6'
    JOIN tb_dim_tipo_atividade x ON x.co_seq_dim_tipo_atividade=a.co_dim_tipo_atividade AND x.nu_identificador='6'
    JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo=a.co_dim_cbo AND cbo.nu_cbo=ANY($6::text[])
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=a.co_dim_tempo
      AND t.co_seq_dim_tempo::text=to_char(t.dt_registro, 'YYYYMMDD')
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=a.co_dim_equipe AND e.nu_ine=$2
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=a.co_dim_unidade_saude AND u.nu_cnes=$1
    LEFT JOIN tb_dim_profissional pro ON pro.co_seq_dim_profissional=a.co_dim_profissional
    LEFT JOIN tb_dim_procedimento d ON d.co_seq_dim_procedimento=a.co_dim_procedimento
    CROSS JOIN LATERAL (
      SELECT bool_or(ext.st_prat_saude_escov_supervisio=1) AS brushing,
        bool_or(sig.co_proced='0101020031') AS procedure
      FROM tb_fat_atvdd_coletiva_ext ext
      LEFT JOIN tb_dim_procedimento sig ON sig.co_seq_dim_procedimento=ext.co_dim_procedimento
      WHERE ext.co_fat_atividade_coletiva=a.co_seq_fat_atividade_coletiva
        AND ext.nu_uuid_ficha=a.nu_uuid_ficha AND ext.co_dim_tempo=a.co_dim_tempo
        AND ext.co_dim_equipe=a.co_dim_equipe AND ext.co_dim_unidade_saude=a.co_dim_unidade_saude
    ) ext
    WHERE a.co_dim_tempo >= $3 AND a.co_dim_tempo < $4
      AND (ext.brushing OR ext.procedure OR d.co_proced='0101020031')
  ), participants AS (
    SELECT a.id, a.date_key, a.registered, a.valid,
      member.co_seq_fat_atvdd_cltv_part AS record,
      CASE WHEN a.valid AND member.nu_uuid_ficha=a.form AND member.co_dim_tempo=a.date_key
        AND member.co_dim_equipe=a.team AND member.co_dim_unidade_saude=a.unit
        AND member.dt_participante_nascimento=p.dt_nascimento AND p.dt_nascimento<=a.day
        AND ${validCns("btrim(member.nu_participante_cns)")}
        AND btrim(member.nu_participante_cns)=btrim(p.nu_cns)
        AND ${localPerson} IS NOT NULL
        THEN btrim(member.nu_participante_cns)
      END AS person,
      extract(year FROM age(a.day, member.dt_participante_nascimento)) AS age_years
    FROM activities a
    LEFT JOIN tb_fat_atvdd_coletiva_part member ON member.co_fat_atividade_coletiva=a.id AND a.valid
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=member.co_fat_cidadao_pec
    LEFT JOIN tb_cidadao p ON p.co_seq_cidadao=cp.co_cidadao
  ), monthly AS (
    SELECT (date_key / 100)::int AS competence,
      count(DISTINCT person) FILTER (WHERE age_years BETWEEN 6 AND 12) AS participant_count,
      count(DISTINCT id) FILTER (WHERE NOT valid OR (registered > 0 AND record IS NULL))
        + count(*) FILTER (WHERE record IS NOT NULL AND person IS NULL) AS excluded
    FROM participants GROUP BY competence
  )
  SELECT coverage.cutoff, coverage.history_start, monthly.* FROM coverage LEFT JOIN monthly ON true`;
