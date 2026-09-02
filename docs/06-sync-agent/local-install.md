# Sync-Agent — Instalação/execução local (dev controlado)

Data: 2026-04-30

## Pré-requisitos

- Node.js e pnpm instalados
- backend canônico ativo em `http://127.0.0.1:3012`
- sem uso de credencial real no repositório

## Scripts

- `pnpm run agent:local:discover-pec`
- `pnpm run agent:local:check`
- `pnpm run agent:local:smoke`
- `pnpm run agent:install:wizard`
- `pnpm run agent:client:install`
- `pnpm run agent:client:start`
- `pnpm run agent:client:status`
- `pnpm run agent:client:smoke`

## Fluxo recomendado

1. Rodar `agent:local:discover-pec` para localizar configuração PEC (sanitizado).
2. Rodar `agent:local:check` para validar scaffold/contratos.
3. Rodar `agent:local:smoke` para validar register + heartbeat + `/api/agents/status`.

Fluxo PROOF (Windows local):

1. `pnpm run agent:client:install`
2. `pnpm run agent:client:start`
3. `pnpm run agent:client:status`
4. `pnpm run agent:client:smoke`

Fluxo recomendado para instalacao em campo (Windows):

1. `pnpm run agent:install:wizard`
2. Preencher credenciais/codigo de ativacao no instalador GUI
3. Aceitar termos e politica de privacidade
4. Confirmar instalacao (registro + servico Windows automaticos)

Atalho equivalente:

- `powershell -ExecutionPolicy Bypass -File scripts\11-windows\agent-install.ps1`
- sem parametros obrigatorios, o script abre automaticamente o wizard GUI.

Saída mínima esperada de comprovação:

- `AGENT_INSTALLED=true`
- `AGENT_RUNNING=true` (ou `AGENT_MODE=foreground/dev` durante execução contínua)
- `AGENT_LAST_SYNC_AT=<timestamp>`

Consulta de codigos de ativacao (admin):

- `pnpm run agent:activation-codes:list`
- `pnpm run agent:activation-codes:list -- --status pending --municipioIbge 2903003`
- o script usa `DATABASE_URL` PostgreSQL quando disponivel; se nao houver, tenta fallback no container Docker `postgres` e banco `sus_analytics_app`.

## Discovery PEC (Windows)

Primeiro candidato canônico:

- `C:\Program Files\e-SUS\webserver\config\credenciais.txt`

Overrides suportados:

- `PEC_CONFIG_FILE`
- `PEC_CONFIG_DIR`
- `PEC_INSTALL_DIR`

## Segurança operacional

- não transmitir PII real de cidadão neste gate;
- não executar INSERT/UPDATE/DELETE no PEC;
- validação apenas read-only (`SELECT current_database()`, `SHOW transaction_read_only`, contagens agregadas);
- logs do agente com token redigido e fingerprint parcial.

## Agente Rust (pec-agent-sync) — operacao local

Estado validado em 2026-05-14:

- backend de destino em `http://127.0.0.1:3003`;
- PEC origem real em `localhost:5433`;
- sync incremental idempotente (segunda execucao sem duplicacao).

Fluxo recomendado:

1. `powershell -ExecutionPolicy Bypass -File scripts/11-windows/agent-client-discover-pec.ps1`
2. exportar credenciais descobertas para `PEC_DB_*` em runtime local (sem logar senha/token)
3. executar:
   - `Apps/agent/target/release/pec-agent-sync.exe status`
   - `Apps/agent/target/release/pec-agent-sync.exe heartbeat`
   - `Apps/agent/target/release/pec-agent-sync.exe once`
   - `Apps/agent/target/release/pec-agent-sync.exe sync` (duas vezes)
