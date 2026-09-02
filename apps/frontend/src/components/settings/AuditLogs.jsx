import trpc from "@/lib/trpc-adapter";
import React, { useState, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search, Download, RefreshCw, Eye } from "lucide-react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";

const ACTION_TYPES = {
  login_success: {
    label: "Login Sucesso",
    color: "bg-green-100 text-green-700",
  },
  login_failed: { label: "Login Falhou", color: "bg-red-100 text-red-700" },
  user_create: { label: "Criar Usuário", color: "bg-blue-100 text-blue-700" },
  user_edit: { label: "Editar Usuário", color: "bg-amber-100 text-amber-700" },
  user_delete: { label: "Excluir Usuário", color: "bg-red-100 text-red-700" },
  permission_change: {
    label: "Alterar Permissão",
    color: "bg-purple-100 text-purple-700",
  },
  data_edit_request: {
    label: "Solicitar Edição",
    color: "bg-cyan-100 text-cyan-700",
  },
  data_edit_approve: {
    label: "Aprovar Edição",
    color: "bg-green-100 text-green-700",
  },
  data_edit_reject: {
    label: "Rejeitar Edição",
    color: "bg-red-100 text-red-700",
  },
  report_generate: {
    label: "Gerar Relatório",
    color: "bg-indigo-100 text-indigo-700",
  },
  data_export: {
    label: "Exportar Dados",
    color: "bg-orange-100 text-orange-700",
  },
  settings_change: {
    label: "Alterar Configuração",
    color: "bg-slate-100 text-slate-700",
  },
};

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    actionType: "all",
    search: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["auditLogs"],
    queryFn: () => trpc.AuditLog.filter({}, "-created_date", 500),
  });

  const filteredLogs = useMemo(() => {
    let data = logs;
    if (filters.startDate) {
      data = data.filter(l => l.created_date >= filters.startDate);
    }
    if (filters.endDate) {
      data = data.filter(l => l.created_date?.split("T")[0] <= filters.endDate);
    }
    if (filters.actionType !== "all") {
      data = data.filter(l => l.action_type === filters.actionType);
    }
    if (filters.search) {
      const term = filters.search.toLowerCase();
      data = data.filter(
        l =>
          l.user_email?.toLowerCase().includes(term) ||
          l.user_name?.toLowerCase().includes(term) ||
          l.action_description?.toLowerCase().includes(term)
      );
    }
    return data;
  }, [logs, filters]);

  const paginatedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const handleExport = () => {
    const headers = [
      "Data/Hora",
      "Usuário",
      "Email",
      "IP",
      "Ação",
      "Descrição",
      "Módulo",
    ];
    const rows = filteredLogs.map(l => [
      l.created_date,
      l.user_name,
      l.user_email,
      l.ip_address,
      ACTION_TYPES[l.action_type]?.label || l.action_type,
      l.action_description,
      l.module,
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${c || ""}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  // Stats
  const stats = useMemo(
    () => ({
      total: filteredLogs.length,
      logins: filteredLogs.filter(l => l.action_type === "login_success")
        .length,
      exports: filteredLogs.filter(
        l =>
          l.action_type === "data_export" || l.action_type === "report_generate"
      ).length,
    }),
    [filteredLogs]
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-700">
                  {stats.total}
                </p>
                <p className="text-sm text-gray-500">Total de Logs</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <Eye className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {stats.logins}
                </p>
                <p className="text-sm text-gray-500">Logins</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <Download className="w-8 h-8 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold text-indigo-700">
                  {stats.exports}
                </p>
                <p className="text-sm text-gray-500">Exportações</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={e =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={e =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select
                value={filters.actionType}
                onValueChange={v => setFilters({ ...filters, actionType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(ACTION_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={filters.search}
                onChange={e =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs de Acesso e Atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Módulo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log, idx) => (
                <TableRow key={log.id || idx} className="hover:bg-gray-50">
                  <TableCell className="text-sm">
                    {log.created_date
                      ? new Date(log.created_date).toLocaleString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.user_name || "-"}</p>
                      <p className="text-xs text-gray-500">{log.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.ip_address || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        ACTION_TYPES[log.action_type]?.color || "bg-gray-100"
                      }
                    >
                      {ACTION_TYPES[log.action_type]?.label || log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.action_description}
                  </TableCell>
                  <TableCell>{log.module || "-"}</TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
