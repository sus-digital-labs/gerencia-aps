import { historicallyLinked, maternalEvidenceCtes } from "./pec-maternal-evidence";

// SEI 0054824593 requires the distinct components of combined products,
// not three doses of any product with a component of the pentavalent vaccine.
const vaccineSeries = `
  ('DTP', ARRAY[29,39,42,43,46,47,58], 3, 30, 0),
  ('HEPB', ARRAY[9,42,43], 3, 30, 0),
  ('HIB', ARRAY[17,29,39,42,43], 3, 30, 0),
  ('VIP', ARRAY[22,29,43,58], 3, 30, 0),
  ('SCR', ARRAY[24,56], 2, 1, 12),
  ('VPC', ARRAY[26,59,106,107], 2, 30, 0)
`;

export const childCareQuery = `${maternalEvidenceCtes("child")},
child_landmarks AS (
  SELECT m.month_start, p.person, p.birth, p.death_date,
    least(m.assessed_on, (p.birth + interval '24 months')::date) AS reference_day,
    (p.birth + interval '24 months')::date <= m.assessed_on AS completed
  FROM months m JOIN people p ON p.birth <= m.assessed_on
    AND (p.birth + interval '24 months')::date >= m.month_start
), child_cohort AS (
  ${historicallyLinked("child_landmarks", "person")}
), child_consultations AS (
  SELECT c.month_start, c.person,
    bool_or(e.mode = '2' AND NOT ('0301010250' = ANY(e.performed)) AND e.day <= c.birth + 30) AS a,
    count(DISTINCT (e.nu_uuid_ficha, e.nu_atendimento)) >= 9 AS b
  FROM child_cohort c JOIN individual_events e ON e.person = c.person AND e.day BETWEEN c.birth AND c.reference_day
  WHERE e.clinician AND 'ABP004' = ANY(e.ciaps)
    AND (e.mode IN ('2','3','4','5','6') OR '0301010250' = ANY(e.performed))
  GROUP BY c.month_start, c.person
), child_measurements AS (
  SELECT c.month_start, c.person, count(DISTINCT e.day) >= 9 AS c
  FROM child_cohort c JOIN measurement_days e ON e.person = c.person AND e.day BETWEEN c.birth AND c.reference_day
  WHERE e.pair
  GROUP BY c.month_start, c.person
), child_visits AS (
  SELECT c.month_start, c.person,
    bool_or(e.day <= c.birth + 30) AND count(DISTINCT e.day) >= 2 AS d
  FROM child_cohort c JOIN home_events e ON e.person = c.person
    AND e.day BETWEEN c.birth AND least(c.reference_day, (c.birth + interval '6 months')::date)
    AND e.child AND e.outcome = '1'
  GROUP BY c.month_start, c.person
), vaccine_series AS (
  SELECT * FROM (VALUES ${vaccineSeries}) AS series(name, products, doses, gap, age_months)
), relevant_doses AS (
  SELECT c.month_start, c.person, s.name, s.doses, s.gap, array_agg(DISTINCT v.day ORDER BY v.day) AS dates
  FROM child_cohort c JOIN vaccine_events v ON v.person = c.person AND v.day <= c.reference_day
  JOIN vaccine_series s ON v.product = ANY(s.products)
  WHERE v.day >= (c.birth + s.age_months * interval '1 month')::date
  GROUP BY c.month_start, c.person, s.name, s.doses, s.gap
), child_series AS (
  SELECT d.month_start, d.person, d.name,
    (CASE WHEN d.doses = 3 THEN third_dose.day ELSE second_dose.day END IS NOT NULL) AS met
  FROM relevant_doses d
  LEFT JOIN LATERAL (
    SELECT min(day) AS day FROM unnest(d.dates) day WHERE day >= d.dates[1] + d.gap
  ) second_dose ON true
  LEFT JOIN LATERAL (
    SELECT min(day) AS day FROM unnest(d.dates) day WHERE d.doses = 3 AND day >= second_dose.day + d.gap
  ) third_dose ON true
), child_vaccination AS (
  SELECT month_start, person, count(*) = 6 AND bool_and(met) AS e
  FROM child_series GROUP BY month_start, person
), child_observations AS (
  SELECT cohort.month_start, cohort.birth AS begins, cohort.completed, consult.a, consult.b, measured.c,
         (scope.is_eap OR visited.d) AS d, vaccinated.e
  FROM child_cohort cohort CROSS JOIN requested_scope scope
  LEFT JOIN child_consultations consult USING (month_start, person)
  LEFT JOIN child_measurements measured USING (month_start, person)
  LEFT JOIN child_visits visited USING (month_start, person)
  LEFT JOIN child_vaccination vaccinated USING (month_start, person)
)
SELECT to_char(m.month_start,'YYYY-MM') AS month, c.cutoff::text AS cutoff,
       m.assessed_on::text AS "assessedOn",
       coalesce(c.covered_through >= m.assessed_on
         AND c.covered_since <= coalesce(min(o.begins), m.month_start), false) AS "localWindowCovered",
       count(*) FILTER (WHERE o.completed = false)::integer AS ongoing,
       count(*) FILTER (WHERE o.completed = true)::integer AS completed,
       jsonb_build_object(
         'A', ARRAY[count(*) FILTER (WHERE o.a AND NOT o.completed), count(*) FILTER (WHERE o.a AND o.completed)],
         'B', ARRAY[count(*) FILTER (WHERE o.b AND NOT o.completed), count(*) FILTER (WHERE o.b AND o.completed)],
         'C', ARRAY[count(*) FILTER (WHERE o.c AND NOT o.completed), count(*) FILTER (WHERE o.c AND o.completed)],
         'D', ARRAY[count(*) FILTER (WHERE o.d AND NOT o.completed), count(*) FILTER (WHERE o.d AND o.completed)],
         'E', ARRAY[count(*) FILTER (WHERE o.e AND NOT o.completed), count(*) FILTER (WHERE o.e AND o.completed)]
       ) AS criteria
FROM source_cutoff c LEFT JOIN months m ON true
LEFT JOIN child_observations o ON o.month_start = m.month_start
GROUP BY m.month_start, m.assessed_on, c.cutoff, c.covered_since, c.covered_through
ORDER BY m.month_start
`;
