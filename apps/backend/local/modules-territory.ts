import { pecTeamScopeSchema, type PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "./pec-db";
import { requireActiveTeam } from "./pec-directory";

export const territoryRequestSchema = pecTeamScopeSchema;

export type TerritoryArea = {
  area: string;
  people: number;
  dwellings: number;
  families: number;
  georeferenced: number;
  recordingAgents: number;
};

type TerritoryCell = { latitude: number; longitude: number; dwellings: number };
type TerritoryData = {
  areas: TerritoryArea[];
  cells: TerritoryCell[];
  lastDomicileForm: string | null;
};

// Publish only aggregate cells of 0.01 degrees with at least five residences.
// The browser receives neither the original coordinates nor any household identifier.
const territorySql = `
  WITH latest_domicile AS (
    SELECT DISTINCT ON (coalesce(nullif(btrim(f.nu_uuid_ficha_origem),''), btrim(f.nu_uuid_ficha)))
      f.co_seq_fat_cad_domiciliar AS domicile, f.co_dim_unidade_saude, f.co_dim_equipe, f.co_dim_tempo,
      CASE WHEN btrim(f.nu_micro_area) ~ '^[0-9]{2}$' THEN btrim(f.nu_micro_area) END AS area,
      upper(btrim(f.nu_micro_area)) = 'FA' AS outside_area,
      f.nu_latitude AS latitude, f.nu_longitude AS longitude,
      (f.nu_latitude BETWEEN -35 AND 6 AND f.nu_longitude BETWEEN -74 AND -28) IS TRUE AS has_coordinates
    FROM tb_fat_cad_domiciliar f
    JOIN tb_dim_tipo_imovel kind ON kind.co_seq_dim_tipo_imovel = f.co_dim_tipo_imovel AND kind.nu_identificador = '1'
    -- This PEC version uses 30001231 as the expiry of current domicile forms.
    WHERE f.co_dim_tempo_validade = 30001231 AND f.st_ativo = 1 AND f.st_recusa_cadastro = 0
      AND (nullif(btrim(f.nu_uuid_ficha_origem),'') IS NOT NULL OR nullif(btrim(f.nu_uuid_ficha),'') IS NOT NULL)
    ORDER BY coalesce(nullif(btrim(f.nu_uuid_ficha_origem),''), btrim(f.nu_uuid_ficha)),
      f.co_dim_tempo DESC, f.co_seq_fat_cad_domiciliar DESC
  ),
  roster AS (
    SELECT DISTINCT c.co_seq_cidadao AS person,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM tb_cidadao_vinculacao_equipe another
          WHERE another.co_cidadao=c.co_seq_cidadao
            AND another.st_saida_cadastro_obito=0 AND another.st_saida_cadastro_territorio=0
            AND another.nu_cnes ~ '^[0-9]{7}$' AND another.nu_ine ~ '^[0-9]{10}$'
            AND (another.nu_cnes, another.nu_ine) <> ($1, $2)
        ) THEN 'conflito'
        WHEN c.st_fora_area=1 OR upper(btrim(c.nu_micro_area))='FA' THEN 'fora'
        WHEN btrim(c.nu_micro_area) ~ '^[0-9]{2}$' THEN btrim(c.nu_micro_area)
        ELSE 'sem'
      END AS area
    FROM tb_cidadao_vinculacao_equipe v
    JOIN tb_cidadao c ON c.co_seq_cidadao=v.co_cidadao
    WHERE v.nu_cnes=$1 AND v.nu_ine=$2
      AND v.st_saida_cadastro_obito=0 AND v.st_saida_cadastro_territorio=0
      AND c.st_ativo=1 AND c.st_ativo_para_exibicao=1 AND c.st_faleceu=0 AND c.dt_obito IS NULL
  ), selected_dwellings AS (
    SELECT d.domicile,
      CASE WHEN d.outside_area IS TRUE THEN 'fora' ELSE coalesce(d.area, 'sem') END AS area,
      d.latitude, d.longitude, d.has_coordinates, day.dt_registro,
      CASE WHEN cbo.nu_cbo IN ('515105','322255') AND pro.nu_cns ~ '^[0-9]{15}$'
        THEN pro.nu_cns END AS agent
    FROM latest_domicile d
    JOIN tb_dim_unidade_saude u ON u.co_seq_dim_unidade_saude=d.co_dim_unidade_saude AND u.nu_cnes=$1
    JOIN tb_dim_equipe e ON e.co_seq_dim_equipe=d.co_dim_equipe AND e.nu_ine=$2
    JOIN tb_dim_tempo day ON day.co_seq_dim_tempo=d.co_dim_tempo
      AND day.co_seq_dim_tempo::text=to_char(day.dt_registro, 'YYYYMMDD')
    JOIN tb_fat_cad_domiciliar f ON f.co_seq_fat_cad_domiciliar=d.domicile
    LEFT JOIN tb_dim_cbo cbo ON cbo.co_seq_dim_cbo=f.co_dim_cbo
    LEFT JOIN tb_dim_profissional pro ON pro.co_seq_dim_profissional=f.co_dim_profissional
    WHERE day.dt_registro <= current_date
  ), current_families AS (
    SELECT head.co_cidadao AS head,
      CASE WHEN count(DISTINCT d.domicile)>1 THEN 'conflito' ELSE min(d.area) END AS area
    FROM selected_dwellings d
    JOIN tb_fat_cad_dom_familia f ON f.co_fat_cad_domiciliar=d.domicile
    JOIN tb_fat_cidadao_pec head ON head.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec
    WHERE f.st_mudou=0 AND f.st_recusa_cadastro=0 AND f.co_dim_tempo_validade=30001231
      AND head.co_cidadao IS NOT NULL
    GROUP BY head.co_cidadao
  ), area_rows AS (
    SELECT area, count(*)::integer AS people, 0 AS dwellings, 0 AS families,
      0 AS georeferenced, 0 AS recording_agents
    FROM roster GROUP BY area
    UNION ALL
    SELECT area, 0, count(*)::integer, 0,
      count(*) FILTER (WHERE has_coordinates)::integer, count(DISTINCT agent)::integer
    FROM selected_dwellings GROUP BY area
    UNION ALL
    SELECT area, 0, 0, count(*)::integer, 0, 0 FROM current_families GROUP BY area
  ), areas AS (
    SELECT area, sum(people)::integer AS people, sum(dwellings)::integer AS dwellings,
      sum(families)::integer AS families, sum(georeferenced)::integer AS georeferenced,
      sum(recording_agents)::integer AS "recordingAgents"
    FROM area_rows GROUP BY area
  ), cells AS (
    SELECT floor(latitude * 100)::integer AS latitude,
      floor(longitude * 100)::integer AS longitude, count(*)::integer AS dwellings
    FROM selected_dwellings
    WHERE has_coordinates
    GROUP BY 1,2 HAVING count(*)>=5
    ORDER BY dwellings DESC, latitude, longitude LIMIT 250
  )
  SELECT coalesce((SELECT json_agg(areas ORDER BY area) FROM areas),'[]'::json) AS areas,
    coalesce((SELECT json_agg(cells ORDER BY latitude, longitude) FROM cells),'[]'::json) AS cells,
    (SELECT max(dt_registro)::text FROM selected_dwellings) AS "lastDomicileForm"
`;

export async function loadTerritory(scope: PecTeamScope) {
  const team = await requireActiveTeam(scope);
  const [result] = await queryPEC<TerritoryData>(territorySql, [team.cnes, team.ine], { setBased: true });
  return result;
}
