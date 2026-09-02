# Arquitetura Distribuída de Ingestão — SUS Analytics Sync

Atualizado em 2026-06-07.

## 1. Escopo atual

O SUS Analytics Sync e um sistema distribuido TypeScript/Rust para analytics em saude publica. O escopo atual e:

- agente municipal Rust em `Apps/agent/pec-agent-sync`;
- receiver central escalavel Rust/Axum em `Apps/ingest/dm-sync-ingest`;
- API, normalizer worker e dashboards em TypeScript/React;
- banco central proprio em PostgreSQL compartilhado;
- Redis compartilhado como acelerador de fila/cache, nunca como unica fonte de durabilidade.

O PEC/e-SUS municipal e lido pelo agente local em modo preferencialmente somente leitura. A infraestrutura central recebe, autentica, valida, persiste, normaliza e disponibiliza dados para ACS, territorio, indicadores, dashboards e relatorios.

## 2. Fora do escopo

PHP, XAMPP e QualiSUS nao fazem parte da arquitetura atual, runtime, dependencias, deploy ou fonte operacional do produto. Referencias antigas no repositorio devem ser tratadas apenas como historico de paridade, levantamento ou fonte metodologica antiga, nunca como premissa de implementacao.

Tambem esta fora do escopo criar Postgres, Redis, MariaDB ou cache local dentro deste repositorio. Banco e cache devem reutilizar infraestrutura compartilhada.

## 3. Classificação arquitetural

Classificacao atual: sistema distribuido com edge agents e hub central de analytics, em transicao para plataforma distribuida de analytics.

Nao e monolito simples. Nao e ETL centralizado puro. O desenho real combina ELT e hub-and-spoke: o agente extrai dados no municipio, envia bruto por chunk, o centro persiste raw e normaliza depois.

## 4. Fluxo canônico

```text
PEC/e-SUS municipal PostgreSQL
  -> Agente local Rust pec-agent-sync
  -> Extracao incremental read-only por cursor
  -> Chunk gzip com cursor/hash/idempotencia
  -> Receiver central Rust dm-sync-ingest stateless
  -> Auth bearer + validacao agent/tenant/municipio/tabela/tamanho/hash
  -> Persistencia duravel em sus_analytics_ingest
  -> Redis Stream sync:normalize ou backlog Postgres
  -> Normalizer workers TypeScript
  -> Banco central sus_analytics_replica/sus_analytics_reference/snapshots
  -> API analytics TypeScript/tRPC/REST
  -> Frontend React dashboards/indicadores/relatorios
```

`/api/agents/batch` e caminho legado/local. Producao deve usar `POST /v1/sync/batches`.

## 5. Componentes

- Edge agent local: `Apps/agent/pec-agent-sync`.
- Bootstrap agent: `Apps/agent/pec-bootstrap-agent`.
- Receiver central: `Apps/ingest/dm-sync-ingest`.
- Worker normalizador: `Apps/server/api/src/agents/ingest-normalizer-worker.ts`.
- API central: `Apps/server/api/src/server/start-server.ts`, routers em `Apps/server/api/src/routers`.
- Persistencia de agente: `Apps/server/api/src/agents/*`.
- Persistencia raw/snapshots: `Apps/server/api/src/agents/acs-ingestion.ts` e `Apps/server/api/src/acs/migrations.ts`.
- Web: `Apps/web/client`.
- Deploy: `docker/01-compose/compose.production.yml`.

## 6. Contratos dos agentes

Registro inicial usa activation code/bootstrap conforme `POST /api/agents/register`. Depois disso, endpoints de agente exigem bearer token. O token bruto so pode ser retornado no registro/rotacao inicial e deve ser salvo localmente pelo agente; no servidor, o contrato atual grava hash/fingerprint.

O contrato canônico de dados usa chunk gzip em `/v1/sync/batches` com `x-agent-id`, `x-tenant-id`, `Content-Encoding: gzip`, `chunk_id`, cursores, `chunk_hash`, tabela fonte e registros raw.

## 7. Segurança/autenticação

Auth de agente:

- token bearer nunca deve ser logado;
- servidor compara SHA-256(token) com `agent_registry.token_hash`;
- `AGENT_AUTH_DEV_MODE` falha no startup em production/staging/homolog;
- receiver valida agent/tenant/municipio quando o registro central possui esses vinculos;
- endpoints operacionais `/api/agents/status`, `/api/agents/list` e `/api/agents/summary` exigem sessao com `agent.admin.manage`.

## 8. Tenant/município isolation

O isolamento atual e parcial. O receiver central valida:

- header agent igual ao payload;
- header tenant igual ao payload;
- token do agente;
- tenant/municipio autorizados quando presentes em `agent_registrations`/`agent_registry`.

Risco conhecido: as tabelas raw `sus_analytics_replica.<tabela>` ainda usam `payload JSONB` sem coluna fisica obrigatoria de tenant/municipio em todas as linhas. Para escala multi-municipio, evoluir para colunas/particoes tenant-aware.

## 9. Ingestão, chunks e checkpoint

O agente usa cursor/checkpoint por tabela e outbox local. O receiver persiste `sync_chunks` e `sync_chunk_payloads` antes de responder ACK. Duplicidade e tratada por `chunk_id` e unique key por tenant/agente/tabela/cursor/hash.

O ACK `accepted`/`accepted_duplicate` significa persistencia duravel do chunk. A normalizacao e assíncrona e idempotente.

## 10. Worker de normalização

`ingest-normalizer-worker.ts` consome Redis Stream e tambem varre backlog no Postgres com controle de retries. Se Redis falhar, `sync_pending_queue` permanece como fonte de recuperacao.

Normalizacao pesada nao deve ocorrer na request HTTP de producao. O caminho legado `/api/agents/batch -> recordBatch() -> ingestAcsBatch()` fica restrito por `AGENT_LEGACY_BATCH_ENABLED`, default `false`, e nunca deve operar em production/staging/homolog.

## 11. Banco central

Schemas centrais encontrados:

- `sus_analytics_ingest`: runs, table state, chunks, payloads, erros e pending queue;
- `sus_analytics_replica`: raw tables sincronizadas por catalogo;
- `sus_analytics_reference`: tabelas globais de referencia;
- `sus_analytics`: snapshots e tabelas analiticas.

PostgreSQL e obrigatorio para persistencia real. Redis e cache/fila auxiliar. Persistencia nunca deve ficar dentro do repositorio.

## 12. Observabilidade

Encontrado:

- `/api/health`;
- `/readyz`;
- `/metrics` no receiver Rust;
- heartbeat de agentes;
- source-health;
- status operacional de agentes protegido por RBAC;
- logs estruturados com request id;
- metricas de chunks, bytes, latencia e pending queue no receiver.

Pendente para escala: painel operacional completo por municipio/tabela, alertas de lag, alerta de agente sem heartbeat e DLQ/retry exhausted visivel.

## 13. Escala horizontal e Kubernetes futuro

Requisitos para Kubernetes futuro, sem criar manifests prematuros:

- receivers stateless atras de load balancer/ingress;
- readiness/liveness por container;
- graceful shutdown;
- HPA por CPU/RPS/backlog;
- workers escalaveis por lag de Redis/backlog Postgres;
- config por env/secrets;
- zero storage local obrigatorio nos receivers;
- logs estruturados;
- metricas Prometheus/OpenTelemetry conforme padrao do projeto.

## 14. LGPD/PII

O projeto possui dados nominais em fluxos de analytics e ACS. Portanto, e incorreto documentar o sync completo como "sem PII". A regra correta e:

- heartbeat/source-health/status operacional nao carregam PII;
- logs nao podem conter CPF, CNS, nome, telefone, endereco, senha, token ou connection string;
- payload raw pode conter dados nominais quando o produto exigir listas nominais;
- acesso nominal exige RBAC, auditoria, minimizacao, mascaramento em UI/export, retencao e politica LGPD documentada.

Risco conhecido: raw JSONB e snapshots nominais ainda exigem politica forte de criptografia/RLS/retencao por tenant.

## 15. Riscos conhecidos

- isolamento fisico tenant-aware ainda parcial em raw replica;
- particionamento de tabelas raw/chunks ainda nao comprovado para dezenas de municipios;
- caminho legado de batch ainda existe para dev/smoke/local;
- documentacao historica ainda contem referencias PHP/XAMPP/QualiSUS como contexto antigo;
- testes de carga multi-municipio e falha parcial ainda precisam virar gate recorrente.

## 16. Checklist de operação

- `NODE_ENV=production`;
- `AGENT_AUTH_DEV_MODE=false`;
- `AGENT_LEGACY_BATCH_ENABLED` ausente ou `false` em producao;
- `AGENT_MEMORY_FALLBACK_ENABLED=false` em ambiente central;
- `SUS_ANALYTICS_DATABASE_URL`/`INGEST_DATABASE_URL` apontando para Postgres compartilhado;
- Redis compartilhado configurado;
- receiver `/readyz` ok;
- worker com heartbeat recente;
- `/api/agents/status` acessivel apenas a admin;
- secret scanning sem segredos reais;
- smoke de chunk gzip e idempotencia;
- smoke de normalizer processando backlog.
- registro/rotacao de token conforme `docs/21-runbooks/agent-token-rotation.md`.

## 17. Evidências source/runtime

Source:

- `Apps/agent/pec-agent-sync/src/sync.rs`: extracao incremental e payloads de tabelas PEC.
- `Apps/agent/pec-agent-sync/src/ingest_outbox.rs`: chunks gzip, outbox e ACK duravel.
- `Apps/ingest/dm-sync-ingest/src/main.rs`: receiver Rust, auth, validacao, persistencia, metricas.
- `Apps/server/api/src/agents/ingest-normalizer-worker.ts`: normalizacao distribuida.
- `Apps/server/api/src/agents/acs-ingestion.ts`: persistencia raw e snapshots.
- `Apps/server/api/src/agents/router.ts`: endpoints legados/admin protegidos.
- `Apps/server/api/src/server/start-server.ts`: `/api/health`, `/readyz`, RBAC e rotas centrais.

Runtime:

- runtime Node publicado em `Apps/server/api/dist/index.js`;
- worker publicado em `Apps/server/api/dist/ingest-normalizer-worker.js`;
- frontend estatico em `Apps/server/api/dist/public`.

External-compose:

- `docker/01-compose/compose.production.yml` executa API Node, `dm-sync-ingest` e `dm-sync-normalizer`;
- Postgres/Redis sao externos/compartilhados, ligados por variaveis de ambiente.
