import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Calendar, TrendingUp, Target, Award, Flame, Crown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Leaderboard from '../components/gamification/Leaderboard';
import BadgeCard from '../components/gamification/BadgeCard';

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
  { value: 12, label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const allBadges = [
  { badge_code: 'META_C1', badge_name: 'Acesso Garantido', badge_description: 'Atingiu meta do indicador C1 - Mais Acesso à APS' },
  { badge_code: 'META_C2', badge_name: 'Guardiões da Infância', badge_description: 'Atingiu meta do indicador C2 - Desenvolvimento Infantil' },
  { badge_code: 'META_C3', badge_name: 'Cuidado Materno', badge_description: 'Atingiu meta do indicador C3 - Gestação e Puerpério' },
  { badge_code: 'META_C4', badge_name: 'Controle do Diabetes', badge_description: 'Atingiu meta do indicador C4 - Cuidado Diabetes' },
  { badge_code: 'META_C5', badge_name: 'Coração Saudável', badge_description: 'Atingiu meta do indicador C5 - Cuidado Hipertensão' },
  { badge_code: 'META_C6', badge_name: 'Saúde Sexual', badge_description: 'Atingiu meta do indicador C6 - HIV/Sífilis' },
  { badge_code: 'META_C7', badge_name: 'Prevenção Rosa', badge_description: 'Atingiu meta do indicador C7 - Câncer de Colo' },
  { badge_code: 'META_B1', badge_name: 'Sorriso Inicial', badge_description: 'Atingiu meta do indicador B1 - Primeira Consulta' },
  { badge_code: 'META_B2', badge_name: 'Gestante Sorridente', badge_description: 'Atingiu meta do indicador B2 - Pré-Natal Odonto' },
  { badge_code: 'CAMPEAO_MES', badge_name: 'Campeão do Mês', badge_description: '1º lugar no ranking mensal' },
  { badge_code: 'MELHORIA_10', badge_name: 'Melhoria Contínua', badge_description: 'Melhorou 10% ou mais em relação ao mês anterior' },
  { badge_code: 'QUALIDADE_100', badge_name: 'Qualidade Total', badge_description: '100% de qualidade de dados' },
  { badge_code: 'TODAS_METAS', badge_name: 'Excelência Total', badge_description: 'Atingiu todas as metas no período' },
  { badge_code: 'TOP3_CONSECUTIVO', badge_name: 'Consistência', badge_description: 'Top 3 por 3 meses consecutivos' },
];

export default function Gamification() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Fetch team scores
  const { data: teamScores = [] } = useQuery({
    queryKey: ['teamScores', selectedMonth, selectedYear],
    queryFn: () => trpc.TeamScore.filter({
      month: selectedMonth,
      year: selectedYear
    }, '-total_score', 50)
  });

  // Fetch badges
  const { data: badges = [] } = useQuery({
    queryKey: ['badges', selectedMonth, selectedYear],
    queryFn: () => trpc.TeamBadge.filter({
      period_month: selectedMonth,
      period_year: selectedYear
    })
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => trpc.HealthTeam.filter({ active: true })
  });

  // Calculate stats
  const totalBadges = badges.length;
  const champion = teamScores[0];
  const topScore = champion?.total_score || 0;

  // Get badges for selected team
  const teamBadges = selectedTeam 
    ? badges.filter(b => b.team_id === selectedTeam)
    : badges;

  // Get earned badge codes
  const earnedBadgeCodes = teamBadges.map(b => b.badge_code);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Gamificação</h1>
                <p className="text-white/70">Ranking e conquistas das equipes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                <Calendar className="w-4 h-4 text-white/70" />
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="border-0 bg-transparent text-white w-32 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="border-0 bg-transparent text-white w-24 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-yellow-300" />
                <div>
                  <p className="text-white/70 text-sm">Campeão</p>
                  <p className="text-xl font-bold truncate">{champion?.team_name || '-'}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-orange-300" />
                <div>
                  <p className="text-white/70 text-sm">Maior Pontuação</p>
                  <p className="text-xl font-bold">{topScore.toLocaleString()} pts</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-yellow-300" />
                <div>
                  <p className="text-white/70 text-sm">Conquistas do Mês</p>
                  <p className="text-xl font-bold">{totalBadges}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-emerald-300" />
                <div>
                  <p className="text-white/70 text-sm">Equipes Participantes</p>
                  <p className="text-xl font-bold">{teamScores.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Ranking */}
          <div className="xl:col-span-2">
            <Leaderboard teams={teamScores} showPodium={true} />
          </div>

          {/* Conquistas */}
          <div className="space-y-6">
            <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Conquistas Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-4">
                  <Select
                    value={selectedTeam || 'all'}
                    onValueChange={(v) => setSelectedTeam(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todas as Equipes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Equipes</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                  <AnimatePresence>
                    {allBadges.map((badge, index) => (
                      <motion.div
                        key={badge.badge_code}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <BadgeCard 
                          badge={badge} 
                          earned={earnedBadgeCodes.includes(badge.badge_code)}
                          showDate={false}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}