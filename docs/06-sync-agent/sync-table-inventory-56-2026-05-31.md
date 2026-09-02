# Inventario das 56 Tabelas do Sync

Fonte primaria: `Apps/agent/pec-agent-sync/src/catalog.rs` (`CATALOG_VERSION=2026-05-31.acs-timeline-temporal-v2`).  
Evidencia runtime: `GET http://127.0.0.1:3005/readyz` em 2026-06-02.  
Destino logico: `sus_analytics_replica` apos normalizacao; chunks brutos em `sus_analytics_ingest`.

| # | Tabela | Origem | Categoria | Indicadores | Sync/checkpoint | Volume runtime | Status runtime | Risco |
|---:|---|---|---|---|---|---:|---|---|
| 1 | `tb_fat_visita_domiciliar` | DW PEC | required/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_visita_domiciliar | 2422093 | synced (2026-06-01) | PII sensivel; mascarar logs |
| 2 | `tb_fat_cad_individual` | DW PEC | required/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_cad_individual | 350500 | source_available (2026-05-30) | PII sensivel; mascarar logs |
| 3 | `tb_fat_cad_domiciliar` | DW PEC | required/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_fat_cad_domiciliar | 722770 | synced (2026-06-01) | PII sensivel; mascarar logs |
| 4 | `tb_fat_cad_dom_familia` | DW PEC | required/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_fat_cad_dom_familia | 136204 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 5 | `tb_cidadao` | PEC operacional | required/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_cidadao | 70569 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 6 | `tb_fat_cidadao_pec` | DW PEC | required/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_fat_cidadao_pec | 51810 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 7 | `tb_fat_atendimento_individual` | DW PEC | required/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7, m1, m2 | Cursor; cursor=co_seq_fat_atd_ind | 512023 | synced (2026-06-01) | PII sensivel; mascarar logs |
| 8 | `tb_fat_atendimento_domiciliar` | DW PEC | required/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atend_domiciliar | 65 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 9 | `tb_fat_atendimento_odonto` | DW PEC | required/sensitive | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atd_odnt | 50200 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 10 | `tb_fat_proced_atend` | DW PEC | required/low | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_proced_atend | 827362 | source_available (2026-05-28) | baixo |
| 11 | `tb_fat_atd_ind_procedimentos` | DW PEC | required/low | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atend_ind_proced | 577151 | source_available (2026-05-28) | baixo |
| 12 | `tb_fat_atd_ind_problemas` | DW PEC | required/low | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atend_ind_problemas | 578286 | source_available (2026-05-28) | baixo |
| 13 | `tb_fat_atd_ind_exames` | DW PEC | required/low | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atd_ind_exames | 45327 | source_available (2026-05-28) | baixo |
| 14 | `tb_fat_atd_ind_encaminhamentos` | DW PEC | required/low | c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atd_ind_encaminham | 32891 | source_available (2026-05-28) | baixo |
| 15 | `tb_fat_atd_ind_medicamentos` | DW PEC | required/low | c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_atd_ind_medicam | 311489 | source_available (2026-05-28) | baixo |
| 16 | `tb_fat_vacinacao` | DW PEC | required/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_vacinacao | 87867 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 17 | `tb_fat_atividade_coletiva` | DW PEC | required/low | acs, territorio, cvat, m1, m2 | Cursor; cursor=co_seq_fat_atividade_coletiva | 4645 | source_available (2026-05-28) | baixo |
| 18 | `tb_fat_atvdd_coletiva_part` | DW PEC | required/low | acs, territorio, cvat, m1, m2 | Cursor; cursor=co_seq_fat_atvdd_cltv_part | 105627 | source_available (2026-05-28) | baixo |
| 19 | `tb_fat_atvdd_coletiva_ext` | DW PEC | required/low | m1, m2 | Cursor; cursor=co_seq_fat_atvdd_cltv_ext | 4335 | source_available (2026-05-28) | baixo |
| 20 | `tb_fat_atvdd_coletiva_int` | DW PEC | required/low | m1, m2 | Cursor; cursor=co_seq_fat_atvdd_cltv_int | 310 | source_available (2026-05-28) | baixo |
| 21 | `tb_fat_atvdd_coletiva_propart` | DW PEC | required/low | m1, m2 | Cursor; cursor=co_seq_fat_atvdd_cltv_propart | 12747 | source_available (2026-05-28) | baixo |
| 22 | `tb_fat_ivcf` | DW PEC | required/sensitive | c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_ivcf | 2742 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 23 | `tb_dim_cbo` | Dimension | required/none | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | FullRefresh; cursor=co_seq_dim_cbo | 842 | synced (2026-06-01) | baixo |
| 24 | `tb_dim_equipe` | Dimension | required/none | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | Cursor; cursor=co_seq_dim_equipe | 78 | synced (2026-06-01) | baixo |
| 25 | `tb_dim_unidade_saude` | Dimension | required/none | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | Cursor; cursor=co_seq_dim_unidade_saude | 66 | synced (2026-06-01) | baixo |
| 26 | `tb_dim_tempo` | Dimension | required/none | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | FullRefresh; cursor=co_seq_dim_tempo | 130395 | synced (2026-06-01) | baixo |
| 27 | `tb_dim_turno` | Dimension | required/none | acs, territorio, cvat | FullRefresh; cursor=co_seq_dim_turno | 8 | synced (2026-06-01) | baixo |
| 28 | `tb_dim_desfecho_visita` | Dimension | required/none | acs, territorio, cvat | FullRefresh; cursor=co_seq_dim_desfecho_visita | 8 | synced (2026-06-01) | baixo |
| 29 | `tb_dim_municipio` | Dimension | required/none | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | FullRefresh; cursor=co_seq_dim_municipio | 1002 | source_available (2026-05-28) | baixo |
| 30 | `tb_dim_profissional` | Dimension | required/sensitive | acs, territorio, cvat, b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7, m1, m2 | Cursor; cursor=co_seq_dim_profissional | 1558 | synced (2026-06-01) | PII sensivel; mascarar logs |
| 31 | `tb_dim_procedimento` | Dimension | required/none | b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_dim_procedimento | 1089 | source_available (2026-05-28) | baixo |
| 32 | `tb_proced` | PEC operacional | required/none | b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_proced | 5289 | source_available (2026-05-28) | baixo |
| 33 | `tb_dim_tipo_consulta_odonto` | Dimension | required/none | b1, b2, b3, b4, b5, b6 | FullRefresh; cursor=co_seq_dim_tipo_cnsulta_odonto | 6 | source_available (2026-05-28) | baixo |
| 34 | `tb_dim_tipo_atendimento` | Dimension | required/none | c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_dim_tipo_atendimento | 11 | source_available (2026-05-28) | baixo |
| 35 | `tb_dim_ciap` | Dimension | required/none | c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_dim_ciap | 644 | source_available (2026-05-28) | baixo |
| 36 | `tb_dim_cid` | Dimension | required/none | c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_dim_cid | 4405 | source_available (2026-05-28) | baixo |
| 37 | `tb_ciap` | PEC operacional | required/none | c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_seq_ciap | 750 | source_available (2026-05-28) | baixo |
| 38 | `tb_cid10` | PEC operacional | required/none | c1, c2, c3, c4, c5, c6, c7 | FullRefresh; cursor=co_cid10 | 14246 | source_available (2026-05-28) | baixo |
| 39 | `tb_lotacao` | PEC operacional | required/low | m1, m2 | FullRefresh; cursor=co_seq_lotacao | 1022 | source_available (2026-05-28) | baixo |
| 40 | `tb_prof` | PEC operacional | required/sensitive | m1, m2 | FullRefresh; cursor=co_seq_prof | 512 | source_available (2026-05-28) | PII sensivel; mascarar logs |
| 41 | `tb_equipe` | PEC operacional | required/none | m1, m2 | FullRefresh; cursor=co_seq_equipe | 38 | source_available (2026-05-28) | baixo |
| 42 | `tb_tipo_equipe` | PEC operacional | required/none | m1, m2 | FullRefresh; cursor=co_seq_tipo_equipe | 57 | source_available (2026-05-28) | baixo |
| 43 | `tb_fat_atend_odonto_proced` | DW PEC | required/low | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atend_odonto_proced | 166633 | source_available (2026-05-28) | baixo |
| 44 | `tb_fat_atend_odonto_encaminham` | DW PEC | required/low | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atd_odo_encaminham | 39 | source_available (2026-05-28) | baixo |
| 45 | `tb_fat_atend_odonto_exames` | DW PEC | required/low | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atd_odo_exames | 470 | source_available (2026-05-28) | baixo |
| 46 | `tb_fat_atend_odonto_medicament` | DW PEC | required/low | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atd_odo_medicam | 10655 | source_available (2026-05-28) | baixo |
| 47 | `tb_fat_atend_odonto_problemas` | DW PEC | required/low | b1, b2, b3, b4, b5, b6 | Cursor; cursor=co_seq_fat_atnd_odonto_probl | 49553 | source_available (2026-05-28) | baixo |
| 48 | `tb_registro_vacinacao` | DW PEC | optional/low | c7, cvat | Cursor; cursor=co_seq_registro_vacinacao | 0 | source_available | optional pendente |
| 49 | `tb_fat_vacinacao_vacina` | DW PEC | optional/low | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_vacinacao_vacina | 0 | source_available | optional pendente |
| 50 | `tb_fat_marca_consumo_alimnt` | DW PEC | optional/sensitive | acs, territorio, cvat, c1, c2, c3, c4, c5, c6, c7 | Cursor; cursor=co_seq_fat_marca_con_almnt | 0 | source_available | optional pendente |
| 51 | `tb_cds_cad_individual` | Cds | optional/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_cds_cad_individual | 0 | source_available | optional pendente |
| 52 | `tb_cds_cad_domiciliar` | Cds | optional/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_cds_cad_domiciliar | 0 | source_available | optional pendente |
| 53 | `tb_cds_ficha_visita_domiciliar` | Cds | required/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_cds_ficha_visita_dom | 80491 | synced (2026-06-01) | PII sensivel; mascarar logs |
| 54 | `tb_cds_visita_domiciliar` | Cds | optional/sensitive | acs, territorio, cvat | Cursor; cursor=co_seq_cds_visita_domiciliar | 0 | source_available | optional pendente |
| 55 | `tb_dim_tipo_ficha` | Dimension | optional/none | acs, territorio, cvat | FullRefresh; cursor=co_seq_dim_tipo_ficha | 0 | source_available | optional pendente |
| 56 | `tb_tipo_consulta_odonto` | PEC operacional | optional/none | b1, b2, b3, b4, b5, b6 | FullRefresh; cursor=co_seq_tipo_consulta_odonto | 5 | source_available (2026-05-28) | baixo |

## Campos minimos atendidos

- Origem PEC: coluna `Origem`.
- Destino app/central: `sus_analytics_ingest` para chunks brutos e `sus_analytics_replica` para dados normalizados.
- Chave primaria/chunk key: coluna `Sync/checkpoint`.
- Coluna incremental: cursor informado na coluna `Sync/checkpoint`.
- Dependencia de indicadores: coluna `Indicadores`.
- Status de sincronizacao: coluna `Status runtime`.
- Volume aproximado: coluna `Volume runtime`.

## Observacoes

- Tabelas com `optional pendente` estavam descobertas no schema, mas sem `lastSyncedAt` no `/readyz` consultado.
- Tabelas `sensitive` devem manter mascaramento de logs e nao podem expor CPF/CNS completo.
- `source_available` indica que a fonte existe/foi descoberta; nao equivale necessariamente a sincronizacao recente completa.

