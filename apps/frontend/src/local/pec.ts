import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { firstApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import type { IndicatorCode } from "@shared/aps-indicators";
import type { Filters } from "@/components/filters/GlobalFilters";
import type { LocalPanelData } from "../../../backend/local/indicators";
import type { PecTeam } from "../../../backend/local/pec-directory";
import type { loadContributions, loadRoster } from "../../../backend/local/nominal";

type Directory = { teams: PecTeam[]; month: string | null; currentMonth: string };
export type PecPanel = LocalPanelData & { cache: { status: "MISS" | "HIT" | "SHARED"; ttlSeconds: number } };
export type PecMetric = PecPanel["indicators"][number];
export type PecResult = PecMetric["history"][number];
export type NominalPage = Awaited<ReturnType<typeof loadRoster>> | Awaited<ReturnType<typeof loadContributions>>;

export const pecStatus = {
  READY: "Apurado no PEC",
  NO_DATA: "Sem dados",
  API_UNAVAILABLE: "Consulta indisponível",
  MISSING_REQUIRED_CRITERIA: "Evidência parcial",
  BLOCKED_BY_DATA_CONTRACT: "Fonte pendente",
} as const;

export const formatPecNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
export function formatPecValue(result: Extract<PecResult, { status: "READY" }>) {
  const suffix = { percent: "%", per_person: " por pessoa", factor: " ×", score: " / 10" };
  return `${formatPecNumber.format(result.value)}${suffix[result.unit]}`;
}

export async function pecJson<T>(resource: string, params?: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/local/${resource}${params ? `?${params}` : ""}`, { cache: "no-store", signal });
  if (response.status === 401) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    throw new Error("Sua sessão expirou.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "A consulta ao PEC local falhou.");
  }
  return response.json() as Promise<T>;
}

export function usePecScope(enabled = true, teamTypes?: readonly string[]) {
  const [search, setSearch] = useSearchParams();
  const directory = useQuery({
    queryKey: ["pec-directory"],
    queryFn: ({ signal }) => pecJson<Directory>("directory", undefined, signal),
    retry: false,
    enabled,
    staleTime: 60_000,
  });
  const availableTeams = directory.data?.teams ?? [];
  const teams = teamTypes ? availableTeams.filter(team => team.typeCode !== null && teamTypes.includes(team.typeCode)) : availableTeams;
  const preferred = teams.find(team => team.typeCode === "70" && team.hasRoster) ?? teams[0];
  const requestedUnit = search.get("cnes");
  const cnes = teams.some(team => team.cnes === requestedUnit) ? requestedUnit : preferred?.cnes;
  const unitTeams = teams.filter(team => team.cnes === cnes);
  const team = unitTeams.find(item => item.ine === (search.get("ine") || preferred?.ine)) ?? unitTeams[0];
  const currentMonth = directory.data?.currentMonth ?? "";
  const standardMonth = directory.data?.month ?? (currentMonth ? shiftApsCompetence(currentMonth, -1) : "");
  const candidate = search.get("competencia");
  const month = candidate && /^\d{4}-(0[1-9]|1[0-2])$/.test(candidate) &&
    candidate >= firstApsCompetence && candidate <= currentMonth ? candidate : standardMonth;
  const [yearValue, monthValue] = month.split("-").map(Number);
  const filters: Filters = { month: monthValue || undefined, year: yearValue || undefined, unitId: team?.cnes, teamId: team?.ine };
  const units = Array.from(new Map(teams.map(item => [item.cnes, { id: item.cnes, name: item.unitName }])).values());

  function select(nextTeam: PecTeam | undefined, competence: string) {
    if (!nextTeam || !competence) return;
    setSearch(previous => {
      const params = new URLSearchParams(previous);
      params.set("cnes", nextTeam.cnes);
      params.set("ine", nextTeam.ine);
      params.set("competencia", competence);
      return params;
    });
  }

  function update(next: Filters) {
    const eligible = teams.filter(item => item.cnes === next.unitId);
    const selected = eligible.find(item => item.ine === next.teamId) ?? eligible[0];
    const proposed = `${next.year}-${String(next.month).padStart(2, "0")}`;
    const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(proposed) && proposed >= firstApsCompetence && proposed <= currentMonth;
    select(selected, valid ? proposed : month);
  }

  const linkParams = team ? new URLSearchParams({ cnes: team.cnes, ine: team.ine, competencia: month }) : new URLSearchParams();
  return {
    directory, team, teams, units, unitTeams, filters, month, currentMonth, update, linkParams,
    reset: () => select(preferred, standardMonth),
    selectTeam: (nextTeam: PecTeam) => select(nextTeam, month),
  };
}

export function usePecPanel(team: PecTeam | undefined, month: string, codes?: readonly IndicatorCode[]) {
  return useQuery({
    queryKey: ["pec-brasil-360", team?.cnes, team?.ine, month, codes],
    enabled: Boolean(team && month),
    retry: false,
    staleTime: 300_000,
    queryFn: ({ signal }) => {
      if (!team) throw new Error("Selecione uma equipe do PEC.");
      const params = new URLSearchParams({ cnes: team.cnes, ine: team.ine, month });
      for (const code of codes ?? []) params.append("code", code);
      return pecJson<PecPanel>("indicators", params, signal);
    },
  });
}
