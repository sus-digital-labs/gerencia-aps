# Multi-Cell Runtime E2E Final — 2026-08-15

## Classificação

> **`HOMOLOGATION_MULTI_CELL_PARTIAL_BLOCKED`**

A classificação alvo **`MULTI_CELL_RUNTIME_PIPELINE_E2E_VALIDATED` não foi declarada**. O source package M1 foi fechado em ambas as cells, o fluxo real de materialização foi exercitado, o cursor seletivo foi reconstruído com o binário recompilado e o isolamento RLS foi validado com roles não privilegiados. Entretanto, a validação E2E não alcançou todos os gates obrigatórios: o restart LKG falhou quando o Control Plane ficou indisponível, o downstream adaptativo deixou jobs pendentes e nenhum read model M1 foi materializado de forma observável sob escopo RLS. Por consequência, paridade A×B, golden match, BFF real, fencing, exactly-once effect, fault matrix pós-materialização e isolamento de falha entre cells permanecem sem evidência suficiente.

A decisão é conservadora e segue a regra operacional do projeto: uma execução parcial não pode ser promovida à classificação E2E validada apenas porque o CLI retornou `READY` ou porque um replay idempotente retornou `READY`.

## 1. Baseline, branch e mudanças versionadas

A execução continuou exatamente na branch `mission/multicell-e2e-20260815`, sem push. O HEAD final é `1ebaeb8a2fe70aa50e067c77cab923502ecd4470`. Os commits anteriores `ddd645e` e `1e8b1d6` foram preservados. Foram adicionados somente dois commits temáticos durante esta continuação:

| Commit | Alteração | Verificação |
|---|---|---|
| `13eaf40` | Separação do pool de autenticação do Control Plane no receiver e correção do binding entre município interno e código IBGE externo. | `cargo fmt`, `cargo check` e `cargo test` do `dm-sync-ingest`: 102 passed, 14 ignored. Probe real passou de HTTP 503 para autenticação efetiva; a rejeição subsequente foi HTTP 409 de snapshot pendente. |
| `1ebaeb8` | Inclusão opcional de `authority_municipality_id` no `MaterializationRequest`, usado somente para resolver SCNES/e-Gestor; probes/read model continuam usando o município interno. | `cargo fmt`, `cargo check` e `cargo test` de `b360-rules`: 228 testes unitários e testes de integração concluídos sem falhas. |

A working tree terminou sem mudanças versionadas pendentes. Permanecem somente seis arquivos não rastreados preexistentes do ambiente (`.checkpoint.b64`, `.release-hardening-territory_map.inspect.rs`, `.remote-probe.txt`, `build-receiver-runtime.cmd`, `build_source.ps1` e `release_hardening_territory_map_inspect.rs`); eles não foram adicionados aos commits.

## 2. Runtime e artefatos sintéticos

Foram utilizados somente os recursos descartáveis identificados pela missão: Control Plane PostgreSQL, dois data planes PostgreSQL, dois Redis e o PostgreSQL sintético de origem PEC. Todos os seis containers foram parados no cleanup final. Não houve uso de PEC real, dados nominais reais, segredo de produção, inserção manual de `materialization_results`, read model, source gate ou resultado clínico.

Os fixtures de authority foram sintéticos e marcados operacionalmente como `SYNTHETIC_HOMOLOGATION_DATA`. O SCNES foi um ZIP com `EQUIPESValidasBrasil.txt` de registros fixos de 243 bytes; o e-Gestor foi um array JSON camelCase. Os valores utilizados foram competência `2026-07-01`, INE `1000000001`, tipo de equipe `72`, código municipal externo `123450` e CNES sintético por município. Nenhum fixture continha resultado clínico.

Os binários executados foram recompilados a partir do checkout atual e copiados ao cache isolado da missão. Os hashes finais observados foram:

| Binário | SHA-256 |
|---|---|
| `pec-agent-sync.exe` | `92CEFA085C8CA1943042D92EE6901020C2056317A6B326DA91EA2C61DCE91B11` |
| `dm-sync-ingest.exe` | `34C2439B94F81744C4A9DA648D5F6D0E3DDA45DD8BA3D4F5E7E0CC4DDC395B` |
| `b360-materialize.exe` | `18FB5E51CFA9449F5668706C374D609FC8C084AD094AD79BCE3E72936581C4` |

## 3. Gate matrix final

A lista operacional herdada contém gates de baseline e gates do pipeline. A tabela abaixo registra os 17 gates E2E tratados como classificação, além de indicar claramente quando o resultado não é suficiente para promoção.

| Gate | Resultado | Evidência objetiva |
|---|---|---|
| `LKG_RESTART_VALIDATED` | **FAIL** | Com Control Plane parado, o restart real do agent A terminou com `HTTP 503 authentication service unavailable`. Não houve uso comprovado de assignment LKG sem nova negociação. |
| `SELECTIVE_CURSOR_REBUILD_VALIDATED` | **PASS** | Após recompilar o agent, o probe exclusivo de `tb_cid10` usou `co_seq_cid10`, terminou `status=ok` e substituiu `legacy-text-cursor` por `00000000000000000002`; checkpoints de `tb_dim_cbo`, `tb_dim_equipe` e `tb_dim_profissional` permaneceram. |
| `M1_SOURCE_PACKAGE_READY_A` | **PASS** | `diagnose-M1-A-ready-final.json`: `ready=true`, source contract READY, SCNES válido, e-Gestor homologado e `reason_codes=[]`. O diagnóstico resolve authority pelo `authority_municipality_id=1234501`. |
| `M1_SOURCE_PACKAGE_READY_B` | **PASS** | `diagnose-M1-B-ready-final.json`: `ready=true`, source contract READY, SCNES válido, e-Gestor homologado e `reason_codes=[]`, com authority externa `1234502`. |
| `M1_MATERIALIZATION_COMPLETED_A` | **PASS** | CLI real retornou `result_status=READY`, `quality_status=OK`, `coverage_status=COVERED_WITH_EVIDENCE`, `freshness_status=CURRENT` e `replayed=false`. |
| `M1_MATERIALIZATION_COMPLETED_B` | **PASS_WITH_REPLAY** | CLI real retornou `READY`, `OK`, `COVERED_WITH_EVIDENCE`, `CURRENT` e `replayed=true`. O replay foi real e idempotente, mas não substitui a evidência de read model downstream. |
| `M1_READ_MODEL_VALIDATED_A` | **BLOCKED** | Sob escopo RLS correto, `adaptive_m1_read_models` permaneceu com zero linhas e havia jobs adaptativos pendentes. |
| `M1_READ_MODEL_VALIDATED_B` | **BLOCKED** | Não houve evidência de read model B observável sob escopo RLS; o resultado CLI foi replay, não uma validação de projeção downstream. |
| `M1_ZERO_DIFF_PARITY_VALIDATED` | **NOT_RUN** | Sem read models A/B atuais, não foi possível comparar payload semântico, hashes e métricas. |
| `M1_GOLDEN_MATCH_VALIDATED` | **NOT_RUN** | Não foi produzido um match golden válido nesta execução; não foi usado golden clínico real. |
| `BFF_REAL_READ_MODEL_ROUTING_VALIDATED` | **NOT_RUN** | O BFF não foi exercitado contra read models M1 confirmados. |
| `DYNAMIC_CROSS_TENANT_RLS_VALIDATED` | **PASS** | Com roles temporários `NOSUPERUSER NOBYPASSRLS`, cada cell retornou 6 linhas no escopo correto e 0 linhas para tenant ou município cruzados. Os roles foram removidos no cleanup. |
| `NORMALIZER_RECLAIM_VALIDATED` | **BLOCKED** | O downstream deixou jobs `normalized_chunk_summary_v1` pendentes; o worker de materialização reivindica `adaptive_m1_v1`. Não houve reclaim observável. |
| `MATERIALIZER_FENCING_VALIDATED` | **NOT_RUN** | Sem job downstream processado e sem read model, não foi possível provar fencing por lease/token. |
| `MATERIALIZATION_EXACTLY_ONCE_EFFECT_VALIDATED` | **BLOCKED** | O replay CLI foi observado, mas `materialization_results` e `adaptive_m1_read_models` permaneceram vazios sob escopo correto; não há efeito persistido para validar exactly-once. |
| `POST_MATERIALIZATION_FAULT_MATRIX` | **NOT_RUN** | Dependente de read model/materialization downstream confirmado. |
| `CELL_FAILURE_DOMAIN_ISOLATED_RUNTIME` | **NOT_RUN** | A fault matrix entre CELL-001 e CELL-002 não foi executada após a materialização completa. |

Os gates de baseline herdados permaneceram passados: contrato tipado de cursor, `cargo fmt --check`, `cargo check`, `cargo clippy -- -D warnings`, suíte Rust anterior, TypeScript typecheck e EdgeState restart probe. As suítes específicas desta continuação também passaram: `dm-sync-ingest` com 102 testes passados e `b360-rules` com 228 testes passados.

## 4. Causa raiz dos blockers

O primeiro blocker novo foi arquitetural no receiver. O endpoint de ingest usava o pool configurado em `INGEST_DATABASE_URL` também para consultar `agent_registry` e `agent_registrations`. Como o runtime separa Control Plane e data plane, essa consulta produzia dependency error e HTTP 503. O commit `13eaf40` introduziu `INGEST_AUTH_DATABASE_URL`, manteve fallback backward-compatible e encaminhou somente autenticação ao pool do Control Plane.

Depois da correção, a autenticação efetiva passou. O próximo erro foi `agent_binding_ambiguous`, porque `agent_registry.municipio_id` representa o município interno (`municipality-A`), enquanto `agent_registrations.municipioIbge` representa o código externo (`1234501`). A comparação direta entre esses domínios foi removida; instalação e escopo interno continuam obrigatórios, e o payload ainda precisa coincidir com a identidade interna.

O segundo blocker de produto foi a ausência de ponte explícita para authority externa no contrato M1. Os requests já continham `authority_municipality_id`, mas o Rust ignorava o campo e consultava SCNES/e-Gestor com `municipality_id` interno. O commit `1ebaeb8` tornou o campo opcional e utilizou-o exclusivamente no diagnóstico authority, preservando o município interno para source probes, read model e RLS.

O terceiro blocker permanece no downstream adaptativo. A execução deixou 1.624 jobs `normalized_chunk_summary_v1` pendentes em CELL-001, enquanto o materializer adaptativo reivindica o workload `adaptive_m1_v1`. Com isso, o CLI M1 pode retornar `READY`, mas o efeito downstream não é observável em `materialization_results` nem em `adaptive_m1_read_models` sob o escopo correto.

## 5. Cleanup e integridade operacional

O Control Plane, os dois data planes, os dois Redis e o PEC source PostgreSQL foram parados. Os processos `pec-agent-sync.exe` e `dm-sync-ingest.exe` foram encerrados. Os roles temporários de probe RLS foram removidos com `DROP OWNED` seguido de `DROP ROLE`. Estados EdgeState e launchers auxiliares criados exclusivamente para LKG/cursor foram removidos. Não houve push.

> O runtime descartável terminou sem containers `mc-runtime` em execução e sem listeners nas portas operacionais da missão. O socket residual observado em `FIN_WAIT2` na porta 55533 não era listener ativo e pertenceu ao teardown TCP do container parado.

## 6. Próximas ações recomendadas

A primeira ação deve ser corrigir o contrato do downstream para que a transição de `normalized_chunk_summary_v1` para `adaptive_m1_v1` seja produzida pelo caminho real, com idempotência e reclaim de lease observáveis. A segunda deve repetir materialização e validar que cada cell produz uma linha de `materialization_results` e um read model M1 sob uma role `NOSUPERUSER NOBYPASSRLS`. A terceira deve executar, nessa ordem, parity A×B, golden, BFF, fencing, exactly-once e fault matrix, somente então reavaliando a classificação.

## Referências

[1]: ./multi-cell-runtime-e2e-closure-2026-08-15.md "Relatório de fechamento anterior e limites de evidência"
[2]: ../../Apps/agent/pec-agent-sync/src/catalog.rs "Catálogo e contrato tipado de cursor"
[3]: ../../Apps/agent/pec-agent-sync/src/checkpoint.rs "CheckpointStore e incompatibilidade seletiva"
[4]: ../../Apps/rules/b360-rules/src/emulti_materialize.rs "Diagnóstico M1 e resolução de authority"
[5]: ../../Apps/rules/b360-rules/src/emulti_team_authority.rs "Importação sintética SCNES/e-Gestor"
[6]: ../../Apps/ingest/dm-sync-ingest/src/adaptive_downstream.rs "Fila adaptativa, leases e read model downstream"
[7]: ../../Apps/ingest/dm-sync-ingest/src/main.rs "Autenticação do receiver e pool do Control Plane"
