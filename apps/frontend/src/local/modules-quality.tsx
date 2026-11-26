import { useEffect, useState, type FormEvent } from "react";
import { Search, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { loadQuality, loadQualityList, QualityListRequest } from "../../../backend/local/modules-quality";
import type { PecTeam } from "../../../backend/local/pec-directory";
import { formatPecNumber, pecJson, usePecScope } from "./pec";
import {
  areaLabel, ModuleFrame, ModuleNotice, ModulePanel, ModuleQueryState, ModuleScopeFilters, ModuleStats,
  shortDate, useScopedModule,
} from "./modules-ui";

type Quality = Awaited<ReturnType<typeof loadQuality>>;
type QualityList = Awaited<ReturnType<typeof loadQualityList>>;
type Kind = QualityListRequest["kind"];

const kinds: Record<Kind, { title: string; empty: string }> = {
  search: { title: "Busca ativa", empty: "Nenhum cadastro corresponde ao termo nesta equipe." },
  duplicates: { title: "Possíveis duplicados", empty: "Nenhum CPF ou CNS repetido entre os cadastros ativos da equipe." },
  "missing-cpf": { title: "Sem CPF", empty: "Nenhum cadastro ativo sem CPF preenchido nesta equipe." },
  deaths: { title: "Óbitos", empty: "Nenhum óbito sinalizado no cadastro desta equipe." },
};

function QualityRows({ team, kind, page, setPage, term }: {
  team: PecTeam; kind: Kind; page: number; setPage: (page: number) => void; term?: string;
}) {
  const [data, setData] = useState<QualityList>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const { cnes, ine } = team;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ cnes, ine, kind, page: String(page) });
    if (term) params.set("term", term);
    setData(undefined);
    setError(undefined);
    pecJson<QualityList>("quality-list", params, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [attempt, cnes, ine, kind, page, term]);

  if (error) return (
    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-800">
      {error}
      <Button variant="outline" size="sm" onClick={() => setAttempt(attempt + 1)}>Tentar novamente</Button>
    </div>
  );
  if (!data) return <p role="status" className="text-sm text-slate-600">Consultando cadastros da equipe…</p>;
  const documents = kind === "search" || kind === "missing-cpf";
  return (
    <>
      {data.rows.length ? (
        <Table>
          <TableCaption>{kinds[kind].title} no cadastro da equipe</TableCaption>
          <TableHeader><TableRow>
            {kind === "duplicates" && <TableHead>Grupo de revisão</TableHead>}
            <TableHead>Nome cadastrado</TableHead>
            <TableHead>Microárea</TableHead>
            {documents && <TableHead>Documentos informados</TableHead>}
            {kind === "search" && <TableHead>Situação</TableHead>}
            {kind === "deaths" && <TableHead>Data registrada</TableHead>}
          </TableRow></TableHeader>
          <TableBody>{data.rows.map((row, index) => (
            <TableRow key={index}>
              {kind === "duplicates" && <TableCell>Grupo {row.duplicateGroup} · {row.documentKind} · {row.groupSize} cadastros</TableCell>}
              <TableCell className="font-medium">{row.name ?? "Nome ausente"}</TableCell>
              <TableCell>{areaLabel(row.area?.toUpperCase() === "FA" ? "fora" : row.area ?? "sem")}</TableCell>
              {documents && <TableCell>{[row.hasCpf && "CPF", row.hasCns && "CNS"].filter(Boolean).join(" e ") || "Sem CPF e CNS"}</TableCell>}
              {kind === "search" && <TableCell>{row.deceased ? "Óbito sinalizado" : "Ativo"}</TableCell>}
              {kind === "deaths" && <TableCell>{shortDate(row.deathDate)}</TableCell>}
            </TableRow>
          ))}</TableBody>
        </Table>
      ) : <p role="status" className="text-sm text-slate-600">{kinds[kind].empty}</p>}
      {(page > 1 || data.hasNextPage) && (
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>Anterior</Button>
          <span>Página {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={!data.hasNextPage}>Próxima</Button>
        </div>
      )}
    </>
  );
}

function QualityListPanel({ team, kind }: { team: PecTeam; kind: Kind }) {
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim().length < 3) return;
    setPage(1);
    setTerm(input.trim());
  }

  return (
    <ModulePanel title={kinds[kind].title}>
      {kind === "search" && (
        <form onSubmit={search} className="flex max-w-xl flex-wrap items-end gap-3" autoComplete="off">
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Nome, CPF ou CNS
            <Input type="search" value={input} onChange={event => setInput(event.target.value)} maxLength={120}
              placeholder="Nome com 3 letras ou documento completo" />
          </label>
          <Button type="submit" disabled={input.trim().length < 3}><Search className="size-4" /> Pesquisar</Button>
        </form>
      )}
      {kind === "duplicates" && <ModuleNotice>CPF ou CNS com o mesmo preenchimento sinaliza revisão. A confirmação e a unificação cadastral são feitas no PEC do município.</ModuleNotice>}
      {kind === "missing-cpf" && <ModuleNotice>Confira o cadastro na unidade antes de corrigir um documento ausente. O PEC pode registrar justificativa para quem não possui CPF.</ModuleNotice>}
      {kind === "deaths" && <p className="text-sm text-slate-600">Considera a situação do cidadão ou a saída por óbito no vínculo da equipe.</p>}
      {(kind !== "search" || term) && <QualityRows key={`${page}/${term}`} {...{ team, kind, page, setPage, term }} />}
    </ModulePanel>
  );
}

function Population({ data }: { data: Quality }) {
  const highest = Math.max(1, ...data.ages.map(row => row.people));
  return (
    <ModulePanel title="População ativa por faixa etária" description={`Cadastro vigente consultado em ${shortDate(data.asOf)}.`}>
      <ul className="space-y-3">
        {data.ages.map(row => (
          <li key={row.band} className="grid grid-cols-[minmax(8rem,1fr)_2fr_auto] items-center gap-3 text-sm">
            <span>{row.band}</span>
            <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-blue-100">
              <span className="block h-full rounded-full bg-blue-700" style={{ width: `${row.people / highest * 100}%` }} />
            </span>
            <span className="min-w-8 text-right font-semibold tabular-nums">{formatPecNumber.format(row.people)}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">
        {formatPecNumber.format(data.missingCns)} cadastros sem CNS preenchido e {formatPecNumber.format(data.withoutDocument)} sem CPF e sem CNS.
      </p>
    </ModulePanel>
  );
}

export function PecQualityPage() {
  const scope = usePecScope();
  const query = useScopedModule<Quality>("quality", scope, false);
  const data = query.data;
  return (
    <ModuleFrame title="Qualidade de Dados" description="Busca ativa e revisão do cadastro da equipe no PEC" icon={Shield} theme="quality">
      <ModuleScopeFilters scope={scope} current />
      <ModuleQueryState scope={scope} query={query} />
      {data && scope.team && (
        <>
          <ModuleStats items={[
            { label: "Cadastros ativos", value: data.activePeople },
            { label: "Sem CPF preenchido", value: data.missingCpf },
            { label: "Grupos para revisão", value: data.duplicateCpfGroups + data.duplicateCnsGroups, detail: `${data.duplicateCpfGroups} por CPF · ${data.duplicateCnsGroups} por CNS` },
            { label: "Óbitos sinalizados", value: data.markedDeceased, detail: `${data.missingDeathDate} sem data registrada` },
          ]} />
          <Tabs defaultValue="search" key={`${scope.team.cnes}/${scope.team.ine}`}>
            <TabsList className="h-auto flex-wrap">
              {(["search", "duplicates", "missing-cpf", "population", "deaths"] as const).map(kind => (
                <TabsTrigger key={kind} value={kind}>{kind === "population" ? "População" : kinds[kind].title}</TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(kinds) as Kind[]).map(kind => (
              <TabsContent value={kind} key={kind}><QualityListPanel team={scope.team!} kind={kind} /></TabsContent>
            ))}
            <TabsContent value="population"><Population data={data} /></TabsContent>
          </Tabs>
        </>
      )}
    </ModuleFrame>
  );
}
