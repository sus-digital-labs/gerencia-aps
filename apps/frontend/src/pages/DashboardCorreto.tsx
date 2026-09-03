// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, Users, AlertTriangle, RefreshCw, Download, Clock } from "lucide-react";

export default function DashboardCorreto() {
  const [selectedMonth, setSelectedMonth] = useState("1");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedTerritory, setSelectedTerritory] = useState("all");
  const [activeTab, setActiveTab] = useState("todos");

  // Query para indicadores
  const { data: indicadoresData, isLoading, refetch } = trpc.indicadoresSus.calcular.useQuery({
    mes: parseInt(selectedMonth),
    ano: parseInt(selectedYear),
  }, {
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const years = ["2024", "2025", "2026"];

  // Mock data para demonstração
  const totalIndicadores = 15;
  const acimaMetaCount = 0;
  const equipesAtivas = 7;
  const problemasAbertos = 5;

  // Indicadores por categoria
  const indicadoresESF = [
    { code: "C1", name: "Mais Acesso à APS", badge: "eSF/eAP", meta: 60, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C2", name: "Desenvolvimento Infantil", badge: "eSF/eAP", meta: 50, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C3", name: "Gestação e Puerpério", badge: "eSF/eAP", meta: 60, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C4", name: "Cuidado Diabetes", badge: "eSF/eAP", meta: 50, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C5", name: "Cuidado Hipertensão", badge: "eSF/eAP", meta: 50, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C6", name: "Saúde Sexual (HIV/Sífilis)", badge: "eSF/eAP", meta: 60, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "C7", name: "Saúde Bucal", badge: "eSF/eAP", meta: 45, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
  ];

  const indicadoresESB = [
    { code: "B1", name: "Primeira Consulta Odontológica", badge: "eSB", meta: 50, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "B2", name: "Atendimento Urgência Odonto", badge: "eSB", meta: 30, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "B3", name: "Tratamento Concluído", badge: "eSB", meta: 40, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "B4", name: "Escovação Supervisionada", badge: "eSB", meta: 35, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "B5", name: "Exame Bucal Gestante", badge: "eSB", meta: 45, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "B6", name: "Atendimento Preventivo", badge: "eSB", meta: 40, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
  ];

  const indicadoresEMulti = [
    { code: "M1", name: "Consultas Médicas", badge: "eMulti", meta: 70, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
    { code: "M2", name: "Visitas Domiciliares", badge: "eMulti", meta: 55, atual: 0, denominador: 0, numerador: 0, percentualMeta: 95 },
  ];

  const todosIndicadores = [...indicadoresESF, ...indicadoresESB, ...indicadoresEMulti];

  const getIndicadoresPorTab = () => {
    switch (activeTab) {
      case "esf":
        return indicadoresESF;
      case "esb":
        return indicadoresESB;
      case "emulti":
        return indicadoresEMulti;
      default:
        return todosIndicadores;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SUS Analytics</h1>
            <p className="text-gray-600 mt-1">Sistema de Monitoramento Previne Brasil</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Clock className="h-4 w-4" />
              Tempo Real
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" />
              Exportar Dashboard
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Equipes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="link" className="mt-2 text-blue-600">
            <RefreshCw className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </Card>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-white border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Indicadores</p>
                <p className="text-4xl font-bold text-gray-900">{totalIndicadores}</p>
                <p className="text-xs text-gray-500 mt-1">Total monitorados</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Acima da Meta</p>
                <p className="text-4xl font-bold text-gray-900">{acimaMetaCount}</p>
                <p className="text-xs text-gray-500 mt-1">de {totalIndicadores} calculados</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Equipes Ativas</p>
                <p className="text-4xl font-bold text-gray-900">{equipesAtivas}</p>
                <p className="text-xs text-gray-500 mt-1">Cadastradas no sistema</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Problemas de Dados</p>
                <p className="text-4xl font-bold text-gray-900">{problemasAbertos}</p>
                <p className="text-xs text-gray-500 mt-1">Pendentes de correção</p>
              </div>
              <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs e Grid de Indicadores */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 mb-6">
                <TabsTrigger value="todos">Todos ({totalIndicadores})</TabsTrigger>
                <TabsTrigger value="esf">eSF/eAP (7)</TabsTrigger>
                <TabsTrigger value="esb">eSB (6)</TabsTrigger>
                <TabsTrigger value="emulti">eMulti (2)</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-500 mt-2">Carregando indicadores...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getIndicadoresPorTab().map((indicador) => (
                      <Card key={indicador.code} className="p-4 border-t-4 border-t-red-500 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{indicador.code}</h3>
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                                {indicador.badge}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{indicador.name}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-red-600">0%</span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Meta: {indicador.meta}%</span>
                            <span className="text-gray-400">{indicador.numerador} / {indicador.denominador}</span>
                          </div>

                          {/* Barra de progresso */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ width: `${indicador.atual}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">—</span>
                            <span className="text-green-600 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {indicador.percentualMeta}%
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Card Lateral - Qualidade dos Dados */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-bold">Qualidade dos Dados</h3>
              </div>

              <div className="text-center my-8">
                <div className="text-6xl font-bold mb-2">0%</div>
                <p className="text-teal-100">Score Geral de Qualidade</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span className="text-sm text-red-200">Precisa Atenção</span>
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-teal-100">Completude</span>
                    <span className="text-sm font-bold">92%</span>
                  </div>
                  <div className="w-full bg-teal-700 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: "92%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-teal-100">Consistência</span>
                    <span className="text-sm font-bold">78%</span>
                  </div>
                  <div className="w-full bg-teal-700 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
