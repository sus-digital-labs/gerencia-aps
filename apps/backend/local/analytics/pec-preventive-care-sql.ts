import { pecLocalPerson, validCns } from "./pec-identity-sql";

const medicalAndNursing = "('2231','2235','2251','2252','2253')";
const cervical = ["0201020033", "0203010086", "0203010019", "0201020076", "0201020084", "ABEX001", "ABP022"];
const breast = ["0204030030", "0204030188", "ABP023"];
const molecular = "0202100251";
const sexualReproductiveCiap = [
  "B25", "W02", "W10", "W11", "W12", "W13", "W14", "W15", "W79", "W82", "X01", "X02", "X03",
  "X04", "X05", "X06", "X07", "X08", "X09", "X10", "X11", "X12", "X13", "X23", "X24", "X82", "X89", "Y14",
];
const sexualReproductiveCid = [
  "N80", "N800", "N801", "N802", "N803", "N804", "N805", "N806", "N808", "N809", "N91", "N910",
  "N911", "N912", "N913", "N914", "N915", "N92", "N920", "N921", "N922", "N923", "N924", "N925", "N926",
  "N93", "N930", "N938", "N939", "N94", "N940", "N941", "N942", "N943", "N944", "N945", "N946", "N948",
  "N949", "N95", "N950", "N951", "N952", "N953", "N958", "N959", "N96", "N97", "N970", "N971", "N972",
  "N973", "N974", "N978", "N979", "O03", "O04", "R102", "T742", "Y050", "Y051", "Y052", "Y053", "Y054",
  "Y055", "Y056", "Y057", "Y058", "Y059", "Z123", "Z124", "Z205", "Z206", "Z30", "Z300", "Z301", "Z302",
  "Z303", "Z304", "Z305", "Z308", "Z309", "Z31", "Z310", "Z311", "Z312", "Z313", "Z314", "Z315", "Z316",
  "Z318", "Z319", "Z320", "Z600", "Z630", "Z640", "Z70", "Z700", "Z701", "Z702", "Z703", "Z708", "Z709",
  "Z717", "Z725",
];
const careAbp = ["ABP003", "ABP022", "ABP023"];
const literals = (codes: string[]) => codes.map(code => `'${code}'`).join(",");
const hasCode = (field: string, codes: string[]) =>
  `(${field} ~ '(^|[^0-9A-Z])(${codes.join("|")})([^0-9A-Z]|$)') IS TRUE`;
const examCodes = [...cervical, molecular, ...breast];
export const preventiveSigtapCodes = examCodes.filter(code => code[0] === "0");
const knownPracticeCodes = [...new Set([...examCodes, ...careAbp])];

// $1 competências, $2 primeiro dia do mês seguinte, $3 CNES, $4 INE, $5 limite do mês atual,
// $6 projeção SIGTAP e $7/$8 limites da série histórica de competências da projeção.
export const preventiveCareSql = `WITH periods AS (
    SELECT month, after_month, after_month-1 AS anchor FROM unnest($1::text[], $2::date[]) p(month,after_month)
  ), bounds AS (
    SELECT min(anchor) AS first_anchor, max(after_month) AS latest,
      to_char(min(after_month) - interval '60 months', 'YYYYMMDD')::bigint AS first_exam,
      to_char(max(after_month), 'YYYYMMDD')::bigint AS last_event
    FROM periods
  ), coverage_days AS (
    SELECT (SELECT max(co_dim_tempo) FROM tb_fat_atendimento_individual WHERE co_dim_tempo<$5) AS individual_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_proced_atend_proced WHERE co_dim_tempo<$5) AS procedure_day,
      (SELECT max(co_dim_tempo) FROM tb_fat_vacinacao WHERE co_dim_tempo<$5) AS vaccination_day,
      (SELECT max(co_dim_tempo_vacina_aplicada) FROM tb_fat_vacinacao_vacina
        WHERE co_dim_tempo_vacina_aplicada<$5) AS dose_day,
      (SELECT min(dt_auditoria)::date FROM ta_cidadao_vinculacao_equipe) AS link_start,
      (SELECT min(dt_auditoria)::date FROM ta_cidadao) AS person_start
  ), coverage AS (
    SELECT to_char(ti.dt_registro,'YYYY-MM-DD') AS individual_cutoff,
      to_char(tp.dt_registro,'YYYY-MM-DD') AS procedure_cutoff, to_char(tv.dt_registro,'YYYY-MM-DD') AS vaccine_cutoff,
      CASE WHEN c.link_start IS NOT NULL AND c.person_start IS NOT NULL
        THEN to_char(greatest(c.link_start,c.person_start),'YYYY-MM-DD') END AS history_start,
      EXISTS (
        SELECT 1 FROM tb_equipe e JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=e.co_unidade_saude
        JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe=e.tp_equipe
        WHERE e.st_ativo=1 AND t.nu_ms IN ('70','76') AND u.nu_cnes=$3 AND e.nu_ine=$4
      ) AS team_qualified
    FROM coverage_days c
    LEFT JOIN tb_dim_tempo ti ON ti.co_seq_dim_tempo=c.individual_day AND ti.co_seq_dim_tempo::text=to_char(ti.dt_registro,'YYYYMMDD')
    LEFT JOIN tb_dim_tempo tp ON tp.co_seq_dim_tempo=c.procedure_day AND tp.co_seq_dim_tempo::text=to_char(tp.dt_registro,'YYYYMMDD')
    LEFT JOIN tb_dim_tempo tv ON tv.co_seq_dim_tempo=least(c.vaccination_day,c.dose_day)
      AND c.vaccination_day IS NOT NULL AND c.dose_day IS NOT NULL
      AND tv.co_seq_dim_tempo::text=to_char(tv.dt_registro,'YYYYMMDD')
  ), scoped_people AS (
    SELECT DISTINCT h.co_cidadao FROM ta_cidadao_vinculacao_equipe h
    WHERE h.nu_cnes=$3 AND h.nu_ine=$4 AND h.dt_auditoria<(SELECT latest FROM bounds)::timestamp
  ), last_links AS (
    -- Seleciona o vínculo vigente antes de aplicar o filtro da dupla. Mudanças de equipe
    -- e saídas posteriores ao último vínculo com a dupla devem prevalecer.
    SELECT DISTINCT ON (m.month,h.co_cidadao) m.month, m.after_month, m.anchor, h.co_cidadao,
      h.co_tipo_auditoria, h.nu_cnes, h.nu_ine, h.st_saida_cadastro_obito, h.st_saida_cadastro_territorio,
      h.st_usar_cadastro_individual, h.co_unico_cadastro_individual, h.dt_atualizacao_cadastro
    FROM scoped_people s JOIN ta_cidadao_vinculacao_equipe h ON h.co_cidadao=s.co_cidadao
    JOIN periods m ON h.dt_auditoria<m.after_month::timestamp
    ORDER BY m.month,h.co_cidadao,h.dt_auditoria DESC,h.co_seq_tacidadaovinculacaoequp DESC
  ), active_links AS (
    SELECT l.month,l.after_month,l.anchor,l.co_cidadao,l.co_unico_cadastro_individual
    FROM last_links l
    WHERE l.nu_cnes=$3 AND l.nu_ine=$4 AND l.co_tipo_auditoria IN ('I','U')
      AND l.st_saida_cadastro_obito=0 AND l.st_saida_cadastro_territorio=0 AND l.st_usar_cadastro_individual=1
      AND NULLIF(btrim(l.co_unico_cadastro_individual),'') IS NOT NULL
      AND l.dt_atualizacao_cadastro>=((l.anchor - interval '24 months') AT TIME ZONE 'America/Bahia')
      AND l.dt_atualizacao_cadastro<(l.after_month::timestamp AT TIME ZONE 'America/Bahia')
      AND EXISTS (
        SELECT 1 FROM tb_fat_cad_individual f
        JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec AND cp.co_cidadao=l.co_cidadao
        WHERE f.nu_uuid_ficha=l.co_unico_cadastro_individual AND f.st_recusa_cadastro=0
          AND f.co_dim_tempo<to_char(l.after_month,'YYYYMMDD')::bigint
      )
  ), historical_registry AS (
    SELECT DISTINCT ON (l.month,l.co_cidadao) l.month,l.anchor,l.co_cidadao,
      p.co_tipo_auditoria,p.st_ativo,p.st_fora_area,p.st_faleceu,p.dt_obito,
      p.no_sexo,p.tp_identidade_genero,p.st_infrm_identidade_genero,p.dt_nascimento, ${pecLocalPerson("p")} AS person
    FROM active_links l JOIN ta_cidadao p ON p.co_seq_cidadao=l.co_cidadao
      AND p.dt_auditoria<l.after_month::timestamp
    ORDER BY l.month,l.co_cidadao,p.dt_auditoria DESC,p.co_seq_tacidadao DESC
  ), registry AS (
    SELECT r.*, age(r.anchor,r.dt_nascimento) AS age_on_anchor
    FROM historical_registry r
    WHERE r.co_tipo_auditoria IN ('I','U') AND r.st_ativo=1 AND r.st_fora_area=0 AND r.person IS NOT NULL
      AND (r.dt_obito>r.anchor OR (r.dt_obito IS NULL AND r.st_faleceu=0))
      AND ((r.no_sexo='FEMININO' AND r.tp_identidade_genero IS DISTINCT FROM 'MULHER_TRANS')
        OR (r.no_sexo='MASCULINO' AND r.tp_identidade_genero='HOMEM_TRANS' AND r.st_infrm_identidade_genero=1))
  ), cohorts AS (
    SELECT r.month,r.anchor,r.co_cidadao,r.person,r.dt_nascimento, band.practice
    FROM registry r
    CROSS JOIN (VALUES ('A',25,64),('B',9,14),('C',14,69),('D',50,69)) band(practice,min_age,max_age)
    WHERE extract(year FROM r.age_on_anchor) BETWEEN band.min_age AND band.max_age
      AND (band.practice!='B' OR r.no_sexo='FEMININO')
  ), cohort_people AS (
    SELECT DISTINCT practice,co_cidadao FROM cohorts
  ), appointment_people AS (
    SELECT DISTINCT co_cidadao FROM cohort_people WHERE practice IN ('A','C','D')
  ), vaccination_people AS (
    SELECT co_cidadao FROM cohort_people WHERE practice='B'
  ), aps_pairs AS (
    SELECT DISTINCT u.nu_cnes,e.nu_ine
    FROM tb_equipe e JOIN tb_unidade_saude u ON u.co_seq_unidade_saude=e.co_unidade_saude
    JOIN tb_tipo_equipe t ON t.co_seq_tipo_equipe=e.tp_equipe
    WHERE t.nu_ms IN ('70','76') AND u.nu_cnes ~ '^[0-9]{7}$' AND e.nu_ine ~ '^[0-9]{10}$'
  ), aps_dimension AS (
    SELECT d.co_seq_dim_equipe AS team,u.co_seq_dim_unidade_saude AS unit
    FROM aps_pairs p JOIN tb_dim_equipe d ON d.nu_ine=p.nu_ine JOIN tb_dim_unidade_saude u ON u.nu_cnes=p.nu_cnes
  ), aps_units AS (
    SELECT DISTINCT unit FROM aps_dimension
  ), appointments AS (
    SELECT cp.co_cidadao,t.dt_registro AS day,f.dt_nascimento AS birth,c.nu_cbo AS cbo,
      upper(concat_ws('|',f.ds_filtro_proced_avaliados,f.ds_filtro_proced_solicitados)) AS exams,
      upper(replace(f.ds_filtro_cids,'.','')) AS cids,upper(f.ds_filtro_ciaps) AS ciaps,
      participation.nu_identificador AS participation
    FROM appointment_people people
    JOIN tb_fat_cidadao_pec cp ON cp.co_cidadao=people.co_cidadao AND coalesce(cp.st_deletar,0)=0
    -- Conserva a busca pelo índice do cidadão PEC no PostgreSQL 9.6.
    JOIN LATERAL (
      SELECT f.co_dim_tempo,f.co_dim_tipo_ficha,f.co_dim_equipe_1,f.co_dim_unidade_saude_1,f.co_dim_cbo_1,
        f.co_dim_profissional_1,f.co_dim_tp_particip_cidadao,f.dt_nascimento,
        f.ds_filtro_proced_avaliados,f.ds_filtro_proced_solicitados,f.ds_filtro_cids,f.ds_filtro_ciaps
      FROM tb_fat_atendimento_individual f
      WHERE f.co_fat_cidadao_pec=cp.co_seq_fat_cidadao_pec AND f.co_dim_tempo >= (SELECT first_exam FROM bounds)
        AND f.co_dim_tempo < (SELECT last_event FROM bounds)
        AND NULLIF(btrim(f.nu_uuid_ficha),'') IS NOT NULL AND f.nu_atendimento IS NOT NULL
        AND ((${hasCode("upper(concat_ws('|',f.ds_filtro_proced_avaliados,f.ds_filtro_proced_solicitados))", knownPracticeCodes)})
          OR ${hasCode("upper(replace(f.ds_filtro_cids,'.',''))", sexualReproductiveCid)}
          OR ${hasCode("upper(f.ds_filtro_ciaps)", sexualReproductiveCiap)})
      OFFSET 0
    ) f ON true
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=f.co_dim_tempo AND t.co_seq_dim_tempo::text=to_char(t.dt_registro,'YYYYMMDD')
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('4','9')
    JOIN aps_dimension a ON a.team=f.co_dim_equipe_1 AND a.unit=f.co_dim_unidade_saude_1
    JOIN tb_dim_cbo c ON c.co_seq_dim_cbo=f.co_dim_cbo_1 AND left(c.nu_cbo,4) IN ${medicalAndNursing}
    JOIN tb_dim_profissional p ON p.co_seq_dim_profissional=f.co_dim_profissional_1 AND ${validCns("btrim(p.nu_cns)")}
    LEFT JOIN tb_dim_tipo_participacao_atend participation ON participation.co_seq_dim_tp_particip_atend=f.co_dim_tp_particip_cidadao
  ), procedures_by_code AS (
    -- O índice do procedimento vem antes do filtro de tempo. O planejador 9.6
    -- repete uma varredura do índice de tempo quando os filtros são combinados aqui.
    SELECT d.co_proced AS code, f.*
    FROM tb_dim_procedimento d
    JOIN LATERAL (
      SELECT f.co_dim_tempo,f.co_dim_tipo_ficha,f.co_dim_equipe,f.co_dim_unidade_saude,f.co_dim_cbo,
        f.co_dim_profissional,f.co_fat_cidadao_pec,f.dt_nascimento
      FROM tb_fat_proced_atend_proced f
      WHERE f.co_dim_procedimento=d.co_seq_dim_procedimento
        AND NULLIF(btrim(f.nu_uuid_ficha),'') IS NOT NULL AND f.nu_atendimento IS NOT NULL
      OFFSET 0
    ) f ON true
    WHERE d.co_proced IN (${literals(preventiveSigtapCodes)})
  ), exams AS (
    -- No MIAI a equipe registra a solicitação ou avaliação do exame. A
    -- habilitação para executar o procedimento se aplica ao registro do MIP.
    SELECT a.co_cidadao,a.day,a.birth,a.cbo,x.code,false AS performed
    FROM appointments a
    CROSS JOIN LATERAL regexp_split_to_table(a.exams,'[^0-9A-Z]+') AS x(code)
    WHERE x.code IN (${literals(examCodes)})
    UNION ALL
    SELECT cp.co_cidadao,t.dt_registro,f.dt_nascimento,c.nu_cbo,f.code,true
    FROM procedures_by_code f
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=f.co_dim_tempo AND t.co_seq_dim_tempo::text=to_char(t.dt_registro,'YYYYMMDD')
    JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha AND k.nu_identificador IN ('7','9')
    JOIN aps_dimension a ON a.team=f.co_dim_equipe AND a.unit=f.co_dim_unidade_saude
    JOIN tb_dim_cbo c ON c.co_seq_dim_cbo=f.co_dim_cbo AND left(c.nu_cbo,4) IN ${medicalAndNursing}
    JOIN tb_dim_profissional p ON p.co_seq_dim_profissional=f.co_dim_profissional AND ${validCns("btrim(p.nu_cns)")}
    JOIN tb_fat_cidadao_pec cp ON cp.co_seq_fat_cidadao_pec=f.co_fat_cidadao_pec AND coalesce(cp.st_deletar,0)=0
    WHERE f.co_dim_tempo >= (SELECT first_exam FROM bounds) AND f.co_dim_tempo < (SELECT last_event FROM bounds)
      AND EXISTS (SELECT 1 FROM cohort_people x WHERE x.co_cidadao=cp.co_cidadao AND x.practice IN ('A','D'))
  ), historical_procedure_cbo AS (
    SELECT * FROM jsonb_to_recordset($6::jsonb) AS entry(code text,cbo text,first_month text,last_month text)
  ), local_procedure_cbo AS (
    SELECT DISTINCT p.co_proced AS code,c.co_cbo_2002 AS cbo,r.dt_competencia AS competence
    FROM rl_proced_cbo r JOIN tb_proced p ON p.co_seq_proced=r.co_proced JOIN tb_cbo c ON c.co_cbo=r.co_cbo
    WHERE r.st_ativo=1 AND r.dt_competencia NOT BETWEEN $7 AND $8
      AND p.co_proced IN (${literals(preventiveSigtapCodes)})
  ), local_sigtap_months AS (
    SELECT DISTINCT dt_competencia AS month FROM rl_proced_cbo WHERE dt_competencia NOT BETWEEN $7 AND $8
  ), vaccines AS (
    SELECT cp.co_cidadao,t.dt_registro AS day,f.dt_nascimento AS birth,
      (${validCns("btrim(p.nu_cns)")} AND a.unit IS NOT NULL AND k.nu_identificador IN ('9','14')
        AND NULLIF(btrim(f.nu_uuid_ficha),'') IS NOT NULL AND d.nu_uuid_ficha=f.nu_uuid_ficha AND d.nu_atendimento=f.nu_atendimento
        AND dose.nu_identificador IN ('1','2','3','8','9','32','33','34') AND strategy.nu_identificador ~ '^[0-9]+$'
        AND NULLIF(btrim(d.no_lote),'') IS NOT NULL AND NULLIF(btrim(manufacturer.no_fabricante),'') IS NOT NULL
        AND coalesce(btrim(manufacturer.no_fabricante),'-') NOT IN ('-','Não informado','NÃO INFORMADO')
        AND coalesce(d.st_aplicado_exterior,0)=0) IS TRUE AS qualified
    FROM vaccination_people people
    JOIN tb_fat_cidadao_pec cp ON cp.co_cidadao=people.co_cidadao AND coalesce(cp.st_deletar,0)=0
    JOIN tb_fat_vacinacao f ON f.co_fat_cidadao_pec=cp.co_seq_fat_cidadao_pec AND f.co_dim_tempo<$5
    JOIN tb_fat_vacinacao_vacina d ON d.co_fat_vacinacao=f.co_seq_fat_vacinacao
    JOIN tb_dim_imunobiologico product ON product.co_seq_dim_imunobiologico=d.co_dim_imunobiologico AND product.nu_identificador IN ('67','93')
    JOIN tb_dim_tempo t ON t.co_seq_dim_tempo=d.co_dim_tempo_vacina_aplicada
      AND t.co_seq_dim_tempo::text=to_char(t.dt_registro,'YYYYMMDD')
    LEFT JOIN aps_units a ON a.unit=f.co_dim_unidade_saude
    LEFT JOIN tb_dim_profissional p ON p.co_seq_dim_profissional=f.co_dim_profissional
    LEFT JOIN tb_dim_tipo_ficha k ON k.co_seq_dim_tipo_ficha=f.co_dim_tipo_ficha
    LEFT JOIN tb_dim_dose_imunobiologico dose ON dose.co_seq_dim_dose_imunobiologico=d.co_dim_dose_imunobiologico
    LEFT JOIN tb_dim_estrategia_vacinacao strategy ON strategy.co_seq_dim_estrategia_vacnacao=d.co_dim_estrategia_vacinacao
    LEFT JOIN tb_dim_imunobiologico_fabrcnt manufacturer ON manufacturer.co_seq_dim_imunobiol_fabrc=d.co_dim_imunobiologico_fabrc
    WHERE t.dt_registro<(SELECT latest FROM bounds)
  ), observations AS (
    SELECT e.co_cidadao,e.day,e.birth,CASE WHEN e.code IN (${literals(breast)}) THEN 'D' ELSE 'A' END AS practice,
      CASE WHEN e.code='${molecular}' THEN 60 WHEN e.code IN (${literals(breast)}) THEN 24 ELSE 36 END AS lookback,
      CASE WHEN NOT e.performed THEN true
        WHEN historical.code IS NOT NULL OR local.code IS NOT NULL THEN true
        WHEN to_char(e.day,'YYYYMM') BETWEEN $7 AND $8 OR coverage.month IS NOT NULL THEN false
        ELSE NULL END AS qualified
    FROM exams e
    LEFT JOIN historical_procedure_cbo historical ON historical.code=e.code AND historical.cbo=e.cbo
      AND to_char(e.day,'YYYYMM') BETWEEN historical.first_month AND historical.last_month
    LEFT JOIN local_procedure_cbo local ON local.code=e.code AND local.cbo=e.cbo AND local.competence=to_char(e.day,'YYYYMM')
    LEFT JOIN local_sigtap_months coverage ON coverage.month=to_char(e.day,'YYYYMM')
    UNION ALL
    SELECT a.co_cidadao,a.day,a.birth,'C',12,(a.participation IN ('2','3','4','5','6')) IS TRUE
    FROM appointments a WHERE ${hasCode("a.cids", sexualReproductiveCid)}
      OR ${hasCode("a.ciaps", sexualReproductiveCiap)} OR ${hasCode("a.exams", careAbp)}
    UNION ALL
    SELECT v.co_cidadao,v.day,v.birth,'B',NULL,v.qualified
    FROM vaccines v WHERE extract(year FROM age(v.day,v.birth)) BETWEEN 9 AND 14
  ), person_observations AS (
    SELECT c.month,c.practice,c.person,bool_or(o.qualified) IS TRUE AS qualified,
      bool_or(o.qualified IS FALSE) AS incomplete,
      bool_or(o.day IS NOT NULL AND o.qualified IS NULL) AS missing_sigtap
    FROM cohorts c LEFT JOIN observations o ON o.co_cidadao=c.co_cidadao AND o.practice=c.practice
      AND o.birth=c.dt_nascimento AND o.day>=c.dt_nascimento AND o.day<=c.anchor
      AND (o.lookback IS NULL OR o.day>=(c.anchor+1-make_interval(months=>o.lookback))::date)
      AND (o.lookback IS DISTINCT FROM 60 OR c.month>='2026-01')
    GROUP BY c.month,c.practice,c.person
  ), totals AS (
    SELECT month,practice,count(*) AS linked_people,
      count(*) FILTER (WHERE qualified) AS people_with_evidence,
      count(*) FILTER (WHERE NOT qualified AND incomplete) AS incomplete_evidence,
      count(*) FILTER (WHERE NOT qualified AND missing_sigtap) AS missing_sigtap_evidence
    FROM person_observations GROUP BY month,practice
  )
  SELECT coverage.*,p.month,k.practice,coalesce(t.linked_people,0) AS linked_people,
    coalesce(t.people_with_evidence,0) AS people_with_evidence,coalesce(t.incomplete_evidence,0) AS incomplete_evidence,
    coalesce(t.missing_sigtap_evidence,0) AS missing_sigtap_evidence
  FROM periods p CROSS JOIN coverage CROSS JOIN (VALUES ('A'),('B'),('C'),('D')) k(practice)
  LEFT JOIN totals t ON t.month=p.month AND t.practice=k.practice
  ORDER BY p.month,k.practice`;
