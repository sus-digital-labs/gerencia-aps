# Checklist QA do Sync Distribuido

## Classificacao obrigatoria

| Area | Status atual | Evidencia minima |
|---|---|---|
| Agente Rust cliente | implementado/runtime validado manualmente; servico bloqueado por config | servico Windows `Running`, processo presente, heartbeat manual aceito, NSSM config ainda em `3003` |
| Receiver Rust | implementado/runtime ok | `/healthz`, `/readyz`, `/metrics` |
| Backend agentes | implementado/runtime ok apos override | `/api/agents/summary` com `storageMode=postgresql`, `onlineAgents=1` apos heartbeat manual |
| Banco central | implementado/runtime ok | `/readyz analyticsDb=ok`, `syncCatalog=ok` |
| Fila Redis/Postgres | implementado/runtime ok | `redis=ok`, `ingest_pending_queue_total 0` |
| 56 tabelas | implementado/runtime ok para catalogo | `SYNC_CATALOG` count 56, `requiredMissing=[]` |

## Gates obrigatorios antes de declarar operacional

- [ ] `git status --short --branch` revisado e alteracoes classificadas.
- [ ] `docker compose ls` sem duplicacao indevida de infra.
- [ ] `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml config --quiet`.
- [ ] `GET /api/health` no backend.
- [ ] `GET /readyz` no backend com `syncCatalog.catalogStatus=ok`.
- [ ] `GET /healthz` no receiver.
- [ ] `GET /readyz` no receiver com Postgres/migrations/Redis `ok`.
- [ ] `GET /metrics` no receiver com fila pendente monitorada.
- [ ] `GET /api/agents/summary` com `storageMode=postgresql`.
- [x] `onlineAgents >= 1` para declarar agente conectado manualmente.
- [x] `pec-agent-sync status` sem expor token/credenciais.
- [x] `pec-agent-sync once` gera heartbeat recente.
- [x] `pec-agent-sync sync` envia chunks ou confirma sem pendencias.
- [x] `spool.json` e `ingest-outbox.json` sem backlog no estado gravavel validado.
- [x] `requiredMissing=[]` no catalogo.
- [x] DLQ/pending queue sem acumulacao.
- [ ] Config permanente do `PecAgentSync` corrigida no NSSM ou `.env` instalado.

## Gates de build/teste

- [ ] `pnpm run agent:test`
- [ ] `pnpm run agent:build`
- [ ] `pnpm run ingest:test`
- [ ] `pnpm run ingest:build`
- [ ] `pnpm run smoke:ingest:health`
- [ ] `pnpm run smoke:ingest:readyz`
- [ ] `pnpm run smoke:ingest:batch`
- [ ] `pnpm run smoke:ingest:idempotency`
- [ ] `pnpm run smoke:ingest:payload-too-large`
- [ ] `pnpm run smoke:ingest:multi-agent`
- [ ] `pnpm run smoke:ingest:normalizer`

## Verificacao de seguranca

- [ ] Nenhum `.env` real versionado.
- [ ] Nenhuma senha/token/JWT/connection string em logs.
- [ ] CPF/CNS completo ausente em logs e docs.
- [ ] `AGENT_AUTH_DEV_MODE=false` em producao.
- [ ] Bearer token validado por hash em `agent_registry.token_hash`.
- [ ] PEC somente read-only.
- [ ] Nenhuma tabela criada no PEC.
- [ ] TLS obrigatorio fora do localhost.

## Criterio de aceite

Aceitar como operacional apenas quando todos forem verdadeiros:

1. servico agente rodando;
2. heartbeat recente no backend;
3. source-health recente;
4. receiver ready;
5. outbox local sem backlog permanente;
6. checkpoint avanca somente apos ACK;
7. fila/pending queue drenam;
8. dados chegam ao banco central;
9. logs e metricas mostram correlation/request id;
10. testes/smokes aplicaveis passam.

Observacao: nesta rodada, o runtime foi validado manualmente, mas a aceitacao operacional plena ainda depende de aplicar a URL correta no servico Windows com permissao administrativa.
