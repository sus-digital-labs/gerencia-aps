import { z } from "zod";
import { currentApsCompetence, firstApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import { pecTeamScopeSchema } from "@shared/pec-scope";
import { AggregateCache } from "./cache";
import { queryPEC } from "./pec-db";
import { listPecTeams, requireActiveTeam } from "./pec-directory";

export const acsCbos = ["515105", "322255"] as const;
const acsCboSql = "('515105', '322255')";
const todayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia" });
export const acsToday = () => todayFormat.format(new Date());
export const acsDateKey = (day: string) => Number(day.replaceAll("-", ""));
export const acsPageSize = 30;
const page = z.string().regex(/^[1-9]\d{0,2}$/).transform(Number).default(1);
const area = z.string().regex(/^(?:\d{2}|FA|unknown)$/).optional();
const cbo = z.enum(acsCbos).optional();
const outcome = z.enum(["1", "2", "3", "unknown"]).optional();
const professional = z.string().regex(/^[1-9]\d{0,12}$/).optional();

export const acsScopeSchema = pecTeamScopeSchema.extend({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .refine(month => month >= firstApsCompetence && month <= currentApsCompetence()),
});
export const acsRankingSchema = acsScopeSchema.extend({ area, cbo });
export const acsTimelineSchema = acsRankingSchema.extend({
  page, professional, outcome,
  day: z.iso.date().optional(),
}).refine(input => !input.day || input.day.startsWith(`${input.month}-`) && input.day <= acsToday());
export const acsTasksSchema = acsScopeSchema.extend({
  area, page, status: z.enum(["all", "open", "completed"]).default("open"),
});

type AcsScope = z.infer<typeof acsScopeSchema>;
type AcsRanking = z.infer<typeof acsRankingSchema>;
type AcsTimeline = z.infer<typeof acsTimelineSchema>;

type ObservedRange = { firstObserved: string | null; latestObserved: string | null };
const observedCache = new AggregateCache<ObservedRange>(60_000, 1);
const teamsCache = new AggregateCache<Awaited<ReturnType<typeof listPecTeams>>>(60_000, 1);
const dateSql = (key: string) => `to_char(to_date(${key}::text, 'YYYYMMDD'), 'YYYY-MM-DD')`;

async function observedVisitRange(today: string) {
  return (await observedCache.read(today, async () => {
    const [row] = await queryPEC<ObservedRange>(`
      SELECT ${dateSql("min(v.co_dim_tempo)")} AS "firstObserved",
             ${dateSql("max(v.co_dim_tempo)")} AS "latestObserved"
      FROM tb_fat_visita_domiciliar v
      JOIN tb_dim_cbo c ON c.co_seq_dim_cbo=v.co_dim_cbo AND c.nu_cbo IN ${acsCboSql}
      WHERE v.co_dim_tempo BETWEEN $1 AND $2
    `, [acsDateKey(`${firstApsCompetence}-01`), acsDateKey(today)]);
    return row;
  })).value;
}

export async function loadAcsDirectory() {
  const today = acsToday();
  const [{ firstObserved, latestObserved }, { value: teams }] = await Promise.all([
    observedVisitRange(today), teamsCache.read(today, listPecTeams),
  ]);
  return {
    teams, firstObserved, latestObserved, minMonth: firstApsCompetence, maxMonth: today.slice(0, 7),
    defaultMonth: latestObserved?.slice(0, 7) ?? shiftApsCompetence(today.slice(0, 7), -1), today,
  };
}

export async function acsPeriod(scope: AcsScope) {
  const today = acsToday();
  const periodStart = `${scope.month}-01`;
  const nextMonth = shiftApsCompetence(scope.month, 1);
  const periodEnd = new Date(Date.parse(`${nextMonth}-01T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const [observed] = await Promise.all([observedVisitRange(today), requireActiveTeam(scope)]);
  const { firstObserved, latestObserved } = observed;
  const coverage = !firstObserved || !latestObserved || periodStart > latestObserved || periodEnd < firstObserved
    ? "outside" : periodStart < firstObserved || periodEnd > latestObserved ? "partial" : "within";
  return {
    ...observed, source: "PEC_LOCAL" as const, coverage, periodStart, periodEnd,
    asOf: periodEnd < today ? periodEnd : today,
  };
}

type AcsPeriod = Awaited<ReturnType<typeof acsPeriod>>;
export const acsPeriodValues = (scope: AcsScope, period: AcsPeriod) => [
  scope.cnes, scope.ine, acsDateKey(period.periodStart), acsDateKey(period.asOf),
] as const;

export const acsMicroareaSql = (value: string) =>
  `CASE WHEN upper(btrim(${value})) ~ '^([0-9]{2}|FA)$' THEN upper(btrim(${value})) ELSE 'unknown' END`;

// A ficha pode conter várias visitas. A chave do fato é a unidade de contagem.
function visitSql(detail = "") {
  return `visits AS (
    SELECT v.co_seq_fat_visita_domiciliar AS id, v.co_dim_tempo AS day,
      ${professionalKey("p")} AS actor,
      CASE WHEN p.st_registro_valido=1 THEN nullif(btrim(p.no_profissional), '') END AS name,
      p.co_seq_dim_profissional AS dimension, c.nu_cbo AS cbo,
      ${acsMicroareaSql("v.nu_micro_area")} AS area,
      CASE WHEN d.nu_identificador IN ('1','2','3') THEN d.nu_identificador ELSE 'unknown' END AS outcome
      ${detail}
    FROM tb_fat_visita_domiciliar v
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=v.co_dim_unidade_saude AND u.nu_cnes=$1
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=v.co_dim_equipe AND e.nu_ine=$2
    JOIN tb_dim_cbo c ON c.co_seq_dim_cbo=v.co_dim_cbo AND c.nu_cbo IN ${acsCboSql}
    LEFT JOIN tb_dim_profissional p ON p.co_seq_dim_profissional=v.co_dim_profissional
    LEFT JOIN tb_dim_desfecho_visita d ON d.co_seq_dim_desfecho_visita=v.co_dim_desfecho_visita
    WHERE v.co_dim_tempo BETWEEN $3 AND $4
  )`;
}

function professionalKey(alias: string) {
  const cns = `btrim(${alias}.nu_cns)`;
  return `CASE WHEN ${alias}.st_registro_valido=1 AND ${cns} ~ '^[0-9]{15}$'
                    AND ${cns} !~ '^([0-9])\\1{14}$' THEN ${cns}
               WHEN ${alias}.st_registro_valido=1 AND nullif(btrim(${alias}.no_profissional), '') IS NOT NULL
                 THEN 'dim:'||${alias}.co_seq_dim_profissional::text END`;
}

export type AcsVisitTotals = { recorded: number; completed: number; refused: number; absent: number; unknown: number };
const totalsSql = `
  count(*)::integer AS recorded,
  count(*) FILTER (WHERE outcome='1')::integer AS completed,
  count(*) FILTER (WHERE outcome='2')::integer AS refused,
  count(*) FILTER (WHERE outcome='3')::integer AS absent,
  count(*) FILTER (WHERE outcome='unknown')::integer AS unknown`;

type AcsProfessional = AcsVisitTotals & {
  id: string | null; name: string | null; cbos: string[]; assigned: boolean;
};
type AcsArea = AcsVisitTotals & { area: string };
type AcsOverviewRow = {
  totals: AcsVisitTotals;
  areas: AcsArea[];
  professionals: AcsProfessional[];
  assignmentCount: number;
  unnamedVisits: number;
};

export async function loadAcsOverview(input: AcsScope) {
  const period = await acsPeriod(input);
  const [row] = await queryPEC<AcsOverviewRow>(`
    WITH ${visitSql()},
    totals AS (SELECT ${totalsSql} FROM visits),
    areas AS (SELECT area, ${totalsSql} FROM visits GROUP BY area),
    assignments AS (
      SELECT DISTINCT l.co_unico_lotacao
      FROM ta_lotacao l
      JOIN tb_equipe e ON e.co_seq_equipe=l.co_equipe AND e.nu_ine=$2
      JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=l.co_unidade_saude AND u.nu_cnes=$1
      WHERE l.co_unico_lotacao IS NOT NULL
    ), latest AS (
      SELECT DISTINCT ON (l.co_unico_lotacao) l.co_prof, l.co_cbo, l.co_equipe, l.co_unidade_saude,
        l.co_tipo_auditoria, l.dt_desativacao_lotacao
      FROM ta_lotacao l JOIN assignments a USING (co_unico_lotacao)
      WHERE l.dt_auditoria < $5::date + 1
      ORDER BY l.co_unico_lotacao, l.dt_auditoria DESC, l.co_seq_talotacao DESC
    ), roster AS (
      SELECT DISTINCT
        CASE WHEN btrim(p.nu_cns) ~ '^[0-9]{15}$' AND btrim(p.nu_cns) !~ '^([0-9])\\1{14}$'
          THEN btrim(p.nu_cns) ELSE 'prof:'||p.co_seq_prof::text END AS actor,
        coalesce(nullif(btrim(p.no_social_profissional), ''), nullif(btrim(p.no_civil_profissional), '')) AS name,
        replace(btrim(c.co_cbo_2002), '-', '') AS cbo
      FROM latest l
      JOIN tb_equipe e ON e.co_seq_equipe=l.co_equipe AND e.nu_ine=$2
      JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=l.co_unidade_saude AND u.nu_cnes=$1
      JOIN tb_cbo c ON c.co_cbo=l.co_cbo AND replace(btrim(c.co_cbo_2002), '-', '') IN ${acsCboSql}
      JOIN tb_prof p ON p.co_seq_prof=l.co_prof
      WHERE l.co_tipo_auditoria IN ('I','U') AND (l.dt_desativacao_lotacao IS NULL OR l.dt_desativacao_lotacao::date > $5::date)
    ), performed AS (
      SELECT actor, min(dimension)::text AS id, min(name) AS name, ${totalsSql}
      FROM visits WHERE actor IS NOT NULL GROUP BY actor
    ), aliases AS (
      SELECT actor, array_agg(DISTINCT cbo ORDER BY cbo) AS cbos
      FROM (SELECT actor, cbo FROM roster UNION ALL SELECT actor, cbo FROM visits WHERE actor IS NOT NULL) sources
      GROUP BY actor
    ), roster_names AS (
      SELECT actor, min(name) AS name FROM roster GROUP BY actor
    ), professionals AS (
      SELECT p.id, coalesce(r.name,p.name) AS name, a.cbos, r.actor IS NOT NULL AS assigned,
        coalesce(p.recorded,0) AS recorded, coalesce(p.completed,0) AS completed,
        coalesce(p.refused,0) AS refused, coalesce(p.absent,0) AS absent, coalesce(p.unknown,0) AS unknown
      FROM aliases a LEFT JOIN performed p USING (actor) LEFT JOIN roster_names r USING (actor)
    )
    SELECT (SELECT row_to_json(t) FROM totals t) AS totals,
      coalesce((SELECT json_agg(a ORDER BY a.area) FROM areas a), '[]'::json) AS areas,
      coalesce((SELECT json_agg(p ORDER BY p.name NULLS LAST,p.id) FROM professionals p), '[]'::json) AS professionals,
      (SELECT count(DISTINCT actor)::integer FROM roster) AS "assignmentCount",
      (SELECT count(*)::integer FROM visits WHERE actor IS NULL) AS "unnamedVisits"
  `, [...acsPeriodValues(input, period), period.asOf]);
  return { ...row, period };
}

const filteredVisits = `filtered AS (
  SELECT * FROM visits WHERE ($5::text IS NULL OR area=$5) AND ($6::text IS NULL OR cbo=$6)
)`;
const filterValues = (input: AcsRanking, period: AcsPeriod) =>
  [...acsPeriodValues(input, period), input.area ?? null, input.cbo ?? null];

type RankingRow = AcsVisitTotals & {
  rank: number; name: string | null; id: string; cbos: string[]; areaCount: number;
};
export async function loadAcsRanking(input: AcsRanking) {
  const period = await acsPeriod(input);
  const [result] = await queryPEC<{ rows: RankingRow[]; unattributedVisits: number }>(`
    WITH ${visitSql()}, ${filteredVisits}, performed AS (
      SELECT min(dimension)::text AS id, min(name) AS name, array_agg(DISTINCT cbo ORDER BY cbo) AS cbos,
        count(DISTINCT area) FILTER (WHERE area NOT IN ('FA','unknown'))::integer AS "areaCount", ${totalsSql}
      FROM filtered WHERE actor IS NOT NULL GROUP BY actor
    ), ranked AS (
      SELECT rank() OVER (ORDER BY completed DESC)::integer AS rank, performed.* FROM performed
    )
    SELECT coalesce((SELECT json_agg(r ORDER BY r.rank, r.name NULLS LAST, r.id) FROM ranked r), '[]'::json) AS rows,
      (SELECT count(*)::integer FROM filtered WHERE actor IS NULL) AS "unattributedVisits"
  `, filterValues(input, period));
  return { ...result, period };
}

type TimelineRow = {
  day: string; name: string | null; citizen: string | null;
  cbo: string; outcome: string; area: string; reasons: string[];
};
export async function loadAcsTimeline(input: AcsTimeline) {
  const period = await acsPeriod(input);
  const rows = await queryPEC<TimelineRow>(`
    WITH ${visitSql(`
      , v.co_fat_cidadao_pec AS citizen_key,
      array_remove(ARRAY[
        CASE WHEN v.st_mot_vis_cad_att=1 THEN 'Cadastro ou atualização' END,
        CASE WHEN v.st_mot_vis_visita_periodica=1 THEN 'Visita periódica' END,
        CASE WHEN v.st_mot_vis_busca_ativa=1 THEN 'Busca ativa' END,
        CASE WHEN v.st_mot_vis_acompanhamento=1 THEN 'Acompanhamento' END,
        CASE WHEN v.st_mot_vis_egresso_internacao=1 THEN 'Egresso de internação' END,
        CASE WHEN v.st_mot_vis_ctrl_ambnte_vetor=1 THEN 'Controle ambiental ou vetorial' END,
        CASE WHEN v.st_mot_vis_convte_atvidd_cltva=1 THEN 'Convite para atividade coletiva' END,
        CASE WHEN v.st_mot_vis_orintacao_prevncao=1 THEN 'Orientação ou prevenção' END,
        CASE WHEN v.st_mot_vis_outros=1 THEN 'Outros' END
      ], NULL) AS reasons
    `)}, ${filteredVisits}, batch AS (
      SELECT * FROM filtered
      WHERE ($7::bigint IS NULL OR actor=(
        SELECT ${professionalKey("p")} FROM tb_dim_profissional p WHERE p.co_seq_dim_profissional=$7))
        AND ($8::bigint IS NULL OR day=$8)
        AND ($9::text IS NULL OR outcome=$9)
      ORDER BY day DESC, id DESC
      LIMIT $10 OFFSET $11
    )
    SELECT ${dateSql("b.day")} AS day, b.name, b.cbo, b.outcome, b.area, b.reasons,
      coalesce(nullif(btrim(c.no_social),''), nullif(btrim(c.no_cidadao),'')) AS citizen
    FROM batch b LEFT JOIN tb_fat_cidadao_pec p ON p.co_seq_fat_cidadao_pec=b.citizen_key
    LEFT JOIN tb_cidadao c ON c.co_seq_cidadao=p.co_cidadao AND c.st_ativo_para_exibicao=1
    ORDER BY b.day DESC, b.id DESC
  `, [...filterValues(input, period), input.professional ?? null, input.day ? acsDateKey(input.day) : null,
    input.outcome ?? null, acsPageSize + 1, (input.page - 1) * acsPageSize]);
  return { rows: rows.slice(0, acsPageSize), page: input.page, hasNextPage: input.page < 999 && rows.length > acsPageSize, period };
}
