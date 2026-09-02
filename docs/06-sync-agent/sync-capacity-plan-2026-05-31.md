# Plano de Capacidade do Sync Distribuido

## Premissas

- Municipio base: Barra do Choca/BA, cerca de 32 mil habitantes.
- Meta minima: 5 municipios simultaneos.
- Meta inicial desejada: 10 municipios.
- Quatro municipios podem ser 2x a 5x maiores que Barra do Choca.
- Valores sao estimativas operacionais e devem ser recalibrados com metricas reais de rows/s, MB/s, latencia e lag por tabela.

## Carga relativa

| Cenario | Formula | Carga estimada |
|---|---|---:|
| 1 cidade base | `1 x base` | 1x |
| 5 cidades minimas com 4 maiores | `1x + 4*(2x a 5x)` | 9x a 21x |
| 10 cidades misturadas | mistura conservadora | 20x a 40x |

## Evidencia runtime atual

O `/readyz` de 2026-06-02 reportou exemplos de volume ja sincronizado:

- `tb_fat_visita_domiciliar`: 2.422.093 linhas;
- `tb_fat_proced_atend`: 827.362 linhas;
- `tb_fat_atd_ind_procedimentos`: 577.151 linhas;
- `tb_fat_atd_ind_problemas`: 578.286 linhas;
- `tb_fat_atendimento_individual`: 512.023 linhas;
- `tb_fat_cad_domiciliar`: 722.770 linhas.

## Capacidade atual do receiver

| Parametro | Valor atual |
|---|---:|
| `INGEST_MAX_RECORDS_PER_CHUNK` | 5.000 |
| `INGEST_MAX_COMPRESSED_BYTES` | 10 MB |
| `INGEST_MAX_UNCOMPRESSED_BYTES` | 50 MB |
| `INGEST_MAX_CONCURRENT_REQUESTS` | 64 |
| `INGEST_MAX_CONCURRENT_CHUNKS_PER_AGENT` | 4 |
| `INGEST_POSTGRES_POOL_MAX` | 20 |
| `INGEST_DEFAULT_RECOMMENDED_BATCH_SIZE` | 1.000 |

## Politica de chunk

| Tabela | Volume | Chunk inicial | Observacao |
|---|---|---:|---|
| Dimensoes pequenas | < 10k | chunk unico ou 1k | full refresh/upsert |
| Fatos medios | 10k a 250k | 5k | manter latencia baixa |
| Fatos grandes | 250k a 2M+ | 5k atual; alvo 10k a 50k apos benchmark | respeitar limites de payload |
| Backfill inicial | alto | 5k com `AGENT_MAX_BATCHES_PER_TABLE` | evitar saturar PEC e Postgres |

## Recomendacao operacional

1. Manter `INGEST_MAX_RECORDS_PER_CHUNK=5000` ate medir latencia real por tabela.
2. Escalar normalizers horizontalmente antes de aumentar muito o chunk.
3. Usar Postgres inbox como fonte de verdade; Redis deve ser acelerador.
4. Controlar concorrencia por agente para evitar que um municipio grande consuma todo o receiver.
5. Priorizar tabelas criticas de ACS/CVAT/Qualidade antes de opcionais.

## SLO inicial proposto

| Sinal | Alvo inicial |
|---|---|
| Heartbeat agente | a cada 60s |
| Source-health | a cada 300s |
| Lag dimensoes criticas | < 24h |
| Lag fatos criticos | < 6h em operacao normal |
| ACK receiver | p95 < 5s para chunk de 5k linhas |
| DLQ | 0 em operacao normal |
| Pending queue | deve drenar automaticamente; alerta se > 0 por 15min |

## Escala para 10 municipios

- Receiver Rust: iniciar com 2 vCPU/2GB como compose atual e observar `ingest_operation_latency_ms`.
- Normalizer: 2 vCPU/2GB, multiplas replicas se backlog crescer.
- Postgres: garantir indices em `sync_chunks(status, received_at)`, `sync_pending_queue(status,next_retry_at)` e chaves de destino.
- Redis: consumer group `sync-normalizers`, sem dependencia exclusiva para durabilidade.

## Riscos

- Fatos de visita domiciliar dominam volume e devem ter checkpoint/chunk conservador.
- Municipios 5x maiores podem exigir janela temporal/PK range mais agressiva.
- Tabelas opcionais com `lastSyncedAt=null` nao devem bloquear o perfil `all`, mas podem bloquear futuros indicadores se virarem obrigatorias.
- Se o agente continuar `Running` sem heartbeat, capacidade nao importa: a primeira correcao e conectividade operacional.

