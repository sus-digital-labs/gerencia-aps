import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Home, Trophy, Users } from "lucide-react";
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  loadAcsDirectory, loadAcsOverview, loadAcsRanking, loadAcsTimeline,
} from "../../../backend/local/acs-visits";
import type { loadAcsTasks } from "../../../backend/local/acs-tasks";
import { formatPecNumber, pecJson } from "./pec";

type Directory = Awaited<ReturnType<typeof loadAcsDirectory>>;
type Overview = Awaited<ReturnType<typeof loadAcsOverview>>;
type Ranking = Awaited<ReturnType<typeof loadAcsRanking>>;
type Timeline = Awaited<ReturnType<typeof loadAcsTimeline>>;
type Tasks = Awaited<ReturnType<typeof loadAcsTasks>>;

const pages = [
  { path: "/acs", label: "Visão geral", title: "Gestão ACS", icon: Users },
  { path: "/acs/ranking", label: "Ranking", title: "Ranking ACS/TACS", icon: Trophy },
  { path: "/acs/timeline", label: "Linha do tempo", title: "Linha do tempo de visitas", icon: CalendarDays },
  { path: "/acs/tarefas", label: "Tarefas", title: "Tarefas de acompanhamento", icon: ClipboardList },
] as const;
const cboLabels = { "515105": "ACS", "322255": "TACS" } as const;
const outcomes = { "1": "Realizada", "2": "Recusada", "3": "Ausente", unknown: "Não informado" } as const;
const number = (value: number) => formatPecNumber.format(value);
const formatDay = (value: string) => value.split("-").reverse().join("/");
const formatCbo = (value: string) => cboLabels[value as keyof typeof cboLabels] ?? value;
const formatArea = (value: string) => value === "FA" ? "Fora de área" : value === "unknown" ? "Não identificada" : value;
const formatOutcome = (value: string) => outcomes[value as keyof typeof outcomes] ?? outcomes.unknown;

function useAcsData<T>(resource: string, params?: URLSearchParams, enabled = true) {
  return useQuery({
    queryKey: ["pec-acs", resource, params?.toString()], enabled,
    queryFn: ({ signal }) => pecJson<T>(`acs/${resource}`, params, signal),
    retry: false, refetchOnWindowFocus: false, gcTime: 0,
    staleTime: resource === "directory" || resource === "overview" ? 60_000 : 0,
  });
}

function Data<T>({ query, children }: { query: UseQueryResult<T, Error>; children: (value: T) => ReactNode }) {
  if (query.isError) return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm" role="alert">
      {query.error.message}
      <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>
    </div>
  );
  if (!query.data) return <p role="status" className="rounded-lg border bg-card p-4 text-sm">Consultando o PEC local…</p>;
  return children(query.data);
}

function SourceNotice({ period }: { period: Overview["period"] }) {
  const last = period.latestObserved && formatDay(period.latestObserved);
  const message = !last ? "A cópia local ainda não tem visitas ACS/TACS no intervalo pesquisável."
    : period.coverage === "outside" ? "A competência selecionada está fora das datas observadas de visitas ACS/TACS no PEC."
      : period.coverage === "partial" ? "A competência inclui dias fora do intervalo observado no PEC." : null;
  return (
    <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
      <p>As visitas e os desfechos vêm da cópia local do e-SUS PEC.
        {last && <> Última visita ACS/TACS observada na cópia em {last}.</>}
      </p>
      {message && <p className="mt-1 font-medium text-foreground" role="status">{message}</p>}
    </div>
  );
}

function Field({ label, value, onChange, children }: {
  label: string; value: string; onChange: (value: string) => void; children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
      {label}
      <select value={value} onChange={event => onChange(event.target.value)}
        className="h-9 max-w-full rounded-md border border-input bg-background px-3 font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        {children}
      </select>
    </label>
  );
}

function Metrics({ items }: { items: Array<[string, number | null]> }) {
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums">
            {value === null ? <span aria-label="Indisponível">—</span> : number(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-sm text-muted-foreground" role="status">{children}</p>;
}

function Pagination({ page, hasNextPage, setPage }: { page: number; hasNextPage: boolean; setPage: (page: number) => void }) {
  return (
    <nav aria-label="Paginação" className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm">
      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
        <ChevronLeft aria-hidden="true" /> Anterior
      </Button>
      <span>Página {page}</span>
      <Button size="sm" variant="outline" disabled={!hasNextPage} onClick={() => setPage(page + 1)}>
        Próxima <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}

function OverviewContent({ data, scopeSearch }: { data: Overview; scopeSearch: URLSearchParams }) {
  const { totals, assignmentCount, period } = data;
  const observed = period.coverage !== "outside";
  const timeline = (name: string, value: string) => ({ pathname: "/acs/timeline", search: `?${new URLSearchParams([
    ...scopeSearch.entries(), [name, value],
  ])}` });
  return (
    <>
      <Metrics items={[
        ["Visitas registradas", observed ? totals.recorded : null],
        ["Visitas realizadas", observed ? totals.completed : null],
        ["Ausências e recusas", observed ? totals.absent + totals.refused : null],
        ["Profissionais com lotação auditada", assignmentCount],
      ]} />
      <Card>
        <CardHeader>
          <CardTitle>Profissionais ACS e TACS</CardTitle>
          <CardDescription>
            Lotação conforme a última situação auditada no PEC até {formatDay(period.asOf)}. A produção considera as visitas no recorte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.unnamedVisits > 0 && <p className="mb-3 text-sm text-muted-foreground">
            {number(data.unnamedVisits)} visita(s) sem autoria identificada no PEC aparecem nos totais da equipe.
          </p>}
          {data.professionals.length ? (
            <Table aria-label="Profissionais ACS e TACS">
              <TableHeader><TableRow>
                <TableHead>Profissional</TableHead><TableHead>Ocupação</TableHead><TableHead>Lotação auditada</TableHead>
                <TableHead className="text-right">Registradas</TableHead><TableHead className="text-right">Realizadas</TableHead>
              </TableRow></TableHeader>
              <TableBody>{data.professionals.map((row, index) => (
                <TableRow key={row.id ?? `assignment-${index}`}>
                  <TableCell className="font-medium">{row.id ? (
                    <Link className="underline underline-offset-4" to={timeline("profissional", row.id)}>{row.name ?? "Nome indisponível"}</Link>
                  ) : row.name ?? "Nome indisponível"}</TableCell>
                  <TableCell>{row.cbos.map(formatCbo).join(" / ")}</TableCell>
                  <TableCell>{row.assigned ? "Ativa no recorte" : "Sem evidência ativa"}</TableCell>
                  <TableCell className="text-right tabular-nums">{observed ? number(row.recorded) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{observed ? number(row.completed) : "—"}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <Empty>Nenhum profissional ACS/TACS identificado neste recorte.</Empty>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Home className="size-4" aria-hidden="true" /> Visitas por microárea</CardTitle>
          <CardDescription>Microárea registrada na ficha de visita.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.areas.length ? (
            <Table aria-label="Visitas por microárea">
              <TableHeader><TableRow>
                <TableHead>Microárea</TableHead><TableHead className="text-right">Registradas</TableHead>
                <TableHead className="text-right">Realizadas</TableHead><TableHead className="text-right">Ausências</TableHead>
                <TableHead className="text-right">Recusas</TableHead><TableHead className="text-right">Sem desfecho</TableHead>
              </TableRow></TableHeader>
              <TableBody>{data.areas.map(row => (
                <TableRow key={row.area}>
                  <TableCell><Link className="underline underline-offset-4" to={timeline("microarea", row.area)}>{formatArea(row.area)}</Link></TableCell>
                  {[row.recorded, row.completed, row.absent, row.refused, row.unknown].map((value, index) => (
                    <TableCell key={index} className="text-right tabular-nums">{number(value)}</TableCell>
                  ))}
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <Empty>Nenhuma visita com microárea no recorte consultado.</Empty>}
        </CardContent>
      </Card>
    </>
  );
}

function AcsRanking({ params }: { params: URLSearchParams }) {
  const query = useAcsData<Ranking>("ranking", params);
  return <Data query={query}>{data => (
    <Card>
      <CardHeader>
        <CardTitle>Visitas realizadas por profissional</CardTitle>
        <CardDescription>Ordem pelo total de visitas realizadas no PEC. Totais iguais compartilham a posição.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.unattributedVisits > 0 && <p className="mb-3 text-sm text-muted-foreground">
          {number(data.unattributedVisits)} visita(s) do recorte têm autoria indisponível.
        </p>}
        {data.rows.length ? (
          <Table aria-label="Ranking ACS/TACS">
            <TableHeader><TableRow>
              <TableHead>Posição</TableHead><TableHead>Profissional</TableHead><TableHead>Ocupação</TableHead>
              <TableHead className="text-right">Realizadas</TableHead><TableHead className="text-right">Registradas</TableHead>
              <TableHead className="text-right">Ausências</TableHead><TableHead className="text-right">Recusas</TableHead>
              <TableHead className="text-right">Microáreas</TableHead>
            </TableRow></TableHeader>
            <TableBody>{data.rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium tabular-nums">{row.rank}º</TableCell>
                <TableCell className="font-medium">{row.name ?? "Nome indisponível"}</TableCell>
                <TableCell>{row.cbos.map(formatCbo).join(" / ")}</TableCell>
                {[row.completed, row.recorded, row.absent, row.refused, row.areaCount].map((value, index) => (
                  <TableCell key={index} className="text-right tabular-nums">{number(value)}</TableCell>
                ))}
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : <Empty>Nenhuma visita com autoria identificada neste recorte.</Empty>}
      </CardContent>
    </Card>
  )}</Data>;
}

function AcsTimeline({ params, setPage }: { params: URLSearchParams; setPage: (page: number) => void }) {
  const query = useAcsData<Timeline>("timeline", params);
  return <Data query={query}>{data => (
    <Card>
      <CardHeader>
        <CardTitle>Visitas registradas</CardTitle>
        <CardDescription>A fonte registra a data da visita. Dentro do mesmo dia, a listagem segue a ordem interna do PEC.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.rows.length ? (
          <Table aria-label="Linha do tempo de visitas">
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Profissional</TableHead><TableHead>Cidadão</TableHead>
              <TableHead>Microárea</TableHead><TableHead>Desfecho</TableHead><TableHead>Motivos registrados</TableHead>
            </TableRow></TableHeader>
            <TableBody>{data.rows.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="tabular-nums"><time dateTime={row.day}>{formatDay(row.day)}</time></TableCell>
                <TableCell>{row.name ?? "Não identificado"} <Badge variant="outline">{formatCbo(row.cbo)}</Badge></TableCell>
                <TableCell>{row.citizen ?? "Sem vínculo nominal disponível"}</TableCell>
                <TableCell>{formatArea(row.area)}</TableCell>
                <TableCell><Badge variant={row.outcome === "1" ? "secondary" : "outline"}>{formatOutcome(row.outcome)}</Badge></TableCell>
                <TableCell className="whitespace-normal">{row.reasons.join(", ") || "Não informado"}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : <Empty>Nenhuma visita registrada neste recorte.</Empty>}
        <Pagination {...data} setPage={setPage} />
      </CardContent>
    </Card>
  )}</Data>;
}

async function changeTask(input: { token: string; status: "open" | "completed" }) {
  const response = await fetch("/api/local/acs/tasks/status", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    throw new Error("Sua sessão expirou.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "A situação da tarefa não pôde ser atualizada.");
  }
}

function AcsTasks({ params, setPage }: { params: URLSearchParams; setPage: (page: number) => void }) {
  const query = useAcsData<Tasks>("tasks", params);
  const client = useQueryClient();
  const change = useMutation({
    mutationFn: changeTask,
    onSuccess: async (_value, input) => {
      toast.success(input.status === "completed" ? "Tarefa concluída no SUS Analytics." : "Tarefa reaberta no SUS Analytics.");
      await client.invalidateQueries({ queryKey: ["pec-acs", "tasks"] });
    },
  });
  return <Data query={query}>{data => (
    <>
      <Metrics items={[
        ["Revisões identificadas no PEC", data.period.coverage === "outside" ? null : data.counts.candidates],
        ["Pendentes no aplicativo", data.period.coverage === "outside" ? null : data.counts.open],
        ["Concluídas no aplicativo", data.period.coverage === "outside" ? null : data.counts.completed],
      ]} />
      <Card>
        <CardHeader>
          <CardTitle>Revisões por ausência ou recusa</CardTitle>
          <CardDescription>
            Última tentativa no mês para cidadãos atualmente vinculados à equipe, sem visita realizada pela equipe no mesmo dia ou depois, segundo a cópia local.
            A situação operacional fica registrada no SUS Analytics Web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data.stateAvailable && <p className="mb-3 text-sm" role="status">O armazenamento da situação operacional está indisponível.</p>}
          {change.isError && <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {change.error.message}
            <Button size="sm" variant="outline" onClick={() => { change.reset(); void query.refetch(); }}>
              Atualizar tarefas
            </Button>
          </div>}
          {data.rows.length ? (
            <Table aria-label="Tarefas de acompanhamento">
              <TableHeader><TableRow>
                <TableHead>Cidadão</TableHead><TableHead>Tentativa</TableHead><TableHead>Desfecho no PEC</TableHead>
                <TableHead>Profissional da visita</TableHead><TableHead>Microárea</TableHead>
                <TableHead>Situação operacional</TableHead><TableHead>Ação</TableHead>
              </TableRow></TableHeader>
              <TableBody>{data.rows.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="tabular-nums"><time dateTime={item.day}>{formatDay(item.day)}</time></TableCell>
                  <TableCell>{formatOutcome(item.outcome)}</TableCell>
                  <TableCell>{item.professional ?? "Não identificado"}</TableCell>
                  <TableCell>{formatArea(item.area)}</TableCell>
                  <TableCell>{item.status === "completed" ? "Concluída" : item.status === "open" ? "Pendente" : "Indisponível"}
                    {item.updatedAt && <span className="block text-xs text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleString("pt-BR", {
                        timeZone: "America/Bahia", dateStyle: "short", timeStyle: "short",
                      })}
                    </span>}
                  </TableCell>
                  <TableCell>{item.token && item.status && (
                    <Button size="sm" variant="outline" disabled={change.isPending}
                      onClick={() => change.mutate({ token: item.token!, status: item.status === "completed" ? "open" : "completed" })}>
                      {item.status === "completed" ? "Reabrir" : "Concluir"}
                    </Button>
                  )}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : data.stateAvailable || params.get("status") !== "completed"
            ? <Empty>Nenhuma tarefa encontrada com estes filtros.</Empty>
            : <Empty>A consulta de tarefas concluídas depende do armazenamento local.</Empty>}
          <Pagination {...data} setPage={setPage} />
        </CardContent>
      </Card>
    </>
  )}</Data>;
}

function ScopedAcs({ directory, page }: { directory: Directory; page: typeof pages[number] }) {
  const [search, setSearch] = useSearchParams();
  const preferred = directory.teams.find(team => team.typeCode === "70" && team.hasRoster) ?? directory.teams[0];
  const cnes = directory.teams.some(team => team.cnes === search.get("cnes")) ? search.get("cnes") : preferred?.cnes;
  const unitTeams = directory.teams.filter(team => team.cnes === cnes);
  const team = unitTeams.find(team => team.ine === (search.get("ine") ?? preferred?.ine)) ?? unitTeams[0];
  const units = [...new Map(directory.teams.map(team => [team.cnes, team.unitName]))];
  const month = search.get("competencia") ?? directory.defaultMonth;
  const competence = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) && month >= directory.minMonth && month <= directory.maxMonth
    ? month : directory.defaultMonth;
  const scopeSearch = new URLSearchParams(team ? { cnes: team.cnes, ine: team.ine, competencia: competence } : undefined);
  const apiScope = new URLSearchParams(team ? { cnes: team.cnes, ine: team.ine, month: competence } : undefined);
  const overview = useAcsData<Overview>("overview", apiScope, Boolean(team));
  const ranking = page.path === "/acs/ranking";
  const timeline = page.path === "/acs/timeline";
  const tasks = page.path === "/acs/tarefas";
  const area = search.get("microarea") ?? "";
  const cbo = search.get("cbo") ?? "";
  const professional = search.get("profissional") ?? "";
  const day = search.get("data") ?? "";
  const outcome = search.get("desfecho") ?? "";
  const taskStatus = search.get("situacao") ?? "open";
  const currentPage = search.get("pagina") ?? "1";
  const apiParams = new URLSearchParams(apiScope);
  if (area && (ranking || timeline || tasks)) apiParams.set("area", area);
  if (cbo && (ranking || timeline)) apiParams.set("cbo", cbo);
  if (timeline && professional) apiParams.set("professional", professional);
  if (timeline && day) apiParams.set("day", day);
  if (timeline && outcome) apiParams.set("outcome", outcome);
  if (tasks) apiParams.set("status", taskStatus);
  if (timeline || tasks) apiParams.set("page", currentPage);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(search);
    for (const [name, entry] of scopeSearch) next.set(name, entry);
    if (key !== "pagina") next.delete("pagina");
    if (value) next.set(key, value);
    else next.delete(key);
    setSearch(next);
  }

  function chooseScope(chosen: Directory["teams"][number] | undefined, chosenMonth: string) {
    if (chosen) setSearch({ cnes: chosen.cnes, ine: chosen.ine, competencia: chosenMonth });
  }

  const areas = new Set(overview.data?.areas.map(item => item.area));
  if (area) areas.add(area);
  const agents = overview.data?.professionals.filter(item => item.id) ?? [];

  return (
    <>
      <nav aria-label="Gestão ACS" className="flex flex-wrap gap-2">
        {pages.map(item => (
          <Button key={item.path} size="sm" variant={item.path === page.path ? "default" : "outline"} asChild>
            <NavLink end to={{ pathname: item.path, search: `?${scopeSearch}` }}>{item.label}</NavLink>
          </Button>
        ))}
      </nav>
      {team ? (
        <>
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Unidade" value={team.cnes} onChange={value => chooseScope(directory.teams.find(item => item.cnes === value), competence)}>
                {units.map(([code, label]) => <option key={code} value={code}>{label} · CNES {code}</option>)}
              </Field>
              <Field label="Equipe" value={team.ine} onChange={value => chooseScope(unitTeams.find(item => item.ine === value), competence)}>
                {unitTeams.map(item => <option key={item.ine} value={item.ine}>{item.name} · INE {item.ine}</option>)}
              </Field>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                Competência
                <Input type="month" min={directory.minMonth} max={directory.maxMonth} value={competence}
                  onChange={event => {
                    const selected = event.target.value;
                    if (selected && selected >= directory.minMonth && selected <= directory.maxMonth) chooseScope(team, selected);
                  }} />
              </label>
              {(ranking || timeline || tasks) && <Field label="Microárea da visita" value={area} onChange={value => setFilter("microarea", value)}>
                <option value="">Todas</option>
                {[...areas].map(value => <option key={value} value={value}>{formatArea(value)}</option>)}
              </Field>}
              {(ranking || timeline) && <Field label="Ocupação" value={cbo} onChange={value => setFilter("cbo", value)}>
                <option value="">ACS e TACS</option>
                {Object.entries(cboLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Field>}
              {timeline && <>
                <Field label="Profissional da visita" value={professional} onChange={value => setFilter("profissional", value)}>
                  <option value="">Todos</option>
                  {agents.map(item => <option key={item.id} value={item.id!}>{item.name ?? "Nome indisponível"}</option>)}
                  {professional && !agents.some(item => item.id === professional) &&
                    <option value={professional}>Profissional selecionado</option>}
                </Field>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                  Data da visita
                  <Input type="date" value={day} min={`${competence}-01`}
                    max={overview.data?.period.asOf ?? directory.today}
                    onChange={event => {
                      const selected = event.target.value;
                      if (!selected || selected.startsWith(`${competence}-`) && selected <= directory.today) setFilter("data", selected);
                    }} />
                </label>
                <Field label="Desfecho no PEC" value={outcome} onChange={value => setFilter("desfecho", value)}>
                  <option value="">Todos</option>
                  {Object.entries(outcomes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Field>
              </>}
              {tasks && <Field label="Situação operacional" value={taskStatus} onChange={value => setFilter("situacao", value)}>
                <option value="open">Pendentes</option><option value="completed">Concluídas</option><option value="all">Todas</option>
              </Field>}
            </CardContent>
          </Card>
          <Data query={overview}>{data => (
            <>
              <SourceNotice period={data.period} />
              {page.path === "/acs" && <OverviewContent data={data} scopeSearch={scopeSearch} />}
            </>
          )}</Data>
          {ranking && <AcsRanking params={apiParams} />}
          {timeline && <AcsTimeline params={apiParams} setPage={value => setFilter("pagina", String(value))} />}
          {tasks && <AcsTasks params={apiParams} setPage={value => setFilter("pagina", String(value))} />}
        </>
      ) : <Empty>Nenhuma equipe ativa encontrada no PEC local.</Empty>}
    </>
  );
}

export function PecAcsPage() {
  const { pathname } = useLocation();
  const page = pages.find(item => item.path === pathname.replace(/\/$/, "")) ?? pages[0];
  const directory = useAcsData<Directory>("directory");
  const Icon = page.icon;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-6 py-4">
          <Icon className="size-6 text-blue-600" aria-hidden="true" />
          <h1 className="text-xl font-bold text-gray-900">{page.title}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-4 px-6 py-6">
        <Data query={directory}>{data => <ScopedAcs directory={data} page={page} />}</Data>
      </div>
    </div>
  );
}
