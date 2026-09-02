# Post-Implementation Hardening - IND_21

> **Escopo do projeto: 21 metricas operacionais** = 15 Qualidade APS (B1-B6, C1-C7, M1-M2) + 6 CVAT (CVAT1-CVAT6).
> Registro canonico: [official-indicators-registry.md](official-indicators-registry.md)

Data de consolidacao: `2026-05-20`

## 1. Fonte de verdade desta fase
- runtime publico canonico: `https://esus-sync.dmtechnology.com.br`
- router canonico: `saudeBrasil360.calcularIndicador`
- runtime: `server-api-dist` em `Apps/server/api/dist/index.js`
- registro oficial versionado: `docs/indicator-field-catalog/sources/official-sources-registry.md`
- referencias metodologicas locais obrigatorias: `docs/Saude Brasil 360/*`

## 2. Status final do IND_21

| Indicador | Status runtime | Status normativo | ruleVersion | Resultado publico validado | Warnings ativos (resumo) | Proxies/fallbacks ativos | Fonte oficial vinculada | Risco LGPD | Prioridade | Proximo passo |
|---|---|---|---|---|---|---|---|---|---|---|
| `C1` | `blocked_by_source` | `C1_BLOCKED_BY_DATA_CONTRACT` | não promovida | nenhum valor certificado | campos canônicos ausentes | heurísticas proibidas | validar fonte oficial e contrato versionado | alto | `P0` | alinhar tipo de demanda e atribuição INE/CNES |
| `C2` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `C2@2026.1` | `0/19 = 0` | `requires_official_validation` | fallback explicito em `ds_filtro_proced_*` | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C2-007` | alto | `P2` | revisar code set oficial |
| `C3` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `C3@2026.1` | `0/19 = 0` | `requires_official_validation` | coorte/janela agregadas | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C3-008` | alto | `P2` | revisar janela oficial |
| `C4` | `validated_runtime_public` | `requires_official_validation` | `C4@2026.2` | `6425/14800 = 43.41` | `requires_official_validation`, `C4_WEIGHTED_PRACTICES_DENOMINATOR` | proxies clinicos de consulta, PA, antropometria, HbA1c e pe diabetico | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C4-021` | medio | `P1` | homologar code sets clinicos |
| `C5` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `C5@2026.4` | `26375/52000 = 50.72` | `requires_official_validation`, `C5_WEIGHTED_PRACTICES_DENOMINATOR`, `C5_HOME_VISIT_HYPERTENSION_FLAG_REQUIRED` | hipertensao por `tb_fat_cad_individual`; consulta/PA/antropometria/visita com proxies operacionais explicitos | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C5-009` | medio | `P1` | revisar escopo de consulta e medicao |
| `C6` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `C6@2026.1` | `23825/52600 = 45.29` | `requires_official_validation`, `C6_TEAM_TYPE_SCOPE_NOT_ENFORCED` | denominador ponderado e acompanhamento por proxy | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C6-010` | medio | `P1` | fechar escopo de equipe |
| `C7` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `C7@2026.1` | `8310/66700 = 12.46` | `requires_official_validation`, `C7_SSR_SCOPE_CIAP_CID_PROXY`, `C7_VACCINE_EVIDENCE_DRIVEN_BY_FAT_VACINACAO` | SSR por proxy clinico e evidencia vacinal em `tb_fat_vacinacao` | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EAP-006`, `SRC-IND-C7-011` | alto | `P1` | reduzir proxies clinicos |
| `B1` | `validated_runtime_public` | `requires_official_validation` | `B1@2026.3` | `0/0`, `blocked_by_source` | `requires_official_validation`, `B1_DENOMINATOR_INCONSISTENT` | denominador proxy eSB nao fechado | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013` | medio | `P0` | fechar denominador normativo |
| `B2` | `validated_runtime_public` | `requires_official_validation` | `B2@2026.2` | `58/246 = 23.58` | `requires_official_validation` | base de tratamento e resolutividade por proxy | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013` | medio | `P1` | homologar resolutividade |
| `B3` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `B3@2026.3` | `77/575 = 13.39` | `requires_official_validation`, `B3_EXODONTIA_RATE_OFFICIAL_SIGTAP` | code set de exodontia/preventivos/curativos ainda depende de revisao final | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B3-022` | medio | `P1` | validar lista completa SIGTAP |
| `B4` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `B4@2026.3` | `0/402 = 0` | `requires_official_validation`, `B4_SCHOOL_POPULATION_6_TO_12` | populacao de referencia por unidade e atividade coletiva | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B4-023` | medio | `P1` | revisar unidade/populacao de referencia |
| `B5` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `B5@2026.3` | `359/945 = 37.99` | `requires_official_validation`, `B5_PREVENTIVE_PROCEDURE_SHARE_OFFICIAL_SIGTAP` | denominator = total procedimental individual e code set preventivo oficial | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B5-024` | medio | `P1` | revisar escopo CBO preventivo |
| `B6` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `B6@2026.3` | `7/113 = 6.19` | `requires_official_validation`, `B6_ART_SHARE_OVER_RESTORATIVE_PROCEDURES` | ART/restauradores por SIGTAP oficial; sem coletiva | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-ESB-012`, `SRC-ESB-013`, `SRC-IND-B6-025` | medio | `P1` | revisar code set restaurador final |
| `M1` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `M1@2026.2` | `618/120 = 5.15` | `requires_official_validation`, `M1_RESULT_IS_MEAN_PER_PERSON` | media por pessoa e escopo eMulti por proxy | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EMULTI-014`, `SRC-EMULTI-015`, `SRC-EMULTI-018` | medio | `P1` | homologar semantica da media |
| `M2` | `validated_runtime_public` | `official_validated_pending_review` + `requires_official_validation` | `M2@2026.2` | `106/128 = 82.81` | `requires_official_validation`, `M2_SHARED_ACTION_PROXY_BY_MULTIPROF_SIGNALS` | composicao multiprofissional por proxy | `SRC-CTX-001`, `SRC-CTX-005`, `SRC-EMULTI-014`, `SRC-EMULTI-015`, `SRC-EMULTI-019` | medio | `P1` | homologar definicao oficial de acao interprofissional |

## 3. Warnings, proxies e fallbacks agrupados

### normative
- `requires_official_validation` em todos os 15 indicadores de Qualidade APS publicados.
- CVAT1-CVAT6 como `derived-operational-rule` (aguardando nota metodologica detalhada).

### source/schema
- guardas sanitizados `SCHEMA_MISSING_TABLE`, `SCHEMA_MISSING_COLUMN`, `SOURCE_REFERENCE_DATA_INCOMPLETE`.
- `B1_DENOMINATOR_BLOCKED_BY_DATA` como bloqueio honesto de fonte/dado.

### scope
- `C1_TEAM_TYPE_SCOPE_NOT_ENFORCED`
- `C6_TEAM_TYPE_SCOPE_NOT_ENFORCED`
- `B_ESB_TEAM_SCOPE_NOT_ENFORCED`
- `B_ESB_TEAM_SCOPE_BY_DS_FILTRO_PROXY`
- `B_ODONTO_CBO_SCOPE_BY_DIM_CBO_PROXY`
- `M_EMULTI_SCOPE_BY_DS_FILTRO_PROXY`
- `M_EMULTI_PROFESSIONAL_PROFILE_BY_TEAM_PROXY`

### clinical/code set
- `C4_CONSULTA_CBO_PREFIX_PROXY`
- `C4_BP_MEASUREMENT_PROXY_BY_VITAL_SIGNS_OR_PROCEDURE`
- `C5_BP_MEASUREMENT_PROXY_BY_VITAL_SIGNS_OR_PROCEDURE`
- `C5_CONSULTA_CBO_PREFIX_PROXY`
- `C7_SSR_SCOPE_CIAP_CID_PROXY`
- `C7_VACCINE_EVIDENCE_DRIVEN_BY_FAT_VACINACAO`
- `B3_EXODONTIA_RATE_OFFICIAL_SIGTAP`
- `B5_PREVENTIVE_PROCEDURE_SHARE_OFFICIAL_SIGTAP`
- `B6_ART_SHARE_OVER_RESTORATIVE_PROCEDURES`
- `M2_SHARED_ACTION_PROXY_BY_MULTIPROF_SIGNALS`

### denominator
- `C4_WEIGHTED_PRACTICES_DENOMINATOR`
- `C5_WEIGHTED_PRACTICES_DENOMINATOR`
- `C6_WEIGHTED_PRACTICES_DENOMINATOR`
- `C7_WEIGHTED_COHORT_DENOMINATOR`
- `B1_ACTIVE_REGISTER_DENOMINATOR_PROXY`
- `B1_DENOMINATOR_INCONSISTENT`
- `M1_RESULT_IS_MEAN_PER_PERSON`

### data freshness
- nenhum warning publico de freshness apareceu neste smoke.
- manter monitoramento por `freshnessStatus` e `sourceHealth`.

## 4. Ranking de hardening

### P0
- `B1` com denominador normativo ainda nao fechado.
- drift operacional do bootstrap local direto em `3003` quando o processo nao sobe com `.env` carregado.
- registry ainda precisa de amarracao final de observacoes normativas por indicador, mesmo com o P0 funcional corrigido.

### P1
- proxies de escopo de equipe em `C1`, `C6`, `B2..B6`, `M1`, `M2`.
- proxies clinicos em `C4`, `C5`, `C7`.
- code sets odontologicos ainda dependem de validacao final por nota metodologica individual.

### P2
- padronizar texto e UX dos warnings.
- limpar referencias documentais antigas fora do endpoint canonico.
- consolidar criterios de freshness no catalogo e runbook.

## 5. Criterio de saida desta fase
- nenhum indicador novo entra antes de revisar este documento.
- nenhum warning sai sem fonte oficial especifica revisada.
- nenhum proxy/fallback sai sem evidencia local + publica.
- `validated_runtime_public` nao deve ser confundido com `normative_validated`.
