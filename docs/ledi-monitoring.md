# Monitoramento LEDI

## Objetivo

Padronizar rastreio de falhas de payload LEDI no fluxo analítico sem expor PII.

## Eventos monitorados

- `HTTP 400` -> `LEDI_PAYLOAD_REJECTED`
- `HTTP 500+` -> `LEDI_DESERIALIZATION_ERROR`

## Comportamento no pipeline

Erros LEDI impactam o monitor de pipeline (`indicators.pipelineStatus`):

- incrementam contadores `validationErrors` e `deserializationErrors`;
- adicionam motivos no status (`reasons`);
- contribuem para `etlStatus=degraded` quando não houver `stale`.

## Registro recomendado

Modelagem base em `docs/sql/indicators-analyzer-foundation.sql`:

- `ledi_payload_audit`
- `ledi_payload_errors`

## Segurança

- payload bruto não deve ser logado em texto claro;
- armazenar referência técnica (hash/id correlacionável), nunca dados sensíveis completos;
- logs operacionais devem manter somente metadados técnicos.
