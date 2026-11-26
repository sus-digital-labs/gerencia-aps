import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { childCareQuery } from "./pec-maternal-child";
import { pregnancyCareQuery } from "./pec-maternal-pregnancy";
import { competenceEnd } from "./pec-quality-source";

const source = "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia";
export const maternalCareCodes = ["C2", "C3"] as const;
export type MaternalCareCode = (typeof maternalCareCodes)[number];

export const maternalCareRules = {
  C2: {
    document: "0054824593",
    url: `${source}/nota-metodologica-c2-cuidado-no-desenvolvimento-infantil/@@download/file`,
  },
  C3: {
    document: "0054619475",
    url: `${source}/nota-metodologica-c3-cuidado-na-gestacao-e-puerperio/@@download/file`,
  },
} as const;

const practices = {
  C2: {
    A: "Consulta presencial de puericultura até o 30º dia",
    B: "Nove consultas de puericultura até dois anos",
    C: "Nove datas com peso e altura",
    D: "Duas visitas até seis meses, uma até o 30º dia (pontuação integral para eAP)",
    E: "Séries de doses completas nos registros do PEC local",
  },
  C3: {
    A: "Consulta de pré-natal até a 12ª semana",
    B: "Sete consultas de pré-natal",
    C: "Sete datas com pressão arterial registrada",
    D: "Sete datas com peso e altura",
    E: "Três visitas após a primeira consulta do pré-natal (pontuação integral para eAP)",
    F: "dTpa registrada a partir da 20ª semana",
    G: "Testes ou exames avaliados para sífilis, HIV e hepatites B e C no primeiro trimestre",
    H: "Testes ou exames avaliados para sífilis e HIV no terceiro trimestre",
    I: "Consulta puerperal até o 42º dia",
    J: "Visita puerperal até o 42º dia (pontuação integral para eAP)",
    K: "Atendimento odontológico qualificado na gestação",
  },
} as const;

// Pesos dos Quadros 01 das fichas SEI 0054824593 (C2) e 0054619475 (C3).
const weights = {
  C2: { A: 20, B: 20, C: 20, D: 20, E: 20 },
  C3: { A: 10, B: 9, C: 9, D: 9, E: 9, F: 9, G: 9, H: 9, I: 9, J: 9, K: 9 },
} as const;

export interface MaternalObservation {
  month: string | null;
  cutoff: string | null;
  assessedOn: string | null;
  localWindowCovered: boolean;
  ongoing: number;
  completed: number;
  postpartum?: number;
  missingOutcome?: number;
  excludedRecords?: number;
  criteria: Record<string, [number, number]>;
}

interface MaternalPracticeEvidence {
  id: string;
  label: string;
  observedOngoing: number | null;
  observedCompleted: number | null;
}

interface MaternalResultEvidence {
  reason: string;
  criteria: MaternalPracticeEvidence[];
  evidence?: {
    observedThrough: string;
    observedOngoing: number;
    observedCompleted: number;
    completedLandmark: "AGE_TWO" | "POSTPARTUM_D42";
    observedPostpartum?: number;
    missingRecordedOutcome?: number;
    closedCohort?: { people: number; earnedPoints: number; scorePercent: number };
  };
}

export type MaternalCareResult = MaternalResultEvidence & (
  { status: "READY"; numerator: number; denominator: number; value: number; unit: "percent";
    limitation: string; excludedRecords: number } |
  { status: "NO_DATA" | "MISSING_REQUIRED_CRITERIA" }
);

const limitation = "Apuração dos pontos comprovados na coorte vinculada do PEC local. CadSUS, SCNES, RNDS e a produção externa ainda precisam ser reconciliados para o resultado do SIAPS.";
const validCount = (value: number | null): value is number => value !== null && Number.isSafeInteger(value) && value >= 0;

export function maternalCarePublication(code: MaternalCareCode, month: string, currentMonth: string,
  cutoff: string | null, observation?: MaternalObservation): MaternalCareResult {
  const criteria = Object.entries(practices[code]).map(([id, label]) => ({
    id, label, observedOngoing: observation?.criteria?.[id]?.[0] ?? null,
    observedCompleted: observation?.criteria?.[id]?.[1] ?? null,
  }));
  if (!cutoff || month > cutoff.slice(0, 7)) {
    return { status: "NO_DATA", reason: "O registro mais recente do PEC local precede a competência.", criteria };
  }

  const evidence: MaternalCareResult["evidence"] = observation?.assessedOn ? {
    observedThrough: observation.assessedOn,
    observedOngoing: observation.ongoing,
    observedCompleted: observation.completed,
    completedLandmark: code === "C2" ? "AGE_TWO" : "POSTPARTUM_D42",
    observedPostpartum: observation.postpartum,
    missingRecordedOutcome: observation.missingOutcome,
  } : undefined;

  const end = competenceEnd(month);
  if (month >= currentMonth || cutoff < end || (observation?.assessedOn && observation.assessedOn < end)) {
    return {
      status: "MISSING_REQUIRED_CRITERIA",
      reason: "A competência está aberta ou a cópia termina antes do encerramento. As contagens são evidência parcial.",
      criteria,
      evidence,
    };
  }
  if (!observation?.localWindowCovered || !evidence) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Alguma fonte local não cobre a janela da coorte nesta competência.", criteria, evidence };
  }
  const { ongoing, completed, excludedRecords = 0 } = observation;
  const denominator = ongoing + completed;
  if (!validCount(ongoing) || !validCount(completed) || !validCount(excludedRecords) || !validCount(denominator)) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "A coorte local não passou nas verificações de integridade.", criteria, evidence };
  }
  if (denominator === 0) {
    return {
      status: excludedRecords > 0 ? "MISSING_REQUIRED_CRITERIA" : "NO_DATA",
      reason: excludedRecords > 0 ? "A coorte contém episódios com datas de desfecho conflitantes." : "A coorte local elegível está vazia nesta competência.",
      criteria,
      evidence,
    };
  }
  const ruleWeights: Readonly<Record<string, number>> = weights[code];
  let ongoingPoints = 0;
  let completedPoints = 0;
  for (const criterion of criteria) {
    const { id, observedOngoing, observedCompleted } = criterion;
    if (!validCount(observedOngoing) || observedOngoing > ongoing ||
        !validCount(observedCompleted) || observedCompleted > completed) {
      return { status: "MISSING_REQUIRED_CRITERIA", reason: "Uma prática não tem contagens válidas para os dois recortes da coorte.", criteria, evidence };
    }
    ongoingPoints += ruleWeights[id] * observedOngoing;
    completedPoints += ruleWeights[id] * observedCompleted;
  }
  // NT 08/2026: meses sem o marco final não entram na avaliação quadrimestral.
  if (completed > 0) {
    evidence.closedCohort = { people: completed, earnedPoints: completedPoints, scorePercent: completedPoints / completed };
  }
  const numerator = ongoingPoints + completedPoints;
  return { status: "READY", reason: limitation, limitation, numerator, denominator, value: numerator / denominator,
    unit: "percent", excludedRecords, criteria, evidence };
}

export async function loadPecMaternalCare(scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string) {
  const inputs = [scope.cnes, scope.ine, `${firstMonth}-01`, `${lastMonth}-01`];
  const child = await queryPEC<MaternalObservation>(childCareQuery, inputs);
  const pregnancy = await queryPEC<MaternalObservation>(pregnancyCareQuery, inputs);
  const sourceThrough = child[0]?.cutoff ?? pregnancy[0]?.cutoff ?? null;
  const byMonth = new Map<string, Record<MaternalCareCode, MaternalCareResult>>();
  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) {
    byMonth.set(month, {
      C2: maternalCarePublication("C2", month, currentMonth, child[0]?.cutoff ?? null, child.find(row => row.month === month)),
      C3: maternalCarePublication("C3", month, currentMonth, pregnancy[0]?.cutoff ?? null, pregnancy.find(row => row.month === month)),
    });
  }
  return { sourceThrough, byMonth };
}
