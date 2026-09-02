# Matriz QA Final — 21 Indicadores Saúde Brasil 360

Atualização: 2026-06-02

## Diagnóstico

O dashboard dos 15 indicadores de Qualidade APS usa o contrato canônico `saudeBrasil360.catalog` + `saudeBrasil360.calcularIndicador`. A página de detalhe usava o mesmo contrato apenas para o cabeçalho, mas as abas `Denominador`, `Numerador` e `Pendentes` recebiam `citizens=[]` fixo no frontend. Portanto, total nominal `0` nas abas não era evidência de ausência de dados: era ausência de contrato nominal.

Foi criado o contrato `saudeBrasil360.indicatorDetail` para impedir fallback silencioso. Quando a query nominal específica ainda não existe, o endpoint retorna `blocked_by_schema`; quando o indicador é naturalmente agregado/evento, retorna `aggregate_only` ou `not_applicable`. Em todos os casos o retorno preserva `expectedTotal`, `rows=[]` quando aplicável, `piiSafe=true` e warnings explícitos.

## Legenda

| Status | Significado |
|---|---|
| `ready_runtime_validated` | Agregado calculado no runtime com fonte real |
| `ready_aggregate_only_detail_missing` | Agregado OK, detalhe nominal ainda sem query própria |
| `empty_denominator_proven` | Denominador zero comprovado pelo runtime |
| `blocked_by_source` | Fonte PEC/DW indisponível ou sem permissão |
| `blocked_by_external_source` | Depende de fonte externa ao PEC |
| `needs_query_fix` | Query agregada ou regra normativa precisa correção |
| `needs_nominal_detail_fix` | Query nominal/paginação precisa implementação |
| `needs_performance_optimization` | Query funcional, mas acima do alvo |

## Matriz

| Código | Nome oficial | Componente | Fonte normativa | Fórmula | Janela | Tabelas PEC/DW principais | Status agregado | Status detalhe nominal | Dashboard | Runtime | LGPD | Risco | Decisão final |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Primeira Consulta Odontológica Programada | Qualidade APS/eSB | Nota Metodológica B1 | numerador / denominador x 100 | 12 meses/quadrimestre | `tb_fat_atendimento_odonto`, `tb_dim_tipo_consulta_odonto`, `tb_fat_cad_individual` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | denominador eSB precisa trilha nominal | `ready_aggregate_only_detail_missing` |
| B2 | Tratamento Odontológico Concluído | Qualidade APS/eSB | Nota Metodológica B2 | numerador / denominador x 100 | 12 meses/quadrimestre | `tb_fat_atendimento_odonto`, `tb_fat_atend_odonto_encaminham` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | detalhe deve listar primeiras consultas/tratamentos | `ready_aggregate_only_detail_missing` |
| B3 | Taxa de Exodontia | Qualidade APS/eSB | Nota Metodológica B3 | exodontias / total procedimentos x 100 | 12 meses/quadrimestre | `tb_fat_atend_odonto_proced`, `tb_dim_procedimento` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | indicador por evento/procedimento, não sempre por pessoa | `ready_aggregate_only_detail_missing` |
| B4 | Escovação Supervisionada 6-12 anos | Qualidade APS/eSB | Nota Metodológica B4 | participantes/elegíveis x 100 | 12 meses/quadrimestre | `tb_fat_atividade_coletiva`, `tb_fat_atvdd_coletiva_part`, `tb_dim_tipo_atividade` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | query nominal deve usar tipo 6 + prática supervisionada | `ready_aggregate_only_detail_missing` |
| B5 | Procedimentos Preventivos | Qualidade APS/eSB | Nota Metodológica B5 | preventivos / total procedimentos x 100 | 12 meses/quadrimestre | `tb_fat_atend_odonto_proced`, `tb_dim_procedimento` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | faixa ótima com limite superior exige revisão contínua | `ready_aggregate_only_detail_missing` |
| B6 | Tratamento Restaurador Atraumático | Qualidade APS/eSB | Nota Metodológica B6 | ART / restauradores x 100 | 12 meses/quadrimestre | `tb_fat_atend_odonto_proced`, `tb_dim_procedimento` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | lista restauradores precisa trilha de evento | `ready_aggregate_only_detail_missing` |
| C1 | Mais Acesso à APS | Qualidade APS/eSF/eAP | Nota Metodológica C1 | programados / total elegível x 100 | quadrimestral | `tb_fat_atendimento_individual`, `tb_dim_tipo_atendimento`, `tb_dim_cbo` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | classificação por faixa ótima com teto | `ready_aggregate_only_detail_missing` |
| C2 | Cuidado no Desenvolvimento Infantil | Qualidade APS/eSF/eAP | Nota Metodológica C2 | score de boas práticas / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `b360_indicator_detail_row_cache` | `ready_runtime_validated` | `ready_runtime_validated` | OK | OK | seguro sem CPF/CNS completo | refresh frio por competência/filtro ainda pode custar; quente dentro do alvo | `ready_nominal_materialized_validated` |
| C3 | Cuidado na Gestação e Puerpério | Qualidade APS/eSF/eAP | Nota Metodológica C3 | score de boas práticas / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_vacinacao`, `tb_fat_atendimento_odonto`, `b360_indicator_detail_row_cache` | `ready_runtime_validated` | `ready_runtime_validated` | OK | OK | seguro sem CPF/CNS completo | refresh frio por competência/filtro ainda pode custar; quente dentro do alvo | `ready_nominal_materialized_validated` |
| C4 | Cuidado da Pessoa com Diabetes | Qualidade APS/eSF/eAP | Nota Metodológica C4 | score de boas práticas / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | ACS antropometria precisa evidência nominal | `ready_aggregate_only_detail_missing` |
| C5 | Cuidado da Pessoa com Hipertensão | Qualidade APS/eSF/eAP | Nota Metodológica C5 | score de boas práticas / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar`, `b360_indicator_nominal_cache` | `ready_runtime_validated` | `ready_runtime_validated` | OK | OK | seguro sem CPF/CNS completo | refresh frio por competência/filtro ainda pode custar; quente dentro do alvo | `ready_nominal_materialized_validated` |
| C6 | Cuidado da Pessoa Idosa | Qualidade APS/eSF/eAP | Nota Metodológica C6 | score de boas práticas / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `b360_indicator_detail_row_cache` | `ready_runtime_validated` | `ready_runtime_validated` | OK | OK | seguro sem CPF/CNS completo | refresh frio por competência/filtro ainda pode custar; quente dentro do alvo | `ready_nominal_materialized_validated` |
| C7 | Cuidado da Mulher na Prevenção do Câncer | Qualidade APS/eSF/eAP | Nota Metodológica C7 | score por coorte / elegíveis | 12 meses/quadrimestre | `tb_fat_atendimento_individual`, `tb_fat_vacinacao` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | coortes e critérios por faixa etária | `ready_aggregate_only_detail_missing` |
| M1 | Média de Atendimentos por Pessoa pela eMulti | Qualidade APS/eMulti | Nota Metodológica M1 | atendimentos / pessoas assistidas | anual oficial | `tb_fat_atendimento_individual`, `tb_fat_atividade_coletiva`, `tb_equipe`, `tb_tipo_equipe` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | detalhe pode ser pessoa ou evento conforme fonte | `ready_aggregate_only_detail_missing` |
| M2 | Ações Interprofissionais eMulti | Qualidade APS/eMulti | Nota Metodológica M2 | ações compartilhadas / total ações x 100 | anual oficial | `tb_fat_atendimento_individual`, `tb_fat_atividade_coletiva`, `tb_equipe`, `tb_tipo_equipe` | `ready_runtime_validated` | `needs_nominal_detail_fix` | OK | OK | seguro sem CPF/CNS completo | definição de ação compartilhada deve ser rastreável | `ready_aggregate_only_detail_missing` |
| CVAT1 | Cadastro individual válido e atualizado | CVAT | NT 30/2025 | regra operacional derivada | 24 meses/quadrimestre | `tb_fat_cad_individual`, `tb_fat_cidadao_pec` | `needs_query_fix` | `needs_nominal_detail_fix` | parcial | parcial | seguro se mascarado | schema real precisa fechamento | `needs_query_fix` |
| CVAT2 | Cadastro individual + domiciliar/territorial | CVAT | NT 30/2025 | regra operacional derivada | 24 meses/quadrimestre | `tb_fat_cad_individual`, `tb_fat_cad_domiciliar`, vínculo territorial | `needs_query_fix` | `needs_nominal_detail_fix` | parcial | parcial | seguro se mascarado | campos MICDT/vínculo a confirmar | `needs_query_fix` |
| CVAT3 | Vulnerabilidade socioeconômica | CVAT | NT 30/2025 | fator PBF/BPC | quadrimestral | `tb_fat_cad_individual` | `needs_query_fix` | `needs_nominal_detail_fix` | parcial | parcial | seguro se mascarado | PBF/BPC pode faltar na réplica | `blocked_by_source` |
| CVAT4 | Perfil demográfico | CVAT | NT 30/2025 | fator idade | quadrimestral | `tb_fat_cidadao_pec` | `needs_query_fix` | `needs_nominal_detail_fix` | parcial | parcial | seguro se mascarado | regra exata de idade deve ser fixada | `needs_query_fix` |
| CVAT5 | Pessoa acompanhada/contato qualificado | CVAT | NT 30/2025 | contato assistencial 12 meses | 12 meses | `tb_fat_atendimento_individual`, `tb_fat_atividade_coletiva`, `tb_fat_visita_domiciliar` | `needs_query_fix` | `needs_nominal_detail_fix` | parcial | parcial | seguro se mascarado | parâmetros por porte/equipe | `needs_query_fix` |
| CVAT6 | Satisfação/avaliação Meu SUS Digital | CVAT | NT 30/2025 | bônus por avaliação | quadrimestral | fonte externa Meu SUS Digital | `blocked_by_external_source` | `blocked_by_external_source` | bloqueado | bloqueado | N/A | não vem do PEC | `blocked_by_external_source` |

## Decisão

Status permitido atual: `DONE_C2_C3_C5_C6_NOMINAL_BATCH_VALIDATED`.

Motivo: C2, C3, C5 e C6 possuem detalhe nominal materializado no banco analitico e validado em runtime quente; B1/B2/C4/C7 ainda exigem implementação nominal e os indicadores por evento continuam em modo agregado/drilldown pendente.
