import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trophy, Crown, Medal, Star, TrendingUp, Users, 
  Calendar, RefreshCw, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import ACSRankingCard from '../components/ranking/ACSRankingCard';
import ChampionsTimeline from '../components/ranking/ChampionsTimeline';
import TitlesRanking from '../components/ranking/TitlesRanking';

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = [currentYear, currentYear - 1, currentYear - 2];

export default function ACSRanking() {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [activeTab, setActiveTab] = useState<string>('ranking');
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const { data: rankings = [], isLoading: loadingRankings } = useQuery({
    queryKey: ['acsRankings', selectedYear, selectedMonth],
    queryFn: () => trpc.ACSRanking.filter({ 
      year: selectedYear, 
      month: selectedMonth 
    }, 'position')
  });

  const { data: yearRankings = [] } = useQuery({
    queryKey: ['acsYearRankings', selectedYear],
    queryFn: () => trpc.ACSRanking.filter({ year: selectedYear }, 'position')
  });

  const { data: champions = [] } = useQuery({
    queryKey: ['acsChampions', selectedYear],
    queryFn: () => trpc.ACSChampion.filter({ year: selectedYear })
  });

  const { data: acsList = [] } = useQuery({
    queryKey: ['acs'],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true })
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['homeVisits'],
    queryFn: () => trpc.HomeVisit.filter({}, '-visit_date', 2000)
  });

  const { data: units = [] } = useQuery({
    queryKey: ['healthUnits'],
    queryFn: () => trpc.HealthUnit.filter({ active: true })
  });

  const titles = useMemo(() => {
    const titleCounts: Record<string, any> = {};
    champions.forEach((c: any) => {
      if (!titleCounts[c.acs_id]) {
        titleCounts[c.acs_id] = {
          acsId: c.acs_id,
          nome: c.acs_name,
          quantidade: 0,
          photo_url: c.photo_url
        };
      }
      titleCounts[c.acs_id].quantidade++;
    });
    return Object.values(titleCounts);
  }, [champions]);

  const generateRankingMutation = useMutation({
    mutationFn: async () => {
      const monthVisits = visits.filter((v: any) => {
        if (!v.visit_date) return false;
        const date = new Date(v.visit_date);
        return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
      });

      const acsPoints: Record<string, any> = {};
      
      acsList.forEach((acs: any) => {
        const unit = units.find((u: any) => u.id === acs.unit_id);
        acsPoints[acs.id] = {
          acs_id: acs.id,
          acs_name: acs.name,
          unit_id: acs.unit_id,
          unit_name: unit?.name || 'Unidade',
          microarea: acs.microarea,
          month: selectedMonth,
          year: selectedYear,
          points: 0,
          visits_count: 0,
          families_updated: 0,
          complete_registrations: 0,
          cases_monitored: 0,
          photo_url: acs.photo_url
        };
      });

      monthVisits.forEach((visit: any) => {
        if (acsPoints[visit.acs_id]) {
          acsPoints[visit.acs_id].visits_count++;
          acsPoints[visit.acs_id].points += 10;
          if (visit.desfecho === 'visita_realizada') {
            acsPoints[visit.acs_id].points += 5;
          }
          if (visit.conditions_found?.length > 0) {
            acsPoints[visit.acs_id].points += visit.conditions_found.length * 2;
            acsPoints[visit.acs_id].cases_monitored += visit.conditions_found.length;
          }
        }
      });

      const sorted = Object.values(acsPoints).sort((a: any, b: any) => b.points - a.points);
      
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
      const prevRankings = await trpc.ACSRanking.filter({ 
        year: prevYear, 
        month: prevMonth 
      });
      
      const prevPositions: Record<string, number> = {};
      prevRankings.forEach((r: any) => {
        prevPositions[r.acs_id] = r.position;
      });

      const existingRankings = await trpc.ACSRanking.filter({
        year: selectedYear,
        month: selectedMonth
      });
      await Promise.all(existingRankings.map((r: any) => trpc.ACSRanking.delete(r.id)));

      const newRankings = sorted.map((acs: any, idx: number) => ({
        ...acs,
        position: idx + 1,
        previous_position: prevPositions[acs.acs_id] || null,
        variation: prevPositions[acs.acs_id] ? prevPositions[acs.acs_id] - (idx + 1) : 0,
        is_champion: idx === 0
      }));

      await trpc.ACSRanking.bulkCreate(newRankings);

      if (sorted[0] && sorted[0].points > 0) {
        const existingChampion = champions.find((c: any) => 
          c.month === selectedMonth && c.year === selectedYear
        );
        if (existingChampion) {
          await trpc.ACSChampion.delete(existingChampion.id);
        }
        await trpc.ACSChampion.create({
          acs_id: sorted[0].acs_id,
          acs_name: sorted[0].acs_name,
          unit_name: sorted[0].unit_name,
          microarea: sorted[0].microarea,
          month: selectedMonth,
          year: selectedYear,
          points: sorted[0].points,
          photo_url: sorted[0].photo_url
        });
      }

      return newRankings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acsRankings'] });
      queryClient.invalidateQueries({ queryKey: ['acsYearRankings'] });
      queryClient.invalidateQueries({ queryKey: ['acsChampions'] });
      setShowConfetti(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  });

  const champion = rankings.find((r: any) => r.position === 1);
  const totalParticipants = rankings.length;
  const totalPoints = rankings.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
  const revelation = useMemo(() => {
    return [...rankings]
      .filter((r: any) => r.variation && r.variation > 0)
      .sort((a: any, b: any) => b.variation - a.variation)[0];
  }, [rankings]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="p-3 bg-white/20 rounded-2xl"
              >
                <Trophy className="w-8 h-8" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Ranking dos ACS</h1>
                <p className="text-white/70">Gamificação e reconhecimento dos Agentes Comunitários</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-36 bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24 bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => generateRankingMutation.mutate()}
                disabled={generateRankingMutation.isPending}
                className="gap-2 bg-white text-amber-600 hover:bg-amber-50"
              >
                <RefreshCw className={`w-4 h-4 ${generateRankingMutation.isPending ? 'animate-spin' : ''}`} />
                {generateRankingMutation.isPending ? 'Calculando...' : 'Calcular Ranking'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Crown className="w-8 h-8 text-yellow-200" />
                  <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-yellow-300" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Campeão do Mês</p>
                  <p className="text-lg font-bold truncate max-w-[120px]">
                    {champion?.acs_name || 'A definir'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-200" />
                <div>
                  <p className="text-white/70 text-sm">Participantes</p>
                  <p className="text-2xl font-bold">{totalParticipants}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-200" />
                <div>
                  <p className="text-white/70 text-sm">Total de Pontos</p>
                  <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-200" />
                <div>
                  <p className="text-white/70 text-sm">ACS Revelação</p>
                  <p className="text-lg font-bold truncate max-w-[120px]">
                    {revelation?.acs_name || '-'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/80 shadow-sm">
            <TabsTrigger value="ranking" className="gap-2">
              <Medal className="w-4 h-4" />
              Ranking Geral
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" />
              Campeões do Ano
            </TabsTrigger>
            <TabsTrigger value="titles" className="gap-2">
              <Crown className="w-4 h-4" />
              Mais Títulos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="mt-6">
            {loadingRankings ? (
              <div className="text-center py-12 text-gray-500">Carregando ranking...</div>
            ) : rankings.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-12 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhum ranking gerado</h3>
                  <p className="text-gray-500 mb-4">
                    Clique em "Calcular Ranking" para gerar o ranking do mês
                  </p>
                  <Button 
                    onClick={() => generateRankingMutation.mutate()}
                    disabled={generateRankingMutation.isPending}
                    className="gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${generateRankingMutation.isPending ? 'animate-spin' : ''}`} />
                    Calcular Ranking
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="md:order-1">
                    {rankings[1] && (
                      <ACSRankingCard ranking={rankings[1]} index={1} />
                    )}
                  </div>
                  <div className="md:order-2">
                    {rankings[0] && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.4 }}
                      >
                        <ACSRankingCard ranking={rankings[0]} index={0} />
                      </motion.div>
                    )}
                  </div>
                  <div className="md:order-3">
                    {rankings[2] && (
                      <ACSRankingCard ranking={rankings[2]} index={2} />
                    )}
                  </div>
                </div>

                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Ranking Completo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {rankings.slice(3).map((ranking: any, idx: number) => (
                        <ACSRankingCard 
                          key={ranking.id} 
                          ranking={ranking} 
                          index={idx + 3}
                          compact
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <ChampionsTimeline 
              champions={champions}
              rankings={yearRankings}
              year={selectedYear}
            />
          </TabsContent>

          <TabsContent value="titles" className="mt-6">
            <TitlesRanking titles={titles} year={selectedYear} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
