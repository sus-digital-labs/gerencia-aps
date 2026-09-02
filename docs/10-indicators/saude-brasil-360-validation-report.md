# Saúde Brasil 360 — Validation Report

Data: 2026-05-05
Escopo: auditoria técnica de cobertura (sem alterar backend/frontend/regras)

## 1) Classificação geral

`BRASIL_360_COVERAGE_FAILED`

Motivo objetivo:

- `0/15` em `IMPLEMENTED_VALIDATED`;
- frontend canônico depende de `/api/pec/*` enquanto o runtime operacional auditado expõe `/api/trpc/*`;
- `previneBrasil.drilldown` está em `publicProcedure` e parte dos códigos retorna listas nominais com PII sem RBAC/máscara;
- há mock explícito em drilldown (`C1` e `C4`).

## 2) Resumo numérico

- total: `15`
- implementados e validados (`IMPLEMENTED_VALIDATED`): `0`
- backend only (`IMPLEMENTED_BACKEND_ONLY`): `0`
- frontend only (`IMPLEMENTED_FRONTEND_ONLY`): `0`
- parciais com dado real (`PARTIAL_WITH_REAL_DATA`): `2`
- mock blockers (`MOCK_RUNTIME_BLOCKER`): `2`
- missing (`MISSING`): `0`
- needs RBAC/masking (`NEEDS_RBAC_OR_MASKING`): `11`

## 3) Top 10 gaps críticos

1. Frontend chama `/api/pec/indicators/summary` (`Dashboard.tsx`, `pecApi.ts`) e não há evidência de rota HTTP `/api/pec/*` no runtime `Apps/server/api/dist/index.js`.
2. `previneBrasil.calcularTodos` e `previneBrasil.drilldown` estão em `publicProcedure` (`routers.ts`), sem RBAC.
3. Drilldown nominal expõe `nu_cns`, `no_cidadao` e `nu_cpf` (`indicadores-drilldown-helpers.ts`) sem mascaramento.
4. `C1` drilldown é mock hardcoded (`dist/index.js:5596`).
5. `C4` drilldown é mock hardcoded (`dist/index.js:5599`).
6. Mapeamento semântico B1..B6 diverge da ordem/metodologia oficial atual (notas B1..B6).
7. Mapeamento semântico M1/M2 divergente das notas metodológicas oficiais (M1 média; M2 ações interprofissionais).
8. Testes existentes para `previneBrasil.calcularTodos` usam `vi.mock("./pec-db")` (`system.test.ts`), sem validação real de cálculo.
9. Fluxo de detalhe `IndicatorDetail.tsx` não consome `previneBrasil.drilldown` diretamente e usa fontes heterogêneas.
10. Em ausência de dado por código, o card mostra mensagem “Dados reais conectados...” (`Dashboard.tsx:257`) sem prova técnica do vínculo de endpoint real no runtime auditado.

## 4) Ordem recomendada de implementação

1. Sprint B360-0 — matriz/fonte oficial
2. Sprint B360-1 — eSF/eAP C1-C7
3. Sprint B360-2 — eSB B1-B6
4. Sprint B360-3 — eMulti M1-M2
5. Sprint B360-4 — drilldown/RBAC/listas nominais
6. Sprint B360-5 — validação contra e-Gestor/SISAB quando possível

## 5) Critérios para considerar 100%

- `15/15` com query real ou regra oficial documentada
- `15/15` com endpoint
- `15/15` com fonte oficial
- `15/15` com teste
- `15/15` com frontend correto
- `0` mock runtime
- RBAC/máscara para tudo que tiver dado nominal
- comparação/validação externa documentada

## Fontes oficiais citadas

- Notícia oficial dos 15 indicadores de Qualidade APS (MS):
  https://www.gov.br/saude/pt-br/assuntos/noticias/2025/maio/ministerio-da-saude-apresenta-novos-indicadores-de-inducao-de-boas-praticas-para-a-atencao-primaria/
- Fichas técnicas (MS/SAPS):
  https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/
- Notas metodológicas (SIAPS):
  https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/
