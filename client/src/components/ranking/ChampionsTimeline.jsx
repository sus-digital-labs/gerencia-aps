import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crown, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const monthShortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function ChampionsTimeline({ 
  champions = [], 
  rankings = [],
  year,
  onMonthClick 
}) {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Get champion for each month
  const monthlyChampions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return champions.find(c => c.month === month && c.year === year) || null;
  });

  // Get rankings for selected month
  const monthRankings = selectedMonth 
    ? rankings.filter(r => r.month === selectedMonth && r.year === year).sort((a, b) => a.position - b.position)
    : [];

  const handleMonthClick = (month) => {
    setSelectedMonth(month);
    setShowDialog(true);
    if (onMonthClick) onMonthClick(month);
  };

  const currentMonth = new Date().getMonth() + 1;

  return (
    <>
      <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Campeões de {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 transform -translate-y-1/2 rounded-full" />

            {/* Months */}
            <div className="relative grid grid-cols-12 gap-2">
              {monthlyChampions.map((champion, idx) => {
                const month = idx + 1;
                const isPast = month <= currentMonth;
                const isCurrent = month === currentMonth;

                return (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col items-center"
                  >
                    {/* Champion Avatar or Placeholder */}
                    <button
                      onClick={() => isPast && handleMonthClick(month)}
                      disabled={!isPast}
                      className={`relative mb-2 transition-transform ${
                        isPast ? 'hover:scale-110 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {champion ? (
                        <>
                          <Avatar className={`h-12 w-12 border-4 ${
                            isCurrent ? 'border-amber-400 ring-4 ring-amber-200' : 'border-amber-300'
                          }`}>
                            <AvatarImage src={champion.photo_url} />
                            <AvatarFallback className="bg-amber-100 text-amber-700 font-bold">
                              {champion.acs_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Crown */}
                          <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: idx * 0.05 + 0.2, type: 'spring' }}
                            className="absolute -top-3 -right-1 text-xl"
                          >
                            👑
                          </motion.div>
                        </>
                      ) : (
                        <div className={`h-12 w-12 rounded-full border-4 border-dashed ${
                          isPast ? 'border-gray-300 bg-gray-100' : 'border-gray-200 bg-gray-50'
                        } flex items-center justify-center`}>
                          <Crown className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </button>

                    {/* Month Label */}
                    <span className={`text-xs font-medium ${
                      isCurrent ? 'text-amber-600' : isPast ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {monthShortNames[idx]}
                    </span>

                    {/* Points */}
                    {champion && (
                      <Badge className="mt-1 text-xs bg-amber-100 text-amber-700">
                        {champion.points}
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span>Campeão do mês</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-300" />
              <span>Aguardando</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Month Detail Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Ranking de {selectedMonth ? monthNames[selectedMonth - 1] : ''} {year}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {monthRankings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhum ranking disponível para este mês
              </p>
            ) : (
              monthRankings.slice(0, 10).map((ranking, idx) => (
                <motion.div
                  key={ranking.id || idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    ranking.position === 1 
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white' 
                      : ranking.position === 2
                      ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-white'
                      : ranking.position === 3
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="text-2xl font-black w-10 text-center">
                    {ranking.position === 1 ? '🥇' : ranking.position === 2 ? '🥈' : ranking.position === 3 ? '🥉' : `#${ranking.position}`}
                  </span>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={ranking.photo_url} />
                    <AvatarFallback className={ranking.position <= 3 ? 'bg-white/20' : 'bg-gray-100'}>
                      {ranking.acs_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{ranking.acs_name}</p>
                    <p className={`text-xs ${ranking.position <= 3 ? 'text-white/70' : 'text-gray-500'}`}>
                      {ranking.unit_name}
                    </p>
                  </div>
                  <Badge className={ranking.position <= 3 ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}>
                    {ranking.points} pts
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}