# Relatório Final — Ronda Documental PASSO 0-13

> **Data:** 2026-05-21
> **Estado:** `DONE_DOCS_ONLY`
> **Commit:** BLOCKED — `.git/index.lock` impede staging automatizado; comando manual fornecido abaixo.

---

## Executive summary

Ronda documental completa. Todas as 21 métricas operacionais do Saúde Brasil 360 (15 Qualidade APS + 6 CVAT) estão agora documentadas em registo canónico JSON com 31 campos por entrada, validadas contra 15 notas metodológicas oficiais + NT 30/2025 + Portaria 6.907/2025. A regressão conceptual C2.1/C2.2/C3.1/C3.2/C5.1/C5.2 foi bloqueada permanentemente com headers OBSOLETO, avisos em ficheiros de contexto e regras em AGENTS.md. A terminologia "subindicadores CVAT" foi substituída por "regras operacionais CVAT" em 9+ ficheiros.

---

## Conectores utilizados

- **Filesystem local** (Read/Write/Edit): acesso directo ao workspace montado
- **Bash sandbox**: validação JSON, grep, verificação diff
- **Nenhum conector externo** (GitHub MCP não disponível — `GITHUB_REPO_NOT_CONNECTED_LOCAL_ONLY`)

---

## Fontes consultadas

| Fonte | Tipo | Método |
|---|---|---|
| 15 Notas Metodológicas (B1-B6, C1-C7, M1-M2) | PDF local | pymupdf via bash |
| NT nº 30/2025-CGESCO/DESCO/SAPS/MS | PDF local | pymupdf via bash |
| Portaria GM/MS 6.907/2025 | Web | web_fetch (confirmação Anexo V) |
| Portaria GM/MS 3.493/2024 | Web + local | web_fetch |
| Portaria SAPS/MS 161/2024 | Web + local | web_fetch |
| Apresentação componente qualidade | PDF local | pymupdf |
| Código canónico (types.ts, catalog.ts, router.ts, cvat/) | Ficheiros source | Read tool |

---

## Ficheiros criados (5 novos)

| Ficheiro | Tamanho | Descrição |
|---|---|---|
| `.ai/CONTEXT/indicator-registry.json` | ~44KB | Registo canónico JSON — 21 entradas × 31 campos |
| `.github/context/unification-map.md` | ~2KB | Mapa de unificação origem→destino |
| `docs/11-indicator-field-catalog/official-indicators-registry.md` | ~8KB | Registo canónico MD com proveniência |
| `docs/13-saude-brasil-360/validation-checklist.md` | ~4KB | Checklist 14 colunas (QualAPS) + 9 colunas (CVAT) |
| `docs/13-saude-brasil-360/indicator-validation-report.md` | ~5KB | Relatório de validação com evidências |

## Ficheiros editados (15 existentes)

| Ficheiro | Tipo de edição |
|---|---|
| `regras de contribuiÃ§Ã£o do projeto` | +bloco Saúde Brasil 360 (19 linhas) |
| `.github/AGENTS.md` | +bloco escopo indicadores (13 linhas) |
| `.github/agents/sus-analytics-sync.agent.md` | +escopo + regras 1-10 + limites extras |
| `.github/context/project_brief.md` | Escopo + registros + superfícies |
| `docs/11-indicator-field-catalog/README.md` | Escopo 21 + status CVAT |
| `docs/11-indicator-field-catalog/operational-matrix.md` | "regras operacionais CVAT" |
| `docs/11-indicator-field-catalog/implementation-backlog-ind21.md` | Escopo header + CVAT backlog |
| `docs/11-indicator-field-catalog/matriz-operacional-*` | AVISO 2026-05-21 + terminologia |
| `docs/10-indicators/saude-brasil-360-coverage-matrix.json` | "Qualidade APS" qualifier |
| `docs/11-indicator-field-catalog/subindicators/C2.1.md` | +header OBSOLETO |
| `docs/11-indicator-field-catalog/subindicators/C2.2.md` | +header OBSOLETO |
| `docs/11-indicator-field-catalog/subindicators/C3.1.md` | +header OBSOLETO |
| `docs/11-indicator-field-catalog/subindicators/C3.2.md` | +header OBSOLETO |
| `docs/11-indicator-field-catalog/subindicators/C5.1.md` | +header OBSOLETO |
| `docs/11-indicator-field-catalog/subindicators/C5.2.md` | +header OBSOLETO |

## Ficheiros arquivados (6 cópias em docs/temp/)

- `docs/temp/C2.1.md`, `C2.2.md`, `C3.1.md`, `C3.2.md`, `C5.1.md`, `C5.2.md`
- **Nota:** `docs/temp/` está em `.gitignore` — cópias servem apenas como backup local.

---

## Tabela A — Comparação antes/depois (ficheiros)

| Ficheiro | Antes | Depois |
|---|---|---|
| `indicator-registry.json` | não existia | 21 entradas × 31 campos, JSON válido |
| `unification-map.md` | não existia | 14 entradas, 13/14 feito |
| `official-indicators-registry.md` | não existia | Registry MD com proveniência |
| `validation-checklist.md` | não existia | 21/21 validados local PDF |
| `indicator-validation-report.md` | não existia | 2 CRITICAL + 3 HIGH documentados |
| `regras de contribuiÃ§Ã£o do projeto` | sem bloco SB360 | +19 linhas regras canónicas |
| `AGENTS.md` | sem escopo indicadores | +13 linhas com proibição C2.1 |
| `sus-analytics-sync.agent.md` | "6 subindicadores CVAT" | "6 regras operacionais CVAT" + regras 3-5 |
| `project_brief.md` | "6 subindicadores CVAT" | "6 regras operacionais CVAT" + JSON ref |
| Subindicators C2.1–C5.2 | activos sem aviso | header OBSOLETO em cada um |

## Tabela B — Comparação antes/depois (indicadores)

| Código | Antes (estado doc) | Depois (estado doc) |
|---|---|---|
| B1-B6 | sem registry JSON | validated_local_pdf_only, partially_aligned |
| C1 | sem faixa ótima documentada | faixa ótima HIGH pendência registada |
| C2 | wrong_indicator_mapping não documentado | CRITICAL documentado, registry correcto |
| C3 | wrong_indicator_mapping não documentado | CRITICAL documentado, registry correcto |
| C4-C7 | parcial | partially_aligned, pendências registadas |
| M1-M2 | parcial | partially_aligned, escopo proxy documentado |
| CVAT1-6 | "subindicadores" | "regras operacionais", derived-operational-rule |

---

## Checks executados

| Check | Resultado |
|---|---|
| JSON válido (`indicator-registry.json`) | PASS |
| 21 entradas no registry | PASS |
| Grep "subindicadores CVAT" activo (fora de notas históricas) | PASS (0 activos) |
| Grep CPF/CNS/token/secret em novos ficheiros | PASS (0 exposições) |
| Grep C2.1/C3.1/C5.1 activo (fora de avisos OBSOLETO) | PASS |
| Ficheiros confinados a docs/ e .github/ | PASS |
| Nenhum ficheiro src/ editado | PASS |
| Nenhuma migration executada | PASS |

---

## Pendências (fora do escopo desta ronda)

1. **C2 reescrita CRITICAL** — código implementa sífilis/HIV gestantes (Previne Brasil); oficial: 5 boas práticas crianças ≤2a
2. **C3 reescrita CRITICAL** — código implementa 1/11 boas práticas; oficial: 11 boas práticas A-K gestação+puerpério
3. **C1/B3/B5 faixa ótima HIGH** — código trata como percentual simples; oficialmente têm limiares bilaterais
4. **Validação web** — notas metodológicas individuais não publicadas online (apenas portarias enquadrantes)
5. **SQL CVAT** — regras derivadas da NT 30/2025 sem validação runtime
6. **CVAT6** — depende de API Meu SUS Digital (externa)
7. **`docs/15-compliance-comparative/README.md:37`** — "15 indicadores" precisa qualificação "Qualidade APS" (fora do diff mínimo)

---

## Riscos residuais

- **Drift agente Rust**: `IND_21` interno pode reintroduzir confusão se sincronizado sem contexto
- **CI/CD**: nenhum test automatizado valida nomenclatura nos docs
- **Portaria futura**: MS pode publicar notas metodológicas detalhadas que alterem fórmulas CVAT
- **Lock file**: `.git/index.lock` impede commit automatizado

---

## Checklist LGPD

- [x] Nenhum CPF/CNS completo nos ficheiros criados/editados
- [x] Nenhum token, JWT ou credencial exposta
- [x] Nenhuma URL com dados sensíveis
- [x] Nenhum dado nominal de paciente
- [x] Nenhum segredo de ambiente (.env values)

---

## Decisão de commit

**Elegível: SIM** (todas as condições satisfeitas)
- Repositório correcto: `sus-analytics-sync`
- Alterações confinadas a `docs/` e `.github/`
- Sem segredos
- Checks passaram
- Diff revisto

**Bloqueio técnico**: `.git/index.lock` impede `git add` do sandbox.

### Comando manual para commit:

```bash
cd D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync

# Remover lock se existir
del .git\index.lock

# Stage apenas ficheiros desta ronda
git add ^
  .ai/CONTEXT/indicator-registry.json ^
  .github/context/unification-map.md ^
  docs/11-indicator-field-catalog/official-indicators-registry.md ^
  "docs/13-saude-brasil-360/validation-checklist.md" ^
  "docs/13-saude-brasil-360/indicator-validation-report.md" ^
  "docs/13-saude-brasil-360/relatorio-final-passo0-13.md" ^
  regras de contribuiÃ§Ã£o do projeto ^
  .github/AGENTS.md ^
  .github/agents/sus-analytics-sync.agent.md ^
  .github/context/project_brief.md ^
  docs/11-indicator-field-catalog/README.md ^
  docs/11-indicator-field-catalog/operational-matrix.md ^
  docs/11-indicator-field-catalog/implementation-backlog-ind21.md ^
  "docs/11-indicator-field-catalog/matriz-operacional-indicadores-subindicadores.md" ^
  "docs/10-indicators/saude-brasil-360-coverage-matrix.json" ^
  docs/11-indicator-field-catalog/subindicators/C2.1.md ^
  docs/11-indicator-field-catalog/subindicators/C2.2.md ^
  docs/11-indicator-field-catalog/subindicators/C3.1.md ^
  docs/11-indicator-field-catalog/subindicators/C3.2.md ^
  docs/11-indicator-field-catalog/subindicators/C5.1.md ^
  docs/11-indicator-field-catalog/subindicators/C5.2.md

# Commit
git commit -m "docs(saude-brasil-360): unify 21 operational metrics registry and block C2.1/C3.1/C5.1 regression

- Create canonical JSON registry (21 entries x 31 fields)
- Create unification map and validation report
- Replace 'subindicadores CVAT' with 'regras operacionais CVAT' (9+ files)
- Add OBSOLETO headers to C2.1/C2.2/C3.1/C3.2/C5.1/C5.2 subindicator files
- Add prohibition rules to AGENTS.md, regras de contribuiÃ§Ã£o do projeto
- Document C2/C3 CRITICAL wrong_indicator_mapping
- Document C1/B3/B5 HIGH faixa otima missing
- Validate all 21 metrics against local PDF sources

Refs: Portaria 6.907/2025, NT 30/2025, Portaria 3.493/2024"
```

---

## Próximas 3 ações

1. **Executar commit manual** — rodar o bloco acima no terminal local (remover `.git/index.lock` primeiro)
2. **ETAPA 3 — Reescrita C2/C3** — implementar indicadores correctos (C2: desenvolvimento infantil ≤2a, C3: gestação+puerpério 11 boas práticas A-K) no código source
3. **ETAPA 4 — Faixa ótima C1/B3/B5** — implementar lógica bilateral (teto+piso) em vez de percentual simples

---

*Gerado automaticamente — ronda documental PASSO 0-13, 2026-05-21.*
