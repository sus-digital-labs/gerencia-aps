# Enriquecimento ACS/Território nas listas nominais B360

Data: 2026-06-03

Status final: `DONE_NOMINAL_ACS_TERRITORY_ENRICHMENT_VALIDATED`

## Diagnóstico
- As listas nominais exibiam equipe/unidade, mas não carregavam vínculo territorial operacional suficiente para busca ativa.
- O banco analytics possui snapshots ACS reais em `sus_analytics_replica`, permitindo enriquecimento por `citizen_id` sem consultar o PEC diretamente em cada linha.
- O join não usa CPF/CNS completo e preserva paginação.

## Schema encontrado
- `sus_analytics_replica.citizens_snapshot`: 45.693 linhas; 45.693 com microárea; 0 com `acs_id`.
- `sus_analytics_replica.home_visits_enriched_snapshot`: 2.072.523 linhas; 2.051.854 com `citizen_id`; 2.072.522 com microárea; 2.072.522 com `acs_id`; última visita em 2026-05-29.
- `sus_analytics_replica.acs_agents_snapshot`: 176 linhas.
- Relatório de schema: `docs/13-saude-brasil-360/schema-acs-territory-2026-06-02.md`.

## Join canônico
- Entrada: página nominal já calculada, com `citizen_id` técnico interno.
- Fonte primária de microárea: `citizens_snapshot.id = citizen_id`.
- Fonte de ACS: última visita em `home_visits_enriched_snapshot` por `citizen_id`.
- Nome oficial do ACS: `acs_agents_snapshot.id = acs_id`, com fallback para `home_visits_enriched_snapshot.acs_name`.
- Estratégia: uma query por página/chunk, sem N+1.

## Indicadores enriquecidos
- Caminho genérico de cache nominal: `B1`, `B2`, `C2`, `C3`, `C4`, `C6`, `C7`.
- Caminho específico C5: `C5` denominador, numerador, pendentes e fallback direto.
- Indicadores `B3`, `B4`, `B5`, `B6`, `C1`, `M1`, `M2` permanecem `aggregate_only`/`not_applicable` no contrato atual quando não há query nominal implementada.

## Campos adicionados
- Backend/frontend: `microarea`, `acsId`, `acsName`, `acsCbo`, `territorySource`, `territoryUpdatedAt`, `territoryConfidence`, `territoryReason`.
- UI: colunas `Microárea` e `ACS` na linha principal; ausência de vínculo exibe `-` com motivo explícito em tooltip/sublinha.

## Evidência runtime
- `/readyz`: `status=ok`; `pecReplica=ok`; `analyticsDb=ok`; `redis=ok`; `syncCatalog=ok`.
- `smoke-b360-acs-territory-detail`: sucesso.
  - C5 denominador: 50 retornados; 50 com microárea; 50 com ACS; `queryTimeMs=9155`; PII segura.
  - C5 numerador: 50 retornados; 50 com microárea; 50 com ACS; `queryTimeMs=24`; PII segura.
  - C5 pendentes: 50 retornados; 50 com microárea; 50 com ACS; `queryTimeMs=110`; PII segura.
  - C3 pendentes: 50 retornados; 50 com microárea; 50 com ACS; `queryTimeMs=7215`.
  - C2 pendentes: 50 retornados; 48 com microárea; 48 com ACS; 50 com motivo territorial; `queryTimeMs=17796`.
  - C4 pendentes: 50 retornados; 50 com microárea; 50 com ACS; `queryTimeMs=10358`.
- `smoke-b360-detail-tabs`: sucesso em 15 indicadores; 4 riscos de performance (`B1`, `B2`, `C6`, `C7`) por consultas nominais pesadas.
- `smoke-web`: sucesso.
- Verificação visual C5/Pendentes: 50 linhas, cabeçalhos `Microárea` e `ACS`, sem 404, sem `Bloqueado`, sem CNS completo e sem erros de console.

## Performance
- O enriquecimento territorial foi ajustado para `LEFT JOIN LATERAL ... LIMIT 1` por cidadão, usando índice existente `idx_acs_home_visits_enriched_citizen_latest`.
- O enriquecimento evita N+1, mas alguns cálculos nominais base ainda são caros. Próximo trabalho recomendado: materializar/cachear denominadores de `B1`, `B2`, `C6` e `C7`.

## LGPD e segurança
- Varredura nos arquivos alterados:
  - CPF completo: 0 ocorrências.
  - CNS completo: 1 ocorrência em teste negativo/fake, validando ausência no payload.
  - Palavras de segredo: somente `JWT_SECRET` de smoke com fallback dev e sanitização explícita do campo de senha no script de auditoria.
- Smoke territorial rejeita CPF/CNS completos no payload.
- Scripts de auditoria e smoke imprimem apenas contagens agregadas.

## Gates executados
- `node scripts/14-shared/audit-acs-territory-schema.mjs`: sucesso; gerou relatório de schema.
- `corepack pnpm exec tsx --test Apps/server/api/src/saude-brasil-360/__tests__/detail-territory.test.ts`: 4/4.
- `corepack pnpm run typecheck`: sucesso.
- `corepack pnpm run lint`: sucesso.
- `corepack pnpm run test`: 639 node tests + 42 vitest tests; sucesso. Aviso conhecido: teste web de PEC direto reportou `ECONNREFUSED 149.78.176.0:5500`, mas a suíte trata como indisponibilidade esperada.
- `corepack pnpm run build`: sucesso; `RELEASE_READY=true`; aviso de chunk grande permanece.
- `docker compose --env-file .env.example -f docker/01-compose/compose.production.yml config --quiet`: sucesso.
- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml build sus-analytics-sync dm-sync-normalizer`: sucesso.
- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d sus-analytics-sync dm-sync-normalizer`: sucesso.
- `git diff --check`: sucesso, apenas avisos CRLF esperados no Windows.

## Arquivos alterados
- `Apps/server/api/src/saude-brasil-360/detail/detail-territory.ts`
- `Apps/server/api/src/saude-brasil-360/detail/detail-cache.ts`
- `Apps/server/api/src/saude-brasil-360/detail/detail-c5.ts`
- `Apps/server/api/src/saude-brasil-360/detail/detail-types.ts`
- `Apps/server/api/src/saude-brasil-360/__tests__/detail-territory.test.ts`
- `Apps/web/client/src/lib/pecApi.ts`
- `Apps/web/client/src/components/indicators/NominalList.tsx`
- `Apps/web/client/src/pages/IndicatorDetail.tsx`
- `scripts/14-shared/audit-acs-territory-schema.mjs`
- `scripts/tests/shared/smoke-b360-acs-territory-detail.mjs`
- `docs/13-saude-brasil-360/schema-acs-territory-2026-06-02.md`
- `docs/13-saude-brasil-360/acs-territory-detail-enrichment-2026-06-03.md`

## Rollback
- Reverter o commit desta entrega.
- Rebuildar `sus-analytics-sync` e `dm-sync-normalizer`.
- Subir novamente com `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d`.

## Riscos restantes
- Performance nominal: `B1`, `B2`, `C6` e `C7` ainda passam, mas têm risco de tempo alto no smoke geral.
- C2 possui linhas sem microárea/ACS, mas com `territoryReason` explícito; isso indica lacuna real de vínculo, não fallback fake.
- CVAT financeiro/classificatório não tem lista nominal atual para enriquecer.

## Próximas 3 ações
1. Materializar denominadores nominais pesados (`B1`, `B2`, `C6`, `C7`) para reduzir tempo de consulta.
2. Adicionar filtro por microárea/ACS nas listas nominais para rotina de busca ativa.
3. Criar smoke visual automatizado por aba (`Denominador`, `Numerador`, `Pendentes`) com captura de console e cabeçalhos obrigatórios.
