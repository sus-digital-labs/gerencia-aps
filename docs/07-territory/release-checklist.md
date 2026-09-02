# Checklist de release — módulo territorial

## Gates executados

| Critério | Estado | Evidência |
|---|---:|---|
| Fonte PEC sem permissão de escrita | PASS | role `territory_read_only` |
| Escritas negativas no PEC | PASS | 6/6 negadas |
| RLS analítico | PASS | 5/5 casos cross-scope |
| Dataset PEC representativo | PARCIAL | recorte sintético local validado; staging representativo pendente |
| Joins unidade/equipe/microárea | PARCIAL | schema identificado; materialização agregada validada |
| Registros conhecidos e pendentes | PASS | mapa fixture e import smoke |
| Importação idempotente | PASS | mesmo snapshot, um ativo |
| Importação concorrente | PARCIAL | advisory lock implementado; teste concorrente formal pendente |
| Restart no meio da importação | BLOQUEADO | teste de crash/restart não executado |
| Snapshot ativo único | PASS estrutural | índice parcial e smoke local |
| Fingerprints semânticos | PASS para novos imports | source record e endereço separados; backfill histórico pendente |
| Baixa cardinalidade | BLOQUEADO | clustering/k-anonymity não implementados |
| Retenção executável | BLOQUEADO | worker Rust não implementado |
| Crypto-shredding | BLOQUEADO | smoke end-to-end não executado |
| Dashboards/alertas | BLOQUEADO | métricas existem; painéis e alertas não criados |
| SLOs baseados em benchmark | BLOQUEADO | benchmark pendente |
| Métricas em delta | PASS | readiness smoke |
| `external_calls=0` | PASS | smokes executados |
| `pec_write=0` | PASS | role, metadata e smokes |
| Rollback reproduzido | PASS | readiness smoke |
| LGPD scan | PARCIAL | logs e docs sem PII nominal; revisão formal pendente |
| Migration homologada | BLOQUEADO | somente banco local descartável |
| Change approval | BLOQUEADO | não solicitado nem concedido |
| Merge em main | NÃO EXECUTAR | requisito explícito do ciclo |

## Proveniência do SHA base

| Verificação | Resultado |
|---|---:|
| `git fetch --all --prune` | Executado |
| Variante sem o último `b` | Resolve para `fb7b18bd68c0f016a2e6e0239f32ee90a207948b` |
| Variante com o último `b` | Resolve para `fb7b18bd68c0f016a2e6e0239f32ee90a207948b` |
| Branch publicada contém a base | Confirmado por `git merge-base --is-ancestor` |

A documentação deve tratar o SHA completo com o último `b` como representação canônica desta baseline, mantendo a regra de reconsulta ao Git em cada ciclo. Nenhuma variante deve ser aceita por autoridade documental isolada.

## Decisão

A branch pode ser commitada e publicada para revisão técnica, mas não deve ser promovida nem mesclada na `main`. O status permanece `IMPLEMENTED_LOCAL_AUTHORIZED_READ_ONLY_IMPORT_RUST_MAP_REMAPPING`.

## Checklist pré-staging

Antes de staging, obter aprovação de mudança, backup verificável, janela de execução, plano de rollback, validação de locks, recorte PEC representativo, testes concorrentes/restart, proteção de baixa cardinalidade, worker de retenção, crypto-shredding, dashboards, alertas e SLOs.
