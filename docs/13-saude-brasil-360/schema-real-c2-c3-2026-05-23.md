# Schema Real PEC/DW — Validação C2/C3

Data: 2026-05-23
Commit base: 42b07a9
ruleVersion: C2@B360-2026.3 / C3@B360-2026.3

## Fontes de Schema

Duas fontes distintas foram identificadas:

### 1. PEC DW Completo (esus_restore_20260424) — REMOVIDO
- Origem: `pec-schema-discovery.json` gerado em 2026-05-13
- 1101 tabelas, 9681 colunas
- Schema oficial SISAB DW com tabelas tb_fat_*, tb_dim_*, tb_equipe, tb_tipo_equipe
- **Status: banco deletado, schema discovery JSON preservado em reports/**

### 2. Réplica Simplificada (esus) — ATIVA
- 9 tabelas, ~50 colunas
- Criada pelo pec-agent-sync (Rust)
- Sem tabelas de dimensão (tb_dim_cbo, tb_dim_tempo, tb_dim_procedimento)
- Sem campos antropométricos (nu_peso, nu_altura)
- Sem tb_fat_atd_ind_procedimentos, tb_fat_atd_ind_exames, tb_fat_cad_individual
- 16 cidadãos, 34 atendimentos, 4 vacinações — volume insuficiente para smoke representativo

## Validação contra DW Completo (pec-schema-discovery.json)

Código C2/C3 corrigido para usar nomes reais do DW:

| Coluna anterior | Coluna corrigida | Tabela | Justificativa |
|---|---|---|---|
| co_dim_cbo | co_dim_cbo_1 | atd_individual, odonto | Profissional principal (sufixo _1) |
| co_dim_equipe | co_dim_equipe_1 | atd_individual, odonto | Equipe principal |
| co_dim_equipe | co_dim_equipe_vinc | cidadao_pec | Vinculação |
| dt_nascimento | co_dim_tempo_nascimento | cidadao_pec | bigint YYYYMMDD, não date |
| st_saida_cadastro | st_faleceu + st_deletar | cidadao_pec | Campos separados |
| nu_pa_sistolica | nu_pressao_sistolica | atd_individual | Nome completo |
| nu_pa_diastolica | nu_pressao_diastolica | atd_individual | Nome completo |
| co_dim_procedimento | co_dim_procedimento_avaliado | atd_ind_procedimentos | Sufixo avaliado |
| ds_imunobiologico_codigo | ds_filtro_imunobiologico | vacinacao | Pipe-delimited filter |
| st_gestante (cidadao) | co_dim_tempo_dum > 0 | atd_individual | Gestante via DUM |
| dt_registro_dum | co_dim_tempo_dum | atd_individual | bigint YYYYMMDD key |
| tb_dim_equipe.tp_equipe | tb_equipe.tp_equipe + tb_tipo_equipe | — | Tabela separada |

## Validação contra Réplica Simplificada (esus live)

| Tabela | Existe? | Colunas C2/C3 disponíveis? |
|---|---|---|
| tb_fat_cidadao_pec | SIM | PARCIAL — falta co_dim_equipe_vinc, st_deletar |
| tb_fat_atendimento_individual | SIM | PARCIAL — falta co_dim_cbo_1, nu_peso, nu_altura |
| tb_fat_vacinacao | SIM | PARCIAL — falta ds_filtro_imunobiologico |
| tb_fat_visita_domiciliar | SIM | PARCIAL — falta co_fat_cidadao_pec, co_dim_cbo |
| tb_fat_atendimento_odonto | SIM | PARCIAL — falta co_dim_cbo_1, co_dim_equipe_1 |
| tb_fat_cad_individual | NÃO | — |
| tb_fat_atd_ind_procedimentos | NÃO | — |
| tb_fat_atd_ind_exames | NÃO | — |
| tb_dim_cbo | NÃO | — |
| tb_dim_tempo | NÃO | — |
| tb_dim_procedimento | NÃO | — |
| tb_equipe | NÃO | — |
| tb_tipo_equipe | NÃO | — |

## Conclusão

- Schema DW completo (discovery JSON): **15 divergências corrigidas no código**
- Schema réplica simplificada: **incompatível** — faltam tabelas e colunas essenciais
- Smoke real: **BLOCKED** — requer restore do DW completo ou evolução do pec-agent-sync
- Código C2/C3 está correto para o DW completo oficial

## Ação requerida

Restaurar backup PEC DW completo (ex: `esus_restore_20260424`) ou evoluir o `pec-agent-sync` para sincronizar as tabelas de dimensão e campos antropométricos necessários.
