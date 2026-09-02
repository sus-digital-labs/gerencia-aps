import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Home, MapPin, User, Baby, Heart, Droplet } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#ec4899', '#ef4444', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'];

export default function AreaStatsCard({ area, citizens = [] }) {
  // Calcular estatísticas da área
  const areaCitizens = citizens.filter(c => c.microarea === area?.microarea_code);
  
  const stats = {
    total: areaCitizens.length,
    gestantes: areaCitizens.filter(c => c.conditions?.includes('gestante')).length,
    hipertensos: areaCitizens.filter(c => c.conditions?.includes('hipertenso')).length,
    diabeticos: areaCitizens.filter(c => c.conditions?.includes('diabetico')).length,
    idosos: areaCitizens.filter(c => c.conditions?.includes('idoso')).length,
    criancas: areaCitizens.filter(c => c.conditions?.includes('crianca')).length,
  };

  const pieData = [
    { name: 'Gestantes', value: stats.gestantes },
    { name: 'Hipertensos', value: stats.hipertensos },
    { name: 'Diabéticos', value: stats.diabeticos },
    { name: 'Idosos', value: stats.idosos },
    { name: 'Crianças', value: stats.criancas },
    { name: 'Outros', value: Math.max(0, stats.total - stats.gestantes - stats.hipertensos - stats.diabeticos - stats.idosos - stats.criancas) },
  ].filter(d => d.value > 0);

  if (!area) {
    return (
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8 text-center text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma área no mapa para ver as estatísticas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
        <div className="h-2" style={{ backgroundColor: area.color || '#3b82f6' }} />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">{area.name}</span>
            <Badge style={{ backgroundColor: area.color || '#3b82f6', color: 'white' }}>
              {area.microarea_code}
            </Badge>
          </CardTitle>
          {area.acs_name && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <User className="w-4 h-4" />
              ACS: {area.acs_name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-blue-700">{area.total_citizens || stats.total}</p>
              <p className="text-xs text-blue-600">Cidadãos</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <Home className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-purple-700">{area.total_families || 0}</p>
              <p className="text-xs text-purple-600">Famílias</p>
            </div>
          </div>

          {/* Gráfico de pizza */}
          {pieData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detalhes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-pink-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-pink-700">
                <span className="w-3 h-3 rounded-full bg-pink-500" />
                Gestantes
              </span>
              <span className="font-bold text-pink-700">{stats.gestantes}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-red-700">
                <Heart className="w-4 h-4" />
                Hipertensos
              </span>
              <span className="font-bold text-red-700">{stats.hipertensos}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-amber-700">
                <Droplet className="w-4 h-4" />
                Diabéticos
              </span>
              <span className="font-bold text-amber-700">{stats.diabeticos}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-purple-700">
                <User className="w-4 h-4" />
                Idosos
              </span>
              <span className="font-bold text-purple-700">{stats.idosos}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="flex items-center gap-2 text-sm text-green-700">
                <Baby className="w-4 h-4" />
                Crianças
              </span>
              <span className="font-bold text-green-700">{stats.criancas}</span>
            </div>
          </div>

          {/* Área */}
          {area.area_km2 && (
            <div className="text-center text-sm text-gray-500 pt-2 border-t">
              Área: {area.area_km2} km²
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}