import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, Calendar, User, MapPin, Clock, Search, 
  FileText, Eye, Download, Navigation, AlertTriangle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TASK_TYPES = {
  visita_risco_cv: { label: 'Visitar Paciente Alto Risco CV', color: 'bg-rose-100 text-rose-700' },
  verificar_foco: { label: 'Verificar Foco Aedes', color: 'bg-orange-100 text-orange-700' },
  busca_ativa: { label: 'Busca Ativa', color: 'bg-blue-100 text-blue-700' },
  acompanhamento: { label: 'Acompanhamento', color: 'bg-emerald-100 text-emerald-700' },
  cadastro: { label: 'Cadastro', color: 'bg-purple-100 text-purple-700' },
  campanha: { label: 'Campanha', color: 'bg-cyan-100 text-cyan-700' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700' }
};

export default function TaskCompletedHistory({ tasks = [], acsList = [] }) {
  const [search, setSearch] = useState('');
  const [filterACS, setFilterACS] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filter completed tasks
  const completedTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'concluida')
      .filter(t => {
        if (filterACS !== 'all' && t.acs_id !== filterACS) return false;
        if (filterType !== 'all' && t.task_type !== filterType) return false;
        if (search) {
          const s = search.toLowerCase();
          return t.title?.toLowerCase().includes(s) || 
                 t.related_citizen_name?.toLowerCase().includes(s) ||
                 t.acs_name?.toLowerCase().includes(s);
        }
        return true;
      })
      .sort((a, b) => new Date(b.completed_at || b.updated_date) - new Date(a.completed_at || a.updated_date));
  }, [tasks, filterACS, filterType, search]);

  const paginatedTasks = completedTasks.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(completedTasks.length / pageSize);

  // Stats
  const stats = useMemo(() => {
    const byType = {};
    const byACS = {};
    completedTasks.forEach(t => {
      byType[t.task_type] = (byType[t.task_type] || 0) + 1;
      byACS[t.acs_id] = (byACS[t.acs_id] || 0) + 1;
    });
    return { byType, byACS, total: completedTasks.length };
  }, [completedTasks]);

  // Calculate geolocation validation
  const validateLocation = (task) => {
    if (!task.latitude || !task.longitude || !task.expected_latitude || !task.expected_longitude) {
      return { valid: null, distance: null };
    }
    const R = 6371e3; // Earth radius in meters
    const φ1 = task.latitude * Math.PI / 180;
    const φ2 = task.expected_latitude * Math.PI / 180;
    const Δφ = (task.expected_latitude - task.latitude) * Math.PI / 180;
    const Δλ = (task.expected_longitude - task.longitude) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return { valid: distance <= 100, distance: Math.round(distance) }; // 100m tolerance
  };

  const handleExport = () => {
    const headers = ['Tarefa', 'Tipo', 'ACS', 'Cidadão', 'Endereço', 'Concluída em', 'Notas'];
    const rows = completedTasks.map(t => [
      t.title,
      TASK_TYPES[t.task_type]?.label || t.task_type,
      t.acs_name,
      t.related_citizen_name || '-',
      t.related_address || '-',
      t.completed_at ? format(new Date(t.completed_at), 'dd/MM/yyyy HH:mm') : '-',
      t.completion_notes || '-'
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarefas-concluidas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Concluídas</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-sm text-gray-500">Visitas Risco CV</p>
                <p className="text-2xl font-bold text-gray-800">{stats.byType['visita_risco_cv'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Focos Verificados</p>
                <p className="text-2xl font-bold text-gray-800">{stats.byType['verificar_foco'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Search className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Buscas Ativas</p>
                <p className="text-2xl font-bold text-gray-800">{stats.byType['busca_ativa'] || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg bg-white/90">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Histórico de Tarefas Concluídas
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar tarefa, cidadão ou ACS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterACS} onValueChange={setFilterACS}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por ACS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ACS</SelectItem>
                {acsList.map(acs => (
                  <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de tarefa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TASK_TYPES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ACS</TableHead>
                  <TableHead>Concluída em</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTasks.map(task => {
                  const locValidation = validateLocation(task);
                  return (
                    <TableRow key={task.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium line-clamp-1">{task.title}</p>
                          {task.related_citizen_name && (
                            <p className="text-xs text-gray-500">{task.related_citizen_name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={TASK_TYPES[task.task_type]?.color || 'bg-gray-100'}>
                          {TASK_TYPES[task.task_type]?.label || task.task_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.acs_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {task.completed_at ? (
                            <span title={format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm')}>
                              {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          ) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {locValidation.valid === null ? (
                          <span className="text-gray-400 text-sm">Sem GPS</span>
                        ) : locValidation.valid ? (
                          <Badge className="bg-green-100 text-green-700 gap-1">
                            <Navigation className="w-3 h-3" />
                            Validado ({locValidation.distance}m)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Fora ({locValidation.distance}m)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedTask(task)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedTasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma tarefa concluída encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, completedTasks.length)} de {completedTasks.length}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Detalhes da Tarefa Concluída
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                <Badge className={TASK_TYPES[selectedTask.task_type]?.color || 'bg-gray-100'}>
                  {TASK_TYPES[selectedTask.task_type]?.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">ACS Responsável</p>
                  <p className="font-medium">{selectedTask.acs_name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Concluída em</p>
                  <p className="font-medium">
                    {selectedTask.completed_at 
                      ? format(new Date(selectedTask.completed_at), "dd/MM/yyyy 'às' HH:mm")
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Cidadão</p>
                  <p className="font-medium">{selectedTask.related_citizen_name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Endereço</p>
                  <p className="font-medium">{selectedTask.related_address || '-'}</p>
                </div>
              </div>

              {selectedTask.description && (
                <div>
                  <p className="text-gray-500 text-sm">Descrição</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedTask.description}</p>
                </div>
              )}

              {selectedTask.completion_notes && (
                <div>
                  <p className="text-gray-500 text-sm">Notas de Conclusão</p>
                  <p className="text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                    {selectedTask.completion_notes}
                  </p>
                </div>
              )}

              {/* Geolocation Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Geolocalização
                </p>
                {selectedTask.latitude && selectedTask.longitude ? (
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-500">Localização registrada:</span>{' '}
                      {selectedTask.latitude.toFixed(6)}, {selectedTask.longitude.toFixed(6)}
                    </p>
                    {selectedTask.expected_latitude && selectedTask.expected_longitude && (
                      <>
                        <p>
                          <span className="text-gray-500">Localização esperada:</span>{' '}
                          {selectedTask.expected_latitude.toFixed(6)}, {selectedTask.expected_longitude.toFixed(6)}
                        </p>
                        {(() => {
                          const v = validateLocation(selectedTask);
                          return v.valid !== null && (
                            <p className={v.valid ? 'text-green-600' : 'text-amber-600'}>
                              {v.valid 
                                ? `✓ Validado - Distância: ${v.distance}m` 
                                : `⚠ Fora do local esperado - Distância: ${v.distance}m`}
                            </p>
                          );
                        })()}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Localização não registrada</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}