import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];

const typeLabels: Record<string, string> = {
  cadastro: 'Cadastro',
  acompanhamento: 'Acompanhamento',
  busca_ativa: 'Busca Ativa',
  campanha: 'Campanha',
  entrega_medicamento: 'Entrega Med.',
  outros: 'Outros'
};

export interface VisitsChartProps {
  visits?: any[];
  chartType?: 'bar' | 'pie' | 'line' | string;
}

export default function VisitsChart({ visits = [], chartType = 'bar' }: VisitsChartProps) {
  // Agrupar por dia do mês atual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthVisits = visits.filter(v => {
    const d = new Date(v.visit_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Por dia
  const byDay: Record<string, number> = {};
  for (let i = 1; i <= 31; i++) {
    byDay[i] = 0;
  }
  monthVisits.forEach(v => {
    const day = new Date(v.visit_date).getDate();
    byDay[day] = (byDay[day] || 0) + 1;
  });
  
  const dailyData = Object.entries(byDay)
    .map(([day, count]) => ({ day: parseInt(day), visitas: count }))
    .filter(d => d.day <= new Date().getDate() + 5);

  // Por tipo
  const byType: Record<string, number> = {};
  monthVisits.forEach(v => {
    byType[v.visit_type] = (byType[v.visit_type] || 0) + 1;
  });
  
  const typeData = Object.entries(byType).map(([type, count]) => ({
    name: typeLabels[type] || type,
    value: count
  }));

  // Por semana
  const weeklyData = [];
  const now = new Date();
  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const count = visits.filter(v => {
      const d = new Date(v.visit_date);
      return d >= weekStart && d <= weekEnd;
    }).length;
    
    weeklyData.push({
      semana: `Sem ${5 - i}`,
      visitas: count
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-lg shadow-lg border p-3">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-lg font-bold text-blue-600">
            {payload[0].value} visitas
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartType === 'pie') {
    return (
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <PieChartIcon className="w-5 h-5 text-purple-500" />
            Visitas por Tipo (Mês)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartType === 'line') {
    return (
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Evolução Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="visitas" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="url(#colorVisitas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Visitas por Dia (Mês Atual)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="visitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
