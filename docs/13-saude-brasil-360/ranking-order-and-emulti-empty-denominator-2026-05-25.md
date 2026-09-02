# Ranking de Equipes — Correção de Ordenação + Validação M1/M2 empty_denominator

**Data:** 2026-05-25  
**Status:** `DONE_RANKING_ORDER_FIXED_AND_EMULTI_VALIDATED`

---

## 1. M1 e M2 — Status Validado

**Resultado:** `empty_denominator` — comportamento correto e esperado.

**Justificativa:**
- Barra do Choça (BA) não possui equipe eMulti (tipos cadastrados: 55=ESB, 56=ESF, 57=NASF).
- `resolveEmultiScope` retorna `{enforced: false}` com warning `M_EMULTI_SCOPE_BLOCKED_BY_DATA`.
- O código (sessão G) diferencia corretamente dois casos:
  - Schema error (banco inacessível) → `blocked_by_schema`
  - Gap de dados (sem equipe eMulti) → `empty_denominator` via `PARTIAL_WITH_WARNINGS`
- Smoke confirmou: `status=empty_denominator`, `errorCode=-`, `piiSafe=true`.

**Nenhuma alteração necessária em M1/M2.**

---

## 2. Ranking de Equipes — Inversão de Ordenação

### 2.1 Problema Observado

No smoke visual anterior (commit 690bbe8):
```
1º USF OURO VERDE  — 148 400 pts
2º USF BARRA NOVA  — 151 197 pts  ← score MAIOR mas em 2º lugar
3º USF PRIMAVERA   — 118 261 pts
```

O 2º lugar tinha pontuação maior que o 1º — inversão de ranking.

### 2.2 Causa Raiz

**Arquivo:** `Apps/server/api/src/routes/pec-api.ts`

O SQL que retorna as equipes usa `ORDER BY attendances DESC, visits DESC`:
```sql
ORDER BY attendances DESC, visits DESC
LIMIT 12
```

O `totalScore` é calculado em JavaScript **após** a query:
```typescript
const totalScore = attendances + Math.round(visits * 0.35) + Math.round(vaccinations * 0.2);
```

Como `totalScore` inclui `vaccinations * 0.2`, uma equipe com **menos atendimentos** mas **muito mais vacinas** pode ter `totalScore` maior que a 1ª do SQL. O array não era re-ordenado após o cálculo dos scores.

**Adicionalmente:** `badgesCount: Math.max(0, 4 - index)` usava `index` da ordem SQL (errada), não da ordem por score.

### 2.3 Correção

Split em 2 passagens com sort no meio:

```typescript
// Pass 1: compute scores (sem dependência de rank)
const leaderboardRaw = rows.map((row) => ({
  ...computedValues,
  totalScore,
}));

// Re-ordenar por totalScore DESC
leaderboardRaw.sort((a, b) => b.totalScore - a.totalScore);

// Pass 2: atribuir badgesCount baseado no rank real
const leaderboardItems = leaderboardRaw.map((item, index) => ({
  ...item,
  badgesCount: Math.max(0, 4 - index),
}));
```

### 2.4 Resultado Após Fix

```
1º USF BARRA NOVA      — 151 197 pts  ✓ (corretamente 1ª)
2º USF OURO VERDE      — 148 400 pts  ✓
3º USF PRIMAVERA       — 118 261 pts  ✓
4º USF ALTO DA BARRA   — 100 783 pts
5º USF PEDRO SANTINO   —  99 773 pts
6º USF DE SANTO ANTONIO—  96 150 pts
7º USF CAFEZAL         —  96 133 pts
...
ORDER: OK (totalScore estritamente decrescente)
```

---

## 3. Arquivos Alterados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `Apps/server/api/src/routes/pec-api.ts` | Fix | Sort por `totalScore DESC` após map; `badgesCount` baseado em rank real |
| `Apps/server/api/src/indicators/__tests__/b360-dashboard-ranking.test.ts` | Test | 13 testes: fórmula de score, sort DESC, badgesCount pós-sort, pipeline completo |

---

## 4. Testes

```
13 novos testes em b360-dashboard-ranking.test.ts
Suíte completa: 722 passing (node:test) + 42/42 (vitest) — exit 0
```

Testes cobrem:
- Fórmula `computeScore` (pesos 1, 0.35, 0.20)
- Reprodução do cenário de inversão (menos atendimentos + mais vacinas → score maior)
- Invariante de sort DESC por `totalScore`
- Atribuição de `badgesCount` após sort (não antes)
- Pipeline completo: map → sort → assign

---

## 5. Gates

| Gate | Status |
|------|--------|
| Typecheck | **PASS** — 0 erros |
| Build | **PASS** — RELEASE_READY=true |
| Tests | **PASS** — 722+42 / exit 0 |
| Lint | **PASS** |
| LGPD/Secrets | **PASS** — sem CPF/CNS nos arquivos modificados |

---

## 6. Smoke Visual Runtime 3003

**URL:** `http://127.0.0.1:3003/dashboard`  
**Horário:** 2026-05-25T19:03–19:05Z

| Critério | Verificado |
|----------|-----------|
| 1º USF BARRA NOVA com 151 197 pts (maior score) | ✅ |
| 2º USF OURO VERDE com 148 400 pts | ✅ |
| 3º USF PRIMAVERA com 118 261 pts | ✅ |
| Ranking continua em seção full-width | ✅ |
| M1 e M2 continuam "Sem denominador" | ✅ |
| API confirma `ORDER: OK (descending totalScore)` | ✅ |

### API Audit (live)
```
node -e "...call /api/pec/dashboard/cards..."
ORDER: OK (descending totalScore) — 12 teams verified
```

---

## 7. Critério de Ordenação

O score é composto por:
- **Atendimentos individuais** × 1.0 (peso total)
- **Visitas domiciliares** × 0.35
- **Vacinações** × 0.20

A equipe com maior `totalScore` fica em 1º. O critério é explicitamente documentado no código com comentário.

---

## 8. Rollback

```bash
git revert HEAD --no-edit
corepack pnpm build
docker compose --env-file .env -f docker/01-compose/compose.production.yml build --no-cache
docker compose --env-file .env -f docker/01-compose/compose.production.yml up -d
```

---

## 9. Próximas 3 Ações

1. **Exibir critério na UI** — adicionar tooltip ou legenda no cabeçalho do ranking explicando o cálculo (atendimentos + visitas×0.35 + vacinas×0.20)
2. **Smoke responsivo** — verificar layout do pódio em viewport 768px (tablet, 2 colunas)
3. **Índice de performance** — avaliar se vacinações deveriam ter peso maior (0.20 vs 0.35) dado que influenciam fortemente o score composto
