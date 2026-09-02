# Consolidação de branches e worktrees do Território — 2026-08-17

> Este registro foi criado antes da limpeza. Nenhuma branch ou worktree foi removida antes da prova de reachability e da verificação de que todos os worktrees territoriais estavam limpos.

## Linha canônica

A linha canônica consolidada é `feat/territory-map-remapping-visual-acceptance-fixes`, HEAD `7b18da72b3a092b46e63f13472f6d26ad08c4546`. Ela contém o source runtime validado em `850e316d322c9dca6c45c2de8cd7d8d19b46c0dc`, os commits documentais `ae3602bc8eaba57cc0cce55c87cfa8154d3f0caf` e `7b18da72b3a092b46e63f13472f6d26ad08c4546`, e é o head do PR #137.

A branch `feat/territory-map-remapping-containerized-finalization` é mantida temporariamente porque é a base necessária do PR #137. Ela não é uma segunda linha de entrega; é a base territorial de revisão. Não houve merge na `main`.

## Inventário antes da limpeza

| Categoria | Quantidade |
|---|---:|
| Refs locais territoriais | 12 |
| Refs remotas territoriais | 11 |
| Worktrees territoriais registradas | 10 |
| PRs territoriais ativos auditados | 3 (#135, #136, #137) |
| Worktrees territoriais dirty ou ausentes | 0 |

## Prova de reachability

Para todas as 12 refs locais territoriais, `git rev-list --left-right --count <branch>...7b18da72b3a092b46e63f13472f6d26ad08c4546` indicou `branch-only=0`; cada HEAD histórico é ancestral ou equivalente ao HEAD canônico. A prova individual de `feat/territory-geocode-rust-distributed-hardening` retornou `0 22` e merge-base `f0cabae5b033e93e3ee64ceb19b1c4663049822d`, confirmando que seus commits estão alcançáveis pelo head final.

Nenhum commit relevante foi perdido. Não houve WIP dirty nos dez worktrees territoriais. Branches locais e remotas antigas só serão removidas depois deste registro, do fechamento explícito dos PRs superseded e do push da linha canônica.

A branch `feat/territory-map-remapping-staging-qualification` não tinha branch remota correspondente e rastreava um upstream obsoleto. `git branch -d` recusou corretamente por esse upstream, embora `git merge-base --is-ancestor` contra o canonical tenha retornado exit 0. Ela é classificada como `NOT_MERGED_BY_DESIGN`: nenhum conteúdo útil está fora do canonical, nenhum worktree permanece e a remoção explícita será feita com justificativa registrada, sem force-push ou alteração de histórico remoto.

## Matriz de preservação

| Branch antiga | Estado de alcance | Destino | Remoção segura |
|---|---|---|---|
| `feat/territory-geocode-governed` | ancestral da canônica; local-only | preservada por reachability | sim |
| `feat/territory-geocode-rust-authority` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-geocode-rust-distributed-hardening` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-geocode-rust-runtime-activation` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-map-remapping-complete` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-map-remapping-production-readiness` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-map-remapping-release-hardening` | ancestral; worktree limpo | preservada por reachability | sim |
| `feat/territory-map-remapping-staging-final-fixes` | ancestral; PR #136 será superseded | preservada por reachability | sim após fechamento do PR |
| `feat/territory-map-remapping-staging-finalization` | ancestral; PR #135 será superseded | preservada por reachability | sim após fechamento do PR |
| `feat/territory-map-remapping-staging-qualification` | local-only, ancestral ao canonical; rastreava upstream obsoleto `origin/feat/territory-map-remapping-release-hardening`; remoto inexistente | `NOT_MERGED_BY_DESIGN`; conteúdo alcançável no canonical; worktree limpo | sim após remoção explícita documentada |

## PRs

O PR #137 permanece aberto, territorial e revisável, com base `feat/territory-map-remapping-containerized-finalization` e head canônico. Os PRs #135 e #136 serão comentados e fechados como superseded by #137, sem merge e sem apagar conteúdo relevante. O PR #135 não será mergeado automaticamente.

## Worktrees

Serão mantidos apenas os worktrees da base necessária do PR #137 e da linha canônica. Os oito worktrees históricos restantes estão limpos, não possuem bind mount usado pelos containers finais e serão removidos pelo Git após a prova. `git worktree prune` será executado depois.

## Critério de limpeza

A remoção é conservadora e reversível: os commits continuam alcançáveis pela linha canônica, os worktrees estão limpos, não há bind mounts na stack self-contained, os PRs obsoletos serão fechados com comentário público e o PR #137 continuará aberto. Qualquer falha de remoção interrompe a limpeza sem usar `-D`, force-push ou apagar diretório manualmente.

## Estados não alterados

`CI_REMOTE_BLOCKED_EXTERNAL`, `STAGING_PENDING_CHANGE_APPROVAL` e `PRODUCTION_BLOCKED` permanecem honestos. A consolidação Git não autoriza staging, produção, migration 0034 ou escrita no PEC.

## Estado após a limpeza

| Categoria | Antes | Depois |
|---|---:|---:|
| Refs locais territoriais | 12 | 2 |
| Refs remotas territoriais | 11 | 2 |
| Worktrees territoriais registrados | 10 | 2 |
| PRs territoriais abertos | 3 | 1 (#137) |
| Commits relevantes perdidos | 0 | 0 |
| WIP perdido | 0 | 0 |

Foram removidas nove branches remotas históricas e dez branches locais históricas. O worktree canônico e o worktree da base do PR #137 foram mantidos; os demais worktrees territoriais limpos foram removidos pelo Git e git worktree prune foi executado. Os PRs #135 e #136 foram comentados e fechados como superseded por #137. A branch staging-qualification foi o único caso NOT_MERGED_BY_DESIGN, removido somente após prova de ancestry, ausência de remoto, ausência de worktree e registro explícito.

O runtime source tree é da1c1d7a8bded051702347046ada2ad5315087b; o canonical tree é 66ee065e1e85d9cecf88b84af9918be5afa8e159. A diferença é exclusivamente documental (docs/); nenhuma imagem precisa ser rebuildada e a proveniência executável continua untime_source_sha=850e316d322c9dca6c45c2de8cd7d8d19b46c0dc.

Status de organização: TERRITORY_GIT_HISTORY_CONSOLIDATED e TERRITORY_WORKTREES_CLEAN.