import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  History, Calendar, MapPin, User, Search, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';

const VISIT_TYPE_LABELS: Record<string, string> = {
  cadastro: 'Cadastro',
  acompanhamento: 'Acompanhamento',
  busca_ativa: 'Busca Ativa',
  campanha: 'Campanha',
  entrega_medicamento: 'Entrega Med.',
  outros: 'Outros'
};

const DESFECHO_LABELS: Record<string, string> = {
  visita_realizada: 'Realizada',
  ausente: 'Ausente',
  recusou: 'Recusou',
  mudou: 'Mudou-se',
  obito: 'Óbito',
  outros: 'Outros'
};

interface ACSVisitHistoryProps {
  acs: any;
  visits?: any[];
}

export default function ACSVisitHistory({ acs, visits = [] }: ACSVisitHistoryProps) {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    visitType: 'all',
    search: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filteredVisits = useMemo(() => {
    if (!acs) return [];
    
    let data = visits.filter(v => v.acs_id === acs.id || v.acs_name === acs.name);
    
    if (filters.startDate) {
      data = data.filter(v => v.visit_date >= filters.startDate);
    }
    if (filters.endDate) {
      data = data.filter(v => v.visit_date <= filters.endDate);
    }
    if (filters.visitType !== 'all') {
      data = data.filter(v => v.visit_type === filters.visitType);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      data = data.filter(v => 
        v.citizen_name?.toLowerCase().includes(term) ||
        v.address?.toLowerCase().includes(term)
      );
    }

    return data.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
  }, [acs, visits, filters]);

  const paginatedVisits = filteredVisits.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredVisits.length / pageSize);

  // Stats
  const stats = useMemo(() => {
    const total = filteredVisits.length;
    const realizadas = filteredVisits.filter(v => v.desfecho === 'visita_realizada').length;
    const ausentes = filteredVisits.filter(v => v.desfecho === 'ausente').length;
    return { total, realizadas, ausentes, taxaSucesso: total > 0 ? Math.round((realizadas / total) * 100) : 0 };
  }, [filteredVisits]);

  const handleExport = () => {
    const headers = ['Data', 'Horário', 'Cidadão', 'Endereço', 'Tipo', 'Desfecho', 'Observações'];
    const rows = filteredVisits.map(v => [
      v.visit_date,
      v.visit_time,
      v.citizen_name,
      v.address,
      VISIT_TYPE_LABELS[v.visit_type] || v.visit_type,
      DESFECHO_LABELS[v.desfecho] || v.desfecho,
      v.observations
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_visitas_${acs?.name?.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!acs) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-8 text-center text-gray-500">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          Selecione um ACS para ver o histórico de visitas
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Visitas</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.realizadas}</p>
              <p className="text-xs text-gray-500">Realizadas</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.ausentes}</p>
              <p className="text-xs text-gray-500">Ausentes</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.taxaSucesso}%</p>
              <p className="text-xs text-gray-500">Taxa Sucesso</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="shadow-md border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
            <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            <Select value={filters.visitType} onValueChange={(v) => setFilters({ ...filters, visitType: v })}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(VISIT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Buscar..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-10" />
            </div>
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Visitas - {acs.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Cidadão</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Desfecho</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVisits.map((visit, idx) => (
                <TableRow key={visit.id || idx} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>{visit.visit_time || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      {visit.citizen_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {visit.address || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {VISIT_TYPE_LABELS[visit.visit_type] || visit.visit_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={visit.desfecho === 'visita_realizada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {DESFECHO_LABELS[visit.desfecho] || visit.desfecho || 'Realizada'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedVisits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhuma visita encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
