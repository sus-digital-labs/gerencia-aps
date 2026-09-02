# Autoridade documental — SUS APS 360

- **Data:** 2026-08-12; atualizado em 2026-08-17
- **Status:** `CANONICAL_INDEX`
- **Escopo:** Adaptive Edge-to-Hub, ingestão, regras, multitenancy e BPA

Este índice determina quais documentos descrevem o runtime corrente, quais registram decisões de destino e quais são apenas história. Código, migrations e evidência executada continuam prevalecendo sobre prosa. A ausência de um gate executado nunca é convertida em `PASS` por documentação.

## Autoridade atual

| path | date | status | canonical_for | superseded_by | historical_only | notes |
|---|---|---|---|---|---:|---|
| `docs/02-architecture/CANONICAL-STATUS.md` | 2026-08-12 | `CANONICAL_INDEX` | precedência documental | — | não | Este arquivo. |
| `docs/02-architecture/adaptive-edge-execution-4-2026-08-13.md` | 2026-08-13/17 | `CURRENT_EXECUTION_REPORT` | resiliência adaptativa, offline 1 h, wave 50, DR, trust, mTLS, M2 e observabilidade | — | não | `VALIDATED_E2E_ADAPTIVE_RESILIENCE_EXEC4_SLICE` no recorte bounded; `CLEANUP_BLOCKED` por worktrees alheios; `NATIONAL_SCALE_NOT_PROVEN` no todo. |
| `docs/02-architecture/adaptive-edge-execution-3-2026-08-12.md` | 2026-08-12/13 | `PRIOR_EXECUTION_REPORT` | implementação, provas, rollback, blockers e scorecard pós-Execução 3 | relatório da Execução 4 | sim | `VALIDATED_E2E_ADAPTIVE_THREE_MODE_SLICE` apenas no M1 sintético delimitado; preservado para auditoria do delta. |
| `docs/02-architecture/adaptive-edge-execution-2-2026-08-12.md` | 2026-08-12 | `PRIOR_EXECUTION_REPORT` | baseline implementada e evidência da Execução 2 | relatório da Execução 3 | sim | Preservado para auditoria do delta; não representa o runtime mais recente. |
| `docs/02-architecture/adaptive-edge-unified-report-2026-08-12.md` | 2026-08-12/17 | `CURRENT_DECISION_WITH_EXECUTION_ADDENDUM` | decisão consolidada e baseline A–O | relatório da Execução 4 para estado executado | não | Preservado; ler o addendum Exec4 no topo e o relatório mais recente. |
| `docs/02-architecture/adaptive-edge-validation-program-2026-08-12.md` | 2026-08-12/17 | `CURRENT_VALIDATION_POLICY_AND_LEDGER` | política de evidência, waves, chaos e G0–G7 | — | não | Atualizado com o ledger Exec4; nenhum skipped/ignored sem infraestrutura foi contado como `PASS`. |
| `docs/33-adr/0005-hybrid-edge-central-analytics.md` | 2026-08-12 | `ACCEPTED` | arquitetura híbrida e leis permanentes | — | não | Evoluída pelas ADRs 0006/0007. |
| `docs/33-adr/0006-adaptive-edge-execution.md` | 2026-08-12/13 | `ACCEPTED_INCREMENTAL` | RAW-first, EdgeState e modos adaptativos | — | não | Planner/governor/commands e three-mode M1 foram validados em slice sintética; thresholds de produção e operação ampla continuam pendentes. |
| `docs/33-adr/0007-cellular-national-indicator-platform.md` | 2026-08-12 | `ACCEPTED_INCREMENTAL` | células, `DEFAULT_CELL`, RLS e materialização | — | não | `CELL_READY` e migração entre células não foram provadas. |
| `docs/02-architecture/rust-calculation-authority.md` | 2026-07-20 | `CURRENT_DOMAIN_AUTHORITY` | fronteira de cálculo e cutover Rust dos indicadores | ADR 0005/0006 para placement | não | M1/M2 são os melhores candidatos provados; não implica 21/21. |
| `docs/02-architecture/dm-sync-ingest.md` | 2026-07 | `CURRENT_COMPONENT_REFERENCE` | receiver e normalizer Rust | relatório unificado para classificação global | não | Ler junto das migrations e do código atual. |
| `docs/02-architecture/legacy-sync-agent-typescript.md` | 2026-07 | `DEPRECATED` | identificação explícita do agente TS legado | `agent-rust-architecture.md` | sim | Não é autoridade de execução. |
| `docs/02-architecture/agent-rust-architecture.md` | 2026-05 | `CURRENT_WITH_ADDENDA` | módulos e leis do agente Rust | ADR 0006 para EdgeState | não | Partes de persistência anteriores ao SQLite são históricas. |
| `docs/06-sync-agent/security-model.md` | 2026-05 | `CURRENT_WITH_GAPS` | controles de segurança do agente | Security Boundary v1 + ADR 0006 | não | Bearer é transicional; mTLS e supply-chain assinada seguem pendentes. |
| `docs/23-security/tenant-isolation-policy.md` | 2026-05 | `POLICY_WITH_HISTORICAL_BASELINE` | política alvo de isolamento | ADR 0007 | não | A seção “estado atual” é fotografia histórica, não runtime desta wave. |
| `docs/21-runbooks/ingest-processing-recovery.md` | 2026-07 | `CURRENT_RUNBOOK` | recuperação de chunks legados | — | não | Não substitui PITR/restore celular. |

## Inventários e evidência histórica

| path | date | status | canonical_for | superseded_by | historical_only | notes |
|---|---|---|---|---|---:|---|
| `docs/02-architecture/adaptive-edge-phase-0-inventory-2026-08-12.md` | 2026-08-12 | `BASELINE_SNAPSHOT` | estado observado antes da Execução 2 | relatório unificado atualizado | sim | Preservar como baseline; itens P0 podem ter sido implementados depois. |
| `docs/02-architecture/multitenant-readiness-audit.md` | anterior | `HISTORICAL_AUDIT` | auditoria do estado single-tenant anterior | ADR 0007 + relatório unificado | sim | Afirma one-shot/ausência de checkpoint; não descreve o agente atual. |
| `docs/02-architecture/multitenant-sync-readiness-summary.md` | anterior | `HISTORICAL_SUMMARY` | resumo da auditoria anterior | ADR 0007 + relatório unificado | sim | A afirmação “sync_checkpoints ausente” é histórica. |
| `docs/02-architecture/agent-sync-scalability.md` | anterior | `HISTORICAL_AUDIT` | agente bootstrap/seed one-shot anterior | ADR 0006 + `agent-rust-architecture.md` | sim | Não usar “one-shot/sem checkpoint” como runtime corrente. |
| `docs/02-architecture/distributed-ingestion.md` | anterior | `HISTORICAL_TARGET` | topologia distribuída anterior | `dm-sync-ingest.md` + ADR 0007 | sim | O normalizer TypeScript descrito ali não é a autoridade ativa. |
| `docs/02-architecture/state-level-implementation-plan.md` | anterior | `SUPERSEDED_PLAN` | plano estadual antigo | ADR 0007 | sim | `PARTITION BY LIST (municipio_ibge)` não é o alvo celular corrente. |
| `docs/02-architecture/multi-app-architecture.md` | anterior | `PARTIALLY_SUPERSEDED` | separação de responsabilidades entre apps | ADR 0005/0006/0007 | sim | A frase “spool local criptografado” era intenção, não evidência; o estado atual é o EdgeState implementado e seus gates. |
| `docs/06-sync-agent/distributed-sync-architecture-2026-05-31.md` | 2026-05-31 | `HISTORICAL_DESIGN` | desenho inicial do sync | ADR 0005/0006 | sim | A exigência futura de spool criptografado não prova criptografia no runtime daquela data. |
| `docs/06-sync-agent/sync-agent-runtime-audit-2026-05-31.md` | 2026-05-31 | `HISTORICAL_RUNTIME_SNAPSHOT` | observação do host naquela data | relatório unificado | sim | Não extrapolar para o runtime de 2026-08-12. |
| `docs/06-sync-agent/sync-architecture-final-report-2026-05-31.md` | 2026-05-31 | `HISTORICAL_REPORT` | encerramento do gate antigo | relatório unificado | sim | Classificações antigas não promovem esta wave. |
| `docs/06-sync-agent/gate1-e2e-validation-plan.md` | anterior | `HISTORICAL_GATE` | Gate 1 legado | programa de validação de 2026-08-12 | sim | Pode ser usado como referência operacional, não como evidência executada. |

## Regras de leitura

1. Documentos históricos permanecem versionados para rastreabilidade, mas não definem arquitetura ou runtime atuais.
2. ADR aceita descreve decisão; não comprova implementação.
3. Relatório de execução só pode elevar um componente quando aponta para comando, ambiente e artefato verificáveis.
4. O runtime vigente é determinado pelo commit integrado, migrations aplicadas no ambiente em questão e probes executados.
5. `PRODUCTION_READY`, `CELL_READY` e `NATIONAL_SCALE_READY` exigem G0–G7 completos; nenhum documento listado concede esses estados.
6. A classificação `VALIDATED_E2E_ADAPTIVE_RESILIENCE_EXEC4_SLICE` vale somente para M1/M2 e os ambientes bounded explicitamente executados; não se propaga para PEC real, os outros 19 indicadores, PKI/rollout produtivo, HA ampla ou escala nacional.
