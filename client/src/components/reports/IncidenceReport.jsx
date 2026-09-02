import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Activity, Users, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const conditionLabels = {
  gestante: 'Gestante',
  hipertenso: 'Hipertenso',
  diabetico: 'Diabético',
  idoso: 'Idoso',
  crianca: 'Criança',
  puerpera: 'Puérpera'
};

const conditionColors = {
  gestante: '#ec4899',
  hipertenso: '#ef4444',
  diabetico: '#f97316',
  idoso: '#8b5cf6',
  crianca: '#3b82f6',
  puerpera: '#f43f5e'
};

export default function IncidenceReport({ citizens, areas, visits, onExportCSV, onExportPDF }) {
  const [groupBy, setGroupBy] = useState('condition');
  const [filterArea, setFilterArea] = useState('all');

  // Filter citizens by area
  const filteredCitizens = useMemo(() => {
    if (filterArea === 'all') return citizens;
    return citizens.filter(c => c.microarea === filterArea);
  }, [citizens, filterArea]);

  // Generate incidence data
  const incidenceData = useMemo(() => {
    if (groupBy === 'condition') {
      const conditionCounts = {};
      
      filteredCitizens.forEach(citizen => {
        const conditions = citizen.conditions || [];
        conditions.forEach(condition => {
          if (!conditionCounts[condition]) {
            conditionCounts[condition] = {
              condition,
              label: conditionLabels[condition] || condition,
              count: 0,
              color: conditionColors[condition] || '#6b7280'
            };
          }
          conditionCounts[condition].count++;
        });
      });

      const total = filteredCitizens.length;
      return Object.values(conditionCounts)
        .map(c => ({
          ...c,
          percentage: total > 0 ? ((c.count / total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.count - a.count);
    }

    if (groupBy === 'microarea') {
      const microareaData = {};
      
      filteredCitizens.forEach(citizen => {
        const ma = citizen.microarea || 'Não definida';
        if (!microareaData[ma]) {
          microareaData[ma] = {
            microarea: ma,
            total: 0,
            conditions: {}
          };
        }
        microareaData[ma].total++;
        
        (citizen.conditions || []).forEach(cond => {
          if (!microareaData[ma].conditions[cond]) {
            microareaData[ma].conditions[cond] = 0;
          }
          microareaData[ma].conditions[cond]++;
        });
      });

      return Object.values(microareaData)
        .map(ma => ({
          name: `Microárea ${ma.microarea}`,
          total: ma.total,
          ...Object.fromEntries(
            Object.entries(ma.conditions).map(([k, v]) => [conditionLabels[k] || k, v])
          )
        }))
        .sort((a, b) => b.total - a.total);
    }

    return [];
  }, [groupBy, filteredCitizens]);

  const microareas = [...new Set(citizens.map(c => c.microarea).filter(Boolean))];

  // Summary stats
  const totalWithConditions = filteredCitizens.filter(c => (c.conditions || []).length > 0).length;
  const mostCommonCondition = incidenceData[0];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Agrupar por:</span>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="condition">Condição de Saúde</SelectItem>
                  <SelectItem value="microarea">Microárea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Microárea:</span>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {microareas.map(ma => (
                    <SelectItem key={ma} value={ma}>Microárea {ma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExportCSV(incidenceData, `incidencia_${groupBy}`)}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-white/70 text-sm">Total de Cidadãos</p>
                  <p className="text-3xl font-bold">{filteredCitizens.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Activity className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-white/70 text-sm">Com Condições</p>
                  <p className="text-3xl font-bold">{totalWithConditions}</p>
                  <p className="text-sm text-white/70">
                    {filteredCitizens.length > 0 ? ((totalWithConditions / filteredCitizens.length) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <MapPin className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-white/70 text-sm">Condição Mais Comum</p>
                  <p className="text-2xl font-bold">{mostCommonCondition?.label || '-'}</p>
                  <p className="text-sm text-white/70">{mostCommonCondition?.count || 0} casos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupBy === 'condition' && (
          <>
            <Card className="shadow-lg border-0 bg-white/90">
              <CardHeader>
                <CardTitle>Distribuição por Condição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incidenceData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ label, percentage }) => `${label}: ${percentage}%`}
                      >
                        {incidenceData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/90">
              <CardHeader>
                <CardTitle>Quantidade por Condição</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidenceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="Quantidade">
                        {incidenceData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {groupBy === 'microarea' && (
          <Card className="shadow-lg border-0 bg-white/90 lg:col-span-2">
            <CardHeader>
              <CardTitle>Condições por Microárea</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incidenceData} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {Object.values(conditionLabels).map((label, idx) => (
                      <Bar 
                        key={label}
                        dataKey={label} 
                        stackId="a"
                        fill={Object.values(conditionColors)[idx]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader>
          <CardTitle>Dados Detalhados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {groupBy === 'condition' ? (
                  <>
                    <TableHead>Condição</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Microárea</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {Object.values(conditionLabels).map(label => (
                      <TableHead key={label} className="text-right">{label}</TableHead>
                    ))}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidenceData.map((item, index) => (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-gray-50"
                >
                  {groupBy === 'condition' ? (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">{item.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.total}</TableCell>
                      {Object.values(conditionLabels).map(label => (
                        <TableCell key={label} className="text-right">
                          {item[label] || 0}
                        </TableCell>
                      ))}
                    </>
                  )}
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}