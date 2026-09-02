# Cell Capacity Proof V1 — evidência das waves de 16/08/2026

## Classificação formal

A execução real, exclusivamente sintética, das waves **WAVE-1**, **WAVE-3** e **WAVE-5** foi concluída em ambiente descartável `mc-capacity-v1-capacity-v1-bff-final-*`, isolado dos containers `mc-runtime-*` utilizados como evidência da FASE A. O resultado foi validado pelo pipeline receiver → adaptive inbox → M1 dispatch → materializer → certify, pelos probes negativos de RLS e pelo **CellRouter BFF contra o control-plane e os read models do ambiente descartável**.

> **Classificação:** `CELL_CAPACITY_V1_VALIDATED_UP_TO_POLICY_LIMIT`

A classificação é limitada ao cap normativo de **5 municípios**. Ela não representa capacidade nacional, máxima ou disponibilidade de produção.

## Referência de execução

| Campo | Valor |
|---|---|
| `run_id` | `capacity-v1-bff-final` |
| `source_commit` | `587d430b83362cfd2c5ce96c58a30b560472d2f5` |
| `classification` | `CELL_CAPACITY_V1_VALIDATED_UP_TO_POLICY_LIMIT` |
| `policy_limit` | `5` |
| `near_capacity_threshold` | `4` |
| `synthetic_only` | `true` |
| `real_pec_used` | `false` |
| `nominal_data_used` | `false` |
| WAVE-6 ou superior | proibida e não executada |

## Resultado das waves

| Wave | Municípios | Pipeline | BFF | Gate BFF | Status |
|---|---:|---|---|---|---|
| `WAVE-1` | 1 | `PASS` | `PASS` | `BFF_REAL_READ_MODEL_ROUTING_VALIDATED` | `PASS` |
| `WAVE-3` | 3 | `PASS` | `PASS` | `BFF_REAL_READ_MODEL_ROUTING_VALIDATED` | `PASS` |
| `WAVE-5` | 5 | `PASS` | `PASS` | `BFF_REAL_READ_MODEL_ROUTING_VALIDATED` | `PASS` |

O probe BFF validou o roteamento primário para `CELL-CAP-001`, o roteamento secundário para `CELL-CAP-002` nas waves aplicáveis e o caso negativo com falha controlada `PRECONDITION_FAILED`. O caso WAVE-1 utiliza somente a leitura primária, sem mascarar o requisito de dois pools nas waves WAVE-3 e WAVE-5.

## ACKs e materialização

Os cinco municípios sintéticos receberam ACK HTTP real `200` com `body.status=accepted`:

| Município | ACK | Jobs | Materializações | Read models |
|---|---:|---:|---:|---:|
| `MUNICIPALITY_CAPACITY_001` | `200:accepted` | 1 | 1 | 1 |
| `MUNICIPALITY_CAPACITY_002` | `200:accepted` | 1 | 1 | 1 |
| `MUNICIPALITY_CAPACITY_003` | `200:accepted` | 1 | 1 | 1 |
| `MUNICIPALITY_CAPACITY_004` | `200:accepted` | 1 | 1 | 1 |
| `MUNICIPALITY_CAPACITY_005` | `200:accepted` | 1 | 1 | 1 |

## Isolamento e stop conditions

Os probes negativos confirmaram `cross_tenant_pass=true` e `cross_cell_pass=true` para as linhas observadas. Todas as stop conditions permaneceram `false`: `data_loss`, `cross_tenant_leakage`, `cross_cell_leakage`, `oom`, `disk_exhaustion`, `postgres_deadlock`, `unbounded_backlog`, `synthetic_source_timeout`, `materializer_starvation`, `receiver_ack_slo_breach` e `bff_error_threshold`.

A evidência não utilizou `BYPASSRLS`, PEC real ou dado nominal real. O ambiente `mc-capacity-v1-*` foi removido ao final da execução; não há containers capacity residuais.

## Não-claims preservados

A publicação libera somente o claim delimitado pela política da Capacity Proof V1. Permanecem explicitamente preservados:

| Não-claim | Estado |
|---|---|
| `CAPACITY_NOT_YET_PROVEN` | `false`, limitado à política V1 até 5 municípios |
| `NATIONAL_SCALE_NOT_PROVEN` | `true` |
| `PRODUCTION_READINESS_NOT_DECLARED` | `true` |
| `CAPACITY_MAXIMUM_NOT_DISCOVERED` | `true` |
| `WAVE_6_PLUS_FORBIDDEN` | `true` |

## QA obrigatório

O harness `scripts/tests/windows/qa-capacity-v1.ps1` concluiu **12/12 gates PASS**, incluindo `cargo fmt --check`, `cargo check`, `cargo clippy -- -D warnings`, `cargo test`, TypeScript typecheck, secret scan, LGPD scan e `git diff --check`. A exceção documentada `RUSTSEC-2023-0071` para `rsa 0.9.10` permaneceu sem alteração de dependências.

## Artefatos auditáveis

| Artefato | Caminho |
|---|---|
| Manifest principal | `docs/02-architecture/cell-capacity-proof-v1-2026-08-16-evidence.json` |
| Manifest sintético | `docs/02-architecture/cell-capacity-proof-v1-synthetic-manifest.json` |
| Resultado consolidado do run | `artifacts/capacity-v1-wave-1-3-5-2026-08-16/capacity-proof-result.json` |
| Artefato bruto do run | `artifacts/capacity-capacity-v1-bff-final/capacity-proof-result.json` |
| QA JSON | `artifacts/qa-capacity-v1-2026-08-16.json` |
| QA log | `artifacts/qa-capacity-v1-2026-08-16.log` |
| Runner | `scripts/11-windows/cell-capacity-proof-v1.ps1` |
| Probe BFF parametrizado | `scripts/14-shared/multicell-bff-routing-probe-capacity.ts` |
| Bootstrap do control-plane sintético | `scripts/11-windows/capacity-bff-bootstrap.ps1` |

## Limites e governança

A capacidade máxima não foi descoberta: a prova foi encerrada exatamente no limite normativo de cinco municípios. Nenhuma alteração foi feita em Billing, geocode, SCNES, e-Gestor, PEC real, fórmula normativa M1 ou dependências do projeto. O serviço externo `PecAgentSync` instalado no host não foi interrompido.
