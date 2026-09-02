# BPA-C v1 — vertical agregada no APS

## Decisão

BPA-C foi escolhido como primeiro corte porque o registro é agregado e não exige dados nominais do paciente. A vertical não lê `core-state.json`, não recebe CPF/CNS/nome de paciente e não altera nem controla o `BPAInsightAgent` legado.

O domínio autoritativo fica em Rust (`Apps/bpa/bpa-c-domain`). O BFF apenas valida o envelope agregado, deriva tenant/município do escopo autorizado, persiste e agenda o job, invoca o binário Rust sem shell e valida novamente tamanho/hash antes de persistir o TXT.

## Fonte e limite normativo

- Fonte oficial: [Layout da interface texto do BPA e do SIA](ftp://arpoador.datasus.gov.br/siasus/Documentos/BPA/Layout_Exportacao_BPA.pdf), publicado pelo DATASUS em 09/07/2026.
- SHA-256 observado: `f318bc0359b378e8455280f87dec0ad8c016bcf853d640f2f83353e5648f9f1f`.
- O golden cobre posições, CRLF, cabeçalho de 132 bytes, BPA-C de 50 bytes, paginação em 20 linhas e campo de controle.
- Não existe nesta entrega evidência de importação/aceite no BPA Magnético ou SIA da competência alvo. Portanto o resultado é sempre `IMPLEMENTED_NOT_VALIDATED` e `BLOCKED_NORMATIVE`.

O operador pode baixar o TXT para homologação controlada, mas a UI não o classifica como “pronto para envio”. A promoção normativa exige golden aceito por aplicativo oficial, SIGTAP vigente da competência e evidência de rejeição zero.

A defesa de célula desta execução não muda esse status: o resultado continua `IMPLEMENTED_NOT_VALIDATED` e `BLOCKED_NORMATIVE`, sem alegação de prontidão para envio.

## Fluxo

1. Usuário autenticado precisa de `reports.bpa.generate` (ou papel administrativo já reconhecido pelo APS).
2. O BFF resolve tenant e município exclusivamente em `b360_user_scopes`; escopo ausente, revogado ou ambíguo falha fechado.
3. A UI envia apenas linhas agregadas `CNES + CBO + procedimento + idade + quantidade + origem` e metadados de cabeçalho.
4. O BFF normaliza ordem, calcula idempotência SHA-256 e persiste `PENDING` em `sus_analytics_bpa.bpa_c_jobs`.
5. O worker reivindica por `FOR UPDATE SKIP LOCKED` dentro de uma transação com `SET LOCAL` exato de célula, tenant e município; usa lease/fencing token, recupera lease expirado após restart, chama o binário Rust e confirma o resultado somente se ainda detiver o lease.
6. Falhas recebem retry limitado; o terceiro erro termina em `FAILED`. Resultado e TXT ficam persistidos, com SHA-256.
7. Leitura/listagem/download repetem RBAC/ABAC e registram decisão em `bpa_c_audit_events`.

## DEFAULT_CELL e defesa no banco

- Jobs, resultados e auditoria têm `cell_id` e PK/UK compostas por `cell_id + tenant_id + municipality_id`; o mesmo UUID pode existir em dois escopos sem colisão.
- `bpa_c_results` separa o artefato do estado do job e liga-se ao job por FK composta do escopo.
- As três tabelas usam RLS e `FORCE ROW LEVEL SECURITY`; settings ausentes resultam em zero linhas ou bloqueio da escrita.
- BFF e worker executam operações dentro de `BEGIN` e `set_config(..., true)`, equivalente a `SET LOCAL`, que some no commit/rollback.
- Roles BPA-específicos reduzem a superfície além dos roles compartilhados de `DEFAULT_CELL`: `bpa_bff` lê/cria jobs, lê resultados e insere audit; `bpa_worker` lê/atualiza jobs, grava resultados idempotentes e insere audit; `bpa_audit_reader` lê apenas audit. Todos são `NOLOGIN`, `NOBYPASSRLS` e não-superuser.
- `bpa_migration_owner` é separado dos runtime roles e é dono das relações. Um login de deploy recebe capacidade administrativa por mecanismo externo; o APS não herda esse papel. O login do APS precisa ser membro somente de `bpa_bff` e `bpa_worker`; o preflight verifica a capacidade de `SET ROLE` antes de aceitar o runtime. `bpa_audit_reader` deve ser atribuído apenas à identidade externa de auditoria.

## Canário e rollback

- `BPA_C_V1_MODE=DISABLED` (padrão): não cria/processa jobs novos; `saudeBucal.bpaCResumo` legado continua disponível.
- `BPA_C_V1_MODE=CANARY`: somente municípios em `BPA_C_V1_CANARY_MUNICIPALITIES`.
- `BPA_C_V1_MODE=ENABLED`: habilita todos os escopos já autorizados.
- Rollback funcional imediato: definir `BPA_C_V1_MODE=DISABLED` e reiniciar apenas o APS. Não parar o `BPAInsightAgent`.
- Rollback de schema: parar o APS, remover/migrar escopos incompatíveis com a representação legada, definir `BPA_C_CONFIRM_ROLLBACK=BPA_C_DEFAULT_CELL_V1` e executar `node --import tsx scripts/14-shared/bpa-c-migrate.mts down-cell`. O down recusa células diferentes de `DEFAULT_CELL` e UUIDs globais colidentes; reidrata o resultado no job antes de remover `bpa_c_results`.

O detector `scripts/11-windows/detect-bpa-insight-coexistence.ps1` consulta serviço/processo em modo somente leitura e declara explicitamente as ações proibidas. Ele não muda serviço, processo, arquivo ou configuração.

## Operação segura

- Compilar o worker: `cargo build --release --manifest-path Apps/bpa/bpa-c-domain/Cargo.toml --bin bpa-c-worker`.
- Opcionalmente fixar o artefato com `BPA_C_RUST_WORKER_PATH`.
- Executar migration explicitamente com credencial de deploy: `BPA_C_MIGRATION_DATABASE_URL=... node --import tsx scripts/14-shared/bpa-c-migrate.mts up`.
- O startup do APS chama somente o preflight read-only. Schema/versões/owner/roles/RLS ausentes causam `BPA_C_DATABASE_PREFLIGHT_FAILED`; nenhum DDL roda no BFF.
- Ordem: `0001_bpa_c_v1_baseline.up.sql`, depois `0002_bpa_c_default_cell_v1.up.sql`. Down de `0002` deve preceder o down destrutivo opcional de `0001`.
- Validar o módulo embarcado contra os quatro SQL: `node scripts/14-shared/check-bpa-c-migration-drift.mjs`.
- Executar PostgreSQL 16 descartável: `powershell -File scripts/tests/windows/test-bpa-c-cell-postgres.ps1`.
- Antes do canário, executar `scripts/11-windows/detect-bpa-insight-coexistence.ps1` e manter o legado funcionando.
- Depois de cada golden, importar manualmente no BPA/SIA homologação e arquivar logs/recibo sem dados nominais.

## Evidência Execução 3 — BPA-C cell/RLS

Em PostgreSQL 16 descartável real, `scripts/tests/windows/test-bpa-c-cell-postgres.ps1` validou:

- `up` e preflight explícitos, sem DDL no startup do BFF;
- PK/UK compostas e IDs intencionalmente colidentes em jobs, results e audit;
- `FORCE RLS`, roles `NOLOGIN/NOBYPASSRLS` e `SET LOCAL ROLE`/scope;
- job e resultado de tenant A invisíveis em tenant B;
- `getJob` e `exportFile` cross-tenant retornando somente `NOT_FOUND`, com deny auditado no escopo solicitante;
- ausência de settings retornando zero linhas e bloqueando inserts;
- lease expirado recuperado após restart;
- rollback recusado enquanto IDs globais colidem e, após remoção controlada do tenant B, preservando job, bytes e SHA-256 do tenant A;
- reaplicação do `up` restaurando `bpa_c_results` sem alterar o SHA-256.

A API atual recebe o agregado canônico em `createJob`; não existe superfície separada de upload de arquivo BPA. Logo não há um endpoint de upload para alegar como testado. Qualquer upload futuro deve herdar a mesma transação escopada antes de ser habilitado.

Bloqueios mantidos: aceite de importação no BPA/SIA real, elegibilidade SIGTAP por competência e certificação normativa do artefato. Por isso o status permanece `BLOCKED_NORMATIVE`; esta evidência é de isolamento e durabilidade, não de prontidão para transmissão.
