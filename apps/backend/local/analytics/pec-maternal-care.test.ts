import { describe, expect, it } from "vitest";
import { maternalCarePublication, type MaternalObservation } from "./pec-maternal-care";

const july = "2026-07";
const november = "2026-11";
const cutoff = "2026-09-24";
const child: MaternalObservation = {
  month: july,
  cutoff,
  assessedOn: "2026-07-31",
  localWindowCovered: true,
  ongoing: 2,
  completed: 1,
  criteria: { A: [1, 1], B: [1, 0], C: [0, 0], D: [2, 1], E: [0, 1] },
};

describe("apuração local materno-infantil", () => {
  it("aplica os cinco pesos de C2 e mantém separados os dois recortes de acompanhamento", () => {
    const result = maternalCarePublication("C2", july, november, cutoff, child);
    expect(result).toMatchObject({
      status: "READY",
      numerator: 140,
      denominator: 3,
      value: 140 / 3,
      unit: "percent",
      evidence: { closedCohort: { people: 1, earnedPoints: 60, scorePercent: 60 } },
    });
    if (result.status === "READY") expect(result.limitation).toContain("RNDS");
  });

  it("aplica 10 pontos à captação precoce do C3 e 9 às outras práticas", () => {
    const result = maternalCarePublication("C3", july, november, cutoff, {
      ...child,
      ongoing: 1,
      completed: 1,
      criteria: Object.fromEntries("ABCDEFGHIJK".split("").map(id => [id, [id === "A" ? 1 : 0, 1]])),
    });
    expect(result).toMatchObject({
      status: "READY",
      numerator: 110,
      denominator: 2,
      value: 55,
      evidence: { closedCohort: { people: 1, earnedPoints: 100, scorePercent: 100 } },
    });
  });

  it("caracteriza mês apenas de acompanhamento sem gerar coorte para o quadrimestre", () => {
    const result = maternalCarePublication("C2", july, november, cutoff, {
      ...child, completed: 0, criteria: { A: [1, 0], B: [1, 0], C: [0, 0], D: [2, 0], E: [0, 0] },
    });
    expect(result).toMatchObject({ status: "READY", numerator: 80, denominator: 2, value: 40 });
    expect(result.evidence?.closedCohort).toBeUndefined();
  });

  it("deixa contagens ausentes, janela descoberta e cortes parciais sem percentual apurado", () => {
    const uncovered = maternalCarePublication("C2", july, november, cutoff, { ...child, localWindowCovered: false });
    const missingCriterion = maternalCarePublication("C2", july, november, cutoff, { ...child, criteria: { A: [1, 1] } });
    const partial = maternalCarePublication("C2", july, november, "2026-07-30", child);
    for (const result of [uncovered, missingCriterion, partial]) {
      expect(result.status).toBe("MISSING_REQUIRED_CRITERIA");
      expect(result).not.toHaveProperty("value");
    }
  });
});
