# PEC/DW Table Map

## Objetivo

Mapear tabelas e campos prováveis para cálculo de indicadores e diagnóstico de pendências, com separação explícita entre dados de origem PEC (réplica local) e DW analítico central.

## Regra crítica

- Este documento **não autoriza** escrita direta em tabela de banco PEC.
- Correções operacionais devem seguir fluxo LEDI + agente local.

## Convenções

- `PEC_REPLICA.*`: leitura no agente/replica local.
- `DW.*`: estrutura analítica central para cálculo e monitoramento.
- `status_fonte`: `confirmed` ou `requires_official_validation`.

## Mapeamento de entidades

| Entidade | Tabelas PEC prováveis | Tabelas DW prováveis | Campos principais | Joins necessários | status_fonte |
| --- | --- | --- | --- | --- | --- |
| Cidadão | `PEC_REPLICA.tb_cidadao`, `tb_cidadao_pec` | `DW.dim_cidadao` | `co_seq_cidadao`, `nu_cpf`, `nu_cns`, sexo, nascimento | cidadão ↔ domicílio ↔ equipe | requires_official_validation |
| Domicílio/território | `tb_domicilio`, `tb_familia` | `DW.dim_domicilio`, `DW.bridge_cidadao_domicilio` | endereço, microárea, equipe, território | domicílio ↔ unidade ↔ equipe/INE | requires_official_validation |
| Profissional/CBO | `tb_profissional`, `tb_lotacao` | `DW.dim_profissional` | CNS profissional, CBO, vínculo, unidade | profissional ↔ equipe ↔ CNES | requires_official_validation |
| Equipe/INE | `tb_equipe` | `DW.dim_equipe` | `nu_ine`, tipo equipe, município | equipe ↔ município ↔ unidade | requires_official_validation |
| Unidade/CNES | `tb_unidade_saude` | `DW.dim_unidade` | `nu_cnes`, tipo unidade, município | unidade ↔ município | requires_official_validation |
| Município/IBGE | `tb_dim_municipio` | `DW.dim_municipio` | `co_ibge`, nome, UF | município ↔ unidade/equipe | confirmed |
| Atendimentos APS | `tb_atend`, `tb_fat_atend_ind` | `DW.fat_atendimento_aps` | data atendimento, procedimento, profissional | atendimento ↔ cidadão/profissional/equipe | requires_official_validation |
| Procedimentos | `tb_procedimento`, `tb_producao` | `DW.fat_procedimento` | código procedimento, competência, quantidade | procedimento ↔ atendimento ↔ equipe | requires_official_validation |
| Vacinação | `tb_vacina`, `tb_imunizacao` | `DW.fat_imunizacao` | imunobiológico, dose, data, lote | vacina ↔ cidadão ↔ unidade | requires_official_validation |
| Saúde bucal | `tb_odonto_*` | `DW.fat_odonto` | consulta, tratamento, exodontia, preventivo | odonto ↔ cidadão ↔ equipe SB | requires_official_validation |
| eMulti | `tb_emulti_*` | `DW.fat_emulti` | categoria profissional, ação, data | emulti ↔ equipe ↔ cidadão | requires_official_validation |
| LEDI auditoria | n/a (não persistir em PEC) | `DW.ledi_payload_audit`, `DW.ledi_payload_errors` | status envio, código erro, correlação | payload ↔ correção ↔ sync | confirmed |
| Freshness | n/a | `DW.dw_table_freshness`, `DW.etl_runs` | atraso por tabela, timestamp ETL | tabela ↔ indicador | confirmed |

## Campos mínimos para regras de indicador

- Identificação do cidadão: `nu_cpf` ou `nu_cns` (mascarado fora de contexto autorizado)
- Territorialização: `co_ibge`, `nu_cnes`, `nu_ine`
- Tempo: `dt_competencia`, `dt_atendimento`, `dt_ultima_atualizacao`
- Evidência clínica/cadastral: código de procedimento/ação/exame conforme regra
- Escopo profissional: CBO, perfil, vínculo com equipe/unidade

## Joins canônicos (alto nível)

1. `DW.fat_*` → `DW.dim_cidadao`
2. `DW.fat_*` → `DW.dim_equipe` → `DW.dim_unidade` → `DW.dim_municipio`
3. `DW.fat_*` → `DW.dim_profissional` (para CBO e escopo)
4. `DW.indicator_results` → `DW.indicator_diagnostic_reasons` → `DW.indicator_quality_issues`

## Checklist de uso em implementação

- [ ] confirmar nomes físicos de tabelas por versão da instalação PEC
- [ ] validar chaves de junção para cenário multimunicípio
- [ ] garantir mascaramento PII na camada de resposta/log
- [ ] versionar qualquer mudança de regra de join em ADR ou changelog
