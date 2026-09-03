import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Syringe, Download, TrendingUp, Users, Target, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const VACCINES = [
  { id: 'bcg', name: 'BCG', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'hepatite_b', name: 'Hepatite B', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'pentavalente', name: 'Pentavalente', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'pneumococica', name: 'Pneumocócica 10V', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'rotavirus', name: 'Rotavírus', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'meningococica', name: 'Meningocócica C', targetAge: '< 1 ano', targetPopulation: 500 },
  { id: 'polio', name: 'Poliomielite (VIP/VOP)', targetAge: '< 5 anos', targetPopulation: 2500 },
  { id: 'triplice_viral', name: 'Tríplice Viral', targetAge: '1 a 4 anos', targetPopulation: 2000 },
  { id: 'varicela', name: 'Varicela', targetAge: '1 a 4 anos', targetPopulation: 2000 },
  { id: 'hepatite_a', name: 'Hepatite A', targetAge: '1 a 4 anos', targetPopulation: 2000 },
  { id: 'febre_amarela', name: 'Febre Amarela', targetAge: '9 meses+', targetPopulation: 5000 },
  { id: 'hpv', name: 'HPV', targetAge: '9 a 14 anos', targetPopulation: 1500 },
  { id: 'influenza', name: 'Influenza', targetAge: 'Grupos Prioritários', targetPopulation: 8000 },
  { id: 'covid19', name: 'COVID-19', targetAge: '6 meses+', targetPopulation: 15000 }
];

const DOSES = ['D1', 'D2', 'D3', 'REF', 'DU'];

export interface ImmunizationReportProps {
  citizens?: any[];
}

export default function ImmunizationReport({ citizens = [] }: ImmunizationReportProps) {
  const [filters, setFilters] = useState({
    vaccine: 'all',
    dose: 'all',
    year: String(new Date().getFullYear())
  });

  // Generate vaccination data
  const vaccinationData = useMemo(() => {
    const data: Record<string, any> = {};
    
    VACCINES.forEach(vaccine => {
      const appliedDoses = Math.floor(Math.random() * vaccine.targetPopulation * 0.9) + vaccine.targetPopulation * 0.5;
      const coverage = Math.min(100, (appliedDoses / vaccine.targetPopulation) * 100);
      
      data[vaccine.id] = {
        ...vaccine,
        appliedDoses: Math.floor(appliedDoses),
        coverage: Math.round(coverage * 10) / 10,
        status: coverage >= 95 ? 'meta' : coverage >= 80 ? 'alerta' : 'critico'
      };
    });

    return data;
  }, [filters.year]);

  // Monthly evolution data
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months.map((month, idx) => ({
      month,
      doses: Math.floor(Math.random() * 2000) + 1000,
      cobertura: Math.floor(Math.random() * 20) + 70
    }));
  }, [filters.year]);

  // Coverage by age group
  const ageGroupData = useMemo(() => {
    return [
      { faixa: '< 1 ano', populacao: 500, doses: Math.floor(Math.random() * 100) + 400, cobertura: 0 },
      { faixa: '1 a 4 anos', populacao: 2000, doses: Math.floor(Math.random() * 400) + 1600, cobertura: 0 },
      { faixa: '5 a 9 anos', populacao: 2500, doses: Math.floor(Math.random() * 500) + 2000, cobertura: 0 },
      { faixa: '10 a 19 anos', populacao: 3000, doses: Math.floor(Math.random() * 600) + 2400, cobertura: 0 },
      { faixa: '20 a 59 anos', populacao: 10000, doses: Math.floor(Math.random() * 2000) + 8000, cobertura: 0 },
      { faixa: '60+ anos', populacao: 2000, doses: Math.floor(Math.random() * 400) + 1600, cobertura: 0 }
    ].map(item => ({
      ...item,
      cobertura: Math.round((item.doses / item.populacao) * 100 * 10) / 10
    }));
  }, [filters.year]);

  // Summary stats
  const stats = useMemo(() => {
    const vaccines = Object.values(vaccinationData);
    return {
      totalDoses: vaccines.reduce((sum, v) => sum + v.appliedDoses, 0),
      avgCoverage: Math.round(vaccines.reduce((sum, v) => sum + v.coverage, 0) / vaccines.length * 10) / 10,
      atMeta: vaccines.filter(v => v.status === 'meta').length,
      critical: vaccines.filter(v => v.status === 'critico').length
    };
  }, [vaccinationData]);

  const handleExportCSV = () => {
    const headers = ['Imunobiológico', 'Faixa Etária', 'População Alvo', 'Doses Aplicadas', 'Cobertura (%)'];
    const rows = Object.values(vaccinationData).map(v => [
      v.name,
      v.targetAge,
      v.targetPopulation,
      v.appliedDoses,
      v.coverage
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imunizacao_${filters.year}.csv`;
    a.click();
  };

  const selectedVaccine = filters.vaccine !== 'all' ? vaccinationData[filters.vaccine] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Syringe className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Relatório de Imunização</h2>
                <p className="text-white/80">Monitoramento da cobertura vacinal do município</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white text-lg px-4 py-2">
              {filters.year}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Imunobiológico</Label>
              <Select value={filters.vaccine} onValueChange={(v) => setFilters({ ...filters, vaccine: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {VACCINES.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dose</Label>
              <Select value={filters.dose} onValueChange={(v) => setFilters({ ...filters, dose: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {DOSES.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={filters.year} onValueChange={(v) => setFilters({ ...filters, year: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExportCSV} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Syringe className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalDoses.toLocaleString()}</p>
                  <p className="text-sm opacity-80">Doses Aplicadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgCoverage}%</p>
                  <p className="text-sm opacity-80">Cobertura Média</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.atMeta}</p>
                  <p className="text-sm opacity-80">Na Meta (≥95%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{stats.critical}</p>
                  <p className="text-sm opacity-80">Crítico (&lt;80%)</p>
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Evolução Mensal de Doses Aplicadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="doses" stroke="#10b981" strokeWidth={2} name="Doses" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Coverage by Age Group */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Cobertura por Faixa Etária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGroupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cobertura" fill="#3b82f6" name="Cobertura (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vaccine Coverage Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Syringe className="w-5 h-5" />
            Cobertura Vacinal por Imunobiológico
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Imunobiológico</TableHead>
                  <TableHead>Faixa Etária Alvo</TableHead>
                  <TableHead className="text-center">População Alvo</TableHead>
                  <TableHead className="text-center">Doses Aplicadas</TableHead>
                  <TableHead className="text-center">Cobertura</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(vaccinationData).map((vaccine, idx) => (
                  <TableRow key={vaccine.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{vaccine.name}</TableCell>
                    <TableCell>{vaccine.targetAge}</TableCell>
                    <TableCell className="text-center">{vaccine.targetPopulation.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold">{vaccine.appliedDoses.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-bold">{vaccine.coverage}%</TableCell>
                    <TableCell className="w-32">
                      <Progress 
                        value={Math.min(100, vaccine.coverage)} 
                        className={`h-2 ${
                          vaccine.status === 'meta' ? '[&>div]:bg-emerald-500' :
                          vaccine.status === 'alerta' ? '[&>div]:bg-amber-500' :
                          '[&>div]:bg-red-500'
                        }`}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        vaccine.status === 'meta' ? 'bg-emerald-100 text-emerald-700' :
                        vaccine.status === 'alerta' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {vaccine.status === 'meta' ? 'Meta Atingida' :
                         vaccine.status === 'alerta' ? 'Alerta' : 'Crítico'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Age Group Coverage Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="text-lg">Cobertura por Faixa Etária</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Faixa Etária</TableHead>
                <TableHead className="text-center">População Alvo</TableHead>
                <TableHead className="text-center">Doses Aplicadas</TableHead>
                <TableHead className="text-center">Cobertura</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ageGroupData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.faixa}</TableCell>
                  <TableCell className="text-center">{item.populacao.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold">{item.doses.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={
                      item.cobertura >= 95 ? 'bg-emerald-100 text-emerald-700' :
                      item.cobertura >= 80 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }>
                      {item.cobertura}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
