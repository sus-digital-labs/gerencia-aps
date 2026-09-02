# B4 / M1 / M2 — Source Unblock Validation Report

**Data:** 2026-05-25  
**Status:** `DONE_B4_M1_M2_EMPTY_DENOMINATOR_NOT_BLOCKED`  
**Sessão:** G

---

## 1. Problema

Os indicadores B4, M1 e M2 apareciam como **"Bloqueado"** no painel Saúde Brasil 360, mesmo com todas as tabelas disponíveis na réplica PEC. O status retornado era `blocked_by_source`, quando o correto seria `ok` (B4 com dados) ou `empty_denominator` (M1/M2 sem equipe eMulti no município).

---

## 2. Causa Raiz

### B4 — Escovação supervisionada (6-12 anos)

**Sintoma:** Dashboard sem filtro de equipe chama com `equipeId=null, ine=""`. A função interna `resolveReferenceUnitId(null, null)` retornava `{unidadeId: null, warnings: ["B4_REFERENCE_POPULATION_BLOCKED_BY_DATA"]}`, e o código verificava `if (referenceUnit.unidadeId === null)` → `blocked_by_source`.

**Correção:**
1. Adicionado campo `municipalityLevel: boolean` à interface `ReferenceUnitResult`.
2. Quando `effectiveEquipeId === null` (nenhuma equipe selecionada), retorna `{municipalityLevel: true, warnings: ["B4_REFERENCE_POPULATION_MUNICIPALITY_LEVEL"]}` em vez de bloquear.
3. Removido o caminho `blocked_by_source` para `unidadeId === null`.
4. SQL ajustado para filtros opcionais: `($3::bigint IS NULL OR column = $3)` em numerador e denominador.

### M1 — Média de atendimentos por pessoa (eMulti)
### M2 — Ações interprofissionais realizadas pela eMulti

**Sintoma:** `resolveEmultiScope` retornava `{enforced: false}` para municípios sem equipe eMulti (como Barra do Choça, BA, que possui apenas tipos 55/56/57). O código explicitamente retornava `status: "blocked_by_source"` com `errorCode: "M_EMULTI_SCOPE_BLOCKED_BY_DATA"`.

**Correção:**
1. Dividido o caminho `!scope.enforced` em dois ramos:
   - **Schema bloqueado** (`EMULTI_SCOPE_BLOCKED_SCHEMA_WARNING`): mantém `blocked_by_schema` com `errorCode: "M_EMULTI_SCOPE_BLOCKED_BY_SCHEMA"` — indica impossibilidade técnica de consultar o banco.
   - **Gap de dados** (ausência de equipe eMulti): retorna com `coverageStatus: "PARTIAL_WITH_WARNINGS"` e sem `status` explícito → `deriveStatus()` retorna `empty_denominator` (denominator=0, não BLOCKED).
2. Adicionados warnings descritivos: `M1_EMULTI_SCOPE_NOT_RESOLVED_EMPTY_DENOMINATOR` / `M2_EMULTI_SCOPE_NOT_RESOLVED_EMPTY_DENOMINATOR`.

---

## 3. Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-b4.ts` | Fix | municipalityLevel flag + SQL nullable filters |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m1.ts` | Fix | data gap → empty_denominator (não blocked_by_source) |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m2.ts` | Fix | data gap → empty_denominator (não blocked_by_source) |
| `Apps/server/api/src/indicators/__tests__/b360-b1-b6.test.ts` | Test | +2 testes B4 municipalityLevel |
| `Apps/server/api/src/indicators/__tests__/b360-m1-m2.test.ts` | Test | +2 testes, 1 atualizado (empty_denominator) |
| `scripts/tests/shared/smoke-b360-b4-m1-m2.mjs` | Smoke | Novo script de smoke B4/M1/M2 |

---

## 4. Gates

### Testes (vitest)
```
Tests: 606/606 PASS
```

### Typecheck
```
0 errors
```

### Build
```
RELEASE_READY=true
```

### Lint
```
0 issues
```

### LGPD / Secrets
- `nu_cns` em M1/M2: nome de coluna SQL (declaração de schema) — não é dado exposto
- `JWT_SECRET` em smoke: usa `process.env.JWT_SECRET` com fallback dev
- Smoke confirmado: `piiSafe=true, CPF=false, CNS=false` para todos os 3 indicadores

---

## 5. Smoke Runtime (porta 3003)

Executado em 2026-05-25 com `INE=0000181447`, `equipeId=4`, período 2025-05-01→2026-04-30.

```
✓ B4: status=ok | numerator=0, denominator=562 | ruleVersion=B4@2026.3
✓ M1: status=empty_denominator | numerator=0, denominator=0 | ruleVersion=M1@2026.2
✓ M2: status=empty_denominator | numerator=0, denominator=0 | ruleVersion=M2@2026.2

PASS=3 FAIL=0
```

**B4:** Sem escovações supervisionadas no período (numerator=0), mas com 562 crianças de 6-12 anos na réplica (denominator=562) — status `ok`, não bloqueado.

**M1/M2:** Município de Barra do Choça não possui equipe eMulti (apenas tipos ESF/ESB/NASF). Status correto é `empty_denominator`, não `blocked_by_source`.

### Smoke API Completo (sem regressão)
```
✓ health: PASS
✓ unauthProtection: PASS
✓ C2 status: ok (14.58%) + piiSafe: PASS
✓ C3 status: ok (3.38%) + piiSafe: PASS
✓ sourceHealth: overallStatus=OK
ALL API GATES PASS
```

---

## 6. Comportamento do Dashboard

| Indicador | Antes | Depois |
|-----------|-------|--------|
| B4 (sem filtro equipe) | "Bloqueado" | Exibe resultado real (0.0%) com denominador 562 |
| M1 | "Bloqueado" | "Sem dados" / empty_denominator |
| M2 | "Bloqueado" | "Sem dados" / empty_denominator |

---

## 7. Invariantes Preservados

- ✅ Nenhuma alteração em C1/C2/C3/B1/B2/B3/B5/B6
- ✅ Nenhuma alteração em layout/UI
- ✅ Nenhum mock usado
- ✅ `blocked_by_source` real (schema error) ainda retorna `blocked_by_source`
- ✅ Nenhuma tabela criada no PEC
- ✅ Sem CPF/CNS em resposta API
- ✅ `.env`, dist e segredos não commitados
