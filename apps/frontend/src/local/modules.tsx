import { useQuery } from "@tanstack/react-query";
import { Activity, Server, Trophy } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { firstApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import { INDICATOR_NAMES, QUALITY_APS_CODES } from "@shared/aps-indicators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { loadGamification, loadLocalSettings } from "../../../backend/local/modules";
import { useModuleIndicators } from "./care-views";
import { formatPecNumber, formatPecValue, pecJson, pecStatus, usePecScope, type PecResult } from "./pec";
import { ModuleFrame, ModuleNotice, ModulePanel, ModuleQueryState, ModuleScopeFilters, ModuleStats, shortDate } from "./modules-ui";

export { PecTerritoryPage } from "./territory-views";
export { PecQualityPage } from "./modules-quality";
export { PecVigilancePage, PecWomensHealthPage } from "./care-views";

type GamificationData = Awaited<ReturnType<typeof loadGamification>>;
type SettingsData = Awaited<ReturnType<typeof loadLocalSettings>>;

export function PecGamificationPage() {
  const scope = usePecScope();
  const [, setSearch] = useSearchParams();
  const query = useQuery({
    queryKey: ["pec-module", "gamification", scope.month],
    enabled: Boolean(scope.month),
    queryFn: ({ signal }) => pecJson<GamificationData>("gamification", new URLSearchParams({ month: scope.month }), signal),
    staleTime: 300_000,
    retry: false,
  });
  const data = query.data;
  const ranked = data?.teams.filter(team => team.position !== null);
  const leading = ranked?.[0];
  const tiedForFirst = ranked?.filter(team => team.position === 1).length ?? 0;

  return (
    <ModuleFrame title="Gamificação" description="Ranking mensal de produção das equipes eSF e eAP do PEC local" icon={Trophy} theme="ranking">
      <ModulePanel title="Competência do ranking">
        <label className="flex max-w-52 flex-col gap-1 text-sm font-medium text-slate-700">
          Mês do ranking
          <Input type="month" min={firstApsCompetence} max={scope.currentMonth || undefined}
            value={scope.month} disabled={!scope.currentMonth} onChange={event => {
              const month = event.target.value;
              if (month >= firstApsCompetence && month <= scope.currentMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
                setSearch({ competencia: month });
              }
            }} />
        </label>
      </ModulePanel>
      <ModuleQueryState query={scope.directory.error ? scope.directory : query} />
      {data && (
        <>
          {!data.closed && <ModuleNotice>A classificação fica disponível quando as três fontes alcançam o fim da competência. A tabela mostra a produção observada até agora.</ModuleNotice>}
          <ModuleStats items={[
            { label: "Liderança", value: tiedForFirst > 1 ? `${tiedForFirst} equipes empatadas` : leading?.name ?? "—" },
            { label: "Maior pontuação", value: leading?.score === null || leading?.score === undefined ? "—" : `${formatPecNumber.format(leading.score)} pts` },
            { label: "Equipes classificadas", value: data.closed ? ranked?.length ?? 0 : "Pendente" },
            { label: "Equipes eSF e eAP ativas", value: data.teams.length },
          ]} />
          <ModulePanel title="Classificação da competência"
            description="Atendimentos individuais + visitas realizadas × 0,35 + doses aplicadas × 0,20. Cada parcela ponderada é arredondada. Empates compartilham a mesma posição.">
            <p className="text-sm text-slate-600">
              Último dia observado no PEC para atendimentos em {shortDate(data.coverage.attendances)}, visitas em {shortDate(data.coverage.visits)} e doses em {shortDate(data.coverage.doses)}.
            </p>
            {data.teams.length ? (
              <Table>
                <TableCaption>Produção registrada nas equipes ativas da cópia do PEC. Pontuação operacional do SUS Analytics.</TableCaption>
                <TableHeader><TableRow>
                  {["Posição", "Equipe", "Atendimentos", "Visitas", "Doses aplicadas", "Pontos"].map(label => <TableHead key={label}>{label}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>{data.teams.map(team => (
                  <TableRow key={`${team.cnes}/${team.ine}`}>
                    <TableCell className="font-semibold">{team.position === null ? "—" : `${team.position}º`}</TableCell>
                    <TableCell><span className="block font-medium">{team.name}</span><span className="text-xs text-slate-600">{team.unitName}</span></TableCell>
                    {[team.attendances, team.visits, team.doses, team.score].map((value, index) => (
                      <TableCell key={index} className="tabular-nums">{value === null ? "—" : formatPecNumber.format(value)}</TableCell>
                    ))}
                  </TableRow>
                ))}</TableBody>
              </Table>
            ) : <p role="status" className="text-sm text-slate-600">O PEC local não retornou equipes eSF ou eAP ativas.</p>}
          </ModulePanel>
        </>
      )}
      <ModulePanel title="Conquistas das equipes">
        <ModuleNotice>A atribuição de medalhas exige regras de concessão aprovadas e um registro de conquistas do SUS Analytics.</ModuleNotice>
      </ModulePanel>
    </ModuleFrame>
  );
}

export function PecSettingsPage() {
  const query = useQuery({
    queryKey: ["pec-module", "settings"],
    queryFn: ({ signal }) => pecJson<SettingsData>("settings", undefined, signal),
    staleTime: 15_000,
    retry: false,
  });
  const data = query.data;
  return (
    <ModuleFrame title="Configurações" description="Acesso, conexão e integrações do perfil local" icon={Server} theme="system">
      <Tabs defaultValue="connection">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="connection">Conexão PEC</TabsTrigger>
          <TabsTrigger value="access">Usuários e permissões</TabsTrigger>
          <TabsTrigger value="integrations">Alertas e integrações</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <ModulePanel title="Cópia local do e-SUS PEC" description="As consultas do SUS Analytics executam em transações somente leitura.">
            <ModuleQueryState query={query} />
            {data && <ModuleStats items={[
              { label: "Conexão PEC", value: data.available ? "Disponível" : "Indisponível" },
              { label: "Última competência sugerida", value: data.lastCompetence ?? "—" },
              { label: "Unidades ativas", value: data.units ?? "—" },
              { label: "Equipes ativas", value: data.teams ?? "—" },
            ]} />}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>Verificar conexão</Button>
              <Button size="sm" variant="outline" asChild><Link to="/equipes">Consultar equipes</Link></Button>
            </div>
          </ModulePanel>
        </TabsContent>
        <TabsContent value="access">
          <ModulePanel title="Identidade de acesso local">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div><dt className="text-sm text-slate-600">Perfil</dt><dd className="font-semibold">Superadmin</dd></div>
              <div><dt className="text-sm text-slate-600">Escopo de consulta</dt><dd className="font-semibold">Equipes ativas desta cópia</dd></div>
              <div><dt className="text-sm text-slate-600">Autenticação</dt><dd className="font-semibold">Operador local</dd></div>
            </dl>
            <ModuleNotice>A inclusão de outros usuários, a edição de permissões e a trilha de auditoria exigem um serviço de identidade e auditoria integrado.</ModuleNotice>
          </ModulePanel>
        </TabsContent>
        <TabsContent value="integrations">
          <ModulePanel title="Serviços do perfil local">
            <p className="text-sm text-slate-700">A conexão com o PEC atende as consultas locais. Alertas agendados, canais de notificação e conectores externos precisam de configuração própria.</p>
          </ModulePanel>
        </TabsContent>
      </Tabs>
    </ModuleFrame>
  );
}

function changeLabel(previous: PecResult | undefined, current: PecResult | undefined) {
  if (previous?.status !== "READY" || current?.status !== "READY" || previous.unit !== current.unit) return "—";
  const change = current.value - previous.value;
  const rounded = Math.round(change * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${formatPecNumber.format(rounded)}${current.unit === "percent" ? " p.p." : ""}`;
}

export function PecHealthInsightsPage() {
  const scope = usePecScope();
  const query = useModuleIndicators(scope, QUALITY_APS_CODES);
  const metrics = query.data?.indicators;
  const previousMonth = scope.month ? shiftApsCompetence(scope.month, -1) : "";
  return (
    <ModuleFrame title="Análises de saúde" description="Evolução mensal dos indicadores de qualidade da equipe" icon={Activity} theme="quality">
      <ModuleScopeFilters scope={scope} />
      <ModuleQueryState scope={scope} query={query} />
      {metrics && (
        <ModulePanel title="Comparação com a competência anterior"
          description="A variação é exibida quando as duas competências foram apuradas na mesma unidade de medida.">
          {metrics.length ? (
            <Table>
              <TableCaption>Resultados locais de qualidade entre {previousMonth} e {scope.month}</TableCaption>
              <TableHeader><TableRow>
                <TableHead>Indicador</TableHead><TableHead>{previousMonth}</TableHead><TableHead>{scope.month}</TableHead>
                <TableHead>Variação</TableHead><TableHead>Situação atual</TableHead>
              </TableRow></TableHeader>
              <TableBody>{metrics.map(metric => {
                const previous = metric.history.find(row => row.referenceMonth === previousMonth);
                const current = metric.history.find(row => row.referenceMonth === scope.month);
                return (
                  <TableRow key={metric.code}>
                    <TableCell><Link className="font-medium text-blue-700 underline underline-offset-2"
                      to={`/indicador/${metric.code}?${scope.linkParams}`}>{metric.code} · {INDICATOR_NAMES[metric.code]}</Link></TableCell>
                    <TableCell>{previous?.status === "READY" ? formatPecValue(previous) : "—"}</TableCell>
                    <TableCell>{current?.status === "READY" ? formatPecValue(current) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{changeLabel(previous, current)}</TableCell>
                    <TableCell>{current && <Badge variant="outline" title={"reason" in current ? current.reason : undefined}>{pecStatus[current.status]}</Badge>}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
          ) : <p role="status" className="text-sm text-slate-600">Nenhum indicador de qualidade se aplica ao tipo da equipe selecionada.</p>}
        </ModulePanel>
      )}
      <ModuleNotice>Recomendações automatizadas e análises preditivas exigem um serviço validado com governança clínica.</ModuleNotice>
    </ModuleFrame>
  );
}
