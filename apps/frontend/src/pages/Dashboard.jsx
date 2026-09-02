import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import trpc from "@/lib/trpc-adapter";
import {
  OPERATIONAL_METRIC_CODES,
  QUALITY_APS_CODES,
  parseIndicatorResults,
} from "@/lib/analytics-contract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  Target,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import IndicatorCard from "../components/indicators/IndicatorCard";
import StatsCard from "../components/dashboard/StatsCard";
import QualityScoreCard from "../components/dashboard/QualityScoreCard";
import GlobalFilters from "../components/filters/GlobalFilters";
import Leaderboard from "../components/gamification/Leaderboard";
import VaccinationCoverage from "../components/dashboard/VaccinationCoverage";
import ChronicConditionsCard from "../components/dashboard/ChronicConditionsCard";
import HomeVisitsByCondition from "../components/dashboard/HomeVisitsByCondition";
import DashboardExport from "../components/dashboard/DashboardExport";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export default function Dashboard() {
  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
    unitId: null,
    teamId: null,
    microarea: null,
  });
  const [activeCategory, setActiveCategory] = useState("all");

  const indicatorQuery = useQuery({
    queryKey: ["indicators", filters],
    retry: false,
    queryFn: async () => {
      const query = {
        period_month: filters.month,
        period_year: filters.year,
        ...(filters.teamId ? { team_id: filters.teamId } : {}),
        ...(filters.unitId ? { unit_id: filters.unitId } : {}),
      };
      return parseIndicatorResults(
        await trpc.IndicatorResult.filter(query, "-result_percentage", 50)
      );
    },
  });
  const {
    data: indicators = [],
    isError: indicatorsError,
    refetch: refetchIndicators,
  } = indicatorQuery;

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

  const { data: teamScores = [], isError: teamScoresError } = useQuery({
    queryKey: ["teamScores", filters.month, filters.year],
    retry: false,
    queryFn: () =>
      trpc.TeamScore.filter(
        { month: filters.month, year: filters.year },
        "-total_score",
        20
      ),
  });

  const { data: qualityIssues = [], isError: qualityIssuesError } = useQuery({
    queryKey: ["qualityIssues"],
    retry: false,
    queryFn: () =>
      trpc.DataQualityIssue.filter({ status: "aberto" }, "-created_date", 100),
  });

  const groupedIndicators = indicators.reduce((acc, indicator) => {
    if (!acc[indicator.indicator_code])
      acc[indicator.indicator_code] = indicator;
    return acc;
  }, {});

  const categoryIndicators = {
    all: [...QUALITY_APS_CODES],
    esf: ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
    esb: ["B1", "B2", "B3", "B4", "B5", "B6"],
    emulti: ["M1", "M2"],
  };
  const filteredIndicatorCodes =
    categoryIndicators[activeCategory] || categoryIndicators.all;
  const targets = {
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

  const readyIndicators = Object.values(groupedIndicators).filter(
    indicator =>
      indicator.status === "READY" &&
      typeof indicator.result_percentage === "number" &&
      Number.isFinite(indicator.result_percentage)
  );
  const indicatorsAboveTarget = readyIndicators.filter(
    indicator =>
      indicator.result_percentage >= targets[indicator.indicator_code]
  ).length;
  const qualityScores = readyIndicators.filter(
    indicator =>
      typeof indicator.quality_score === "number" &&
      Number.isFinite(indicator.quality_score)
  );
  const avgQualityScore = qualityScores.length
    ? qualityScores.reduce(
        (sum, indicator) => sum + indicator.quality_score,
        0
      ) / qualityScores.length
    : null;

  const getIndicatorForDisplay = code => {
    if (code === "C1")
      return { indicator_code: "C1", status: "BLOCKED_BY_DATA_CONTRACT" };
    return (
      groupedIndicators[code] || {
        indicator_code: code,
        status: indicatorsError ? "API_UNAVAILABLE" : "NO_DATA",
      }
    );
  };

  const resetFilters = () => {
    setFilters({
      month: currentMonth,
      year: currentYear,
      unitId: null,
      teamId: null,
      microarea: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                SUS Analytics
              </h1>
              <p className="text-sm text-gray-500">
                Visualização do contrato analítico configurado
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-slate-100 text-slate-700 px-3 py-1">
                <Activity className="w-3 h-3 mr-1" />
                Modo standalone
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchIndicators()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <DashboardExport data={{}} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {indicatorsError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            A fonte de indicadores está indisponível ou retornou um contrato
            inválido. Nenhum resultado substituto será exibido.
          </div>
        )}

        <GlobalFilters
          filters={filters}
          onFilterChange={setFilters}
          units={Array.isArray(units) ? units : []}
          teams={Array.isArray(teams) ? teams : []}
          onReset={resetFilters}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Catálogo"
            value={OPERATIONAL_METRIC_CODES.length}
            subtitle="15 Qualidade APS + 6 CVAT"
            icon={Target}
            color="blue"
          />
          <StatsCard
            title="Acima da meta"
            value={indicatorsError ? "—" : indicatorsAboveTarget}
            subtitle={
              indicatorsError
                ? "Validação indisponível"
                : `de ${readyIndicators.length} prontos`
            }
            icon={TrendingUp}
            color="green"
            trend={undefined}
          />
          <StatsCard
            title="Equipes"
            value={teamsError ? "—" : Array.isArray(teams) ? teams.length : "—"}
            subtitle={teamsError ? "Fonte indisponível" : "Retornadas pela API"}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Problemas de dados"
            value={
              qualityIssuesError
                ? "—"
                : Array.isArray(qualityIssues)
                  ? qualityIssues.length
                  : "—"
            }
            subtitle={
              qualityIssuesError ? "Fonte indisponível" : "Retornados pela API"
            }
            icon={AlertTriangle}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="bg-white/80 shadow-sm">
                  <TabsTrigger value="all" className="gap-1">
                    <Activity className="w-4 h-4" />
                    Qualidade APS (15)
                  </TabsTrigger>
                  <TabsTrigger value="esf" className="gap-1">
                    <Users className="w-4 h-4" />
                    eSF/eAP (7)
                  </TabsTrigger>
                  <TabsTrigger value="esb" className="gap-1">
                    eSB (6)
                  </TabsTrigger>
                  <TabsTrigger value="emulti" className="gap-1">
                    <Building2 className="w-4 h-4" />
                    eMulti (2)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIndicatorCodes.map((code, index) => {
                const indicator = getIndicatorForDisplay(code);
                return (
                  <motion.div key={code} initial={{ opacity: 1 }}>
                    <Link
                      to={createPageUrl(
                        `IndicatorDetail?code=${code}&month=${filters.month}&year=${filters.year}`
                      )}
                    >
                      <IndicatorCard
                        code={code}
                        status={indicator.status}
                        result={indicator.result_percentage}
                        numerator={indicator.numerator}
                        denominator={indicator.denominator}
                        qualityScore={indicator.quality_score}
                        trend={indicator.trend}
                        previousResult={indicator.previous_result}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {avgQualityScore !== null ? (
              <QualityScoreCard
                overallScore={Math.round(avgQualityScore)}
                completenessScore={undefined}
                consistencyScore={undefined}
                issuesCount={
                  qualityIssuesError ? undefined : qualityIssues.length
                }
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white/80 p-5 text-sm text-slate-600">
                Qualidade não validada: não há resultados prontos suficientes
                para calcular um score.
              </div>
            )}
            {teamScoresError ? (
              <div className="rounded-lg border border-slate-200 bg-white/80 p-5 text-sm text-slate-600">
                Ranking indisponível: contrato de pontuação não comprovado neste
                checkout.
              </div>
            ) : (
              <Leaderboard
                teams={Array.isArray(teamScores) ? teamScores : []}
                showPodium={true}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <VaccinationCoverage />
          <ChronicConditionsCard />
        </div>
        <div className="mt-6">
          <HomeVisitsByCondition />
        </div>
      </div>
    </div>
  );
}
