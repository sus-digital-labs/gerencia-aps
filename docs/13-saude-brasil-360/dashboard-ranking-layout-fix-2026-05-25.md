# Dashboard — Ranking de Equipes Layout Expansion

**Data:** 2026-05-25  
**Status:** `DONE_RANKING_LAYOUT_EXPANDED_AND_VALIDATED`

---

## 1. Status Final

`DONE_RANKING_LAYOUT_EXPANDED_AND_VALIDATED` — Ranking saiu da sidebar estreita e agora aparece como seção full-width abaixo dos cards de indicadores. Validado visualmente no runtime 3003.

---

## 2. Diagnóstico Inicial

No runtime `http://127.0.0.1:3003/dashboard`:
- `Ranking de Equipes` era renderizado dentro do sidebar direito (`xl:col-span-1`) junto com `QualityScoreCard`
- Com 15 indicadores na coluna principal e ranking na mesma altura, as listas de equipes ficavam comprimidas em ~300px de largura
- O pódio (top 3) era renderizado em grid de 3 colunas dentro de ~280px úteis — texto cortado, nome de equipe truncado

---

## 3. Causa Raiz

`Leaderboard.tsx` tinha um único layout (sidebar-style). Não havia suporte a `variant`.  
`Dashboard.tsx` renderizava `<Leaderboard />` dentro de `<div className="space-y-6">` que era o `xl:col-span-1` da grid principal.

---

## 4. Solução Implementada

### `Apps/web/client/src/components/gamification/Leaderboard.tsx`

- Adicionado prop `variant?: "sidebar" | "section"` (default: `"sidebar"`)
- Componente interno `LeaderboardSidebar` — layout original preservado para compatibilidade
- Componente interno `LeaderboardSection` — novo layout full-width:
  - Header com trophy icon + título + subtítulo "Classificação por desempenho nos indicadores"
  - Seção "Pódio" com label uppercase
  - Top 3 em grid responsivo: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (igual-altura, não escalonado)
  - Cada card top-3: rank + ícone | nome + tipo + metas | pontuação + conquistas
  - Seção "Demais equipes" com label uppercase
  - Cada linha: position badge | nome + tipo + metas + conquistas | pts + trend

### `Apps/web/client/src/pages/Dashboard.tsx`

- Removido `<Leaderboard teams={teamScores} showPodium={true} />` da sidebar direita
- Sidebar agora contém apenas `<QualityScoreCard />`
- Inserido `<Leaderboard teams={teamScores} showPodium={true} variant="section" />` como seção separada, abaixo do `grid xl:grid-cols-4`, antes das visualizações inferiores (VaccinationCoverage/ChronicConditions/HomeVisits)

**Fonte de dados preservada:** mesmo `dashboardCards?.leaderboard.items` mapeado para `teamScores`. Nenhuma nova chamada API.

---

## 5. Antes × Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Posição do ranking | Sidebar direita `xl:col-span-1` (~300px) | Seção full-width (`max-w-[1600px]`) |
| Top 3 layout | Grid 3-cols em ~280px úteis — texto cortado | Grid igual-altura em largura total — legível |
| Sidebar conteúdo | QualityScoreCard + Leaderboard completo | Apenas QualityScoreCard |
| Lista demais equipes | Espaço < 250px por linha | Linhas full-width com nome + tipo + pts + trend |
| Posição relativa | À direita dos indicadores (mesma altura) | Abaixo dos indicadores (seção dedicada) |

---

## 6. Layout Responsivo

| Breakpoint | Top 3 | Lista demais |
|-----------|-------|--------------|
| Mobile (<640px) | 1 coluna | 1 coluna full-width |
| Tablet (640px–1024px) | 2 colunas | 1 coluna full-width |
| Desktop (>1024px) | 3 colunas iguais | 1 coluna full-width |

---

## 7. Gates

| Gate | Status |
|------|--------|
| Typecheck | **PASS** — 0 erros |
| Build | **PASS** — RELEASE_READY=true, Vite build concluído |
| Tests | **PASS** — 42/42 |
| Lint | **PASS** |
| LGPD/Secrets | **PASS** — zero CPF/CNS/token nos arquivos modificados |

---

## 8. Smoke Visual Runtime 3003

**URL:** `http://127.0.0.1:3003/dashboard`  
**Horário:** 2026-05-25T18:41–18:44Z

| Critério | Verificado |
|----------|-----------|
| Sidebar direita contém apenas "Qualidade dos Dados" | ✅ |
| Ranking NÃO aparece mais na sidebar | ✅ |
| Header "Ranking de Equipes" com trophy icon em seção full-width | ✅ |
| Subtítulo "Classificação por desempenho nos indicadores" | ✅ |
| Top 3 em 3 cards iguais (1º USF OURO VERDE, 2º USF BARRA NOVA, 3º USF PRIMAVERA) | ✅ |
| Demais equipes em linhas largas legíveis (4º–10º visíveis) | ✅ |
| M1 mostra "Sem denominador" (não bloqueado) | ✅ |
| M2 mostra "Sem denominador" (não bloqueado) | ✅ |
| Console sem erros | ✅ |

---

## 9. Rebuild/Restart

```
docker compose --env-file .env -f docker/01-compose/compose.production.yml down
docker compose --env-file .env -f docker/01-compose/compose.production.yml build --no-cache
docker compose --env-file .env -f docker/01-compose/compose.production.yml up -d
```

Novo bundle: `assets/index-rC03Tgm-.js` com strings confirmadas:
- `B4_REFERENCE_POPULATION_MUNICIPALITY_LEVEL`
- `LeaderboardSection` (code-path)
- `Classifica` (subtítulo)

---

## 10. Rollback

```bash
git revert HEAD --no-edit
corepack pnpm build
docker compose build --no-cache && docker compose up -d
```

---

## 11. Próximas 3 Ações

1. **Smoke responsivo** — testar layout em viewport 768px (tablet) para confirmar top-3 em 2 colunas
2. **Ordenação do pódio** — verificar se score de 2º (151 197) > 1º (148 400) é comportamento esperado do backend ou inversão de ordenação no leaderboard API
3. **Teste automatizado** — adicionar teste React para `<Leaderboard variant="section" />` verificando que renderiza `.LeaderboardSection` e não `.LeaderboardSidebar`
