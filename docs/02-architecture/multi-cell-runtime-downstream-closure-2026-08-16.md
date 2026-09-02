# Fechamento Downstream M1 e LKG do Receiver — 2026-08-16

## Resumo executivo

A missão foi concluída na branch `mission/multicell-e2e-20260815`, sem reiniciar contratos já validados, sem alterar o cap de cinco municípios, sem tocar Billing/geocode/SCNES/e-Gestor e sem utilizar PEC real ou dados nominais reais. O downstream adaptativo M1 passou a receber o `SOURCE_PACKAGE_READY` de forma transacional, idempotente e durável, produzindo exatamente um workload lógico `adaptive_m1_v1` por escopo/competência/rule version/source snapshot. O receiver também passou a autenticar instalações conhecidas a partir de snapshot local antes de consultar o Control Plane, com fallback fail-closed para instalações desconhecidas.

> **Classificação final:** `MULTI_CELL_RUNTIME_PIPELINE_E2E_VALIDATED`
>
> **Escopo da classificação:** pipeline runtime multi-cell sintético validado ponta a ponta, incluindo handoff M1, materialização, read model, RLS, replay idempotente, fencing e autenticação LKG.

A classificação não declara capacidade nacional, prova de escala ou prontidão de produção. Permanecem deliberadamente: `CAPACITY_NOT_YET_PROVEN`, `NATIONAL_SCALE_NOT_PROVEN` e `PRODUCTION_READINESS_NOT_DECLARED`.

## Estado do branch e commits temáticos

O estado de evidência deste relatório foi coletado em `8133b95`, último commit funcional antes da documentação final. A documentação será adicionada em commit temático próprio, sem push.

| Commit | Tema | Evidência |
|---|---|---|
| `ddd645e` | `fix(agent): preserve typed incremental cursors` | Contrato de cursor tipado e rebuild seletivo |
| `8e6ea56` | `fix(materialization): reorder SET TRANSACTION before set_local_scope` | Ordem transacional da materialização |
| `13eaf40` | `fix(ingest): route agent auth through control plane pool` | Autenticação via pool do Control Plane |
| `1ebaeb8` | `fix(m1): resolve authority with external municipality code` | Resolução de autoridade M1 |
| `03fa295` | `fix(adaptive): bridge ready source package to m1 workload` | Handoff durável M1 e reconciliação |
| `7da0d69` | `fix(ingest): authenticate known agents from cell-local snapshot` | LKG local com fallback fail-closed |
| `a99f17f` | `test(multicell): add runtime closure probes` | Closure multi-cell e RLS negatives |
| `239f1f6` | `test(multicell): align live worker fixtures with cell schema` | Fixtures live cell-local e fencing |
| `8133b95` | `fix(ingest): satisfy auth snapshot ownership lint` | QA estrito do caminho LKG |

Os arquivos não rastreados preexistentes `.checkpoint.b64`, `.release-hardening-territory_map.inspect.rs`, `.remote-probe.txt`, `build-receiver-runtime.cmd`, `build_source.ps1` e `release_hardening_territory_map_inspect.rs` foram preservados e não foram incluídos nos commits.

## Matriz de gates

Todos os gates funcionais e de qualidade exigidos foram executados. O gate de dependências foi avaliado sobre o grafo efetivamente habilitado do receiver: o `cargo tree` para o target Windows não contém `rsa`, `sqlx-mysql` ou `spin`; o lockfile histórico ainda contém pacotes opcionais/inativos, por isso o `cargo audit` bruto reporta `RUSTSEC-2023-0071` em `rsa 0.9.10` sem upgrade corretivo e um warning de pacote yanked para `spin 0.9.8`. A auditoria com o advisory explicitamente isolado retornou código zero e nenhum advisory ativo adicional. Esta é uma exceção de escopo documentada, não uma ocultação de vulnerabilidade.

| Gate | Resultado | Evidência objetiva |
|---|---|---|
| `TYPED_CURSOR_CONTRACT` | **PASS** | Contrato tipado preservado no commit `ddd645e`. |
| `SELECTIVE_CURSOR_REBUILD_VALIDATED` | **PASS** | Rebuild seletivo executado e validado no runtime sintético. |
| `M1_SOURCE_PACKAGE_READY_A` | **PASS** | Source package pronto na CELL-001. |
| `M1_SOURCE_PACKAGE_READY_B` | **PASS** | Source package pronto na CELL-002. |
| `DYNAMIC_CROSS_TENANT_RLS_VALIDATED` | **PASS** | Leitura negativa por município/tenant com papel sem `BYPASSRLS`. |
| `CAPACITY_POLICY_MAX_5_NEAR_4` | **PASS** | Política de capacidade preservada em máximo 5 e near-capacity 4. |
| `ADAPTIVE_WORKLOAD_HANDOFF` | **PASS** | Dispatcher `dispatch_m1_from_source_package()` lê manifests/componentes, monta `CanonicalRuleInputV1` e cria `adaptive_m1_v1` idempotente. |
| `M1_REPLAY_IDEMPOTENCY` | **PASS** | Replay do mesmo source package manteve um job lógico, um resultado e hash sem duplicação. |
| `SOURCE_PACKAGE_RECONCILIATION` | **PASS** | Reconciliador cria job ausente para package READY e não entra em loop infinito. |
| `LKG_CONTROL_PLANE_DEPENDENCY` | **PASS** | Snapshot local autenticou com Control Plane parado; instalação desconhecida falha closed com 401. |
| `LKG_NEGATIVE_MATRIX` | **PASS** | unknown-agent, wrong-tenant, wrong-municipality e wrong-cell retornaram 401; expired e revoked retornaram 403. |
| `MULTI_CELL_RUNTIME_CLOSURE` | **PASS** | Script versionado emitiu 18 probes PASS e `PASS\|MULTI_CELL_RUNTIME_PIPELINE_E2E_VALIDATED`. |
| `EXACTLY_ONCE_AND_FENCING` | **PASS** | `live_worker_recovers_pending_and_fences_out_of_order_events` passou após fixtures alinhados ao schema cell-local. |
| `REDIS_B_FAILURE_AUTHORITY` | **PASS** | Redis da CELL-002 desligado; PostgreSQL B permaneceu autoridade e RLS retornou B=1/A=0. |
| `RLS_FORCE_POLICY` | **PASS** | `adaptive_m1_read_models` e `cell_installation_auth_snapshots` com RLS e FORCE RLS em ambas as cells. |
| `CARGO_FMT_CHECK` | **PASS** | `cargo fmt --check --manifest-path Apps/ingest/dm-sync-ingest/Cargo.toml`. |
| `CARGO_CHECK` | **PASS** | `cargo check --all-targets` concluído sem erros. |
| `CARGO_CLIPPY_D_WARNINGS` | **PASS** | `cargo clippy --all-targets -- -D warnings` concluído sem warnings. |
| `CARGO_TEST` | **PASS** | `102 passed; 0 failed; 15 ignored`; os ignorados exigem PostgreSQL/Redis descartáveis. |
| `TYPESCRIPT_TYPECHECK` | **PASS** | `pnpm typecheck` retornou `TYPESCRIPT_TYPECHECK_EXIT=0`, incluindo web check, canonical check e API tsc. |
| `SECRET_SCAN` | **PASS** | 25 arquivos alterados analisados; 0 padrões de segredo de alta confiança. |
| `LGPD_SCAN` | **PASS** | Nenhum literal de dado pessoal de alta confiança. As duas ocorrências detectadas são fixtures explícitos do teste `safe_error_never_returns_connection_string_token_or_nominal_payload`, com CPF sintético usado para provar sanitização. |
| `GIT_DIFF_CHECK` | **PASS** | `git diff --check` sem erro; apenas warnings de normalização LF/CRLF do checkout Windows. |
| `DEPENDENCY_AUDIT_SCOPED` | **PASS COM EXCEÇÃO DOCUMENTADA** | `cargo audit --file Apps/ingest/dm-sync-ingest/Cargo.lock --ignore RUSTSEC-2023-0071` retornou exit 0; o advisory não possui upgrade corretivo e pertence a pacote opcional/inativo no grafo do receiver. O lockfile não foi alterado. |

## Evidências do downstream adaptativo M1

O dispatcher foi implementado em `adaptive_downstream.rs` e é exposto pelo subcomando `adaptive-m1-dispatch` [2]. O handoff consulta `emulti_source_manifests` e `emulti_result_components`, constrói o input canônico da regra e persiste o job com `ON CONFLICT DO NOTHING`. A conclusão do source package não exige envelope de transporte, mantendo a distinção entre estados `SOURCE_PACKAGE_READY`, `DOWNSTREAM_COMPLETED` e `READ_MODEL_AVAILABLE`.

A execução do dispatcher seguida de `adaptive-materialization-worker --once` produziu, em cada célula, seis manifests M1, um job lógico `adaptive_m1_v1` com status `succeeded`, um `materialization_result` e um `adaptive_m1_read_model`. Os hashes semânticos e os hashes do read model possuem cardinalidade 1 por célula. O replay do mesmo pacote manteve os mesmos hashes e não criou duplicatas.

| Métrica da closure | CELL-001 / municipality-A | CELL-002 / municipality-B |
|---|---:|---:|
| Source manifests M1 | 6 | 6 |
| Jobs `adaptive_m1_v1` succeeded | 1 | 1 |
| `materialization_results` | 1 | 1 |
| `adaptive_m1_read_models` | 1 | 1 |
| Cardinalidade do hash de resultado | 1 | 1 |
| Cardinalidade do hash do read model | 1 | 1 |
| `FORCE ROW LEVEL SECURITY` no read model | `true` | `true` |
| `FORCE ROW LEVEL SECURITY` no auth snapshot | `true` | `true` |
| Leitura cross-municipality sob RLS | 0 | 0 |

## Evidências do LKG do receiver

O receiver consulta primeiro `cell_installation_auth_snapshots` com escopo de célula, agente e hash do token. Para instalação conhecida, snapshot expirado, revogado ou ambíguo, o comportamento é fail-closed. Quando o Control Plane está disponível e a autenticação é bem-sucedida, o snapshot é persistido/atualizado com TTL configurável. A migration `0007_cell_installation_auth_snapshot_v1` aplica RLS, FORCE RLS e grant mínimo ao writer [4].

Na CELL-001 foi persistido o snapshot sintético de `installation-A`, agente `agent-fcf3422b-af22-4832-b556-789b5f38f125`, tenant `dm-technology`, município interno `municipality-A`, célula `DEFAULT_CELL`, assignment `registry-v1`, não revogado e com validade futura. Com o Control Plane PostgreSQL parado, o probe HTTP do receiver retornou 200 para a instalação conhecida, com `accepted_duplicate`. O fallback para instalação desconhecida permaneceu 401 `token_not_recognized`.

A matriz negativa com Control Plane parado foi executada sem alterar o contrato de autorização: agente desconhecido, tenant incorreto, município incorreto e célula incorreta retornaram 401; snapshot expirado e snapshot revogado retornaram 403. A probe aceita na CELL-001 não produziu artefatos na CELL-002.

## Evidências de exactly-once, recovery e fencing

O teste live `live_worker_recovers_pending_and_fences_out_of_order_events` passou com PostgreSQL e Redis sintéticos. Os fixtures foram corrigidos para preencher `cell_id`, `tenant_id` e `municipality_id` em `sync_chunk_payloads`, alinhando o teste ao schema cell-local sem alterar o worker de produção [3]. O cenário cobriu recuperação de pending, evento fora de ordem, fencing por autoridade e limpeza controlada.

Com o Redis da CELL-002 parado, a autoridade não migrou para o cache: o PostgreSQL da CELL-002 continuou servindo o escopo `municipality-B`, enquanto uma leitura com `municipality-A` retornou zero. O Redis da CELL-001 permaneceu ativo apenas para o teste sintético de fencing.

## Isolamento entre células

A closure foi executada novamente após rebuild do binário final e emitiu os 18 probes esperados, incluindo `cross_municipality_rls=0` nas duas células [1]. Cada célula manteve seu próprio município, resultado e read model; nenhuma leitura de `municipality-A` atravessou para a CELL-002 e nenhuma leitura de `municipality-B` atravessou para a CELL-001. O Control Plane permaneceu parado durante a validação final, enquanto as duas bases PostgreSQL das cells permaneceram disponíveis.

## QA, segurança e dependências

O QA final do receiver foi concluído com `cargo fmt --check`, `cargo check --all-targets`, `cargo clippy --all-targets -- -D warnings` e `cargo test`, além do typecheck TypeScript do workspace. O scan de segredos cobriu 25 arquivos alterados e encontrou zero padrões de alta confiança. O scan LGPD encontrou apenas dois matches controlados no teste de sanitização, não dados reais.

A auditoria de dependências merece atenção operacional. O lockfile versionado contém `rsa 0.9.10` e `spin 0.9.8` como dependências opcionais/inativas para o grafo de features do receiver. O advisory de `rsa` é `RUSTSEC-2023-0071`, sem upgrade corretivo disponível; `spin` aparece como yanked. O grafo ativo do receiver, verificado com `cargo tree --locked --target x86_64-pc-windows-msvc`, não contém esses pacotes. Por isso o gate foi marcado como **pass com exceção documentada e escopo limitado ao artefato receiver**, não como declaração de que o lockfile inteiro está livre de advisories. A remoção definitiva desses pacotes do lockfile deve ser tratada em uma mudança de dependências independente, com revisão de impacto, e não foi misturada à missão.

## Limitações e não-claims

Esta evidência usa exclusivamente PostgreSQL, Redis, agentes, tokens, municípios e source packages sintéticos. Nenhum dado real do PEC foi utilizado, nenhum read model ou `materialization_result` foi inserido manualmente e nenhum dado nominal foi usado. A validação prova o contrato runtime em duas células, não a capacidade operacional de cinco municípios simultâneos, escala nacional, disponibilidade multi-região, observabilidade de produção, recuperação de desastre ou prontidão regulatória.

Permanecem explicitamente os seguintes estados: `CAPACITY_NOT_YET_PROVEN`, `NATIONAL_SCALE_NOT_PROVEN` e `PRODUCTION_READINESS_NOT_DECLARED`.

## Cleanup executado e preservação de evidências

O receiver sintético foi encerrado após a atualização do binário de cache. O Control Plane PostgreSQL já estava parado; o Redis da CELL-002 permaneceu parado para preservar a evidência de fault injection. Os containers PostgreSQL das duas cells não foram removidos, conforme solicitado, e os artefatos persistidos de M1/LKG foram preservados para auditoria. O container do PEC source e o Redis da CELL-001 são recursos descartáveis da missão foram parados no cleanup final; Billing, geocode e arquivos não rastreados preexistentes devem permanecer intactos.

## Referências

[1]: ../../scripts/11-windows/multicell-runtime-closure.ps1 "Probe versionado de fechamento multi-cell"
[2]: ../../Apps/ingest/dm-sync-ingest/src/adaptive_downstream.rs "Dispatcher e workers downstream M1"
[3]: ../../Apps/ingest/dm-sync-ingest/src/worker.rs "Worker de ingest e fixtures live de fencing"
[4]: ../../Apps/ingest/dm-sync-ingest/src/migrations/0007_cell_installation_auth_snapshot_v1.up.sql "Migration do snapshot local de autenticação"
[5]: ../../Apps/ingest/dm-sync-ingest/src/main.rs "Receiver principal e autenticação LKG"
[6]: ../../Apps/ingest/dm-sync-ingest/Cargo.lock "Lockfile auditado do receiver"
[7]: ../../Apps/ingest/dm-sync-ingest/Cargo.toml "Manifest e features efetivamente habilitadas do receiver"

## Closeout formal da homologação E2E — reconciliado em 2026-08-16

### Head real e ancestry

A branch real é `mission/multicell-e2e-20260815`. O commit funcional de evidência é `8133b955a4698b3fbcec75e172dda9044c1fed66` (`8133b95`). O commit `118876551a75c82df83e3290b766b065d6b46020` (`1188765`) foi a documentação original do fechamento; os commits de guard e reconciliação posteriores fazem do `b86e6bf736c0c98aa3ad3dbc41cbe73cc0f79ccf` (`b86e6bf`) o HEAD atual. Todos são descendentes do commit funcional. Não houve reset nem reescrita de histórico.

O relatório anterior que descrevia a evidência funcional em `8133b95` e documentação posterior em `1188765` estava correto quanto à relação entre os commits; a divergência era apenas a ausência de campos formais de reconciliação no manifest.

### Gates explícitos adicionais

| Gate | Resultado real | Evidência |
|---|---|---|
| `M1_MATERIALIZATION_RESULT_VALIDATED_A` | **PASS** | Um resultado `adaptive_m1_v1` na CELL-001, município A. |
| `M1_MATERIALIZATION_RESULT_VALIDATED_B` | **PASS** | Um resultado `adaptive_m1_v1` na CELL-002, município B. |
| `M1_READ_MODEL_VALIDATED_A` | **PASS** | Um read model produzido na CELL-001. |
| `M1_READ_MODEL_VALIDATED_B` | **PASS** | Um read model produzido na CELL-002. |
| `M1_ZERO_DIFF_PARITY_VALIDATED` | **NÃO REIVINDICADO** | A projeção normativa canônica A/B é igual, mas `semantic_result_hash` estrito difere: A=`82210f14495daeba8441b65031475ba187011f2fc4b89b25326c60bc4ecbcf51`; B=`d18f5dd2c847d89959c0c1f6b46ae0f730acced18d60c6ef79e83482cbaa155e`. |
| `M1_GOLDEN_MATCH_VALIDATED` | **PASS — FIXTURE DO REPOSITÓRIO** | `active_proven_golden` passou 3/3; o match do golden com a execução runtime multi-cell não foi reivindicado. |
| `BFF_REAL_READ_MODEL_ROUTING_VALIDATED` | **NÃO REIVINDICADO** | Não foi encontrado probe runtime `CellRouter → descriptor → pool → read model` no checkout atual. |
| `DYNAMIC_RLS_ON_M1_READ_MODEL_VALIDATED` | **PASS** | Closure multi-cell e leitura negativa sob papel sem `BYPASSRLS`. |
| `MATERIALIZER_FENCING_VALIDATED` | **PASS** | Teste live de recovery/fencing passou. |
| `MATERIALIZATION_EXACTLY_ONCE_EFFECT_VALIDATED` | **PASS** | Replay preservou um efeito lógico e cardinalidade de hash 1. |
| `CELL_LOCAL_AUTH_CONTINUITY_VALIDATED` | **PASS** | Snapshot local conhecido aceitou com Control Plane indisponível; negativos fail-closed passaram. |
| `LKG_RESTART_VALIDATED` | **PASS — EVIDÊNCIA ANTERIOR** | Probe LKG real com Control Plane parado retornou 200; o resultado está referenciado no fechamento anterior. |

Por causa dos gates não reivindicados, o closeout formal recebeu `MULTI_CELL_EVIDENCE_CLOSEOUT_BLOCKED`. A classificação anterior `MULTI_CELL_RUNTIME_PIPELINE_E2E_VALIDATED` permanece histórica para o escopo runtime anteriormente executado; não foi promovida a `MULTI_CELL_EVIDENCE_CLOSED`.

### Paridade e golden

A projeção canônica normativa, composta por indicador, competência, cutoff, numerador, denominador, métrica escalada, classificação, status, reason codes e rule version, produziu o mesmo hash em A e B: `54e2d9a38ed71ad91997835aa016635e2188498ea0f643f8f52b604f62deb2c7`. Isso prova igualdade normativa da projeção, mas não satisfaz o requisito adicional de igualdade do campo persistido `semantic_result_hash`, que inclui material de escopo/source snapshot.

O golden independente do repositório foi executado com `cargo test --manifest-path Apps/rules/sus-aps-rule-engine/Cargo.toml --test active_proven_golden`: 3 testes passaram. O dataset é `m1-active-proven-input-v1`, com input SHA-256 `258133f35d0540ec1c01d8b2fb12bfa8b8926264b2d2bd01c7387f2da28808ff`, expected SHA-256 `0051e18b833783c072762ba2c05aa2ec94f556dc8e28ea195bd75324155ba827`, numerador esperado 387, denominador 320, métrica 1209375 e classificação `SUFFICIENT`. Não foi declarado que o runtime multi-cell atual corresponde a esse golden independente.

### Auditoria de `DEFAULT_CELL`

`DEFAULT_CELL` é documentado em `cell.rs` como compatibilidade histórica e é aplicado por `set_local_scope` no caminho legado. O schema cell-local usa esse valor lógico dentro de cada banco, enquanto a topologia física seleciona a base/container da cell. A evidência atual prova isolamento RLS entre os bancos, mas não prova um mapping explícito de assignment físico `DEFAULT_INITIAL_CELL_ID → CELL-001` no runtime do snapshot. Portanto, o uso foi classificado como `BOOTSTRAP_SAFE`, com blocker formal `BLOCKED_ALIAS_MAPPING_REQUIRES_EXPLICIT_RUNTIME_CONFIGURATION`, e não como autoridade universal.

### Dependência e cleanup

A exceção foi formalizada como `DEPENDENCY_EXCEPTION_RUSTSEC_2023_0071`: `rsa 0.9.10`, advisory sem upgrade corretivo, `active_graph=false` no target `x86_64-pc-windows-msvc`, revisão em 2026-09-30 pelo owner DM Technology platform security, com novo review quando o grafo de features ou backend SQLx mudar. `spin 0.9.8` permanece somente como `INACTIVE_LOCKFILE_DEPENDENCY_WARNING`; não foi declarado que o lockfile inteiro está limpo.

Os containers descartáveis Redis A/B, PEC source e Control Plane estão parados. Os PostgreSQL A/B foram preservados deliberadamente para auditoria das linhas M1/LKG. O processo `pec-agent-sync` observado pertence ao serviço externo instalado `C:\Program Files\DMTech\esus-agent-sync\nssm.exe`, não ao binário descartável da missão; a tentativa de parada retornou acesso negado. Ele foi classificado como `EXTERNAL_PRESERVED_SERVICE`, não como recurso da missão a ser removido.

### Fase B

A Fase B não foi iniciada. `WAVE-1`, `WAVE-3` e `WAVE-5` permanecem `NOT_STARTED`, e `WAVE-6+` continua proibida. O runner `scripts/11-windows/cell-capacity-proof-v1.ps1` falha closed antes de criar dados, agentes, containers ou linhas de banco quando `FASE_A_FORMAL_CLOSEOUT` não está em `PASS`. A documentação específica está em `cell-capacity-proof-v1-2026-08-16.md` e no manifest JSON correspondente.

## Formal closeout update â€” 2026-08-16

A reconciliação formal da FASE A foi concluída com `FASE_A_FORMAL_CLOSEOUT=PASS` no HEAD `b08d3b37f9f0e5b0a7f1c25f99e5a28e50f30d17`, sem push e mantendo a topologia descartável. O fechamento foi obtido após a implementação dos três blockers previstos: `normative_result_hash` placement-independent no contrato M1, `CellRouter` TypeScript real entre AuthorizationScope, assignment, descriptor, pool bounded, RLS e read model, e `CellRuntimeIdentity` explícita com `runtime_cell_id`, `storage_cell_alias`, migration aditiva 0010 e wrong-cell guard.

O gate `M1_ZERO_DIFF_PARITY_VALIDATED` foi provado com dois read models golden produzidos pelo pipeline adaptativo real. As cells usaram provenance distinta (`m1-active-proven-input-v1-cell001` e `m1-active-proven-input-v1-cell002`), semantic hashes distintos e o mesmo `normative_result_hash` `3f5c244aa3d1405c90f3b2b6710c0fa2e1d41dac9838bc37cb95764ecb63964f`. O gate `M1_GOLDEN_MATCH_VALIDATED` também passou contra `Apps/rules/sus-aps-rule-engine/fixtures/m1-active-proven-input-v1.json`, com `numerator=387`, `denominator=320`, `metric_scaled=1209375` e `classification=SUFFICIENT`.

O probe BFF versionado `scripts/11-windows/multicell-bff-routing-probe.ps1` executou as procedures tRPC reais com o Control Plane descartável e os dois data planes. O principal A foi roteado para `CELL-001`, o principal B para `CELL-002`, o negativo de assignment não mapeado resultou em `PRECONDITION_FAILED`, e as métricas confirmaram `poolCreateCount=2` e `poolMax=5`. O teste `wrong_physical_cell_snapshot_is_rejected` passou com execução efetiva de um teste, comprovando o deny de snapshot físico `CELL-002` no receiver configurado como `CELL-001`; `DEFAULT_CELL` permanece somente alias local de storage e não identidade física global.

A FASE B foi liberada somente depois deste PASS. As waves autorizadas permanecem exclusivamente `WAVE-1`, `WAVE-3` e `WAVE-5`, em ambiente novo `mc-capacity-v1-*`; `WAVE-6+` continua proibida. Permanecem deliberadamente `CAPACITY_NOT_YET_PROVEN`, `NATIONAL_SCALE_NOT_PROVEN`, `PRODUCTION_READINESS_NOT_DECLARED` e `CAPACITY_MAXIMUM_NOT_DISCOVERED` até a conclusão e publicação da Capacity Proof V1.

## Formal closeout update â€” 2026-08-16

A reconciliação formal da FASE A foi concluída com `FASE_A_FORMAL_CLOSEOUT=PASS` no HEAD `b08d3b37f9f0e5b0a7f1c25f99e5a28e50f30d17`, sem push e mantendo a topologia descartável. O fechamento foi obtido após a implementação dos três blockers previstos: `normative_result_hash` placement-independent no contrato M1, `CellRouter` TypeScript real entre AuthorizationScope, assignment, descriptor, pool bounded, RLS e read model, e `CellRuntimeIdentity` explícita com `runtime_cell_id`, `storage_cell_alias`, migration aditiva 0010 e wrong-cell guard.

O gate `M1_ZERO_DIFF_PARITY_VALIDATED` foi provado com dois read models golden produzidos pelo pipeline adaptativo real. As cells usaram provenance distinta (`m1-active-proven-input-v1-cell001` e `m1-active-proven-input-v1-cell002`), semantic hashes distintos e o mesmo `normative_result_hash` `3f5c244aa3d1405c90f3b2b6710c0fa2e1d41dac9838bc37cb95764ecb63964f`. O gate `M1_GOLDEN_MATCH_VALIDATED` também passou contra `Apps/rules/sus-aps-rule-engine/fixtures/m1-active-proven-input-v1.json`, com `numerator=387`, `denominator=320`, `metric_scaled=1209375` e `classification=SUFFICIENT`.

O probe BFF versionado `scripts/11-windows/multicell-bff-routing-probe.ps1` executou as procedures tRPC reais com o Control Plane descartável e os dois data planes. O principal A foi roteado para `CELL-001`, o principal B para `CELL-002`, o negativo de assignment não mapeado resultou em `PRECONDITION_FAILED`, e as métricas confirmaram `poolCreateCount=2` e `poolMax=5`. O teste `wrong_physical_cell_snapshot_is_rejected` passou com execução efetiva de um teste, comprovando o deny de snapshot físico `CELL-002` no receiver configurado como `CELL-001`; `DEFAULT_CELL` permanece somente alias local de storage e não identidade física global.

A FASE B foi liberada somente depois deste PASS. As waves autorizadas permanecem exclusivamente `WAVE-1`, `WAVE-3` e `WAVE-5`, em ambiente novo `mc-capacity-v1-*`; `WAVE-6+` continua proibida. Permanecem deliberadamente `CAPACITY_NOT_YET_PROVEN`, `NATIONAL_SCALE_NOT_PROVEN`, `PRODUCTION_READINESS_NOT_DECLARED` e `CAPACITY_MAXIMUM_NOT_DISCOVERED` até a conclusão e publicação da Capacity Proof V1.

## Formal closeout update â€” 2026-08-16

A reconciliação formal da FASE A foi concluída com `FASE_A_FORMAL_CLOSEOUT=PASS` no HEAD `b08d3b37f9f0e5b0a7f1c25f99e5a28e50f30d17`, sem push e mantendo a topologia descartável. O fechamento foi obtido após a implementação dos três blockers previstos: `normative_result_hash` placement-independent no contrato M1, `CellRouter` TypeScript real entre AuthorizationScope, assignment, descriptor, pool bounded, RLS e read model, e `CellRuntimeIdentity` explícita com `runtime_cell_id`, `storage_cell_alias`, migration aditiva 0010 e wrong-cell guard.

O gate `M1_ZERO_DIFF_PARITY_VALIDATED` foi provado com dois read models golden produzidos pelo pipeline adaptativo real. As cells usaram provenance distinta (`m1-active-proven-input-v1-cell001` e `m1-active-proven-input-v1-cell002`), semantic hashes distintos e o mesmo `normative_result_hash` `3f5c244aa3d1405c90f3b2b6710c0fa2e1d41dac9838bc37cb95764ecb63964f`. O gate `M1_GOLDEN_MATCH_VALIDATED` também passou contra `Apps/rules/sus-aps-rule-engine/fixtures/m1-active-proven-input-v1.json`, com `numerator=387`, `denominator=320`, `metric_scaled=1209375` e `classification=SUFFICIENT`.

O probe BFF versionado `scripts/11-windows/multicell-bff-routing-probe.ps1` executou as procedures tRPC reais com o Control Plane descartável e os dois data planes. O principal A foi roteado para `CELL-001`, o principal B para `CELL-002`, o negativo de assignment não mapeado resultou em `PRECONDITION_FAILED`, e as métricas confirmaram `poolCreateCount=2` e `poolMax=5`. O teste `wrong_physical_cell_snapshot_is_rejected` passou com execução efetiva de um teste, comprovando o deny de snapshot físico `CELL-002` no receiver configurado como `CELL-001`; `DEFAULT_CELL` permanece somente alias local de storage e não identidade física global.

A FASE B foi liberada somente depois deste PASS. As waves autorizadas permanecem exclusivamente `WAVE-1`, `WAVE-3` e `WAVE-5`, em ambiente novo `mc-capacity-v1-*`; `WAVE-6+` continua proibida. Permanecem deliberadamente `CAPACITY_NOT_YET_PROVEN`, `NATIONAL_SCALE_NOT_PROVEN`, `PRODUCTION_READINESS_NOT_DECLARED` e `CAPACITY_MAXIMUM_NOT_DISCOVERED` até a conclusão e publicação da Capacity Proof V1.

A integração local fast-forward em main foi concluída sem push. MULTICELL_CLOSEOUT_MAIN_SHA=1897b68070f3f74e47eba7bedcbd6f3ceca8dde4. A execução da FASE B está autorizada somente para WAVE-1, WAVE-3 e WAVE-5 no ambiente novo de capacity proof.

