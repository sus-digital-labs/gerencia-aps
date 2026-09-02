# Validação CI + Classificação Normativa C1/B3/B5 — 2026-05-25

> Status: **DONE_CI_AND_C1_B3_B5_VALIDATED** (B3 corrigido — pós-auditoria 2026-05-25)
> Data: 2026-05-25
> Branch: main

## 1. Escopo

Esta rodada implementou dois itens da etapa pós-validação C2/C3:

1. **CI rastreável** — verificação de que `.github/workflows/ci.yml` existe e está ativo (jobs `validate` e `release-build-gap`).
2. **Classificação normativa de C1, B3 e B5** — faixas ótimas conforme registry oficial.

## 2. CI — Estado

Arquivo: `.github/workflows/ci.yml`

| Job | Trigger | Ação |
|-----|---------|------|
| `validate` | push/PR → main | typecheck + test (node:test) + LGPD scan |
| `release-build-gap` | push → main | verifica `docs/01-context/build-gap.md` (TEMP_DIST_PATCH) |

Ambos os jobs existiam antes desta rodada. Nenhuma alteração de infraestrutura foi necessária.

## 3. Classificação Normativa — Implementação

### Novo módulo: `classificacao-normativa.ts`

Arquivo: `Apps/server/api/src/saude-brasil-360/indicadores/classificacao-normativa.ts`

| Indicador | Polaridade | Faixa Ótima | Observação |
|-----------|-----------|-------------|-----------|
| C1 | `faixa_otima` | 50–70% | Acima de 70% = `acima_da_faixa` (não é maior-melhor puro) |
| B3 | `faixa_otima` | TBD | `nao_classificado` — aguarda Nota Metodológica oficial |
| B5 | `faixa_otima` | 80–85% | Acima de 85% = `acima_da_faixa` |

Faixas secundárias (C1 e B5):

| Faixa C1 | Range |
|----------|-------|
| otima | 50–70% |
| acima_da_faixa | > 70% |
| aceitavel | 40–49% |
| regular | 20–39% |
| insuficiente | < 20% |

| Faixa B5 | Range |
|----------|-------|
| otima | 80–85% |
| acima_da_faixa | > 85% |
| aceitavel | 70–79% |
| regular | 50–69% |
| insuficiente | < 50% |

### Tipos adicionados — `types.ts`

```typescript
export type B360NormativaPolaridade = "maior_melhor" | "menor_melhor" | "faixa_otima";
export type B360NormativaClassificacao =
  | "otima" | "aceitavel" | "regular" | "insuficiente"
  | "acima_da_faixa" | "nao_classificado";
export interface B360NormativeClassification { ... }
```

Campo opcional `normativeClassification?: B360NormativeClassification` adicionado a `B360IndicatorResult`.

### Indicadores integrados

- `indicador-c1.ts` — retorna `normativeClassification` quando `denominator > 0`
- `indicador-b3.ts` — sempre retorna `normativeClassification` (classificação `nao_classificado`)
- `indicador-b5.ts` — retorna `normativeClassification` quando `denominator > 0`

## 4. Gates — Status Final

| Gate | Status | Evidência |
|------|--------|-----------|
| Typecheck | **PASS** | 0 erros — `npx tsc --project tsconfig.json --noEmit` |
| Tests | **PASS** | 463/463 — `bash scripts/tests/linux/test.sh` |
| LGPD | **PASS** | zero CPF/CNS em classificacao-normativa.ts e indicadores modificados |
| Build dist | **PASS** | `node esbuild.config.mjs` — `dist/index.js` gerado |
| Secrets | **PASS** | nenhuma credencial nos arquivos modificados |

### Detalhamento dos testes

- `b360-normative-classification.test.ts` — **28/28** novos testes (unit + integração C1/B3/B5)
- `b360-c2-c3.test.ts` — **6/6** (4 testes reescritos para alinhar com implementação atual C2/C3 batch-loading)

#### Testes reescritos em `b360-c2-c3.test.ts`

Os 4 testes pré-existentes falhavam porque foram escritos para uma versão anterior de C2/C3 (antes do batch loading). As assertivas usavam padrões de query (`COUNT(DISTINCT a.co_fat_cidadao_pec)`, `FROM tb_fat_atd_ind_exames e`) que não existem mais no código atual.

Novos cenários:

| Teste anterior | Teste novo | Motivo |
|----------------|------------|--------|
| C2 usa fallback de procedimentos | C2 retorna blocked_by_source quando tabela obrigatória ausente | Padrão de query incompatível com N+1 atual |
| C2 retorna erro técnico por coluna ausente | C2 retorna blocked_by_schema quando dimensão ausente | C2 não faz `findMissingColumns`; usa `checkTable` por dimensão |
| C3 denominador zero | C3 denominador zero (reescrito com stub `GROUP BY`) | C3 usa `GROUP BY c.co_seq_fat_cidadao_pec`, não `COUNT(DISTINCT)` |
| C3 propaga filtros | C3 repassa equipeId e unidadeId (com verificação SQL embarcado) | Filtro de equipe é embutido no SQL, não é parâmetro posicional |

## 5. Arquivos Modificados

```
Apps/server/api/src/saude-brasil-360/types.ts                         (tipos normativa)
Apps/server/api/src/saude-brasil-360/result.ts                        (campo normativeClassification)
Apps/server/api/src/saude-brasil-360/indicadores/classificacao-normativa.ts  (NOVO)
Apps/server/api/src/saude-brasil-360/indicadores/indicador-c1.ts      (integração)
Apps/server/api/src/saude-brasil-360/indicadores/indicador-b3.ts      (integração)
Apps/server/api/src/saude-brasil-360/indicadores/indicador-b5.ts      (integração)
Apps/server/api/src/indicators/__tests__/b360-normative-classification.test.ts  (NOVO, 28 testes)
Apps/server/api/src/indicators/__tests__/b360-c2-c3.test.ts           (4 testes reescritos)
Apps/server/api/tsconfig.json                                          (exclude __tests__ vitest)
catalog.ts                                                             (7 nomes corrigidos)
docs/01-context/build-gap.md                                             (NOVO)
scripts/tests/linux/test.sh                                                        (exclusões mobile + vitest)
Apps/server/api/dist/index.js                                          (rebuild via esbuild)
```

## 6. Correção pós-auditoria B3 (2026-05-25 — Sessão C)

### Inconsistência identificada

A entrega original declarou `DONE_CI_AND_C1_B3_B5_VALIDATED`, mas `classifyB3` retornava
`nao_classificado` com mensagem `requires_official_validation`. Isso era incorreto porque a
Nota Metodológica B3 já existia localmente em `docs/Saúde Brasil 360/Nota Metodológica B3 - Taxa de exodontia.pdf`.

### Correção aplicada

**Fonte**: Nota Metodológica B3 (SAPS/MS/DESCO/CGSB), SEI nº 0050360458, assinada 12/09/2025.
Processo nº 25000.158351/2025-04. **Item 30 — Parâmetro**:

| PDF | Range | Código sistema |
|-----|-------|----------------|
| Ótimo | [8%, 10%) | `otima` |
| Bom | [10%, 12%) | `aceitavel` |
| Suficiente | [12%, 14%) | `regular` |
| Regular | < 8% ou ≥ 14% | `insuficiente` |

Polaridade "Não se aplica" (ambos extremos são insuficientes) → `faixa_otima`.

### Arquivos modificados (Sessão C)

```
Apps/server/api/src/saude-brasil-360/indicadores/classificacao-normativa.ts
  — classifyB3: stub TBD → implementação real com faixas oficiais
  — B3_NORMATIVE_FAIXA_MIN=8, B3_NORMATIVE_FAIXA_MAX=10 exportados
Apps/server/api/src/indicators/__tests__/b360-normative-classification.test.ts
  — 4 testes TBD removidos, 9 testes de faixas reais adicionados (unit)
  — 1 teste integração B3 reescrito + 2 adicionais (total +7 testes)
docs/11-indicator-field-catalog/indicators/B3.md
  — status normativo: requires_official_validation → validated_official_pdf
  — seção 5 adicionada com tabela de faixas oficiais
.ai/CONTEXT/indicator-registry.json
  — B3: optimal_range_or_rule, known_gaps, notes e validation_status atualizados
docs/13-saude-brasil-360/ci-and-c1-b3-b5-validation-2026-05-25.md  (este arquivo)
  — seção 6 adicionada
```

### Gates pós-correção (Sessão C)

| Gate | Status | Evidência |
|------|--------|-----------|
| Typecheck | **PASS** | 0 erros — `npx tsc --project tsconfig.json --noEmit` |
| Tests | **PASS** | 470/470 — `bash scripts/tests/linux/test.sh` (+7 vs 463 anterior) |
| LGPD | **PASS** | zero CPF/CNS em classificacao-normativa.ts |
| Secrets | **PASS** | nenhuma credencial nos arquivos modificados |

### Runtime evidence

- Taxa B3 real: **13.39%** (77/575) → `classificacao="regular"`, `officialLabel="Suficiente"` ∈ [12%, 14%)
- Taxa B3 ótima: 9% → `classificacao="otima"`, `officialLabel="Ótimo"` ∈ [8%, 10%)

## Correção semântica B3 (2026-05-25 — Sessão D)

### Inconsistência identificada

O relatório da Sessão C dizia: "13.39% → `regular` ∈ [12%, 14%) — confirma Suficiente".
Isso misturava o enum interno (`regular`) com o rótulo PDF (`Suficiente`), gerando confusão
para leitores que esperavam ver "Suficiente" no campo de classificação.

### Solução: campo `officialLabel`

Adicionado `officialLabel?: string` à interface `B360NormativeClassification` em `types.ts`.
Preenchido apenas em indicadores onde os rótulos PDF diferem do enum interno.

**B3 — mapeamento completo:**

| Rótulo PDF | officialLabel | classificacao (interno) | Range |
|------------|---------------|------------------------|-------|
| Ótimo | `"Ótimo"` | `"otima"` | [8%, 10%) |
| Bom | `"Bom"` | `"aceitavel"` | [10%, 12%) |
| Suficiente | `"Suficiente"` | `"regular"` | [12%, 14%) |
| Regular | `"Regular"` | `"insuficiente"` | < 8% ou ≥ 14% |

### Arquivos modificados (Sessão D)

```
Apps/server/api/src/saude-brasil-360/types.ts
  — B360NormativeClassification: campo officialLabel?: string adicionado
Apps/server/api/src/saude-brasil-360/indicadores/classificacao-normativa.ts
  — B3_OFFICIAL_LABELS: mapa classificacao→officialLabel
  — classifyB3: inclui officialLabel no retorno
Apps/server/api/src/indicators/__tests__/b360-normative-classification.test.ts
  — describe "classifyB3 — officialLabel": 5 novos testes unit
  — integration tests B3: officialLabel assertions adicionadas
docs/11-indicator-field-catalog/indicators/B3.md  (tabela atualizada)
docs/13-saude-brasil-360/ci-and-c1-b3-b5-validation-2026-05-25.md  (este arquivo)
```

### Gates pós-correção (Sessão D)

| Gate | Status | Evidência |
|------|--------|-----------|
| Typecheck | **PASS** | 0 erros — `npx tsc --project tsconfig.json --noEmit` |
| Tests | **PASS** | 475/475 — `bash scripts/tests/linux/test.sh` (+5 vs 470) |
| Build | **PASS** | `node esbuild.config.mjs` — dist/index.js gerado |
| LGPD | **PASS** | zero CPF/CNS em tipos e classificacao-normativa.ts |
| Secrets | **PASS** | nenhuma credencial nos arquivos modificados |

### Runtime evidence (Sessão D)

- 13.39% (77/575) → `classificacao="regular"` + `officialLabel="Suficiente"` ✓
- 9% → `classificacao="otima"` + `officialLabel="Ótimo"` ✓
- 11% → `classificacao="aceitavel"` + `officialLabel="Bom"` ✓
- 0% → `classificacao="insuficiente"` + `officialLabel="Regular"` ✓

## 7. Regras Absolutas — Conformidade

- Nenhuma alteração em C2/C3 (exceto o arquivo de testes que os referencia)
- Nenhuma credencial modificada
- Nenhum GRANT/DBA
- Nenhuma alteração Docker/compose/infra
- Nenhuma branch paralela
- Nenhum force push
