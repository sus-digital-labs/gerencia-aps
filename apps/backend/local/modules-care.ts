import { z } from "zod";
import { currentApsCompetence, shiftApsCompetence } from "@shared/aps-competence";
import { pecTeamScopeSchema } from "@shared/pec-scope";
import { loadPecPreventiveCare, preventiveCareSource } from "./analytics/pec-preventive-care";
import { competenceEnd } from "./analytics/pec-quality-source";
import { apsCompetenceSchema } from "./indicators";
import { queryPEC } from "./pec-db";
import { requireActiveTeam } from "./pec-directory";

export const vigilanceRequestSchema = pecTeamScopeSchema.extend({ month: apsCompetenceSchema });
export const womensHealthRequestSchema = vigilanceRequestSchema;

type VectorActions = {
  visits: number;
  control: number;
  education: number;
  focus: number;
  mechanical: number;
  treatment: number;
};
type VectorData = {
  through: string | null;
  byArea: (VectorActions & { area: string })[];
};

const dateKey = (month: string) => Number(month.replace("-", "")) * 100 + 1;

export async function loadVigilance(input: z.infer<typeof vigilanceRequestSchema>) {
  const team = await requireActiveTeam(input);
  const nextMonth = shiftApsCompetence(input.month, 1);
  const currentMonth = currentApsCompetence();
  const [data] = await queryPEC<VectorData>(`
    WITH source_through AS (
      SELECT d.dt_registro::text AS cutoff FROM tb_dim_tempo d
      WHERE d.co_seq_dim_tempo=(SELECT max(co_dim_tempo) FROM tb_fat_visita_domiciliar
        WHERE co_dim_tempo<=to_char(current_date,'YYYYMMDD')::integer)
        AND d.co_seq_dim_tempo::text=to_char(d.dt_registro,'YYYYMMDD')
    ), conducted AS (
      SELECT CASE
          WHEN btrim(v.nu_micro_area) ~ '^[0-9]{2}$' THEN btrim(v.nu_micro_area)
          WHEN upper(btrim(v.nu_micro_area))='FA' THEN 'fora'
          ELSE 'sem'
        END AS area,
        v.st_mot_vis_ctrl_ambnte_vetor=1 AS control,
        v.st_ctrl_amb_vet_acao_educativa=1 AS education,
        v.st_ctrl_amb_vet_imovel_foco=1 AS focus,
        v.st_ctrl_amb_vet_acao_mecanica=1 AS mechanical,
        v.st_ctrl_amb_vet_tratamnt_focal=1 AS treatment
      FROM tb_fat_visita_domiciliar v
      JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=v.co_dim_equipe AND e.nu_ine=$2
      JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=v.co_dim_unidade_saude AND u.nu_cnes=$1
      JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=v.co_dim_tipo_ficha AND k.nu_identificador IN ('8','9')
      JOIN tb_dim_desfecho_visita o ON o.co_seq_dim_desfecho_visita=v.co_dim_desfecho_visita AND o.nu_identificador='1'
      JOIN tb_dim_tempo d ON d.co_seq_dim_tempo=v.co_dim_tempo
        AND d.co_seq_dim_tempo::text=to_char(d.dt_registro,'YYYYMMDD')
      WHERE v.co_dim_tempo >= $3 AND v.co_dim_tempo < $4 AND d.dt_registro <= current_date
    ), per_area AS (
      SELECT area, count(*)::integer AS visits,
        count(*) FILTER (WHERE control OR education OR focus OR mechanical OR treatment)::integer AS control,
        count(*) FILTER (WHERE education)::integer AS education,
        count(*) FILTER (WHERE focus)::integer AS focus,
        count(*) FILTER (WHERE mechanical)::integer AS mechanical,
        count(*) FILTER (WHERE treatment)::integer AS treatment
      FROM conducted GROUP BY area
    )
    SELECT (SELECT cutoff FROM source_through) AS through,
      coalesce((SELECT json_agg(per_area ORDER BY area) FROM per_area),'[]'::json) AS "byArea"
  `, [team.cnes, team.ine, dateKey(input.month), dateKey(nextMonth)]);

  return {
    ...data, month: input.month,
    closed: Boolean(input.month < currentMonth && data.through && data.through >= competenceEnd(input.month)),
  };
}

export async function loadWomensHealth(input: z.infer<typeof womensHealthRequestSchema>) {
  const team = await requireActiveTeam(input);
  const applicable = team.typeCode === "70" || team.typeCode === "76";
  const method = preventiveCareSource;
  if (!applicable) return { applicable, method, result: null };
  const { byMonth } = await loadPecPreventiveCare(team, input.month, input.month, currentApsCompetence());
  return { applicable, method, result: byMonth.get(input.month) ?? null };
}
