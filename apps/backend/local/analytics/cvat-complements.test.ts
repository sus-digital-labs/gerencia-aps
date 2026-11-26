import { describe, expect, it } from "vitest";
import { consolidatedCvatMetric, parseCvatComplements, resolveCvatLink, vulnerabilityMetric } from "./cvat-complements";
import { territorialLocalMetric, type TerritorialPopulation } from "./pec-territorial";

const scope = { cnes: "0000001", ine: "0000000001" };
const otherTeam = { cnes: "0000002", ine: "0000000002" };
const source = { authority: "Fonte de teste", document: "T-1", coveredThrough: "2026-08-31" };
const candidate = { ...scope, careContacts: 4, lastCare: "2026-08-01", registrationDate: "2026-03-01" };
const monthRecord = (month: string) => ({
  ...scope, month,
  benefits: { coverage: "PBF_E_BPC", withoutPriority: 300, demographicOnly: 100, benefitOnly: 100, both: 100, source },
  consolidation: {
    referencePopulation: 1000, individualOnly: 200, individualAndHousehold: 500,
    attendanceCount: 200, evaluations: 20, tieGroups: [],
    registrySource: source, populationSource: source, satisfactionSource: source,
  },
});
const parse = (records: unknown[]) => parseCvatComplements(Buffer.from(JSON.stringify({
  schema: "sus-analytics-web.cvat-complements.v1", records,
})));

describe("catálogo CVAT", () => {
  it("mede separadamente os modelos atualizados e não transforma competência aberta em zero", () => {
    const observations: TerritorialPopulation = {
      month: "2026-08", cutoff: "2026-09-04", candidates: 112, linked: 100, valid: 85,
      complete: 70, recent_individual: 80, recent_household: 65, recent_both: 50, tracked: 0, demographic: 0,
    };
    expect(territorialLocalMetric(observations, "CVAT3", "2026-09")).toMatchObject({
      status: "READY", numerator: 50, denominator: 100, value: 50, excludedRecords: 12,
    });
    expect(territorialLocalMetric(observations, "CVAT4", "2026-09")).toMatchObject({
      status: "READY", numerator: 0, denominator: 100,
    });
    expect(territorialLocalMetric(observations, "CVAT4", "2026-08").status).toBe("MISSING_REQUIRED_CRITERIA");
  });

  it("exige cobertura de PBF e BPC por equipe e mês e calcula os quatro estratos", () => {
    const valid = parse([monthRecord("2026-08")]);
    expect(vulnerabilityMetric(valid, scope, "2026-08")).toMatchObject({
      status: "READY", numerator: 800, denominator: 600, value: 800 / 600,
    });
    expect(vulnerabilityMetric(valid, otherTeam, "2026-08").status).toBe("BLOCKED_BY_DATA_CONTRACT");
    expect(vulnerabilityMetric(parse([]), scope, "2026-08").status).toBe("BLOCKED_BY_DATA_CONTRACT");
    const duplicate = parse([monthRecord("2026-08"), monthRecord("2026-08")]);
    expect(duplicate.state).toBe("INVALID");
    expect(parse([{ ...monthRecord("2026-08"), benefits: { ...monthRecord("2026-08").benefits, coverage: "PBF" } }]).state).toBe("INVALID");
  });

  it("resolve vínculo pela sequência oficial e interrompe um empate exato", () => {
    expect(resolveCvatLink([candidate, { ...candidate, ...otherTeam, careContacts: 5 }])).toEqual(otherTeam);
    expect(resolveCvatLink([candidate, { ...candidate, ...otherTeam, lastCare: "2026-08-02" }])).toEqual(otherTeam);
    expect(resolveCvatLink([candidate, { ...candidate, ...otherTeam, registrationDate: "2026-03-02" }])).toEqual(otherTeam);
    expect(resolveCvatLink([candidate, { ...candidate, ...otherTeam }])).toBeNull();
  });

  it("consolida quatro meses, inclui o bônus e bloqueia vínculo ambíguo", () => {
    const records = ["2026-05", "2026-06", "2026-07", "2026-08"].map(monthRecord);
    expect(consolidatedCvatMetric(parse(records), scope, "2026-08")).toMatchObject({
      status: "READY", denominator: 10, value: 8.55,
    });
    expect(consolidatedCvatMetric(parse(records.slice(1)), scope, "2026-08").status).toBe("BLOCKED_BY_DATA_CONTRACT");
    const tied = {
      ...records[3],
      consolidation: {
        ...records[3].consolidation,
        tieGroups: [{ persons: 1, candidates: [candidate, { ...candidate, ...otherTeam }] }],
      },
    };
    expect(consolidatedCvatMetric(parse([...records.slice(0, 3), tied]), scope, "2026-08").status).toBe("BLOCKED_BY_DATA_CONTRACT");
  });

  it("aceita a nota final informada na exportação por equipe e no quadrimestre exato", () => {
    const data = parse([{ ...scope, month: "2026-08", publishedFinal: { system: "SIAPS", score: 7.5, source } }]);
    expect(consolidatedCvatMetric(data, scope, "2026-08")).toMatchObject({ status: "READY", value: 7.5, concept: "bom" });
    expect(consolidatedCvatMetric(data, otherTeam, "2026-08").status).toBe("BLOCKED_BY_DATA_CONTRACT");
  });
});
