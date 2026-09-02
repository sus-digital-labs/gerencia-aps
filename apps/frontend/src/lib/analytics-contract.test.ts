import { describe, expect, it } from "vitest";
import {
  AnalyticsContractError,
  C1_REQUIRED_FIELDS,
  CVAT_CODES,
  OPERATIONAL_METRIC_CODES,
  QUALITY_APS_NAMES,
  QUALITY_APS_CODES,
  buildImportIdempotencyKey,
  evaluateC1Contract,
  parseIndicatorResult,
  parseIndicatorResults,
  validateRegistration,
} from "./analytics-contract";

describe("analytics contract", () => {
  it("keeps the canonical scope at 15 Quality APS plus 6 CVAT metrics", () => {
    expect(QUALITY_APS_CODES).toHaveLength(15);
    expect(CVAT_CODES).toHaveLength(6);
    expect(OPERATIONAL_METRIC_CODES).toHaveLength(21);
    expect(new Set(OPERATIONAL_METRIC_CODES).size).toBe(21);
  });

  it("keeps B4 and B5 bound to their canonical names", () => {
    expect(QUALITY_APS_NAMES.B4).toBe(
      "Escovação Supervisionada em faixa etária escolar (6 a 12 anos)"
    );
    expect(QUALITY_APS_NAMES.B5).toBe(
      "Procedimentos Odontológicos Preventivos"
    );
  });

  it("blocks C1 while any canonical field is missing", () => {
    expect(evaluateC1Contract(["co_dim_equipe_1"])).toEqual({
      indicator: "C1",
      status: "BLOCKED_BY_DATA_CONTRACT",
      code: "C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE",
      missingFields: [
        "co_dim_tipo_atendimento",
        "co_dim_unidade_saude_1",
        "tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento",
        "tb_dim_tipo_atendimento.nu_identificador",
        "evidence.semanticCodeSetValidated",
        "evidence.dimensionCardinalityValidated",
        "evidence.modelVersionRecorded",
        "evidence.competenceRecorded",
        "evidence.historicalCoverageValidated",
      ],
    });
    expect(
      evaluateC1Contract([
        ...C1_REQUIRED_FIELDS,
        "tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento",
        "tb_dim_tipo_atendimento.nu_identificador",
      ]).status
    ).toBe("BLOCKED_BY_DATA_CONTRACT");
    expect(
      evaluateC1Contract(
        [
          ...C1_REQUIRED_FIELDS,
          "tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento",
          "tb_dim_tipo_atendimento.nu_identificador",
        ],
        {
          semanticCodeSetValidated: true,
          dimensionCardinalityValidated: true,
          modelVersionRecorded: true,
          competenceRecorded: true,
          historicalCoverageValidated: true,
        }
      ).status
    ).toBe("READY");
  });

  it("requires the dimension chain for C1 without treating a foreign key as a code set", () => {
    const contract = evaluateC1Contract([
      "co_dim_equipe_1",
      "co_dim_unidade_saude_1",
    ]);
    expect(contract.code).toBe("C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE");
    expect(contract.status).toBe("BLOCKED_BY_DATA_CONTRACT");
  });

  it("accepts a ready indicator only when numeric fields are finite", () => {
    expect(
      parseIndicatorResult({
        indicator_code: "C4",
        status: "READY",
        numerator: 2,
        denominator: 4,
        result_percentage: 50,
      })
    ).toMatchObject({
      indicator_code: "C4",
      status: "READY",
      numerator: 2,
      denominator: 4,
    });
    expect(() =>
      parseIndicatorResult({
        indicator_code: "C4",
        status: "READY",
        numerator: 2,
        denominator: 0,
        result_percentage: Number.NaN,
      })
    ).toThrow(AnalyticsContractError);
  });

  it("rejects numbers attached to a non-ready state", () => {
    expect(() =>
      parseIndicatorResult({
        indicator_code: "C1",
        status: "BLOCKED_BY_DATA_CONTRACT",
        numerator: 1,
      })
    ).toThrow(/Resultado numérico presente/);
    expect(() =>
      parseIndicatorResult({
        indicator_code: "C1",
        status: "BLOCKED_BY_DATA_CONTRACT",
        numerador: 1,
      })
    ).toThrow(/Resultado numérico presente/);
  });

  it("rejects unknown status and indicator codes", () => {
    expect(() =>
      parseIndicatorResult({ indicator_code: "C4", status: "UNKNOWN" })
    ).toThrow(AnalyticsContractError);
    expect(() =>
      parseIndicatorResult({ indicator_code: "X1", status: "NO_DATA" })
    ).toThrow(AnalyticsContractError);
  });

  it("rejects a non-array payload", () => {
    expect(() => parseIndicatorResults({ indicadores: [] })).toThrow(
      /Lista de indicadores/
    );
  });

  it("identifies registration records that require correction", () => {
    expect(
      validateRegistration({
        responsibleDeclared: true,
        cnes: "123",
        professionalCns: "",
      })
    ).toEqual([
      "MISSING_CPF_OR_CNS",
      "HOUSEHOLD_WITHOUT_RESPONSIBLE",
      "CNES_INE_MISMATCH_REQUIRES_VALIDATION",
      "INVALID_PROFESSIONAL_IDENTITY",
      "MISSING_CBO",
    ]);
  });

  it("builds a stable tenant-scoped import key", () => {
    const input = {
      municipalityIbge: "0000000",
      source: "ledi",
      sourceRecordId: "record-1",
      schemaVersion: "7.4",
    };
    expect(buildImportIdempotencyKey(input)).toBe(
      buildImportIdempotencyKey(input)
    );
    expect(buildImportIdempotencyKey(input)).toBe("0000000:ledi:record-1:7.4");
  });
});
