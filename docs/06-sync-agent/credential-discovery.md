# Credential Discovery (Agente Rust — `pec-agent-sync`)

> Implementado em `Apps/agent/pec-agent-sync/src/credential_discovery.rs`.
> Executar: `pec-agent-sync discover`

---

# Credential Discovery (Local)

## Caminho padrão conhecido (Windows)

- `C:\Program Files\e-SUS\webserver\config\credenciais.txt`

> Este caminho é **default detectável**, não única fonte.

## Parsing seguro

- leitura explícita por comando/função (sem autoexec no import);
- parser sem log de conteúdo sensível;
- validação estrutural mínima dos blocos (URL/admin/read-only).

## Variáveis esperadas

- URL JDBC de conexão;
- usuário/senha de acesso completo (apenas para referência local);
- usuário/senha de acesso de leitura (preferencial para analytics).

## Exemplos

- usar somente placeholders (`<PEC_DB_ADMIN_USER>`, `<PEC_DB_ADMIN_PASSWORD>`, etc.)
- **nunca** versionar senha real.

## Regras obrigatórias

- nunca enviar senha ao servidor central;
- armazenamento de credencial somente local e protegido;
- logs sem senha/token/connection string.

## Rotação de credenciais

- rotação local controlada pelo cliente;
- agente deve permitir recarga segura sem reiniciar pipeline completo.

## Fallback manual

- permitir configuração via `.env` local do agente (não versionado), apenas para troubleshooting controlado.
