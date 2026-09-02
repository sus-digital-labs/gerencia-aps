# Plano de Implementação Técnica: Escalabilidade a Nível Estadual

**Data:** 22 de Junho de 2026
**Objetivo:** Transformar a infraestrutura single-tenant atual em uma plataforma multi-tenant distribuída capaz de suportar todo um estado (centenas de municípios), resolvendo os gargalos da ingestão assíncrona, cálculos do Saúde Brasil 360 e resiliência dos agentes.

> Este plano consolida artefatos já existentes em `docs/02-architecture/`, `docs/05-database/` e `docs/23-security/`. Ele não substitui validação de runtime nem fecha lacunas normativas ainda marcadas como `requires_official_validation` / `UNKNOWN_OFFICIAL_VALIDATION_NEEDED`.

---

## Fase 1: Fundação Multi-tenant no Banco de Dados Analítico

O PostgreSQL central (SUS Analytics) deve se preparar para armazenar dados particionados, de forma que a consulta de um município seja isolada e rápida.

1. **Migração Analítica (DDL):**
   - Executar migrações para adicionar `tenant_id` (UUID), `installation_id` (UUID) e `municipio_ibge` (VARCHAR/TEXT) às tabelas principais: `indicator_results`, `indicator_citizen_status` e `etl_runs`.
   - Modificar as tabelas de ingestão bruta `sus_analytics_ingest.sync_chunks` / `sync_chunk_payloads` e as projeções analíticas posteriores para propagarem e indexarem `municipio_ibge` com consistência ao longo do pipeline.
2. **Particionamento:**
   - Criar partições nativas do PostgreSQL usando `PARTITION BY LIST (municipio_ibge)`.
   - Configurar scripts dinâmicos no servidor que auto-criam a partição sempre que um novo `municipio_ibge` é ativado no `agent_registrations`.

## Fase 2: Evolução do Agente Edge (Rust) - `pec-agent-sync`

A sincronização de um estado exige que os agentes locais não sobrecarreguem o servidor central nem transmitam dados redundantes.

1. **Daemons Persistentes e Sincronização Incremental:**
   - Alterar o `main.rs` do agente de execução `one-shot` (sai após executar) para um loop de serviço (via `tokio::main` ou Cron persistente local).
   - Implementar checkpoint persistente compatível com o contrato já documentado (`agent-state/checkpoints.json` e futura tabela `sync_checkpoints`). O agente deve salvar o cursor/ID do último registro confirmado.
   - Modificar a querie de extração para buscar apenas `WHERE co_seq > :last_checkpoint`.
2. **Resiliência e Metadados:**
   - Implementar Retry com Backoff Exponencial (ex: 3 tentativas, 1s -> 2s -> 4s).
   - Implementar Circuit Breaker: após 5 falhas seguidas de comunicação, paralisar tentativas por 5 minutos.
   - Propagar a identidade do agente e o município resolvido no metadata do chunk (`tenant_id`, `municipality_id` e identidade persistida em `agent-state/identity.json`), preservando o contrato atual de headers `x-agent-id` e `x-tenant-id`.

## Fase 3: Worker de Normalização Massiva (Desacoplamento)

O worker em Node.js (`ingest-normalizer-worker.ts`) é um gargalo para processar a carga estadual concorrente.

1. **Separação de Processos:**
   - Desacoplar o serviço `ingest-normalizer-worker` do bundle principal (`dist/index.js`).
   - Configurar o Docker Compose central para escalar horizontalmente: instanciar 5 a 10 *replicas* do worker conectadas à mesma fila de Redis Streams (`sync:normalize`).
   - Usar *Consumer Groups* no Redis para garantir que múltiplos workers não processem o mesmo chunk simultaneamente.
2. **Enriquecimento de Payload:**
   - O worker deve ler o metadata do chunk (`tenant_id`, `municipio_ibge`) e preencher as colunas físicas recém-criadas no banco analítico em vez de salvar puramente o JSONB.

## Fase 4: Otimização do Saúde Brasil 360 (Views Materializadas)

As lógicas dos indicadores (especialmente C2, C3, e eMulti M1/M2) rodam em memória (ex: loops e `eval*Mem`). Isso causará *Out of Memory (OOM)* com milhares de atendimentos estaduais.

1. **Offloading Analítico:**
   - Transferir os *joins* complexos (como os proxies atuais de multiprofissionalidade M1/M2 baseados em `st_nasf_*`, `st_conduta_agendamento_*` e `co_dim_profissional_2`) do runtime Node.js para `MATERIALIZED VIEWS` no PostgreSQL quando a estratégia multi-tenant avançar.
   - Estas *views* devem agrupar e pré-calcular os denominadores e numeradores por `municipio_ibge` e competência, mantendo explícito que as heurísticas M1/M2 ainda exigem validação metodológica oficial.
2. **Atualização Controlada:**
   - Configurar gatilhos assíncronos que chamam o refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) de um município específico APÓS a confirmação (ACK) do processamento do seu chunk diário.

## Fase 5: Proteção da Camada de API (ABAC)

Com a base abrigando dados de vários municípios, é estritamente obrigatório proteger o acesso de leitura e correções via LEDI.

1. **Middleware ABAC:**
   - Aplicar `scopedProcedure` a TODAS as rotas analíticas do `routers-previne.ts` e afins.
   - O middleware validará que as rotas de busca de indicadores (`saudeBrasil360.*`) recebem filtros de `municipioIbge` que correspondem obrigatoriamente à sessão ativa do JWT/Cookie do usuário logado.
