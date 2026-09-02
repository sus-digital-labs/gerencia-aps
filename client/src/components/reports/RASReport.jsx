import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ClipboardList, Download, Calendar, Search, Filter, Users, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';

export default function RASReport({ visits = [], professionals = [], teams = [] }) {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    professional: 'all',
    team: 'all',
    search: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Generate RAS data from visits
  const rasData = useMemo(() => {
    let data = visits.map((visit, idx) => ({
      id: visit.id || idx,
      date: visit.visit_date,
      time: visit.visit_time || '--:--',
      professional: visit.acs_name || 'ACS',
      cns_professional: '700000000000000',
      citizen: visit.citizen_name || 'Cidadão não identificado',
      cns_citizen: visit.citizen_cns || '-',
      procedures: visit.conditions_found?.join(', ') || 'Visita Domiciliar',
      type: visit.visit_type || 'acompanhamento',
      turno: visit.visit_time 
        ? parseInt(visit.visit_time.split(':')[0]) < 12 ? 'Manhã' 
        : parseInt(visit.visit_time.split(':')[0]) < 18 ? 'Tarde' : 'Noite'
        : 'Manhã'
    }));

    // Apply filters
    if (filters.startDate) {
      data = data.filter(d => d.date >= filters.startDate);
    }
    if (filters.endDate) {
      data = data.filter(d => d.date <= filters.endDate);
    }
    if (filters.professional !== 'all') {
      data = data.filter(d => d.professional === filters.professional);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      data = data.filter(d => 
        d.citizen?.toLowerCase().includes(term) ||
        d.professional?.toLowerCase().includes(term) ||
        d.cns_citizen?.includes(term)
      );
    }

    return data;
  }, [visits, filters]);

  const paginatedData = rasData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(rasData.length / pageSize);

  // Get unique professionals
  const uniqueProfessionals = [...new Set(visits.map(v => v.acs_name).filter(Boolean))];

  // Stats
  const stats = useMemo(() => ({
    total: rasData.length,
    identified: rasData.filter(r => r.cns_citizen !== '-').length,
    byTurno: rasData.reduce((acc, r) => {
      acc[r.turno] = (acc[r.turno] || 0) + 1;
      return acc;
    }, {})
  }), [rasData]);

  const handleExportCSV = () => {
    const headers = ['Data', 'Horário', 'Turno', 'Profissional', 'CNS Prof.', 'Cidadão', 'CNS Cidadão', 'Procedimentos', 'Tipo'];
    const rows = rasData.map(item => [
      item.date,
      item.time,
      item.turno,
      item.professional,
      item.cns_professional,
      item.citizen,
      item.cns_citizen,
      item.procedures,
      item.type
    ]);
    
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAS_${filters.startDate}_${filters.endDate}.csv`;
    a.click();
  };

  const typeLabels = {
    cadastro: 'Cadastro',
    acompanhamento: 'Acompanhamento',
    busca_ativa: 'Busca Ativa',
    campanha: 'Campanha',
    entrega_medicamento: 'Entrega Med.',
    outros: 'Outros'
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-cyan-500 to-teal-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <ClipboardList className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">RAS - Registro de Atendimento Simplificado</h2>
                <p className="text-white/80">Atendimentos simplificados da Coleta de Dados Simplificada (CDS)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={filters.professional} onValueChange={(v) => setFilters({ ...filters, professional: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueProfessionals.map(prof => (
                    <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cidadão ou CNS..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExportCSV} className="w-full gap-2 bg-teal-600 hover:bg-teal-700">
                <Download className="w-4 h-4" />
                Exportar RAS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-cyan-600">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Registros</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{stats.identified}</p>
              <p className="text-sm text-gray-500">Identificados</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.byTurno['Manhã'] || 0}</p>
              <p className="text-sm text-gray-500">Manhã</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{stats.byTurno['Tarde'] || 0}</p>
              <p className="text-sm text-gray-500">Tarde</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{stats.byTurno['Noite'] || 0}</p>
              <p className="text-sm text-gray-500">Noite</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Data Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="w-5 h-5" />
            Registros de Atendimento
            <Badge className="ml-2 bg-cyan-100 text-cyan-700">{rasData.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Cidadão</TableHead>
                  <TableHead>CNS</TableHead>
                  <TableHead>Procedimentos</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {paginatedData.map((item, idx) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        {item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>{item.time}</TableCell>
                      <TableCell>
                        <Badge className={
                          item.turno === 'Manhã' ? 'bg-amber-100 text-amber-700' :
                          item.turno === 'Tarde' ? 'bg-orange-100 text-orange-700' :
                          'bg-indigo-100 text-indigo-700'
                        }>
                          {item.turno}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.professional}</TableCell>
                      <TableCell>{item.citizen}</TableCell>
                      <TableCell className="font-mono text-sm">{item.cns_citizen}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.procedures}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, rasData.length)} de {rasData.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}