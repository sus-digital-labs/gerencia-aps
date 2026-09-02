/**
 * Utility functions
 */

export function createPageUrl(pageName: string): string {
  // Mapear nomes de páginas para rotas públicas da aplicação.
  const pageMap: Record<string, string> = {
    Dashboard: "/",
    ACSManagement: "/acs",
    ACSRanking: "/acs/ranking",
    ACSTimeline: "/acs/timeline",
    PendingTasks: "/acs/tarefas",
    TerritoryMapping: "/territorio",
    TerritoryRemapping: "/territorio/remapeamento",
    MicroareaMapping: "/territorio/microareas",
    RemapeamentoInteligente: "/territorio/remapeamento-inteligente",
    AedesVigilance: "/vigilancia/aedes",
    CardiovascularRisk: "/vigilancia/cardiovascular",
    Reports: "/relatorios",
    CustomReports: "/relatorios/customizados",
    DataQuality: "/qualidade",
    Gamification: "/gamificacao",
    Teams: "/equipes",
    Settings: "/configuracoes",
    IndicatorDetail: "/indicador",
    HealthInsights: "/insights",
    WomensHealth: "/saude-mulher",
  };

  return pageMap[pageName] || `/${pageName.toLowerCase()}`;
}

export function formatDate(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleString("pt-BR");
}

export function formatNumber(num: number, decimals = 2): string {
  return num.toFixed(decimals).replace(".", ",");
}

export function formatPercentage(num: number, decimals = 1): string {
  return `${formatNumber(num, decimals)}%`;
}
