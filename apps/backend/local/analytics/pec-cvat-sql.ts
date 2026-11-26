import { pecLocalPerson, validCns } from "./pec-identity-sql";

const population = `
periods AS (
  SELECT month, (month || '-01')::date + interval '1 month' AS end_at,
    to_char((month || '-01')::date + interval '1 month', 'YYYYMMDD')::bigint AS end_key,
    to_char((month || '-01')::date - interval '11 months', 'YYYYMMDD')::bigint AS contact_start,
    to_char((month || '-01')::date - interval '23 months', 'YYYYMMDD')::bigint AS renewal_start
  FROM unnest($3::text[]) AS months(month)
), candidates AS (
  SELECT DISTINCT co_cidadao AS person FROM ta_cidadao_vinculacao_equipe
  WHERE nu_cnes = $1 AND nu_ine = $2
), audited_links AS (
  SELECT DISTINCT ON (p.month, h.co_cidadao)
    p.*, h.co_cidadao AS person, h.nu_cnes, h.nu_ine, h.co_unico_cadastro_individual,
    h.co_tipo_auditoria, h.st_saida_cadastro_obito, h.st_saida_cadastro_territorio, h.st_usar_cadastro_individual
  FROM candidates c JOIN ta_cidadao_vinculacao_equipe h ON h.co_cidadao = c.person
  JOIN periods p ON h.dt_auditoria < p.end_at
    AND (h.dt_atualizacao_cadastro IS NULL OR h.dt_atualizacao_cadastro < p.end_at AT TIME ZONE 'America/Bahia')
  ORDER BY p.month, h.co_cidadao, h.dt_auditoria DESC, h.co_seq_tacidadaovinculacaoequp DESC
), scoped AS (
  SELECT * FROM audited_links WHERE nu_cnes = $1 AND nu_ine = $2
    AND co_tipo_auditoria IN ('I','U') AND st_saida_cadastro_obito = 0 AND st_saida_cadastro_territorio = 0
), audited_people AS (
  SELECT DISTINCT ON (l.month, l.person) l.month, l.person, h.co_tipo_auditoria,
    h.st_ativo, h.st_ativo_para_exibicao, h.st_fora_area, h.st_faleceu, h.dt_obito,
    h.dt_nascimento AS birth, ${pecLocalPerson("h")} AS identity
  FROM scoped l JOIN ta_cidadao h ON h.co_seq_cidadao = l.person AND h.dt_auditoria < l.end_at
  ORDER BY l.month, l.person, h.dt_auditoria DESC, h.co_seq_tacidadao DESC
), identified_links AS (
  SELECT l.*, h.birth, h.identity, count(*) OVER (PARTITION BY l.month, h.identity) AS same_document
  FROM scoped l JOIN audited_people h USING (month, person)
  WHERE h.co_tipo_auditoria IN ('I','U') AND h.st_ativo = 1 AND h.st_ativo_para_exibicao = 1
    AND coalesce(h.st_fora_area, 0) = 0
    AND (h.dt_obito >= l.end_at OR (h.dt_obito IS NULL AND h.st_faleceu = 0))
    AND h.birth < l.end_at AND h.identity IS NOT NULL
), eligible AS (
  SELECT * FROM identified_links WHERE same_document = 1
), individual_forms AS (
  SELECT l.month, l.person, max(f.co_dim_tempo) AS recorded,
    CASE WHEN count(DISTINCT lead.co_cidadao) = 1 THEN min(lead.co_cidadao) END AS family_leader
  FROM eligible l
  JOIN tb_fat_cad_individual f ON f.nu_uuid_ficha = l.co_unico_cadastro_individual
    AND f.co_dim_tempo < l.end_key AND f.co_dim_tempo_validade >= l.end_key
  JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha AND k.nu_identificador = '2'
  JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec = f.co_fat_cidadao_pec AND cp.co_cidadao = l.person
  JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = f.co_dim_equipe AND e.nu_ine = l.nu_ine
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude AND u.nu_cnes = l.nu_cnes
  LEFT JOIN tb_fat_cidadao_pec lead ON lead.co_seq_fat_cidadao_pec =
    CASE WHEN f.st_responsavel_familiar = 1 THEN f.co_fat_cidadao_pec ELSE f.co_fat_cidadao_pec_responsvl END
  WHERE l.st_usar_cadastro_individual = 1 AND f.st_recusa_cadastro = 0
    AND coalesce(upper(btrim(f.nu_micro_area)), '') <> 'FA' AND f.dt_nascimento = l.birth
  GROUP BY l.month, l.person
), household_forms AS (
  SELECT i.month, i.person,
    CASE WHEN count(DISTINCT coalesce(nullif(d.nu_uuid_ficha_origem,''), d.nu_uuid_ficha)) = 1
      THEN max(d.co_dim_tempo) END AS recorded
  FROM individual_forms i JOIN periods p USING (month)
  JOIN tb_fat_cidadao_pec leaders ON leaders.co_cidadao = i.family_leader
  JOIN tb_fat_cad_dom_familia family ON family.co_fat_cidadao_pec = leaders.co_seq_fat_cidadao_pec
    AND family.co_dim_tempo < p.end_key AND family.co_dim_tempo_validade >= p.end_key
  JOIN tb_fat_cad_domiciliar d ON d.co_seq_fat_cad_domiciliar = family.co_fat_cad_domiciliar
    AND d.co_dim_tempo < p.end_key AND d.co_dim_tempo_validade >= p.end_key
  JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = d.co_dim_tipo_ficha AND k.nu_identificador = '3'
  JOIN tb_dim_tipo_imovel property ON property.co_seq_dim_tipo_imovel = d.co_dim_tipo_imovel AND property.nu_identificador = '1'
  JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = d.co_dim_equipe AND e.nu_ine = $2
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = d.co_dim_unidade_saude AND u.nu_cnes = $1
  WHERE family.st_recusa_cadastro = 0 AND d.st_recusa_cadastro = 0 AND family.st_mudou = 0
    AND coalesce(upper(btrim(d.nu_micro_area)), '') <> 'FA'
  GROUP BY i.month, i.person
), roster AS (
  SELECT l.*, i.recorded AS individual, h.recorded AS household,
    l.birth > (l.end_at - interval '1 day') - interval '5 years'
      OR l.birth <= (l.end_at - interval '1 day') - interval '60 years' AS demographic
  FROM eligible l LEFT JOIN individual_forms i USING (month,person) LEFT JOIN household_forms h USING (month,person)
), cutoff AS (
  SELECT max(dt_auditoria)::date::text AS day FROM ta_cidadao_vinculacao_equipe
)`;

const contactModels = [
  { model: "MIAI", table: "tb_fat_atendimento_individual", codes: "('4','9')", suffix: "_1", item: true, care: true },
  { model: "MIAOI", table: "tb_fat_atendimento_odonto", codes: "('5','9')", suffix: "_1", item: true, care: true },
  { model: "MIAC", table: "tb_fat_atvdd_coletiva_part", codes: "('6','9')", suffix: "", item: false, care: true },
  { model: "MIMCA", table: "tb_fat_marca_consumo_alimnt", codes: "('12','9')", suffix: "", item: false, care: true },
  { model: "MIVDT", table: "tb_fat_visita_domiciliar", codes: "('8','9')", suffix: "", item: false, care: true },
  { model: "MIV", table: "tb_fat_vacinacao", codes: "('14','9')", suffix: "", item: true, care: false },
  { model: "MIP", table: "tb_fat_proced_atend", codes: "('7','9')", suffix: "", item: true, care: false },
] as const;

function modelFacts(spec: (typeof contactModels)[number]) {
  const requiresRealVisit = spec.model === "MIVDT";
  return `SELECT fp.person, f.co_dim_tempo AS day, lower(btrim(f.nu_uuid_ficha)) AS form,
      ${spec.item ? "f.nu_atendimento::text" : "NULL::text"} AS item,
      '${spec.model}'::text AS model, ${spec.care} AS care,
      f.co_dim_equipe${spec.suffix} AS team, f.co_dim_unidade_saude${spec.suffix} AS unit
    FROM fact_people fp
    JOIN LATERAL (
      SELECT fact.* FROM ${spec.table} fact
      WHERE fact.co_fat_cidadao_pec = fp.fact_person
        AND fact.co_dim_tempo BETWEEN fp.first_day AND fp.last_day
      OFFSET 0
    ) f ON true
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha AND k.nu_identificador IN ${spec.codes}
    JOIN professionals p ON p.id = f.co_dim_profissional${spec.suffix}
    JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo${spec.suffix} AND cbo.nu_cbo ~ '^[0-9]{6}$'
    ${requiresRealVisit ? "JOIN tb_dim_desfecho_visita status ON status.co_seq_dim_desfecho_visita = f.co_dim_desfecho_visita AND status.nu_identificador = '1'" : ""}
    WHERE nullif(btrim(f.nu_uuid_ficha), '') IS NOT NULL`;
}

const contacts = `
team_id AS (
  SELECT e.co_seq_equipe AS id FROM tb_equipe e JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
  WHERE e.nu_ine = $2 AND u.nu_cnes = $1 AND e.st_ativo = 1 AND u.st_ativo = 1
), link_ids AS (
  SELECT DISTINCT h.co_seq_vinculacao_equipes AS id FROM ta_vinculacao_equipes h JOIN team_id x ON x.id = h.co_equipe_vinculada
), linked_teams AS (
  SELECT DISTINCT ON (p.month,h.co_seq_vinculacao_equipes)
    p.month, h.co_equipe_principal, h.co_equipe_vinculada, h.co_tipo_auditoria
  FROM link_ids i JOIN ta_vinculacao_equipes h ON h.co_seq_vinculacao_equipes = i.id
  JOIN periods p ON h.dt_auditoria < p.end_at
  ORDER BY p.month,h.co_seq_vinculacao_equipes,h.dt_auditoria DESC,h.co_seq_tavinculacaoequipes DESC
), providers AS (
  SELECT month, $2::text AS ine, $1::text AS cnes FROM periods
  UNION
  SELECT l.month, t.nu_ine, u.nu_cnes FROM linked_teams l
  JOIN team_id x ON x.id = l.co_equipe_vinculada
  JOIN tb_equipe t ON t.co_seq_equipe = l.co_equipe_principal
  JOIN tb_tipo_equipe k ON k.co_seq_tipo_equipe = t.tp_equipe AND k.nu_ms::text IN ('71','72')
  JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = t.co_unidade_saude
  WHERE l.co_tipo_auditoria IN ('I','U') AND t.nu_ine IS NOT NULL AND u.nu_cnes IS NOT NULL
), range_people AS (
  SELECT person,min(contact_start) AS first_day,max(end_key) - 1 AS last_day
  FROM roster WHERE individual >= renewal_start GROUP BY person
), fact_people AS (
  SELECT cp.co_seq_fat_cidadao_pec AS fact_person, r.person, r.first_day, r.last_day
  FROM range_people r
  JOIN LATERAL (
    SELECT co_seq_fat_cidadao_pec FROM tb_fat_cidadao_pec
    WHERE co_cidadao = r.person OFFSET 0
  ) cp ON true
), professionals AS (
  SELECT co_seq_dim_profissional AS id FROM tb_dim_profissional WHERE ${validCns("btrim(nu_cns)")}
), facts AS (
  ${contactModels.map(modelFacts).join("\n  UNION ALL\n  ")}
), deduplicated_contacts AS (
  SELECT l.month,l.person,f.day,f.form,f.item, bool_or(f.care) AS care
  FROM facts f
  JOIN roster l ON l.person = f.person AND f.day >= l.contact_start AND f.day < l.end_key
    AND l.individual >= l.renewal_start
  JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = f.team
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.unit
  JOIN providers scope ON scope.month = l.month AND scope.ine = e.nu_ine AND scope.cnes = u.nu_cnes
  GROUP BY l.month,l.person,f.day,f.form,f.item
), tracked AS (
  SELECT month,person,count(*)::integer AS contacts
  FROM deduplicated_contacts GROUP BY month,person HAVING count(*) >= 2 AND bool_or(care)
)`;

export function territorialCtes(withContacts: boolean) {
  return withContacts ? `${population},${contacts}` : population;
}

export function territorialAggregateSql(withContacts: boolean) {
  const tracking = withContacts ? `COUNT(t.person)::int AS tracked,
      count(*) FILTER (WHERE t.person IS NOT NULL AND r.demographic)::int AS demographic` : "NULL::int AS tracked, NULL::int AS demographic";
  return `WITH ${territorialCtes(withContacts)}, aggregate AS (
    SELECT r.month, count(*)::int AS linked,
      count(*) FILTER (WHERE r.individual IS NOT NULL)::int AS valid,
      count(*) FILTER (WHERE r.household IS NOT NULL)::int AS complete,
      count(*) FILTER (WHERE r.individual >= r.renewal_start)::int AS recent_individual,
      count(*) FILTER (WHERE r.household >= r.renewal_start)::int AS recent_household,
      count(*) FILTER (WHERE r.individual >= r.renewal_start AND r.household >= r.renewal_start)::int AS recent_both,
      ${tracking}
    FROM roster r ${withContacts ? "LEFT JOIN tracked t USING (month,person)" : ""} GROUP BY r.month
  ), scoped_totals AS (
    SELECT month,count(*)::int AS candidates FROM scoped GROUP BY month
  )
  SELECT p.month, cutoff.day AS cutoff, coalesce(s.candidates, 0) AS candidates,
    coalesce(a.linked, 0) AS linked, coalesce(a.valid, 0) AS valid, coalesce(a.complete, 0) AS complete,
    coalesce(a.recent_individual, 0) AS recent_individual, coalesce(a.recent_household, 0) AS recent_household,
    coalesce(a.recent_both, 0) AS recent_both,
    ${withContacts ? "coalesce(a.tracked, 0)" : "a.tracked"} AS tracked,
    ${withContacts ? "coalesce(a.demographic, 0)" : "a.demographic"} AS demographic
  FROM periods p CROSS JOIN cutoff LEFT JOIN aggregate a USING (month) LEFT JOIN scoped_totals s USING (month)
  ORDER BY p.month`;
}
