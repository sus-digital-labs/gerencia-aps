import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function DashboardExport({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    vaccination: true,
    chronic: true,
    visits: true,
    acs: true,
  });
  const [format, setFormat] = useState("csv");

  const exportToCSV = () => {
    const sections = [];

    if (selectedSections.vaccination) {
      sections.push("=== COBERTURA VACINAL ===");
      sections.push("Vacina,Vacinados,Meta,Cobertura");
      sections.push("Influenza,850,1200,70.8%");
      sections.push("COVID-19,1450,1800,80.6%");
      sections.push("");
    }

    if (selectedSections.chronic) {
      sections.push("=== CONDIÇÕES CRÔNICAS ===");
      sections.push("Condição,Pacientes");
      sections.push("Hipertensão,450");
      sections.push("Diabetes,320");
      sections.push("");
    }

    const csv = sections.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exportado com sucesso");
    setIsOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text("Dashboard - SUS Analytics", 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 20, yPos);
    yPos += 15;

    if (selectedSections.vaccination) {
      doc.setFontSize(14);
      doc.text("Cobertura Vacinal", 20, yPos);
      yPos += 10;

      doc.autoTable({
        startY: yPos,
        head: [["Vacina", "Vacinados", "Meta", "Cobertura"]],
        body: [
          ["Influenza", "850", "1200", "70.8%"],
          ["COVID-19", "1450", "1800", "80.6%"],
          ["Tríplice Viral", "320", "350", "91.4%"],
        ],
      });
      yPos = doc.lastAutoTable.finalY + 15;
    }

    if (selectedSections.chronic) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(14);
      doc.text("Condições Crônicas", 20, yPos);
      yPos += 10;

      doc.autoTable({
        startY: yPos,
        head: [["Condição", "Pacientes", "Percentual"]],
        body: [
          ["Hipertensão", "450", "33.7%"],
          ["Diabetes", "320", "24.0%"],
          ["Obesidade", "280", "21.0%"],
        ],
      });
    }

    doc.save(`dashboard-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exportado com sucesso");
    setIsOpen(false);
  };

  const handleExport = () => {
    if (format === "csv") {
      exportToCSV();
    } else {
      exportToPDF();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Dados do Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Formato de Exportação</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat("csv")}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  format === "csv"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <p className="font-medium">CSV</p>
              </button>
              <button
                onClick={() => setFormat("pdf")}
                className={`flex-1 p-4 border-2 rounded-lg transition-all ${
                  format === "pdf"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <FileText className="w-6 h-6 mx-auto mb-2 text-red-600" />
                <p className="font-medium">PDF</p>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Seções a Exportar</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSections.vaccination}
                  onCheckedChange={checked =>
                    setSelectedSections({
                      ...selectedSections,
                      vaccination: checked,
                    })
                  }
                />
                <span className="text-sm">Cobertura Vacinal</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSections.chronic}
                  onCheckedChange={checked =>
                    setSelectedSections({
                      ...selectedSections,
                      chronic: checked,
                    })
                  }
                />
                <span className="text-sm">Condições Crônicas</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSections.visits}
                  onCheckedChange={checked =>
                    setSelectedSections({
                      ...selectedSections,
                      visits: checked,
                    })
                  }
                />
                <span className="text-sm">Atendimentos Domiciliares</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSections.acs}
                  onCheckedChange={checked =>
                    setSelectedSections({ ...selectedSections, acs: checked })
                  }
                />
                <span className="text-sm">Dados de ACS</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleExport} className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
