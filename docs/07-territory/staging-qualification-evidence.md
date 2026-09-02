# Qualificação de staging do módulo territorial

**Branch:** `feat/territory-map-remapping-staging-qualification`

**Baseline validada:** `ec5c653475c2822047707d936fa846a042c436c3`

**Worktree:** `D:\dm-hub\.worktrees\esus-aps-360\20260815-map-remapping-staging-qualification\implementation`
**Data da execução:** 15–16 de agosto de 2026, horário UTC do ambiente de homologação descartável.

## Veredito executivo

A implementação fecha os bloqueadores técnicos de privacidade server-side, retenção com leases, legal hold, crypto-shredding, backfill de fingerprints, recuperação após lease expirado, concorrência com dois processos Rust e E2E multi-role. Os gates de compilação, lint e testes Rust passaram após a integração.

> **Status de promoção: BLOQUEADO.** Esta branch não deve ser promovida a staging autorizado neste ciclo porque a migration foi homologada somente no PostgreSQL descartável local e ainda não existe evidência de change approval para um ambiente de staging autorizado. Além disso, o benchmark disponível usa quatro domicílios de fixture e serve para validar plano e regressão, mas não para declarar SLO de produção ou capacidade representativa.

A separação entre fonte e runtime permanece preservada: a fonte PEC é consultada por role read-only, o runtime Rust é a autoridade do domínio pesado e o BFF TypeScript somente serializa, assina e transporta o contrato. Nenhuma execução desta qualificação habilitou escrita no PEC, chamadas externas de geocodificação ou modo diferente de `dry_run`.

## Classificação da evidência

| Classe | Significado operacional |
|---|---|
| **source** | Evidência derivada do código versionado, migration, testes unitários ou análise estática. |
| **runtime** | Evidência produzida executando binário Rust, endpoint HTTP ou teste TypeScript. |
| **external-compose** | Evidência produzida contra os containers PostgreSQL descartáveis `territory-geocode-pg-hardening` e `mc-runtime-pec-source-pg`. |
| **blocked** | Critério que não pode ser declarado concluído com a evidência disponível; não é tratado como sucesso implícito. |

## Matriz de promoção

| Critério | Resultado | Evidência | Observação |
|---|---:|---|---|
| Credencial PEC sem permissão de escrita | **PASS** | external-compose/runtime | A role `territory_read_only` realizou leitura; a trilha anterior registrou os testes negativos de escrita. |
| Nenhuma escrita no PEC | **PASS** | source/runtime | `PEC_WRITE_ALLOWED=false`; o runtime sobe somente em `dry_run` e expõe `pec_write=forbidden`. |
| RLS e isolamento de escopo | **PASS** | external-compose | Role não superusuária: sessão sem escopo retornou zero; escopo `tenant-test-a/999` retornou apenas o conjunto do escopo; troca para `tenant-test-b/888` retornou zero. |
| Privacidade server-side | **PASS** | source/runtime | `TerritoryPrivacyPolicy` e `protect_domiciles()` estão no Rust; o endpoint retornou `territory-privacy-v1`. |
| Baixa cardinalidade e k-anonymity | **PASS** | source/runtime | Com quatro domicílios, gestor e coordenador receberam `suppressed=4` e `points=0`; não houve fallback para a UI. |
| Exatidão por role | **PASS** | runtime | Com policy explícita de homologação, ACS e auditor em zoom 18 receberam `suppressed=0` e `points=4`; gestor/coordenador em zoom 10 permaneceram agregados/suprimidos. |
| Worker e estados | **PASS** | source/external-compose | Migration cria `scheduled`, `leased`, `running`, `completed`, `failed` e `legal_hold`; o banco terminou com cinco runs `completed` e um `legal_hold`. |
| Leases e `FOR UPDATE SKIP LOCKED` | **PASS** | source/runtime | Dois processos Rust independentes disputaram o mesmo run; processo A teve `retention_jobs_total=1` e `crypto_shredded_total=1`, processo B teve ambos zero; o run terminou uma única vez com `processed_count=1`. |
| Crash/restart | **PASS** | external-compose | Run em `running` com lease expirado foi recuperado e terminou `completed`; o item ficou `ciphertext IS NULL` e `shredded_at IS NOT NULL`. |
| Legal hold | **PASS** | source/external-compose | O run em `legal_hold` terminou com `legal_hold=true`, `ciphertext IS NOT NULL` e `shredded_at IS NULL`. A destruição de chave também exige `legal_hold=false`. |
| Crypto-shredding | **PASS** | source | `open_evidence()` converte `DomainError::KeyNotFound` em `RetentionError::EvidenceKeyDestroyed`, cujo código estável é `EVIDENCE_KEY_DESTROYED`; os testes unitários de destruição e idempotência passaram. |
| Backfill de fingerprints | **PASS COM PENDÊNCIAS EXPLÍCITAS** | source/runtime/external-compose | O binário atualizou um candidato ligado a registro técnico real da fonte: `backfill_scanned=7`, `backfill_updated=1`, `source_missing=6`, `conflicts=0`. IDs ausentes não são preenchidos por aproximação e o loop para quando não há progresso. |
| Idempotência do backfill | **PASS PARCIAL** | source/runtime | `COALESCE` preserva fingerprints existentes e não duplica valores; candidatos sem fonte permanecem pendentes e são contabilizados. A repetição em dataset representativo maior ainda é requisito de staging. |
| Benchmark e query plans | **PASS PARA REGRESSÃO; SLO BLOQUEADO** | external-compose | Viewport utilizou `territory_map_domicile_viewport_idx`; retenção utilizou `territory_retention_item_scope_idx`. Medição de 20 execuções: viewport p95 observado 0,206 ms; claim de retenção p95 observado 0,148 ms. Fixture pequena demais para SLO de produção. |
| Métricas Prometheus | **PASS** | source/runtime | O worker emitiu `territory_retention_jobs_total 1`, `territory_crypto_shredded_total 1` e `territory_external_calls_total 0`. O runtime HTTP também expõe métricas de viewport, acesso, isolamento e external calls. |
| Dashboards e alertas | **PASS COMO CONTRATO; DEPLOY BLOQUEADO** | source | As consultas e regras estão definidas nesta documentação com métricas reais. A publicação em Prometheus/Grafana depende do ambiente autorizado e change approval. |
| Matriz multi-role E2E | **PASS** | runtime | Quatro chamadas HTTP assinadas com HMAC, sem PII no output; os resultados estão na seção abaixo. |
| Migration em staging autorizado | **BLOCKED** | external-compose | A migration `0034` foi aplicada e exercitada apenas no PostgreSQL descartável local. Não foi executada em staging/produção sem aprovação, conforme guardrail. |
| Rollback | **BLOCKED PARA PROMOÇÃO** | source | O down migration existe e é reversível no escopo criado, mas rollback reproduzido em staging autorizado depende de change approval e janela operacional. |

## Evidência E2E multi-role

A autenticação usou a canonização HMAC do runtime: `method`, `path`, `timestamp`, `nonce`, `body_sha256`, `tenant_id`, `operator_id` e `municipality_id`, separados por newline. O cliente calculou o hash do JSON reserializado pelo handler Rust, incluindo os campos opcionais nulos. Os quatro requests retornaram HTTP 200.

| Role | Zoom | Política | Suprimidos | Clusterizados | Pontos retornados | External calls | Dados nominais |
|---|---:|---|---:|---:|---:|---:|---:|
| `GESTOR_MUNICIPAL` | 10 | `territory-privacy-v1` | 4 | 0 | 0 | 0 | false |
| `COORDENADOR` | 10 | `territory-privacy-v1` | 4 | 0 | 0 | 0 | false |
| `ACS` | 18 | `territory-privacy-v1` | 0 | 0 | 4 | 0 | false |
| `AUDITOR` | 18 | `territory-privacy-v1` | 0 | 0 | 4 | 0 | false |

O resultado demonstra que a decisão ocorre antes da resposta HTTP e não depende da coloração ou filtragem do frontend. Os valores nominais do fixture não foram incluídos na evidência.

## Dashboard operacional proposto

O dashboard deve ser construído sem labels `tenant_id`, `municipality_id`, `operator_id`, `source_id`, CPF, CNS, nome, endereço ou coordenada. Os contadores são delta-capable; para séries derivadas deve-se usar `rate()` ou `increase()`.

| Painel | Métrica real | Consulta PromQL sugerida | Objetivo |
|---|---|---|---|
| Frescor do snapshot | `territory_snapshot_age_seconds` | `territory_snapshot_age_seconds` | Detectar read model stale. |
| Latência média do viewport | `territory_viewport_duration_micros_total`, `territory_viewport_requests_total` | `rate(territory_viewport_duration_micros_total[5m]) / clamp_min(rate(territory_viewport_requests_total[5m]), 1)` | Observar latência agregada sem cardinalidade por usuário. |
| Volume e payload | `territory_viewport_requests_total`, `territory_viewport_payload_bytes_total` | `rate(territory_viewport_requests_total[5m])` e `rate(territory_viewport_payload_bytes_total[5m])` | Detectar regressão de volume ou payload. |
| Retenção executada | `territory_retention_jobs_total` | `increase(territory_retention_jobs_total[24h])` | Confirmar que o worker está reivindicando runs. |
| Crypto-shredding | `territory_crypto_shredded_total` | `increase(territory_crypto_shredded_total[24h])` | Acompanhar remoção de ciphertext após destruição autorizada. |
| Segurança de escopo | `territory_access_denied_total`, `territory_cross_tenant_blocked_total` | `increase(territory_access_denied_total[15m])` e `increase(territory_cross_tenant_blocked_total[15m])` | Detectar tentativas negadas ou regressões de isolamento. |
| Guardrail externo | `territory_external_calls_total` | `increase(territory_external_calls_total[5m])` | Deve permanecer zero neste ciclo. |

## Alertas

As regras abaixo são contratos de operação baseados exclusivamente nas métricas efetivamente expostas pelo crate Rust. Os limiares de tempo de negócio para produção devem ser aprovados após benchmark representativo; portanto, os alertas de frescor e latência abaixo devem ser parametrizados pelo ambiente de staging autorizado.

| Severidade | Condição | Ação |
|---|---|---|
| **critical** | `increase(territory_external_calls_total[5m]) > 0` | Bloquear promoção, verificar `GEOCODE_EXTERNAL_PROVIDER_ENABLED` e preservar evidência do delta. |
| **critical** | `increase(territory_cross_tenant_blocked_total[15m]) > 0` | Investigar tentativa de escopo cruzado; não alterar a policy para silenciar o alerta. |
| **warning** | `increase(territory_access_denied_total[15m]) > 0` | Correlacionar com matriz de roles e erro de autenticação, sem registrar identidade. |
| **warning** | `increase(territory_retention_jobs_total[24h]) == 0` durante janela aprovada de execução | Verificar scheduler, leases expirados, conexão do worker e legal holds. |
| **warning** | `territory_snapshot_age_seconds` acima do limite operacional aprovado | Pausar publicação até o read model ser atualizado. |
| **warning** | Latência média derivada acima do orçamento aprovado | Coletar novo `EXPLAIN ANALYZE`; não declarar SLO com a fixture atual. |

## SLOs e limites da medição

A medição local foi deliberadamente registrada como **benchmark de regressão**, não como SLO de produção. O dataset exercitado tinha quatro domicílios e não representa volume municipal. A amostra de vinte execuções foi suficiente para observar o plano e obter p95 local, mas não é suficiente para capacidade, saturação, concorrência de banco, distribuição de payload ou comportamento em município real.

| Cenário | Amostras | Linhas reais do fixture | Plano observado | p95 observado |
|---|---:|---:|---|---:|
| Viewport municipal | 20 | 4 | `Index Scan` em `territory_map_domicile_viewport_idx` | 0,206 ms |
| Claim de retenção | 20 | 0 elegíveis no segundo plano | `Index Scan` em `territory_retention_item_scope_idx` | 0,148 ms |

O SLO de produção permanece **não publicado** até a execução autorizada com recorte representativo, pelo menos três execuções repetidas por cenário, intervalo operacional documentado, ausência de regressão de RLS e confirmação de zero escrita no PEC. Isso segue a metodologia registrada em [4].

## Segurança e privacidade

Nenhum log, fixture ou documento desta evidência contém nomes de cidadãos, CPF, CNS, endereço, `source_id`, coordenadas ou payload nominal. A resposta E2E foi reduzida a status, política, contagens agregadas e flags de guardrail. O endpoint não faz chamada externa e o modo de execução reportado pelo runtime é `dry_run`.

## Próximas ações obrigatórias antes da promoção

Primeiro, obter change approval para aplicar a migration e executar o rollback em staging autorizado, preservando o plano, o checksum e a janela de mudança. Segundo, repetir o benchmark com dataset representativo e publicar SLOs aprovados, incluindo p95/p99, saturação, concorrência e tamanho de resposta. Terceiro, conectar o contrato de dashboard e alertas ao Prometheus/Grafana do ambiente autorizado e repetir a matriz multi-role com claims institucionais reais, sempre sem PII nos logs.

## Referências internas

[1]: ../../Apps/rules/b360-rules/src/territory_privacy.rs "Policy server-side e proteção de baixa cardinalidade"
[2]: ../../Apps/rules/b360-rules/src/territory_retention.rs "Worker de retenção, leases, legal hold e crypto-shredding"
[3]: ../../Apps/rules/b360-rules/src/territory_fingerprint_backfill.rs "Backfill idempotente e fingerprints domain-separated"
[4]: ./benchmark.md "Metodologia de benchmark territorial"
[5]: ./rls.md "Isolamento RLS e testes cross-tenant"
[6]: ../../Apps/rules/b360-rules/migrations/0034_territory_retention_crypto_shredding.up.sql "Migration de retenção e crypto-shredding"
[7]: ../../Apps/rules/b360-rules/src/territory_observability.rs "Métricas Prometheus sem PII"
