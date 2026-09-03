import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Users, Map, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ComparisonReportProps {
  teams: any[];
  areas: any[];
  visits: any[];
  indicators: any[];
  onExportCSV: (data: any, name: string) => void;
  onExportPDF: (data: any) => void;
}

export default function ComparisonReport({ teams, areas, visits, indicators, onExportCSV, onExportPDF }: ComparisonReportProps) {
  const [comparisonType, setComparisonType] = useState<string>('microareas');
  const [metric, setMetric] = useState<string>('visits');

  // Generate comparison data
  const comparisonData = useMemo(() => {
    if (comparisonType === 'microareas') {
      const microareaMap: any = {};
      
      visits.forEach(v => {
        if (!microareaMap[v.microarea]) {
          microareaMap[v.microarea] = {
            name: `Microárea ${v.microarea}`,
            code: v.microarea,
            visits: 0,
            citizens: new Set(),
            completed: 0
          };
        }
        microareaMap[v.microarea].visits++;
        if (v.citizen_cns) microareaMap[v.microarea].citizens.add(v.citizen_cns);
        if (v.desfecho === 'visita_realizada') microareaMap[v.microarea].completed++;
      });

      return Object.values(microareaMap).map((ma: any) => ({
        ...ma,
        citizens: ma.citizens.size,
        completionRate: ma.visits > 0 ? ((ma.completed / ma.visits) * 100).toFixed(1) : 0
      })).sort((a: any, b: any) => b.visits - a.visits);
    }

    if (comparisonType === 'equipes') {
      return teams.map(team => {
        const teamIndicators = indicators.filter(i => i.team_id === team.id);
        const avgResult = teamIndicators.length > 0
          ? teamIndicators.reduce((sum, i) => sum + (i.result_percentage || 0), 0) / teamIndicators.length
          : 0;
        
        return {
          name: team.name,
          type: team.type,
          avgIndicator: avgResult.toFixed(1),
          indicatorsCount: teamIndicators.length,
          population: team.population_covered || 0
        };
      }).sort((a: any, b: any) => parseFloat(b.avgIndicator) - parseFloat(a.avgIndicator));
    }

    return [];
  }, [comparisonType, visits, teams, indicators]);

  const chartData = comparisonData.slice(0, 10);

  const getMetricValue = (item: any) => {
    switch (metric) {
      case 'visits': return item.visits || 0;
      case 'citizens': return item.citizens || 0;
      case 'completionRate': return parseFloat(item.completionRate) || 0;
      case 'avgIndicator': return parseFloat(item.avgIndicator) || 0;
      default: return 0;
    }
  };

  const metricLabel: Record<string, string> = {
    visits: 'Total de Visitas',
    citizens: 'Cidadãos Atendidos',
    completionRate: 'Taxa de Conclusão (%)',
    avgIndicator: 'Média de Indicadores (%)'
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Comparar:</span>
              <Select value={comparisonType} onValueChange={setComparisonType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microareas">Microáreas</SelectItem>
                  <SelectItem value="equipes">Equipes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Métrica:</span>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {comparisonType === 'microareas' ? (
                    <>
                      <SelectItem value="visits">Total de Visitas</SelectItem>
                      <SelectItem value="citizens">Cidadãos Atendidos</SelectItem>
                      <SelectItem value="completionRate">Taxa de Conclusão</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="avgIndicator">Média de Indicadores</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExportCSV(comparisonData, `comparativo_${comparisonType}`)}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {comparisonType === 'microareas' ? <Map className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            Comparativo - {metricLabel[metric]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar 
                  dataKey={(item) => getMetricValue(item)} 
                  name={metricLabel[metric]}
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader>
          <CardTitle>Dados Detalhados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posição</TableHead>
                <TableHead>Nome</TableHead>
                {comparisonType === 'microareas' ? (
                  <>
                    <TableHead className="text-right">Visitas</TableHead>
                    <TableHead className="text-right">Cidadãos</TableHead>
                    <TableHead className="text-right">Taxa Conclusão</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Média Indicadores</TableHead>
                    <TableHead className="text-right">População</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((item: any, index: number) => (
                <motion.tr
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-gray-50"
                >
                  <TableCell>
                    <Badge variant={index < 3 ? 'default' : 'outline'}>
                      {index + 1}º
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  {comparisonType === 'microareas' ? (
                    <>
                      <TableCell className="text-right">{item.visits}</TableCell>
                      <TableCell className="text-right">{item.citizens}</TableCell>
                      <TableCell className="text-right">
                        <span className={parseFloat(item.completionRate) >= 80 ? 'text-green-600' : 'text-orange-600'}>
                          {item.completionRate}%
                        </span>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Badge variant="outline">{item.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={parseFloat(item.avgIndicator) >= 50 ? 'text-green-600' : 'text-orange-600'}>
                          {item.avgIndicator}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{item.population?.toLocaleString()}</TableCell>
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
