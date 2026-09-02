import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Download,
  BarChart3,
  Syringe,
  ClipboardList,
  FileSpreadsheet,
  RefreshCw,
  Users,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import ProductionReport from "@/components/reports/ProductionReport";
import BPAReport from "@/components/reports/BPAReport";
import RASReport from "@/components/reports/RASReport";
import ImmunizationReport from "@/components/reports/ImmunizationReport";
import ReportBuilder from "@/components/reports/ReportBuilder";
import ComparisonReport from "@/components/reports/ComparisonReport";
import IncidenceReport from "@/components/reports/IncidenceReport";

export default function Reports() {
  const [activeTab, setActiveTab] = useState("producao");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data
  const { data: visits = [] } = useQuery({
    queryKey: ["homeVisits"],
    queryFn: () => trpc.HomeVisit.filter({}, "-visit_date", 1000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: () => trpc.HealthTeam.filter({ active: true }),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["healthUnits"],
    queryFn: () => trpc.HealthUnit.filter({ active: true }),
  });

  const { data: acsList = [] } = useQuery({
    queryKey: ["acs"],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true }),
  });

  const { data: areas = [] } = useQuery({
    queryKey: ["territoryAreas"],
    queryFn: () => trpc.TerritoryArea.filter({ active: true }),
  });

  const { data: citizens = [] } = useQuery({
    queryKey: ["citizenLocations"],
    queryFn: () => trpc.CitizenLocation.filter({}),
  });

  const { data: indicators = [] } = useQuery({
    queryKey: ["indicators"],
    queryFn: () => trpc.IndicatorResult.filter({}, "-created_date", 200),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["customReports"],
    queryFn: () => trpc.CustomReport.filter({}, "-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: data => trpc.CustomReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["customReports"]);
      setIsDialogOpen(false);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Central de Relatórios
                </h1>
                <p className="text-white/70">Produção, BPA, RAS e Imunização</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queryClient.invalidateQueries()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white text-slate-700 hover:bg-slate-100">
                    <Plus className="w-4 h-4" />
                    Novo Relatório
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Criar Relatório Customizado</DialogTitle>
                  </DialogHeader>
                  <ReportBuilder
                    onSave={data => createMutation.mutate(data)}
                    onCancel={() => setIsDialogOpen(false)}
                    teams={teams}
                    areas={areas}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-300" />
                <div>
                  <p className="text-white/70 text-sm">Visitas (Mês)</p>
                  <p className="text-2xl font-bold">{visits.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-emerald-300" />
                <div>
                  <p className="text-white/70 text-sm">Profissionais</p>
                  <p className="text-2xl font-bold">{acsList.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Syringe className="w-8 h-8 text-green-300" />
                <div>
                  <p className="text-white/70 text-sm">Equipes</p>
                  <p className="text-2xl font-bold">{teams.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-purple-300" />
                <div>
                  <p className="text-white/70 text-sm">Relatórios</p>
                  <p className="text-2xl font-bold">{reports.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white/80 shadow-lg p-1 h-auto flex-wrap">
            <TabsTrigger
              value="producao"
              className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <BarChart3 className="w-4 h-4" />
              Produção
            </TabsTrigger>
            <TabsTrigger
              value="bpa"
              className="gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              BPA
            </TabsTrigger>
            <TabsTrigger
              value="ras"
              className="gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
            >
              <ClipboardList className="w-4 h-4" />
              RAS
            </TabsTrigger>
            <TabsTrigger
              value="imunizacao"
              className="gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <Syringe className="w-4 h-4" />
              Imunização
            </TabsTrigger>
            <TabsTrigger
              value="comparativo"
              className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4" />
              Comparativo
            </TabsTrigger>
            <TabsTrigger
              value="incidencia"
              className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <Activity className="w-4 h-4" />
              Incidência
            </TabsTrigger>
          </TabsList>

          <TabsContent value="producao" className="mt-6">
            <ProductionReport
              professionals={acsList}
              teams={teams}
              units={units}
              visits={visits}
            />
          </TabsContent>

          <TabsContent value="bpa" className="mt-6">
            <BPAReport visits={visits} professionals={acsList} />
          </TabsContent>

          <TabsContent value="ras" className="mt-6">
            <RASReport visits={visits} professionals={acsList} teams={teams} />
          </TabsContent>

          <TabsContent value="imunizacao" className="mt-6">
            <ImmunizationReport citizens={citizens} />
          </TabsContent>

          <TabsContent value="comparativo" className="mt-6">
            <ComparisonReport
              teams={teams}
              areas={areas}
              visits={visits}
              indicators={indicators}
            />
          </TabsContent>

          <TabsContent value="incidencia" className="mt-6">
            <IncidenceReport
              citizens={citizens}
              areas={areas}
              visits={visits}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
