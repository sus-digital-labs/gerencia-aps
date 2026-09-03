import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Bell, Bug, Heart, AlertTriangle, Save, Loader2, Mail, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AlertThresholds() {
  const queryClient = useQueryClient();

  const [thresholds, setThresholds] = useState({
    iip_threshold: 4,
    dengue_cases_threshold: 10,
    dengue_period_days: 7,
    cv_high_risk_days: 30,
    email_notifications: true,
    app_notifications: true
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const configs = [
        { config_key: 'iip_threshold', config_value: String(thresholds.iip_threshold), category: 'alert_threshold', description: 'Limite do IIP para alerta (%)' },
        { config_key: 'dengue_cases_threshold', config_value: String(thresholds.dengue_cases_threshold), category: 'alert_threshold', description: 'Número de casos suspeitos para alerta' },
        { config_key: 'dengue_period_days', config_value: String(thresholds.dengue_period_days), category: 'alert_threshold', description: 'Período em dias para contagem de casos' },
        { config_key: 'cv_high_risk_days', config_value: String(thresholds.cv_high_risk_days), category: 'alert_threshold', description: 'Dias sem plano de cuidado para alerta CV' },
        { config_key: 'email_notifications', config_value: String(thresholds.email_notifications), category: 'notification', description: 'Enviar notificações por email' },
        { config_key: 'app_notifications', config_value: String(thresholds.app_notifications), category: 'notification', description: 'Mostrar notificações no app' }
      ];

      const existing = await trpc.SystemConfig.filter({});
      for (const cfg of configs) {
        const found = existing.find((e: any) => e.config_key === cfg.config_key);
        if (found) {
          await trpc.SystemConfig.update(found.id, cfg);
        } else {
          await trpc.SystemConfig.create(cfg);
        }
      }
    },
    onSuccess: () => {
      toast.success('Configurações de alertas salvas');
      queryClient.invalidateQueries(['systemConfigs']);
    }
  });

  // Check current alerts
  const checkAlerts = async () => {
    // This would typically be a backend job, but we simulate here
    const notifications = [];

    // Simulate IIP check
    const mockIIP = 5.2;
    if (mockIIP > thresholds.iip_threshold) {
      notifications.push({
        title: 'Alerta: IIP Elevado',
        message: `O Índice de Infestação Predial está em ${mockIIP}%, acima do limite de ${thresholds.iip_threshold}%`,
        type: 'desvio_indicador',
        priority: 'alta'
      });
    }

    // Simulate dengue cases check
    const mockDengueCases = 15;
    if (mockDengueCases > thresholds.dengue_cases_threshold) {
      notifications.push({
        title: 'Alerta: Surto de Dengue',
        message: `${mockDengueCases} casos suspeitos de Dengue nos últimos ${thresholds.dengue_period_days} dias`,
        type: 'alerta_geral',
        priority: 'critica'
      });
    }

    // Simulate CV high risk check
    notifications.push({
      title: 'Pacientes de Alto Risco sem Acompanhamento',
      message: `3 pacientes classificados como Alto Risco Cardiovascular não possuem plano de cuidado ativo há mais de ${thresholds.cv_high_risk_days} dias`,
      type: 'alerta_geral',
      priority: 'alta'
    });

    // Create notifications
    for (const notif of notifications) {
      await trpc.Notification.create(notif);
    }

    toast.success(`${notifications.length} alertas verificados e criados`);
    queryClient.invalidateQueries(['notifications']);
  };

  return (
    <div className="space-y-6">
      {/* Aedes Alerts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Alertas de Vigilância Aedes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Limite do IIP para Alerta (%)</Label>
                  <Badge className="bg-red-100 text-red-700">{thresholds.iip_threshold}%</Badge>
                </div>
                <Slider
                  value={[thresholds.iip_threshold]}
                  onValueChange={([v]: any) => setThresholds({ ...thresholds, iip_threshold: v })}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Notificar quando o Índice de Infestação Predial ultrapassar este limite</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nº de Casos Suspeitos para Alerta</Label>
                  <Input
                    type="number"
                    value={thresholds.dengue_cases_threshold}
                    onChange={(e: any) => setThresholds({ ...thresholds, dengue_cases_threshold: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período de Análise (dias)</Label>
                  <Input
                    type="number"
                    value={thresholds.dengue_period_days}
                    onChange={(e: any) => setThresholds({ ...thresholds, dengue_period_days: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">Notificar quando houver mais de {thresholds.dengue_cases_threshold} casos suspeitos em {thresholds.dengue_period_days} dias</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cardiovascular Alerts */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Alertas de Risco Cardiovascular
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dias sem Plano de Cuidado (Alto Risco)</Label>
                <Badge className="bg-rose-100 text-rose-700">{thresholds.cv_high_risk_days} dias</Badge>
              </div>
              <Slider
                value={[thresholds.cv_high_risk_days]}
                onValueChange={([v]: any) => setThresholds({ ...thresholds, cv_high_risk_days: v })}
                max={90}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Notificar sobre pacientes de Alto Risco sem plano de cuidado ativo após este período</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Canais de Notificação
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium">Notificações por Email</p>
                  <p className="text-sm text-gray-500">Enviar alertas para o email dos gestores</p>
                </div>
              </div>
              <Switch
                checked={thresholds.email_notifications}
                onCheckedChange={(v: any) => setThresholds({ ...thresholds, email_notifications: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="font-medium">Notificações no Aplicativo</p>
                  <p className="text-sm text-gray-500">Mostrar alertas no painel centralizado</p>
                </div>
              </div>
              <Switch
                checked={thresholds.app_notifications}
                onCheckedChange={(v: any) => setThresholds({ ...thresholds, app_notifications: v })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={checkAlerts}
          className="gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Verificar Alertas Agora
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 bg-slate-700 hover:bg-slate-800"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}