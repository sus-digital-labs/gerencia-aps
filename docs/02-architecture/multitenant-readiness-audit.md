# Multi-tenant Readiness Audit

> **Data:** 02/05/2026
> **Gate:** MULTITENANT-SYNC-READINESS-1
> **Commit base:** 7499341

---

## Sumário executivo

O SUS Analytics v4.0.0 **NÃO está pronto** para operação multi-tenant. Todos os 7 eixos auditados apresentam gaps críticos. O sistema opera em modo single-tenant implícito: uma réplica PEC, sem campo `municipio_ibge` nas tabelas analíticas, sem `tenant_id`, sem checkpoint de sync.

**Veredicto geral:** `NOT_READY`
**Falhas críticas:** 6/7 eixos com gap crítico

---

## Auditoria por eixo

### Eixo 1 — Agent Binding (installation_id / tenant)

**Status:** `NOT_READY`

| Check | Resultado |
|---|---|
| `installation_id` no agente | ❌ AUSENTE |
| `tenant_id` no agente | ❌ AUSENTE |
| `partner_id` no agente | ❌ AUSENTE |
| Tabela `sync_installations` | ❌ AUSENTE |
| Agente como serviço persistente | ❌ One-shot Docker exec |

**Evidência:** `agent/rust/pec-bootstrap-agent/src/main.rs` — `fn main()` termina com `std::process::exit(1)` em erro; não existe loop de serviço.

---

### Eixo 2 — Checkpoint Sync (incremental)

**Status:** `NOT_READY`

| Check | Resultado |
|---|---|
| Tabela `sync_checkpoints` | ❌ AUSENTE |
| Query incremental (`WHERE pk > last`) | ❌ AUSENTE |
| `sync_run_id` em tabelas de resultado | ❌ AUSENTE |
| Agente aplica seed completo a cada run | ✅ Confirmado (não incremental) |
| `pec:last_sync` no Redis | ✅ Presente no runtime (linha 1541) |

**Evidência:** `SEED_SQL = include_str!("../../../../scripts/02-fixtures/pec-replica-seed.sql")` — seed completo cada vez.

---

### Eixo 3 — PostgreSQL Central

**Status:** `PARTIAL_READY`

| Check | Resultado |
|---|---|
| PEC usa PostgreSQL (`pg.Pool`) | ✅ CORRETO |
| Réplica usa PostgreSQL (`pg.Pool`) | ✅ CORRETO |
| MySQL ativo (host-app user mgmt) | ⚠️ ATIVO — não bloqueia PEC/réplica |
| `indicator_results` em PostgreSQL | ✅ DDL presente em `docs/sql/` |
| `indicator_results` em produção | ❌ Não aplicado — sem pipeline DDL |

---

### Eixo 4 — Materialized Views / Gold Tables

**Status:** `NOT_READY`

| Check | Resultado |
|---|---|
| `CREATE MATERIALIZED VIEW` | ❌ AUSENTE em todo codebase |
| Gold tables analíticas | ❌ AUSENTES |
| Views ISF por município | ❌ AUSENTES |
| Refresh de views após sync | ❌ AUSENTE |

---

### Eixo 5 — RBAC/ABAC Multi-tenant

**Status:** `NOT_READY`

| Check | Resultado |
|---|---|
| `permissionProcedure` (verificação de permissão) | ✅ PRESENTE |
| `municipioIbge` no `AuthenticatedUser` | ❌ AUSENTE |
| `tenantId` no `AuthenticatedUser` | ❌ AUSENTE |
| Filtro de dados por `municipioIbge` em queries | ❌ AUSENTE |
| Scope injetado via middleware | ❌ AUSENTE |
| RBAC persistente (banco de dados) | ❌ AUSENTE |

---

### Eixo 6 — Multi-tenant Field Coverage

**Status:** `NOT_READY`

| Tabela | municipio_ibge | tenant_id | installation_id |
|---|---|---|---|
| `indicator_results` | ❌ | ❌ | ❌ |
| `etl_runs` | ❌ | ❌ | ❌ |
| `tb_dim_equipe` (PEC) | ❌ implícito | N/A | N/A |
| `tb_fat_atendimento_individual` (PEC) | ❌ implícito | N/A | N/A |

Score: 0/3 campos críticos em tabelas analíticas.

---

### Eixo 7 — PEC Anti-stress

**Status:** `NOT_READY`

| Check | Resultado |
|---|---|
| `statement_timeout` nas queries PEC | ❌ AUSENTE |
| Batch size nas queries | ❌ AUSENTE (exceto paginação no drilldown) |
| Retry + backoff no agente | ❌ AUSENTE |
| Circuit breaker | ❌ AUSENTE |
| Janela de sync off-peak | ❌ AUSENTE |

---

## Roadmap de remediação

Ver `docs/34-product/backlog-multitenant-sync.md` para lista completa (30 itens P0/P1/P2).

| Fase | Sprints | Objetivo |
|---|---|---|
| Fase 1 — Foundation | Sprint 1-2 | `installation_id`, `sync_checkpoints`, `municipio_ibge` em tabelas analíticas |
| Fase 2 — Scope | Sprint 3 | ABAC middleware, frontend TenantContext, teste de fronteira |
| Fase 3 — Scale | Sprint 4-5 | Materialized views, retry/backoff, agente persistente |
| Fase 4 — Production | Sprint 6 | Deploy piloto 1 município, validação end-to-end |

---

*Gerado em 02/05/2026 | Gate MULTITENANT-SYNC-READINESS-1*
