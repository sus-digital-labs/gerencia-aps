import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Edit, Trash2, TrendingUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const GOAL_TYPES = {
  visitas_mensais: { label: 'Visitas Mensais', icon: '🏠', color: 'bg-blue-100 text-blue-700' },
  cadastros_completos: { label: 'Cadastros Completos', icon: '📋', color: 'bg-green-100 text-green-700' },
  familias_atualizadas: { label: 'Famílias Atualizadas', icon: '👨‍👩‍👧‍👦', color: 'bg-purple-100 text-purple-700' },
  vacinacao: { label: 'Cobertura Vacinal', icon: '💉', color: 'bg-pink-100 text-pink-700' },
  condicoes_cronicas: { label: 'Acompanhamento Crônicos', icon: '❤️', color: 'bg-rose-100 text-rose-700' },
};

export interface ACSGoalsManagerProps {
  acsList?: any[];
  selectedACS?: any;
}

export default function ACSGoalsManager({ acsList = [], selectedACS = null }: ACSGoalsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    acs_id: selectedACS?.id || '',
    acs_name: selectedACS?.name || '',
    goal_type: 'visitas_mensais',
    target_value: 100,
    period: 'mensal',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ['acsGoals', selectedACS?.id],
    queryFn: async () => {
      const query = selectedACS ? { acs_id: selectedACS.id } : {};
      return trpc.ACSGoal.filter(query, '-created_date');
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => trpc.ACSGoal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['acsGoals']);
      setIsDialogOpen(false);
      resetForm();
      toast.success('Meta criada com sucesso');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => trpc.ACSGoal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['acsGoals']);
      setIsDialogOpen(false);
      setEditingGoal(null);
      resetForm();
      toast.success('Meta atualizada');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => trpc.ACSGoal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['acsGoals']);
      toast.success('Meta excluída');
    }
  });

  const resetForm = () => {
    setFormData({
      acs_id: selectedACS?.id || '',
      acs_name: selectedACS?.name || '',
      goal_type: 'visitas_mensais',
      target_value: 100,
      period: 'mensal',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const acs = acsList.find(a => a.id === formData.acs_id);
    const dataToSubmit = {
      ...formData,
      acs_name: acs?.name || formData.acs_name,
      current_value: 0,
      active: true
    };

    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      acs_id: goal.acs_id,
      acs_name: goal.acs_name,
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      period: goal.period,
      month: goal.month,
      year: goal.year
    });
    setIsDialogOpen(true);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Gerenciamento de Metas {selectedACS && `- ${selectedACS.name}`}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-indigo-600 hover:bg-indigo-50" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Editar Meta' : 'Criar Nova Meta'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>ACS *</Label>
                  <Select value={formData.acs_id} onValueChange={(v) => setFormData({ ...formData, acs_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o ACS" /></SelectTrigger>
                    <SelectContent>
                      {acsList.map(acs => (
                        <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Meta *</Label>
                    <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GOAL_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.icon} {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Período *</Label>
                    <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor Alvo *</Label>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Input
                      type="number"
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                      min="1"
                      max="12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min="2020"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhuma meta configurada</p>
            <p className="text-sm">Crie metas para acompanhar o desempenho</p>
          </div>
        ) : (
          goals.map((goal) => {
            const config = GOAL_TYPES[goal.goal_type] || {};
            const percentage = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0;
            const isComplete = percentage >= 100;
            
            return (
              <div key={goal.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{config.icon}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{config.label}</h4>
                      <p className="text-sm text-gray-600">{goal.acs_name} • {goal.period}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{goal.month}/{goal.year}</Badge>
                        {isComplete && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Meta Atingida
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Deseja realmente excluir esta meta?')) {
                          deleteMutation.mutate(goal.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progresso</span>
                    <span className="font-medium">
                      {goal.current_value} / {goal.target_value} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2" />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}