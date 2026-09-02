# Operational Matrix V2

> Snapshot P2 focal gerado em 2026-08-17 para reconciliar a identidade normativa M1/M2. A matriz operacional completa continua em `docs/11-indicator-field-catalog/operational-matrix.md`; este arquivo trava a identidade eMulti exigida pela certificação P2.

| Indicador | Nome oficial | Fórmula oficial | Unidade | Polaridade | Rule version | Source contract | Golden | Runtime | Certification status |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Media de atendimentos por pessoa assistida pela eMulti na APS | atendimentos individuais + participacoes coletivas / pessoas distintas atendidas | media | maior-melhor | `M1@2026.6` | MIAI + MIAC + eMulti tipo 72 + pessoas identificadas | `M1_GOLDEN_CORRECT` (`387/320 = 1.209375`) | `ACTIVE_AND_PROVEN` no escopo auditado | `M1_M2_NORMATIVE_IDENTITY_RECONCILED`; sem promocao formal a `CERTIFIED` nesta missao |
| M2 | Acoes interprofissionais realizadas pela eMulti na APS | acoes compartilhadas / total de acoes eMulti x 100 | percentual | neutra | `M2@2026.6` | MIAI + MIAC + MIAOI + Compartilhamento do Cuidado PEC + deduplicacao oficial | `M2_GOLDEN_CORRECT` (`6/120 = 5.000000%`) | `ACTIVE_AND_PROVEN` no escopo auditado (`3/410 = 0.731707%`) | `M1_M2_NORMATIVE_IDENTITY_RECONCILED`; nao confundir com media de atendimentos |

## Evidence

- Manifesto oficial: `docs/11-indicator-field-catalog/sources/official-source-manifest-2026-07-25.json`.
- Registro semantico: `.ai/CONTEXT/indicator-registry.json`.
- Metadata Rust: `Apps/rules/b360-rules/rules/m1/2026.6.json` e `Apps/rules/b360-rules/rules/m2/2026.6.json`.
- Authority matrix: `docs/10-indicators/b360-rust-authority-matrix.json`.
- Teste de identidade: `Apps/server/api/src/indicators/__tests__/b360-rust-authority-matrix.test.ts`.
