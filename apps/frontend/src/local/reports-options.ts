import { isIndicatorCode, type IndicatorCode } from "@shared/aps-indicators";
import type { ReportKind } from "../../../backend/local/reports-data";

export const reports = {
  producao: { label: "Produção", title: "Produção da atenção primária", detail: "Acompanhe atendimentos, visitas, procedimentos, atividades e doses registradas." },
  bpa: { label: "BPA", title: "Conferência de produção para BPA", detail: "Confira os procedimentos registrados por código e ocupação na competência." },
  ras: { label: "RAS", title: "Resumo de atendimentos · RAS", detail: "Acompanhe os registros de atendimento individual e odontológico por modalidade." },
  imunizacao: { label: "Imunização", title: "Imunização", detail: "Consulte as doses aplicadas por imunobiológico, dose ou dia." },
  comparativo: { label: "Comparativo", title: "Comparativo", detail: "Compare visitas entre microáreas ou acompanhe o mesmo indicador Brasil 360 entre equipes ou competências." },
  incidencia: { label: "Incidência", title: "Incidência · Registros observados", detail: "Consulte problemas avaliados e primeiros registros observados por classificação clínica." },
  personalizados: { label: "Personalizados", title: "Relatórios personalizados", detail: "Monte um relatório agregado do PEC e salve a configuração para reutilizar o mesmo agrupamento." },
} satisfies Record<ReportKind, { label: string; title: string; detail: string }>;

const aliases: Record<string, ReportKind> = {
  production: "producao", immunization: "imunizacao", comparison: "comparativo", incidence: "incidencia",
  custom: "personalizados", customizados: "personalizados", customreports: "personalizados",
};

export function reportFromPath(path?: string): ReportKind | undefined {
  if (!path) return "producao";
  const key = path.toLowerCase();
  return Object.hasOwn(reports, key) ? key as ReportKind : Object.hasOwn(aliases, key) ? aliases[key] : undefined;
}

export const sources = {
  producao: "Produção da atenção primária", bpa: "Procedimentos para conferência de BPA",
  ras: "Resumo dos atendimentos", imunizacao: "Doses aplicadas", visitas: "Visitas por microárea",
  diagnosticos: "Problemas avaliados", indicadores: "Indicadores Brasil 360",
} as const;

type ReportSource = keyof typeof sources;

export const productionGroups = { total: "Total por modelo", dia: "Dia", cbo: "Ocupação (CBO)", equipe: "Equipe (INE)" };
export const vaccineGroups = { dose: "Imunobiológico e dose", dia: "Dia da aplicação" };
export const comparisonGroups = { microarea: "Visitas por microárea", equipes: "Indicador entre equipes da unidade", tempo: "Evolução do indicador da equipe" };
export const indicatorGroups = { tempo: "Evolução do indicador da equipe", equipes: "Indicador entre equipes da unidade" };
export const diagnosisSystems = { cid: "CID-10", ciap: "CIAP-2" };

export type ReportView = { source: ReportSource; groupBy: string; system: keyof typeof diagnosisSystems; code: IndicatorCode };
export type OptionMap = Readonly<Record<string, string>>;

export function groupsFor(kind: ReportKind, source: ReportSource): OptionMap | undefined {
  if (kind === "comparativo") return comparisonGroups;
  const selected = kind === "personalizados" ? source : kind;
  if (selected === "producao") return productionGroups;
  if (selected === "imunizacao") return vaccineGroups;
  if (selected === "indicadores") return indicatorGroups;
}

export function readReportView(kind: ReportKind, search: URLSearchParams): ReportView {
  const requestedSource = search.get("source") ?? "";
  const source = Object.hasOwn(sources, requestedSource) ? requestedSource as ReportSource : "producao";
  const groups = groupsFor(kind, source);
  const requestedGroup = search.get("groupBy") ?? "";
  const groupBy = groups ? Object.hasOwn(groups, requestedGroup) ? requestedGroup : Object.keys(groups)[0] : "";
  const code = search.get("code") ?? "";
  return { source, groupBy, system: search.get("system") === "ciap" ? "ciap" : "cid", code: isIndicatorCode(code) ? code : "C1" };
}

export type SavedReport = ReportView & { id: string; name: string };
const storageKey = "sus-analytics-web-local-report-models-v1";

export function loadReportModels(): SavedReport[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item: Partial<SavedReport> | null) => {
      if (!item || typeof item.id !== "string" || typeof item.name !== "string" || !item.name.trim() || item.name.length > 70) return [];
      const params = new URLSearchParams({ source: item.source ?? "", groupBy: item.groupBy ?? "", system: item.system ?? "", code: item.code ?? "" });
      return [{ id: item.id, name: item.name, ...readReportView("personalizados", params) }];
    }).slice(0, 25);
  } catch {
    return [];
  }
}

export function storeReportModels(models: SavedReport[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(models));
}
