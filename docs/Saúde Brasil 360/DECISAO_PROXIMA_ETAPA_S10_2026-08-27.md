# Decisão da próxima etapa — S10

**Data:** 2026-08-27  
**Diagnóstico de referência:** `FIOCRUZ_ANALYTICS_CORE_NEEDS_ALIGNMENT`  
**Política:** `ISSUE_FIRST` + `FAIL_CLOSED`

## Decisão

A primeira entrega deve ser o **rascunho da issue upstream para destravar o contrato do C1**. A modelagem da resolução de identidade das famílias permanece como a próxima frente P1, com investigação preparatória limitada e sem promover B3, B5 ou B6 antes de comprovar o vínculo oficial eSB↔eSF/eAP.

A decisão não significa alterar o upstream, publicar a issue ou habilitar o C1. Significa preparar uma proposta revisável pelos mantenedores, com a pergunta mínima necessária: qual campo ou relação oficial representa tipo de demanda, como a dimensão deve ser ligada ao fato e qual versão do code set deve ser usada?

## Fundamentação

O C1 é um bloqueio de contrato, não apenas um bloqueio operacional. A fórmula canônica depende da separação entre atendimentos programados e o total de atendimentos. Como o fato local não expõe uma variável confiável para essa separação, qualquer cálculo alternativo seria uma heurística sem equivalência normativa.

A prioridade P0 evita contaminar o DW com um campo nominal incorreto. `co_dim_tipo_atendimento` deve continuar sendo tratado como chave estrangeira; a resolução canônica exige `JOIN` com `tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento` e a leitura do identificador semântico `nu_identificador`. A mera presença textual da tabela dimensão não comprova sua disponibilidade no dataset efetivo.

A resolução de identidade é importante, mas seu impacto principal está concentrado em B3, B5 e B6. A frente deve ser planejada após a issue P0, porque o vínculo eSB↔eSF/eAP, a regra CPF/CNS, a competência e as chaves dimensionais precisam ser confirmados no mesmo processo de contrato e versionamento.

## Sequência aprovada

| Ordem | Entrega | Estado permitido |
|---:|---|---|
| 1 | Revisar rascunho da issue C1 com Fiocruz/MS | Documento privado, sem publicação |
| 2 | Solicitar confirmação do campo/relação de demanda e da dimensão | `PENDING_UPSTREAM_CONFIRMATION` |
| 3 | Atualizar contrato e teste de cardinalidade somente após confirmação | `NOT_STARTED` |
| 4 | Mapear vínculo oficial eSB↔eSF/eAP para B3/B5/B6 | `DISCOVERY_ONLY` |
| 5 | Definir resolução CPF/CNS e pendências familiares sem união heurística | `DESIGN_REVIEW` |
| 6 | Implementar e testar a resolução de identidade no checkout correto | `NOT_STARTED` |
| 7 | Promover C1/B3/B5/B6 somente com evidência, fixtures e revisão | `BLOCKED_UNTIL_ACCEPTANCE` |

## Escopo da issue C1

A issue deve conter: contexto da regra; fato `tb_fat_atendimento_individual`; ausência do tipo de demanda; risco de ler `co_dim_tipo_atendimento` como código `1/2/4/5/6`; necessidade de join com `tb_dim_tipo_atendimento`; requisitos de competência, code set, versão e cardinalidade; impacto no cálculo; critérios de aceite; e pergunta objetiva aos mantenedores.

A issue não deve incluir credenciais, dados de cidadãos, SQL com valores sensíveis, paths locais, solução presumida, alteração direta no banco privado ou instrução para criar uma heurística temporária.

## Trilha P1 de identidade

Enquanto a issue C1 aguarda resposta, a equipe pode mapear somente contratos e evidências: quais identificadores estão disponíveis no Cadastro Individual e no Cadastro Domiciliar e Territorial; como a equipe eSB é vinculada à eSF/eAP; quais são as chaves técnicas; quais inconsistências são observadas; e quais casos devem permanecer pendentes.

CPF e CNS podem coexistir conforme a regra oficial de identificação, mas o sistema não deve unir pessoas ou domicílios por aproximação. Ausência de vínculo oficial deve resultar em pendência rastreável, não em elegibilidade, duplicação resolvida artificialmente ou promoção de indicador.

## Falsos alarmes removidos da matriz

A matriz não deve mais tratar como bloqueadores: ausência de idempotência quando o código controlado já registra `ON CONFLICT DO UPDATE` e chaves duráveis no outbox; município hardcoded quando a parametrização foi comprovada; ou `@ts-nocheck` no router central quando a ocorrência está restrita a módulos auxiliares legados. Essas capacidades continuam sujeitas a testes e observabilidade, mas não competem com o P0 do C1.

## Critério de reavaliação

A prioridade poderá mudar somente se os mantenedores confirmarem que o contrato de tipo de demanda já existe e estiver disponível no dataset utilizado pelo produto. Sem essa evidência, o C1 permanece `C1_BLOCKED_BY_DATA_CONTRACT`, e a resolução de identidade segue como P1 independente para B3/B5/B6.
