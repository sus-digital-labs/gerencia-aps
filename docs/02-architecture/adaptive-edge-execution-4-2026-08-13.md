# Execução 4 — Adaptive Edge, resiliência, escala 50 e trust

- **Execução original:** 2026-08-13
- **Reexecução canônica e fechamento:** 2026-08-17
- **Classificação funcional máxima do recorte:** `VALIDATED_E2E_ADAPTIVE_RESILIENCE_EXEC4_SLICE`
- **Classificação da plataforma:** `NATIONAL_SCALE_NOT_PROVEN`
- **Classificação de encerramento da tarefa:** `CLEANUP_BLOCKED`
- **PEC real:** não tocado; `BLOCKED_NOT_AUTHORIZED`
- **Push:** não realizado

O recorte funcional foi validado em fonte sintética isolada, PostgreSQL/Redis
descartáveis, Windows Edge e Linux Hub. Isso não declara `PRODUCTION_READY`,
`CELL_READY` nem `NATIONAL_SCALE_READY`. O encerramento permanece
`CLEANUP_BLOCKED` porque há três worktrees temporários preexistentes, de tarefas
de território e multicell, cujo conteúdo não pode ser removido com segurança por
esta execução.

O ledger machine-readable é
`docs/20-operations/evidence/exec4-validation-ledger-2026-08-17.json`. O manifesto
agregado v2, assinado e content-bound, está em
`benchmarks/adaptive-edge/executions/exec4-closeout-runtime-cell-20260817T142000Z`.
O registro Git/cleanup final está em
`docs/20-operations/evidence/exec4-closeout-2026-08-17.json`.

## 1. Preflight, consolidação e preservação

O HEAD de consolidação e início formal da Execução 4 foi
`1748f47b193b930e8239fe7bf8003d0703bbc24a`. A Execução 3,
`7ae5cc4a2de98fa7d347da3ba5855fca92abc99d`, permanece ancestral. A continuação
final encontrou `main` em `2140df10902eaf181049950b989c0d005a04e873` e o
checkpoint ativo em `7ff6e986c05262eaa27cb3c17e4cc25a7c69499f`.

Foram preservadas as 13 stashes preexistentes e a ref
`archive/adaptive-edge-exec3-20260812`. Nenhuma stash foi aplicada, removida ou
reescrita. O WIP alheio no checkout canônico foi mantido fora de todos os commits:

- `README.md` modificado;
- `docs/30-assets/banner-placeholder.svg` removido;
- `docs/23-security/lgpd-qa-report.md` modificado;
- arquivos untracked de documentação, território e scripts já existentes.

O checkpoint `e6a9d363386e26823a0562d90559db89c00f5b1d` e as branches locais
dos especialistas funcionaram como backup Git verificável. Os worktrees Exec4
foram desmontados após integração; nenhum worktree Exec4 permanece.

## 2. Integração e commits principais

As branches de especialistas foram revisadas e integradas por equivalentes no
histórico canônico, sem copiar árvores inteiras. Os commits mais relevantes são:

| Commit | Conteúdo |
|---|---|
| `e6a9d36` | checkpoint das superfícies de validação Exec4 |
| `8a4c755` / `8be973e` | contrato M2 determinístico e binding ao snapshot canônico |
| `289ac72` | telemetria direta Edge/Hub, regras, dashboard e runbook |
| `b1d45cc` | gate offline-first, recuperação e wave 50 |
| `3d6c4b8` | retry byte-exato do envelope persistido após restart |
| `28b6eb7` / `16ec770` | PITR/restore, Redis rebuild e negativos determinísticos |
| `aac47d7` | release trust, mTLS e canário bounded |
| `218e553` / `2140df1` | cardinalidade source e cache externo reproduzível |
| `293485f` | identidade da célula no recovery runtime |
| `ff127b1` / `7ff6e98` | BFF restaurado, trust portátil e agregação estrita |
| `10565b0` | correção do advisory alto de `nanoid` |
| `2a1c6ca` / `c232d25` | checkpoint trust correto entre volumes e parser porcelain |
| `4a80092` | `promtool` portátil em contêiner e source commit na evidência |
| `2f54fed` / `2c27623` | manifesto agregado v2 assinado e run id canônico |
| `34cb2bd` / `5710eeb` | receipts content-bound dos logs brutos no manifesto |
| `5de82d7` | contratos dos gates amplos alinhados e comprovados |

Os commits originais dos especialistas permanecem auditáveis nas refs locais,
mas os equivalentes acima são a linhagem integrada.

## 3. Command lost-result

O proxy destruiu a conexão depois do handler e antes do POST terminal. Após uma
lease real de 122 segundos:

- tentativa 1 terminou `LEASED`, sem resultado persistido no Hub;
- tentativa 2 terminou `SUCCEEDED`, com delivery sequence 2;
- existe exatamente um resultado e um hash canônico;
- o side effect foi executado somente na tentativa 1;
- o Edge terminou `succeeded|2|2`.

Classificação: `PASS_BOUNDED`. Evidência:
`exec4-core-runtime-cell-20260817T120000Z/command-lost-result-summary.json`.

## 4. Um SQLite, uma captura RAW e três modos

O mesmo EdgeState produziu uma captura RAW, um `raw_delta_id`, três deliveries
independentes e três resultados Hub em `RAW`, `NORMALIZED` e `MATERIALIZED`.
Foram observados um SELECT de dados, dois probes de saúde e um único semantic
hash. O retry de RAW persistido envia os bytes cifrados originais, sem reconstruir
metadata divergente e sem rearmar delivery já ACKed.

Classificação: `PASS_SINGLE_STATE_THREE_MODE`.

## 5. Telemetria e operação

A autoridade é direta: SQLite no Edge e PostgreSQL no Hub. Redis não é fonte de
verdade. O lattice fixo contém 20 séries Edge e 42 Hub, inclui zeros explícitos e
distingue ready/delayed, leases ativas/expiradas, DLQ, terminais, modos e idade
acionável sem labels de tenant, município, agente, raw, job ou erro.

O run descartável executou os testes Rust, inclusive o teste PostgreSQL marcado
`ignored` somente após fornecer PostgreSQL 16 descartável e a flag explícita.
`promtool` validou nove regras e a sequência 0 → firing → recovery. Dashboard e
runbook estão versionados. Classificação: `PASS_BOUNDED_OBSERVABILITY`.

## 6. Proteção da fonte e PEC

As waves usaram PostgreSQL 16 sintético, role read-only e content hash antes/depois
idêntico. O offline fez 10 SELECTs de dados no estágio e zero na recuperação; a
wave 50 fez 50 SELECTs, um por agente. Writes foram negados e conexões leitoras
ativas terminaram em zero.

Nenhum PEC real, serviço municipal ou banco compartilhado foi acessado. Logo G4
é somente `PASS_BOUNDED_SYNTHETIC_SOURCE`; interferência LOW/MEDIUM/HIGH no PEC
real permanece `BLOCKED_NOT_AUTHORIZED`.

## 7. Offline real de uma hora

O receiver ficou indisponível por 3.625,606 s, com 117 amostras temporais. Dez
agentes em três tenants persistiram 10 RAW e 10 pending sem avançar checkpoint.
O pico SQLite foi 1.843.200 bytes e o menor espaço livre observado foi
89.505.091.584 bytes.

Na recuperação concorrente, jitter e token bucket produziram 30 deliveries e 30
read models, sem recaptura, failed job ou perda. O índice de Jain foi 0,980392 e
o ACK p95 foi 301 ms. Classificação: `PASS_BOUNDED_OFFLINE_1H`.

## 8. Wave 50

O Core só iniciou após validar a evidência offline do mesmo produto. Cinquenta
EdgeStates e três tenants produziram exatamente 50 RAW, 150 deliveries, 150
envelopes e 150 read models, com zero failed jobs. Houve ramp, jitter, token
bucket e stop-on-first-breach.

| Métrica | Observado |
|---|---:|
| Jain por tenant | 0,999201 |
| ACK p50 | 71 ms |
| ACK p95 | 309 ms |
| ACK p99 | 415 ms |
| RAM pico por agente | 54.398.976 bytes |
| SELECTs de dados | 50 |
| health probes | 100 |

Classificação: `PASS_BOUNDED_WAVE_50`. Não extrapolar para 100–1.000 agentes.

## 9. DR celular, PITR e Redis rebuild

O harness fez base backup, arquivou WAL, restaurou até o target e iniciou célula
nova. O snapshot target e o restaurado têm o mesmo SHA-256
`7313e9ef2485455f71a3c31839babfc041cb45ec9c37bab71b0f834d6fb2e9c8`;
o snapshot posterior difere, provando o corte temporal. RPO foi 0 e RTO 44,985 s.

Redis foi esvaziado e reconstruído a partir da contagem autoritativa PostgreSQL
em 1,899 s. Receiver, roles/RLS e BFF restaurado passaram readiness; o BFF
respondeu HTTP 200 com server, PEC replica, analytics DB, Redis, corrections e
sync catalog em `ok`. O catálogo BFF source/restored também teve hash idêntico.

Negativos de WAL ausente, target inválido e backup truncado não promoveram.
Serving antes da readiness e migration incompatível permaneceram fail-closed.
Classificação: `PASS_BOUNDED_CELL_RESTORE`. Isso não é HA multi-zone.

## 10. Supply chain, signing, mTLS e canário

O release trust em `c232d25` gerou SBOMs CycloneDX separados para Node (1.083
componentes), Rust (550) e dois documentos OCI. Foram assinados 12 materiais:
SBOMs, locks, protocolo/schema/migrations, provenance, release manifest, update
metadata e três receipts de binário.

Um verificador separado confirmou 12/12 assinaturas e rejeitou adulteração em
12/12. A chave privada efêmera foi destruída. Audits pnpm, cargo, licenças,
segredos e Docker Scout passaram na política alta/crítica. Permanecem advisories
baixos/moderados (raiz: 1 baixo + 1 moderado; web: 3 baixos + 6 moderados), sem
ser ocultados. O advisory alto de `nanoid` 3.3.17 foi corrigido por override
3.3.18 e lockfile congelado. O waiver Rust `rsa` é estreito e acompanhado por
`cargo tree --target all`, que prova a dependência opcional inalcançável nos
binários PostgreSQL-only.

O proxy mTLS exigiu TLS 1.3, binding de fingerprint à instalação/agent/tenant/
município, strip/reinject de headers verificados, revogação e rotação. Seis
entrypoints passaram; certificado estrangeiro, expirado e revogado foram negados.
É uma CA de teste, não PKI de produção.

O canário usou o `pec-agent-sync.exe` real, metadata assinada, pointer atômico e
falha de saúde injetada. O rollback retornou ao binário N e o SQLite permaneceu
com SHA-256 `032700d69fbcbe60fc27e8d433d4f3c5324973a03b2bb3dbe9ade22120c2eeb9`.
Classificação: `PASS_BOUNDED_AGENT_CANARY_ROLLBACK`.

## 11. Paridade M2

A matriz contém 12 outputs: Windows/Linux × RAW/NORMALIZED/MATERIALIZED ×
SQLite/PostgreSQL. Todos são byte-exact ao golden
`2e5f216bda841bb34d804e700e0efcae0415465ad0b07a53c64fab8eb058a8c2`.
O input canônico e o source snapshot são recalculados; permutation, duplicate,
thresholds, denominator zero, overflow, unknown fields e tampering são fail-closed
nos testes unitários/property.

Classificação: `PASS_BOUNDED_SYNTHETIC_M2_PARITY`. O corpus é um agregado
sintético na fronteira de regra pura; não prova o materializer clínico municipal
completo. Evidência normativa total: 2/21 indicadores, não 21/21.

## 12. Multitenancy, LGPD e dados

As waves cobriram três tenants, os workers e DR usaram scope/RLS, o mTLS ligou
identidade à instalação e o BFF restaurado usou roles escopadas. O recorte passou,
mas não representa todas as superfícies nacionais de export, Partner API, admin
e cache.

Todos os datasets são sintéticos ou estado técnico vazio. Evidências declaram
`contains_pii=false`; secret scan passou. Não há CPF, CNS, nome, telefone,
endereço, token, senha, connection string, chave privada ou payload clínico bruto
nos artefatos consolidados.

## 13. Falhas encontradas e preservadas

Nenhuma tentativa incompleta foi promovida a PASS:

| Run | Falha | Correção/sucessor |
|---|---|---|
| `offline1h-canonical-...T090000Z` | envelope pending foi reconstruído com metadata diferente | retry byte-exato; run `...T105500Z` |
| `m2-parity-runtime-cell-...T124500Z` | terminou antes de emitir a matriz | run `...T125500Z` |
| `dr-runtime-cell-...T130000Z` | quoting do BFF restaurado | harness portátil |
| `dr-runtime-cell-...T131500Z` | `BPA_C_DATABASE_PREFLIGHT_FAILED` | migrations existentes antes do BFF |
| `dr-runtime-cell-...T134500Z` | catálogo `municipios` ausente e readiness 503 | seed técnico antes do backup |
| `trust-runtime-cell-...T153000Z` | advisory alto + agregador strict-mode | `10565b0` + `7ff6e98` |
| `trust-runtime-cell-...T160000Z` | falso inside entre D: e F: | `2a1c6ca` |
| `trust-runtime-cell-...T161500Z` | `README.md` parseado como `EADME.md` | `c232d25` |

Cada diretório contém `failure-summary.json` ou, no primeiro offline, o summary
de falha original. A execução bem-sucedida é sempre um run novo.

## 14. Manifesto e rastreabilidade

O manifesto agregado usa `adaptive-edge-run-manifest/v2`, copia e recalcula os
seis summaries autoritativos, registra BOM, protocolo, schema, migrations,
regras, receipts de binários, dataset/seed, hardware, topologia, faults,
thresholds, métricas e comandos. A validação canônica retornou `MANIFEST_VALID`.

- manifest SHA-256: `b116ec33b0c025b99ea415ca830f3cbcd473aac6f17678de407af5fc80fea518`;
- fingerprint externo: `7ce9ce7b2e37c9151be4b47b4bf8f63b5810b56e5aed91a6439cb349b2fd0671`;
- tamper rejection: PASS;
- private key persistida: não;
- result global do manifesto: `BLOCKED`, porque a prova é bounded e a escala
  nacional continua não demonstrada.

### 14.1 Gates amplos de fechamento

O HEAD `5de82d7eb4ee1444d0ce48350501b5b32487c634` foi submetido aos
gates amplos depois das execuções runtime:

- typecheck canônico web + API: aprovado;
- lint estrutural e exclusividade da autoridade Rust: aprovado;
- build backend + Vite: aprovado com `RELEASE_READY=true`;
- testes Node: 642 aprovados, 0 falhas e 1 teste live explicitamente não
  executado; o skip não foi contado como aprovação;
- testes Vitest: 109 aprovados em 17 arquivos;
- Agent Rust: 101 aprovados e 2 live ignorados;
- Ingest Rust: 104 aprovados e 15 live ignorados;
- Rules Rust: 228 unitários aprovados, além das suítes de propriedades e
  integração local sem falhas; casos que exigem PostgreSQL descartável ficaram
  explicitamente ignorados e não foram promovidos.

O golden BPA-C foi executado com o binário Rust release real compilado em cache
externo e terminou 9/9. A matriz M1/M2 e o contrato HTTP health/readyz terminaram
19/19. Os testes live específicos da Execução 4 que exigiam PostgreSQL/Redis
descartáveis foram executados nos harnesses runtime descritos acima.

## 15. Ledger G0–G7

| Gate | Estado Execução 4 | Evidência/limite |
|---|---|---|
| G0 | `PASS_BOUNDED_TEST_ROOT` | SBOM/provenance/audits/signatures; sem root de produção |
| G1 | `PASS_BOUNDED` | lost-result, single-state, PG/Redis, workers e BFF restaurado |
| G2 | `PASS_BOUNDED` | mTLS, revogação, RLS e três tenants; não todas as superfícies |
| G3 | `PASS_BOUNDED` | M1 preservado + M2 12/12; somente 2/21 indicadores |
| G4 | `PASS_BOUNDED_SYNTHETIC_SOURCE` | read-only e hashes; PEC real não autorizado |
| G5 | `PASS_BOUNDED` | offline 1 h e wave 50; 100–1.000 e 6–72 h ausentes |
| G6 | `PASS_BOUNDED` | lost result, PITR, Redis rebuild e negativos; HA ampla ausente |
| G7 | `PASS_BOUNDED_TEST_ROOT` | canário real em test root; promoção municipal ausente |

## 16. Scorecard — 26 eixos

Escala conservadora 0–10; média não promove a plataforma.

| # | Eixo | Exec. 3 | Exec. 4 | Evidência/limite |
|---:|---|---:|---:|---|
| 1 | Edge compute | 8 | 8 | single-state e retry byte-exato; 2 indicadores |
| 2 | Eficiência de banda | 7 | 7 | RAW reutilizado; dataset bounded |
| 3 | Proteção do PEC | 4 | 4 | source sintético read-only; PEC real ausente |
| 4 | Control plane | 7 | 8 | lost-result e journal; rollout produtivo ausente |
| 5 | Offline/retry | 7 | 9 | 1 h real, jitter/token bucket; 6–72 h ausentes |
| 6 | Durable ingest | 9 | 9 | ACK, retry, inbox e zero failed jobs |
| 7 | Replay/idempotência | 9 | 9 | exatamente um efeito e bytes persistidos |
| 8 | Paridade Edge/Hub | 8 | 8 | M1 + M2; ainda 2/21 |
| 9 | Multitenancy | 7 | 8 | três tenants, RLS e mTLS bounded |
| 10 | Segurança | 7 | 8 | revogação, audits e signing; PKI prod ausente |
| 11 | HA | 4 | 5 | restore/fencing; multi-zone ausente |
| 12 | DR/PITR | 2 | 8 | PITR, RPO/RTO, BFF e negativos |
| 13 | Escala nacional | 2 | 4 | wave 50; não 100–1.000 |
| 14 | Isolamento celular | 6 | 7 | célula restaurada; migração/routing ampla ausente |
| 15 | APIs | 7 | 7 | BFF readiness; serving load amplo ausente |
| 16 | Governança de regras | 7 | 8 | hashes M1/M2, fixtures e fail-closed |
| 17 | Qualidade de dados | 7 | 8 | lineage/hash/snapshot canônicos |
| 18 | Observabilidade | 5 | 9 | séries diretas, alertas, recovery, dashboard/runbook |
| 19 | Release/update | 6 | 9 | signing, verifier separado e canário rollback |
| 20 | UX operacional | 6 | 7 | dashboard/runbook; control plane completo ausente |
| 21 | Paridade BPA | 6 | 6 | durabilidade/RLS; bloqueio normativo permanece |
| 22 | Paridade indicadores | 6 | 7 | M1 + M2, somente 2/21 |
| 23 | LGPD | 7 | 8 | evidência sintética, scans e zero chave privada |
| 24 | Supply chain | 6 | 9 | SBOMs, audits, provenance, 12 assinaturas |
| 25 | Backup/restore | 5 | 9 | Hub/cell PITR e Redis rebuild |
| 26 | Evidência/benchmark | 8 | 9 | offline, 50, DR, trust, M2, obs e manifesto v2 |

Média indicativa: **7,62/10**, contra 6,27 na Execução 3. Bloqueadores de PEC,
HA, PKI produtiva ou cleanup prevalecem sobre a média.

## 17. Rollback

- runtime adaptativo: manter feature gates e voltar ao modo RAW sem descartar RAW;
- command result: journal é aditivo; redelivery preserva idempotência;
- observabilidade: remover rules/dashboard sem alterar autoridade durável;
- release: pointer atômico retorna a N e valida o SQLite;
- DR: restored cell não promove antes de hashes/readiness;
- mTLS: rotação aceita A2 antes de revogar A1; flag bounded não ativa produção;
- M2: read model e runner são aditivos; incompatibilidade falha fechado;
- migrations: nenhum banco compartilhado recebeu DDL; o negativo incompatível
  prova readiness fechada.

## 18. Blockers e delta exato para a Execução 5

1. executar interferência LOW/MEDIUM/HIGH somente em PEC isolado e autorizado;
2. avançar 100→500→1.000 com serving/BFF p95/p99 e stop-on-first-breach;
3. executar 6/12/24/48/72 h offline, pressão de disco e corrupção SQLite;
4. provar HA multi-zone, perda completa de célula, failover e routing/registry;
5. substituir a CA de teste por root independente de produção e rollout municipal;
6. levar a mesma matriz ao materializer clínico M2 completo e aos outros 19 indicadores;
7. cobrir Partner API, exports, admin, cache e auditoria cross-tenant integral;
8. concluir aceite normativo BPA-C;
9. remover, pelos respectivos owners, os três worktrees preexistentes e repetir
   o closeout até haver exatamente um worktree.

## 19. Estado Git, cleanup e não-claims

O diretório pai persistente contém apenas `esus-aps-360`, e não foi criado clone
irmão. Containers, volumes, networks e processos temporários Exec4 foram zerados.
Caches de build ficam fora do checkout em `F:\dev-cache`; sua remoção é feita
somente por alvo exato e nunca justifica apagar WIP.

Ao fechar os gates, `F:\dev-cache\esus-aps-360\main-exec4` continha
17.415.102.399 bytes exclusivamente reproduzíveis. O Cargo limpou cada target
validado e os 14 arquivos pequenos restantes foram removidos por caminhos
literais; o diretório não existe após a limpeza. Nenhum cache dos três worktrees
alheios foi tocado.

Antes do registro final havia quatro worktrees: o canônico e três temporários
preexistentes de território/multicell. Como estes últimos não pertencem à Execução
4 e podem conter trabalho não integrado, a remoção foi recusada. Consequentemente:

- exatamente um diretório persistente no pai: sim;
- exatamente um worktree: **não (4)**;
- worktrees temporários Exec4: 0;
- classificação de cleanup: `CLEANUP_BLOCKED`;
- push remoto: 0;
- `origin/main` não foi atualizado por esta execução.

A `main` local avançou por fast-forward verificável de
`2140df10902eaf181049950b989c0d005a04e873` até o HEAD validado. A ref
`origin/main` permaneceu em
`75739dd3e3ef49c663d1d2b2b0fcfcc31013a611`. Não foram executados
`git worktree prune` nem manutenção Git enquanto o worktree multicell mantém
86 itens de WIP e três commits exclusivos.

O HEAD final verificável é a ref local `main` que contém este relatório e o
registro final de closeout; o hash exato é capturado após o commit documental,
evitando a autorreferência impossível de um commit registrar o próprio hash.

## 20. Decisão

O slice bounded da Execução 4 atingiu
`VALIDATED_E2E_ADAPTIVE_RESILIENCE_EXEC4_SLICE`. A plataforma permanece
`NATIONAL_SCALE_NOT_PROVEN`. A tarefa não recebe `DONE`, `PASS` ou `COMPLETED`
enquanto os três worktrees alheios permanecerem registrados; seu status de
encerramento é `CLEANUP_BLOCKED`.
