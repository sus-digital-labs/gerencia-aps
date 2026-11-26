import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Building2, RefreshCw, Target, TrendingUp, Users } from "lucide-react";
import { motion } from "framer-motion";
import { APS_INDICATOR_GROUPS, INDICATOR_NAMES, OPERATIONAL_METRIC_CODES } from "@shared/aps-indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GlobalFilters from "@/components/filters/GlobalFilters";
import IndicatorCard from "@/components/indicators/IndicatorCard";
import StatsCard from "@/components/dashboard/StatsCard";
import { usePecPanel, usePecScope } from "@/local/pec";

const categories = [
  { id: "all", label: "Todos", icon: Activity, codes: OPERATIONAL_METRIC_CODES, teamTypes: [] },
  { id: "primary", label: "eSF/eAP (7)", icon: Users, codes: APS_INDICATOR_GROUPS.primary.codes, teamTypes: ["70", "76"] },
  { id: "dental", label: "eSB (6)", icon: Users, codes: APS_INDICATOR_GROUPS.dental.codes, teamTypes: ["71"] },
  { id: "multi", label: "eMulti (2)", icon: Building2, codes: APS_INDICATOR_GROUPS.multi.codes, teamTypes: ["72"] },
  { id: "territorial", label: "CVAT (6)", icon: Target, codes: APS_INDICATOR_GROUPS.territorial.codes, teamTypes: ["70", "76"] },
] as const;

export default function Dashboard() {
  const [categoryId, setCategoryId] = useState("all");
  const scope = usePecScope();
  const panel = usePecPanel(scope.team, scope.month);
  const category = categories.find(item => item.id === categoryId) ?? categories[0];
  const selectedMetrics = panel.data?.indicators ?? [];
  const ready = selectedMetrics.filter(metric =>
    metric.history.some(result => result.referenceMonth === scope.month && result.status === "READY")).length;
  const visible = selectedMetrics.filter(metric => category.codes.some(code => code === metric.code));
  const loading = scope.directory.isPending || Boolean(scope.team && panel.isPending);
  const error = scope.directory.error ?? panel.error;

  function changeCategory(next: string) {
    setCategoryId(next);
    const target = categories.find(item => item.id === next);
    if (!target || target.teamTypes.length === 0 || target.teamTypes.some(code => code === scope.team?.typeCode)) return;
    const teams = scope.teams.filter(team => target.teamTypes.some(code => code === team.typeCode));
    const preferred = teams.find(team => team.cnes === scope.team?.cnes) ?? teams.find(team => team.hasRoster) ?? teams[0];
    if (preferred) scope.selectTeam(preferred);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">SUS Analytics</h1>
              <p className="text-sm text-gray-500">Sistema de Monitoramento Saúde Brasil 360</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-100 px-3 py-1 text-emerald-700">
                <Activity className="mr-1 size-3" /> PEC local
              </Badge>
              <Button variant="outline" size="sm" disabled={loading}
                onClick={() => void (scope.team ? panel.refetch() : scope.directory.refetch())}>
                <RefreshCw className="size-4" /> Atualizar
              </Button>
              <Button variant="outline" size="sm" asChild><Link to={`/nominais?${scope.linkParams}`}>Lista nominal</Link></Button>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <GlobalFilters filters={scope.filters} onFilterChange={scope.update} units={scope.units}
          teams={scope.unitTeams.map(team => ({ id: team.ine, name: team.name }))}
          onReset={() => { setCategoryId("all"); scope.reset(); }} pecScope maxCompetence={scope.currentMonth} />
        {error && <p role="alert" className="rounded-xl bg-white p-4 text-sm text-red-700 shadow-sm">{error.message}</p>}
        {loading && <p role="status" className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">Consultando a fonte do PEC local…</p>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Indicadores" value={OPERATIONAL_METRIC_CODES.length} subtitle="Catálogo Saúde Brasil 360" icon={Target} color="blue" />
          <StatsCard title="Indicadores apurados" value={panel.data ? ready : "—"} subtitle="No recorte selecionado" icon={TrendingUp} color="green" />
          <StatsCard title="Equipes ativas" value={scope.directory.data ? scope.teams.length : "—"} subtitle="Cadastradas no PEC" icon={Users} color="purple" />
          <StatsCard title="Pendências de apuração" value={panel.data ? selectedMetrics.length - ready : "—"} subtitle="Fonte, cobertura ou critérios" icon={AlertTriangle} color="orange" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="space-y-4 xl:col-span-3">
            <Tabs value={category.id} onValueChange={changeCategory}>
              <TabsList className="h-auto flex-wrap bg-white/80 shadow-sm">
                {categories.map(({ id, label, icon: Icon }) => (
                  <TabsTrigger value={id} key={id}><Icon className="size-4" /> {label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((metric, index) => {
                const code = metric.code;
                const result = metric.history.find(entry => entry.referenceMonth === scope.month);
                const group = code.startsWith("CVAT") ? "CVAT" : code.startsWith("B") ? "eSB" : code.startsWith("M") ? "eMulti" : "eSF/eAP";
                return (
                  <motion.div key={code} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
                    <Link to={`/indicador/${code}?${scope.linkParams}`}>
                      <IndicatorCard code={code} pec={{ name: INDICATOR_NAMES[code], category: group, result }} />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            {!loading && !error && visible.length === 0 && (
              <p role="status" className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">
                {scope.team ? "O recorte selecionado não tem indicadores desta categoria." : "O PEC não retornou uma unidade e equipe para consulta."}
              </p>
            )}
          </div>
          <Card className="self-start border-0 bg-white/80 shadow-lg">
            <CardHeader><CardTitle>Fonte dos dados</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <p>PEC local · Saúde Brasil 360</p>
              {scope.team && <p>{scope.team.name} · {scope.team.unitName}</p>}
              {panel.data?.sourceThrough && <p>Corte observado {panel.data.sourceThrough.split("-").reverse().join("/")}</p>}
              {panel.data?.cache.status === "HIT" && <p>Agregados em cache</p>}
              <Button variant="outline" size="sm" asChild><Link to={`/nominais?${scope.linkParams}`}>Cadastro nominal</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
