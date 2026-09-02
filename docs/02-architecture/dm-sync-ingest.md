# dm-sync-ingest

`dm-sync-ingest` é o receptor central em Rust para chunks de sincronização enviados por agentes locais. Ele não usa Janus e não processa indicadores no caminho quente.

Contrato operacional:

1. Receber `POST /v1/sync/batches` com `Content-Encoding: gzip`.
2. Validar autenticação do agente, tenant, schema, catálogo de tabela, limites e `chunk_hash`.
3. Persistir `sync_chunks` e `sync_chunk_payloads` no schema `sus_analytics_ingest`.
4. Confirmar ACK somente após commit no Postgres.
5. Publicar `chunk_id` em Redis Streams `sync:normalize` depois do commit.
6. Se Redis falhar, manter o chunk salvo e registrar `pending_queue`.

ACK do endpoint significa persistência durável do chunk, não conclusão da normalização. O Redis acelera a entrega, mas o Postgres continua sendo a fonte de verdade.

O `chunk_hash` usa JSON canônico com chaves ordenadas lexicograficamente, excluindo o objeto bruto `record.payload`. O hash cobre metadados do chunk e, para cada registro, apenas `source_key`, `payload_hash`, `operation` e `observed_at`.

## Worker normalizador Rust

O mesmo binário oferece o comando `dm-sync-ingest worker`, com três modos:

- `disabled`: padrão seguro do binário; não abre Postgres/Redis nem processa chunks.
- `shadow`: valida checksum, gzip, JSON, hashes e operações dos chunks persistidos, sem aplicar migrações, claim, escrita de read model ou `XACK`.
- `active`: claim com lease cercado no Postgres, normalização set-based, tombstones e conclusão atômica do estado. Falha antes de conectar ou migrar se `INGEST_RUST_ACTIVE_CUTOVER_APPROVED=true` não estiver definido junto de `INGEST_WORKER_MODE=active`.

Na topologia Compose atual, `dm-sync-normalizer` é o worker Rust canônico e ativo:

- usa a imagem `dm-sync-ingest`;
- executa `dm-sync-ingest worker`;
- depende do receiver Rust `dm-sync-ingest` saudável;
- usa `INGEST_WORKER_MODE=active`;
- mantém `stop_grace_period: 30s` para rollback transacional no shutdown.

O serviço `dm-sync-normalizer-rust-shadow` permanece opt-in no profile
`rust-normalizer-shadow` e valida payloads persistidos sem reivindicar,
materializar ou confirmar chunks. Ele compara o mesmo binário Rust em modo
shadow; não substitui um worker TypeScript.

No modo `active`, o worker:

1. varre o backlog durável com `FOR UPDATE SKIP LOCKED` e grava `lease_owner`, `lease_token` e `lease_expires_at`;
2. recupera consumidores Redis órfãos com `XAUTOCLAIM`;
3. revalida checksum do gzip, `chunk_hash`, `payload_hash`, contagem e operação;
4. aplica upserts/snapshots e deletes explícitos no escopo `tenant + município + tabela + source_key`;
5. persiste read model scoped, projeção raw/reference legacy, tombstone, cursor, estado do chunk e retry na mesma transação;
6. executa `XACK` somente depois de um resultado durável no Postgres (`processed`, retry/dead-letter persistido ou já processado).

Queda ou `SIGTERM` antes do commit faz rollback pelo `sqlx::Transaction`. Um lease expirado volta a ser elegível; chunks antigos deixados em `processing` sem lease pelo worker legado só são recuperados após `INGEST_WORKER_LEGACY_RECOVERY_SECONDS`.

Estados principais:

- `persisted`/`pending_queue`: payload salvo; Redis ausente ou pendente de consumo.
- `queued`: payload salvo e evento publicado no Redis.
- `processing`: worker reivindicou o chunk com lease cercado.
- `processed`: read model e checkpoint foram confirmados na mesma transação.
- `failed`: falha duravelmente agendada em `sync_pending_queue` com backoff.
- `dead_letter`: limite de tentativas alcançado; requer diagnóstico/replay controlado.

O worker não consulta PEC. Ele processa apenas payloads aceitos pelo receptor. `normalized_records` preserva payload normalizado e lineage (`sync_run_id`, `table_sync_id`, `chunk_id`, hash do snapshot e instante de recebimento); `sync_tombstones` registra deletes explícitos. O instante durável do chunk e o `chunk_id` cercam eventos fora de ordem, impedindo que upsert/delete antigo substitua estado mais novo.

O worker Rust projeta atomicamente a superfície raw/reference legacy a partir da
linha que acabou de vencer o fencing em `normalized_records`. A réplica legacy
continua estritamente single-scope porque sua PK é apenas `source_key`; active
exige tenant e município e o preflight bloqueia histórico multi-scope. Essa
superfície é compatibilidade temporária, não o contrato multi-tenant final.

O worker Rust ativo mantém o pipeline genérico e a superfície de compatibilidade,
mas isso não prova que um read model de indicador está materializado. O read
model genérico Rust não autoriza cálculo nem marca C1/C2 como pronto. Na
inspeção operacional read-only de 2026-07-24, os objetos tipados
`c1_source_manifest`, `c1_attendances`, `c2_source_manifest`, `c2_children`,
`c2_consultations`, `c2_anthropometry`, `c2_home_visits` e `c2_vaccinations`
tinham zero linhas, e não havia auditoria de cutover. Portanto, a autoridade
operacional do normalizador não pode ser apresentada como evidência de produção
C1/C2.

Para C2, a validação de fonte exige os seis objetos
tipados `sus_analytics_b360.c2_source_manifest`, `c2_children`,
`c2_consultations`, `c2_anthropometry`, `c2_home_visits` e `c2_vaccinations`.
O status `READY` vem exclusivamente de `b360-materialize diagnose-source`, que
valida o `MaterializationRequest`, manifests, lineage, completude, freshness e
escopo INE/CNES; o pipeline de ingestão não replica essas regras.

## Estado operacional e rollback

O cutover de processo já está refletido na topologia atual:
`dm-sync-normalizer` é Rust. `scripts/11-windows/ingest-rust-cutover.ps1` preserva o nome
histórico, mas agora só oferece:

- `Status`: inspeciona o contrato Compose, confirma que o container canônico é
  Rust ativo e reporta apenas campos operacionais allowlisted;
- `Preflight`: executa as mesmas validações read-only e falha se source,
  container ou modo divergirem.

As ações históricas `Cutover` e `Rollback` falham de forma explícita e não
executam `stop`, `up` ou troca de serviço. Não existe fallback TypeScript
suportado. Um rollback operacional deve redeployar uma imagem/commit Rust
anterior previamente revisado. Chunks, payloads, checkpoints, stream e
migrations aditivas devem ser preservados.

O script de cutover não chama `dm-sync-ingest worker-status`. Esse comando agora
é um diagnóstico operacional bounded separado: exige tenant e município exatos,
consulta no máximo `max_rows + 1` linhas por amostra, aplica
`statement_timeout`, `lock_timeout` e timeout geral, identifica a conexão com um
UUID técnico em `application_name` e, no timeout ou shutdown, executa
`pg_cancel_backend` somente para esse identificador exato antes de fechar e
verificar o pool. Se a sessão própria persistir após a graça bounded, escala
para `pg_terminate_backend` somente para o mesmo UUID e exige zero sessões no
poll final. Contagens truncadas são limites inferiores explícitos, não totais.

O `worker-status` não executa `COUNT(*)` integral em `normalized_records` nem os
anti-joins de paridade por tabela. Por isso ele também não prova readiness
clínica, paridade, completude de source ou elegibilidade para cutover. O comando
separado `worker-cutover-preflight` mantém os checks históricos mais fortes sob
os mesmos limites de tempo/cancelamento, mas continua impróprio para
healthcheck. O contrato operacional completo está em
[`docs/runbook.md`](../runbook.md#status-operacional-bounded-do-normalizador-rust).

## Agente local

`pec-agent-sync` suporta:

- `AGENT_SYNC_TRANSPORT=legacy`: envio antigo para `/api/agents/batch`.
- `AGENT_SYNC_TRANSPORT=auto`: usa ingest somente quando `AGENT_INGEST_URL` está definido.
- `AGENT_SYNC_TRANSPORT=ingest`: exige `POST gzip` para `/v1/sync/batches`.

No transporte `ingest`, o agente:

1. mapeia linhas PEC para o contrato legado de linha;
2. monta records com `payload_hash`;
3. calcula `chunk_hash` canônico;
4. grava `agent-state/ingest-outbox.json`;
5. envia gzip;
6. avança `checkpoints.json` e confirma `/api/agents/checkpoint` somente após `accepted` ou `accepted_duplicate`.
