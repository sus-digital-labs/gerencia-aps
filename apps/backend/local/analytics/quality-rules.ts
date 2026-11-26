import { qualityConcept } from "./assessment-rules";

export const localQualityCodes = ["C1", "B3", "B5", "B6"] as const;
export type LocalQualityCode = (typeof localQualityCodes)[number];

const fichas = "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas";
export const qualitySources = {
  C1: { document: "0054814890", url: `${fichas}/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/@@download/file` },
  B3: { document: "0054640777", url: `${fichas}/equipe-de-saude-bucal/nota-metodologica-b3-taxa-de-exodontia/@@download/file` },
  B5: { document: "0054640779", url: `${fichas}/equipe-de-saude-bucal/nota-metodologica-b5-procedimentos-odontologicos-preventivos/@@download/file` },
  B6: { document: "0054640781", url: `${fichas}/equipe-de-saude-bucal/nota-metodologica-b6-tratamento-restaurador-atraumatico/@@download/file` },
} as const;

export const primaryCareCbos = ["225142", "225170", "225130", "225125", "225250", "223565", "223505"];
const dentists = new Set(["223208", "223293", "223272"]);
const dentalTechnicians = new Set(["322405", "322425"]);
export const dentalCbos = [...Array.from(dentists), ...Array.from(dentalTechnicians)];

const extractions = new Set(["0414020138", "0414020146"]);
const art = "0307010074";
const artProcedures = new Set([art]);
const restorations = new Set([art, "0307010031", "0307010082", "0307010104", "0307010112", "0307010120"]);
const preventiveForTechnicians = new Set([
  "0101020058", "0101020066", "0101020074", "0101020082", "0101020104", "0101020120",
]);
const prophylaxis = "0307030040";
const preventive = new Set([...Array.from(preventiveForTechnicians), prophylaxis]);
const treatments = [
  ...Array.from(restorations), "0101020090", "0307010015", "0307010066", "0307020010", "0307020029", "0307020070",
  "0307030024", "0307030059", "0307030067", "0307030075", "0307030083", "0307050017",
];
const b3Denominator = new Set([
  ...treatments, ...Array.from(extractions), ...Array.from(preventive).filter(code => code !== "0101020104"),
]);
const b5DentistDenominator = new Set([
  ...treatments, ...Array.from(preventive), "0414020138", "0307010147", "0307010155",
]);

export type DentalProduction = { cbo: string; procedure: string; quantity: number };

const noProcedures = new Set<string>();
const b3TechnicianDenominator = new Set(Array.from(b3Denominator).filter(code => !extractions.has(code)));

export function dentalCriteria(id: "B3" | "B5" | "B6", cbo: string) {
  const dentist = dentists.has(cbo);
  const technician = dentalTechnicians.has(cbo);
  switch (id) {
    case "B3":
      return {
        numerator: dentist ? extractions : noProcedures,
        denominator: dentist ? b3Denominator : technician ? b3TechnicianDenominator : noProcedures,
      };
    case "B5":
      return {
        numerator: dentist ? preventive : technician ? preventiveForTechnicians : noProcedures,
        denominator: dentist ? b5DentistDenominator : technician ? preventiveForTechnicians : noProcedures,
      };
    case "B6":
      return { numerator: dentist ? artProcedures : noProcedures, denominator: dentist ? restorations : noProcedures };
  }
}

export function dentalCounts(id: "B3" | "B5" | "B6", rows: DentalProduction[]) {
  let numerator = 0;
  let denominator = 0;
  for (const row of rows) {
    const match = dentalCriteria(id, row.cbo);
    if (match.numerator.has(row.procedure)) numerator += row.quantity;
    if (match.denominator.has(row.procedure)) denominator += row.quantity;
  }
  return { numerator, denominator };
}

export const localQualityConcept = qualityConcept;

export function localQualityRate(code: LocalQualityCode, numerator: number, denominator: number) {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) ||
      numerator < 0 || denominator <= 0 || numerator > denominator) return null;
  const value = (100 * numerator) / denominator;
  return { numerator, denominator, value, unit: "percent" as const, concept: localQualityConcept(code, value) };
}
