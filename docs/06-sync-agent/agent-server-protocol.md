# Agent-Server Protocol (G1)

## Endpoints implementados

- `POST /api/agents/register`
- `POST /api/agents/heartbeat`
- `GET /api/agents/me`

## Registro do agente (`POST /api/agents/register`)

Request mínimo:

- `agentId`
- `installationId`
- `tenantId`
- `protocolVersion` (`"1"`)
- `appVersion`
- `capabilities` (ex.: `sync:readiness`, `heartbeat`)
- `tokenFingerprint` (SHA-256 do token local)

Response:

- `status`: `registered` | `already_registered`
- `serverTime`: ISO-8601
- `agentId`
- `heartbeatIntervalSeconds`: `30`

## Heartbeat (`POST /api/agents/heartbeat`)

- heartbeat periódico com status operacional e freshness agregada;
- sem payload nominal.

Headers:

- `Authorization: Bearer <AGENT_TOKEN>`

Regras de retorno:

- sem token: `401`
- token inválido: `401`
- token válido sem capability `heartbeat`: `403`
- payload com campo proibido: `400` (`AGENT_PAYLOAD_CONTAINS_FORBIDDEN_FIELD`)
- válido: `200` (`status=accepted`)

Response:

- `status`: `accepted`
- `serverTime`: ISO-8601
- `nextHeartbeatSeconds`: `30`

## Auto-identificação (`GET /api/agents/me`)

- exige `Authorization` válido;
- exige `agentId` e `installationId` na query;
- retorna metadados do agente sem token bruto e sem fingerprint completo.

## Envio de batches

- lotes incrementais com metadata de contexto (`tenant/installation/municipality/CNES/INE`);
- compressão opcional para reduzir tráfego.

## ACK do servidor

- servidor retorna ack por `batch_id`;
- somente após ack o checkpoint local avança.

## Retry

- retry idempotente por lote não confirmado;
- backoff exponencial com jitter.

## Compressão

- suportar compressão de lote em transporte quando permitido;
- manter validação de integridade do envelope.

## Payload metadata

- incluir versão de esquema, origem, janela temporal e hash de lote;
- excluir credenciais e segredos.

## Logs e privacidade

- proibição de PII em logs do agente e do servidor;
- redaction obrigatória em mensagens técnicas.

## Persistência no Gate 1

- registro de agente no runtime atual é **in-memory** (provisório);
- evolução posterior deve migrar para persistência durável com trilha de auditoria.

## Comandos futuros

- protocolo prevê canal de comando controlado (pause/resume/reconfigure) para fases futuras.

## Fora do escopo deste gate

- execução de LEDI;
- sync completo em produção.
