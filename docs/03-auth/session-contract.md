# Contrato de Sessão Operacional

**Versão:** Gate 1.1
**Data:** 2026-04-29
**Status:** Canônico para produção e dev/test

---

## 1. Cookie de Sessão

### Especificação Completa

**Nome:** `app_session_id`

**Tipo:** JWT assinado com `JWT_SECRET` (HS256)

**Atributos:**

- **httpOnly:** `true` (obrigatório - impede acesso via JavaScript)
- **secure:** `true` em production (NODE_ENV=production), `false` em dev/test local
- **sameSite:** `"lax"` (permite navegação top-level cross-site, bloqueia POST cross-site)
- **path:** `"/"` (válido para toda aplicação)
- **maxAge:** 31536000000 ms (1 ano)
- **domain:** não setado (default para domínio atual)

**Quando é criado:**

1. OAuth callback bem-sucedido (`/api/oauth/callback`)
2. Dev-session login (POST `/auth/dev-session` - apenas dev/test)

**Quando é renovado:**

- Não há renovação automática no Gate 1.1
- Usuário deve re-autenticar após expiração (1 ano)

**Quando é removido:**

- Logout explícito via `auth.logout` mutation
- Expiração natural após 1 ano
- Invalidação manual via clear browser cookies

---

## 2. JWT Interno (Payload)

### Campos Obrigatórios

```typescript
interface SessionPayload {
  openId: string;       // User ID do OAuth externo ou dev-session
  appId: string;        // APP_ID do servidor (validado)
  name: string;         // Nome do usuário
  exp: number;          // Expiração Unix timestamp
}
```

### Campos Opcionais (Test-Only)

```typescript
interface TestFixturePayload extends SessionPayload {
  fixture: "auth-smoke-v1";  // Marcador de fixture test-only
  role: string;              // "user" | "admin" | "super_admin"
  permissions: string[];     // Lista de permissões
  status: string;            // "active" | "inactive"
}
```

### Validação

**Algoritmo:** HS256

**Issuer/Audience:** Não validado no Gate 1.1 (JWT criado sem iss/aud)

**Segredo exigido pelo servidor:** variável `JWT_SECRET` com no mínimo 32 caracteres e sem valor de exemplo.

**AppId Match:** `payload.appId === process.env.APP_ID` (obrigatório)

**Expiração:** Validada automaticamente via `jwtVerify`

**Campos:** openId, appId e name devem ser strings não vazias

**Rejeição de Placeholder:** `JWT_SECRET` não pode ser placeholder (validado em preflight)

---

## 3. CSRF Protection

### Cookie CSRF

**Nome:** `app_csrf`

**Tipo:** UUID v4 aleatório

**Atributos:**

- **httpOnly:** `false` (precisa ser acessível via JavaScript para envio em header)
- **secure:** mesmo valor de `secure` do cookie de sessão
- **sameSite:** mesmo valor de `sameSite` do cookie de sessão
- **path:** `"/"`
- **maxAge:** 31536000000 ms (1 ano, sincronizado com sessão)

**Validação (Gate 1.1):**

⚠️ **Status:** CSRF **não validado** em mutações no Gate 1.1

**Plano futuro (pós-Gate 1.1):**

- Middleware tRPC para validar `header["x-csrf-token"] === cookie["app_csrf"]` em mutations
- Dispensado para Bearer token (Auth via header Authorization não é vulnerável a CSRF)
- Obrigatório para cookie-based auth

---

## 4. RBAC (Role-Based Access Control)

### Níveis de Proteção

#### 1. Public Procedure (sem auth)

```typescript
publicProcedure.query(...)
```

**Rotas públicas:**

- `auth.me` (retorna null se não autenticado)
- `auth.logout`
- `system.health`
- `indicadores.available`

#### 2. Protected Procedure (auth obrigatória)

```typescript
protectedProcedure.query(...)
```

**Validação:**

- `ctx.user` deve existir (middleware `requireUser`)
- Retorna 401 UNAUTHORIZED se user ausente

**Exemplo:**

- `previne.*` (rotas agregadas de indicadores)

#### 3. Permission Procedure (auth + permissão específica)

```typescript
permissionProcedure("indicators:pending_list").query(...)
```

**Validação:**

- `ctx.user` deve existir
- `ctx.user.role === "admin"` OR `ctx.user.role === "super_admin"` → passa
- OU `ctx.user.permissions` deve incluir permissão específica
- Retorna 403 FORBIDDEN se sem permissão

**Exemplos:**

- `indicadores.pending` → `"indicators:pending_list"`
- `indicadores.citizenDiagnostic` → `"indicators:citizen_diagnostic"`
- `cache.flush` → `"cache:admin"`
- `sync.gerarToken` → `"sync.token.create"`

### Permissões Mínimas Controladas (Gate 1.1)

| Permissão                         | Escopo                       | Dados sensíveis? |
| --------------------------------- | ---------------------------- | ---------------- |
| `indicators.read`                 | Rotas agregadas de indicadores | Não              |
| `indicators.previne.read`         | Painel Saúde Brasil 360l         | Não              |
| `indicators.pending_list`         | Listas nominais pendentes     | **Sim** (CPF/CNS mascarado) |
| `indicators.citizen_diagnostic`   | Diagnóstico cidadão individual | **Sim** (CPF/CNS mascarado) |
| `cache:admin`                     | Flush/invalidate cache        | Não              |
| `sync.token.create`               | Gerar token de sync agent     | Não              |
| `pec.connection.create`           | Criar conexão PEC (bloqueado) | Não              |

---

## 5. Logs e Auditoria

### Regras de Segurança

**NUNCA imprimir:**

- Token JWT completo (sessão ou sync)
- Cookie `app_session_id` completo
- Cookie `app_csrf` completo
- `JWT_SECRET`
- Senhas
- DATABASE_URL completa
- CPF/CNS não mascarado
- Nome completo de cidadão
- Endereço, telefone

**Permitido imprimir:**

- `requestId` (UUID)
- Hash curto de token: primeiros 6 chars + `***` + últimos 4 chars (ex: `eyJhbG***Xw4`)
- Hash SHA256 de IP (16 chars)
- openId (user ID não sensível)
- role
- permissions
- CPF/CNS mascarado (últimos 4 dígitos apenas)

**Exemplo de log seguro:**

```json
{
  "event": "auth.session_verified",
  "request_id": "3a7f2b1c-8d9e-4f5a-b6c7-1d2e3f4a5b6c",
  "user_id": "user-abc123",
  "role": "user",
  "token_hash": "eyJhbG***Xw4",
  "ip_hash": "a1b2c3d4e5f6g7h8"
}
```

---

## 6. Modo Dev/Test Controlado

### POST /auth/dev-session (Gate 1.1)

**Propósito:** Gerar sessão operacional controlada para E2E local sem depender de OAuth externo

**Condições obrigatórias:**

- `NODE_ENV !== "production"`
- `ALLOW_DEV_SESSION_LOGIN === "true"`
- `JWT_SECRET` válido (>= 32 chars, não placeholder)
- `APP_ID` válido (não placeholder)

**Descoberta de capacidade pela UI:**

- `GET /api/auth/capabilities` retorna somente
  `{ schemaVersion: 1, devSessionLogin: boolean }`, com `Cache-Control: no-store`;
- `devSessionLogin=true` exige simultaneamente ambiente não produtivo e
  `ALLOW_DEV_SESSION_LOGIN === "true"` no backend. `production`, `prod`,
  `staging`, `stage`, `homolog` e `homologacao` em `NODE_ENV`, `ENVIRONMENT`,
  `APP_ENV` ou `DEPLOY_ENV` são sempre tratados como produção;
- a UI só exibe "Acesso técnico DEV" quando o bundle foi compilado com
  `VITE_ENABLE_DEV_LOGIN=true` **e** o endpoint confirma a capacidade;
- localhost não habilita DEV implicitamente. Falha de rede, HTTP ou contrato
  mantém a opção oculta;
- os endpoints de criação de sessão continuam validando o backend novamente.

**Bloqueio em production:**

```javascript
if (process.env.NODE_ENV === "production") {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "dev_session_blocked_in_production"
  });
}
```

**Request body:**

```typescript
interface DevSessionRequest {
  openId: string;           // User ID controlado (ex: "dev-user-001")
  name: string;             // Nome controlado (ex: "Dev User")
  role?: string;            // "user" | "admin" (default: "user")
  permissions?: string[];   // Lista de permissões (default: [])
}
```

**Response:**

- Set cookie `app_session_id` com JWT válido
- Set cookie `app_csrf` com UUID
- Upsert user no banco app (não PEC)
- Retorna `{ success: true, openId, name, role }`

**Diferença vs auth-fixture:**

| Aspecto               | auth-fixture                  | dev-session                    |
| --------------------- | ----------------------------- | ------------------------------ |
| Propósito             | Smoke RBAC local              | E2E session operacional local  |
| Tipo de token         | Bearer JWT (fixture marcado)  | Cookie session JWT (real)      |
| Flag de controle      | `ALLOW_TEST_AUTH_FIXTURES`    | `ALLOW_DEV_SESSION_LOGIN`      |
| Marcador              | `fixture: "auth-smoke-v1"`    | Sem marcador (sessão real)     |
| Persistência          | Não (token gerado via script) | Sim (upsert user no banco app) |
| Validação middleware  | Aceito se flag habilitado     | Mesma validação de OAuth real  |

---

## 7. Fluxo de Autenticação Completo

### Produção (OAuth Real)

1. Usuário acessa aplicação sem sessão
2. Frontend redireciona para OAuth IdP externo
3. OAuth IdP valida credenciais
4. Redirect para `/api/oauth/callback?code=...&state=...`
5. Backend troca code por accessToken
6. Backend busca userInfo via accessToken
7. Backend upsert user no banco app
8. Backend cria sessionToken JWT
9. Backend set cookie `app_session_id` e `app_csrf`
10. Backend redirect 302 para `/`
11. Frontend lê cookie e chama `auth.me` → retorna user autenticado
12. Usuário navega na aplicação com sessão válida

### Dev/Test Local (Dev-Session)

1. Script/test chama `POST /auth/dev-session` com openId/name/role/permissions controlados
2. Backend valida `NODE_ENV !== "production"` e `ALLOW_DEV_SESSION_LOGIN === "true"`
3. Backend upsert user no banco app
4. Backend cria sessionToken JWT (sem marcador fixture)
5. Backend set cookie `app_session_id` e `app_csrf`
6. Script/test navega com cookie e chama endpoints protegidos → 200 OK

### Test-Only (Auth Fixture - RBAC smoke)

1. Script executa `node scripts/14-shared/auth-fixture.mjs`
2. Script valida `ALLOW_TEST_AUTH_FIXTURES === "true"` e `NODE_ENV !== "production"`
3. Script gera tokens JWT com `fixture: "auth-smoke-v1"` e roles/permissions controlados
4. Script salva tokens em arquivo local (não versionado)
5. Smoke script carrega token e envia via `Authorization: Bearer <token>`
6. Backend valida JWT e detecta fixture marcador
7. Backend retorna user com role/permissions do fixture (não busca banco)
8. Smoke valida 401/403/200 conforme RBAC esperado

---

## 8. Cenários de Rejeição

### 401 UNAUTHORIZED (sem sessão)

**Causas:**

- Cookie `app_session_id` ausente
- JWT inválido (assinatura errada)
- JWT expirado
- JWT sem campos obrigatórios (openId, appId, name)
- `appId` do JWT diferente de `process.env.APP_ID`
- User status = "inactive" (após busca no banco)

**Resposta:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Autenticação obrigatória."
  }
}
```

### 403 FORBIDDEN (sem permissão)

**Causas:**

- Usuário autenticado, mas sem permissão específica
- Role não é admin/super_admin
- `user.permissions` não inclui permissão requerida

**Resposta:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Permissão obrigatória: indicators:pending_list"
  }
}
```

### 429 TOO_MANY_REQUESTS (rate limit)

**Limites:**

- OAuth callback: 20 req/min por IP hash
- tRPC protegido: 120 req/min por IP hash

**Resposta:**

```json
{
  "error": "rate_limited",
  "requestId": "..."
}
```

---

## 9. Migração e Compatibilidade

### Gate 1.0 → Gate 1.1

**Mudanças:**

- ✅ OAuth callback já existe (sem mudança)
- ✅ Sessão JWT já existe (sem mudança)
- ✅ RBAC já existe (sem mudança)
- ✨ Novo: endpoint `POST /auth/dev-session` (dev/test only)
- ✨ Novo: permissões granulares para indicadores
- ✨ Novo: smoke:session script
- ✨ Novo: smoke:indicators:auth com sessão real

**Breaking changes:** Nenhum

**Deprecations:** Nenhum

---

## 10. Validação de Conformidade

### Checklist de Produção

- [ ] `OAUTH_SERVER_URL` configurado
- [ ] `JWT_SECRET` >= 32 chars e não placeholder
- [ ] `APP_ID` configurado e não placeholder
- [ ] Cookie `secure: true` se HTTPS
- [ ] `ALLOW_DEV_SESSION_LOGIN` não setado ou `false`
- [ ] `VITE_ENABLE_DEV_LOGIN` ausente ou `false` durante o build web
- [ ] `ALLOW_TEST_AUTH_FIXTURES` não setado ou `false`
- [ ] Logs não imprimem tokens/cookies/secrets
- [ ] Endpoint `/auth/dev-session` bloqueia com 403

### Checklist de Dev/Test

- [ ] `ALLOW_DEV_SESSION_LOGIN=true` em .env.local
- [ ] `VITE_ENABLE_DEV_LOGIN=true` antes de iniciar/compilar o frontend local
- [ ] `GET /api/auth/capabilities` retorna `devSessionLogin=true`
- [ ] `ALLOW_TEST_AUTH_FIXTURES=true` em .env.local (se smoke RBAC)
- [ ] `NODE_ENV=development` ou não setado
- [ ] Cookie `secure: false` OK em localhost HTTP
- [ ] Endpoint `/auth/dev-session` funcional
- [ ] Smoke scripts executam sem erro

---

**Última atualização:** 2026-07-20 (capability DEV fail-closed)
**Próxima revisão:** Após validação browser do cutover operacional
