# Readiness do módulo territorial e-SUS APS 360

**Data:** 15 de agosto de 2026

**Branch:** `feat/territory-map-remapping-production-readiness`

**Base:** commit publicado do módulo territorial Rust-owned
**Autor:** Equipe do projeto

## Resumo executivo

A branch de readiness endurece o módulo territorial do e-SUS APS 360 sem transferir autoridade de domínio para TypeScript. O runtime Rust continua responsável pelo read model, viewport, qualidade, workflow de remapeamento, rollback, importação sanitizada e métricas. O TypeScript permanece limitado à identidade de sessão, RBAC fail-closed, normalização de payloads, assinatura HMAC e transporte tRPC/BFF.

O ciclo comprovou dois modos operacionais. No modo padrão, a fonte PEC permanece bloqueada e o endpoint informa `AUTH_BLOCKED` ou `BLOQUEADO_BY_DATA`; o mapa de fixture não é apresentado como sincronização municipal real. No modo explicitamente autorizado, com `TERRITORY_SOURCE_DATABASE_URL`, `TERRITORY_SOURCE_READ_ONLY_AUTHORIZED=true` e confirmação textual `CONFIRM_TERRITORY_SYNC`, o runtime lê uma réplica PEC local, calcula agregados de cidadãos por domicílio, materializa um snapshot sanitizado no read model e não escreve no PEC.

> **Status honesto:** `IMPLEMENTED_LOCAL_AUTHORIZED_READ_ONLY_IMPORT_RUST_MAP_REMAPPING`. A implementação está validada localmente, mas ainda não é produção municipal. A promoção operacional exige RLS ou mecanismo equivalente comprovado no PostgreSQL compartilhado, observabilidade produtiva, retenção/crypto-shredding operacional e autorização formal da migration no ambiente de homologação.

## Alterações principais

| Área | Implementação | Evidência |
|---|---|---|
| Tipos fortes | `TenantId`, `MunicipalityId`, `ActorId`, `SnapshotId`, `RemapPlanId` e `PublicationId` na borda Rust | `cargo check`, `clippy` e testes Rust |
| Isolamento | Escopo derivado da sessão e predicados tenant/município em todas as consultas territoriais | Smoke cross-tenant PASS |
| Mapa | Viewport com microáreas, domicílios conhecidos/pendentes, cidadãos por domicílio e filtros geográficos | Smoke viewport PASS |
| Workflow | `draft → simulate → validate → approve → publish` com revisão e aprovação separadas | Smoke workflow PASS |
| Rollback | Nova publicação append-only com `rollback_of`, snapshot-alvo, checksum e justificativa mínima | Smoke rollback PASS; histórico preservado |
| Sincronização | Consulta read-only da réplica PEC e materialização de snapshot sanitizado | Smoke de importação PASS |
| LGPD | Nenhum nome/endereço é copiado; `address_fingerprint` usa HMAC por tenant | Smoke e inspeção de metadados PASS |
| Custos | Importação não chama fornecedor externo; `external_calls=0` | Todas as execuções PASS |
| Observabilidade | Endpoint `/metrics` com contadores territoriais e durações acumuladas para cálculo delta | Smoke de métricas PASS |
| UI | Painéis Fonte versus Sincronização, versões publicadas, rollback manual e importação confirmável | Typecheck/style/canonical PASS |

## Contratos operacionais

A fonte PEC só é conectada quando a autorização read-only está explicitamente habilitada. O default é bloqueado. A importação exige a confirmação literal `CONFIRM_TERRITORY_SYNC`; payloads sem confirmação ou com valor incorreto retornam conflito. O importador lê apenas identificadores opacos, microárea, latitude/longitude e contagem distinta de cidadãos. Nomes, CPF, CNS, logradouro e número de endereço não entram no read model.

O snapshot importado grava `source_name=pec_read_replica`, `external_calls=0`, `pec_write=false` e `nominal_data=false`. O endereço não é persistido em claro. Para cada domicílio, o fingerprint é calculado por HMAC-SHA-256 com a chave de tenant e o identificador de origem. Coordenadas conhecidas mantêm `coordinate_status=known`; registros sem latitude ou longitude mantêm `coordinate_status=pending`.

As publicações não são sobrescritas durante rollback. O endpoint cria uma nova publicação apontando para o snapshot histórico alvo e registra a publicação corrente em `rollback_of`. O rollback rejeita a própria publicação como alvo e rejeita alvos mais novos que a publicação corrente.

## Evidências executadas

| Gate ou smoke | Resultado observado |
|---|---:|
| `cargo fmt --all -- --check` | PASS |
| `cargo clippy --offline --lib --tests --bin territory-geocode-runtime -- -D warnings` | PASS |
| `cargo test --offline --all-targets --jobs 2` | PASS; 241 testes unitários Rust e alvos adicionais aprovados |
| TypeScript | PASS |
| Canonicalização | PASS; 423 arquivos verificados |
| Style gate | PASS; sem inline style, cor hardcoded ou utility arbitrário |
| Lint, Vitest e build web | PASS; repetidos após os últimos contratos de importação e UI |
| Smoke de mapa 18085 | PASS; viewport, qualidade, cross-tenant e workflow; `externalCalls=0` |
| Smoke readiness 18085 | PASS; duas publicações, rollback, histórico preservado, `external_calls_delta=0`, `rollback_delta=1`, sync default bloqueado |
| Smoke importação 18086 | PASS; `source_records=1`, `known=1`, `pending=0`, snapshot sanitizado, `external_calls=0`, `pec_write=false` |

O dado local autorizado contém apenas um domicílio fonte e não possui pendências geográficas. A cobertura conhecida/pendente foi comprovada separadamente no snapshot de mapa de smoke, que contém domicílios conhecidos e pendentes. Nenhum desses fixtures deve ser tratado como população municipal de produção.

## Riscos e limitações

A RLS PostgreSQL ainda não foi aplicada no ambiente compartilhado. O isolamento atual é composto por tipos fortes, identidade derivada da sessão, RBAC fail-closed, HMAC na borda e predicados explícitos em cada consulta; isso foi comprovado por smoke cross-tenant, mas não substitui uma política RLS auditada em homologação/produção.

A migration territorial permanece versionada e não foi aplicada em ambiente compartilhado. A retenção, crypto-shredding, dashboards, alertas, SLOs e retenção de auditoria precisam de operação municipal formal. O importador atual materializa o recorte domiciliar disponível na réplica PEC e não altera tabelas do PEC; joins adicionais de unidade de saúde, bairro, família e cidadão nominal devem ser homologados com schema real antes de produção.

## Rollback técnico

O rollback de código é a reversão da branch para o commit anterior publicado. O rollback de dados é append-only pelo endpoint territorial de rollback, que cria uma publicação nova para o snapshot histórico alvo. Em caso de falha de materialização, a transação PostgreSQL é revertida; não há publicação parcial. A rota de importação pode ser desabilitada removendo `TERRITORY_SOURCE_READ_ONLY_AUTHORIZED` ou a URL da fonte.

## Checklist antes de merge

| Item | Estado |
|---|---:|
| Smoke de mapa e isolamento cross-tenant | PASS |
| Smoke de importação read-only com confirmação | PASS |
| Rollback e histórico append-only | PASS |
| Sem chamadas externas e sem PEC write | PASS |
| Typecheck/canonical/style após último patch | PASS |
| Clippy/testes Rust após último patch | PASS |
| Lint/Vitest/build web após último patch | PASS |
| `git diff --check` e scan anti-segredo/PII | PASS após revisão final |
| RLS/equivalente compartilhado | BLOQUEADOR residual |
| Migration compartilhada autorizada | NÃO executada |

## Próxima promoção permitida

A próxima promoção aceitável é para homologação controlada, com réplica PEC read-only, usuário sem permissão de escrita, chave HMAC por tenant, migration autorizada e execução do smoke com amostra sanitizada. A produção municipal só deve ser promovida depois de RLS/equivalente, retenção/crypto-shredding, observabilidade e aprovação formal de custos e governança.
