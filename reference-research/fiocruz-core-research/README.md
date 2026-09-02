# Fiocruz Analytics Core Research

Status: `PRIVATE_WORKING_DOCUMENTS`

Este diretório reúne a auditoria comparativa entre o corpus privado `sus-analytics-web` e o upstream `CampusVirtualFiocruz/painel-esus`. Nada daqui deve ser enviado ao upstream sem revisão específica de escopo, proveniência, privacidade e licença.

## Snapshot auditado

- Upstream: `CampusVirtualFiocruz/painel-esus`
- Branch: `upstream/main`
- SHA: `d21fe44562fd73c4ae46261a40496079b6e94f15`
- Data da verificação: 2026-08-26
- PR #59: aberta, independente, sem alterações nesta frente
- Implementação nesta rodada: nenhuma

## Documentos

- `current-state.md`: fluxo comprovado por código, inventário de indicadores e repetição.
- `reuse-catalog.md`: inventário do corpus privado e decisão de proveniência.
- `c1-methodology-audit.md`: metodologia oficial vigente e bloqueio do contrato de dados.
- `calculation-core-design.md`: menor desenho útil, sem mega framework.
- `benchmark-plan.md`: baseline, dados sintéticos e métricas.
- `migration-roadmap.md`: sequência C1, Diabetes, Hipertensão e evolução opcional.
- `maintainer-proposal-draft.md`: proposta curta para alinhamento.
- `todo.md`: gates e pendências com estados verificáveis.
- `../fiocruz-core-gap-analysis.md`: relatório mestre.

## Decisão desta rodada

`MORE_RESEARCH` / `ISSUE_FIRST`

O C1 está `C1_BLOCKED_BY_DATA_CONTRACT`: o Parquet atual de Atendimento Individual não contém os campos suficientes para classificar a demanda, validar a equipe e preservar a granularidade INE + competência. A implementação deve aguardar validação do contrato PEC e alinhamento com mantenedores.

