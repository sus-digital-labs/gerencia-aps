import trpc from '@/lib/trpc-adapter';
import React, { useState, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Users, UserCheck, AlertCircle, Download, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import IndicatorDetailHeader from '../components/indicators/IndicatorDetailHeader';
import NominalList from '../components/indicators/NominalList';
import HistoricalChart from '../components/charts/HistoricalChart';
import ComparisonChart from '../components/charts/ComparisonChart';
import GlobalFilters from '../components/filters/GlobalFilters';

const indicatorTargets: Record<string, number> = {
  C1: 60, C2: 50, C3: 60, C4: 50, C5: 50, C6: 50, C7: 40,
  B1: 60, B2: 50, B3: 20, B4: 30, B5: 5, B6: 0.5,
  M1: 80, M2: 12
};

export default function IndicatorDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const indicatorCode = urlParams.get('code') || 'C1';
  const initialMonth = parseInt(urlParams.get('month') || String(new Date().getMonth() + 1));
  const initialYear = parseInt(urlParams.get('year') || String(new Date().getFullYear()));

  const [filters, setFilters] = useState<any>({
    month: initialMonth,
    year: initialYear,
    unitId: null,
    teamId: null,
    microarea: null
  });
  const [activeTab, setActiveTab] = useState('overview');

  const { data: indicatorResults = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['indicatorResult', indicatorCode, filters],
    queryFn: async () => {
      const query: any = {
        indicator_code: indicatorCode,
        period_month: filters.month,
        period_year: filters.year
      };
      if (filters.teamId) query.team_id = filters.teamId;
      if (filters.unitId) query.unit_id = filters.unitId;
      return trpc.IndicatorResult.filter(query, '-result_percentage');
    }
  });

  const { data: historicalData = [] } = useQuery<any[]>({
    queryKey: ['historicalData', indicatorCode, filters.teamId],
    queryFn: async () => {
      const query: any = { indicator_code: indicatorCode };
      if (filters.teamId) query.team_id = filters.teamId;
      const results = await trpc.IndicatorResult.filter(query, 'period_year,period_month', 24);
      return results.map((r: any) => ({
        month: r.period_month,
        year: r.period_year,
        result: r.result_percentage
      }));
    }
  });

  const { data: comparisonData = [] } = useQuery<any[]>({
    queryKey: ['comparisonData', indicatorCode, filters.month, filters.year],
    queryFn: async () => {
      const results = await trpc.IndicatorResult.filter({
        indicator_code: indicatorCode,
        period_month: filters.month,
        period_year: filters.year
      }, '-result_percentage', 15);
      
      const grouped: Record<string, any> = {};
      results.forEach((r: any) => {
        if (!grouped[r.team_id]) {
          grouped[r.team_id] = r;
        }
      });
      return Object.values(grouped).map((r: any) => ({
        name: r.team_name || `Equipe ${r.team_id}`,
        result: r.result_percentage,
        numerator: r.numerator,
        denominator: r.denominator
      })).slice(0, 10);
    }
  });

  const { data: citizenStatus = [] } = useQuery<any[]>({
    queryKey: ['citizenStatus', indicatorCode, filters],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/trpc/ledi.listaNominal?input=${encodeURIComponent(JSON.stringify({
          indicador: indicatorCode,
          tipo: 'denominador',
          limite: 200
        }))}`);
        const data = await response.json();
        if (data.result?.data?.cidadaos) {
          return data.result.data.cidadaos.map((c: any) => ({
            citizen_cns: c.cns || '',
            citizen_name: c.nome,
            citizen_cpf: c.cpf,
            birth_date: c.dataNascimento,
            status: c.cpf && c.cns ? 'completo' : 'pendente',
            pending_criteria: !c.cpf ? 'CPF faltante' : (!c.cns ? 'CNS faltante' : null)
          }));
        }
      } catch (error) {
        console.log('Usando dados locais:', error);
      }
      const query: any = {
        indicator_code: indicatorCode,
        period_month: filters.month,
        period_year: filters.year
      };
      if (filters.teamId) query.team_id = filters.teamId;
      return trpc.CitizenIndicatorStatus.filter(query, '-updated_date', 200);
    }
  });

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: () => trpc.HealthUnit.filter({ active: true })
  });

  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['teams'],
    queryFn: () => trpc.HealthTeam.filter({ active: true })
  });

  const mainResult = indicatorResults.length > 0 ? indicatorResults.reduce((acc, r) => ({
    result_percentage: acc.result_percentage + r.result_percentage,
    numerator: acc.numerator + (r.numerator || 0),
    denominator: acc.denominator + (r.denominator || 0),
    quality_score: acc.quality_score + (r.quality_score || 90),
    count: acc.count + 1
  }), { result_percentage: 0, numerator: 0, denominator: 0, quality_score: 0, count: 0 }) : null;

  const aggregatedResult = mainResult ? {
    ...indicatorResults[0],
    result_percentage: mainResult.numerator && mainResult.denominator ? 
      (mainResult.numerator / mainResult.denominator) * 100 : 
      mainResult.result_percentage / mainResult.count,
    numerator: mainResult.numerator,
    denominator: mainResult.denominator,
    quality_score: mainResult.quality_score / mainResult.count
  } : null;

  const pendingCitizens = citizenStatus.filter(c => c.status === 'pendente');
  const completeCitizens = citizenStatus.filter(c => c.status === 'completo');
  const allCitizens = citizenStatus;

  const resetFilters = () => {
    setFilters({
      month: initialMonth,
      year: initialYear,
      unitId: null,
      teamId: null,
      microarea: null
    });
  };

  const handleOpenProntuario = (citizen: any) => {
    window.open(`https://esus-pec.local/prontuario?cns=${citizen.citizen_cns}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Detalhe do Indicador {indicatorCode}</h1>
                <p className="text-sm text-gray-500">Análise detalhada e listas nominais</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Filtros */}
        <GlobalFilters
          filters={filters}
          onFilterChange={setFilters}
          units={units}
          teams={teams}
          onReset={resetFilters}
        />

        {/* Header do Indicador */}
        {aggregatedResult && (
          <IndicatorDetailHeader
            code={indicatorCode}
            result={aggregatedResult.result_percentage || 0}
            numerator={aggregatedResult.numerator}
            denominator={aggregatedResult.denominator}
            qualityScore={aggregatedResult.quality_score}
            trend={aggregatedResult.trend}
            previousResult={aggregatedResult.previous_result}
            periodMonth={filters.month}
            periodYear={filters.year}
            teamName={filters.teamId ? teams.find((t: any) => t.id === filters.teamId)?.name : null}
            unitName={filters.unitId ? units.find((u: any) => u.id === filters.unitId)?.name : null}
            onBack={() => window.history.back()}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 shadow-sm p-1">
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="w-4 h-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="denominator" className="gap-2">
              <Users className="w-4 h-4" />
              Denominador ({allCitizens.length})
            </TabsTrigger>
            <TabsTrigger value="numerator" className="gap-2">
              <UserCheck className="w-4 h-4" />
              Numerador ({completeCitizens.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendentes ({pendingCitizens.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HistoricalChart
                  data={historicalData}
                  target={indicatorTargets[indicatorCode] || 50}
                  title="Evolução Histórica"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <ComparisonChart
                  data={comparisonData}
                  target={indicatorTargets[indicatorCode] || 50}
                  title="Comparativo por Equipe"
                />
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="denominator">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <NominalList
                citizens={allCitizens}
                type="denominator"
                indicatorCode={indicatorCode}
                onOpenProntuario={handleOpenProntuario}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="numerator">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <NominalList
                citizens={completeCitizens}
                type="numerator"
                indicatorCode={indicatorCode}
                onOpenProntuario={handleOpenProntuario}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="pending">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <NominalList
                citizens={pendingCitizens}
                type="pending"
                indicatorCode={indicatorCode}
                onOpenProntuario={handleOpenProntuario}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
