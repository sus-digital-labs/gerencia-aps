# Auditoria Runtime do Sync Agent

Auditoria executada em 2026-06-02 no workspace `D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync`.

## Resultado

Classificacao inicial: **RUNTIME_AGENT_STATUS_PARTIAL**.  
Classificacao apos correcao manual controlada: **BLOCKED_BY_AGENT_SERVICE_CONFIG**.

O agente Rust, o backend e o receiver foram validados em ciclo real com heartbeat, source-health, ACK de ingest e avanço de checkpoint. A correção permanente do servico Windows ainda nao pode ser declarada concluida porque a configuracao instalada do NSSM continua apontando para `http://127.0.0.1:3003` e a tentativa de alterar `AppEnvironmentExtra` retornou `OpenService(): Acesso negado`.

Status correto desta rodada: runtime validado manualmente com override seguro de ambiente, mas servico instalado bloqueado por permissao administrativa.

## Atualizacao operacional 2026-06-02

| Verificacao | Antes | Depois | Evidencia |
|---|---:|---:|---|
| Backend `onlineAgents` | 0 | 1 | `/api/agents/summary` |
| Agente alvo | `stale_offline` | `active` | `/api/agents/list` para `agent-ddb91b27-abc5-4fdf-a53f-165081c880d6` |
| Ultimo heartbeat | antigo | `2026-06-02T09:49:26.601Z` | heartbeat aceito HTTP 200 |
| Receiver ACK | nao validado nesta rodada | `accepted` | `POST /v1/sync/batches` via `AGENT_SYNC_TRANSPORT=ingest` |
| Fila receiver | `ingest_pending_queue_total 0` | `ingest_pending_queue_total 0` | `/metrics` |
| Chunks aceitos | 0 na coleta inicial | `ingest_chunks_total{outcome="accepted"} 1` | `/metrics` |
| Checkpoint `tb_fat_visita_domiciliar` | `00000000000002098070` | `00000000000002098570` | `checkpoints.json` no estado gravavel do workspace |
| Spool/outbox do ciclo validado | 0/0 | 0/0 | `Apps/agent/pec-agent-sync/agent-state` |

Comandos de ciclo real executados com estado gravavel e sem imprimir segredo:

- `pec-agent-sync heartbeat`: `serverStatus=200`, `accepted=true`.
- `pec-agent-sync once`: heartbeat e source-health enviados.
- `pec-agent-sync sync` com `AGENT_SYNC_TABLES=tb_fat_visita_domiciliar`, `AGENT_MAX_BATCHES_PER_TABLE=1`, `AGENT_BATCH_SIZE=500`: 500 linhas enviadas, `ackStatus=accepted`, `queueStatus=queued`.

Bloqueios de persistencia operacional:

- Editar `C:\Program Files\DMTech\esus-agent-sync\config\.env`: `Access to the path ... is denied`.
- `nssm set PecAgentSync AppEnvironmentExtra ...`: `OpenService(): Acesso negado`, exit code 3.
- Execucao manual do binario instalado conseguiu enviar heartbeat ao backend correto, mas falhou ao salvar `identity.json` no `Program Files` com `Acesso negado`.

## Baseline Git

| Comando | Resultado |
|---|---|
| `pwd` | `D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync` |
| `git rev-parse --show-toplevel` | `D:/dm-hub/apps/dm-gov/saude/sus-analytics-sync` |
| `git branch --show-current` | `main` |
| `git log -15 --oneline --decorate` | HEAD `81c5af6 fix(acs): require explicit timeline search` |
| `git remote -v` | `origin https://github.com/devdudumuniz/esus-analytics.git` |

Working tree ja estava alterada antes desta entrega:

- `Apps/server/api/src/saude-brasil-360/router.ts`
- `Apps/web/client/src/components/indicators/NominalList.tsx`
- `Apps/web/client/src/lib/pecApi.test.ts`
- `Apps/web/client/src/lib/pecApi.ts`
- `Apps/web/client/src/pages/IndicatorDetail.tsx`
- `docs/13-saude-brasil-360/final-21-indicators-qa-matrix-2026-05-31.md`
- `docs/13-saude-brasil-360/final-indicators-completion-report-2026-05-31.md`
- `docs/13-saude-brasil-360/performance-plan-21-indicators-2026-05-31.md`
- `scripts/tests/shared/smoke-b360-detail-tabs.mjs`

Essas alteracoes foram classificadas como pre-existentes e fora do escopo desta documentacao.

## Stack detectada

| Item | Resultado |
|---|---|
| Package manager | `pnpm@10.32.0`, lockfile `pnpm-lock.yaml` |
| Backend | Node.js/TypeScript, Express/tRPC |
| Frontend | React + Vite + Tailwind |
| Agente cliente | Rust `Apps/agent/pec-agent-sync` |
| Receiver | Rust/Axum `Apps/ingest/dm-sync-ingest` |
| Banco | PostgreSQL compartilhado |
| Cache/fila | Redis compartilhado |
| Docker | `docker/01-compose/compose.production.yml`, `docker/01-compose/compose.web.dev.yml`, `docker/01-compose/compose.infra.yml`, `docker/01-compose/compose.frontend.dev.yml` |

## Runtime Windows

| Verificacao | Evidencia | Status |
|---|---|---|
| `Get-Service *pec*` | `e-SUS-PEC Stopped`; `PecAgentSync Running Automatic` | parcial |
| `Get-Service *sync*` | `PecAgentSync Running Automatic` | ok |
| `Get-Process *pec*` | `pec-agent-sync` presente | ok |
| `Get-Process *agent*` | `pec-agent-sync`, `docker-agent` | ok |
| WMI service | `Name=PecAgentSync`, `State=Running`, `StartMode=Auto`, `ProcessId=5812`, `PathName="...\nssm.exe"` | ok/parcial |
| `scripts/11-windows/agent-service-status.ps1` | corrigido para tolerar `StartTime=null` | ok |
| `scripts/11-windows/agent-status.ps1` | corrigido para default `127.0.0.1:3005` e aviso quando service config usa `3003` | ok/parcial |

Observacao: o compose de producao publica backend em `3005->3003`. O script `agent-status.ps1` usa default `127.0.0.1:3003`, por isso reportou falha de servidor remoto.

## Estado local do agente

| Arquivo | Evidencia | Status |
|---|---|---|
| `Apps/agent/pec-agent-sync/agent-state/identity.json` | `agent_id=agent-ddb91b27-abc5-4fdf-a53f-165081c880d6`, `installation_id=pilot-installation-001`, `tenant_id=dm-technology-master`, `municipality_ids=*` | implementado |
| `Apps/agent/pec-agent-sync/agent-state/checkpoints.json` | 46 cursores, `updated_at=2026-05-29T12:24:18Z` | historico de sync |
| `Apps/agent/pec-agent-sync/agent-state/spool.json` | `entries=[]` | sem backlog legado |
| `Apps/agent/pec-agent-sync/agent-state/ingest-outbox.json` | ausente | nao comprovado nesse state dir |
| `agent-state/checkpoints.json` | 11 cursores, `updated_at=2026-06-01T08:52:25Z` | historico recente |
| `agent-state/ingest-outbox.json` | `entries=[]` | sem backlog ingest |
| `agent-state/spool.json` | `entries=[]` | sem backlog legado |

## Docker e endpoints

| Verificacao | Resultado |
|---|---|
| `docker compose ls` | stack `dm-gov-saude-sus-analytics-sync` running com `docker/01-compose/compose.production.yml` |
| `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml ps` | backend, ingest e normalizer `Up` e `healthy` |
| `GET http://127.0.0.1:3005/api/health` | `status=ok`, cache conectado |
| `GET http://127.0.0.1:3005/readyz` | `status=ok`, `pecReplica=ok`, `analyticsDb=ok`, `redis=ok`, `syncCatalog=ok` |
| `GET http://127.0.0.1:3015/healthz` | `{"status":"ok"}` |
| `GET http://127.0.0.1:3015/readyz` | `status=ok`, `postgres=ok`, `migrations=ok`, `redis=ok` |
| `GET http://127.0.0.1:3015/metrics` | `ingest_pending_queue_total 0` |
| `docker compose ... config --quiet` | exit 0 |

## Status de agentes no backend

| Endpoint | Resultado |
|---|---|
| `/api/agents/summary` | `totalAgents=27`, `onlineAgents=0`, `totalBatchesLogged=7130`, `checkpointCount=61`, `storageMode=postgresql`, `authMode=PRODUCTION` |
| `/api/agents/list` | agentes registrados, todos classificados como `stale_offline` no trecho consultado |
| `/api/agents/status` | `status=offline`, `pecConfigDiscovered=true`, `pecConnectionStatus=ok`, `syncMode=incremental` |

## Catalogo e 56 tabelas

O catalogo Rust `Apps/agent/pec-agent-sync/src/catalog.rs` possui:

- `CATALOG_VERSION=2026-05-31.acs-timeline-temporal-v2`;
- `SYNC_CATALOG` com 56 entradas;
- perfil `all` exposto no `/readyz`;
- `requiredMissing=[]`;
- `optionalMissing=[]`;
- `degradedModules=[]`.

O inventario completo esta em `docs/06-sync-agent/sync-table-inventory-56-2026-05-31.md`.

## Diagnostico

Causa raiz confirmada:

1. O servico Windows carrega `C:\Program Files\DMTech\esus-agent-sync\config\.env`.
2. Esse arquivo define `AGENT_SERVER_URL=http://127.0.0.1:3003`.
3. O compose local publica o backend em `127.0.0.1:3005`; `127.0.0.1:3003/api/health` recusou conexao.
4. Quando o mesmo agente foi executado com `AGENT_SERVER_URL=http://127.0.0.1:3005`, o backend aceitou o heartbeat e `onlineAgents` subiu para 1.
5. A alteracao permanente do servico/config esta bloqueada por permissao administrativa no host.

## Como verificar correcao

1. Confirmar argumentos do NSSM para `PecAgentSync`, especialmente `AppDirectory`, `AppParameters` e env `AGENT_SERVER_URL`.
2. Ajustar `AGENT_SERVER_URL` para a URL real acessivel pelo agente (`http://127.0.0.1:3005` local ou URL publica TLS).
3. Executar ciclo unico do agente sem expor segredo: `pec-agent-sync once`.
4. Validar `GET http://127.0.0.1:3005/api/agents/summary` e exigir `onlineAgents >= 1`.
5. Validar `GET http://127.0.0.1:3005/readyz` e `GET http://127.0.0.1:3015/readyz`.

## Prevencao

- Corrigir `scripts/11-windows/agent-service-status.ps1` para tolerar processo sem `StartTime`.
- Parametrizar `scripts/11-windows/agent-status.ps1` com URL vinda do service config ou `.env` do agente.
- Alertar quando `PecAgentSync Running` e `onlineAgents=0` coexistirem por mais de 10 minutos.
- Registrar heartbeat/lag por `agent_id`, `installation_id`, `municipality_id` sem PII.
