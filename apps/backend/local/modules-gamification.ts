import { z } from "zod";
import { currentApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import { competenceEnd } from "./analytics/pec-quality-source";
import { AggregateCache } from "./cache";
import { apsCompetenceSchema } from "./indicators";
import { queryPEC } from "./pec-db";
import { listPecTeams } from "./pec-directory";

export const gamificationRequestSchema = z.object({ month: apsCompetenceSchema });

type Production = {
  attendances: number;
  visits: number;
  doses: number;
};

type ProductionRow = {
  cnes: string;
  ine: string;
} & Production;

type ProductionData = {
  coverage: { attendances: string | null; visits: string | null; doses: string | null };
  teams: ProductionRow[];
};

const sql = `
  WITH selected AS (
    SELECT * FROM unnest($1::text[], $2::text[]) AS s(cnes,ine)
  ), latest_dates AS (
    SELECT
      (SELECT max(f.co_dim_tempo) FROM tb_fat_atendimento_individual f WHERE f.co_dim_tempo<=$5) AS attendance_day,
      (SELECT max(f.co_dim_tempo) FROM tb_fat_visita_domiciliar f WHERE f.co_dim_tempo<=$5) AS visit_day,
      (SELECT max(v.co_dim_tempo_vacina_aplicada) FROM tb_fat_vacinacao_vacina v
        WHERE v.co_dim_tempo_vacina_aplicada<=$5) AS dose_day
  ), coverage AS (
    SELECT attendance.dt_registro::text AS attendances, visit.dt_registro::text AS visits, dose.dt_registro::text AS doses
    FROM latest_dates
    LEFT JOIN tb_dim_tempo attendance ON attendance.co_seq_dim_tempo=attendance_day
      AND attendance.co_seq_dim_tempo::text=to_char(attendance.dt_registro,'YYYYMMDD')
    LEFT JOIN tb_dim_tempo visit ON visit.co_seq_dim_tempo=visit_day
      AND visit.co_seq_dim_tempo::text=to_char(visit.dt_registro,'YYYYMMDD')
    LEFT JOIN tb_dim_tempo dose ON dose.co_seq_dim_tempo=dose_day
      AND dose.co_seq_dim_tempo::text=to_char(dose.dt_registro,'YYYYMMDD')
  ), production AS (
    SELECT s.cnes,s.ine,count(*)::integer AS attendances,0 AS visits,0 AS doses
    FROM tb_fat_atendimento_individual f
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=f.co_dim_equipe_1
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=f.co_dim_unidade_saude_1
    JOIN selected s ON s.cnes=u.nu_cnes AND s.ine=e.nu_ine
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('4','9')
    JOIN tb_dim_tempo day ON day.co_seq_dim_tempo=f.co_dim_tempo
      AND day.co_seq_dim_tempo::text=to_char(day.dt_registro,'YYYYMMDD')
    WHERE f.co_dim_tempo >= $3 AND f.co_dim_tempo < $4 AND f.co_dim_tempo <= $5
    GROUP BY s.cnes,s.ine
    UNION ALL
    SELECT s.cnes,s.ine,0,count(*)::integer,0
    FROM tb_fat_visita_domiciliar f
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=f.co_dim_equipe
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=f.co_dim_unidade_saude
    JOIN selected s ON s.cnes=u.nu_cnes AND s.ine=e.nu_ine
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('8','9')
    JOIN tb_dim_desfecho_visita o ON o.co_seq_dim_desfecho_visita=f.co_dim_desfecho_visita AND o.nu_identificador='1'
    JOIN tb_dim_tempo day ON day.co_seq_dim_tempo=f.co_dim_tempo
      AND day.co_seq_dim_tempo::text=to_char(day.dt_registro,'YYYYMMDD')
    WHERE f.co_dim_tempo >= $3 AND f.co_dim_tempo < $4 AND f.co_dim_tempo <= $5
    GROUP BY s.cnes,s.ine
    UNION ALL
    SELECT s.cnes,s.ine,0,0,count(*)::integer
    FROM tb_fat_vacinacao_vacina f
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=f.co_dim_equipe
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=f.co_dim_unidade_saude
    JOIN selected s ON s.cnes=u.nu_cnes AND s.ine=e.nu_ine
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('14','9')
    JOIN tb_dim_tempo day ON day.co_seq_dim_tempo=f.co_dim_tempo_vacina_aplicada
      AND day.co_seq_dim_tempo::text=to_char(day.dt_registro,'YYYYMMDD')
    WHERE f.co_dim_tempo_vacina_aplicada >= $3 AND f.co_dim_tempo_vacina_aplicada < $4
      AND f.co_dim_tempo_vacina_aplicada <= $5
      AND f.st_registro_anterior=0 AND coalesce(f.st_aplicado_exterior,0)=0
    GROUP BY s.cnes,s.ine
  ), team_counts AS (
    SELECT cnes,ine,sum(attendances)::integer AS attendances,sum(visits)::integer AS visits,sum(doses)::integer AS doses
    FROM production GROUP BY cnes,ine
  )
  SELECT (SELECT row_to_json(coverage) FROM coverage) AS coverage,
    coalesce((SELECT json_agg(team_counts ORDER BY cnes,ine) FROM team_counts),'[]'::json) AS teams
`;

const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;
const emptyProduction = { attendances: 0, visits: 0, doses: 0 };

async function readGamification(month: string) {
  const active = (await listPecTeams()).filter(team => team.typeCode === "70" || team.typeCode === "76");
  const throughDay = Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
  const [data] = await queryPEC<ProductionData>(sql, [
    active.map(team => team.cnes), active.map(team => team.ine),
    dateKey(month), dateKey(shiftApsCompetence(month, 1)), throughDay,
  ], { setBased: true });

  const closure = competenceEnd(month);
  const closed = month < currentApsCompetence() &&
    Object.values(data.coverage).every(date => date !== null && date >= closure);
  const counts = new Map(data.teams.map(team => [`${team.cnes}/${team.ine}`, team]));
  const teams = active.map(team => {
    const { attendances, visits, doses } = counts.get(`${team.cnes}/${team.ine}`) ?? emptyProduction;
    // Documented municipal leaderboard formula. Weight and round both counts independently.
    const score = attendances + Math.round(visits * 0.35) + Math.round(doses * 0.20);
    const hasProduction = attendances + visits + doses > 0;
    return {
      cnes: team.cnes, ine: team.ine, name: team.name, unitName: team.unitName,
      attendances, visits, doses, score: closed && hasProduction ? score : null,
    };
  }).sort((left, right) => (right.score ?? -1) - (left.score ?? -1) ||
    left.name.localeCompare(right.name, "pt-BR") || left.ine.localeCompare(right.ine));
  let lastScore: number | null = null;
  let position = 0;
  const standings = teams.map((team, index) => {
    if (team.score === null) return { ...team, position: null };
    if (team.score !== lastScore) {
      position = index + 1;
      lastScore = team.score;
    }
    return { ...team, position };
  });
  return { month, closed, coverage: data.coverage, teams: standings };
}

const cache = new AggregateCache<Awaited<ReturnType<typeof readGamification>>>(300_000, 24);
export async function loadGamification({ month }: z.infer<typeof gamificationRequestSchema>) {
  return (await cache.read(month, () => readGamification(month), value => value.closed)).value;
}
