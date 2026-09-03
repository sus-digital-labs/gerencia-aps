import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Bell, AlertTriangle, CheckCircle, Info, Search, 
  Trash2, Eye, ExternalLink, Calendar, Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

interface TypeConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  visita_atrasada: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' },
  inconsistencia: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  baixa_produtividade: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
  visitas_recusadas: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  desvio_indicador: { icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-100' },
  alerta_geral: { icon: Bell, color: 'text-gray-600', bg: 'bg-gray-100' },
};

interface PriorityConfig {
  label: string;
  className: string;
}

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  baixa: { label: 'Baixa', className: 'bg-gray-100 text-gray-700' },
  media: { label: 'Média', className: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', className: 'bg-amber-100 text-amber-700' },
  critica: { label: 'Crítica', className: 'bg-red-100 text-red-700' },
};

interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  created_date?: string;
  action_url?: string;
}

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => trpc.Notification.filter({}, '-created_date', 200)
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => trpc.Notification.update(id, { 
      read: true, 
      read_at: new Date().toISOString() 
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trpc.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread' && n.read) return false;
    if (activeTab === 'read' && !n.read) return false;
    if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !n.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    critical: notifications.filter(n => n.priority === 'critica').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Notificações</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Bell className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Não Lidas</p>
                <p className="text-3xl font-bold text-amber-600">{stats.unread}</p>
              </div>
              <Eye className="w-12 h-12 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Críticas</p>
                <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Central de Notificações
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 pt-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all" className="gap-2">
                  Todas
                  <Badge className="bg-gray-200 text-gray-700">{notifications.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unread" className="gap-2">
                  Não Lidas
                  <Badge className="bg-amber-100 text-amber-700">{stats.unread}</Badge>
                </TabsTrigger>
                <TabsTrigger value="read" className="gap-2">
                  Lidas
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="m-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Nenhuma notificação encontrada</p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => {
                    const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.alerta_geral;
                    const Icon = typeConfig.icon;

                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          !notification.read ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-full ${typeConfig.bg}`}>
                            <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <Badge className="bg-blue-500 text-white">Novo</Badge>
                                  )}
                                  <Badge className={PRIORITY_CONFIG[notification.priority]?.className}>
                                    {PRIORITY_CONFIG[notification.priority]?.label}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {notification.created_date && formatDistanceToNow(new Date(notification.created_date), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                              {notification.action_url && (
                                <Link to={notification.action_url}>
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Ver Detalhes
                                  </Button>
                                </Link>
                              )}
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsReadMutation.mutate(notification.id)}
                                  className="gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Marcar como Lida
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(notification.id)}
                                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
