# Fiocruz Core Research — C1, identidade e entrada progressiva no core

> **Working papers privados. Não publicar automaticamente no `CampusVirtualFiocruz/painel-esus`.**

## Objetivo

Investigar uma entrada estrutural, pequena e revisável no core analítico enquanto o C1 permanece bloqueado pelo gap de contrato de dados. A rodada deve produzir evidência de código, não uma implementação ampla.

## Estado canônico

- C1: `C1_BLOCKED_BY_DATA_CONTRACT`.
- Decisão para C1: `ISSUE_FIRST` / `FAIL_CLOSED`.
- Escopo privado de referência: 21 métricas documentadas; P1–P6, CR1–CR4 e R1–R6 continuam fora do escopo operacional.
- Resultado desta pesquisa: `FIOCRUZ_CORE_NEEDS_MORE_EVIDENCE`.

## Sequência de leitura

1. `s10-findings-normalization.md` — falsos alarmes encerrados e limites da evidência.
2. `c1-upstream-issue-draft.md` — rascunho upstream limpo, sem detalhes privados do runtime.
3. `identity-resolution-model.md` e `family-regression-cases.md` — política CPF/CNS e regressões sintéticas.
4. `team-relationship-model.md` e `b3-b5-b6-gap-analysis.md` — vínculo eSB↔eSF/eAP.
5. `upstream-audit-evidence.md` — snapshot, arquivos observados e limitações da auditoria.
6. `candidate-indicators.md`, `determinism-audit.md` e `join-cardinality-audit.md` — evidência dos consumidores.
7. `core-primitive-candidates.md`, `shared-transformations.md` e `core-primitive-decision.md` — decisão progressiva.
8. `distributed-readiness.md` — pré-condições para escala, sem infraestrutura.
9. `baseline.md` — baseline executada ou bloqueada.
10. `maintainer-proposal-draft.md` e `todo.md` — comunicação e pendências.

## Regra de publicação

Nenhum arquivo desta pasta deve ser copiado para issues, pull requests ou releases sem revisão humana. Paths privados, nomes de runtime, códigos internos de status e detalhes do produto devem permanecer fora da issue upstream. A issue pode perguntar pelo contrato oficial sem impor uma solução.

## Limites

A auditoria foi feita em um clone somente leitura do upstream no commit `d21fe44562fd73c4ae46261a40496079b6e94f15`. Os Parquet de entrada não estão no clone; por isso, testes de cálculo e baseline numérica permanecem bloqueados por ambiente.

## Documentos relacionados

- `../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md` — issue privada do produto; não publicar literalmente.
- `../13-saude-brasil-360/siaps-operational-compatibility-2026-08-26.md` — referência operacional privada.
- `../sources/official-sources-registry.md` — mapa de fontes oficiais.
