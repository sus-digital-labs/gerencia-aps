# RBAC/ABAC Scope Model — Auditoria e Modelo Alvo

> **Data:** 02/05/2026
> **Gate:** MULTITENANT-SYNC-READINESS-1
> **Artefatos auditados:** `Apps/server/api/src/_core/trpc.ts`, `Apps/server/api/src/routers-previne.ts`

---

## Estado Atual (evidência real)

### `AuthenticatedUser` (trpc.ts:4-8)

```typescript
export interface AuthenticatedUser {
  id: string;
  role?: string;
  permissions?: string[];
}
```

**Campos ausentes para ABAC:**
- `municipioId` — município do usuário
- `unitId` / `cnesId` — unidade de saúde
- `teamId` / `ineId` — equipe
- `tenantId` — partição lógica
- `installationId` — binding com instância do agente

### `permissionProcedure` (trpc.ts:41-55)

Verifica se `user.permissions.includes(permission)` ou se `role === "admin"`.

**Não faz:**
- Filtro de dados por `municipioId` do usuário
- Filtro por `unitId` ou `teamId`
- Injeção de scope no contexto da query

**Resultado:** Qualquer usuário com a permissão `indicators:pending_list` vê dados de **todos** os municípios/equipes da réplica. Não há isolamento por escopo geográfico ou organizacional.

### Permissões definidas hoje

| Código | Rota que usa | Escopo atual | Escopo necessário |
|---|---|---|---|
| `indicators:pending_list` | `previne.drilldown` | global | por unidade/equipe do usuário |
| `indicators:citizen_diagnostic` | não mapeado em source | global | por cidadão da equipe do usuário |
| `citizens:nominal_data` | não mapeado em source | global | por equipe do usuário |
| `data_quality:nominal_data` | não mapeado em source | global | por municipio/unidade do usuário |

### SQL sem escopo (routers-previne.ts)

```typescript
// linha 68 — equipeId opcional, mas sem validação de ownership
const eqFilter = input.equipeId
  ? `AND a.co_dim_equipe_1 = ${input.equipeId}`
  : '';
// Sem: WHERE municipio_id = ctx.user.municipioId
// Sem: WHERE installation_id = ctx.user.installationId
```

---

## Modelo Alvo

### `AuthenticatedUser` estendido

```typescript
export interface AuthenticatedUser {
  id: string;
  role?: string;
  permissions?: string[];
  // ABAC scope fields
  tenantId?: string;
  installationId?: string;
  municipioIbge?: string;
  allowedUnitIds?: string[];
  allowedTeamIds?: string[];
}
```

### Middleware de scope (proposto)

```typescript
export const scopedProcedure = (permission: string) =>
  permissionProcedure(permission).use(({ ctx, next }) => {
    // Injeta scope no contexto
    return next({
      ctx: {
        ...ctx,
        scope: {
          municipioIbge: ctx.user.municipioIbge,
          installationId: ctx.user.installationId,
          allowedUnitIds: ctx.user.allowedUnitIds ?? [],
          allowedTeamIds: ctx.user.allowedTeamIds ?? [],
        },
      },
    });
  });
```

### Queries com scope injetado (proposto)

```typescript
// previne.painelGeral — com scope
const municipioFilter = ctx.scope.municipioIbge
  ? `AND u.co_municipio_ibge = '${ctx.scope.municipioIbge}'`
  : '';
const unitFilter = ctx.scope.allowedUnitIds.length > 0
  ? `AND co_dim_unidade_saude_1 = ANY(ARRAY[${ctx.scope.allowedUnitIds.join(',')}]::int[])`
  : '';
```

---

## Gap Analysis

| Item | Hoje | Alvo | Sprint |
|---|---|---|---|
| Verificação de permissão | ✅ PRESENT | ✅ PRESENT | — |
| `municipioId` no contexto JWT | ❌ ABSENT | obrigatório | Sprint 2 |
| Filtro de dados por `municipioId` | ❌ ABSENT | obrigatório | Sprint 3 |
| Scope por unidade/equipe | ❌ ABSENT | obrigatório | Sprint 3 |
| `tenantId` no contexto | ❌ ABSENT | obrigatório | Sprint 1 |
| Auditoria com scope | ❌ ABSENT | obrigatório | Sprint 4 |
| RBAC persistente (banco) | ❌ ABSENT (em memória) | obrigatório | Sprint 2 |

---

## Critério COVERED

Para declarar `rbac_scope: COVERED_WITH_EVIDENCE`:

- [ ] `AuthenticatedUser` inclui `municipioIbge`, `tenantId`, `allowedUnitIds`
- [ ] `scopedProcedure` middleware injeta scope no contexto de cada query
- [ ] Queries Previne filtram por `municipioIbge` do usuário autenticado
- [ ] Teste de integração: usuário de município A não vê dados de município B
- [ ] Auditoria de acesso registra `municipioIbge` (sem CPF/CNS)

---

*Gerado em 02/05/2026 | Gate MULTITENANT-SYNC-READINESS-1*
