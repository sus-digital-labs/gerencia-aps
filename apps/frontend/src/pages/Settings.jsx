import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { runtimeConfig } from "@/config/runtime";

const capabilities = [
  ["Frontend SPA", "CURRENT_RUNTIME"],
  ["Validação de contratos", "CURRENT_RUNTIME"],
  ["Backend/API", "NOT_PRESENT"],
  ["Banco e-SUS APS", "NOT_PRESENT"],
  ["Ingestão e upsert", "NOT_IMPLEMENTED"],
  ["Autorização de servidor", "EXTERNAL_CONTRACT"],
  ["Cálculo normativo", "EXTERNAL_CONTRACT"],
];

export default function Settings() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              PUBLIC_STANDALONE
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Configuração do checkout
            </h1>
            <p className="mt-2 text-slate-600">
              Esta página documenta limites do frontend; não executa
              administração de servidor.
            </p>
          </div>
          <Link
            className="text-sm text-blue-700 underline"
            to={createPageUrl("Dashboard")}
          >
            Voltar ao painel
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuração pública</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              <strong>Município:</strong> {runtimeConfig.municipality.name}
            </p>
            <p>
              <strong>UF:</strong> {runtimeConfig.municipality.uf}
            </p>
            <p>
              <strong>IBGE:</strong> {runtimeConfig.municipality.ibge}
            </p>
            <p>
              <strong>API:</strong> {runtimeConfig.apiUrl}
            </p>
            <p className="text-xs text-slate-500">
              Nenhum segredo deve ser colocado em variáveis VITE_*.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacidades e fronteiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {capabilities.map(([name, status]) => (
              <div
                className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                key={name}
              >
                <span className="text-sm text-slate-700">{name}</span>
                <Badge variant="outline">{status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
