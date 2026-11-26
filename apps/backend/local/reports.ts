import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { type Express, type Request, type Response } from "express";
import { ZodError } from "zod";
import { currentApsCompetence } from "@shared/aps-competence";
import { readCvatComplements } from "./analytics/cvat-complements";
import { AggregateCache } from "./cache";
import { loadReport, parseReport, reportKindSchema, type ReportData, type ReportStatus } from "./reports-data";

const cache = new AggregateCache<ReportData>(45_000, 32);
const statusLabel: Record<ReportStatus, string> = {
  READY: "Observado no PEC", PARTIAL: "Evidência parcial", NO_DATA: "Sem registros",
  SOURCE_PENDING: "Fonte pendente", API_UNAVAILABLE: "Consulta indisponível",
};

function csvCell(value: string | number | null | undefined) {
  const safe = typeof value === "number" ? String(value).replace(".", ",") : value ?? "";
  const escaped = typeof value === "string" && (/^[\r\n\t]/.test(safe) || /^[\s\uFEFF]*[=+@-]/.test(safe)) ? `'${safe}` : safe;
  return `"${escaped.replaceAll('"', '""')}"`;
}

export function reportsCsv(report: ReportData) {
  const columns = new Map(report.sections.flatMap(section => section.columns.map(column => [column.key, column.label] as const)));
  const header = ["Relatório local", "Competência consultada", "CNES consultado", "INE consultado", "Unidade", "Equipe consultada",
    "Seção", "Origem", "Situação da seção", "Observado de (origem)", "Observado até (origem)", "Limite da seção", ...columns.values()];
  const lines = [header.map(csvCell).join(";")];
  for (const section of report.sections) {
    const context = [report.kind, report.scope.month, report.scope.cnes, report.scope.ine, report.scope.unitName, report.scope.teamName,
      section.title, section.source, statusLabel[section.status], section.firstObserved, section.lastObserved, section.reason];
    for (const row of section.rows.length ? section.rows : [{}]) {
      lines.push([...context, ...Array.from(columns.keys(), key => row[key])].map(csvCell).join(";"));
    }
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function reportRoute(format: "json" | "csv") {
  return async (req: Request, res: Response) => {
    const report = reportKindSchema.safeParse(req.params.kind);
    if (!report.success) {
      res.status(404).json({ message: "Relatório local desconhecido." });
      return;
    }
    try {
      const plan = parseReport(report.data, req.query);
      const complements = readCvatComplements();
      const key = JSON.stringify([report.data, currentApsCompetence(), complements.revision, Object.entries(req.query).sort()]);
      const { value } = await cache.read(key, () => loadReport(report.data, plan, complements), data =>
        !data.sections.some(section => section.status === "API_UNAVAILABLE"));
      if (format === "json") {
        res.json(value);
        return;
      }
      if (!value.sections.some(section => section.rows.length > 0)) {
        res.status(409).json({ message: "A consulta ainda não retornou linhas para exportar." });
        return;
      }
      res.attachment(`sus-analytics-${report.data}-${value.scope.month}.csv`);
      res.set("Content-Type", "text/csv; charset=utf-8").send(reportsCsv(value));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Confira os filtros da unidade, equipe, competência e agrupamento." });
      } else if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
        res.status(getHTTPStatusCodeFromError(error)).json({ message: error.message });
      } else {
        res.status(503).json({ message: "A consulta de relatórios do PEC local está temporariamente indisponível." });
      }
    }
  };
}

/** Instale após a verificação da sessão local e antes do fallback da API. */
export function mountReportRoutes(app: Pick<Express, "get">) {
  app.get("/api/local/reports/:kind.csv", reportRoute("csv"));
  app.get("/api/local/reports/:kind", reportRoute("json"));
}
