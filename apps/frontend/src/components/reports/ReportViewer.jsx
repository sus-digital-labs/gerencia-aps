import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText, Printer } from "lucide-react";
import moment from "moment";

const visitTypeLabels = {
  cadastro: "Cadastro",
  acompanhamento: "Acompanhamento",
  busca_ativa: "Busca Ativa",
  campanha: "Campanha",
  entrega_medicamento: "Entrega de Medicamento",
  outros: "Outros",
};

const desfechoLabels = {
  visita_realizada: "Realizada",
  ausente: "Ausente",
  recusou: "Recusou",
  mudou: "Mudou",
  obito: "Óbito",
  outros: "Outros",
};

export default function ReportViewer({
  report,
  visits,
  areas,
  citizens,
  indicators,
  teams,
  onExportCSV,
  onExportPDF,
}) {
  // Generate report data based on type
  const reportData = useMemo(() => {
    const fields = report.fields || [];

    switch (report.report_type) {
      case "visitas":
        return visits.map(v => {
          const row = {};
          if (fields.includes("visit_date") || fields.length === 0)
            row.visit_date = moment(v.visit_date).format("DD/MM/YYYY");
          if (fields.includes("acs_name") || fields.length === 0)
            row.acs_name = v.acs_name;
          if (fields.includes("citizen_name") || fields.length === 0)
            row.citizen_name = v.citizen_name;
          if (fields.includes("visit_type") || fields.length === 0)
            row.visit_type = visitTypeLabels[v.visit_type] || v.visit_type;
          if (fields.includes("desfecho") || fields.length === 0)
            row.desfecho = desfechoLabels[v.desfecho] || v.desfecho;
          if (fields.includes("microarea") || fields.length === 0)
            row.microarea = v.microarea;
          if (fields.includes("conditions_found") || fields.length === 0)
            row.conditions_found = (v.conditions_found || []).join(", ");
          if (fields.includes("address") || fields.length === 0)
            row.address = v.address;
          return row;
        });

      case "indicadores":
        return indicators.map(i => {
          const row = {};
          if (fields.includes("indicator_code") || fields.length === 0)
            row.indicator_code = i.indicator_code;
          if (fields.includes("indicator_name") || fields.length === 0)
            row.indicator_name = i.indicator_name;
          if (fields.includes("result_percentage") || fields.length === 0)
            row.result_percentage = `${i.result_percentage?.toFixed(1)}%`;
          if (fields.includes("numerator") || fields.length === 0)
            row.numerator = i.numerator;
          if (fields.includes("denominator") || fields.length === 0)
            row.denominator = i.denominator;
          if (fields.includes("target") || fields.length === 0)
            row.target = `${i.target}%`;
          if (fields.includes("quality_score") || fields.length === 0)
            row.quality_score = i.quality_score;
          return row;
        });

      case "territorios":
        return areas.map(a => {
          const row = {};
          if (fields.includes("name") || fields.length === 0) row.name = a.name;
          if (fields.includes("microarea_code") || fields.length === 0)
            row.microarea_code = a.microarea_code;
          if (fields.includes("acs_name") || fields.length === 0)
            row.acs_name = a.acs_name;
          if (fields.includes("total_families") || fields.length === 0)
            row.total_families = a.total_families;
          if (fields.includes("total_citizens") || fields.length === 0)
            row.total_citizens = a.total_citizens;
          return row;
        });

      default:
        return [];
    }
  }, [report, visits, areas, citizens, indicators]);

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  const columnLabels = {
    visit_date: "Data",
    acs_name: "ACS",
    citizen_name: "Cidadão",
    visit_type: "Tipo",
    desfecho: "Desfecho",
    microarea: "Microárea",
    conditions_found: "Condições",
    address: "Endereço",
    indicator_code: "Código",
    indicator_name: "Indicador",
    result_percentage: "Resultado",
    numerator: "Numerador",
    denominator: "Denominador",
    target: "Meta",
    quality_score: "Qualidade",
    name: "Nome",
    microarea_code: "Microárea",
    total_families: "Famílias",
    total_citizens: "Cidadãos",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">{report.name}</h3>
          {report.description && (
            <p className="text-sm text-gray-500">{report.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{reportData.length} registros</Badge>
            <Badge variant="secondary">
              Gerado em {moment().format("DD/MM/YYYY HH:mm")}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportCSV(reportData, report.name)}
          >
            <Download className="w-4 h-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportPDF({ ...report, data: reportData })}
          >
            <FileText className="w-4 h-4 mr-1" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(col => (
                    <TableHead key={col}>{columnLabels[col] || col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.slice(0, 100).map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map(col => (
                      <TableCell key={col} className="text-sm">
                        {row[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {reportData.length > 100 && (
            <div className="p-4 text-center text-sm text-gray-500 border-t">
              Mostrando 100 de {reportData.length} registros. Exporte para ver
              todos.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
