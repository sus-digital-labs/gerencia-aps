import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AchievementLabel {
  label: string;
  icon: string;
  color: string;
}

const achievementLabels: Record<number, AchievementLabel> = {
  1: { label: 'Campeão', icon: '🏆', color: 'bg-amber-100 text-amber-700' },
  2: { label: 'Bicampeão', icon: '🏆🏆', color: 'bg-amber-200 text-amber-800' },
  3: { label: 'Tricampeão', icon: '🏆🏆🏆', color: 'bg-amber-300 text-amber-900' },
  4: { label: 'Grand Slam', icon: '👑', color: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' }
};

const getAchievement = (count: number): AchievementLabel | null => {
  if (count >= 4) return achievementLabels[4];
  if (count >= 1) return achievementLabels[count];
  return null;
};

const barColors = ['#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#6B7280'];

export interface Title {
  acsId?: string | number;
  nome: string;
  quantidade: number;
  photo_url?: string;
}

export interface TitlesRankingProps {
  titles?: Title[];
  year: number;
}

export default function TitlesRanking({ titles = [], year }: TitlesRankingProps) {
  // Sort by title count
  const sortedTitles = [...titles].sort((a, b) => b.quantidade - a.quantidade);
  const topTitles = sortedTitles.slice(0, 10);

  // Prepare chart data
  const chartData = topTitles.map((t) => ({
    name: t.nome?.split(' ')[0] || 'ACS',
    titles: t.quantidade,
    fullName: t.nome
  }));

  return (
    <Card className="border-0 shadow-xl bg-white overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-6 h-6" />
          ACS com Mais Títulos em {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedTitles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum título registrado ainda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, 'dataMax + 1']} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        return (
                          <div className="bg-white p-2 shadow-lg rounded-lg border">
                            <p className="font-medium">{payload[0].payload.fullName}</p>
                            <p className="text-amber-600">{payload[0].value} título(s)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="titles" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[Math.min(index, barColors.length - 1)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List */}
            <div className="space-y-3">
              {topTitles.map((title, idx) => {
                const achievement = getAchievement(title.quantidade);
                return (
                  <motion.div
                    key={title.acsId || idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      idx === 0 
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    {/* Position */}
                    <span className="text-xl font-black w-8 text-center text-gray-400">
                      #{idx + 1}
                    </span>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={title.photo_url} />
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {title.nome?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{title.nome}</p>
                      {achievement && (
                        <Badge className={`text-xs ${achievement.color}`}>
                          {achievement.icon} {achievement.label}
                        </Badge>
                      )}
                    </div>

                    {/* Title Count */}
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(title.quantidade, 4) }).map((_, i) => (
                          <motion.span
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: idx * 0.05 + i * 0.1 }}
                            className="text-xl"
                          >
                            🏆
                          </motion.span>
                        ))}
                        {title.quantidade > 4 && (
                          <Badge className="bg-amber-500 text-white">+{title.quantidade - 4}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{title.quantidade} título(s)</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
