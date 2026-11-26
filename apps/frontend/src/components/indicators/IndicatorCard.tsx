import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { INDICATOR_NAMES, isIndicatorCode } from "@shared/aps-indicators";
import { formatPecNumber, formatPecValue, pecStatus, type PecResult } from "@/local/pec";

type IndicatorCardProps = {
  code: string;
  onClick?: () => void;
  pec?: { name: string; category: string; result?: PecResult };
  result?: number;
  numerator?: number;
  denominator?: number;
  qualityScore?: number;
  trend?: string;
  previousResult?: number;
};

export default function IndicatorCard({ code, pec, onClick, result: received, numerator, denominator }: IndicatorCardProps) {
  const result = pec?.result;
  const knownResult = typeof received === "number" && Number.isFinite(received);
  const category = pec?.category;
  const color = category === "eSF/eAP" ? "bg-blue-100 text-blue-700"
    : category === "eSB" ? "bg-purple-100 text-purple-700"
      : category === "CVAT" ? "bg-teal-100 text-teal-700" : "bg-orange-100 text-orange-700";
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }}>
      <Card data-indicator-code={code} data-pec-status={result?.status}
        className="cursor-pointer overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl"
        onClick={onClick}>
        <div className={`h-1 ${result?.status === "READY" || knownResult ? "bg-blue-500" : "bg-slate-300"}`} />
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gray-800">{code}</span>
            {category && <Badge className={color}>{category}</Badge>}
          </div>
          <p className="line-clamp-2 text-sm font-medium text-gray-600">
            {pec?.name ?? (isIndicatorCode(code) ? INDICATOR_NAMES[code] : code)}
          </p>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {result ? (
            <>
              <Badge variant="secondary">
                {result.status === "READY" && result.source === "COMPLEMENTO" ? "Fonte complementar" : pecStatus[result.status]}
              </Badge>
              {result.status === "READY" ? (
                <>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-3xl font-black tracking-tight text-blue-700">{formatPecValue(result)}</p>
                    <p className="text-xs text-gray-600" title="Numerador / denominador">
                      {formatPecNumber.format(result.numerator)} / {formatPecNumber.format(result.denominator)}
                    </p>
                  </div>
                  {result.limitation && <p className="text-xs text-gray-600">{result.limitation}</p>}
                </>
              ) : <p className="text-sm text-gray-600">{result.reason}</p>}
            </>
          ) : knownResult ? (
            <>
              <p className="text-3xl font-black text-blue-700">{formatPecNumber.format(received)}%</p>
              {numerator !== undefined && denominator !== undefined &&
                <p className="text-xs text-gray-600">{formatPecNumber.format(numerator)} / {formatPecNumber.format(denominator)}</p>}
            </>
          ) : <Badge variant="secondary">Aguardando consulta</Badge>}
        </CardContent>
      </Card>
    </motion.div>
  );
}
