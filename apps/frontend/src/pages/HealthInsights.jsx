import React from "react";
import { Brain } from "lucide-react";
import InsightsDashboard from "../components/health-insights/InsightsDashboard";

export default function HealthInsights() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Análises de Saúde
              </h1>
              <p className="text-white/70">
                Análise inteligente de riscos e recomendações preventivas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <InsightsDashboard />
      </div>
    </div>
  );
}
