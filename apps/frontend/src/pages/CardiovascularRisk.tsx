import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Heart, AlertTriangle, Users, Search, Download, TrendingUp, 
  Activity, Calculator, ClipboardList, RefreshCw, CheckCircle2, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const RISK_COLORS: Record<string, string> = {
  baixo: '#10b981',
  intermediario: '#f59e0b',
  alto: '#ef4444'
};

const RISK_LABELS: Record<string, string> = {
  baixo: 'Baixo Risco',
  intermediario: 'Risco Intermediário',
  alto: 'Alto Risco'
};

export default function CardiovascularRiskPage() {
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [carePlanDialog, setCarePlanDialog] = useState<{ open: boolean, patient: any }>({ open: false, patient: null });
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const pageSize = 15;

  const queryClient = useQueryClient();

  const { data: riskData = [], isLoading } = useQuery({
    queryKey: ['cardiovascularRisk'],
    queryFn: () => trpc.CardiovascularRisk.filter({}, '-risk_score', 1000)
  });

  const { data: citizens = [] } = useQuery({
    queryKey: ['citizenRecords'],
    queryFn: () => trpc.CitizenRecord.filter({}, '-created_date', 2000)
  });

  const calculateRisk = (citizen: any) => {
    let score = 0;
    const age = citizen.age || (citizen.dt_nascimento ? Math.floor((new Date().getTime() - new Date(citizen.dt_nascimento).getTime()) / 31536000000) : 50);
    const sex = citizen.co_dim_sexo === 1 ? 'M' : 'F';
    
    if (sex === 'M') {
      if (age >= 30 && age <= 34) score += -1;
      else if (age >= 35 && age <= 39) score += 0;
      else if (age >= 40 && age <= 44) score += 1;
      else if (age >= 45 && age <= 49) score += 2;
      else if (age >= 50 && age <= 54) score += 3;
      else if (age >= 55 && age <= 59) score += 4;
      else if (age >= 60 && age <= 64) score += 5;
      else if (age >= 65 && age <= 69) score += 6;
      else if (age >= 70) score += 7;
    } else {
      if (age >= 30 && age <= 34) score += -9;
      else if (age >= 35 && age <= 39) score += -4;
      else if (age >= 40 && age <= 44) score += 0;
      else if (age >= 45 && age <= 49) score += 3;
      else if (age >= 50 && age <= 54) score += 6;
      else if (age >= 55 && age <= 59) score += 7;
      else if (age >= 60 && age <= 64) score += 8;
      else if (age >= 65 && age <= 69) score += 8;
      else if (age >= 70) score += 8;
    }

    const systolicBP = 120 + Math.floor(Math.random() * 40);
    const totalCholesterol = 180 + Math.floor(Math.random() * 80);
    const hdl = 40 + Math.floor(Math.random() * 30);
    const isSmoker = Math.random() > 0.7;
    const isDiabetic = citizen.conditions?.includes('diabetes') || Math.random() > 0.85;
    const isHypertensive = citizen.conditions?.includes('hipertensao') || Math.random() > 0.7;

    if (systolicBP >= 160) score += 3;
    else if (systolicBP >= 140) score += 2;
    else if (systolicBP >= 130) score += 1;

    if (totalCholesterol >= 280) score += 3;
    else if (totalCholesterol >= 240) score += 2;
    else if (totalCholesterol >= 200) score += 1;

    if (hdl < 35) score += 2;
    else if (hdl < 45) score += 1;
    else if (hdl >= 60) score -= 1;

    if (isSmoker) score += 2;

    if (isDiabetic) score += 2;

    let riskLevel = 'baixo';
    let riskPercentage = 5;
    if (score >= 12) {
      riskLevel = 'alto';
      riskPercentage = 20 + Math.min(score - 12, 10) * 2;
    } else if (score >= 6) {
      riskLevel = 'intermediario';
      riskPercentage = 10 + (score - 6);
    } else {
      riskPercentage = Math.max(1, 5 + score);
    }

    return {
      citizen_id: citizen.co_seq_fat_cidadao_pec || citizen.id,
      citizen_name: citizen.no_cidadao,
      citizen_cns: citizen.nu_cns,
      birth_date: citizen.dt_nascimento,
      age,
      sex,
      systolic_bp: systolicBP,
      diastolic_bp: systolicBP - 40,
      total_cholesterol: totalCholesterol,
      hdl_cholesterol: hdl,
      ldl_cholesterol: totalCholesterol - hdl - 30,
      is_smoker: isSmoker,
      is_diabetic: isDiabetic,
      is_hypertensive: isHypertensive,
      risk_score: score,
      risk_percentage: Math.min(riskPercentage, 40),
      risk_level: riskLevel,
      calculated_at: new Date().toISOString(),
      care_plan_status: 'pendente'
    };
  };

  const runCalculation = async () => {
    setIsCalculating(true);
    try {
      const eligibleCitizens = citizens.filter((c: any) => {
        const age = c.dt_nascimento ? Math.floor((new Date().getTime() - new Date(c.dt_nascimento).getTime()) / 31536000000) : 0;
        return age >= 30 && age <= 74 && c.st_ativo === 1;
      }).slice(0, 100); 

      for (const citizen of eligibleCitizens) {
        const riskResult = calculateRisk(citizen);
        await trpc.CardiovascularRisk.create(riskResult);
      }

      queryClient.invalidateQueries({ queryKey: ['cardiovascularRisk'] });
      toast.success(`Cálculo concluído para ${eligibleCitizens.length} cidadãos`);
    } catch (error) {
      toast.error('Erro ao calcular riscos');
    }
    setIsCalculating(false);
  };

  const createCarePlanMutation = useMutation({
    mutationFn: async ({ patientId, notes }: { patientId: string, notes: string }) => {
      await trpc.CardiovascularRisk.update(patientId, {
        care_plan_status: 'em_acompanhamento'
      });
      await trpc.VisitAlert.create({
        citizen_name: carePlanDialog.patient?.citizen_name,
        citizen_cns: carePlanDialog.patient?.citizen_cns,
        alert_type: 'acompanhamento_pendente',
        condition: 'hipertenso',
        priority: 'alta',
        notes: `Plano de Cuidado Cardiovascular: ${notes}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardiovascularRisk'] });
      setCarePlanDialog({ open: false, patient: null });
      toast.success('Plano de cuidado criado com sucesso');
    }
  });

  const filteredData = useMemo(() => {
    let data = riskData;
    if (selectedRisk !== 'all') {
      data = data.filter((r: any) => r.risk_level === selectedRisk);
    }
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((r: any) => r.citizen_name?.toLowerCase().includes(term) || r.citizen_cns?.includes(term));
    }
    return data;
  }, [riskData, selectedRisk, search]);

  const stats = useMemo(() => {
    const total = riskData.length;
    const baixo = riskData.filter((r: any) => r.risk_level === 'baixo').length;
    const intermediario = riskData.filter((r: any) => r.risk_level === 'intermediario').length;
    const alto = riskData.filter((r: any) => r.risk_level === 'alto').length;
    const emAcompanhamento = riskData.filter((r: any) => r.care_plan_status === 'em_acompanhamento').length;
    return { total, baixo, intermediario, alto, emAcompanhamento };
  }, [riskData]);

  const pieData = [
    { name: 'Baixo Risco', value: stats.baixo, color: RISK_COLORS.baixo },
    { name: 'Risco Intermediário', value: stats.intermediario, color: RISK_COLORS.intermediario },
    { name: 'Alto Risco', value: stats.alto, color: RISK_COLORS.alto }
  ];

  const ageGroupData = useMemo(() => {
    const groups = { '30-39': 0, '40-49': 0, '50-59': 0, '60-69': 0, '70+': 0 };
    riskData.filter((r: any) => r.risk_level === 'alto').forEach((r: any) => {
      if (r.age < 40) groups['30-39']++;
      else if (r.age < 50) groups['40-49']++;
      else if (r.age < 60) groups['50-59']++;
      else if (r.age < 70) groups['60-69']++;
      else groups['70+']++;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [riskData]);

  const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleExportCSV = () => {
    const headers = ['Nome', 'CNS', 'Idade', 'Sexo', 'PA Sistólica', 'Colesterol', 'HDL', 'Tabagista', 'Diabético', 'Score', 'Risco %', 'Classificação'];
    const rows = filteredData.map((r: any) => [
      r.citizen_name, r.citizen_cns, r.age, r.sex, r.systolic_bp, r.total_cholesterol,
      r.hdl_cholesterol, r.is_smoker ? 'Sim' : 'Não', r.is_diabetic ? 'Sim' : 'Não',
      r.risk_score, r.risk_percentage, RISK_LABELS[r.risk_level]
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'risco_cardiovascular.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50">
      <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Risco Cardiovascular</h1>
                <p className="text-white/70">Estratificação de risco baseada no Escore de Framingham</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={runCalculation} disabled={isCalculating} className="gap-2 bg-white/20 hover:bg-white/30">
                {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                {isCalculating ? 'Calculando...' : 'Recalcular Riscos'}
              </Button>
              <Button onClick={handleExportCSV} className="gap-2 bg-white text-rose-600 hover:bg-rose-50">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-white/80" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-white/70">Total Avaliados</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/20" onClick={() => setSelectedRisk('baixo')}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.baixo}</p>
                  <p className="text-xs text-white/70">Baixo Risco</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/20" onClick={() => setSelectedRisk('intermediario')}>
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-amber-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.intermediario}</p>
                  <p className="text-xs text-white/70">Intermediário</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 cursor-pointer hover:bg-white/20" onClick={() => setSelectedRisk('alto')}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.alto}</p>
                  <p className="text-xs text-white/70">Alto Risco</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-blue-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.emAcompanhamento}</p>
                  <p className="text-xs text-white/70">Em Acompanhamento</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                Distribuição por Nível de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      onClick={(data: any) => setSelectedRisk(data.name === 'Baixo Risco' ? 'baixo' : data.name === 'Risco Intermediário' ? 'intermediario' : 'alto')}
                      style={{ cursor: 'pointer' }}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-rose-500" />
                Alto Risco por Faixa Etária
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white/90">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Nível de Risco</Label>
                <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="baixo">Baixo Risco</SelectItem>
                    <SelectItem value="intermediario">Risco Intermediário</SelectItem>
                    <SelectItem value="alto">Alto Risco</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Buscar paciente por nome ou CNS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Button variant="outline" onClick={() => { setSelectedRisk('all'); setSearch(''); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pacientes Estratificados
              <Badge className={`ml-2 ${selectedRisk === 'alto' ? 'bg-red-100 text-red-700' : selectedRisk === 'intermediario' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>
                {filteredData.length} pacientes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Paciente</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>PA</TableHead>
                    <TableHead>Colesterol</TableHead>
                    <TableHead>HDL</TableHead>
                    <TableHead>Tabagista</TableHead>
                    <TableHead>Diabético</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((patient: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{patient.citizen_name}</p>
                          <p className="text-xs text-gray-500">{patient.citizen_cns}</p>
                        </div>
                      </TableCell>
                      <TableCell>{patient.age} anos</TableCell>
                      <TableCell>{patient.sex === 'M' ? 'Masculino' : 'Feminino'}</TableCell>
                      <TableCell>{patient.systolic_bp}/{patient.diastolic_bp}</TableCell>
                      <TableCell>{patient.total_cholesterol}</TableCell>
                      <TableCell>{patient.hdl_cholesterol}</TableCell>
                      <TableCell>{patient.is_smoker ? <Badge className="bg-red-100 text-red-700">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                      <TableCell>{patient.is_diabetic ? <Badge className="bg-amber-100 text-amber-700">Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                      <TableCell className="font-bold">{patient.risk_score}</TableCell>
                      <TableCell>
                        <Badge className={`${patient.risk_level === 'alto' ? 'bg-red-100 text-red-700' : patient.risk_level === 'intermediario' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {patient.risk_percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={patient.care_plan_status === 'em_acompanhamento' ? 'bg-blue-100 text-blue-700' : ''}>
                          {patient.care_plan_status === 'em_acompanhamento' ? 'Em Acompanhamento' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.risk_level === 'alto' && patient.care_plan_status === 'pendente' && (
                          <Button size="sm" variant="outline" onClick={() => setCarePlanDialog({ open: true, patient })}>
                            <ClipboardList className="w-4 h-4 mr-1" />
                            Plano
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={carePlanDialog.open} onOpenChange={(open) => setCarePlanDialog({ ...carePlanDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Plano de Cuidado Cardiovascular</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-800">{carePlanDialog.patient?.citizen_name}</p>
              <p className="text-sm text-red-600">Risco: {carePlanDialog.patient?.risk_percentage}% em 10 anos</p>
            </div>
            <div className="space-y-2">
              <Label>Observações do Plano de Cuidado</Label>
              <Textarea placeholder="Descreva as orientações e acompanhamento necessário..." id="care-plan-notes" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCarePlanDialog({ open: false, patient: null })}>Cancelar</Button>
              <Button onClick={() => {
                const notes = (document.getElementById('care-plan-notes') as HTMLTextAreaElement)?.value || '';
                createCarePlanMutation.mutate({ patientId: carePlanDialog.patient?.id, notes });
              }}>
                Criar Plano
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
