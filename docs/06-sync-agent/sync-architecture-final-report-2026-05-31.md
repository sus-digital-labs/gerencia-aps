# Relatorio Final da Validacao Runtime do Sync

Data da execucao: 2026-06-02  
Workspace: `D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync`

## Status final

**BLOCKED_BY_AGENT_SERVICE_CONFIG**

O runtime foi validado com ciclo real, mas a configuracao permanente do servico Windows ainda esta bloqueada por permissao administrativa. Nao declarar `DONE_SYNC_ARCHITECTURE_DOCUMENTED_RUNTIME_VALIDATED` ate corrigir o NSSM ou o `.env` instalado e reiniciar o servico.

## Evidencia objetiva

| Item | Resultado |
|---|---|
| Servico Windows | `PecAgentSync Running`, `StartMode=Auto`, NSSM |
| Processo | `pec-agent-sync` presente |
| Backend | `/api/health=ok`, `/readyz=ok` |
| Receiver | `/healthz=ok`, `/readyz=ok`, Postgres/Redis/migrations `ok` |
| Causa raiz | service config `AGENT_SERVER_URL=http://127.0.0.1:3003`; backend real em `http://127.0.0.1:3005` |
| Correcao manual | override `AGENT_SERVER_URL=http://127.0.0.1:3005` |
| Heartbeat | HTTP 200, `accepted=true`, `lastHeartbeatAt=2026-06-02T09:49:26.601Z` |
| Backend agentes | `onlineAgents=0 -> 1`; agente alvo `active` |
| Sync real | `tb_fat_visita_domiciliar`, 500 linhas |
| Receiver ACK | `ackStatus=accepted`, `queueStatus=queued` |
| Checkpoint | `00000000000002098070 -> 00000000000002098570` |
| Spool/outbox validado | `spoolEntries=0`, `ingestOutboxEntries=0` no estado gravavel |
| Receiver metrics | `ingest_chunks_total{outcome="accepted"} 1`, `ingest_pending_queue_total 0` |
| 56 tabelas | smoke read-only OK, `tableCount=56`, `requiredMissing=0` |

## Bloqueio

Tentativas de correcao permanente:

- editar `C:\Program Files\DMTech\esus-agent-sync\config\.env`: `Access to the path ... is denied`;
- `nssm set PecAgentSync AppEnvironmentExtra ...`: `OpenService(): Acesso negado`, exit code 3.

## Rollback

Nenhum checkpoint foi revertido. O ciclo enviou um chunk real aceito pelo receiver e o checkpoint avancou somente apos ACK. Para rollback operacional, preservar `identity.json`, `checkpoints.json`, `spool.json` e `ingest-outbox.json`; nao resetar cursor sem plano de replay.

## Proximas acoes

1. Executar PowerShell elevado e aplicar `AppEnvironmentExtra` no NSSM com `AGENT_SERVER_URL=3005` e `AGENT_INGEST_URL=3015`.
2. Reiniciar `PecAgentSync` e confirmar que o heartbeat vem do servico, sem override manual.
3. Rodar sync completo progressivo das tabelas pendentes, monitorando `ingest_pending_queue_total`, DLQ, checkpoints e freshness.
