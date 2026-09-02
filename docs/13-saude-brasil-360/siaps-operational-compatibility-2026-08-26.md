# Compatibilidade operacional — e-SUS APS, LEDI e Siaps

**Revisão:** 2026-08-26

## 1. Finalidade

Este manual define os controles que o SUS Analytics Web deve aplicar ao receber dados da Atenção Primária. Ele complementa as fontes oficiais; não substitui o Manual do Siaps, o Manual e-SUS APS, os modelos de informação ou as notas técnicas do Ministério da Saúde.

## 2. Regra oficial de validação

A Nota Técnica nº 12/2025 estabelece validação adicional de conformidade com a versão do modelo de informação compatível com a versão do e-SUS APS e com o Layout de Integração de Dados e Interfaces (LEDI). Dados enviados por versões liberadas há mais de 12 meses são invalidados. O novo critério passou a ser aplicado em 01/01/2026 [1].

A Nota Informativa nº 13/2025 registra que a regra também alcança integrações próprias e de terceiros que utilizam LEDI. O documento identificou, na competência setembro de 2025, registros enviados por CDS Offline e por versões antigas do Prontuário Eletrônico [2]. Esses números são históricos da competência indicada na nota.

## 3. Estado das versões

| Item | Estado documental em 26/08/2026 | Conduta do produto |
|---|---|---|
| CDS Offline 3.2.29 e anteriores | Prazo de aceitação encerrado em dezembro de 2025; suporte expirado conforme NI 13/2025 | Rejeitar ou marcar como incompatível conforme o retorno da validação oficial. |
| PEC 5.3.19 e anteriores | Prazo de aceitação encerrado em dezembro de 2025; suporte expirado conforme NI 13/2025 | Não aceitar como fonte válida sem confirmação oficial específica. |
| Versões intermediárias listadas na NI 13/2025 | Prazos variam por versão; vários encerraram em 2026 | Consultar a tabela oficial, não inferir compatibilidade pela numeração. |
| e-SUS APS 5.5.24 | Publicada em 03/08/2026 [3] | Registrar versão, modelo e resultado da validação; não presumir compatibilidade sem o modelo vigente. |
| Sistema próprio ou terceiro via LEDI | Sujeito às mesmas regras de modelo de informação | Validar versão e rejeitar payload incompatível. |

## 4. Metadados obrigatórios na ingestão

Cada lote deve conservar, sem PII no log, os seguintes metadados:

| Metadado | Motivo |
|---|---|
| Sistema de origem | Identificar PEC, CDS ou integração LEDI. |
| Versão do sistema | Aplicar janela de aceitação. |
| Versão do modelo de informação | Comprovar compatibilidade sem depender só do nome do produto. |
| Competência | Relacionar com calendário e janela da regra. |
| Município, estabelecimento e equipe | Permitir reconciliação territorial. |
| Número do lote e chave de origem | Garantir idempotência. |
| Resultado da validação | `accepted`, `rejected` ou `pending`. |
| Motivo de rejeição | Permitir correção na origem. |
| Data/hora de recebimento | Rastreabilidade operacional. |

## 5. Fluxo de validação

1. Identificar a fonte e extrair versão do sistema e modelo de informação.
2. Verificar se a versão está no catálogo oficial e dentro do prazo de aceitação.
3. Validar estrutura LEDI, campos obrigatórios, tipos, chaves e cardinalidade.
4. Verificar competência, estabelecimento, equipe e integridade territorial.
5. Rejeitar lote incompatível com motivo determinístico; não transformá-lo em dado parcial válido.
6. Persistir o lote aceito com chave idempotente e linhagem.
7. Atualizar o status dos indicadores afetados quando a fonte permanecer pendente.

## 6. Cadastro e identidade

A versão 5.5.24 informa que o CPF é o principal identificador do cidadão em fluxos do Cadastro Individual e de identificação domiciliar/territorial, com CNS quando o cidadão não possui CPF [3]. Essa mudança não autoriza unir retroativamente registros por aproximação.

O contrato deve manter uma chave técnica interna, guardar o identificador original protegido e registrar a regra de correspondência. Quando a Ficha de Cadastro Individual (FCI) e a Ficha de Cadastro Domiciliar e Territorial (FCDT) não puderem ser reconciliadas com evidência suficiente, o registro deve permanecer pendente. As ocorrências internas denominadas Inconsistência nº 3 e nº 8 devem ser auditáveis, sem união silenciosa.

## 7. Regras de falha segura

| Condição | Resultado |
|---|---|
| Versão incompatível | `rejected` com motivo oficial. |
| Modelo ausente | `pending` ou `rejected`; não inferir versão. |
| Chave territorial inválida | Lote pendente e alerta de reconciliação. |
| Duplicidade de lote | Ignorar reprocessamento sem duplicar fatos. |
| Identidade ambígua | Não unir registros; contabilizar pendência. |
| Campo necessário ao indicador ausente | Indicador `blocked_by_source` ou `blocked_by_schema`. |

## 8. Monitoramento

O painel operacional deve mostrar lotes aceitos, rejeitados, pendentes, versões de origem, competências afetadas e motivos de rejeição. O resultado de indicador não deve ser interpretado como zero quando a fonte foi rejeitada ou não chegou.

## 9. Referências

[1]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Nota Técnica nº 12/2025 — Critério de validação de dados enviados ao Siaps"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Nota Informativa nº 13/2025 — Cenário nacional de versões incompatíveis"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "e-SUS APS — Versão 5.5.24"

**Regra final:** versão mais nova não é sinônimo automático de compatibilidade; a validação deve considerar o modelo de informação e o prazo oficial.
