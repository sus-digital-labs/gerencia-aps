# Agent Identity (Gate 1)

Status: em implementação incremental segura (sem sync real, sem LEDI)

## Contrato mínimo de identidade

Campos obrigatórios:

- `agent_id`
- `installation_id`
- `organization_id` / `tenant_id`
- `municipality_ids` (quando houver)
- `hostname_hash` (sem hostname bruto)
- `app_version`
- `runtime_version`
- `protocol_version`
- `public_key` **ou** `signing_key_id` (quando aplicável)
- `created_at`
- `last_seen_at`
- `status`
- `revocation_status`

Campos proibidos:

- senha de banco PEC;
- JDBC URL com senha;
- credenciais LEDI;
- CPF/CNS/nome/endereço/telefone.

## Decisão do Gate 1

- token de agente local aleatório por instalação (`agt_*`), gerado localmente;
- servidor armazena apenas `tokenFingerprint` (hash SHA-256);
- token bruto permanece apenas no ambiente local do agente (gitignored);
  - **Agente Rust** (`pec-agent-sync`): `agent-state/identity.json` (caminho configurável via `AGENT_STATE_DIR`)
  - Legado TypeScript Gate 1: `Apps/sync-agent/local-state/` (histórico)
- logs e smokes exibem apenas token/fingerprint redigidos (prefixo/hash curto).

## Armazenamento local

**Agente Rust atual** (`pec-agent-sync`) — arquivos em `agent-state/` (gitignored):

- `agent-state/identity.json` (agentId, token, registrationAt)
- `agent-state/checkpoints.json` (cursores por tabela)
- `agent-state/spool.json` (fila offline)
- `agent-state/pec_credentials.json` (credenciais PEC descobertas automaticamente)

**Legado Gate 1 TypeScript** (histórico — `Apps/sync-agent/local-state/`):

- `Apps/sync-agent/local-state/agent-identity.json`
- `Apps/sync-agent/local-state/agent-secret.json`

Permissões:

- diretório com modo restrito local;
- sem versionamento de segredo no repositório.

## Rotação

- rotação planejada para fase posterior;
- Gate 1 mantém contrato e base de fingerprint para futura rotação controlada.

## Observações de segurança

- nunca enviar credenciais PEC ao servidor;
- nunca logar token completo;
- nunca aceitar payload de agente com campos proibidos sensíveis.
