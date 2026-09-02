# Plano de ativacao do modulo ACS

Atualizado em 2026-05-28.

## Objetivo

Ativar o modulo `/acs` com dados reais da base sincronizada local, sem consultas diretas ao PEC no runtime das abas. O PEC continua sendo lido apenas pelo agente Rust de sincronizacao, que envia batches para a API central e persiste dados em `sus_analytics_replica`.

## Fluxo operacional

1. O agente `pec-agent-sync` le tabelas PEC em modo incremental por cursor.
2. O receiver canônico `dm-sync-ingest` recebe chunks gzip em `/v1/sync/batches`, autentica, valida escopo agente/municipio/tenant e persiste o chunk bruto antes do ACK.
3. O worker `dm-sync-normalizer` consome Redis Stream/backlog Postgres e chama `ingestAcsBatch`.
4. O backend grava raw replica e snapshots normalizados em `sus_analytics_replica`/`sus_analytics`.
5. O modulo `/acs` consulta apenas a base central/snapshots, nunca o PEC direto.
6. Toda procedure `acs.*` passa por Redis com categoria `acs`.
7. Ingestoes do agente e mutacoes de tarefas/metas invalidam o cache `acs`.

`/api/agents/batch` e caminho legado para dev/smoke/local e nao e o caminho escalavel de producao.

## Abas e fontes

| Aba / recurso | Procedure | Fonte local | Status |
| --- | --- | --- | --- |
| Visitas | `acs.homeVisits` | `home_visits_enriched_snapshot` | Operacional |
| Mapa | `acs.citizenLocations`, `acs.territoryAreas` | `citizen_locations_snapshot`, `territory_areas_snapshot` | Operacional |
| Producao | `acs.ranking`, `acs.getAll` | `acs_ranking_monthly_snapshot`, `acs_agents_snapshot` | Operacional |
| ACS | `acs.getAll`, `acs.teams`, `acs.units` | snapshots de agentes, equipes e unidades | Operacional |
| Tarefas | `acs.tasksList`, mutacoes `acs.tasks*` | `acs_tasks`, `acs_audit_events` | Operacional |
| Desempenho | `acs.ranking`, `acs.champions` | `acs_ranking_monthly_snapshot` | Operacional |
| Historico | `acs.homeVisits` | `home_visits_enriched_snapshot` | Operacional |
| Comparativo | `acs.ranking`, `acs.champions` | `acs_ranking_monthly_snapshot` | Operacional |
| Auditoria | `acs.auditList` | `acs_audit_events` | Operacional |
| Metas | `acs.goalsList`, mutacoes `acs.goals*` | `acs_goals`, `acs_audit_events` | Operacional |
| Risco cardiovascular | `acs.cardiovascularRisk` | `cardiovascular_risk_snapshot` | Operacional |

## Snapshots materializados

| Snapshot | Motivo | Atualizacao |
| --- | --- | --- |
| `home_visits_enriched_snapshot` | Evita joins pesados em visitas e historico | Incremental por batch de visitas |
| `citizen_locations_snapshot` | Ultima localizacao por cidadao para mapa | Incremental por batch de visitas |
| `territory_areas_snapshot` | Agregado por microarea | Incremental por visitas e cadastros |
| `acs_ranking_monthly_snapshot` | Ranking e campeoes sem agregacao anual em runtime | Recalcula meses afetados por visitas/cadastros |
| `cardiovascular_risk_snapshot` | Lista de risco cardiovascular sem lateral lookup em runtime | Incremental por visitas/cadastros |
| `sync_counts` | Healthcheck rapido sem `COUNT(*)` em tabelas grandes | Atualizado pelo agente |

## Redis

Configuracao Docker:

- `REDIS_HOST` pode continuar vindo do ambiente local.
- Em container, `REDIS_DOCKER_HOST=infra-redis` normaliza hosts locais (`host.docker.internal`, `127.0.0.1`, `localhost`) para a rede compartilhada.
- Prefixo padrao: `sus-analytics:`.
- Chaves do modulo: `sus-analytics:acs:*`.

Invalidacao:

- Ingestao de batch real do agente invalida `acs` e `equipes`.
- Mutacoes de tarefas e metas invalidam `acs`.
- As abas repopulam cache na primeira leitura seguinte.

## Banco analitico no Docker

Configuracao Docker:

- `SUS_ANALYTICS_DATABASE_URL` permanece como connection string do ambiente, sem duplicar secret.
- Em container, `ANALYTICS_DB_DOCKER_HOST=postgres` e `ANALYTICS_DB_DOCKER_PORT=5432` normalizam hosts locais para a rede `anton-infra`.
- A normalizacao preserva usuario, senha, database e parametros da URL.

## Evidencia atual

Coleta de 2026-05-28:

- `/readyz`: `200`, `server`, `pecReplica`, `analyticsDb` e `redis` OK.
- `/acs`: `200`, SPA entregue.
- Agente `sync` real: `17` batches, `8039` linhas, `tb_fat_visita_domiciliar` com `500` visitas novas.
- `home_visits_snapshot`: `1.600.328`.
- `home_visits_enriched_snapshot`: `1.600.328`.
- `acs_ranking_monthly_snapshot` soma `visits_count`: `1.600.328`.
- `cardiovascular_risk_snapshot`: `8.767`, igual ao criterio de risco em `citizens_snapshot`.
- Redis ACS apos ingestao: `0` chaves, confirmando invalidacao.
- Redis ACS apos smoke das abas: `10` chaves.

Latencia medida apos ingestao:

| Procedure | Frio | Cacheado |
| --- | ---: | ---: |
| `acs.sourceHealth` | 318ms | 5ms |
| `acs.getAll` | 79ms | 11ms |
| `acs.teams` | 258ms | 4ms |
| `acs.units` | 86ms | 4ms |
| `acs.homeVisits` | 137ms | 54ms |
| `acs.citizenLocations` | 150ms | 50ms |
| `acs.cardiovascularRisk` | 112ms | 43ms |
| `acs.territoryAreas` | 14ms | 5ms |
| `acs.ranking` | 23ms | 8ms |
| `acs.champions` | 9ms | 4ms |
| `acs.tasksList` | 65ms | 5ms |
| `acs.goalsList` | 50ms | 4ms |
| `acs.auditList` | 52ms | 4ms |

## Plano restante

1. Tratar spool antigo do agente local: o `once` ficou preso drenando 360 eventos antigos. O sync real foi validado com estado temporario limpo em `H:\tmp`; o estado original ainda precisa de saneamento controlado.
2. Rodar gate completo de release quando o binario Rust release nao estiver bloqueado por processo local.
3. Revisar `smoke:server-ui`, pois ha checks textuais legados que nao representam o shell SPA atual.
4. Adicionar teste automatizado especifico para garantir que `Apps/server/api/src/acs` nao importa PEC nem usa `pecPool`.
5. Definir regra de produto para datas historicas extremas em visitas antes de filtrar ou corrigir dado de origem.

## Comandos de validacao

```powershell
corepack pnpm run typecheck
corepack pnpm run build:server
$env:TEMP='H:\tmp'; $env:TMP='H:\tmp'; corepack pnpm run check:server-dist-sync
docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml config --quiet
docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d --build sus-analytics-sync
```
