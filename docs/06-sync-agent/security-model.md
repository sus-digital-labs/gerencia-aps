# Security Model

## Threat model

- extração local de dados sensíveis em ambiente de cliente;
- interceptação de tráfego agente-servidor;
- replay de lotes;
- vazamento por logs/acidentes operacionais.

## Segredo local

- credenciais PEC permanecem locais;
- segredo de agente armazenado localmente com proteção de SO;
- nenhuma credencial real versionada no repositório.

## TLS

- tráfego agente-servidor obrigatoriamente criptografado em trânsito;
- rejeitar downgrade para HTTP sem justificativa de laboratório.

## Token do agente

- token por instalação com identidade única;
- fingerprint SHA-256 registrado no servidor (sem token bruto persistido no servidor);
- escopo/capability mínimo por tenant/installation.

## Handshake e heartbeat autenticado

- `register` recebe `tokenFingerprint` (não recebe token bruto);
- `heartbeat` exige `Authorization: Bearer` e valida contra fingerprint registrado;
- ausência de token ou token inválido: `401`;
- token válido sem capability necessária: `403`.

## Validação anti-vazamento de payload

- payload de agente é rejeitado com `400` quando contém campos proibidos;
- erro seguro padronizado: `AGENT_PAYLOAD_CONTAINS_FORBIDDEN_FIELD`;
- sem eco de valor sensível no retorno.

Campos proibidos no Gate 1 (mínimo):

- `password`, `senha`
- `jdbcUrl` com senha
- `connectionString`, `databaseUrl`
- `cpf`, `cns`, `nomeCidadao`, `no_cidadao`, `endereco`, `telefone`
- `token` bruto em campo não permitido

## Rotação

- rotação periódica de token/credenciais de agente;
- invalidar token comprometido com revogação central.

## Auditoria técnica

- registrar eventos técnicos de sync/erro/retry sem payload sensível;
- trilha de execução por `agent_id` e `batch_id`.

## Logs sem PII

- proibir CPF/CNS/nome/endereço/telefone em logs;
- aplicar redaction de password/senha/token/secret/connection string.
- logs de handshake/heartbeat devem usar hash/prefixo, nunca token completo.

## Payload sem credenciais

- envio apenas de dados sincronizados e metadata operacional;
- credenciais de banco nunca trafegam para servidor central.

## Proteção contra replay

- nonce + `batch_id` + janela de validade;
- deduplicação idempotente no servidor.

## Assinatura de eventos

- quando aplicável, assinar envelopes de evento/lote com chave do agente;
- validação de assinatura no servidor antes de persistir.
