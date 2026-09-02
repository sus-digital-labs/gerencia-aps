# Status canônico — Saúde Brasil 360

**Data de referência:** 2026-08-26  
**Diagnóstico:** `FIOCRUZ_ANALYTICS_CORE_NEEDS_ALIGNMENT`  
**Política de decisão:** `ISSUE_FIRST`

## 1. Resumo executivo

O produto possui documentação e rotinas para o conjunto de 21 métricas operacionais, mas há divergências entre fonte normativa, contrato de dados, código legado e evidência de runtime. O status desta revisão não é de homologação nacional. O objetivo é tornar essas divergências explícitas, impedir que um número aproximado seja apresentado como indicador oficial e ordenar as correções pela dependência de fonte.

A fonte externa atualmente verificada confirma a instituição do Siaps pela Portaria GM/MS nº 7.639, de 18 de julho de 2025, o calendário mensal de envio, o cálculo quadrimestral dos Componentes II e III e a política de rejeição de dados enviados por versões incompatíveis [1] [2] [3] [4].

## 2. Estado por eixo

| Eixo | Estado | Evidência | Decisão |
|---|---|---|---|
| Catálogo nacional | Atualizado | Índice oficial de Notas Metodológicas | Manter P1–P6, CR1–CR4 e R1–R6 como catálogo fora do escopo do produto. |
| Escopo do produto | Definido | Matriz local e documentos canônicos | Manter 21 métricas: 15 de Qualidade APS + 6 CVAT. |
| C1 | `C1_BLOCKED_BY_DATA_CONTRACT` | Regra exige demanda programada/total; schema auditado não expõe tipo de demanda | Não calcular por heurística; manter `ISSUE_FIRST` e abrir issue de contrato. |
| C2–C7 | `requires_official_validation` quando indicado | Implementações e proxies locais | Homologar fonte, janela, code sets e campos antes de promover status. |
| B1–B6 | `requires_official_validation` quando indicado | Divergências de mapeamento e nomenclatura históricas | Reconciliar códigos internos com as notas específicas. |
| M1–M2 | `requires_official_validation` quando indicado | Dependência de escopo e identidade de pessoa assistida | Validar eMulti, ações compartilhadas e deduplicação. |
| CVAT1–CVAT6 | `derived_operational_rule` | Regras locais e fontes do componente | Não apresentar como fórmula nacional fechada sem fonte específica. |
| Compatibilidade e-SUS APS | `P0-operational` | NT 12/2025, NI 13/2025 e versão 5.5.24 | Bloquear envio por versões incompatíveis e registrar versão/modelo. |
| Identidade FCI/FCDT | `P1-data-quality` | Inconsistências 3 e 8 relatadas na auditoria | Corrigir o contrato de identidade e o fluxo de saneamento manual. |
| Idempotência do importador | `VERIFIED_IN_CONTROLLED_PATH` | Código controlado usa upsert com `ON CONFLICT DO UPDATE` e chaves duráveis no outbox | Preservar testes de reprocessamento e observabilidade; não registrar ausência como bloqueador. |
| Parametrização municipal | `VERIFIED_IN_CONTROLLED_PATH` | Município é parametrizado no código controlado | Preservar teste de parametrização e rejeição de default indevido; não registrar hardcode sem evidência. |
| Routers e tipos centrais | `VERIFIED_IN_CONTROLLED_PATH` | Router central sem `@ts-nocheck`; dívida restrita a módulos auxiliares legados | Manter tipagem estrita nos routers ativos e corrigir a UI auxiliar separadamente. |

## 3. Bloqueador P0 — C1

A Nota Metodológica C1 define a razão entre atendimentos de demanda programada e o total de atendimentos. A tabela `tb_fat_atendimento_individual` está presente como fato de atendimento no DW auditado, porém o contrato disponível não contém uma coluna confiável de tipo de demanda que permita identificar programada e espontânea.

O tipo de atendimento, quando disponível em uma dimensão separada, só pode ser usado após prova de que a chave está presente no fato, que a dimensão é carregada na réplica, que os códigos estão vigentes e que o mapeamento corresponde à nota oficial. A mera existência nominal de `tb_dim_tipo_atendimento` na documentação não comprova disponibilidade no dataset de produção.

**Decisão:** C1 retorna `C1_BLOCKED_BY_DATA_CONTRACT` quando a variável de tipo de demanda ou a cadeia de dimensão não estiver disponível. O sistema não deve converter ausência de evidência em zero, percentual nulo, percentual aproximado ou fallback textual.

## 4. Correção cronológica obrigatória

O manual oficial do Siaps informa que o sistema foi instituído pela Portaria GM/MS nº 7.639, de 18 de julho de 2025 [1]. Assim, qualquer documento que diga que o Siaps foi instituído ou lançado em junho de 2025 deve ser corrigido. Caso o texto esteja descrevendo uma etapa de preparação anterior, essa etapa deve ser nomeada como preparação, anúncio ou transição, sem atribuir a ela a instituição normativa.

## 5. Compatibilidade e atualização operacional

A Nota Técnica nº 12/2025 informa que dados enviados por versões do e-SUS APS liberadas há mais de 12 meses serão invalidados e que o critério passou a ser aplicado em 1º de janeiro de 2026 [3]. A Nota Informativa nº 13/2025 registra, para a competência setembro de 2025, 652 municípios com 136.462 registros enviados pelo CDS Offline e 67 municípios com 728.128 registros de versões 5.3.19 ou anteriores [4]. Esses números são um retrato histórico da competência indicada na nota, não um retrato atual de agosto de 2026.

A página oficial de versões registra a versão 5.5.24, publicada em 03/08/2026, com alterações no Cadastro Individual, na priorização do CPF, na identificação do cidadão, em vacinas e em módulos de acompanhamento [5]. O sincronizador deve registrar a versão de origem, o modelo de informação, a competência, o resultado da validação e o motivo de rejeição.

## 6. Identidade cadastral FCI/FCDT

A auditoria relata inconsistências quando o Cadastro Individual usa CPF e o Cadastro Domiciliar e Territorial usa CNS, incluindo os motivos internos denominados Inconsistência nº 3 — responsável não declarado — e nº 8 — cidadão sem vínculo com o domicílio. Este registro trata essas ocorrências como achado de qualidade e integração do produto, não como fórmula de indicador.

Até existir resolução de identidade comprovada, o produto deve conservar o registro como pendente, impedir união silenciosa por aproximação e expor somente contagens agregadas. A versão 5.5.24 reforça o CPF como identificador principal em fluxos do e-SUS APS, com uso do CNS quando o cidadão não possui CPF [5]; a mudança exige atualização dos mapeamentos e do saneamento local, não uma junção automática retroativa.

## 7. Decisões de engenharia

| Decisão | Aplicação |
|---|---|
| `ISSUE_FIRST` | Abrir issue antes de alterar upstream quando falta variável normativa. |
| `FAIL_CLOSED` | Não retornar número quando fonte obrigatória está ausente ou incompatível. |
| `SOURCE_OF_TRUTH_OFFICIAL` | Usar nota metodológica e portaria vigente como referência final. |
| `RUNTIME_IS_EVIDENCE` | Tratar execução local/pública como evidência técnica, não como homologação. |
| `NO_PII_IN_AGGREGATE` | Não retornar CPF, CNS completo, nome, telefone, endereço ou SQL bruto. |
| `VERSIONED_RULES` | Alterar `ruleVersion` quando mudar fonte, fórmula, janela, code set ou identidade. |

## 8. Próximas ações ordenadas

| Prioridade | Ação | Critério de aceite |
|---:|---|---|
| P0 | Corrigir contrato do C1 para disponibilizar tipo de demanda e chave de dimensão | Consulta reprodutível distingue programada/espontânea e passa teste de cardinalidade. |
| P0 | Validar versões e modelos no importador | Registros incompatíveis são rejeitados com motivo e sem perda silenciosa. |
| P1 | Corrigir identidade FCI/FCDT | CPF/CNS seguem regra oficial; inconsistências são rastreáveis e não unidas por heurística. |
| P1 | Preservar e testar idempotência do importador | Reprocessamento da mesma origem não duplica fatos; a capacidade já foi observada no código controlado. |
| P1 | Testar parametrização municipal | Município/UF são derivados de parâmetro ou dimensão válida, sem default silencioso. |
| P1 | Manter tipagem estrita nos routers e contratos de indicador | Um contrato canônico por indicador, sem `@ts-nocheck` nos routers ativos; dívida auxiliar segue separada. |
| P1 | Reconciliar B1–B6, C2–C7 e M1–M2 | Código, documento e fonte usam o mesmo código e nome normativo. |
| P2 | Reavaliar o escopo de P/CR/R | Só incorporar após decisão, fonte, campos, testes e política de acesso. |

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/inerte/visao-geral "Ministério da Saúde — Apresentação do Manual do Siaps"
[2]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/ "Ministério da Saúde — Calendário Siaps 2026"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Ministério da Saúde — Nota Técnica nº 12/2025"
[4]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Ministério da Saúde — Nota Informativa nº 13/2025"
[5]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "Ministério da Saúde — e-SUS APS versão 5.5.24"

**Status final desta revisão:** documentação atualizada e alinhada para orientar correções; C1 permanece bloqueado até o contrato de dados ser corrigido.
