# Validacao Final C2/C3 — Saude Brasil 360

Data: 2026-05-23 (atualizado)
Status: **CODE_COMPLETE_SCHEMA_MAPPED_VALIDATION_PENDING**
ruleVersion: C2@B360-2026.3 / C3@B360-2026.3

## Gates

| Gate | Status | Evidencia |
|---|---|---|
| Typecheck | PASS | tsc --noEmit: 0 erros (escopo C2/C3/common/types/result/catalog) |
| Test | PASS | vitest 71/71 + 15 dimension gate tests (total 86) |
| Build | DIST_STALE | dist desatualizado (regra 7: nao alterar dist) |
| Lint | PASS | scripts/13-linux/lint.sh: auditoria estrutural OK |
| Schema DW | PASS | 15 divergencias corrigidas contra pec-schema-discovery.json |
| Schema Live | PENDING | PEC real em porta 5433 — servico offline no momento do teste |
| Smoke C2 | PENDING | Aguarda PEC real (porta 5433) ativo |
| Smoke C3 | PENDING | Aguarda PEC real (porta 5433) ativo |
| LGPD | PASS | Zero CPF/CNS/credenciais nos arquivos C2/C3 |
| Dimension Gates | IMPLEMENTED | C2: 3 dims obrigatorias, C3: 4 dims obrigatorias |
| Canonical Model Doc | DONE | docs/13-saude-brasil-360/canonical-health-model.md |
| Vinculos Doc | DONE | docs/13-saude-brasil-360/vinculos-nacionais-e-locais.md |
| Migration Plan Doc | DONE | docs/13-saude-brasil-360/registry-nacional-migration-plan.md |

## Ambiente

- Branch: main
- Node: v22.22.0
- pnpm: 10.32.0
- TypeScript: 5.9.3
- vitest: 3.2.4
- PostgreSQL porta 5432: replica simplificada (9 tabelas) — INSUFICIENTE
- PostgreSQL porta 5433: PEC real Barra do Choca — OFFLINE no momento
- Credenciais porta 5433: C:\Program Files\e-SUS\webserver\config\credenciais.txt
- Municipio: Barra do Choca (BA) — vinculado a DM Technology

## Correcoes aplicadas

### Sessao anterior (schema fixes — 15 colunas)
- co_dim_cbo → co_dim_cbo_1 (atendimento, odonto)
- co_dim_equipe → co_dim_equipe_1 (atendimento, odonto)
- dt_nascimento → co_dim_tempo_nascimento (cidadao_pec)
- st_saida_cadastro → st_faleceu + st_deletar
- nu_pa_sistolica → nu_pressao_sistolica
- nu_pa_diastolica → nu_pressao_diastolica
- co_dim_procedimento → co_dim_procedimento_avaliado
- ds_imunobiologico_codigo → ds_filtro_imunobiologico (pipe-delimited)
- st_gestante → co_dim_tempo_dum > 0 (denominador C3)
- dt_registro_dum → co_dim_tempo_dum (bigint key)
- tb_dim_equipe.tp_equipe → tb_equipe JOIN tb_tipo_equipe
- buildCboJoinClause com parametro cboColumn para tabelas com/sem sufixo

### Sessao atual (architectural restructuring)
- Dimension gates em C2: tb_dim_cbo, tb_equipe, tb_tipo_equipe obrigatorios
- Dimension gates em C3: tb_dim_cbo, tb_dim_procedimento, tb_equipe, tb_tipo_equipe obrigatorios
- Status blocked_by_schema com errorCode SCHEMA_MISSING_* quando dimensao ausente
- Modelo canonico de saude documentado (3 camadas)
- Binding matrix nacional documentada
- Plano de migracao para registry nacional versionado
- 15 novos testes de dimension blocking

## Arquivos alterados/criados

### Codigo
- `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c2.ts` (~580 linhas)
- `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts` (~790 linhas)
- `Apps/server/api/src/saude-brasil-360/__tests__/indicador-c2-c3.test.ts` (~650 linhas)

### Documentacao
- `docs/13-saude-brasil-360/canonical-health-model.md` (novo)
- `docs/13-saude-brasil-360/vinculos-nacionais-e-locais.md` (novo)
- `docs/13-saude-brasil-360/registry-nacional-migration-plan.md` (novo)
- `docs/13-saude-brasil-360/validacao-final-c2-c3-2026-05-23.md` (atualizado)
- `docs/13-saude-brasil-360/schema-real-c2-c3-2026-05-23.md` (sessao anterior)

## Dimension Gates — Detalhe

### C2 — Dimensoes Obrigatorias
| Dimensao | errorCode se ausente | Impacto |
|---|---|---|
| tb_dim_cbo | SCHEMA_MISSING_DIM_CBO | Nao filtra CBO em nenhuma BP |
| tb_equipe | SCHEMA_MISSING_EQUIPE | Nao classifica eSF/eAP |
| tb_tipo_equipe | SCHEMA_MISSING_TIPO_EQUIPE | Nao determina tipo 70/76 |

### C3 — Dimensoes Obrigatorias
| Dimensao | errorCode se ausente | Impacto |
|---|---|---|
| tb_dim_cbo | SCHEMA_MISSING_DIM_CBO | Nao filtra CBO em nenhuma BP |
| tb_dim_procedimento | SCHEMA_MISSING_DIM_PROCEDIMENTO | Nao resolve SIGTAP para exames/PA |
| tb_equipe | SCHEMA_MISSING_EQUIPE | Nao classifica eSF/eAP |
| tb_tipo_equipe | SCHEMA_MISSING_TIPO_EQUIPE | Nao determina tipo 70/76 |

## Riscos

1. **PEC porta 5433 offline**: Servico PostgreSQL nao esta rodando. Validacao real pendente.
2. **N+1 queries**: cada cidadao/gestante gera 5-11 queries individuais. Requer batch optimization para volume real.
3. **ds_filtro_imunobiologico**: formato pipe-delimited nao validado com dados reais.
4. **Credenciais porta 5433**: arquivo nao acessivel via sandbox Linux (path Windows).

## Rollback

```
git revert HEAD
```

## Proximas 3 acoes

1. Iniciar servico PEC PostgreSQL na porta 5433 e ler credenciais de C:\Program Files\e-SUS\webserver\config\credenciais.txt
2. Rodar schema discovery + smoke real C2/C3 contra PEC real
3. Se smoke PASS: atualizar status para DONE_IMPLEMENTED_VALIDATED, commit final
