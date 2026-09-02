# Estado Atual Verificado — Unificação SUS APS 360 + Análise Pack

- **Data da verificação:** 2026-08-14
- **Base:** `afeb910048bf678d06c9ee3a33c4dcaa05cebe2b`
- **Escopo:** inventário não destrutivo do checkout APS, Análise Pack e runtime Windows local.
- **Classificação honesta:** `IMPLEMENTED_NOT_VALIDATED` para componentes inspecionados; `NATIONAL_SCALE_NOT_PROVEN` para a plataforma.

## Decisão operacional

A autoridade de produto, protocolo, durabilidade Hub e cálculo normativo permanece no **SUS APS 360**. O binário canônico é **`pec-agent-sync`**. O Análise Pack é fonte de domínio BPA, UX e mecanismos operacionais, mas não pode permanecer como segundo runtime após uma migração com paridade comprovada.

> O runtime local ainda possui `PecAgentSync` e `BPAInsightAgent` em execução. Esta coexistência é evidência de transição, não conformidade com a arquitetura-alvo, e bloqueia ativação de um cutover definitivo.

## Estado verificado no código

| Superfície | Evidência observada | Estado | Decisão |
|---|---|---|---|
| Contratos v1 | `sus-aps-contracts` define `SyncEnvelopeV1`, três modos, validação e idempotência determinística | `IMPLEMENTED_NOT_VALIDATED` neste host | KEEP |
| Edge RAW-first | `EdgeState` usa SQLite, transação imediata, AES-256-GCM, DPAPI/Secret Service e checkpoint pós-ACK | `IMPLEMENTED_NOT_VALIDATED` neste host | KEEP + validar crash/crypto |
| Planejador local | profiler, governor, hysteresis, cooldown e fallback sem nova leitura estão em `adaptive.rs` | `IMPLEMENTED_NOT_VALIDATED` neste host | KEEP + calibrar em PEC autorizado |
| Hub multi-mode | receiver valida binding, persiste PostgreSQL antes do ACK e usa Redis somente como hint | `IMPLEMENTED_NOT_VALIDATED` neste host | KEEP + validar E2E local/real |
| Regras | engine Rust e atestação existem; paridade comprovada documentalmente apenas para M1 | `VALIDATED_LOCAL_BOUNDED` | EXPANDIR para 21/21 |
| BPA-C APS | crate Rust e fronteira celular/RLS constam no código/documentação | `IMPLEMENTED_NOT_VALIDATED` | REIMPLEMENTAR paridade normativa |
| BPA-I/exportações/UI BPA | permanecem no Análise Pack, com Core JSON e frontend paralelo | `LEGACY_ACTIVE` | MIGRAR; não acoplar |
| Atualização/rollback | mecanismos de scripts no legado; trust root, SBOM e assinaturas de release não fechados | `PARTIAL` | REIMPLEMENTAR |
| Runtime local | `PecAgentSync` e `BPAInsightAgent` estão `RUNNING` | `P0_BLOCKER` | Guard de cutover + migração controlada |
| Toolchain de validação | Rust/Cargo não disponível no host Windows observado | `ENVIRONMENT_BLOCKED` | Provisionar runner aprovado; não declarar testes Rust executados |

## Matriz de absorção atualizada

| Feature | Fonte principal | Destino SUS APS 360 | Decisão | Gate de aceitação |
|---|---|---|---|---|
| BPA-I e BPA-C | `apps/desktop/src/db.rs`, `export.rs` do legado | crates BPA e workers de célula | REIMPLEMENT | fixture sanitizada, validador oficial e hash de arquivo |
| CID e procedimentos | legado | modelo canônico/source adapters | MERGE | mesmos filtros e proveniência |
| Pacientes e auditoria nominal | legado | BFF scoped + ABAC/RLS + audit store | REIMPLEMENT | teste A/B sem leakage |
| PDF, XLSX e CSV | `export.rs` do legado | `export_jobs` assíncronos | MERGE | checksum semântico e autorização |
| Checkpoint/outbox | APS JSON e `agent_queue.rs` legado | `EdgeState` SQLite | REPLACE | restart, corrupção, disco e ACK |
| Source health | APS e legado | `SourceHealthV1`/telemetria | MERGE | drift e ausência explícita, nunca zero sintético |
| Commands | `sync.rs` legado | journal cifrado do `pec-agent-sync` | REIMPLEMENT | claim, lease, retry, resultado idempotente |
| Update e rollback | scripts legado | release client do agente oficial | REIMPLEMENT | assinatura, stage, health, rollback canário |
| Dashboard e administração | dois frontends | shell React APS, blocos separados | MERGE | um BFF, rotas scoped, sem resultado BPA aleatório |
| Agente BPA e Core JSON | `BPAInsightAgent`/`core-state.json` | nenhum runtime final | RETIRE APÓS CANÁRIO | backup, paridade, rollback e desativação auditada |

## Sequência segura de migração

1. **Controlar o cutover antes de efetuá-lo.** Um preflight deve bloquear ativação quando o agente oficial e o legado estiverem concorrentes; ele não interrompe serviços nem descarta state.
2. **Consolidar paridade BPA.** Converter BPA-I/C, exports e filtros em contratos/fixtures sanitizados e workers APS; cada exportação precisa ser confrontada contra o legado por hash e conteúdo.
3. **Migrar estado com backup verificável.** Importar somente configuração, referência de credencial e itens reutilizáveis; nunca apagar JSON/queue do legado no primeiro rollout.
4. **Canário por instalação.** Validar RAW-first, fallback, commands, export e rollback em instalação selecionada, mantendo retorno explícito ao legado.
5. **Desativação administrada.** Só após paridade, canário e rollback ensaiado: desabilitar autostart do legado, parar o serviço sob mudança aprovada e manter retenção/backup auditável.

## Blockers e próximo slice

| Prioridade | Bloqueador | Ação no slice atual | Evidência necessária |
|---|---|---|---|
| P0 | Dois agentes ativos | Implementar preflight de cutover não destrutivo | execução real deve falhar enquanto ambos estiverem ativos |
| P0 | Paridade BPA não certificada | Não desativar `BPAInsightAgent` | fixtures, exports e validação oficial |
| P0 | Testes Rust indisponíveis no host | Não atribuir PASS a `cargo` | runner Windows/Linux aprovado e logs dos gates |
| P0 | mTLS/trust root incompletos | Manter rollout como não certificado | enrollment, revogação, assinatura e rollback |
| P1 | PEC impact não medido | Não aplicar thresholds finais | baseline/agente/recovery autorizado |

## Rollback

Este inventário não altera serviço, banco, credencial, configuração nem dados. O próximo slice é aditivo: um verificador de pré-condições. Para removê-lo basta remover sua invocação de scripts de instalação; ele não produz mutação de runtime.
