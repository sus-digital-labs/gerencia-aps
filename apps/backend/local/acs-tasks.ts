import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  acsDateKey, acsMicroareaSql, acsPageSize, acsPeriod, acsPeriodValues, acsTasksSchema,
} from "./acs-visits";
import { getAcsTaskState, isAcsTaskToken, type AcsTaskStatus } from "./acs-state";
import { queryPEC } from "./pec-db";

type AcsTasks = z.infer<typeof acsTasksSchema>;
type Candidate = {
  person: string; day: string; name: string; professional: string | null; area: string; outcome: "2" | "3";
};
export const acsTaskUpdateSchema = z.strictObject({
  token: z.string().refine(isAcsTaskToken),
  status: z.enum(["open", "completed"]),
});

const candidatesSql = `
  WITH unit_dim AS (SELECT co_seq_dim_unidade_saude AS id FROM tb_dim_unidade_saude WHERE nu_cnes=$1),
  team_dim AS (SELECT co_seq_dim_equipe AS id FROM tb_dim_equipe WHERE nu_ine=$2),
  actors AS (SELECT co_seq_dim_cbo AS id FROM tb_dim_cbo WHERE nu_cbo IN ('515105','322255')),
  outcomes AS (
    SELECT co_seq_dim_desfecho_visita AS id, nu_identificador AS code
    FROM tb_dim_desfecho_visita WHERE nu_identificador IN ('1','2','3')
  ), candidates AS (
    SELECT DISTINCT ON (c.co_seq_cidadao) c.co_seq_cidadao AS person, f.co_dim_tempo AS day, o.code AS outcome,
      f.co_dim_profissional AS actor, ${acsMicroareaSql("f.nu_micro_area")} AS area,
      coalesce(nullif(btrim(c.no_social), ''), nullif(btrim(c.no_cidadao), '')) AS name
    FROM tb_fat_visita_domiciliar f
    JOIN outcomes o ON o.id=f.co_dim_desfecho_visita AND o.code IN ('2','3')
    JOIN tb_fat_cidadao_pec p ON p.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec
    JOIN tb_cidadao c ON c.co_seq_cidadao=p.co_cidadao
    JOIN tb_cidadao_vinculacao_equipe l ON l.co_cidadao=c.co_seq_cidadao AND l.nu_cnes=$1 AND l.nu_ine=$2
    WHERE f.co_dim_tempo BETWEEN $3 AND $4
      AND f.co_dim_unidade_saude IN (SELECT id FROM unit_dim)
      AND f.co_dim_equipe IN (SELECT id FROM team_dim)
      AND f.co_dim_cbo IN (SELECT id FROM actors)
      AND l.st_saida_cadastro_obito=0 AND l.st_saida_cadastro_territorio=0
      AND c.st_ativo=1 AND c.st_ativo_para_exibicao=1 AND c.st_faleceu=0 AND c.dt_obito IS NULL
      AND (nullif(btrim(c.no_social),'') IS NOT NULL OR nullif(btrim(c.no_cidadao),'') IS NOT NULL)
    ORDER BY c.co_seq_cidadao, f.co_dim_tempo DESC, o.code, f.co_seq_fat_visita_domiciliar DESC
  )
  SELECT c.person::text, to_char(to_date(c.day::text, 'YYYYMMDD'), 'YYYY-MM-DD') AS day,
    c.name, c.area, c.outcome,
    nullif(btrim(pro.no_profissional),'') AS professional
  FROM candidates c
  LEFT JOIN tb_dim_profissional pro ON pro.co_seq_dim_profissional=c.actor AND pro.st_registro_valido=1
  WHERE ($6::text IS NULL OR c.area=$6) AND NOT EXISTS (
    SELECT 1 FROM tb_fat_cidadao_pec p
    JOIN tb_fat_visita_domiciliar v ON v.co_fat_cidadao_pec=p.co_seq_fat_cidadao_pec
    JOIN outcomes o ON o.id=v.co_dim_desfecho_visita
    WHERE p.co_cidadao=c.person AND v.co_dim_tempo BETWEEN c.day AND $5
      AND v.co_dim_unidade_saude IN (SELECT id FROM unit_dim)
      AND v.co_dim_equipe IN (SELECT id FROM team_dim)
      AND v.co_dim_cbo IN (SELECT id FROM actors)
      AND (o.code='1' OR v.co_dim_tempo>c.day)
  )
  ORDER BY c.day DESC, c.name, c.person
`;

export async function loadAcsTasks(input: AcsTasks) {
  const period = await acsPeriod(input);
  const candidates = period.latestObserved && period.coverage !== "outside" ? await queryPEC<Candidate>(candidatesSql, [
    ...acsPeriodValues(input, period), acsDateKey(period.latestObserved), input.area ?? null,
  ]) : [];
  let store = getAcsTaskState();
  const keys = candidates.map(item => store?.key([
    "acs-review/v1", input.cnes, input.ine, item.person, item.day, item.outcome,
  ].join("/")) ?? "");
  let states: ReturnType<NonNullable<typeof store>["read"]> | undefined;
  try {
    states = store?.read(keys);
  } catch {
    store = undefined;
  }
  const openCount = store ? candidates.length - [...(states?.values() ?? [])].filter(item => item.status === "completed").length : null;
  const offset = (input.page - 1) * acsPageSize;
  const filtered = candidates.flatMap(({ person: _person, ...item }, index) => {
    const key = keys[index];
    const state = states?.get(key);
    const status = store ? state?.status ?? "open" : null;
    if (input.status !== "all" && status !== input.status && (status || input.status === "completed")) return [];
    return { ...item, status, updatedAt: state?.updatedAt ?? null, key };
  });
  const rows = filtered.slice(offset, offset + acsPageSize).map(({ key, ...row }) => (
    { ...row, token: store?.handle(key) ?? null }
  ));
  return {
    rows, period, stateAvailable: Boolean(store), page: input.page, total: filtered.length,
    hasNextPage: input.page < 999 && filtered.length > offset + acsPageSize,
    counts: { candidates: candidates.length, open: openCount, completed: openCount === null ? null : candidates.length - openCount },
  };
}

export function updateAcsTask(input: { token: string; status: AcsTaskStatus }) {
  const store = getAcsTaskState();
  if (!store) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "O armazenamento local de tarefas está indisponível." });
  let state: ReturnType<typeof store.update>;
  try {
    state = store.update(input.token, input.status);
  } catch {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "O armazenamento local de tarefas não confirmou a alteração. Tente novamente." });
  }
  if (!state) throw new TRPCError({ code: "CONFLICT", message: "Esta tarefa precisa ser consultada novamente antes de alterar a situação." });
  return state;
}
