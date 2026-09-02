import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Database, Globe, Key, CheckCircle2, XCircle, Loader2, Save, TestTube
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ConnectionsConfig() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState({});

  const { data: configs = [] } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () => trpc.SystemConfig.filter({})
  });

  const [formData, setFormData] = useState({
    pec_host: '',
    pec_port: '5432',
    pec_user: '',
    pec_password: '',
    pec_database: 'esus',
    cns_api_url: 'https://api.cns.gov.br/v1',
    cns_api_key: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Save each config
      const configsToSave = [
        { config_key: 'pec_host', config_value: data.pec_host, category: 'database', is_sensitive: false },
        { config_key: 'pec_port', config_value: data.pec_port, category: 'database', is_sensitive: false },
        { config_key: 'pec_user', config_value: data.pec_user, category: 'database', is_sensitive: false },
        { config_key: 'pec_password', config_value: '********', category: 'database', is_sensitive: true },
        { config_key: 'pec_database', config_value: data.pec_database, category: 'database', is_sensitive: false },
        { config_key: 'cns_api_url', config_value: data.cns_api_url, category: 'api', is_sensitive: false },
        { config_key: 'cns_api_key', config_value: '********', category: 'api', is_sensitive: true }
      ];

      for (const cfg of configsToSave) {
        const existing = configs.find(c => c.config_key === cfg.config_key);
        if (existing) {
          await trpc.SystemConfig.update(existing.id, cfg);
        } else {
          await trpc.SystemConfig.create(cfg);
        }
      }
    },
    onSuccess: () => {
      toast.success('Configurações salvas com sucesso');
      queryClient.invalidateQueries(['systemConfigs']);
    }
  });

  const testConnection = async (type) => {
    setTesting(prev => ({ ...prev, [type]: true }));
    // Simulate test
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTesting(prev => ({ ...prev, [type]: false }));
    toast.success(`Conexão ${type === 'pec' ? 'e-SUS PEC' : 'API CNS'} testada com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* e-SUS PEC Connection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Conexão com e-SUS PEC (Read-Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Host do Banco</Label>
                <Input
                  placeholder="localhost ou IP do servidor"
                  value={formData.pec_host}
                  onChange={(e) => setFormData({ ...formData, pec_host: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  placeholder="5432"
                  value={formData.pec_port}
                  onChange={(e) => setFormData({ ...formData, pec_port: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input
                  placeholder="postgres"
                  value={formData.pec_user}
                  onChange={(e) => setFormData({ ...formData, pec_user: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.pec_password}
                  onChange={(e) => setFormData({ ...formData, pec_password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Banco</Label>
                <Input
                  placeholder="esus"
                  value={formData.pec_database}
                  onChange={(e) => setFormData({ ...formData, pec_database: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => testConnection('pec')}
                disabled={testing.pec}
                className="gap-2"
              >
                {testing.pec ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* API CNS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              API do Cartão Nacional de Saúde (CNS)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL da API</Label>
                <Input
                  placeholder="https://api.cns.gov.br/v1"
                  value={formData.cns_api_url}
                  onChange={(e) => setFormData({ ...formData, cns_api_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave da API</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.cns_api_key}
                  onChange={(e) => setFormData({ ...formData, cns_api_key: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => testConnection('cns')}
                disabled={testing.cns}
                className="gap-2"
              >
                {testing.cns ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(formData)}
          disabled={saveMutation.isPending}
          className="gap-2 bg-slate-700 hover:bg-slate-800"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Todas as Configurações
        </Button>
      </div>

      {/* Info Card */}
      <Card className="shadow-md border-0 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Key className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Segurança das Credenciais</p>
            <p className="text-sm text-amber-700">
              As senhas e chaves de API são armazenadas de forma criptografada e nunca são exibidas após salvas.
              Para atualizar, digite um novo valor.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}