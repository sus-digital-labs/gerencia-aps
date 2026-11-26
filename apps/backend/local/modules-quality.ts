import { z } from "zod";
import { pecTeamScopeSchema, type PecTeamScope } from "@shared/pec-scope";
import { queryPEC } from "./pec-db";
import { requireActiveTeam } from "./pec-directory";

export const qualityRequestSchema = pecTeamScopeSchema;
export const qualityListRequestSchema = pecTeamScopeSchema.extend({
  kind: z.enum(["search", "duplicates", "missing-cpf", "deaths"]),
  page: z.coerce.number().int().min(1).max(500).default(1),
  term: z.string().trim().max(120).optional(),
}).refine(input => input.kind === "search" ? (input.term?.length ?? 0) >= 3 : input.term === undefined);

export type QualityListRequest = z.infer<typeof qualityListRequestSchema>;
type QualityRow = {
  name: string | null;
  area: string | null;
  active: boolean;
  deceased: boolean;
  hasCpf: boolean;
  hasCns: boolean;
  deathDate: string | null;
  documentKind: "CPF" | "CNS" | null;
  duplicateGroup: number | null;
  groupSize: number | null;
};
type QualitySummary = {
  activePeople: number;
  missingCpf: number;
  missingCns: number;
  withoutDocument: number;
  duplicateCpfGroups: number;
  duplicateCnsGroups: number;
  markedDeceased: number;
  missingDeathDate: number;
  ages: { band: string; people: number }[];
  asOf: string;
};

// Scope current links once per person. Preserve death exits for the separate
// status ledger, without counting them in the active population.
const qualitySource = `
  scoped_links AS (
    SELECT v.co_cidadao AS person,
      bool_or(v.st_saida_cadastro_obito=1) AS death_exit,
      bool_or(v.st_saida_cadastro_obito=0 AND v.st_saida_cadastro_territorio=0) AS current_link
    FROM tb_cidadao_vinculacao_equipe v
    WHERE v.nu_cnes=$1 AND v.nu_ine=$2 AND
      (v.st_saida_cadastro_obito=1 OR (v.st_saida_cadastro_obito=0 AND v.st_saida_cadastro_territorio=0))
    GROUP BY v.co_cidadao
  ), people AS (
    SELECT r.person,
      coalesce(nullif(btrim(c.no_social),''),nullif(btrim(c.no_cidadao),'')) AS name,
      c.no_cidadao AS civil_name, nullif(btrim(c.nu_micro_area),'') AS area,
      nullif(btrim(c.nu_cpf),'') AS cpf, nullif(btrim(c.nu_cns),'') AS cns,
      r.current_link AND c.st_ativo=1 AND c.st_ativo_para_exibicao=1
        AND c.st_faleceu=0 AND c.dt_obito IS NULL AND r.death_exit IS NOT TRUE AS active,
      (r.death_exit OR c.st_faleceu=1 OR c.dt_obito IS NOT NULL) IS TRUE AS deceased,
      c.dt_obito AS death_date,
      CASE WHEN c.dt_nascimento <= current_date
        THEN extract(YEAR FROM age(current_date,c.dt_nascimento))::integer END AS age
    FROM scoped_links r JOIN tb_cidadao c ON c.co_seq_cidadao=r.person
  ), duplicate_documents AS (
    SELECT doc.kind, doc.value, count(*)::integer AS members,
      dense_rank() OVER (PARTITION BY doc.kind ORDER BY doc.value)::integer AS group_number
    FROM people p
    CROSS JOIN LATERAL (VALUES ('CPF', p.cpf, '^[0-9]{11}$'), ('CNS', p.cns, '^[0-9]{15}$'))
      AS doc(kind,value,pattern)
    WHERE p.active AND doc.value ~ doc.pattern
    GROUP BY doc.kind, doc.value HAVING count(*) > 1
  )
`;

export async function loadQuality(scope: PecTeamScope) {
  const team = await requireActiveTeam(scope);
  const [result] = await queryPEC<QualitySummary>(`
    WITH ${qualitySource}, bands(rank, band, first_age, last_age) AS (
      VALUES (1,'0 a 4 anos',0,4), (2,'5 a 11 anos',5,11), (3,'12 a 17 anos',12,17),
        (4,'18 a 39 anos',18,39), (5,'40 a 59 anos',40,59), (6,'60 anos ou mais',60,NULL),
        (7,'Sem nascimento válido',NULL,NULL)
    ), age_counts AS (
      SELECT b.rank, b.band, count(p.person)::integer AS people
      FROM bands b LEFT JOIN people p ON p.active AND (
        (b.first_age IS NULL AND p.age IS NULL) OR
        (p.age >= b.first_age AND (b.last_age IS NULL OR p.age <= b.last_age))
      )
      GROUP BY b.rank, b.band
    )
    SELECT count(*) FILTER (WHERE active)::integer AS "activePeople",
      count(*) FILTER (WHERE active AND cpf IS NULL)::integer AS "missingCpf",
      count(*) FILTER (WHERE active AND cns IS NULL)::integer AS "missingCns",
      count(*) FILTER (WHERE active AND cpf IS NULL AND cns IS NULL)::integer AS "withoutDocument",
      (SELECT count(*)::integer FROM duplicate_documents WHERE kind='CPF') AS "duplicateCpfGroups",
      (SELECT count(*)::integer FROM duplicate_documents WHERE kind='CNS') AS "duplicateCnsGroups",
      count(*) FILTER (WHERE deceased)::integer AS "markedDeceased",
      count(*) FILTER (WHERE deceased AND death_date IS NULL)::integer AS "missingDeathDate",
      (SELECT json_agg(json_build_object('band',band,'people',people) ORDER BY rank) FROM age_counts) AS ages,
      current_date::text AS "asOf"
    FROM people
  `, [team.cnes, team.ine]);
  return result;
}

const pageSize = 50;
// Use the same matching for the displayed/social and civil names. Numeric
// queries require the complete identifier, which is never returned.
const normalized = (value: string) =>
  `translate(lower(${value}),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')`;

export async function loadQualityList(input: QualityListRequest) {
  const team = await requireActiveTeam(input);
  const { kind, page, term = "" } = input;
  const candidate = term.replace(/[.\s-]/g, "");
  const document = /^[0-9]+$/.test(candidate) ? candidate : null;
  const rows = await queryPEC<QualityRow>(`
    WITH ${qualitySource}
    SELECT p.name, p.area, p.active IS TRUE AS active, p.deceased,
      p.cpf IS NOT NULL AS "hasCpf", p.cns IS NOT NULL AS "hasCns",
      CASE WHEN p.deceased THEN p.death_date::text END AS "deathDate",
      d.kind AS "documentKind", d.group_number AS "duplicateGroup", d.members AS "groupSize"
    FROM people p
    LEFT JOIN duplicate_documents d ON $3='duplicates'
      AND ((d.kind='CPF' AND d.value=p.cpf) OR (d.kind='CNS' AND d.value=p.cns))
    WHERE ($3='duplicates' AND p.active AND d.kind IS NOT NULL)
       OR ($3='missing-cpf' AND p.active AND p.cpf IS NULL)
       OR ($3='deaths' AND p.deceased)
       OR ($3='search' AND (p.active OR p.deceased) AND (
           ($5::text IS NOT NULL AND ((length($5)=11 AND p.cpf=$5) OR (length($5)=15 AND p.cns=$5)))
           OR ($5 IS NULL AND (
             strpos(${normalized("p.name")}, ${normalized("$4::text")})>0 OR
             strpos(${normalized("p.civil_name")}, ${normalized("$4::text")})>0
           ))
         ))
    ORDER BY d.kind, d.group_number,
      CASE WHEN $3='deaths' THEN p.death_date END DESC NULLS LAST, p.name, p.person
    LIMIT $6 OFFSET $7
  `, [team.cnes, team.ine, kind, term, document, pageSize + 1, (page - 1) * pageSize]);
  return { rows: rows.slice(0, pageSize), page, hasNextPage: page < 500 && rows.length > pageSize };
}
