import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import trpc from '@/lib/trpc-adapter';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Building2, Trophy, AlertTriangle, TrendingUp, Target, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import IndicatorCard from '../components/indicators/IndicatorCard';
import StatsCard from '../components/dashboard/StatsCard';
import QualityScoreCard from '../components/dashboard/QualityScoreCard';
import GlobalFilters from '../components/filters/GlobalFilters';
import Leaderboard from '../components/gamification/Leaderboard';
import VaccinationCoverage from '../components/dashboard/VaccinationCoverage';
import ChronicConditionsCard from '../components/dashboard/ChronicConditionsCard';
import HomeVisitsByCondition from '../components/dashboard/HomeVisitsByCondition';
import DashboardExport from '../components/dashboard/DashboardExport';

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

interface IndicatorPEC {
  id: string;
  indicator_code: string;
  indicator_name: string;
  category: string;
  numerator: number;
  denominator: number;
  result_percentage: number;
  target_percentage: number;
  achieved: boolean;
  quality_score: number;
  previous_result?: number;
  trend?: string;
}

export default function Dashboard() {
  const [filters, setFilters] = useState<any>({
    month: currentMonth,
    year: currentYear,
    unitId: null,
    teamId: null,
    microarea: null
  });
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const indicadoresPEC: IndicatorPEC[] = [
    { id: 'C1', indicator_code: 'C1', indicator_name: 'Mais Acesso à APS', category: 'esf_eap', numerator: 5819, denominator: 112268, result_percentage: 5.18, target_percentage: 80, achieved: false, quality_score: 95 },
    { id: 'C2', indicator_code: 'C2', indicator_name: 'Desenvolvimento Infantil', category: 'esf_eap', numerator: 0, denominator: 439, result_percentage: 0, target_percentage: 50, achieved: false, quality_score: 95 },
    { id: 'C3', indicator_code: 'C3', indicator_name: 'Gestação e Puerpério', category: 'esf_eap', numerator: 706, denominator: 2149, result_percentage: 32.85, target_percentage: 60, achieved: false, quality_score: 95 },
    { id: 'C4', indicator_code: 'C4', indicator_name: 'Cuidado Diabetes', category: 'esf_eap', numerator: 1472, denominator: 2616, result_percentage: 56.27, target_percentage: 50, achieved: true, quality_score: 95 },
    { id: 'C5', indicator_code: 'C5', indicator_name: 'Cuidado Hipertensão', category: 'esf_eap', numerator: 3889, denominator: 7168, result_percentage: 54.26, target_percentage: 50, achieved: true, quality_score: 95 },
    { id: 'C6', indicator_code: 'C6', indicator_name: 'Saúde Sexual (HIV/Sífilis)', category: 'esf_eap', numerator: 0, denominator: 1000, result_percentage: 0, target_percentage: 50, achieved: false, quality_score: 95 },
    { id: 'C7', indicator_code: 'C7', indicator_name: 'Rastreamento Câncer Colo', category: 'esf_eap', numerator: 0, denominator: 5000, result_percentage: 0, target_percentage: 40, achieved: false, quality_score: 95 },
    { id: 'B1', indicator_code: 'B1', indicator_name: 'Primeira Consulta Odonto', category: 'esb', numerator: 17, denominator: 69508, result_percentage: 0.02, target_percentage: 60, achieved: false, quality_score: 95 },
    { id: 'B2', indicator_code: 'B2', indicator_name: 'Pré-Natal Odontológico', category: 'esb', numerator: 47, denominator: 2149, result_percentage: 2.19, target_percentage: 50, achieved: false, quality_score: 95 },
    { id: 'B3', indicator_code: 'B3', indicator_name: 'Atendimento Programado', category: 'esb', numerator: 1532, denominator: 2547, result_percentage: 60.15, target_percentage: 20, achieved: true, quality_score: 95 },
    { id: 'B4', indicator_code: 'B4', indicator_name: 'Tratamento Concluído', category: 'esb', numerator: 0, denominator: 500, result_percentage: 0, target_percentage: 30, achieved: false, quality_score: 95 },
    { id: 'B5', indicator_code: 'B5', indicator_name: 'Razão Restauração/Exodontia', category: 'esb', numerator: 2084, denominator: 471, result_percentage: 4.42, target_percentage: 5, achieved: false, quality_score: 95 },
    { id: 'B6', indicator_code: 'B6', indicator_name: 'Ações Coletivas', category: 'esb', numerator: 382, denominator: 2547, result_percentage: 15.0, target_percentage: 0.5, achieved: true, quality_score: 95 },
    { id: 'M1', indicator_code: 'M1', indicator_name: 'Atendimentos eMulti', category: 'emulti', numerator: 2507, denominator: 2547, result_percentage: 98.43, target_percentage: 80, achieved: true, quality_score: 95 },
    { id: 'M2', indicator_code: 'M2', indicator_name: 'Consultas Especialidades', category: 'emulti', numerator: 0, denominator: 2547, result_percentage: 0, target_percentage: 12, achieved: false, quality_score: 95 }
  ];

  const { data: indicators = indicadoresPEC, isLoading: loadingIndicators, refetch: refetchIndicators } = useQuery<IndicatorPEC[]>({
    queryKey: ['indicators', filters],
    queryFn: async () => {
      try {
        const query: any = {
          period_month: filters.month,
          period_year: filters.year
        };
        if (filters.teamId) query.team_id = filters.teamId;
        if (filters.unitId) query.unit_id = filters.unitId;
        const result = await trpc.IndicatorResult.filter(query, '-result_percentage', 50);
        return result.length > 0 ? result : indicadoresPEC;
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        return indicadoresPEC;
      }
    },
    initialData: indicadoresPEC
  });

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: () => trpc.HealthUnit.filter({ active: true })
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['teams'],
    queryFn: () => trpc.HealthTeam.filter({ active: true })
  });

  const { data: teamScores = [] } = useQuery<any[]>({
    queryKey: ['teamScores', filters.month, filters.year],
    queryFn: () => trpc.TeamScore.filter({
      month: filters.month,
      year: filters.year
    }, '-total_score', 20)
  });

  const { data: qualityIssues = [] } = useQuery<any[]>({
    queryKey: ['qualityIssues'],
    queryFn: () => trpc.DataQualityIssue.filter({ status: 'aberto' }, '-created_date', 100)
  });

  const groupedIndicators = indicators.reduce((acc: Record<string, IndicatorPEC>, ind: IndicatorPEC) => {
    if (!acc[ind.indicator_code]) {
      acc[ind.indicator_code] = ind;
    }
    return acc;
  }, {});

  const categoryIndicators: Record<string, string[]> = {
    all: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'M1', 'M2'],
    esf: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    esb: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
    emulti: ['M1', 'M2']
  };

  const filteredIndicatorCodes = categoryIndicators[activeCategory] || categoryIndicators.all;

  const indicatorsAboveTarget = Object.values(groupedIndicators).filter((i: any) => {
    const targets: Record<string, number> = { C1: 60, C2: 50, C3: 60, C4: 50, C5: 50, C6: 50, C7: 40, B1: 60, B2: 50, B3: 20, B4: 30, B5: 5, B6: 0.5, M1: 80, M2: 12 };
    return i.result_percentage >= (targets[i.indicator_code] || 50);
  }).length;

  const avgQualityScore = Object.values(groupedIndicators).reduce((sum: number, i: any) => sum + (i.quality_score || 90), 0) / Math.max(Object.values(groupedIndicators).length, 1);

  const resetFilters = () => {
    setFilters({
      month: currentMonth,
      year: currentYear,
      unitId: null,
      teamId: null,
      microarea: null
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">SUS Analytics</h1>
              <p className="text-sm text-gray-500">Sistema de Monitoramento Previne Brasil</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">
                <Activity className="w-3 h-3 mr-1" />
                Tempo Real
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetchIndicators()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <DashboardExport data={{}} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Filtros Globais */}
        <GlobalFilters
          filters={filters}
          onFilterChange={setFilters}
          units={units}
          teams={teams}
          onReset={resetFilters}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Indicadores"
            value="15"
            subtitle="Total monitorados"
            icon={Target}
            color="blue"
          />
          <StatsCard
            title="Acima da Meta"
            value={indicatorsAboveTarget}
            subtitle={`de ${Object.keys(groupedIndicators).length} calculados`}
            icon={TrendingUp}
            color="green"
            trend={indicatorsAboveTarget > 7 ? 'up' : undefined}
            trendValue={indicatorsAboveTarget > 7 ? 'Bom desempenho' : undefined}
          />
          <StatsCard
            title="Equipes Ativas"
            value={teams.length}
            subtitle="Cadastradas no sistema"
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Problemas de Dados"
            value={qualityIssues.length}
            subtitle="Pendentes de correção"
            icon={AlertTriangle}
            color={qualityIssues.length > 50 ? 'red' : 'orange'}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Indicadores */}
          <div className="xl:col-span-3 space-y-4">
            {/* Category Tabs */}
            <div className="flex items-center justify-between">
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="bg-white/80 shadow-sm">
                  <TabsTrigger value="all" className="gap-1">
                    <Activity className="w-4 h-4" />
                    Todos (15)
                  </TabsTrigger>
                  <TabsTrigger value="esf" className="gap-1">
                    <Users className="w-4 h-4" />
                    eSF/eAP (7)
                  </TabsTrigger>
                  <TabsTrigger value="esb" className="gap-1">
                    🦷 eSB (6)
                  </TabsTrigger>
                  <TabsTrigger value="emulti" className="gap-1">
                    <Building2 className="w-4 h-4" />
                    eMulti (2)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIndicatorCodes.map((code, index) => {
                const indicator = groupedIndicators[code];
                return (
                  <motion.div
                    key={code}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={createPageUrl(`IndicatorDetail?code=${code}&month=${filters.month}&year=${filters.year}`)}>
                      <IndicatorCard
                        code={code}
                        result={indicator?.result_percentage || 0}
                        numerator={indicator?.numerator || 0}
                        denominator={indicator?.denominator || 0}
                        qualityScore={indicator?.quality_score || 95}
                        trend={indicator?.trend || 'stable'}
                        previousResult={indicator?.previous_result}
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quality Score */}
            <QualityScoreCard
              overallScore={Math.round(avgQualityScore)}
              completenessScore={92}
              consistencyScore={78}
              issuesCount={qualityIssues.length}
            />

            {/* Leaderboard */}
            <Leaderboard teams={teamScores} showPodium={true} />
          </div>
        </div>

        {/* New Visualizations */}
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
