import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { APS_INDICATOR_GROUPS, CVAT_NOMINAL_CODES, INDICATOR_NAMES } from "@shared/aps-indicators";
import type { loadCvatPublic } from "../../../backend/local/analytics/cvat-public";
import GlobalFilters from "@/components/filters/GlobalFilters";
import IndicatorCard from "@/components/indicators/IndicatorCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NominalTable } from "./nominal";
import { formatPecNumber, pecJson, usePecPanel, usePecScope } from "./pec";

type PublicCvat = Awaited<ReturnType<typeof loadCvatPublic>>;
type LocalCode = (typeof CVAT_NOMINAL_CODES)[number];
type Filter = "counted" | "pending";
const primaryTypes = ["70", "76"];
const dimensionNames = { final: "Classificação final", cadastro: "Cadastro", acompanhamento: "Acompanhamento" };
const publicReportUrl = "https://siaps.saude.gov.br/publico/painel-avaliacao-quadrimestre";
const siapsManualUrl = "https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/transferencia-arquivos/";

function quarterTitle(quarter: string) {
  const [year, q] = quarter.split("Q");
  return `${q}º quadrimestre de ${year}`;
}

function PublicDistribution({ publication }: { publication: PublicCvat }) {
  return (
    <Card>
      <CardHeader><CardTitle>Classificação pública do município</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{quarterTitle(publication.quarter)} · {publication.teamType} · equipes por classificação</p>
        {publication.rows.length > 0 ? (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Resultado do Siaps</TableHead><TableHead>Regular</TableHead><TableHead>Suficiente</TableHead>
              <TableHead>Bom</TableHead><TableHead>Ótimo</TableHead>
            </TableRow></TableHeader>
            <TableBody>{publication.rows.map(row => (
              <TableRow key={row.dimension}>
                <TableCell>{dimensionNames[row.dimension]}</TableCell>
                {[row.regular, row.suficiente, row.bom, row.ótimo].map((value, index) => (
                  <TableCell key={index}>{value === null ? "—" : formatPecNumber.format(value)}</TableCell>
                ))}
              </TableRow>
            ))}</TableBody>
          </Table>
        ) : <p role="status">Nenhuma distribuição municipal importada para este quadrimestre e modalidade.</p>}
        <a className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline" href={publication.source} target="_blank" rel="noreferrer">
          Consultar publicação do Siaps <ExternalLink className="size-4" />
        </a>
      </CardContent>
    </Card>
  );
}

function TerritorialImports() {
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: async ({ file, format }: { file: File; format: "siaps" | "complements" }) => {
      if (!file.size || file.size > 512 * 1024) throw new Error("Selecione um arquivo com até 512 KiB.");
      const response = await fetch(`/api/local/territorial/${format}`, {
        method: "POST", body: file, headers: { "Content-Type": format === "siaps" ? "text/csv" : "application/json" },
      });
      if (response.status === 401) {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        throw new Error("Sua sessão expirou.");
      }
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "O arquivo não pôde ser importado.");
      return result as { imported: number; total: number };
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["pec-territorial-siaps"] }),
        client.invalidateQueries({ queryKey: ["pec-brasil-360"] }),
      ]);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>, format: "siaps" | "complements") {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("report");
    if (!(file instanceof File)) return;
    upload.mutate({ file, format }, { onSuccess: () => form.reset() });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Importar fontes do CVAT</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <form className="space-y-2" onSubmit={event => submit(event, "siaps")}>
            <Label htmlFor="public-cvat-csv">Distribuição municipal do Siaps</Label>
            <Input id="public-cvat-csv" name="report" type="file" accept=".csv,text/csv" required />
            <Button type="submit" variant="outline" disabled={upload.isPending}>Importar CSV público</Button>
          </form>
          <form className="space-y-2" onSubmit={event => submit(event, "complements")}>
            <Label htmlFor="cvat-complements-json">Complementos agregados por equipe</Label>
            <Input id="cvat-complements-json" name="report" type="file" accept=".json,application/json" required />
            <Button type="submit" variant="outline" disabled={upload.isPending}>Importar complementos JSON</Button>
          </form>
        </div>
        {upload.isPending && <p role="status">Validando e atualizando os resultados…</p>}
        {upload.isError && <p role="alert" className="text-red-700">{upload.error.message}</p>}
        {upload.isSuccess && <p role="status">Registros importados {formatPecNumber.format(upload.data.imported)}.</p>}
        <p className="text-sm text-muted-foreground">Use dados agregados no formato de complementos, com a mesma equipe e competência da consulta.</p>
        <div className="flex flex-wrap gap-4 text-sm text-blue-700 underline">
          <a href={publicReportUrl} target="_blank" rel="noreferrer">Relatório público do Siaps</a>
          <a href={siapsManualUrl} target="_blank" rel="noreferrer">Transferência de arquivos do Siaps</a>
        </div>
      </CardContent>
    </Card>
  );
}

export function PecTerritorialPage() {
  const scope = usePecScope(true, primaryTypes);
  const codes = APS_INDICATOR_GROUPS.territorial.codes;
  const panel = usePecPanel(scope.team, scope.month, codes);
  const [code, setCode] = useState<LocalCode>("CVAT4");
  const [contribution, setContribution] = useState<Filter>("pending");
  const { team, month } = scope;
  const publication = useQuery({
    queryKey: ["pec-territorial-siaps", team?.cnes, team?.ine, month],
    queryFn: ({ signal }) => pecJson<PublicCvat>("territorial/siaps", new URLSearchParams({
      cnes: team!.cnes, ine: team!.ine, month,
    }), signal),
    enabled: Boolean(team && month), retry: false, staleTime: 60_000,
  });
  const error = scope.directory.error ?? panel.error;
  const selected = panel.data?.indicators.find(item => item.code === code)?.history.find(item => item.referenceMonth === month);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="border-b bg-white/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3"><MapPin className="size-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Vínculos e Acompanhamento Territorial</h1>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!team} onClick={() => void Promise.all([panel.refetch(), publication.refetch()])}>
            <RefreshCw className="size-4" /> Atualizar
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <GlobalFilters filters={scope.filters} onFilterChange={scope.update} units={scope.units}
          teams={scope.unitTeams.map(item => ({ id: item.ine, name: item.name }))} onReset={scope.reset}
          pecScope maxCompetence={scope.currentMonth} />
        {error && <p role="alert" className="text-red-700">{error.message}</p>}
        {!error && (scope.directory.isPending || (team && panel.isPending)) && <p role="status">Consultando vínculos e contatos do PEC local…</p>}
        {!error && !scope.directory.isPending && !team && <p role="status">Nenhuma eSF ou eAP ativa disponível no PEC.</p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {panel.data?.indicators.map(metric => (
            <Link key={metric.code} to={`/indicador/${metric.code}?${scope.linkParams}`}>
              <IndicatorCard code={metric.code} pec={{ name: INDICATOR_NAMES[metric.code], category: "CVAT",
                result: metric.history.find(item => item.referenceMonth === month) }} />
            </Link>
          ))}
        </div>
        {team && <Card>
          <CardHeader><CardTitle>Acompanhamento nominal</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Label htmlFor="territorial-nominal-criterion">Critério</Label>
            <select id="territorial-nominal-criterion" value={code} onChange={event => setCode(event.target.value as LocalCode)}
              className="h-10 max-w-full rounded-md border bg-background px-3 text-sm">
              {CVAT_NOMINAL_CODES.map(item => <option key={item} value={item}>{item} · {INDICATOR_NAMES[item]}</option>)}
            </select>
            <Label htmlFor="territorial-nominal-status">Situação</Label>
            <select id="territorial-nominal-status" value={contribution} onChange={event => setContribution(event.target.value as Filter)}
              className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="pending">Pendentes</option><option value="counted">Critério atendido</option>
            </select>
            <Button asChild variant="ghost" size="sm"><Link to={`/nominais?${scope.linkParams}`}>Cadastro atual da equipe</Link></Button>
          </CardContent>
        </Card>}
        {team && selected?.status === "READY" && <NominalTable key={`${scope.linkParams}/${code}/${contribution}`}
          team={team} month={month} code={code} contribution={contribution} />}
        {selected && selected.status !== "READY" && <p role="status">{selected.reason}</p>}
        {publication.error && <p role="alert" className="text-red-700">{publication.error.message}</p>}
        {publication.data && <PublicDistribution publication={publication.data} />}
        <TerritorialImports />
      </div>
    </div>
  );
}
