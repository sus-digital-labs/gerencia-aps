import { ArrowLeft, Building2, RefreshCw, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { INDICATOR_NAMES, isIndicatorCode, NOMINAL_METRIC_CODES } from "@shared/aps-indicators";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalFilters from "@/components/filters/GlobalFilters";
import IndicatorCard from "@/components/indicators/IndicatorCard";
import { NominalTable } from "./nominal";
import { formatPecNumber, formatPecValue, pecStatus, usePecPanel, usePecScope } from "./pec";

export function PecIndicatorPage() {
  const { code: paramCode } = useParams();
  const [search] = useSearchParams();
  const code = paramCode ?? search.get("code") ?? "";
  const [tab, setTab] = useState({ code, value: "overview" });
  const scope = usePecScope();
  const panel = usePecPanel(scope.team, scope.month);
  const metric = panel.data?.indicators.find(item => item.code === code);
  const result = metric?.history.find(item => item.referenceMonth === scope.month);
  const nominalCode = result?.status === "READY" && scope.month < scope.currentMonth
    ? NOMINAL_METRIC_CODES.find(item => item === code) : undefined;
  const category = code.startsWith("CVAT") ? "CVAT" : code.startsWith("B") ? "eSB" : code.startsWith("M") ? "eMulti" : "eSF/eAP";
  const error = scope.directory.error ?? panel.error;
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/?${scope.linkParams}`} aria-label="Voltar ao painel"><ArrowLeft className="size-5" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Detalhe do Indicador {code}</h1>
              <p className="text-sm text-gray-500">{isIndicatorCode(code) ? INDICATOR_NAMES[code] : "Indicador indisponível"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={!scope.team} onClick={() => void panel.refetch()}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <GlobalFilters {...{
          filters: scope.filters, onFilterChange: scope.update, units: scope.units,
          teams: scope.unitTeams.map(team => ({ id: team.ine, name: team.name })),
          onReset: scope.reset, pecScope: true, maxCompetence: scope.currentMonth,
        }} />
        {error && <p role="alert">{error.message}</p>}
        {!error && (scope.directory.isPending || (scope.team && panel.isPending)) && <p role="status">Consultando o PEC local…</p>}
        {panel.data && !metric && <p role="status">O indicador não se aplica a esta equipe.</p>}
        {metric && (
          <Tabs value={tab.code === code ? tab.value : "overview"}
            onValueChange={value => setTab({ code, value })} className="space-y-4">
            <TabsList className="bg-white/80 shadow-sm">
              <TabsTrigger value="overview"><Building2 className="size-4" /> Visão Geral</TabsTrigger>
              <TabsTrigger value="nominal"><Users className="size-4" /> Lista nominal</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="grid gap-4 lg:grid-cols-2">
              <IndicatorCard code={code} pec={{ name: INDICATOR_NAMES[metric.code], category, result }} />
              <Card className="border-0 bg-white/80 shadow-lg">
                <CardHeader><CardTitle>Evolução Histórica</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <dl>{metric.history.map(month => (
                    <div key={month.referenceMonth} className="flex justify-between gap-4 border-b py-2">
                      <dt>{month.referenceMonth}</dt>
                      <dd>{month.status === "READY" ? formatPecValue(month) : pecStatus[month.status]}</dd>
                    </div>
                  ))}</dl>
                  {result?.evidence && <dl>
                    {result.evidence.map(entry => (
                      <div key={entry.label} className="flex justify-between gap-4 py-1">
                        <dt>{entry.label}</dt><dd>{formatPecNumber.format(entry.value)}</dd>
                      </div>
                    ))}
                  </dl>}
                  {metric.rule && <a className="text-blue-700 underline" href={metric.rule.url} target="_blank" rel="noreferrer">Nota metodológica</a>}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="nominal">
              {scope.team && nominalCode
                ? <NominalTable key={`${scope.team.cnes}/${scope.team.ine}/${scope.month}/${nominalCode}`}
                    team={scope.team} month={scope.month} code={nominalCode} />
                : <Card className="border-0 bg-white/80 shadow-lg">
                    <CardContent className="space-y-2 pt-6">
                      <p>O recorte não tem contribuições nominais disponíveis.</p>
                      <Link to={`/nominais?${scope.linkParams}`} className="text-blue-700 underline">Abrir cadastro nominal da equipe</Link>
                    </CardContent>
                  </Card>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
