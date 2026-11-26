import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { firstApsCompetence } from "@shared/aps-competence";
import { INDICATOR_NAMES, OPERATIONAL_METRIC_CODES } from "@shared/aps-indicators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportData, ReportKind, ReportSection, ReportStatus } from "../../../backend/local/reports-data";
import { formatPecNumber, pecJson, usePecScope } from "./pec";
import {
  diagnosisSystems, groupsFor, loadReportModels, readReportView, reportFromPath, reports, sources, storeReportModels,
  type OptionMap, type ReportView, type SavedReport,
} from "./reports-options";

const reportStatus: Record<ReportStatus, { label: string; colors: string }> = {
  READY: { label: "Observado no PEC", colors: "bg-emerald-50 text-emerald-900" },
  PARTIAL: { label: "Evidência parcial", colors: "bg-amber-50 text-amber-900" },
  NO_DATA: { label: "Sem registros", colors: "bg-slate-100 text-slate-800" },
  SOURCE_PENDING: { label: "Fonte pendente", colors: "bg-amber-50 text-amber-900" },
  API_UNAVAILABLE: { label: "Consulta indisponível", colors: "bg-rose-50 text-rose-900" },
};
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const metricOptions = Object.fromEntries(OPERATIONAL_METRIC_CODES.map(code => [code, `${code} · ${INDICATOR_NAMES[code]}`]));
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });
const reportHref = (kind: ReportKind, scope: string) => `/relatorios/${kind}${scope ? `?${scope}` : ""}`;

function Control({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">{label}{children}</label>;
}

function Options({ options }: { options: OptionMap }) {
  return <>{Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</>;
}

function ReportNav({ active, scope }: { active?: ReportKind; scope: string }) {
  return (
    <nav aria-label="Tipos de relatório" className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
      {(Object.keys(reports) as ReportKind[]).map(kind => (
        <Link key={kind} to={reportHref(kind, scope)} aria-current={active === kind ? "page" : undefined}
          className={active === kind ? "rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            : "rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"}>
          {reports[kind].label}
        </Link>
      ))}
    </nav>
  );
}

function formatDate(date: string) {
  return date.split("-").reverse().join("/");
}

function ReportSectionCard({ section }: { section: ReportSection }) {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const status = reportStatus[section.status];
  const pages = Math.ceil(section.rows.length / pageSize);
  const rows = section.rows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug"><h2>{section.title}</h2></CardTitle>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.colors}`}>{status.label}</span>
        </div>
        <p className="break-words text-xs text-muted-foreground">{section.source}</p>
        {(section.firstObserved || section.lastObserved) && (
          <p className="text-xs text-muted-foreground">
            {section.firstObserved && <>Registros desde <time dateTime={section.firstObserved}>{formatDate(section.firstObserved)}</time></>}
            {section.firstObserved && section.lastObserved && " · "}
            {section.lastObserved && <>Último registro observado em <time dateTime={section.lastObserved}>{formatDate(section.lastObserved)}</time></>}
          </p>
        )}
      </CardHeader>
      {(section.reason || rows.length > 0) && (
        <CardContent className="space-y-3">
          {section.reason && <p className="text-sm text-slate-700">{section.reason}</p>}
          {rows.length > 0 && (
            <Table aria-label={section.title}>
              <TableHeader><TableRow>
                {section.columns.map(column => <TableHead key={column.key} scope="col">{column.label}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>{rows.map((row, index) => (
                <TableRow key={(page - 1) * pageSize + index}>
                  {section.columns.map(({ key }) => (
                    <TableCell key={key} className={typeof row[key] === "number" ? "tabular-nums font-medium" : "min-w-max"}>
                      {typeof row[key] === "number" ? formatPecNumber.format(row[key]) : row[key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
          {pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <span aria-live="polite">Página {page} de {pages} · {formatPecNumber.format(section.rows.length)} linhas</span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page === 1}
                  aria-label={`Página anterior de ${section.title}`} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= pages}
                  aria-label={`Próxima página de ${section.title}`} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ReportModels({ view, apply }: { view: ReportView; apply: (view: ReportView) => void }) {
  const [models, setModels] = useState(loadReportModels);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  function persist(next: SavedReport[], message: string) {
    setNotice("");
    setError("");
    try {
      storeReportModels(next);
      setModels(next);
      setNotice(message);
      return true;
    } catch {
      setError("O navegador não permitiu gravar a configuração do relatório.");
      return false;
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected && models.length >= 25) {
      setError("O navegador já tem 25 modelos. Escolha um modelo para atualizar ou excluir.");
      return;
    }
    if (!name.trim()) {
      setError("Nomeie o modelo antes de salvar.");
      return;
    }
    const model = { ...view, name: name.trim(), id: selected || crypto.randomUUID() };
    const next = selected ? models.map(item => item.id === selected ? model : item) : [...models, model];
    if (persist(next, "Modelo salvo neste navegador.")) setSelected(model.id);
  }

  function choose(id: string) {
    const model = models.find(item => item.id === id);
    setSelected(model?.id ?? "");
    setName(model?.name ?? "");
    setNotice("");
    setError("");
    if (model) apply(model);
  }

  function remove() {
    if (persist(models.filter(item => item.id !== selected), "Modelo excluído deste navegador.")) {
      setSelected("");
      setName("");
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader><CardTitle className="text-base"><h2>Modelos deste navegador</h2></CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]" onSubmit={save}>
          <Control label="Modelo salvo"><select className={selectClass} value={selected} onChange={event => choose(event.target.value)}>
            <option value="">Novo modelo</option>
            {models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
          </select></Control>
          <Control label="Nome do modelo"><Input required maxLength={70} value={name} onChange={event => setName(event.target.value)} /></Control>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary">{selected ? "Atualizar modelo" : "Salvar modelo"}</Button>
            {selected && <Button type="button" variant="outline" onClick={remove}>Excluir modelo</Button>}
          </div>
        </form>
        <p className="text-xs text-muted-foreground">A configuração usa a unidade, a equipe e a competência selecionadas quando você abre o modelo.</p>
        {notice && <p role="status" className="text-sm text-emerald-900">{notice}</p>}
        {error && <p role="alert" className="text-sm text-rose-900">{error}</p>}
      </CardContent>
    </Card>
  );
}

function ReportPage({ kind, central }: { kind: ReportKind; central: boolean }) {
  const [search, setSearch] = useSearchParams();
  const scope = usePecScope();
  const view = readReportView(kind, search);
  const groups = groupsFor(kind, view.source);
  const byIndicator = kind === "comparativo" ? view.groupBy !== "microarea" : kind === "personalizados" && view.source === "indicadores";
  const byDiagnosis = kind === "incidencia" || (kind === "personalizados" && view.source === "diagnosticos");
  const teamSeries = byIndicator && view.groupBy === "tempo";
  const compareTeams = byIndicator && view.groupBy === "equipes";
  const cnes = scope.team?.cnes ?? "";
  const requestedIne = search.get("ine");
  const ine = scope.unitTeams.find(team => team.ine === requestedIne)?.ine ?? (teamSeries ? scope.team?.ine ?? "" : "");
  const monthParam = search.get("competencia") ?? search.get("month") ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) && monthParam >= firstApsCompetence && monthParam <= scope.currentMonth
    ? monthParam : scope.month;
  const apiParams = new URLSearchParams({ cnes, month });
  if (ine && !compareTeams) apiParams.set("ine", ine);
  if (groups) apiParams.set("groupBy", view.groupBy);
  if (byIndicator) apiParams.set("code", view.code);
  if (kind === "personalizados") apiParams.set("source", view.source);
  if (byDiagnosis) apiParams.set(kind === "personalizados" ? "system" : "source", view.system);
  const navParams = new URLSearchParams();
  if (cnes) navParams.set("cnes", cnes);
  if (ine) navParams.set("ine", ine);
  if (month) navParams.set("competencia", month);

  const reportQuery = useQuery({
    queryKey: ["pec-report", kind, apiParams.toString()],
    enabled: Boolean(cnes && month && (!teamSeries || ine)),
    retry: false,
    queryFn: ({ signal }) => pecJson<ReportData>(`reports/${kind}`, apiParams, signal),
  });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  function update(changes: Record<string, string>) {
    setExportError("");
    setSearch(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }

  async function download() {
    setExporting(true);
    setExportError("");
    try {
      const response = await fetch(`/api/local/reports/${kind}.csv?${apiParams}`, { cache: "no-store" });
      if (response.status === 401) {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/csv")) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "A exportação do relatório não pôde ser concluída.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `sus-analytics-${kind}-${month}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "A exportação do relatório falhou.");
    } finally {
      setExporting(false);
    }
  }

  const data = reportQuery.data;
  const canExport = data?.sections.some(section => section.rows.length > 0) ?? false;
  const productionTotals = (kind === "producao" || (kind === "personalizados" && view.source === "producao")) && view.groupBy === "total";
  const queryError = scope.directory.error ?? reportQuery.error;

  return (
    <div className="mx-auto max-w-[1450px] space-y-6 px-4 py-6 sm:px-6">
      <ReportNav active={kind} scope={navParams.toString()} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{central ? "Central de Relatórios" : reports[kind].title}</h1>
          <p className="text-sm text-slate-700">{reports[kind].detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={scope.directory.isFetching || reportQuery.isFetching}
            onClick={() => void (cnes && month ? reportQuery.refetch() : scope.directory.refetch())}>
            <RefreshCw className="size-4" aria-hidden="true" /> Atualizar
          </Button>
          <Button type="button" disabled={!canExport || exporting} onClick={() => void download()}>
            <Download className="size-4" aria-hidden="true" /> {exporting ? "Gerando CSV…" : "Exportar CSV"}
          </Button>
        </div>
      </header>
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 xl:grid-cols-3">
          <Control label="Unidade (CNES)"><select className={selectClass} disabled={!scope.units.length} value={cnes}
            onChange={event => update({ cnes: event.target.value, ine: "" })}>
            {!scope.units.length && <option value="">Unidade indisponível</option>}
            {scope.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.id}</option>)}
          </select></Control>
          <Control label="Equipe (INE)"><select className={selectClass} disabled={compareTeams || !scope.unitTeams.length} value={compareTeams ? "" : ine}
            onChange={event => update({ ine: event.target.value })}>
            {(!teamSeries || !scope.unitTeams.length) && <option value="">{compareTeams ? "Equipes ativas da unidade" : "Todos os registros da unidade"}</option>}
            {scope.unitTeams.map(team => <option key={team.ine} value={team.ine}>{team.name} · {team.ine}</option>)}
          </select></Control>
          <Control label="Competência"><Input type="month" lang="pt-BR" min={firstApsCompetence} max={scope.currentMonth || undefined}
            value={month} disabled={!scope.currentMonth} onChange={event => update({ competencia: event.target.value, month: "" })} /></Control>
          {kind === "personalizados" && <Control label="Fonte do relatório"><select className={selectClass} value={view.source}
            onChange={event => update({ source: event.target.value, groupBy: "" })}><Options options={sources} /></select></Control>}
          {groups && <Control label={byIndicator || kind === "comparativo" ? "Tipo de comparação" : "Agrupamento"}>
            <select className={selectClass} value={view.groupBy} onChange={event => update({ groupBy: event.target.value })}>
              <Options options={groups} />
            </select>
          </Control>}
          {byIndicator && <Control label="Indicador Brasil 360"><select className={selectClass} value={view.code}
            onChange={event => update({ code: event.target.value })}><Options options={metricOptions} /></select></Control>}
          {byDiagnosis && <Control label="Classificação clínica"><select className={selectClass} value={view.system}
            onChange={event => update({ system: event.target.value })}><Options options={diagnosisSystems} /></select></Control>}
        </CardContent>
      </Card>
      {kind === "personalizados" && <ReportModels view={view} apply={model =>
        update({ source: model.source, groupBy: model.groupBy, system: model.system, code: model.code })} />}
      {exportError && <p role="alert" className="text-sm text-rose-900">{exportError}</p>}
      {queryError && <p role="alert" className="text-sm text-rose-900">{queryError.message}</p>}
      {!queryError && (scope.directory.isPending || (cnes && month && reportQuery.isPending)) &&
        <p role="status" className="text-sm text-slate-700">Consultando o PEC local…</p>}
      {scope.directory.isSuccess && !cnes && <p role="status">O PEC não retornou unidades com equipes ativas.</p>}
      {data && <>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-700">
          <p>{data.scope.unitName} · {data.scope.teamName ?? (compareTeams ? "Equipes ativas da unidade" : "Todos os registros da unidade")}</p>
          <p>Consulta ao PEC local em <time dateTime={data.calculatedAt}>{dateFormatter.format(new Date(data.calculatedAt))}</time></p>
        </div>
        <div className={`grid gap-4 ${productionTotals ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
          {data.sections.map(section => <ReportSectionCard key={`${apiParams}/${data.calculatedAt}/${section.id}`} section={section} />)}
        </div>
        <details className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <summary className="cursor-pointer font-semibold text-slate-900">Critérios e fontes</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {data.notes.map(note => <li key={note}>{note}</li>)}
            <li>As datas nas seções indicam registros observados na origem em toda a instalação.</li>
            {data.links.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noreferrer" className="text-blue-800 underline">{link.label}</a></li>)}
          </ul>
        </details>
      </>}
    </div>
  );
}

export function PecReportsPage() {
  const { report } = useParams();
  const kind = reportFromPath(report);
  return kind ? <ReportPage kind={kind} key={kind} central={!report} /> : (
    <div className="mx-auto max-w-[1450px] space-y-6 px-4 py-6 sm:px-6">
      <ReportNav scope="" />
      <p className="flex items-center gap-2 text-slate-700" role="status"><FileText className="size-5" aria-hidden="true" /> Escolha um dos relatórios disponíveis.</p>
    </div>
  );
}
