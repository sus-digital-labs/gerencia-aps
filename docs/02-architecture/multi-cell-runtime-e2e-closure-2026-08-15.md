# Multi-Cell Runtime E2E Closure — 2026-08-15

## Classificação
`HOMOLOGATION_MULTI_CELL_PARTIAL_BLOCKED` permanece a classificação autorizada. A classificação alvo `MULTI_CELL_RUNTIME_PIPELINE_E2E_VALIDATED` **não foi declarada**, porque esta execução fechou o blocker de cursor, mas não executou nem produziu evidência para source package M1, materializer ativo, read model, paridade A/B, BFF e RLS dinâmica.

## 1. Baseline e isolamento
O baseline informado foi `1fe21e2c876754babeedcda44ac9ef536e1a3c1b`. O checkout iniciou em `main`, com working tree sem mudanças versionadas e com arquivos não rastreados preexistentes preservados. A execução foi isolada na branch local `
mission/multicell-e2e-20260815
`, sem push. O SHA final é `
ddd645e43cea552263d8638a6b9c41d359767954
`.

## 2. Causa raiz do blocker A — LKG/cursor
O query path genérico produzia comparações no formato `cursor > $1::text::bigint`. Para `tb_cid10`, o checkpoint anterior podia conter o valor textual `synthetic-cid10-2`, enquanto o contrato SQL tratava o parâmetro como bigint. Além disso, o catálogo declarava `co_cid10` — código clínico de domínio — como cursor principal, embora `co_seq_cid10` seja a chave incremental numérica apropriada.

## 3. Correção executada
Foi introduzido `CursorKind` no catálogo do agente, com os tipos efetivamente utilizados: `Int64`, `Text` e `Timestamp`. A geração de predicados SQL passou a derivar o cast do contrato do campo, eliminando `text::bigint`. O registro de `tb_cid10` agora usa `co_seq_cid10`, mantém `co_cid10` somente como alias e exige a coluna incremental mínima. O catálogo TypeScript da API foi alinhado com a mesma autoridade.

O estado legado agora é tratado fail-closed por `CursorRead`: valores compatíveis são normalizados; valores incompatíveis produzem `CURSOR_REBUILD_REQUIRED` e invalidam somente o checkpoint daquela tabela, sem resetar o restante do EdgeState. O processo pode recomeçar a tabela pelo snapshot permitido.

## 4. Evidências executadas
| Gate | Resultado | Evidência |
|---|---|---|
| Reprodução do bug `text > bigint` | PASS antes da correção | teste unitário baseline `generic_query_uses_bigint_cast_with_cursor_and_filter` |
| Contrato de cursor tipado | PASS | `CursorKind`, normalização Int64/Text/Timestamp e regressão de `tb_cid10` |
| `cargo fmt --check` | PASS | crate `Apps/agent/pec-agent-sync` |
| `cargo check` | PASS | crate `Apps/agent/pec-agent-sync` |
| `cargo clippy --all-targets --all-features -- -D warnings` | PASS | crate `Apps/agent/pec-agent-sync` |
| `cargo test` | PASS | 101 passed, 0 failed, 2 ignored |
| Typecheck TypeScript | PASS | `pnpm exec tsc -p Apps/server/api/tsconfig.json --noEmit` |
| EdgeState restart probe | PASS | 2 process runs, `integrity=ok`, output determinístico, plaintext nominal ausente |
| LKG restart real com Control Plane e retomada de cursor | NOT_RUN | infraestrutura de homologação não foi iniciada nesta execução |
| Source package M1 A/B | NOT_RUN/BLOCKED | snapshots, freshness, tombstones, lineage e authorities não foram produzidos nesta execução |
| Materializer ativo, read model e zero-diff A/B | NOT_RUN | não houve materialização real |
| BFF real e RLS cross-tenant dinâmica | NOT_RUN | não houve runtime multi-cell ativo |
| Fault matrix pós-materialização | NOT_RUN | depende de M1 READY |

## 5. Segurança e integridade
Nenhum PEC real, dado nominal real, identificador regulatório real, segredo, token, CPF, CNS ou credencial foi introduzido como evidência. Nenhuma source gate, `materialization_results` ou read model foi inserido manualmente. Billing e o worktree externo de geocode não foram tocados.

## 6. Commit e cleanup
O changeset local é `ddd645e` (`fix(agent): preserve typed incremental cursors`). Não houve push. Nenhum container, receiver, worker, rede, banco temporário ou serviço runtime foi iniciado por esta execução; portanto não havia recurso novo a remover. Os arquivos não rastreados existentes foram preservados deliberadamente.

## 7. Blockers remanescentes
Permanecem sem prova os blockers de completude/autoridade das fontes (`SOURCE_SNAPSHOT_OPEN`, `SOURCE_STALE`, tombstones e authorities sintéticas), o LKG restart real com Control Plane, M1 READY nas duas cells, materializer ativo com lease/fencing, read models reais, paridade semântica zero-diff, BFF real, RLS dinâmica e fault matrix. A próxima missão deve iniciar pelo runtime descartável de homologação e executar o fluxo real somente após `M1_SOURCE_PACKAGE_READY` em A e B.

## 8. Artefato recalculável
O manifest `docs/02-architecture/multi-cell-runtime-e2e-closure-2026-08-15-evidence.json` registra SHA, hash do binário, comandos, gates e limites desta execução.
