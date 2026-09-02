# Contrato Agent → Server

> Versão do protocolo: `1`
> Agente: `pec-agent-sync` (Rust)
> Servidor: `Apps/server/api` (Node.js)
> Sprint: ARCH-1 | Data: 2026-05-07

---

## Autenticação

Todos os endpoints (exceto `register`) exigem:

```
Authorization: Bearer <agent_token>
```

O token é gerado localmente pelo agente no primeiro uso e registrado no servidor via `register`.
**Nunca logar o token completo** — usar apenas `tokenFingerprint` (SHA256 do token) nos logs.

---

## POST /api/agents/register

Registro inicial do agente. Chamado uma vez na instalação.

**Payload:**
```json
{
  "activationCode": "string (obrigatório)",
  "agentId": "string",
  "installationId": "string",
  "tenantId": "string",
  "protocolVersion": "1",
  "appVersion": "0.1.0",
  "capabilities": ["heartbeat", "sync"],
  "municipalityIds": ["string"],
  "hostnameHash": "string (SHA256 do hostname)",
  "tokenFingerprint": "string (SHA256 do token)",
  "acceptedTerms": true
}
```

**Resposta 200:**
```json
{
  "ok": true,
  "agentId": "string",
  "installationId": "string",
  "status": "REGISTERED",
  "protocolVersion": "1"
}
```

---

## POST /api/agents/heartbeat

Heartbeat periódico. Frequência recomendada: 5 minutos.
Indica que o agente está online e operacional.

**Payload:**
```json
{
  "agentId": "string",
  "installationId": "string",
  "municipioId": "string (opcional)",
  "version": "string",
  "hostnameHash": "string",
  "status": "OK | DEGRADED | FAIL",
  "timestamp": "ISO_DATE",
  "warnings": []
}
```

**Resposta 200:**
```json
{
  "ok": true,
  "agentId": "string",
  "accepted": true,
  "serverTime": "ISO_DATE"
}
```

---

## POST /api/agents/source-health

Status detalhado do banco PEC e tabelas críticas.
Frequência recomendada: a cada sync ou 15 minutos.

**Payload:**
```json
{
  "agentId": "string",
  "municipioId": "string",
  "installationId": "string",
  "timestamp": "ISO_DATE",
  "pec": {
    "status": "OK | DEGRADED | FAIL",
    "databaseKind": "postgresql",
    "readOnly": true
  },
  "tables": [
    {
      "name": "tb_fat_atendimento_individual",
      "exists": true,
      "readable": true,
      "rowCountSafe": 123456,
      "minDate": null,
      "maxDate": "2026-04-30",
      "status": "OK | EMPTY | STALE | MISSING | ERROR"
    }
  ],
  "warnings": []
}
```

**Regras:**
- `rowCountSafe`: contagem inteira, **não** amostra nominal
- Nunca incluir CPF, CNS, nome ou dado de paciente em heartbeat/source-health
- `readOnly: true` **sempre** — agente nunca escreve no PEC

---

## POST /v1/sync/batches

Caminho canônico de envio de dados sincronizados do PEC. O agente envia gzip com
headers `x-agent-id`, `x-tenant-id` e `Authorization: Bearer`. O receiver persiste
o chunk bruto antes do ACK e a normalização roda em worker.

`POST /api/agents/batch` e legado para dev/smoke/local e nao deve ser tratado como
caminho escalavel de producao.

**Payload:**
```json
{
  "schema_version": 1,
  "sync_run_id": "uuid",
  "table_sync_id": "uuid",
  "tenant_id": "tenant",
  "agent_id": "agent",
  "municipality_id": "2916401",
  "source_table": "tb_fat_visita_domiciliar",
  "chunk_id": "uuid",
  "chunk_start_cursor": "1234",
  "chunk_end_cursor": "1734",
  "records_count": 500,
  "chunk_hash": "sha256...",
  "records": [
    {
      "source_key": "tb_fat_visita_domiciliar::1234",
      "payload_hash": "sha256...",
      "operation": "upsert",
      "payload": {
        "co_dim_unidade_saude": "123",
        "co_dim_equipe": "456",
        "co_dim_tempo": "20260430"
      }
    }
  ]
}
```

**Regras:**
- `records[].payload` pode incluir dados nominais do PEC quando o produto exigir listas nominais ou rastreabilidade; logs e endpoints operacionais continuam proibidos de expor CPF, CNS, nome, endereco, telefone, token ou senha
- `source_key` é uma chave opaca baseada em PK interna (não é CPF/CNS)
- `operation` aceita `upsert`, `snapshot` ou `delete`; remoções só existem quando o agente envia um tombstone explícito, nunca por ausência em um chunk incremental
- todo `source_key` deve ser único dentro do chunk
- `payload_hash` é SHA-256 do JSON canônico completo de `payload`, inclusive para tombstones
- `chunk_start_cursor` e `chunk_end_cursor` delimitam a janela do chunk
- `chunk_id` e `chunk_hash` garantem deduplicação/idempotência do chunk
- a autoridade de escopo do read model é `(tenant_id, municipality_id, source_table, source_key)`; uma chave de origem nunca pode sobrescrever outro tenant ou município
- o ACK HTTP confirma somente o commit do payload bruto no Postgres; `queue_status=queued` não confirma materialização
- o normalizador só confirma a mensagem Redis depois de persistir no Postgres um resultado terminal ou um retry/dead-letter recuperável pelo backlog
- os normalizadores TypeScript e Rust adquirem a mesma advisory lock PostgreSQL; o segundo processo falha antes de consumir, impedindo autoridade concorrente
- o normalizador Rust rejeita `INGEST_WORKER_MODE=active` antes de conectar quando faltarem os opt-ins `INGEST_RUST_ACTIVE_CUTOVER_APPROVED`, `INGEST_RUST_LEGACY_COMPATIBILITY_APPROVED`, `INGEST_RUST_DERIVED_ACS_PARITY_APPROVED` ou o tenant/município explícito; todos os opt-ins usam `false` como padrão
- `normalized_records` é scoped; a projeção `sus_analytics_replica.*` continua temporariamente single-scope por causa da PK legacy `source_key` e não pode ser promovida como desenho multi-tenant
- os seis objetos tipados C2 e seus manifests/flags de completude são gate obrigatório; envelopes JSON genéricos nunca provam `READY`
- a elegibilidade C2 é decidida somente por `b360-materialize diagnose-source --request <MaterializationRequest.json>`; o cutover exige exit code zero e JSON `ready=true`, sem reimplementar regras no worker de ingestão

**Resposta 200:**
```json
{
  "status": "accepted",
  "chunk_id": "uuid",
  "records_received": 500,
  "queue_status": "queued"
}
```

---

## GET /api/agents/checkpoint

Consulta o cursor atual para uma tabela/município específico.
Usado pelo agente para retomar sync após falha.

**Query params:**
- `installationId` (obrigatório)
- `municipalityId` (obrigatório)
- `table` (obrigatório)

**Resposta 200:**
```json
{
  "ok": true,
  "checkpoint": {
    "cursor": "00000000000000001234"
  }
}
```

Ou `checkpoint: null` se não houver cursor salvo.

---

## POST /api/agents/checkpoint

Confirma o avanço do cursor após um batch bem-sucedido.

**Payload:**
```json
{
  "agentId": "string",
  "installationId": "string",
  "municipalityId": "string",
  "table": "string",
  "cursor": "00000000000000001234",
  "status": "ok"
}
```

---

## GET /api/agents/status

Status operacional do servidor — não exige autenticação.
Expõe: versão, status PEC, status cache, warnings (sem PII).

---

## GET /api/agents/list

Lista agentes registrados — para painel admin.
Campos expostos: agentId, status, lastHeartbeatAt, version, warnings.
**Nunca expõe: token, hostnameHash completo, dados de paciente.**

---

## Tratamento de erros

| HTTP | Significado | Ação do agente |
|---|---|---|
| 200 | Sucesso | Avança cursor |
| 400 | Payload inválido | Não retenta — corrigir código |
| 401 | Token inválido/ausente | Verificar token, re-registrar |
| 429 | Rate limit | Backoff exponencial |
| 5xx | Erro servidor | Spool local + retry com backoff |
| Timeout | Servidor offline | Spool local + retry com backoff |

---

## Backoff exponencial do spool local

```
attempt 0 → espera  5s
attempt 1 → espera 10s
attempt 2 → espera 20s
attempt 3 → espera 40s
...
attempt 10+ → espera 3600s (1 hora)
```

---

*Contrato Agent → Server v1 | ARCH-1 | 2026-05-07*
