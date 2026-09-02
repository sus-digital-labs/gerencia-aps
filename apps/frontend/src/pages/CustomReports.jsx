import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  FileText,
  Edit,
  Trash2,
  Play,
  Calendar,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ReportBuilder from "../components/reports/ReportBuilder";
import ReportPreview from "../components/reports/ReportPreview";

const DATA_SOURCE_LABELS = {
  citizens: "Cidadãos",
  visits: "Visitas",
  acs: "ACS",
  indicators: "Indicadores",
  tasks: "Tarefas",
  teams: "Equipes",
};

const VIZ_TYPE_ICONS = {
  table: "📊",
  bar_chart: "📊",
  line_chart: "📈",
  pie_chart: "🥧",
  area_chart: "📉",
};

export default function CustomReports() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery({
    queryKey: ["customReports"],
    queryFn: () => trpc.CustomReport.filter({}, "-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: id => trpc.CustomReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["customReports"]);
      toast.success("Relatório excluído");
    },
  });

  const handleEdit = report => {
    setEditingReport(report);
    setIsBuilderOpen(true);
  };

  const handleView = report => {
    setSelectedReport(report);
    setIsPreviewOpen(true);
  };

  const handleCloseBuilder = () => {
    setIsBuilderOpen(false);
    setEditingReport(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Relatórios Personalizados
                </h1>
                <p className="text-white/70">
                  Crie, agende e exporte relatórios customizados
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsBuilderOpen(true)}
              className="gap-2 bg-white text-purple-600 hover:bg-purple-50"
            >
              <Plus className="w-4 h-4" />
              Novo Relatório
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-white/70 text-sm">Total de Relatórios</p>
              <p className="text-2xl font-bold">{reports.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-white/70 text-sm">Agendados</p>
              <p className="text-2xl font-bold">
                {reports.filter(r => r.schedule_enabled).length}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-white/70 text-sm">Públicos</p>
              <p className="text-2xl font-bold">
                {reports.filter(r => r.is_public).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Reports Grid */}
        {reports.length === 0 ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center text-gray-500">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                Nenhum relatório criado
              </p>
              <p className="text-sm mb-6">
                Comece criando seu primeiro relatório personalizado
              </p>
              <Button onClick={() => setIsBuilderOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Primeiro Relatório
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span className="text-2xl">
                            {VIZ_TYPE_ICONS[report.visualization_type]}
                          </span>
                          {report.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          {report.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline">
                        {DATA_SOURCE_LABELS[report.data_source]}
                      </Badge>
                      {report.schedule_enabled && (
                        <Badge className="bg-green-100 text-green-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          Agendado
                        </Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-700">
                        {report.export_format?.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.last_generated && (
                      <p className="text-xs text-gray-500">
                        Última geração:{" "}
                        {new Date(report.last_generated).toLocaleString(
                          "pt-BR"
                        )}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(report)}
                        className="flex-1 gap-1"
                      >
                        <Play className="w-4 h-4" />
                        Gerar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(report)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Deseja excluir este relatório?")) {
                            deleteMutation.mutate(report.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Dialog */}
      <Dialog open={isBuilderOpen} onOpenChange={handleCloseBuilder}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? "Editar Relatório" : "Criar Novo Relatório"}
            </DialogTitle>
          </DialogHeader>
          <ReportBuilder
            existingReport={editingReport}
            onSave={handleCloseBuilder}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório Gerado</DialogTitle>
          </DialogHeader>
          {selectedReport && <ReportPreview config={selectedReport} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
