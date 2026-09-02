# Relatório de Implementação C2 e C3 — Saúde Brasil 360

> **Data:** 2026-05-22
> **Status:** IMPLEMENTED_WITH_WARNINGS
> **Branch:** `main`

---

## 1. Escopo

Reescrita completa dos indicadores C2 e C3 do Saúde Brasil 360, substituindo os cálculos herdados do Previne Brasil pelos cálculos oficiais conforme notas metodológicas SAPS/MS 2025.

## 2. O que mudou

### indicador-c2.ts — Cuidado no Desenvolvimento Infantil

| Aspecto | Antes (Previne) | Depois (B360) |
|---|---|---|
| Nome | Gestantes: sífilis e HIV | Cuidado no desenvolvimento infantil |
| Público-alvo | Gestantes | Crianças ≤2 anos |
| Boas práticas | 0 (contagem simples) | 5 BPs × 20pts = 100 |
| Métrica | % gestantes c/ exames | Média score por criança |
| metricKind | percentage | mean |
| eAP 76 | N/A | BP(D) excluída, max=80 |
| Faixas | Não implementadas | Ótimo/Bom/Suficiente/Regular |
| Tabelas | 4 | 5 (+tb_fat_cidadao_pec, +tb_fat_visita_domiciliar, +tb_fat_vacinacao) |

**5 Boas Práticas implementadas:**
- (A) 1ª consulta puericultura ≤30 dias — 20pts
- (B) 9 consultas puericultura até 2 anos — 20pts
- (C) 9 registros peso+altura simultâneos — 20pts
- (D) 2 visitas ACS/TACS até 2 anos — 20pts (excluída eAP 76)
- (E) Vacinação completa — 20pts

### indicador-c3.ts — Cuidado na Gestação e Puerpério

| Aspecto | Antes (Previne) | Depois (B360) |
|---|---|---|
| Nome | Gestantes: atendimento odontológico | Cuidado na gestação e puerpério |
| Boas práticas | 1 (odonto) | 11 BPs (A-K) = 100pts |
| Métrica | % gestantes c/ odonto | Média score por gestante |
| metricKind | percentage | mean |
| eAP 76 | N/A | BPs (E)+(J) excluídas, max=82 |
| Tabelas | 3 | 7 (+tb_fat_visita_domiciliar, +tb_fat_vacinacao, +tb_fat_atd_ind_exames, +tb_dim_procedimento) |

**11 Boas Práticas implementadas:**
- (A) Captação precoce ≤12ª semana — 10pts
- (B) 7 consultas pré-natal — 9pts
- (C) 7 aferições PA — 9pts
- (D) 7 registros peso+altura — 9pts
- (E) 3 visitas ACS/TACS — 9pts (excluída eAP 76)
- (F) Vacina dTpa ≥20ª semana — 9pts
- (G) Testes 1º tri (sífilis+HIV+HepB+HepC) — 9pts
- (H) Testes 3º tri (sífilis+HIV) — 9pts
- (I) Consulta puerperal — 9pts
- (J) Visita puerperal ACS/TACS — 9pts (excluída eAP 76)
- (K) Saúde bucal na gestação — 9pts

### boas-praticas-exames-gestante.ts (NOVO)

Módulo reutilizável extraído do antigo indicador-c2.ts. Contém:
- Códigos SIGTAP completos para sífilis, HIV, HepB, HepC (NM C3 Quadro 07)
- Função `checkExamesGestante()` com fallback tb_fat_atd_ind_exames → ds_filtro_proced_*

### implement-c2-c3-after-doc-audit.prompt.md (CORRIGIDO)

Pontuação corrigida:
- C2: 10pts → **20pts** por BP (total 50 → **100**)
- C3: todos 10pts → **A=10, B-K=9** (total 100, mantido)
- C3 F e J: 5pts → **9pts** (corrigido)
- Adicionadas faixas de classificação oficiais

## 3. Reaproveitamento de código

- Lógica de exames sífilis/HIV do antigo `indicador-c2.ts` → módulo `boas-praticas-exames-gestante.ts` → usado por C3 BPs G e H
- Lógica de odonto gestante do antigo `indicador-c3.ts` → incorporada em C3 BP K

## 4. Contrato tRPC

Mantido intacto. `router.ts` não foi alterado. As funções exportadas (`calcularC2ComEvidencia`, `calcularC3ComEvidencia`) mantêm a mesma assinatura `(pool, IndicatorCalculationInput) → B360IndicatorResult`.

## 5. Validações marcadas UNKNOWN_OFFICIAL_VALIDATION_NEEDED

1. **CBO filter**: queries não aplicam filtro explícito por CBO nas tabelas de atendimento — pendente confirmar schema PEC real
2. **BP(E) C2 vacinação**: usa heurística de ≥4 imunobiológicos distintos — pendente esquema vacinal exacto
3. **tb_fat_cidadao_pec schema**: colunas `dt_nascimento`, `co_dim_equipe` assumidas — confirmar em runtime
4. **tp_equipe para eAP 76**: coluna `tp_equipe` em tb_dim_equipe assumida

## 6. Degradação graceful

Tabelas opcionais (visita domiciliar, vacinação, odonto, exames) são verificadas via `checkTable()`. Se ausentes:
- BPs dependentes retornam `false` (não pontuadas)
- Warning adicionado ao resultado (`C2_BP_D_DEGRADED`, `C3_BP_K_DEGRADED`, etc.)
- Indicador não bloqueia — calcula com as BPs disponíveis

## 7. LGPD

- Nenhum CPF, CNS, nome, ou dado nominal retornado
- Logs não expõem dados sensíveis
- Contadores agregados (não nominais)
- PEC read-only mantido (zero INSERT/UPDATE/DELETE)

## 8. Ficheiros commitados

| Ficheiro | Tipo |
|---|---|
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c2.ts` | Reescrita completa |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts` | Reescrita completa |
| `Apps/server/api/src/saude-brasil-360/indicadores/boas-praticas-exames-gestante.ts` | Novo módulo |
| `docs/11-indicator-field-catalog/prompts/implement-c2-c3-after-doc-audit.prompt.md` | Correção pontuação |

## 9. Riscos

1. **typecheck/build não executado** — ambiente sandbox sem pnpm. Testar localmente.
2. **CBO filter ausente** — queries podem retornar atendimentos de CBOs não elegíveis
3. **Schema PEC variável** — colunas como `nu_peso`, `nu_altura`, `tp_equipe` podem não existir em todas as instâncias PEC
4. **Performance** — loop por criança/gestante pode ser lento com >5000 registros. LIMIT 5000 aplicado.
5. **catalog.ts não alterado** — `implemented` permanece `false` para C2/C3 até test pass

## 10. Gates pendentes

- [ ] `pnpm typecheck` — confirmar compilação
- [ ] `pnpm test` — confirmar testes existentes não quebraram
- [ ] Smoke test com réplica PEC real — confirmar queries executam
- [ ] Atualizar `catalog.ts` para `implemented: true` após gates verdes
- [ ] Atualizar `indicator-registry.json` com `implementation_status: "implemented"`
- [ ] PR com evidência

## 11. Rollback

```bash
git revert <commit-hash>
```

## 12. Próximas 3 ações

1. **Validar build local:** `pnpm typecheck && pnpm build` — confirmar que reescrita compila
2. **Smoke test com réplica PEC:** executar `scripts/tests/shared/smoke-saude360.mjs` para C2 e C3
3. **Implementar filtro CBO:** adicionar validação explícita de CBO nas queries de cada BP
