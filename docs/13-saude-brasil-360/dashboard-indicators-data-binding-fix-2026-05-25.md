# Dashboard Indicators Data Binding Fix — 2026-05-25

## 1. Status final

`DONE_DASHBOARD_REAL_DATA_BOUND_AND_VISUALLY_VALIDATED`

Commit principal do fix funcional: `a010b05` (`fix(dashboard): bind Saúde Brasil 360 cards to real indicator results`).

## 2. Diagnóstico objetivo

O painel principal (`/painel-municipal`) estava carregando 15 indicadores visuais, mas usando um adapter legado que consultava `GET /api/pec/indicators/summary`. Esse endpoint REST não calculava os indicadores reais: ele fabricava `numerator = 0`, derivava `resultPercentage = 0` e ainda expunha nomes antigos para B3/B4/B5/B6/M2.

## 3. Causa raiz

1. `Apps/web/client/src/pages/Dashboard.tsx` chamava `fetchPecIndicatorSummary()` em `Apps/web/client/src/lib/pecApi.ts`.
2. `fetchPecIndicatorSummary()` consumia `/api/pec/indicators/summary`.
3. `Apps/server/api/src/routes/pec-api.ts` retornava catálogo legado com nomes divergentes e zero fabricado.
4. O frontend ainda tinha metadata visual hardcoded em `IndicatorCard.tsx` e `IndicatorDetailHeader.tsx`.
5. Estados operacionais como `blocked_by_source` estavam sendo promovidos indevidamente a badge normativa em alguns cards.

## 4. Evidência da tela com 0.0%

Antes do binding canônico, o dashboard principal mostrava:

- `Indicadores = 0`
- `Acima da Meta = 0`
- placeholders do tipo `Dados reais conectados, cálculo específico pendente...`
- nomes legados como `Atendimento Programado`, `Tratamento Concluído`, `Ações Coletivas` e `Consultas Especialidades`

## 5. Divergência API vs UI

Prova local com sessão autenticada em `http://127.0.0.1:5173` no filtro visual atual (`maio/2026`, todas as unidades, todas as equipes):

- API `C1`: `status=ok`, `result=46.1`, `piiSafe=true`
- UI `C1`: `46.1%`
- API `B3`: `status=ok`, `result=11`, `officialLabel=Bom`, `classificacao=aceitavel`, `piiSafe=true`
- UI `B3`: nome `Taxa de exodontia`, badge `Bom`
- API `B4`: `status=blocked_by_source`, `result=0`, `piiSafe=true`
- UI `B4`: nome `Escovação supervisionada em faixa etária escolar`, valor principal `Bloqueado`, gauge `--`
- API `B5`: `status=ok`, `result=25.65`, `classificacao=insuficiente`, `piiSafe=true`
- UI `B5`: nome `Procedimentos odontológicos individuais preventivos`, valor `25.65%`
- API `B6`: `status=ok`, `result=4.27`, `piiSafe=true`
- UI `B6`: nome `Tratamento restaurador atraumático`
- API `M2`: `status=blocked_by_source`, `result=0`, `piiSafe=true`
- UI `M2`: nome `Ações interprofissionais realizadas pela eMulti`, valor principal `Bloqueado`

## 6. Arquivos alterados

- `Apps/web/client/src/pages/Dashboard.tsx`
- `Apps/web/client/src/lib/pecApi.ts`
- `Apps/web/client/src/lib/pecApi.test.ts`
- `Apps/web/client/src/lib/saude-brasil-360-metadata.ts`
- `Apps/web/client/src/lib/saude-brasil-360-metadata.test.ts`
- `Apps/web/client/src/components/indicators/IndicatorCard.tsx`
- `Apps/web/client/src/components/indicators/IndicatorDetailHeader.tsx`
- `Apps/web/client/src/components/indicators/IndicatorGauge.tsx`

## 7. Correção de catálogo visual

O catálogo visual do dashboard agora sai da fonte canônica `saude-brasil-360-metadata.ts`, em ordem fixa dos 15 indicadores:

- B1 `Primeira consulta odontológica programada`
- B2 `Tratamento odontológico concluído`
- B3 `Taxa de exodontia`
- B4 `Escovação supervisionada em faixa etária escolar`
- B5 `Procedimentos odontológicos individuais preventivos`
- B6 `Tratamento restaurador atraumático`
- C1 `Mais acesso à Atenção Primária à Saúde (APS)`
- C2-C7 com nomenclatura oficial
- M1 `Média de atendimentos por pessoa pela eMulti`
- M2 `Ações interprofissionais realizadas pela eMulti`

O dashboard passou a preferir o nome canônico de catálogo mesmo quando o cálculo backend retorna rótulo descritivo ligeiramente divergente, como o caso de B4 com sufixo `(6 a 12 anos)`.

## 8. Correção de adapter/fetch/cache

`fetchPecIndicatorSummary()` foi reescrito para:

- consultar `saudeBrasil360.catalog`
- calcular os 15 indicadores via `saudeBrasil360.calcularIndicador`
- preservar `status`, `message`, `period`, `competencia`, `normativeClassification`, `numerator`, `denominator` e `result`
- devolver itens por card sem depender do REST legado de zero fabricado

O botão `Atualizar` continuou usando `refetch()` da query real. O smoke autenticado local confirmou que, após atualização, o painel volta com `C1`, `B3` e `M2` reais carregados, sem retornar ao fallback zerado.

## 9. Tratamento de empty_denominator/bloqueios

Os cards deixam de apresentar `0.0%` como se fosse resultado real quando o status não é `ok`.

- `empty_denominator` → `Sem denominador` / `Sem dados no período`
- `blocked_by_source` / `blocked_by_schema` → `Bloqueado`
- falha técnica → `Erro técnico`
- gauge não mostra mais `0%` nesses estados; renderiza `--`

## 10. officialLabel

`getNormativeDisplayLabel(normativeClassification)` passou a ser a fonte do rótulo de classificação.

- quando `officialLabel` existe, ele vence o enum interno
- B3 no runtime atual exibiu `Bom`, não o enum interno `aceitavel`
- a cobertura automatizada mantém o caso validado `regular + officialLabel=Suficiente -> Suficiente`

## 11. Testes

Cobertura criada/atualizada:

- `Apps/web/client/src/lib/saude-brasil-360-metadata.test.ts`
- `Apps/web/client/src/lib/pecApi.test.ts`
- `Apps/web/client/src/lib/normative-classification.test.ts` (já existente, mantido verde)

Casos cobertos:

- nomes oficiais de B3/B4/B6/M2
- janela temporal 4 meses vs 12 meses
- `C1 35.17%` preservado sem truncar para `0.0%`
- `empty_denominator` e `blocked_by_source` sem fallback silencioso
- `officialLabel` preferido
- adapter canônico preservando nomes oficiais, valor real e `technical_error`

## 12. Typecheck/build/test/lint

- `corepack pnpm typecheck` → PASS
- `corepack pnpm build` → PASS
- `corepack pnpm test` → PASS (`594` testes raiz + `42` testes web/server)
- `corepack pnpm lint` → PASS

## 13. Smoke API

Smokes executados:

- `node scripts/tests/shared/smoke-indicators.mjs http://127.0.0.1:5173 --skip-preflight` → PASS
- chamadas autenticadas reais via `POST /api/dev-session` + `GET /api/trpc/saudeBrasil360.calcularIndicador`

Resultados relevantes no filtro visual de maio/2026:

- `C1`: `46.1`, `status=ok`, `piiSafe=true`
- `B3`: `11`, `status=ok`, `officialLabel=Bom`, `piiSafe=true`
- `B4`: `blocked_by_source`, `piiSafe=true`
- `B5`: `25.65`, `status=ok`, `piiSafe=true`
- `B6`: `4.27`, `status=ok`, `piiSafe=true`
- `M2`: `blocked_by_source`, `piiSafe=true`

## 14. Smoke visual

Smoke visual autenticado local: PASS.

Ambiente:

- URL: `http://127.0.0.1:5173/painel-municipal`
- autenticação: `POST /api/dev-session` pelo ambiente local
- rota validada: `/painel-municipal`
- filtros observados: `Maio/2026`, `Todas as Unidades`, `Todas as Equipes`

Validações visuais:

- `Indicadores = 15`
- `C1 = 46.1%`
- `B3 = Taxa de exodontia`
- `B4 = Escovação supervisionada em faixa etária escolar`
- `B5 = Procedimentos odontológicos individuais preventivos`
- `B6 = Tratamento restaurador atraumático`
- `M2 = Ações interprofissionais realizadas pela eMulti`
- cards bloqueados renderizam `Bloqueado` com gauge `--`

Observação:

- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:5173 --skip-preflight` falhou por ausência de `content-security-policy` no Vite dev server local. Isso não invalidou o binding funcional nem o smoke visual autenticado da tela; é diferença entre dev server e superfície endurecida de runtime.

## 15. Deploy, se houve

Não houve deploy desta rodada. A validação foi source-first com build local reprodutível.

## 16. LGPD/secrets

- nenhuma alteração desta rodada introduziu CPF/CNS real, token real ou URL com credencial nos arquivos alterados
- as respostas de smoke usadas nesta auditoria permaneceram agregadas e com `piiSafe=true`
- o grep amplo do repositório continua encontrando ocorrências históricas e documentais fora do escopo desta rodada; não houve novo vazamento introduzido pelo fix

## 17. Riscos

- `IndicatorDetail.tsx` ainda usa fluxo legado de detalhe e não foi reescrito nesta rodada; o problema crítico corrigido aqui foi o binding do painel principal
- o script `smoke-web.mjs` em `5173` segue sensível à ausência de headers de hardening típicos de produção
- o runtime backend que responde em `3005` continua separado do dev server `5173`; a prova desta rodada foi feita no frontend canônico com proxy local válido

## 18. Rollback

Rollback funcional:

```powershell
git revert a010b05
```

Se também houver revert da documentação desta rodada, reverter o commit documental subsequente.

## 19. Próximas 3 ações

1. Migrar `IndicatorDetail.tsx` para o mesmo contrato canônico `saudeBrasil360.calcularIndicador`, removendo dependência do fluxo legado `IndicatorResult.filter`.
2. Ajustar `smoke-web.mjs` para diferenciar Vite dev server de runtime endurecido, sem tratar ausência de CSP no ambiente local como falha funcional de tela.
3. Se necessário para homologação, rebuildar e reiniciar o runtime integrado que serve `Apps/server/api/dist/public` e repetir o smoke autenticado fora do Vite dev server.
