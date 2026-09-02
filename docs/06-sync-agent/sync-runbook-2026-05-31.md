# Runbook do Sync Distribuido

## Diagnostico rapido

```powershell
cd D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync
git status --short --branch
docker compose ls
docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml ps
```

## Validar backend

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/api/agents/summary
```

Atencao: o compose atual publica `3005->3003`. Scripts antigos podem usar `3003` e gerar falso negativo.

## Validar receiver Rust

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3015/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3015/readyz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3015/metrics
```

Interprete:

- `accepted`: chunk persistido;
- `accepted_duplicate`: duplicado idempotente, seguro para checkpoint;
- `413`: reduzir `AGENT_BATCH_SIZE`;
- `429`: backpressure, manter outbox e tentar depois;
- `503`: sem ACK, nao avancar cursor;
- `pending_queue`: Redis falhou, Postgres preservou o chunk.

## Validar servico Windows

```powershell
Get-Service *pec*
Get-Service *sync*
Get-Process *pec* -ErrorAction SilentlyContinue
Get-CimInstance Win32_Service -Filter "Name='PecAgentSync'" |
  Select-Object Name,State,StartMode,ProcessId,PathName
```

Se `PecAgentSync=Running` e `/api/agents/summary.onlineAgents=0`, validar URL/porta configurada no NSSM e no `.env` do agente.

No host auditado, a causa confirmada foi:

- backend publicado em `http://127.0.0.1:3005`;
- service config instalado com `AGENT_SERVER_URL=http://127.0.0.1:3003`;
- `http://127.0.0.1:3003/api/health` recusando conexao.

Correção permanente preferencial via NSSM, sem segredo:

```powershell
nssm set PecAgentSync AppEnvironmentExtra `
  AGENT_SERVER_URL=http://127.0.0.1:3005 `
  AGENT_SYNC_TRANSPORT=ingest `
  AGENT_INGEST_URL=http://127.0.0.1:3015/v1/sync/batches
Restart-Service PecAgentSync
```

Se retornar `OpenService(): Acesso negado`, executar em PowerShell elevado ou aplicar a mesma configuracao em `C:\Program Files\DMTech\esus-agent-sync\config\.env` com backup previo.

## Validar estado local

```powershell
Get-ChildItem -Recurse -File agent-state,Apps\agent\pec-agent-sync\agent-state |
  Sort-Object LastWriteTime -Descending |
  Select-Object FullName,Length,LastWriteTime
```

Nunca imprimir `pec_credentials.json` nem token bruto. Para identidade, imprimir apenas `identity` sem `agent_token`.

## Ciclo manual seguro

Use o binario instalado ou `Apps/agent/target/release/pec-agent-sync.exe`.

```powershell
pec-agent-sync status
pec-agent-sync once
pec-agent-sync sync
```

Para validar sem depender de escrita no `Program Files`, use estado gravavel e a config instalada como fonte de credenciais, sem imprimir segredos:

```powershell
$env:AGENT_ENV_FILE="C:\Program Files\DMTech\esus-agent-sync\config\.env"
$env:AGENT_SERVER_URL="http://127.0.0.1:3005"
$env:AGENT_SYNC_TRANSPORT="ingest"
$env:AGENT_INGEST_URL="http://127.0.0.1:3015/v1/sync/batches"
$env:AGENT_STATE_DIR="D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync\Apps\agent\pec-agent-sync\agent-state"
$env:AGENT_SYNC_TABLES="tb_fat_visita_domiciliar"
$env:AGENT_MAX_BATCHES_PER_TABLE="1"
$env:AGENT_BATCH_SIZE="500"
Apps\agent\target\debug\pec-agent-sync.exe sync
```

Depois validar:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/api/agents/summary
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3005/readyz
```

## Backfill controlado

```env
AGENT_SYNC_TRANSPORT=ingest
AGENT_INGEST_URL=http://127.0.0.1:3015/v1/sync/batches
AGENT_BATCH_SIZE=5000
AGENT_MAX_BATCHES_PER_TABLE=100
AGENT_SYNC_PROFILE=all
AGENT_SYNC_DISCOVER_SCHEMA=true
```

Para uma tabela:

```env
AGENT_SYNC_BACKFILL_TABLE=tb_fat_visita_domiciliar
AGENT_SYNC_BACKFILL_FROM_CURSOR=00000000000000000000
AGENT_SYNC_BACKFILL_BATCH_SIZE=5000
AGENT_SYNC_BACKFILL_MAX_BATCHES=100
```

## Recuperacao

| Sintoma | Acao |
|---|---|
| `onlineAgents=0` | corrigir `AGENT_SERVER_URL`, rodar `once`, verificar heartbeat |
| `spool.json` com entradas | backend legado indisponivel; corrigir endpoint/token e rodar `once` |
| `ingest-outbox.json` com entradas | receiver indisponivel/NACK; verificar `/readyz`, `413`, `429`, `503` |
| `pending_queue > 0` | verificar normalizer e Redis; Postgres preservou chunks |
| `requiredMissing` nao vazio | rodar catalog discovery; corrigir permissao/schema PEC |
| `chunk_hash_mismatch` | revisar canonical JSON e versao do agente |
| `source_table_not_allowed` | alinhar allowlist do receiver com `SYNC_CATALOG` |

## Rollback

1. Parar o agente sem apagar estado.
2. Preservar `identity.json`, `checkpoints.json`, `spool.json`, `ingest-outbox.json`.
3. Repor binario/config anterior.
4. Subir servico.
5. Rodar `status`, `once` e validar `/api/agents/summary`.

Nao usar `git reset --hard`, `docker cp` como solucao final, force push ou reset de checkpoint sem plano de replay.


---

## Atualização S05 — PEC edge/ingestão (2026-08-26)

Este adendo descreve o runtime canônico atualmente auditado. Ele prevalece sobre os comandos históricos acima quando houver divergência de caminho ou de autoridade, sem transformar esta documentação em autorização de operação real.

| Camada | Runtime canônico | Contrato operacional |
| --- | --- | --- |
| Edge | `Apps/agent/pec-agent-sync` | Lê a origem preferencialmente em modo read-only; grava RAW e outbox duráveis no SQLite local antes do primeiro envio. |
| Transporte | `POST /v1/sync/batches` | Envelope JSON comprimido com gzip, hash, cursor, idempotency key e binding de agente/tenant/município. |
| Receiver | `Apps/ingest/dm-sync-ingest` | Autentica bearer sem registrar o token, valida escopo e persiste chunk/payload no PostgreSQL antes de responder ACK. |
| Normalização | worker Rust do receiver | Redis é apenas hint de wake-up; backlog e retry persistidos no PostgreSQL são a autoridade de recuperação. |
| Compatibilidade | `Apps/server/api/src/agents/**` | O worker TypeScript e `/api/agents/batch` permanecem caminhos legados/de desenvolvimento; não são a autoridade do caminho gzip canônico. |

Um `accepted` confirma persistência durável do chunk. Um `accepted_duplicate` confirma que a mesma entrega já está persistida e pode ser tratada idempotentemente. No edge, somente esses dois estados podem chamar a transação que registra o recibo, marca o RAW/outbox como confirmado e avança o checkpoint; respostas `413`, `429`, `503`, falha de autenticação ou erro de transporte preservam o estado para retry, bloqueio ou quarentena conforme a classe da falha.

O receiver publica `/healthz`, `/readyz` e `/metrics`. Readiness exige PostgreSQL e schema de ingestão; Redis pode deixar o serviço degradado quando não for requisito configurado. O worker possui `worker-healthcheck`, `worker-status` e `worker-cutover-preflight`, além de leases, retry com backoff, dead-letter, recovery de processamento preso e ACK do Redis somente depois de resultado durável. Snapshots completos exigem cadeia contígua, chunk terminal e reconciliação transacional.

### Gates de segurança e operação

Toda validação S05 deve usar fixtures sintéticas. É proibido inspecionar ou modificar PEC real, `agent-state` real, `identity.json`, credenciais, spool ou payload clínico. Não executar canário real, backfill real, full drain, cutover, deploy, push ou alteração de schema real. O drain integral continua condicionado simultaneamente à autorização literal `AUTORIZO_DRENAGEM_COMPLETA_PEC_REAL` e a um change record bounded aprovado; esta sessão não possui essa autorização.

Os logs e evidências devem conter apenas contagens, hashes, códigos de erro sanitizados, tempos e identificadores técnicos necessários ao diagnóstico. Bearer tokens, connection strings, CPF, CNS, nomes, endereços e payloads nominais não podem aparecer em logs, commits, tickets, handoffs ou artefatos.

### Recuperação e rollback

Para falha de transporte ou indisponibilidade do Redis, preservar RAW/outbox, chunks e checkpoints; não descartar silenciosamente, editar cursor, apagar spool ou usar Redis como fonte única. O caminho de recuperação é forward-only: corrigir a causa, revalidar escopo e autoridade, reprocessar de forma idempotente e coletar evidência nova. `processing-recovery` e `historical-replay` exigem seus próprios gates literais, escopo bounded e auditoria; não devem ser improvisados durante um incidente.

### Evidência sintética desta sessão

A baseline executada no worktree S05 passou com `pec-agent-sync`: 117 testes aprovados, 0 falhas e 2 ignorados; `dm-sync-ingest`: 105 aprovados, 0 falhas e 15 ignorados; testes TypeScript de `Apps/server/api/src/agents/__tests__`: 35 aprovados, 0 falhas e 0 ignorados. Os testes ignorados dependem de PostgreSQL descartável ou runtime externo e não foram convertidos em prova de produção. Os gates de formatação, check, clippy, diff, secret/PII e smoke sanitizado devem ser registrados pelo handoff somente após execução explícita.
