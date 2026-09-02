# Qualificação final de staging — módulo territorial

## Diagnóstico

A baseline declarada `05a01f097a20a02051f5cc4c6ee44b04ff2fe7f` é um prefixo de 39 caracteres que resolve localmente, de forma inequívoca, para `05a01f097a20a02051f5cc4c6ee44b04ff2fe7f1`. A branch remota `feat/territory-map-remapping-staging-qualification` não foi encontrada em `git ls-remote origin`; o commit e a branch existiam somente localmente no worktree anterior. A finalização foi criada em novo worktree a partir do SHA completo, sem usar `ec5c653` como base de implementação.

**Branch de finalização:** `feat/territory-map-remapping-staging-finalization`.

**Commit-base:** `05a01f097a20a02051f5cc4c6ee44b04ff2fe7f1`.
**Status de promoção:** `QUALIFIED_LOCAL_STAGING_PENDING_CHANGE_APPROVAL`.

## Alterações executadas

A implementação preserva Rust como autoridade, BFF TypeScript como transporte e PEC sem escrita. O hardening adiciona histogramas Prometheus reais com bucket/sum/count, separa métricas de tentativa cross-tenant bloqueada e policy failure, exige `TERRITORY_EXACT_POINT_AUDIT` para exact point de auditor, registra evento estruturado sem coordenadas, mede import/rollback/retention claim/backfill e atualiza a documentação operacional.

| Área | Estado | Classe |
|---|---|---|
| Proveniência Git | SHA completo reconciliado; branch remota ausente | source/runtime |
| Histogramas | Implementados e testados no registry Rust | source |
| Auditor | Agregado por padrão; capability explícita fail-closed | source/runtime |
| ACS | Mantém policy de exact point por role/zoom | source |
| Métricas de isolamento | Attempt blocked separado de policy failure | source |
| Backfill | Fail-closed e sem aproximação; histogram instrumentado | source/runtime |
| Retenção | Leases, SKIP LOCKED, restart, legal hold e crypto-shredding preservados | runtime/external-compose |
| RLS | Comprovada localmente; staging autorizado pendente | external-compose/blocked |
| Migration 0034 | Homologada somente localmente; change approval ausente | external-compose/blocked |
| Rollback/reapply | Down migration existe; execução autorizada pendente | source/blocked |
| Benchmark | Fixture local; p50/p95/p99 representativos pendentes | runtime/blocked |
| Prometheus/Grafana | Endpoint e contrato source/runtime; conexão Grafana autorizada pendente | runtime/blocked |
| Claims institucionais | Não disponíveis nesta sandbox; E2E institucional não declarado | blocked |

## Critérios de não promoção

Não aplicar migration em staging ou produção sem change approval. Não declarar `STAGING_RUST_MAP_REMAPPING_QUALIFIED` sem migration/rollback/reapply autorizados, RLS com role real, PEC read-only comprovado no ambiente, benchmark representativo, Prometheus/Grafana conectados, alertas firing/recovery e claims institucionais reais. Não declarar production ready.

## Checklist QA

Os gates Rust devem passar com `fmt --check`, `clippy --offline --all-targets -- -D warnings` e `test --offline --all-targets`. Os gates web devem passar com typecheck, canonical, style, lint, Vitest e production build. Runtime deve validar health, ready, metrics, map, quality, import, retention, backfill, multi-role, `external_calls=0` e PEC write zero. Scans devem cobrir secret, PII, docs, fixtures, scripts, dashboards, alertas, logs e staged diff.

## Próximas três ações

1. Obter change approval, backup e janela para aplicar 0034 em staging autorizado e executar rollback/reapply com evidência.
2. Executar benchmark representativo com três séries, cold/warm cache, concorrência autorizada e publicar somente SLOs derivados e aprovados.
3. Conectar Prometheus/Grafana autorizados, testar firing/recovery e repetir E2E com claims institucionais reais, mantendo logs sem PII.
