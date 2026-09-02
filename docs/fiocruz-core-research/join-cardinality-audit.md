# Auditoria de cardinalidade e joins

**Snapshot:** `CampusVirtualFiocruz/painel-esus` — `d21fe44562fd73c4ae46261a40496079b6e94f15`  
**Estado:** diagnóstico privado; não alterar joins nesta rodada.

## Pergunta de controle

Um atendimento pode virar várias linhas depois de combinar fato de atendimento, procedimentos, CID/CIAP, CBO, equipe, unidade, vacinação, visitas ou dimensão de códigos? Se a resposta for sim, o cálculo precisa provar em que etapa a unidade de contagem volta a ser atendimento ou pessoa.

| Candidato | Cadeia observada | Unidade de contagem presumida | Risco | Teste sintético obrigatório |
|---|---|---|---|---|
| Diabetes | FCI → dimensão raça; FAI → códigos CID/CIAP; códigos agrupados por atendimento; depois FAI → pessoa; também concatena FAI, FAOI e procedimentos para evidências clínicas | Pessoa para totais e atendimento em etapas intermediárias | Dimensão duplicada, múltiplos códigos por atendimento e concatenação podem inflar contagens se a deduplicação não ocorrer no ponto correto | Uma pessoa, dois atendimentos, dois códigos em um atendimento e uma dimensão duplicada; esperar uma pessoa e dois atendimentos. |
| Hipertensão | Mesmo pipeline/repositório compartilhado de Diabetes, com agregações de complicações, exames e consultas | Pessoa para totais; atendimento para evidências | Reuso do mesmo fato para múltiplos indicadores pode misturar universo de condição e universo de atendimento | Uma pessoa com dois agravos e três registros de exame; verificar que cada agravo é binário por pessoa e exame não altera total de pessoas. |
| Criança | Base `crianca.parquet` já materializada; queries fazem `count(*)` e agrupamentos por faixa/sexo; gerador possui joins repetidos e agrupamentos por pessoa | Pessoa/criança | Se o Parquet final tiver mais de uma linha por criança, `count(*)` infla todos os cartões | Uma criança com duas fichas e uma visita; esperar uma linha na base final e uma contagem por criança. |
| Idoso | ACV/FCI/FAI/FAOI/visitas/procedimentos/vacinação/IVCF/dimensões; joins de CBO e agrupamentos por pessoa | Pessoa idosa | Uma dimensão ou fato 1:N sem redução prévia pode multiplicar registros antes da seleção final | Uma pessoa com duas vacinas, duas visitas e dois códigos; validar redução para uma pessoa e flags corretos. |
| Saúde Bucal | Base `saude_bucal.parquet`; queries contam diretamente linhas após filtro de categoria e flag `agg_*` | Pessoa cadastrada/atendida, conforme contrato | Duplicidade no Parquet ou categoria simultânea pode inflar contagem; `supervised_brushing()` usa campo de exodontia | Uma pessoa com dois procedimentos e uma ação de escovação; esperar uma unidade de pessoa e campo específico de escovação. |
| Cadastro | `cadastro_db.parquet`; consultas de total, status/origem e lista nominal | Pessoa cadastrada | Fato duplicado, vínculo múltiplo ou join de território pode duplicar cadastros e taxas | Uma pessoa com duas fichas e dois vínculos históricos; definir qual registro é vigente e esperar uma pessoa. |

## Pontos de atenção no código

No gerador de Diabetes, a combinação de códigos é agrupada por `co_seq_fat_atd_ind` antes de voltar ao cidadão. Isso é uma boa intenção de redução, mas deve ser provado com um caso que contenha múltiplos códigos no mesmo atendimento. A seleção final da pessoa também aplica `unique` por `co_fat_cidadao_pec`; o teste deve verificar qual registro é preservado e se a ordenação realmente representa a regra.

No gerador de Idoso, há várias fontes de atendimento e dimensões de CBO. Como as janelas usam o relógio atual e a base final é alimentada por múltiplos fatos, o teste de cardinalidade deve ser executado com `reference_date` fixa e contagem antes/depois de cada join.

As queries de Criança, Saúde Bucal e Cadastro usam contagens sobre Parquet derivados. O contrato de materialização deve declarar se cada linha representa pessoa, atendimento, procedimento ou participação. Sem essa declaração, `count(*)` não é evidência suficiente de numerador ou denominador.

## Invariantes para todos os candidatos

| Invariante | Verificação |
|---|---|
| Identidade | Chave técnica não nula e única na camada de pessoa. |
| Atendimento | Chave do atendimento única antes de agregar por pessoa. |
| Dimensão | Chave de dimensão única por versão/competência. |
| Join | Cardinalidade declarada e testada com linha 0, 1 e N. |
| Agregação | A unidade de contagem é explícita em cada etapa. |
| Reprocessamento | Mesmo lote não cria linhas adicionais. |
| Ausência | Join sem correspondência não vira automaticamente evidência positiva ou zero normativo. |

## Decisão

A primeira primitive deve evitar a alteração estrutural de joins. A auditoria de cardinalidade precisa preceder qualquer `NormalizedEncounter` ou transformação de identidade. O primeiro patch de core deve atuar no contexto determinístico dos consumidores Diabetes/Hipertensão e deixar esta matriz como gate de adoção incremental.
