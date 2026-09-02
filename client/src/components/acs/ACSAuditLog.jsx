import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Search, User, Calendar, Edit, Trash2, Plus,
  Eye, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ACTION_CONFIG = {
  user_create: { icon: Plus, label: 'Criação', color: 'bg-green-100 text-green-700' },
  user_edit: { icon: Edit, label: 'Edição', color: 'bg-blue-100 text-blue-700' },
  user_delete: { icon: Trash2, label: 'Exclusão', color: 'bg-red-100 text-red-700' },
};

export default function ACSAuditLog({ selectedACS = null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // days

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['acsAuditLogs', selectedACS?.id, dateRange],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const allLogs = await trpc.AuditLog.filter(
        {
          action_type: { $in: ['user_create', 'user_edit', 'user_delete'] },
          module: 'acs',
          created_date: { $gte: startDate.toISOString() }
        },
        '-created_date',
        200
      );

      // Filter by selected ACS if provided
      if (selectedACS) {
        return allLogs.filter(log => log.entity_id === selectedACS.id);
      }
      return allLogs;
    }
  });

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action_type !== actionFilter) return false;
    if (searchTerm && !log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.action_description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Descrição', 'IP'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_date), 'dd/MM/yyyy HH:mm:ss'),
      log.user_name || log.user_email,
      ACTION_CONFIG[log.action_type]?.label || log.action_type,
      log.action_description,
      log.ip_address || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-acs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Auditoria de Alterações - ACS
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por usuário ou ação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="user_create">Criações</SelectItem>
                <SelectItem value="user_edit">Edições</SelectItem>
                <SelectItem value="user_delete">Exclusões</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 py-4 border-y">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {filteredLogs.length}
              </p>
              <p className="text-sm text-gray-500">Total de Registros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredLogs.filter(l => l.action_type === 'user_edit').length}
              </p>
              <p className="text-sm text-gray-500">Edições</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredLogs.filter(l => l.action_type === 'user_create').length}
              </p>
              <p className="text-sm text-gray-500">Criações</p>
            </div>
          </div>

          {/* Logs Timeline */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Nenhum registro de auditoria encontrado</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const config = ACTION_CONFIG[log.action_type] || {};
                const Icon = config.icon || Eye;

                return (
                  <div key={log.id || idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`p-3 rounded-full ${config.color || 'bg-gray-200'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Badge className={config.color}>
                            {config.label || log.action_type}
                          </Badge>
                          <p className="font-medium text-gray-900 mt-1">
                            {log.action_description}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{log.user_name || log.user_email}</span>
                        </div>
                        {log.ip_address && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">IP:</span>
                            <span className="font-mono">{log.ip_address}</span>
                          </div>
                        )}
                      </div>
                      {log.details && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-xs font-medium text-gray-500 mb-1">Detalhes:</p>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}