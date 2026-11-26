import { TRPCError } from "@trpc/server";
import { CVAT_NOMINAL_CODES } from "@shared/aps-indicators";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { competenceEnd } from "./pec-quality-source";
import { territorialAggregateSql, territorialCtes } from "./pec-cvat-sql";

export type LocalCvatCode = (typeof CVAT_NOMINAL_CODES)[number];
export type TerritorialPopulation = {
  month: string;
  cutoff: string | null;
  candidates: number;
  linked: number;
  valid: number;
  complete: number;
  recent_individual: number;
  recent_household: number;
  recent_both: number;
  tracked: number | null;
  demographic: number | null;
};

const contributes: Record<LocalCvatCode, string> = {
  CVAT1: "r.individual IS NOT NULL",
  CVAT2: "r.household IS NOT NULL",
  CVAT3: "(r.individual >= r.renewal_start AND r.household >= r.renewal_start) IS TRUE",
  CVAT4: "t.person IS NOT NULL",
};

export async function loadPecTerritorialEvidence(scope: PecTeamScope, months: string[], withContacts: boolean) {
  const rows = await queryPEC<TerritorialPopulation>(
    territorialAggregateSql(withContacts), [scope.cnes, scope.ine, months], { setBased: true },
  );
  return { sourceThrough: rows[0]?.cutoff ?? null, byMonth: new Map(rows.map(row => [row.month, row])) };
}

export function territorialLocalMetric(row: TerritorialPopulation, code: LocalCvatCode, currentMonth: string) {
  if (row.month >= currentMonth || !row.cutoff || row.cutoff < competenceEnd(row.month)) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "O histórico do PEC local ainda não cobre o fechamento da competência." } as const;
  }
  if (row.linked === 0) {
    return { status: "NO_DATA", reason: "Sem população vinculada identificável no PEC para a unidade, equipe e mês." } as const;
  }
  const count = { CVAT1: row.valid, CVAT2: row.complete, CVAT3: row.recent_both, CVAT4: row.tracked }[code];
  if (count === null) {
    return { status: "MISSING_REQUIRED_CRITERIA", reason: "A fonte de contatos assistenciais não retornou o recorte." } as const;
  }
  const evidence = [{ label: "Pessoas vinculadas identificadas no PEC", value: row.linked }];
  if (code === "CVAT3") {
    evidence.push(
      { label: "MICI atualizado em até 24 meses", value: row.recent_individual },
      { label: "MICDT atualizado em até 24 meses", value: row.recent_household },
      { label: "MICI e MICDT atualizados", value: row.recent_both },
    );
  }
  if (code === "CVAT4" && row.demographic !== null) {
    evidence.push({ label: "Acompanhados com menos de 5 ou 60 anos ou mais", value: row.demographic });
  }
  return {
    status: "READY" as const,
    unit: "percent" as const,
    numerator: count,
    denominator: row.linked,
    value: 100 * count / row.linked,
    concept: null,
    excludedRecords: row.candidates - row.linked,
    evidence,
    limitation: code === "CVAT3"
      ? "A proporção mede pessoas com os dois modelos atualizados. A contagem de cada modelo aparece separadamente."
      : "Monitoramento sobre a população identificada e vinculada no PEC local. A nota federal usa a população de referência do Siaps.",
  };
}

export async function loadCvatContributions(input: PecTeamScope & {
  code: LocalCvatCode; month: string; page: number; pageSize: number; contribution?: "counted" | "pending";
}) {
  const withContacts = input.code === "CVAT4";
  const filter = input.contribution === undefined ? null : input.contribution === "counted";
  const rows = await queryPEC<{ cutoff: string | null; name: string | null; counted: boolean | null }>(`
    WITH ${territorialCtes(withContacts)}, page_rows AS (
      SELECT COALESCE(NULLIF(btrim(c.no_social), ''), btrim(c.no_cidadao)) AS name,
        r.person, (${contributes[input.code]}) AS counted
      FROM roster r JOIN tb_cidadao c ON c.co_seq_cidadao = r.person
      ${withContacts ? "LEFT JOIN tracked t ON t.month = r.month AND t.person = r.person" : ""}
      WHERE (SELECT day FROM cutoff) >= $4
        AND ($7::boolean IS NULL OR (${contributes[input.code]}) = $7)
      ORDER BY name, r.person LIMIT $5 OFFSET $6
    )
    SELECT cutoff.day AS cutoff, page_rows.name, page_rows.counted
    FROM cutoff LEFT JOIN page_rows ON true ORDER BY page_rows.name, page_rows.person
  `, [input.cnes, input.ine, [input.month], competenceEnd(input.month), input.pageSize + 1, (input.page - 1) * input.pageSize,
    filter], { setBased: true });
  const sourceThrough = rows[0]?.cutoff ?? null;
  if (!sourceThrough || sourceThrough < competenceEnd(input.month)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A cópia do PEC ainda não cobre toda a competência." });
  }
  const people = rows.flatMap(row => row.name === null ? [] : [{
    name: row.name, numerator: row.counted ? 1 : 0, denominator: 1,
  }]);
  return { sourceThrough, rows: people.slice(0, input.pageSize), page: input.page, hasNextPage: input.page < 500 && people.length > input.pageSize };
}
