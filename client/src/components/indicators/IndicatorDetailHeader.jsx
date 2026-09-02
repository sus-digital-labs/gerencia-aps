import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Users, Shield, TrendingUp, TrendingDown, Minus, Calendar, Building2 } from 'lucide-react';
import IndicatorGauge from './IndicatorGauge';
import { motion } from 'framer-motion';

const indicatorInfo = {
  C1: { name: "Mais Acesso à APS", description: "Proporção de atendimentos programados em relação ao total de atendimentos", target: 60, category: "eSF/eAP" },
  C2: { name: "Desenvolvimento Infantil", description: "Crianças de 0-12 meses com acompanhamento adequado", target: 50, category: "eSF/eAP" },
  C3: { name: "Gestação e Puerpério", description: "Gestantes com pré-natal adequado e consulta puerperal", target: 60, category: "eSF/eAP" },
  C4: { name: "Cuidado Diabetes", description: "Diabéticos com hemoglobina glicada solicitada", target: 50, category: "eSF/eAP" },
  C5: { name: "Cuidado Hipertensão", description: "Hipertensos com aferição de PA no semestre", target: 50, category: "eSF/eAP" },
  C6: { name: "Saúde Sexual (HIV/Sífilis)", description: "Gestantes com exames de HIV e sífilis", target: 50, category: "eSF/eAP" },
  C7: { name: "Rastreamento Câncer Colo", description: "Mulheres com citopatológico em dia", target: 40, category: "eSF/eAP" },
  B1: { name: "Primeira Consulta Odonto", description: "Cobertura de primeira consulta odontológica", target: 60, category: "eSB" },
  B2: { name: "Pré-Natal Odontológico", description: "Gestantes com atendimento odontológico", target: 50, category: "eSB" },
  B3: { name: "Atendimento Programado", description: "Atendimentos odontológicos programados", target: 20, category: "eSB" },
  B4: { name: "Tratamento Concluído", description: "Tratamentos odontológicos concluídos", target: 30, category: "eSB" },
  B5: { name: "Razão Restauração/Exodontia", description: "Proporção restaurações vs exodontias", target: 5, category: "eSB" },
  B6: { name: "Ações Coletivas", description: "Cobertura de ações coletivas em saúde bucal", target: 0.5, category: "eSB" },
  M1: { name: "Atendimentos eMulti", description: "Atendimentos realizados pela equipe multiprofissional", target: 80, category: "eMulti" },
  M2: { name: "Consultas Especialidades", description: "Consultas em especialidades da eMulti", target: 12, category: "eMulti" },
};

export default function IndicatorDetailHeader({ 
  code, 
  result, 
  numerator, 
  denominator, 
  qualityScore = 95,
  trend = 'stable',
  previousResult,
  periodMonth,
  periodYear,
  teamName,
  unitName,
  onBack
}) {
  const info = indicatorInfo[code] || { name: code, description: '', target: 50, category: "Outro" };
  
  const getStatusColor = () => {
    if (result >= info.target) return 'from-emerald-500 to-green-600';
    if (result >= info.target * 0.7) return 'from-amber-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getCategoryColor = () => {
    if (info.category === 'eSF/eAP') return 'bg-blue-100 text-blue-700';
    if (info.category === 'eSB') return 'bg-purple-100 text-purple-700';
    return 'bg-orange-100 text-orange-700';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white/60';

  const months = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`overflow-hidden border-0 shadow-2xl bg-gradient-to-br ${getStatusColor()}`}>
        <CardContent className="p-8 text-white">
          <div className="flex items-start gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/80 hover:text-white hover:bg-white/20"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl font-black">{code}</span>
                <Badge className={`${getCategoryColor()} font-medium`}>
                  {info.category}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold mb-1">{info.name}</h1>
              <p className="text-white/70 text-sm">{info.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Resultado Principal */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-7xl font-black tracking-tight">
                    {result.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                    {previousResult !== undefined && (
                      <span className={`text-sm font-medium ${trendColor}`}>
                        {trend === 'up' ? '+' : ''}{(result - previousResult).toFixed(1)}% vs período anterior
                      </span>
                    )}
                  </div>
                </div>
                <IndicatorGauge value={result} target={info.target} size={120} />
              </div>
            </div>

            {/* Métricas */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Target className="w-4 h-4" />
                  Meta Ministerial
                </div>
                <div className="text-2xl font-bold">{info.target}%</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Users className="w-4 h-4" />
                  Numerador / Denominador
                </div>
                <div className="text-2xl font-bold">{numerator?.toLocaleString()} / {denominator?.toLocaleString()}</div>
              </div>
            </div>

            {/* Info Adicional */}
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Shield className="w-4 h-4" />
                  Qualidade dos Dados
                </div>
                <div className="text-2xl font-bold">{qualityScore}%</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Competência
                </div>
                <div className="text-lg font-bold">
                  {months[periodMonth]} {periodYear}
                </div>
              </div>
            </div>
          </div>

          {/* Filtros ativos */}
          {(teamName || unitName) && (
            <div className="flex items-center gap-2 mt-6 pt-6 border-t border-white/20">
              <Building2 className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Filtrado por:</span>
              {unitName && <Badge className="bg-white/20 text-white">{unitName}</Badge>}
              {teamName && <Badge className="bg-white/20 text-white">{teamName}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}