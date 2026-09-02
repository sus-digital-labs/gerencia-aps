# Arquitetura Multi-App — sus-analytics-sync

> Sprint: ARCH-1 | Data: 2026-05-07 | Versão: 4.0.0

---

## Diagrama do fluxo

```
[Município — servidor local do e-SUS PEC]
          PostgreSQL e-SUS PEC
                  │
                  │ read-only (credencial pg_reader)
                  ▼
       Apps/agent/pec-agent-sync  (Rust)
                  │
                  │ HTTPS outbound-only
                  │ Bearer token do agente
                  │ POST /api/agents/heartbeat
                  │ POST /api/agents/source-health
                  │ POST /api/agents/batch
                  │ POST /api/agents/checkpoint
                  ▼
       Apps/server/api  (Node.js / TypeScript)
       API / backend central
                  │
          ┌───────┴────────┐
          ▼                ▼
    PostgreSQL        Redis
    sus_analytics     cache/status
    (Analytics DB)
          │
          │ tRPC / REST
          ▼
Apps/web  (React / TypeScript)
UI Web — acesso pelo gestor municipal
          │
          ▼
Apps/mobile  (futuro)
App mobile ACS
```

---

## Responsabilidades

| App | Caminho | Stack | Responsabilidade |
|---|---|---|---|
| Agent | `Apps/agent/pec-agent-sync` | **Rust** | Agente local instalado no município; lê PEC em read-only; envia dados ao servidor central |
| Agent Bootstrap | `Apps/agent/pec-bootstrap-agent` | **Rust** | Setup inicial: cria roles/DB locais, aplica schema seed |
| Server/API | `Apps/server/api` | Node.js / TypeScript | Backend/API central; recebe dados do agente; expõe B360, CVAT, cadastros, correções, notificações |
| Web | `Apps/web` | React / TypeScript | UI web para gestores municipais; consome APIs do servidor canônico |
| Mobile | `Apps/mobile` | Android (futuro) | App ACS mobile; preservado, não expandido agora |

---

## Leis arquiteturais permanentes

1. **Nunca escrever no banco PEC** — todas as queries são `SELECT` apenas
2. **Agente conecta com usuário read-only** — jamais usar `superuser` no PEC
3. **PII por camada** — CPF, CNS, nome, endereco, telefone, senha e token nunca sao logados; fluxos nominais exigem RBAC, auditoria e mascaramento quando o papel nao autoriza
4. **PostgreSQL-only** — zero MySQL, zero MariaDB em qualquer código novo
5. **Redis apenas para cache/status/fila** — não é banco de dados primário
6. **UI em `Apps/web`** — nunca servir HTML inline no backend
7. **API em `Apps/server/api`** — não criar novo app de frontend
8. **Agente em Rust** — `Apps/agent/*` sempre Rust
9. **Saúde Brasil 360 é o contrato principal** — Previne Brasil é legado/deprecated
10. **Não mascarar falhas** — build/test/lint/smoke devem falhar de verdade
11. **Push direto para `origin/main`** após validação completa
12. **`Apps/desktop` e `Apps/sus-analytics-web` são proibidos** — foram caminhos legados já descontinuados
13. **`Apps/sync-agent` é legado/deprecated** — referência histórica apenas; agente real é `Apps/agent/pec-agent-sync`

---

## Fluxo de dados do agente

```
1. Instalação
   cargo install --path Apps/agent/pec-agent-sync

2. Bootstrap (uma vez)
   pec-agent-sync bootstrap
   → cria estruturas locais necessárias

3. Registro (uma vez)
   AGENT_ACTIVATION_CODE=XXX pec-agent-sync register
   → POST /api/agents/register
   → persiste identity.json + agent_token localmente

4. Heartbeat (periódico, ex: a cada 5min)
   pec-agent-sync heartbeat
   → POST /api/agents/heartbeat

5. Sync (periódico, ex: a cada 5min)
   pec-agent-sync sync
   → lê PEC por cursor incremental
   → POST /api/agents/batch (chunks de 500 linhas)
   → POST /api/agents/checkpoint (avança cursor)
   → spool local se servidor offline

6. Health check (sob demanda)
   pec-agent-sync health
   → verifica tabelas críticas do PEC
   → retorna JSON de source-health
```

---

## Garantias de segurança do agente

- Token gerado localmente (`agt-<uuid-hex>`), enviado apenas no header `Authorization: Bearer`
- Hostname hash (SHA256) — nunca o hostname real
- Credenciais PEC lidas de env ou arquivo local (nunca commitadas)
- Arquivo `identity.json` com permissão `0600` (Unix)
- Spool local criptografado em disco; chunks raw podem conter PII nominal conforme contrato do módulo
- Backoff exponencial: 5s → 10s → 20s → ... → 1h

---

## Guardrails automáticos

```bash
pnpm run check:postgres-only       # zero MySQL/MariaDB
pnpm run check:apps-architecture   # agente Rust, web React, server/api TS
pnpm run qa:lgpd                   # RBAC/mascaramento/auditoria e logs sem PII
pnpm run qa:rbac                   # RBAC correto
cargo check --manifest-path Apps/agent/Cargo.toml
```

*Atualizado em 2026-05-07 | Sprint ARCH-1*
