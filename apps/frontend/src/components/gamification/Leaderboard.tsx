import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const teamTypeColors: Record<string, string> = {
  'eSF': 'bg-blue-100 text-blue-700',
  'eAP': 'bg-cyan-100 text-cyan-700',
  'eSB': 'bg-purple-100 text-purple-700',
  'eMulti': 'bg-orange-100 text-orange-700',
};

export interface Team {
  id: string | number;
  team_name: string;
  team_type: string;
  total_score?: number;
  badges_count?: number;
  indicators_above_target?: number;
}

export interface LeaderboardProps {
  teams: Team[];
  showPodium?: boolean;
}

export default function Leaderboard({ teams, showPodium = true }: LeaderboardProps) {
  const topThree = teams.slice(0, 3);
  const others = teams.slice(3);

  const getPodiumIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2: return <Medal className="w-7 h-7 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return null;
    }
  };

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-300 ring-2 ring-yellow-200';
      case 2: return 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300';
      case 3: return 'bg-gradient-to-br from-orange-50 to-amber-50 border-amber-200';
      default: return 'bg-white';
    }
  };

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <CardTitle className="flex items-center gap-3">
          <Trophy className="w-6 h-6" />
          Ranking de Equipes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Pódio */}
        {showPodium && topThree.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center pt-8"
            >
              {topThree[1] && (
                <div className={`w-full rounded-2xl p-4 border-2 ${getPodiumStyle(2)} text-center`}>
                  <div className="flex justify-center mb-2">{getPodiumIcon(2)}</div>
                  <div className="text-3xl font-black text-gray-400 mb-1">2º</div>
                  <p className="font-bold text-gray-800 text-sm line-clamp-2">{topThree[1].team_name}</p>
                  <Badge className={`mt-2 ${teamTypeColors[topThree[1].team_type] || 'bg-gray-100'}`}>
                    {topThree[1].team_type}
                  </Badge>
                  <div className="mt-3 text-2xl font-black text-gray-600">
                    {topThree[1].total_score?.toLocaleString()} pts
                  </div>
                </div>
              )}
            </motion.div>

            {/* 1º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              {topThree[0] && (
                <div className={`w-full rounded-2xl p-4 border-2 ${getPodiumStyle(1)} text-center`}>
                  <div className="flex justify-center mb-2">{getPodiumIcon(1)}</div>
                  <div className="text-4xl font-black text-yellow-500 mb-1">1º</div>
                  <p className="font-bold text-gray-800 text-sm line-clamp-2">{topThree[0].team_name}</p>
                  <Badge className={`mt-2 ${teamTypeColors[topThree[0].team_type] || 'bg-gray-100'}`}>
                    {topThree[0].team_type}
                  </Badge>
                  <div className="mt-3 text-3xl font-black text-yellow-600">
                    {topThree[0].total_score?.toLocaleString()} pts
                  </div>
                  {(topThree[0].badges_count || 0) > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-xs text-amber-600">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {topThree[0].badges_count} conquistas
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* 3º Lugar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center pt-12"
            >
              {topThree[2] && (
                <div className={`w-full rounded-2xl p-4 border-2 ${getPodiumStyle(3)} text-center`}>
                  <div className="flex justify-center mb-2">{getPodiumIcon(3)}</div>
                  <div className="text-2xl font-black text-amber-600 mb-1">3º</div>
                  <p className="font-bold text-gray-800 text-sm line-clamp-2">{topThree[2].team_name}</p>
                  <Badge className={`mt-2 ${teamTypeColors[topThree[2].team_type] || 'bg-gray-100'}`}>
                    {topThree[2].team_type}
                  </Badge>
                  <div className="mt-3 text-xl font-black text-gray-500">
                    {topThree[2].total_score?.toLocaleString()} pts
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Lista restante */}
        <div className="space-y-2">
          <AnimatePresence>
            {others.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
                  {index + 4}º
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{team.team_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`${teamTypeColors[team.team_type] || 'bg-gray-100'} text-xs`}>
                      {team.team_type}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {team.indicators_above_target || 0} metas atingidas
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-800">{team.total_score?.toLocaleString()} pts</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
