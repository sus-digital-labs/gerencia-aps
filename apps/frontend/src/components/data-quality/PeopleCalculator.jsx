import trpc from "@/lib/trpc-adapter";
import React, { useState, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calculator,
  Users,
  UserCheck,
  Heart,
  Activity,
  Baby,
  User,
  PersonStanding,
  Loader2,
  Eye,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

export default function PeopleCalculator() {
  const [showList, setShowList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listCitizens, setListCitizens] = useState([]);

  // Fetch all citizens
  const { data: citizens = [], isLoading } = useQuery({
    queryKey: ["allCitizensCalc"],
    queryFn: () => trpc.CitizenRecord.filter({}, "no_cidadao", 5000),
  });

  // Calculate stats
  const stats = useMemo(() => {
    const active = citizens.filter(c => c.st_ativo === 1);

    // By sex
    const bySex = active.reduce((acc, c) => {
      const sex =
        c.co_dim_sexo === 1
          ? "Masculino"
          : c.co_dim_sexo === 2
            ? "Feminino"
            : "Não informado";
      acc[sex] = (acc[sex] || 0) + 1;
      return acc;
    }, {});

    // By age group
    const today = new Date();
    const byAge = active.reduce((acc, c) => {
      if (!c.dt_nascimento) {
        acc["Não informado"] = (acc["Não informado"] || 0) + 1;
        return acc;
      }
      const birth = new Date(c.dt_nascimento);
      const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));

      let group;
      if (age < 5) group = "0-4 anos";
      else if (age < 10) group = "5-9 anos";
      else if (age < 20) group = "10-19 anos";
      else if (age < 60) group = "20-59 anos";
      else group = "60+ anos";

      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    // By condition
    const withHypertension = active.filter(c =>
      c.conditions?.includes("hipertensao")
    ).length;
    const withDiabetes = active.filter(c =>
      c.conditions?.includes("diabetes")
    ).length;
    const pregnant = active.filter(c =>
      c.conditions?.includes("gestante")
    ).length;

    return {
      total: active.length,
      inactive: citizens.length - active.length,
      bySex,
      byAge,
      withHypertension,
      withDiabetes,
      pregnant,
    };
  }, [citizens]);

  const sexData = Object.entries(stats.bySex).map(([name, value]) => ({
    name,
    value,
  }));
  const ageData = Object.entries(stats.byAge)
    .sort((a, b) => {
      const order = [
        "0-4 anos",
        "5-9 anos",
        "10-19 anos",
        "20-59 anos",
        "60+ anos",
        "Não informado",
      ];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    })
    .map(([name, value]) => ({ name, value }));

  const handleShowList = (filter, title) => {
    const active = citizens.filter(c => c.st_ativo === 1);
    let filtered = [];

    switch (filter) {
      case "all":
        filtered = active;
        break;
      case "male":
        filtered = active.filter(c => c.co_dim_sexo === 1);
        break;
      case "female":
        filtered = active.filter(c => c.co_dim_sexo === 2);
        break;
      case "hypertension":
        filtered = active.filter(c => c.conditions?.includes("hipertensao"));
        break;
      case "diabetes":
        filtered = active.filter(c => c.conditions?.includes("diabetes"));
        break;
      case "pregnant":
        filtered = active.filter(c => c.conditions?.includes("gestante"));
        break;
      case "elderly":
        const today = new Date();
        filtered = active.filter(c => {
          if (!c.dt_nascimento) return false;
          const birth = new Date(c.dt_nascimento);
          const age = Math.floor(
            (today - birth) / (365.25 * 24 * 60 * 60 * 1000)
          );
          return age >= 60;
        });
        break;
      case "children":
        const now = new Date();
        filtered = active.filter(c => {
          if (!c.dt_nascimento) return false;
          const birth = new Date(c.dt_nascimento);
          const age = Math.floor(
            (now - birth) / (365.25 * 24 * 60 * 60 * 1000)
          );
          return age < 10;
        });
        break;
      default:
        filtered = active;
    }

    setListTitle(title);
    setListCitizens(filtered.slice(0, 100));
    setShowList(true);
  };

  const exportCSV = () => {
    const headers = ["Nome", "Data Nascimento", "CPF", "CNS", "Sexo"];
    const rows = listCitizens.map(c => [
      c.no_cidadao,
      c.dt_nascimento || "",
      c.nu_cpf || "",
      c.nu_cns || "",
      c.co_dim_sexo === 1 ? "M" : c.co_dim_sexo === 2 ? "F" : "",
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${listTitle.replace(/\s/g, "_")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Calculadora de Pessoas</h2>
              <p className="text-white/80">
                Dashboard de contagem de cidadãos por critério
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            className="shadow-lg border-0 bg-white/90 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => handleShowList("all", "Todos os Cidadãos Ativos")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Cidadãos Ativos</p>
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
          <Card
            className="shadow-lg border-0 bg-white/90 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() =>
              handleShowList("hypertension", "Cidadãos com Hipertensão")
            }
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Heart className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.withHypertension.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Hipertensos</p>
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
          <Card
            className="shadow-lg border-0 bg-white/90 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => handleShowList("diabetes", "Cidadãos com Diabetes")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Activity className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600">
                    {stats.withDiabetes.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Diabéticos</p>
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
          <Card
            className="shadow-lg border-0 bg-white/90 hover:shadow-xl transition-shadow cursor-pointer"
            onClick={() => handleShowList("pregnant", "Gestantes")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-pink-100 rounded-xl">
                  <Baby className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-pink-600">
                    {stats.pregnant.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Gestantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className="shadow-md border-0 bg-white/80 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleShowList("male", "Cidadãos do Sexo Masculino")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xl font-bold">
                {(stats.bySex["Masculino"] || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Masculino</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-md border-0 bg-white/80 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleShowList("female", "Cidadãos do Sexo Feminino")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-pink-500" />
            <div>
              <p className="text-xl font-bold">
                {(stats.bySex["Feminino"] || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Feminino</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-md border-0 bg-white/80 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleShowList("elderly", "Idosos (60+ anos)")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <PersonStanding className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xl font-bold">
                {(stats.byAge["60+ anos"] || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Idosos (60+)</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-md border-0 bg-white/80 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleShowList("children", "Crianças (0-9 anos)")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Baby className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xl font-bold">
                {(
                  (stats.byAge["0-4 anos"] || 0) +
                  (stats.byAge["5-9 anos"] || 0)
                ).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Crianças (0-9)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sex Distribution */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Sexo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sexData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {sexData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg">
              Distribuição por Faixa Etária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List Dialog */}
      <Dialog open={showList} onOpenChange={setShowList}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {listTitle}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Data Nasc.</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>CNS</TableHead>
                  <TableHead>Sexo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listCitizens.map((c, idx) => (
                  <TableRow key={c.id || idx}>
                    <TableCell className="font-medium">
                      {c.no_cidadao}
                    </TableCell>
                    <TableCell>
                      {c.dt_nascimento
                        ? new Date(c.dt_nascimento).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.nu_cpf || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {c.nu_cns || "-"}
                    </TableCell>
                    <TableCell>
                      {c.co_dim_sexo === 1
                        ? "M"
                        : c.co_dim_sexo === 2
                          ? "F"
                          : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {listCitizens.length === 100 && (
              <p className="text-center text-sm text-gray-500 py-4">
                Mostrando os primeiros 100 registros. Exporte o CSV para ver
                todos.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
