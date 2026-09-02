# Sync Agent Architecture

## Papel do agente local

O agente local é o **replicador governado** entre PEC oficial e plataforma analítica central. Ele executa extração incremental e envio de comandos autorizados (incluindo LEDI) sem expor credenciais de banco ao servidor central.

## Guardrails críticos

1. O servidor central não recebe senha de banco do PEC.
2. O agente guarda segredos somente localmente e de forma protegida.
3. Extração usa preferencialmente usuário somente leitura.
4. Operação em safe mode quando detectar degradação do PEC.
5. Logs sem PII e sem segredo.

## Caminho padrão de credenciais (local)

- arquivo local protegido por ACL/criptografia de sistema operacional
- placeholders documentais:
  - `<PEC_DB_READONLY_USER>`
  - `<PEC_DB_READONLY_PASSWORD>`
  - `<PEC_DB_ADMIN_USER>`
  - `<PEC_DB_ADMIN_PASSWORD>`

> Nunca registrar valor real em docs, logs, payloads ou config central.

## Parsing de JDBC e descoberta

1. Ler configuração local do PEC (JDBC URL/host/porta/database).
2. Normalizar para DSN interno do agente.
3. Testar conexão com usuário read-only.
4. Somente em fallback controlado usar credencial administrativa local.

## Estratégia de sincronização

### 1) Bootstrap inicial controlado

- carga histórica por janela temporal
- lotes com throttle configurável
- checkpoints iniciais por tabela

### 2) Sync incremental

- cursores por tabela (`updated_at`, chave sequencial, hash de linha)
- captura de mudanças sem carga total diária
- envio compactado + criptografado

### 3) Freshness e backpressure

- monitor de atraso PEC → réplica local → central
- safe mode em horário de pico ou latência elevada
- redução automática de taxa de leitura

### 4) Fila resiliente offline

- persistência local de eventos não enviados
- retry idempotente com deduplicação
- reconciliação após reconexão

## Checkpoints por tabela

Campos mínimos de checkpoint:

- `table_name`
- `cursor_type`
- `cursor_value`
- `last_success_at`
- `last_row_count`
- `hash_window`
- `status`

## Identificação de agente e instalação

- `agent_id` (imutável)
- `organization_id`
- `installation_id`
- `municipality_ibge` (um ou vários, em instalação multimunicípio)
- versão do agente e versão de schema

## Comandos autorizados do servidor

- reprocessar janela específica
- invalidar cache analítico por categoria
- gerar e despachar payload LEDI aprovado
- coletar health/freshness sem PII

## Proibições explícitas

- enviar credenciais de banco PEC ao servidor central
- executar UPDATE/DELETE direto no PEC para “corrigir indicador”
- logar payload LEDI completo com dados nominais

## Health/Freshness mínimo do agente

- conectividade PEC read-only
- atraso médio de replicação por domínio
- tamanho da fila offline
- taxa de sucesso/falha por comando
- última confirmação de correção por sync

## status_fonte

- Arquitetura e guardrails: `confirmed`
- Parametrização fina por ambiente/versão PEC: `requires_official_validation`
