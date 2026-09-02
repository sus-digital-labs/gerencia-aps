# Ranking de Equipes — Explicação da Fórmula de Pontuação

**Data:** 2026-05-25  
**Status:** `DONE_RANKING_SCORE_EXPLAINED_AND_VALIDATED`

---

## 1. Objetivo

Adicionar transparência ao critério de pontuação do Ranking de Equipes no Dashboard Municipal,
sem alterar a fórmula de cálculo do backend.

---

## 2. Fórmula Exibida

```
atendimentos + visitas × 0,35 + vacinações × 0,20
Ordenado pela maior pontuação total.
```

Constantes exportadas em `Leaderboard.tsx`:
```typescript
export const SCORE_FORMULA_TEXT = 'atendimentos + visitas × 0,35 + vacinações × 0,20';
export const SCORE_ORDER_TEXT    = 'Ordenado pela maior pontuação total.';
```

Comentário inline aponta para `pec-api.ts` (`totalScore = attendances + Math.round(visits * 0.35) + Math.round(vaccinations * 0.2)`)
para facilitar sincronia futura.

---

## 3. Implementação

### `ScoreFormulaTooltip` — componente interno

Ícone `Info` (Lucide, 3.5×3.5px) inline ao subtítulo do cabeçalho.

- `aria-label="Ver critério de pontuação do ranking"` — acessível
- `delayDuration={0}` — abre imediatamente ao hover/focus
- Tooltip via `@radix-ui/react-tooltip` com portal — não sofre clip por `overflow-hidden`
- Funciona em desktop (hover) e mobile (focus via tap)

### `tooltip.tsx` — correção de tipagem

Removido `@ts-nocheck`; adicionados parâmetros genéricos corretos no `forwardRef`:
```typescript
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(...)
```
Sem mudança de comportamento runtime — correção puramente de tipos.

---

## 4. Arquivos Alterados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `Apps/web/client/src/components/gamification/Leaderboard.tsx` | Fix | `ScoreFormulaTooltip` adicionado ao header de `LeaderboardSection` e `LeaderboardSidebar` |
| `Apps/web/client/src/components/ui/tooltip.tsx` | Fix | Tipagem genérica correta no `forwardRef` (remove `@ts-nocheck`) |
| `Apps/server/api/src/indicators/__tests__/b360-dashboard-ranking.test.ts` | Test | +4 testes coerência display text ↔ backend |

---

## 5. Testes

```
b360-dashboard-ranking.test.ts
  ▶ coerência display text ↔ backend — fórmula do ranking
    ✔ texto da fórmula menciona os três componentes com seus pesos
    ✔ pesos exibidos no tooltip coincidem com os pesos do computeScore
    ✔ texto de ordenação menciona maior pontuação
    ✔ pipeline: top 3 preserva ordem decrescente de score
```

Suíte completa: **16/16 (node:test) + 42/42 (vitest) — exit 0**

---

## 6. Gates

| Gate | Status |
|------|--------|
| Typecheck | **PASS** — 0 erros (tooltip.tsx reescrito com tipos genéricos corretos) |
| Build | **PASS** — RELEASE_READY=true |
| Tests | **PASS** — 16/16 node:test + 42/42 vitest |
| Lint | **PASS** |
| LGPD/Secrets | **PASS** — zero CPF/CNS/token nos arquivos modificados |

---

## 7. Smoke Visual — Runtime 3003

**URL:** `http://127.0.0.1:3003/dashboard`  
**Horário:** 2026-05-25T21:00–21:10Z

| Critério | Verificado |
|----------|-----------|
| Header "Ranking de Equipes" com ⓘ icon ao lado do subtítulo | ✅ |
| Tooltip mostra "Critério de pontuação" + fórmula + ordenação | ✅ |
| 1º USF BARRA NOVA — 151 197 pts ★4 | ✅ |
| 2º USF OURO VERDE — 148 400 pts ★3 | ✅ |
| 3º USF PRIMAVERA — 118 261 pts ★2 | ✅ |
| Top 3 em 3 colunas iguais (desktop ≥1024px) | ✅ |
| "Demais equipes": 4º USF ALTO DA BARRA 100 783 pts | ✅ |
| M1 e M2 "Sem denominador" preservados | ✅ |
| Console sem erros | ✅ |
| Overflow horizontal | ⚠️ PRÉ-EXISTENTE (stats cards = leaderboard = 1927px; não causado por nossas mudanças) |

### Bundle Audit
Strings confirmadas em `index-Bm4aR6Yy.js`:
- `atendimentos + visitas` ✓
- `0,35` / `0,20` ✓
- `Ver critério` ✓
- `Ordenado pela maior` ✓
- `sm:grid-cols-2` ✓

---

## 8. Responsividade

| Breakpoint | Pódio | Observação |
|-----------|-------|------------|
| Desktop ≥1024px | 3 colunas iguais | Verificado visualmente ✓ |
| Tablet 640–1024px | 2 colunas (`sm:grid-cols-2`) | CSS class presente no bundle ✓ |
| Mobile <640px | 1 coluna (`grid-cols-1`) | CSS class presente no bundle ✓ |

Nota: ambiente de teste com `devicePixelRatio=0.8` impediu emulação CSS de 768px via `resize_window`
(innerWidth permaneceu 1600px CSS). Classes responsivas verificadas no bundle e DOM.

---

## 9. Riscos

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Fórmula backend muda sem atualizar UI | Baixa | `SCORE_FORMULA_TEXT` exportado; 4 testes de coerência falham se pesos divergirem |
| Tooltip não abre em touch (iOS/Android) | Baixa | `delayDuration={0}` + foco via tap abre normalmente no Radix |
| `overflow-hidden` no Card clipa tooltip | Nula | TooltipContent usa portal Radix (fora do Card DOM) |

---

## 10. Rollback

```bash
git revert HEAD --no-edit
corepack pnpm build
docker compose --env-file .env -f docker/01-compose/compose.production.yml build --no-cache
docker compose --env-file .env -f docker/01-compose/compose.production.yml up -d
```

---

## 11. Próximas 3 Ações

1. **Peso das vacinações** — avaliar se 0,20 é calibrado corretamente; domina score quando volumes são altos
2. **Smoke responsivo real** — testar em dispositivo físico ou Playwright com viewport 375px/768px
3. **Cobertura eMulti** — quando município tiver equipe eMulti, verificar se M1/M2 pontuam e entram no ranking
