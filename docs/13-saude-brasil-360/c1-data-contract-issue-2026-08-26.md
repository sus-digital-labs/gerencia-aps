# ISSUE P0 — Alinhar contrato de dados do C1 à variável oficial de tipo de demanda

**Código:** `C1_BLOCKED_BY_DATA_CONTRACT`  
**Indicador:** C1 — Mais acesso à Atenção Primária à Saúde (APS)  
**Diagnóstico relacionado:** `FIOCRUZ_ANALYTICS_CORE_NEEDS_ALIGNMENT`  
**Decisão:** `ISSUE_FIRST` / `FAIL_CLOSED`  
**Data:** 2026-08-26  
**Prioridade:** P0 — bloqueia cálculo normativo

## 1. Resumo

O C1 não pode ser considerado calculável com segurança no contrato de dados atualmente disponível. A regra oficial exige a proporção de atendimentos de **demanda programada** em relação ao total de atendimentos elegíveis [1]. O schema auditado de `tb_fat_atendimento_individual` não apresenta uma variável confiável para distinguir demanda programada de demanda espontânea.

A implementação não deve preencher o gap com evidência genérica de acesso, tipo de consulta, texto livre, proxy de procedimento ou outro critério aproximado. Enquanto o contrato não for corrigido, o resultado canônico deve ser `blocked_by_source` ou `blocked_by_schema`, sem percentual substituto.

## 2. Problema técnico

O fato `tb_fat_atendimento_individual` contém registros de atendimentos individuais, mas o conjunto de campos disponível para a réplica auditada não comprova a classificação de demanda necessária ao C1. A dimensão `tb_dim_tipo_atendimento` aparece em alguns documentos e contratos como dependência esperada, porém sua mera referência não comprova que:

1. a chave `co_dim_tipo_atendimento` esteja presente no fato replicado;
2. a dimensão esteja carregada na mesma competência e versão do fato;
3. os códigos estejam vigentes e tenham descrição oficial completa;
4. a relação seja um-para-um, sem duplicar ou perder atendimentos;
5. o mapeamento usado no runtime corresponda à nota metodológica vigente.

Sem essas provas, o cálculo atual corre o risco de retornar um número tecnicamente reprodutível, mas metodologicamente falso.

## 3. Regra que precisa ser atendida

A definição operacional mínima é:

```text
C1 = (atendimentos de demanda programada / total de atendimentos elegíveis) × 100
```

O denominador deve conter o mesmo universo elegível do numerador, com filtros de competência, equipe, unidade e profissional definidos na fonte oficial. A classificação entre programada e espontânea deve vir do modelo de informação ou da dimensão oficial correspondente, nunca de inferência textual.

Os códigos locais `1`, `2`, `4`, `5` e `6` aparecem na documentação interna como universo candidato, sendo `1` e `2` tratados como programados e `4`, `5` e `6` como espontâneos. Essa codificação só pode ser promovida a contrato após a confirmação da nota metodológica e do guia e-SUS APS vigentes [1] [2].

## 4. Evidências

| Evidência | Local ou fonte | Resultado |
|---|---|---|
| Regra normativa | Nota Metodológica C1 do Ministério da Saúde | Exige demanda programada sobre total de atendimentos. |
| Contrato local | `docs/11-indicator-field-catalog/indicators/C1.md` | Lista a dimensão e o tipo como dependências, mas registra validação normativa pendente. |
| Matriz de campos | `docs/11-indicator-field-catalog/operational-matrix.md` | Indica `tb_dim_tipo_atendimento` como dependência, sem prova de presença no dataset de produção. |
| Schema auditado | `tb_fat_atendimento_individual` na réplica local | Não foi encontrada variável confiável de classificação de demanda. |
| Runtime | Contrato `saudeBrasil360.calcularIndicador` | Deve deixar de publicar resultado numérico quando a fonte obrigatória não puder ser provada. |

## 5. Impacto

| Área | Impacto |
|---|---|
| Validade do indicador | Percentual calculado sem tipo de demanda não representa a definição oficial. |
| Gestão | Pode induzir comparação incorreta entre equipes, unidades ou competências. |
| Financiamento | O produto não deve sugerir que seu número é o resultado homologado pelo Siaps. |
| Auditoria | Falta de linhagem impede explicar quais atendimentos entraram no numerador e no denominador. |
| Dados históricos | Backfill sem mapeamento oficial pode misturar competências com semânticas diferentes. |

## 6. Escopo da correção

### 6.1 Contrato mínimo requerido

O pipeline deve disponibilizar, no fato ou por uma dimensão com integridade verificável, os seguintes elementos:

| Campo lógico | Requisito |
|---|---|
| Identificador do atendimento | Chave estável, não nula e deduplicável. |
| Competência/data | Data compatível com a janela oficial e com o calendário de envio. |
| Equipe/unidade | Chaves necessárias para os filtros territoriais. |
| Profissional/CBO | Chave e code set elegível conforme a fonte. |
| Pessoa assistida | Chave técnica para contagem, sem expor PII no agregado. |
| Tipo de atendimento | Chave para dimensão oficial, presente e validável. |
| Classificação da demanda | Valor derivado exclusivamente do code set oficial: programada, espontânea ou inválida. |
| Versão do modelo | Versão e origem do registro para auditoria de compatibilidade. |

### 6.2 Opções aceitáveis de implementação

A correção pode ser feita pela inclusão de `co_dim_tipo_atendimento` no fato, desde que a dimensão seja replicada com a mesma versão e chave, ou pela inclusão de uma coluna derivada de classificação que preserve o código original e sua linhagem. Não é aceitável gravar somente o rótulo final sem conservar o código e a versão da fonte.

### 6.3 Backfill

O backfill histórico deve ser executado somente para competências em que o código original e a tabela de referência estejam disponíveis. Registros sem classificação devem permanecer fora do cálculo e ser contabilizados em `pendingCount` ou em motivo de descarte. Não preencher retroativamente a classificação por texto ou por tipo de procedimento.

## 7. Comportamento temporário obrigatório

Enquanto esta issue estiver aberta:

```json
{
  "indicatorCode": "C1",
  "program": "SAUDE_BRASIL_360",
  "status": "blocked_by_source",
  "errorCode": "C1_BLOCKED_BY_DATA_CONTRACT",
  "message": "Indicador indisponível: a fonte não comprova a classificação oficial da demanda do atendimento.",
  "safe": true,
  "warnings": ["C1_MISSING_OFFICIAL_DEMAND_TYPE"]
}
```

O retorno não deve conter `percentage`, `numerator` ou `denominator` apresentados como resultado válido. Se a interface precisar mostrar o cartão, deve exibir estado de indisponibilidade, motivo resumido e link para a issue, sem sugerir zero.

## 8. Critérios de aceite

- [ ] A equipe mantenedora identifica o campo ou relação oficial que representa o tipo de demanda.
- [ ] O schema da réplica contém a chave de tipo de atendimento ou uma coluna derivada com código original, versão e linhagem.
- [ ] A cardinalidade da relação com `tb_dim_tipo_atendimento` é validada e não duplica fatos.
- [ ] O code set programado/espontâneo é confirmado contra a nota metodológica e o guia e-SUS APS vigentes.
- [ ] Registros sem tipo de demanda não entram silenciosamente no numerador nem no denominador.
- [ ] A consulta é reprodutível por competência, equipe e unidade.
- [ ] O teste de reprocessamento comprova que o mesmo atendimento não é contado duas vezes.
- [ ] O pipeline registra versão do e-SUS APS, modelo de informação, competência e motivo de rejeição.
- [ ] O contrato agregado retorna `blocked_by_source` quando qualquer dependência obrigatória estiver ausente.
- [ ] O runtime só publica percentual depois de todos os testes de schema, code set, cardinalidade e reconciliação passarem.
- [ ] A `ruleVersion` do C1 é atualizada quando a fonte ou a fórmula operacional for alterada.
- [ ] Não há CPF, CNS completo, nome ou SQL bruto no retorno, log ou exemplo público.

## 9. Testes exigidos

| Teste | Resultado esperado |
|---|---|
| Schema sem `co_dim_tipo_atendimento` | Bloqueio determinístico, sem percentual. |
| Dimensão ausente | Bloqueio determinístico, sem fallback. |
| Código desconhecido | Registro pendente ou descartado com motivo explícito. |
| Relação um-para-muitos | Falha de integridade; nunca duplicar atendimento. |
| Todos programados | Percentual 100% somente se a nota vigente permitir esse universo e a consulta estiver completa; registrar alerta de interpretação. |
| Nenhum programado | Percentual 0% somente quando o denominador estiver validado e o universo for completo; não confundir fonte vazia com zero. |
| Reprocessamento | Mesmos fatos e mesmo resultado, sem duplicação. |
| Filtro de competência | Nenhum registro fora da competência. |
| Filtro territorial | Equipe/unidade coerentes com a dimensão oficial. |
| Versão incompatível | Registro rejeitado conforme NT 12/2025 e NI 13/2025. |

## 10. Fora do escopo

Esta issue não autoriza alterar a definição normativa do C1, criar um indicador alternativo de acesso, reativar o drilldown legado, fazer backfill por aproximação, alterar a Portaria, incorporar P1–P6/CR1–CR4/R1–R6 ao produto ou promover `validated_runtime_public` para homologação oficial.

## 11. Dependências

A correção depende do contrato do DW/Parquet, do catálogo de modelos de informação do Siaps, do guia de preenchimento do e-SUS APS, da versão compatível do sistema de origem e da atualização das tabelas de referência. O importador também deve manter idempotência e registrar a versão de origem.

## 12. Referências

[1]: https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view "Ministério da Saúde — Nota Metodológica C1"
[2]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/guias-preenchimento/equipeaps/ "Ministério da Saúde — Guia e-SUS APS para eSF/eAP"
[3]: ../sources/external-research-2026-08-26.md "Registro de fontes consultadas"

**Decisão final:** o upstream não deve ser forçado. A issue deve ser resolvida no contrato de dados e validada antes de reabrir o cálculo do C1.
