import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
import { Building2 } from 'lucide-react';

export default function ComparisonChart({ 
  data = [], 
  target = 50,
  title = "Comparativo por Unidade",
  dataKey = "result",
  nameKey = "name"
}) {
  const getBarColor = (value) => {
    if (value >= target) return '#10b981';
    if (value >= target * 0.7) return '#f59e0b';
    return '#ef4444';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const value = item[dataKey];
      const isAboveTarget = value >= target;
      return (
        <div className="bg-white rounded-lg shadow-lg border p-3">
          <p className="text-sm font-semibold text-gray-800 mb-1">{item[nameKey]}</p>
          <p className={`text-2xl font-bold ${isAboveTarget ? 'text-emerald-500' : 'text-amber-500'}`}>
            {value.toFixed(1)}%
          </p>
          {item.numerator !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              {item.numerator} / {item.denominator}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
          <Building2 className="w-5 h-5 text-purple-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              layout="vertical"
              margin={{ top: 10, right: 60, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
              <XAxis 
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                type="category"
                dataKey={nameKey}
                tick={{ fontSize: 11, fill: '#374151' }}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                x={target} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                strokeWidth={2}
              />
              <Bar 
                dataKey={dataKey} 
                radius={[0, 4, 4, 0]}
                barSize={24}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry[dataKey])} />
                ))}
                <LabelList 
                  dataKey={dataKey} 
                  position="right" 
                  formatter={(value) => `${value.toFixed(1)}%`}
                  style={{ fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}