import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { currentApsCompetence } from "@shared/aps-competence";
import { NOMINAL_METRIC_CODES } from "@shared/aps-indicators";
import { pecTeamScopeSchema } from "@shared/pec-scope";
import { apsCompetenceSchema } from "./indicators";
import { competenceEnd, loadIndicatorContributions } from "./analytics/pec-quality-source";
import { loadB2Contributions } from "./analytics/pec-oral-care";
import { loadM1Contributions } from "./analytics/pec-emulti-attendance";
import { loadCvatContributions } from "./analytics/pec-territorial";
import { requireActiveTeam } from "./pec-directory";
import { queryPEC } from "./pec-db";

const pageSize = 50;
export const rosterRequestSchema = pecTeamScopeSchema.extend({
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const contributionRequestSchema = rosterRequestSchema.extend({
  code: z.enum(NOMINAL_METRIC_CODES),
  month: apsCompetenceSchema,
  contribution: z.enum(["counted", "pending"]).optional(),
});

export async function loadRoster(input: z.infer<typeof rosterRequestSchema>) {
  await requireActiveTeam(input);
  const { cnes, ine, page } = input;
  const names = await queryPEC<{ name: string }>(`
    SELECT COALESCE(NULLIF(btrim(c.no_social), ''), btrim(c.no_cidadao)) AS name
    FROM tb_cidadao_vinculacao_equipe v
    JOIN tb_cidadao c ON c.co_seq_cidadao = v.co_cidadao
    WHERE v.nu_cnes = $1 AND v.nu_ine = $2
      AND v.st_saida_cadastro_obito = 0 AND v.st_saida_cadastro_territorio = 0
      AND c.st_ativo_para_exibicao = 1 AND c.st_ativo = 1 AND c.st_faleceu = 0
      AND c.dt_obito IS NULL AND nullif(btrim(c.no_cidadao), '') IS NOT NULL
    ORDER BY name, c.co_seq_cidadao
    LIMIT $3 OFFSET $4`, [cnes, ine, pageSize + 1, (page - 1) * pageSize]);
  return { rows: names.slice(0, pageSize), page, hasNextPage: page < 500 && names.length > pageSize };
}

export async function loadContributions(input: z.infer<typeof contributionRequestSchema>) {
  const currentMonth = currentApsCompetence();
  if (input.month >= currentMonth) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A lista do indicador exige competência encerrada." });
  }
  const { typeCode } = await requireActiveTeam(input);
  const { code } = input;
  if (code === "CVAT1" || code === "CVAT2" || code === "CVAT3" || code === "CVAT4") {
    if (typeCode !== "70" && typeCode !== "76") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Esta lista do CVAT se aplica a eSF e eAP." });
    }
    return loadCvatContributions({ ...input, pageSize, code });
  }
  const expectedTypes = code === "C1" ? ["70", "76"] : code === "M1" ? ["72"] : ["71"];
  if (!expectedTypes.includes(typeCode ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "O indicador selecionado não se aplica a esta equipe." });
  }
  const request = { ...input, pageSize, currentMonth };
  const result = code === "B2" ? await loadB2Contributions(request)
    : code === "M1" ? await loadM1Contributions(request)
    : await loadIndicatorContributions({ ...request, code });
  if (!result.sourceThrough || result.sourceThrough < competenceEnd(input.month)) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A cópia do PEC ainda não cobre toda a competência." });
  }
  return result;
}
