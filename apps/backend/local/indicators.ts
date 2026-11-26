import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { APS_INDICATOR_GROUPS, CVAT_NOMINAL_CODES, OPERATIONAL_METRIC_CODES, type IndicatorCode } from "@shared/aps-indicators";
import { currentApsCompetence, firstApsCompetence, lastApsCompetenceAt, shiftApsCompetence } from "@shared/aps-competence";
import { pecTeamScopeSchema, type PecTeamScope } from "@shared/pec-scope";
import { competenceEnd, loadPecQuality, unresolvedDemandReason } from "./analytics/pec-quality-source";
import { dentalCounts, localQualityRate, qualitySources } from "./analytics/quality-rules";
import { NT30_URL, qualityConcept, type ApsConcept } from "./analytics/assessment-rules";
import { loadPecOralCare, oralCareSources } from "./analytics/pec-oral-care";
import { emultiAttendanceSource, loadPecEmultiAttendance } from "./analytics/pec-emulti-attendance";
import { emultiActionSource, loadPecEmultiActions } from "./analytics/pec-emulti-actions";
import { chronicCareSources, loadPecChronicCare } from "./analytics/pec-chronic-care";
import { loadPecTerritorialEvidence, territorialLocalMetric } from "./analytics/pec-territorial";
import { consolidatedCvatMetric, vulnerabilityMetric, type CvatComplements } from "./analytics/cvat-complements";
import { loadPecMaternalCare, maternalCareRules } from "./analytics/pec-maternal-care";
import { loadPecPreventiveCare, preventiveCareSource } from "./analytics/pec-preventive-care";
import { assessmentCompetences } from "./analytics/pec-extended-contributions";
import { requireActiveTeam } from "./pec-directory";
import { queryPEC } from "./pec-db";

export const apsCompetenceSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine(month => month >= firstApsCompetence && month <= currentApsCompetence(), "Competência fora do período consultável.");

export const indicatorRequestSchema = pecTeamScopeSchema.extend({
  month: apsCompetenceSchema,
  codes: z.array(z.enum(OPERATIONAL_METRIC_CODES)).min(1).max(OPERATIONAL_METRIC_CODES.length).optional(),
});

// Include this revision in cache identity when the ported rules change.
export const localRuleVersion = "pec-5.6.1-brasil360-registro21-v3";

type LocalRuleReference = { document: string; url: string };
const localRules: Partial<Record<IndicatorCode, LocalRuleReference>> = {
  ...qualitySources, ...oralCareSources, ...chronicCareSources, ...maternalCareRules,
  C7: preventiveCareSource, M1: emultiAttendanceSource, M2: emultiActionSource,
  ...Object.fromEntries(APS_INDICATOR_GROUPS.territorial.codes.map(code => [code, { document: "0049700833", url: NT30_URL }])),
};

type Evidence = { label: string; value: number };
type ValueUnit = "percent" | "per_person" | "factor" | "score";
const metricUnit = (code: IndicatorCode): ValueUnit => code === "M1" ? "per_person"
  : code === "CVAT5" ? "factor" : code === "CVAT6" ? "score" : "percent";
type Result = { referenceMonth: string } & (
  { status: "READY"; numerator: number; denominator: number; value: number; unit: ValueUnit;
    concept: ApsConcept | null; excludedRecords: number; evidence?: Evidence[]; limitation?: string;
    source?: "PEC_LOCAL" | "COMPLEMENTO" } |
  { status: "MISSING_REQUIRED_CRITERIA" | "BLOCKED_BY_DATA_CONTRACT" | "NO_DATA" | "API_UNAVAILABLE";
    reason: string; evidence?: Evidence[] }
);

async function readSupplement<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "SERVICE_UNAVAILABLE" || error.code === "TOO_MANY_REQUESTS")) return null;
    throw error;
  }
}

async function readChronicCare(scope: PecTeamScope, firstMonth: string, month: string, currentMonth: string) {
  const history = await readSupplement(() => loadPecChronicCare(scope, firstMonth, month, currentMonth));
  if (history || firstMonth === month) return history;
  return readSupplement(() => loadPecChronicCare(scope, month, month, currentMonth));
}

export async function lastPecMonth() {
    const current = currentApsCompetence();
    const nextKey = Number(shiftApsCompetence(current, 1).replace("-", "")) * 100 + 1;
    const rows = await queryPEC<{ cutoff: string }>(`
      SELECT to_char(t.dt_registro, 'YYYY-MM-DD') AS cutoff
      FROM tb_dim_tempo t WHERE t.co_seq_dim_tempo = least(
        (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo < $1),
        (SELECT max(co_dim_tempo) FROM tb_fat_atend_odonto_proced WHERE co_dim_tempo < $1),
        (SELECT max(co_dim_tempo) FROM tb_fat_atividade_coletiva WHERE co_dim_tempo < $1))
        AND t.co_seq_dim_tempo::text = to_char(t.dt_registro,'YYYYMMDD')`, [nextKey]);
    const suggested = rows[0]?.cutoff && lastApsCompetenceAt(rows[0].cutoff);
    if (!suggested || suggested < firstApsCompetence) return null;
    return suggested < current ? suggested : shiftApsCompetence(current, -1);
}

export async function loadIndicators(input: z.infer<typeof indicatorRequestSchema>, complements: CvatComplements) {
    const { cnes, ine, month } = input;
    const { typeCode } = await requireActiveTeam(input);
    const primary = typeCode === "70" || typeCode === "76";
    const dental = typeCode === "71";
    const applicable: readonly IndicatorCode[] = primary
      ? [...APS_INDICATOR_GROUPS.primary.codes, ...APS_INDICATOR_GROUPS.territorial.codes]
      : dental ? APS_INDICATOR_GROUPS.dental.codes : typeCode === "72" ? APS_INDICATOR_GROUPS.multi.codes : [];
    const requested = input.codes ? new Set(input.codes) : undefined;
    const codes = requested ? applicable.filter(code => requested.has(code)) : applicable;
    const needs = (...group: IndicatorCode[]) => group.some(code => codes.includes(code));
    const months = assessmentCompetences(month);
    const currentMonth = currentApsCompetence();
    const args = [input, months[0], month, currentMonth] as const;
    // Cada lote abre no máximo três consultas simultâneas na fonte.
    const [source, oral, chronic, emulti] = await Promise.all([
      needs("C1", "B3", "B5", "B6")
        ? readSupplement(() => loadPecQuality(...args, primary ? "primary" : "dental")) : null,
      needs("B1", "B2", "B4") ? readSupplement(() => loadPecOralCare(...args)) : null,
      needs("C4", "C5", "C6") ? readChronicCare(...args) : null,
      needs("M1") ? readSupplement(() => loadPecEmultiAttendance(...args)) : null,
    ]);
    const [actions, territorial, maternal, preventive] = await Promise.all([
      needs("M2") ? readSupplement(() => loadPecEmultiActions(...args)) : null,
      needs(...CVAT_NOMINAL_CODES) ? readSupplement(() => loadPecTerritorialEvidence(input, months, needs("CVAT4"))) : null,
      needs("C2", "C3") ? readSupplement(() => loadPecMaternalCare(...args)) : null,
      needs("C7") ? readSupplement(() => loadPecPreventiveCare(...args)) : null,
    ]);
    const cutoff = source?.sourceThrough ?? oral?.sourceThrough ?? emulti?.sourceThrough ?? actions?.sourceThrough ??
      chronic?.sourceThrough ?? maternal?.sourceThrough ?? preventive?.sourceThrough ?? territorial?.sourceThrough ?? null;
    const calculatedAt = new Date().toISOString();

    const indicators = codes.map(code => ({
      code,
      unit: metricUnit(code),
      rule: localRules[code] ?? null,
      history: months.map((referenceMonth): Result => {
        const period = { referenceMonth };
        const unavailable: Result = { ...period, status: "API_UNAVAILABLE", reason: "A consulta dessa fonte do PEC está indisponível." };
        if (code === "B1" || code === "B2" || code === "B4") {
          const result = oral?.byMonth.get(referenceMonth)?.[code];
          if (!result) return unavailable;
          if (result.status === "READY") return { ...period, ...result, concept: qualityConcept(code, result.value) };
          const evidence = result.numerator === undefined ? [] : [{ label: "Produção local identificada no numerador", value: result.numerator }];
          return { ...period, status: result.status, reason: result.reason, evidence };
        }
        if (code === "M1" || code === "M2") {
          const result = code === "M1" ? emulti?.byMonth.get(referenceMonth) : actions?.byMonth.get(referenceMonth);
          if (!result) return unavailable;
          if (result.status === "READY") return { ...period, ...result, concept: qualityConcept(code, result.value) };
          return { ...period, status: result.status, reason: result.reason };
        }
        if (code === "C2" || code === "C3") {
          const result = maternal?.byMonth.get(referenceMonth)?.[code];
          if (!result) return unavailable;
          const evidence: Evidence[] = [];
          if (result.evidence) {
            evidence.push({ label: "Em acompanhamento no PEC", value: result.evidence.observedOngoing },
              { label: code === "C2" ? "Completaram 2 anos no mês" : "Atingiram o 42º dia de puerpério no mês", value: result.evidence.observedCompleted });
            if (result.evidence.observedPostpartum !== undefined) evidence.push({ label: "Puerpério em curso", value: result.evidence.observedPostpartum });
            if (result.evidence.missingRecordedOutcome !== undefined) evidence.push({ label: "Episódios sem desfecho registrado", value: result.evidence.missingRecordedOutcome });
            if (result.evidence.closedCohort) {
              evidence.push({ label: "Pontuação da coorte de fechamento (%)", value: result.evidence.closedCohort.scorePercent });
            }
          }
          for (const criterion of result.criteria) {
            if (criterion.observedOngoing !== null) evidence.push({ label: `${criterion.label} · em acompanhamento`, value: criterion.observedOngoing });
            if (criterion.observedCompleted !== null) evidence.push({ label: `${criterion.label} · com desfecho`, value: criterion.observedCompleted });
          }
          return result.status === "READY"
            ? { ...period, ...result, concept: qualityConcept(code, result.value), evidence }
            : { ...period, status: result.status, reason: result.reason, evidence };
        }
        if (code === "C4" || code === "C5" || code === "C6") {
          const result = chronic?.byMonth.get(referenceMonth)?.[code];
          if (!result) return unavailable;
          const evidence: Evidence[] = result.criteria.flatMap(criterion => criterion.observedPeople === null
            ? [] : [{ label: criterion.label, value: criterion.observedPeople }]);
          const people = result.evidence?.observedEligiblePeople;
          if (people != null) evidence.unshift({ label: "Pessoas identificadas no recorte do PEC", value: people });
          return result.status === "READY"
            ? { ...period, ...result, concept: qualityConcept(code, result.value), evidence }
            : { ...period, status: result.status, reason: result.reason, evidence };
        }
        if (code === "C7") {
          const result = preventive?.byMonth.get(referenceMonth);
          if (!result) return unavailable;
          return result.status === "READY"
            ? { ...period, ...result, concept: qualityConcept(code, result.value) }
            : { ...period, status: result.status, reason: result.reason, evidence: result.evidence };
        }
        if (code === "CVAT1" || code === "CVAT2" || code === "CVAT3" || code === "CVAT4") {
          const row = territorial?.byMonth.get(referenceMonth);
          return row ? { ...period, ...territorialLocalMetric(row, code, currentMonth) } : unavailable;
        }
        if (code === "CVAT5" || code === "CVAT6") {
          if (referenceMonth >= currentMonth) {
            return { ...period, status: "MISSING_REQUIRED_CRITERIA", reason: "A competência ainda está aberta." };
          }
          return { ...period, ...(code === "CVAT5"
            ? vulnerabilityMetric(complements, input, referenceMonth)
            : consolidatedCvatMetric(complements, input, referenceMonth)) };
        }
        if (!source) {
          return unavailable;
        }
        if (!cutoff || referenceMonth > cutoff.slice(0, 7)) {
          return { ...period, status: "NO_DATA" as const, reason: "A cópia PEC não tem registros que alcancem esta competência." };
        }
        if (referenceMonth === currentMonth || cutoff < competenceEnd(referenceMonth)) {
          return { ...period, status: "MISSING_REQUIRED_CRITERIA" as const, reason: "A competência ainda está aberta ou o corte da cópia precede seu encerramento." };
        }
        const observations = source.byMonth.get(referenceMonth);
        if (code === "C1" && observations?.demandUnresolved) {
          return { ...period, status: "BLOCKED_BY_DATA_CONTRACT", reason: unresolvedDemandReason };
        }
        const counts = code === "C1" ? observations?.counts : dentalCounts(code, observations?.procedures ?? []);
        const rate = counts && localQualityRate(code, counts.numerator, counts.denominator);
        if (!rate) {
          return observations?.excluded
            ? { ...period, status: "MISSING_REQUIRED_CRITERIA" as const, reason: "Sem denominador elegível. Existem registros com identificação ou conteúdo incompleto." }
            : { ...period, status: "NO_DATA" as const, reason: "Sem denominador elegível no recorte de equipe, unidade e competência." };
        }
        return { ...period, ...rate, status: "READY" as const, excludedRecords: observations?.excluded ?? 0 };
      }),
    }));

    return {
      scope: { cnes, ine, referenceMonth: month }, typeCode, calculatedAt, sourceThrough: cutoff,
      sourceScope: "PEC_LOCAL" as const, ruleVersion: localRuleVersion,
      reconciliationStatus: "NOT_RECONCILED" as const, indicators,
    };
}

export type LocalPanelData = Awaited<ReturnType<typeof loadIndicators>>;
