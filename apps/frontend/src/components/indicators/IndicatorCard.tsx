import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Shield, Users, Target } from 'lucide-react';
import IndicatorGauge from './IndicatorGauge';
import { motion } from 'framer-motion';

const indicatorInfo: Record<string, { name: string; target: number; category: string }> = {
  C1: { name: "Mais Acesso à APS", target: 60, category: "eSF/eAP" },
  C2: { name: "Desenvolvimento Infantil", target: 50, category: "eSF/eAP" },
  C3: { name: "Gestação e Puerpério", target: 60, category: "eSF/eAP" },
  C4: { name: "Cuidado Diabetes", target: 50, category: "eSF/eAP" },
  C5: { name: "Cuidado Hipertensão", target: 50, category: "eSF/eAP" },
  C6: { name: "Saúde Sexual (HIV/Sífilis)", target: 50, category: "eSF/eAP" },
  C7: { name: "Rastreamento Câncer Colo", target: 40, category: "eSF/eAP" },
  B1: { name: "Primeira Consulta Odonto", target: 60, category: "eSB" },
  B2: { name: "Pré-Natal Odontológico", target: 50, category: "eSB" },
  B3: { name: "Atendimento Programado", target: 20, category: "eSB" },
  B4: { name: "Tratamento Concluído", target: 30, category: "eSB" },
  B5: { name: "Razão Restauração/Exodontia", target: 5, category: "eSB" },
  B6: { name: "Ações Coletivas", target: 0.5, category: "eSB" },
  M1: { name: "Atendimentos eMulti", target: 80, category: "eMulti" },
  M2: { name: "Consultas Especialidades", target: 12, category: "eMulti" },
};

interface IndicatorCardProps {
  code: string;
  result: number;
  numerator?: number;
  denominator?: number;
  qualityScore?: number;
  trend?: 'up' | 'down' | 'stable';
  previousResult?: number;
  onClick?: () => void;
}

export default function IndicatorCard({ 
  code, 
  result, 
  numerator, 
  denominator, 
  qualityScore = 95,
  trend = 'stable',
  previousResult,
  onClick 
}: IndicatorCardProps) {
  const info = indicatorInfo[code] || { name: code, target: 50, category: "Outro" };
  
  const getStatusColor = () => {
    if (result >= info.target) return 'bg-emerald-500';
    if (result >= info.target * 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getCategoryColor = () => {
    if (info.category === 'eSF/eAP') return 'bg-blue-100 text-blue-700';
    if (info.category === 'eSB') return 'bg-purple-100 text-purple-700';
    return 'bg-orange-100 text-orange-700';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="cursor-pointer hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden"
        onClick={onClick}
      >
        <div className={`h-1 ${getStatusColor()}`} />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800">{code}</span>
                <Badge className={`${getCategoryColor()} font-medium text-xs`}>
                  {info.category}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 font-medium line-clamp-1">{info.name}</p>
            </div>
            <IndicatorGauge value={result} target={info.target} size={70} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-black tracking-tight" style={{ color: result >= info.target ? '#10b981' : result >= info.target * 0.7 ? '#f59e0b' : '#ef4444' }}>
                {result.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                {previousResult !== undefined && (
                  <span className={`text-xs font-medium ${trendColor}`}>
                    {trend === 'up' ? '+' : trend === 'down' ? '' : ''}{(result - previousResult).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                <Target className="w-3 h-3" />
                <span>Meta: {info.target}%</span>
              </div>
              <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                <Users className="w-3 h-3" />
                <span>{numerator?.toLocaleString()} / {denominator?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 justify-end text-xs">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">{qualityScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
