# Current State - Painel e-SUS APS

Snapshot: `upstream/main@d21fe44562fd73c4ae46261a40496079b6e94f15`.

## Fluxo comprovado por código

```text
PEC/PostgreSQL
  -> AbstractGenerateBase + repositórios de extração
  -> dados/input/*.parquet
  -> scripts Polars por tema
  -> dados/output/*.parquet
  -> consultas DuckDB read_parquet(...)
  -> repositories/use cases/controllers
  -> Flask /v1/*
  -> React paineis-v2-front
```

Evidências principais:

- `src/infra/create_base/polars/abstract_generate_base.py`: extrai SQL em chunks de Pandas/Fastparquet e usa `cwd/dados/input`.
- `src/presentations/controllers/create_bases/create_base_controller.py`: recria `dados/`, agenda 16 bases de entrada e depois seis bases temáticas.
- `src/presentations/controllers/create_bases/rich_progess.py`: executa os jobs sequencialmente, apesar da separação em dois grupos.
- `src/infra/create_base/polars/scripts_dados/indicadores_*_polars.py`: calcula as bases derivadas.
- `src/infra/db/settings/connection_duckdb.py`: abre uma conexão DuckDB em memória por consulta.
- `src/main/server/server.py`: expõe blueprints Flask e serve os arquivos estáticos do frontend.
- `paineis-v2-front/src/services/api.ts`: consome `/v1/` via Axios.

## Estado operacional observado

- Reprocessamento: completo; `dados/` é removido e recriado quando `GENERATE_BASE=True`.
- Agendamento: diário por padrão ou semanal por configuração.
- Paralelismo: não há paralelismo efetivo no gerador; os loops são sequenciais.
- Cache: cache HTTP/Flask de 24 horas em várias rotas; não é cache de cálculo por fingerprint.
- Incrementalidade: não identificada.
- Observabilidade: logs e duração por job; sem métricas estruturadas de linhas, bytes, memória ou cardinalidade.
- Paths e período: dependem de `os.getcwd()` e `date.today()/datetime.today()`.
- Polars: uso misto de `scan_parquet`, `read_parquet`, `LazyFrame.collect()` e materializações.

## Inventário das bases temáticas

| Indicador/base | Inputs principais | Transformações compartilhadas | Saída | Materialização | Testes observados |
|---|---|---|---|---|---|
| Cadastro | pessoas vinculadas, vacinação, procedimentos, atendimento individual/odonto, consumo alimentar, atividade coletiva, cadastro individual, equipe, unidade, raça/cor, visita | datas, pessoa, equipe/unidade, raça/cor, eventos, deduplicação | `cadastro_db.parquet` | LazyFrame + `sink_parquet` | wrapper que exige dados externos |
| Crianças | pessoas, cadastro, atendimento individual/odonto, visita, consumo alimentar, raça/cor, equipe, unidade, CBO | pessoa, datas/idade, CBO, equipe/unidade, joins e `unique` | `crianca.parquet` | helper aceita eager/lazy e escreve Parquet | wrapper que exige dados externos |
| Diabetes | pessoas, cadastro, atendimento individual, CID/CIAP explodido, procedimentos, odonto, atividade coletiva, visita, equipe, unidade, raça/cor, CBO | pessoa, datas, CBO, equipe/unidade, eventos e agravos | `diabetes.parquet` | helper aceita eager/lazy | wrapper que exige dados externos |
| Hipertensão | pessoas, cadastro, atendimento individual, CID/CIAP explodido, odonto, visita, procedimentos, atividade coletiva, equipe, unidade, raça/cor, CBO | quase o mesmo conjunto de Diabetes | `hipertensao.parquet` | helper aceita eager/lazy | não foi encontrado teste do repositório temático |
| Idosos | pessoas, cadastro, atendimento individual/odonto, CID/CIAP, visita, procedimentos, vacinação, IVCF, equipe, unidade, raça/cor, CBO | pessoa, datas/idade, CBO, equipe/unidade, eventos | `idoso.parquet` | helper aceita eager/lazy | wrapper que exige dados externos |
| Saúde bucal | pessoas, cadastro, atendimento odontológico, equipe, unidade, raça/cor, CBO | pessoa, datas, CBO, equipe/unidade e deduplicação | `saude_bucal.parquet` | helper aceita eager/lazy | wrapper que exige dados externos |

Os testes temáticos encontrados chamam `create_base()` sobre o filesystem e não fornecem golden fixtures sintéticas nem expected values independentes. Isso os caracteriza como smoke/integration wrappers dependentes do ambiente, não como testes metodológicos.

## Shared Transformation Matrix

| Transformação | Cadastro | Crianças | Diabetes | HTN | Idoso | Bucal | Reuso justificável |
|---|---:|---:|---:|---:|---:|---:|---|
| resolver `cwd/dados/{input,output}` | X | X | X | X | X | X | sim, configuração de paths/contexto |
| leitura Parquet com projeção | X | X | X | X | X | X | sim, contrato pequeno de dataset |
| parse `co_dim_tempo` `%Y%m%d` | X | X | X | X | X | X | sim, normalização temporal |
| `today()` e janelas móveis | X | X | X | X | X | X | sim, substituir por período explícito |
| pessoa + cadastro individual | X | X | X | X | X | X | sim, após validar cardinalidade |
| equipe + unidade + INE/CNES | X | X | X | X | X | X | sim, após definir chaves e unicidade |
| CBO | - | X | X | X | X | X | sim, vocabulário e lookup versionados |
| raça/cor | X | X | X | X | X | X | sim, normalização compartilhada |
| atendimento individual | X | X | X | X | X | - | sim, primeira base normalizada candidata |
| `unique` pós-join | X | X | X | X | X | X | não como utilitário genérico; exige contrato de cardinalidade |
| helper `ler_dados_raw/escrever_dados_raw` | - | X | X | X | X | X | sim, mas deve ser consolidado sem copiar arquivos inteiros |

## Oportunidades de dados compartilhados

Prioridade sugerida:

1. `NormalizedEncounters`: somente após incluir e validar tipo de demanda, INE/CNES, CBO e identificador profissional necessário.
2. `NormalizedTeams`: INE, CNES, tipo de equipe, vigência e chave estável.
3. `NormalizedPeople`: apenas o identificador técnico e atributos estritamente necessários; sem PII nos resultados.

`NormalizedVisits`, `NormalizedProcedures` e `NormalizedVaccinations` têm mais de dois consumidores, mas devem esperar a primeira extração compartilhada comprovar o padrão.

## Riscos técnicos

- Exclusões de duplicados podem ocultar multiplicação de linhas sem declarar cardinalidade esperada.
- `today()` torna o mesmo snapshot não reprodutível em datas diferentes.
- exceções são registradas e absorvidas por vários repositórios; o job pode avançar sem resultado válido.
- recriação destrutiva de `dados/` impede reuso incremental e dificulta benchmark isolado.
- bases temáticas largas podem carregar PII operacional; novos resultados agregados não devem propagá-la.
- a versão metodológica não aparece no contrato de saída.

