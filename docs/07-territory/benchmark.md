# Benchmark territorial

## Estado atual

A medição anterior executou vinte repetições em PostgreSQL descartável com quatro domicílios. O p95 observado foi 0,206 ms para viewport e 0,148 ms para claim de retenção. Esses valores são **runtime/external-compose de regressão**, não SLO nem capacidade municipal.

## Metodologia obrigatória para staging

Executar três séries independentes por cenário, com datasets sanitizados: pequeno, município representativo, maior município autorizado e cenário sintético equivalente a três vezes o maior autorizado. Se não houver dataset municipal autorizado, registrar explicitamente `SYNTHETIC_EQUIVALENT_NOT_REAL_MUNICIPAL_BENCHMARK`.

Cada dataset deve ser medido com cache frio e quente, concorrência 1, 10, 25 e 50 quando seguro. As operações são viewport, filtro, qualidade, importação, simulação, publicação, rollback, retention claim e fingerprint backfill. Registrar p50, p95, p99, throughput, CPU, memória, payload, conexões, locks, plano, rows, buffers, tempo de banco e tempo total.

## Query plans já observados

As queries locais utilizaram os índices territoriais de viewport e retenção. A fixture é pequena e não suporta extrapolação. O próximo ciclo deve salvar `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` sem dados nominais.

## SLO

Até que o benchmark representativo seja executado e aprovado, o estado é **SLO_PROPOSED_NOT_APPROVED**. Não publicar limites numéricos de produção com base na fixture de quatro domicílios.
