# Sync-Agent — Estratégia de replicação/sync (status atual)

Data: 2026-04-30

## Estado no Gate WEB-MIGRATION-1

- modo atual reportado: `pending`
- handshake e heartbeat operacionais
- descoberta PEC e validação read-only operacionais
- sem CDC validado neste gate
- sem promessa de realtime exato

## Estado no Gate PROOF-PEC-AGENT-1 (2026-05-01)

- modo validado: `snapshot`;
- sync real executado com contagens agregadas (`tb_cidadao`, `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`);
- `lastSyncAt`/`updatedAt` gravados em `agent-runtime-status.json`;
- endpoints ativos no backend:
  - `GET /api/replica/status`
  - `GET /api/replica/counts`.

Destino da réplica validado por script dedicado:

```powershell
pnpm run agent:replica:diagnose-destination
```

Contrato obrigatório do destino:

- usar `SUS_ANALYTICS_DATABASE_URL`;
- driver PostgreSQL (`postgres://`/`postgresql://`);
- `DATABASE_URL` não é fallback de réplica;
- porta `8033` é inválida para esse pipeline.

## Modos previstos

- `cdc`
- `incremental`
- `snapshot`
- `pending`

## Diretriz

Realtime exato só pode ser declarado após validação operacional completa de CDC/replicação (latência, retries, replay, consistência e auditoria).

## Controles mínimos

- idempotência por checkpoints
- retry com backoff
- deduplicação por chave de evento
- rastreabilidade por installationId/agentId
- erro sanitizado sem segredo

## Referência complementar

- `docs/06-sync-agent/incremental-sync-strategy.md`
- `docs/06-sync-agent/checkpoints-and-freshness.md`
