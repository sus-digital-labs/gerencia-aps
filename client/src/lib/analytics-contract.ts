export const QUALITY_APS_CODES = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "M1",
  "M2",
] as const;

export const CVAT_CODES = [
  "CVAT1",
  "CVAT2",
  "CVAT3",
  "CVAT4",
  "CVAT5",
  "CVAT6",
] as const;

export const OPERATIONAL_METRIC_CODES = [
  ...QUALITY_APS_CODES,
  ...CVAT_CODES,
] as const;

export type IndicatorCode = (typeof OPERATIONAL_METRIC_CODES)[number];

export const QUALITY_APS_NAMES: Readonly<
  Record<(typeof QUALITY_APS_CODES)[number], string>
> = Object.freeze({
  B1: "Primeira Consulta Programada por equipe de Saúde Bucal",
  B2: "Tratamento Concluído por equipe de Saúde Bucal",
  B3: "Taxa de Exodontia por equipe de Saúde Bucal",
  B4: "Escovação Supervisionada em faixa etária escolar (6 a 12 anos)",
  B5: "Procedimentos Odontológicos Preventivos",
  B6: "Tratamento Restaurador Atraumático (ART)",
  C1: "Mais Acesso à APS",
  C2: "Cuidado no Desenvolvimento Infantil",
  C3: "Cuidado na Gestação e Puerpério",
  C4: "Cuidado da Pessoa com Diabetes",
  C5: "Cuidado da Pessoa com Hipertensão",
  C6: "Cuidado da Pessoa Idosa",
  C7: "Cuidado da Mulher na Prevenção do Câncer",
  M1: "Média de Atendimentos por Pessoa pela eMulti na APS",
  M2: "Ações Interprofissionais realizadas pela eMulti na APS",
});

export type AnalyticsStatus =
  | "READY"
  | "NO_DATA"
  | "API_UNAVAILABLE"
  | "MISSING_REQUIRED_CRITERIA"
  | "BLOCKED_BY_DATA_CONTRACT";

export const C1_REQUIRED_FIELDS = [
  "co_dim_tipo_atendimento",
  "co_dim_equipe_1",
  "co_dim_unidade_saude_1",
] as const;

export const C1_DEMAND_TYPE_CHAIN = [
  "fact.co_dim_tipo_atendimento",
  "dimension.co_seq_dim_tipo_atendimento",
  "dimension.nu_identificador",
] as const;

export const C1_REQUIRED_DATA_CONTRACT_FIELDS = [
  ...C1_REQUIRED_FIELDS,
  "tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento",
  "tb_dim_tipo_atendimento.nu_identificador",
] as const;

export type C1ContractCode =
  | "C1_READY"
  | "C1_BLOCKED_BY_DATA_CONTRACT"
  | "C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE";

export interface ContractStatus {
  indicator: "C1";
  status: "READY" | "BLOCKED_BY_DATA_CONTRACT";
  code: C1ContractCode;
  missingFields: string[];
}

export interface C1ContractEvidence {
  semanticCodeSetValidated: boolean;
  dimensionCardinalityValidated: boolean;
  modelVersionRecorded: boolean;
  competenceRecorded: boolean;
  historicalCoverageValidated: boolean;
}

const C1_REQUIRED_EVIDENCE: ReadonlyArray<keyof C1ContractEvidence> = [
  "semanticCodeSetValidated",
  "dimensionCardinalityValidated",
  "modelVersionRecorded",
  "competenceRecorded",
  "historicalCoverageValidated",
];

export function evaluateC1Contract(
  fields: Iterable<string>,
  evidence?: Partial<C1ContractEvidence>
): ContractStatus {
  const available = new Set(fields);
  const missingFields = [
    ...C1_REQUIRED_DATA_CONTRACT_FIELDS.filter(field => !available.has(field)),
    ...C1_REQUIRED_EVIDENCE.filter(field => evidence?.[field] !== true).map(
      field => `evidence.${field}`
    ),
  ];
  const demandTypeMissing = [
    "co_dim_tipo_atendimento",
    "tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento",
    "tb_dim_tipo_atendimento.nu_identificador",
  ].some(field => !available.has(field));

  if (missingFields.length > 0) {
    return {
      indicator: "C1",
      status: "BLOCKED_BY_DATA_CONTRACT",
      code: demandTypeMissing
        ? "C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE"
        : "C1_BLOCKED_BY_DATA_CONTRACT",
      missingFields,
    };
  }

  return {
    indicator: "C1",
    status: "READY",
    code: "C1_READY",
    missingFields: [],
  };
}

export class AnalyticsContractError extends Error {
  readonly code = "CONTRACT_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "AnalyticsContractError";
  }
}

export interface IndicatorResultRecord {
  indicator_code: IndicatorCode;
  indicator_name?: string;
  category?: string;
  status: AnalyticsStatus;
  numerator?: number;
  denominator?: number;
  result_percentage?: number;
  target_percentage?: number;
  achieved?: boolean;
  quality_score?: number;
  period_month?: number;
  period_year?: number;
  team_id?: string | number | null;
  unit_id?: string | number | null;
  trend?: "up" | "down" | "stable";
  previous_result?: number;
  missing_fields?: string[];
}

const ANALYTICS_STATUSES = new Set<AnalyticsStatus>([
  "READY",
  "NO_DATA",
  "API_UNAVAILABLE",
  "MISSING_REQUIRED_CRITERIA",
  "BLOCKED_BY_DATA_CONTRACT",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readFiniteNumber = (
  value: unknown,
  field: string,
  required: boolean
): number | undefined => {
  if (value === undefined || value === null) {
    if (required)
      throw new AnalyticsContractError(`Campo numérico ausente: ${field}`);
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AnalyticsContractError(`Campo numérico inválido: ${field}`);
  }
  return value;
};

const readOptionalString = (
  value: unknown,
  field: string
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string")
    throw new AnalyticsContractError(`Campo textual inválido: ${field}`);
  return value;
};

export function parseIndicatorResult(input: unknown): IndicatorResultRecord {
  if (!isRecord(input))
    throw new AnalyticsContractError("Resultado de indicador não é um objeto");

  const code = readOptionalString(
    input.indicator_code ?? input.codigo,
    "indicator_code"
  );
  if (
    !code ||
    !(OPERATIONAL_METRIC_CODES as readonly string[]).includes(code)
  ) {
    throw new AnalyticsContractError(
      "Código de indicador ausente ou desconhecido"
    );
  }

  const rawStatus = input.status;
  if (
    typeof rawStatus !== "string" ||
    !ANALYTICS_STATUSES.has(rawStatus as AnalyticsStatus)
  ) {
    throw new AnalyticsContractError(
      `Status de indicador ausente ou inválido: ${code}`
    );
  }
  const status = rawStatus as AnalyticsStatus;

  const result: IndicatorResultRecord = {
    indicator_code: code as IndicatorCode,
    indicator_name: readOptionalString(
      input.indicator_name ?? input.nome,
      "indicator_name"
    ),
    category: readOptionalString(input.category ?? input.categoria, "category"),
    status,
    period_month: readFiniteNumber(input.period_month, "period_month", false),
    period_year: readFiniteNumber(input.period_year, "period_year", false),
    team_id: (input.team_id ?? null) as string | number | null,
    unit_id: (input.unit_id ?? null) as string | number | null,
    missing_fields: Array.isArray(input.missing_fields)
      ? input.missing_fields.filter(
          (field): field is string => typeof field === "string"
        )
      : undefined,
  };

  if (status !== "READY") {
    const forbiddenNumericFields = [
      "numerator",
      "numerador",
      "denominator",
      "denominador",
      "result_percentage",
      "resultado",
    ];
    if (
      forbiddenNumericFields.some(
        field => input[field] !== undefined && input[field] !== null
      )
    ) {
      throw new AnalyticsContractError(
        `Resultado numérico presente em estado não pronto: ${code}`
      );
    }
    return result;
  }

  result.numerator = readFiniteNumber(
    input.numerator ?? input.numerador,
    "numerator",
    true
  );
  result.denominator = readFiniteNumber(
    input.denominator ?? input.denominador,
    "denominator",
    true
  );
  result.result_percentage = readFiniteNumber(
    input.result_percentage ?? input.resultado,
    "result_percentage",
    true
  );
  result.target_percentage = readFiniteNumber(
    input.target_percentage ?? input.meta,
    "target_percentage",
    false
  );
  result.quality_score = readFiniteNumber(
    input.quality_score,
    "quality_score",
    false
  );
  result.previous_result = readFiniteNumber(
    input.previous_result,
    "previous_result",
    false
  );
  if (input.achieved !== undefined && typeof input.achieved !== "boolean") {
    throw new AnalyticsContractError(`Campo achieved inválido: ${code}`);
  }
  if (
    input.trend !== undefined &&
    !["up", "down", "stable"].includes(String(input.trend))
  ) {
    throw new AnalyticsContractError(`Campo trend inválido: ${code}`);
  }
  result.achieved = input.achieved as boolean | undefined;
  result.trend = input.trend as IndicatorResultRecord["trend"];
  return result;
}

export function parseIndicatorResults(input: unknown): IndicatorResultRecord[] {
  if (!Array.isArray(input))
    throw new AnalyticsContractError(
      "Lista de indicadores ausente ou inválida"
    );
  return input.map(parseIndicatorResult);
}

export interface RegistrationRecord {
  cpf?: string | null;
  cns?: string | null;
  responsibleDeclared?: boolean | null;
  responsibleCpf?: string | null;
  responsibleCns?: string | null;
  cnes?: string | null;
  ine?: string | null;
  professionalCns?: string | null;
  cbo?: string | null;
}

export type RegistrationIssueCode =
  | "MISSING_CPF_OR_CNS"
  | "HOUSEHOLD_WITHOUT_RESPONSIBLE"
  | "CNES_INE_MISMATCH_REQUIRES_VALIDATION"
  | "INVALID_PROFESSIONAL_IDENTITY"
  | "MISSING_CBO";

export function validateRegistration(
  record: RegistrationRecord
): RegistrationIssueCode[] {
  const issues: RegistrationIssueCode[] = [];

  if (!record.cpf && !record.cns) issues.push("MISSING_CPF_OR_CNS");
  if (
    record.responsibleDeclared &&
    !record.responsibleCpf &&
    !record.responsibleCns
  ) {
    issues.push("HOUSEHOLD_WITHOUT_RESPONSIBLE");
  }
  if ((record.cnes && !record.ine) || (!record.cnes && record.ine)) {
    issues.push("CNES_INE_MISMATCH_REQUIRES_VALIDATION");
  }
  if (!record.professionalCns) issues.push("INVALID_PROFESSIONAL_IDENTITY");
  if (!record.cbo) issues.push("MISSING_CBO");

  return issues;
}

export function buildImportIdempotencyKey(input: {
  municipalityIbge: string;
  source: string;
  sourceRecordId: string;
  schemaVersion: string;
}): string {
  return [
    input.municipalityIbge,
    input.source,
    input.sourceRecordId,
    input.schemaVersion,
  ]
    .map(value => value.trim())
    .join(":");
}
