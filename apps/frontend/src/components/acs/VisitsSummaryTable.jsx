import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

export default function VisitsSummaryTable({ visits = [], acsName }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  const countVisits = (startDate, endDate = new Date()) => {
    return visits.filter(v => {
      const visitDate = new Date(v.visit_date);
      return visitDate >= startDate && visitDate <= endDate;
    }).length;
  };

  const todayCount = countVisits(today);
  const weekCount = countVisits(startOfWeek);
  const monthCount = countVisits(startOfMonth);
  const yearCount = countVisits(startOfYear);

  // Média diária do mês
  const daysInMonth = today.getDate();
  const avgPerDay = daysInMonth > 0 ? (monthCount / daysInMonth).toFixed(1) : 0;

  // Por tipo de visita no mês
  const visitsByType = visits
    .filter(v => new Date(v.visit_date) >= startOfMonth)
    .reduce((acc, v) => {
      acc[v.visit_type] = (acc[v.visit_type] || 0) + 1;
      return acc;
    }, {});

  const typeLabels = {
    cadastro: "Cadastro",
    acompanhamento: "Acompanhamento",
    busca_ativa: "Busca Ativa",
    campanha: "Campanha",
    entrega_medicamento: "Entrega Medicamento",
    outros: "Outros",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Resumo de Visitas {acsName && `- ${acsName}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-xs text-blue-600 font-medium">Hoje</p>
              <p className="text-3xl font-black text-blue-700">{todayCount}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <CalendarRange className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-purple-600 font-medium">Semana</p>
              <p className="text-3xl font-black text-purple-700">{weekCount}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <CalendarDays className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-emerald-600 font-medium">Mês</p>
              <p className="text-3xl font-black text-emerald-700">
                {monthCount}
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <p className="text-xs text-orange-600 font-medium">Ano</p>
              <p className="text-3xl font-black text-orange-700">{yearCount}</p>
            </div>
          </div>

          {/* Média e tipos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Média */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Média do Mês</h4>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-gray-800">
                  {avgPerDay}
                </div>
                <div className="text-sm text-gray-500">visitas/dia</div>
              </div>
            </div>

            {/* Por tipo */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3">
                Por Tipo (Mês)
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(visitsByType).map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {typeLabels[type] || type}: {count}
                  </Badge>
                ))}
                {Object.keys(visitsByType).length === 0 && (
                  <span className="text-sm text-gray-400">
                    Nenhuma visita no período
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tabela detalhada */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-3">
              Últimas 10 Visitas
            </h4>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Data</TableHead>
                    <TableHead>Cidadão</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Desfecho</TableHead>
                    <TableHead>Endereço</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.slice(0, 10).map((visit, idx) => (
                    <TableRow key={visit.id || idx}>
                      <TableCell className="font-medium">
                        {new Date(visit.visit_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{visit.citizen_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[visit.visit_type] || visit.visit_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            visit.desfecho === "visita_realizada"
                              ? "bg-green-100 text-green-700"
                              : visit.desfecho === "ausente"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-700"
                          }
                        >
                          {visit.desfecho?.replace("_", " ") || "Realizada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                        {visit.address || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visits.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-gray-400 py-8"
                      >
                        Nenhuma visita registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
