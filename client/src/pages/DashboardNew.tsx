// @ts-nocheck
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Users, Building2, Trophy, AlertTriangle, TrendingUp, Target, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

export default function Dashboard() {
  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
  });
  const [activeCategory, setActiveCategory] = useState('all');

  // Fetch indicator results usando tRPC
  const { data: indicatorsData, isLoading: loadingIndicators, refetch } = trpc.indicadores.filter.useQuery({
    period_month: filters.month,
    period_year: filters.year,
  });

  const indicators = indicatorsData || [];

  // Fetch units
  const { data: units = [] } = trpc.healthUnits.filter.useQuery({ active: true });

  // Fetch teams
  const { data: teams = [] } = trpc.healthTeams.filter.useQuery({ active: true });

  // Fetch scores for ranking
  const { data: teamScores = [] } = trpc.teamScores.filter.useQuery({
    month: filters.month,
    year: filters.year,
  });

  // Fetch quality issues
  const { data: qualityIssues = [] } = trpc.dataQuality.filter.useQuery({ status: 'aberto' });

  // Group indicators by code
  const groupedIndicators = indicators.reduce((acc: any, ind: any) => {
    if (!acc[ind.indicator_code]) {
      acc[ind.indicator_code] = ind;
    }
    return acc;
  }, {});

  // Filter by category
  const categoryIndicators: Record<string, string[]> = {
    all: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'B1', 'B2', 'B3', 'M1', 'M2'],
    esf: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'],
    esb: ['B1', 'B2', 'B3'],
    emulti: ['M1', 'M2']
  };

  const filteredIndicatorCodes = categoryIndicators[activeCategory] || categoryIndicators.all;

  // Calculate stats
  const targets: Record<string, number> = { 
    C1: 60, C2: 50, C3: 60, C4: 50, C5: 50, C6: 50, C7: 40, 
    B1: 60, B2: 50, B3: 20, 
    M1: 80, M2: 12 
  };

  const indicatorsAboveTarget = Object.values(groupedIndicators).filter((i: any) => {
    return i.result_percentage >= (targets[i.indicator_code] || 50);
  }).length;

  const totalIndicators = Object.keys(groupedIndicators).length;
  const avgQualityScore = Object.values(groupedIndicators).reduce((sum: number, i: any) => sum + (i.quality_score || 90), 0) / Math.max(totalIndicators, 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
              <p className="text-sm text-gray-500">Sistema de Monitoramento Previne Brasil</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1">
                <Activity className="w-3 h-3 mr-1" />
                Tempo Real
              </Badge>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium opacity-90">Total de Indicadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{totalIndicators}</div>
                <p className="text-xs opacity-75 mt-1">Monitorados ativamente</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium opacity-90">Acima da Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{indicatorsAboveTarget}</div>
                <p className="text-xs opacity-75 mt-1">
                  {totalIndicators > 0 ? Math.round((indicatorsAboveTarget / totalIndicators) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium opacity-90">Qualidade Média</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{avgQualityScore.toFixed(1)}%</div>
                <p className="text-xs opacity-75 mt-1">Dos dados cadastrais</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium opacity-90">Problemas Abertos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{qualityIssues.length}</div>
                <p className="text-xs opacity-75 mt-1">Requerem atenção</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Category Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Indicadores por Categoria</CardTitle>
            <CardDescription>Selecione uma categoria para filtrar os indicadores</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="esf">ESF</TabsTrigger>
                <TabsTrigger value="esb">ESB</TabsTrigger>
                <TabsTrigger value="emulti">eMulti</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Indicators Grid */}
        {loadingIndicators ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIndicatorCodes.map((code) => {
              const indicator = groupedIndicators[code];
              if (!indicator) return null;

              const target = targets[code] || 50;
              const isAboveTarget = indicator.result_percentage >= target;

              return (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className={`border-l-4 ${isAboveTarget ? 'border-l-emerald-500' : 'border-l-orange-500'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-2">{code}</Badge>
                          <CardTitle className="text-sm font-medium leading-tight">
                            {indicator.indicator_name}
                          </CardTitle>
                        </div>
                        {isAboveTarget ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-gray-900">
                            {indicator.result_percentage.toFixed(1)}%
                          </span>
                          <span className="text-sm text-gray-500">Meta: {target}%</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {indicator.numerator} / {indicator.denominator}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isAboveTarget ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min((indicator.result_percentage / target) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Ranking */}
        {teamScores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ranking de Equipes
              </CardTitle>
              <CardDescription>Top 10 equipes com melhor desempenho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teamScores.slice(0, 10).map((team: any, index: number) => (
                  <div key={team.team_id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{team.team_name}</p>
                      <p className="text-xs text-gray-500">INE: {team.ine}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{team.total_score.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">pontos</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
