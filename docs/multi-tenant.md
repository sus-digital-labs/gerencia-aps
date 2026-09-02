# Multi-tenant SaaS — Hierarquia e Modelo de Dados

**Author**: Eduardo Muniz
**Company**: DM Technology
**Status**: proposto / em implementação (REAL_CLIENT_LOCAL_PILOT_1)

---

## 1. Hierarquia de tenants

```
DM Technology (master)                   tenantId = "dm-technology-master"
  └── Parceiro A (partner)               tenantId = "partner-<uuid>"
        └── Município X (municipality)   tenantId = "municipality-<ibge>"
              └── Instalação PEC         installationId = "<uuid>"
                    └── Agente           agentId = "agent-<uuid>"
```

### Níveis

| Nível | Role | Descrição | Exemplo |
|-------|------|-----------|---------|
| Master | `master` | DM Technology — administra tudo | Único, imutável |
| Partner | `partner` | Secretaria estadual, distribuidor, integradora | SESA-ES, Parceiro Gov |
| Municipality | `municipality` | Prefeitura / Secretaria Municipal de Saúde | 320130 (Cachoeiro) |
| Installation | — | Uma instalação do e-SUS PEC (1 servidor) | UUID gerado no primeiro `--start` |
| Agent | — | Processo sync rodando naquela instalação | UUID gerado automaticamente |

### Regras
- Um Parceiro pode gerenciar N Municípios.
- Um Município pertence a exatamente 1 Parceiro (ou diretamente ao Master).
- Uma Instalação pertence a 1 Município (mas pode cobrir múltiplos IBGEs via `municipalityIds`).
- Um Agente pertence a 1 Instalação.
- Dados nunca cruzam tenants: filtro obrigatório por `tenantId` em toda query analítica.

---

## 2. Campos de identidade do agente

| Campo | Tipo | Onde fica | Propósito |
|-------|------|-----------|-----------|
| `agentId` | UUID | `local-state/agent-identity.json` | Identificador único do processo agente |
| `installationId` | string | `local-state/agent-identity.json` | Identifica o servidor PEC |
| `tenantId` | string | env `SYNC_AGENT_TENANT_ID` | Liga o agente ao município/organização |
| `municipalityIds` | string[] | env `SYNC_AGENT_MUNICIPALITY_IDS` | IBGEs cobertos (ex: `320130,320520`) |
| `hostnameHash` | SHA-256 | calculado automaticamente | Rastreabilidade sem expor hostname |
| `tokenFingerprint` | SHA-256 | calculado automaticamente | Autentica heartbeats sem expor token |

---

## 3. Variáveis de ambiente do agente (Windows)

```env
# ─── Identidade ───────────────────────────────────
SYNC_AGENT_INSTALLATION_ID=pec-hospital-central      # único por servidor PEC
SYNC_AGENT_TENANT_ID=municipality-320130             # IBGE ou UUID do município
SYNC_AGENT_MUNICIPALITY_IDS=320130                   # um ou mais IBGEs separados por vírgula
SYNC_AGENT_APP_VERSION=0.1.0

# ─── Servidor central ─────────────────────────────
AGENT_SERVER_URL=https://esus-sync.dmtechnology.com.br

# ─── Banco de dados PEC (leitura) ─────────────────
PEC_DB_HOST=127.0.0.1
PEC_DB_PORT=5432
PEC_DB_NAME=esus
PEC_DB_USER=esus_leitura
PEC_DB_PASSWORD=<senha-read-only>

# ─── Banco da réplica analítica (opcional local) ──
SUS_ANALYTICS_DATABASE_URL=postgresql://...

# ─── Comportamento do sync ────────────────────────
SYNC_AGENT_INTERVAL_SECONDS=300       # 5 minutos
SYNC_AGENT_BATCH_SIZE=500             # linhas por batch
SYNC_AGENT_STATE_DIR=local-state      # onde salvar checkpoints e identidade
```

---

## 4. Fluxo de comunicação agente-servidor

```
[Agente]                        [Servidor Central]

  1. POST /api/agents/register ──►  valida, cria/atualiza registro in-memory + DB
     ◄── { agentId, heartbeatIntervalSeconds }

  2. POST /api/agents/heartbeat ──►  token Bearer obrigatório
     { agentId, status, freshness }   valida fingerprint, atualiza lastSeenAt
     ◄── { status: "accepted", nextHeartbeatSeconds }

  3. GET /api/agents/checkpoint ──►  busca cursor da última sincronização
     ?agentId=…&table=…&municipalityId=…
     ◄── { cursor, status, lastSuccessAt }

  4. POST /api/agents/batch ──────►  envia linhas incrementais
     { batchId, table, rows, cursorAfter }
     ◄── { status, accepted, nextCursor }

  5. POST /api/agents/checkpoint ──►  persiste cursor avançado
     { table, cursor, status }
     ◄── { saved: true }
```

---

## 5. Modelo de dados no servidor central

```sql
-- Registro dos agentes (persistent, sobrevive restart)
CREATE TABLE sus_analytics.agent_registrations (
  agent_id          TEXT PRIMARY KEY,
  installation_id   TEXT NOT NULL,
  tenant_id         TEXT NOT NULL,
  partner_tenant_id TEXT,
  municipality_ids  JSONB NOT NULL DEFAULT '[]',
  capabilities      JSONB NOT NULL DEFAULT '[]',
  app_version       TEXT,
  protocol_version  TEXT NOT NULL DEFAULT '1',
  token_fingerprint TEXT NOT NULL,
  hostname_hash     TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  revocation_status TEXT NOT NULL DEFAULT 'active',
  freshness         JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ
);

-- Checkpoints por tabela/instalação/município
CREATE TABLE sus_analytics.agent_checkpoints (
  id                SERIAL PRIMARY KEY,
  agent_id          TEXT NOT NULL,
  installation_id   TEXT NOT NULL,
  tenant_id         TEXT NOT NULL,
  municipality_id   TEXT NOT NULL,
  table_name        TEXT NOT NULL,
  cursor            TEXT,
  last_batch_id     TEXT,
  last_success_at   TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'pending',
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (installation_id, municipality_id, table_name)
);

-- Hierarquia de tenants
CREATE TABLE sus_analytics.tenants (
  tenant_id         TEXT PRIMARY KEY,
  role              TEXT NOT NULL, -- 'master' | 'partner' | 'municipality'
  name              TEXT NOT NULL,
  parent_tenant_id  TEXT REFERENCES sus_analytics.tenants(tenant_id),
  ibge_code         TEXT,          -- para municípios
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Segurança e anti-PII

- Agente **nunca** envia credenciais do banco PEC ao servidor.
- Heartbeat/source-health do agente nunca enviam CPF, CNS ou nome completo. Payloads raw de sync podem carregar dados nominais do PEC quando exigidos por listas nominais/rastreabilidade; esses fluxos exigem RBAC, auditoria, mascaramento, retencao e log sanitization.
- Batches contêm apenas dados agregados ou chaves técnicas anonimizadas.
- `hostnameHash` = SHA-256 do hostname, nunca o hostname em si.
- Todos os logs passam pelo redactor centralizado (`src/security/redaction.ts`).
- Tokens Bearer trafegam apenas via HTTPS; nunca logados.

---

## 7. Rollback e idempotência

- `batchId` é UUID único por tentativa; servidor rejeita duplicatas silenciosamente.
- Checkpoints são salvos **após** confirmação do servidor.
- Em caso de falha: agente re-envia a partir do último cursor confirmado.
- Servidor usa `ON CONFLICT DO UPDATE` para garantir idempotência no upsert.

---

## Próximas ações

1. Provisionar tabelas `sus_analytics.agent_registrations`, `agent_checkpoints`, `tenants` no banco de produção.
2. Migrar `agentRegistry` in-memory → persistência em `agent_registrations`.
3. Implementar endpoint `POST /api/agents/batch` com validação de tenant.
4. Adicionar filtro multi-tenant em todas as queries analíticas.
