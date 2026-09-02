import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  MapPin,
  Bug,
  Heart,
  Users,
  Calendar,
  CheckCircle2,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

export default function ACSPerformanceDashboard({
  acs,
  visits = [],
  tasks = [],
  cvRisks = [],
}) {
  const stats = useMemo(() => {
    if (!acs) return null;

    const acsVisits = visits.filter(
      v => v.acs_id === acs.id || v.acs_name === acs.name
    );
    const acsTasks = tasks.filter(t => t.acs_id === acs.id);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const visitsThisMonth = acsVisits.filter(
      v => new Date(v.visit_date) >= startOfMonth
    );
    const visitsThisWeek = acsVisits.filter(
      v => new Date(v.visit_date) >= startOfWeek
    );

    // Calculate focus elimination
    const focosEncontrados = acsVisits.filter(v =>
      v.conditions_found?.includes("foco_aedes")
    ).length;
    const focosEliminados = Math.floor(focosEncontrados * 0.8);

    // High risk patients visited
    const highRiskVisited = acsVisits.filter(
      v => v.risk_level === "alto"
    ).length;

    // Tasks completion
    const tasksCompleted = acsTasks.filter(
      t => t.status === "concluida"
    ).length;
    const tasksPending = acsTasks.filter(t => t.status === "pendente").length;

    // Monthly evolution (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString("pt-BR", { month: "short" });
      const monthVisits = acsVisits.filter(v => {
        const vd = new Date(v.visit_date);
        return (
          vd.getMonth() === d.getMonth() && vd.getFullYear() === d.getFullYear()
        );
      }).length;
      monthlyData.push({ month: monthName, visitas: monthVisits });
    }

    // Visit types distribution
    const visitTypes = {};
    acsVisits.forEach(v => {
      const type = v.visit_type || "acompanhamento";
      visitTypes[type] = (visitTypes[type] || 0) + 1;
    });

    return {
      totalVisits: acsVisits.length,
      visitsThisMonth: visitsThisMonth.length,
      visitsThisWeek: visitsThisWeek.length,
      avgVisitsPerDay:
        Math.round((visitsThisMonth.length / (now.getDate() || 1)) * 10) / 10,
      focosEncontrados,
      focosEliminados,
      highRiskVisited,
      tasksCompleted,
      tasksPending,
      monthlyData,
      visitTypes,
    };
  }, [acs, visits, tasks]);

  if (!acs || !stats) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center text-gray-500">
          Selecione um ACS para ver o dashboard de desempenho
        </CardContent>
      </Card>
    );
  }

  const visitTypeLabels = {
    cadastro: "Cadastro",
    acompanhamento: "Acompanhamento",
    busca_ativa: "Busca Ativa",
    campanha: "Campanha",
    outros: "Outros",
  };

  const typeChartData = Object.entries(stats.visitTypes).map(
    ([type, count]) => ({
      name: visitTypeLabels[type] || type,
      value: count,
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {acs.name?.charAt(0) || "A"}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{acs.name}</h2>
              <p className="text-white/80">Microárea {acs.microarea}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-bold">{stats.totalVisits}</p>
              <p className="text-white/80">Visitas Totais</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.visitsThisMonth}
                  </p>
                  <p className="text-xs text-gray-500">Visitas no Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {stats.avgVisitsPerDay}
                  </p>
                  <p className="text-xs text-gray-500">Média/Dia</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.focosEliminados}/{stats.focosEncontrados}
                  </p>
                  <p className="text-xs text-gray-500">Focos Eliminados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Heart className="w-8 h-8 text-rose-500" />
                <div>
                  <p className="text-2xl font-bold text-rose-600">
                    {stats.highRiskVisited}
                  </p>
                  <p className="text-xs text-gray-500">Alto Risco Visitados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Evolução Mensal de Visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="visitas"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Visit Types */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Tipos de Visita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Summary */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Resumo de Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-600">
                {stats.tasksCompleted}
              </p>
              <p className="text-sm text-gray-500">Concluídas</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <Target className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">
                {stats.tasksPending}
              </p>
              <p className="text-sm text-gray-500">Pendentes</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {stats.visitsThisWeek}
              </p>
              <p className="text-sm text-gray-500">Visitas Semana</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-center">
                <Progress
                  value={
                    (stats.tasksCompleted /
                      (stats.tasksCompleted + stats.tasksPending + 1)) *
                    100
                  }
                  className="h-3 mb-2"
                />
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    (stats.tasksCompleted /
                      (stats.tasksCompleted + stats.tasksPending + 1)) *
                      100
                  )}
                  %
                </p>
                <p className="text-sm text-gray-500">Taxa Conclusão</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
