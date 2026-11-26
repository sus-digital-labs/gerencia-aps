import { shiftApsCompetence } from "@shared/aps-competence";
import { TRPCError } from "@trpc/server";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { competenceEnd } from "./pec-quality-source";
import { b2ContributionSelection, dentalConsultationsSql, supervisedBrushingSql } from "./pec-oral-care-sql";
import { assessmentCompetences, loadExtendedContributions, type ExtendedContributionInput } from "./pec-extended-contributions";
import { loadDentalReferencePopulation, type DentalReferenceRow } from "./pec-oral-care-population";

const notes = "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-saude-bucal";

// Processo SEI 25000.053348/2026-78. Apuração local conforme as fichas publicadas em 02/10/2026.
export const oralCareSources = {
  B1: { document: "0054640774", url: `${notes}/nota-metodologica-b1-primeira-consulta-programada/@@download/file` },
  B2: { document: "0054640775", url: `${notes}/nota-metodologica-b2-tratamento-concluido/@@download/file` },
  B4: { document: "0054640778", url: `${notes}/nota-metodologica-b4-escovacao-supervisionada-em-faixa-etaria-escolar-de-6-a-12-anos/@@download/file` },
} as const;

export type OralCareCode = keyof typeof oralCareSources;

type UnavailableResult = {
  status: "API_UNAVAILABLE" | "BLOCKED_BY_DATA_CONTRACT" | "MISSING_REQUIRED_CRITERIA" | "NO_DATA";
  reason: string;
  numerator?: number;
  denominator?: number;
  excludedRecords?: number;
};

export type OralCareResult = UnavailableResult | {
  status: "READY";
  unit: "percent";
  numerator: number;
  denominator: number;
  value: number;
  excludedRecords: number;
  limitation?: string;
};

type ConsultationRow = {
  competence: number | null;
  cutoff: string | null;
  history_start: string | null;
  first_count: string;
  completion_count: string;
  first_excluded: string;
  b2_excluded: string;
};

type BrushingRow = {
  competence: number | null;
  cutoff: string | null;
  history_start: string | null;
  participant_count: string;
  excluded: string;
};

const dentists = ["223208", "223293", "223272"];
const brushingCbos = [...dentists, "322405", "322425", "322415", "322430"];
const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;
const dentalHistoryMonths = 12;

function scopeParams(scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string) {
  return [scope.cnes, scope.ine, dateKey(firstMonth), dateKey(shiftApsCompetence(lastMonth, 1)),
    dateKey(shiftApsCompetence(currentMonth, 1))];
}

function consultationParams(params: (string | number)[], firstMonth: string) {
  return [...params, dentists, dateKey(shiftApsCompetence(firstMonth, -dentalHistoryMonths))];
}

function checkCompetence(month: string, current: string, cutoff: string | null): UnavailableResult | null {
  if (!cutoff || month > cutoff.slice(0, 7)) {
    return { status: "NO_DATA", reason: "A fonte local de saúde bucal não tem registros que alcancem esta competência." };
  }
  if (month === current || cutoff < competenceEnd(month)) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "A competência está aberta ou o corte local precede seu encerramento." };
  }
  return null;
}

async function readProduction<Row extends Record<string, unknown>>(sql: string, params: unknown[]) {
  try {
    return await queryPEC<Row>(sql, params);
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "SERVICE_UNAVAILABLE" || error.code === "TOO_MANY_REQUESTS")) return null;
    throw error;
  }
}

export function evaluatePecOralCoverage(
  month: string, code: "B1" | "B4", count: number, excluded: number, reference: DentalReferenceRow | undefined,
): OralCareResult {
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(excluded) || excluded < 0) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Contagens da produção odontológica inválidas." };
  }
  const summary = { ...(count > 0 || excluded === 0 ? { numerator: count } : {}), excludedRecords: excluded };
  const blocked = (reason: string): OralCareResult => ({ status: "BLOCKED_BY_DATA_CONTRACT", reason, ...summary });

  if (!reference) return blocked("A população de referência não pôde ser consultada no histórico do PEC.");
  if (Number(reference.links) === 0) {
    return blocked("A eSB não tem vínculo de referência registrado no SCNES importado pelo PEC nesta competência.");
  }
  if (!reference.verified) {
    return blocked("O histórico local não comprova a importação SCNES e os dados válidos das equipes de referência.");
  }
  if (!reference.unshared) {
    return blocked("O arranjo das equipes requer carga horária e repartição da população confirmadas no SCNES.");
  }
  if (!reference.cutoff || reference.cutoff < competenceEnd(month)) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O corte local do cadastro individual precede o encerramento da competência.", ...summary };
  }
  const eligible = Number(reference.people);
  const denominator = code === "B1" ? eligible : Number(reference.children);
  if (!Number.isSafeInteger(eligible) || !Number.isSafeInteger(denominator) ||
      eligible < 0 || denominator < 0 || denominator > eligible) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Contagens da população odontológica de referência inválidas.", ...summary };
  }
  if (eligible === 0 && Number(reference.registered) > 0) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O PEC tem vínculos cadastrais, mas não foi possível comprovar a população de referência válida.", ...summary };
  }
  if (denominator === 0) {
    return { status: "NO_DATA", reason: code === "B4"
      ? "Sem crianças de 6 a 12 anos na população local de referência." : "Sem população local de referência elegível.", denominator, ...summary };
  }
  if (count === 0 && excluded > 0) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: code === "B4"
      ? "A produção de escovação registrada tem campos ou identificações pendentes de validação."
      : "As primeiras consultas registradas têm procedimento, ficha ou identificação pendente de validação.", denominator, ...summary };
  }
  return {
    status: "READY", unit: "percent", numerator: count, denominator, value: (100 * count) / denominator,
    excludedRecords: excluded,
    limitation: "Apuração no CNES e INE selecionados, com vínculo eSB–eSF/eAP do SCNES importado e MICI verificado no PEC em 24 meses. A conciliação da população, da homologação e da produção das unidades móveis com o SIAPS está pendente.",
  };
}

function evaluateConsultations(
  row: ConsultationRow | undefined, month: string, population: DentalReferenceRow | undefined,
): Record<"B1" | "B2", OralCareResult> {
  const first = Number(row?.first_count ?? 0);
  const completion = Number(row?.completion_count ?? 0);
  const firstExcluded = Number(row?.first_excluded ?? 0);
  const b2Excluded = Number(row?.b2_excluded ?? 0);
  const B1 = evaluatePecOralCoverage(month, "B1", first, firstExcluded, population);
  // As conclusões podem se originar em meses anteriores. O valor bruto pode superar 100%.
  const B2: OralCareResult = first > 0
    ? { status: "READY", unit: "percent", numerator: completion, denominator: first,
        value: (100 * completion) / first, excludedRecords: b2Excluded }
    : {
        status: b2Excluded > 0 ? "MISSING_REQUIRED_CRITERIA" : "NO_DATA",
        reason: b2Excluded > 0
          ? "Sem primeira consulta elegível. Há registros com identificação, ficha ou procedimento incompleto."
          : "Sem primeira consulta elegível no CNES e INE nesta competência.",
        ...(completion > 0 || b2Excluded === 0 ? { numerator: completion } : {}),
        ...(b2Excluded === 0 ? { denominator: 0 } : {}),
        excludedRecords: b2Excluded,
      };
  return { B1, B2 };
}

function evaluateBrushing(row: BrushingRow | undefined, month: string, population: DentalReferenceRow | undefined): OralCareResult {
  const count = Number(row?.participant_count ?? 0);
  const excluded = Number(row?.excluded ?? 0);
  return evaluatePecOralCoverage(month, "B4", count, excluded, population);
}

export async function loadPecOralCare(
  scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string,
) {
  const params = scopeParams(scope, firstMonth, lastMonth, currentMonth);
  const [consultations, brushing, referencePopulation] = await Promise.all([
    readProduction<ConsultationRow>(dentalConsultationsSql, consultationParams(params, firstMonth)),
    readProduction<BrushingRow>(supervisedBrushingSql, [...params, brushingCbos]),
    loadDentalReferencePopulation(scope, firstMonth, lastMonth, currentMonth),
  ]);
  const consultationCutoff = consultations?.[0]?.cutoff ?? null;
  const brushingCutoff = brushing?.[0]?.cutoff ?? null;
  const historyStart = consultations?.[0]?.history_start ?? null;
  const brushingStart = brushing?.[0]?.history_start ?? null;
  const consultationByMonth = new Map(consultations?.map(row => [row.competence, row]));
  const brushingByMonth = new Map(brushing?.map(row => [row.competence, row]));
  const byMonth = new Map<string, Record<OralCareCode, OralCareResult>>();
  const unavailableProduction: UnavailableResult = { status: "API_UNAVAILABLE", reason: "A produção odontológica local está indisponível." };
  const unavailablePopulation: UnavailableResult = { status: "API_UNAVAILABLE", reason: "O histórico da população de referência está indisponível." };

  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) {
    const population = referencePopulation?.get(month);
    const competence = Math.floor(dateKey(month) / 100);
    const missingConsultation = (consultations === null ? unavailableProduction : checkCompetence(month, currentMonth, consultationCutoff))
      ?? (!historyStart || historyStart > `${shiftApsCompetence(month, -dentalHistoryMonths)}-01`
        ? { status: "MISSING_REQUIRED_CRITERIA" as const, reason: "A fonte local não alcança o início dos 12 meses de histórico odontológico." }
        : null);
    const counts = missingConsultation ? { B1: missingConsultation, B2: missingConsultation }
      : evaluateConsultations(consultationByMonth.get(competence), month, population);
    const B4 = (brushing === null ? unavailableProduction : checkCompetence(month, currentMonth, brushingCutoff))
      ?? (!brushingStart || brushingStart > `${month}-01`
        ? { status: "MISSING_REQUIRED_CRITERIA" as const, reason: "O histórico local de atividades coletivas começa após a abertura da competência." }
        : evaluateBrushing(brushingByMonth.get(competence), month, population));
    byMonth.set(month, referencePopulation === null
      ? { ...counts, B1: missingConsultation ?? unavailablePopulation, B4: brushing === null ? unavailableProduction : unavailablePopulation }
      : { ...counts, B4 });
  }

  const populationCutoff = referencePopulation?.get(lastMonth)?.cutoff ?? null;
  const earliest = (...dates: (string | null)[]) => dates.filter((date): date is string => date !== null).sort()[0] ?? null;
  return {
    sourceThrough: earliest(consultationCutoff, brushingCutoff, populationCutoff),
    sourceThroughByCode: {
      B1: earliest(consultationCutoff, populationCutoff),
      B2: consultationCutoff,
      B4: earliest(brushingCutoff, populationCutoff),
    },
    byMonth,
  };
}

export function loadB2Contributions(input: ExtendedContributionInput) {
  const { month, currentMonth } = input;
  const [firstMonth] = assessmentCompetences(month);
  return loadExtendedContributions(input, b2ContributionSelection,
    consultationParams(scopeParams(input, firstMonth, month, currentMonth), firstMonth), dentalHistoryMonths);
}
