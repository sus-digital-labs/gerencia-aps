# Relatório de Auditoria — Escopo 21 Métricas Operacionais

> **Data:** 2026-05-21
> **Status:** PARTIAL
> **Repositório:** sus-analytics-sync (D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync)
> **Branch:** main

---

## 1. Diagnóstico objetivo

**Causa raiz:** O contexto do projeto acumulou referências inconsistentes ao escopo de indicadores. Múltiplos artefatos (docs, agents, skills, TODOs) declaravam "15 indicadores" como escopo completo, quando o escopo operacional correto do projeto são **21 métricas operacionais** (15 Qualidade APS + 6 CVAT). O CVAT existia no código e em source maps, mas não estava formalizado como parte do escopo canônico em igualdade com B/C/M.

**Inconsistência central encontrada:** A `matriz-operacional-indicadores-subindicadores.md` tratava "IND_21" como 15 indicadores + 6 subindicadores compostos (C2.1/C2.2/C3.1/C3.2/C5.1/C5.2), NÃO como 15 + 6 CVAT. Isso propagava confusão por todo o contexto.

---

## 2. Arquivos lidos (somente leitura)

| Arquivo | Proveniência |
|---|---|
| .github/agents/sus-analytics-sync.agent.md | docs-context |
| .github/AGENTS.md | docs-context |
| regras de contribuiÃ§Ã£o do projeto | docs-context |
| .github/context/saude-brasil-360-fontes.md | docs-context |
| .github/skills/update-context-pack/SKILL.md | docs-context |
| docs/Saúde Brasil 360/CADERNO_TECNICO_SAUDE_BRASIL_360.md | derived-context |
| docs/Saúde Brasil 360/MATRIZ_INDICADORES_CODIGO.md | derived-context |
| docs/Saúde Brasil 360/PRIORIDADE_SAUDE_BRASIL_360.md | derived-context |
| docs/Saúde Brasil 360/ANALISE_TABELAS_ESUS.md | derived-context |
| docs/Saúde Brasil 360/INDICE_COMPLETO.md | derived-context |
| docs/indicator-field-catalog/README.md | docs-context |
| docs/indicator-field-catalog/operational-matrix.md | docs-context |
| docs/indicator-field-catalog/implementation-backlog-ind21.md | docs-context |
| docs/indicator-field-catalog/matriz-operacional-indicadores-subindicadores.md | docs-context |
| docs/indicator-field-catalog/post-implementation-hardening.md | docs-context |
| docs/_context/cvat-source-map.md | docs-context |
| docs/_context/data_map.md | docs-context |
| docs/_context/api_map.md | docs-context |
| docs/product/minimum-replaceable-product.md | docs-context |
| docs/product/module-map.md | docs-context |
| docs/migrations/saude-brasil-360-plan.md | docs-context |
| Apps/web/todo.md | docs-context |
| uploads/campos-enumerados-dw.md | official-source |
| uploads/Indicadores Saúde Municipal.docx | official-source |

---

## 3. Arquivos alterados/criados NESTA SESSÃO

### Criados

| Arquivo | Tipo | Propósito |
|---|---|---|
| docs/indicator-field-catalog/official-indicators-registry.md | docs-context | Matriz canônica dos 21 indicadores — fonte única de verdade |
| .github/skills/saude-brasil-360-context-audit/SKILL.md | docs-context | Skill de auditoria de escopo 21 |
| .github/runbooks/saude-brasil-360-context-audit.md | docs-context | Runbook de auditoria contínua |
| notebooks/saude-brasil-360-indicator-audit.py | docs-context | Script de auditoria automatizada |
| docs/indicator-field-catalog/audit-scope-21-report-2026-05-21.md | docs-context | Este relatório |

### Editados

| Arquivo | Alteração |
|---|---|
| docs/indicator-field-catalog/README.md | Adicionado escopo 21, separação Qualidade APS / CVAT, status CVAT |
| docs/indicator-field-catalog/operational-matrix.md | Adicionada tabela CVAT1-CVAT6, corrigido "15 indicadores" → "15 indicadores de Qualidade APS" |
| docs/indicator-field-catalog/implementation-backlog-ind21.md | Adicionado banner escopo 21, backlog CVAT, regra permanente |
| docs/indicator-field-catalog/post-implementation-hardening.md | Adicionado banner escopo 21, CVAT como derived-operational-rule |
| docs/indicator-field-catalog/matriz-operacional-indicadores-subindicadores.md | Corrigido para clarificar que IND_21 no código é diferente do escopo 21 do projeto |
| .github/agents/sus-analytics-sync.agent.md | Adicionado escopo 21, regras de indicadores, limites expandidos |
| .github/AGENTS.md | Adicionado escopo 21 |
| regras de contribuiÃ§Ã£o do projeto | Adicionado escopo Saúde Brasil 360 com 21 métricas |
| .github/skills/update-context-pack/SKILL.md | Adicionada regra de escopo obrigatória |
| docs/product/minimum-replaceable-product.md | Corrigido "15 indicadores" → "21 métricas operacionais" |
| docs/product/module-map.md | Corrigido MOD-04 para 21 métricas |
| docs/migrations/saude-brasil-360-plan.md | Corrigido "15 indicadores" → "21 métricas operacionais" |
| docs/_context/data_map.md | Qualificado "15 indicadores" como "de Qualidade APS", adicionado CVAT |
| docs/_context/api_map.md | Adicionados endpoints CVAT, qualificado escopo |
| Apps/web/todo.md | Corrigido 3 referências de "15" para "21 métricas" |

---

## 4. Matriz de achados

| # | Achado | Arquivo(s) | Proveniência | Risco | Correção | Evidência |
|---|---|---|---|---|---|---|
| 1 | Escopo declarado como "15 indicadores" sem qualificação | 15+ arquivos MD | docs-context | ALTO — agentes reproduzem erro | Corrigido em 12 arquivos principais | grep final: referências restantes qualificam "Qualidade APS" |
| 2 | CVAT ausente da matriz operacional | operational-matrix.md | docs-context | ALTO — CVAT invisível no planejamento | Adicionada tabela CVAT1-CVAT6 | operational-matrix.md atualizado |
| 3 | IND_21 confundido com escopo 21 | matriz-operacional-*.md | docs-context | MEDIO — confusão conceitual | Nota histórica adicionada | Clarificação no arquivo |
| 4 | CVAT sem subindicadores canônicos | Vários docs | docs-context | ALTO — implementação sem referência | Criado official-indicators-registry.md | CVAT1-CVAT6 documentados |
| 5 | Agente principal sem regras de escopo | sus-analytics-sync.agent.md | docs-context | ALTO — agente pode propagar erro | Adicionadas 10 regras de escopo | Agente atualizado |
| 6 | B3 sem declaração de faixa ótima em alguns docs | Vários | docs-context | MEDIO — polaridade errada em cálculo | Corrigido no registry | Registry declara faixa ótima |
| 7 | C1 tratado como maior-melhor puro | Vários | docs-context | MEDIO — classificação errada | Corrigido no registry | Registry declara faixa com teto |
| 8 | Sem skill de auditoria 21 | .github/skills/ | docs-context | MEDIO — auditoria manual | Criada skill | SKILL.md criado |
| 9 | Sem runbook de auditoria 21 | .github/runbooks/ | docs-context | MEDIO — sem processo repetível | Criado runbook | Runbook criado |

---

## 5. Escopo final validado

| Componente | Qtd | Indicadores | Status geral |
|---|---|---|---|
| Qualidade APS — Saúde Bucal | 6 | B1-B6 | validated_runtime_public (B1 blocked_by_source) |
| Qualidade APS — Cuidado Integral | 7 | C1-C7 | histórico; C1 atualmente `C1_BLOCKED_BY_DATA_CONTRACT` |
| Qualidade APS — eMulti | 2 | M1-M2 | validated_runtime_public |
| CVAT | 6 | CVAT1-CVAT6 | derived-operational-rule |
| **Total** | **21** | | |

---

## 6. Itens bloqueados

| Item | Motivo | Tipo |
|---|---|---|
| CVAT1-CVAT5 | Nota metodológica oficial detalhada não publicada até 2026-05-20 | Falta de fonte oficial |
| CVAT6 | Fonte de satisfação não disponível no DW PEC | Falta de dado |
| CVAT3 | Dados PBF/BPC podem não estar na réplica PEC | Falta de dado |
| Build/test | pnpm não disponível no sandbox de auditoria; scripts requerem ambiente Windows | Falta de runtime |
| B1 denominador | Denominador normativo eSB não fechado | Falta de dado |
| Todos os 15 QualAPS | requires_official_validation pendente | Falta de validação normativa |

---

## 7. Comandos executados

| Comando | Resultado |
|---|---|
| git rev-parse --show-toplevel | sus-analytics-sync ✓ |
| git branch --show-current | main ✓ |
| git status --short | 549 arquivos modificados (pré-existentes) |
| rg "15 indicadores" *.md | 15 arquivos encontrados → corrigidos |
| rg "CVAT" *.md | 35 arquivos encontrados → contexto validado |
| rg "21 indicadores" *.md | 1 arquivo antes → agora em todos os pontos críticos |
| busca segredos nos novos arquivos | 0 achados ✓ |
| busca CPF/CNS nos novos arquivos | 0 achados ✓ |
| python3 syntax check notebook | OK ✓ |
| build/test/lint | BLOCKED — sandbox sem pnpm/powershell |

---

## 8. Riscos remanescentes

1. **Docs competitive/ e testing.md** ainda contêm "15 indicadores" em contexto de análise de mercado — são referências corretas (falam do componente de qualidade do MS) e não precisam de correção.
2. **docs/assumptions.md** linha 80 fala "15 indicadores auditados" — referência factual de uma auditoria anterior, não erro de escopo.
3. **CVAT sem nota metodológica detalhada** — qualquer implementação até publicação oficial é derivada e pode mudar.
4. **Build/test não rodados** — validação de runtime pendente até próxima execução em ambiente Windows/CI.

---

## 9. Rollback

Se necessário reverter as alterações desta sessão:

```bash
# Reverter arquivos editados
git checkout -- \
  docs/indicator-field-catalog/README.md \
  docs/indicator-field-catalog/operational-matrix.md \
  docs/indicator-field-catalog/implementation-backlog-ind21.md \
  docs/indicator-field-catalog/post-implementation-hardening.md \
  docs/indicator-field-catalog/matriz-operacional-indicadores-subindicadores.md \
  .github/agents/sus-analytics-sync.agent.md \
  .github/AGENTS.md \
  regras de contribuiÃ§Ã£o do projeto \
  .github/skills/update-context-pack/SKILL.md \
  docs/product/minimum-replaceable-product.md \
  docs/product/module-map.md \
  docs/migrations/saude-brasil-360-plan.md \
  docs/_context/data_map.md \
  docs/_context/api_map.md \
  Apps/web/todo.md

# Remover arquivos novos
git clean -f \
  docs/indicator-field-catalog/official-indicators-registry.md \
  docs/indicator-field-catalog/audit-scope-21-report-2026-05-21.md \
  .github/skills/saude-brasil-360-context-audit/SKILL.md \
  .github/runbooks/saude-brasil-360-context-audit.md \
  notebooks/saude-brasil-360-indicator-audit.py
```

**Impacto do rollback:** Retorna ao estado anterior com inconsistência de escopo 15 vs 21.

---

## 10. Checklist de QA

- [x] Registro canônico (21 métricas) criado e completo
- [x] Nenhum arquivo crítico declara escopo completo como apenas 15
- [x] CVAT separado de Qualidade APS em todos os docs atualizados
- [x] Polaridades especiais (B3, C1, B5) declaradas no registry
- [x] Agente principal atualizado com regras de escopo
- [x] Regras de contribuição do projeto atualizadas
- [x] Skill de auditoria criada
- [x] Runbook de auditoria criado
- [x] Script de auditoria automatizada criado
- [x] Nenhum segredo exposto nos novos arquivos
- [x] Nenhum CPF/CNS nos novos arquivos
- [ ] Build/test — BLOCKED (sandbox sem pnpm)
- [ ] Lint — BLOCKED (sandbox sem pnpm)
- [ ] Typecheck — BLOCKED (sandbox sem pnpm)

---

## 11. Próximas 3 ações

1. **Rodar build+test+lint em ambiente Windows/CI** para validar que as alterações de docs não quebraram nada; commit somente após gates passarem.
2. **Transformar CVAT1-CVAT5 em regras SQL validadas** contra tabelas reais do DW PEC, usando o cvat-source-map.md como guia e as tabelas já sincronizadas pelo agente Rust.
3. **Monitorar Diário Oficial para nota metodológica detalhada do CVAT** — quando publicada, atualizar official-indicators-registry.md e promover CVAT de `derived-operational-rule` para regra validada.
