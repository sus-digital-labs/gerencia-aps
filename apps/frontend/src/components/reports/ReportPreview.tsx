import trpc from '@/lib/trpc-adapter';
import React, { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export interface ReportPreviewProps {
  config: any;
}

export default function ReportPreview({ config }: ReportPreviewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let result: any[] = [];
        // Fetch data based on data_source
        switch (config.data_source) {
          case 'citizens':
            result = await trpc.CitizenRecord.filter({}, 'no_cidadao', 50);
            break;
          case 'visits':
            result = await trpc.HomeVisit.filter({}, '-visit_date', 50);
            break;
          case 'acs':
            result = await trpc.CommunityHealthAgent.filter({}, 'name', 50);
            break;
          case 'tasks':
            result = await trpc.ACSTask.filter({}, '-created_date', 50);
            break;
          default:
            result = [];
        }
        
        // Apply filters (simplified)
        if (config.query_config?.filters) {
          result = result.filter(item => {
            return config.query_config.filters.every((filter: any) => {
              if (!filter.field || !filter.value) return true;
              const itemValue = item[filter.field];
              const filterValue = filter.value;
              
              switch (filter.operator) {
                case 'equals':
                  return String(itemValue).toLowerCase() === String(filterValue).toLowerCase();
                case 'contains':
                  return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                case 'greater_than':
                  return Number(itemValue) > Number(filterValue);
                case 'less_than':
                  return Number(itemValue) < Number(filterValue);
                default:
                  return true;
              }
            });
          });
        }
        
        setData(result);
      } catch (error) {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config]);

  const handleExport = async () => {
    if (config.export_format === 'csv') {
      exportToCSV();
    } else if (config.export_format === 'pdf') {
      exportToPDF();
    } else {
      toast.info('Exportação para Excel em desenvolvimento');
    }
  };

  const exportToCSV = () => {
    const fields = config.query_config?.fields || Object.keys(data[0] || {});
    const headers = fields.join(',');
    const rows = data.map(item => 
      fields.map((field: string) => `"${item[field] || ''}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.name || 'relatorio'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exportado com sucesso');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const fields = config.query_config?.fields || Object.keys(data[0] || {}).slice(0, 5);
    
    doc.setFontSize(16);
    doc.text(config.name || 'Relatório', 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
    
    if (config.description) {
      doc.setFontSize(9);
      doc.text(config.description, 20, 38, { maxWidth: 170 });
    }

    const tableData = data.slice(0, 100).map(item => 
      fields.map((field: string) => String(item[field] || '-'))
    );
    
    (doc as any).autoTable({
      startY: 45,
      head: [fields],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`${config.name || 'relatorio'}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exportado com sucesso');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  const fields = config.query_config?.fields || Object.keys(data[0] || {}).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prévia do Relatório: {config.name}</CardTitle>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar {config.export_format?.toUpperCase()}
          </Button>
        </div>
        {config.description && (
          <p className="text-sm text-gray-600 mt-2">{config.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Nenhum dado encontrado</p>
        ) : (
          <>
            {config.visualization_type === 'table' && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {fields.map((field: string) => (
                        <TableHead key={field}>{field}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 20).map((item, idx) => (
                      <TableRow key={idx}>
                        {fields.map((field: string) => (
                          <TableCell key={field}>{String(item[field] || '-')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.length > 20 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Mostrando 20 de {data.length} registros na prévia
                  </p>
                )}
              </div>
            )}

            {config.visualization_type === 'bar_chart' && (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={fields[0]} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={fields[1] || fields[0]} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {config.visualization_type === 'line_chart' && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={fields[0]} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={fields[1] || fields[0]} stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {config.visualization_type === 'pie_chart' && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={data.slice(0, 6)}
                    dataKey={fields[1] || 'value'}
                    nameKey={fields[0]}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label
                  >
                    {data.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}

            {config.visualization_type === 'area_chart' && (
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={fields[0]} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey={fields[1] || fields[0]} fill="#3b82f6" stroke="#2563eb" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
