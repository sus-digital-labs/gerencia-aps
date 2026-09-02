# Correções Rust + LEDI local — validação 2026-08-13

## Classificação executiva

- Workflow, persistência, concorrência, autorização, retry e confirmação negativa: `IMPLEMENTED_AND_PROVEN`.
- Binding/serialização/autenticação/transporte LEDI real: `BLOCKED_BY_OFFICIAL_CONTRACT`.
- API Rust autenticada ainda não vinculada ao BFF: `IMPLEMENTED_NOT_RUNTIME_PROVEN`.

O núcleo operacional foi implementado em Rust e provado em PostgreSQL descartável real. Geração Thrift/`.esus`, autenticação e envio real ao PEC não foram executados porque o repositório não contém IDL oficial versionado, bindings gerados com proveniência, golden bytes, envelope HTTP oficial nem sandbox PEC comprovado. Não existe fallback.

## Diagnóstico e correções aplicadas

- Removido backend de correções TypeScript com estado, persistence, retry e LEDI centrais.
- Removido caminho legado que executava `UPDATE` direto em `tb_cidadao`.
- Removido gerador XML chamado de LEDI e consultas nominais do módulo `pec-ledi.ts`; não eram contrato LEDI oficial.
- BFF Node reduzido a fronteira de compatibilidade autenticada e fail-closed (`RUST_CORRECTIONS_API_NOT_BOUND`).
- Resumo REST sem escopo deixou de consultar agregados cross-tenant; aguarda read API Rust autenticada.
- Monitor legado deixou de inferir validação/desserialização a partir apenas de HTTP 4xx/5xx.
- Adicionado gate `check:no-ts-backend-authority` ao lint.

## Arquitetura implementada

### `corrections-domain`

- máquina de estados canônica com transições validadas;
- estado terminal explícito `NOT_REFLECTED_AFTER_SYNC` após sync novo sem efeito observado;
- registry versionado MICI/MIAI/MIV e modelos futuros, vazio em produção até contrato oficial;
- matriz fail-closed tipo↔modelo: cadastro→MICI, atendimento→MIAI e vacinação→MIV; visita domiciliar permanece `BLOCKED_BY_POLICY`;
- capability gate fail-closed por fonte, política, autorização, escopo, CBO e contrato/modelo;
- comando local `deny_unknown_fields`, sem PII clínica, com referência de hidratação opaca SHA-256;
- `business_reason_code` tipado, sem texto livre, persistido desde a pendência até decisão/comando;
- idempotency key por tenant/instalação/município/correção/modelo/versão/competência/hash;
- classificação remota sem atribuir causa que não foi parseada;
- backoff limitado e confirmação somente após sync de réplica subsequente.

### `corrections-store`

- schema `sus_aps_corrections` com pending cases, tasks, submissions, eventos e observações;
- migration incremental `0011_correction_submission_leases` com rollback próprio;
- RLS forçada por cell/tenant/município e grants mínimos;
- decisões de aprovação, eventos e observações append-only;
- aprovação, capability gate, eventos e `runtime_commands_v2` na mesma transação PostgreSQL;
- decisão de aprovação durável contém ator, papel, CBO, permissão, escopo implícito pelas chaves RLS, hashes de evidência RBAC/fonte/política e versão da política;
- `EXECUTE_CORRECTION` inserido no contrato de comando e consumido pelo agente;
- claim concorrente com `FOR UPDATE SKIP LOCKED`, `lease_owner`, token de fencing e `lease_expires_at`;
- recovery de crash transforma lease expirado em retry auditado ou dead-letter quando o orçamento acabou;
- replay exato reutiliza `submission_id`, UUID, hash e chave de idempotência; replay divergente falha fechado;
- `max_attempts` durável limita transitórios; autenticação permite uma única renovação/retry;
- `FAILED_PERMANENT` é o estado local de dead-letter quando o orçamento termina; não afirma código ou diagnóstico remoto;
- eventos de submissão persistem status HTTP, código normalizado por allowlist, mensagem sanitizada, classificação interna, tentativa, retryable e próximo retry;
- bytes clínicos e payload `.esus` nunca persistidos no servidor central;
- rollback bloqueado quando existe evidência durável.

### Agente local

- fence exato tenant/município/instalação antes de qualquer hidratação;
- credenciais modeladas somente por provider de segredo apoiado pelo SO;
- `SensitiveText`, credenciais e `JSESSIONID` com `Debug` redigido;
- UUID/hash da submissão estáveis em retry;
- readiness sanitizada confirma `BLOCKED_BY_OFFICIAL_CONTRACT` para MICI/MIAI/MIV.

## Prova em PostgreSQL real

Os quatro testes ignorados `corrections-store/tests/postgres.rs` foram executados explicitamente contra PostgreSQL descartável em `127.0.0.1:55752`:

- migration `0010_corrections_v1`: PASS;
- constraints e RLS instaladas: PASS;
- aprovação + evento + command outbox atômicos: PASS;
- command payload sem chaves CPF/CNS/nome/payload clínico: PASS;
- auditoria append-only: PASS;
- registry não vinculado persiste `BLOCKED_BY_OFFICIAL_CONTRACT`: PASS;
- autorização RBAC/CBO/escopo e matriz tipo↔modelo persistidas: PASS;
- concorrência real com dois workers e único vencedor: PASS;
- replay idempotente exato e replay divergente fail-closed: PASS;
- lease expirado recuperado, token antigo cercado e identidade preservada: PASS;
- transitório termina em dead-letter no `max_attempts`: PASS;
- falha de autenticação permite somente uma renovação/retry: PASS;
- resultado remoto persiste todos os campos obrigatórios com código/mensagem sanitizados: PASS;
- sync posterior divergente termina em `NOT_REFLECTED_AFTER_SYNC` com evento append-only: PASS;
- rollback com evidência é bloqueado atomicamente: PASS;
- rollback vazio remove migrations/schema em banco isolado: PASS;
- migration `0011` aplicada do zero contém constraints finais de lease/retry/sanitização e RLS: PASS;
- preflight do ingest com schema exato: PASS.

Nenhuma credencial foi impressa; a URL foi montada apenas no ambiente do processo de teste.

## Gates executados

| Gate | Resultado |
| --- | --- |
| Corrections `cargo fmt --check` | PASS |
| Corrections unit/doc tests | PASS — 15/15; 4 integrações PostgreSQL ignoradas por padrão |
| Corrections PostgreSQL explícito | PASS — 4/4 |
| Corrections `clippy -D warnings` | PASS |
| Agent `cargo check --tests` | PASS |
| Agent suíte | PASS — 97/97, 2 integrações ignoradas por exigirem PostgreSQL descartável preparado |
| Agent build + `ledi-contract-check` | PASS; readiness bloqueada honestamente |
| Agent `clippy -D warnings` | PASS |
| Ingest `cargo check --tests` | PASS |
| Ingest suíte | PASS — 97/97, 14 integrações ignoradas por exigirem dependências descartáveis |
| Ingest runtime schema preflight PostgreSQL | PASS — 1/1 |
| Ingest `clippy -D warnings` | PASS |
| Testes TS focados | PASS — 42/42 |
| Typecheck completo web + server | PASS |
| Lint + gates de autoridade Rust | PASS |
| Build gap check | PASS — `RELEASE_READY=true` após sincronização idempotente dos assets |
| NT30 `cargo fmt --check` | PASS |
| NT30 suíte `--all-features` | PASS — 286 executados, 0 falhas; 13 PG/golden ignorados e não contabilizados como PASS |
| NT30 `clippy --all-targets --all-features -- -D warnings` | PASS |
| NT30 `cargo build --release --all-features` | PASS |
| QA LGPD | PASS com ressalva — 811 arquivos, 0 hard fails, 14 warnings de fixtures conhecidas |
| Scanner integrado de segurança | BLOCKED: `The selected scan target changed while the scan was starting. Try again.` |
| Secret scan diff | FAIL fora da superfície: dois potenciais segredos em scripts de benchmark; valores redigidos pelo scanner |

As primeiras tentativas de `cargo test` do agente e ingest excederam o timeout durante compilação concorrente. Após o cache estabilizar, ambas as suítes completas foram reexecutadas e passaram nas contagens acima. As integrações ignoradas permanecem explicitamente identificadas; as quatro provas PostgreSQL de correções e o preflight do ingest foram executados separadamente.

## NT 30/2025 e C2

- `team_link_resolver.rs` é a única implementação Rust do desempate compartilhado;
- aplica exatamente: quantidade de atendimentos em um ano, atendimento mais recente e cadastro mais atualizado;
- não usa INE, CNES, UUID, identificador interno, ordem lexical ou ordem de entrada como quarto critério;
- empate exato retorna `AMBIGUOUS_TEAM_LINK` e falha fechado;
- CVAT6 reutiliza o fragmento de ordenação do resolvedor e preserva empates semânticos de registro/unidade, sem `source_key` ou `min(unit_ref)`;
- `linked_at` permanece apenas proveniência obrigatória no adaptador C2, nunca desempate;
- o lifecycle C2 até 24 meses e as etapas de elegibilidade/tombstone/práticas/agregação permanecem no core Rust existente.

Classificação: o comparador Rust é `IMPLEMENTED_AND_PROVEN`; a projeção SQL CVAT6 é `IMPLEMENTED_NOT_RUNTIME_PROVEN` neste snapshot porque os testes dependentes de PostgreSQL/golden não foram executados; C2 permanece `BLOCKED_BY_SOURCE` enquanto `linked_at` e os demais contratos oficiais de origem não estiverem completos.

## Matriz de runtime

| Componente | Status |
| --- | --- |
| Domínio/workflow Rust | `IMPLEMENTED_AND_PROVEN` |
| PostgreSQL/RLS/auditoria/outbox/leases | `IMPLEMENTED_AND_PROVEN` |
| Autorização, capability e business reason | `IMPLEMENTED_AND_PROVEN` |
| Concorrência/replay/recovery/retry/dead-letter | `IMPLEMENTED_AND_PROVEN` |
| Confirmação positiva/negativa persistente | `IMPLEMENTED_AND_PROVEN` |
| Contrato central → agente sem PII | `IMPLEMENTED_AND_PROVEN` |
| API Rust autenticada para usuário/BFF | `IMPLEMENTED_NOT_RUNTIME_PROVEN` |
| Hidratação clínica local | `BLOCKED_BY_OFFICIAL_CONTRACT` antes de acesso |
| Binding Thrift oficial MICI/MIAI/MIV | `BLOCKED_BY_OFFICIAL_CONTRACT` |
| Serializer TBinaryProtocol/arquivo `.esus` | `BLOCKED_BY_OFFICIAL_CONTRACT` |
| Login real/JSESSIONID e endpoint de envio | `BLOCKED_BY_OFFICIAL_CONTRACT` |
| Sandbox PEC oficial | `BLOCKED_BY_OFFICIAL_CONTRACT` |
| Confirmação E2E após sync PEC real | `BLOCKED_BY_OFFICIAL_CONTRACT` |

## Evidência oficial ainda necessária

1. IDL ou bindings oficiais por modelo e versão, com origem verificável.
2. Golden bytes e fixtures oficiais que provem TBinaryProtocol e container `.esus` exatos.
3. Contrato oficial do corpo de login, request de envio e parser de resposta.
4. Credenciais de sandbox em cofre do SO e autorização para teste.
5. Uma submissão aceita seguida de sync posterior que confirme o efeito na réplica.

Até esses itens existirem, habilitar geração/envio é proibido.
