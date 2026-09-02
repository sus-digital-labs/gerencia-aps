# Gate 1 — Plano de Validação E2E

**Gate**: 1 (Sync Agent Handshake)
**Versão**: 1.0
**Data**: 2026-04-29
**Status**: Pendente execução (DB/réplica não disponíveis)

## Objetivo

Validar end-to-end a implementação Gate 1 do Sync Agent em ambiente local com:
- Endpoints `/api/agents/register`, `/api/agents/heartbeat`, `/api/agents/me` funcionais.
- Identidade local persistida e reutilizada.
- Token com prefixo `agt_`, fingerprint SHA-256.
- Validação anti-vazamento de payload sensível.
- Rate limiting ativo.
- Logs sem segredos/PII.

## Pré-requisitos de ambiente

### Infraestrutura
- **PostgreSQL** (PEC_REPLICA ou PEC_DB): pelo menos um banco disponível.
- **Redis**: instância local ou remota acessível.
- **Node.js**: 22+.
- **pnpm**: 10.32.0+.
- **Porta livre**: 3012-3016 (ou outra configurada).

### Repositório
- Branch: `main`.
- Tag presente: `sus-analytics-sync-agent-g1-handshake-20260429`.
- Commits recentes pushados.

### Arquivos de configuração
- `.env` presente na raiz com **valores reais** (não placeholders).
- Variáveis obrigatórias (sem valores de exemplo aqui):
  - `NODE_ENV`
  - `PORT`
  - `PEC_REPLICA_HOST`, `PEC_REPLICA_DATABASE`, `PEC_REPLICA_USER`, `PEC_REPLICA_PASSWORD` (se usar réplica)
  - `PEC_DB_HOST`, `PEC_DB_DATABASE`, `PEC_DB_USER`, `PEC_DB_PASSWORD` (se usar DB direto)
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PREFIX`
  - `JWT_SECRET`
  - `JWT_AUDIENCE`, `JWT_ISSUER`
  - `SESSION_SECRET`, `SESSION_NAME`
  - `ESUS_OAUTH_CLIENT_ID`, `ESUS_OAUTH_CLIENT_SECRET`, `ESUS_OAUTH_REDIRECT_URI`

### Pré-check Redis

**Configuração obrigatória:**

- `REDIS_HOST` presente (ex: `127.0.0.1`, `infra-redis`)
- `REDIS_PORT` presente (ex: `6379`)
- `REDIS_PREFIX` com valor canônico: `sus-analytics:` (com `:` final)

**Formato padrão:** `namespace:key` (ex: `sus-analytics:cache:indicators`)

**Validação de integridade:**

- Prefixo sem `:` final gera warning em dev/test, FAIL em production (comportamento a ser implementado).
- Runtime e bootstrap usam o valor literal, sem transformação.
- Comandos de cache (flush/invalidate) devem operar no mesmo namespace.

**Endpoint de verificação (se disponível):**

```powershell
curl http://127.0.0.1:<PORTA>/api/cache/stats
```

Esperado: JSON com chaves prefixadas por `sus-analytics:*`.

**Critério de bloqueio E2E:**

- Prefixo divergente entre `.env` e runtime bloqueia E2E.
- Cache flush parcial por namespace incorreto indica configuração inconsistente.

## Comandos de validação (ordem recomendada)

### 1. Preflight (ambiente)

```powershell
pnpm run preflight:env
```

**Esperado**: `status=OK`, todas as variáveis presentes, sem placeholders.

**Critério de falha**:
- `status=FAIL` com `missing_variable` ou `placeholder_value`.
- DB/Redis inacessíveis.

---

### 2. Lint
```powershell
pnpm lint
```

**Esperado**: `[lint] Auditoria estrutural concluida.`

**Critério de falha**: qualquer erro estrutural reportado.

---

### 3. Testes unitários
```powershell
pnpm test
```

**Esperado**: 50/50 tests passing, todos os testes do sync-agent incluídos.

**Critério de falha**: qualquer teste falhar.

---

### 4. Build
```powershell
pnpm run build
```

**Esperado**: `status=FAIL`, `strategy=C (build-gap honesto reforçado)`, `RELEASE_READY=false`.

**Critério de falha**:
- Build passar sem diagnóstico explícito de gap (mascaramento proibido).
- `RELEASE_READY=true`.

---

### 5. Node check (runtime backend)
```powershell
node --check Apps/server/api/dist/index.js
```

**Esperado**: sem output (sucesso).

**Critério de falha**: erro de sintaxe reportado.

---

### 6. Agent check
```powershell
pnpm run agent:sync:check
```

**Esperado**: JSON com `"status": "ok"`, `"mode": "scaffold"`, `"syncImplemented": false`.

**Critério de falha**: erro de sintaxe ou status diferente de `ok`.

---

### 7. Agent test
```powershell
pnpm run agent:sync:test
```

**Esperado**: 9/9 tests passing.

**Critério de falha**: qualquer teste falhar.

---

### 8. Start runtime
```powershell
pnpm run web:up
```

**Esperado**:
- Servidor inicia na porta configurada.
- Logs sem erros fatais.
- Conexão DB/Redis OK.
- Endpoint `/readyz` responde com `status=OK`.

**Critério de falha**:
- Servidor não inicia.
- `/readyz` retorna erro ou `status=FAIL`.
- Segredo/PII exposto em logs.

---

### 9. Smoke web
```powershell
pnpm run smoke:web -- http://127.0.0.1:<PORTA_REAL>
```

**Esperado**: todas as validações OK (HTML, assets, health).

**Critério de falha**: qualquer check falhar.

---

### 10. Smoke indicators
```powershell
pnpm run smoke:indicators -- http://127.0.0.1:<PORTA_REAL>
```

**Esperado**:
- Endpoints públicos (painel geral, drilldown) respondem com 200 ou 401/403 (se auth obrigatório).
- Endpoints protegidos (detalhes cidadão) retornam 401 sem auth.

**Critério de falha**:
- Endpoint público retorna 500.
- Endpoint protegido retorna dados sem auth.
- PII exposto em logs ou resposta.

---

### 11. Smoke agent (Gate 1 específico)
```powershell
pnpm run smoke:agent -- http://127.0.0.1:<PORTA_REAL>
```

**Esperado** (6 testes):
1. `POST /api/agents/register` com payload válido: 201, retorna `agentId` + `token` com prefixo `agt_`.
2. `POST /api/agents/heartbeat` com token válido: 200, confirmação OK.
3. `POST /api/agents/heartbeat` com payload contendo campo proibido (`PEC_REPLICA_PASSWORD`): 400, erro `AGENT_PAYLOAD_CONTAINS_FORBIDDEN_FIELD`.
4. `POST /api/agents/heartbeat` com token inválido: 401.
5. `GET /api/agents/me` com token válido: 200, retorna `agentId`, `installationId`, `tenantId`, `createdAt`, **sem** `token` completo.
6. `GET /api/agents/me` sem token: 401.

**Critério de falha**:
- Qualquer teste falhar.
- Endpoint aceitar heartbeat sem token.
- Payload proibido não ser rejeitado.
- Token de fixture ser confundido com sessão real.
- Segredo/PII em logs.

---

### 12. Smoke indicators auth (Gate 1.1+, ainda pendente)
```powershell
pnpm run smoke:indicators:auth -- http://127.0.0.1:<PORTA_REAL>
```

**Status**: Ainda não implementado (requer OAuth/sessão funcional).

**Esperado (futuro)**:
- Login OAuth bem-sucedido.
- JWT válido emitido.
- Cookie de sessão configurado.
- Endpoints protegidos retornam 200 com auth válido.

**Critério de falha (futuro)**:
- Não conseguir autenticar.
- Token inválido aceito.
- PII exposto em logs.

---

## Classificações esperadas

### SYNC_AGENT_G1_E2E_OK
- Todos os comandos 1-11 passam.
- Nenhum critério de falha acionado.
- Logs limpos (sem segredos/PII).
- Rate limiting confirmado.

### SYNC_AGENT_G1_E2E_PARTIAL_AUTH_GAP
- Comandos 1-11 passam.
- Comando 12 (smoke:indicators:auth) falha por OAuth/sessão ainda não funcional (esperado em Gate 1.1).
- Não impede aprovação de Gate 1 (handshake mínimo).

### GATE_FAILED
- Qualquer comando 1-11 falha.
- Build mascarado (passa sem diagnóstico de gap).
- Segredo/PII exposto.
- Endpoint agente aceita heartbeat sem token.
- Payload proibido não rejeitado.

---

## Critérios de reprovação (bloqueadores)

1. **Endpoint agente aceitar heartbeat sem token**.
2. **Payload proibido não ser rejeitado** (`PEC_REPLICA_PASSWORD`, `JWT_SECRET`, `token`, etc).
3. **Token de fixture ser confundido com sessão real** (agente não deve autenticar com JWT de usuário).
4. **Segredo/PII em logs** (DATABASE_URL, JWT_SECRET, CPF, CNS, token completo).
5. **Build mascarado** (passar sem diagnóstico explícito de gap).
6. **`RELEASE_READY=true`** enquanto build não estiver completo.
7. **Runtime expor dados nominais sem auth**.

---

## Gaps conhecidos (não bloqueiam Gate 1)

- **Build source-first** ainda não gera runtime canônico completo (Strategy C ativa).
- **OAuth/sessão** ainda não integrado (Gate 1.1).
- **Persistência de agentes** ainda in-memory no runtime legado (Gate 1.2).
- **Sync incremental real** não implementado (Gate 2+).
- **LEDI** não implementado (Gate 2+).
- **E2E smoke full** pendente de ambiente DB/réplica disponível.

---

## Riscos residuais

- **Drift source/runtime**: runtime legado versionado pode divergir de source.
- **Ausência de `/readyz` em source-first** (ainda não portado).
- **Suites automatizadas não versionadas** (smoke scripts são ad-hoc, não integrados em CI).
- **Superfícies sensíveis**: OAuth callback, JWT emission, cookie de sessão, sync token upload.

---

## Rollback padrão

1. Reverter menor superfície alterada (última mudança em `Apps/server/api/dist/index.js` ou `Apps/sync-agent/src/**`).
2. Restaurar configurações de ambiente local (`.env`).
3. Revalidar health (`/readyz`) e cache stats.
4. Registrar causa e ação tomada.

---

## Próximos gates operacionais

- **Gate 1.1**: OAuth/sessão integrado, `smoke:indicators:auth` funcional.
- **Gate 1.2**: Persistência durável de registros de agente (Redis/DB).
- **Gate 2.0**: Source-first paridade completa, build reprodutível gera runtime canônico.
- **Gate 2.1**: Sync incremental real (sem LEDI), checkpoints por tabela.
- **Gate 3.0**: LEDI integrado, validação de payload THRIFT, envio seguro.

---

## Execução recomendada

1. Garantir `.env` com valores reais (sem placeholders).
2. Subir DB/Redis.
3. Executar comandos 1-7 (validação offline).
4. Executar comando 8 (start runtime).
5. Em terminal paralelo, executar comandos 9-11 (smokes).
6. Confirmar logs limpos (sem segredos/PII).
7. Parar runtime.
8. Classificar resultado (`SYNC_AGENT_G1_E2E_OK`, `PARTIAL_AUTH_GAP`, `GATE_FAILED`).
9. Registrar resultado em `.github/context/change_log.md`.

---

## Notas de auditoria

- **Auditoria Gate 1.0.1**: Commit integrity OK, commit message impreciso mas funcional, tag correta, 50/50 testes OK, build FAIL honesto, sem segredos expostos. Relatório: `docs/audit-gate1.0.1-integrity-report.md`.
- **Commits não reescritos**: b6f476b (implementação) + 3f330fd (strategy C + docs) preservados para rastreabilidade.
- **Remote sync**: Commits + tags pushados em 2026-04-29.
