# Performance Baseline — B360-8

**Capturado em:** 2026-05-06T23:19:05.198Z
**Servidor:** http://127.0.0.1:3003 | ⚪ OFFLINE (SERVER_NOT_RUNNING)
**Classificação:** PERF_SERVER_OFFLINE

## Thresholds (ambiente local)

| Endpoint/Módulo | Status | Latência | Limite | Resultado |
|---|---|---|---|---|
| `/api/health` | SERVER_NOT_RUNNING | — | 500ms | ⚪ SKIP |
| `/readyz` | SERVER_NOT_RUNNING | — | 1000ms | ⚪ SKIP |
| `/api/agents/status` | SERVER_NOT_RUNNING | — | 1000ms | ⚪ SKIP |
| `/api/replica/status` | SERVER_NOT_RUNNING | — | 2000ms | ⚪ SKIP |
| `correcoes.resumo` | 43ms | 300ms | ✅ PASS |
| `notificacoes.resumo` | 4ms | 300ms | ✅ PASS |
| `analytics-db.check` | 1ms | 100ms | ✅ PASS |

## Thresholds Definidos

| Tipo | Limite |
|---|---|
| /api/health | < 500ms |
| /readyz | < 1000ms |
| /api/agents/status | < 1000ms |
| Módulos in-process | < 300ms |
| Procedures agregadas (com banco) | < 3000ms |

## Observações

- **Servidor não estava ativo** durante a coleta. Endpoints HTTP marcados como SERVER_NOT_RUNNING.
  Resultado válido: in-process ok. Para coletar HTTP, iniciar servidor e re-executar `pnpm run qa:performance`.
- Thresholds são para ambiente local de desenvolvimento; produção pode ter latências diferentes.
- Banco de dados analytics ausente → in-process usa fallback in-memory (esperado).

## Checks: 3 PASS | 0 WARN | 0 FAIL

---
*Gerado por `scripts/tests/shared/qa-performance.mjs` | Sprint B360-8*
