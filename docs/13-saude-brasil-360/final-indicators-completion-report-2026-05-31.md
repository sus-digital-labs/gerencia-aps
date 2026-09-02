# Relatorio final - detalhes Saude Brasil 360

Atualizado em 2026-06-02.

## 1. Status final

`DONE_DETAIL_ARCHITECTURE_AND_PRIORITY_BATCH_VALIDATED`

Os 21 indicadores foram classificados por tipo de detalhe. No runtime Qualidade APS, as abas de detalhe dos 15 indicadores deixaram de usar placeholder generico:

- B1, B2, C2, C3, C4, C5, C6, C7: detalhe `person_based` real, paginado e cacheado.
- B3, B4, B5, B6, C1, M1, M2: detalhe agregado/evento com explicacao especifica quando nao ha pendencia nominal segura.
- CVAT1-CVAT5: classificados como `person_based`, pendentes de lote proprio CVAT.
- CVAT6: `blocked_by_external_source`, pois depende de fonte externa de satisfacao/avaliacao.

## 2. Matriz dos 21

Fonte canonica: `docs/13-saude-brasil-360/final-21-indicators-detail-matrix-2026-06-02.md`.

## 3. DetailType por indicador

- `person_based`: B1, B2, C2, C3, C4, C5, C6, C7, CVAT1, CVAT2, CVAT3, CVAT4, CVAT5.
- `event_based`: B3, B4, B5, B6, C1, M1.
- `team_based`: M2.
- `blocked_by_external_source`: CVAT6.

## 4. Indicadores implementados

Implementados com query real e cache/paginacao:

- B1, B2, C2, C3, C4, C5, C6, C7.

## 5. Aggregate only e motivo

- B3: taxa de exodontia e unidade primaria de evento/procedimento.
- B4: producao de escovacao/acao coletiva; lista nominal escolar exige fonte individual validada.
- B5: taxa de procedimentos preventivos; pendencia por pessoa nao e definida pela regra.
- B6: taxa ART/restauradores; pendencia nominal unica nao e definida.
- C1: acesso APS agregado por eventos, sem coorte nominal unica.
- M1: media/producao eMulti por eventos.
- M2: acoes eMulti por equipe/evento.

## 6. Bloqueios externos

- CVAT6: depende de fonte externa de satisfacao/Meu SUS Digital. Nao ha fonte PEC segura para inventar este dado.

## 7. Performance

Smokes finais em runtime `http://127.0.0.1:3005`:

- `smoke-b360-detail-tabs`: `performanceRisks=0`.
- Abas cacheadas retornaram dentro do orcamento de primeira pagina.
- B1 cold materialization ja foi observado como mais pesado; recomendacao: pre-materializacao agendada se o escopo municipal crescer.

## 8. Testes

Executado:

- `corepack pnpm exec tsc -p Apps/server/api/tsconfig.json --noEmit`
- `corepack pnpm run lint`
- `corepack pnpm run test`
- `corepack pnpm run build`

Resultado:

- Node test: 635 pass.
- Vitest web/server: 42 pass.
- Build: `RELEASE_READY=true`.

## 9. Smokes

Executado:

- `corepack pnpm run smoke:web -- http://127.0.0.1:3005`
- `node scripts/tests/shared/smoke-b360-detail-tabs.mjs http://127.0.0.1:3005`

Resultado:

- 15 indicadores Qualidade APS testados nas abas Denominador/Numerador/Pendentes.
- `piiSafe=true`.
- `detailType` e `implementationStatus` exigidos pelo smoke.
- Sem `blocked_by_contract`.

## 10. Runtime

Runtime Docker publicado em `127.0.0.1:3005`, container `dm-gov-saude-sus-analytics-sync`, `/readyz=200`.

## 11. LGPD

- CNS mascarado em listas nominais.
- CPF nao exposto.
- Smokes rejeitam CPF/CNS completo.
- Logs de validacao nao imprimem payload nominal bruto.

## 12. Riscos

- CVAT1-CVAT5 ainda exigem lote especifico de query operacional e validacao normativa detalhada.
- B3/B4/B5/B6/M1/M2 podem evoluir para paginas event_based completas, mas hoje retornam explicacao especifica coerente com o agregado.
- B1 pode precisar de pre-cache por competencia para ambientes maiores.

## 13. Rollback

Rollback seguro:

1. Reverter commit de detalhe nominal.
2. Rebuildar backend/web.
3. Subir compose de producao.

O rollback volta os indicadores person_based para contrato agregado/fallback anterior, sem alterar banco PEC.

## 14. Proximas acoes

1. Implementar lote CVAT1-CVAT5 com regras operacionais fechadas.
2. Transformar B3/B5/B6 em paginas `event_based` completas por procedimento quando o produto exigir auditoria de evento.
3. Agendar pre-materializacao dos caches nominais por competencia/equipe.
