import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { LocalLogin } from "./local/login";
import { PecNominalPage } from "./local/nominal";
import { PecIndicatorPage } from "./local/indicator";
import { PecAcsPage } from "./local/acs";
import { PecReportsPage } from "./local/reports";
import { PecTerritorialPage } from "./local/territorial";
import { PecTerritoryPage, PecQualityPage, PecVigilancePage, PecWomensHealthPage, PecGamificationPage,
  PecSettingsPage, PecHealthInsightsPage } from "./local/modules";
import { usePecScope } from "./local/pec";

function Teams() {
  const { directory, teams, month } = usePecScope();
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      <Card>
        <CardHeader><CardTitle>Equipes ativas no PEC</CardTitle></CardHeader>
        <CardContent>
          {directory.isPending && <p role="status">Consultando equipes do PEC…</p>}
          {directory.isError && <p role="alert">{directory.error.message}</p>}
          {directory.isSuccess && (teams.length ? (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Equipe</TableHead><TableHead>INE</TableHead><TableHead>Unidade</TableHead><TableHead>CNES</TableHead>
              </TableRow></TableHeader>
              <TableBody>{teams.map(team => (
                <TableRow key={`${team.cnes}/${team.ine}`}>
                    <TableCell><Link className="text-blue-700 underline" to={`/nominais?${new URLSearchParams({ cnes: team.cnes, ine: team.ine, competencia: month })}`}>{team.name}</Link></TableCell>
                    <TableCell>{team.ine}</TableCell>
                  <TableCell>{team.unitName}</TableCell><TableCell>{team.cnes}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <p role="status">O PEC não retornou equipes ativas.</p>)}
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Routes>
              <Route path="login" element={<LocalLogin />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="nominais" element={<PecNominalPage />} />
                <Route path="indicador" element={<PecIndicatorPage />} />
                <Route path="indicador/:code" element={<PecIndicatorPage />} />
                <Route path="indicator/:code" element={<PecIndicatorPage />} />
                <Route path="equipes" element={<Teams />} />
                <Route path="teams" element={<Teams />} />
                <Route path="vinculos" element={<PecTerritorialPage />} />
                <Route path="cvat" element={<PecTerritorialPage />} />
                <Route path="acs" element={<PecAcsPage />} />
                <Route path="acs/ranking" element={<PecAcsPage />} />
                <Route path="acs/timeline" element={<PecAcsPage />} />
                <Route path="acs/tarefas" element={<PecAcsPage />} />
                <Route path="relatorios/:report?" element={<PecReportsPage />} />
                <Route path="reports/:report?" element={<PecReportsPage />} />
                <Route path="territorio" element={<PecTerritoryPage />} />
                <Route path="territorio/microareas" element={<PecTerritoryPage view="microareas" />} />
                <Route path="territorio/remapeamento" element={<PecTerritoryPage view="remapping" />} />
                <Route path="territorio/remapeamento-inteligente" element={<PecTerritoryPage view="smart-remapping" />} />
                <Route path="territory-mapping" element={<PecTerritoryPage />} />
                <Route path="territory-remapping" element={<PecTerritoryPage view="remapping" />} />
                <Route path="vigilancia" element={<PecVigilancePage />} />
                <Route path="vigilancia/aedes" element={<PecVigilancePage view="aedes" />} />
                <Route path="vigilancia/cardiovascular" element={<PecVigilancePage view="cardiovascular" />} />
                <Route path="saude-mulher" element={<PecWomensHealthPage />} />
                <Route path="qualidade" element={<PecQualityPage />} />
                <Route path="data-quality" element={<PecQualityPage />} />
                <Route path="gamificacao" element={<PecGamificationPage />} />
                <Route path="gamification" element={<PecGamificationPage />} />
                <Route path="configuracoes" element={<PecSettingsPage />} />
                <Route path="settings" element={<PecSettingsPage />} />
                <Route path="insights" element={<PecHealthInsightsPage />} />
                <Route path="health-insights" element={<PecHealthInsightsPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
