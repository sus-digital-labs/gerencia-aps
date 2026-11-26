import { TRPCError } from "@trpc/server";
import { shiftApsCompetence } from "@shared/aps-competence";
import type { PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { pecLocalPerson } from "./pec-identity-sql";

// As of the last day of each competence. Enrollment, team and territorial
// changes recorded after that date cannot change a historical denominator.
export const dentalReferencePopulationSql = `WITH periods AS (
    SELECT to_char(start_day, 'YYYY-MM') AS month,
      (start_day + interval '1 month')::date AS end_date,
      to_char(start_day + interval '1 month', 'YYYYMMDD')::bigint AS end_key,
      to_char(start_day - interval '23 months', 'YYYYMMDD')::bigint AS first_key
    FROM generate_series($3::date, $4::date, interval '1 month') start_day
  ), teams AS (
    SELECT DISTINCT ON (p.month, h.co_seq_equipe)
      p.month, h.co_seq_equipe AS id, h.co_unidade_saude AS unit_id, btrim(h.nu_ine) AS ine,
      ty.nu_ms AS kind, (h.co_tipo_auditoria IN ('I','U') AND h.st_ativo = 1) AS active
    FROM periods p JOIN ta_equipe h ON h.dt_auditoria < p.end_date
    JOIN tb_tipo_equipe ty ON ty.co_seq_tipo_equipe = h.tp_equipe
    ORDER BY p.month, h.co_seq_equipe, h.dt_auditoria DESC, h.co_seq_taequipe DESC
  ), units AS (
    SELECT DISTINCT ON (p.month, h.co_seq_unidade_saude)
      p.month, h.co_seq_unidade_saude AS id, h.co_localidade_endereco AS municipality, btrim(h.nu_cnes) AS cnes,
      (h.co_tipo_auditoria IN ('I','U') AND h.st_ativo = 1) AS active
    FROM periods p JOIN ta_unidade_saude h ON h.dt_auditoria < p.end_date
    ORDER BY p.month, h.co_seq_unidade_saude, h.dt_auditoria DESC, h.co_seq_taunidadesaude DESC
  ), target AS (
    SELECT t.month, min(t.id) AS id, min(u.municipality) AS municipality
    FROM teams t JOIN units u ON u.month = t.month AND u.id = t.unit_id
    WHERE t.active AND u.active AND t.kind = '71' AND t.ine = $2 AND u.cnes = $1
    GROUP BY t.month HAVING count(*) = 1
  ), link_history AS (
    SELECT DISTINCT ON (p.month, h.co_seq_vinculacao_equipes)
      p.month, h.co_equipe_principal AS dental, h.co_equipe_vinculada AS reference, h.dt_auditoria,
      h.co_tipo_auditoria
    FROM periods p JOIN ta_vinculacao_equipes h ON h.dt_auditoria < p.end_date
    ORDER BY p.month, h.co_seq_vinculacao_equipes, h.dt_auditoria DESC, h.co_seq_tavinculacaoequipes DESC
  ), links AS (
    SELECT h.month, h.dental, h.reference, r.kind,
      (r.active AND u.active AND r.kind IN ('70','76')
        AND r.ine ~ '^[0-9]{10}$' AND u.cnes ~ '^[0-9]{7}$') IS TRUE AS reference_valid,
      r.ine, u.cnes,
      EXISTS (
        SELECT 1 FROM tb_importacao_cnes imp
        WHERE imp.co_localidade = d.municipality AND imp.dt_relatorio::date = h.dt_auditoria::date
          AND (imp.nu_vinc_equipes_novas > 0 OR imp.nu_vinc_equipes_atualizadas > 0)
      ) AS imported,
      EXISTS (
        SELECT 1 FROM link_history other
        JOIN teams e ON e.month = other.month AND e.id = other.dental AND e.kind = '71' AND e.active
        JOIN units eu ON eu.month = e.month AND eu.id = e.unit_id AND eu.active
        WHERE other.month = h.month AND other.reference = h.reference AND other.dental <> h.dental
          AND other.co_tipo_auditoria IN ('I','U')
      ) AS shared
    FROM target d JOIN link_history h ON h.month = d.month AND h.dental = d.id
    LEFT JOIN teams r ON r.month = h.month AND r.id = h.reference
    LEFT JOIN units u ON u.month = h.month AND u.id = r.unit_id
    WHERE h.co_tipo_auditoria IN ('I','U')
  ), reference_status AS (
    SELECT month, count(*) AS links,
      bool_and(reference_valid AND imported) AND count(*) = count(DISTINCT (cnes,ine)) AS verified,
      NOT bool_or(shared) AND (count(*) = 1 OR (count(*) = 2 AND bool_and(kind = '76'))) AS unshared
    FROM links GROUP BY month
  ), reference_pairs AS (
    SELECT DISTINCT l.month, l.cnes, l.ine
    FROM links l JOIN reference_status s USING (month) WHERE s.verified AND s.unshared
  ), candidates AS (
    SELECT DISTINCT p.month, h.co_cidadao AS citizen
    FROM reference_pairs p JOIN ta_cidadao_vinculacao_equipe h ON h.nu_cnes = p.cnes AND h.nu_ine = p.ine
    JOIN periods d ON d.month = p.month AND h.dt_auditoria < d.end_date
  ), current_enrollment AS (
    SELECT DISTINCT ON (c.month, c.citizen) c.month, c.citizen, h.nu_cnes, h.nu_ine,
      h.co_unico_cadastro_individual AS individual_form, h.co_tipo_auditoria,
      h.st_usar_cadastro_individual, h.st_saida_cadastro_obito, h.st_saida_cadastro_territorio, h.dt_atualizacao_cadastro
    FROM candidates c JOIN periods p ON p.month = c.month
    JOIN ta_cidadao_vinculacao_equipe h ON h.co_cidadao = c.citizen AND h.dt_auditoria < p.end_date
    ORDER BY c.month, c.citizen, h.dt_auditoria DESC, h.co_seq_tacidadaovinculacaoequp DESC
  ), roster AS (
    SELECT h.*
    FROM current_enrollment h JOIN reference_pairs r ON r.month = h.month AND r.cnes = h.nu_cnes AND r.ine = h.nu_ine
    WHERE h.co_tipo_auditoria IN ('I','U') AND h.st_usar_cadastro_individual = 1
      AND h.st_saida_cadastro_obito = 0 AND h.st_saida_cadastro_territorio = 0
  ), citizens AS (
    SELECT DISTINCT ON (r.month, r.citizen) r.month, r.citizen, r.individual_form, r.nu_cnes, r.nu_ine,
      r.dt_atualizacao_cadastro, p.first_key, p.end_key, p.end_date, h.dt_nascimento,
      CASE WHEN h.co_tipo_auditoria IN ('I','U') AND h.st_ativo = 1 AND h.st_ativo_para_exibicao = 1
        AND COALESCE(h.st_fora_area, 0) = 0 AND h.dt_nascimento < p.end_date
        AND (h.st_faleceu = 0 AND h.dt_obito IS NULL OR h.dt_obito >= p.end_date)
        THEN ${pecLocalPerson("h")} END AS identity
    FROM roster r JOIN periods p ON p.month = r.month
    JOIN ta_cidadao h ON h.co_seq_cidadao = r.citizen AND h.dt_auditoria < p.end_date
    ORDER BY r.month, r.citizen, h.dt_auditoria DESC, h.co_seq_tacidadao DESC
  ), qualified AS (
    SELECT x.month, x.identity, x.dt_nascimento, x.end_date
    FROM citizens x
    WHERE x.identity IS NOT NULL
      AND x.dt_atualizacao_cadastro < (x.end_date::timestamp AT TIME ZONE 'America/Bahia')
      AND EXISTS (
        SELECT 1 FROM tb_fat_cad_individual f
        JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec = f.co_fat_cidadao_pec AND cp.co_cidadao = x.citizen
        JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha = f.co_dim_tipo_ficha AND k.nu_identificador = '2'
        JOIN tb_dim_equipe e ON e.co_seq_dim_equipe = f.co_dim_equipe AND e.nu_ine = x.nu_ine
        JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude = f.co_dim_unidade_saude AND u.nu_cnes = x.nu_cnes
        WHERE f.nu_uuid_ficha = x.individual_form AND f.dt_nascimento = x.dt_nascimento
          AND f.co_dim_tempo >= x.first_key AND f.co_dim_tempo < x.end_key AND f.co_dim_tempo_validade >= x.end_key
          AND f.st_ficha_inativa = 0 AND f.st_recusa_cadastro = 0 AND coalesce(upper(btrim(f.nu_micro_area)), '') <> 'FA'
      )
  ), identified AS (
    SELECT month, identity, min(dt_nascimento) AS birth, min(end_date) AS end_date
    FROM qualified GROUP BY month, identity HAVING count(DISTINCT dt_nascimento) = 1
  ), counts AS (
    SELECT month, count(*) AS people,
      count(*) FILTER (WHERE extract(year FROM age((end_date - 1)::timestamp, birth::timestamp)) BETWEEN 6 AND 12) AS children
    FROM identified GROUP BY month
  ), coverage AS (
    SELECT (SELECT max(co_dim_tempo) FROM tb_fat_cad_individual WHERE co_dim_tempo > 0 AND co_dim_tempo < $5) AS cutoff
  )
  SELECT p.month, coalesce(s.links,0) AS links,
    coalesce(s.verified,false) AS verified, coalesce(s.unshared,false) AS unshared,
    coalesce(r.registered,0) AS registered, coalesce(c.people,0) AS people, coalesce(c.children,0) AS children,
    to_char(t.dt_registro, 'YYYY-MM-DD') AS cutoff
  FROM periods p CROSS JOIN coverage v
  LEFT JOIN tb_dim_tempo t ON t.co_seq_dim_tempo = v.cutoff AND t.co_seq_dim_tempo::text = to_char(t.dt_registro, 'YYYYMMDD')
  LEFT JOIN reference_status s USING (month)
  LEFT JOIN (SELECT month, count(*) AS registered FROM roster GROUP BY month) r USING (month)
  LEFT JOIN counts c USING (month)`;

export type DentalReferenceRow = {
  month: string;
  links: string;
  verified: boolean;
  unshared: boolean;
  registered: string;
  people: string;
  children: string;
  cutoff: string | null;
};

export async function loadDentalReferencePopulation(
  scope: PecTeamScope, firstMonth: string, lastMonth: string, currentMonth: string,
) {
  try {
    const nextKey = Number(shiftApsCompetence(currentMonth, 1).replace("-", "")) * 100 + 1;
    const rows = await queryPEC<DentalReferenceRow>(dentalReferencePopulationSql,
      [scope.cnes, scope.ine, `${firstMonth}-01`, `${lastMonth}-01`, nextKey]);
    return new Map(rows.map(row => [row.month, row]));
  } catch (error) {
    if (error instanceof TRPCError && (error.code === "SERVICE_UNAVAILABLE" || error.code === "TOO_MANY_REQUESTS")) return null;
    throw error;
  }
}
