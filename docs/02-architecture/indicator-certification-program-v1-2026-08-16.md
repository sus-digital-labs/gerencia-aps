# Indicator Certification Program V1

> Snapshot revisado em 2026-08-17 somente para a reconciliacao M1/M2. Este arquivo existe para fechar a referencia P2 solicitada; ele nao declara prontidao nacional nem certificacao formal de novos indicadores.

## P2 M1/M2 Identity Gate

| Gate | Status |
|---|---|
| M1 oficial identificado como media de atendimentos por pessoa | PASS |
| M2 oficial identificado como acoes interprofissionais | PASS |
| M1 rule package / formula / unit auditados | PASS |
| M2 rule package / formula / unit auditados | PASS |
| M1 golden historico classificado | `M1_GOLDEN_CORRECT` |
| M2 golden/parity classificado | `M2_GOLDEN_CORRECT` |
| Persisted/read model impact | Sem mutacao produtiva; shapes persistidos ja distinguem M1 media e M2 percentual |
| Frontend | Sem alteracao nesta missao |
| Push | NO |

## Certification State

M1 e M2 ficam em `M1_M2_NORMATIVE_IDENTITY_RECONCILED` para a identidade normativa. A evidencia auditada continua `ACTIVE_AND_PROVEN` no escopo materializado, mas esta missao nao promove nenhum indicador a `CERTIFIED`.

## Sources

- M1: Nota Metodologica M1, SEI 0055952286, SHA-256 `a54d272643037916225a249360a22363e587c0f19a4d79489d3961154c981d49`.
- M2: Nota Metodologica M2, SEI 0055952438, SHA-256 `38bfc95af308f3c06604fbba3a61193939eb6fbb3a9abdd8f6c0aaa28934fbd3`.
- Relatorio completo: `docs/02-architecture/m1-m2-normative-identity-reconciliation-2026-08-17.md`.
