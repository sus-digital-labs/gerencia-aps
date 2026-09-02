# Final Indicator Detail Tabs Validation - 2026-05-31

Status final: `DONE_C2_C3_C5_C6_NOMINAL_BATCH_VALIDATED`

## Diagnostico

A causa raiz inicial era dupla: a rota `saudeBrasil360.indicatorDetail` retornava detalhe real somente para C5 e usava bloqueio generico para todos os demais indicadores; a UI traduzia isso para "Detalhe nominal ainda nao implementado". Nas rodadas atuais, C2, C3, C5 e C6 foram materializados em cache analitico para remover o risco de performance das abas nominais.

## Alteracoes

- `indicatorDetail` agora usa contrato canonico para todos os 15 indicadores.
- C5 continua com linhas nominais reais, CNS mascarado e leitura quente via cache analitico.
- C2 retorna denominador, numerador e pendentes nominais por cache analitico quente, com criterios A-E.
- C3 retorna denominador, numerador e pendentes nominais por cache analitico quente, incluindo criterios A-K.
- C6 retorna denominador, numerador e pendentes nominais por cache analitico quente, com criterios A-D para pessoa idosa.
- B3, B4, B5, B6, C1, M1 e M2 retornam `aggregate_only` ou `not_applicable` quando a natureza do indicador e evento/procedimento.
- B1, B2, C4 e C7 retornam `blocked_by_schema` com mensagem especifica por indicador, sem fallback generico e sem `data=[]` silencioso.
- UI removeu o texto antigo de "nao implementado" e exibe a causa retornada pela API.
- Smoke `scripts/tests/shared/smoke-b360-detail-tabs.mjs` cobre B1-B6, C1-C7 e M1-M2.

## Matriz dos 15 Indicadores

| Indicador | Agregado | Denominador | Numerador | Pendentes | Decisao |
| --- | --- | --- | --- | --- | --- |
| B1 | ok | blocked_by_schema | blocked_by_schema | blocked_by_schema | nominal_schema_gap |
| B2 | ok | blocked_by_schema | blocked_by_schema | blocked_by_schema | nominal_schema_gap |
| B3 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |
| B4 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |
| B5 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |
| B6 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |
| C1 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |
| C2 | ok | ok | ok | ok | ready |
| C3 | ok | ok | ok | ok | ready |
| C4 | ok | blocked_by_schema | blocked_by_schema | blocked_by_schema | nominal_schema_gap |
| C5 | ok | ok | ok | ok | ready |
| C6 | ok | ok | ok | ok | ready |
| C7 | ok | blocked_by_schema | blocked_by_schema | blocked_by_schema | nominal_schema_gap |
| M1 | ok | aggregate_only | aggregate_only | empty | aggregate_only |
| M2 | ok | aggregate_only | aggregate_only | not_applicable | aggregate_only |

## Abas

- Visao Geral: funcional via agregado, historico e comparativo por equipe.
- Denominador/Numerador: C2, C3, C5 e C6 retornam linhas reais; demais respondem com agregado explicito ou bloqueio de schema.
- Pendentes: B5 permanece `not_applicable`; C2 retorna criterios A-E; C3 retorna criterios A-K; C5 retorna criterios de hipertensao; C6 retorna criterios A-D de cuidado da pessoa idosa.

## Testes e Runtime

- `corepack pnpm typecheck`: passou.
- `corepack pnpm lint`: passou.
- `corepack pnpm test`: passou, 635 testes Node + 42 testes Vitest.
- `corepack pnpm build`: passou, `RELEASE_READY=true`.
- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d sus-analytics-sync`: container `healthy` em `3005->3003`.
- `/api/health`: `status=ok`.
- `/readyz`: `pecReplica=ok`, `analyticsDb=ok`, `redis=ok`.
- `node scripts/tests/shared/smoke-b360-detail-tabs.mjs http://127.0.0.1:3005 --skip-preflight`: passou para 15 indicadores, com C2/C3/C5/C6 `ok/ok/ok` e `performanceRisks=0`.
- C2 quente: queries por aba abaixo de `30ms`; cache com `696` linhas.
- C3 quente: queries por aba abaixo de `10ms`; cache com `1513` linhas.
- C5 quente: queries por aba abaixo de `30ms`; cache com `7679` linhas.
- C6 quente: queries por aba abaixo de `10ms`; cache com `6044` linhas.
- `node scripts/tests/shared/smoke-b360-api.mjs http://127.0.0.1:3005 --skip-preflight`: passou.
- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight`: passou.

## LGPD

- C5 nao retorna CNS completo; `cnsMasked` preserva somente ultimos quatro digitos.
- Smoke completo valida ausencia de CPF/CNS completo em agregado e detalhes.
- A varredura ampla encontrou termos genericos ja existentes em docs/modulos fora do escopo. Nos arquivos alterados, nao ha segredo real novo.

## Smoke Visual

O navegador sem sessao abriu a tela publica. A tentativa de criar sessao local via script foi bloqueada pela politica do Browser, entao nao foi feito contorno. A validacao funcional autenticada ficou coberta pelos smokes HTTP com cookie assinado.

## Riscos

- Nominal completo ainda esta pendente para B1, B2, C4 e C7 por lacuna de contrato/schema nominal.
- C2/C3/C5/C6 frios ainda podem pagar o custo de refresh inicial por competencia/filtro; no caminho quente ficaram dentro do alvo por aba.
- Indicadores de evento/procedimento precisam de tela de evento agregado se o produto quiser drilldown operacional alem da lista de pessoas.

## Rollback

Reverter o commit desta entrega restaura o comportamento anterior, mas reintroduz o texto "Detalhe nominal ainda nao implementado" e o bloqueio generico para nao-C5.

## Proximas 3 Acoes

1. Implementar base nominal C4/C7 reutilizando o padrao de cache analitico validado em C2/C3/C5/C6.
2. Implementar B1/B2 nominal odontologico com trilha de primeira consulta/tratamento.
3. Criar drilldown de eventos para B3-B6, C1, M1 e M2 em vez de forcar lista nominal de cidadaos.
