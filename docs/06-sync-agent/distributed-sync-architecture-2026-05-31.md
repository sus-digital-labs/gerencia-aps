# Arquitetura Distribuida do Sync PEC/e-SUS

Data-alvo do artefato: 2026-05-31  
Auditoria executada em runtime local em: 2026-06-02  
Produto: SUS Analytics Sync / Saude Brasil 360

## Decisao executiva

O fluxo de sincronizacao distribuida ja possui implementacao real nas tres camadas centrais:

- `source`: agente cliente Rust em `Apps/agent/pec-agent-sync`.
- `source`: receiver Rust em `Apps/ingest/dm-sync-ingest`.
- `source/runtime`: backend TypeScript/Node em `Apps/server/api/src/agents/**`, `Apps/server/api/src/sync/**` e runtime `Apps/server/api/dist/index.js`.

O estado operacional nao deve ser declarado como "100% autonomo em servico" sem a correcao permanente da configuracao Windows. A evidencia de 2026-06-02 mostra:

- servico Windows `PecAgentSync`: `Running`;
- processo `pec-agent-sync`: presente;
- backend Docker: `healthy`, publicado em `127.0.0.1:3005`;
- `dm-sync-ingest`: `healthy`, `/readyz` com Postgres/migrations/Redis `ok`;
- `dm-sync-normalizer`: `healthy`;
- `/api/agents/summary` antes da correcao manual: `totalAgents=27`, `onlineAgents=0`, `totalBatchesLogged=7130`, `checkpointCount=61`;
- `/api/agents/summary` apos heartbeat manual com URL correta: `onlineAgents=1`;
- sync real controlado: `tb_fat_visita_domiciliar`, 500 linhas, `ackStatus=accepted`, `queueStatus=queued`, checkpoint `00000000000002098070 -> 00000000000002098570`.

Classificacao honesta: **BLOCKED_BY_AGENT_SERVICE_CONFIG** para operacao permanente do servico Windows. O runtime do agente foi validado manualmente com backend/receiver corretos, mas o NSSM/config instalado continua apontando para `3003` e a alteracao permanente exige permissao administrativa.

## Proveniencia dos achados

| Classe | Evidencia |
|---|---|
| `source` | `Apps/agent/pec-agent-sync/src/**`, `Apps/ingest/dm-sync-ingest/src/main.rs`, `Apps/server/api/src/agents/**`, `Apps/server/api/src/sync/**` |
| `runtime` | Windows service/process, `agent-state/**`, endpoints `http://127.0.0.1:3005/*`, `http://127.0.0.1:3015/*`, Docker healthchecks |
| `external-compose` | `docker/01-compose/compose.production.yml`, redes externas `dm-gov-saude` e `anton-infra` |
| `docs-context` | `README.md`, `arquivo de instruÃ§Ãµes do projeto`, `.github/AGENTS.md`, `regras de contribuiÃ§Ã£o do projeto`, `docs/runbook.md`, `docs/architecture.md`, `docs/env.md`, `docs/06-sync-agent/**` |
| `generated-temp` | logs antigos em `logs/**`, snapshots de auditoria em scripts/results |
| `unknown-risk` | config instalada do servico aponta para `AGENT_SERVER_URL=http://127.0.0.1:3003`; tentativa de corrigir NSSM retornou `OpenService(): Acesso negado` |

## Componentes reais

### Agente Rust cliente

| Item | Estado | Evidencia |
|---|---|---|
| Caminho | implementado | `Apps/agent/pec-agent-sync` |
| Binario | implementado | `Cargo.toml` declara binario `pec-agent-sync` |
| Modos | implementado | `bootstrap`, `register`, `heartbeat`, `once`, `daemon`, `sync`, `health`, `catalog`, `collect`, `status`, `discover`, `diagnose-pec` |
| Daemon | implementado | `daemon.rs` com loop, heartbeat, source-health e flush de spool |
| Servico Windows | runtime parcial | `PecAgentSync Running`, `StartMode=Auto`, `ProcessId=5812`, `PathName="C:\Program Files\DMTech\esus-agent-sync\nssm.exe"` |
| Identidade | implementado | `identity.json`, `agent_id`, `installation_id`, `tenant_id`, `municipality_ids` |
| Enrollment | implementado | `AGENT_ACTIVATION_CODE`, `AGENT_ACCEPT_TERMS=true`, server token retornado no register |
| Checkpoint | implementado/runtime | `checkpoints.json`; 46 cursores no estado de `Apps/agent/pec-agent-sync`, 11 no estado raiz |
| Spool local | implementado/runtime vazio | `spool.json` com `entries=[]` |
| Ingest outbox | implementado/runtime vazio no estado raiz | `ingest-outbox.json` com `entries=[]`; ausente no estado de `Apps/agent/pec-agent-sync` |
| Heartbeat | implementado/runtime validado manualmente | HTTP 200, `accepted=true`, `/api/agents/summary onlineAgents=1` apos override para `3005` |
| Retry | implementado | spool com backoff exponencial; ingest outbox mantem falhas |
| Compressao | implementado | `Content-Encoding: gzip` no transporte ingest |
| Criptografia transporte | parcial | `reqwest` usa `rustls-tls`, mas URL local pode ser HTTP; producao deve usar TLS |
| HMAC/mTLS | ausente | codigo valida bearer/token hash; nao ha mTLS nem HMAC por chunk |

### Receiver Rust servidor

| Item | Estado | Evidencia |
|---|---|---|
| Caminho | implementado | `Apps/ingest/dm-sync-ingest` |
| Porta | implementado/runtime | `INGEST_PORT=3015`, host `127.0.0.1:3015` |
| Protocolo | implementado | `POST /v1/sync/batches` com gzip JSON |
| Health/readiness | implementado/runtime | `/healthz={"status":"ok"}`, `/readyz` status `ok` |
| Auth | implementado | bearer token validado contra `agent_registry.token_hash`; dev mode controlado por env |
| Persistencia | implementado | `sus_analytics_ingest.sync_runs`, `sync_table_state`, `sync_chunks`, `sync_chunk_payloads`, `sync_pending_queue` |
| ACK | implementado | `accepted` e `accepted_duplicate` apos persistencia duravel |
| NACK | implementado | `400`, `401`, `413`, `429`, `503` com motivo sanitizado |
| Backpressure | implementado | semaforos globais e por agente; `retry-after: 30` |
| Metricas | implementado/runtime | `/metrics`, `ingest_pending_queue_total 0` |
| Redis queue | implementado/runtime | Redis `sync:normalize`, readiness `redis=ok` |

### Backend TypeScript

| Item | Estado | Evidencia |
|---|---|---|
| Registro/heartbeat | implementado | `POST /api/agents/register`, `/heartbeat`, `/source-health` |
| Batch legado | implementado | `POST /api/agents/batch` com `AGENT_BATCH_MAX_ROWS` |
| Checkpoints remotos | implementado | `GET/POST /api/agents/checkpoint` |
| Status | implementado/runtime | `/api/agents/summary`, `/api/agents/list`, `/api/agents/status` |
| Readiness | implementado/runtime | `/readyz` com `syncCatalog.catalogStatus=ok` |
| Indicadores | implementado fora do escopo desta entrega | `saudeBrasil360.*` usa replica/catalogo para calculo; nao alterado aqui |
| Worker normalizador | implementado/runtime | `dm-sync-normalizer` consome Redis/backlog Postgres e chama `ingestAcsBatch` |

### Banco central/app

| Area | Estado | Evidencia |
|---|---|---|
| Agent registry | implementado | `agent_registry`, `agent_heartbeats`, `agent_source_health`, `agent_checkpoints`, `agent_batches`, `agent_events` |
| Ingest duravel | implementado | schema `sus_analytics_ingest` no receiver |
| Catalogo de sync | implementado/runtime | `sus_analytics_replica.sync_catalog_status`, `/readyz.syncCatalog` |
| Idempotencia | implementado parcial | `chunk_id`, `chunk_hash`, unique `(tenant_id, agent_id, source_table, chunk_start_cursor, chunk_end_cursor, chunk_hash)` |
| Tenant/municipio | implementado parcial | `tenant_id`, `agent_id`, `municipality_id`; isolamento logico depende de uso consistente no destino |

## Arquitetura macro

```mermaid
flowchart LR
  PEC[(PEC/e-SUS local)]
  A[Agente Rust Cliente]
  S[(Spool e Checkpoint Local)]
  R[Receiver Rust dm-sync-ingest]
  Q[(Inbox Postgres e Redis Stream)]
  W[Worker dm-sync-normalizer]
  DB[(Banco Central App)]
  API[Backend TypeScript/tRPC]
  UI[Dashboard Saude Brasil 360]

  PEC --> A
  A --> S
  S --> A
  A -- chunks gzip TLS ACK --> R
  R --> Q
  Q --> W
  W --> DB
  DB --> API
  API --> UI
```

## Fluxo incremental

```mermaid
flowchart TD
  Start([Inicio sync])
  Catalog[Descobrir catalogo e schema]
  Load[Carregar checkpoint por tenant, municipio e tabela]
  Query[Consultar PEC read-only por cursor]
  Map[Mapear linhas e hashes]
  Send[Enviar chunk]
  Ack{ACK duravel?}
  Cursor[Avancar checkpoint local e remoto]
  More{Ha mais linhas?}
  Done([Fim da tabela])

  Start --> Catalog --> Load --> Query --> Map --> Send --> Ack
  Ack -- accepted ou duplicate --> Cursor --> More
  Ack -- NACK ou timeout --> Retry[Manter outbox e retry]
  Retry --> Send
  More -- sim --> Query
  More -- nao --> Done
```

## Chunking, checkpoint e retry

```mermaid
flowchart LR
  C1[Chunk N montado]
  O[(ingest-outbox.json)]
  HTTP[POST gzip]
  RCV[Receiver valida schema, hash e auth]
  TX[(Transacao Postgres)]
  ACK[ACK accepted]
  FAIL[NACK/timeout/429/503]
  CK[(checkpoints.json)]

  C1 --> O --> HTTP --> RCV --> TX --> ACK --> CK
  HTTP --> FAIL --> O
  RCV --> FAIL
```

## ACK, NACK e idempotencia

```mermaid
flowchart TD
  Request[Chunk recebido]
  Auth{Token valido?}
  Hash{chunk_hash confere?}
  Dup{Chunk duplicado?}
  Persist[Persistir payload comprimido]
  Queue[Publicar Redis ou pending_queue]
  Ack[accepted]
  AckDup[accepted_duplicate]
  Nack[NACK com motivo]

  Request --> Auth
  Auth -- nao --> Nack
  Auth -- sim --> Hash
  Hash -- nao --> Nack
  Hash -- sim --> Dup
  Dup -- sim --> AckDup
  Dup -- nao --> Persist --> Queue --> Ack
```

## Distribuicao multi-municipio

```mermaid
flowchart LR
  subgraph MunicipioA[Municipio A]
    PECA[(PEC A)]
    AA[Agente A]
  end
  subgraph MunicipioB[Municipio B]
    PECB[(PEC B)]
    AB[Agente B]
  end
  subgraph MunicipioN[Municipio N]
    PECN[(PEC N)]
    AN[Agente N]
  end
  LB[Entrada HTTPS / Receiver]
  Inbox[(Postgres Inbox por tenant/agent/table)]
  Workers[Workers normalizadores]
  Central[(Replica central isolada por tenant/municipio)]

  PECA --> AA --> LB
  PECB --> AB --> LB
  PECN --> AN --> LB
  LB --> Inbox --> Workers --> Central
```

## Sequencia cliente para banco central

```mermaid
sequenceDiagram
  participant PEC as PEC/e-SUS local
  participant Agent as Agente Rust
  participant Receiver as dm-sync-ingest
  participant Pg as Postgres ingest
  participant Redis as Redis Stream
  participant Worker as dm-sync-normalizer
  participant Replica as sus_analytics_replica

  Agent->>PEC: SELECT read-only por cursor
  PEC-->>Agent: linhas da tabela
  Agent->>Agent: monta records, payload_hash e chunk_hash
  Agent->>Receiver: POST /v1/sync/batches gzip
  Receiver->>Receiver: valida token, tabela, limites e hash
  Receiver->>Pg: INSERT sync_chunks + payload
  Pg-->>Receiver: commit
  Receiver->>Redis: XADD sync:normalize
  Receiver-->>Agent: ACK accepted
  Agent->>Agent: avanca checkpoint
  Worker->>Pg: claim chunk/backlog
  Worker->>Replica: upsert normalizado
```

## Estados do agente

```mermaid
stateDiagram-v2
  [*] --> Unregistered
  Unregistered --> Registered: register ok
  Registered --> Idle: identity saved
  Idle --> Discovering: catalog/source-health
  Discovering --> Syncing: sync start
  Syncing --> AwaitingAck: chunk sent
  AwaitingAck --> Checkpointed: ACK accepted
  AwaitingAck --> Retrying: NACK/timeout/429/503
  Retrying --> AwaitingAck: retry due
  Checkpointed --> Syncing: next chunk
  Checkpointed --> Idle: no rows
  Idle --> Offline: backend unavailable
  Offline --> Retrying: spool/outbox pending
```

## Modelo de filas

```mermaid
flowchart TD
  LocalOutbox[(client_outbox SQLite/JSON)]
  ReceiverInbox[(receiver_inbox Postgres)]
  Stream[(Redis Streams sync:normalize)]
  Processing[ingest_processing]
  DLQ[(dead_letter / failed)]
  Retry[(retry_queue)]
  Metrics[(metrics/events)]

  LocalOutbox --> ReceiverInbox
  ReceiverInbox --> Stream
  ReceiverInbox --> Retry
  Stream --> Processing
  Retry --> Processing
  Processing --> Metrics
  Processing -- falha repetida --> DLQ
```

## Escalabilidade inicial

```mermaid
flowchart LR
  Agents[5 a 10 municipios]
  Ingress[Receiver Rust com limites por agente]
  Pg[(Postgres inbox duravel)]
  Redis[(Redis Streams acelerador)]
  W1[Worker 1]
  W2[Worker 2]
  Wn[Worker N]
  DB[(Banco central)]

  Agents --> Ingress --> Pg
  Ingress --> Redis
  Redis --> W1
  Redis --> W2
  Redis --> Wn
  Pg --> W1
  Pg --> W2
  Pg --> Wn
  W1 --> DB
  W2 --> DB
  Wn --> DB
```

## Recuperacao de falha

```mermaid
flowchart TD
  Fail{Falha}
  Net[Timeout/rede]
  RedisFail[Redis indisponivel]
  PgFail[Postgres indisponivel]
  Schema[Schema drift]
  Local[Manter chunk no outbox local]
  Pending[Persistir pending_queue]
  NoAck[Sem ACK; nao avancar cursor]
  Audit[Registrar erro sanitizado]
  Replay[Replay manual ou automatico]

  Fail --> Net --> Local --> Replay
  Fail --> RedisFail --> Pending --> Replay
  Fail --> PgFail --> NoAck --> Local
  Fail --> Schema --> Audit --> Replay
```

## Estrategia alvo

### Chunking

- Checkpoint por `tenant_id`, `agent_id`, `municipality_id`, `source_table`, cursor e chunk.
- Chunk por range de PK quando a tabela tem chave monotona.
- Janela temporal somente quando houver coluna temporal confiavel.
- Fallback por cursor estavel e ordenado.
- Tamanho inicial: tabelas pequenas em chunk unico; medias entre 5k e 20k linhas; grandes entre 10k e 50k linhas, respeitando limites do receiver.
- Limite operacional atual do receiver: `INGEST_MAX_RECORDS_PER_CHUNK=5000`, `INGEST_MAX_COMPRESSED_BYTES=10MB`, `INGEST_MAX_UNCOMPRESSED_BYTES=50MB`.

### Filas

Modelo recomendado:

- cliente: outbox local duravel, idealmente SQLite no instalador de campo; hoje existe JSON (`spool.json`, `ingest-outbox.json`);
- servidor: Postgres como fonte da verdade (`sync_chunks`, `sync_chunk_payloads`, `sync_pending_queue`);
- Redis Streams como acelerador de processamento;
- DLQ para chunks com falha repetida e replay manual.

Entrega sem perda de dados: **at-least-once delivery** com **exactly-once effect** por idempotencia.

### Idempotencia

- Por chunk: `chunk_id` + `chunk_hash` + unique `(tenant_id, agent_id, source_table, chunk_start_cursor, chunk_end_cursor, chunk_hash)`.
- Por linha: `source_key`, `payload_hash`, `operation`, `observed_at`.
- No destino: upsert deterministico por tenant/tabela/chave primaria ou hash quando nao houver updated_at.
- Delecoes: ainda dependem de regra por tabela; quando PEC nao expuser marcador claro, usar reconciliacao periodica.

### Observabilidade

Obrigatorio manter:

- `GET /api/health`, `GET /readyz` no backend;
- `GET /healthz`, `GET /readyz`, `GET /metrics` no receiver;
- logs estruturados com `request_id`/`correlationId`;
- metricas de chunks, bytes, latencia, fila pendente, retry e DLQ;
- status por tabela no `sync_catalog_status`.

### Seguranca

- PEC sempre read-only.
- Nao criar tabela no PEC.
- Nao logar CPF/CNS completos, nome, senha, token ou connection string.
- Autenticacao atual por bearer token com hash SHA-256 em `agent_registry.token_hash`.
- Produção deve exigir TLS; mTLS/HMAC por chunk ainda nao esta implementado.
- Spool local deve ser criptografado no instalador de campo se o host puder ser compartilhado.

## Lacunas objetivas

| Lacuna | Impacto | Proxima correcao |
|---|---|---|
| Backend mostra `onlineAgents=0` | Nao declarar agente conectado | validar URL do servico Windows e heartbeat para porta/publicacao correta |
| `scripts/11-windows/agent-service-status.ps1` falhou ao chamar `.StartTime.ToString()` em valor nulo | Script de status fragil | ajustar script para tolerar processo sem StartTime exposto |
| mTLS/HMAC ausentes | Autenticacao depende de bearer token | projetar assinatura por chunk ou mTLS em rollout de producao |
| outbox JSON | Risco em volume alto/local multiusuario | migrar para SQLite com criptografia e fsync controlado |
| opcionais descobertas sem `lastSyncedAt` | Catalogo conhece tabelas mas nao sincronizou todas | priorizar opcionais conforme indicador/CVAT que exigir |
