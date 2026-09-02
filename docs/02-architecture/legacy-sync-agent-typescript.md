# Legacy Sync Agent TypeScript (Deprecated)

Status: `deprecated`
Data: `2026-05-16`

## Decisão

O agente operacional oficial é **exclusivamente** o Rust:

- `Apps/agent/pec-agent-sync`

O módulo:

- `Apps/sync-agent`

permanece apenas como referência histórica de migração (Gate 0/Gate 1) e **não** faz parte do caminho operacional atual.

## Regras operacionais

- Não usar `Apps/sync-agent` em runbook de produção.
- Não criar novas features em `Apps/sync-agent`.
- Não registrar novos scripts de release apontando para `Apps/sync-agent`.
- Operação de campo deve usar `pec-agent-sync` (register/heartbeat/sync/daemon).

## Estado na rodada

- scripts ativos no `package.json` que dependiam de `Apps/sync-agent` foram removidos.
- documentação operacional foi atualizada para fluxo canônico (`Apps/web`, `Apps/server/api`, `Apps/mobile`, `Apps/agent`).

## Backlog de remoção final

1. Remover scripts legados `scripts/agent-client-*.ps1` após validar que nenhum fluxo externo os consome.
2. Remover pasta `Apps/sync-agent` quando os artefatos históricos forem migrados para `docs/06-sync-agent/`.
3. Fechar com commit dedicado `chore(sync-agent): remove deprecated typescript scaffold`.
