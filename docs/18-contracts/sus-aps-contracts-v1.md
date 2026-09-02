# Inventário de contratos externos — referência בלבד

> **Este documento não descreve o runtime do `PUBLIC_STANDALONE`.** Ele registra dependências e contratos de outros checkouts apenas para orientar integração futura. Nenhum item abaixo deve ser usado para afirmar que backend, ingestão, banco, receiver, agente, engine, migrations ou API estão presentes neste repositório.

## Escopo e autoridade

Contratos compartilhados, crates Rust, agentes de sincronização, receivers, regras, BFFs e migrations pertencem a outros repositórios e owners. Este checkout contém somente o frontend e seus contratos de consumo. A autoridade local é `docs/architecture/product-boundary.md` e o código presente em `apps/frontend`.

## Matriz de fronteira

| Componente externo | Classificação neste checkout | Evidência local permitida |
|---|---|---|
| `sus-aps-contracts` | `REFERENCE_ONLY` | Nenhuma implementação ou dependência local confirmada. |
| `pec-agent-sync` | `REFERENCE_ONLY` | Não prova ingestão, coleta ou sincronização no standalone. |
| `dm-sync-ingest`/receiver | `REFERENCE_ONLY` | Não prova receiver, fila, ACK, lease ou persistência local. |
| `sus-aps-rule-engine`/engines Rust | `REFERENCE_ONLY` | Não prova cálculo normativo ou paridade no frontend. |
| API/BFF/server | `EXTERNAL_CONTRACT` | O frontend pode consumir uma API configurada, mas não a implementa. |
| migrations/banco/PostgreSQL/Redis | `REFERENCE_ONLY` | Não há banco, migration ou serviço local neste checkout. |
| mobile/other worktrees | `REFERENCE_ONLY` | Não são evidência de capacidades do produto público. |

## Contrato versus implementação

| Capacidade | Contrato | Implementação local | Validação local |
|---|---|---|---|
| Payload analítico | `DEFINED` | `PARTIAL`: parser runtime local | `TESTED` apenas para fixtures do parser |
| Importação idempotente | `DEFINED` | `NOT_PRESENT` | `NOT_RUN` |
| Ingestão e sincronização | `DEFINED_EXTERNALLY` | `NOT_PRESENT` | `NOT_RUN` |
| Autorização por município/equipe | `REQUIRED_EXTERNALLY` | `NOT_PRESENT` no servidor | `NOT_RUN` |
| Cálculo normativo | `DEFINED_EXTERNALLY` | `NOT_PRESENT` no servidor | `NOT_RUN` |
| C1 | `DEFINED`, contrato local bloqueado | `NOT_CALCULABLE` | `TESTED` no bloqueio de contrato |

## Regra de evidência

Não usar referências a `Apps/server`, `Apps/rules`, `pec-agent-sync`, `receiver`, Rust engine, migrations privadas ou paths de outros checkouts para promover `NOT_IMPLEMENTED` a `PASS`. Esses itens devem permanecer marcados como `REFERENCE_ONLY` quando aparecerem em material histórico.

## Integração futura

Qualquer integração futura deve trazer contrato versionado, schema runtime, autorização centralizada, teste de consumidor, fixture sanitizada, plano de rollout/rollback e evidência no próprio checkout. A mudança não deve ser inferida de um documento externo.
