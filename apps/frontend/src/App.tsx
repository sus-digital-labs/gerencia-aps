import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Layout
// @ts-ignore
import Layout from "./pages/Layout.jsx";

// Pages
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Gestão ACS
import ACSManagement from "./pages/ACSManagement";
import ACSRanking from "./pages/ACSRanking";
import ACSTimeline from "./pages/ACSTimeline";
import PendingTasks from "./pages/PendingTasks";

// Território
// @ts-ignore
import TerritoryMapping from "./pages/TerritoryMapping.jsx";
// @ts-ignore
import TerritoryRemapping from "./pages/TerritoryRemapping.jsx";
// @ts-ignore
import MicroareaMapping from "./pages/MicroareaMapping.jsx";
// @ts-ignore
import RemapeamentoInteligente from "./pages/RemapeamentoInteligente.jsx";

// Vigilância
import AedesVigilance from "./pages/AedesVigilance";
import CardiovascularRisk from "./pages/CardiovascularRisk";
import WomensHealth from "./pages/WomensHealth";

// Relatórios
import Reports from "./pages/Reports";
import BPAReports from "./pages/BPAReports";
import ProductionReports from "./pages/ProductionReports";
import RASReports from "./pages/RASReports";
import ImmunizationReports from "./pages/ImmunizationReports";
import CustomReports from "./pages/CustomReports";

// Outros
import DataQuality from "./pages/DataQuality";
import Gamification from "./pages/Gamification";
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";
import IndicatorDetail from "./pages/IndicatorDetail";
import HealthInsights from "./pages/HealthInsights";

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Gestão ACS */}
        <Route path="acs" element={<ACSManagement />} />
        <Route path="acs/ranking" element={<ACSRanking />} />
        <Route path="acs/timeline" element={<ACSTimeline />} />
        <Route path="acs/tarefas" element={<PendingTasks />} />

        {/* Território - rotas alinhadas com createPageUrl */}
        <Route path="territorio" element={<TerritoryMapping />} />
        <Route
          path="territorio/remapeamento"
          element={<TerritoryRemapping />}
        />
        <Route path="territorio/microareas" element={<MicroareaMapping />} />
        <Route
          path="territorio/remapeamento-inteligente"
          element={<RemapeamentoInteligente />}
        />
        {/* Rotas alternativas para compatibilidade */}
        <Route path="territory-mapping" element={<TerritoryMapping />} />
        <Route path="territory-remapping" element={<TerritoryRemapping />} />

        {/* Vigilância */}
        <Route path="vigilancia/aedes" element={<AedesVigilance />} />
        <Route
          path="vigilancia/cardiovascular"
          element={<CardiovascularRisk />}
        />
        <Route path="saude-mulher" element={<WomensHealth />} />

        {/* Relatórios */}
        <Route path="relatorios" element={<Reports />} />
        <Route path="relatorios/bpa" element={<BPAReports />} />
        <Route path="relatorios/producao" element={<ProductionReports />} />
        <Route path="relatorios/ras" element={<RASReports />} />
        <Route path="relatorios/imunizacao" element={<ImmunizationReports />} />
        <Route path="relatorios/customizados" element={<CustomReports />} />
        {/* Rotas alternativas em inglês para compatibilidade */}
        <Route path="reports" element={<Reports />} />
        <Route path="reports/bpa" element={<BPAReports />} />
        <Route path="reports/production" element={<ProductionReports />} />
        <Route path="reports/ras" element={<RASReports />} />
        <Route path="reports/immunization" element={<ImmunizationReports />} />
        <Route path="reports/custom" element={<CustomReports />} />

        {/* Outros */}
        <Route path="qualidade" element={<DataQuality />} />
        <Route path="gamificacao" element={<Gamification />} />
        <Route path="equipes" element={<Teams />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="indicador/:code" element={<IndicatorDetail />} />
        <Route path="insights" element={<HealthInsights />} />
        {/* Rotas alternativas em inglês */}
        <Route path="data-quality" element={<DataQuality />} />
        <Route path="gamification" element={<Gamification />} />
        <Route path="teams" element={<Teams />} />
        <Route path="settings" element={<Settings />} />
        <Route path="indicator/:code" element={<IndicatorDetail />} />
        <Route path="health-insights" element={<HealthInsights />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Router />
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
