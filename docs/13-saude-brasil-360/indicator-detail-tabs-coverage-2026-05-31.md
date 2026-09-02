# Indicator Detail Tabs Coverage - 2026-05-31

Status final: `DONE_C2_C3_C5_C6_NOMINAL_BATCH_VALIDATED`

Fonte da validacao: runtime `http://127.0.0.1:3005`, commit base `5fe7ee8`, smoke `scripts/tests/shared/smoke-b360-detail-tabs.mjs`.

## Matriz

| Indicador | Agregado | Numerador | Denominador | Visao Geral | Denominador | Numerador | Pendentes | Query nominal | Tabelas principais | Tempo smoke | Status |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- | ---: | --- |
| B1 | ok | validado | validado | funcional | blocked_by_schema | blocked_by_schema | blocked_by_schema | nao | `tb_fat_atendimento_odonto`, `tb_fat_proced_atend`, `tb_fat_cidadao_pec` | 4757ms | nominal_missing |
| B2 | ok | validado | validado | funcional | blocked_by_schema | blocked_by_schema | blocked_by_schema | nao | `tb_fat_atendimento_odonto`, `tb_fat_proced_atend` | 155ms | nominal_missing |
| B3 | ok | validado | validado | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_proced_atend`, `tb_dim_procedimento` | 350ms | aggregate_only |
| B4 | ok | validado | validado | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_proced_atend`, `tb_dim_procedimento` | 304ms | aggregate_only |
| B5 | ok | 2152 | 8240 | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_proced_atend`, `tb_dim_procedimento` | 285ms | aggregate_only |
| B6 | ok | validado | validado | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_proced_atend`, `tb_dim_procedimento` | 275ms | aggregate_only |
| C1 | ok | validado | validado | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_atendimento_individual`, `tb_fat_cad_individual` | 1298ms | aggregate_only |
| C2 | ok | validado | validado | funcional | ok | ok | ok | sim, cache analitico materializado | `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_vacinacao`, `tb_fat_visita_domiciliar`, `b360_indicator_detail_row_cache` | abas quentes <=30ms | ready |
| C3 | ok | validado | validado | funcional | ok | ok | ok | sim, cache analitico materializado | `tb_fat_atendimento_individual`, `tb_fat_atd_ind_exames`, `tb_fat_vacinacao`, `tb_fat_atendimento_odonto`, `b360_indicator_detail_row_cache` | abas quentes <=10ms | ready |
| C4 | ok | validado | validado | funcional | blocked_by_schema | blocked_by_schema | blocked_by_schema | nao | `tb_fat_cad_individual`, `tb_fat_atendimento_individual`, `tb_fat_proced_atend` | 10089ms | nominal_missing/performance_risk |
| C5 | ok | validado | validado | funcional | ok | ok | ok | sim, cache analitico materializado | `tb_fat_cad_individual`, `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar`, `b360_indicator_nominal_cache` | agregado domina; abas quentes <=30ms | ready |
| C6 | ok | validado | validado | funcional | ok | ok | ok | sim, cache analitico materializado | `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `b360_indicator_detail_row_cache` | abas quentes <=10ms | ready |
| C7 | ok | validado | validado | funcional | blocked_by_schema | blocked_by_schema | blocked_by_schema | nao | `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_proced_atend` | 2708ms | nominal_missing |
| M1 | ok | validado | validado | funcional | aggregate_only | aggregate_only | empty | nao, evento agregado | `tb_fat_atendimento_individual`, `tb_fat_proced_atend`, `tb_dim_equipe` | 706ms | aggregate_only |
| M2 | ok | validado | validado | funcional | aggregate_only | aggregate_only | not_applicable | nao, evento agregado | `tb_fat_atendimento_individual`, `tb_fat_proced_atend`, `tb_dim_equipe` | 588ms | aggregate_only |

## Decisoes

- `blocked_by_schema`: o agregado esta correto, mas a coorte nominal por cidadao ainda nao tem contrato de fonte validado para exposicao individual.
- `aggregate_only`: o indicador e predominantemente evento/procedimento; a aba mostra total agregado e mensagem explicita, sem lista vazia silenciosa.
- `not_applicable`: pendencia nominal nao se aplica como lista de pessoas, caso B5 pendentes = procedimentos odontologicos individuais nao preventivos.
- `ok`: C2/C3/C6 retornam linhas reais por batch; C5 retorna linhas reais via cache analitico quente e identificadores mascarados.

## B5

Antes: aba Pendentes mostrava "Detalhe nominal ainda nao implementado" para 6088 registros esperados.

Depois: aba Pendentes retorna `not_applicable`, `expectedTotal=6088`, `piiSafe=true`, com mensagem: pendentes B5 representam procedimentos odontologicos individuais que nao entraram como preventivos no numerador, nao lista nominal de cidadaos.
