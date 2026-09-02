# Revisão de fixes finais do PR territorial

**Branch de fixes:** `feat/territory-map-remapping-staging-final-fixes`
**Commit de origem:** `7bafc5acb9c04d3d805be3d57f313fce5ec87532`
**Base de integração territorial correta:** `feat/territory-map-remapping-release-hardening` em `ec5c653475c2822047707d936fa846a042c436c3`
**PR macro existente:** [#135](https://github.com/devdudumuniz/esus-analytics/pull/135)

## Proveniência reconciliada

O PR #135 está atualmente com base `main` em `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611`. A comparação observada contra essa base tem merge-base igual à `main`, **96 commits à frente** e aproximadamente **976 arquivos alterados**, incluindo domínios sem relação direta com o hardening territorial. Esse formato não é adequado para revisão isolada e permanece bloqueado para merge.

A branch territorial `feat/territory-map-remapping-release-hardening` foi encontrada no `origin` em `ec5c653475c2822047707d936fa846a042c436c3`. Esse commit é ancestral direto do commit de origem `7bafc5acb9c04d3d805be3d57f313fce5ec87532`; o merge-base é `ec5c653475c2822047707d936fa846a042c436c3`, com **2 commits à frente**, zero commits atrás e **25 arquivos territoriais/documentais alterados**. Essa é a cadeia adequada para a integração territorial.

| Campo | Valor anterior / PR #135 | Valor reconciliado |
|---|---|---|
| `current_base` | `main` / `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611` | Mantido somente como PR macro de integração |
| `correct_base` | Não aplicado | `feat/territory-map-remapping-release-hardening` / `ec5c653475c2822047707d936fa846a042c436c3` |
| `merge_base` | `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611` | `ec5c653475c2822047707d936fa846a042c436c3` |
| `ahead` | 96 | 2 |
| `behind` | 0 | 0 |
| `changed_files` | aproximadamente 976 | 25 |
| `reason` | Base macro não isolada | Cadeia territorial ancestral e escopo revisável |

A estratégia adotada é manter o PR #135 como integração macro e publicar um PR específico para os fixes, baseado no head territorial já qualificado. Nenhum merge, retarget ou force-push é executado automaticamente.

## Correções P0

O handler de rollback continha incremento manual de `remap_rollbacks_total` e chamava `observe_rollback`, que já incrementava o mesmo counter e observava o histograma. O incremento manual foi removido. A única autoridade agora é `TerritoryMetrics::observe_rollback()`.

Foi adicionado o teste `rollback_observation_increments_counter_and_histogram_once`, que valida `counter_after = counter_before + 1` e `histogram_count_after = histogram_count_before + 1` para uma única observação.

## Correções P1

Foram adicionados testes que percorrem os sete histogramas obrigatórios — viewport, snapshot import, simulação, publicação, rollback, retention claim e fingerprint backfill — verificando buckets cumulativos, bucket `+Inf` igual a `count`, `sum >= 0`, valores finitos e exatamente uma contagem por observação.

O alerta `TerritoryCrossTenantMetricsMissing` foi incluído com `absent()` para os dois contadores críticos:

```promql
absent(territory_cross_tenant_policy_failure_total)
or absent(territory_cross_tenant_attempt_blocked_total)
```

O YAML não contém mais `BLOCKED_ATTEMPT_THRESHOLD` nem `SNAPSHOT_FRESHNESS_APPROVED_SECONDS`. O alerta de tentativas bloqueadas usa recording rules com baseline dinâmica de 6 horas, fator inicial de 3x e piso de 0,001, explicitamente marcados como `calibration: required`; esses parâmetros não são SLO nem threshold operacional aprovado.

O alerta de freshness do snapshot permanece desabilitado no pacote deployável porque não existe threshold institucional aprovado. O estado está documentado como `SNAPSHOT_FRESHNESS_THRESHOLD_NOT_APPROVED`, sem token textual inválido em YAML ativo.

## Evidência e classificação

| Evidência | Classificação |
|---|---|
| Correção do source Rust, testes e YAML | `source` |
| `cargo fmt`, `cargo test --offline --all-targets` e `cargo clippy --offline --all-targets -- -D warnings` | `runtime` local |
| PostgreSQL descartável e smoke local previamente qualificado | `external-compose` local |
| Staging, migration 0034 em staging, credencial read-only autorizada, Prometheus/Grafana produtivos, rollback/reapply operacional | `blocked` |

Staging não foi executado. Permanecem `PEC_WRITE_ALLOWED=false`, `GEOCODE_EXTERNAL_PROVIDER_ENABLED=false`, `RUNTIME_MODE=dry_run`, `external_calls=0` e PEC writes=0.

## Change approval

Esta branch está pronta para revisão de código e preparação de change approval, mas não autoriza aplicação da migration 0034 em staging. A aprovação formal ainda deve incluir backup verificável, janela, credencial comprovadamente read-only, testes negativos de RLS/cross-tenant, dataset representativo, observabilidade conectada, rollback e reapply autorizados.

## CI remoto

Após a publicação, foram observados quatro runs remotos do workflow macro e do workflow territorial com `startup_failure`, sem jobs materializados e sem logs/annotations disponíveis para diagnóstico. A API de permissões confirma Actions habilitado, mas não fornece causa operacional do startup failure. O YAML dos workflows foi validado localmente e o job territorial dedicado foi versionado para permitir execução isolada; ainda assim, a validação remota permanece `blocked` até o GitHub materializar os jobs. Portanto, os gates locais são evidência `runtime-local`, não substituem CI remoto nem staging.
