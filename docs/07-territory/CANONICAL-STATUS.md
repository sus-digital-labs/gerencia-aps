# Status canônico atual — módulo Território

> Documento canônico de navegação. Evidências detalhadas permanecem no relatório de validação e no registro de consolidação; este arquivo não substitui os testes nem o runtime.

## Linha canônica

| Campo | Valor |
|---|---|
| Branch | `feat/territory-map-remapping-visual-acceptance-fixes` |
| HEAD documental atual | `d579b1c4e8b64ab019a38cddaad271d915783cc3` |
| Runtime source SHA | `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc` |`n| Runtime tree | `eda1c1d7a8bded051702347046ada2ad5315087b` |`n| Canonical tree | `66ee065e1e85d9cecf88b84af9918be5afa8e159` — diferenças somente em `docs/` |
| PR | [#137](https://github.com/devdudumuniz/esus-analytics/pull/137) |
| Base do PR | `feat/territory-map-remapping-containerized-finalization` |

## Status comprovado

`SOURCE_COMPLETE` · `LOCAL_GATES_PASS` · `CONTAINER_RUNTIME_PASS` · `CONTAINERIZED_LOCAL_RUNTIME_READY_FOR_VISUAL_ACCEPTANCE`. O fluxo tRPC, o fail-closed Rust, o liveness UI, o restart, o scan de logs/history e o delta de rollback `1/1` estão registrados no relatório de validação.

## Limitações honestas

`CI_REMOTE_BLOCKED_EXTERNAL`, `STAGING_PENDING_CHANGE_APPROVAL` e `PRODUCTION_BLOCKED` continuam ativos. A inspeção visual automatizada do sandbox está bloqueada pela fronteira de rede do localhost Windows; o aceite visual manual deve usar [http://127.0.0.1:4173/territorio](http://127.0.0.1:4173/territorio). Fixture pequena não fundamenta SLO ou benchmark representativo.

## Evidências canônicas

1. [Validação final containerizada](./containerized-final-validation-2026-08-16.md).
2. [Consolidação de branches e worktrees](./branch-consolidation-2026-08-17.md).
3. [PR #137](https://github.com/devdudumuniz/esus-analytics/pull/137).

## Regra de integração

A branch canônica não deve ser mergeada automaticamente na `main`. Staging, migration 0034, fonte institucional e PEC write exigem aprovação separada.