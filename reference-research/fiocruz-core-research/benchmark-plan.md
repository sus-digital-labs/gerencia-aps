# Benchmark Plan

## Baseline desta rodada

Status: `BLOCKED_BY_ENVIRONMENT`.

O upstream não contém datasets sintéticos que satisfaçam o schema largo das seis bases e o ambiente local não possui as dependências Python do projeto instaladas. O gerador atual também remove `dados/` antes da execução. Por segurança e para evitar dados reais, nenhum pipeline foi executado e nenhum número de performance foi inventado.

## Harness proposto

Criar fora do fluxo de produção uma fixture sintética determinística para o contrato de encontros do C1, sem nome, CPF, CNS real, telefone ou endereço.

Escalas:

- 10 mil eventos;
- 100 mil eventos;
- 500 mil eventos;
- 1 milhão de eventos, quando viável no CI/local de referência.

Distribuição controlada:

- múltiplas competências e INEs;
- seis tipos válidos e tipos inválidos;
- CBO/equipes válidos e inválidos;
- chaves ausentes;
- duplicatas de evento;
- joins 1:1 e casos que violam cardinalidade.

## Métricas

| Métrica | Como medir |
|---|---|
| runtime | relógio monotônico, warmup separado |
| peak memory | RSS/peak do processo |
| read volume | bytes e colunas projetadas dos Parquets |
| write volume | bytes e linhas do resultado |
| rows | entrada, após cada filtro e saída |
| join cardinality | linhas antes/depois e multiplicador |
| materializações | contagem de `collect`/writes intermediários |

Repetir pelo menos cinco vezes e reportar mediana e dispersão. Fixar versões de Python, Polars e hardware.

## Comparações

1. baseline eager compatível com o fluxo atual;
2. `scan_parquet` + projeção/predicate pushdown;
3. filtro antes de join;
4. normalização compartilhada materializada uma vez versus repetição por indicador;
5. execução completa versus partição INE + competência.

## Gate de otimização

Uma mudança de performance só deve entrar quando:

- mantém equivalência nos golden tests;
- não altera semântica de zero/no-data;
- não multiplica linhas em joins;
- melhora runtime ou memória em escala relevante;
- permanece simples para instalação municipal local.

## Local limit e distribuição

`LOCAL_LIMIT` ainda não foi medido. Portanto:

- Polars deve permanecer;
- pushdown, pruning e menos materializações vêm primeiro;
- paralelismo local só depois de datasets compartilhados e medição de contenção de I/O;
- arquitetura distribuída: `NOT_YET_JUSTIFIED`.

