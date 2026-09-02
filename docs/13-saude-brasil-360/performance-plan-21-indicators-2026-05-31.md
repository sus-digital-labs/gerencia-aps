# Plano de Performance — 21 Indicadores Saúde Brasil 360

Atualização: 2026-06-02

## Alvos

| Superfície | Alvo |
|---|---:|
| Dashboard 15 indicadores Qualidade APS | < 10s |
| Indicador agregado individual | < 3s |
| Primeira página do detalhe nominal | < 2s |
| Export completo | assíncrono |

## Estado Atual

O dashboard agregado usa chamadas em lote via `saudeBrasil360.calcularIndicador`. A pagina de detalhe chama `saudeBrasil360.indicatorDetail`, com paginacao (`limit` ate 100), `piiSafe=true`, `queryTimeMs`, `detailType` e `implementationStatus`.

Estado validado em 2 de junho de 2026:

- B1, B2, C2, C3, C4, C5, C6, C7 usam cache nominal no banco analytics.
- B3, B4, B5, B6, C1, M1, M2 retornam explicacao especifica agregada/event_based quando nao ha lista nominal segura.
- `smoke-b360-detail-tabs` final: `performanceRisks=0`.
- Nao ha mais `blocked_by_contract` nos 15 indicadores de Qualidade APS.

## Regras de Implementação

- Nenhuma query nominal sem `LIMIT`.
- Nenhuma query por cidadão em loop.
- Usar batch queries por indicador e período.
- Reaproveitar a mesma janela temporal do agregado.
- CPF/CNS sempre mascarados.
- Logs sem payload nominal.
- `blocked_by_source` não pode virar `empty_denominator`.
- Erro SQL não pode virar lista vazia.

## Priorização Técnica

1. Lote Cuidado Integral: C1-C7.
2. Lote Saúde Bucal: B1-B6.
3. Lote eMulti: M1-M2.
4. CVAT1-CVAT5 conforme schema real.
5. CVAT6 bloqueado por fonte externa Meu SUS Digital.

## Estratégia de Cache

Antes de criar tabelas, medir runtime real por indicador. Se os alvos não forem atingidos, propor cache no banco da aplicação, nunca no PEC:

- `indicator_results_cache`
- `indicator_nominal_cache`
- `indicator_cache_runs`
- `indicator_cache_source_freshness`

Qualquer migration de cache exige aprovação antes da criação.

## Métricas a Registrar

- `indicatorCode`
- `tab`
- `periodoInicio`
- `periodoFim`
- filtros
- `total`
- `expectedTotal`
- `queryTimeMs`
- status da fonte
- warnings

## Bloqueio Atual

Nao ha bloqueio de contrato nominal para os 15 indicadores de Qualidade APS no runtime validado.

Pendencias de performance/evolucao:

- Pre-materializar B1 por competencia/equipe para reduzir cold start municipal.
- Implementar paginas event_based completas para B3/B5/B6 quando houver requisito de auditoria por procedimento.
- Implementar lote CVAT1-CVAT5 em etapa propria; CVAT6 permanece bloqueado por fonte externa.
