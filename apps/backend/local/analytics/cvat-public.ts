import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pecTeamScopeSchema, type PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "../pec-db";
import { apsCompetenceSchema } from "../indicators";
import { CVAT_FILE_LIMIT, readCvatFile, writeCvatFile } from "./cvat-files";

const publicFile = "/run/b360/siaps-publico.json";
export const siapsPublicUrl = "https://siaps.saude.gov.br/publico/painel-avaliacao-quadrimestre";
const quarters = /^20\d{2}Q[1-3]$/;
const municipalityCode = /^\d{6}$/;
const categoryCount = z.number().int().min(0).max(200_000).nullable();
const publicRow = z.object({
  quarter: z.string().regex(quarters), ibge: z.string().regex(municipalityCode),
  uf: z.string().regex(/^[A-Z]{2}$/), teamType: z.enum(["eSF", "eAP"]),
  dimension: z.enum(["final", "cadastro", "acompanhamento"]),
  regular: categoryCount, suficiente: categoryCount, bom: categoryCount, ótimo: categoryCount,
  reportHash: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
const publicSchema = z.object({ schema: z.literal("sus-analytics-web.siaps-public.v1"), rows: z.array(publicRow).max(2500) }).strict();
export type CvatPublicRow = z.infer<typeof publicRow>;

type Category = "regular" | "suficiente" | "bom" | "ótimo";
const categories = new Map<string, Category>([["regular", "regular"], ["suficiente", "suficiente"], ["bom", "bom"], ["otimo", "ótimo"]]);
const normalized = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const rowKey = (row: CvatPublicRow) => `${row.ibge}/${row.quarter}/${row.teamType}/${row.dimension}`;

function fields(line: string) {
  return line.split(";").map(value => value.trim().replace(/^"|"$/g, "").trim());
}

function invalidReport(): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um CSV público de Vínculo e Acompanhamento Territorial baixado do Siaps." });
}

function count(value: string | undefined) {
  if (!value || !/^\d{1,6}$/.test(value) || !categoryCount.safeParse(Number(value)).success) invalidReport();
  return Number(value);
}

export function parsePublicCvatCsv(bytes: Buffer) {
  if (bytes.length > CVAT_FILE_LIMIT) invalidReport();
  const lines = bytes.toString("utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  const preamble = normalized(lines.slice(0, 8).join(" "));
  if (!preamble.includes("ministerio da saude") || !preamble.includes("relatorio publico vinculo e acompanhamento territorial")) invalidReport();
  const headerAt = lines.findIndex(line => normalized(fields(line)[0]) === "quadrimestre ano");
  if (headerAt < 0) invalidReport();
  const header = fields(lines[headerAt]).map(normalized);
  const dimensionReport = header[5] === "dimensao por tipo de equipe" && header.slice(6, 10).join(" ") ===
    "total de equipe regular total de equipe suficiente total de equipe bom total de equipe otimo";
  const finalReport = header[4] === "classificacao final" && header[5] === "vinculo e acompanhamento territorial n esf" &&
    header[6] === "vinculo e acompanhamento territorial n eap";
  if (header[2] !== "codigo ibge" || (!dimensionReport && !finalReport)) invalidReport();
  const reportHash = createHash("sha256").update(bytes).digest("hex");
  const rows = new Map<string, CvatPublicRow>();
  for (const line of lines.slice(headerAt + 1)) {
    if (!line.trim() || normalized(line).startsWith("fonte ")) break;
    const columns = fields(line);
    const [quarter, uf, rawIbge] = columns;
    if (!quarters.test(quarter) || !/^[A-Z]{2}$/.test(uf) || !/^\d{6,7}$/.test(rawIbge)) invalidReport();
    const base = { quarter, uf, ibge: rawIbge.slice(0, 6), reportHash };
    if (dimensionReport) {
      const dimension = normalized(columns[5] ?? "") === "cvat dimensao cadastro" ? "cadastro"
        : normalized(columns[5] ?? "") === "cvat dimensao acompanhamento" ? "acompanhamento" : undefined;
      const teamType = columns[4];
      if (!dimension || (teamType !== "eSF" && teamType !== "eAP")) invalidReport();
      const row: CvatPublicRow = { ...base, teamType, dimension, regular: count(columns[6]), suficiente: count(columns[7]),
        bom: count(columns[8]), ótimo: count(columns[9]) };
      const key = rowKey(row);
      if (rows.has(key)) invalidReport();
      rows.set(key, row);
    } else {
      const concept = categories.get(normalized(columns[4] ?? ""));
      if (!concept) invalidReport();
      for (const teamType of ["eSF", "eAP"] as const) {
        const candidate = { ...base, teamType, dimension: "final" as const, regular: null, suficiente: null, bom: null, ótimo: null };
        const key = rowKey(candidate);
        const row = rows.get(key) ?? candidate;
        if (row[concept] !== null) invalidReport();
        rows.set(key, { ...row, [concept]: count(columns[teamType === "eSF" ? 5 : 6]) });
      }
    }
  }
  if (rows.size === 0) invalidReport();
  return [...rows.values()];
}

function readPublicReports(path: string) {
  try {
    return publicSchema.parse(JSON.parse(readCvatFile(path).toString("utf8"))).rows;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O arquivo público Siaps da instalação é inválido." });
  }
}

export function importPublicCvatCsv(csv: Buffer, path = publicFile) {
  const incoming = parsePublicCvatCsv(csv);
  const merged = new Map(readPublicReports(path).map(row => [rowKey(row), row]));
  for (const row of incoming) merged.set(rowKey(row), row);
  const result = publicSchema.safeParse({ schema: "sus-analytics-web.siaps-public.v1", rows: [...merged.values()] });
  if (!result.success) invalidReport();
  writeCvatFile(path, Buffer.from(JSON.stringify(result.data)));
  return { imported: incoming.length, total: result.data.rows.length };
}

export const cvatPublicRequestSchema = pecTeamScopeSchema.extend({ month: apsCompetenceSchema });

export async function loadCvatPublic(scope: PecTeamScope & { month: string }) {
  const [location] = await queryPEC<{ ibge: string; teamType: "eSF" | "eAP" }>(`
    SELECT left(btrim(l.co_ibge::text), 6) AS ibge, CASE t.nu_ms::text WHEN '70' THEN 'eSF' ELSE 'eAP' END AS "teamType"
    FROM tb_equipe e JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe = e.tp_equipe
    JOIN tb_unidade_saude u ON u.co_seq_unidade_saude = e.co_unidade_saude
    JOIN tb_localidade l ON l.co_localidade = u.co_localidade_endereco
    WHERE e.nu_ine = $2 AND u.nu_cnes = $1 AND e.st_ativo = 1 AND u.st_ativo = 1
      AND t.nu_ms::text IN ('70','76')`, [scope.cnes, scope.ine]);
  if (!location) throw new TRPCError({ code: "FORBIDDEN", message: "Selecione uma eSF ou eAP ativa no PEC local." });
  const quarter = `${scope.month.slice(0, 4)}Q${Math.ceil(Number(scope.month.slice(-2)) / 4)}`;
  const rows = readPublicReports(publicFile).filter(row => row.ibge === location.ibge && row.teamType === location.teamType);
  return { quarter, teamType: location.teamType, source: siapsPublicUrl, availableQuarters: [...new Set(rows.map(row => row.quarter))].sort(),
    rows: rows.filter(row => row.quarter === quarter) };
}
