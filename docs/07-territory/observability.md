# Observabilidade territorial

Este documento registra a implementação de métricas no Rust e o contrato operacional para Prometheus/Grafana. A evidência é classificada como **source** quando deriva do código e como **runtime** quando deriva do endpoint `/metrics` ou da execução do worker.

## Histograms reais

O registry mantém os counters acumulativos legados e adiciona histogramas sem labels:

| Histograma | Buckets | Soma/contagem |
|---|---|---|
| `territory_viewport_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_snapshot_import_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_remap_simulation_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_remap_publication_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_remap_rollback_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_retention_claim_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |
| `territory_fingerprint_backfill_duration_seconds` | 1 ms a 10 s e `+Inf` | Sim |

Não são usados `tenant_id`, `municipality_id`, `operator_id`, `source_id`, `job_id`, `run_id` ou qualquer dado pessoal como label.

## PromQL

```promql
histogram_quantile(0.95, sum by (le) (rate(territory_viewport_duration_seconds_bucket[5m])))
```

```promql
histogram_quantile(0.99, sum by (le) (rate(territory_viewport_duration_seconds_bucket[5m])))
```

A separação de isolamento é explícita. Uma defesa funcionando é contabilizada em `territory_cross_tenant_attempt_blocked_total`; possível falha de policy usa `territory_cross_tenant_policy_failure_total` e é crítica.

```promql
increase(territory_cross_tenant_policy_failure_total[5m]) > 0
```

```promql
increase(territory_cross_tenant_attempt_blocked_total[15m]) > BLOCKED_ATTEMPT_THRESHOLD
```

## Alertas

`territory_external_calls_total > 0` em `dry_run`, qualquer policy failure cross-tenant e violação do guardrail de escrita no PEC são críticos. Pico de tentativas cross-tenant bloqueadas, snapshot stale, retenção fora da janela, backfill estagnado, legal hold inconsistente e latência acima do SLO aprovado são warnings. Os valores de negócio de `BLOCKED_ATTEMPT_THRESHOLD`, freshness e SLO permanecem **SLO_PROPOSED_NOT_APPROVED** até benchmark representativo e change approval.

Acesso Grafana/Prometheus autorizado e evidência de firing/recovery permanecem **blocked** nesta execução local; não há stack paralelo criado dentro do app.
