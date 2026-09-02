import trpc from '@/lib/trpc-adapter';
import React, { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    email_enabled: true,
    email_critical_only: false,
    cv_risk_threshold_days: 30,
    data_quality_critical: true,
    new_tasks_assigned: true,
    visit_overdue_threshold_days: 7,
  });

  const { data: savedConfig } = useQuery({
    queryKey: ['systemConfig', 'notification_settings'],
    queryFn: async () => {
      const configs = await trpc.SystemConfig.filter({ key: 'notification_settings' });
      return configs[0];
    }
  });

  useEffect(() => {
    if (savedConfig && savedConfig.value) {
      setSettings({ ...settings, ...savedConfig.value });
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (savedConfig) {
        await trpc.SystemConfig.update(savedConfig.id, {
          value: settings,
          updated_date: new Date().toISOString()
        });
      } else {
        await trpc.SystemConfig.create({
          key: 'notification_settings',
          value: settings,
          description: 'Configurações do sistema de notificações'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['systemConfig']);
      toast.success('Configurações salvas com sucesso');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Preferências de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Email Settings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">Notificações por E-mail</h4>
                  <p className="text-sm text-gray-500">Receba alertas importantes no seu e-mail</p>
                </div>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, email_enabled: checked })}
              />
            </div>
            {settings.email_enabled && (
              <div className="ml-8 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Apenas notificações críticas</Label>
                  <Switch
                    checked={settings.email_critical_only}
                    onCheckedChange={(checked) => setSettings({ ...settings, email_critical_only: checked })}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* CV Risk Settings */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="font-semibold text-gray-900">Alertas de Risco Cardiovascular</h4>
                <p className="text-sm text-gray-500">Notificar quando pacientes de alto risco não forem visitados</p>
              </div>
            </div>
            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm w-48">Dias sem visita (threshold):</Label>
                <Input
                  type="number"
                  value={settings.cv_risk_threshold_days}
                  onChange={(e) => setSettings({ ...settings, cv_risk_threshold_days: parseInt(e.target.value) })}
                  className="w-24"
                  min="1"
                />
                <span className="text-sm text-gray-500">dias</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Quality Settings */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">Inconsistências de Dados</h4>
                  <p className="text-sm text-gray-500">Alertas sobre problemas graves de qualidade</p>
                </div>
              </div>
              <Switch
                checked={settings.data_quality_critical}
                onCheckedChange={(checked) => setSettings({ ...settings, data_quality_critical: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Task Notifications */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="font-semibold text-gray-900">Novas Tarefas</h4>
                  <p className="text-sm text-gray-500">Notificar quando tarefas forem atribuídas</p>
                </div>
              </div>
              <Switch
                checked={settings.new_tasks_assigned}
                onCheckedChange={(checked) => setSettings({ ...settings, new_tasks_assigned: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Visit Overdue Settings */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <h4 className="font-semibold text-gray-900">Visitas Atrasadas</h4>
                <p className="text-sm text-gray-500">Alertar quando visitas não forem realizadas no prazo</p>
              </div>
            </div>
            <div className="ml-8 space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm w-48">Dias de atraso (threshold):</Label>
                <Input
                  type="number"
                  value={settings.visit_overdue_threshold_days}
                  onChange={(e) => setSettings({ ...settings, visit_overdue_threshold_days: parseInt(e.target.value) })}
                  className="w-24"
                  min="1"
                />
                <span className="text-sm text-gray-500">dias</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}