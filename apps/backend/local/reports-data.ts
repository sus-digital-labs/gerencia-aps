import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { currentApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import { INDICATOR_NAMES, OPERATIONAL_METRIC_CODES } from "@shared/aps-indicators";
import { cnesSchema, ineSchema } from "@shared/pec-scope";
import { type CvatComplements } from "./analytics/cvat-complements";
import { competenceEnd } from "./analytics/pec-quality-source";
import { apsCompetenceSchema, loadIndicators } from "./indicators";
import { queryPEC } from "./pec-db";
import { listPecTeams, type PecTeam } from "./pec-directory";
import {
  bpaSections, immunizationSection, incidenceSection, productionGroups, productionSections, rasSections,
  reportSectionSql, visitSection, type ReportColumn, type ReportRow, type SqlReportSection,
} from "./reports-sql";

export const reportKindSchema = z.enum(["producao", "bpa", "ras", "imunizacao", "comparativo", "incidencia", "personalizados"]);
export type ReportKind = z.infer<typeof reportKindSchema>;
export type ReportStatus = "READY" | "PARTIAL" | "NO_DATA" | "SOURCE_PENDING" | "API_UNAVAILABLE";

export type ReportSection = {
  id: string;
  title: string;
  source: string;
  status: ReportStatus;
  reason: string | null;
  firstObserved: string | null;
  lastObserved: string | null;
  columns: ReportColumn[];
  rows: ReportRow[];
};

const scopeSchema = z.object({ cnes: cnesSchema, ine: ineSchema.optional(), month: apsCompetenceSchema });
const production = scopeSchema.extend({ groupBy: z.enum(productionGroups).default("total") }).strict();
const immunization = scopeSchema.extend({ groupBy: z.enum(["dose", "dia"]).default("dose") }).strict();
const fixedScope = scopeSchema.strict();
const diagnosis = scopeSchema.extend({ source: z.enum(["cid", "ciap"]).default("cid") }).strict();
const indicator = scopeSchema.extend({
  groupBy: z.enum(["equipes", "tempo"]).default("tempo"), code: z.enum(OPERATIONAL_METRIC_CODES).default("C1"),
}).strict().superRefine((input, ctx) => {
  if (input.groupBy === "tempo" && !input.ine) ctx.addIssue({ code: "custom", path: ["ine"], message: "Selecione a equipe para consultar a série." });
  if (input.groupBy === "equipes" && input.ine) ctx.addIssue({ code: "custom", path: ["ine"], message: "Use o escopo da unidade para comparar equipes." });
});

export type ReportScope = z.infer<typeof scopeSchema>;
type IndicatorView = z.infer<typeof indicator>;
type ReportDescription = { notes: string[]; links?: { label: string; href: string }[]; pending?: ReportSection };
type ReportPlan = ReportDescription & { scope: ReportScope } & (
  { sections: SqlReportSection[] } | { indicatorView: IndicatorView }
);

function pendingSection(id: string, title: string, source: string, reason: string): ReportSection {
  return { id, title, source, status: "SOURCE_PENDING", reason, firstObserved: null, lastObserved: null, columns: [], rows: [] };
}

function planProduction(query: unknown): ReportPlan {
  const input = production.parse(query);
  return { scope: input, sections: productionSections(input.groupBy), notes: [
    "Produção atribuída ao CNES e ao INE registrados no fato. Atendimentos individuais e odontológicos usam a atribuição principal.",
    "Cada seção conta registros do seu modelo. A mesma ação pode aparecer em modelos diferentes. As contagens devem ser lidas por seção.",
    "Na vacinação, a competência segue a data da aplicação. A contagem exclui transcrições e aplicações no exterior.",
  ] };
}

const siaManual = { label: "Manual do Sistema de Informação Ambulatorial", href: "https://wiki.saude.gov.br/sia/index.php/P%C3%A1gina_principal" };

function planBpa(query: unknown): ReportPlan {
  return { scope: fixedScope.parse(query), sections: bpaSections(), notes: [
    "Conferência local dos procedimentos com código de dez dígitos na dimensão do PEC, agrupados por código e CBO. A produção odontológica usa a quantidade registrada. No fato ambulatorial, cada linha vale um registro.",
    "A conferência reúne códigos do PEC sem aplicar elegibilidade do instrumento de registro por competência, validação de faturamento ou processamento pelo SIA.",
  ], links: [{ label: "Manual do Boletim de Produção Ambulatorial", href: "https://wiki.saude.gov.br/sia/index.php/BPA" }],
  pending: pendingSection("bpa-oficial", "BPA para faturamento e transmissão", "SIGTAP da competência e produção validada no SIA/SUS",
    "O arquivo oficial de BPA depende de elegibilidade, validação da produção e processamento no SIA/SUS. A exportação disponível aqui é o CSV de conferência.") };
}

function planRas(query: unknown): ReportPlan {
  return { scope: fixedScope.parse(query), sections: rasSections(), notes: [
    "Resumo local dos atendimentos individuais e odontológicos, agrupados pelo tipo de atendimento registrado no PEC.",
  ], links: [siaManual], pending: pendingSection("raas-oficial", "RAAS para transmissão", "Instrumento RAAS e processamento no SIA/SUS",
    "O Registro das Ações Ambulatoriais de Saúde do SIA/SUS exige fonte, critérios e layout próprios. O resumo do PEC está disponível para acompanhamento local.") };
}

function planImmunization(query: unknown): ReportPlan {
  const input = immunization.parse(query);
  return { scope: input, sections: [immunizationSection(input.groupBy)], notes: [
    "As doses são contadas pelo dia de aplicação e pelo CNES e INE registrados no fato. A contagem exclui transcrições e aplicações no exterior.",
  ], links: [{ label: "Regras para Registros Vacinais", href: "https://www.gov.br/saude/pt-br/vacinacao/regras-para-registros-vacinais" }],
  pending: pendingSection("cobertura", "Cobertura vacinal oficial", "População-alvo e dados vacinais consolidados conforme o PNI",
    "O cálculo de cobertura exige a população-alvo e os critérios de dose, idade e estratégia de cada imunobiológico, além da origem oficial de vacinação.") };
}

function planDiagnosis(query: unknown): ReportPlan {
  const input = diagnosis.parse(query);
  return { scope: input, sections: [incidenceSection(input.source)], notes: [
    "Pessoas distintas por código de problema avaliado, vinculadas à identidade interna do cidadão no PEC. Um primeiro registro observado é aquele sem ocorrência anterior do mesmo código no histórico da instalação, inclusive em outras unidades.",
    "O início do histórico disponível limita a detecção de registros anteriores. O cálculo de incidência epidemiológica exige data de início, população sob risco e cobertura longitudinal validadas.",
  ], pending: pendingSection("incidencia-oficial", "Incidência epidemiológica", "Coorte, população sob risco e data de início validadas",
    "Use a contagem local de primeiros registros para acompanhamento. Uma taxa epidemiológica requer as fontes indicadas.") };
}

function planVisits(query: unknown): ReportPlan {
  return { scope: fixedScope.parse(query), sections: [visitSection()], notes: [
    "As visitas são agrupadas pela microárea e pelo INE do registro. O total de visitas inclui realizadas, recusadas, ausências e registros sem desfecho identificado.",
  ] };
}

function planIndicators(query: unknown): ReportPlan {
  const input = indicator.parse(query);
  return { scope: input, indicatorView: input, notes: [
    `Indicador ${input.code} · ${INDICATOR_NAMES[input.code]}. A apuração usa a mesma regra, janela e evidência do painel Brasil 360. A unidade de medida é exibida por linha.`,
  ] };
}

export function parseReport(kind: ReportKind, query: Record<string, unknown>): ReportPlan {
  switch (kind) {
    case "producao": return planProduction(query);
    case "bpa": return planBpa(query);
    case "ras": return planRas(query);
    case "imunizacao": return planImmunization(query);
    case "incidencia": return planDiagnosis(query);
    case "comparativo": {
      if (query.groupBy === undefined || query.groupBy === "microarea") {
        const { groupBy: _group, ...scope } = query;
        return planVisits(scope);
      }
      return planIndicators(query);
    }
    case "personalizados": {
      const { source, system, ...scope } = query;
      switch (z.enum(["producao", "bpa", "ras", "imunizacao", "visitas", "diagnosticos", "indicadores"]).default("producao").parse(source)) {
        case "producao": return planProduction(scope);
        case "bpa": return planBpa(scope);
        case "ras": return planRas(scope);
        case "imunizacao": return planImmunization(scope);
        case "visitas": return planVisits(scope);
        case "diagnosticos": return planDiagnosis({ ...scope, source: system });
        case "indicadores": return planIndicators(scope);
      }
    }
  }
}

async function readScope(scope: ReportScope) {
  const teams = (await listPecTeams()).filter(team => team.cnes === scope.cnes);
  if (teams.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Selecione uma unidade com equipe ativa no PEC." });
  const selected = teams.filter(team => team.ine === scope.ine);
  if (scope.ine && selected.length !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Selecione uma equipe ativa nesta unidade do PEC." });
  }
  return { teams, unitName: teams[0].unitName, teamName: selected[0]?.name ?? null };
}

async function readRelationAccess(sections: SqlReportSection[]) {
  const relations = [...new Set(sections.flatMap(spec => spec.requires))];
  const rows = await queryPEC<{ name: string; allowed: boolean }>(`
    SELECT name, coalesce(has_table_privilege(to_regclass('public.' || name), 'SELECT'), false) AS allowed
    FROM unnest($1::text[]) AS sources(name)`, [relations]);
  return new Set(rows.filter(row => row.allowed).map(row => row.name));
}

function dayKey(monthOrDay: string) {
  return Number(monthOrDay.length === 7 ? `${monthOrDay.replace("-", "")}01` : monthOrDay.replaceAll("-", ""));
}

function todayAtPec() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function readSections(specs: SqlReportSection[], scope: ReportScope) {
  const available = await readRelationAccess(specs);
  const today = todayAtPec();
  const params = [scope.cnes, scope.ine ?? null, dayKey(scope.month), dayKey(shiftApsCompetence(scope.month, 1)), dayKey(today)];
  const results: ReportSection[] = [];

  for (const spec of specs) {
    const base = { id: spec.id, title: spec.title, source: spec.relation, columns: spec.columns };
    const missing = spec.requires.filter(relation => !available.has(relation));
    if (missing.length) {
      results.push({ ...pendingSection(spec.id, spec.title, spec.relation,
        `Relações PEC indisponíveis para leitura (${missing.join(", ")}).`), columns: spec.columns });
      continue;
    }
    try {
      const records = await queryPEC<{ data: ReportRow | null; firstObserved: string | null; lastObserved: string | null }>(reportSectionSql(spec), params);
      const rows = records.flatMap(record => record.data ? [record.data] : []);
      const firstObserved = records[0]?.firstObserved ?? null;
      const lastObserved = records[0]?.lastObserved ?? null;
      const open = scope.month === currentApsCompetence();
      const endsEarly = lastObserved !== null && lastObserved < competenceEnd(scope.month);
      let status: ReportStatus = "READY";
      let reason: string | null = null;
      if (!rows.length) {
        status = "NO_DATA";
        reason = !lastObserved || !firstObserved || lastObserved.slice(0, 7) < scope.month || firstObserved.slice(0, 7) > scope.month
          ? "A janela de registros observada na cópia do PEC não alcança esta competência."
          : "A origem não retornou registros para o escopo escolhido nessa competência.";
      } else if (open || endsEarly) {
        status = "PARTIAL";
        reason = open ? "A competência ainda está aberta." : "O último registro observado na origem é anterior ao encerramento da competência.";
      }
      results.push({ ...base, status, reason, rows, firstObserved, lastObserved });
    } catch (error) {
      if (!(error instanceof TRPCError) || !["SERVICE_UNAVAILABLE", "TOO_MANY_REQUESTS"].includes(error.code)) throw error;
      results.push({ ...base, status: "API_UNAVAILABLE", reason: error.message, rows: [], firstObserved: null, lastObserved: null });
    }
  }
  return results;
}

const indicatorColumns = [
  { key: "period", label: "Competência apurada" }, { key: "team", label: "Equipe" }, { key: "ine", label: "INE da equipe" },
  { key: "value", label: "Valor" }, { key: "unit", label: "Unidade de medida" }, { key: "numerator", label: "Numerador" },
  { key: "denominator", label: "Denominador" }, { key: "assessment", label: "Situação do indicador" }, { key: "detail", label: "Evidência e limites" },
];

const indicatorStatuses = {
  READY: "Apurado", NO_DATA: "Sem dados", API_UNAVAILABLE: "Consulta indisponível",
  MISSING_REQUIRED_CRITERIA: "Evidência parcial", BLOCKED_BY_DATA_CONTRACT: "Fonte pendente",
  NOT_APPLICABLE: "Não se aplica à equipe",
} as const;
const indicatorUnits = { percent: "%", score: "pontos (0 a 10)", factor: "fator", per_person: "por pessoa" };

type HistoryItem = Awaited<ReturnType<typeof loadIndicators>>["indicators"][number]["history"][number];

function indicatorRow(team: PecTeam, month: string, result?: HistoryItem): ReportRow {
  const level = result?.status ?? "NOT_APPLICABLE";
  const evidence = result?.evidence?.map(entry => `${entry.label} (${entry.value})`) ?? [];
  if (result?.status === "READY") {
    if (result.limitation) evidence.push(result.limitation);
    if (result.source === "COMPLEMENTO") evidence.push("Inclui complementos locais da regra Brasil 360.");
    return { period: month, team: team.name, ine: team.ine, value: result.value, unit: indicatorUnits[result.unit],
      numerator: result.numerator, denominator: result.denominator, assessment: indicatorStatuses[level], detail: evidence.join(" · ") || null };
  }
  if (result) evidence.unshift(result.reason);
  return { period: month, team: team.name, ine: team.ine, value: null, assessment: indicatorStatuses[level], detail: evidence.join(" · ") || null };
}

async function compareIndicators(input: IndicatorView, teams: PecTeam[], complements: CvatComplements): Promise<ReportSection> {
  const rows: ReportRow[] = [];
  const cutoffs: string[] = [];
  for (const team of teams) {
    if (input.ine && team.ine !== input.ine) continue;
    const panel = await loadIndicators({ cnes: input.cnes, ine: team.ine, month: input.month, codes: [input.code] }, complements);
    if (panel.sourceThrough) cutoffs.push(panel.sourceThrough);
    const period = panel.indicators[0]?.history;
    if (period && input.groupBy === "tempo") rows.push(...period.map(result => indicatorRow(team, result.referenceMonth, result)));
    else rows.push(indicatorRow(team, input.month, period?.find(result => result.referenceMonth === input.month)));
  }
  const observed = rows.some(row => typeof row.value === "number");
  const relevant = rows.filter(row => row.assessment !== indicatorStatuses.NOT_APPLICABLE);
  const outstanding = relevant.some(row => row.assessment !== indicatorStatuses.READY);
  const status = observed ? (outstanding ? "PARTIAL" : "READY")
    : relevant.some(row => row.assessment === indicatorStatuses.BLOCKED_BY_DATA_CONTRACT) ? "SOURCE_PENDING"
      : relevant.some(row => row.assessment === indicatorStatuses.API_UNAVAILABLE) ? "API_UNAVAILABLE" : "NO_DATA";
  return { id: "brasil-360", source: "Brasil 360 · cálculo local com evidências do PEC", title: `${input.code} · ${INDICATOR_NAMES[input.code]}`,
    status, reason: !relevant.length ? "O indicador escolhido não se aplica às equipes do recorte." : null,
    columns: indicatorColumns, rows, firstObserved: null, lastObserved: cutoffs.sort().at(-1) ?? null };
}

export async function loadReport(kind: ReportKind, plan: ReportPlan, complements: CvatComplements) {
  const { scope } = plan;
  const { teams, unitName, teamName } = await readScope(scope);
  const sections = "sections" in plan ? await readSections(plan.sections, scope) : [await compareIndicators(plan.indicatorView, teams, complements)];
  if (plan.pending) sections.push(plan.pending);
  return {
    kind, sourceScope: "PEC_LOCAL" as const, calculatedAt: new Date().toISOString(),
    scope: { cnes: scope.cnes, ine: scope.ine ?? null, month: scope.month, unitName, teamName },
    sections, notes: plan.notes, links: plan.links ?? [],
  };
}

export type ReportData = Awaited<ReturnType<typeof loadReport>>;
