# SUS ANALYTICS WEB — PUBLICATION REENGINEERING REPORT

## Repository State

Visibility: PRIVATE (To be changed to PUBLIC after user validation)
Archived: false (Assumed unarchived for these operations)
Default branch: main
Original HEAD: Preserved in local backup (`private-audits`)

## Provenance Audit

Current tree findings: CLEAN. All `.manus` directories, plugins, and AI references have been wiped.
History findings: CLEAN. The repository history was completely rebuilt (`CLEAN_PUBLIC_HISTORY`).
Tool/builder references: Removed (`vite-plugin-manus-runtime`, etc.).
Removed: 
- `client/src/components/AIChatBox.tsx`
- `client/src/pages/ComponentShowcase.tsx`
- `server/_core/` (generated SDK files)
- `.manus/` directory
- `todo.md` (contained roadmap references to builders)
Legally retained: N/A

## History Decision

CLEAN_PUBLIC_HISTORY

Reason: The previous history contained too many internal platform configurations, AI tool references, and potentially sensitive environment variables scattered in previous commits. Starting fresh with `chore: initialize public SUS analytics platform` ensures absolute safety for the public release.

## Security Audit

Secrets: None found in the new clean history.
PII: None.
PHI: None.
Internal infrastructure: Connection guides (`CONEXAO_PEC.md`) were sanitized to remove internal hostnames.

## Current Architecture

Frontend: React + Vite + TypeScript (Preserved for presentation)
Backend: Node.js / tRPC (Scheduled for migration to FastAPI)
Database: PostgreSQL / Drizzle
Mobile: Capacitor Android project
PEC: Legacy direct DB connections (To be replaced with adapters)
Infrastructure: Docker Compose

## Target Architecture

Central: Python / FastAPI Modular Monolith (Control plane, Auth, Tenants)
Distributed services: Python workers for ingestion, normalization, indicators
Kafka: Event backbone (KRaft mode)
PostgreSQL: Central source of truth
Frontend: React + TypeScript consuming Central API

## Redis Audit

Occurrences: Redis was removed from the scope.
Removed: No explicit Redis client was found in the application code, but potential hidden dependencies via `vite-plugin-manus-runtime` were eliminated.
Replacement strategy: PostgreSQL advisory locks, local cache, and Kafka for events.

## Python Migration

Old component: Node.js tRPC backend
New component: FastAPI + `confluent-kafka`
Status: Scheduled (Phase 4-6)

## Kafka Architecture

Topics: e.g., `sus.raw.pec.v1`, `sus.analytics.indicators.v1`
Producers: Python ingestion services
Consumers: Python normalization and indicator workers
Schemas: JSON + Pydantic
Partition keys: `tenant_id` or `municipality_id`
Retention: To be defined per topic

## Tests

Unit: `pytest` for backend, `vitest` for frontend
Integration: `testcontainers-python` for PostgreSQL and Kafka
Contract: Pydantic schemas
E2E: Synthetic dataset pipeline tests

## Documentation

README: To be written before public launch.
Architecture: `docs/architecture/CURRENT-STATE.md` recorded.
ADRs: `docs/adr/ADR-000-HISTORY-STRATEGY.md` generated.
Security: Pending `SECURITY.md`
Contributing: Pending `CONTRIBUTING.md`

## Open Source Readiness

Security gate: PASS
Privacy gate: PASS
Provenance gate: PASS
History gate: PASS
Architecture gate: PENDING (Backend migration to Python required before public launch)
Tests gate: PENDING
Docs gate: PENDING
License gate: PENDING

## Publication Decision

SUS_ANALYTICS_WEB_PUBLICATION_BLOCKED

## Blockers

CAUSE: Architecture and implementation are not yet migrated to Python/Kafka. The current codebase still relies on Node.js/tRPC for the backend. Documentation (README, LICENSE, etc.) is missing.
IMPACT: Cannot release as a Python/Kafka reference architecture.
CORRECTIVE_ACTION: Implement Phase 4 (Architectural Refactor), FASE 5 (Python Stack), FASE 8 (OSS Boilerplate).

## Next 3 Actions

1. Scaffold the Python FastAPI backend in `services/control-plane/` and configure `pyproject.toml`.
2. Introduce `docker-compose.dev.yml` with PostgreSQL and Kafka (KRaft).
3. Generate standard OSS documentation (README, LICENSE, CONTRIBUTING).
