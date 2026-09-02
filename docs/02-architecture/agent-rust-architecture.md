# Rust Agent Architecture (pec-agent-sync)

Sprint ARCH-2 — Sus Analytics Sync

## Overview

The Rust agent (`Apps/agent/pec-agent-sync`) runs on-premise at each municipal health unit.
It reads from the local PEC PostgreSQL database in read-only mode and sends incremental
raw rows/chunks to the central ingestion infrastructure. Some synced tables contain
nominal health data required by product features; logs and operational endpoints must
remain sanitized and access-controlled.

## Module Map

| Module | Responsibility |
|---|---|
| `main.rs` | CLI entrypoint, command dispatch |
| `config.rs` | Environment variable loading, AgentEnv |
| `models.rs` | Canonical heartbeat/source-health payload types |
| `pec_postgres.rs` | PEC connection — read-only SELECT only |
| `health.rs` | PEC table health check |
| `collector.rs` | Safe aggregation for health/status probes |
| `sync.rs` | Incremental cursor-based sync loop |
| `sender.rs` | Legacy HTTP POST to TypeScript server/API |
| `ingest_outbox.rs` | Canonical durable gzip chunk sender to `dm-sync-ingest` |
| `spool.rs` | Offline queue with exponential backoff |
| `identity.rs` | Agent registration and heartbeat |
| `checkpoint.rs` | Cursor persistence to disk |
| `bootstrap.rs` | Initial DB setup |
| `logging.rs` | Structured logging (no PII) |
| `http_client.rs` | Authenticated HTTP client |

## Architecture Laws

1. **Read-only on PEC** — `pec_postgres.rs` uses only `SELECT`. No INSERT/UPDATE/DELETE.
2. **LGPD by layer** — heartbeat/source-health do not carry PII; raw sync rows can carry nominal PEC data only through the controlled ingestion path, with RBAC, audit, retention and log sanitization.
3. **PostgreSQL only** — source database must be PostgreSQL. MySQL/MariaDB rejected (400).
4. **Exponential backoff spool** — failed deliveries queue to disk, retry with backoff up to 1h.
5. **Token never logged** — only `agent_id` and `status` appear in logs.

## Data Flow

```
PEC PostgreSQL (read-only)
    |
    v
pec_postgres.rs (SELECT only)
    |
    v
sync.rs / health.rs (incremental extraction + source health)
    |
    v
raw row mapping / chunk contract
    |
    v
ingest_outbox.rs (gzip chunk with Bearer token)
    |-- success --> dm-sync-ingest persists chunk before ACK
    |-- failure --> local outbox/spool retry with backoff
```

## Server/API Endpoints (consumed by agent)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/agents/register | Bootstrap/activation | First-time registration |
| POST | /api/agents/heartbeat | Bearer | Periodic liveness signal |
| POST | /api/agents/source-health | Bearer | PEC health + table status |
| POST | /v1/sync/batches | Bearer + gzip | Canonical durable chunk ingestion |
| POST | /api/agents/batch | Bearer + feature flag | Legacy/local smoke path only; not production default |
| GET  | /api/agents/checkpoint | Bearer | Fetch cursor position |
| POST | /api/agents/checkpoint | Bearer | Advance cursor |
| GET  | /api/agents/list | Session + `agent.admin.manage` | Admin: list all agents |
| GET  | /api/agents/summary | Session + `agent.admin.manage` | Admin: aggregate counts |
| GET  | /api/agents/status | Session + `agent.admin.manage` | Operational status |

## Unit Tests (ARCH-2)

- `models::tests` — serialization correctness for operational payloads
- `spool::tests` — backoff formula, push/len, no token in payload
- `config::tests` — env defaults, server_url format, AgentEnv load

Run with: `cargo test --manifest-path Apps/agent/Cargo.toml`

## Persistence (ARCH-2)

The server/API now persists agent telemetry in PostgreSQL (`sus_analytics` DB):

- `agent_registry` — one row per agent, upserted on every interaction
- `agent_heartbeats` — append-only log of heartbeats
- `agent_source_health` — append-only log of PEC health checks
- `agent_checkpoints` — current cursor per (agent, municipality, table)
- `agent_batches` — record of each accepted batch
- `agent_events` — general event log

Memory fallback is development-only. Production requires `SUS_ANALYTICS_DATABASE_URL`,
`dm-sync-ingest` and durable Postgres/Redis infrastructure outside the repository.
