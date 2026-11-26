import { TRPCError } from "@trpc/server";
import { type PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "./pec-db";

export type PecTeam = PecTeamScope & {
  name: string;
  unitName: string;
  typeCode: string | null;
  hasRoster: boolean;
};

const activeTeamsSql = `
  SELECT e.no_equipe AS name, u.no_unidade_saude AS "unitName",
    btrim(e.nu_ine) AS ine, btrim(u.nu_cnes) AS cnes, te.nu_ms::text AS "typeCode",
    EXISTS (
      SELECT 1 FROM tb_cidadao_vinculacao_equipe v
      WHERE v.nu_ine = e.nu_ine AND v.nu_cnes = u.nu_cnes
        AND v.st_saida_cadastro_obito = 0 AND v.st_saida_cadastro_territorio = 0
    ) AS "hasRoster"
  FROM tb_equipe e
  JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
  LEFT JOIN tb_tipo_equipe te ON te.co_seq_tipo_equipe = e.tp_equipe
  WHERE e.st_ativo::text IN ('1', 'true') AND u.st_ativo::text IN ('1', 'true')
    AND u.nu_cnes ~ '^[0-9]{7}$' AND e.nu_ine ~ '^[0-9]{10}$'
`;

export function listPecTeams() {
  return queryPEC<PecTeam>(`${activeTeamsSql}
    ORDER BY u.no_unidade_saude, e.no_equipe, e.nu_ine`);
}

export async function requireActiveTeam(scope: PecTeamScope) {
  const teams = await queryPEC<PecTeam>(`${activeTeamsSql}
    AND u.nu_cnes = $1 AND e.nu_ine = $2 LIMIT 2`, [scope.cnes, scope.ine]);
  if (teams.length !== 1) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Selecione uma equipe ativa nesta unidade do PEC." });
  }
  return teams[0];
}
