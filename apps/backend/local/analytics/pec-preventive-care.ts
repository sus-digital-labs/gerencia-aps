import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { preventiveCareSql, preventiveSigtapCodes } from "./pec-preventive-care-sql";
import { competenceEnd } from "./pec-quality-source";
import { preventivePractices, preventiveScore, type PreventivePractice, type PracticeCounts } from "./pec-preventive-score";
import { SIGTAP_FIRST_COMPETENCE, SIGTAP_LAST_COMPETENCE, sigtapCompatibilityParameter } from "./pec-preventive-sigtap";

export { preventivePractices } from "./pec-preventive-score";

// Processo SEI 25000.137969/2025-22. Esta ficha revoga o documento 0049702875.
export const preventiveCareSource = {
  document: "0054641718",
  previousDocument: "0049702875",
  url: "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c7-cuidado-da-mulher-na-prevencao-do-cancer/@@download/file",
};

type PreventiveStatus = "BLOCKED_BY_DATA_CONTRACT" | "MISSING_REQUIRED_CRITERIA" | "NO_DATA";

type PracticeEvidence = PracticeCounts & {
  peopleWithIncompleteEvidence: number;
  missingSigtapEvidence: number;
};

type PracticeResult = {
  sourceThrough: string | null;
  localEvidence?: PracticeEvidence;
} & ({ status: "READY" } | { status: PreventiveStatus; reason: string });

export type PreventiveCareResult = {
  practices: Partial<Record<PreventivePractice, PracticeResult>>;
  evidence: { label: string; value: number }[];
} & (
  | { status: "READY"; numerator: number; denominator: number; value: number; unit: "percent";
    excludedRecords: number; limitation: string }
  | { status: PreventiveStatus; reason: string }
);

type PreventiveRow = {
  month: string;
  practice: PreventivePractice;
  individual_cutoff: string | null;
  procedure_cutoff: string | null;
  vaccine_cutoff: string | null;
  history_start: string | null;
  team_qualified: boolean;
  linked_people: string;
  people_with_evidence: string;
  incomplete_evidence: string;
  missing_sigtap_evidence: string;
};

function earliest(...cutoffs: (string | null)[]) {
  return cutoffs.every(cutoff => cutoff !== null) ? cutoffs.filter(cutoff => cutoff !== null).sort()[0] ?? null : null;
}

const sigtapCompatibility = sigtapCompatibilityParameter(preventiveSigtapCodes);
// Primeira competência mensal inteira após a publicação da ficha arquivada.
// O rodapé da revisão situa a inclusão do exame molecular em janeiro/2026.
const preventiveFirstSupportedMonth = "2025-10";

function evaluatePractice(row: PreventiveRow, currentMonth: string): PracticeResult {
  const { month, practice } = row;
  const sourceThrough = practice === "B" ? row.vaccine_cutoff
    : practice === "C" ? row.individual_cutoff : earliest(row.individual_cutoff, row.procedure_cutoff);
  if (!sourceThrough || month > sourceThrough.slice(0, 7)) {
    return { status: "NO_DATA", reason: "A fonte local desta prática não alcança a competência.", sourceThrough };
  }
  if (month === currentMonth || sourceThrough < competenceEnd(month) || !row.history_start || row.history_start > `${month}-01`) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O corte da fonte ou o histórico do cadastro não cobre a competência.", sourceThrough };
  }
  if (!row.team_qualified) {
    return { status: "BLOCKED_BY_DATA_CONTRACT", reason: "O vínculo do tipo de equipe ainda não foi comprovado no PEC local.", sourceThrough };
  }
  const linkedPeople = Number(row.linked_people);
  if (!linkedPeople) {
    return { status: "NO_DATA", reason: "Sem coorte identificada no histórico do cadastro local para a prática.", sourceThrough };
  }
  const localEvidence: PracticeEvidence = {
    linkedPeople,
    peopleWithEvidence: Number(row.people_with_evidence),
    peopleWithIncompleteEvidence: Number(row.incomplete_evidence),
    missingSigtapEvidence: Number(row.missing_sigtap_evidence),
  };
  if (localEvidence.missingSigtapEvidence > 0) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "Falta a compatibilidade SIGTAP/CBO de exames no recorte.", sourceThrough, localEvidence };
  }
  return { status: "READY", sourceThrough, localEvidence };
}

export async function loadPecPreventiveCare(
  scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string,
) {
  const months = [];
  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) months.push(month);
  const nextMonth = shiftApsCompetence(currentMonth, 1);
  const rows = await queryPEC<PreventiveRow>(preventiveCareSql, [
    months, months.map(month => `${shiftApsCompetence(month, 1)}-01`),
    scope.cnes, scope.ine, Number(nextMonth.replace("-", "")) * 100 + 1,
    sigtapCompatibility, SIGTAP_FIRST_COMPETENCE, SIGTAP_LAST_COMPETENCE,
  ]);
  const byMonth = new Map<string, PreventiveCareResult>();
  for (const month of months) {
    const practices: PreventiveCareResult["practices"] = {};
    const evidence: PreventiveCareResult["evidence"] = [];
    const counts: Partial<Record<PreventivePractice, PracticeCounts>> = {};
    let excludedRecords = 0;
    for (const row of rows.filter(item => item.month === month)) {
      const result = evaluatePractice(row, currentMonth);
      practices[row.practice] = result;
      if (!result.localEvidence) continue;
      if (result.status === "READY") counts[row.practice] = result.localEvidence;
      const { label } = preventivePractices[row.practice];
      evidence.push(
        { label: `${label} · pessoas com cadastro local elegível`, value: result.localEvidence.linkedPeople },
        { label: `${label} · pessoas com evidência qualificada no PEC`, value: result.localEvidence.peopleWithEvidence },
      );
      if (result.localEvidence.peopleWithIncompleteEvidence > 0) {
        excludedRecords += result.localEvidence.peopleWithIncompleteEvidence;
        evidence.push({
          label: `${label} · pessoas com registro local pendente de qualificação`,
          value: result.localEvidence.peopleWithIncompleteEvidence,
        });
      }
      if (result.localEvidence.missingSigtapEvidence > 0) {
        evidence.push({ label: `${label} · pessoas com exame sem mapa de competência`, value: result.localEvidence.missingSigtapEvidence });
      }
    }
    if (month < preventiveFirstSupportedMonth) {
      byMonth.set(month, { status: "BLOCKED_BY_DATA_CONTRACT", reason: "A pontuação desta competência exige a versão histórica da ficha metodológica.", practices, evidence });
      continue;
    }
    const score = preventiveScore(counts);
    if (score) {
      byMonth.set(month, {
        ...score, status: "READY", practices, evidence, excludedRecords,
        limitation: "Apuração da cópia local do PEC. O resultado soma as quatro proporções ponderadas, cada uma com sua população elegível. A consolidação nacional incorpora Siaps, CadSUS e RNDS.",
      });
      continue;
    }
    const results = Object.entries(practices);
    const pending = results.filter(([, result]) => result.status !== "READY");
    const reason = pending.map(([practice, result]) => `${practice}: ${"reason" in result ? result.reason : "Cobertura pendente."}`).join(" ");
    const status: PreventiveStatus = pending.some(([, result]) => result.status === "BLOCKED_BY_DATA_CONTRACT")
      ? "BLOCKED_BY_DATA_CONTRACT"
      : results.some(([, result]) => result.status !== "NO_DATA") ? "MISSING_REQUIRED_CRITERIA" : "NO_DATA";
    byMonth.set(month, { status, reason: reason || "Sem cobertura local para as práticas de C7 nesta competência.", practices, evidence });
  }
  const range = rows[0];
  const sourceThrough = range ? earliest(range.individual_cutoff, range.procedure_cutoff, range.vaccine_cutoff) : null;
  return { byMonth, sourceThrough };
}
