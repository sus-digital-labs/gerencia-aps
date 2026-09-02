# Homologação real Multi-Cell â€” 2026-08-14

**Status da execução:** encerrada com evidências parciais reais e com bloqueios explícitos.
**Classificação permitida:** `HOMOLOGATION_MULTI_CELL_PARTIAL_BLOCKED`.
**Classificações expressamente não atribuídas:** `HOMOLOGADO_MULTI_CELL_REAL` e qualquer equivalência de aprovação de produção.

> Esta execução utilizou exclusivamente dados marcados como `SYNTHETIC_HOMOLOGATION_DATA`, recursos Docker descartáveis e conexões locais de loopback. Não foram usados dados de produção, credenciais de produção ou qualquer serviço externo.

## 1. Escopo, baseline e decisão de execução

A homologação começou a partir do baseline integrado `main@49c13ad853d3eed8f107e9111afe6533641f6c06`. Durante a execução, PostgreSQL real reproduziu um defeito na função `sus_analytics_control.assign_municipality_v1`: a agregação de `assignment_version` era ambígua por colidir com o nome da coluna de saída da função. A primeira correção qualificou a coluna, e a execução real revelou o alias de tabela ausente. Ambas as condições foram corrigidas como um único changeset mínimo, protegido por teste de regressão, compilado, lintado e testado.

O `main` local foi promovido por fast-forward para `eb8f4cd29ffd49f9302d043381852f327e1a0999`, com o commit `fix(multicell): qualify assignment version aggregate`. **Nenhum push foi realizado.** O WIP de Billing e o worktree geocode não foram alterados.

| Item | Valor |
|---|---|
| Baseline inicial | `49c13ad853d3eed8f107e9111afe6533641f6c06` |
| SHA local final em `main` | `eb8f4cd29ffd49f9302d043381852f327e1a0999` |
| Correção integrada | Qualificação de `a.assignment_version` e alias `AS a` na função de assignment |
| Regressão adicionada | `assignment_migration_qualifies_output_column_to_avoid_plpgsql_ambiguity` |
| Push remoto | Não realizado |
| Billing | Preservado e fora do escopo |
| geocode worktree | Preservado e não tocado |

## 2. Topologia física descartável executada

A prova executada não reutilizou o mesmo PostgreSQL ou Redis entre as células. Foram criados três bancos PostgreSQL e dois Redis, cada Data Plane em rede Docker privada própria. O Control Plane teve banco dedicado e único; nenhum endpoint, referência de storage ou referência Redis do descriptor continha credencial.

| Componente | Recurso físico | Isolamento validado |
|---|---|---|
| Control Plane | `mc-e2e-control-pg`, PostgreSQL dedicado | Registry, policies, descriptors e assignments centralizados |
| CELL-001 PostgreSQL | `mc-e2e-cell001-pg` em `mc-e2e-cell001` | Não compartilhado com CELL-002 |
| CELL-001 Redis | `mc-e2e-cell001-redis` em `mc-e2e-cell001` | Não compartilhado com CELL-002 |
| CELL-002 PostgreSQL | `mc-e2e-cell002-pg` em `mc-e2e-cell002` | Não compartilhado com CELL-001 |
| CELL-002 Redis | `mc-e2e-cell002-redis` em `mc-e2e-cell002` | Não compartilhado com CELL-001 |
| Receiver A | Porta local `58081` | `DATABASE_URL` e Redis exclusivos de CELL-001 |
| Receiver B | Porta local `58082` | `DATABASE_URL` e Redis exclusivos de CELL-002 |

Todos os PostgreSQLs foram migrados pelo mesmo binário `dm-sync-ingest` construído do SHA corrigido. O Control Plane registrou CELL-001 e CELL-002 como `ACTIVE` e `HEALTHY`, ambas na política provisória `CAPACITY_NOT_YET_PROVEN`, com `max_municipalities=5` e `near_capacity_threshold=4`.

## 3. Evidências aprovadas

### 3.1 Control Plane, descriptors e idempotência

A carga sintética registrou dois descriptors sem segredos inline, dois tenants e duas assignments ativas. A execução repetida do mesmo provisionamento sintético retornou contagens estáveis: `cells=2`, `descriptors=2` e `active_assignments=2`. Isso comprova idempotência da carga de homologação no nível observado, sem duplicação de assignments.

| Gate observado | Resultado | Evidência objetiva |
|---|---:|---|
| Migration Control Plane em PostgreSQL limpo | PASS | `MULTICELL_MIGRATIONS_PASS` |
| Assignment sintética para CELL-001 | PASS | `tenant-A / municipality-A â†’ CELL-001` |
| Assignment sintética para CELL-002 | PASS | `tenant-B / municipality-B â†’ CELL-002` |
| Reexecução idempotente do provisionamento | PASS | `cells=2`, `descriptors=2`, `active_assignments=2` |
| Descriptor sem credencial inline | PASS | References lógicas e validação integrada do descriptor |
| Limite provisório de capacidade | PASS estrutural | Política `5/4` e motivo `CAPACITY_NOT_YET_PROVEN` preservados |

### 3.2 Ingestão real em dois Data Planes

Foram iniciadas duas instâncias reais do receiver, ambas com `AGENT_AUTH_DEV_MODE` limitado ao ambiente sintético, identidade distinta por célula, PostgreSQL e Redis independentes. Cada instância respondeu com health e readiness HTTP 200 após migration e Redis disponíveis.

Foi submetido um snapshot gzip sintético através do endpoint HTTP real em cada célula. O cliente de homologação respeitou o contrato de autenticação, `Content-Encoding: gzip`, headers de identidade, tabela canônica permitida, `chunk_index=1`, operação `snapshot` e cálculo canônico de `chunk_hash`.

| Fluxo | Resultado | Evidência |
|---|---:|---|
| Snapshot CELL-001 | PASS | HTTP 200, `status=accepted`, `records_received=1`, `queue_status=queued` |
| Snapshot CELL-002 | PASS | HTTP 200, `status=accepted`, `records_received=1`, `queue_status=queued` |
| Persistência A | PASS | `tenant-A`, `municipality-A`, `synthetic-chunk-CELL-001` em PostgreSQL A |
| Persistência B | PASS | `tenant-B`, `municipality-B`, `synthetic-chunk-CELL-002` em PostgreSQL B |
| Contaminação B em A | PASS negativo | `count=0` para `tenant-B` no PostgreSQL A |
| Contaminação A em B | PASS negativo | `count=0` para `tenant-A` no PostgreSQL B |
| Agent A para receiver B | PASS negativo | HTTP 401, `invalid_token` |
| Agent B para receiver A | PASS negativo | HTTP 401, `invalid_token` |

> O mesmo identificador sintético de delta foi usado nos dois fluxos. A evidência de isolamento foi a persistência física em bancos distintos, combinada com as negativas cross-cell e com a ausência de tenant cruzado em cada Data Plane.

### 3.3 Resolver BFF, pools bounded e escopo explícito

O `CellDataSourceResolver` integrado foi exercitado em um harness temporário contra pools `pg` reais, conectados aos PostgreSQLs físicos A e B. As assignments resolveram CELL-001 e CELL-002 para clientes distintos; cada pool leu exatamente um chunk no seu respectivo escopo. A segunda resolução de CELL-001 reutilizou o cliente cacheado. A resolução de `tenant-A / municipality-B` retornou `CELL_ASSIGNMENT_NOT_FOUND`, sem fallback.

| Gate BFF | Resultado | Evidência |
|---|---:|---|
| Resolver CELL-001 para pool A | PASS | `cellId=CELL-001`, `count=1` |
| Resolver CELL-002 para pool B | PASS | `cellId=CELL-002`, `count=1` |
| Cache por descriptor | PASS | `poolCreateCount=2` após três resoluções |
| Reuso CELL-001 | PASS | Segunda resolução sem criação de terceiro pool |
| Assignment inexistente | PASS negativo | `CELL_ASSIGNMENT_NOT_FOUND` |
| Escopo explícito transacional | PASS | `withCellReadScope` aplicado na leitura |

### 3.4 Falha localizada e recuperação

A interrupção controlada do Redis de CELL-002 tornou o `/readyz` de CELL-002 indisponível com HTTP 503, enquanto CELL-001 permaneceu HTTP 200. Após recriação exclusiva do Redis B na rede de CELL-002, a readiness de B retornou HTTP 200. O teste prova degradação localizada no componente Redis e ausência de impacto observável em CELL-001.

| Cenário | CELL-001 | CELL-002 | Resultado |
|---|---:|---:|---|
| Estado saudável | HTTP 200 | HTTP 200 | PASS |
| Redis B indisponível | HTTP 200 | HTTP 503 | PASS, isolamento confirmado |
| Redis B reconstruído | HTTP 200 | HTTP 200 | PASS, recuperação confirmada |

## 4. Backup bounded e restauração

Foi executado `pg_dump` bounded do PostgreSQL de CELL-002 e o dump foi restaurado em `data_plane_restore`, dentro do mesmo recurso descartável. A restauração preservou um chunk de inbox (`restored_chunks=1`) e 14 tabelas de `sus_analytics_ingest` com RLS habilitado (`rls_enabled_tables=14`).

Essa evidência prova recuperabilidade mínima de snapshot do Data Plane B. Não equivale a um plano de backup de produção, não mede RPO/RTO e não inclui backup do Redis, Control Plane ou artefatos do agente.

## 5. Gates de source e arquitetura

A correção do defeito de migration foi submetida aos gates Rust impactados. Os checks de TypeScript e arquitetura foram repetidos no worktree de homologação. O QA LGPD terminou sem finding real, mas com warnings preexistentes de fixtures e relatório gerado não versionado; o artefato de scanner foi restaurado antes do encerramento.

| Gate | Resultado |
|---|---:|
| `cargo fmt --check` receiver | PASS |
| `cargo check` receiver | PASS |
| `cargo clippy --all-targets --all-features -- -D warnings` receiver | PASS |
| `cargo test` receiver | PASS: 102 passed, 0 failed, 14 ignored |
| Regressão de migration | PASS: 1 passed |
| Build `pec-agent-sync` no SHA integrado | PASS |
| Testes TypeScript BFF e default scope | PASS: 5 testes no total |
| Guardrail de arquitetura | PASS: 47 checks, 0 falhas |
| QA LGPD | Sem finding real; 14 warnings preexistentes em fixtures/documentação |
| `git diff --check` do changeset corrigido | PASS |

## 6. Bloqueios e limites que impedem aprovação integral

A execução foi propositalmente classificada como bloqueada porque os seguintes critérios solicitados não foram provados em runtime end-to-end nesta sessão. Eles não devem ser interpretados como aprovados por inferência de testes unitários ou por build do binário.

| Critério pendente | Estado | Motivo objetivo |
|---|---|---|
| Tráfego produzido pelo binário `pec-agent-sync` | Não provado | O binário foi construído, mas os snapshots foram enviados por cliente sintético controlado para isolar o receiver e o Data Plane. |
| Normalizer e materializer reais por célula | Não provado | O inbox chegou a `queue_status=queued`; a drenagem até tabelas normalizadas/materializadas não foi executada. |
| Paridade de indicadores, regras clínicas e contagens finais | Não provada | Não houve execução do pipeline completo de normalização, materialização e regras sobre o mesmo dataset sintético. |
| Failover em nova instância com LKG persistido | Não provado | Foram exercitados validação de assignment e falhas de Redis; não houve reinício agent-to-agent com LKG restaurado. |
| `provision-cell CELL-002 --dry-run` no SHA corrigido | Não repetido nesta sessão | O gate foi aprovado antes da correção SQL; deve ser repetido em missão de fechamento se exigido como evidência contemporânea ao SHA final. |
| Capacity cap dinâmico de sexta assignment | Não repetido em PostgreSQL real | A política e os testes estruturais existem; a injeção dinâmica de seis municípios não foi executada nesta missão. |
| Contrato Edge LKG runtime | Não provado | O contrato foi compilado e testado anteriormente, mas não foi exercitado por processo de agente nesta topologia. |
| Observabilidade agregada por célula | Parcial | Health, readiness e métricas do receiver foram consultados; não houve Prometheus/Grafana ou alertas de produção. |
| Hardening operacional | Não provado | Não houve TLS, rotação de segredo, SLO, load test, RPO/RTO medidos ou política de backup completa. |

## 7. Cleanup e preservação de recursos externos

Todos os contêineres e redes nomeados da missão `multicell-real-20260814` foram removidos. As instâncias receiver vinculadas exclusivamente às portas locais `58081` e `58082` foram encerradas. O ambiente descartável, dumps e clientes temporários não fazem parte do checkout versionado.

| Recurso | Resultado |
|---|---:|
| `mc-e2e-control-pg` | Removido |
| `mc-e2e-cell001-pg` e `mc-e2e-cell001-redis` | Removidos |
| `mc-e2e-cell002-pg` e `mc-e2e-cell002-redis` | Removidos |
| Redes `mc-e2e-control`, `mc-e2e-cell001`, `mc-e2e-cell002` | Removidas |
| Processos receivers das portas de homologação | Encerrados |
| Worktree geocode externo | Preservado, não tocado |
| Branch Billing isolada | Preservada, não tocada |

## 8. Conclusão e próximos passos obrigatórios

A fundação Multi-Cell agora possui evidência real de que o Control Plane consegue manter dois Data Planes físicos independentes, que o mesmo receiver pode receber dados sintéticos por célula em PostgreSQL e Redis separados, que o resolver BFF pode mapear assignments a pools físicos distintos sem fallback e que uma falha de Redis em CELL-002 não derruba CELL-001. O defeito SQL encontrado durante a prova foi corrigido e integrado localmente com gates Rust completos.

A aprovação para produção permanece bloqueada, pois a prova completa ainda requer tráfego emitido pelo `pec-agent-sync`, processamento de fila por normalizer/materializer, paridade dos indicadores e regras, LKG em restart de agentes, capacidade dinâmica e hardening operacional.

1. Executar uma missão dedicada de E2E do `pec-agent-sync` com spool sintético, LKG e validação de restart.
2. Subir workers normalizer/materializer nas duas células e comparar indicadores, regras e contagens finais no mesmo input sintético canônico.
3. Executar o fechamento de capacidade, continuidade e segurança: sexta assignment, dry-run CELL-002 no SHA final, backup/restore completo, RPO/RTO, TLS, segredos e telemetria por célula.
