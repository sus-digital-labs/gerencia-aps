# Prioridades — Saúde Brasil 360

**Revisão:** 2026-08-27  
**Base de alinhamento:** validação S10 e arquitetura canônica do Saúde Brasil 360.  
**Política de decisão:** `ISSUE_FIRST` para lacunas normativas ou de contrato; `FAIL_CLOSED` para ausência de evidência executável.

Este documento orienta os desenvolvedores na correção do Data Warehouse, dos contratos e dos fluxos de validação. Ele não substitui as notas metodológicas oficiais nem transforma evidência de um checkout em homologação nacional.

## 1. Escopo canônico do produto

O produto deve ser descrito como **21 cálculos canônicos**: 15 indicadores de Qualidade APS e 6 métricas CVAT.

| Grupo | Códigos | Quantidade | Situação no escopo |
|---|---|---:|---|
| Qualidade APS — eSB | B1–B6 | 6 | Incluído |
| Qualidade APS — eSF/eAP | C1–C7 | 7 | Incluído |
| Qualidade APS — eMulti | M1–M2 | 2 | Incluído |
| CVAT | CVAT1–CVAT6 | 6 | Incluído |
| **Total** | — | **21** | **Escopo canônico** |

Qualquer texto que apresente “15 indicadores” como escopo total deve ser tratado como dívida documental legada. O número 15 corresponde somente ao conjunto de Qualidade APS; as 6 métricas CVAT completam os 21 cálculos operacionais.

## 2. Prioridade P0 — contrato do C1 e compatibilidade de dados

| Item | Estado canônico | Instrução obrigatória | Critério de aceite |
|---|---|---|---|
| **C1 — Mais acesso à APS** | `C1_BLOCKED_BY_DATA_CONTRACT` | Manter `ISSUE_FIRST`. Não criar heurística local, proxy de “evidência de acesso”, percentual substituto ou zero. O cálculo exige atendimentos programados sobre o total de atendimentos. | O upstream/DW disponibiliza a variável de tipo de demanda, com competência, code set, filtros e teste reprodutível que distingue demanda programada e espontânea. Até lá, nenhum número de C1 é exibido. |
| **Chave `co_dim_tipo_atendimento`** | `P0_DATA_MAPPING` | Tratar a coluna somente como chave estrangeira. É proibido interpretá-la diretamente como código nominal `1/2/4/5/6`. Fazer `JOIN` com `tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento` e extrair o identificador semântico `nu_identificador`. | O join é verificável, sem perda ou duplicação de linhas, com dimensão carregada, code set vigente e mapeamento compatível com a nota metodológica. |
| **Compatibilidade Siaps/e-SUS APS** | `P0_OPERATIONAL` | Validar versão de origem, modelo de informação, competência e resultado da validação antes de aceitar o lote. | Lote incompatível é rejeitado com motivo rastreável; não há perda silenciosa de financiamento ou promoção para indicador calculado. |

A tabela `tb_fat_atendimento_individual` não deve ser alterada por workaround para simular o tipo de demanda. A lacuna deve ser resolvida no contrato oficial do upstream/DW ou por mapeamento formalmente aprovado pelos mantenedores.

## 3. Prioridade P1 — vínculos, qualidade e manutenção

| Item | Classificação correta | Ação para os desenvolvedores | Critério de aceite |
|---|---|---|---|
| **B3/B5/B6 — identidade e vínculos** | `P1_IDENTITY_LINK` | Priorizar o vínculo oficial entre eSB e eSF/eAP. O motor deve permitir CPF e CNS simultaneamente, respeitando a regra de identificador vigente, sem união silenciosa por aproximação. Não tratar o problema como falha genérica de cabeçalho. | Relação eSB↔eSF/eAP é carregada por chave oficial; inconsistências ficam rastreáveis; CPF/CNS não quebram vínculos familiares; ausência de vínculo não vira elegibilidade. |
| **Idempotência do importador** | `VERIFIED_IN_CONTROLLED_PATH` | Não manter a alegação de que o backend não possui idempotência. A evidência controlada registra upsert com `ON CONFLICT DO UPDATE` e chaves duráveis no outbox. Preservar testes de reprocessamento e observabilidade; não abrir um falso bloqueador por ausência de idempotência. | O mesmo lote/origem reprocessado não duplica fatos e mantém a mesma chave de idempotência. A validação deve ser feita no checkout que contém o importador; `PUBLIC_STANDALONE` não deve alegar essa capacidade apenas por documentação externa. |
| **TypeScript e `@ts-nocheck`** | `P1_LEGACY_AUXILIARY_DEBT` | Manter tipagem estrita nos routers ativos. A auditoria não encontrou `@ts-nocheck` no router central; a dívida está restrita a módulos auxiliares legados da UI. Corrigir primitives e contextos compartilhados sem reintroduzir supressões. | O typecheck dos routers ativos permanece verde; `check:full` elimina progressivamente erros da UI legada; o release-check rejeita novas supressões. |
| **B1–B6 e C2–C7** | `P1_SOURCE_RECONCILIATION` | Reconciliar código, nome, fonte, janela, denominador, code set e vínculo de equipe por nota metodológica. Não promover status somente porque existe uma rotina local. | Cada cálculo possui ficha, campos de origem, regra versionada, fixture sintética e teste de contrato. |
| **M1–M2** | `P1_SOURCE_RECONCILIATION` | Confirmar eMulti, ações compartilhadas, elegibilidade e deduplicação conforme a fonte específica. | Critérios de inclusão e deduplicação são reproduzíveis e não misturam coortes de outros grupos. |

## 4. Itens reclassificados como falsos alarmes documentais

| Alegação legada | Classificação S10 | Tratamento |
|---|---|---|
| “Backend atual não existe” ou “não há rotas estáveis” | Falso alarme para o checkout controlado | Remover da matriz. Descrever a capacidade somente no checkout em que ela foi executada; não transferir a afirmação para `PUBLIC_STANDALONE`. |
| “Não há idempotência/upsert” | Falso alarme no código controlado | Remover como bloqueador. Manter teste e observabilidade de `ON CONFLICT DO UPDATE` e outbox. |
| “Município é hardcoded” | Falso alarme no código controlado | Remover como prioridade. Manter teste que confirme parametrização do município e rejeição de default indevido. |
| “Router central usa `@ts-nocheck`” | Falso alarme | Remover. Focar na dívida de módulos auxiliares antigos e preservar tipagem estrita no router ativo. |
| “C1 deve ser trocado por `blocked_by_source`” | Classificação incorreta | Substituir por `C1_BLOCKED_BY_DATA_CONTRACT`, mantendo `ISSUE_FIRST` e sem heurística. |
| “`co_dim_tipo_atendimento` é o código nominal” | Risco real de mapeamento | Manter como P0: usar a chave apenas no join e extrair `nu_identificador` da dimensão. |

## 5. Regras de implementação

O Data Warehouse é a fonte operacional de verdade para os campos e vínculos que alimentam os cálculos. Chaves `co_dim_*` nunca devem ser lidas como valores nominais. O cálculo deve registrar fonte, competência, versão do modelo de informação, versão da regra, filtros, denominadores e motivos de bloqueio.

A ausência de campo obrigatório deve resultar em estado explícito e não numérico. Nenhum indicador pode apresentar zero, percentual nulo, score, elegibilidade ou ranking como substituto de uma fonte ausente. A mesma regra vale para erro de API, lote incompatível, join sem dimensão e vínculo eSB↔eSF/eAP não comprovado.

O `PUBLIC_STANDALONE` deve declarar apenas as capacidades presentes no próprio checkout. Evidências do importador, outbox ou routers de outro checkout podem sustentar uma decisão de engenharia, mas não provam runtime local do standalone.

## 6. Ordem recomendada

1. Abrir e revisar a issue upstream do C1, com o campo de tipo de demanda, a semântica da dimensão e os critérios de cardinalidade.
2. Corrigir e testar o join de `co_dim_tipo_atendimento` com `tb_dim_tipo_atendimento`, sem habilitar C1 antes da evidência.
3. Mapear o vínculo oficial eSB↔eSF/eAP que desbloqueia B3, B5 e B6, incluindo CPF/CNS e pendências rastreáveis.
4. Reconciliar B1–B6 e C2–C7 contra as notas metodológicas, com fixtures e testes de contrato.
5. Tratar a dívida de tipagem dos módulos auxiliares legados sem alterar a tipagem estrita dos routers ativos.
6. Executar o release-check positivo e negativo antes de qualquer promoção de status.

## Status

**Matriz alinhada à validação S10.** O único bloqueador P0 de fórmula explicitamente mantido para o produto é o contrato do C1; o vínculo eSB↔eSF/eAP é a próxima frente P1 para B3/B5/B6. A decisão não autoriza acesso à base real, publicação ou alteração em upstream.
