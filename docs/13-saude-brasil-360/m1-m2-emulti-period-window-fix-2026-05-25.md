# M1/M2 eMulti - correção da janela do dashboard

## 1. Status final

`DONE_M1_M2_DASHBOARD_WINDOW_VALIDATED`

## 2. Diagnóstico

O dashboard Saúde Brasil 360 carregava M1/M2 para maio/2026 usando a janela quadrimestral `2026-02-01..2026-05-31`. Essa janela não corresponde ao recorte oficial eMulti e levava M1/M2 a aparecerem como `Sem denominador` no painel, mesmo havendo produção real na janela anual correta.

## 3. Causa raiz

M1/M2 não estavam na lista de indicadores com janela anual no frontend. Além disso, o cálculo sem filtro de equipe/unidade retornava fallback antes de tentar resolver uma eMulti municipal tipo 72 com produção real no período.

## 4. Fórmula oficial M1

Fonte local: `docs/Saúde Brasil 360/Nota Metodológica M1 - Média de atendimentos por pessoa pela eMulti na APS.pdf`.

M1 mede a média de atendimentos por pessoa pela eMulti nos últimos 12 meses. O numerador é o total de atendimentos individuais e coletivos realizados pela eMulti; o denominador é o total de pessoas com CPF/CNS válido atendidas pela eMulti no período.

## 5. Fórmula oficial M2

Fonte local: `docs/Saúde Brasil 360/Nota Metodológica M2 - Ações interprofissionais realizadas pela eMulti na APS.pdf`.

M2 mede a proporção de ações interprofissionais realizadas pela eMulti. O numerador é o total de ações compartilhadas; o denominador é o total de ações realizadas pela eMulti no período, incluindo ações individuais, coletivas e compartilhamento de cuidado quando disponível.

## 6. Janela oficial validada

Para competência `2026-05`, M1/M2 usam a janela oficial anual encerrada no mês anterior:

- `periodoInicio`: `2025-05-01`
- `periodoFim`: `2026-04-30`
- `competencia`: `2026-05`
- `label`: `2025-05..2026-04`

## 7. Antes/depois dashboard

Antes:

- M1: `Sem denominador`
- M2: `Sem denominador`
- Janela enviada: `2026-02-01..2026-05-31`

Depois:

- M1: `1.31`
- M2: `97.87%`
- Janela exibida no card: `Janela: 2025-05 a 2026-04`

## 8. Antes/depois API

Antes:

- Requisições M1/M2 do resumo usavam janela quadrimestral.
- Sem filtro no dashboard, a resolução eMulti municipal não era tentada.

Depois:

- Requisições M1/M2 usam `2025-05-01..2026-04-30` para competência `2026-05`.
- Sem filtro, o backend resolve eMulti tipo 72 por produção municipal real no período e preserva a unidade associada.

## 9. M1 result

- Status: `ok`
- Numerador: `291`
- Denominador: `222`
- Resultado: `1.31`
- Unidade: `count_per_person`
- Tipo métrico: `mean`

## 10. M2 result

- Status: `ok`
- Numerador: `276`
- Denominador: `282`
- Resultado: `97.87`
- Unidade: `percent`
- Tipo métrico: `percentage`

## 11. Período usado

`2025-05-01..2026-04-30`, competência `2026-05`, janela oficial `2025-05..2026-04`.

## 12. Testes

- `node --import tsx --test Apps/server/api/src/indicators/__tests__/b360-m1-m2.test.ts`: 13/13 passou.
- `node --import tsx --test Apps/web/client/src/lib/saude-brasil-360-metadata.test.ts Apps/web/client/src/lib/pecApi.test.ts`: 20/20 passou.

## 13. Typecheck/build/test/lint

Executado e aprovado na validação final:

- `corepack pnpm typecheck`: passou.
- `corepack pnpm lint`: passou.
- `corepack pnpm test`: passou, com 633 testes Node e 42 testes Vitest.
- `corepack pnpm build`: passou com `RELEASE_READY=true`.

## 14. Rebuild runtime

Rebuild e restart executados:

- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml config --quiet`: passou.
- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml build --no-cache sus-analytics-sync`: passou.
- `docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d sus-analytics-sync`: passou.
- Container `dm-gov-saude-sus-analytics-sync`: `healthy`, porta `3005->3003`.

## 15. Smoke runtime

Smokes executados e aprovados:

- `node scripts/tests/shared/smoke-b360-m1-m2.mjs http://127.0.0.1:3005 --skip-preflight --check-empty`: passou.
- `node scripts/tests/shared/smoke-b360-api.mjs http://127.0.0.1:3005 --skip-preflight`: passou.
- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight`: passou.

Resultado dedicado: M1 `ok` com `291/222=1.31`, M2 `ok` com `276/282=97.87`; cenário futuro explícito retornou `empty_denominator`.

## 16. Smoke visual

Smoke visual autenticado via Chrome headless/CDP passou. O DOM renderizado confirmou `M1`, `1.31`, `291 / 222`, `M2`, `97.87%`, `276 / 282` e `Janela: 2025-05 a 2026-04`, sem `Sem denominador` nos cards M1/M2 da competência `2026-05`.

## 17. LGPD/secrets

As alterações não adicionam CPF, CNS, dumps, tokens reais, senhas ou URLs de banco reais. Os smokes e testes usam payload agregado e validam ausência de PII no resultado.

## 18. Arquivos alterados

- `Apps/server/api/src/saude-brasil-360/indicadores/indicador-m-common.ts`
- `Apps/server/api/src/indicators/__tests__/b360-m1-m2.test.ts`
- `Apps/web/client/src/components/indicators/IndicatorCard.tsx`
- `Apps/web/client/src/lib/pecApi.ts`
- `Apps/web/client/src/lib/pecApi.test.ts`
- `Apps/web/client/src/lib/saude-brasil-360-metadata.ts`
- `Apps/web/client/src/lib/saude-brasil-360-metadata.test.ts`
- `Apps/web/client/src/pages/Dashboard.tsx`
- `scripts/tests/shared/smoke-b360-m1-m2.mjs`
- `docs/13-saude-brasil-360/m1-m2-emulti-period-window-fix-2026-05-25.md`

## 19. Riscos

- Sem filtro explícito, a resolução municipal usa a eMulti tipo 72 com maior produção real no período como proxy operacional. O ideal futuro é oferecer filtro eMulti explícito.
- M1 é média, não percentual. A renderização do valor principal foi corrigida, mas a meta normativa de M1 ainda deve ser revisada em fluxo separado para alinhar faixas oficiais no card.

## 20. Rollback

Rollback técnico:

```powershell
git revert <commit-da-correcao>
docker compose --env-file .env --env-file .env.docker -f docker/01-compose/compose.production.yml up -d --build sus-analytics-sync
```

## 21. Próximas 3 ações

1. Criar seletor explícito de eMulti/unidade para eliminar proxy municipal no dashboard.
2. Revisar metadados normativos de meta/faixa do M1 como média.
3. Automatizar smoke visual M1/M2 no pipeline de validação.
