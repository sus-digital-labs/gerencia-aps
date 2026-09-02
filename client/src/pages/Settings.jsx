import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, Users, Shield, FileText, Database, Bell, Key, Map
} from 'lucide-react';
import { motion } from 'framer-motion';
import UserManagement from '@/components/settings/UserManagement';
import PermissionsManagerV2 from '@/components/settings/PermissionsManagerV2';
import AuditLogs from '@/components/settings/AuditLogs';
import ConnectionsConfig from '@/components/settings/ConnectionsConfig';
import AlertThresholds from '@/components/settings/AlertThresholds';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import NotificationSettings from '@/components/notifications/NotificationSettings';
import AlertRulesManager from '@/components/notifications/AlertRulesManager';
import MapIntegrationConfig from '@/components/settings/MapIntegrationConfig';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('users');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => useAuth()
  });

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-zinc-800 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <SettingsIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Configurações</h1>
              <p className="text-white/70">Gerenciamento de usuários, permissões e integrações</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 shadow-lg p-1 h-auto flex-wrap">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Users className="w-4 h-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Key className="w-4 h-4" />
              Permissões
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <FileText className="w-4 h-4" />
              Logs de Acesso
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Database className="w-4 h-4" />
              Conexões e APIs
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Bell className="w-4 h-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Bell className="w-4 h-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Map className="w-4 h-4" />
              Integrações
            </TabsTrigger>
            </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsManagerV2 />
          </TabsContent>

          <TabsContent value="logs">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="connections">
            <ConnectionsConfig />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertThresholds />
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-6">
              <AlertRulesManager />
              <NotificationCenter />
              <NotificationSettings />
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-blue-600" />
                  Integrações Externas
                </CardTitle>
                <CardDescription>
                  Configure provedores de mapas e outras integrações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MapIntegrationConfig />
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
          </div>
          </div>
          );
          }