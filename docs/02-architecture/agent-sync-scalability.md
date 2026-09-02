# Agent Sync Scalability — Auditoria e Modelo Alvo

> **Data:** 02/05/2026
> **Gate:** MULTITENANT-SYNC-READINESS-1
> **Artefato auditado:** `agent/rust/pec-bootstrap-agent/src/main.rs`

---

## Estado Atual (evidência real)

### Comportamento do agente hoje

| Característica | Estado | Evidência |
|---|---|---|
| Tipo de execução | One-shot (`std::process::exit`) | `main.rs:main()` |
| Binding de instalação | AUSENTE — sem `installation_id` | busca em `main.rs` = 0 resultados |
| Checkpoint / sync incremental | AUSENTE — full seed a cada run | `SEED_SQL = include_str!(...)` |
| Retry / backoff exponencial | AUSENTE | nenhum loop com delay em `main.rs` |
| Circuit breaker | AUSENTE | nenhuma estrutura de CB em `main.rs` |
| Flush Redis | DESTRUTIVO — apaga todos os prefixos | `flush_redis_prefix()` |
| Modo de transporte | Docker exec (`docker exec -i container psql`) | `run_docker_command()` |
| Agente persistente | AUSENTE — não é um serviço | sem loop principal, sem tokio::main |
| Tabelas provisionadas | `pec_replica` e `esus` (fallback) | `ensure_database()` |
| Múltiplos municípios | AUSENTE — único contexto implícito | sem parâmetro de municipio |

### Campos ausentes (obrigatórios para multi-tenant)

```
installation_id   — vínculo entre agente e parceiro/municipio
tenant_id         — partição lógica de dados
sync_run_id       — rastreabilidade de execução de sync
last_checkpoint_at — posição do cursor incremental
municipio_ibge    — código do município provisionado
```

### Risco atual

O agente atual:
1. Aplica `SEED_SQL` completo toda vez → sem delta, sem idempotência por posição
2. Não registra quem provisionou nem qual municipio
3. Redis flush sem escopo → apaga cache de todos os tenants se prefixo for compartilhado
4. Um erro no meio do seed pode deixar o banco em estado inconsistente (sem transação explícita)
5. Sem retry — falha Docker = falha total, sem recuperação

---

## Modelo Alvo

### Arquitetura de sincronização incremental

```
PEC (PostgreSQL, read-only)
        │
        │  SELECT WHERE updated_at > :last_checkpoint
        ▼
pec-sync-agent (Rust, serviço persistente)
  ├── installation_id (UUID fixo por instância)
  ├── municipio_ibge (código IBGE do município)
  ├── checkpoint store (Redis ou tabela `sync_checkpoints`)
  │     └── last_checkpoint_at por (installation_id, tabela)
  ├── batch_size: 500 linhas por iteração
  ├── retry: 3 tentativas, backoff exponencial (1s → 2s → 4s)
  ├── circuit breaker: trip após 5 falhas consecutivas
  └── sync_run_id: UUID por execução
        │
        │  INSERT ON CONFLICT DO UPDATE (upsert)
        ▼
SUS Analytics PostgreSQL (read-write)
  └── tabelas com tenant_id, municipio_ibge, installation_id
```

### Tabela de checkpoint proposta

```sql
CREATE TABLE sync_checkpoints (
  id              BIGSERIAL PRIMARY KEY,
  installation_id UUID NOT NULL,
  municipio_ibge  TEXT NOT NULL,
  table_name      TEXT NOT NULL,
  last_position   BIGINT NOT NULL DEFAULT 0,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sync_run_id     UUID,
  rows_synced     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (installation_id, municipio_ibge, table_name)
);
```

### Tabela de execuções de sync proposta

```sql
CREATE TABLE sync_runs (
  id              BIGSERIAL PRIMARY KEY,
  run_id          UUID NOT NULL UNIQUE,
  installation_id UUID NOT NULL,
  municipio_ibge  TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('running','completed','failed','retrying')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  rows_processed  INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  metadata_json   JSONB
);
```

---

## Sprint de Implementação

| Sprint | Entrega | Critério de aceitação |
|---|---|---|
| Sprint 1 | `installation_id` no agente + tabela `sync_checkpoints` | agente registra sua identidade no bootstrap |
| Sprint 2 | Sync incremental por `updated_at` (delta) | apenas linhas novas/modificadas são transferidas |
| Sprint 3 | Retry + backoff exponencial | 3 tentativas com 1s/2s/4s entre elas |
| Sprint 4 | Circuit breaker | agente para após 5 falhas e reporta status |
| Sprint 5 | Redis flush com escopo por `installation_id` | prefixo `sus:{installation_id}:` — sem impacto cross-tenant |
| Sprint 5 | Agente como serviço persistente (tokio::main + loop) | daemon com intervalo configurável |

---

## Critério COVERED

Para declarar `agent_sync_scalability: COVERED_WITH_EVIDENCE`:

- [ ] `installation_id` presente e persistido em tabela `sync_checkpoints`
- [ ] Sync incremental com `WHERE updated_at > :last_checkpoint` comprovado
- [ ] Retry + backoff: log de 3 tentativas visível em teste
- [ ] Redis flush escoped por `installation_id`
- [ ] Agente roda como loop persistente (não one-shot)
- [ ] `sync_runs` tabela preenchida com runs reais

---

*Gerado em 02/05/2026 | Gate MULTITENANT-SYNC-READINESS-1*
