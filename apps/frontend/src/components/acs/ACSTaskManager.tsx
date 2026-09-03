import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, ClipboardList, Calendar, User, MapPin, CheckCircle2, Clock, AlertTriangle,
  History, Users, Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import TaskCompletedHistory from './TaskCompletedHistory';
import TaskBulkAssignment from './TaskBulkAssignment';
import TaskGeolocationComplete from './TaskGeolocationComplete';
import TaskLocationMap from './TaskLocationMap';

const TASK_TYPES: Record<string, {label: string; color: string}> = {
  visita_risco_cv: { label: 'Visitar Paciente Alto Risco CV', color: 'bg-rose-100 text-rose-700' },
  verificar_foco: { label: 'Verificar Foco Aedes', color: 'bg-orange-100 text-orange-700' },
  busca_ativa: { label: 'Busca Ativa', color: 'bg-blue-100 text-blue-700' },
  acompanhamento: { label: 'Acompanhamento', color: 'bg-emerald-100 text-emerald-700' },
  cadastro: { label: 'Cadastro', color: 'bg-purple-100 text-purple-700' },
  campanha: { label: 'Campanha', color: 'bg-cyan-100 text-cyan-700' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700' }
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700'
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-700'
};

interface ACSTaskManagerProps {
  acsList?: any[];
  selectedACS?: any | null;
  citizens?: any[];
  cvRiskPatients?: any[];
  areas?: any[];
}

export default function ACSTaskManager({ 
  acsList = [], 
  selectedACS = null,
  citizens = [],
  cvRiskPatients = [],
  areas = []
}: ACSTaskManagerProps) {
  const [activeTab, setActiveTab] = useState('pendentes');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [taskToComplete, setTaskToComplete] = useState<any>(null);
  const [taskToStart, setTaskToStart] = useState<any>(null);
  const [viewingTaskLocation, setViewingTaskLocation] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'acompanhamento',
    priority: 'media',
    acs_id: '',
    acs_name: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    related_citizen_name: '',
    related_address: ''
  });

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['acsTasks'],
    queryFn: () => (trpc.ACSTask as any).filter({}, '-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => (trpc.ACSTask as any).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acsTasks'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Tarefa criada com sucesso');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => (trpc.ACSTask as any).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acsTasks'] });
      toast.success('Tarefa atualizada');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'acompanhamento',
      priority: 'media',
      acs_id: selectedACS?.id || '',
      acs_name: selectedACS?.name || '',
      due_date: format(new Date(), 'yyyy-MM-dd'),
      related_citizen_name: '',
      related_address: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const acs = acsList.find(a => a.id === formData.acs_id);
    createMutation.mutate({
      ...formData,
      acs_name: acs?.name || formData.acs_name,
      status: 'pendente'
    });
  };

  const handleStart = (task: any) => {
    if (['visita_risco_cv', 'verificar_foco', 'busca_ativa', 'acompanhamento'].includes(task.task_type)) {
      setTaskToStart(task);
    } else {
      updateMutation.mutate({
        id: task.id,
        data: { status: 'em_andamento' }
      });
    }
  };

  const handleComplete = (task: any) => {
    // Open geolocation completion dialog for visit tasks
    if (['visita_risco_cv', 'verificar_foco', 'busca_ativa', 'acompanhamento'].includes(task.task_type)) {
      setTaskToComplete(task);
    } else {
      updateMutation.mutate({
        id: task.id,
        data: { status: 'concluida', completed_at: new Date().toISOString() }
      });
    }
  };

  // Filter tasks
  const filteredTasks = (tasks as any[]).filter(t => {
    if (selectedACS && t.acs_id !== selectedACS.id) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Geolocation Start Dialog */}
      {taskToStart && (
        <Dialog open={!!taskToStart} onOpenChange={() => setTaskToStart(null)}>
          <DialogContent className="max-w-lg p-0 border-0">
            <TaskGeolocationComplete 
              task={taskToStart}
              mode="start"
              onClose={() => setTaskToStart(null)}
              onComplete={() => setTaskToStart(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Geolocation Complete Dialog */}
      {taskToComplete && (
        <Dialog open={!!taskToComplete} onOpenChange={() => setTaskToComplete(null)}>
          <DialogContent className="max-w-lg p-0 border-0">
            <TaskGeolocationComplete 
              task={taskToComplete}
              mode="complete"
              onClose={() => setTaskToComplete(null)}
              onComplete={() => setTaskToComplete(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Task Location Dialog */}
      {viewingTaskLocation && (
        <Dialog open={!!viewingTaskLocation} onOpenChange={() => setViewingTaskLocation(null)}>
          <DialogContent className="max-w-4xl p-0 border-0">
            <TaskLocationMap task={viewingTaskLocation} />
          </DialogContent>
        </Dialog>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-white/80">
            <TabsTrigger value="pendentes" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="massa" className="gap-2">
              <Users className="w-4 h-4" />
              Atribuição em Massa
            </TabsTrigger>
          </TabsList>

          {activeTab === 'pendentes' && (
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                </SelectContent>
              </Select>
              <Badge className="bg-gray-100 text-gray-700">{filteredTasks.length} tarefas</Badge>
            </div>
          )}
        </div>

        <TabsContent value="pendentes" className="mt-4">
          {/* Actions */}
          <div className="flex items-center justify-end mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Visitar paciente José com alto risco CV"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Tarefa</Label>
                  <Select value={formData.task_type} onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ACS Responsável *</Label>
                  <Select value={formData.acs_id} onValueChange={(v) => setFormData({ ...formData, acs_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {acsList.map(acs => (
                        <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cidadão Relacionado</Label>
                <Input
                  value={formData.related_citizen_name}
                  onChange={(e) => setFormData({ ...formData, related_citizen_name: e.target.value })}
                  placeholder="Nome do cidadão (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  value={formData.related_address}
                  onChange={(e) => setFormData({ ...formData, related_address: e.target.value })}
                  placeholder="Endereço da visita (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Tarefa'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Tarefa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>ACS</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.related_citizen_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.related_citizen_name}
                        </p>
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
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLORS[task.priority]}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[task.status]}>
                      {task.status === 'pendente' ? 'Pendente' : 
                       task.status === 'em_andamento' ? 'Em Andamento' :
                       task.status === 'concluida' ? 'Concluída' : 'Cancelada'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {task.status === 'pendente' && (
                        <Button size="sm" variant="ghost" onClick={() => handleStart(task)} title="Iniciar tarefa">
                          <Clock className="w-4 h-4 text-blue-500" />
                        </Button>
                      )}
                      {(task.status === 'pendente' || task.status === 'em_andamento') && (
                        <Button size="sm" variant="ghost" onClick={() => handleComplete(task)} title="Concluir tarefa">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {task.status === 'concluida' && task.latitude && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setViewingTaskLocation(task)}
                          title="Ver localização"
                        >
                          <MapPin className="w-4 h-4 text-purple-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Nenhuma tarefa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <TaskCompletedHistory tasks={tasks} acsList={acsList} />
        </TabsContent>

        <TabsContent value="massa" className="mt-4">
          <TaskBulkAssignment 
            acsList={acsList}
            citizens={citizens}
            cvRiskPatients={cvRiskPatients}
            areas={areas}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
