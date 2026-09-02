import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { TrendingUp, TrendingDown, Award, Target, Users } from "lucide-react";

export default function ACSPerformanceComparison({
  acsList = [],
  visits = [],
  tasks = [],
}) {
  const [metric, setMetric] = useState("visits");
  const [period, setPeriod] = useState("month");

  const performanceData = useMemo(() => {
    const now = new Date();
    const startDate =
      period === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : period === "week"
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), 0, 1);

    return acsList
      .map(acs => {
        const acsVisits = visits.filter(
          v => v.acs_id === acs.id && new Date(v.visit_date) >= startDate
        );
        const acsTasks = tasks.filter(t => t.acs_id === acs.id);
        const completedTasks = acsTasks.filter(
          t => t.status === "concluida" && new Date(t.completed_at) >= startDate
        );
        const pendingTasks = acsTasks.filter(t => t.status === "pendente");

        const avgCompletionTime =
          completedTasks.length > 0
            ? completedTasks.reduce((acc, t) => {
                const created = new Date(t.created_date);
                const completed = new Date(t.completed_at);
                return acc + (completed - created) / (1000 * 60 * 60 * 24);
              }, 0) / completedTasks.length
            : 0;

        return {
          name: acs.name,
          visits: acsVisits.length,
          completedTasks: completedTasks.length,
          pendingTasks: pendingTasks.length,
          avgDays: avgCompletionTime.toFixed(1),
          microarea: acs.microarea,
          score:
            acsVisits.length * 2 +
            completedTasks.length * 3 -
            pendingTasks.length * 0.5,
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [acsList, visits, tasks, period]);

  const topPerformers = performanceData.slice(0, 3);
  const needsImprovement = performanceData.slice(-3).reverse();

  const radarData = useMemo(() => {
    return topPerformers
      .map(acs => ({
        metric: "Visitas",
        [acs.name]: acs.visits,
      }))
      .concat([
        {
          metric: "Tarefas Completas",
          ...Object.fromEntries(
            topPerformers.map(a => [a.name, a.completedTasks])
          ),
        },
        {
          metric: "Rapidez",
          ...Object.fromEntries(
            topPerformers.map(a => [
              a.name,
              Math.max(0, 10 - parseFloat(a.avgDays)),
            ])
          ),
        },
      ]);
  }, [topPerformers]);

  const chartData = performanceData.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Métrica:
              </span>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visits">Visitas Realizadas</SelectItem>
                  <SelectItem value="tasks">Tarefas Concluídas</SelectItem>
                  <SelectItem value="speed">Rapidez (Dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Período:
              </span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="year">Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Melhores Desempenhos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {topPerformers.map((acs, idx) => (
              <div
                key={acs.name}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    idx === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : idx === 1
                        ? "bg-gray-200 text-gray-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{acs.name}</p>
                  <p className="text-sm text-gray-500">
                    Microárea: {acs.microarea}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-blue-100 text-blue-700">
                      {acs.visits} visitas
                    </Badge>
                    <Badge className="bg-green-100 text-green-700">
                      {acs.completedTasks} tarefas
                    </Badge>
                  </div>
                </div>
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Needs Improvement */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Áreas de Melhoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {needsImprovement.map(acs => (
              <div
                key={acs.name}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
              >
                <TrendingDown className="w-8 h-8 text-amber-500" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{acs.name}</p>
                  <p className="text-sm text-gray-500">
                    Microárea: {acs.microarea}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-amber-100 text-amber-700">
                      {acs.visits} visitas
                    </Badge>
                    <Badge className="bg-red-100 text-red-700">
                      {acs.pendingTasks} pendentes
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Média conclusão</p>
                  <p className="font-bold text-lg text-gray-900">
                    {acs.avgDays}d
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart Comparison */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Comparativo de Desempenho (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="visits" fill="#3b82f6" name="Visitas" />
              <Bar
                dataKey="completedTasks"
                fill="#10b981"
                name="Tarefas Concluídas"
              />
              <Bar
                dataKey="pendingTasks"
                fill="#f59e0b"
                name="Tarefas Pendentes"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Chart - Top 3 */}
      {topPerformers.length >= 3 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Análise Multidimensional - Top 3</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                {topPerformers.map((acs, idx) => (
                  <Radar
                    key={acs.name}
                    name={acs.name}
                    dataKey={acs.name}
                    stroke={["#3b82f6", "#10b981", "#f59e0b"][idx]}
                    fill={["#3b82f6", "#10b981", "#f59e0b"][idx]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
