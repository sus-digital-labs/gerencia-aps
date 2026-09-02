# Ativação local do runtime Rust de geocodificação territorial

**Data:** 15 de agosto de 2026. **Status da implementação:** `IMPLEMENTED_LOCAL_DRY_RUN_RUST_RUNTIME_ACTIVATED`. **Modo de execução:** `dry_run`. **Fornecedor externo:** desabilitado. **Escrita no PEC:** proibida. **Migration compartilhada:** não aplicada. **Prontidão para produção:** bloqueada.

## 1. Baseline, branch e proveniência

A ativação partiu da baseline auditada `1039adaf8a6986dc7124f0bdcc7109aa0110a67e`, publicada anteriormente na linha de autoridade Rust. O trabalho foi realizado no worktree isolado `D:\dm-hub\.worktrees\esus-aps-360\20260815-geocode-runtime\implementation`, sem alteração do checkout principal.

As conclusões foram classificadas por proveniência. **Source** corresponde aos arquivos Rust, BFF, migration, testes, scripts e documentação versionados. **Runtime** corresponde ao processo `territory-geocode-runtime.exe`, ao BFF TypeScript executado com o runner existente, ao PostgreSQL descartável, ao worker Rust, às rotas de health/readiness/metrics e ao smoke end-to-end. **External-compose** corresponde exclusivamente ao container PostgreSQL temporário exposto em `127.0.0.1:55432`; não houve conexão ao PEC, banco compartilhado ou fornecedor externo.

## 2. Arquitetura efetivamente ativada

O fluxo comprovado foi:

```text
BFF TypeScript
  → HTTP interno autenticado por token + HMAC + timestamp + nonce
  → runtime Rust/Axum em 127.0.0.1:18082
  → PostgreSQL 16 descartável
  → worker DryRunWorker Rust
  → persistência governada, auditoria e consulta de status
```

O BFF executa somente autenticação de sessão, preservação de tenant/operador/município, construção superficial de payload, transporte, timeout, limite de payload, circuit breaker e mapeamento de erro. Normalização, fingerprint, criptografia, elegibilidade, orçamento, quota, leases, transições, retry, reconciliação e worker continuam no crate `b360-rules`.

O transporte inclui `x-service-token`, `x-service-timestamp`, `x-service-nonce`, `x-service-signature`, `x-body-sha256`, `x-request-id`, `x-correlation-id`, `x-operator-id`, `x-tenant-id` e `x-municipality-id`. A assinatura cobre método, caminho, timestamp, nonce, hash do corpo e identidade territorial. O segredo é fornecido por variável de ambiente em hexadecimal e não aparece no código versionado.

## 3. Migration e PostgreSQL isolado

A migration `0004_geocode_governance.sql` foi homologada em um PostgreSQL temporário e descartável. A migration incremental `0005_geocode_runtime_activation.sql` adiciona `geocode_job.execution_mode`, constraint para `dry_run|external` e índice de consulta por modo. Nenhuma dessas migrations foi aplicada em ambiente compartilhado.

O schema isolado foi recriado e a migration incremental aplicada com `ON_ERROR_STOP=1`. Foram verificados os vínculos necessários entre snapshot, prévia, itens, job e auditoria. A persistência do runtime insere apenas snapshot sintético, prévia sintética, itens artificiais e job `dry_run`; não grava endereço em claro, coordenada, cidadão, CPF, CNS ou nome.

## 4. Runtime, worker e semântica dry-run

O binário Rust expõe `/healthz`, `/readyz` e `/metrics`, valida configuração no startup, verifica conexão e schema PostgreSQL, inicia o worker dry-run e encerra com shutdown gracioso. O health observado foi `200`; readiness observada foi `200` com `database=true`, `schema=true`, `worker=true`, `execution_mode=dry_run`, `external_provider=disabled` e `pec_write=forbidden`.

O worker Rust processou dois itens sintéticos. A correção de domínio realizada durante a revisão liquida o custo reservado, remove lease, zera `budget_in_flight_minor`, incrementa `budget_consumed_minor` e fecha o job quando todos os itens são terminais. O resultado persistido foi `completed|dry_run|2|0`. O uso de `succeeded` no item não representa sucesso de fornecedor: o campo obrigatório `execution_mode=dry_run` e `external_calls=0` impedem essa interpretação.

A hidratação de prévia persistida foi adicionada para que uma nova instância do runtime possa reutilizar uma prévia idempotente após restart. O status do job é consultado diretamente no PostgreSQL e sobrevive ao reinício do processo.

## 5. Evidência runtime end-to-end

O smoke executado pelo BFF contra o processo Rust real comprovou, em uma única sequência, criação e reutilização de prévia, aprovação idempotente, execução do worker, polling de status e fechamento do job.

| Evidência | Resultado observado |
|---|---:|
| BFF chamou Rust real | `bffToRust=true` |
| Prévia idempotente | `idempotentPreflight=true` |
| Aprovação idempotente | `idempotentApproval=true` |
| Estado final | `completed` |
| Itens selecionados | `2` |
| Itens concluídos | `2` |
| Modo | `dry_run` |
| Chamadas externas | `externalCalls=0` |
| Health | HTTP `200` |
| Readiness | HTTP `200` |
| Assinatura ausente | HTTP `401` |
| Estado após restart | Smoke reproduzido com o mesmo job persistido |
| Porta após shutdown | `0` listeners |

Após o restart, o mesmo smoke reutilizou a prévia/job persistidos e retornou `completed`, demonstrando que o resultado não dependia somente do estado inicial do processo. O teste de assinatura ausente com payload estruturalmente válido retornou HTTP `401`. O circuito BFF foi testado com três falhas de transporte: a quarta tentativa foi bloqueada localmente como `RUST_CIRCUIT_OPEN`, sem fallback TypeScript.

## 6. Métricas, logs e LGPD

As métricas runtime incluem requisições, prévias, jobs, itens reclamados/concluídos, falhas de autenticação, erros Rust, `external_calls_total` e `dry_run_external_calls_total`. No smoke final, ambas as métricas de chamada externa permaneceram em zero. Os logs estruturados não registram endereço, nome, CPF, CNS, coordenada, token, JWT, cookie, chave HMAC, chave AES, connection string ou payload completo.

A implementação mantém AES-GCM para endereço cifrado, fingerprint HMAC por tenant e crypto-shredding no domínio. Evidência externa continua sendo `suggested`; nenhum resultado externo foi produzido neste ciclo.

## 7. Gates executados

| Gate | Resultado |
|---|---:|
| `cargo fmt --check` no crate canônico | Aprovado |
| `cargo clippy --offline --lib --tests --bin territory-geocode-runtime -- -D warnings` | Aprovado |
| `cargo test --offline --all-targets --jobs 2` | Aprovado; 236 testes, 0 falhas |
| Testes territoriais Rust | Aprovado; 8 testes, 0 falhas |
| Vitest completo | Aprovado; 22 arquivos, 132 testes |
| Typecheck | Aprovado |
| Build Vite | Aprovado; aviso não bloqueante de chunk maior que 500 kB |
| Lint monorepo | Aprovado |
| Style check | Aprovado; 294 arquivos |
| Canonical check | Aprovado; 411 arquivos |
| Contratos BFF runtime | Aprovado; 3 testes |
| Smoke BFF → Rust | Aprovado |
| Scan anti-segredo/PII | Aprovado sobre o staged diff final |
| `git diff --check` | Aprovado sobre o staged diff final |

O repositório contém crates Cargo independentes e não possui um `Cargo.toml` workspace na raiz `Apps/rules`; por isso, o gate equivalente foi executado no crate canônico `Apps/rules/b360-rules`, com `--all-targets`.

## 8. Limitações e riscos residuais

Esta é uma ativação local dry-run, não um rollout produtivo. O fornecedor externo permanece desabilitado, não há cofre real, não há credencial comercial, não há chamada faturável e a migration não foi aplicada em ambiente compartilhado. A fila runtime local mantém o agregado em memória e persiste transições no PostgreSQL; a integração completa de múltiplos processos concorrentes usando exclusivamente `PostgresGeocodeStore` ainda requer homologação específica antes de produção.

O circuito breaker foi implementado no transporte BFF e possui teste unitário; limiares e janela devem ser calibrados com o padrão de observabilidade do ambiente alvo. A assinatura HMAC possui timestamp e nonce em memória; para múltiplas réplicas, a prevenção de replay deve migrar para armazenamento compartilhado com TTL.

A ativação não autoriza geocodificação real, não confirma microárea/MICI/MICDT com evidência externa, não grava coordenadas e não toca no PEC. A produção permanece bloqueada até revisão DPO, cofre, fornecedor, RLS, concorrência, restart de leases em múltiplos processos e aprovação municipal.

## 9. Rollback

O rollback local consiste em parar o processo Rust, remover a feature de ativação do BFF, destruir o PostgreSQL descartável, remover os junctions locais de `node_modules`, preservar o commit versionado e manter `0004`/`0005` não aplicadas em ambientes compartilhados. O rollback não reativa `geocodeGovernance.ts` como autoridade nem altera o PEC.

## 10. Checklist de QA

| Verificação | Estado |
|---|---:|
| Nenhum fornecedor externo habilitado | Aprovado |
| Nenhuma escrita PEC | Aprovado |
| Migration compartilhada não aplicada | Aprovado |
| Segredos fora do Git | Aprovado |
| PII nominal ausente do diff/fixtures | Aprovado no staged final |
| Rust é a autoridade de domínio | Aprovado |
| Proibição de import legado | Aprovado |
| BFF sem SQL de geocodificação | Aprovado |
| HMAC, timestamp e nonce | Aprovado em source/runtime |
| Circuit breaker | Aprovado em teste BFF |
| Prévia e aprovação idempotentes | Aprovado no smoke |
| Persistência após restart | Aprovado no smoke de restart |
| `externalCalls=0` | Aprovado no smoke e métricas |
| Shutdown gracioso | Aprovado no worker e processo |
| Concorrência multiworker em PostgreSQL | Pendente de homologação dedicada |
| RLS e retenção em ambiente compartilhado | Pendente de aprovação de infraestrutura/DPO |

## 11. Próximas três ações

1. Executar a homologação concorrente em PostgreSQL isolado com dois workers, dois tenants, leases expirados e `FOR UPDATE SKIP LOCKED`, incluindo teste de restart em `requesting` e `outcome_unknown`.
2. Integrar o transporte HMAC ao handler BFF produtivo com segredo rotacionável, replay store compartilhado, métricas de circuito e autenticação de serviço padronizada.
3. Submeter política de retenção, crypto-shredding, fornecedor, cofre e evidência `suggested` à revisão DPO/gestor antes de qualquer feature flag externa.
