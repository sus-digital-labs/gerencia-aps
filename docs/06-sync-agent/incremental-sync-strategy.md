# Incremental Sync Strategy

## Bootstrap inicial

- varredura inicial controlada por tabelas prioritárias;
- checkpoints criados após lote confirmado.

## Tabelas prioritárias

- dimensões de município/unidade/equipe/profissional;
- fatos de atendimento e procedimentos necessários aos indicadores críticos;
- tabelas de suporte para filtro territorial (CNES/INE/município).

## Checkpoints

- cursor por tabela + metadados de faixa processada;
- replay seguro com idempotência.

## Estratégia incremental

- preferir `dt_atualizado` e/ou `co_seq` quando disponíveis;
- fallback por hash incremental quando não houver coluna temporal/confiável.

## Batch size

- lotes pequenos e ajustáveis por instalação;
- limite por tabela conforme custo de query.

## Throttling e backpressure

- limite de concorrência de queries;
- pausa adaptativa quando latência/erro crescer.

## Retry

- retry com backoff exponencial e jitter;
- envelope idempotente por lote.

## Deduplicação

- chave técnica por registro/lote;
- descarte de repetidos no consumidor.

## Idempotência

- ack do servidor por lote + replay seguro;
- aplicação no destino sem duplicar efeito.
