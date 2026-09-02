import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import trpc from "@/lib/trpc-adapter";
import { parseIndicatorResults } from "@/lib/analytics-contract";
import IndicatorDetailHeader from "../components/indicators/IndicatorDetailHeader";
import NominalList from "../components/indicators/NominalList";
import HistoricalChart from "../components/charts/HistoricalChart";
import ComparisonChart from "../components/charts/ComparisonChart";
import GlobalFilters from "../components/filters/GlobalFilters";

const indicatorTargets = {
  C1: 60,
  C2: 50,
  C3: 60,
  C4: 50,
  C5: 50,
  C6: 50,
  C7: 40,
  B1: 60,
  B2: 50,
  B3: 20,
  B4: 30,
  B5: 5,
  B6: 0.5,
  M1: 80,
  M2: 12,
};

const statusLabels = {
  NO_DATA: "Sem dados na competência",
  API_UNAVAILABLE: "Fonte indisponível",
  MISSING_REQUIRED_CRITERIA: "Critérios obrigatórios ausentes",
  BLOCKED_BY_DATA_CONTRACT: "Contrato bloqueado",
};

const unavailablePanel = message => (
  <div className="rounded-lg border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
    {message}
  </div>
);

export default function IndicatorDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const indicatorCode = urlParams.get("code") || "C1";
  const initialMonth =
    Number(urlParams.get("month")) || new Date().getMonth() + 1;
  const initialYear = Number(urlParams.get("year")) || new Date().getFullYear();
  const [filters, setFilters] = useState({
    month: initialMonth,
    year: initialYear,
    unitId: null,
    teamId: null,
    microarea: null,
  });
  const [activeTab, setActiveTab] = useState("overview");
  const isC1 = indicatorCode === "C1";

  const indicatorQuery = useQuery({
    queryKey: ["indicatorResult", indicatorCode, filters],
    retry: false,
    enabled: !isC1,
    queryFn: async () => {
      const query = {
        indicator_code: indicatorCode,
        period_month: filters.month,
        period_year: filters.year,
        ...(filters.teamId ? { team_id: filters.teamId } : {}),
        ...(filters.unitId ? { unit_id: filters.unitId } : {}),
      };
      return parseIndicatorResults(
        await trpc.IndicatorResult.filter(query, "-result_percentage")
      );
    },
  });
  const {
    data: indicatorResults = [],
    isError: indicatorError,
    refetch,
  } = indicatorQuery;

  const historicalQuery = useQuery({
    queryKey: ["historicalData", indicatorCode, filters.teamId],
    retry: false,
    enabled: !isC1,
    queryFn: async () => {
      const results = parseIndicatorResults(
        await trpc.IndicatorResult.filter(
          {
            indicator_code: indicatorCode,
            ...(filters.teamId ? { team_id: filters.teamId } : {}),
          },
          "period_year,period_month",
          24
        )
      );
      return results
        .filter(result => result.status === "READY")
        .map(result => ({
          month: result.period_month,
          year: result.period_year,
          result: result.result_percentage,
        }));
    },
  });

  const comparisonQuery = useQuery({
    queryKey: ["comparisonData", indicatorCode, filters.month, filters.year],
    retry: false,
    enabled: !isC1,
    queryFn: async () => {
      const results = parseIndicatorResults(
        await trpc.IndicatorResult.filter(
          {
            indicator_code: indicatorCode,
            period_month: filters.month,
            period_year: filters.year,
          },
          "-result_percentage",
          15
        )
      );
      const grouped = {};
      results
        .filter(result => result.status === "READY")
        .forEach(result => {
          const key = String(result.team_id ?? "unknown");
          if (!grouped[key]) grouped[key] = result;
        });
      return Object.values(grouped)
        .map(result => ({
          name: result.team_id
            ? `Equipe ${result.team_id}`
            : "Equipe não informada",
          result: result.result_percentage,
          numerator: result.numerator,
          denominator: result.denominator,
        }))
        .slice(0, 10);
    },
  });

  const citizenQuery = useQuery({
    queryKey: ["citizenStatus", indicatorCode, filters],
    retry: false,
    enabled: !isC1,
    queryFn: () =>
      trpc.CitizenIndicatorStatus.filter(
        {
          indicator_code: indicatorCode,
          period_month: filters.month,
          period_year: filters.year,
          ...(filters.teamId ? { team_id: filters.teamId } : {}),
        },
        "-updated_date",
        200
      ),
  });
  const {
    data: citizenStatus = [],
    isError: citizenStatusError,
    isLoading: citizenStatusLoading,
  } = citizenQuery;

  const { data: units = [], isError: unitsError } = useQuery({
    queryKey: ["units"],
    retry: false,
    queryFn: () => trpc.HealthUnit.filter({ active: true }),
  });
  const { data: teams = [], isError: teamsError } = useQuery({
    queryKey: ["teams"],
    retry: false,
    queryFn: () => trpc.HealthTeam.filter({ active: true }),
  });

  const readyResults = indicatorResults.filter(
    result => result.status === "READY"
  );
  const mainResult =
    readyResults.length > 0
      ? readyResults.reduce(
          (accumulator, result) => ({
            numerator: accumulator.numerator + result.numerator,
            denominator: accumulator.denominator + result.denominator,
            qualityScores:
              result.quality_score === undefined
                ? accumulator.qualityScores
                : [...accumulator.qualityScores, result.quality_score],
            first: accumulator.first || result,
          }),
          { numerator: 0, denominator: 0, qualityScores: [], first: null }
        )
      : null;
  const aggregatedResult = mainResult
    ? {
        ...mainResult.first,
        status: "READY",
        result_percentage:
          mainResult.denominator > 0
            ? (mainResult.numerator / mainResult.denominator) * 100
            : undefined,
        numerator: mainResult.numerator,
        denominator: mainResult.denominator,
        quality_score: mainResult.qualityScores.length
          ? mainResult.qualityScores.reduce((sum, score) => sum + score, 0) /
            mainResult.qualityScores.length
          : undefined,
      }
    : {
        indicator_code: indicatorCode,
        status: isC1
          ? "BLOCKED_BY_DATA_CONTRACT"
          : indicatorError
            ? "API_UNAVAILABLE"
            : "NO_DATA",
      };

  const citizenDataAvailable =
    !isC1 &&
    !citizenStatusError &&
    !citizenStatusLoading &&
    Array.isArray(citizenStatus);
  const pendingCitizens = citizenDataAvailable
    ? citizenStatus.filter(citizen => citizen.status === "pendente")
    : [];
  const completeCitizens = citizenDataAvailable
    ? citizenStatus.filter(citizen => citizen.status === "completo")
    : [];
  const allCitizens = citizenDataAvailable ? citizenStatus : [];
  const resetFilters = () =>
    setFilters({
      month: initialMonth,
      year: initialYear,
      unitId: null,
      teamId: null,
      microarea: null,
    });
  const periodLabel = `${filters.month}/${filters.year}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Detalhe do Indicador {indicatorCode}
              </h1>
              <p className="text-sm text-gray-500">
                Contrato e evidências da competência {periodLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Download className="w-4 h-4" />
              Exportar indisponível
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <GlobalFilters
          filters={filters}
          onFilterChange={setFilters}
          units={Array.isArray(units) ? units : []}
          teams={Array.isArray(teams) ? teams : []}
          onReset={resetFilters}
        />
        {(indicatorError || isC1) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {isC1
              ? "C1 bloqueado pelo contrato local de dados. Percentual, numerador e denominador não estão disponíveis."
              : "A fonte retornou erro ou contrato inválido. Nenhum resultado substituto será exibido."}
          </div>
        )}
        <IndicatorDetailHeader
          code={indicatorCode}
          status={aggregatedResult.status}
          result={aggregatedResult.result_percentage}
          numerator={aggregatedResult.numerator}
          denominator={aggregatedResult.denominator}
          qualityScore={aggregatedResult.quality_score}
          trend={aggregatedResult.trend}
          previousResult={aggregatedResult.previous_result}
          periodMonth={filters.month}
          periodYear={filters.year}
          teamName={
            filters.teamId && Array.isArray(teams)
              ? teams.find(team => team.id === filters.teamId)?.name
              : null
          }
          unitName={
            filters.unitId && Array.isArray(units)
              ? units.find(unit => unit.id === filters.unitId)?.name
              : null
          }
          onBack={() => window.history.back()}
        />

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white/80 shadow-sm p-1">
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="denominator"
              className="gap-2"
              disabled={!citizenDataAvailable}
            >
              <Users className="w-4 h-4" />
              Denominador ({citizenDataAvailable ? allCitizens.length : "—"})
            </TabsTrigger>
            <TabsTrigger
              value="numerator"
              className="gap-2"
              disabled={!citizenDataAvailable}
            >
              <UserCheck className="w-4 h-4" />
              Numerador ({citizenDataAvailable ? completeCitizens.length : "—"})
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="gap-2"
              disabled={!citizenDataAvailable}
            >
              <AlertCircle className="w-4 h-4" />
              Pendentes ({citizenDataAvailable ? pendingCitizens.length : "—"})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {historicalQuery.isError || comparisonQuery.isError ? (
              unavailablePanel(
                "Histórico ou comparação indisponível: o contrato da fonte não foi validado."
              )
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 1 }}>
                  <HistoricalChart
                    data={historicalQuery.data || []}
                    target={indicatorTargets[indicatorCode]}
                    title="Evolução Histórica"
                  />
                </motion.div>
                <motion.div initial={{ opacity: 1 }}>
                  <ComparisonChart
                    data={comparisonQuery.data || []}
                    target={indicatorTargets[indicatorCode]}
                    title="Comparativo por Equipe"
                  />
                </motion.div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="denominator">
            {citizenDataAvailable ? (
              <NominalList
                citizens={allCitizens}
                type="denominator"
                indicatorCode={indicatorCode}
              />
            ) : (
              unavailablePanel(
                statusLabels[aggregatedResult.status] ||
                  "Lista nominal indisponível: contrato não validado."
              )
            )}
          </TabsContent>
          <TabsContent value="numerator">
            {citizenDataAvailable ? (
              <NominalList
                citizens={completeCitizens}
                type="numerator"
                indicatorCode={indicatorCode}
              />
            ) : (
              unavailablePanel(
                statusLabels[aggregatedResult.status] ||
                  "Lista nominal indisponível: contrato não validado."
              )
            )}
          </TabsContent>
          <TabsContent value="pending">
            {citizenDataAvailable ? (
              <NominalList
                citizens={pendingCitizens}
                type="pending"
                indicatorCode={indicatorCode}
              />
            ) : (
              unavailablePanel(
                statusLabels[aggregatedResult.status] ||
                  "Lista nominal indisponível: contrato não validado."
              )
            )}
          </TabsContent>
        </Tabs>
        {(unitsError || teamsError) &&
          unavailablePanel(
            "Filtros territoriais indisponíveis: a API não retornou um contrato válido."
          )}
      </div>
    </div>
  );
}
