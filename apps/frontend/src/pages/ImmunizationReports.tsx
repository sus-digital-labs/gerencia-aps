import { Card } from "@/components/ui/card";
import { Syringe } from "lucide-react";

export default function ImmunizationReports() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Syringe className="h-8 w-8 text-blue-600" />
            Relatório de Imunização
          </h1>
          <p className="text-gray-600 mt-1">Relatórios de vacinação</p>
        </div>

        <Card className="p-6">
          <div className="text-center py-12">
            <Syringe className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Página em desenvolvimento</p>
            <p className="text-sm text-gray-400 mt-2">
              Funcionalidade será implementada em breve
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
