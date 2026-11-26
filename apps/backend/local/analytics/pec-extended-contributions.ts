import { firstApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { competenceEnd } from "./pec-quality-source";

export type ExtendedContributionInput = PecTeamScope & {
  month: string;
  currentMonth: string;
  page: number;
  pageSize: number;
};

export function assessmentCompetences(month: string) {
  return [-3, -2, -1, 0].map(offset => shiftApsCompetence(month, offset)).filter(value => value >= firstApsCompetence);
}

// A fonte fornece coverage(cutoff, history_start) e nominal_contributions
// a partir dos mesmos fatos aceitos pelo agregado.
export async function loadExtendedContributions(
  input: ExtendedContributionInput,
  selection: string,
  sourceParams: unknown[],
  historyMonths: number,
) {
  const [cutoff, historyStart, closed, limit, offset] = Array.from({ length: 5 }, (_, index) => `$${sourceParams.length + index + 1}`);
  const rows = await queryPEC<{ cutoff: string | null; name: string | null; numerator: string; denominator: string }>(`
    WITH ${selection}, page_rows AS (
      SELECT COALESCE(NULLIF(btrim(p.no_social), ''), btrim(p.no_cidadao)) AS name,
        c.citizen, c.numerator, c.denominator
      FROM nominal_contributions c JOIN tb_cidadao p ON p.co_seq_cidadao = c.citizen
      WHERE EXISTS (SELECT 1 FROM coverage WHERE cutoff >= ${cutoff} AND history_start <= ${historyStart})
        AND ${closed}::boolean AND EXISTS (SELECT 1 FROM nominal_contributions WHERE denominator > 0)
      ORDER BY name, c.citizen LIMIT ${limit} OFFSET ${offset}
    )
    SELECT coverage.cutoff, page_rows.name, page_rows.numerator, page_rows.denominator
    FROM coverage LEFT JOIN page_rows ON true ORDER BY page_rows.name, page_rows.citizen`, [
    ...sourceParams, competenceEnd(input.month), `${shiftApsCompetence(input.month, -historyMonths)}-01`,
    input.month < input.currentMonth, input.pageSize + 1, (input.page - 1) * input.pageSize,
  ]);
  const people = rows.flatMap(row => row.name === null ? [] : [{
    name: row.name, numerator: Number(row.numerator), denominator: Number(row.denominator),
  }]);
  return {
    sourceThrough: rows[0]?.cutoff ?? null,
    rows: people.slice(0, input.pageSize),
    page: input.page,
    hasNextPage: input.page < 500 && people.length > input.pageSize,
  };
}
