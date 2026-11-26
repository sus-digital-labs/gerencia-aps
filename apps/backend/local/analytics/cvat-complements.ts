import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { shiftApsCompetence } from "@shared/aps-competence";
import { pecTeamScopeSchema, type PecTeamScope } from "@shared/pec-scope";
import { territorialQuarter, type ApsConcept } from "./assessment-rules";
import { competenceEnd } from "./pec-quality-source";
import { CVAT_FILE_LIMIT, readCvatFile, writeCvatFile } from "./cvat-files";

const complementsPath = "/run/b360/complementos.json";

const count = z.number().int().min(0).max(10_000_000);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const evidence = z.object({
  authority: z.string().trim().min(4).max(100),
  document: z.string().trim().min(3).max(100),
  coveredThrough: date,
}).strict();

const candidateSchema = pecTeamScopeSchema.extend({
  careContacts: count,
  lastCare: date.nullable(),
  registrationDate: date,
}).strict().refine(value => (value.careContacts > 0) === (value.lastCare !== null));

const aggregateSchema = pecTeamScopeSchema.extend({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  benefits: z.object({
    coverage: z.literal("PBF_E_BPC"),
    withoutPriority: count,
    demographicOnly: count,
    benefitOnly: count,
    both: count,
    source: evidence,
  }).strict().optional(),
  consolidation: z.object({
    referencePopulation: count.positive(),
    individualOnly: count,
    individualAndHousehold: count,
    attendanceCount: count,
    evaluations: count,
    tieGroups: z.array(z.object({
      persons: count.positive(),
      candidates: z.array(candidateSchema).min(2).max(24),
    }).strict()).max(80),
    registrySource: evidence,
    populationSource: evidence,
    satisfactionSource: evidence,
  }).strict().optional(),
  publishedFinal: z.object({
    system: z.literal("SIAPS"),
    score: z.number().min(0).max(10),
    source: evidence,
  }).strict().optional(),
}).strict().superRefine((record, context) => {
  const end = competenceEnd(record.month);
  const addError = () => context.addIssue({ code: "custom", message: "Cobertura, contagem ou recorte inconsistente." });
  if (!record.benefits && !record.consolidation && !record.publishedFinal) addError();
  if (record.benefits && record.benefits.source.coveredThrough < end) addError();
  if (record.publishedFinal && (Number(record.month.slice(-2)) % 4 !== 0 || record.publishedFinal.source.coveredThrough < end)) addError();
  if (!record.consolidation) return;
  const { registrySource, populationSource, satisfactionSource, attendanceCount, evaluations, tieGroups } = record.consolidation;
  if ([registrySource, populationSource, satisfactionSource].some(source => source.coveredThrough < end) ||
    evaluations > attendanceCount) addError();
  for (const group of tieGroups) {
    const keys = new Set(group.candidates.map(candidate => `${candidate.cnes}/${candidate.ine}`));
    if (keys.size !== group.candidates.length || !keys.has(`${record.cnes}/${record.ine}`) ||
      group.candidates.some(candidate => candidate.registrationDate > end || (candidate.lastCare && candidate.lastCare > end))) addError();
  }
});

const fileSchema = z.object({
  schema: z.literal("sus-analytics-web.cvat-complements.v1"),
  records: z.array(aggregateSchema).max(512),
}).strict();

type Aggregate = z.infer<typeof aggregateSchema>;
type Candidate = z.infer<typeof candidateSchema>;
export type CvatComplements = {
  state: "MISSING" | "INVALID" | "AVAILABLE";
  revision: string;
  records: Map<string, Aggregate>;
};

const missing = (): CvatComplements => ({ state: "MISSING", revision: "missing", records: new Map() });
const invalid = (): CvatComplements => ({ state: "INVALID", revision: "invalid", records: new Map() });
const key = (scope: PecTeamScope, month: string) => `${scope.cnes}/${scope.ine}/${month}`;

export function parseCvatComplements(bytes: Buffer): CvatComplements {
  if (bytes.length > CVAT_FILE_LIMIT) return invalid();
  try {
    const input = fileSchema.parse(JSON.parse(bytes.toString("utf8")));
    const records = new Map(input.records.map(row => [key(row, row.month), row]));
    if (records.size !== input.records.length) return invalid();
    return { state: "AVAILABLE", revision: createHash("sha256").update(bytes).digest("hex"), records };
  } catch {
    return invalid();
  }
}

export function readCvatComplements(path = complementsPath): CvatComplements {
  try {
    return parseCvatComplements(readCvatFile(path));
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? missing() : invalid();
  }
}

export function importCvatComplements(bytes: Buffer, path = complementsPath) {
  const incoming = parseCvatComplements(bytes);
  if (incoming.state !== "AVAILABLE" || incoming.records.size === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione um arquivo agregado de complementos CVAT válido." });
  }
  const existing = readCvatComplements(path);
  if (existing.state === "INVALID") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O arquivo local atual precisa ser validado antes da importação." });
  }
  const records = new Map(existing.records);
  for (const [id, record] of incoming.records) records.set(id, { ...records.get(id), ...record });
  const merged = Buffer.from(JSON.stringify({ schema: "sus-analytics-web.cvat-complements.v1", records: [...records.values()] }));
  if (parseCvatComplements(merged).state !== "AVAILABLE") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A importação excede o limite ou conflita com as fontes existentes." });
  }
  writeCvatFile(path, merged);
  return { imported: incoming.records.size, total: records.size };
}

function compareLinks(a: Candidate, b: Candidate) {
  return b.careContacts - a.careContacts || (b.lastCare ?? "").localeCompare(a.lastCare ?? "") ||
    b.registrationDate.localeCompare(a.registrationDate);
}

export function resolveCvatLink(candidates: readonly Candidate[]) {
  const ordered = [...candidates].sort(compareLinks);
  if (!ordered[0] || (ordered[1] && compareLinks(ordered[0], ordered[1]) === 0)) return null;
  return { cnes: ordered[0].cnes, ine: ordered[0].ine };
}

function blocked(reason: string, data: CvatComplements) {
  return {
    status: "BLOCKED_BY_DATA_CONTRACT" as const,
    reason: data.state === "INVALID" ? "O arquivo local de complementos do CVAT foi recusado por inconsistência." : reason,
  };
}

export function vulnerabilityMetric(data: CvatComplements, scope: PecTeamScope, month: string) {
  const recorded = data.records.get(key(scope, month))?.benefits;
  if (!recorded) return blocked("Falta a base autorizada de PBF e BPC para a equipe e a competência. O PEC não comprova ausência de benefício.", data);
  const denominator = recorded.withoutPriority + recorded.demographicOnly + recorded.benefitOnly + recorded.both;
  if (!denominator) return { status: "NO_DATA" as const, reason: "A fonte complementar fechada não tem pessoas acompanhadas no recorte." };
  const numerator = (10 * recorded.withoutPriority + 12 * recorded.demographicOnly + 13 * recorded.benefitOnly + 25 * recorded.both) / 10;
  return {
    status: "READY" as const, unit: "factor" as const, numerator, denominator, value: numerator / denominator,
    excludedRecords: 0, concept: null, source: "COMPLEMENTO" as const,
    evidence: [
      { label: "Sem critério prioritário", value: recorded.withoutPriority },
      { label: "Prioridade demográfica", value: recorded.demographicOnly },
      { label: "PBF ou BPC", value: recorded.benefitOnly },
      { label: "Prioridade demográfica e PBF/BPC", value: recorded.both },
    ],
    limitation: `Fator médio entre pessoas acompanhadas. Fonte ${recorded.source.authority}, documento ${recorded.source.document}.`,
  };
}

export function consolidatedCvatMetric(data: CvatComplements, scope: PecTeamScope, month: string) {
  if (Number(month.slice(-2)) % 4 !== 0) {
    return { status: "MISSING_REQUIRED_CRITERIA" as const, reason: "Selecione abril, agosto ou dezembro para consolidar o quadrimestre fechado." };
  }
  const publication = data.records.get(key(scope, month))?.publishedFinal;
  if (publication) {
    const { score, source } = publication;
    const concept: ApsConcept = score > 8.5 ? "ótimo" : score >= 7 ? "bom" : score >= 5 ? "suficiente" : "regular";
    return { status: "READY" as const, unit: "score" as const, numerator: score, denominator: 10,
      value: score, concept, excludedRecords: 0, source: "COMPLEMENTO" as const,
      limitation: `Nota final informada na exportação por equipe do Siaps. Documento ${source.document}.` };
  }
  const records = [-3, -2, -1, 0].map(offset => data.records.get(key(scope, shiftApsCompetence(month, offset))));
  const inputs = [];
  let adjudicated = 0;
  for (const record of records) {
    if (!record?.consolidation || !record.benefits) {
      return blocked("A consolidação exige os quatro meses com cadastro e vínculo conciliados, parâmetro IBGE/SCNES, PBF/BPC e avaliações do Meu SUS Digital.", data);
    }
    const { consolidation: row, benefits } = record;
    if (row.tieGroups.some(group => !resolveCvatLink(group.candidates))) {
      return blocked("Há empate exato de vínculo entre equipes depois dos três critérios oficiais.", data);
    }
    adjudicated += row.tieGroups.reduce((sum, group) => sum + group.persons, 0);
    inputs.push({
      referencePopulation: row.referencePopulation,
      individualOnly: row.individualOnly,
      individualAndHousehold: row.individualAndHousehold,
      trackedWithoutPriority: benefits.withoutPriority,
      trackedDemographicOnly: benefits.demographicOnly,
      trackedBenefitOnly: benefits.benefitOnly,
      trackedWithBothPriorities: benefits.both,
      attendanceCount: row.attendanceCount,
      evaluations: row.evaluations,
    });
  }
  const result = territorialQuarter(inputs);
  if (result.status !== "READY") return blocked(result.reason, data);
  return {
    status: "READY" as const, unit: "score" as const, numerator: result.score, denominator: 10,
    value: result.score, concept: result.concept, excludedRecords: 0, source: "COMPLEMENTO" as const,
    evidence: [
      { label: "Escore de cadastro", value: result.enrollmentScore },
      { label: "Escore de acompanhamento", value: result.followUpScore },
      { label: "Bônus por avaliações", value: result.bonus },
      { label: "Vínculos resolvidos pelos critérios de desempate", value: adjudicated },
    ],
    limitation: "Consolidação calculada com os arquivos complementares identificados por competência.",
  };
}
