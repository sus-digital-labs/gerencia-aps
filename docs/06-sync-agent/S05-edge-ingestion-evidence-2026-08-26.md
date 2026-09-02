# Evidência S05 — PEC edge/ingestão

**Data:** 2026-08-26
**Base SHA:** `7607110c853ed29dbfca51da211b7c499ff88e2f`
**Worktree:** `D:/dm-hub/.worktrees/esus-aps-360/s05-edge-20260826/S05-edge`
**Classificação:** evidência local sanitizada; não é homologação, produção, cutover, C2 real ou full drain.

## Escopo auditado

A auditoria ficou limitada aos owners S05: `Apps/agent/**`, `Apps/ingest/**`, `Apps/server/api/src/agents/**`, `scripts/02-fixtures/**` e `docs/06-sync-agent/**`. O fluxo canônico observado é: leitura PEC read-only no edge; persistência RAW/outbox SQLite protegido; envio gzip com cursor, hash e idempotency key; autenticação e binding no receiver; persistência de chunk e payload no PostgreSQL; wake-up opcional por Redis; normalização posterior com retry e recovery duráveis.

A única alteração de código desta sessão foi uma correção de lint e endurecimento de redaction em `Apps/agent/pec-agent-sync/src/sync.rs` e `src/health.rs`. A mudança reduz erros de tabela a códigos seguros nos logs e no sumário JSON, redige chaves sensíveis e valores que pareçam credenciais, PII ou payload, e adiciona regressões unitárias. Nenhuma autoridade de negócio, contrato, schema, checkpoint ou regra clínica foi alterada.

| Invariante | Evidência sanitizada |
| --- | --- |
| Checkpoint após ACK | `EdgeState::acknowledge_and_checkpoint` persiste o recibo, confirma RAW/outbox e checkpoint na mesma transação SQLite FULL; estados aceitos são somente `accepted` e `accepted_duplicate`. |
| RAW antes do envio | `stage_raw_with_outbox` grava o payload protegido e a intenção de entrega antes de `send_ingest_entry`. |
| Idempotência | O edge deriva IDs determinísticos para RAW/outbox; o receiver trata duplicata pelo `chunk_id` e rejeita conflito de conteúdo. |
| Durabilidade central | O receiver persiste `sync_chunks` e `sync_chunk_payloads` antes de retornar ACK; Redis só publica hint após o commit. |
| Recovery sem Redis | O receiver mantém `sync_pending_queue`; o worker varre o backlog PostgreSQL antes de depender do Redis. |
| Retry/lease | O worker faz claim com lease, retry com backoff, dead-letter durável e conclusão fenced por owner/token. |
| Normalização | O normalizer valida checksum gzip, hash do chunk, contagem e unicidade de source key antes da projeção transacional. |
| Isolamento | Auth e validação exigem agent, tenant, município, tabela permitida e célula compatível; wildcard não é aceito como binding de agente ativo. |
| Redaction | Receiver, edge e sumário de sync publicam somente códigos seguros; regressões verificam que token, connection string, CPF/CNS e payload nominal não aparecem. |
| Operação | Existem `/healthz`, `/readyz`, `/metrics`, status/preflight do worker e heartbeat sanitizado. |

## Gates executados

Os comandos foram executados no worktree S05 e as operações Cargo foram serializadas pelo wrapper do projeto, usando o único target controlado `D:\dev-cache\esus-aps-360\main\cargo-target`.

| Gate | Resultado |
| --- | --- |
| `node scripts/14-shared/run-cargo.mjs fmt --manifest-path Apps/agent/Cargo.toml --all -- --check` | PASS após rustfmt; a baseline tinha um bloco não formatado em `health.rs`. |
| `node scripts/14-shared/run-cargo.mjs check --manifest-path Apps/agent/Cargo.toml --all-targets` | PASS. |
| `node scripts/14-shared/run-cargo.mjs clippy --manifest-path Apps/agent/Cargo.toml --all-targets -- -D warnings` | PASS após colapsar a condição apontada no health. |
| `node scripts/14-shared/run-cargo.mjs test --manifest-path Apps/agent/Cargo.toml --all-targets -- --test-threads=1` | PASS — 117 aprovados, 0 falhas, 2 ignorados. |
| `node scripts/14-shared/run-cargo.mjs fmt/check/clippy` do receiver | PASS — fmt, check e clippy com warnings negados. |
| `node scripts/14-shared/run-cargo.mjs test --manifest-path Apps/ingest/dm-sync-ingest/Cargo.toml --bin dm-sync-ingest -- --test-threads=1` | PASS — 105 aprovados, 0 falhas, 15 ignorados. |
| `node --import tsx --test Apps/server/api/src/agents/__tests__/*.test.ts` | PASS — 35 aprovados, 0 falhas, 0 ignorados; dependência Node foi ligada temporariamente e removida. |
| `test-pec-agent-drain-authorization.ps1` | PASS — 11 asserções negativas/estruturais; nenhum serviço ou fonte real foi acionado. |
| `node scripts/14-shared/check-docs.mjs --external=skip` | PASS. |
| `node scripts/14-shared/style-check.mjs` | PASS — 309 arquivos, sem violações reportadas. |
| `secret-scan.ps1 -BaseRef HEAD` | PASS — nenhum potencial segredo nas alterações. |
| `qa-lgpd.mjs` | PASS — 0 falhas; avisos existentes do repositório foram classificados pelo próprio QA como fixtures/padrões para revisão manual. O relatório gerado foi removido do worktree. |
| `git diff --check` | PASS após normalizar o EOF do runbook. |
| Fonte PEC real, payload real, canário, backfill ou full drain | NÃO EXECUTADO — proibido pelo prompt e sem autorização literal. |

Os testes ignorados dependem de PostgreSQL descartável ou runtime externo e não foram promovidos a evidência de produção. O auditor de cache registrou o target único sem conflitos, abaixo do limite hard, mas acima do soft limit; a limpeza permanece ação operacional separada e não foi feita enquanto processos Cargo estavam ativos.

## Classificação de decisões

`DIRECT_ADVANCE`: manter e documentar o protocolo já implementado, executar gates locais, reforçar fixtures sintéticas e registrar evidência sanitizada.
`DEPENDENT_FUTURE`: qualquer mudança de contrato S06, schema/migration S03, integração S10, materialização C2 real, replay vivo, cutover, full drain ou promoção remota.
`BLOCKER_SECURITY`: qualquer bypass de auth/escopo, avanço de cursor sem ACK, uso de Redis como autoridade, acesso a PEC real, exposição de token/PII ou apagamento de estado.
`IRRELEVANT_DIVERGENT`: runtime legado, vizinhos e caminhos fora do ownership S05.

## Rollback e recuperação

O rollback aprovado é interromper o transporte/candidato, preservar SQLite RAW/outbox/checkpoint e chunks PostgreSQL, corrigir a causa, revalidar o escopo e fazer recuperação forward-only idempotente. Não apagar estado, editar checkpoint, reconfigurar serviço como reação improvisada ou executar down migration destrutiva.

## Não-claims

Este relatório não declara homologação completa, C2 real, 21 indicadores materializados, produção, escala nacional, cutover, full drain, replay real, rollback executado ou promoção remota. O estado global informa que um canário real de um item ocorreu anteriormente; esta sessão não o repetiu nem ampliou sua janela.

## Próxima ação

Remover qualquer recurso temporário remanescente, revisar ownership, SHA, diff e status, criar o handoff obrigatório para S10 e solicitar review sem merge, push ou integração automática. A promoção depende de decisão do S10 e das autorizações literais já registradas no repositório.
