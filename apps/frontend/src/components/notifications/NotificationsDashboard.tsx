import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Calendar, TrendingDown, Activity, 
  ChevronRight, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

const alertTypes = [
  { 
    key: 'visitas_atrasadas', 
    label: 'Visitas Atrasadas', 
    icon: Calendar, 
    color: 'text-amber-600 bg-amber-100',
    description: 'Cidadãos com visitas pendentes'
  },
  { 
    key: 'inconsistencias', 
    label: 'Inconsistências', 
    icon: AlertTriangle, 
    color: 'text-red-600 bg-red-100',
    description: 'Cadastros com dados faltantes'
  },
  { 
    key: 'baixa_produtividade', 
    label: 'Baixa Produtividade', 
    icon: TrendingDown, 
    color: 'text-orange-600 bg-orange-100',
    description: 'ACS abaixo da meta'
  },
  { 
    key: 'desvios_indicadores', 
    label: 'Desvios de Indicadores', 
    icon: Activity, 
    color: 'text-purple-600 bg-purple-100',
    description: 'Indicadores fora da meta'
  }
];

export interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  created_date?: string;
  action_url?: string;
}

export interface NotificationsDashboardProps {
  alerts?: Record<string, number>;
  notifications?: NotificationItem[];
  compact?: boolean;
}

export default function NotificationsDashboard({ 
  alerts = {}, 
  notifications = [],
  compact = false 
}: NotificationsDashboardProps) {
  const recentNotifications = notifications.filter(n => !n.read).slice(0, 5);

  if (compact) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-amber-500" />
              Alertas Ativos
            </span>
            <Link to={createPageUrl('PendingTasks')}>
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todos <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {alertTypes.map((type, idx) => {
              const count = alerts[type.key] || 0;
              return (
                <motion.div
                  key={type.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-xl ${count > 0 ? type.color : 'bg-gray-50 text-gray-400'}`}
                >
                  <type.icon className="w-5 h-5 mb-1" />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs">{type.label}</p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {alertTypes.map((type, idx) => {
          const count = alerts[type.key] || 0;
          return (
            <motion.div
              key={type.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`border-0 shadow-md overflow-hidden ${count > 0 ? '' : 'opacity-60'}`}>
                <div className={`h-1 ${count > 0 ? type.color.split(' ')[1] : 'bg-gray-200'}`} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${type.color}`}>
                      <type.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-3xl font-black">{count}</p>
                      <p className="text-sm text-gray-600">{type.label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{type.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Notifications */}
      {recentNotifications.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Notificações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotifications.map(notification => (
                <div 
                  key={notification.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {notification.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
