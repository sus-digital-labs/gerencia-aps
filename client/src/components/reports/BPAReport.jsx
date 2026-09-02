import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, Download, Calendar, CheckCircle2, AlertCircle, Loader2, FileDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

export default function BPAReport({ visits = [], professionals = [] }) {
  const [competencia, setCompetencia] = useState({
    month: String(new Date().getMonth() + 1).padStart(2, '0'),
    year: String(new Date().getFullYear())
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // BPA consolidated data
  const bpaData = useMemo(() => {
    // Simulate BPA data grouping
    const data = [];
    const procedures = [
      { code: '0301010064', name: 'CONSULTA MEDICA EM ATENCAO BASICA', qty: Math.floor(Math.random() * 500) + 100 },
      { code: '0301010072', name: 'CONSULTA DE ENFERMAGEM EM ATENCAO BASICA', qty: Math.floor(Math.random() * 400) + 80 },
      { code: '0301010080', name: 'CONSULTA ODONTOLOGICA', qty: Math.floor(Math.random() * 200) + 50 },
      { code: '0301060029', name: 'VISITA DOMICILIAR POR PROFISSIONAL DE NIVEL MEDIO', qty: visits.length || Math.floor(Math.random() * 800) + 200 },
      { code: '0301060037', name: 'VISITA DOMICILIAR POR PROFISSIONAL DE NIVEL SUPERIOR', qty: Math.floor(Math.random() * 300) + 100 },
      { code: '0201010550', name: 'AFERIÇÃO DE PRESSÃO ARTERIAL', qty: Math.floor(Math.random() * 600) + 150 },
      { code: '0202010503', name: 'GLICEMIA CAPILAR', qty: Math.floor(Math.random() * 300) + 80 },
      { code: '0301100039', name: 'NEBULIZAÇÃO', qty: Math.floor(Math.random() * 150) + 30 },
      { code: '0401010015', name: 'CURATIVO SIMPLES', qty: Math.floor(Math.random() * 200) + 40 },
      { code: '0301040079', name: 'ADMINISTRAÇÃO DE MEDICAMENTOS', qty: Math.floor(Math.random() * 400) + 100 }
    ];

    procedures.forEach(proc => {
      data.push({
        ...proc,
        cbo: '225125', // CBO médico
        cnes: '2345678',
        competencia: `${competencia.year}${competencia.month}`
      });
    });

    return data;
  }, [competencia, visits]);

  const totalProcedures = bpaData.reduce((sum, item) => sum + item.qty, 0);

  // Generate BPA file in DATASUS format
  const generateBPAFile = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setGenerationProgress(i);
    }

    // Generate BPA-C format (layout posicional)
    let content = '';
    
    // Header record (tipo 01)
    const header = [
      '01',                              // Tipo registro
      competencia.year + competencia.month, // Competência
      '2345678'.padStart(7, '0'),        // CNES
      'UNIDADE BASICA DE SAUDE'.padEnd(60, ' '), // Nome estabelecimento
      'A'.padEnd(1, ' '),                // Indicador atendimento
      '000001'.padStart(6, '0')          // Sequencial
    ].join('');
    content += header + '\n';

    // Procedure records (tipo 02)
    bpaData.forEach((proc, idx) => {
      const record = [
        '02',                                    // Tipo registro
        competencia.year + competencia.month,    // Competência
        '2345678'.padStart(7, '0'),              // CNES
        proc.cbo.padStart(6, '0'),               // CBO
        '0'.padStart(2, '0'),                    // Código de origem
        proc.code.padStart(10, '0'),             // Código procedimento
        '00'.padStart(2, '0'),                   // Idade
        String(proc.qty).padStart(6, '0'),       // Quantidade
        '01'.padStart(2, '0'),                   // Tipo de atendimento
        String(idx + 1).padStart(6, '0')         // Sequencial
      ].join('');
      content += record + '\n';
    });

    // Footer record (tipo 03)
    const footer = [
      '03',                                      // Tipo registro
      String(bpaData.length + 2).padStart(6, '0'), // Total de registros
      String(totalProcedures).padStart(10, '0')  // Total de procedimentos
    ].join('');
    content += footer;

    // Download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BPA_${competencia.year}${competencia.month}.txt`;
    a.click();

    setIsGenerating(false);
    setGenerationProgress(100);
    toast.success('Arquivo BPA gerado com sucesso!');
  };

  const handleExportCSV = () => {
    const headers = ['Código', 'Procedimento', 'CBO', 'Quantidade', 'Competência'];
    const rows = bpaData.map(item => [
      item.code,
      item.name,
      item.cbo,
      item.qty,
      item.competencia
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BPA_${competencia.year}${competencia.month}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">BPA - Boletim de Produção Ambulatorial</h2>
                <p className="text-white/80">Geração do arquivo consolidado para envio ao DATASUS</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white text-lg px-4 py-2">
              {MONTHS.find(m => m.value === competencia.month)?.label}/{competencia.year}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Actions */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Mês de Competência</Label>
              <Select 
                value={competencia.month} 
                onValueChange={(v) => setCompetencia({ ...competencia, month: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano de Competência</Label>
              <Select 
                value={competencia.year} 
                onValueChange={(v) => setCompetencia({ ...competencia, year: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025].map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={generateBPAFile} 
              disabled={isGenerating}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Gerar BPA (.txt)
                </>
              )}
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="mt-4">
              <Progress value={generationProgress} className="h-2" />
              <p className="text-sm text-gray-500 mt-1">Processando... {generationProgress}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{totalProcedures.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Total de Procedimentos</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{bpaData.length}</p>
              <p className="text-sm text-gray-500">Tipos de Procedimentos</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">1</p>
              <p className="text-sm text-gray-500">Estabelecimento</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <span className="font-medium text-emerald-600">Pronto para envio</span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Data Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Prévia do BPA Consolidado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Código SIGTAP</TableHead>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>CBO</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Competência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bpaData.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.cbo}</TableCell>
                    <TableCell className="text-center font-bold">{item.qty}</TableCell>
                    <TableCell className="text-center">{item.competencia}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-indigo-50 font-bold">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-center text-indigo-700">{totalProcedures}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}