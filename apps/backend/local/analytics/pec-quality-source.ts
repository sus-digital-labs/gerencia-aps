import { TRPCError } from "@trpc/server";
import type { PecTeamScope } from "@shared/pec-scope";
import { shiftApsCompetence } from "@shared/aps-competence";
import { queryPEC } from "../pec-db";
import { dentalCbos, dentalCriteria, primaryCareCbos, type LocalQualityCode } from "./quality-rules";
import { pecLocalPerson, validCns } from "./pec-identity-sql";

type LocalCounts = { numerator: number; denominator: number };
type DentalRow = { cbo: string; procedure: string; quantity: number };
type Observations = { counts: LocalCounts | null; procedures: DentalRow[]; excluded: number; demandUnresolved: boolean };

export const unresolvedDemandReason = "O PEC tem atendimentos elegíveis sem um tipo de demanda reconhecido no contrato do C1.";

// Os fatos desta versão usam uma chave de data YYYYMMDD. Verifique o vínculo com a dimensão.
const coverage = (table: "tb_fat_atendimento_individual" | "tb_fat_atend_odonto_proced") => `
  coverage AS (
    SELECT to_char(t.dt_registro, 'YYYY-MM-DD') AS cutoff
    FROM tb_dim_tempo t
    WHERE t.co_seq_dim_tempo = (SELECT max(f.co_dim_tempo) FROM ${table} f WHERE f.co_dim_tempo < $6)
      AND t.co_seq_dim_tempo::text = to_char(t.dt_registro, 'YYYYMMDD')
  )`;

// A identificação é a do cadastro disponível no PEC. A correspondência com o CadSUS
// e a situação do profissional no SCNES dependem das bases nacionais.
const localIdentity = `(${pecLocalPerson("p")}) IS NOT NULL AND p.dt_nascimento IS NOT NULL
  AND ${validCns("btrim(pro.nu_cns)")}`;

const commonJoins = `
  JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = f.co_dim_equipe_1
  JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude_1
  JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo = f.co_dim_cbo_1
  JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha
  JOIN tb_dim_tempo t ON t.co_seq_dim_tempo = f.co_dim_tempo
    AND t.co_seq_dim_tempo::text = to_char(t.dt_registro, 'YYYYMMDD')
  LEFT JOIN tb_dim_profissional pro ON pro.co_seq_dim_profissional = f.co_dim_profissional_1
  LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec = f.co_fat_cidadao_pec
  LEFT JOIN tb_cidadao p ON p.co_seq_cidadao = cp.co_cidadao`;

const commonFilter = `f.co_dim_tempo >= $1 AND f.co_dim_tempo < $2
  AND u.nu_cnes = $3 AND e.nu_ine = $4 AND cbo.nu_cbo = ANY($5::text[])`;

const programmed = "demand IN ('1', '2')";
const c1Facts = `
  ${coverage("tb_fat_atendimento_individual")},
  candidates AS (
    SELECT (f.co_dim_tempo / 100)::int AS competence, f.nu_uuid_ficha AS form,
      f.nu_atendimento AS item, p.co_seq_cidadao AS person, f.co_dim_tempo AS day,
      (${localIdentity}) AS identified,
      CASE WHEN d.nu_identificador IN ('1', '2', '4', '5', '6') THEN d.nu_identificador END AS demand
    FROM tb_fat_atendimento_individual f
    ${commonJoins}
    LEFT JOIN tb_dim_tipo_atendimento d ON d.co_seq_dim_tipo_atendimento = f.co_dim_tipo_atendimento
    WHERE ${commonFilter} AND k.nu_identificador IN ('4', '9')
  ), deduplicated AS (
    SELECT competence, min(demand) AS demand, min(person) AS person,
      NULLIF(btrim(form), '') IS NOT NULL AND item IS NOT NULL
        AND bool_and(identified IS TRUE) AND count(demand) = count(*)
        AND count(DISTINCT (demand, person, day)) = 1 AS valid,
      bool_or(identified IS TRUE AND demand IS NULL) OR count(DISTINCT demand) > 1 AS demand_unresolved,
      count(*) AS observations
    FROM candidates GROUP BY competence, form, item
  )`;

const c1Query = `WITH ${c1Facts},
  monthly AS (
    SELECT competence, count(*) FILTER (WHERE valid AND ${programmed}) AS numerator,
      count(*) FILTER (WHERE valid) AS denominator,
      bool_or(demand_unresolved) AS demand_unresolved,
      coalesce(sum(observations) FILTER (WHERE NOT valid), 0)::bigint AS excluded
    FROM deduplicated GROUP BY competence
  )
  SELECT metadata.cutoff, monthly.*
  FROM (SELECT (SELECT cutoff FROM coverage) AS cutoff) metadata LEFT JOIN monthly ON true`;

const dentalFacts = `
  ${coverage("tb_fat_atend_odonto_proced")},
  candidates AS (
    SELECT (f.co_dim_tempo / 100)::int AS competence, f.nu_uuid_ficha AS form, f.nu_atendimento AS item,
      p.co_seq_cidadao AS person, f.co_dim_tempo AS day, d.co_proced AS procedure, cbo.nu_cbo AS cbo,
      CASE WHEN ${localIdentity} AND f.qt_procedimentos > 0 THEN f.qt_procedimentos END AS quantity
    FROM tb_fat_atend_odonto_proced f
    ${commonJoins}
    LEFT JOIN tb_dim_procedimento d ON d.co_seq_dim_procedimento = f.co_dim_procedimento
    WHERE ${commonFilter} AND k.nu_identificador IN ('5', '9')
  ), deduplicated AS (
    SELECT competence, procedure, min(cbo) AS cbo, min(quantity) AS quantity, min(person) AS person,
      NULLIF(btrim(form), '') IS NOT NULL AND item IS NOT NULL AND procedure ~ '^[0-9]{10}$'
        AND count(quantity) = count(*) AND count(DISTINCT (quantity, person, day, cbo)) = 1 AS valid,
      count(*) AS observations
    FROM candidates GROUP BY competence, form, item, procedure
  )`;

const dentalQuery = `WITH ${dentalFacts},
  monthly AS (
    SELECT competence, cbo, procedure, coalesce(sum(quantity) FILTER (WHERE valid), 0)::bigint AS quantity,
      coalesce(sum(observations) FILTER (WHERE valid IS NOT TRUE), 0)::bigint AS excluded
    FROM deduplicated GROUP BY competence, cbo, procedure
  )
  SELECT metadata.cutoff, monthly.*
  FROM (SELECT (SELECT cutoff FROM coverage) AS cutoff) metadata LEFT JOIN monthly ON true`;

const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;

function sourceParams(scope: PecTeamScope, first: string, last: string, current: string, primary: boolean) {
  return [dateKey(first), dateKey(shiftApsCompetence(last, 1)), scope.cnes, scope.ine,
    primary ? primaryCareCbos : dentalCbos, dateKey(shiftApsCompetence(current, 1))];
}

export function competenceEnd(month: string) {
  const end = new Date(`${shiftApsCompetence(month, 1)}-01T00:00:00Z`).getTime() - 86_400_000;
  return new Date(end).toISOString().slice(0, 10);
}

export async function loadPecQuality(
  scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string, kind: "primary" | "dental",
) {
  const primary = kind === "primary";
  const rows = await queryPEC<{
    cutoff: string | null; competence: number | null; excluded: string | null;
    numerator?: string; denominator?: string; demand_unresolved?: boolean;
    procedure?: string | null; cbo?: string; quantity?: string;
  }>(primary ? c1Query : dentalQuery, sourceParams(scope, firstMonth, lastMonth, currentMonth, primary));

  const byMonth = new Map<string, Observations>();
  for (const row of rows) {
    if (!row.competence) continue;
    const key = String(row.competence);
    const month = `${key.slice(0, 4)}-${key.slice(4)}`;
    const observations = byMonth.get(month) ?? { counts: null, procedures: [], excluded: 0, demandUnresolved: false };
    observations.excluded += Number(row.excluded);
    if (primary) {
      observations.counts = { numerator: Number(row.numerator), denominator: Number(row.denominator) };
      observations.demandUnresolved = row.demand_unresolved === true;
    } else if (row.procedure && row.cbo && Number(row.quantity) > 0) {
      observations.procedures.push({ cbo: row.cbo, procedure: row.procedure, quantity: Number(row.quantity) });
    }
    byMonth.set(month, observations);
  }
  return { sourceThrough: rows[0]?.cutoff ?? null, byMonth };
}

export async function loadIndicatorContributions(input: PecTeamScope & {
  code: LocalQualityCode; month: string; page: number; pageSize: number; currentMonth: string;
}) {
  const primary = input.code === "C1";
  const params: unknown[] = [
    ...sourceParams(input, input.month, input.month, input.currentMonth, primary),
    competenceEnd(input.month), input.pageSize + 1, (input.page - 1) * input.pageSize,
  ];
  if (input.code !== "C1") {
    const code = input.code;
    params.push(JSON.stringify(dentalCbos.map(cbo => {
      const rule = dentalCriteria(code, cbo);
      return { cbo, numerator: Array.from(rule.numerator), denominator: Array.from(rule.denominator) };
    })));
  }
  const contributions = primary ? `
      SELECT person, count(*) FILTER (WHERE ${programmed}) AS numerator, count(*) AS denominator
      FROM deduplicated WHERE valid GROUP BY person` : `
      SELECT d.person, coalesce(sum(d.quantity) FILTER (WHERE r.numerator ? d.procedure), 0) AS numerator,
        sum(d.quantity) AS denominator
      FROM deduplicated d
      JOIN jsonb_to_recordset($10::jsonb) AS r(cbo text, numerator jsonb, denominator jsonb) ON r.cbo = d.cbo
      WHERE d.valid AND r.denominator ? d.procedure GROUP BY d.person`;

  const unresolvedDemand = primary
    ? "EXISTS (SELECT 1 FROM deduplicated WHERE demand_unresolved)" : "false";
  const rows = await queryPEC<{
    cutoff: string | null; demand_unresolved: boolean; name: string | null; numerator: string; denominator: string;
  }>(`
    WITH ${primary ? c1Facts : dentalFacts}, metadata AS (
      SELECT (SELECT cutoff FROM coverage) AS cutoff, ${unresolvedDemand} AS demand_unresolved
    ), contributions AS (${contributions}), page_rows AS (
      SELECT COALESCE(NULLIF(btrim(p.no_social), ''), btrim(p.no_cidadao)) AS name, c.person, c.numerator, c.denominator
      FROM contributions c JOIN tb_cidadao p ON p.co_seq_cidadao = c.person
      WHERE EXISTS (SELECT 1 FROM metadata WHERE cutoff >= $7 AND NOT demand_unresolved)
      ORDER BY name, c.person LIMIT $8 OFFSET $9
    )
    SELECT metadata.cutoff, metadata.demand_unresolved, page_rows.name, page_rows.numerator, page_rows.denominator
    FROM metadata LEFT JOIN page_rows ON true
    ORDER BY page_rows.name, page_rows.person`, params);

  if (rows[0]?.demand_unresolved) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: unresolvedDemandReason });
  }

  const people = rows.flatMap(row => row.name === null ? [] : [{
    name: row.name, numerator: Number(row.numerator), denominator: Number(row.denominator),
  }]);

  return {
    sourceThrough: rows[0]?.cutoff ?? null,
    rows: people.slice(0, input.pageSize),
    page: input.page,
    hasNextPage: input.page < 500 && people.length > input.pageSize,
  };
}
