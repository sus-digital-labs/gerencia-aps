import React, { useState, useMemo } from 'react';
import trpc from '@/lib/trpc-adapter';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Users, Plus, Search, MapPin, BarChart2, Calendar, 
  Eye, RefreshCw, Phone, Mail, FileText, TrendingUp, Table,
  History, ClipboardList, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, subDays } from 'date-fns';
import ACSCard from '../components/acs/ACSCard';
import VisitsSummaryTable from '../components/acs/VisitsSummaryTable';
import VisitsMap from '../components/acs/VisitsMap';
import VisitsChart from '../components/acs/VisitsChart';
import VisitsFilters from '../components/acs/VisitsFilters';
import VisitsTable from '../components/acs/VisitsTable';
import ProductionTable from '../components/acs/ProductionTable';
import ACSPerformanceDashboard from '../components/acs/ACSPerformanceDashboard';
import ACSTaskManager from '../components/acs/ACSTaskManager';
import ACSVisitHistory from '../components/acs/ACSVisitHistory';
import ACSPerformanceComparison from '../components/acs/ACSPerformanceComparison';
import ACSAuditLog from '../components/acs/ACSAuditLog';
import ACSGoalsManager from '../components/acs/ACSGoalsManager';

export default function ACSManagement() {
  const [search, setSearch] = useState<string>('');
  const [selectedACS, setSelectedACS] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('municipio');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<{
    start_date: string;
    end_date: string;
    unit_id: string;
    team_id: string;
    acs_id: string;
  }>({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    unit_id: '',
    team_id: '',
    acs_id: ''
  });
  const [selectedACSForDetail, setSelectedACSForDetail] = useState<any>(null);
  const [formData, setFormData] = useState<{
    name: string;
    cns: string;
    cpf: string;
    phone: string;
    email: string;
    microarea: string;
    hire_date: string;
  }>({
    name: '',
    cns: '',
    cpf: '',
    phone: '',
    email: '',
    microarea: '',
    hire_date: ''
  });

  const queryClient = useQueryClient();

  // Fetch ACS list
  const { data: acsList = [], isLoading } = useQuery({
    queryKey: ['acs'],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true }, 'name')
  });

  // Fetch visits
  const { data: visits = [] } = useQuery({
    queryKey: ['homeVisits'],
    queryFn: () => trpc.HomeVisit.filter({}, '-visit_date', 1000)
  });

  // Fetch teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => trpc.HealthTeam.filter({ active: true })
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ['healthUnits'],
    queryFn: () => trpc.HealthUnit.filter({ active: true })
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['acsTasks'],
    queryFn: () => trpc.ACSTask.filter({}, '-created_date', 200)
  });

  // Fetch citizens for bulk assignment
  const { data: citizens = [] } = useQuery({
    queryKey: ['citizenLocations'],
    queryFn: () => trpc.CitizenLocation.filter({})
  });

  // Fetch CV risk patients
  const { data: cvRiskPatients = [] } = useQuery({
    queryKey: ['cvRiskPatients'],
    queryFn: () => trpc.CardiovascularRisk.filter({})
  });

  // Fetch areas
  const { data: areas = [] } = useQuery({
    queryKey: ['territoryAreas'],
    queryFn: () => trpc.TerritoryArea.filter({ active: true })
  });

  // Filter visits based on filters
  const filteredVisits = useMemo(() => {
    return visits.filter((v: any) => {
      // Date filter
      if (filters.start_date && v.visit_date < filters.start_date) return false;
      if (filters.end_date && v.visit_date > filters.end_date) return false;
      // ACS filter
      if (filters.acs_id && v.acs_id !== filters.acs_id) return false;
      // Team filter (would need to check ACS's team)
      if (filters.team_id) {
        const acs = acsList.find((a: any) => a.id === v.acs_id);
        if (acs?.team_id !== filters.team_id) return false;
      }
      // Unit filter (would need to check ACS's unit)
      if (filters.unit_id) {
        const acs = acsList.find((a: any) => a.id === v.acs_id);
        if (acs?.unit_id !== filters.unit_id) return false;
      }
      return true;
    });
  }, [visits, filters, acsList]);

  const resetFilters = () => {
    setFilters({
      start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      unit_id: '',
      team_id: '',
      acs_id: ''
    });
  };

  // Create ACS mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => trpc.CommunityHealthAgent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acs'] });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  // Filter ACS
  const filteredACS = acsList.filter((acs: any) => 
    !search || 
    acs.name?.toLowerCase().includes(search.toLowerCase()) ||
    acs.microarea?.includes(search)
  );

  // Calculate visit counts per ACS
  const getVisitCounts = (acsId: string | number) => {
    const acsVisits = visits.filter((v: any) => v.acs_id === acsId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    return {
      month: acsVisits.filter((v: any) => new Date(v.visit_date) >= startOfMonth).length,
      year: acsVisits.filter((v: any) => new Date(v.visit_date) >= startOfYear).length
    };
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cns: '',
      cpf: '',
      phone: '',
      email: '',
      microarea: '',
      hire_date: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      active: true
    });
  };

  // Stats
  const totalVisitsMonth = visits.filter((v: any) => {
    const d = new Date(v.visit_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalVisitsToday = visits.filter((v: any) => {
    const d = new Date(v.visit_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Gestão de ACS</h1>
                <p className="text-white/70">Agentes Comunitários de Saúde e Visitas Domiciliares</p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-white text-green-600 hover:bg-green-50">
                  <Plus className="w-4 h-4" />
                  Novo ACS
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cadastrar ACS</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNS</Label>
                      <Input
                        value={formData.cns}
                        onChange={(e) => setFormData({ ...formData, cns: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Microárea</Label>
                      <Input
                        value={formData.microarea}
                        onChange={(e) => setFormData({ ...formData, microarea: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Contratação</Label>
                    <Input
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-200" />
                <div>
                  <p className="text-white/70 text-sm">Total ACS</p>
                  <p className="text-2xl font-bold">{acsList.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-200" />
                <div>
                  <p className="text-white/70 text-sm">Visitas Hoje</p>
                  <p className="text-2xl font-bold">{totalVisitsToday}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-emerald-200" />
                <div>
                  <p className="text-white/70 text-sm">Visitas no Mês</p>
                  <p className="text-2xl font-bold">{totalVisitsMonth}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-amber-200" />
                <div>
                  <p className="text-white/70 text-sm">Microáreas</p>
                  <p className="text-2xl font-bold">{new Set(acsList.map((a: any) => a.microarea)).size}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <TabsList className="bg-white/80 shadow-sm flex-wrap">
                            <TabsTrigger value="municipio" className="gap-2">
                              <Table className="w-4 h-4" />
                              Visitas
                            </TabsTrigger>
                            <TabsTrigger value="map" className="gap-2">
                              <MapPin className="w-4 h-4" />
                              Mapa
                            </TabsTrigger>
                            <TabsTrigger value="producao" className="gap-2">
                              <BarChart2 className="w-4 h-4" />
                              Produção
                            </TabsTrigger>
                            <TabsTrigger value="list" className="gap-2">
                              <Users className="w-4 h-4" />
                              ACS
                            </TabsTrigger>
                            <TabsTrigger value="tarefas" className="gap-2">
                              <ClipboardList className="w-4 h-4" />
                              Tarefas
                            </TabsTrigger>
                            <TabsTrigger value="desempenho" className="gap-2">
                              <Target className="w-4 h-4" />
                              Desempenho
                            </TabsTrigger>
                            <TabsTrigger value="historico" className="gap-2">
                              <History className="w-4 h-4" />
                              Histórico
                            </TabsTrigger>
                            <TabsTrigger value="comparativo" className="gap-2">
                              <Target className="w-4 h-4" />
                              Comparativo
                            </TabsTrigger>
                            <TabsTrigger value="auditoria" className="gap-2">
                              <FileText className="w-4 h-4" />
                              Auditoria
                            </TabsTrigger>
                            <TabsTrigger value="metas" className="gap-2">
                              <Target className="w-4 h-4" />
                              Metas
                            </TabsTrigger>
                            </TabsList>
          </div>

          {/* Filters - show for main tabs */}
          {['municipio', 'map', 'producao'].includes(activeTab) && (
            <VisitsFilters
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
              units={units}
              teams={teams}
              acsList={acsList}
            />
          )}

          {/* Visitas no Município - Tabela */}
          <TabsContent value="municipio" className="mt-6">
            <VisitsTable 
              visits={filteredVisits}
              onViewDetails={(visit: any) => {
                // Navigate to timeline
              }}
            />
          </TabsContent>

          {/* Mapa de Visitas */}
          <TabsContent value="map" className="mt-6">
            <VisitsMap 
              visits={filteredVisits}
              showRoute={!!filters.acs_id}
              title={filters.acs_id 
                ? `Visitas de ${acsList.find((a: any) => a.id === filters.acs_id)?.name || 'ACS'}` 
                : 'Todas as Visitas'}
            />
          </TabsContent>

          {/* Produção por ACS */}
          <TabsContent value="producao" className="mt-6">
            <ProductionTable 
              visits={filteredVisits}
              acsList={acsList}
            />
          </TabsContent>

          {/* Lista de ACS */}
                      <TabsContent value="list" className="mt-6">
                        <div className="mb-4">
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              placeholder="Buscar ACS..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="pl-10 bg-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <AnimatePresence>
                            {filteredACS.map((acs: any, index: number) => (
                              <motion.div
                                key={acs.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <ACSCard
                                  acs={acs}
                                  visitCount={getVisitCounts(acs.id)}
                                  onViewDetails={(a: any) => {
                                    setSelectedACSForDetail(a);
                                    setActiveTab('desempenho');
                                  }}
                                  onViewMap={(a: any) => {
                                    setFilters({ ...filters, acs_id: a.id });
                                    setActiveTab('map');
                                  }}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        {filteredACS.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Nenhum ACS encontrado</p>
                          </div>
                        )}
                      </TabsContent>

                      {/* Tarefas */}
                      <TabsContent value="tarefas" className="mt-6">
                        <ACSTaskManager 
                          acsList={acsList} 
                          selectedACS={selectedACSForDetail}
                          citizens={citizens}
                          cvRiskPatients={cvRiskPatients}
                          areas={areas}
                        />
                      </TabsContent>

                      {/* Desempenho */}
                      <TabsContent value="desempenho" className="mt-6">
                        <div className="mb-4">
                          <Select 
                            value={selectedACSForDetail?.id || ''} 
                            onValueChange={(v) => setSelectedACSForDetail(acsList.find((a: any) => a.id === v))}
                          >
                            <SelectTrigger className="w-64 bg-white">
                              <SelectValue placeholder="Selecione um ACS..." />
                            </SelectTrigger>
                            <SelectContent>
                              {acsList.map((acs: any) => (
                                <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ACSPerformanceDashboard 
                          acs={selectedACSForDetail} 
                          visits={visits}
                          tasks={tasks}
                        />
                      </TabsContent>

                      {/* Histórico */}
                      <TabsContent value="historico" className="mt-6">
                        <div className="mb-4">
                          <Select 
                            value={selectedACSForDetail?.id || ''} 
                            onValueChange={(v) => setSelectedACSForDetail(acsList.find((a: any) => a.id === v))}
                          >
                            <SelectTrigger className="w-64 bg-white">
                              <SelectValue placeholder="Selecione um ACS..." />
                            </SelectTrigger>
                            <SelectContent>
                              {acsList.map((acs: any) => (
                                <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ACSVisitHistory 
                          acs={selectedACSForDetail} 
                          visits={visits}
                        />
                      </TabsContent>

                      {/* Comparativo */}
                      <TabsContent value="comparativo" className="mt-6">
                        <ACSPerformanceComparison 
                          acsList={acsList}
                          visits={visits}
                          tasks={tasks}
                        />
                      </TabsContent>

                      {/* Auditoria */}
                      <TabsContent value="auditoria" className="mt-6">
                        <div className="mb-4">
                          <Select 
                            value={selectedACSForDetail?.id || ''} 
                            onValueChange={(v) => setSelectedACSForDetail(acsList.find((a: any) => a.id === v))}
                          >
                            <SelectTrigger className="w-64 bg-white">
                              <SelectValue placeholder="Todos os ACS" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os ACS</SelectItem>
                              {acsList.map((acs: any) => (
                                <SelectItem key={acs.id} value={acs.id}>{acs.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <ACSAuditLog selectedACS={selectedACSForDetail} />
                      </TabsContent>

                      {/* Metas */}
                      <TabsContent value="metas" className="mt-6">
                        <ACSGoalsManager acsList={acsList} selectedACS={selectedACSForDetail} />
                      </TabsContent>
                      </Tabs>
      </div>
    </div>
  );
}
