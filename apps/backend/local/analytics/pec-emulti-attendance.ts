import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { competenceEnd } from "./pec-quality-source";
import { pecLocalPerson } from "./pec-identity-sql";
import { assessmentCompetences, loadExtendedContributions, type ExtendedContributionInput } from "./pec-extended-contributions";

export const emultiCbos = [
  "131225", "223305", "223405", "223445", "223505", "223545", "223555", "223580", "223605",
  "223710", "223810", "223905", "224140", "225103", "225105", "225120", "225124", "225125",
  "225133", "225135", "225155", "225180", "225195", "225250", "251510", "251605", "515305",
];
export const emultiCbosFromDecember2025 = ["223505", "223545", "223555", "223580", "225125"];
export const emultiAttendanceSource = {
  document: "0055952286",
  url: "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti/nota-metodologica-m1-media-de-atendimentos-por-pessoa-pela-emulti-na-aps/@@download/file",
};

const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;
const firstMonthOffset = -3;
const cbo = (alias: string, date: string) => `${alias}.nu_cbo = ANY($6::text[])
  AND (${date} >= 20251201 OR NOT (${alias}.nu_cbo = ANY($7::text[])))`;

const attendanceSelection = `periods AS (
    SELECT month, start_key, end_key, to_date(end_key::text, 'YYYYMMDD') AS end_date
    FROM unnest($1::text[], $2::bigint[], $3::bigint[]) AS planned(month, start_key, end_key)
  ), bounds AS (SELECT min(start_key) AS first, max(end_key) AS last FROM periods),
  team_keys AS (SELECT co_seq_dim_equipe AS id FROM tb_dim_equipe WHERE nu_ine = $5),
  unit_keys AS (SELECT co_seq_dim_unidade_saude AS id FROM tb_dim_unidade_saude WHERE nu_cnes = $4),
  coverage AS (
    SELECT to_char(to_date(greatest(
        (SELECT min(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo >= 20130101),
        (SELECT min(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo >= 20130101)
      )::text, 'YYYYMMDD'), 'YYYY-MM-DD') AS history_start,
      CASE WHEN cutoff_individual IS NOT NULL AND cutoff_collective IS NOT NULL
        THEN to_char(to_date(least(cutoff_individual, cutoff_collective)::text, 'YYYYMMDD'), 'YYYY-MM-DD') END AS cutoff
    FROM (
      SELECT (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo < $8) AS cutoff_individual,
        (SELECT max(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo < $8) AS cutoff_collective
    ) facts
  ), individual AS (
    SELECT f.co_dim_tempo AS day, f.nu_uuid_ficha AS form, f.nu_atendimento::text AS item, cp.co_cidadao AS person
    FROM bounds b JOIN tb_fat_atendimento_individual f ON f.co_dim_tempo >= b.first AND f.co_dim_tempo < b.last
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha AND k.nu_identificador IN ('4','9')
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec = f.co_fat_cidadao_pec
    LEFT JOIN tb_dim_cbo cb1 ON cb1.co_seq_dim_cbo = f.co_dim_cbo_1
    LEFT JOIN tb_dim_cbo cb2 ON cb2.co_seq_dim_cbo = f.co_dim_cbo_2
    LEFT JOIN tb_dim_profissional a1 ON a1.co_seq_dim_profissional = f.co_dim_profissional_1
    LEFT JOIN tb_dim_profissional a2 ON a2.co_seq_dim_profissional = f.co_dim_profissional_2
    WHERE (f.co_dim_equipe_1 IN (SELECT id FROM team_keys) AND f.co_dim_unidade_saude_1 IN (SELECT id FROM unit_keys)
        AND ${cbo("cb1", "f.co_dim_tempo")} AND btrim(a1.nu_cns) ~ '^[0-9]{15}$')
      OR (f.co_dim_equipe_2 IN (SELECT id FROM team_keys) AND f.co_dim_unidade_saude_2 IN (SELECT id FROM unit_keys)
        AND ${cbo("cb2", "f.co_dim_tempo")} AND btrim(a2.nu_cns) ~ '^[0-9]{15}$')
  ), assignment_keys AS (
    SELECT DISTINCT l.co_unico_lotacao
    FROM ta_lotacao l JOIN tb_equipe e ON e.co_seq_equipe = l.co_equipe AND e.nu_ine = $5
    JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = l.co_unidade_saude AND u.nu_cnes = $4
  ), assignment_history AS (
    SELECT h.*, lead(h.dt_auditoria) OVER (PARTITION BY h.co_unico_lotacao ORDER BY h.dt_auditoria, h.co_seq_talotacao) AS until
    FROM ta_lotacao h JOIN assignment_keys k ON k.co_unico_lotacao = h.co_unico_lotacao
  ), assignments AS (
    SELECT btrim(prof.nu_cns) AS cns, h.dt_auditoria::date AS starts_on, h.until::date AS ends_on,
      h.dt_desativacao_lotacao::date AS disabled_on
    FROM assignment_history h
    JOIN tb_prof prof ON prof.co_seq_prof = h.co_prof
    JOIN tb_equipe e ON e.co_seq_equipe = h.co_equipe AND e.nu_ine = $5
    JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = h.co_unidade_saude AND u.nu_cnes = $4
    WHERE h.co_tipo_auditoria IN ('I','U')
  ), eligible_activities AS (
    SELECT f.co_seq_fat_atividade_coletiva AS id, f.co_dim_tempo AS day, f.nu_uuid_ficha AS form
    FROM bounds b JOIN tb_fat_atividade_coletiva f ON f.co_dim_tempo >= b.first AND f.co_dim_tempo < b.last
    JOIN tb_dim_tipo_atividade k ON k.co_seq_dim_tipo_atividade = f.co_dim_tipo_atividade
      AND k.nu_identificador IN ('4','5','6','7')
    LEFT JOIN tb_dim_cbo cb ON cb.co_seq_dim_cbo = f.co_dim_cbo
    LEFT JOIN tb_dim_profissional a ON a.co_seq_dim_profissional = f.co_dim_profissional
    WHERE f.co_dim_unidade_saude IN (SELECT id FROM unit_keys) AND (
      (f.co_dim_equipe IN (SELECT id FROM team_keys) AND ${cbo("cb", "f.co_dim_tempo")} AND btrim(a.nu_cns) ~ '^[0-9]{15}$')
      OR EXISTS (
        SELECT 1 FROM tb_fat_atvdd_coletiva_propart pp
        JOIN tb_dim_profissional secondary ON secondary.co_seq_dim_profissional = pp.co_dim_profssinal_participante
        JOIN tb_dim_cbo secondary_cbo ON secondary_cbo.co_seq_dim_cbo = pp.co_dim_cbo_participante
        JOIN assignments l ON l.cns = btrim(secondary.nu_cns)
        WHERE pp.co_fat_atividade_coletiva = f.co_seq_fat_atividade_coletiva
          AND ${cbo("secondary_cbo", "f.co_dim_tempo")} AND l.cns ~ '^[0-9]{15}$'
          AND l.starts_on <= to_date(f.co_dim_tempo::text, 'YYYYMMDD')
          AND (l.ends_on IS NULL OR l.ends_on > to_date(f.co_dim_tempo::text, 'YYYYMMDD'))
          AND (l.disabled_on IS NULL OR l.disabled_on > to_date(f.co_dim_tempo::text, 'YYYYMMDD'))
      ))
  ), collective AS (
    SELECT f.day, f.form, cp.co_cidadao AS person
    FROM eligible_activities f JOIN tb_fat_atvdd_coletiva_part part ON part.co_fat_atividade_coletiva = f.id
    LEFT JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec = part.co_fat_cidadao_pec
  ), events AS (
    SELECT min(day) AS day, min(person) AS person, count(*) AS source_rows,
      nullif(btrim(form), '') IS NOT NULL AND item IS NOT NULL AND count(person) = count(*)
        AND count(DISTINCT (day, person)) = 1 AS resolved
    FROM individual GROUP BY form, item
    UNION ALL
    SELECT min(day), person, count(*), nullif(btrim(form), '') IS NOT NULL AND person IS NOT NULL AND count(DISTINCT day) = 1
    FROM collective GROUP BY form, person
  ), persons AS (SELECT DISTINCT person FROM events WHERE resolved),
  historical_links AS (
    SELECT DISTINCT ON (p.month, h.co_cidadao) p.month, h.co_cidadao AS person,
      h.nu_cnes, h.nu_ine, h.co_tipo_auditoria, h.st_saida_cadastro_obito, h.st_saida_cadastro_territorio
    FROM persons x JOIN ta_cidadao_vinculacao_equipe h ON h.co_cidadao = x.person
    JOIN periods p ON h.dt_auditoria < p.end_date::timestamp
      AND h.dt_atualizacao_cadastro < (p.end_date::timestamp AT TIME ZONE 'America/Bahia')
    ORDER BY p.month, h.co_cidadao, h.dt_auditoria DESC, h.co_seq_tacidadaovinculacaoequp DESC
  ), eligible_links AS (
    SELECT h.month,h.person FROM historical_links h
    WHERE h.co_tipo_auditoria IN ('I','U') AND h.st_saida_cadastro_obito = 0 AND h.st_saida_cadastro_territorio = 0
      AND EXISTS (SELECT 1 FROM tb_equipe e JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe=e.tp_equipe
        JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=e.co_unidade_saude
        WHERE e.nu_ine=h.nu_ine AND u.nu_cnes=h.nu_cnes AND t.nu_ms IN ('70','76'))
  ), resolved_events AS (
    SELECT p.month, e.source_rows, c.co_seq_cidadao AS citizen,
      CASE WHEN e.resolved AND l.person IS NOT NULL
        AND c.dt_nascimento <= to_date(e.day::text, 'YYYYMMDD')
        AND (c.dt_obito IS NULL AND c.st_faleceu=0 OR c.dt_obito >= p.end_date)
        THEN ${pecLocalPerson("c")} END AS identity
    FROM periods p JOIN events e ON e.day >= p.start_key AND e.day < p.end_key
    LEFT JOIN eligible_links l ON l.person=e.person AND l.month=p.month
    LEFT JOIN tb_cidadao c ON c.co_seq_cidadao=e.person
  ), person_contributions AS (
    SELECT month, identity, min(citizen) AS citizen, count(identity) AS numerator,
      CASE WHEN identity IS NULL THEN 0 ELSE 1 END AS denominator,
      coalesce(sum(source_rows) FILTER (WHERE identity IS NULL), 0)::bigint AS excluded
    FROM resolved_events GROUP BY month, identity
  )`;

export const m1ContributionSelection = `${attendanceSelection}, nominal_contributions AS (
    SELECT citizen, numerator, denominator FROM person_contributions WHERE denominator = 1
      AND month = (SELECT max(month) FROM periods)
  )`;

const query = `WITH ${attendanceSelection}, monthly AS (
    SELECT month, sum(numerator) AS numerator, sum(denominator) AS denominator, sum(excluded) AS excluded
    FROM person_contributions GROUP BY month
  )
  SELECT coverage.cutoff, coverage.history_start AS starts_on, p.month, coalesce(m.numerator, 0)::bigint AS numerator,
    coalesce(m.denominator, 0)::bigint AS denominator, coalesce(m.excluded, 0)::bigint AS excluded
  FROM periods p CROSS JOIN coverage LEFT JOIN monthly m ON m.month=p.month`;

export type EmultiAttendanceResult = {
  status: "READY"; unit: "per_person"; numerator: number; denominator: number; value: number; excludedRecords: number;
} | { status: "NO_DATA" | "MISSING_REQUIRED_CRITERIA"; reason: string };

function attendanceParams(scope: PecTeamScope, months: string[], currentMonth: string) {
  return [months, months.map(month => dateKey(shiftApsCompetence(month, firstMonthOffset))),
    months.map(month => dateKey(shiftApsCompetence(month, 1))), scope.cnes, scope.ine,
    emultiCbos, emultiCbosFromDecember2025, dateKey(shiftApsCompetence(currentMonth, 1))];
}

export async function loadPecEmultiAttendance(scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string) {
  const months = [];
  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) months.push(month);
  const rows = await queryPEC<{ month: string; starts_on: string | null; cutoff: string | null;
    numerator: string; denominator: string; excluded: string }>(query, attendanceParams(scope, months, currentMonth));
  const byMonth = new Map<string, EmultiAttendanceResult>();
  for (const row of rows) {
    const { month, cutoff } = row;
    const denominator = Number(row.denominator);
    const numerator = Number(row.numerator);
    const excludedRecords = Number(row.excluded);
    if (!cutoff || month > cutoff.slice(0, 7)) {
      byMonth.set(month, { status: "NO_DATA", reason: "As fontes de atendimento e participação coletiva não alcançam esta competência." });
    } else if (month === currentMonth || cutoff < competenceEnd(month) || !row.starts_on || row.starts_on > `${shiftApsCompetence(month, firstMonthOffset)}-01`) {
      byMonth.set(month, { status: "MISSING_REQUIRED_CRITERIA", reason: "A cópia não alcança os limites da janela de quatro meses." });
    } else if (!denominator) {
      byMonth.set(month, excludedRecords > 0
        ? { status: "MISSING_REQUIRED_CRITERIA", reason: "Faltam identificação do cidadão ou vínculo local comprovado para os registros do recorte." }
        : { status: "NO_DATA", reason: "Nenhum atendimento ou participação elegível com este CNES e INE na janela." });
    } else {
      byMonth.set(month, { status: "READY", unit: "per_person", numerator, denominator, value: numerator / denominator, excludedRecords });
    }
  }
  return { byMonth, sourceThrough: rows[0]?.cutoff ?? null };
}

export function loadM1Contributions(input: ExtendedContributionInput) {
  return loadExtendedContributions(input, m1ContributionSelection,
    attendanceParams(input, assessmentCompetences(input.month), input.currentMonth), -firstMonthOffset);
}
