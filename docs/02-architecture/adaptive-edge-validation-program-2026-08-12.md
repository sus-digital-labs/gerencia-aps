# Programa de validação — Adaptive Edge, Cells e escala nacional

- **Data:** 2026-08-12
- **Status:** `EXECUTED_BOUNDED`
- **Resultado atual:** `NATIONAL_SCALE_NOT_PROVEN`

Execução vinculada: `docs/02-architecture/adaptive-edge-execution-4-2026-08-13.md`.
O slice bounded M1/M2, offline 1 h, wave 50, DR, trust e observabilidade atingiu
`VALIDATED_E2E_ADAPTIVE_RESILIENCE_EXEC4_SLICE`; isso não promove o PEC, os
outros 19 indicadores, PKI/rollout produtivo, HA ampla ou a plataforma nacional.

## 1. Política de evidência

Nenhum teste é `PASS` sem comando executado, timestamp, ambiente, hardware, commit, versões, saída e métricas. `SKIP`, fallback em memória, serviço ausente ou artefato incompleto são `BLOCKED/NOT_PROVEN`, não sucesso.

Dados sintéticos são permitidos para carga e sempre rotulados `synthetic load`. Goldens clínicos usam fixtures oficiais ou reais sanitizadas e fingerprinted.

Artefato obrigatório por execução:

```json
{
  "run_id": "...",
  "started_at": "...",
  "finished_at": "...",
  "git_commit": "...",
  "build_id": "...",
  "bom_hash": "...",
  "protocol_version": "...",
  "schema_version": "...",
  "rule_semantic_hash": "...",
  "binary_hashes": {},
  "dataset": { "classification": "synthetic|sanitized-golden", "seed": 0, "hash": "..." },
  "topology": {},
  "hardware": {},
  "profile": "LOW|MEDIUM|HIGH|CELL",
  "wave": 1,
  "fault_schedule": [],
  "thresholds": {},
  "metrics": {},
  "result": "PASS|FAIL|BLOCKED",
  "evidence_paths": []
}
```

Saídas brutas são imutáveis; relatórios derivados referenciam hashes. PII não entra em logs/resultados.

## 2. Estado dos testes existentes

| Área | Evidência existente | Classificação | Gap |
|---|---|---|---|
| Ingest gzip/idempotência/duplicado | `scripts/tests/shared/smoke-ingest.mjs` | IMPLEMENTED_NOT_VALIDATED neste runtime | runtime central inativo |
| Payload oversized | smoke de aproximadamente 60 MB | IMPLEMENTED_NOT_VALIDATED | não é capacity test |
| Multi-agent | wave de 10 agentes | IMPLEMENTED_NOT_VALIDATED | faltam 1/50/100/500/1000 |
| E2E agent real | `smoke-agent-e2e.mjs` exige PG/agente/source health real | Gate útil | não executado nesta rodada |
| Scope unit tests | agent/router/read-model tests | Implementado em teste | falta RLS/roles/jobs/cache/export real |
| Replay/recovery | Rust recovery/replay gates | Implementado em código | falta fault injection |
| Golden bundle | seal/validate/idempotency | Implementado | falta Edge/Hub cross-target e golden real amplo |
| Performance HTTP | baseline anterior permitiu SKIP/in-memory | NOT_PROVEN | refazer com runtime real |
| HA/DR | documentação parcial | NOT_PROVEN | sem PITR/restore/chaos medido |

## 3. Edge profiles

Perfis iniciais são hipóteses de laboratório, não especificações finais:

| Perfil | CPU | RAM | Disco | Uso |
|---|---:|---:|---|---|
| LOW | 2 vCPU | 4 GiB | SSD limitado | município pequeno/host compartilhado |
| MEDIUM | 4 vCPU | 8 GiB | SSD | instalação típica |
| HIGH | 8 vCPU | 16 GiB | SSD/NVMe | host dedicado/capaz |

Para RAW, NORMALIZED e MATERIALIZED medir:

- CPU/RSS/swap;
- IOPS/latência/espaço/SQLite growth;
- latência e throughput de query PEC;
- bytes e compression ratio;
- processing duration;
- backlog size/oldest age;
- retry/fallback ratio;
- p50/p95/p99 e erros.

Casos: cold start, warm incremental, restart, rede instável, disco pressionado, rule incompatível e backlog longo.

## 4. Interferência no PEC

Somente em PEC isolado/autorizado:

1. 30 min baseline sem agente;
2. 60 min coleta;
3. 60 min coleta + normalização;
4. 60 min coleta + materialização;
5. 30 min recovery.

Medir latência p95/p99 de queries-sentinela, CPU, I/O, locks, conexões e statement timeouts.

Thresholds iniciais a validar, não aprovados:

- regressão p95 PEC <= 10%;
- CPU adicional <= 10 pontos percentuais;
- zero lock bloqueante;
- governor reduz concurrency/pausa/fallback antes da violação persistente.

Qualquer impacto clínico/operacional interrompe o teste.

## 5. Edge versus Hub parity

Entrada idêntica:

- mesmos bytes `RawDeltaBundle`;
- mesmo source contract;
- clock/timezone/cutoff fixos;
- mesmo `rule_semantic_hash` e `golden_set_hash`;
- binaries Windows Edge e Linux Hub registrados no mesmo BOM.

Comparar bytes canônicos do resultado, `semantic_result_hash`, lineage hash e reason codes. Gate: 100% de igualdade; tolerância numérica não substitui representação decimal canônica.

Casos adicionais:

- permutation invariance;
- duplicates/idempotency;
- datas-limite/timezone/DST;
- rounding/overflow;
- unknown fields e negotiation;
- tampering/hash mismatch;
- adapter SQLite versus PostgreSQL.

## 6. Curva central

Ondas progressivas:

```text
1 -> 10 -> 50 -> 100 -> 500 -> 1000 -> saturation/capacity target
```

Stop-on-first-SLO-breach. Só avançar após aprovação da onda anterior. Medir:

- accepted/durable ACK;
- ACK p50/p95/p99;
- bundles/records/bytes por segundo;
- retry/duplicate/error;
- PG connections/locks/WAL/I/O;
- Redis lag/pending;
- normalizer/materializer latency;
- backlog convergence/oldest age;
- serving API p95/p99 durante ingest peak;
- CPU/RAM/disk por componente.

2x pico projetado somente depois de explicitar premissas e se o ambiente suportar. Não extrapolar wave 10 como prova de 1000.

## 7. Offline burst

Janelas: `1h`, `6h`, `12h`, `24h`, `48h`, `72h`.

Na reconexão usar jitter, token bucket e fairness por tenant. Gates:

- zero perda;
- checkpoint somente após durable ACK;
- exatamente um efeito após reenvio;
- backlog drena dentro do orçamento derivado da capacidade medida;
- Edge não esgota disco;
- serving não colapsa.

## 8. Chaos matrix

| Falha | Injeção | Comportamento esperado | Estado atual |
|---|---|---|---|
| Crash antes do commit Edge | kill process | nada enviado | NOT_RUN |
| Crash após commit/before network | kill process | retoma mesmo RAW | NOT_RUN |
| Rede após Hub commit/before ACK | drop connection | retry deduped | NOT_RUN |
| Receiver restart | kill/restart | inbox preservada | NOT_RUN |
| Normalizer após claim | kill | lease expira e fenced reclaim | NOT_RUN |
| Materializer após claim | kill | job reclaim, sem duplo efeito | NOT_IMPLEMENTED |
| Redis down | stop/block | PG backlog continua | CODE_PRESENT_NOT_CHAOS_TESTED |
| PostgreSQL down/failover | connection loss | no premature ACK; recovery | NOT_RUN |
| Edge disk full | quota/fill harness | pause/fail-closed | NOT_IMPLEMENTED |
| SQLite corruption | controlled bit flip | quarantine/repair, no empty fallback | NOT_IMPLEMENTED |
| Clock skew | injected clock | bounded rejection/no semantic drift | NOT_RUN |
| Cert revoked | revoke | all entrypoints deny | NOT_IMPLEMENTED |
| Rule mismatch | incompatible bundle | RAW fallback/provisional | NOT_IMPLEMENTED |
| Duplicate/reorder | transport injector | deterministic effect/order policy | NOT_RUN |

Cada execução registra setup, fault, expected, observed, PASS/FAIL e evidence.

## 9. Cross-tenant gate

Criar tenants A/B com IDs, source keys, cursors e bundles deliberadamente colidentes. Testar:

- receiver;
- normalized store e compatibility projections;
- rules/read models;
- BFF;
- Partner API;
- cache;
- export jobs/download;
- replay/recovery;
- admin/audit;
- logs/métricas;
- papéis PostgreSQL e FORCE RLS.

Gate: zero linha, agregado, job, arquivo ou cache de A visível ou mutável por B. Um vazamento bloqueia release.

## 10. Backup, PITR e restore

- base backup + WAL/PITR da célula em ambiente novo;
- Redis reconstruído a partir de PostgreSQL;
- Edge SQLite backup consistente e recovery de chave;
- negativos: backup truncado, chave errada, WAL faltante;
- validar contagens, hashes, cursors, inbox/outbox, jobs, read models e lineage;
- medir RPO/RTO reais.

Existência de backup não é prova de restore.

## 11. Release gates G0–G7

| Gate | Conteúdo | Status 2026-08-12 |
|---|---|---|
| G0 Static/Supply chain | fmt/clippy/test todos crates, Node/web, typecheck/lint/build, migrations, scans, SBOM, signatures, provenance, diff-check | Parcial |
| G1 Integração real | PG+Redis, agent→ACK→normalize→materialize, restart/replay | Não executado |
| G2 Segurança | auth/revoke, RLS, cross-tenant, exports/jobs/cache/logs | Não implementado completo |
| G3 Determinismo | Edge=Hub cross-target com golden real | Não implementado |
| G4 PEC protection | LOW/MEDIUM/HIGH e governor | Não implementado |
| G5 Scale/offline | 1..1000 + 1h..72h | Não executado |
| G6 Chaos/DR | fault matrix + PITR/restore | Não executado |
| G7 Promoção | canário, rollback, evidence ligada ao commit | Não executado |

### Ledger pós-Execução 2

| Gate | Estado | Evidência/limite |
|---|---|---|
| G0 | `BLOCKED` | fmt/clippy/test/typecheck/lint/build/scans amplos passaram; faltam SBOM, provenance, cargo-audit e gate único completo |
| G1 | `PASS_BOUNDED` | agente/receiver/normalizer/materializer reais, PG16+Redis7 isolados, waves 1/10 pelo endpoint legado RAW |
| G2 | `BLOCKED` | auth binding e DEFAULT_CELL/RLS selecionado passaram separadamente; export BPA e todas as superfícies não foram cobertos em um E2E |
| G3 | `BLOCKED` | paridade Windows/Linux de M1 passou; 20 indicadores e golden clínico geral faltam |
| G4 | `BLOCKED` | fonte sintética; nenhuma medição de interferência no PEC real |
| G5 | `BLOCKED` | waves 1 e 10; 50–1000 e offline 1–72 h ausentes |
| G6 | `BLOCKED` | Redis/reclaim/fencing/replay parciais; PITR/failover/network-after-commit estrito ausentes |
| G7 | `BLOCKED` | rollback de migrations/flags existe; canário e promoção não executados |

### Ledger pós-Execução 3

| Gate | Estado | Evidência/limite |
|---|---|---|
| G0 | `BLOCKED` | fmt/clippy/tests/scans e manifests Ed25519 locais passaram; faltam SBOM, vulnerability/provenance policy global e raiz independente de release |
| G1 | `PASS_BOUNDED` | agente, PostgreSQL source sintético read-only, Hub PG16, Redis7, receiver, workers e BFF reais nos três modos, waves 1/10 |
| G2 | `PASS_BOUNDED` | binding, 403, roles, `FORCE RLS`, BFF e BPA-C passaram no recorte; todas as superfícies nacionais não foram cobertas |
| G3 | `PASS_BOUNDED` | RAW/NORMALIZED/MATERIALIZED M1 produziram bytes/hash/lineage iguais; faltam outros 20 indicadores |
| G4 | `PASS_BOUNDED_SYNTHETIC_SOURCE` | statement log/read-only e fallback sem SELECT adicional passaram; não houve PEC real nem interference benchmark |
| G5 | `BLOCKED` | waves 1 e 10 passaram; 50–1.000 e offline ≥1 h ausentes |
| G6 | `BLOCKED` | SQLite kill, post-commit/pre-ACK, Redis down, duplicate, pressure fallback e materializer reclaim passaram; command terminal lost POST, PostgreSQL loss e PITR ausentes |
| G7 | `BLOCKED` | BFF real, certification gate e rollbacks passaram; canário/promoção não executados |

Evidência imutável: `benchmarks/adaptive-edge/executions/exec3-adaptive-wave-1-20260812t-validated2`
e `benchmarks/adaptive-edge/executions/exec3-adaptive-wave-10-20260812t-validated1`.
Os manifests são tamper-evident com chaves efêmeras; não são uma trust root de
produção.

### Ledger pós-Execução 4

| Gate | Estado | Evidência/limite |
|---|---|---|
| G0 | `PASS_BOUNDED_TEST_ROOT` | SBOMs Node/Rust/OCI, locks, provenance, audits, licenças, secret scan, 12 assinaturas e 12 tamper rejections; root de produção ausente |
| G1 | `PASS_BOUNDED` | command lost-result, single-state, PG/Redis, workers, read models e BFF restaurado passaram em ambiente isolado |
| G2 | `PASS_BOUNDED` | mTLS TLS 1.3, binding, revogação/rotação, RLS, roles e três tenants; superfícies nacionais completas ausentes |
| G3 | `PASS_BOUNDED` | M1 preservado e M2 produziu 12/12 outputs byte-exact; apenas 2/21 indicadores |
| G4 | `PASS_BOUNDED_SYNTHETIC_SOURCE` | role read-only, hashes e cardinalidade passaram; PEC real/interferência `BLOCKED_NOT_AUTHORIZED` |
| G5 | `PASS_BOUNDED` | offline real de 3.625,606 s e wave 50 passaram; waves 100–1.000 e janelas 6–72 h ausentes |
| G6 | `PASS_BOUNDED` | lost-result, PITR, RPO 0, RTO 44,985 s, Redis rebuild e negativos passaram; HA multi-zone/cell-loss amplo ausente |
| G7 | `PASS_BOUNDED_TEST_ROOT` | canário com agente real, pointer atômico e rollback SQLite passou; promoção municipal produtiva ausente |

Evidência imutável e hashes:
`docs/20-operations/evidence/exec4-validation-ledger-2026-08-17.json`. Manifesto
agregado `adaptive-edge-run-manifest/v2`:
`benchmarks/adaptive-edge/executions/exec4-closeout-runtime-cell-20260817T142000Z`.
Ele é content-bound, assinado com chave efêmera não persistida, validado contra
fingerprint externo e registra resultado global `BLOCKED`, coerente com
`NATIONAL_SCALE_NOT_PROVEN`.

O teste PostgreSQL de observabilidade marcado `ignored` foi executado com banco
descartável e flag explícita; portanto não é skip. Falhas intermediárias possuem
failure summaries e não foram promovidas. A tarefa de cleanup permanece
`CLEANUP_BLOCKED` por três worktrees preexistentes fora do escopo Exec4.

## 12. SLOs candidatos, ainda não validados

- durable ACK availability: 99,9%/30 dias;
- ACK p95 <= 2 s e p99 <= 5 s para bundle dentro do limite;
- RPO = 0 para tudo com ACK durável;
- freshness materializada p95 <= 15 min em regime;
- recovery após reconexão p95 <= 60 min, condicionado à capacidade medida;
- 99,9% jobs sem DLQ;
- worker recovery <= 5 min;
- Edge spool < 80% do budget e zero perda;
- RTO inicial de célula <= 60 min;
- zero cross-tenant leakage e zero synthetic zeros.

Esses números são alvos para validação; não são evidência de desempenho atual.
