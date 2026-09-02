import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function HomeVisitsByCondition({ visits = [] }) {
  const data = [
    { condition: "Hipertensão", visits: 320, target: 400, color: "#ef4444" },
    { condition: "Diabetes", visits: 280, target: 350, color: "#f59e0b" },
    { condition: "Gestantes", visits: 150, target: 180, color: "#ec4899" },
    { condition: "Idosos", visits: 420, target: 450, color: "#8b5cf6" },
    { condition: "Crianças", visits: 380, target: 400, color: "#3b82f6" },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].payload.condition}</p>
          <p className="text-sm text-blue-600">Visitas: {payload[0].value}</p>
          <p className="text-sm text-gray-500">
            Meta: {payload[0].payload.target}
          </p>
          <p className="text-xs text-gray-400">
            {((payload[0].value / payload[0].payload.target) * 100).toFixed(0)}%
            da meta
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Atendimentos Domiciliares por Condição
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="condition"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="visits" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map((item, idx) => {
            const percentage = ((item.visits / item.target) * 100).toFixed(0);
            const isGood = percentage >= 80;

            return (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{item.condition}</p>
                <p className="text-xl font-bold text-gray-900">{item.visits}</p>
                <Badge
                  className={`text-xs mt-1 ${isGood ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {percentage}% da meta
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
