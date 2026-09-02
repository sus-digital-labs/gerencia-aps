import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  Download,
  Filter,
  Users,
  Building2,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PROCEDURES = [
  { id: "consulta_medica", name: "Consulta Médica" },
  { id: "aferição_pa", name: "Aferição de PA" },
  { id: "curativo_simples", name: "Curativo Simples" },
  { id: "nebulização", name: "Nebulização" },
  { id: "coleta_material", name: "Coleta de Material" },
  { id: "vacinação", name: "Vacinação" },
  { id: "visita_domiciliar", name: "Visita Domiciliar" },
  { id: "consulta_enfermagem", name: "Consulta Enfermagem" },
  { id: "glicemia_capilar", name: "Glicemia Capilar" },
  { id: "teste_rapido", name: "Teste Rápido" },
];

export default function ProductionReport({
  professionals = [],
  teams = [],
  units = [],
  visits = [],
  onExport,
}) {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    groupBy: "profissional",
    selectedProfessionals: [],
    selectedProcedures: PROCEDURES.map(p => p.id),
  });

  // Consolida apenas eventos recebidos; campos ausentes não são estimados.
  const productionData = useMemo(() => {
    const data = {};

    // Group by selection
    const groups =
      filters.groupBy === "profissional"
        ? [...new Set(visits.map(v => v.acs_name || "Não identificado"))]
        : filters.groupBy === "equipe"
          ? teams.map(t => t.name)
          : units.map(u => u.name);

    groups.forEach(group => {
      if (!data[group]) {
        data[group] = { name: group };
        PROCEDURES.forEach(proc => {
          data[group][proc.id] = visits.filter(visit => {
            const visitGroup =
              filters.groupBy === "profissional"
                ? visit.acs_name || "Não identificado"
                : filters.groupBy === "equipe"
                  ? visit.team_name
                  : visit.unit_name;
            return visitGroup === group && visit.procedure_id === proc.id;
          }).length;
        });
      }
    });

    return Object.values(data);
  }, [visits, teams, units, filters.groupBy]);

  // Calculate totals
  const totals = useMemo(() => {
    const result = { name: "TOTAL" };
    PROCEDURES.forEach(proc => {
      result[proc.id] = productionData.reduce(
        (sum, row) => sum + (row[proc.id] || 0),
        0
      );
    });
    result.total = PROCEDURES.reduce(
      (sum, proc) => sum + (result[proc.id] || 0),
      0
    );
    return result;
  }, [productionData]);

  // Chart data
  const chartData = useMemo(() => {
    return productionData.slice(0, 10).map(row => ({
      name: row.name?.substring(0, 15) || "N/A",
      total: PROCEDURES.reduce((sum, proc) => sum + (row[proc.id] || 0), 0),
    }));
  }, [productionData]);

  const handleExportCSV = () => {
    const headers = [
      "Nome",
      ...PROCEDURES.filter(p => filters.selectedProcedures.includes(p.id)).map(
        p => p.name
      ),
      "Total",
    ];
    const rows = productionData.map(row => [
      row.name,
      ...PROCEDURES.filter(p => filters.selectedProcedures.includes(p.id)).map(
        p => row[p.id] || 0
      ),
      PROCEDURES.filter(p => filters.selectedProcedures.includes(p.id)).reduce(
        (sum, p) => sum + (row[p.id] || 0),
        0
      ),
    ]);

    const csv = [
      headers,
      ...rows,
      [
        "TOTAL",
        ...PROCEDURES.filter(p =>
          filters.selectedProcedures.includes(p.id)
        ).map(p => totals[p.id]),
        totals.total,
      ],
    ]
      .map(r => r.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `producao_${filters.startDate}_${filters.endDate}.csv`;
    a.click();
  };

  const toggleProcedure = procId => {
    setFilters(prev => ({
      ...prev,
      selectedProcedures: prev.selectedProcedures.includes(procId)
        ? prev.selectedProcedures.filter(id => id !== procId)
        : [...prev.selectedProcedures, procId],
    }));
  };

  const selectedProcedures = PROCEDURES.filter(p =>
    filters.selectedProcedures.includes(p.id)
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros do Relatório de Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Label>Agrupar por</Label>
              <Select
                value={filters.groupBy}
                onValueChange={v => setFilters({ ...filters, groupBy: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="equipe">Equipe</SelectItem>
                  <SelectItem value="unidade">Unidade de Saúde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleExportCSV}
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Procedure Selection */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">
              Procedimentos
            </Label>
            <div className="flex flex-wrap gap-2">
              {PROCEDURES.map(proc => (
                <Badge
                  key={proc.id}
                  className={`cursor-pointer ${
                    filters.selectedProcedures.includes(proc.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => toggleProcedure(proc.id)}
                >
                  {proc.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">
                    {totals.total?.toLocaleString()}
                  </p>
                  <p className="text-sm opacity-80">Total Produção</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">{productionData.length}</p>
                  <p className="text-sm opacity-80">Profissionais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">
                    {selectedProcedures.length}
                  </p>
                  <p className="text-sm opacity-80">Procedimentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 opacity-80" />
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(totals.total / (productionData.length || 1))}
                  </p>
                  <p className="text-sm opacity-80">Média/Prof.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Chart */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader>
          <CardTitle className="text-lg">
            Produção por{" "}
            {filters.groupBy === "profissional"
              ? "Profissional"
              : filters.groupBy === "equipe"
                ? "Equipe"
                : "Unidade"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5" />
            Tabela de Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold sticky left-0 bg-gray-50">
                    {filters.groupBy === "profissional"
                      ? "Profissional"
                      : filters.groupBy === "equipe"
                        ? "Equipe"
                        : "Unidade"}
                  </TableHead>
                  {selectedProcedures.map(proc => (
                    <TableHead
                      key={proc.id}
                      className="text-center whitespace-nowrap"
                    >
                      {proc.name}
                    </TableHead>
                  ))}
                  <TableHead className="text-center font-bold bg-blue-50">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionData.map((row, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="font-medium sticky left-0 bg-white">
                      {row.name}
                    </TableCell>
                    {selectedProcedures.map(proc => (
                      <TableCell key={proc.id} className="text-center">
                        {row[proc.id] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-bold bg-blue-50">
                      {selectedProcedures.reduce(
                        (sum, proc) => sum + (row[proc.id] || 0),
                        0
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-slate-100 font-bold">
                  <TableCell className="sticky left-0 bg-slate-100">
                    TOTAL
                  </TableCell>
                  {selectedProcedures.map(proc => (
                    <TableCell key={proc.id} className="text-center">
                      {totals[proc.id]}
                    </TableCell>
                  ))}
                  <TableCell className="text-center bg-blue-200">
                    {totals.total}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
