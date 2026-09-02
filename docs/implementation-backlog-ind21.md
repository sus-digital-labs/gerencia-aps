# Implementation Backlog IND_21

> **Escopo do projeto: 21 metricas operacionais** = 15 Qualidade APS (B1-B6, C1-C7, M1-M2) + 6 CVAT (CVAT1-CVAT6).
> Registro canonico: [official-indicators-registry.md](official-indicators-registry.md)

Fase atual: pos-implementacao / hardening normativo e operacional.

## Gate P0 fechado em 2026-05-20
- `C5`: alinhado a nota metodologica oficial de hipertensao; runtime atualizado para `C5@2026.4`.
- `B3`: alinhado para taxa de exodontia.
- `B4`: alinhado para escovacao supervisionada em faixa etaria escolar de 6 a 12 anos.
- `B5`: alinhado para procedimentos odontologicos individuais preventivos.
- `B6`: alinhado para tratamento restaurador atraumatico sobre procedimentos restauradores.

## Ranking consolidado de hardening

### P0
- `B1`: fechar denominador normativo eSB; o bloqueio honesto `B1_DENOMINATOR_BLOCKED_BY_DATA` continua correto enquanto o dado nao fecha.
- drift operacional do runtime local manual em `3003`: o bootstrap direto depende de inicializacao com `.env` carregado corretamente.
- amarrar referencias oficiais especificas de `C4`, `B3`, `B4`, `B5` e `B6` no registry com observacoes finais coerentes ao runtime atual.

### P1
- escopo de tipo de equipe ainda nao fechado em `C1` e `C6`.
- scope proxies de eSB em `B2..B6`.
- scope/person/shared-action proxies de eMulti em `M1/M2`.
- proxies clinicos explicitamente ativos em `C4`, `C5` e `C7`.

### P2
- padronizar UX e nomenclatura de warnings entre blocos C/B/M.
- revisar docs historicas com `/apiv1` e referencias pre-canonicas fora do fluxo operacional atual.
- consolidar criterio unico de `freshnessStatus` no catalogo e no runbook.

## Snapshot publico consolidado
- `C1`: `679/1713 = 39.64`
- `C2`: `0/19 = 0`
- `C3`: `0/19 = 0`
- `C4`: `6425/14800 = 43.41`
- `C5`: `26375/52000 = 50.72`
- `C6`: `23825/52600 = 45.29`
- `C7`: `8310/66700 = 12.46`
- `B1`: `0/0`, `blocked_by_source`
- `B2`: `58/246 = 23.58`
- `B3`: `77/575 = 13.39`
- `B4`: `0/402 = 0`
- `B5`: `359/945 = 37.99`
- `B6`: `7/113 = 6.19`
- `M1`: `618/120 = 5.15`
- `M2`: `106/128 = 82.81`

## CVAT — backlog especifico (6 subindicadores)

| Item | Status | Proximo passo |
|---|---|---|
| CVAT1 | derived-operational-rule | regra SQL validada contra tb_fat_cad_individual |
| CVAT2 | derived-operational-rule | regra SQL para cadastro domiciliar + individual |
| CVAT3 | derived-operational-rule | confirmar dados PBF/BPC na replica |
| CVAT4 | derived-operational-rule | confirmar faixas demograficas e fatores |
| CVAT5 | derived-operational-rule | regra SQL para contatos assistenciais + praticas de cuidado |
| CVAT6 | blocked-by-data | fonte de satisfacao nao disponivel no DW PEC |

Nota: CVAT opera com regras derivadas da Nota Tecnica 30/2025 e Portaria SAPS/MS 161/2024. Ate 2026-05-20 nao existe nota metodologica detalhada com formula final publicada.

## Proximos gates recomendados
1. hardening normativo de `B1`, com foco em denominador eSB.
2. hardening de escopo/tipo de equipe em `C1`, `C6`, `B2..B6`, `M1`, `M2`.
3. auditoria de freshness, source-health e drift documental fora do endpoint canonico.
4. CVAT: transformar regras derivadas em SQL validado contra tabelas reais.
5. CVAT6: definir fonte de satisfacao (interna ou externa ao PEC).

## Regras permanentes
- nenhum warning sai sem fonte oficial especifica, teste e smoke local/publico.
- nenhum proxy/fallback sai sem evidencia comparavel no runtime.
- `validated_runtime_public` nao deve ser confundido com `normative_validated`.
- `Previne Brasil` continua apenas `migration_reference_only`.
- **escopo total: 21 metricas operacionais (15 Qualidade APS + 6 CVAT)**.
