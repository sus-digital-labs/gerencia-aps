import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Filter, BarChart3, Calendar, Save, Play } from 'lucide-react';
import { toast } from 'sonner';
import ReportPreview from './ReportPreview';

const DATA_SOURCES: Record<string, { label: string; fields: string[] }> = {
  citizens: { label: 'Cidadãos', fields: ['nome', 'cpf', 'cns', 'idade', 'sexo', 'microarea', 'conditions'] },
  visits: { label: 'Visitas Domiciliares', fields: ['acs_name', 'citizen_name', 'visit_date', 'visit_type', 'desfecho', 'microarea'] },
  acs: { label: 'Agentes de Saúde', fields: ['name', 'microarea', 'team_id', 'phone', 'hire_date'] },
  indicators: { label: 'Indicadores', fields: ['indicator_code', 'result_percentage', 'numerator', 'denominator', 'team_id'] },
  tasks: { label: 'Tarefas ACS', fields: ['title', 'task_type', 'status', 'priority', 'acs_name', 'due_date'] },
  teams: { label: 'Equipes', fields: ['name', 'type', 'coordinator_name', 'population_covered', 'microareas_count'] }
};

const CHART_TYPES = [
  { value: 'table', label: 'Tabela', icon: '📊' },
  { value: 'bar_chart', label: 'Gráfico de Barras', icon: '📊' },
  { value: 'line_chart', label: 'Gráfico de Linhas', icon: '📈' },
  { value: 'pie_chart', label: 'Gráfico de Pizza', icon: '🥧' },
  { value: 'area_chart', label: 'Gráfico de Área', icon: '📉' },
];

export interface ReportBuilderProps {
  existingReport?: any;
  onSave?: () => void;
}

export default function ReportBuilder({ existingReport = null, onSave }: ReportBuilderProps) {
  const [activeTab, setActiveTab] = useState('data');
  const [previewData, setPreviewData] = useState<any>(null);
  const [formData, setFormData] = useState<any>(existingReport || {
    name: '',
    description: '',
    data_source: 'citizens',
    query_config: {
      fields: [],
      filters: []
    },
    visualization_type: 'table',
    chart_config: {},
    schedule_enabled: false,
    schedule_frequency: 'weekly',
    schedule_day: 1,
    schedule_time: '09:00',
    recipients: [],
    export_format: 'pdf'
  });

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (data: any) => existingReport 
      ? trpc.CustomReport.update(existingReport.id, data)
      : trpc.CustomReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customReports'] });
      toast.success('Relatório salvo com sucesso');
      onSave?.();
    }
  });

  const handleAddField = (field: string) => {
    const fields = formData.query_config.fields || [];
    if (!fields.includes(field)) {
      setFormData({
        ...formData,
        query_config: {
          ...formData.query_config,
          fields: [...fields, field]
        }
      });
    }
  };

  const handleRemoveField = (field: string) => {
    setFormData({
      ...formData,
      query_config: {
        ...formData.query_config,
        fields: formData.query_config.fields.filter((f: string) => f !== field)
      }
    });
  };

  const handleAddFilter = () => {
    const filters = formData.query_config.filters || [];
    setFormData({
      ...formData,
      query_config: {
        ...formData.query_config,
        filters: [...filters, { field: '', operator: 'equals', value: '' }]
      }
    });
  };

  const handleUpdateFilter = (index: number, key: string, value: string) => {
    const filters = [...formData.query_config.filters];
    filters[index] = { ...filters[index], [key]: value };
    setFormData({
      ...formData,
      query_config: { ...formData.query_config, filters }
    });
  };

  const handleRemoveFilter = (index: number) => {
    setFormData({
      ...formData,
      query_config: {
        ...formData.query_config,
        filters: formData.query_config.filters.filter((_: any, i: number) => i !== index)
      }
    });
  };

  const handlePreview = async () => {
    // Simulate data fetch based on config
    setPreviewData({ config: formData, sampleData: [] });
    setActiveTab('preview');
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const availableFields = DATA_SOURCES[formData.data_source]?.fields || [];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="data" className="gap-2">
            <FileText className="w-4 h-4" />
            Dados
          </TabsTrigger>
          <TabsTrigger value="filters" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </TabsTrigger>
          <TabsTrigger value="visualization" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Visualização
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="w-4 h-4" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Play className="w-4 h-4" />
            Prévia
          </TabsTrigger>
        </TabsList>

        {/* Basic Info & Data Selection */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Relatório *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Relatório Mensal de Visitas"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o propósito deste relatório"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Fonte de Dados *</Label>
                <Select value={formData.data_source} onValueChange={(v) => setFormData({ ...formData, data_source: v, query_config: { fields: [], filters: [] } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DATA_SOURCES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campos Selecionados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.query_config.fields?.map((field: string) => (
                  <Badge key={field} className="gap-2">
                    {field}
                    <button onClick={() => handleRemoveField(field)}>×</button>
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Adicionar Campo</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableFields.map((field) => (
                    <Button
                      key={field}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddField(field)}
                      disabled={formData.query_config.fields?.includes(field)}
                    >
                      {field}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters */}
        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filtros de Dados</CardTitle>
                <Button onClick={handleAddFilter} size="sm" variant="outline">
                  + Adicionar Filtro
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.query_config.filters?.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhum filtro configurado</p>
              )}
              {formData.query_config.filters?.map((filter: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Campo</Label>
                    <Select value={filter.field} onValueChange={(v) => handleUpdateFilter(idx, 'field', v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {availableFields.map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Operador</Label>
                    <Select value={filter.operator} onValueChange={(v) => handleUpdateFilter(idx, 'operator', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="not_equals">Diferente de</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="greater_than">Maior que</SelectItem>
                        <SelectItem value="less_than">Menor que</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={filter.value}
                      onChange={(e) => handleUpdateFilter(idx, 'value', e.target.value)}
                      placeholder="Valor"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFilter(idx)}>
                    ×
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visualization */}
        <TabsContent value="visualization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Visualização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CHART_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, visualization_type: type.value })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.visualization_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <p className="font-medium text-sm">{type.label}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Formato de Exportação</Label>
                <Select value={formData.export_format} onValueChange={(v) => setFormData({ ...formData, export_format: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendamento Automático</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.schedule_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, schedule_enabled: checked })}
                />
                <Label>Ativar geração e envio automático</Label>
              </div>

              {formData.schedule_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frequência</Label>
                      <Select value={formData.schedule_frequency} onValueChange={(v) => setFormData({ ...formData, schedule_frequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                          <SelectItem value="monthly">Mensalmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input
                        type="time"
                        value={formData.schedule_time}
                        onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      />
                    </div>
                  </div>

                  {formData.schedule_frequency !== 'daily' && (
                    <div className="space-y-2">
                      <Label>
                        {formData.schedule_frequency === 'weekly' ? 'Dia da Semana' : 'Dia do Mês'}
                      </Label>
                      <Input
                        type="number"
                        value={formData.schedule_day}
                        onChange={(e) => setFormData({ ...formData, schedule_day: parseInt(e.target.value) })}
                        min="1"
                        max={formData.schedule_frequency === 'weekly' ? '7' : '31'}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Destinatários (emails separados por vírgula)</Label>
                    <Textarea
                      value={formData.recipients?.join(', ')}
                      onChange={(e) => setFormData({ ...formData, recipients: e.target.value.split(',').map((s: string) => s.trim()) })}
                      placeholder="email1@example.com, email2@example.com"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview">
          <ReportPreview config={formData} />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline" onClick={handlePreview}>
          <Play className="w-4 h-4 mr-2" />
          Visualizar Prévia
        </Button>
        <Button onClick={handleSave} disabled={saveMutation.isPending || !formData.name}>
          <Save className="w-4 h-4 mr-2" />
          {existingReport ? 'Atualizar Relatório' : 'Salvar Relatório'}
        </Button>
      </div>
    </div>
  );
}
