import { useQuery } from "@tanstack/react-query";
import { Activity, Bug, Heart, HeartPulse } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { INDICATOR_NAMES, type IndicatorCode } from "@shared/aps-indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { loadVigilance, loadWomensHealth } from "../../../backend/local/modules-care";
import { formatPecNumber, formatPecValue, pecJson, pecStatus, usePecScope, type PecPanel } from "./pec";
import {
  areaLabel, ModuleFrame, ModuleNotice, ModulePanel, ModuleQueryState, ModuleScopeFilters, ModuleStats,
  shortDate, useScopedModule,
} from "./modules-ui";

type VigilanceData = Awaited<ReturnType<typeof loadVigilance>>;
type WomensHealthData = Awaited<ReturnType<typeof loadWomensHealth>>;
type Scope = ReturnType<typeof usePecScope>;

export function useModuleIndicators(scope: Scope, codes: readonly IndicatorCode[], enabled = true) {
  const { team, month } = scope;
  return useQuery({
    queryKey: ["pec-module-indicators", team?.cnes, team?.ine, month, codes],
    enabled: Boolean(enabled && team && month),
    queryFn: ({ signal }) => {
      if (!team) throw new Error("Selecione uma equipe do PEC.");
      const params = new URLSearchParams({ cnes: team.cnes, ine: team.ine, month });
      for (const code of codes) params.append("code", code);
      return pecJson<PecPanel>("indicators", params, signal);
    },
    staleTime: 300_000,
    retry: false,
  });
}

const vectors = [
  { field: "control", label: "Visitas com controle vetorial" },
  { field: "education", label: "Ações educativas" },
  { field: "focus", label: "Visitas marcadas como imóvel com foco" },
  { field: "mechanical", label: "Ações mecânicas" },
  { field: "treatment", label: "Tratamentos focais" },
] as const;

function VectorVigilance({ scope }: { scope: Scope }) {
  const query = useScopedModule<VigilanceData>("vigilance", scope);
  const data = query.data;
  const numberOfVisits = data?.byArea.reduce((total, row) => total + row.visits, 0);
  const actions = data?.byArea.filter(row => row.control > 0);
  return (
    <>
      <ModuleQueryState scope={scope} query={query} />
      {data && (
        <ModulePanel title="Controle ambiental e vetorial no PEC"
          description={data.through
            ? `Visitas realizadas na competência ${data.month}. A fonte tem registros até ${shortDate(data.through)}.`
            : `Visitas realizadas na competência ${data.month}.`}>
          {!data.closed && <ModuleNotice>A fonte ainda não cobre toda a competência. Os totais refletem os registros disponíveis.</ModuleNotice>}
          {!data.through || data.through.slice(0, 7) < data.month ? (
            <p role="status" className="text-sm text-slate-600">A cópia do PEC não alcança esta competência.</p>
          ) : (
            <>
              <ModuleStats items={vectors.slice(0, 4).map(({ label, field }) => ({
                label, value: data.byArea.reduce((total, row) => total + row[field], 0),
              }))} />
              <p className="text-sm text-slate-600">
                {formatPecNumber.format(numberOfVisits ?? 0)} visitas realizadas no recorte. Uma visita pode registrar mais de uma ação.
              </p>
              {actions?.length ? (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Microárea</TableHead>
                    {["Visitas com controle", "Educativas", "Imóvel com foco", "Mecânicas", "Tratamento focal"].map(label => <TableHead key={label}>{label}</TableHead>)}
                  </TableRow></TableHeader>
                  <TableBody>{actions.map(row => (
                    <TableRow key={row.area}>
                      <TableCell className="font-medium">{areaLabel(row.area)}</TableCell>
                      {vectors.map(({ field }) => <TableCell key={field}>{formatPecNumber.format(row[field])}</TableCell>)}
                    </TableRow>
                  ))}</TableBody>
                </Table>
              ) : <p role="status" className="text-sm text-slate-600">Nenhuma ação de controle ambiental ou vetorial registrada no recorte.</p>}
            </>
          )}
        </ModulePanel>
      )}
      <ModulePanel title="Focos e casos de arboviroses">
        <ModuleNotice>As fichas de visita registram ações e a marcação de imóvel com foco sem identificar a espécie. Focos de Aedes aegypti, criadouros, casos notificados e casos confirmados exigem as bases oficiais da vigilância vetorial e epidemiológica do município.</ModuleNotice>
      </ModulePanel>
    </>
  );
}

const cardioCodes = ["C4", "C5"] as const;

function Cardiovascular({ scope }: { scope: Scope }) {
  const primary = scope.team?.typeCode === "70" || scope.team?.typeCode === "76";
  const query = useModuleIndicators(scope, cardioCodes, primary);
  return (
    <>
      {!scope.team || primary
        ? <ModuleQueryState scope={scope} query={query} />
        : <ModuleNotice>Selecione uma equipe eSF ou eAP para consultar o acompanhamento de diabetes e hipertensão.</ModuleNotice>}
      {query.data && (
        <div className="grid gap-4 xl:grid-cols-2">
          {query.data.indicators.map(metric => {
            const result = metric.history.find(row => row.referenceMonth === scope.month);
            if (!result) return null;
            return (
              <ModulePanel key={metric.code} title={INDICATOR_NAMES[metric.code]}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="outline">{pecStatus[result.status]}</Badge>
                  {result.status === "READY" && <strong className="text-xl">{formatPecValue(result)}</strong>}
                </div>
                {"reason" in result && <p className="text-sm text-slate-700">{result.reason}</p>}
                {result.evidence?.length ? (
                  <dl className="space-y-2 text-sm">
                    {result.evidence.map(item => (
                      <div key={item.label} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                        <dt>{item.label}</dt><dd className="font-semibold tabular-nums">{formatPecNumber.format(item.value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <Button variant="outline" size="sm" asChild><Link to={`/indicador/${metric.code}?${scope.linkParams}`}>Abrir indicador {metric.code}</Link></Button>
              </ModulePanel>
            );
          })}
        </div>
      )}
      <ModulePanel title="Estratificação individual do risco cardiovascular">
        <ModuleNotice>O cálculo exige protocolo clínico homologado e medições individuais completas, com data e unidades verificadas. Os indicadores C4 e C5 medem o acompanhamento de condições na equipe. Planos de cuidado e alertas individuais dependem do fluxo clínico do município.</ModuleNotice>
      </ModulePanel>
    </>
  );
}

type VigilanceView = "overview" | "aedes" | "cardiovascular";
export function PecVigilancePage({ view = "overview" }: { view?: VigilanceView }) {
  const scope = usePecScope();
  const titles = { overview: "Vigilância", aedes: "Vigilância Aedes aegypti", cardiovascular: "Risco Cardiovascular" };
  const cardio = view === "cardiovascular";
  const Icon = view === "overview" ? Activity : cardio ? HeartPulse : Bug;
  return (
    <ModuleFrame title={titles[view]} description={cardio ? "Acompanhamento de diabetes e hipertensão no PEC" : "Monitoramento das ações de campo registradas no PEC"} icon={Icon} theme="vigilance">
      <nav className="flex flex-wrap gap-2" aria-label="Páginas de vigilância">
        <Button variant={!cardio ? "default" : "outline"} size="sm" asChild>
          <NavLink to={`/vigilancia/aedes?${scope.linkParams}`}>Vigilância vetorial</NavLink>
        </Button>
        <Button variant={cardio ? "default" : "outline"} size="sm" asChild>
          <NavLink to={`/vigilancia/cardiovascular?${scope.linkParams}`}>Risco Cardiovascular</NavLink>
        </Button>
      </nav>
      <ModuleScopeFilters scope={scope} />
      {cardio ? <Cardiovascular scope={scope} /> : <VectorVigilance scope={scope} />}
    </ModuleFrame>
  );
}

const practices = [
  { id: "A", tab: "Preventivo", title: "Rastreamento do colo do útero" },
  { id: "D", tab: "Mamografia", title: "Rastreamento de mama" },
  { id: "B", tab: "Vacinação HPV", title: "Vacinação contra HPV" },
  { id: "C", tab: "Saúde sexual", title: "Saúde sexual e reprodutiva" },
] as const;

export function PecWomensHealthPage() {
  const scope = usePecScope();
  const query = useScopedModule<WomensHealthData>("womens-health", scope);
  const data = query.data;
  const result = data?.result;
  return (
    <ModuleFrame title="Saúde da Mulher" description="Rastreamento, vacinação e cuidado sexual e reprodutivo" icon={Heart} theme="women">
      <ModuleScopeFilters scope={scope} />
      <ModuleQueryState scope={scope} query={query} />
      {data && !data.applicable && <ModuleNotice>O indicador C7 se aplica a equipes eSF e eAP. Selecione uma dessas equipes para consultar as práticas.</ModuleNotice>}
      {result && (
        <>
          <ModulePanel title="Prevenção do câncer · indicador C7">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">{pecStatus[result.status]}</Badge>
              {result.status === "READY" && <strong className="text-xl">{formatPecNumber.format(result.value)}%</strong>}
            </div>
            <p className="text-sm text-slate-600">
              {"reason" in result ? result.reason : result.limitation}{" "}
              <a className="font-medium text-indigo-700 underline underline-offset-2" href={data.method.url}
                target="_blank" rel="noreferrer">Ficha metodológica C7</a>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild><Link to={`/indicador/C7?${scope.linkParams}`}>Histórico do C7</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to={`/indicador/C3?${scope.linkParams}`}>Gestação e puerpério</Link></Button>
            </div>
          </ModulePanel>
          <Tabs defaultValue="A">
            <TabsList className="h-auto flex-wrap">
              {practices.map(({ id, tab }) => <TabsTrigger key={id} value={id}>{tab}</TabsTrigger>)}
            </TabsList>
            {practices.map(({ id, title }) => {
              const practice = result.practices[id];
              const counts = practice?.localEvidence;
              return (
                <TabsContent value={id} key={id}>
                  <ModulePanel title={title} description={practice?.sourceThrough
                    ? `A fonte da prática tem registros até ${shortDate(practice.sourceThrough)}.` : undefined}>
                    <Badge variant="outline">{practice ? pecStatus[practice.status] : "Sem dados"}</Badge>
                    {practice && "reason" in practice && <p className="text-sm text-slate-700">{practice.reason}</p>}
                    {counts && (
                      <ModuleStats items={[
                        { label: "Pessoas no cadastro elegível", value: counts.linkedPeople },
                        { label: "Pessoas com evidência no PEC", value: counts.peopleWithEvidence },
                        {
                          label: "Cobertura apurada", value: practice.status === "READY"
                            ? `${formatPecNumber.format(counts.peopleWithEvidence * 100 / counts.linkedPeople)}%` : "Pendente",
                        },
                        { label: "Pessoas com evidência incompleta", value: counts.peopleWithIncompleteEvidence },
                      ]} />
                    )}
                  </ModulePanel>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </ModuleFrame>
  );
}
