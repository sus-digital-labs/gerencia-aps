# Fase 0 — Inventário para a plataforma celular Adaptive Edge-to-Hub

- **Data da observação:** 2026-08-12
- **Integration branch:** `Equipe do projeto/adaptive-edge-integration-20260812`
- **Baseline versionado:** `8c0ffb3cb0d03df3f5c3a6822f565653b0ba4434`
- **Status:** `DESIGNED`
- **Escala nacional:** `NATIONAL_SCALE_NOT_PROVEN`

## 1. Escopo, proveniência e limites

Este inventário compara o SUS APS 360 com o produto temporário Análise PEC/BPA Insight e fecha a Fase 0 antes de qualquer alteração de contratos ou runtime.

Fontes auditadas:

- APS 360: `D:\dm-hub\apps\dm-gov\saude\esus-aps-360\esus-aps-360`;
- Análise PEC: `D:\dm-hub\apps\dm-gov\saude\bpa-insight-service`;
- control plane global: `D:\dm-hub\.github\control-plane` e `D:\dm-hub\.github\context\current`;
- infraestrutura local observada de forma read-only em 2026-08-12.

Limites de evidência:

- o checkout principal APS possuía 353 alterações locais e o Análise PEC, 141; o inventário desses dois produtos descreve o working copy observado, não uma release certificada;
- a integration branch partiu do worktree limpo `refactor/b360-rust-authority-cutover` para não capturar WIP do usuário;
- nenhum serviço, banco, container, arquivo de estado ou credencial foi alterado na Fase 0;
- testes de carga, chaos, HA, PITR, restore, mTLS e escala nacional não foram executados nesta fase;
- resultados documentais são `DESIGNED`; código observado sem prova integrada é `IMPLEMENTED_NOT_VALIDATED`.

## 2. Decisão executiva

Adotar uma **National Cellular Adaptive Edge-to-Hub Platform** com quatro planos:

1. **Edge Data Plane:** um único `pec-agent-sync`, read-only no PEC, com staging RAW transacional local, execução adaptativa e workloads compartilhados.
2. **Cellular Hub Data Plane:** receiver, inbox PostgreSQL, normalizers, materializers, read models e serving isolados por célula.
3. **National Control Plane:** registries, identidade, PKI, políticas, regras, releases, BOM, assignments e auditoria; sem processamento clínico em massa.
4. **National Aggregation/API Plane:** agregação assíncrona de read models certificados das células, Product BFF, Partner API e Event API.

Autoridades únicas:

- plataforma: SUS APS 360;
- agente: `pec-agent-sync`;
- cálculo normativo: Rust, por um engine compartilhado Edge/Hub;
- durabilidade do Hub: PostgreSQL;
- protocolo: contratos versionados do APS 360;
- release: um BOM e uma matriz de compatibilidade, sem exigir deployment lockstep.

O Análise PEC será absorvido como conhecimento de domínio, workload BPA, exportadores e UX. Seu Core JSON, agente paralelo, protocolo de snapshots processados e painel independente serão retirados após paridade comprovada.

## 3. Current Architecture Map

```text
PEC PostgreSQL
  |
  +-- pec-agent-sync (Rust)
  |     +-- catálogo/source health
  |     +-- coleta incremental
  |     +-- checkpoint.json
  |     +-- ingest-outbox.json / spool.json
  |     `-- gzip + bearer /v1/sync/batches
  |
  `-- BPAInsightAgent (Rust, processo paralelo observado)
        +-- SQL BPA acoplado ao schema PEC
        +-- DashboardSnapshot
        +-- PDF/XLSX/BPA-I/BPA-C
        `-- queue JSON -> BPA Core

Hub APS atual
  dm-sync-ingest Rust
    -> PostgreSQL durable inbox
    -> COMMIT
    -> Redis Stream hint ou pending queue PostgreSQL
    -> ACK accepted/accepted_duplicate
    -> normalizer Rust com lease/fencing/retry/DLQ
    -> normalized_records + compatibility projections
    -> b360-rules CLI one-shot
    -> read models PostgreSQL
    -> Node/tRPC BFF
    -> React
```

### 3.1 Capacidades já fortes

- receiver persiste antes do ACK e degrada Redis para backlog PostgreSQL;
- entrega at-least-once com efeito idempotente;
- normalizer possui claim `SKIP LOCKED`, lease, fencing, retry, DLQ e XACK após resultado durável;
- regras Rust possuem registry fechado de 21 indicadores, lineage, golden bundle, transação e read models;
- BFF resolve escopo autorizado e o browser não é autoridade de tenant/município;
- frontend consome read models e não deve calcular regra clínica.

### 3.2 Limitações estruturais atuais

- dois agentes ativos no Windows: `PecAgentSync` e `BPAInsightAgent`;
- estado Edge em JSON plaintext, sem WAL, transações ou criptografia real;
- RAW não é a unidade imutável obrigatória antes de todo compute/transporte;
- não há `CapabilityProfiler`, `ExecutionPlanner` nem `ResourceGovernor`;
- não há contrato explícito RAW/NORMALIZED/MATERIALIZED;
- materializer é CLI, sem `materialization_jobs` ou worker xN;
- normalizer usa autoridade global e preflight single-scope;
- compatibility projections têm `source_key` global e podem colidir entre tenants;
- zero RLS/FORCE RLS, papéis mínimos, partições e cells comprovados;
- Edge não executa o mesmo engine Rust do Hub;
- ausência de PROVISIONAL/CERTIFIED e lifecycle persistente de regras;
- runtime central local não estava ativo, enquanto o Edge acumulava spool/logs.

## 4. Feature Matrix APS 360 versus Análise PEC

Decisões: `KEEP`, `MERGE`, `REIMPLEMENT`, `REPLACE`, `RETIRE`.

| FEATURE | SOURCE | DESTINATION | STATUS | DECISION |
|---|---|---|---|---|
| Coleta RAW incremental | APS `pec-agent-sync/src/sync.rs` | Unified Edge Runtime | Base implementada; staging incompleto | KEEP + HARDEN |
| Catálogo/source discovery | APS `pec-agent-sync/src/catalog.rs` | Source Adapter Layer | Catálogo rico | KEEP |
| Source health/schema drift | APS `health.rs`; BPA `sync.rs` | Control Plane telemetry | APS superior; health ainda otimista | MERGE |
| Checkpoint | APS `checkpoint.rs` | SQLite `checkpoints` | JSON, corrupção vira vazio | REPLACE |
| Outbox/spool | APS `ingest_outbox.rs`, `spool.rs`; BPA `agent_queue.rs` | SQLite RAW-first | Ambos JSON; APS descarta no limite | REPLACE |
| BPA-I analítico | BPA `apps/desktop/src/db.rs` | Rust `bpa-core` workload | Implementado no temporário | REIMPLEMENT |
| BPA-C analítico | BPA `apps/desktop/src/db.rs` | Rust `bpa-core` workload | Implementado no temporário | REIMPLEMENT |
| CID | BPA `db.rs` | Canonical Procedure/CID model | Implementado, acoplado ao PEC | MERGE |
| Pacientes nominais | BPA `db.rs`, `PatientsPage.tsx` | Cell read model + BFF paginado | Funcional, alto risco LGPD | REIMPLEMENT |
| Procedimentos | BPA `db.rs` | `ProcedureEvent` canônico | Mapeamentos úteis | MERGE |
| Arquivo oficial BPA-I | BPA `export.rs` | `bpa-core` puro | Builder existe, não certificado | MERGE |
| Arquivo oficial BPA-C | BPA `export.rs` | `bpa-core` puro | Builder existe, não certificado | MERGE |
| BPA frontend aleatório | APS `BPAReport.tsx` | Nenhum | Usa valores aleatórios | RETIRE |
| Resumo BPA parcial | APS `bpa-resumo.ts` | BFF sobre materialização Rust | `PARTIAL_WITH_WARNINGS` | REPLACE |
| PDF agregado/nominal | BPA `export.rs` | Async export worker da célula | Síncrono | MERGE |
| XLSX operacional | BPA `export.rs` | Async export worker da célula | Síncrono | MERGE |
| CSV + SHA-256 sidecar | BPA `export.rs` | Artifact manifest | Implementado | MERGE |
| Filtros ricos | BPA `db.rs/core.rs` | BFF/read models | BPA mais completo | MERGE |
| Snapshots | BPA `db.rs/sync.rs`; APS rules snapshots | Versioned source snapshots | APS lineage é melhor | REPLACE BPA / KEEP APS |
| Enrollment | APS `identity.rs/repository.ts` | National Control Plane | Existe; re-registro inseguro | KEEP + FIX |
| Heartbeat | APS + BPA | Versioned Heartbeat | Existe; falta backlog/mode/BOM | MERGE |
| Command polling | BPA `sync.rs/core.rs` | Event API/control plane | Existe apenas no temporário | REIMPLEMENT |
| Command progress | Nenhum | Durable command journal | Ausente | REIMPLEMENT |
| Command result | BPA `sync.rs/core.rs` | Durable command journal | Resultado final útil | REIMPLEMENT |
| Remote update | BPA agent/scripts | Signed release client | Checksum/rollback sem trust root | REIMPLEMENT |
| Rollback Windows/Linux | BPA scripts; APS update script | Unified updater | Conceito útil | MERGE |
| Processamento local | BPA agent | Adaptive workload executor | Sempre local e antes do RAW | MERGE após RAW-first |
| Dashboard operacional | APS + BPA | Shell React APS | Duas UIs | MERGE |
| Administração | APS + BPA Core | Bloco Administração APS | BPA mais amplo, Core inadequado | MERGE/REIMPLEMENT |
| Async export | Nenhum durável | `export_jobs` | Ausente | REIMPLEMENT |
| Auditoria nominal | BPA Core JSON | Audit store append-only PG | Conceito parcial | REIMPLEMENT |
| Escopo parceiro | Ambos, fragmentado | AuthorizationScope transversal | Sem autoridade única | MERGE |
| Escopo município | APS fail-closed | AuthorizationScope | Boa base | KEEP |
| Escopo unidade/equipe | APS CNES/INE + BPA | AuthorizationScope | Enforcement desigual | REIMPLEMENT |
| Escopo profissional | BPA declarado | AuthorizationScope | Enforcement não provado | REIMPLEMENT |
| Core JSON BPA | BPA `core.rs` | PostgreSQL control plane | Mutex + `core-state.json` | RETIRE |
| Redis como complemento BPA | BPA Core | Redis da célula como hint/cache | Não corrige Core JSON | RETIRE |
| Agente BPA separado | BPAInsightAgent | `pec-agent-sync` workload | Ativo em paralelo | RETIRE após canário |
| Frontend BPA separado | BPA React | Shell APS | Duplicação | RETIRE após paridade |

## 5. Protocol Matrix

| Contrato | Estado atual | Gap | Contrato alvo |
|---|---|---|---|
| Registro | APS v1, bearer | bootstrap opcional, takeover no re-register | `AgentIdentityV1` + enrollment autenticado/CSR |
| Heartbeat | APS payload simples | sem BOM, capabilities, mode, backlog, cells | `HeartbeatV1` |
| Source health | APS por tabela | sem quality envelope transversal | `SourceHealthV1` |
| Chunk RAW | gzip + headers + UUID | ID não semântico; sem mode/cell/protocol envelope | `SyncEnvelopeV1<RawDeltaBundleV1>` |
| Normalized | registro PG interno | sem envelope/source adapter canônico | `SyncEnvelopeV1<NormalizedBundleV1>` |
| Materialized | result/read model interno | sem placement/certification/binary hash | `SyncEnvelopeV1<MaterializedBundleV1>` |
| Capability | capabilities string no registro | sem profiler dinâmico | `CapabilityManifestV1` |
| Policy/planner | modo transport `auto/legacy/ingest` | não decide compute | `ExecutionPolicyV1` + decisão local |
| Commands | BPA `command.v1` | fora do APS; sem progresso | `CommandV1`, `CommandProgressV1`, `CommandResultV1` |
| Negotiation | protocol string `"1"` | sem ranges/compatibilidade | `ProtocolNegotiationV1` |
| Regras | registry compile-time | sem lifecycle/hashes/attestation | `RuleDescriptorV1`, `BinaryAttestationV1` |
| Resultado | hash operacional | inclui `pipeline_run_id`; sem certificação | semantic result hash + `CertificationAttestationV1` |

Semântica obrigatória:

- delivery at-least-once;
- efeito exactly-once por idempotency key determinística, transação, dedupe e fencing;
- ACK significa commit durável no Hub, nunca materialização concluída;
- checkpoint local avança somente depois de receipt de ACK persistido;
- fallback Edge→Hub reutiliza exatamente `raw_delta_id`, bytes e `payload_hash` já persistidos;
- versões de agent, protocol, schema, rule e binary são independentes.

## 6. Dependency Map alvo

```text
sus-aps-contracts (Rust puro, serde only)
   ^              ^                 ^
   |              |                 |
pec-agent      dm-sync-ingest   control-plane adapters
   |
   +-- edge-state (SQLite encrypted + OS keystore)
   +-- source-adapters
   +-- capability-profiler/planner/governor
   `-- workload-runner
              |
              v
      b360-rule-engine / bpa-core
              ^
              |
     hub materializer workers
              |
              v
       PostgreSQL read models
              |
          Node BFF
              |
            React
```

Regras de dependência:

- engine clínico não depende de SQLx, Tokio, HTTP, relógio do sistema ou UUID aleatório;
- adapters Edge e Hub convertem para o mesmo input canônico;
- BFF depende de read models, não do engine clínico;
- Redis é removível sem perda de estado;
- control plane distribui política e registries, mas não executa bulk clínico;
- APIs públicas não reutilizam procedures internas sem facade versionada.

## 7. Data Flow alvo

```text
1. PEC SELECT-only sob budget
2. Canonical source capture
3. BEGIN SQLite
4. Persist RawDeltaBundle imutável + outbox intent
5. COMMIT SQLite
6. CapabilityProfiler + ExecutionPlanner escolhem:
   a. RAW -> upload dos mesmos bytes
   b. NORMALIZED -> normalize; persist artifact; upload
   c. MATERIALIZED -> shared Rust engine; persist result; upload
7. Falha local -> enqueue RAW original, sem reler PEC
8. Cell receiver autentica e valida envelope
9. BEGIN PostgreSQL -> inbox/dedupe -> COMMIT
10. ACK durável; Redis apenas sinaliza
11. Edge persiste ACK receipt + checkpoint em uma transação
12. Cell executa etapas restantes conforme ProcessingMode
13. Hub recompõe/verifica semantic hash e certifica quando política permite
14. Read models scoped alimentam BFF
15. Agregados certificados seguem assíncronos ao National Aggregation Plane
```

Tempos mínimos a preservar: `event_time`, `source_observed_at`, `edge_ingested_at`, `hub_received_at`, `processed_at`, `valid_from`, `valid_to` quando aplicável.

## 8. Runtime Topology alvo

```text
National Control Plane
  registries / PKI / policies / releases / BOM / audit
             |
             v
Cell Router ---- DEFAULT_CELL assignment registry
             |
   +---------+----------------------------------+
   | Data Cell                                  |
   | receiver xN -> Postgres -> Redis hint      |
   |                 |             |             |
   |             backlog       wake-up          |
   |                 v             v             |
   |           normalizer xN                       |
   |                 v                             |
   |        materialization_jobs                   |
   |                 v                             |
   |           materializer xN                     |
   |                 v                             |
   |       read models + serving                   |
   +-----------------+-----------------------------+
                     |
                     v async certified aggregates
              National Read Models
```

O piloto começa com `DEFAULT_CELL`, mas todo assignment e dado novo precisa aceitar `cell_id`. Não será criado banco por município nem um PostgreSQL nacional gigante.

## 9. Known Gaps priorizados

### P0 — release blockers

1. Dois agentes ativos e backlog Edge real; não existe ainda migração segura para um único serviço.
2. Estado/credenciais/tokens/outbox nominais em plaintext JSON.
3. Sanitização de logs Edge é no-op.
4. Outbox/spool descartam entradas antigas ao atingir limite.
5. Corrupção JSON pode virar estado vazio silenciosamente.
6. Re-register pode rotacionar token sem prova da identidade atual.
7. Suspensão/revogação não é aplicada por todos os autenticadores.
8. Receiver pode aceitar agent sem tenant binding em modo fail-open.
9. Compatibility projections usam PK global e permitem overwrite cross-tenant.
10. RLS/FORCE RLS e papéis mínimos estão ausentes.
11. `materialization_jobs` e materializer daemon inexistem.
12. Edge e Hub não compartilham o mesmo engine.

### P1

- idempotency do Edge baseada em UUID/timestamp;
- janela entre cleanup de outbox e checkpoint;
- planner/governor/profiler inexistentes;
- lock global normalizer impede xN/multi-cell;
- `normalized_records` com aproximadamente 18 GB sem partição;
- registry de regras compile-time sem lifecycle/attestation;
- resultado sem PROVISIONAL/CERTIFIED;
- adapter canônico e bitemporalidade incompletos;
- OTel, HA, PITR, restore e chaos não comprovados;
- Partner API/OpenAPI, Event API/AsyncAPI e async exports ausentes;
- supply chain sem SBOM/provenance/signatures independentes.

## 10. Migration Plan

| Fase | Entrega | Gate para avançar |
|---|---|---|
| 0 | Inventário, matrizes, riscos e ownership | Este documento revisado |
| 1 | ADR 0005 evoluída + ADR 0006/0007 | Decisões sem conflito |
| 2 | `sus-aps-contracts` v1 aditivo | fmt/clippy/test + fixtures compatíveis |
| 3A | Auth fail-closed | cross-tenant/revoke/re-register negativos |
| 3B | SQLite encrypted RAW-first | crash/corruption/disk/crypto tests |
| 3C | Profiler/planner/governor | benchmark de interferência PEC |
| 4A | Receiver aceita três modes | ACK/replay/idempotency real |
| 4B | `materialization_jobs` + worker xN | crash/lease/fencing/DLQ/reconcile |
| 5 | Shared rule engine + semantic hash | parity cross-target byte-a-byte |
| 6 | Cells DEFAULT_CELL + RLS/roles | testes reais cross-tenant e restore |
| 7 | BPA workload/read models/exports | golden normativo + paridade funcional |
| 8 | UI/Admin/API unificados | um shell/BFF e async jobs auditáveis |
| 9 | mTLS + signed releases/BOM | enrollment/rotation/revocation/update/rollback |
| 10 | load/chaos/HA/PITR | evidência quantitativa e capacidade por cell |
| 11 | canário e retirada BPA | zero perda, paridade e rollback comprovados |

O Análise PEC somente poderá ser aposentado depois de paridade BPA-I/C, nominal autorizada, PDF/XLSX, filtros, comandos, update/rollback, source health, auditoria, instalação Windows/Linux e canário operacional.

## 11. Ownership e worktrees

| Agente | Ownership | Não editar sem coordenação |
|---|---|---|
| 1 Integration Lead | ADRs, contratos, integração, relatório | WIP nos checkouts principais |
| 2 Edge Runtime | `Apps/agent/pec-agent-sync`, edge-state/planner | Hub/rules/BPA |
| 3 Análise PEC Migration | novo workload BPA e parity fixtures | Core temporário em produção |
| 4 Hub Data Plane | receiver, normalizer, jobs/workers | engine clínico |
| 5 Rules & Determinism | shared engine, registry, goldens | adapters de transporte |
| 6 Data/Multitenancy/Cells | migrations, roles, RLS, cell model | regras clínicas |
| 7 Security/Identity | PKI, keystore, release trust | fórmulas clínicas |
| 8 Admin/API/UI | BFF, public/event APIs, shell único | Edge/Hub internals |
| 9 SRE/Observability | telemetry, SLO, HA/restore | regra normativa |
| 10 Benchmark/Chaos/QA | harnesses e evidência | features de produto |

Todo agente de implementação usa branch/worktree próprio. O Integration Lead integra somente commits reproduzíveis, sem importar WIP local não versionado.

## 12. Risk Register

| ID | Risco | Prob. | Impacto | Mitigação/gate | Status |
|---|---|---:|---:|---|---|
| R-001 | Agentes APS+BPA concorrentes | Alta | Crítico | detector/abort; canário e retirada controlada | Aberto P0 |
| R-002 | Perda silenciosa no JSON outbox | Média | Crítico | SQLite fail-closed, no-drain, disk budget | Aberto P0 |
| R-003 | Roubo de token/credencial PEC | Alta | Crítico | OS keystore + encrypted DB + least privilege | Aberto P0 |
| R-004 | Takeover por re-register | Média | Crítico | prova de identidade/recovery single-use | Aberto P0 |
| R-005 | Revogação ineficaz | Média | Crítico | registry único e deny em todos entrypoints | Aberto P0 |
| R-006 | Cross-tenant por projection global | Alta | Crítico | PK scoped + RLS/FORCE RLS + negative tests | Aberto P0 |
| R-007 | Materialização somente manual | Alta | Alto | durable jobs + worker/reconciler | Aberto P0 |
| R-008 | Resultado Edge diferente do Hub | Alta | Crítico | shared engine + semantic hash + cross-target goldens | Aberto P0 |
| R-009 | Regra inválida ativada nacionalmente | Média | Crítico | lifecycle + signed bundle + canary + audit | Aberto |
| R-010 | PEC degradado pelo agent | Média | Crítico | profiler/governor/hysteresis + interference benchmark | Não provado |
| R-011 | Cell/Postgres loss sem restore | Média | Crítico | PITR/backup/restore ensaiado | Não provado |
| R-012 | Redis tratado como verdade | Baixa | Alto | preservar backlog PG e chaos Redis-down | Parcialmente mitigado |
| R-013 | Supply-chain update comprometido | Média | Crítico | TUF-like metadata, SBOM, provenance, signatures | Aberto P0 |
| R-014 | Export nominal cross-scope | Média | Crítico | ABAC+RLS+audit+async jobs | Aberto |
| R-015 | `normalized_records` noisy-neighbor | Alta | Alto | cell/shard + benchmark-driven partitioning | Aberto |
| R-016 | Nacional request fan-out colapsa cells | Média | Alto | async national aggregation only | Decidido |
| R-017 | WIP misturado à integração | Alta | Alto | clean worktree + selective commits | Mitigado nesta branch |
| R-018 | KPI/SLO falso por ausência runtime | Alta | Alto | status explícito, sem inventar PASS | Controlado |

## 13. Evidência runtime observada

- PostgreSQL e Redis locais compartilhados estavam ativos; receiver/BFF/normalizer APS não estavam ativos nas portas verificadas.
- Banco observado tinha inbox processado, backlog Redis sem pending/lag e aproximadamente 10,27 milhões de registros normalizados.
- Não foram encontradas tabelas `materialization_jobs`, cells ou registry persistente de rule lifecycle.
- Não foram encontradas RLS policies, tabelas particionadas ou os papéis mínimos propostos.
- o agente Windows estava ativo, mas checkpoint/outbox não avançavam desde julho enquanto spool e logs cresciam em 12/08.

Esses fatos não autorizam `PRODUCTION_READY`, `CELL_READY` nem `NATIONAL_SCALE_READY`.

## 14. Primeiro slice autorizado

O primeiro slice é **contratos aditivos v1**, em um crate Rust puro e novo, sem tocar WIP existente:

- `ProcessingMode`;
- `SyncEnvelope` e bundles RAW/NORMALIZED/MATERIALIZED;
- `CapabilityManifest` e `ExecutionPolicy`;
- command/progress/result;
- heartbeat/source health/identity/protocol negotiation;
- descriptor/attestation de regra e status de certificação;
- serialização, defaults retrocompatíveis, rejeição de versão inválida e canonical idempotency material.

Este slice não afirma que Edge adaptativo, SQLite criptografado, Hub multi-mode, mTLS, RLS ou cells já estejam implementados.
