import trpc from '@/lib/trpc-adapter';
import React, { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Bell, AlertTriangle, Clock, CheckCircle2, Search, 
  Filter, Calendar, User, MapPin, Settings, RefreshCw, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import moment from 'moment';

const conditionLabels = {
  gestante: 'Gestante',
  hipertenso: 'Hipertenso',
  diabetico: 'Diabético',
  idoso: 'Idoso',
  crianca: 'Criança',
  puerpera: 'Puérpera',
  geral: 'Geral'
};

const conditionColors = {
  gestante: 'bg-pink-100 text-pink-700',
  hipertenso: 'bg-red-100 text-red-700',
  diabetico: 'bg-orange-100 text-orange-700',
  idoso: 'bg-purple-100 text-purple-700',
  crianca: 'bg-blue-100 text-blue-700',
  puerpera: 'bg-rose-100 text-rose-700',
  geral: 'bg-gray-100 text-gray-700'
};

const priorityColors = {
  baixa: 'bg-green-100 text-green-700 border-green-300',
  media: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  alta: 'bg-orange-100 text-orange-700 border-orange-300',
  urgente: 'bg-red-100 text-red-700 border-red-300'
};

const alertTypeLabels = {
  visita_atrasada: 'Visita Atrasada',
  prazo_proximo: 'Prazo Próximo',
  busca_ativa: 'Busca Ativa',
  acompanhamento_pendente: 'Acompanhamento Pendente'
};

export default function PendingTasks() {
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterACS, setFilterACS] = useState('all');
  const [activeTab, setActiveTab] = useState('alerts');
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    condition: 'gestante',
    frequency_days: 30,
    warning_days_before: 3,
    priority_when_overdue: 'alta'
  });

  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['visitAlerts'],
    queryFn: () => trpc.VisitAlert.filter({ status: 'pendente' }, '-priority', 200)
  });

  // Fetch rules
  const { data: rules = [] } = useQuery({
    queryKey: ['visitScheduleRules'],
    queryFn: () => trpc.VisitScheduleRule.filter({ active: true })
  });

  // Fetch ACS
  const { data: acsList = [] } = useQuery({
    queryKey: ['acs'],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true })
  });

  // Fetch citizens
  const { data: citizens = [] } = useQuery({
    queryKey: ['citizenLocations'],
    queryFn: () => trpc.CitizenLocation.filter({})
  });

  // Fetch visits
  const { data: visits = [] } = useQuery({
    queryKey: ['homeVisits'],
    queryFn: () => trpc.HomeVisit.filter({}, '-visit_date', 500)
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: (data) => trpc.VisitScheduleRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['visitScheduleRules']);
      setIsRulesDialogOpen(false);
      resetRuleForm();
    }
  });

  // Update alert mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => trpc.VisitAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['visitAlerts']);
    }
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (data) => trpc.VisitAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['visitAlerts']);
    }
  });

  // Generate alerts based on rules
  const generateAlerts = async () => {
    const today = moment();
    const newAlerts = [];

    for (const citizen of citizens) {
      const citizenConditions = citizen.conditions || [];
      
      for (const rule of rules) {
        // Check if rule applies to this citizen
        if (rule.condition !== 'geral' && !citizenConditions.includes(rule.condition)) {
          continue;
        }

        const lastVisit = visits
          .filter(v => v.citizen_cns === citizen.citizen_cns)
          .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];

        const lastVisitDate = lastVisit ? moment(lastVisit.visit_date) : null;
        const dueDate = lastVisitDate 
          ? lastVisitDate.clone().add(rule.frequency_days, 'days')
          : today.clone().subtract(rule.frequency_days, 'days'); // If no visit, already overdue

        const daysUntilDue = dueDate.diff(today, 'days');

        // Check if alert should be created
        if (daysUntilDue <= rule.warning_days_before) {
          const existingAlert = alerts.find(a => 
            a.citizen_cns === citizen.citizen_cns && 
            a.condition === rule.condition &&
            a.status === 'pendente'
          );

          if (!existingAlert) {
            const acs = acsList.find(a => a.id === citizen.acs_id);
            
            newAlerts.push({
              citizen_cns: citizen.citizen_cns,
              citizen_name: citizen.citizen_name,
              acs_id: citizen.acs_id,
              acs_name: acs?.name || 'Não atribuído',
              microarea: citizen.microarea,
              alert_type: daysUntilDue < 0 ? 'visita_atrasada' : 'prazo_proximo',
              condition: rule.condition,
              priority: daysUntilDue < 0 ? rule.priority_when_overdue : 'media',
              due_date: dueDate.format('YYYY-MM-DD'),
              days_overdue: -daysUntilDue,
              last_visit_date: lastVisit?.visit_date || null,
              status: 'pendente'
            });
          }
        }
      }
    }

    // Create alerts in batch
    for (const alert of newAlerts) {
      await createAlertMutation.mutateAsync(alert);
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: '',
      condition: 'gestante',
      frequency_days: 30,
      warning_days_before: 3,
      priority_when_overdue: 'alta'
    });
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = !search || 
      alert.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
      alert.acs_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCondition = filterCondition === 'all' || alert.condition === filterCondition;
    const matchesPriority = filterPriority === 'all' || alert.priority === filterPriority;
    const matchesACS = filterACS === 'all' || alert.acs_id === filterACS;
    return matchesSearch && matchesCondition && matchesPriority && matchesACS;
  });

  // Stats
  const urgentCount = alerts.filter(a => a.priority === 'urgente').length;
  const overdueCount = alerts.filter(a => a.days_overdue > 0).length;
  const todayCount = alerts.filter(a => moment(a.due_date).isSame(moment(), 'day')).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Tarefas Pendentes</h1>
                <p className="text-white/70">Alertas de visitas e acompanhamentos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                onClick={generateAlerts}
                disabled={createAlertMutation.isPending}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${createAlertMutation.isPending ? 'animate-spin' : ''}`} />
                Gerar Alertas
              </Button>
              <Dialog open={isRulesDialogOpen} onOpenChange={setIsRulesDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white text-orange-600 hover:bg-orange-50">
                    <Settings className="w-4 h-4" />
                    Regras
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Regra de Visita</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Regra</Label>
                      <Input
                        value={ruleForm.name}
                        onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                        placeholder="Ex: Acompanhamento de gestantes"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Condição de Saúde</Label>
                        <Select value={ruleForm.condition} onValueChange={(v) => setRuleForm({ ...ruleForm, condition: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(conditionLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Frequência (dias)</Label>
                        <Input
                          type="number"
                          value={ruleForm.frequency_days}
                          onChange={(e) => setRuleForm({ ...ruleForm, frequency_days: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Alertar (dias antes)</Label>
                        <Input
                          type="number"
                          value={ruleForm.warning_days_before}
                          onChange={(e) => setRuleForm({ ...ruleForm, warning_days_before: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prioridade quando atrasado</Label>
                        <Select value={ruleForm.priority_when_overdue} onValueChange={(v) => setRuleForm({ ...ruleForm, priority_when_overdue: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsRulesDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={() => createRuleMutation.mutate({ ...ruleForm, active: true })}>
                        Salvar Regra
                      </Button>
                    </div>
                  </div>
                  
                  {/* Existing rules */}
                  {rules.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium mb-3">Regras Existentes</h4>
                      <div className="space-y-2">
                        {rules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{rule.name}</p>
                              <p className="text-xs text-gray-500">
                                {conditionLabels[rule.condition]} • A cada {rule.frequency_days} dias
                              </p>
                            </div>
                            <Badge className={conditionColors[rule.condition]}>
                              {conditionLabels[rule.condition]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-orange-200" />
                <div>
                  <p className="text-white/70 text-sm">Total Alertas</p>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-200" />
                <div>
                  <p className="text-white/70 text-sm">Urgentes</p>
                  <p className="text-2xl font-bold">{urgentCount}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-200" />
                <div>
                  <p className="text-white/70 text-sm">Atrasados</p>
                  <p className="text-2xl font-bold">{overdueCount}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-green-200" />
                <div>
                  <p className="text-white/70 text-sm">Para Hoje</p>
                  <p className="text-2xl font-bold">{todayCount}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar cidadão ou ACS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Condição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(conditionLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterACS} onValueChange={setFilterACS}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="ACS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os ACS</SelectItem>
                  {acsList.map(acs => (
                    <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Alertas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidadão</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>ACS</TableHead>
                  <TableHead>Microárea</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAlerts.map((alert, index) => (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{alert.citizen_name}</p>
                          <p className="text-xs text-gray-500">{alert.citizen_cns}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={conditionColors[alert.condition]}>
                          {conditionLabels[alert.condition]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {alert.acs_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {alert.microarea}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{moment(alert.due_date).format('DD/MM/YYYY')}</p>
                          {alert.days_overdue > 0 && (
                            <p className="text-xs text-red-600">{alert.days_overdue} dias atrasado</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {alertTypeLabels[alert.alert_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${priorityColors[alert.priority]} border`}>
                          {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAlertMutation.mutate({ 
                            id: alert.id, 
                            data: { status: 'concluido' } 
                          })}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Concluir
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p className="font-medium">Nenhum alerta pendente</p>
                <p className="text-sm">Todas as visitas estão em dia!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}