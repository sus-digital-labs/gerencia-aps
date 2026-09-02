# Analytics Core Entry Roadmap

## Stage 1 - C1 + minimal calculation core

- alinhar contrato PEC e códigos do tipo de demanda;
- criar fixture sintética do encontro;
- implementar `CalculationContext`, `MethodologySpec` e `CalculationResult` mínimos;
- implementar C1 puro em INE + competência;
- golden tests, data-quality counts e documentação metodológica;
- benchmark antes/depois.

## Stage 2 - benchmark + shared normalization

- medir `NormalizedEncounters` e `NormalizedTeams`;
- adotar `scan_parquet`, projeção, predicate pushdown e filtro antes de join onde o benchmark comprovar;
- declarar cardinalidade dos joins.

## Stage 3 - incremental calculation

- particionar por competência + INE;
- fingerprints de input/metodologia/dependências;
- invalidar somente partições sujas;
- manter fallback de recomputação total.

## Stage 4 - Diabetes migration

- escolher uma regra metodologicamente estável;
- fixture compartilhada;
- comparar resultado legado versus core;
- exigir equivalência ou explicar mudança normativa antes de substituir;
- avaliar então a necessidade de `IndicatorRunner`.

## Stage 5 - Hipertensão migration

- repetir differential test;
- comprovar que contexto, resultado, encounters e runner são dependências naturais.

## Stage 6 - outros indicadores de qualidade

- migrar somente onde as mesmas primitivas resolvem repetição comprovada.

## Stage 7 - execução paralela

- medir CPU, memória e I/O;
- paralelizar por partição/indicador sem alterar definições.

## Stage 8 - RFC distribuída, se justificada

- somente após evidência de `LOCAL_LIMIT`;
- manter execução local como modo suportado;
- evitar dependência obrigatória para municípios pequenos.

## PR decomposition coerente

1. contrato PEC do Atendimento Individual + fixtures e testes de extração;
2. C1 + núcleo mínimo + golden tests + benchmark;
3. normalização compartilhada, somente se o benchmark justificar;
4. incrementalidade;
5. Diabetes;
6. Hipertensão.

As etapas 1 e 2 podem ser uma única PR se o diff permanecer pequeno, revisável e totalmente testado. Não dividir por contagem de contribuições.

