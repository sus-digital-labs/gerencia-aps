# Nominal Detail Next Batch Plan - 2026-05-31

Status: `DONE_C2_C3_C5_C6_NOMINAL_BATCH_VALIDATED`

## Entregue nesta rodada

- C2: detalhe nominal materializado para `denominator`, `numerator` e `pending`, com criterios A-E e identificadores mascarados.
- C3: detalhe nominal materializado para `denominator`, `numerator` e `pending`, com criterios A-K e identificadores mascarados.
- C5: detalhe nominal materializado no banco analitico, com leitura quente de abas abaixo de `30ms`.
- C6: detalhe nominal materializado para `denominator`, `numerator` e `pending`, com criterios A-D de cuidado da pessoa idosa e identificadores mascarados.
- Smoke completo passou para os 15 indicadores.

## C2 antes/depois

- Antes: `blocked_by_schema` em todas as abas.
- Depois: `ok` em todas as abas.
- Cache: `696` linhas, `status=ready`.
- Tempos quentes por aba: abaixo de `30ms`.

## C3 antes/depois

- Antes: `blocked_by_schema` em todas as abas.
- Depois: `ok` em todas as abas.
- Cache: `1513` linhas, `status=ready`.
- Tempos quentes por aba: abaixo de `10ms`.

## C5 antes/depois

- Antes: ~20027ms no smoke total, com full scan nominal por aba.
- Intermediario: ~14025ms no smoke total; abas entre 1930ms e 2002ms por janela paginada.
- Depois materializado: caminho quente validado; abas abaixo de `30ms`; cache com `7679` linhas e `status=ready`.
- Decisao: funcional e `ready` no caminho quente; refresh frio ainda deve ser controlado por competencia/filtro.

## C6 antes/depois

- Antes: `blocked_by_schema` em todas as abas.
- Depois: `ok` em todas as abas.
- Cache: `6044` linhas, `status=ready`.
- Tempos quentes por aba: abaixo de `10ms`.
- Decisao: funcional e `ready` no caminho quente; refresh frio materializa a coorte por competencia/filtro.

## Base C4/C7

Padrao reutilizavel validado:

- elegibilidade paginada primeiro;
- batch/lateral por pagina;
- score em uma unica query da pagina;
- `criteriosCumpridos` e `criteriosPendentes` por linha;
- `cnsMasked`/`cpfMasked`;
- `LIMIT` e cursor por offset;
- cache/materializacao quando a query por pagina ficar perto do limite.

## Indicadores ainda bloqueados

- B1/B2: precisam auditoria odontologica nominal por tratamento/primeira consulta.
- C4/C7: precisam implementacao nominal batch seguindo o padrao C2/C3/C6.

## Indicadores aggregate/evento

- B3/B4/B5/B6/C1/M1/M2 permanecem como `aggregate_only` ou `not_applicable` quando lista nominal por cidadao nao se aplica.
- Proxima etapa: criar `event_drilldown` com top equipes, categorias, procedimentos e periodo.

## Materializacao entregue

Sem alterar PEC. Migration idempotente criada no banco analitico:

- `b360_indicator_nominal_cache_runs`;
- `b360_indicator_nominal_cache`;
- `b360_indicator_detail_row_cache`;
- chaves: `scope_hash`, `indicator_code`, periodo, filtros de equipe/unidade e `citizen_id`;
- payload minimizado: nome exibivel, CNS mascarado, equipe, unidade, criterios booleanos/linhas seguras, score e ultimas datas;
- indices por escopo, score, indicador e periodo.

## Rollback

Reverter o commit da rodada atual remove a materializacao C2/C3/C5/C6 do runtime; as tabelas analiticas criadas por migration idempotente devem ser removidas manualmente apenas se rollback de schema for exigido.
