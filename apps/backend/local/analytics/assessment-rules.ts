import { APS_INDICATOR_GROUPS, QUALITY_APS_CODES } from "@shared/aps-indicators";

export type ApsQualityCode = (typeof QUALITY_APS_CODES)[number];
export type ApsConcept = "regular" | "suficiente" | "bom" | "ótimo";
export type TeamModality = "ESF" | "EAP20" | "EAP30" | "ESB20" | "ESB30" | "ESB40" | "EMULTI_ESTRATEGICA" | "EMULTI_COMPLEMENTAR" | "EMULTI_AMPLIADA";
export type FundingComponent = "quality" | "territorial";

export const NT8_URL = "https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf";
export const NT30_URL = "https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/notas-tecnicas/2025/nota-tecnica-no-30-2025-cgesco-desco-saps-ms.pdf";
export const fundingTransitionUrl = "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2026/prt10994_14_05_2026.html";

function ascending(value: number, sufficient: number, good: number, excellent: number): ApsConcept {
  if (value > excellent) return "ótimo";
  if (value > good) return "bom";
  return value > sufficient ? "suficiente" : "regular";
}

export function qualityConcept(code: ApsQualityCode, value: number): ApsConcept | null {
  if (!Number.isFinite(value) || value < 0) return null;
  if (code !== "M1" && code !== "B1" && code !== "B4" && value > 100) return null;
  switch (code) {
    case "C1": return value > 70 ? "regular" : ascending(value, 10, 30, 50);
    case "B1": return ascending(value, 0.25, 0.75, 1.25);
    case "B3":
      if (value < 3 || value >= 14) return "regular";
      if (value < 10) return "ótimo";
      return value < 12 ? "bom" : "suficiente";
    case "B4": return ascending(value, 0.25, 0.5, 1);
    case "B5":
      if (value < 40 || value > 85) return "regular";
      if (value >= 65) return "ótimo";
      return value >= 55 ? "bom" : "suficiente";
    case "B6": return ascending(value, 3, 6, 8);
    case "M1": return ascending(value, 1, 2, 3);
    case "M2": return ascending(value, 1, 2.5, 5);
    default: return ascending(value, 25, 50, 75);
  }
}

const qualityWeights: Record<ApsQualityCode, number> = {
  C1: 1, C2: 2, C3: 2, C4: 1, C5: 1, C6: 1, C7: 2,
  B1: 2, B2: 2, B3: 2, B4: 1, B5: 2, B6: 1, M1: 6, M2: 4,
};
const factor: Record<ApsConcept, number> = { regular: 0.25, suficiente: 0.5, bom: 0.75, "ótimo": 1 };

export function qualityCodesFor(modality: TeamModality): readonly ApsQualityCode[] {
  if (modality.startsWith("ESB")) return APS_INDICATOR_GROUPS.dental.codes;
  if (modality.startsWith("EMULTI_")) return APS_INDICATOR_GROUPS.multi.codes;
  return APS_INDICATOR_GROUPS.primary.codes;
}

export function quarterMonths(period: string) {
  const [year, quarter] = period.split("-Q").map(Number);
  return Array.from({ length: 4 }, (_, index) => `${year}-${String((quarter - 1) * 4 + index + 1).padStart(2, "0")}`);
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

type PublishedMonth = { month: string; code: ApsQualityCode } &
  ({ status: "PUBLISHED"; value: number } | { status: "NO_COHORT" });

export function qualityQuarter(
  modality: TeamModality,
  period: string,
  eligibility: ReadonlyMap<string, "ELIGIBLE" | "SUSPENDED">,
  publication: readonly PublishedMonth[],
) {
  const months = quarterMonths(period);
  if (!months.every(month => eligibility.has(month))) {
    return { status: "PENDING" as const, reason: "Falta a situação oficial da equipe para os quatro meses do quadrimestre." };
  }
  const eligible = months.filter(month => eligibility.get(month) === "ELIGIBLE");
  if (!eligible.length) return { status: "NOT_APPLICABLE" as const, reason: "Pagamento suspenso nos quatro meses." };

  const results = [];
  for (const code of qualityCodesFor(modality)) {
    const values: number[] = [];
    for (const month of eligible) {
      const item = publication.find(row => row.code === code && row.month === month);
      if (item?.status === "NO_COHORT" && (code === "C2" || code === "C3")) continue;
      if (item?.status !== "PUBLISHED" || qualityConcept(code, item.value) === null) {
        return { status: "PENDING" as const, reason: `Resultado oficial de ${code} indisponível ou fora da ficha em ${month}.` };
      }
      values.push(item.value);
    }
    if (!values.length) {
      return { status: "PENDING" as const, reason: `${code} sem coorte em todos os meses elegíveis. É necessário o resultado publicado do componente.` };
    }
    const value = mean(values);
    const concept = qualityConcept(code, value);
    if (!concept) return { status: "PENDING" as const, reason: `A média de ${code} está fora das faixas da ficha.` };
    results.push({ code, value, concept, monthsEvaluated: values.length, weight: qualityWeights[code], score: qualityWeights[code] * factor[concept] });
  }
  const score = results.reduce((sum, result) => sum + result.score, 0);
  const concept = score > 7.5 ? "ótimo" : score >= 5 ? "bom" : score > 2.5 ? "suficiente" : "regular";
  return { status: "READY" as const, score, concept: concept as ApsConcept, indicators: results };
}

export type TerritorialCount = {
  referencePopulation: number;
  individualOnly: number;
  individualAndHousehold: number;
  trackedWithoutPriority: number;
  trackedDemographicOnly: number;
  trackedBenefitOnly: number;
  trackedWithBothPriorities: number;
  attendanceCount: number;
  evaluations: number;
};

function territorialFactor(index: number) {
  if (index < 45) return 0.25;
  if (index >= 45 && index <= 64.9) return 0.5;
  if (index >= 65 && index <= 84.9) return 0.75;
  if (index > 85) return 1;
  return null;
}

export function territorialMonth(counts: TerritorialCount) {
  const registry = (75 * counts.individualOnly + 150 * counts.individualAndHousehold) / counts.referencePopulation;
  const followUp = (100 * counts.trackedWithoutPriority + 120 * counts.trackedDemographicOnly +
    130 * counts.trackedBenefitOnly + 250 * counts.trackedWithBothPriorities) / counts.referencePopulation;
  const enrollment = territorialFactor(registry);
  const care = territorialFactor(followUp);
  const bonus = counts.evaluations === 0 ? 0 : counts.evaluations * 20 >= counts.attendanceCount ? 0.3 : 0.15;
  return { registry, followUp, enrollmentScore: enrollment === null ? null : 3 * enrollment, followUpScore: care === null ? null : 7 * care, bonus };
}

export function territorialQuarter(months: readonly TerritorialCount[]) {
  if (months.length !== 4) return { status: "PENDING" as const, reason: "Faltam dimensões territoriais oficiais para os quatro meses." };
  const dimensions = months.map(territorialMonth);
  const enrollmentScores = dimensions.flatMap(row => row.enrollmentScore === null ? [] : [row.enrollmentScore]);
  const followUpScores = dimensions.flatMap(row => row.followUpScore === null ? [] : [row.followUpScore]);
  const enrollment = territorialFactor(mean(dimensions.map(row => row.registry)));
  const care = territorialFactor(mean(dimensions.map(row => row.followUp)));
  if (enrollmentScores.length !== 4 || followUpScores.length !== 4 || enrollment === null || care === null) {
    return { status: "PENDING" as const, reason: "O índice está em uma lacuna das faixas da Nota Técnica 30/2025. Confira a classificação publicada." };
  }
  const enrollmentScore = mean(enrollmentScores);
  const followUpScore = mean(followUpScores);
  if (enrollmentScore !== enrollment * 3 || followUpScore !== care * 7) {
    return { status: "PENDING" as const, reason: "A sequência de agregação altera o escore. Confira a classificação publicada pelo Siaps." };
  }
  const bonus = Math.max(...dimensions.map(row => row.bonus));
  const score = enrollmentScore + Math.min(7, followUpScore + bonus);
  const concept = score > 8.5 ? "ótimo" : score >= 7 ? "bom" : score >= 5 ? "suficiente" : "regular";
  return { status: "READY" as const, score, concept: concept as ApsConcept, enrollmentScore, followUpScore, bonus, dimensions };
}

export function payableConcept(
  component: FundingComponent, modality: TeamModality, paymentMonth: string, observed: ApsConcept | null,
) {
  const primary = modality === "ESF" || modality === "EAP20" || modality === "EAP30";
  if (component === "territorial" && !primary) return null;
  if (paymentMonth >= "2027-01") return observed;
  if (!paymentMonth.startsWith("2026-")) return null;
  if (component === "quality" && (modality === "ESB20" || modality === "ESB30")) return observed;
  const protectedThrough = component === "quality" ? "2026-04" : "2026-08";
  if (paymentMonth <= protectedThrough) return "bom";
  if (!observed) return null;
  return observed === "ótimo" ? "ótimo" : "bom";
}
