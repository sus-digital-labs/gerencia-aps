# Caderno técnico — Saúde Brasil 360

**Revisão:** 2026-08-26  
**Natureza:** documento derivado de fontes oficiais e evidências locais

## 1. Finalidade

Este caderno resume o modelo de dados, os grupos de indicadores e as regras de integração do SUS Analytics Web. Ele não substitui as notas metodológicas do Ministério da Saúde. Para a sequência normativa e as decisões de bloqueio, consulte [docs/13-saude-brasil-360/README.md](../13-saude-brasil-360/README.md).

## 2. Fontes consultadas

| Fonte | Uso |
|---|---|
| [Índice de Notas Metodológicas do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/) | Catálogo vigente e notas específicas. |
| [Nota Técnica nº 08/2026](https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf) | Consolidação mensal/quadrimestral, pesos e classificação. |
| [Nota Técnica nº 12/2025](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf) | Validação por versão e modelo de informação. |
| [Nota Informativa nº 13/2025](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf) | Cenário de versões incompatíveis e prazos. |
| [Versão e-SUS APS 5.5.24](https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5) | Mudanças cadastrais, de identificação e de operação publicadas em 03/08/2026. |

## 3. Escopo operacional

O produto trata 21 métricas: B1–B6, C1–C7, M1–M2 e CVAT1–CVAT6. O catálogo oficial também apresenta P1–P6, CR1–CR4 e R1–R6; esses grupos estão fora do escopo operacional atual.

| Grupo | Códigos | Estado |
|---|---|---|
| Saúde Bucal | B1–B6 | Indicadores de Qualidade APS; validar fonte, code set e denominador por nota. |
| Cuidado Integral | C1–C7 | Indicadores de Qualidade APS; C1 bloqueado por contrato. |
| eMulti | M1–M2 | Indicadores de Qualidade APS; validar escopo e identidade de pessoa assistida. |
| CVAT | CVAT1–CVAT6 | Regras operacionais derivadas; não tratar como fórmula nacional fechada. |

## 4. Regras de dados

O e-SUS APS e o Siaps devem ser tratados como fontes versionadas. Cada lote precisa registrar sistema, versão, modelo de informação, competência, estabelecimento, equipe, chave de origem, resultado de validação e motivo de rejeição. O reprocessamento deve ser idempotente.

As fontes de atendimento, cadastro, território, procedimento, exame, vacinação e atividade coletiva são relacionadas por chaves técnicas e dimensões verificadas na competência. A presença de uma tabela no caderno não comprova que ela exista na réplica ou que a semântica esteja vigente.

## 5. C1 — bloqueio de contrato

A regra do C1 exige a proporção de atendimentos de demanda programada sobre o total de atendimentos elegíveis. O schema auditado de `tb_fat_atendimento_individual` não comprova uma variável que distinga demanda programada de espontânea.

A dimensão `tb_dim_tipo_atendimento` só pode ser usada se a chave estiver presente no fato, se a dimensão estiver carregada na competência, se o code set for confirmado e se a cardinalidade não duplicar atendimentos. Até lá, C1 permanece `blocked_by_source` e não deve usar proxy textual ou de procedimento.

Consulte a [issue P0 do contrato C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md).

## 6. Identidade cadastral

O contrato deve reconciliar Cadastro Individual e Cadastro Domiciliar e Territorial sem união silenciosa por aproximação. A versão 5.5.24 prioriza o CPF como identificador em fluxos publicados, com CNS quando não houver CPF [1]. Registros ambíguos devem permanecer pendentes, com contagem agregada e motivo auditável.

## 7. Regra visual e de apresentação

Verde/vermelho é reservado a resultado calculado com fonte e contrato validados. Bloqueio, pendência, lote rejeitado e ausência de dado não significam resultado baixo. Agregados não devem expor CPF, CNS completo, nome, telefone, endereço, SQL bruto ou stack trace.

## 8. Referências

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "Ministério da Saúde — e-SUS APS versão 5.5.24"

**Última revisão:** 2026-08-26.
