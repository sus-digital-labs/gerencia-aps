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
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Copy,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Merge,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function DuplicatesList() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showUnifyDialog, setShowUnifyDialog] = useState(false);
  const [primaryCitizenId, setPrimaryCitizenId] = useState("");
  const [unifyReason, setUnifyReason] = useState("");

  const queryClient = useQueryClient();

  // Fetch duplicate groups
  const { data: duplicateGroups = [], isLoading } = useQuery({
    queryKey: ["duplicateGroups"],
    queryFn: () =>
      trpc.DuplicateGroup.filter({ status: "pendente" }, "-created_date"),
  });

  // Fetch citizens for comparison
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizenRecords"],
    queryFn: () => trpc.CitizenRecord.filter({}, "no_cidadao", 2000),
  });

  // Create pending edit for unification
  const createPendingEdit = useMutation({
    mutationFn: async data => {
      // Create pending edits for each citizen to be deactivated
      const edits = data.citizenIdsToDeactivate.map(citizenId =>
        trpc.PendingEdit.create({
          entity_type: "citizen",
          entity_id: citizenId,
          citizen_name:
            citizens.find(c => c.id === citizenId)?.no_cidadao || "",
          field_name: "st_ativo",
          old_value: "1",
          new_value: "0",
          reason: `Unificação de cadastro duplicado. Registro principal: ${data.primaryId}. ${data.reason}`,
          status: "pendente",
        })
      );
      await Promise.all(edits);

      // Update duplicate group status
      await trpc.DuplicateGroup.update(data.groupId, {
        status: "unificado",
        primary_citizen_id: data.primaryId,
        resolved_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["duplicateGroups"]);
      queryClient.invalidateQueries(["pendingEdits"]);
      setShowUnifyDialog(false);
      setSelectedGroup(null);
      setPrimaryCitizenId("");
      setUnifyReason("");
      toast.success("Solicitação de unificação enviada para aprovação");
    },
  });

  // Discard duplicate group
  const discardGroup = useMutation({
    mutationFn: groupId =>
      trpc.DuplicateGroup.update(groupId, {
        status: "descartado",
        resolved_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["duplicateGroups"]);
      toast.success("Grupo descartado");
    },
  });

  const getCitizensInGroup = group => {
    return (
      group.citizen_ids
        ?.map(id => citizens.find(c => c.id === id))
        .filter(Boolean) || []
    );
  };

  const handleUnify = () => {
    if (!primaryCitizenId) {
      toast.error("Selecione o cadastro principal");
      return;
    }

    const citizenIdsToDeactivate = selectedGroup.citizen_ids.filter(
      id => id !== primaryCitizenId
    );

    createPendingEdit.mutate({
      groupId: selectedGroup.id,
      primaryId: primaryCitizenId,
      citizenIdsToDeactivate,
      reason: unifyReason,
    });
  };

  const matchTypeLabels = {
    mae_nascimento: "Mãe + Data Nascimento",
    cpf_duplicado: "CPF Duplicado",
    cns_duplicado: "CNS Duplicado",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Copy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Cadastros Duplicados</h2>
              <p className="text-white/80">
                {duplicateGroups.length} grupos de possíveis duplicados
                identificados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Carregando...</p>
        </div>
      ) : duplicateGroups.length === 0 ? (
        <Card className="shadow-lg border-0 bg-white/90">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <p className="text-lg font-medium text-gray-700">
              Nenhum cadastro duplicado pendente
            </p>
            <p className="text-sm text-gray-500">
              Todos os grupos foram resolvidos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {duplicateGroups.map((group, idx) => {
              const groupCitizens = getCitizensInGroup(group);

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 overflow-hidden">
                    <CardHeader className="bg-amber-50 border-b">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Grupo #{idx + 1} - {groupCitizens.length} registros
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700">
                            {matchTypeLabels[group.match_type] ||
                              group.match_type}
                          </Badge>
                        </div>
                      </div>
                      {group.mother_name && (
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Mãe:</strong> {group.mother_name} |
                          <strong> Nascimento:</strong>{" "}
                          {group.birth_date
                            ? new Date(group.birth_date).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Citizens Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupCitizens.map((citizen, cidx) => (
                          <div
                            key={citizen.id}
                            className="bg-gray-50 rounded-lg p-4 border-2 border-transparent hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                                  {citizen.no_cidadao?.charAt(0) || "?"}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {citizen.no_cidadao}
                                  </p>
                                  <Badge
                                    className={
                                      citizen.st_ativo === 1
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100 text-gray-700"
                                    }
                                  >
                                    {citizen.st_ativo === 1
                                      ? "Ativo"
                                      : "Inativo"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">
                                  Data Nasc.:
                                </span>
                                <span className="font-medium">
                                  {citizen.dt_nascimento
                                    ? new Date(
                                        citizen.dt_nascimento
                                      ).toLocaleDateString("pt-BR")
                                    : "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">CPF:</span>
                                <span className="font-mono">
                                  {citizen.nu_cpf || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">CNS:</span>
                                <span className="font-mono">
                                  {citizen.nu_cns || "-"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Mãe:</span>
                                <span className="truncate max-w-32">
                                  {citizen.no_mae || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => discardGroup.mutate(group.id)}
                          className="text-gray-600"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Não é Duplicado
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedGroup(group);
                            setShowUnifyDialog(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Merge className="w-4 h-4 mr-2" />
                          Unificar Cadastro
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Unify Dialog */}
      <Dialog open={showUnifyDialog} onOpenChange={setShowUnifyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5 text-blue-500" />
              Unificar Cadastros
            </DialogTitle>
            <DialogDescription>
              Selecione qual cadastro será mantido como principal. Os demais
              serão marcados como inativos.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Cadastro Principal
                </Label>
                <RadioGroup
                  value={primaryCitizenId}
                  onValueChange={setPrimaryCitizenId}
                >
                  {getCitizensInGroup(selectedGroup).map(citizen => (
                    <div
                      key={citizen.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <RadioGroupItem value={citizen.id} id={citizen.id} />
                      <Label
                        htmlFor={citizen.id}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="font-medium">{citizen.no_cidadao}</p>
                        <p className="text-xs text-gray-500">
                          CPF: {citizen.nu_cpf || "-"} | CNS:{" "}
                          {citizen.nu_cns || "-"}
                        </p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={unifyReason}
                  onChange={e => setUnifyReason(e.target.value)}
                  placeholder="Motivo da unificação..."
                  rows={3}
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Esta ação será enviada para aprovação antes de ser aplicada.
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowUnifyDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUnify}
                  disabled={!primaryCitizenId || createPendingEdit.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createPendingEdit.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar para Aprovação"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
