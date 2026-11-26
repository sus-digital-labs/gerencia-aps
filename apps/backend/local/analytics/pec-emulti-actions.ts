import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { emultiActionsSql } from "./pec-emulti-actions-sql";
import { emultiCbos, emultiCbosFromDecember2025 } from "./pec-emulti-attendance";
import { competenceEnd } from "./pec-quality-source";

// NT nº 44/2026-CGIAD/DEAPS/SAPS/MS, processo SEI 25000.137969/2025-22.
export const emultiActionSource = {
  document: "0055952438",
  url: "https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti/nota-metodologica-m2-acoes-interprofissionais-realizadas-pela-emulti-na-aps/@@download/file",
};

export type EmultiActionResult = {
  status: "READY";
  unit: "percent";
  numerator: number;
  denominator: number;
  value: number;
  excludedRecords: number;
} | {
  status: "NO_DATA" | "MISSING_REQUIRED_CRITERIA" | "BLOCKED_BY_DATA_CONTRACT";
  reason: string;
  excludedRecords?: number;
};

type ActionRow = {
  month: string;
  cutoff: string | null;
  starts_on: string | null;
  numerator: string;
  denominator: string;
  excluded: string;
  ambiguous: string;
};

const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;

function evaluateMonth(row: ActionRow, currentMonth: string): EmultiActionResult {
  const { month, cutoff } = row;
  if (!cutoff || month > cutoff.slice(0, 7)) {
    return { status: "NO_DATA", reason: "Os registros locais de ações da eMulti não alcançam esta competência." };
  }
  const first = `${shiftApsCompetence(month, -3)}-01`;
  if (month === currentMonth || cutoff < competenceEnd(month) || !row.starts_on || row.starts_on > first) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "A cópia PEC não cobre toda a janela de quatro meses." };
  }
  const numerator = Number(row.numerator);
  const denominator = Number(row.denominator);
  const excludedRecords = Number(row.excluded);
  const ambiguous = Number(row.ambiguous);
  if (ambiguous > 0) {
    return {
      status: "MISSING_REQUIRED_CRITERIA",
      reason: "Uma possível duplicidade de atividade coletiva exige identificar o grupo de participantes.",
      excludedRecords: excludedRecords + ambiguous,
    };
  }
  if (denominator === 0) {
    return excludedRecords > 0
      ? { status: "MISSING_REQUIRED_CRITERIA", reason: "Os registros do recorte carecem de critérios para qualificar ações da eMulti.", excludedRecords }
      : { status: "NO_DATA", reason: "Nenhuma ação elegível da eMulti para este CNES e INE na janela." };
  }
  return { status: "READY", numerator, denominator, unit: "percent", value: (100 * numerator) / denominator, excludedRecords };
}

export async function loadPecEmultiActions(
  scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string,
) {
  const months = [];
  for (let month = firstMonth; month <= lastMonth; month = shiftApsCompetence(month, 1)) months.push(month);
  const rows = await queryPEC<ActionRow>(emultiActionsSql, [
    months,
    months.map(month => dateKey(shiftApsCompetence(month, -3))),
    months.map(month => dateKey(shiftApsCompetence(month, 1))),
    scope.cnes, scope.ine, emultiCbos, emultiCbosFromDecember2025, dateKey(shiftApsCompetence(currentMonth, 1)),
  ]);
  return {
    byMonth: new Map(rows.map(row => [row.month, evaluateMonth(row, currentMonth)])),
    sourceThrough: rows[0]?.cutoff ?? null,
  };
}
