# SUS ANALYTICS / FIOCRUZ — CORE ENTRY READINESS

## 1. Git State

- Branch: `main`.
- HEAD: `8d7baa0` (`chore: initialize public SUS analytics platform`).
- Working tree: já estava profundamente divergente no baseline, com 362 arquivos tracked alterados/removidos e a nova árvore standalone majoritariamente untracked.
- Remote: nenhum remote configurado neste checkout.
- Publicação: nenhum commit, push, PR ou issue realizado.

## 2. S10 Normalization

- Confirmed: C1 bloqueado; identidade FCI/FCDT pendente; nomenclatura B4/B5 incorreta em UI ativa.
- Partial: idempotência confirmada apenas no caminho controlado da S10.
- False alarms: backend universalmente ausente; idempotência universalmente ausente; município/UF hardcoded; router central com `@ts-nocheck`.
- Legacy only: routers concorrentes e backend removidos deste working tree.
- Fixed: linguagem canônica, escopo 21 e títulos B4/B5.

## 3. Canonical Scope

- Total calculations: 21.
- Quality APS: 15 (`B1–B6`, `C1–C7`, `M1–M2`).
- CVAT: 6 métricas operacionais (`CVAT1–CVAT6`).
- Registry status: guard de tamanho, unicidade, ordem e nomes B4/B5 em teste e release-check.

## 4. C1

- Status: `C1_BLOCKED_BY_DATA_CONTRACT`.
- Strategy: `ISSUE_FIRST` / `FAIL_CLOSED`.
- Runtime: estados não prontos rejeitam numerador, denominador e percentual, inclusive aliases em português.
- Unlock: presença nominal de campos não basta; exige evidência explícita de code set, cardinalidade, versão, competência e cobertura histórica.

## 5. C1 DW Mapping

- Fact: `tb_fat_atendimento_individual`.
- FK candidata: `co_dim_tipo_atendimento`.
- Dimension: `tb_dim_tipo_atendimento`.
- Dimension key: `co_seq_dim_tipo_atendimento`.
- Semantic field: `nu_identificador`, `ds_tipo_atendimento` ou equivalente vigente — não comprovado ponta a ponta.
- Code set: `1/2/4/5/6` permanece candidato; não promovido a produção.
- Cardinality status: `NOT_VERIFIED`.
- Historical status: `NOT_VERIFIED`.
- Evidência upstream: o snapshot mostra a relação FK/dimensão no fluxo odontológico, não no fluxo individual necessário ao C1.

## 6. C1 Issue Draft

- Title: `C1 — alinhar contrato de tipo de demanda no fluxo de Atendimento Individual`.
- Problem: falta comprovar como programada/espontânea é preservada no pipeline.
- Evidence: cadeia fato → FK → dimensão → campo semântico, com risco explícito de interpretar FK como code set.
- Question: qual relação é canônica e já está preservada com versão, competência e linhagem?
- Acceptance criteria: FK, dimensão, semântica, cardinalidade, histórico, modelo, CBO/equipe, no-data, PII e ausência de número antes da prova.
- Publication: `NOT_PUBLISHED`.

## 7. Idempotency

- Implementation: `VERIFIED_IN_CONTROLLED_PATH` pela S10; ausente no checkout standalone atual.
- Conflict target/natural key/update fields/timestamps: `NOT_VERIFIABLE_IN_THIS_CHECKOUT`.
- Tests: `NOT_RUN` para upsert real; não foi criado backend fictício.
- Status: `PARTIAL_EVIDENCE`, sem reabrir o falso alarme de ausência universal.

## 8. Municipality Configuration

- Status: `PASS` no runtime standalone.
- Required: API URL, IBGE de 7 dígitos, nome, UF, latitude, longitude e zoom.
- Remaining defaults: valores neutros só aparecem junto de `CONFIGURATION_ERROR`; não operam como município silencioso.
- Risks: manter validação na entrada e impedir bypass do `assertRuntimeConfig`.

## 9. TypeScript

- Central router `@ts-nocheck`: não aplicável; backend/router não está neste checkout.
- Active frontend `@ts-nocheck`: nenhuma ocorrência.
- Runtime guards: parser de resultados analíticos existente; validação adicionada à resposta Nominatim.
- Scoped contract typecheck: `PASS`.
- Full legacy typecheck: `FAIL`, principalmente componentes UI `.tsx` duplicados/sem tipos; dívida preexistente fora desta rodada.

## 10. Identity Model

- CPF/CNS: identificadores concorrentes de uma identidade interna imutável.
- Canonical identity: `citizen_id`, nunca CPF/CNS como chave de relacionamento.
- Conflict handling: `IDENTITY_CONFLICT`, sem auto-merge.
- Historical preservation: adicionar CPF não remove CNS nem vínculos históricos.
- Status: modelo pronto para implementação controlada; persistência, concorrência e merge manual ainda precisam de design técnico.

## 11. Family Regression

- A: CPF+CNS concordantes → `MATCH`.
- B: CNS-only + CPF posterior → mesmo cidadão e mesma família.
- C: CPF/CNS apontam pessoas diferentes → `IDENTITY_CONFLICT`.
- D: somente CNS válido → `MATCH_BY_CNS`.
- E: identificadores insuficientes → `PENDING_IDENTITY`/`INVALID_IDENTIFIER`.
- Fixture 1+5: seis moradores antes e depois do alias CPF, sem órfãos ou duplicação.

## 12. Team Relationships

- eSB/eSF/eAP: domínio separado de identidade de cidadão.
- INE/CNES: identificadores externos versionados, não prova de vínculo por mesma unidade.
- Competence: obrigatória em `TeamRelationship`.
- B3/B5/B6 impact: code set e atribuição por equipe continuam `requires_official_validation`.

## 13. Core Primitive Candidates

| Primitive | Consumers | Impact | Risk | Recommendation |
|---|---|---|---|---|
| `CalculationContext` | Diabetes, Hipertensão | determinismo | mudança de janela | primeira candidata após fixture/baseline |
| `DataQualityResult` | Saúde Bucal, Cadastro, frontend | separa zero/no-data/schema | quebra de contrato | segunda |
| `IdentityResolver` | cadastro, família, território | preserva identidade | merge/PII | implementar após contrato persistente |
| `TeamRelationshipResolver` | B3, B5, B6 | atribuição por competência | fonte ausente | aguardar evidência oficial |
| `MethodologySpec` | todos | versionamento | abstração prematura | adiar |

## 14. Distributed Readiness

- Deterministic: `PARTIAL/FAIL` no upstream devido a relógio implícito.
- Idempotent: `PARTIAL`.
- Serializable: `DESIGNED`, não implementado.
- Partitionable/retriable/mergeable: `NEEDS_EVIDENCE`.
- Distributed implementation: `NOT_STARTED`.

## 15. Release Check

- Positive: `PASS` — 982 arquivos no escopo combinado (tracked + código e documentação ativos untracked).
- Negative: `PASS` — sete fixtures recusadas: host interno, fallback analítico, `Math.random`, `@ts-nocheck`, C1 bloqueado com número, cadastro fictício e token semelhante a segredo.
- Final: `PASS`.

## 16. Tests

| Gate | Resultado |
|---|---|
| `pnpm check` | `PASS` |
| `pnpm check:full` | `FAIL_PREEXISTING` |
| `pnpm test` | `PASS` — 3 arquivos, 22 testes |
| upstream integration | `BLOCKED_BY_ENVIRONMENT` — Parquet ausentes; 5 pass/20 fail na baseline anterior |
| `pnpm build` | `PASS` — warning de chunk >500 kB |
| `pnpm audit --audit-level moderate` | `PASS` — nenhuma vulnerabilidade conhecida |
| `pnpm verify:release` | `PASS` |
| `pnpm verify:release:negative` | `PASS` |
| `pnpm format:check` | `FAIL_PREEXISTING` — 255 arquivos |
| Prettier focalizado nos 8 arquivos de código alterados | `PASS` |
| `git diff --check` | `PASS` |
| lint | `NOT_AVAILABLE` — sem script |

## 17. Real Database

- `CONNECTED = NO`.
- `CREDENTIALS_USED = NO`.
- Dados reais: nenhum.

## 18. Files Changed in This Round

- Contrato/testes: `analytics-contract.ts`, `analytics-contract.test.ts`.
- UI: `IndicatorCard.jsx`, `IndicatorDetailHeader.jsx`, `TerritoryMap.jsx`, `DashboardCorreto.tsx`.
- Release: `verify-public-release.mjs`, `verify-public-release-negative.mjs`.
- Canonical doc: `docs/13-saude-brasil-360/README.md`.
- Research: README, TODO, issue C1, normalização S10, identidade, família, equipes, B3/B5/B6, primitives, distribuição, proposta e este relatório.

## 19. Remaining P0

1. Confirmação upstream da cadeia semântica do C1.
2. Cardinalidade, code set, versão e histórico do tipo de demanda.
3. Manter C1 sem qualquer número até o contrato passar.

## 20. Remaining P1

1. Reproduzir testes de upsert no checkout que contém o importador.
2. Projetar persistência/transação do resolver de identidade.
3. Confirmar fonte oficial e competência do vínculo eSB↔eSF/eAP.
4. Criar fixtures Parquet sintéticas e baseline de `CalculationContext`.
5. Saldar `check:full` e formatação em rodada própria.

## 21. Recommended Next Action

- `C1_ISSUE_READY_FOR_HUMAN_REVIEW`.
- `IDENTITY_MODEL_READY_FOR_IMPLEMENTATION` em branch privada, começando por persistência e conflitos; não pronto para produção.

## 22. Final Status

`S10_NORMALIZED`  
`C1_BLOCKED_BY_DATA_CONTRACT`  
`C1_ISSUE_DRAFT_READY`  
`IDENTITY_MODEL_READY_FOR_IMPLEMENTATION`  
`NO_PUBLICATION_PERFORMED`
