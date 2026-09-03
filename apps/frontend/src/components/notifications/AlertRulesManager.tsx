import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Bell, Edit, Trash2, AlertTriangle, Play, Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface RuleTypeConfig {
  label: string;
  icon: string;
  color: string;
}

const RULE_TYPES: Record<string, RuleTypeConfig> = {
  cv_risk_no_visit: { label: 'Paciente Alto Risco CV sem Visita', icon: '❤️', color: 'bg-red-100 text-red-700' },
  data_inconsistency: { label: 'Inconsistência Crítica em Dados', icon: '⚠️', color: 'bg-amber-100 text-amber-700' },
  task_assigned: { label: 'Nova Tarefa Atribuída', icon: '📋', color: 'bg-blue-100 text-blue-700' },
  task_overdue: { label: 'Tarefa Atrasada', icon: '⏰', color: 'bg-orange-100 text-orange-700' },
  low_productivity: { label: 'Baixa Produtividade ACS', icon: '📉', color: 'bg-purple-100 text-purple-700' },
};

interface RuleData {
  id?: string;
  name: string;
  description: string;
  rule_type: string;
  threshold_days: number;
  notification_channels: string[];
  target_roles: string[];
  priority: string;
  active: boolean;
}

export default function AlertRulesManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleData | null>(null);
  const [formData, setFormData] = useState<RuleData>({
    name: '',
    description: '',
    rule_type: 'cv_risk_no_visit',
    threshold_days: 30,
    notification_channels: ['push'],
    target_roles: ['gestor_municipal'],
    priority: 'alta',
    active: true
  });

  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery<RuleData[]>({
    queryKey: ['alertRules'],
    queryFn: () => trpc.AlertRule.filter({}, '-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data: RuleData) => trpc.AlertRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Regra criada com sucesso');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RuleData> }) => trpc.AlertRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      setIsDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast.success('Regra atualizada');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trpc.AlertRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      toast.success('Regra excluída');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => trpc.AlertRule.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      toast.success('Status da regra atualizado');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'cv_risk_no_visit',
      threshold_days: 30,
      notification_channels: ['push'],
      target_roles: ['gestor_municipal'],
      priority: 'alta',
      active: true
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule?.id) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (rule: RuleData) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      threshold_days: rule.threshold_days || 30,
      notification_channels: rule.notification_channels || ['push'],
      target_roles: rule.target_roles || ['gestor_municipal'],
      priority: rule.priority || 'alta',
      active: rule.active
    });
    setIsDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Gerenciamento de Regras de Alertas
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-amber-600 hover:bg-amber-50" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Alerta'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Nome da Regra *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Alertar pacientes CV sem visita há 30 dias"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva quando este alerta deve ser disparado..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Regra *</Label>
                    <Select value={formData.rule_type} onValueChange={(v) => setFormData({ ...formData, rule_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(RULE_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.icon} {val.label}
                          </SelectItem>
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
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Limite de Dias</Label>
                    <Input
                      type="number"
                      value={formData.threshold_days}
                      onChange={(e) => setFormData({ ...formData, threshold_days: parseInt(e.target.value) })}
                      min="1"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label>Canais de Notificação</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.notification_channels.includes('push')}
                        onCheckedChange={(checked) => {
                          const channels = checked
                            ? [...formData.notification_channels, 'push']
                            : formData.notification_channels.filter(c => c !== 'push');
                          setFormData({ ...formData, notification_channels: channels });
                        }}
                      />
                      <span className="text-sm">Notificação Push no App</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.notification_channels.includes('email')}
                        onCheckedChange={(checked) => {
                          const channels = checked
                            ? [...formData.notification_channels, 'email']
                            : formData.notification_channels.filter(c => c !== 'email');
                          setFormData({ ...formData, notification_channels: channels });
                        }}
                      />
                      <span className="text-sm">E-mail</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <Label>Perfis que Receberão Notificações</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['super_admin', 'gestor_municipal', 'coordenador_ubs', 'profissional_saude', 'acs'].map(role => (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          checked={formData.target_roles.includes(role)}
                          onCheckedChange={(checked) => {
                            const roles = checked
                              ? [...formData.target_roles, role]
                              : formData.target_roles.filter(r => r !== role);
                            setFormData({ ...formData, target_roles: roles });
                          }}
                        />
                        <span className="text-sm capitalize">{role.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingRule ? 'Atualizar Regra' : 'Criar Regra'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {rules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhuma regra configurada</p>
              <p className="text-sm">Crie regras para automatizar alertas no sistema</p>
            </div>
          ) : (
            rules.map((rule) => {
              const config = RULE_TYPES[rule.rule_type] || {};
              return (
                <div key={rule.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl">{config.icon || '🔔'}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{rule.name}</h4>
                        <p className="text-sm text-gray-600">{rule.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(checked) => 
                            rule.id && toggleActiveMutation.mutate({ id: rule.id, active: checked })
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (rule.id && confirm('Deseja realmente excluir esta regra?')) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge className={config.color}>{config.label}</Badge>
                      <Badge variant="outline">{rule.threshold_days} dias</Badge>
                      <Badge variant="outline" className="capitalize">{rule.priority}</Badge>
                      {rule.notification_channels?.map(channel => (
                        <Badge key={channel} variant="outline">{channel}</Badge>
                      ))}
                      {rule.active ? (
                        <Badge className="bg-green-100 text-green-700">Ativa</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">Inativa</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
