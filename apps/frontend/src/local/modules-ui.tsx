import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import GlobalFilters from "@/components/filters/GlobalFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPecNumber, pecJson, usePecScope } from "./pec";

type Scope = ReturnType<typeof usePecScope>;
type Theme = "territory" | "quality" | "vigilance" | "women" | "ranking" | "system";

const themes: Record<Theme, string> = {
  territory: "from-emerald-800 via-teal-700 to-teal-600",
  quality: "from-blue-800 via-blue-700 to-indigo-700",
  vigilance: "from-rose-900 via-rose-800 to-red-700",
  women: "from-fuchsia-900 via-fuchsia-800 to-rose-700",
  ranking: "from-indigo-900 via-indigo-800 to-violet-700",
  system: "from-slate-900 via-slate-800 to-slate-700",
};

export function ModuleFrame({ title, description, icon: Icon, theme, children }: {
  title: string; description: string; icon: LucideIcon; theme: Theme; children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/60">
      <header className={`bg-gradient-to-r ${themes[theme]} text-white`}>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-6 md:px-6 md:py-8">
          <span className="rounded-2xl bg-white/15 p-3"><Icon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-white/90">{description}</p>
          </div>
          <Badge className="border-white/35 bg-white/10 text-white hover:bg-white/15">PEC local</Badge>
        </div>
      </header>
      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 md:px-6 md:py-6">{children}</div>
    </div>
  );
}

export function ModuleScopeFilters({ scope, current }: { scope: Scope; current?: boolean }) {
  return (
    <GlobalFilters filters={scope.filters} onFilterChange={scope.update} onReset={scope.reset}
      units={scope.units} teams={scope.unitTeams.map(team => ({ id: team.ine, name: team.name }))}
      pecScope maxCompetence={scope.currentMonth} hidePeriod={current} />
  );
}

type QueryState = { isPending: boolean; error: Error | null; refetch: () => Promise<unknown> };

export function ModuleQueryState({ scope, query }: { scope?: Scope; query: QueryState }) {
  const failing = scope?.directory.error ? scope.directory : query;
  if (failing.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800">
        {failing.error.message}
        <Button variant="outline" size="sm" onClick={() => void failing.refetch()}>Tentar novamente</Button>
      </div>
    );
  }
  if (scope?.directory.isPending) return <p role="status" className="text-sm text-slate-700">Carregando equipes do PEC…</p>;
  if (scope && !scope.team) return <p role="status" className="text-sm text-slate-700">Nenhuma equipe ativa no PEC.</p>;
  if (query.isPending) return <p role="status" className="text-sm text-slate-700">Consultando o PEC local…</p>;
  return null;
}

export function useScopedModule<T>(resource: string, scope: Scope, period = true) {
  const { team, month } = scope;
  return useQuery({
    queryKey: ["pec-module", resource, team?.cnes, team?.ine, period ? month : undefined],
    enabled: Boolean(team && (!period || month)),
    queryFn: ({ signal }) => {
      if (!team) throw new Error("Selecione uma equipe do PEC.");
      const params = new URLSearchParams({ cnes: team.cnes, ine: team.ine });
      if (period) params.set("month", month);
      return pecJson<T>(resource, params, signal);
    },
    staleTime: 60_000,
    retry: false,
  });
}

export function ModuleStats({ items }: { items: { label: string; value: number | string; detail?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, detail }) => (
        <Card key={label} className="min-w-0 border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-1 break-words text-xl font-bold tabular-nums text-slate-900 md:text-2xl">
              {typeof value === "number" ? formatPecNumber.format(value) : value}
            </p>
            {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ModulePanel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card className="min-w-0 border-slate-200/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function ModuleNotice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{children}</p>;
}

export function areaLabel(area: string) {
  if (area === "sem") return "Sem microárea";
  if (area === "fora") return "Fora de área";
  if (area === "conflito") return "Vínculo divergente";
  return `Microárea ${area}`;
}

export function shortDate(date: string | null) {
  return date ? date.split("-").reverse().join("/") : "Sem data";
}
