# Reseed autoritativo das referências PEC

## Finalidade e limites

Este procedimento cria um novo full snapshot autoritativo, no receiver Rust,
para exatamente estas tabelas PEC não nominais:

- `tb_dim_cbo`;
- `tb_dim_tipo_atendimento`;
- `tb_dim_tempo`;
- `tb_equipe`;
- `tb_tipo_equipe`.

Ele existe para a migração `legacy -> ingest` em que os checkpoints
incrementais foram corretamente preservados, mas o novo destino não recebeu o
snapshot inicial. Não use `AGENT_SYNC_BACKFILL_FROM_CURSOR=0`, não apague
`checkpoints.json`, não copie tabelas derivadas do TypeScript e não altere o
PEC.

O comando:

- usa a identidade/configuração já instaladas;
- exige transporte `ingest`, tenant exato, município `*`, allowlist completa,
  change request e fingerprint do destino;
- lê o PEC em transação `REPEATABLE READ READ ONLY`;
- mantém ledger/chunks próprios em
  `${AGENT_STATE_DIR}/reference-reseed/<plan-key>/`, sem disputar
  `ingest-outbox.json` com o daemon;
- nunca lê nem grava o checkpoint incremental;
- envia `operation=snapshot`, índices contíguos, cadeia de hashes, marcador
  full-sync e exatamente um terminal, inclusive para tabela vazia;
- retorna código diferente de zero se contagem, cadeia ou terminal divergirem.

Um ACK do receiver prova persistência idempotente, não processamento. O replay
só pode avançar depois do gate central `status='processed'` de todos os chunks.

## Pré-requisitos

1. Change request operacional aprovado e versionado.
2. Binário construído a partir do commit aprovado.
3. `identity.json` instalado e tenant/wildcard conferidos.
4. Endpoint ingest exato configurado localmente; nunca copie a URL para o PR ou
   log público.
5. Receiver, PostgreSQL e Redis centrais prontos.
6. Janela de manutenção para parar o serviço `PecAgentSync` sem apagar estado.
7. Backup recuperável do diretório `AGENT_STATE_DIR` antes da mudança.

O `reference-reseed-plan` é estritamente sem efeito: não cria identidade,
diretório, ledger ou lock; não conecta ao PEC e não faz request HTTP.

## Superfície operacional aprovada no Windows

Use `scripts/11-windows/agent-reference-reseed.ps1` para executar o binário aprovado
contra a configuração e a identidade já instaladas. O wrapper não copia nem
substitui arquivos em `Program Files`, não altera o serviço e não escreve no
`.env`. Ele resolve `Application` e `AppDirectory` pelo NSSM, isola variáveis
`AGENT_*`/`PEC_*` herdadas do shell e aponta o processo filho explicitamente
para o `config/.env` instalado.

Primeiro construa o binário aprovado e gere um inventário somente leitura:

```powershell
cargo build --release --manifest-path Apps/agent/Cargo.toml
$approvedBinary = (Resolve-Path "Apps/agent/target/release/pec-agent-sync.exe").Path
$inspect = powershell -ExecutionPolicy Bypass -File scripts/11-windows/agent-reference-reseed.ps1 `
  -Action Inspect `
  -ApprovedBinaryPath $approvedBinary | ConvertFrom-Json
```

`INSPECT_READY` retorna somente paths e metadados sanitizados: hashes SHA-256
do candidato aprovado, binário atual do serviço, configuração e identidade;
tenant/wildcard; fingerprint do endpoint sem revelar a URL; e estado do
serviço/processo. Registre esses hashes no change request. Não registre o
conteúdo de `.env` ou `identity.json`.

Para o plano, reutilize exatamente os quatro hashes inspecionados:

```powershell
$plan = powershell -ExecutionPolicy Bypass -File scripts/11-windows/agent-reference-reseed.ps1 `
  -Action Plan `
  -ApprovedBinaryPath $approvedBinary `
  -ExpectedBinarySha256 $inspect.context.approvedBinary.sha256 `
  -ExpectedServiceBinarySha256 $inspect.context.installedServiceBinary.sha256 `
  -ExpectedConfigSha256 $inspect.context.config.sha256 `
  -ExpectedIdentitySha256 $inspect.context.identity.sha256 `
  -TenantId $inspect.context.identity.tenantId `
  -ChangeRequest <change-request-aprovado> | ConvertFrom-Json
```

O wrapper aceita o plano somente se o JSON tiver o schema esperado, as cinco
tabelas exatas, hashes/tenant/change request iguais, e os efeitos
`PEC=NO_WRITE`, `network=NO_REQUEST`, `localState=NO_WRITE`,
`checkpoint=UNCHANGED` e `daemonOutbox=UNCHANGED`. A saída bruta é suprimida em
falha para impedir divulgação acidental de endpoint ou token. O wrapper também
compara antes/depois identidade, checkpoints, outbox, ledger de reseed e estado
do serviço; qualquer mutação concorrente torna o plano inválido e exige nova
inspeção.

## Plano sanitizado

Somente em desenvolvimento isolado, defina um `.env` não instalado e não
versionado. Não edite o `config/.env` de `Program Files` para operar o wrapper:

```env
AGENT_SYNC_TRANSPORT=ingest
AGENT_INGEST_URL=<endpoint-ingest-exato>
AGENT_REFERENCE_RESEED_CHANGE_REQUEST=<change-request-aprovado>
AGENT_REFERENCE_RESEED_TENANT_ID=<tenant-da-identidade>
AGENT_REFERENCE_RESEED_MUNICIPALITY_ID=*
AGENT_REFERENCE_RESEED_TABLES=tb_dim_cbo,tb_dim_tipo_atendimento,tb_dim_tempo,tb_equipe,tb_tipo_equipe
AGENT_REFERENCE_RESEED_BATCH_SIZE=500
```

Execução direta do produtor (sem o wrapper) é útil apenas para desenvolvimento:

```powershell
pec-agent-sync.exe reference-reseed-plan
```

Saída obrigatória:

- `status=PLAN_READY`;
- as cinco tabelas, tenant e wildcard esperados;
- `effects.pec=NO_WRITE`, `network=NO_REQUEST`,
  `localState=NO_WRITE`, `checkpoint=UNCHANGED`;
- `destinationFingerprintSha256`, sem endpoint ou token.

Se o plano imprimir endpoint, token, connection string ou tabela fora da
allowlist, interrompa a mudança.

## Parada segura e execução

Confira o serviço, pare-o pelo mecanismo instalado e confirme que o processo
encerrou. No pacote atual:

```powershell
pnpm run agent:service:status
pnpm run agent:service:stop
pnpm run agent:service:status
```

Não mate o processo durante uma escrita de estado. Se a parada normal falhar,
registre o erro e não confirme a atestação. O reseed usa ledger separado, mas a
parada elimina concorrência de leitura/carga e torna a janela auditável.

O wrapper não para o serviço. Depois de uma parada externa normal e da
confirmação de `Stopped`, execute com o fingerprint retornado pelo plano e as
duas confirmações literais:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/11-windows/agent-reference-reseed.ps1 `
  -Action Execute `
  -ApprovedBinaryPath $approvedBinary `
  -ExpectedBinarySha256 $inspect.context.approvedBinary.sha256 `
  -ExpectedServiceBinarySha256 $inspect.context.installedServiceBinary.sha256 `
  -ExpectedConfigSha256 $inspect.context.config.sha256 `
  -ExpectedIdentitySha256 $inspect.context.identity.sha256 `
  -TenantId $inspect.context.identity.tenantId `
  -ChangeRequest <change-request-aprovado> `
  -DestinationFingerprintSha256 $plan.plan.destinationFingerprintSha256 `
  -Approval RUST_REFERENCE_RESEED_APPROVED `
  -DaemonStoppedAttestation PEC_AGENT_SYNC_SERVICE_STOPPED
```

Antes e depois do processo, o wrapper exige serviço `Stopped`, `ProcessId=0` e
nenhum processo `pec-agent-sync.exe`. Também recalcula e compara os hashes do
binário aprovado, binário instalado, configuração, identidade,
`checkpoints.json` e `ingest-outbox.json`. A única escrita local autorizada pelo
execute é o ledger isolado `reference-reseed` do produtor. Qualquer drift falha
fechado; o wrapper nunca reinicia o serviço automaticamente.

Resultado local mínimo:

- `status=ACCEPTED_ALL` ou, em repetição, `IDEMPOTENT_ALREADY_DELIVERED`;
- um único `syncRunId` novo, iniciado por `reference-reseed-`;
- `sourceCount=stagedRecords` por tabela;
- ao menos um chunk por tabela e cursor terminal não vazio;
- `checkpoint=UNCHANGED` e `daemonOutbox=UNCHANGED`;
- `receiverProcessing=UNVERIFIED_REQUIRES_CENTRAL_PROCESSED_GATE`.

`ACCEPTED_ALL` não autoriza replay execute.

## Gate central obrigatório

No PostgreSQL compartilhado, usando o `syncRunId` exato retornado e acesso
administrativo auditado, valide sem imprimir payload:

```sql
SELECT
  source_table,
  COUNT(*) AS chunks,
  COUNT(*) FILTER (WHERE status <> 'processed') AS not_processed,
  SUM(records_count) AS records,
  MIN(chunk_index) AS first_index,
  MAX(chunk_index) AS last_index,
  COUNT(DISTINCT chunk_index) AS distinct_indexes
FROM sus_analytics_ingest.sync_chunks
WHERE sync_run_id = :sync_run_id
GROUP BY source_table
ORDER BY source_table;

SELECT
  source_table,
  status,
  full_sync_started_at,
  full_sync_completed_at,
  total_records_received,
  total_records_inserted,
  last_received_cursor,
  last_processed_cursor
FROM sus_analytics_ingest.sync_table_state
WHERE sync_run_id = :sync_run_id
ORDER BY source_table;
```

Critérios `PASS`, todos simultâneos:

1. exatamente cinco tabelas;
2. `not_processed=0` em cada uma;
3. `first_index=1`, `last_index=distinct_indexes=chunks`;
4. soma `records` igual à contagem PEC registrada na saída local;
5. state de cada tabela `completed`, com início e fim de full sync não nulos;
6. cursor recebido/processado terminal compatível;
7. nenhum chunk do run em retry, DLQ ou processing vencido.

Qualquer divergência é `FAIL`; ausência do banco/receiver é `SKIP`, nunca
sucesso. Não misture chunks históricos ou de outro `sync_run_id` para completar
a prova.

Depois execute o replay histórico somente em `--dry-run`, com tenant,
município real, seleção completa e `--allow-wildcard-resolution`. O atestado
deve reportar todos os snapshots exigidos como completos. Só um change request
separado pode autorizar `--execute`.

## Interrupção e retomada

- `SIGINT`/`SIGTERM` durante preparação: a transação PEC read-only é encerrada;
  a próxima execução inicia um novo attempt/run. O attempt incompleto nunca é
  enviado nem mesclado ao novo.
- Interrupção durante envio: a próxima execução reutiliza o mesmo run e chunks.
  O receiver responde `accepted_duplicate` quando já persistiu o chunk, sem
  novo efeito semântico.
- Falha HTTP: o chunk permanece no ledger para retry; o erro não inclui URL ou
  token.
- Lock existente: verifique processo e serviço. Remova apenas
  `${AGENT_STATE_DIR}/reference-reseed.lock`, e somente se nenhum processo de
  reseed estiver ativo. Não remova a pasta de ledger.
- Mismatch de contagem/cadeia/terminal: retorno não zero. Preserve o ledger e
  investigue o schema/fonte; não force o replay.

## Reinício, retenção e rollback

Após o gate central e o dry-run:

```powershell
pnpm run agent:service:start
pnpm run agent:service:status
```

Confirme heartbeat/source-health e uma execução incremental sem reenvio do
snapshot. Preserve o ledger pelo período de auditoria acordado. Limpeza só pode
ocorrer por change request específico, com path exato e backup; nunca use
remoção recursiva ampla.

Rollback de código: reverta o commit do produtor e restaure o binário anterior.
Mantenha chunks aceitos, checkpoints e streams. Um snapshot inválido deve ser
excluído da seleção pelo `sync_run_id` e substituído por novo reseed aprovado;
não reescreva o histórico compartilhado.
