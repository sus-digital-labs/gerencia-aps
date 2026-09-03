import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Clock, MapPin, Users, AlertTriangle, ChevronLeft, Calendar,
  User, Home, Activity, Scale, Heart, FileText, Edit, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const visitTypeLabels: Record<string, string> = {
  cadastro: 'Cadastro',
  acompanhamento: 'Acompanhamento',
  busca_ativa: 'Busca Ativa',
  campanha: 'Campanha',
  entrega_medicamento: 'Entrega Med.',
  outros: 'Outros'
};

const procedureIcons: Record<string, any> = {
  peso: Scale,
  pressao: Heart,
  glicemia: Activity,
  default: FileText
};

export default function ACSTimeline() {
  const urlParams = new URLSearchParams(window.location.search);
  const visitId = urlParams.get('visit_id');
  const acsId = urlParams.get('acs_id');
  const initialDate = urlParams.get('date');

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [editModal, setEditModal] = useState<{ open: boolean, field: string, value: string, citizenId: string, label?: string }>({ open: false, field: '', value: '', citizenId: '' });

  const { data: acsInfo } = useQuery({
    queryKey: ['acsInfo', acsId],
    queryFn: () => acsId ? trpc.CommunityHealthAgent.filter({ id: acsId }) : Promise.resolve([]),
    enabled: !!acsId
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['acsVisits', acsId, selectedDate],
    queryFn: async () => {
      if (!acsId) return [];
      const allVisits = await trpc.HomeVisit.filter({ acs_id: acsId }, 'visit_time');
      return allVisits.filter((v: any) => v.visit_date === selectedDate);
    },
    enabled: !!acsId
  });

  const sortedVisits = useMemo(() => {
    return [...visits].sort((a: any, b: any) => {
      const timeA = a.visit_time || '00:00';
      const timeB = b.visit_time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [visits]);

  const currentACS = acsInfo?.[0];

  const getInconsistencies = (visit: any) => {
    const issues = [];
    if (!visit.citizen_cns) issues.push({ field: 'citizen_cns', label: 'CNS não informado' });
    if (!visit.latitude || !visit.longitude) issues.push({ field: 'coordinates', label: 'Coordenadas não registradas' });
    return issues;
  };

  const handleSaveEdit = async () => {
    console.log('Saving edit:', editModal);
    setEditModal({ open: false, field: '', value: '', citizenId: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('ACSManagement')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Timeline de Visitas</h1>
              {currentACS && (
                <p className="text-white/70">
                  {currentACS.name} • Microárea {currentACS.microarea}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2">
              <Calendar className="w-5 h-5" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 text-white w-40 focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{sortedVisits.length}</p>
                <p className="text-xs text-gray-500">Visitas no Dia</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {new Set(sortedVisits.map((v: any) => v.family_id)).size}
                </p>
                <p className="text-xs text-gray-500">Famílias Visitadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {sortedVisits.filter((v: any) => v.desfecho === 'visita_realizada').length}
                </p>
                <p className="text-xs text-gray-500">Visitas Realizadas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {sortedVisits.filter((v: any) => getInconsistencies(v).length > 0).length}
                </p>
                <p className="text-xs text-gray-500">Com Pendências</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 to-emerald-400 transform -translate-x-1/2" />

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : sortedVisits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma visita registrada para esta data</p>
            </div>
          ) : (
            <div className="space-y-8">
              {sortedVisits.map((visit: any, idx: number) => {
                const inconsistencies = getInconsistencies(visit);
                const isLeft = idx % 2 === 0;
                
                return (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative flex ${isLeft ? 'justify-end pr-[52%]' : 'justify-start pl-[52%]'}`}
                  >
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-md z-10" />

                    <Card className="w-full max-w-md border-0 shadow-lg bg-white overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-bold">{visit.visit_time || '--:--'}</span>
                        </div>
                        <Badge className="bg-white/20 text-white">
                          {visitTypeLabels[visit.visit_type] || visit.visit_type}
                        </Badge>
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                          <div>
                            <p className="font-medium text-gray-800">{visit.address || 'Endereço não informado'}</p>
                            <p className="text-xs text-gray-500">Microárea {visit.microarea}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 pt-2 border-t">
                          <Home className="w-4 h-4 text-gray-400 mt-1" />
                          <div>
                            <p className="text-sm text-gray-600">Responsável:</p>
                            <p className="font-medium text-gray-800">{visit.citizen_name || '-'}</p>
                          </div>
                        </div>

                        {visit.conditions_found?.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-gray-600 mb-2">Procedimentos/Condições:</p>
                            <div className="flex flex-wrap gap-2">
                              {visit.conditions_found.map((cond: string, i: number) => {
                                const Icon = procedureIcons[cond] || procedureIcons.default;
                                return (
                                  <Badge key={i} variant="outline" className="gap-1">
                                    <Icon className="w-3 h-3" />
                                    {cond}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {visit.observations && (
                          <div className="pt-2 border-t">
                            <p className="text-sm text-gray-600">Observações:</p>
                            <p className="text-sm text-gray-800">{visit.observations}</p>
                          </div>
                        )}

                        {inconsistencies.length > 0 && (
                          <div className="pt-2 border-t bg-amber-50 -mx-4 -mb-4 px-4 py-3">
                            <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Pendências Cadastrais:
                            </p>
                            <div className="space-y-1">
                              {inconsistencies.map((issue: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setEditModal({
                                    open: true,
                                    field: issue.field,
                                    label: issue.label,
                                    value: '',
                                    citizenId: visit.citizen_cns
                                  })}
                                  className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-800 hover:underline"
                                >
                                  <Edit className="w-3 h-3" />
                                  {issue.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 gap-1">
                            <ExternalLink className="w-4 h-4" />
                            Ver Detalhes Completos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Pendência Cadastral</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Esta alteração será enviada para aprovação antes de ser aplicada.
            </p>
            <div className="space-y-2">
              <Label>{editModal.label}</Label>
              <Input
                value={editModal.value}
                onChange={(e) => setEditModal({ ...editModal, value: e.target.value })}
                placeholder={`Informe o ${editModal.label?.toLowerCase()}`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditModal({ ...editModal, open: false })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Enviar para Aprovação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
