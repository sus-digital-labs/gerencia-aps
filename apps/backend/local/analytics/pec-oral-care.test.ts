import { describe, expect, it } from "vitest";
import { evaluatePecOralCoverage } from "./pec-oral-care";
import type { DentalReferenceRow } from "./pec-oral-care-population";

const month = "2026-08";
const reference: DentalReferenceRow = {
  month, links: "1", verified: true, unshared: true,
  registered: "12", people: "10", children: "2", cutoff: "2026-09-24",
};

describe("apuração de saúde bucal no PEC", () => {
  it("usa a população de referência para B1 e mantém valores acima de 100%", () => {
    expect(evaluatePecOralCoverage(month, "B1", 12, 0, reference)).toMatchObject({
      status: "READY", unit: "percent", numerator: 12, denominator: 10, value: 120,
      limitation: expect.stringContaining("SIAPS"),
    });
  });

  it("usa apenas a faixa elegível no denominador do B4 e aceita zero com fonte completa", () => {
    expect(evaluatePecOralCoverage(month, "B4", 0, 0, reference)).toMatchObject({
      status: "READY", numerator: 0, denominator: 2, value: 0,
    });
  });

  it("deixa o cálculo bloqueado sem vínculo importado ou com divisão ainda sem prova", () => {
    for (const facts of [{ links: "0" }, { verified: false }, { unshared: false }]) {
      const result = evaluatePecOralCoverage(month, "B4", 2, 0, { ...reference, ...facts });
      expect(result.status).toBe("BLOCKED_BY_DATA_CONTRACT");
      expect(result).not.toHaveProperty("value");
    }
  });

  it("distingue denominador vazio, competência aberta e produção com registro inválido", () => {
    expect(evaluatePecOralCoverage(month, "B4", 0, 0, { ...reference, children: "0" }))
      .toMatchObject({ status: "NO_DATA", denominator: 0 });
    expect(evaluatePecOralCoverage(month, "B1", 1, 0, { ...reference, cutoff: "2026-08-25" }))
      .toMatchObject({ status: "MISSING_REQUIRED_CRITERIA" });
    expect(evaluatePecOralCoverage(month, "B4", 0, 3, reference))
      .toMatchObject({ status: "MISSING_REQUIRED_CRITERIA", denominator: 2, excludedRecords: 3 });
  });
});
