# Auditoria do cutover da autoridade de cálculo B360

Data: 2026-08-01

## Status

- Calculation authority: **FULLY_MIGRATED**
- Runtime indicators: **19 READY / 2 BLOCKED_BY_SOURCE**
- Operational readiness: **PARTIAL_READY**
- Blocking readiness gate: **/readyz=503**
- Release posture: **CALCULATION_CUTOVER_COMPLETE_READINESS_PENDING**
- Commit status: **READY_FOR_COMMIT**

CVAT5 permanece bloqueado pela ausência da fonte municipal pseudonimizada PBF/BPC. CVAT6 permanece bloqueado por PBF/BPC e pelo agregado oficial de satisfação Meu SUS Digital. Ambos retornam `metricValue=null`; nenhum zero sintético foi introduzido.

## Isolamento

- Branch: `refactor/b360-rust-authority-cutover`
- Worktree: `D:\dm-hub\apps\dm-gov\saude\esus-aps-360\sus-analytics-sync-b360-cutover`
- Baseline solicitado: `75739dd3e3ef49c663d1d2b0fcfcc31013a611`
- Baseline resolvido: `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611`
- Observação: o hash fornecido tinha um caractere ausente; `75739dd` resolve para o baseline usado.
- Árvore principal suja: preservada; nenhum WIP preexistente foi alterado.
- Escopo final: 102 arquivos (38 modified, 61 deleted, 3 created).
- Fora do escopo: zero arquivos.
- Ausentes do corte: Rust materializer WIP, agent/ingest, bootstrap de escopo, relatórios, leaderboard, Docker/Compose, migrations, cache, command center, custom reports e qualquer `.env`.

## Evidência funcional

- Rust: `cargo fmt --check`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test --all-features` e `cargo build --release --all-features` passaram.
- Rust tests: 245 passaram, 13 dependentes de DB/fonte sanitizada permaneceram ignorados, zero falhas.
- TypeScript/web: typecheck, lint e build passaram.
- Testes: 559 testes Node e 119 testes Vitest passaram, zero falhas.
- Limitação de baseline: a suíte DDL de `b360-correcoes-transacional.test.ts` depende de `Apps/server/api/src/correcoes/schema.sql`, arquivo local ignorado por `*.sql` e ausente do Git. O runner omite apenas essa suíte quando o artefato não existe; a asserção de sanitização de migrations foi executada separadamente e passou.
- Gate antirregressão: script e teste unitário passaram.
- Bundle: `check-server-dist-sync.mjs` confirmou hashes idênticos entre fonte e `dist/index.js`.
- LGPD: 705 arquivos escaneados, zero falhas; 17 avisos classificados como fixtures preexistentes.
- Segredos: zero private keys, JWTs ou URIs com credencial nos arquivos alterados.
- Higiene: `git diff --check` passou; nenhum `.env`, dump, log, cache, binário ou artefato gerado entrou no escopo.

## Runtime

Competência validada: `2026-07`.

| Alvo | Smoke autenticado | Resultado |
| --- | --- | --- |
| `http://127.0.0.1:3005` | 21 indicadores pelo `b360ReadModel.aggregate` | 19 READY; CVAT5/CVAT6 BLOCKED_BY_SOURCE com valor nulo |
| `https://esus-sync.dmtechnology.com.br` | 21 indicadores pelo `b360ReadModel.aggregate` | 19 READY; CVAT5/CVAT6 BLOCKED_BY_SOURCE com valor nulo |

| Endpoint | Local | Domínio |
| --- | --- | --- |
| `/healthz` | 200 | 200 |
| `/api/health` | 200 | 200 |
| `/readyz` | 503 `syncCatalog=fail` | 503 `syncCatalog=fail` |

Durante a validação, a aplicação havia iniciado enquanto o Postgres recusava conexão e ficou sem listener HTTP. O Postgres já estava novamente saudável; somente o container da aplicação foi reiniciado. Postgres, Redis e a infraestrutura compartilhada não foram reiniciados.

## Manifesto de escopo

| Arquivo | Ação | Motivo | Cutover? | Risco | Cobertura/gate |
| --- | --- | --- | --- | --- | --- |
| `Apps/server/api/src/indicators/__tests__/b360-b1-b6.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-c1.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-c2-c3.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-c4.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-c6-c7.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-cvat.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-m1-m2.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-normative-classification.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-operational.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-rbac.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/indicators/__tests__/b360-source-of-truth.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/routers/__tests__/b360-operational-boundary.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/routers/__tests__/b360-read-model.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/routers/__tests__/b360-rust-authority.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/routers/b360-read-model.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/routers/b360-rust-authority.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/routers/indicadores.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/routers/previne-brasil.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/routes/__tests__/pec-indicator-summary-authority.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/routes/pec-api.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/__tests__/detail-c5-query.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/saude-brasil-360/__tests__/detail-territory.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/saude-brasil-360/__tests__/indicador-c2-c3.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/saude-brasil-360/__tests__/indicador-m-common.test.ts` | deleted | Remove teste acoplado à autoridade TypeScript eliminada | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/server/api/src/saude-brasil-360/catalog.ts` | modified | Reduz contrato ao transporte e metadados | sim | médio | typecheck; Node 559; gate anti-autoridade |
| `Apps/server/api/src/saude-brasil-360/cvat/__tests__/classification-config.test.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/calcular-acompanhamento.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/calcular-cadastro.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/calcular-classificacao.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/classification-config.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/finance-config.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/router.ts` | modified | Mantém CVAT como transporte fail-closed | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/cvat/simulador-financeiro.ts` | deleted | Remove cálculo, classificação ou simulação CVAT em TypeScript | sim | alto | gate anti-autoridade; CVAT5/6 nulos no smoke |
| `Apps/server/api/src/saude-brasil-360/detail/detail-b1.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-b2.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c2.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c3.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c4.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c5.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c6.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-c7.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-cache.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-common.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-territory.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/detail/detail-types.ts` | deleted | Remove detalhe derivado por calculador TypeScript | sim | alto | contratos BFF/read model; Node 559; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/indicadores/boas-praticas-exames-gestante.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/classificacao-normativa.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/common.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b-common.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b1.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b2.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b3.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b4.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b5.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b6.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c1.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c2.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c4.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c5.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c6.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c7.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m-common.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m1.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m2.ts` | deleted | Remove autoridade de cálculo TypeScript | sim | alto | Rust 245 testes; gate anti-autoridade; smoke 21 indicadores |
| `Apps/server/api/src/saude-brasil-360/result.ts` | deleted | Remove contrato de resultado do calculador TypeScript | sim | médio | typecheck; Node 559; gate anti-autoridade |
| `Apps/server/api/src/saude-brasil-360/router.ts` | modified | Restringe backend TypeScript a BFF/read model Rust e falha fechada | sim | alto | typecheck; Node 559; dist-sync; smoke local/public |
| `Apps/server/api/src/saude-brasil-360/types.ts` | modified | Reduz contrato ao transporte e metadados | sim | médio | typecheck; Node 559; gate anti-autoridade |
| `Apps/web/client/src/components/charts/ComparisonChart.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/components/charts/HistoricalChart.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/components/indicators/IndicatorCard.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/components/indicators/IndicatorDetailHeader.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/components/indicators/IndicatorGauge.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/lib/c2-read-model.ts` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/lib/pecApi.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/web/client/src/lib/pecApi.ts` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/lib/rust-indicator-read-model.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/web/client/src/lib/rust-indicator-read-model.ts` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/lib/saude-brasil-360-metadata.test.ts` | modified | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `Apps/web/client/src/lib/saude-brasil-360-metadata.ts` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/pages/Dashboard.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/pages/DashboardCorreto.tsx` | deleted | Remove dashboard alternativo com regra local | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/pages/DashboardNew.tsx` | deleted | Remove dashboard alternativo com regra local | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/client/src/pages/IndicatorDetail.tsx` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `Apps/web/vitest.config.ts` | modified | Apresenta somente valores, período e classificação persistidos pelo Rust | sim | médio | typecheck; Vitest 119; build Vite; gate anti-autoridade |
| `docs/13-saude-brasil-360/rust-calculation-authority-audit.md` | created | Parte auditada do cutover Rust authority | sim | médio | typecheck; testes; build; smoke |
| `package.json` | modified | Expõe gate antirregressão como script reproduzível | sim | baixo | pnpm check:no-ts-indicator-authority PASS |
| `scripts/11-windows/build.ps1` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `scripts/13-linux/build.sh` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `scripts/14-shared/check-no-ts-indicator-authority.mjs` | created | Impede reintrodução de autoridade oficial em TypeScript | sim | baixo | gate e teste unitário PASS |
| `scripts/tests/shared/check-no-ts-indicator-authority.test.mjs` | created | Valida contrato Rust/BFF sem cálculo local | sim | médio | Node 559; Vitest 119; gate unitário |
| `scripts/11-windows/lint.ps1` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `scripts/13-linux/lint.sh` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `scripts/tests/shared/smoke-b360-all-indicators.mjs` | modified | Valida os 21 indicadores pelo read model Rust | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/smoke-c2-c3-calc.ts` | deleted | Remove smoke de calculador TypeScript legado | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/smoke-c2-c3.mjs` | deleted | Remove smoke de calculador TypeScript legado | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/smoke-cvat.mjs` | deleted | Remove smoke de calculador TypeScript legado | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/smoke-cvat.ps1` | deleted | Remove smoke de calculador TypeScript legado | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/smoke-cvat.sh` | deleted | Remove smoke de calculador TypeScript legado | sim | baixo | smoke local e público: 19 READY / 2 BLOCKED |
| `scripts/tests/windows/test.ps1` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `scripts/tests/linux/test.sh` | modified | Integra gate de autoridade e corrige separação node:test/Vitest | sim | médio | lint; build; pnpm test PASS |
| `tsconfig-c2c3.json` | deleted | Remove configuração exclusiva dos calculadores TypeScript eliminados | sim | baixo | typecheck principal PASS |

## Riscos e rollback

- O release não está `FULLY_READY`: `/readyz=503` permanece um bloqueio operacional real.
- CVAT5/CVAT6 só podem sair de `BLOCKED_BY_SOURCE` após integração de fontes oficiais; não há fallback.
- O teste do DDL de correções continua dependente de um SQL local fora do baseline e fora deste cutover.
- Rollback de código: retornar a branch ao baseline `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611` ou reverter o commit deste relatório/cutover. Não há rollback de banco porque nenhuma migration ou alteração de dados pertence ao commit.
