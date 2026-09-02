# Validação final containerizada do módulo territorial — 2026-08-16

> **Status honesto:** `SOURCE_COMPLETE` / `LOCAL_GATES_PASS` / `CONTAINER_RUNTIME_PASS` / `CONTAINERIZED_LOCAL_RUNTIME_READY_FOR_VISUAL_ACCEPTANCE` / `CI_REMOTE_BLOCKED_EXTERNAL` / `STAGING_PENDING_CHANGE_APPROVAL` / `PRODUCTION_BLOCKED`.

A execução foi concluída na branch `feat/territory-map-remapping-visual-acceptance-fixes`. A aplicação permanece ativa no desktop Windows para aceite visual manual. Este documento separa evidência de source, runtime, compose externo e bloqueios; não representa homologação institucional, qualificação de staging, aprovação de SLO ou prontidão de produção.

## Proveniência

| Classificação | Evidência |
|---|---|
| `source` | Commit `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc`; gates locais e testes de apresentação concluídos |
| `runtime` | Imagens `territory-850e316` executadas nos três serviços; OCI revision igual ao source SHA |
| `external-compose` | PostgreSQL existente `territory-geocode-pg-hardening`, imagem `postgres:16`, porta `55434`; não é criado pelo compose territorial |
| `blocked` | CI remoto continua bloqueado por `startup_failure`/`CI_BLOCKED_UNKNOWN_EXTERNAL`; staging e produção permanecem não autorizados; inspeção visual automatizada do sandbox não alcança o localhost do desktop Windows |

`runtime_source_sha` é `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc`. O `evidence_commit_sha` desta evidência é `ae3602bc8eaba57cc0cce55c87cfa8154d3f0caf`, commit documental que registrou o relatório; esta reconciliação do próprio SHA é documental e não exige rebuild das imagens.

A branch foi publicada com push normal, sem force-push. Contra `origin/feat/territory-map-remapping-containerized-finalization`, a base é `66c87f45ce28c62184d3d210547250f96a9080df`, o merge-base coincide com a base e a relação é `0` commits exclusivos na base e `4` na branch de aceite. Não há PR aberto no momento da verificação; se criado, deverá ter como base a branch territorial de finalização, nunca `main`, e não será mergeado automaticamente.

## Correções implementadas

A presentation layer agora possui **PEC write tri-state**: `enabled`, `forbidden` e `unknown`. `true` mostra `CRÍTICO — PEC WRITE HABILITADO`; `false` mostra `PROIBIDO ✓`; `undefined`, `null`, loading ou erro mostram `VERIFICANDO GUARDRAIL…`. O estado desconhecido não é tratado como seguro.

Todas as mutações territoriais exigem confirmação explícita de `syncStatus.isSuccess && syncStatus.pec_write === false`, incluindo `syncImport`, criação de draft, `simulate`, `validate`, `approve`, `publish`, `rollback` e transições internas. O backend continua sendo a autoridade; o bloqueio visual é defesa adicional. A representação legada duplicada de PEC write foi removida e há contrato de teste contra regressão.

A fonte e o read model são apresentados como dimensões diferentes. `BLOQUEADO_BY_DATA` é normalizado para `DATA_BLOCKED` na fonte, sem virar `NO_DATA` quando há snapshot; com snapshot válido, o read model é `AVAILABLE`. A UI exibe `DADOS DE DEMONSTRAÇÃO` para `fixture-read-only`, sem PII nominal. Os glifos residuais foram corrigidos para `Importando…` e `Executando rollback…`, e o gate anti-mojibake cobre `Ã`, `Â`, `â€¦`, `â€”`, `â€™` e `-` sem manter o literal suspeito nos próprios testes.

O Nginx possui liveness explícito em `location = /health`, retornando `200`, `text/plain` e `ok`, sem depender do SPA. `/api/health` e `/readyz` continuam sendo proxy do BFF.

## Gates de source

| Gate | Resultado |
|---|---:|
| `cargo fmt --all -- --check` | `0` |
| `cargo clippy --locked --all-targets -- -D warnings` | `0` |
| `cargo test --locked --all-targets` no crate `Apps/rules/b360-rules` | `0` |
| `pnpm run check` | `0` |
| `pnpm run check:canonical` | `0` |
| `pnpm run style:check` | `0` |
| `pnpm test` | `0` — 25 suites / 143 testes no log final |
| `pnpm run build` | `0` |
| scanner security territorial | `0`; CPF/CNS/Bearer/JWT/credential URL/private key/coordenada real: `0` |
| scanner anti-mojibake | `0` |
| scanner de defaults visuais | `0` |
| `git diff --check` | `0` |

O primeiro teste anti-mojibake detectou corretamente o literal `-` no próprio teste de contrato; o teste foi corrigido para usar `String.fromCodePoint(0x2b26)`, após o que o gate final passou sem exceções territoriais.

## Imagens e OCI

| Imagem | ID | OCI revision |
|---|---|---|
| `territory-rust:territory-850e316` | `sha256:4ecc8b4053260c7dff63514d1a33da70d3c532988d960cfc0111ac3b65037897` | `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc` |
| `territory-bff:territory-850e316` | `sha256:066c3bd0213cfc3a4d89381ecabda20bbc3579e4cf6f488ca807a2ef11df8563` | `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc` |
| `territory-ui:territory-850e316` | `sha256:8a48dfe2a1a78dc71f8fd0ed3865054c5e14a4d6976388d9126d225ff57bfbf0` | `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc` |

As três imagens possuem `org.opencontainers.image.source=https://github.com/devdudumuniz/esus-analytics`, título coerente e revisão OCI igual ao `runtime_source_sha`. O compose foi validado com os serviços `territory-rust`, `territory-bff` e `territory-ui`; não há PostgreSQL dentro do repositório nem na stack de aplicação.

## Runtime e endpoints

| Componente | URL | Evidência |
|---|---|---|
| Frontend territorial | [http://127.0.0.1:4173/territorio](http://127.0.0.1:4173/territorio) | HTTP 200; rota pronta para inspeção manual |
| UI liveness | [http://127.0.0.1:4173/health](http://127.0.0.1:4173/health) | HTTP 200; `text/plain`; corpo `ok`; não é `index.html` |
| UI → BFF health | [http://127.0.0.1:4173/api/health](http://127.0.0.1:4173/api/health) | HTTP 200; proxy funcional |
| UI → BFF ready | [http://127.0.0.1:4173/readyz](http://127.0.0.1:4173/readyz) | HTTP 200; proxy funcional |
| BFF health | [http://127.0.0.1:3012/api/health](http://127.0.0.1:3012/api/health) | HTTP 200; `service=territory-bff`; `git_commit=850e316d...` |
| BFF readiness | [http://127.0.0.1:3012/readyz](http://127.0.0.1:3012/readyz) | HTTP 200; `git_commit=850e316d...`; servidor e banco OK |
| Rust health | [http://127.0.0.1:18088/healthz](http://127.0.0.1:18088/healthz) | HTTP 200; dry-run; provider externo desabilitado; PEC proibido |
| Rust readiness | [http://127.0.0.1:18088/readyz](http://127.0.0.1:18088/readyz) | HTTP 200; schema, worker e banco OK |
| Prometheus | [http://127.0.0.1:18088/metrics](http://127.0.0.1:18088/metrics) | histogramas `_bucket`, `_sum` e `_count` reais |

Após o restart do Docker Desktop, o PostgreSQL existente foi recuperado com `pg_isready` aceitando conexões; o Rust recuperou automaticamente e UI/BFF/Rust terminaram healthy. Essa recuperação não criou banco, não aplicou migration e não alterou o schema institucional.

## Smoke tRPC e read model

O smoke novo e o smoke pós-recovery retornaram `LOCAL_TERRITORY_SMOKE_PASS`, cobrindo `syncStatus`, `viewport`, `quality`, `publications`, `createPlan`, `getPlan`, `simulate`, `validate`, `approve`, `publish`, `publications` e `rollback`.

O read model sanitizado retornou `source_name=fixture-read-only`, `nominal_data=false`, 4 domicílios, 8 cidadãos sintéticos, 2 domicílios geocodificados, 2 pendentes e 2 microáreas. `syncStatus.status=BLOQUEADO_BY_DATA`, enquanto o snapshot está presente e o read model é `AVAILABLE`; portanto a UI não deve mostrar `NO_DATA`.

No smoke pós-recovery, o plano percorreu `draft → simulated → validated → approved → published`, o rollback terminou em `published`, e as publicações evoluíram de 16 para 17 após publish e 18 após rollback. Os resultados territoriais são calculados pelo runtime Rust; o TypeScript atua como BFF e presentation layer.

## Rollback metrics

Foi executado um smoke isolado com exatamente um rollback após reset do runtime. Antes: `territory_remap_rollbacks_total=0` e `territory_remap_rollback_duration_seconds_count=0`. Depois: counter `1` e histogram count `1`. Os deltas foram, respectivamente, `1` e `1`. A resposta registrou `rollback_status=published`, `external_calls=0` e `pec_write=false`.

O smoke pós-recovery executou uma nova operação de rollback para confirmar persistência funcional; essa operação é separada do ensaio de delta unitário e não invalida a evidência isolada acima.

## Fail-closed e defaults

O teste negativo do BFF efêmero usando a imagem `territory-bff:territory-850e316`, com `ALLOW_DEV_SESSION_LOGIN=true` e `TERRITORY_VISUAL_DEMO=false`, retornou HTTP 403 e `dev_session_requires_TERRITORY_VISUAL_DEMO_true`. O login de demonstração ativo usa apenas claims sintéticos em arquivo local não versionado.

Com o container Rust parado, `territoryMap.viewport` retornou tRPC `RUST_UNAVAILABLE`, código `SERVICE_UNAVAILABLE` e HTTP 503. Não houve retorno de `[]`, `0`, mock, snapshot antigo ou resultado cacheado silencioso. O Rust foi posteriormente recuperado e está healthy.

Os defaults permanecem fail-closed: dev session false, visual demo false, source read-only authorized false, provider externo false, PEC write false e `RUNTIME_MODE=dry_run`. No runtime desta execução, `external_calls=0` e `pec_write=false`.

## Logs e image history

A coleta final direta dos logs dos três containers e da image history das três imagens retornou códigos de comando `0` e zero findings para CPF, CNS, Bearer, JWT, `password`, `postgres://`, private key, endereço nominal e coordenada individual. O erro transitório `NetworkUnreachable` observado durante a recuperação do Docker Desktop não expôs PII ou segredo; após recuperar o PostgreSQL e o daemon, o scan final terminou em `PASS`.

## Containers finais

| Container | Imagem | Estado |
|---|---|---|
| `territory-ui-finalization` | `territory-ui:territory-850e316` | `Up (healthy)` |
| `territory-bff-finalization` | `territory-bff:territory-850e316` | `Up (healthy)` |
| `territory-rust-finalization` | `territory-rust:territory-850e316` | `Up (healthy)` |
| `territory-geocode-pg-hardening` | `postgres:16` | `Up`, existente, porta `55434` |

## QA checklist e limitações

| Item | Estado |
|---|---|
| Tri-state PEC write; `unknown` não é seguro | PASS em presentation tests e código |
| Mutações exigem `pec_write === false` | PASS em handlers e disabled flags |
| Source/read model separados | PASS; `DATA_BLOCKED` + `AVAILABLE` |
| UI `/health` real | PASS; `text/plain`, `ok` |
| Anti-mojibake/defaults/security gates | PASS |
| OCI/runtime SHA | PASS; imagem e BFF reconciliados |
| Smoke tRPC completo | PASS |
| Rollback counter/histogram delta | PASS; `1/1` no ensaio isolado |
| Rust indisponível | PASS; `RUST_UNAVAILABLE`, 503 |
| Restart e recuperação | PASS |
| Log/image history scan | PASS; zero findings |
| Visual automatizado pelo sandbox | `BLOCKED_BY_NETWORK_BOUNDARY` |
| Aceite visual manual no desktop | PENDENTE ao usuário |
| Dataset representativo e benchmark p50/p99 | PENDENTE; fixture pequena |
| Prometheus/Grafana de produção e SLO aprovado | PENDENTE |
| Migration 0034/RLS institucional/staging | `STAGING_PENDING_CHANGE_APPROVAL` |
| CI remoto com jobs reais | `CI_REMOTE_BLOCKED_EXTERNAL` |

Não declarar `STAGING_QUALIFIED`, `PRODUCTION_READY`, `PRODUCTION_DEPLOYED`, `SLO_APPROVED`, `REAL_MUNICIPAL_DATASET_VALIDATED`, `PROMETHEUS_GRAFANA_PRODUCTION_READY` ou `CI_REMOTE_PASS`.

## Rollback e próximas ações

O rollback de source, se necessário, é documental e deve ser executado somente em revisão controlada: `git revert 850e316d322c9dca6c45c2de8cd7d8d19b46c0dc`. Não executar automaticamente. O rollback não pode habilitar autoridade TypeScript, geocoder externo, PEC write ou dev-session por default.

As próximas três ações são: primeiro, desbloquear o GitHub Actions nas configurações de Actions/rulesets/plano e provar jobs reais; segundo, homologar migration 0034, credencial read-only, RLS/cross-tenant e dataset representativo em ambiente autorizado; terceiro, conectar observabilidade real e executar benchmark p50/p95/p99 com concorrência, restart, retenção e crypto-shredding.

## Encerramento

A inspeção visual automatizada pelo sandbox permanece bloqueada pela fronteira de rede do localhost do desktop Windows. Isso não derruba a stack. O aceite visual manual deve ser realizado abrindo a URL abaixo no navegador do próprio Windows.

> **APLICAÇÃO ATIVA PARA ACEITE VISUAL**
>
> Status: `CONTAINERIZED_LOCAL_RUNTIME_READY_FOR_VISUAL_ACCEPTANCE`
>
> Frontend/módulo território: [http://127.0.0.1:4173/territorio](http://127.0.0.1:4173/territorio)
>
> UI health: [http://127.0.0.1:4173/health](http://127.0.0.1:4173/health)
>
> UI → BFF health: [http://127.0.0.1:4173/api/health](http://127.0.0.1:4173/api/health)
>
> BFF health: [http://127.0.0.1:3012/api/health](http://127.0.0.1:3012/api/health)
>
> BFF readiness: [http://127.0.0.1:3012/readyz](http://127.0.0.1:3012/readyz)
>
> Rust health: [http://127.0.0.1:18088/healthz](http://127.0.0.1:18088/healthz)
>
> Rust readiness: [http://127.0.0.1:18088/readyz](http://127.0.0.1:18088/readyz)
>
> Metrics: [http://127.0.0.1:18088/metrics](http://127.0.0.1:18088/metrics)
>
> `runtime_source_sha`: `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc`
>
> `evidence_commit_sha`: `ae3602bc8eaba57cc0cce55c87cfa8154d3f0caf`
>
> CI remoto: `CI_REMOTE_BLOCKED_EXTERNAL`
>
> Staging: `STAGING_PENDING_CHANGE_APPROVAL`
>
> **Não desligar a stack.**


## Consolidação Git / Worktrees

A auditoria encontrou 12 refs locais territoriais, 11 remotas, 10 worktrees territoriais e os PRs #135, #136 e #137. Após prova de reachability, zero worktrees dirty, inspeção de mounts self-contained e fechamento público dos PRs superseded, restaram somente duas refs remotas territoriais: a branch canônica eat/territory-map-remapping-visual-acceptance-fixes e a base necessária do PR #137. Restaram dois worktrees: o canônico e o da base do PR. Nove branches remotas históricas e dez locais foram removidas. staging-qualification foi classificada NOT_MERGED_BY_DESIGN por rastrear upstream obsoleto sem remoto; seu conteúdo era ancestral do canonical e foi removida com disposição explícita. git worktree prune terminou sem orphan territorial.

O runtime source tree é da1c1d7a8bded051702347046ada2ad5315087b; o canonical tree atual é 66ee065e1e85d9cecf88b84af9918be5afa8e159. A diferença entre untime_source_sha=850e316d322c9dca6c45c2de8cd7d8d19b46c0dc e o HEAD documental d579b1c4e8b64ab019a38cddaad271d915783cc3 está restrita a docs/; o executável validado não mudou e não há rebuild necessário.

Estado de organização: TERRITORY_GIT_HISTORY_CONSOLIDATED / TERRITORY_WORKTREES_CLEAN. O PR #137 permanece aberto e territorial; não houve merge na main.

## Smoke pós-consolidação Git / worktrees

Após a limpeza, o smoke executado contra o frontend containerizado retornou LOCAL_TERRITORY_SMOKE_PASS. O snapshot continuou com source_name=fixture-read-only, nominal_data=false, 4 domicílios, 8 cidadãos sintéticos, 2 geocodificados, 2 pendentes e 2 microáreas; syncStatus=BLOQUEADO_BY_DATA com snapshot presente. O workflow percorreu draft → simulated → validated → approved → published, e rollback terminou em published. As publicações foram 18 → 19 após publish e 20 após rollback. Os guardrails permaneceram external_calls=0 e pec_write=false. Health UI, rota /territorio, proxy UI, BFF, readiness BFF, Rust health, readiness Rust e metrics retornaram HTTP 200 depois da limpeza.

A consolidação Git terminou com TERRITORY_GIT_HISTORY_CONSOLIDATED e TERRITORY_WORKTREES_CLEAN. Restaram apenas duas refs remotas territoriais e dois worktrees territoriais: a branch canônica e a base do PR #137. O PR #137 continua aberto, com base territorial correta e sem merge na main.
