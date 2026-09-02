import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QualityScoreCard({ 
  overallScore = 85,
  completenessScore = 92,
  consistencyScore = 78,
  issuesCount = 23
}) {
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProgressColor = (score) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white pb-16">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Qualidade dos Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 -mt-12">
          {/* Score Principal */}
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center mb-6">
            <div className={`text-6xl font-black ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </div>
            <p className="text-gray-500 mt-2">Score Geral de Qualidade</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              {getScoreIcon(overallScore)}
              <span className={`text-sm font-medium ${getScoreColor(overallScore)}`}>
                {overallScore >= 90 ? 'Excelente' : overallScore >= 70 ? 'Bom' : 'Precisa Atenção'}
              </span>
            </div>
          </div>

          {/* Métricas Detalhadas */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Completude</span>
                <span className={`text-sm font-bold ${getScoreColor(completenessScore)}`}>
                  {completenessScore}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(completenessScore)} transition-all duration-500`}
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Consistência</span>
                <span className={`text-sm font-bold ${getScoreColor(consistencyScore)}`}>
                  {consistencyScore}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(consistencyScore)} transition-all duration-500`}
                  style={{ width: `${consistencyScore}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl mt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">Problemas Pendentes</span>
              </div>
              <span className="text-lg font-bold text-red-600">{issuesCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}