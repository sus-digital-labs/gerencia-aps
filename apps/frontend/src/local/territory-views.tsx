import { useState, type FormEvent } from "react";
import { MapPin } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { loadTerritory, TerritoryArea } from "../../../backend/local/modules-territory";
import { formatPecNumber, usePecScope } from "./pec";
import {
  areaLabel, ModuleFrame, ModuleNotice, ModulePanel, ModuleQueryState, ModuleScopeFilters, ModuleStats,
  shortDate, useScopedModule,
} from "./modules-ui";

type TerritoryData = Awaited<ReturnType<typeof loadTerritory>>;
type TerritoryView = "territory" | "microareas" | "remapping" | "smart-remapping";

const views = {
  territory: { title: "Mapa do Território", path: "/territorio" },
  microareas: { title: "Microáreas ACS", path: "/territorio/microareas" },
  remapping: { title: "Remapeamento Territorial", path: "/territorio/remapeamento" },
  "smart-remapping": { title: "Remapeamento Inteligente", path: "/territorio/remapeamento-inteligente" },
} satisfies Record<TerritoryView, { title: string; path: string }>;

function TerritoryMap({ cells }: { cells: TerritoryData["cells"] }) {
  const [selected, setSelected] = useState<number>();
  if (!cells.length) {
    return <p role="status" className="text-sm text-slate-600">Nenhum agrupamento com pelo menos cinco domicílios georreferenciados nesta equipe.</p>;
  }
  const width = Math.max(...cells.map(cell => cell.longitude)) - Math.min(...cells.map(cell => cell.longitude)) + 1;
  const height = Math.max(...cells.map(cell => cell.latitude)) - Math.min(...cells.map(cell => cell.latitude)) + 1;
  const span = Math.max(width, height) + 1;
  const west = Math.min(...cells.map(cell => cell.longitude)) - (span - width) / 2;
  const north = Math.max(...cells.map(cell => cell.latitude)) + (span - height) / 2 + 1;
  const max = Math.max(...cells.map(cell => cell.dwellings));
  const shown = cells.reduce((total, cell) => total + cell.dwellings, 0);
  const current = selected === undefined ? undefined : cells[selected];
  return (
    <>
      <div role="region" aria-label="Mapa em grade de domicílios georreferenciados"
        className="relative mx-auto aspect-square w-full max-w-[420px] rounded-xl border border-teal-200 bg-teal-50"
        style={{ backgroundImage: "linear-gradient(#0f766e24 1px, transparent 1px), linear-gradient(90deg, #0f766e24 1px, transparent 1px)", backgroundSize: "10% 10%" }}>
        <span aria-hidden="true" className="absolute right-3 top-3 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-teal-900">↑ Norte</span>
        {cells.map((cell, index) => (
          <button type="button" key={`${cell.latitude}/${cell.longitude}`}
            className="absolute grid min-h-7 min-w-7 place-items-center rounded-md border border-teal-700 bg-teal-700 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-900 aria-pressed:ring-2 aria-pressed:ring-teal-950 aria-pressed:ring-offset-2"
            style={{
              top: `${(north - cell.latitude - 0.5) / span * 100}%`,
              left: `${(cell.longitude + 0.5 - west) / span * 100}%`,
              transform: "translate(-50%, -50%)",
              width: `${Math.min(90 / span, 15)}%`, height: `${Math.min(90 / span, 15)}%`,
              boxShadow: `inset 0 0 0 50px rgb(20 184 166 / ${0.12 + cell.dwellings / max * 0.17})`,
            }}
            aria-label={`Célula ${index + 1}, ${formatPecNumber.format(cell.dwellings)} domicílios`}
            aria-pressed={selected === index} onClick={() => setSelected(index)}>
            {formatPecNumber.format(cell.dwellings)}
          </button>
        ))}
      </div>
      <p role="status" className="text-sm font-medium text-slate-700">
        {current ? `Célula ${Number(selected) + 1} com ${formatPecNumber.format(current.dwellings)} domicílios.`
          : `${formatPecNumber.format(shown)} domicílios em ${cells.length} células exibidas.`}
      </p>
      <p className="text-xs text-slate-600">
        Cada célula mede 0,01° de latitude por 0,01° de longitude. O mapa exibe até 250 células com cinco ou mais domicílios cada.
      </p>
    </>
  );
}

function AreaTable({ areas }: { areas: TerritoryArea[] }) {
  const [area, setArea] = useState("all");
  const visible = area === "all" ? areas : areas.filter(row => row.area === area);
  return (
    <ModulePanel title="Cadastro por microárea"
      description="Pessoas do cadastro atual e fichas vigentes de domicílios e famílias no PEC. Os ACS/TACS são os que registraram fichas domiciliares da microárea.">
      <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-slate-700">
        Microárea
        <select className="rounded-md border border-slate-300 bg-white p-2" value={area} onChange={event => setArea(event.target.value)}>
          <option value="all">Todas as microáreas</option>
          {areas.map(row => <option key={row.area} value={row.area}>{areaLabel(row.area)}</option>)}
        </select>
      </label>
      {visible.length ? (
        <Table>
          <TableCaption>Distribuição do cadastro territorial da equipe selecionada</TableCaption>
          <TableHeader><TableRow>
            {["Microárea", "Pessoas", "Domicílios", "Famílias", "Com coordenadas", "ACS/TACS que registraram"].map(label => <TableHead key={label}>{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>{visible.map(row => (
            <TableRow key={row.area}>
              <TableCell className="font-medium">{areaLabel(row.area)}</TableCell>
              {[row.people, row.dwellings, row.families, row.georeferenced, row.recordingAgents].map((value, index) => (
                <TableCell className="tabular-nums" key={index}>{formatPecNumber.format(value)}</TableCell>
              ))}
            </TableRow>
          ))}</TableBody>
        </Table>
      ) : <p role="status" className="text-sm text-slate-600">Sem cadastro correspondente nesta equipe.</p>}
    </ModulePanel>
  );
}

function Remapping({ areas, smart }: { areas: TerritoryArea[]; smart: boolean }) {
  const eligible = areas.filter(row => /^\d{2}$/.test(row.area));
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("");
  const [scenario, setScenario] = useState<{ from: TerritoryArea; to: TerritoryArea; people: number }>();
  const from = eligible.find(row => row.area === origin);
  const to = eligible.find(row => row.area === destination);
  const people = Number(quantity);
  const valid = from && to && origin !== destination && Number.isInteger(people) && people > 0 && people <= from.people;
  const ordered = [...eligible].sort((left, right) => right.people - left.people);
  const most = ordered[0];
  const least = ordered.at(-1);
  const balancingMove = most && least ? Math.floor((most.people - least.people) / 2) : 0;

  function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid) setScenario({ from, to, people });
  }

  function fillScenario() {
    setOrigin(most.area);
    setDestination(least?.area ?? "");
    setQuantity(String(balancingMove));
    setScenario(undefined);
  }

  return (
    <ModulePanel title={smart ? "Balanceamento entre microáreas" : "Simular remanejamento"}
      description="Compare a população de duas microáreas antes e depois de um remanejamento hipotético.">
      {eligible.length < 2 ? <p role="status" className="text-sm text-slate-600">A equipe precisa de duas microáreas numeradas para simular um remanejamento.</p> : (
        <>
          {smart && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
              <p>Maior carga em {areaLabel(most.area)} ({formatPecNumber.format(most.people)} pessoas). Menor carga em {areaLabel(least?.area ?? "sem")} ({formatPecNumber.format(least?.people ?? 0)} pessoas).</p>
              <Button type="button" variant="outline" size="sm" onClick={fillScenario} disabled={balancingMove < 1}>Preencher cenário de equilíbrio</Button>
            </div>
          )}
          <form onSubmit={simulate} className="flex flex-wrap items-end gap-3">
            {[{ label: "Origem", value: origin, update: setOrigin }, { label: "Destino", value: destination, update: setDestination }].map(field => (
              <label key={field.label} className="flex min-w-40 flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
                {field.label}
                <select className="h-9 rounded-md border border-slate-300 bg-white px-2" value={field.value}
                  onChange={event => { field.update(event.target.value); setScenario(undefined); }}>
                  <option value="">Selecione</option>
                  {eligible.map(row => <option key={row.area} value={row.area}>{areaLabel(row.area)}</option>)}
                </select>
              </label>
            ))}
            <label className="flex min-w-36 flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
              Pessoas a remanejar
              <Input type="number" min="1" max={from?.people} step="1" value={quantity}
                onChange={event => { setQuantity(event.target.value); setScenario(undefined); }} />
            </label>
            <Button type="submit" disabled={!valid}>Simular</Button>
          </form>
          {scenario && (
            <Table>
              <TableCaption>Resultado da simulação para {formatPecNumber.format(scenario.people)} pessoas</TableCaption>
              <TableHeader><TableRow><TableHead>Microárea</TableHead><TableHead>Antes</TableHead><TableHead>Após a simulação</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>{areaLabel(scenario.from.area)}</TableCell><TableCell>{scenario.from.people}</TableCell><TableCell>{scenario.from.people - scenario.people}</TableCell></TableRow>
                <TableRow><TableCell>{areaLabel(scenario.to.area)}</TableCell><TableCell>{scenario.to.people}</TableCell><TableCell>{scenario.to.people + scenario.people}</TableCell></TableRow>
              </TableBody>
            </Table>
          )}
        </>
      )}
      <ModuleNotice>A publicação de um remapeamento exige polígonos oficiais e aprovação municipal. O cenário calcula apenas a distribuição de pessoas entre as áreas selecionadas.</ModuleNotice>
    </ModulePanel>
  );
}

export function PecTerritoryPage({ view = "territory" }: { view?: TerritoryView }) {
  const scope = usePecScope();
  const query = useScopedModule<TerritoryData>("territory", scope, false);
  const data = query.data;
  const totals = data?.areas.reduce((total, row) => ({
    people: total.people + row.people, households: total.households + row.dwellings,
    families: total.families + row.families, coordinates: total.coordinates + row.georeferenced,
  }), { people: 0, households: 0, families: 0, coordinates: 0 });
  const remapping = view === "remapping" || view === "smart-remapping";
  const key = `${scope.team?.cnes}/${scope.team?.ine}`;
  return (
    <ModuleFrame icon={MapPin} theme="territory" title={views[view].title} description="Cadastro territorial atual da unidade e da equipe">
      <nav className="flex flex-wrap gap-2" aria-label="Páginas do território">
        {Object.entries(views).map(([id, page]) => (
          <Button key={id} asChild size="sm" variant={view === id ? "default" : "outline"}>
            <NavLink end to={`${page.path}?${scope.linkParams}`}>{page.title}</NavLink>
          </Button>
        ))}
      </nav>
      <ModuleScopeFilters scope={scope} current />
      <ModuleQueryState scope={scope} query={query} />
      {data && totals && (
        <>
          <ModuleStats items={[
            { label: "Pessoas vinculadas", value: totals.people },
            { label: "Famílias com domicílio", value: totals.families },
            { label: "Domicílios cadastrados", value: totals.households, detail: data.lastDomicileForm ? `Última ficha em ${shortDate(data.lastDomicileForm)}` : undefined },
            { label: "Domicílios com coordenadas", value: totals.coordinates },
          ]} />
          {view === "territory" && (
            <ModulePanel title="Distribuição geográfica dos domicílios" description="Agrupamentos a partir das coordenadas das fichas vigentes do PEC.">
              <TerritoryMap key={key} cells={data.cells} />
            </ModulePanel>
          )}
          {remapping && <Remapping key={`${key}/${view}`} areas={data.areas} smart={view === "smart-remapping"} />}
          <AreaTable key={key} areas={data.areas} />
          {view === "microareas" && (
            <ModuleNotice>Limites oficiais, titularidade dos ACS por microárea e edição cartográfica exigem o cadastro territorial homologado pelo município.</ModuleNotice>
          )}
          <Button asChild variant="outline" size="sm"><Link to={`/nominais?${scope.linkParams}`}>Consultar cadastro da equipe</Link></Button>
        </>
      )}
    </ModuleFrame>
  );
}
