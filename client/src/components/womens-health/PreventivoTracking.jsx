import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { addMonths, format, differenceInMonths } from "date-fns";

const STATUS_CONFIG = {
  em_dia: {
    label: "Em Dia",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  atrasado: {
    label: "Atrasado",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  nunca_fez: {
    label: "Nunca Fez",
    color: "bg-gray-100 text-gray-700",
    icon: XCircle,
  },
};

export default function PreventivoTracking() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    citizen_name: "",
    citizen_cns: "",
    birth_date: "",
    preventivo_last_date: "",
    preventivo_result: "",
    preventivo_next_date: "",
    notes: "",
  });

  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ["womensHealth"],
    queryFn: () => trpc.WomensHealthTracking.filter({}, "citizen_name"),
  });

  const saveMutation = useMutation({
    mutationFn: data => {
      const age = data.birth_date
        ? Math.floor((new Date() - new Date(data.birth_date)) / 31557600000)
        : null;
      const lastDate = data.preventivo_last_date
        ? new Date(data.preventivo_last_date)
        : null;
      const monthsSinceLast = lastDate
        ? differenceInMonths(new Date(), lastDate)
        : null;

      let status = "nunca_fez";
      let nextDate = null;

      if (lastDate) {
        nextDate = format(addMonths(lastDate, 36), "yyyy-MM-dd"); // 3 anos
        status = monthsSinceLast > 36 ? "atrasado" : "em_dia";
      }

      const payload = {
        ...data,
        age,
        preventivo_status: status,
        preventivo_next_date: nextDate,
      };

      return editingRecord
        ? trpc.WomensHealthTracking.update(editingRecord.id, payload)
        : trpc.WomensHealthTracking.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["womensHealth"]);
      setIsDialogOpen(false);
      setEditingRecord(null);
      resetForm();
      toast.success("Registro salvo com sucesso");
    },
  });

  const resetForm = () => {
    setFormData({
      citizen_name: "",
      citizen_cns: "",
      birth_date: "",
      preventivo_last_date: "",
      preventivo_result: "",
      preventivo_next_date: "",
      notes: "",
    });
  };

  const handleEdit = record => {
    setEditingRecord(record);
    setFormData({
      citizen_name: record.citizen_name || "",
      citizen_cns: record.citizen_cns || "",
      birth_date: record.birth_date || "",
      preventivo_last_date: record.preventivo_last_date || "",
      preventivo_result: record.preventivo_result || "",
      preventivo_next_date: record.preventivo_next_date || "",
      notes: record.notes || "",
    });
    setIsDialogOpen(true);
  };

  const filteredRecords = records.filter(
    r =>
      !search ||
      r.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.citizen_cns?.includes(search)
  );

  const stats = {
    total: records.length,
    em_dia: records.filter(r => r.preventivo_status === "em_dia").length,
    atrasado: records.filter(r => r.preventivo_status === "atrasado").length,
    nunca_fez: records.filter(r => r.preventivo_status === "nunca_fez").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Em Dia</p>
            <p className="text-2xl font-bold text-green-600">{stats.em_dia}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Atrasados</p>
            <p className="text-2xl font-bold text-red-600">{stats.atrasado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Nunca Fez</p>
            <p className="text-2xl font-bold text-gray-600">
              {stats.nunca_fez}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Buscar por nome ou CNS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingRecord(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <FileText className="w-4 h-4" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRecord
                  ? "Editar Registro"
                  : "Novo Registro - Preventivo"}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Cidadã *</Label>
                  <Input
                    value={formData.citizen_name}
                    onChange={e =>
                      setFormData({ ...formData, citizen_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNS</Label>
                  <Input
                    value={formData.citizen_cns}
                    onChange={e =>
                      setFormData({ ...formData, citizen_cns: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date}
                    onChange={e =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data do Último Preventivo</Label>
                  <Input
                    type="date"
                    value={formData.preventivo_last_date}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        preventivo_last_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Resultado do Exame</Label>
                <Input
                  value={formData.preventivo_result}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      preventivo_result: e.target.value,
                    })
                  }
                  placeholder="Ex: Normal, alterações benignas..."
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Último Exame</TableHead>
                <TableHead>Próximo Exame</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map(record => {
                const statusConfig =
                  STATUS_CONFIG[record.preventivo_status] ||
                  STATUS_CONFIG.nunca_fez;
                const Icon = statusConfig.icon;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.citizen_name}
                    </TableCell>
                    <TableCell>{record.age || "-"}</TableCell>
                    <TableCell>
                      {record.preventivo_last_date
                        ? new Date(
                            record.preventivo_last_date
                          ).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {record.preventivo_next_date
                        ? new Date(
                            record.preventivo_next_date
                          ).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(record)}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
