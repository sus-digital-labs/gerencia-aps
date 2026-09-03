import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Syringe, CheckCircle2, AlertTriangle, XCircle, LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface StatusConfig {
  label: string;
  color: string;
  icon: LucideIcon;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completo: {
    label: "Completo",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  incompleto: {
    label: "Incompleto",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
  nao_vacinada: {
    label: "Não Vacinada",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  nao_aplicavel: {
    label: "Não Aplicável",
    color: "bg-gray-100 text-gray-700",
    icon: Syringe,
  },
};

export interface HealthRecord {
  id?: string | number;
  citizen_name?: string;
  citizen_cns?: string;
  birth_date?: string;
  hpv_vaccine_doses?: number | string;
  hpv_last_dose_date?: string;
  hpv_vaccine_status?: string;
  age?: number;
}

export default function HPVVaccineTracking() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [formData, setFormData] = useState({
    citizen_name: "",
    citizen_cns: "",
    birth_date: "",
    hpv_vaccine_doses: 0 as number | string,
    hpv_last_dose_date: "",
  });

  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery<HealthRecord[]>({
    queryKey: ["womensHealth"],
    queryFn: () => trpc.WomensHealthTracking.filter({}, "citizen_name") as any,
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const age = data.birth_date
        ? Math.floor((new Date().getTime() - new Date(data.birth_date).getTime()) / 31557600000)
        : null;
      const doses = typeof data.hpv_vaccine_doses === 'string' ? parseInt(data.hpv_vaccine_doses, 10) : data.hpv_vaccine_doses;
      const parsedDoses = doses || 0;

      let status = "nao_aplicavel";
      if (age && age >= 9 && age <= 14) {
        if (parsedDoses === 0) status = "nao_vacinada";
        else if (parsedDoses >= 2) status = "completo";
        else status = "incompleto";
      }

      const payload = {
        ...data,
        age,
        hpv_vaccine_status: status,
        hpv_vaccine_doses: parsedDoses,
      };

      return editingRecord?.id
        ? trpc.WomensHealthTracking.update(editingRecord.id as any, payload as any)
        : trpc.WomensHealthTracking.create(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["womensHealth"] });
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
      hpv_vaccine_doses: 0,
      hpv_last_dose_date: "",
    });
  };

  const handleEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    setFormData({
      citizen_name: record.citizen_name || "",
      citizen_cns: record.citizen_cns || "",
      birth_date: record.birth_date || "",
      hpv_vaccine_doses: record.hpv_vaccine_doses || 0,
      hpv_last_dose_date: record.hpv_last_dose_date || "",
    });
    setIsDialogOpen(true);
  };

  const filteredRecords = records.filter(r => {
    const age = r.age || 0;
    const isApplicable = age >= 9 && age <= 14;
    const matchesSearch =
      !search ||
      r.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.citizen_cns?.includes(search);
    return isApplicable && matchesSearch;
  });

  const stats = {
    total: filteredRecords.length,
    completo: filteredRecords.filter(r => r.hpv_vaccine_status === "completo")
      .length,
    incompleto: filteredRecords.filter(
      r => r.hpv_vaccine_status === "incompleto"
    ).length,
    nao_vacinada: filteredRecords.filter(
      r => r.hpv_vaccine_status === "nao_vacinada"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Total (9-14 anos)</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Completo</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.completo}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-yellow-600">Incompleto</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.incompleto}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Não Vacinada</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.nao_vacinada}
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
              <Syringe className="w-4 h-4" />
              Novo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRecord
                  ? "Editar Registro"
                  : "Novo Registro - Vacina HPV"}
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
                  <Label>Nome *</Label>
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
              <div className="grid grid-cols-3 gap-4">
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
                  <Label>Número de Doses</Label>
                  <Select
                    value={String(formData.hpv_vaccine_doses)}
                    onValueChange={v =>
                      setFormData({
                        ...formData,
                        hpv_vaccine_doses: parseInt(v),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 doses</SelectItem>
                      <SelectItem value="1">1 dose</SelectItem>
                      <SelectItem value="2">2 doses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Última Dose</Label>
                  <Input
                    type="date"
                    value={formData.hpv_last_dose_date}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        hpv_last_dose_date: e.target.value,
                      })
                    }
                  />
                </div>
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
                <TableHead>Doses</TableHead>
                <TableHead>Última Dose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map(record => {
                const statusConfig =
                  STATUS_CONFIG[record.hpv_vaccine_status || ""] ||
                  STATUS_CONFIG.nao_aplicavel;
                const Icon = statusConfig.icon;
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.citizen_name}
                    </TableCell>
                    <TableCell>{record.age || "-"}</TableCell>
                    <TableCell>{record.hpv_vaccine_doses || 0} / 2</TableCell>
                    <TableCell>
                      {record.hpv_last_dose_date
                        ? new Date(
                            record.hpv_last_dose_date
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
