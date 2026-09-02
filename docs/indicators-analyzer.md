# Analisador de Indicadores e-SUS APS (Foundation)

## Objetivo

Implementar a fundação de backend para análise de indicadores APS com foco em:

- elegibilidade e descarte por regra;
- evidências e diagnóstico técnico;
- score agregado por competência/unidade/equipe;
- troubleshooting de qualidade de dados;
- monitoramento de pipeline ETL/DW/LEDI;
- segurança por padrão (PII mascarada, auditoria e permissões).

## Proveniência e escopo

- `source`: `Apps/server/api/src/indicators/**` (implementação principal desta fundação)
- `runtime`: `Apps/server/api/dist/index.js` (ainda sem incorporação automática desta fundação)
- `external-compose`: `D:\dm-hub\apps\dm-gov\regulasync\docker\compose.yml`

### Regra crítica de dados

- Integração com e-SUS PEC é **somente leitura**.
- Não existe escrita no banco e-SUS PEC por este módulo.
- Persistência de analytics deve ocorrer em esquema/tabelas próprias no banco analítico (ver `docs/sql/indicators-analyzer-foundation.sql`).

## Arquitetura de motores

Estrutura criada em `Apps/server/api/src/indicators`:

- `engines/eligibility.engine.ts`
  - classifica registros em `counted`, `eligible_not_counted` e `discarded`.
- `engines/evidence.engine.ts`
  - gera snapshots de evidência com dados mascarados.
- `engines/scoring.engine.ts`
  - calcula numerador, denominador, percentual e pendências.
- `engines/troubleshooting.engine.ts`
  - resume motivos de descarte e detecta duplicidade CPF/CNS.
- `engines/data-pipeline-monitor.engine.ts`
  - determina `etlStatus` (`fresh`, `stale`, `degraded`, `unknown`) por freshness/ETL/LEDI.

## Contratos tRPC (foundation em source)

Router: `Apps/server/api/src/indicators/routers-indicators.ts`

- `indicators.available`
- `indicators.result`
- `indicators.diagnostics`
- `indicators.pending`
- `indicators.citizenDiagnostic` (**protegido por permissão** `indicators:citizen_diagnostic`)
- `indicators.pipelineStatus`
- `indicators.discardReasons`

## Contrato estruturado de diagnóstico individual

`indicators.citizenDiagnostic` retorna contrato estruturado para troubleshooting sem expor PII direta:

```json
{
  "indicatorCode": "C3",
  "cidadaoPecId": "12345",
  "competencia": "2026-04",
  "eligible": true,
  "countedInNumerator": false,
  "denominatorReasons": [
    "Cidadão elegível para o indicador conforme regra ativa"
  ],
  "missingCriteria": [
    {
      "code": "MISSING_REQUIRED_PROCEDURE",
      "severity": "critical",
      "message": "Evidência obrigatória de procedimento não encontrada na janela temporal."
    }
  ],
  "dataQualityIssues": [
    {
      "code": "CITIZEN_NOT_LINKED_TO_HOUSEHOLD",
      "severity": "warning",
      "message": "Cidadão sem vínculo com domicílio cadastrado."
    }
  ],
  "pipelineStatus": {
    "dwFresh": true,
    "lastEtlRunAt": "2026-04-27T10:45:00.000Z",
    "lediErrors": 0,
    "etlStatus": "fresh"
  }
}
```

> Observação: `cidadaoPecId` é identificador técnico do registro, não CPF/CNS.

## Taxonomia de motivos padronizados

Catálogo principal implementado para troubleshooting:

- `MISSING_CPF_OR_CNS`
- `INVALID_CNS_TRAINING`
- `MISSING_BIRTH_DATE`
- `CITIZEN_NOT_LINKED_TO_TEAM`
- `CITIZEN_NOT_LINKED_TO_HOUSEHOLD`
- `HOUSEHOLD_WITHOUT_RESPONSIBLE`
- `RESPONSIBLE_WITHOUT_INDIVIDUAL_CADASTRE`
- `DUPLICATED_CPF_CNS`
- `MISSING_REQUIRED_PROCEDURE`
- `MISSING_REQUIRED_MEASUREMENT`
- `INVALID_TEMPORARY_CID_CIAP`
- `INVALID_CBO`
- `OUT_OF_TIME_WINDOW`
- `LEDI_PAYLOAD_REJECTED`
- `DW_ETL_NOT_UPDATED`
- `MOBILE_DEVICE_NOT_SYNCED`
- `NIGHT_PROCESSING_PENDING`

## Segurança e observabilidade

### Mascaramento e proteção de PII

- CPF/CNS retornam somente mascarados.
- Nome completo retorna mascarado.
- Logs e auditoria não registram CPF/CNS/nome completos.

### Log estruturado

Campos padronizados por operação:

- `indicator_code`
- `competencia`
- `unidade_id`
- `equipe_id`
- `request_id`
- `duration_ms`
- `cache_hit`
- `cache_miss`
- `eligible_count`
- `discard_count`
- `discard_reasons_summary`
- `etl_status`

### Auditoria nominal/individual

- `pending` registra trilha de auditoria de acesso nominal.
- `citizenDiagnostic` registra auditoria individual por hash de referência (`reference_hash`), sem PII.

## Estratégia de cache

- **Cache agregado**: chave por `indicator+competencia+unidade+equipe` com TTL curto (default 5 min).
- **Cache individual**: deliberadamente **não utilizado** para diagnóstico individual (decisão de segurança para reduzir retenção de dados nominais).
- **Invalidação por freshness/ETL**: contrato implementado em `invalidateByFreshnessChange(...)` no serviço.

## Limitação conhecida (drift source/runtime)

Esta fundação foi implementada em `source` e ainda não está acoplada automaticamente ao `Apps/server/api/dist/index.js` no fluxo atual. Até o pipeline de build/publicação consolidar essa integração, os contratos ficam disponíveis como fundação de código e testes em `source`.
