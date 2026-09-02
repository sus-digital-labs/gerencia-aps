import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Droplet, Brain, Users } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'];

export default function ChronicConditionsCard({ citizens = [] }) {
  const conditions = [
    { name: 'Hipertensão', icon: Heart, count: 450, color: '#ef4444' },
    { name: 'Diabetes', icon: Droplet, count: 320, color: '#f59e0b' },
    { name: 'Obesidade', icon: Activity, count: 280, color: '#3b82f6' },
    { name: 'Dep./Ansiedade', icon: Brain, count: 180, color: '#8b5cf6' },
    { name: 'Outros', icon: Users, count: 125, color: '#10b981' },
  ];

  const totalPatients = conditions.reduce((sum, c) => sum + c.count, 0);
  const chartData = conditions.map(c => ({ name: c.name, value: c.count }));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-rose-500 to-red-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5" />
          Pacientes com Condições Crônicas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* List */}
          <div className="space-y-3">
            {conditions.map((condition, idx) => {
              const Icon = condition.icon;
              const percentage = ((condition.count / totalPatients) * 100).toFixed(1);
              
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${condition.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: condition.color }} />
                    </div>
                    <span className="font-medium text-gray-900">{condition.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{condition.count}</p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </div>
              );
            })}
            
            <div className="mt-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
              <p className="text-sm text-rose-600 font-medium">Total de Pacientes</p>
              <p className="text-3xl font-bold text-rose-700">{totalPatients}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}