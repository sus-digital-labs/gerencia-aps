# e-SUS APS 360 — Hardening do módulo territorial

**Data:** 15 de agosto de 2026
**Branch:** `feat/territory-map-remapping-release-hardening`
**Base canonica reconciliada via Git:** `fb7b18bd68c0f016a2e6e0239f32ee90a207948b`

A reconciliacao foi executada sem assumir nenhuma variante documental. Apos `git fetch --all --prune`, as entradas `fb7b18bd68c0f016a2e6e0239f32ee90a207948` e `fb7b18bd68c0f016a2e6e0239f32ee90a207948b` foram submetidas a `git rev-parse --verify "<entrada>^{commit}"`; ambas resolveram para o mesmo commit completo `fb7b18bd68c0f016a2e6e0239f32ee90a207948b`. Portanto, a variante sem o ultimo `b` e apenas um prefixo abreviado valido do mesmo objeto Git, nao uma base distinta. A branch publicada contem esse commit como ancestral. O proximo ciclo deve repetir essa verificacao no remoto antes de usar qualquer SHA documental.
**Escopo:** read model territorial, importacao PEC read-only, mapa de microareas, workflow de remapeamento e autoridade Rust.

> **Status honesto:** o ciclo fecha os gates técnicos executados em ambiente local descartável e autorizado para teste, mas **não autoriza promoção para produção**. Retenção operacional, crypto-shredding, proteção de baixa cardinalidade, benchmark/SLOs e homologação formal de staging continuam bloqueadores.

## Resultado executivo

O importador PEC foi corrigido para executar a transação alvo dentro do contexto RLS de tenant e município, mantendo a fonte sem permissão de escrita. O fingerprint agora separa a identidade do registro fonte (`source_record_fingerprint`) da identidade semântica do endereço (`address_fingerprint`), com normalização determinística dos componentes de endereço e HMAC por tenant. O snapshot passou a carregar `source_watermark` e `source_snapshot_fingerprint`, e reexecuções com a mesma identidade lógica reutilizam o mesmo snapshot.

O store Rust mantém a autoridade exclusiva sobre o domínio pesado. O TypeScript continua limitado ao transporte BFF, assinatura HMAC, normalização de payloads e integração tRPC. A migration 0033 habilita RLS forçado nas sete tabelas territoriais, políticas de isolamento por tenant e município, índice de snapshot ativo único e índice de identidade de importação.

## Evidências executadas

| Gate ou evidência | Resultado | Observação |
|---|---:|---|
| Role PEC read-only | PASS | `territory_read_only`; `USAGE=true`, `CREATE/INSERT/UPDATE/DELETE/TRUNCATE=false` |
| Testes negativos de escrita PEC | PASS 6/6 | INSERT, UPDATE, DELETE, TRUNCATE, CREATE TABLE e ALTER TABLE negados |
| RLS cross-tenant/cross-município | PASS 5/5 | Leituras fora do escopo retornam vazio e escritas são negadas |
| `cargo fmt --check` | PASS | Executado após o patch final |
| `cargo clippy -D warnings` | PASS | Sem warnings no crate e binário territorial |
| `cargo test --all-targets` | PASS | Suíte Rust concluída com `TEST_EXIT=0` |
| TypeScript check | PASS | `tsc --noEmit` concluído sem erros |
| Canonicalidade web | PASS | 424 arquivos verificados; autoridade Rust preservada |
| Style check | PASS | Sem inline styles, cores hardcoded ou dívida bloqueante reportada |
| Vitest | PASS | Suíte web executada com um worker |
| Build web | PASS | Build de produção concluído; apenas aviso de chunk grande |
| Smoke de importação | PASS | `external_calls=0`, `pec_write=false`, sem PII nominal |
| Idempotência de importação | PASS | Segunda chamada retornou o mesmo snapshot; 1 snapshot, 1 ativo, 1 fingerprint lógico |
| Fingerprint de registros | PASS estrutural/runtime | Novos domicílios gravam `source_record_fingerprint` e `address_fingerprint` separados |
| Smoke mapa/workflow | PASS | Viewport, qualidade, isolamento, simulate, validate, approve e publish |
| Smoke readiness | PASS | Duas publicações, rollback preservando histórico e métricas em delta |
| Smoke cross-tenant | PASS | Tenant e município incorretos rejeitados pelo Rust |
| `external_calls` | PASS | Zero nos smokes executados |
| Escrita PEC | PASS | Zero nos smokes e role técnica sem privilégios de escrita |

## Alterações implementadas

### Importador Rust

A função `scoped_target_transaction` abre a transação alvo e define `app.tenant_id` e `app.municipality_id` com `set_config(..., true)`. A mesma transação adquire advisory lock por escopo, evitando importações concorrentes para a mesma combinação lógica.

A consulta PEC continua limitada às tabelas de leitura e incorpora somente os campos necessários ao read model: identificador técnico do domicílio, microárea, coordenadas, família, contagem de cidadãos e componentes de endereço. O endereço não é persistido em claro no read model; seus componentes são normalizados e usados apenas para o HMAC de `address_fingerprint`.

O `source_record_fingerprint` usa o domínio `source-record-v1` e o identificador técnico da fonte. O `address_fingerprint` usa o domínio `address-v1` e os componentes normalizados de logradouro, número, complemento, bairro, município, UF e CEP. A separação evita que a alteração do endereço seja confundida com a alteração da identidade do registro fonte.

### Banco analítico

A migration 0033 adiciona contexto RLS, força RLS nas tabelas territoriais, cria políticas de escopo e adiciona as colunas de watermark, fingerprint do snapshot, versão de schema, versão do importador, data máxima da fonte e indicador de atividade. A coluna `source_record_fingerprint` foi adicionada ao domicílio para os novos imports; registros históricos anteriores ao hardening podem permanecer nulos até existir uma rotina de backfill autorizada.

### Runtime e BFF

O runtime Rust foi executado na porta local `18088` com `RUNTIME_MODE=dry_run`, provider externo desabilitado, `PEC_WRITE_ALLOWED=false` e role PEC read-only. O BFF assinou requests com a canonização HMAC definida no contrato e não implementou fallback TypeScript para falhas da autoridade Rust.

## Limitações e bloqueadores de promoção

| Critério | Situação | Ação necessária |
|---|---|---|
| Proteção de baixa cardinalidade | BLOQUEADO | Implementar clustering/supressão e k-anonymity configurável antes de expor mapas públicos |
| Retenção operacional | BLOQUEADO | Implementar worker Rust com lease, estados, legal hold, auditoria e idempotência |
| Crypto-shredding | BLOQUEADO | Implementar chave por tenant/endereço, destruição controlada e smoke de falha de decriptação |
| Dashboards e alertas | BLOQUEADO | Criar painéis, alertas e runbooks operacionais em ambiente autorizado |
| Benchmark e SLOs | BLOQUEADO | Medir latência, throughput, lock wait, custo e erro em dataset representativo |
| Backfill de fingerprints históricos | BLOQUEADO | Definir mudança aprovada e executar sem recuperar PII em claro |
| E2E multi-role completo | PARCIAL | Isolamento cross-tenant foi comprovado; gestor, coordenador, ACS e auditor ainda precisam de matriz formal |
| Migration homologada em staging | BLOQUEADO | Backup, change approval, janela, locks, duração e rollback devem ser registrados no ambiente autorizado |
| Produção | NÃO AUTORIZADA | Nenhuma migration ou merge em `main` neste ciclo |

## Critério de promoção

O status recomendado permanece:

> `IMPLEMENTED_LOCAL_AUTHORIZED_READ_ONLY_IMPORT_RUST_MAP_REMAPPING`

A promoção para `IMPLEMENTED_STAGING_AUTHORIZED_READ_ONLY_RUST_MAP_REMAPPING_HARDENED` exige evidência runtime de todos os bloqueadores acima. O fato de os gates locais terem passado não substitui change approval, staging autorizado, benchmark real ou validação LGPD formal.

## Rollback operacional local

O banco descartável recebeu backups custom-format antes das tentativas das migrations locais 0004 e 0006. A tentativa parcial de 0004 foi restaurada com `pg_restore --clean --if-exists`; a migration foi reaplicada somente após criar a precondição sintética `municipios(id)` no banco local. Nenhuma dessas ações representa autorização para aplicar a migration em produção.

O rollback do domínio territorial foi reproduzido pelo smoke de readiness. As publicações permaneceram no histórico append-only, a publicação de rollback apontou para a publicação anterior e o contador `territory_remap_rollbacks_total` aumentou exatamente em um.

## Referências internas

[1]: `Apps/rules/b360-rules/src/territory_import.rs` — importador PEC read-only e fingerprints.
[2]: `Apps/rules/b360-rules/src/territory_map.rs` — store Rust do mapa e workflow.
[3]: `Apps/rules/b360-rules/migrations/0033_territory_release_hardening.up.sql` — RLS, snapshot ativo e identidade de importação.
[4]: `Apps/web/server/territory/territoryImport.smoke.ts` — smoke read-only.
[5]: `Apps/web/server/territory/territoryMapRuntime.smoke.ts` — viewport, qualidade e workflow.
[6]: `Apps/web/server/territory/territoryMapReadiness.smoke.ts` — métricas delta, publicações e rollback.
[7]: `Apps/web/server/territory/crossTenantIsolation.smoke.ts` — isolamento de jobs por tenant e município.
