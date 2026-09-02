# Módulo territorial e remapeamento municipal — relatório técnico

**Projeto:** e-SUS APS 360
**Branch:** `feat/territory-map-remapping-complete`
**Data da validação:** 15 de agosto de 2026
**Autor:** Equipe do projeto

## Sumário executivo

Foi concluída a implementação local do módulo territorial para remapeamento municipal de microáreas. O desenho mantém o **Rust como autoridade exclusiva do domínio pesado**, enquanto TypeScript permanece restrito ao transporte BFF, à derivação de identidade a partir da sessão e à exposição tRPC. O read model territorial utiliza snapshots imutáveis e separa município, microárea, domicílio, qualidade e plano de remapeamento.

O smoke end-to-end foi executado contra uma réplica Rust real conectada a PostgreSQL descartável. O fluxo validado cobriu viewport, qualidade, isolamento cross-tenant e o workflow governado `draft → simulate → validate → approve → publish`. O ambiente permaneceu em `dry_run`, sem chamadas externas e sem escrita nas tabelas do e-SUS PEC.

A causa raiz do primeiro `503` do viewport foi identificada: as colunas geográficas da migration são `NUMERIC`, enquanto o mapeamento Rust esperava `f64` diretamente. A correção aplica casts explícitos para `double precision` nos selects e filtros geográficos. Após a correção, o smoke retornou código de saída zero.

> O resultado comprovado é **implementação local em dry-run com mapa e remapeamento Rust-owned**. Isso não equivale a produção municipal, pois RLS, retenção/crypto-shredding operacional, observabilidade de produção e importação real do PEC continuam fora do escopo comprovado.

## Arquitetura entregue

| Camada | Responsabilidade | Regra de autoridade |
|---|---|---|
| Rust `b360-rules` | Read model territorial, viewport, qualidade, simulação, validação, aprovação e publicação | Única autoridade de domínio pesado |
| Runtime Axum | Endpoints HTTP `/v1/territory/*`, autenticação HMAC e replay store | Execução distribuída entre réplicas |
| BFF TypeScript | Canonização HMAC, nonce, timeout, normalização de payload e transporte | Sem regra de negócio territorial |
| tRPC | RBAC fail-closed e identidade derivada da sessão | Tenant e município não vêm do navegador |
| React + Leaflet | Renderização de microáreas, domicílios e workflow | Não calcula nem publica domínio |
| PostgreSQL | Snapshots imutáveis, read model, planos e replay compartilhado | Escopo da validação foi banco descartável |

A migration `0032_territory_map_remapping` cria as entidades `territory_map_snapshot`, `territory_map_microarea`, `territory_map_domicile`, `territory_map_quality_issue`, `territory_remap_plan`, `territory_remap_change` e `territory_remap_publication`. A consulta de viewport retorna microáreas e domicílios com estado de coordenada, fonte, quantidade de cidadãos e distinção visual entre pontos conhecidos e pendentes.

## Capacidades funcionais

O mapa municipal suporta filtragem por município, snapshot, microárea e viewport geográfico. Domicílios com coordenadas conhecidas são diferenciados dos pendentes; os pendentes permanecem visíveis quando solicitado, mas não são tratados como geocodificados. A resposta inclui contagens de cidadãos e domicílios para apoiar a leitura operacional do agente e do gestor.

A qualidade territorial é exposta separadamente e suporta ocorrências como `COORDINATE_PENDING`. O fluxo de remapeamento exige criação de plano, simulação, validação, aprovação e publicação. A publicação é protegida por revisão e aprovação financeira explícita, além das transições de estado no Rust.

A geocodificação externa continua **opcional, controlada e desabilitada por padrão**. O ciclo validado usa `GEOCODE_EXTERNAL_PROVIDER_ENABLED=false`, `RUNTIME_MODE=dry_run` e `external_calls=0`. Não houve escrita nas tabelas do PEC.

## Diagnóstico e correção do smoke

A primeira execução do smoke falhou em `viewport status=503`. O logging técnico do storage foi utilizado sem registrar PII. A evidência do runtime apontou a incompatibilidade de tipo entre `NUMERIC` no PostgreSQL e `Option<f64>` no `sqlx`. A correção foi aplicada em `territory_map.rs` com casts explícitos de latitude, longitude e centros de microárea para `double precision`, além de casts nos filtros opcionais do viewport.

A nova réplica foi reconstruída, iniciada na porta local `18084` e validada em `/readyz` com HTTP 200. O smoke final passou pelos quatro grupos funcionais: viewport, qualidade, isolamento cross-tenant e workflow completo de remapeamento.

## Gates executados

| Gate | Evidência | Resultado |
|---|---|---:|
| `cargo fmt --all -- --check` | Formatação Rust do workspace territorial | PASS |
| `cargo clippy --offline --lib --tests --bin territory-geocode-runtime -- -D warnings` | Clippy sem warnings permitidos | PASS |
| `cargo test --offline --all-targets --jobs 2` | Todos os alvos Rust; biblioteca reportou 236 testes unitários e alvos auxiliares aprovados | PASS |
| `pnpm --dir Apps/web check` | TypeScript sem erros, incluindo o smoke assíncrono | PASS |
| `pnpm --dir Apps/web run check:canonical` | 422 arquivos verificados; autoridade de geocodificação permanece no Rust | PASS |
| `pnpm --dir Apps/web run style:check` | 295 arquivos; zero valores arbitrários, estilos inline ou cores literais proibidas | PASS |
| `pnpm lint` | Lint do repositório | PASS |
| Vitest | Suíte executada com um worker | PASS |
| `pnpm build:web` | Build web de produção concluído | PASS |
| `git diff --check` | Sem erro de whitespace | PASS |
| Anti-segredo e anti-PII | Arquivos alterados sem chaves privadas, tokens conhecidos ou PII sintético | PASS |
| Smoke Rust territorial | Réplica local, PostgreSQL descartável, dry-run e external calls zero | PASS |

## Segurança, LGPD e distribuição

Endereços permanecem protegidos pelo mecanismo de criptografia previsto no domínio, com fingerprint HMAC por tenant e sem PII em logs. O replay store compartilhado usa PostgreSQL com TTL para nonce entre réplicas. A concorrência distribuída usa `SKIP LOCKED` no caminho de processamento já validado nas fases anteriores. A identidade de tenant e município é derivada da sessão no BFF/tRPC, e o RBAC é fail-closed.

As migrations estão apenas versionadas no worktree. A aplicação observada ocorreu exclusivamente no PostgreSQL descartável `territory-geocode-pg`, na porta local `55432`; não foi aplicada migration em ambiente compartilhado. Qualquer promoção exige revisão de schema, backup, janela de migração, autorização e plano de rollback.

## Riscos e limitações residuais

A implementação não comprova RLS ou mecanismo equivalente no PostgreSQL compartilhado. Também não comprova retenção e crypto-shredding ponta a ponta em ambiente operacional, dashboards e alertas de produção, SLOs, métricas em formato delta ou importação real do banco PEC. O snapshot usado no smoke é sintético e não representa dados municipais reais.

A alteração de layout da tela substituiu valores arbitrários por tokens do design system (`max-w-screen-2xl`, `grid-cols-3`, `h-screen` e `tracking-wider`). Em uma revisão visual posterior, recomenda-se validar a experiência em resoluções de painel distintas, sem transformar essa validação em regra de domínio.

## Rollback

O rollback de schema está versionado em `Apps/rules/b360-rules/migrations/0032_territory_map_remapping.down.sql`. Ele não deve ser executado automaticamente. Em ambiente autorizado, a reversão deve ocorrer somente após congelamento de publicação, backup, confirmação de inexistência de dependências ativas e aprovação operacional do município.

## Status honesto

No momento desta atualização, todos os gates técnicos e o smoke local estão aprovados. A promoção do status para `IMPLEMENTED_LOCAL_DRY_RUN_RUST_MAP_REMAPPING` permanece condicionada à criação e publicação do commit desta branch. Até essa publicação, o status conservador é `IMPLEMENTED_LOCAL_DRY_RUN_RUST_RUNTIME_ACTIVATED`.

## Referências internas

[1]: `Apps/rules/b360-rules/src/territory_map.rs` — domínio, persistência e casts geográficos do read model.
[2]: `Apps/rules/b360-rules/src/territory_map_http.rs` — handlers Axum e tratamento técnico de erros.
[3]: `Apps/rules/b360-rules/src/bin/territory-geocode-runtime.rs` — runtime e rotas territoriais.
[4]: `Apps/web/server/territory/territoryMapRuntime.smoke.ts` — smoke end-to-end do runtime.
[5]: `Apps/web/server/territory/territoryMapBffRuntime.ts` — BFF transport-only.
[6]: `Apps/web/server/territory/territoryMapTrpcRouter.ts` — tRPC, sessão e RBAC.
[7]: `Apps/web/client/src/pages/TerritoryMapRemappingComplete.tsx` — mapa e workflow de remapeamento.
[8]: `Apps/rules/b360-rules/migrations/0032_territory_map_remapping.up.sql` — schema territorial aditivo.
[9]: `Apps/rules/b360-rules/migrations/0032_territory_map_remapping.down.sql` — rollback versionado.
