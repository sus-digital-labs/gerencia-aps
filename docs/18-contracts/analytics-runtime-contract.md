# Contrato de runtime analítico

## Fronteira

Este checkout é `PUBLIC_STANDALONE`: contém o frontend e contratos de apresentação. Backend, banco, ingestão, upsert, autorização de servidor e cálculo normativo não estão presentes neste repositório. Uma API integradora externa pode implementar o contrato, mas sua implementação não é prova de capacidade local.

## Escopo canônico

O projeto documenta 21 métricas: 15 de Qualidade APS (`B1`–`B6`, `C1`–`C7`, `M1`–`M2`) e 6 de Vínculo e Acompanhamento Territorial (`CVAT1`–`CVAT6`). Referências isoladas a “15 indicadores” devem declarar que se limitam ao componente de Qualidade APS.

## Estados obrigatórios

| Estado | Uso |
|---|---|
| `READY` | Fonte, critérios e cálculo estão disponíveis e validados no contrato consumido. |
| `NO_DATA` | Consulta válida sem registros na competência. |
| `API_UNAVAILABLE` | A fonte ou API não respondeu. |
| `MISSING_REQUIRED_CRITERIA` | O registro não possui critérios mínimos. |
| `BLOCKED_BY_DATA_CONTRACT` | O contrato não permite executar a regra normativa. |
| `CONFIGURATION_ERROR` | Configuração pública obrigatória ausente ou inválida; o bootstrap deve interromper a aplicação. |
| `CONTRACT_ERROR` | Payload recebido não atende ao schema runtime; não usar fallback. |

`NO_DATA`, zero e indisponibilidade não são equivalentes. O frontend não deve transformar falha de API, payload inválido ou capacidade não implementada em zero, percentual, score ou lista nominal.

## Eixos de status

Quando a informação estiver disponível, registrar separadamente:

| Eixo | Valores exemplificativos |
|---|---|
| `normative_status` | `VALIDATED`, `PENDING_REVIEW` |
| `source_model_status` | `AVAILABLE`, `UNCONFIRMED`, `MISSING` |
| `local_data_contract_status` | `READY`, `BLOCKED`, `NOT_PRESENT` |
| `runtime_status` | `READY`, `NOT_CALCULABLE`, `API_UNAVAILABLE`, `CONTRACT_ERROR` |

A separação documental não exige uma nova API quando os enums atuais já atendem ao fluxo. Ela evita confundir uma regra conhecida com uma réplica local ausente ou um runtime não implementado.

## C1

A fonte e-SUS APS pode conter uma chave estrangeira `fact.co_dim_tipo_atendimento` que referencia `dimension.co_seq_dim_tipo_atendimento`; a classificação semântica deve ser resolvida na dimensão por `dimension.nu_identificador`. A chave estrangeira não é, por si só, um code set de demanda.

A cadeia necessária é:

```text
fact.co_dim_tipo_atendimento
  -> dimension.co_seq_dim_tipo_atendimento
  -> dimension.nu_identificador
  -> classificação de demanda
```

Enquanto o contrato local não comprovar o fato, a dimensão, o join, a preservação de `nu_identificador`, a competência, a versão do code set, os CBOs, as equipes e a cardinalidade, o C1 permanece:

```text
normative_status = VALIDATED
source_model_status = AVAILABLE
local_data_contract_status = BLOCKED
runtime_status = NOT_CALCULABLE
```

No enum público atual, utilizar `BLOCKED_BY_DATA_CONTRACT` e o código específico `C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE` quando a ausência estiver na projeção local. Não renomear enum apenas por estética.

É proibido inferir demanda, INE ou CNES por vínculo cadastral, nome, profissional ou outro proxy não previsto na metodologia validada. Enquanto bloqueado, não publicar `percentage`, `numerator` ou `denominator`.

## Payload runtime

Um resultado de indicador deve declarar `indicator_code` e `status`. Apenas `status = READY` pode conter `numerator`, `denominator` e `result_percentage`; estados não prontos não podem carregar números que a interface possa interpretar como resultado.

Payload inválido deve produzir `CONTRACT_ERROR`. Não deve virar `mock`, lista vazia com aparência de sucesso, zero, resultado aleatório ou indicador enlatado.

## Router

Uma API integradora deve fornecer um único router canônico em `VITE_API_URL`, com autorização centralizada. Routers paralelos para o mesmo domínio não são aceitos. O frontend não duplica autorização de servidor nem declara que um router existe neste checkout.
