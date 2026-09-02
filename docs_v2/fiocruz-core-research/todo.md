# Private TODO - Fiocruz Analytics Core

Estados: `TODO`, `IN_PROGRESS`, `PASS`, `BLOCKED`, `NOT_APPLICABLE`.

| Estado | Tarefa | Evidência/condição |
|---|---|---|
| PASS | clonar e atualizar `upstream/main` | SHA `d21fe44562fd73c4ae46261a40496079b6e94f15` |
| PASS | confirmar separação da PR #59 | PR aberta em `ci/docs-build`, sem alteração |
| PASS | inventariar `docs/` privado no snapshot | dois documentos lidos antes da reestruturação local |
| PASS | classificar proveniência | nenhum código privado aprovado para cópia direta |
| PASS | mapear pipeline PEC -> Parquet -> Polars -> DuckDB -> API -> frontend | `current-state.md` |
| PASS | inventariar seis bases temáticas | `current-state.md` |
| PASS | mapear repetição compartilhada | `Shared Transformation Matrix` |
| PASS | validar nota C1 vigente | SEI 0054814890, atualizada em 2026-06-24 |
| BLOCKED | validar campos e códigos PEC do C1 | Parquet atual omite tipo de demanda e chaves normativas |
| BLOCKED | implementar C1 | `C1_BLOCKED_BY_DATA_CONTRACT` |
| TODO | obter confirmação dos mantenedores sobre versões PEC e no-data | issue/discussão antes do código |
| TODO | criar fixture sintética do contrato de encontros | após nomes/códigos confirmados |
| TODO | criar golden tests C1 | expected manual em 10/30/50/70 e casos inválidos |
| TODO | implementar núcleo mínimo | Context + Spec + Result; runner adiado |
| BLOCKED | baseline 10k/100k/500k/1M | sem dataset sintético/schema validado e dependências locais |
| TODO | benchmark eager vs lazy/pushdown | após fixture |
| TODO | differential test Diabetes | Stage 4 |
| TODO | differential test Hipertensão | Stage 5 |
| NOT_APPLICABLE | frontend tests | frontend não foi alterado |
| NOT_APPLICABLE | push/PR/issue | proibidos nesta rodada |

## Performance review checklist

- [ ] join cardinality
- [ ] duplicate counting
- [ ] date determinism
- [ ] period semantics
- [ ] INE
- [ ] CNES
- [ ] CBO
- [ ] no-data vs zero
- [ ] methodology version
- [ ] filter placement
- [ ] unnecessary materialization
- [ ] regression tests

## Quality gates da futura implementação

| Gate | Estado atual |
|---|---|
| Python tests | NOT_RUN - nenhuma implementação e dependências ausentes |
| targeted/golden tests | BLOCKED pelo contrato |
| frontend tests | NOT_APPLICABLE |
| lint/format/typecheck | NOT_APPLICABLE à documentação privada |
| `git diff --check` | PASS nos arquivos novos; sem whitespace inválido |
| secret scan | PASS nos arquivos novos; nenhum padrão de credencial/chave |
| PII scan | PASS; apenas nomes de campos/regras normativas, nenhum dado pessoal real |
| benchmark baseline/after | BLOCKED_BY_ENVIRONMENT |
| methodology verification | PASS |
