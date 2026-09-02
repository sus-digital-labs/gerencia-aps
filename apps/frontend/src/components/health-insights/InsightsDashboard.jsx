import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const INSIGHT_TYPES = {
  risk_alert: {
    label: "Alerta de Risco",
    icon: AlertTriangle,
    color: "text-red-600",
  },
  preventive_action: {
    label: "Ação Preventiva",
    icon: Target,
    color: "text-blue-600",
  },
  follow_up: { label: "Acompanhamento", icon: Clock, color: "text-orange-600" },
  vaccination: {
    label: "Vacinação",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  chronic_care: { label: "Crônico", icon: Lightbulb, color: "text-purple-600" },
};

const PRIORITY_COLORS = {
  baixa: "bg-gray-100 text-gray-700",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

export default function InsightsDashboard() {
  const [activeTab, setActiveTab] = useState("pendente");
  const queryClient = useQueryClient();

  const { data: insights = [] } = useQuery({
    queryKey: ["healthInsights"],
    queryFn: () => trpc.HealthInsight.filter({}, "-created_date", 100),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      trpc.HealthInsight.update(id, {
        status,
        resolved_at: status === "concluido" ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["healthInsights"]);
      toast.success("Status atualizado");
    },
  });

  const filteredInsights = insights.filter(i => i.status === activeTab);

  const stats = {
    pendente: insights.filter(i => i.status === "pendente").length,
    em_andamento: insights.filter(i => i.status === "em_andamento").length,
    concluido: insights.filter(i => i.status === "concluido").length,
    urgente: insights.filter(
      i => i.priority === "urgente" && i.status === "pendente"
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Pendentes</p>
            <p className="text-2xl font-bold">{stats.pendente}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-blue-600">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.em_andamento}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Concluídos</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.concluido}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">Urgentes</p>
            <p className="text-2xl font-bold text-red-600">{stats.urgente}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="pendente" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="em_andamento" className="gap-2">
            <Target className="w-4 h-4" />
            Em Andamento
          </TabsTrigger>
          <TabsTrigger value="concluido" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Concluídos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredInsights.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum insight encontrado</p>
              </CardContent>
            </Card>
          ) : (
            filteredInsights.map((insight, idx) => {
              const typeConfig =
                INSIGHT_TYPES[insight.insight_type] ||
                INSIGHT_TYPES.preventive_action;
              const Icon = typeConfig.icon;

              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                            <CardTitle className="text-lg">
                              {insight.title}
                            </CardTitle>
                          </div>
                          <p className="text-sm text-gray-600">
                            {insight.description}
                          </p>
                        </div>
                        <Badge className={PRIORITY_COLORS[insight.priority]}>
                          {insight.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Cidadão
                        </p>
                        <p className="text-gray-900">{insight.citizen_name}</p>
                      </div>

                      {insight.recommendations?.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Recomendações
                          </p>
                          <ul className="space-y-1">
                            {insight.recommendations.map((rec, i) => (
                              <li
                                key={i}
                                className="text-sm text-gray-600 flex items-start gap-2"
                              >
                                <span>•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {insight.status === "pendente" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: insight.id,
                                status: "em_andamento",
                              })
                            }
                          >
                            Iniciar
                          </Button>
                        )}
                        {insight.status === "em_andamento" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: insight.id,
                                status: "concluido",
                              })
                            }
                          >
                            Concluir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: insight.id,
                              status: "ignorado",
                            })
                          }
                        >
                          Ignorar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
