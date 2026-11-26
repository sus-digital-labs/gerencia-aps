import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { competenceEnd } from "./pec-quality-source";
import { chronicCareQuery } from "./pec-chronic-evidence";
import { chronicSigtapCodes } from "./pec-chronic-facts";
import { SIGTAP_FIRST_COMPETENCE, SIGTAP_LAST_COMPETENCE, sigtapCompatibilityParameter } from "./pec-preventive-sigtap";
import { chronicCareCriteria, chronicCareFirstSupportedMonth, chronicCareScore, type ChronicCareCode, type ChronicPractice,
  type ChronicPracticeEvidence } from "./pec-chronic-rules";

export { chronicCareCodes, chronicCareSources, type ChronicCareCode } from "./pec-chronic-rules";

const sigtapCompatibility = sigtapCompatibilityParameter(chronicSigtapCodes);

type Observation = Record<ChronicPractice, number | null> & {
  month: string | null;
  code: ChronicCareCode | null;
  cutoff: string | null;
  attendanceHistoryStarts: string | null;
  vaccinationCutoff: string | null;
  installedSigtapMonths: string[];
  teamType: string | null;
  eligible: number | null;
  identityExcluded: number | null;
  conditionUnverified: number | null;
};

type Publication = {
  criteria: ChronicPracticeEvidence[];
  evidence?: {
    observedEligiblePeople: number | null;
    unverifiedConditions: number | null;
    excludedIdentities: number | null;
  };
} & (
  | { status: "READY"; numerator: number; denominator: number; value: number; unit: "percent";
    excludedRecords: number; limitation: string }
  | { status: "NO_DATA" | "MISSING_REQUIRED_CRITERIA" | "BLOCKED_BY_DATA_CONTRACT"; reason: string }
);

function observed(count?: number | null) {
  return typeof count === "number" && Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function publication(code: ChronicCareCode, month: string, currentMonth: string, coverage?: Observation,
  observation?: Observation): Publication {
  const criteria = chronicCareCriteria[code].map(practice => ({
    ...practice,
    observedPeople: observed(observation?.[practice.id]),
  }));
  const evidence = observation ? {
    observedEligiblePeople: observed(observation.eligible),
    unverifiedConditions: observed(observation.conditionUnverified),
    excludedIdentities: observed(observation.identityExcluded),
  } : undefined;
  const cutoff = coverage?.cutoff;
  if (!cutoff || month > cutoff.slice(0, 7)) {
    return { status: "NO_DATA", reason: "Os registros do PEC local não alcançam esta competência.", criteria };
  }
  if (month === currentMonth || cutoff < competenceEnd(month)) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O recorte da cópia não cobre uma competência encerrada.", criteria };
  }
  if (month < chronicCareFirstSupportedMonth) {
    return { status: "BLOCKED_BY_DATA_CONTRACT", reason: "A pontuação desta competência exige a versão histórica da ficha metodológica.", criteria, evidence };
  }
  const teamType = coverage?.teamType;
  if (teamType !== "70" && teamType !== "76") {
    return { status: "BLOCKED_BY_DATA_CONTRACT", reason: "O vínculo do tipo de equipe ainda não foi comprovado no PEC local.", criteria, evidence };
  }
  if (!coverage?.attendanceHistoryStarts || coverage.attendanceHistoryStarts > `${shiftApsCompetence(month, -11)}-01`) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O histórico local de atendimentos não cobre a janela de 12 meses.", criteria, evidence };
  }
  const catalogCovered = Array.from({ length: 12 }, (_, index) => shiftApsCompetence(month, -index).replace("-", ""))
    .every(key => (key >= SIGTAP_FIRST_COMPETENCE && key <= SIGTAP_LAST_COMPETENCE) || coverage.installedSigtapMonths.includes(key));
  if (!catalogCovered) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "A série de competências SIGTAP no PEC está incompleta.", criteria, evidence };
  }
  if (code === "C6" && (!coverage?.vaccinationCutoff || coverage.vaccinationCutoff < competenceEnd(month))) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Os registros locais de vacinação não cobrem a competência encerrada.", criteria, evidence };
  }
  const eligible = evidence?.observedEligiblePeople;
  if (eligible === 0) {
    return evidence?.unverifiedConditions
      ? { status: "MISSING_REQUIRED_CRITERIA", reason: "Há condições registradas sem situação ativa local comprovada.", criteria, evidence }
      : { status: "NO_DATA", reason: "Nenhuma pessoa elegível foi identificada no recorte validado do PEC local.", criteria, evidence };
  }
  const result = observation && eligible ? chronicCareScore(code, eligible, observation, teamType) : null;
  if (!result) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Os agregados do PEC não sustentam a pontuação das práticas.", criteria, evidence };
  }
  const restriction = code === "C6"
    ? "Inclui doses de influenza disponíveis no PEC; a consolidação nacional usa também a RNDS e a população oficial."
    : "Calculada sobre condições ativas comprovadas no histórico da cópia; a consolidação nacional usa os registros do Siaps e do CadSUS.";
  return {
    ...result, status: "READY", criteria, evidence, excludedRecords: evidence?.excludedIdentities ?? 0,
    limitation: `Apuração da cópia local do PEC. ${restriction}`,
  };
}

export async function loadPecChronicCare(scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string) {
  const rows = await queryPEC<Observation>(chronicCareQuery, [
    scope.cnes, scope.ine, `${firstMonth}-01`, `${lastMonth}-01`, `${currentMonth}-01`,
    sigtapCompatibility, SIGTAP_FIRST_COMPETENCE, SIGTAP_LAST_COMPETENCE,
  ]);
  const sourceThrough = rows[0]?.cutoff ?? null;
  const byMonth = new Map<string, Record<ChronicCareCode, Publication>>();
  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) {
    const monthly = rows.filter(row => row.month === month);
    const entry = (code: ChronicCareCode) => publication(code, month, currentMonth, rows[0], monthly.find(row => row.code === code));
    byMonth.set(month, { C4: entry("C4"), C5: entry("C5"), C6: entry("C6") });
  }
  return { sourceThrough, byMonth };
}
