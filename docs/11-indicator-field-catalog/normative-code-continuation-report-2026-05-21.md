# Relatório de Continuidade Normativa — Saúde Brasil 360

> **Data:** 2026-05-21
> **Status:** PARTIAL
> **Tipo:** Correção documental + metadata de catálogo (sem implementação de cálculo)

---

## 1. Diagnóstico objetivo

Rodada de continuidade focada em alinhar documentação, registry canónico, metadata de catálogo (`catalog.ts`, `types.ts`) e ficheiros legados com o escopo oficial do Saúde Brasil 360. Nenhum cálculo real foi alterado. Os indicadores C2 e C3 agora têm nomes oficiais correctos no catálogo, mas o código de cálculo (`indicador-c2.ts`, `indicador-c3.ts`) ainda implementa indicadores do Previne Brasil.

## 2. Causa raiz

A migração do Previne Brasil para o Saúde Brasil 360 herdou mapeamentos semânticos errados:
- **C2**: código implementa "Gestantes: sífilis e HIV" (Previne). Oficial B360: "Cuidado no Desenvolvimento Infantil" (5 boas práticas crianças ≤2a).
- **C3**: código implementa "atendimento odontológico gestante" (1 boa prática). Oficial B360: "Cuidado na Gestação e Puerpério" (11 boas práticas A-K).
- **CVAT**: catálogo dizia "Cobertura Vacinal em Tempo Adequado". Oficial: "Vínculo e Acompanhamento Territorial" (NT 30/2025).

## 3. Ficheiros lidos

| Ficheiro | Tipo |
|---|---|
| `.ai/CONTEXT/indicator-registry.json` | canonical-registry |
| `docs/11-indicator-field-catalog/official-indicators-registry.md` | canonical-docs |
| `docs/11-indicator-field-catalog/normative-code-compatibility-audit.md` | audit-report |
| `docs/13-saude-brasil-360/indicator-validation-report.md` | validation-report |
| `docs/13-saude-brasil-360/validation-checklist.md` | checklist |
| `docs/28-migrations/saude-brasil-360-plan.md` | migration-plan |
| `docs/34-product/competitive-coverage-matrix.md` | product-docs |
| `Apps/server/api/src/saude-brasil-360/catalog.ts` | source-catalog |
| `Apps/server/api/src/saude-brasil-360/types.ts` | source-types |
| 15 Notas Metodológicas (B1-B6, C1-C7, M1-M2) | official-source |
| NT nº 30/2025-CGESCO/DESCO/SAPS/MS | official-source |
| Portaria GM/MS 6.907/2025 | official-source |

## 4. Ficheiros alterados

| Ficheiro | Tipo de alteração | Escopo |
|---|---|---|
| `Apps/server/api/src/saude-brasil-360/catalog.ts` | Nomes C2/C3/CVAT + `implemented: false` para C2/C3 + comentário AVISO | metadata only |
| `Apps/server/api/src/saude-brasil-360/types.ts` | Nomes C2/C3/CVAT + comentários WRONG_INDICATOR_MAPPING | metadata only |
| `docs/28-migrations/saude-brasil-360-plan.md` | Aviso de mapeamento legado no topo | docs |
| `docs/34-product/competitive-coverage-matrix.md` | Aviso de mapeamento legado no topo | docs |

## 5. Achados corrigidos

1. `catalog.ts` C2: "Gestantes: sífilis e HIV" → "Cuidado no desenvolvimento infantil", `implemented: false`
2. `catalog.ts` C3: "Gestantes: atendimento odontológico" → "Cuidado na gestação e puerpério", `implemented: false`
3. `catalog.ts` CVAT: "Cobertura Vacinal em Tempo Adequado" → "Vínculo e Acompanhamento Territorial"
4. `catalog.ts` header: "13 indicadores" → "15 indicadores de Qualidade APS + CVAT"
5. `types.ts` C2/C3/CVAT: mesmas correcções de nome + comentários WARNING
6. `saude-brasil-360-plan.md`: aviso de mapeamento legado adicionado
7. `competitive-coverage-matrix.md`: aviso de mapeamento legado adicionado

## 6. Achados ainda pendentes

| Código | Pendência | Risco | Próxima ação |
|---|---|---|---|
| C2 | Cálculo em `indicador-c2.ts` implementa Previne Brasil | CRITICAL | Reescrever com 5 boas práticas (próxima rodada) |
| C3 | Cálculo em `indicador-c3.ts` cobre apenas 1/11 boas práticas | CRITICAL | Reescrever com 11 boas práticas A-K (próxima rodada) |
| C1 | Faixa ótima não implementada no código | HIGH | Implementar classificação bilateral |
| B3 | Faixa ótima (taxa de exodontia) não implementada | HIGH | Implementar limiares |
| B5 | Faixa ótima com limite superior não implementada | HIGH | Implementar limiares |
| C4 | Pesos de boas práticas pendentes | MEDIUM | Validar com nota metodológica |
| C6 | Exceção eAP tipo 76 pendente | MEDIUM | Implementar exceção |
| C7 | Pesos por coorte pendentes | MEDIUM | Validar com nota metodológica |
| CVAT1-6 | SQL não validada em runtime | MEDIUM | Teste de integração |
| CVAT6 | Depende de API Meu SUS Digital | BLOCKED | Aguardar API externa |

## 7. Matriz resumida

| Indicador | Status normativo | Status documental | Status metadata/catálogo | Status runtime | Risco | Próxima ação |
|---|---|---|---|---|---|---|
| B1 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | SIGTAP completo |
| B2 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Lista conclusivos |
| B3 | validated_local_pdf | aligned | aligned | partially_aligned | HIGH | Faixa ótima |
| B4 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Denominador oficial |
| B5 | validated_local_pdf | aligned | aligned | partially_aligned | HIGH | Faixa ótima |
| B6 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Lista restauradores |
| C1 | validated_local_pdf | aligned | aligned | partially_aligned | HIGH | Faixa ótima |
| C2 | validated_local_pdf | aligned | **corrigido** | **wrong_indicator_mapping** | CRITICAL | Reescrita completa |
| C3 | validated_local_pdf | aligned | **corrigido** | **wrong_indicator_mapping** | CRITICAL | Reescrita completa |
| C4 | validated_local_pdf | aligned | aligned | partially_aligned | MEDIUM | Pesos boas práticas |
| C5 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Pesos boas práticas |
| C6 | validated_local_pdf | aligned | aligned | partially_aligned | MEDIUM | Exceção eAP 76 |
| C7 | validated_local_pdf | aligned | aligned | partially_aligned | MEDIUM | Pesos coorte |
| M1 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Escopo eMulti proxy |
| M2 | validated_local_pdf | aligned | aligned | partially_aligned | LOW | Def. interprofissional |
| CVAT1-5 | derived_operational_rule | aligned | aligned | derived | MEDIUM | SQL validation |
| CVAT6 | derived_operational_rule | aligned | aligned | blocked | HIGH | API externa |

## 8. Bloqueios

1. **C2 implementação real** — não feita nesta rodada (escopo proibido)
2. **C3 implementação real** — não feita nesta rodada (escopo proibido)
3. **C1 classificação por faixa ótima** — pendente implementação
4. **CVAT fórmula final detalhada** — depende de nota metodológica oficial
5. **build/test/lint** — não executados (`.git/index.lock` + ambiente sandbox limitado)

## 9. Evidências

- grep por "Gestantes: sífilis" em `catalog.ts`: 0 ocorrências pós-edição
- grep por "Gestantes: atendimento odontológico" em `catalog.ts`: 0 ocorrências pós-edição
- JSON registry: 21 entradas válidas
- Ficheiros `indicador-c2.ts` e `indicador-c3.ts`: não alterados (cálculo intacto, nomes em catalog corrigidos)

## 10. Riscos

1. **Frontend pode mostrar nomes diferentes** se consumir `indicador-c2.ts` directamente em vez do catálogo
2. **Runtime C2/C3 continua calculando indicador errado** — front mostra resultado incorreto
3. **`implemented: false`** em C2/C3 pode ocultar esses indicadores em UIs que filtram por esse campo
4. **Legado Previne** em ficheiros de docs pode induzir erro se avisos forem ignorados

## 11. Rollback

```bash
git restore Apps/server/api/src/saude-brasil-360/catalog.ts
git restore Apps/server/api/src/saude-brasil-360/types.ts
git restore docs/28-migrations/saude-brasil-360-plan.md
git restore docs/34-product/competitive-coverage-matrix.md
```

## 12. Próximas 3 ações

1. **Implementar C2 real** — 5 boas práticas crianças ≤2a (ver prompt em `docs/11-indicator-field-catalog/prompts/implement-c2-c3-after-doc-audit.prompt.md`)
2. **Implementar C3 real** — 11 boas práticas A-K gestação+puerpério (reaproveitar código atual como boa prática K)
3. **Ajustar C1/B3/B5** — implementar classificação por faixa ótima com limiares oficiais
