import trpc from "@/lib/trpc-adapter";
import React, { useState, useMemo } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Filter,
  ClipboardList,
  MapPin,
  Heart,
  Bug,
  Baby,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

const TASK_TYPES = [
  {
    value: "visita_risco_cv",
    label: "Visitar Paciente Alto Risco CV",
    icon: Heart,
  },
  { value: "verificar_foco", label: "Verificar Foco Aedes", icon: Bug },
  { value: "busca_ativa", label: "Busca Ativa", icon: Users },
  { value: "acompanhamento", label: "Acompanhamento", icon: ClipboardList },
  { value: "cadastro", label: "Cadastro/Atualização", icon: UserPlus },
];

const CONDITION_FILTERS = [
  {
    value: "alto_risco_cv",
    label: "Alto Risco Cardiovascular",
    color: "bg-rose-100 text-rose-700",
  },
  {
    value: "hipertenso",
    label: "Hipertenso",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "diabetico",
    label: "Diabético",
    color: "bg-amber-100 text-amber-700",
  },
  { value: "gestante", label: "Gestante", color: "bg-pink-100 text-pink-700" },
  {
    value: "idoso",
    label: "Idoso (60+)",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "crianca",
    label: "Criança (0-5)",
    color: "bg-green-100 text-green-700",
  },
];

export default function TaskBulkAssignment({
  acsList = [],
  citizens = [],
  cvRiskPatients = [],
  areas = [],
}) {
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState({
    condition: "",
    neighborhood: "",
    microarea: "",
    without_visit_days: 30,
    care_plan_status: "",
  });
  const [selectedCitizens, setSelectedCitizens] = useState([]);
  const [taskConfig, setTaskConfig] = useState({
    task_type: "acompanhamento",
    priority: "media",
    due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    description: "",
    assign_to_acs: true,
  });
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  // Filter citizens based on criteria
  const filteredCitizens = useMemo(() => {
    let result = [];

    // If filtering by high CV risk, use cvRiskPatients
    if (filters.condition === "alto_risco_cv") {
      result = cvRiskPatients
        .filter(p => p.risk_level === "alto")
        .map(p => ({
          id: p.id,
          name: p.citizen_name,
          cns: p.citizen_cns,
          address: `Microárea ${p.microarea}`,
          conditions: ["alto_risco_cv"],
          microarea: p.microarea,
          care_plan_status: p.care_plan_status,
          acs_id: null,
        }));
    } else {
      result = citizens.map(c => ({
        id: c.id,
        name: c.citizen_name,
        cns: c.citizen_cns,
        address: c.address,
        conditions: c.conditions || [],
        microarea: c.microarea,
        neighborhood: c.neighborhood,
        acs_id: c.acs_id,
        last_visit_date: c.last_visit_date,
      }));
    }

    // Apply additional filters
    if (filters.condition && filters.condition !== "alto_risco_cv") {
      result = result.filter(c => c.conditions?.includes(filters.condition));
    }
    if (filters.microarea) {
      result = result.filter(c => c.microarea === filters.microarea);
    }
    if (filters.neighborhood) {
      result = result.filter(c =>
        c.neighborhood
          ?.toLowerCase()
          .includes(filters.neighborhood.toLowerCase())
      );
    }
    if (filters.care_plan_status) {
      result = result.filter(
        c => c.care_plan_status === filters.care_plan_status
      );
    }
    if (filters.without_visit_days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.without_visit_days);
      result = result.filter(
        c => !c.last_visit_date || new Date(c.last_visit_date) < cutoff
      );
    }

    return result;
  }, [citizens, cvRiskPatients, filters]);

  // Get unique microareas
  const microareas = useMemo(() => {
    const set = new Set();
    [...citizens, ...cvRiskPatients].forEach(c => {
      if (c.microarea) set.add(c.microarea);
    });
    return Array.from(set).sort();
  }, [citizens, cvRiskPatients]);

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedCitizens.length === filteredCitizens.length) {
      setSelectedCitizens([]);
    } else {
      setSelectedCitizens(filteredCitizens.map(c => c.id));
    }
  };

  // Create bulk tasks
  const handleCreateTasks = async () => {
    if (selectedCitizens.length === 0) {
      toast.error("Selecione pelo menos um cidadão");
      return;
    }

    setIsCreating(true);

    const citizensToProcess = filteredCitizens.filter(c =>
      selectedCitizens.includes(c.id)
    );
    const tasksToCreate = [];

    for (const citizen of citizensToProcess) {
      // Find ACS for this citizen's microarea
      let acsId = citizen.acs_id;
      let acsName = "";

      if (taskConfig.assign_to_acs && !acsId) {
        const acs = acsList.find(a => a.microarea === citizen.microarea);
        if (acs) {
          acsId = acs.id;
          acsName = acs.name;
        }
      } else if (acsId) {
        const acs = acsList.find(a => a.id === acsId);
        acsName = acs?.name || "";
      }

      tasksToCreate.push({
        title: `${TASK_TYPES.find(t => t.value === taskConfig.task_type)?.label} - ${citizen.name}`,
        description: taskConfig.description,
        task_type: taskConfig.task_type,
        priority: taskConfig.priority,
        status: "pendente",
        acs_id: acsId,
        acs_name: acsName,
        due_date: taskConfig.due_date,
        related_citizen_id: citizen.id,
        related_citizen_name: citizen.name,
        related_address: citizen.address,
        expected_latitude: citizen.latitude,
        expected_longitude: citizen.longitude,
      });
    }

    try {
      await trpc.ACSTask.bulkCreate(tasksToCreate);
      toast.success(`${tasksToCreate.length} tarefas criadas com sucesso!`);
      queryClient.invalidateQueries(["acsTasks"]);
      setSelectedCitizens([]);
      setStep(1);
    } catch (error) {
      toast.error("Erro ao criar tarefas");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/90">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Atribuição em Massa de Tarefas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= s
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              <span
                className={`text-sm ${step >= s ? "text-indigo-600 font-medium" : "text-gray-400"}`}
              >
                {s === 1 ? "Filtrar" : s === 2 ? "Selecionar" : "Configurar"}
              </span>
              {s < 3 && (
                <div
                  className={`w-12 h-1 ${step > s ? "bg-indigo-600" : "bg-gray-200"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Filters */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Condição de Saúde</Label>
                <Select
                  value={filters.condition}
                  onValueChange={v => setFilters({ ...filters, condition: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas</SelectItem>
                    {CONDITION_FILTERS.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Microárea</Label>
                <Select
                  value={filters.microarea}
                  onValueChange={v => setFilters({ ...filters, microarea: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas</SelectItem>
                    {microareas.map(m => (
                      <SelectItem key={m} value={m}>
                        Microárea {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={filters.neighborhood}
                  onChange={e =>
                    setFilters({ ...filters, neighborhood: e.target.value })
                  }
                  placeholder="Digite o bairro..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sem visita há (dias)</Label>
                <Input
                  type="number"
                  value={filters.without_visit_days}
                  onChange={e =>
                    setFilters({
                      ...filters,
                      without_visit_days: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="30"
                />
              </div>

              {filters.condition === "alto_risco_cv" && (
                <div className="space-y-2">
                  <Label>Status do Plano de Cuidado</Label>
                  <Select
                    value={filters.care_plan_status}
                    onValueChange={v =>
                      setFilters({ ...filters, care_plan_status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_acompanhamento">
                        Em Acompanhamento
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <Badge className="bg-indigo-100 text-indigo-700">
                <Filter className="w-3 h-3 mr-1" />
                {filteredCitizens.length} cidadãos encontrados
              </Badge>
              <Button
                onClick={() => setStep(2)}
                disabled={filteredCitizens.length === 0}
              >
                Próximo: Selecionar Cidadãos
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Citizens */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={
                    selectedCitizens.length === filteredCitizens.length &&
                    filteredCitizens.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  Selecionar Todos ({filteredCitizens.length})
                </span>
              </div>
              <Badge className="bg-green-100 text-green-700">
                {selectedCitizens.length} selecionados
              </Badge>
            </div>

            <ScrollArea className="h-80 border rounded-lg">
              <div className="p-4 space-y-2">
                {filteredCitizens.map(citizen => (
                  <div
                    key={citizen.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedCitizens.includes(citizen.id)
                        ? "bg-indigo-50 border-indigo-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedCitizens(prev =>
                        prev.includes(citizen.id)
                          ? prev.filter(id => id !== citizen.id)
                          : [...prev, citizen.id]
                      );
                    }}
                  >
                    <Checkbox
                      checked={selectedCitizens.includes(citizen.id)}
                      onCheckedChange={() => {}}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{citizen.name}</p>
                      <p className="text-xs text-gray-500">
                        {citizen.address} • Microárea {citizen.microarea}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {citizen.conditions?.slice(0, 2).map((cond, i) => (
                        <Badge
                          key={i}
                          className="text-xs bg-gray-100 text-gray-600"
                        >
                          {cond}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedCitizens.length === 0}
              >
                Próximo: Configurar Tarefa
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Task */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-indigo-700">
                <strong>{selectedCitizens.length}</strong> tarefas serão criadas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Tarefa</Label>
                <Select
                  value={taskConfig.task_type}
                  onValueChange={v =>
                    setTaskConfig({ ...taskConfig, task_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={taskConfig.priority}
                  onValueChange={v =>
                    setTaskConfig({ ...taskConfig, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={taskConfig.due_date}
                  onChange={e =>
                    setTaskConfig({ ...taskConfig, due_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 flex items-end">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={taskConfig.assign_to_acs}
                    onCheckedChange={c =>
                      setTaskConfig({ ...taskConfig, assign_to_acs: c })
                    }
                  />
                  <Label className="cursor-pointer">
                    Atribuir automaticamente ao ACS da microárea
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição/Instruções</Label>
              <Textarea
                value={taskConfig.description}
                onChange={e =>
                  setTaskConfig({ ...taskConfig, description: e.target.value })
                }
                placeholder="Instruções adicionais para os ACS..."
                rows={3}
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                onClick={handleCreateTasks}
                disabled={isCreating}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Criar {selectedCitizens.length} Tarefas
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
