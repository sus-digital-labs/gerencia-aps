import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Users,
  Target,
  AlertCircle,
} from "lucide-react";
import IndicatorGauge from "./IndicatorGauge";
import { motion } from "framer-motion";

const indicatorInfo = {
  C1: { name: "Mais Acesso à APS", target: 60, category: "eSF/eAP" },
  C2: {
    name: "Cuidado no Desenvolvimento Infantil",
    target: 50,
    category: "eSF/eAP",
  },
  C3: {
    name: "Cuidado na Gestação e Puerpério",
    target: 60,
    category: "eSF/eAP",
  },
  C4: {
    name: "Cuidado da Pessoa com Diabetes",
    target: 50,
    category: "eSF/eAP",
  },
  C5: {
    name: "Cuidado da Pessoa com Hipertensão",
    target: 50,
    category: "eSF/eAP",
  },
  C6: { name: "Cuidado da Pessoa Idosa", target: 50, category: "eSF/eAP" },
  C7: {
    name: "Cuidado da Mulher na Prevenção do Câncer",
    target: 40,
    category: "eSF/eAP",
  },
  B1: { name: "Primeira Consulta Programada", target: 60, category: "eSB" },
  B2: { name: "Tratamento Concluído", target: 50, category: "eSB" },
  B3: { name: "Taxa de Exodontia", target: 20, category: "eSB" },
  B4: { name: "Escovação Supervisionada", target: 30, category: "eSB" },
  B5: {
    name: "Procedimentos Odontológicos Preventivos",
    target: 5,
    category: "eSB",
  },
  B6: {
    name: "Tratamento Restaurador Atraumático",
    target: 0.5,
    category: "eSB",
  },
  M1: {
    name: "Média de Atendimentos por Pessoa pela eMulti",
    target: 80,
    category: "eMulti",
  },
  M2: {
    name: "Ações Interprofissionais realizadas pela eMulti",
    target: 12,
    category: "eMulti",
  },
};

const statusLabels = {
  NO_DATA: "Sem dados",
  API_UNAVAILABLE: "Fonte indisponível",
  MISSING_REQUIRED_CRITERIA: "Critérios ausentes",
  BLOCKED_BY_DATA_CONTRACT: "Contrato bloqueado",
};

export default function IndicatorCard({
  code,
  status = "API_UNAVAILABLE",
  result,
  numerator,
  denominator,
  qualityScore,
  trend = "stable",
  previousResult,
  onClick,
}) {
  const info = indicatorInfo[code] || {
    name: code,
    target: 50,
    category: "Outro",
  };
  const ready =
    status === "READY" && typeof result === "number" && Number.isFinite(result);
  const getStatusColor = () => {
    if (!ready) return "bg-slate-300";
    if (result >= info.target) return "bg-emerald-500";
    if (result >= info.target * 0.7) return "bg-amber-500";
    return "bg-red-500";
  };
  const getCategoryColor = () => {
    if (info.category === "eSF/eAP") return "bg-blue-100 text-blue-700";
    if (info.category === "eSB") return "bg-purple-100 text-purple-700";
    return "bg-orange-100 text-orange-700";
  };
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-500"
        : "text-gray-400";
  const displayStatus = ready ? null : statusLabels[status] || "Indisponível";

  return (
    <motion.div initial={{ opacity: 1 }}>
      <Card
        className="bg-white/80 backdrop-blur-sm border-0 shadow-lg overflow-hidden"
        onClick={onClick}
      >
        <div className={`h-1 ${getStatusColor()}`} />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800">
                  {code}
                </span>
                <Badge className={`${getCategoryColor()} font-medium text-xs`}>
                  {info.category}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 font-medium line-clamp-1">
                {info.name}
              </p>
            </div>
            <IndicatorGauge
              value={ready ? result : null}
              target={info.target}
              size={70}
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-end justify-between">
            <div>
              {ready ? (
                <div
                  className="text-4xl font-black tracking-tight"
                  style={{
                    color:
                      result >= info.target
                        ? "#10b981"
                        : result >= info.target * 0.7
                          ? "#f59e0b"
                          : "#ef4444",
                  }}
                >
                  {result.toFixed(1)}%
                </div>
              ) : (
                <div className="flex items-center gap-2 text-lg font-bold text-slate-600">
                  <AlertCircle className="h-5 w-5" />
                  {displayStatus}
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                {ready && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
                {ready && previousResult !== undefined && (
                  <span className={`text-xs font-medium ${trendColor}`}>
                    {trend === "up" ? "+" : ""}
                    {(result - previousResult).toFixed(1)}%
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
                <span>
                  {ready
                    ? `${numerator.toLocaleString()} / ${denominator.toLocaleString()}`
                    : "— / —"}
                </span>
              </div>
              <div className="flex items-center gap-1 justify-end text-xs">
                <Shield className="w-3 h-3 text-slate-400" />
                <span className="text-slate-600 font-medium">
                  {ready &&
                  typeof qualityScore === "number" &&
                  Number.isFinite(qualityScore)
                    ? `${qualityScore}%`
                    : "Não validado"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
