# Mapa Operacional de Sync PEC (35 Tabelas)

## Escopo de indicadores/subindicadores (21)

`C1, C2, C3, C4, C5, C6, C7, B1, B2, B3, B4, B5, B6, M1, M2, C2.1, C2.2, C3.1, C3.2, C5.1, C5.2`

> Observação: `CVAT` permanece mapeado no agente para fontes vacinais e visitas (`tb_registro_vacinacao`, `tb_fat_vacinacao`, `tb_fat_visita_domiciliar`), mesmo fora do conjunto de 21 acima.

## Catálogo ativo no agente Rust

Fonte canônica: `Apps/agent/pec-agent-sync/src/sync.rs` (`TABLE_PLANS`).

| # | Tabela | Campo de cursor incremental |
|---|--------|-----------------------------|
| 1 | `tb_registro_vacinacao` | `co_seq_registro_vacinacao` |
| 2 | `tb_fat_cad_individual` | `co_seq_fat_cad_individual` |
| 3 | `tb_fat_atendimento_individual` | `co_seq_fat_atd_ind` |
| 4 | `tb_fat_atendimento_odonto` | `co_seq_fat_atd_odnt` |
| 5 | `tb_fat_cuidado_compartilhado` | `co_seq_fat_cuidado_compartilhd` |
| 6 | `tb_fat_proced_atend` | `co_seq_fat_proced_atend` |
| 7 | `tb_fat_vacinacao` | `co_seq_fat_vacinacao` |
| 8 | `tb_fat_visita_domiciliar` | `co_seq_fat_visita_domiciliar` |
| 9 | `tb_fat_atividade_coletiva` | `co_seq_fat_atividade_coletiva` |
| 10 | `tb_fat_atvdd_coletiva_part` | `co_seq_fat_atvdd_cltv_part` |
| 11 | `tb_fat_atd_ind_encaminhamentos` | `co_seq_fat_atd_ind_encaminham` |
| 12 | `tb_fat_atd_ind_exames` | `co_seq_fat_atd_ind_exames` |
| 13 | `tb_fat_atd_ind_medicamentos` | `co_seq_fat_atd_ind_medicam` |
| 14 | `tb_fat_atend_odonto_proced` | `co_seq_fat_atend_odonto_proced` |
| 15 | `tb_fat_atd_ind_problemas` | `co_seq_fat_atend_ind_problemas` |
| 16 | `tb_fat_atd_ind_procedimentos` | `co_seq_fat_atend_ind_proced` |
| 17 | `tb_fat_atend_odonto_encaminham` | `co_seq_fat_atd_odo_encaminham` |
| 18 | `tb_fat_atend_odonto_exames` | `co_seq_fat_atd_odo_exames` |
| 19 | `tb_fat_atend_odonto_medicament` | `co_seq_fat_atd_odo_medicam` |
| 20 | `tb_fat_atend_odonto_problemas` | `co_seq_fat_atnd_odonto_probl` |
| 21 | `tb_fat_atendimento_domiciliar` | `co_seq_fat_atend_domiciliar` |
| 22 | `tb_fat_atvdd_coletiva_ext` | `co_seq_fat_atvdd_cltv_ext` |
| 23 | `tb_fat_atvdd_coletiva_int` | `co_seq_fat_atvdd_cltv_int` |
| 24 | `tb_fat_atvdd_coletiva_propart` | `co_seq_fat_atvdd_cltv_propart` |
| 25 | `tb_fat_cad_dom_familia` | `co_seq_fat_cad_dom_familia` |
| 26 | `tb_fat_cad_domiciliar` | `co_seq_fat_cad_domiciliar` |
| 27 | `tb_fat_ivcf` | `co_seq_fat_ivcf` |
| 28 | `tb_fat_marca_consumo_alimnt` | `co_seq_fat_marca_con_almnt` |
| 29 | `tb_dim_unidade_saude` | `co_seq_dim_unidade_saude` |
| 30 | `tb_dim_equipe` | `co_seq_dim_equipe` |
| 31 | `tb_dim_profissional` | `co_seq_dim_profissional` |
| 32 | `tb_dim_tempo` | `co_seq_dim_tempo` |
| 33 | `tb_cds_cad_individual` | `co_seq_cds_cad_individual` |
| 34 | `tb_fat_cidadao_pec` | `co_seq_fat_cidadao_pec` |
| 35 | `tb_cidadao` | `co_seq_cidadao` |

## Operação

- Sync completo usa todas as 35 tabelas por padrão.
- Para smoke controlado, use `AGENT_SYNC_TABLES` com lista separada por vírgula.
  - Exemplo: `AGENT_SYNC_TABLES=tb_dim_unidade_saude,tb_dim_equipe`
- Para backfill controlado, use `AGENT_MAX_BATCHES_PER_TABLE` para limitar a quantidade de lotes por tabela em uma execução.
  - Exemplo: `AGENT_SYNC_TABLES=tb_fat_visita_domiciliar AGENT_BATCH_SIZE=2000 AGENT_MAX_BATCHES_PER_TABLE=75 pec-agent-sync sync`
- Tabela ou coluna ausente no schema não derruba o processo:
  - status: `skipped_missing_table` ou `skipped_missing_cursor_column`
  - sem fallback silencioso de dados.
