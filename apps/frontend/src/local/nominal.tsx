import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GlobalFilters from "@/components/filters/GlobalFilters";
import type { NominalMetricCode } from "@shared/aps-indicators";
import type { PecTeam } from "../../../backend/local/pec-directory";
import { formatPecNumber, pecJson, usePecScope, type NominalPage } from "./pec";

type ContributionFilter = "counted" | "pending";

function NominalRows({ team, month, code, contribution, page, setPage }: {
  team: PecTeam; month: string; code?: NominalMetricCode; contribution?: ContributionFilter; page: number; setPage: (page: number) => void;
}) {
  const [result, setResult] = useState<NominalPage>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const { cnes, ine } = team;
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ cnes, ine, page: String(page) });
    if (code) {
      params.set("code", code);
      params.set("month", month);
      if (contribution) params.set("contribution", contribution);
    }
    setError(undefined);
    pecJson<NominalPage>(code ? "contributions" : "roster", params, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [attempt, cnes, ine, month, page, code, contribution]);

  if (error) return (
    <div className="flex items-center gap-3" role="alert">
      <span>{error}</span>
      <Button type="button" variant="outline" size="sm" onClick={() => setAttempt(attempt + 1)}>Tentar novamente</Button>
    </div>
  );
  if (!result) return <p role="status">Consultando o PEC local…</p>;
  if (result.rows.length === 0 && page === 1) {
    return <p role="status">{code ? "Nenhuma contribuição encontrada nesse recorte." : "Nenhum cidadão ativo vinculado a esta equipe."}</p>;
  }
  return (
    <>
      <Table>
        <TableCaption>{code ? `Contribuições de ${code} · ${month}` : "Cadastro atual da equipe"}</TableCaption>
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead>
          {code && <><TableHead>Numerador</TableHead><TableHead>Denominador</TableHead></>}
        </TableRow></TableHeader>
        <TableBody>{result.rows.map((row, index) => (
          <TableRow key={index}>
            <TableCell>{row.name}</TableCell>
            {"numerator" in row && <>
              <TableCell>{formatPecNumber.format(row.numerator)}</TableCell>
              <TableCell>{formatPecNumber.format(row.denominator)}</TableCell>
            </>}
          </TableRow>
        ))}</TableBody>
      </Table>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm">
        <Button type="button" size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="size-4" /> Anterior
        </Button>
        <span>Página {page}</span>
        <Button type="button" size="sm" variant="outline" disabled={!result.hasNextPage} onClick={() => setPage(page + 1)}>
          Próxima <ChevronRight className="size-4" />
        </Button>
      </div>
    </>
  );
}

export function NominalTable({ team, month, code, contribution }: {
  team: PecTeam; month: string; code?: NominalMetricCode; contribution?: ContributionFilter;
}) {
  const [page, setPage] = useState(1);
  return (
    <Card className="border-0 bg-white/80 shadow-lg">
      <CardHeader><CardTitle>{code ? "Contribuições nominais" : "Cidadãos vinculados"}</CardTitle></CardHeader>
      <CardContent><NominalRows key={page} {...{ team, month, code, contribution, page, setPage }} /></CardContent>
    </Card>
  );
}

export function PecNominalPage() {
  const scope = usePecScope();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="border-b bg-white/80">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-6 py-4">
          <Users className="size-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Lista nominal</h1>
            <p className="text-sm text-gray-500">Cadastro ativo por unidade e equipe do PEC</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] space-y-6 px-6 py-6">
        <GlobalFilters {...{
          filters: scope.filters, onFilterChange: scope.update, units: scope.units,
          teams: scope.unitTeams.map(team => ({ id: team.ine, name: team.name })),
          onReset: scope.reset, pecScope: true, maxCompetence: scope.currentMonth, hidePeriod: true,
        }} />
        {scope.team
          ? <NominalTable key={`${scope.team.cnes}/${scope.team.ine}`} team={scope.team} month={scope.month} />
          : <p role="status">{scope.directory.error?.message ?? (scope.directory.isPending ? "Consultando equipes do PEC…" : "Nenhuma equipe disponível.")}</p>}
      </div>
    </div>
  );
}
