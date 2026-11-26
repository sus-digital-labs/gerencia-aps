export type ReportValue = string | number | null;
export type ReportRow = Record<string, ReportValue>;
export type ReportColumn = { key: string; label: string };

export type SqlReportSection = {
  id: string;
  title: string;
  relation: string;
  day: string;
  requires: string[];
  columns: ReportColumn[];
  select: string;
};

const column = (key: string, label: string): ReportColumn => ({ key, label });
const total = column("quantity", "Registros");

type Fact = { id: string; title: string; relation: string; forms: string; primary?: boolean; day?: string };

const encounters: Fact[] = [
  { id: "individual", title: "Atendimentos individuais", relation: "tb_fat_atendimento_individual", forms: "'4', '9'", primary: true },
  { id: "odontologico", title: "Atendimentos odontológicos", relation: "tb_fat_atendimento_odonto", forms: "'5', '9'", primary: true },
];
const visits: Fact = { id: "visitas", title: "Visitas domiciliares e territoriais", relation: "tb_fat_visita_domiciliar", forms: "'8', '9'" };
const procedures: Fact = { id: "procedimentos", title: "Registros de procedimento ambulatorial", relation: "tb_fat_proced_atend_proced", forms: "'7', '9'" };
const dentalProcedures: Fact = { id: "procedimentos-odonto", title: "Procedimentos odontológicos", relation: "tb_fat_atend_odonto_proced", forms: "'5', '9'", primary: true };
const collective: Fact = { id: "atividades", title: "Atividades coletivas", relation: "tb_fat_atividade_coletiva", forms: "'6'" };
const vaccines: Fact = { id: "doses", title: "Doses aplicadas registradas pela unidade", relation: "tb_fat_vacinacao_vacina", forms: "'14', '9'", day: "co_dim_tempo_vacina_aplicada" };

const vaccineApplication = "f.st_registro_anterior = 0 AND coalesce(f.st_aplicado_exterior, 0) = 0";
const cboCode = "CASE WHEN cbo.nu_cbo ~ '^[0-9]{6}$' THEN cbo.nu_cbo ELSE 'Não informado' END";
const cboLabel = "max(cbo.no_cbo) FILTER (WHERE cbo.nu_cbo ~ '^[0-9]{6}$')";

function dayColumn(fact: Fact) {
  return fact.day ?? "co_dim_tempo";
}

function factScope(fact: Fact, joins = "") {
  const suffix = fact.primary ? "_1" : "";
  return `FROM ${fact.relation} f
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo = f.${dayColumn(fact)}
      AND t.co_seq_dim_tempo::text = to_char(t.dt_registro, 'YYYYMMDD')
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude${suffix}
      AND u.nu_cnes = $1
    LEFT JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = f.co_dim_equipe${suffix}
    JOIN tb_dim_tipo_ficha model ON model.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha
      AND model.nu_identificador IN (${fact.forms})
    ${joins}
    WHERE f.${dayColumn(fact)} >= $3 AND f.${dayColumn(fact)} < $4
      AND f.${dayColumn(fact)} <= $5 AND ($2::text IS NULL OR e.nu_ine = $2)`;
}

function section(fact: Fact, columns: ReportColumn[], select: string, extra: string[] = []): SqlReportSection {
  return {
    id: fact.id, title: fact.title, relation: fact.relation, day: dayColumn(fact),
    requires: [fact.relation, "tb_dim_tempo", "tb_dim_unidade_saude", "tb_dim_equipe", "tb_dim_tipo_ficha", ...extra],
    columns, select,
  };
}

export const productionGroups = ["total", "dia", "cbo", "equipe"] as const;
export type ProductionGroup = (typeof productionGroups)[number];

function productionSection(fact: Fact, group: ProductionGroup, filter = "") {
  const department = "CASE WHEN e.nu_ine ~ '^[0-9]{10}$' THEN e.nu_ine ELSE 'Sem INE informado' END";
  const groups = {
    total: { columns: [] as ReportColumn[], project: "", groupBy: " HAVING count(*) > 0", joinCbo: false },
    dia: { columns: [column("day", "Data")], project: "t.dt_registro::text AS day, ", groupBy: "GROUP BY 1 ORDER BY 1", joinCbo: false },
    cbo: { columns: [column("cbo", "CBO"), column("occupation", "Ocupação")],
      project: `${cboCode} AS cbo, ${cboLabel} AS occupation, `, groupBy: "GROUP BY 1 ORDER BY 1", joinCbo: true },
    equipe: { columns: [column("ine", "INE do registro"), column("team", "Equipe do registro")],
      project: `${department} AS ine, max(e.no_equipe) FILTER (WHERE e.nu_ine ~ '^[0-9]{10}$') AS team, `,
      groupBy: "GROUP BY 1 ORDER BY 1", joinCbo: false },
  };
  const selected = groups[group];
  const joins = selected.joinCbo
    ? `LEFT JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo${fact.primary ? "_1" : ""}` : "";
  return section(fact, [...selected.columns, total], `
    SELECT ${selected.project}count(*) AS quantity
    ${factScope(fact, joins)} ${filter}
    ${selected.groupBy}`, selected.joinCbo ? ["tb_dim_cbo"] : []);
}

export function productionSections(group: ProductionGroup) {
  return [...encounters, visits, procedures, dentalProcedures, collective].map(fact => productionSection(fact, group))
    .concat(productionSection(vaccines, group, `AND ${vaccineApplication}`));
}

export function bpaSections() {
  return [procedures, dentalProcedures].map(fact => {
    const quantity = fact.primary ? "sum(f.qt_procedimentos)" : "count(*)";
    const filter = fact.primary ? "AND f.qt_procedimentos > 0" : "";
    return section(fact, [column("code", "SIGTAP"), column("procedure", "Procedimento"),
      column("cbo", "CBO"), column("occupation", "Ocupação"), column("quantity", "Quantidade registrada")], `
      SELECT p.co_proced AS code, max(p.ds_proced) AS procedure,
        ${cboCode} AS cbo, ${cboLabel} AS occupation, ${quantity} AS quantity
      ${factScope(fact, `JOIN tb_dim_procedimento p ON p.co_seq_dim_procedimento = f.co_dim_procedimento
          AND p.co_proced ~ '^[0-9]{10}$'
        LEFT JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo${fact.primary ? "_1" : ""}`)}
      ${filter}
      GROUP BY 1, 3 ORDER BY 1, 3`, ["tb_dim_cbo", "tb_dim_procedimento"]);
  });
}

export function rasSections() {
  return encounters.map(fact => section(fact, [column("type", "Tipo de atendimento"), total], `
    SELECT coalesce(nullif(btrim(d.ds_tipo_atendimento), ''), 'Não informado') AS type, count(*) AS quantity
    ${factScope(fact, "LEFT JOIN tb_dim_tipo_atendimento d ON d.co_seq_dim_tipo_atendimento = f.co_dim_tipo_atendimento")}
    GROUP BY 1 ORDER BY 2 DESC, 1`, ["tb_dim_tipo_atendimento"]));
}

export function immunizationSection(group: "dose" | "dia") {
  if (group === "dia") return productionSection(vaccines, group, `AND ${vaccineApplication}`);
  return section(vaccines, [column("code", "Código"), column("product", "Imunobiológico"),
    column("dose", "Dose"), column("quantity", "Doses registradas")], `
    SELECT coalesce(nullif(btrim(p.nu_identificador::text), '-'), '—') AS code,
      coalesce(nullif(btrim(p.no_imunobiologico), ''), 'Não informado') AS product,
      coalesce(nullif(btrim(d.no_dose_imunobiologico), ''), 'Não informada') AS dose,
      count(*) AS quantity
    ${factScope(vaccines, `LEFT JOIN tb_dim_imunobiologico p ON p.co_seq_dim_imunobiologico = f.co_dim_imunobiologico
      LEFT JOIN tb_dim_dose_imunobiologico d ON d.co_seq_dim_dose_imunobiologico = f.co_dim_dose_imunobiologico`)}
    AND ${vaccineApplication}
    GROUP BY 1, 2, 3 ORDER BY 4 DESC, 2, 3`, ["tb_dim_imunobiologico", "tb_dim_dose_imunobiologico"]);
}

export function visitSection() {
  return section(visits, [column("ine", "INE do registro"), column("microarea", "Microárea do registro"), column("quantity", "Visitas registradas"),
    column("completed", "Realizadas"), column("refused", "Recusadas"), column("absent", "Ausências"),
    column("unknown", "Sem desfecho identificado")], `
    SELECT CASE WHEN e.nu_ine ~ '^[0-9]{10}$' THEN e.nu_ine ELSE 'Sem INE informado' END AS ine,
      CASE WHEN f.nu_micro_area ~ '^[0-9]{1,3}$' THEN f.nu_micro_area ELSE 'Não informada' END AS microarea,
      count(*) AS quantity, count(*) FILTER (WHERE outcome.nu_identificador = '1') AS completed,
      count(*) FILTER (WHERE outcome.nu_identificador = '2') AS refused,
      count(*) FILTER (WHERE outcome.nu_identificador = '3') AS absent,
      count(*) FILTER (WHERE coalesce(outcome.nu_identificador, '') NOT IN ('1', '2', '3')) AS unknown
    ${factScope(visits, "LEFT JOIN tb_dim_desfecho_visita outcome ON outcome.co_seq_dim_desfecho_visita = f.co_dim_desfecho_visita")}
    GROUP BY 1, 2 ORDER BY 1, 2`, ["tb_dim_desfecho_visita"]);
}

export function incidenceSection(system: "cid" | "ciap") {
  const dim = system === "cid"
    ? { table: "tb_dim_cid", key: "co_seq_dim_cid", fact: "co_dim_cid", code: "nu_cid", label: "no_cid", valid: "^[A-Z][0-9]{2}(\\.?[0-9A-Z]{1,2})?$", name: "CID-10" }
    : { table: "tb_dim_ciap", key: "co_seq_dim_ciap", fact: "co_dim_ciap", code: "nu_ciap", label: "no_ciap", valid: "^[A-Z][0-9]{2}$", name: "CIAP-2" };
  const fact: Fact = { ...encounters[0], id: "diagnosticos", title: `Problemas avaliados por ${dim.name}`, relation: "tb_fat_atd_ind_problemas" };
  return section(fact, [column("code", dim.name), column("diagnosis", "Condição registrada"),
    column("people", "Pessoas no mês"), column("first", "Pessoas com primeiro registro observado")], `
    WITH candidates AS (
      SELECT person.co_cidadao AS person, cat.${dim.code} AS code, max(cat.${dim.label}) AS diagnosis
      ${factScope(fact, `JOIN ${dim.table} cat ON cat.${dim.key} = f.${dim.fact}
        JOIN tb_fat_cidadao_pec person ON person.co_seq_fat_cidadao_pec = f.co_fat_cidadao_pec
          AND person.co_cidadao > 0`)}
      AND f.st_avaliado IS DISTINCT FROM 0 AND cat.${dim.code} ~ '${dim.valid}'
      GROUP BY 1, 2
    )
    SELECT c.code, max(c.diagnosis) AS diagnosis, count(*) AS people,
      count(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM tb_fat_cidadao_pec p
        JOIN tb_fat_atd_ind_problemas f ON f.co_fat_cidadao_pec = p.co_seq_fat_cidadao_pec
          AND f.co_dim_tempo >= 20130101 AND f.co_dim_tempo < $3 AND f.st_avaliado IS DISTINCT FROM 0
        JOIN tb_dim_tempo t ON t.co_seq_dim_tempo = f.co_dim_tempo
          AND t.co_seq_dim_tempo::text = to_char(t.dt_registro, 'YYYYMMDD')
        JOIN tb_dim_tipo_ficha model ON model.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha
          AND model.nu_identificador IN ('4', '9')
        JOIN ${dim.table} cat ON cat.${dim.key} = f.${dim.fact} AND cat.${dim.code} = c.code
        WHERE p.co_cidadao = c.person
      )) AS first
    FROM candidates c GROUP BY 1 ORDER BY 4 DESC, 3 DESC, 1`, [dim.table, "tb_fat_cidadao_pec"]);
}

export function reportSectionSql(section: SqlReportSection) {
  return `WITH bounds AS (
    SELECT min(f.${section.day}) AS start_day, max(f.${section.day}) AS latest_day
    FROM ${section.relation} f WHERE f.${section.day} BETWEEN 20130101 AND $5
  )
  SELECT to_jsonb(data) AS data, first_day.dt_registro::text AS "firstObserved", last_day.dt_registro::text AS "lastObserved"
  FROM bounds
  LEFT JOIN tb_dim_tempo first_day ON first_day.co_seq_dim_tempo = bounds.start_day
    AND first_day.co_seq_dim_tempo::text = to_char(first_day.dt_registro, 'YYYYMMDD')
  LEFT JOIN tb_dim_tempo last_day ON last_day.co_seq_dim_tempo = bounds.latest_day
    AND last_day.co_seq_dim_tempo::text = to_char(last_day.dt_registro, 'YYYYMMDD')
  LEFT JOIN (${section.select}) data ON true`;
}
