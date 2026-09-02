# M1/M2 Normative Identity Reconciliation

Data: 2026-08-17

## Baseline

| Item | Valor |
|---|---|
| Branch | `chore/m1-m2-certification-reconciliation` |
| `M12_RECONCILIATION_BASE_SHA` | `2140df10902eaf181049950b989c0d005a04e873` |
| Base esperada | descendente legitimo do P2 commit `1e940cda287eb641ca1197ea1c90a8e435404703` |
| Push | NO |

O worktree ja continha alteracoes locais fora desta missao (`README.md`, `docs/23-security/lgpd-qa-report.md`, assets e scripts soltos). Elas foram preservadas e nao fazem parte da correcao M1/M2.

## Autoridade normativa

| Indicador | Identidade oficial | Fonte | SHA-256 |
|---|---|---|---|
| M1 | Media de atendimentos por pessoa assistida pela eMulti na APS | Nota M1, SEI `0055952286` | `a54d272643037916225a249360a22363e587c0f19a4d79489d3961154c981d49` |
| M2 | Acoes interprofissionais realizadas pela eMulti na APS | Nota M2, SEI `0055952438` | `38bfc95af308f3c06604fbba3a61193939eb6fbb3a9abdd8f6c0aaa28934fbd3` |

Fonte versionada: `docs/11-indicator-field-catalog/sources/official-source-manifest-2026-07-25.json`.

## M1_M2_IDENTITY_AUDIT

| Artifact | Identifier | Declared title | Implemented formula | Unit | Rule version | Source contract | Runtime workload | Read model | Official expected identity | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| `Apps/rules/b360-rules/rules/m1/2026.6.json` | M1 | Media de atendimentos por pessoa | atendimentos individuais + participacoes coletivas / pessoas distintas | media | `M1@2026.6` | MIAI, MIAC, eMulti 72, pessoa identificada | n/a | n/a | M1 media | `CORRECT_M1` |
| `Apps/rules/b360-rules/rules/m2/2026.6.json` | M2 | Acoes interprofissionais | acoes compartilhadas / total de acoes x 100 | percentual | `M2@2026.6` | MIAI, MIAC, MIAOI, PEC care sharing | n/a | n/a | M2 acoes interprofissionais, polaridade neutra | `CORRECT_M2` |
| `Apps/rules/b360-rules/src/indicator_registry.rs` | M1/M2 specs | source IDs/hashes corretos | n/a | n/a | `M1@2026.6`, `M2@2026.6` | hashes oficiais | n/a | n/a | M1->SEI 0055952286, M2->SEI 0055952438 | `CORRECT_M1` / `CORRECT_M2` |
| `Apps/rules/b360-rules/src/emulti.rs` | M1 aggregate | M1 mean | `calculate_m1_counts(individual_attendances, collective_participations, distinct_people)` | media | `M1@2026.6` | eMulti CBO/team constants | n/a | n/a | M1 media | `CORRECT_M1` |
| `Apps/rules/b360-rules/src/emulti.rs` | M2 aggregate | M2 percentage | `M2Aggregate::from_counts(shared_actions, total_actions)` | percentual | `M2@2026.6` | shared action rules | n/a | n/a | M2 percentual | `CORRECT_M2` |
| `Apps/rules/b360-rules/src/emulti_source_contract.rs` | M1 contract | M1 source requirements | MIAI + MIAC participants + people | media input | n/a | 9 required source tables | n/a | n/a | M1 source closure | `CORRECT_M1` |
| `Apps/rules/b360-rules/src/emulti_source_contract.rs` | M2 contract | M2 source requirements | shared/specific action model | percentual input | n/a | 14 required source tables incl. MIAOI, propart, care sharing, lotacao/prof | n/a | n/a | M2 source closure | `CORRECT_M2` |
| `Apps/rules/b360-rules/src/emulti_materialize.rs` | M1 materializer | M1 branch | `individual_attendances + collective_participations` over `distinct_people` | media | `M1@2026.6` | source diagnostic M1 | set-based SQL | `numerator_count=total_attendances`, `denominator_count=distinct_people` | M1 media | `CORRECT_M1` |
| `Apps/rules/b360-rules/src/emulti_materialize.rs` | M2 materializer | M2 branch | shared individual/dental/collective/care actions over total actions | percentual | `M2@2026.6` | source diagnostic M2 | set-based SQL + dedupe | `numerator_count=shared_actions`, `denominator_count=total_actions` | M2 acoes | `CORRECT_M2` |
| `Apps/rules/sus-aps-rule-engine/fixtures/m1-active-proven-input-v1.json` | M1 golden | M1 active proven | `300 + 87 / 320` | media | `M1@2026.6` | `emulti-m1-source@1` | fixture | expected `387/320 = 1.209375` | M1 media | `M1_GOLDEN_CORRECT` |
| `Apps/rules/b360-rules/tests/fixtures/m2-active-proven-input-v1.json` | M2 golden/parity | M2 active proven | `6 / 120 * 100` | percentual | `M2@2026.6` | `emulti-m2-source@2026.6` | fixture | expected `5.000000%` | M2 acoes | `M2_GOLDEN_CORRECT` |
| `docs/10-indicators/b360-rust-authority-matrix.json` | M1 runtime evidence | Nota M1 | `387/320 = 1.209375` | media | `M1@2026.6` | 8/8 fontes | materialized | READY/SUFFICIENT | M1 media | `CORRECT_M1` |
| `docs/10-indicators/b360-rust-authority-matrix.json` | M2 runtime evidence | Nota M2 | `3/410 = 0.731707%` | percentual | `M2@2026.6` | 10/10 fontes incl. MIAOI/care sharing | materialized | READY/REGULAR | M2 acoes | `CORRECT_M2` |
| `.ai/CONTEXT/indicator-registry.json` | M2 polarity | Acoes interprofissionais | shared/total x 100 | percentual | n/a | semantic registry | n/a | n/a | polaridade neutra | `FORMULA_CORRECT_POLARITY_FIXED` |
| `docs/10-indicators/saude-brasil-360-coverage-matrix.*` | M1/M2 rows | antes invertido | legado TypeScript auditado em 2026-05-05 | misto | legado | legado | legado | n/a | nomes/fontes oficiais corretos | `LABEL_SWAPPED_FIXED` |
| `docs/11-indicator-field-catalog/audit-context-alignment-2026-05-21.md` | historical audit | registra divergencia M1/M2 | n/a | n/a | legado | legado | n/a | n/a | evidencia historica da divergencia | `HISTORICAL_ONLY` |

## Semantica implementada

`CURRENT_M1_IMPLEMENTED_SEMANTICS=INDIVIDUAL_ATTENDANCES_PLUS_COLLECTIVE_PARTICIPATIONS / DISTINCT_IDENTIFIED_PEOPLE`.

`CURRENT_M2_IMPLEMENTED_SEMANTICS=SHARED_ACTIONS / TOTAL_ACTIONS * 100`.

Logo, a implementacao Rust, os packages versionados, os contratos de fonte, os goldens e a evidencia runtime atual nao estao invertidos.

## Root cause

A inversao ocorreu em artefatos historicos/derivados de inventario, especialmente `docs/10-indicators/saude-brasil-360-coverage-matrix.*`, que auditavam o caminho TypeScript legado em 2026-05-05. Depois, o Rust authority matrix, o manifesto oficial e os packages de regras foram corrigidos, mas a matriz historica continuou carregando M1 como Nota M2 e M2 como Nota M1. Tambem havia um detalhe normativo no registro semantico: M2 estava com polaridade `maior_melhor`, enquanto a nota/pacote M2 indicam `NEUTRAL`.

## Impacto historico e dados persistidos

Nao foi feita mutacao produtiva. A evidencia persistida descrita nos manifests atuais e semanticamente coerente:

- M1 historico materializado: `387/320 = 1.209375`, portanto corresponde ao M1 oficial.
- M2 materializado: `3/410 = 0.731707%`, portanto corresponde ao M2 oficial.
- Constraints/read models de M1/M2 ja diferenciam media e percentual; nao ha necessidade de `UPDATE` em massa, rebuild ou invalidação por swap de identidade.

## Fix aplicado

- Corrigida a polaridade M2 para `neutra` em `.ai/CONTEXT/indicator-registry.json`.
- Corrigidas as linhas M1/M2 da matriz legada `docs/10-indicators/saude-brasil-360-coverage-matrix.*`, preservando o contexto historico de auditoria do legado.
- Atualizada a matriz operacional e o registry oficial para M2 neutra e source contract completo.
- Atualizado o backlog P2 em `Apps/web/todo.md`.
- Criados artefatos P2 ausentes: `docs/12-indicator-certification/inventory.json`, `docs/11-indicator-field-catalog/operational-matrix-v2.md` e `docs/02-architecture/indicator-certification-program-v1-2026-08-16.md`.
- Adicionado teste estruturado em `Apps/server/api/src/indicators/__tests__/b360-rust-authority-matrix.test.ts` para travar M1/M2 contra nova inversao.

## M2_OFFICIAL_SEMANTIC_GAPS

No Rust source auditado, os requisitos centrais de M2 oficial estao representados: MIAI, MIAC, MIAOI, Compartilhamento do Cuidado PEC, acoes compartilhadas, acoes totais, CBO/eMulti, composicao multiprofissional e deduplicacao. Gaps restantes sao de expansao de materializacao/evidencia para novos escopos e competencias, nao de identidade normativa M1/M2.

## QA

| Gate | Resultado |
|---|---|
| Teste autoridade Rust/identidade M1/M2 | PASS — 16/16 |
| Golden M1 active proven | PASS — 3/3 |
| M2 parity | PASS — 9/9 unitarios filtrados |
| `git diff --check` | PASS |
| JSON parse | PASS |
| Varredura swap M1/M2 ativa | PASS — nenhuma ocorrencia ativa; apenas auditoria historica 2026-05-21 |
| LGPD | PASS sem FAIL; 14 WARN em fixtures preexistentes |
| Secret scan focal | PASS sem segredo novo; apenas referencias textuais a PII/secret scan em docs |

## Decisao de migracao

Cenario aplicado: metadata/documentacao/inventario parcialmente errados; formulas, packages, rule IDs, rule versions, goldens e runtime Rust corretos. Nao houve swap de diretorios, rewrite logico, mutacao no banco, alteracao frontend, PEC real ou push.

## Status final

`M1_M2_NORMATIVE_IDENTITY_RECONCILED`.

M1 e M2 continuam com evidencia `ACTIVE_AND_PROVEN` no escopo auditado. Esta missao nao promove nenhum indicador a `CERTIFIED`.

## Commits

- `0f00191` — `fix(indicators): reconcile official M1 and M2 identities`
- `2e1ca91` — `test(indicators): lock M1 M2 normative identity mapping`
- Este relatorio foi registrado em commit local separado, sem push.
