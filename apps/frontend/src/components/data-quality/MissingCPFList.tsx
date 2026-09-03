import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Plus, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// CPF validation
const validateCPF = (cpf: string) => {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Format CPF
const formatCPF = (value: string) => {
  const cpf = value.replace(/\D/g, '');
  if (cpf.length <= 3) return cpf;
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`;
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
};

export default function MissingCPFList() {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [newCPF, setNewCPF] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const queryClient = useQueryClient();

  // Fetch citizens without CPF
  const { data: citizens = [], isLoading } = useQuery({
    queryKey: ['citizensWithoutCPF'],
    queryFn: async () => {
      const all = await trpc.CitizenRecord.filter({ st_ativo: 1 }, 'no_cidadao', 2000);
      return all.filter((c: any) => !c.nu_cpf || c.nu_cpf.trim() === '');
    }
  });

  // Create pending edit
  const createPendingEdit = useMutation({
    mutationFn: (data: any) => trpc.PendingEdit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEdits'] });
      setShowAddDialog(false);
      setSelectedCitizen(null);
      setNewCPF('');
      setCpfError('');
      toast.success('CPF enviado para aprovação');
    }
  });

  // Filter citizens
  const filteredCitizens = citizens.filter((c: any) => 
    !search || 
    c.no_cidadao?.toLowerCase().includes(search.toLowerCase()) ||
    c.nu_cns?.includes(search)
  );

  const paginatedCitizens = filteredCitizens.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredCitizens.length / pageSize);

  const handleAddCPF = (citizen: any) => {
    setSelectedCitizen(citizen);
    setNewCPF('');
    setCpfError('');
    setShowAddDialog(true);
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setNewCPF(formatted);
    
    const cpfDigits = value.replace(/\D/g, '');
    if (cpfDigits.length === 11) {
      if (!validateCPF(cpfDigits)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError('');
      }
    } else {
      setCpfError('');
    }
  };

  const handleSubmit = () => {
    const cpfDigits = newCPF.replace(/\D/g, '');
    
    if (!validateCPF(cpfDigits)) {
      setCpfError('CPF inválido');
      return;
    }

    createPendingEdit.mutate({
      entity_type: 'citizen',
      entity_id: selectedCitizen.id,
      citizen_name: selectedCitizen.no_cidadao,
      field_name: 'nu_cpf',
      old_value: '',
      new_value: cpfDigits,
      reason: 'Adição de CPF ao cadastro',
      status: 'pendente'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Cadastros sem CPF</h2>
              <p className="text-white/80">
                {citizens.length} cidadãos ativos sem CPF registrado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou CNS..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            Lista de Cidadãos
            <Badge className="ml-2 bg-purple-100 text-purple-700">{filteredCitizens.length}</Badge>
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
                      <TableHead>CNS</TableHead>
                      <TableHead>Microárea</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {paginatedCitizens.map((citizen: any, idx: number) => (
                        <motion.tr
                          key={citizen.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium">{citizen.no_cidadao}</TableCell>
                          <TableCell>
                            {citizen.dt_nascimento 
                              ? new Date(citizen.dt_nascimento).toLocaleDateString('pt-BR') 
                              : '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">{citizen.no_mae || '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{citizen.nu_cns || '-'}</TableCell>
                          <TableCell>{citizen.microarea || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => handleAddCPF(citizen)}
                              className="gap-1 bg-purple-600 hover:bg-purple-700"
                            >
                              <Plus className="w-4 h-4" />
                              Adicionar CPF
                            </Button>
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
                    Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredCitizens.length)} de {filteredCitizens.length}
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
                  <p className="text-lg font-medium">Todos os cidadãos possuem CPF</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add CPF Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-500" />
              Adicionar CPF
            </DialogTitle>
            <DialogDescription>
              Informe o CPF do cidadão. A alteração será enviada para aprovação.
            </DialogDescription>
          </DialogHeader>

          {selectedCitizen && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{selectedCitizen.no_cidadao}</p>
                <p className="text-sm text-gray-500">CNS: {selectedCitizen.nu_cns || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={newCPF}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={cpfError ? 'border-red-500' : ''}
                />
                {cpfError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {cpfError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!newCPF || cpfError || createPendingEdit.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createPendingEdit.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar para Aprovação'
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
