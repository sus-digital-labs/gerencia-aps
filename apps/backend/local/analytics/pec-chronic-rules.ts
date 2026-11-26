const fichas = "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia";

export const chronicCareSources = {
  C4: { document: "0055986848", previousDocument: "0050086549", url: `${fichas}/nota-metodologica-c4-cuidado-da-pessoa-com-diabetes/@@download/file` },
  C5: { document: "0056042518", previousDocument: "0050086608", url: `${fichas}/nota-metodologica-c5-cuidado-da-pessoa-com-hipertensao/@@download/file` },
  C6: { document: "0056053813", previousDocument: "0049702803", url: `${fichas}/nota-metodologica-c6-cuidado-da-pessoa-idosa/@@download/file` },
} as const;

export type ChronicCareCode = keyof typeof chronicCareSources;
export const chronicCareCodes = ["C4", "C5", "C6"] as const;

const consultations = { label: "Consulta médica ou de enfermagem", months: 6 } as const;
const pressure = { label: "Aferição da pressão arterial", months: 6 } as const;
const anthropometry = { label: "Peso e altura registrados no mesmo dia", months: 12 } as const;
const visits = { label: "Duas visitas de ACS/TACS com intervalo mínimo de 30 dias", months: 12 } as const;

export const chronicCareCriteria = {
  C4: [
    { id: "consultation", weight: 20, ...consultations },
    { id: "pressure", weight: 15, ...pressure },
    { id: "anthropometry", weight: 15, ...anthropometry },
    { id: "visits", weight: 20, ...visits, integralCreditForEap: true },
    { id: "hemoglobin", weight: 15, label: "Hemoglobina glicada solicitada ou avaliada", months: 12 },
    { id: "feet", weight: 15, label: "Avaliação dos pés", months: 12 },
  ],
  C5: [
    { id: "consultation", weight: 25, ...consultations },
    { id: "pressure", weight: 25, ...pressure },
    { id: "anthropometry", weight: 25, ...anthropometry },
    { id: "visits", weight: 25, ...visits, integralCreditForEap: true },
  ],
  C6: [
    { id: "consultation", weight: 25, ...consultations, months: 12 },
    { id: "anthropometry", weight: 25, ...anthropometry },
    { id: "visits", weight: 25, ...visits, integralCreditForEap: true },
    { id: "influenza", weight: 25, label: "Dose anual de vacina contra influenza", months: 12 },
  ],
} as const;

type Practice = (typeof chronicCareCriteria)[ChronicCareCode][number];
export type ChronicPractice = Practice["id"];
export type ChronicPracticeEvidence = Practice & { observedPeople: number | null };

// Para monitoramento local, os recortes começam no primeiro mês inteiro
// após a publicação das fichas arquivadas e após a assinatura das revisões.
export const chronicCareFirstSupportedMonth = "2025-10";
export const chronicCareCurrentMethodFrom = "2026-07";

export function chronicCareScore(
  code: ChronicCareCode, eligible: number, observed: Record<ChronicPractice, number | null>, teamType: "70" | "76",
) {
  if (!Number.isSafeInteger(eligible) || eligible <= 0 || !Number.isSafeInteger(eligible * 100)) return null;
  let numerator = 0;
  for (const criterion of chronicCareCriteria[code]) {
    const matched = observed[criterion.id];
    if (matched === null || !Number.isSafeInteger(matched) || matched < 0 || matched > eligible) return null;
    const credit = teamType === "76" && "integralCreditForEap" in criterion ? eligible : matched;
    numerator += credit * criterion.weight;
  }
  return { numerator, denominator: 100 * eligible, value: numerator / eligible, unit: "percent" as const };
}
