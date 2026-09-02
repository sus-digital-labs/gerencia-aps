import {
  parseIndicatorResults,
  AnalyticsContractError,
} from "./analytics-contract";
import { trpc as trpcClient } from "./trpc";

const contractNotImplemented = (capability: string): never => {
  throw new Error(`CONTRACT_NOT_IMPLEMENTED:${capability}`);
};

const requireArray = (value: unknown, capability: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new AnalyticsContractError(`Resposta inválida para ${capability}`);
  }
  return value;
};

const requireObject = (
  value: unknown,
  capability: string
): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AnalyticsContractError(`Resposta inválida para ${capability}`);
  }
  return value as Record<string, unknown>;
};

const requireText = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AnalyticsContractError(`Campo textual inválido: ${field}`);
  }
  return value;
};

const requireFinite = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AnalyticsContractError(`Campo numérico inválido: ${field}`);
  }
  return value;
};

const indicatorFilter = async (query: Record<string, unknown> = {}) => {
  if (query.indicator_code === "C1") {
    return contractNotImplemented("C1_BLOCKED_BY_DATA_CONTRACT");
  }

  const year =
    typeof query.period_year === "number" ? query.period_year : undefined;
  const startYear = year ?? new Date().getFullYear();
  const result = await trpcClient.previneBrasil.calcularTodos.query({
    competenciaInicio: `${startYear}-01-01`,
    competenciaFim: `${startYear}-12-31`,
    equipeId: query.team_id as string | number | undefined,
  });
  const payload = requireObject(result, "IndicatorResult.filter");
  const indicators = parseIndicatorResults(payload.indicadores);
  const code =
    typeof query.indicator_code === "string" ? query.indicator_code : undefined;
  return code
    ? indicators.filter(indicator => indicator.indicator_code === code)
    : indicators;
};

const collectionFilter = async (
  capability: string,
  callback: () => Promise<unknown>
) => {
  const result = await callback();
  return requireArray(result, capability);
};

const qualityIssueFilter = async () => {
  const result = await trpcClient.ledi.estatisticasInconsistencias.query();
  const payload = requireObject(result, "DataQualityIssue.filter");
  const items = requireArray(payload.porTipo, "DataQualityIssue.filter");
  return items.map((item, index) => {
    const value = requireObject(item, "DataQualityIssue.filter");
    return {
      id: index + 1,
      issue_type: requireText(value.tipo, "tipo"),
      affected_records: requireFinite(value.quantidade, "quantidade"),
    };
  });
};

export const entities = {
  IndicatorResult: {
    filter: indicatorFilter,
  },
  HealthUnit: {
    filter: (query: Record<string, unknown> = {}) =>
      collectionFilter("HealthUnit.filter", () =>
        trpcClient.unidades.listar.query()
      ),
  },
  HealthTeam: {
    filter: (query: Record<string, unknown> = {}) =>
      collectionFilter("HealthTeam.filter", () =>
        trpcClient.equipes.listar.query()
      ),
  },
  TeamScore: {
    filter: async () => contractNotImplemented("TeamScore"),
  },
  DataQualityIssue: {
    filter: qualityIssueFilter,
  },
  CommunityHealthAgent: {
    filter: () =>
      collectionFilter("CommunityHealthAgent.filter", () =>
        trpcClient.acs.getAll.query()
      ),
    create: async () => contractNotImplemented("CommunityHealthAgent.create"),
  },
  HomeVisit: { filter: async () => contractNotImplemented("HomeVisit") },
  ACSTask: { filter: async () => contractNotImplemented("ACSTask") },
  CitizenRecord: {
    filter: async () => contractNotImplemented("CitizenRecord"),
  },
  CardiovascularRisk: {
    filter: async () => contractNotImplemented("CardiovascularRisk"),
  },
  AedesFocus: { filter: async () => contractNotImplemented("AedesFocus") },
  WomensHealthTracking: {
    filter: async () => contractNotImplemented("WomensHealthTracking"),
  },
  Notification: { filter: async () => contractNotImplemented("Notification") },
  AuditLog: { filter: async () => contractNotImplemented("AuditLog") },
  TerritoryArea: {
    filter: async () => contractNotImplemented("TerritoryArea.filter"),
    create: async () => contractNotImplemented("TerritoryArea.create"),
  },
  CitizenLocation: {
    filter: async () => contractNotImplemented("CitizenLocation"),
  },
  PointOfInterest: {
    filter: async () => contractNotImplemented("PointOfInterest.filter"),
    create: async () => contractNotImplemented("PointOfInterest.create"),
  },
  Citizen: { filter: async () => contractNotImplemented("Citizen") },
  Report: {
    filter: async () => contractNotImplemented("Report.filter"),
    create: async () => contractNotImplemented("Report.create"),
  },
  SavedSearch: {
    filter: async () => contractNotImplemented("SavedSearch.filter"),
    create: async () => contractNotImplemented("SavedSearch.create"),
    delete: async () => contractNotImplemented("SavedSearch.delete"),
  },
  AlertRule: {
    filter: async () => contractNotImplemented("AlertRule.filter"),
    create: async () => contractNotImplemented("AlertRule.create"),
    update: async () => contractNotImplemented("AlertRule.update"),
    delete: async () => contractNotImplemented("AlertRule.delete"),
  },
  Permission: {
    filter: async () => contractNotImplemented("Permission.filter"),
    create: async () => contractNotImplemented("Permission.create"),
    update: async () => contractNotImplemented("Permission.update"),
    delete: async () => contractNotImplemented("Permission.delete"),
  },
  User: {
    filter: async () => contractNotImplemented("User.filter"),
    create: async () => contractNotImplemented("User.create"),
    update: async () => contractNotImplemented("User.update"),
    delete: async () => contractNotImplemented("User.delete"),
  },
  PECConnection: {
    filter: async () => contractNotImplemented("PECConnection.filter"),
    create: async () => contractNotImplemented("PECConnection.create"),
    update: async () => contractNotImplemented("PECConnection.update"),
    delete: async () => contractNotImplemented("PECConnection.delete"),
  },
  AlertThreshold: {
    filter: async () => contractNotImplemented("AlertThreshold.filter"),
    create: async () => contractNotImplemented("AlertThreshold.create"),
    update: async () => contractNotImplemented("AlertThreshold.update"),
    delete: async () => contractNotImplemented("AlertThreshold.delete"),
  },
  Goal: {
    filter: async () => contractNotImplemented("Goal.filter"),
    create: async () => contractNotImplemented("Goal.create"),
    update: async () => contractNotImplemented("Goal.update"),
    delete: async () => contractNotImplemented("Goal.delete"),
  },
  DuplicateGroup: {
    filter: async () => contractNotImplemented("DuplicateGroup.filter"),
    update: async () => contractNotImplemented("DuplicateGroup.update"),
    delete: async () => contractNotImplemented("DuplicateGroup.delete"),
  },
  ACSGoal: {
    filter: async () => contractNotImplemented("ACSGoal.filter"),
    create: async () => contractNotImplemented("ACSGoal.create"),
    update: async () => contractNotImplemented("ACSGoal.update"),
    delete: async () => contractNotImplemented("ACSGoal.delete"),
  },
  ACSAuditLog: { filter: async () => contractNotImplemented("ACSAuditLog") },
  Task: {
    filter: async () => contractNotImplemented("Task.filter"),
    create: async () => contractNotImplemented("Task.create"),
    update: async () => contractNotImplemented("Task.update"),
    delete: async () => contractNotImplemented("Task.delete"),
  },
  CitizenIndicatorStatus: {
    filter: async () => contractNotImplemented("CitizenIndicatorStatus"),
  },
};

export default entities;
export const trpcAdapter = entities;
export { entities as trpc };
