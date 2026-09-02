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
  Skull,
  Search,
  Loader2,
  CheckCircle2,
  Eye,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function DeathsList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryClient = useQueryClient();

  // Fetch citizens with death status
  const { data: citizens = [], isLoading } = useQuery({
    queryKey: ["citizensWithDeath"],
    queryFn: async () => {
      const all = await trpc.CitizenRecord.filter(
        { st_obito: 1 },
        "-dt_obito",
        1000
      );
      return all;
    },
  });

  // Mark as verified mutation
  const verifyMutation = useMutation({
    mutationFn: citizenId =>
      trpc.CitizenRecord.update(citizenId, {
        verified: true,
        verified_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["citizensWithDeath"]);
      toast.success("Registro marcado como verificado");
    },
  });

  // Filter citizens
  const filteredCitizens = citizens.filter(
    c =>
      !search ||
      c.no_cidadao?.toLowerCase().includes(search.toLowerCase()) ||
      c.nu_cpf?.includes(search) ||
      c.nu_cns?.includes(search)
  );

  const paginatedCitizens = filteredCitizens.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filteredCitizens.length / pageSize);

  const unverifiedCount = citizens.filter(c => !c.verified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-gray-700 to-gray-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Skull className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Registros de Óbito</h2>
                <p className="text-white/80">
                  {citizens.length} cidadãos marcados como óbito
                </p>
              </div>
            </div>
            {unverifiedCount > 0 && (
              <Badge className="bg-amber-500 text-white">
                <AlertCircle className="w-4 h-4 mr-1" />
                {unverifiedCount} não verificados
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CPF ou CNS..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Skull className="w-5 h-5 text-gray-500" />
            Lista de Óbitos
            <Badge className="ml-2 bg-gray-200 text-gray-700">
              {filteredCitizens.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Nome</TableHead>
                      <TableHead>Data de Nasc.</TableHead>
                      <TableHead>Nome da Mãe</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>CNS</TableHead>
                      <TableHead>Data do Óbito</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {paginatedCitizens.map((citizen, idx) => (
                        <motion.tr
                          key={citizen.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium">
                            {citizen.no_cidadao}
                          </TableCell>
                          <TableCell>
                            {citizen.dt_nascimento
                              ? new Date(
                                  citizen.dt_nascimento
                                ).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {citizen.no_mae || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {citizen.nu_cpf || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {citizen.nu_cns || "-"}
                          </TableCell>
                          <TableCell className="font-medium text-red-600">
                            {citizen.dt_obito
                              ? new Date(citizen.dt_obito).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {citizen.verified ? (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verificado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {!citizen.verified ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  verifyMutation.mutate(citizen.id)
                                }
                                disabled={verifyMutation.isPending}
                                className="gap-1"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Verificar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 text-gray-400"
                              >
                                <Eye className="w-4 h-4" />
                                Ver Detalhes
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-gray-500">
                    Mostrando {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, filteredCitizens.length)} de{" "}
                    {filteredCitizens.length}
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

              {filteredCitizens.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                  <p className="text-lg font-medium">
                    Nenhum registro de óbito encontrado
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
