# Indicator Detail Performance - 2026-05-31

Runtime: `http://127.0.0.1:3005`.

Orcamento alvo: primeira pagina menor que 2000ms por aba. O smoke completo mede tempo total por indicador, incluindo agregado e tres abas.

| Indicador | Antes total | Depois total | Denominador query | Numerador query | Pendentes query | Decisao |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| B5 | 285ms | 266ms | 0ms | 0ms | 0ms | dentro do alvo; evento/agregado |
| C2 | 17773ms | 43ms quente | <=30ms | <=30ms | <=30ms | detalhe nominal materializado dentro do alvo; agregado ainda domina no smoke completo |
| C3 | 6963ms | 42ms quente | <=10ms | <=10ms | <=10ms | detalhe nominal materializado dentro do alvo |
| C5 | 20027ms | 76ms quente | <=30ms | <=30ms | <=30ms | detalhe nominal materializado dentro do alvo; agregado ainda domina |
| C6 | 8495ms frio | 48ms quente | <=10ms | <=10ms | <=10ms | detalhe nominal materializado dentro do alvo; refresh frio ainda tem custo inicial |
| M1 | 708ms | 653ms | 0ms | 0ms | 0ms | dentro do alvo; evento/agregado |
| M2 | 624ms | 574ms | 0ms | 0ms | 0ms | dentro do alvo; evento/agregado |

## C5 materializado

- Tabelas analiticas criadas no startup: `b360_indicator_nominal_cache_runs` e `b360_indicator_nominal_cache`.
- Cache C5 quente validado por chamada direta: denominador `24ms` de query, `50` linhas retornadas e `C5_NOMINAL_CACHE_HIT`.
- Smoke final quente: C5 `ok/ok/ok`, queries `29ms`, `9ms` e `8ms`.
- Execucao materializada: `7679` linhas no cache nominal C5 para o escopo `2026-05`, sem CPF e com CNS mascarado.

## C2/C3/C6 materializados

- Tabela analitica generica criada: `b360_indicator_detail_row_cache`.
- C2 cache quente: `696` linhas, `status=ready`; queries finais por aba abaixo de `30ms`.
- C3 cache quente: `1513` linhas, `status=ready`; queries finais por aba abaixo de `10ms`.
- C6 cache quente: `6044` linhas, `status=ready`; abas `denominator`, `numerator` e `pending` com queries finais abaixo de `10ms`.
- Payload armazenado ja e o contrato seguro da API, com CPF nulo e CNS mascarado.

## Riscos

- C5 frio ainda pode pagar o custo de refresh inicial da competencia/filtro; depois do refresh, as abas usam cache analitico.
- C2, C3 e C6 frios ainda podem pagar refresh inicial por competencia/filtro; no caminho quente ficam dentro do alvo.
- C4 ainda tem custo alto no agregado e nominal pendente.
- Nao foi criada migration nem tabela no PEC; a materializacao C5 fica somente no banco analitico compartilhado.

## Proxima otimizacao recomendada

Expandir o padrao de cache nominal analitico para os proximos indicadores pendentes:

- `indicator_code`, `competencia`, `tab`, `citizen_ref_hash`;
- criterios cumpridos/pendentes ja calculados;
- identificadores sempre mascarados;
- refresh incremental pelo sync normalizer;
- indices por indicador, competencia, equipe e unidade.
