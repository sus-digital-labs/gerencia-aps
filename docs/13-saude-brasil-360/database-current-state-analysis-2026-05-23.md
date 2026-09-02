# Análise do estado atual de banco de dados — Saúde Brasil 360

Data: 2026-05-23
Projeto: `sus-analytics-sync`
Escopo: análise técnica, somente leitura, sem alteração de código, migrations, schema, `.env`, scripts ou dados.
Arquivo produzido: `docs/13-saude-brasil-360/database-current-state-analysis-2026-05-23.md`

## 1. Sumário executivo

O sistema não está, no estado observado, com um único banco funcional e coerente de ponta a ponta. Há três realidades distintas:

1. **Configuração ativa por `.env`**: aponta o backend para `127.0.0.1:5432`, com:
   - banco de aplicação: `sus_analytics_app` via `DATABASE_URL` e `SUS_ANALYTICS_DATABASE_URL`;
   - fonte PEC/DW: `esus_restore_20260424` via `PEC_REPLICA_*` e `PEC_DB_*`.
2. **PostgreSQL realmente alcançável na auditoria**: existe conexão somente leitura em `127.0.0.1:5433`, banco `esus`; os bancos disponíveis ali são `esus`, `esus_new` e `postgres`.
3. **Schema PEC/DW descoberto anteriormente**: `reports/pec-schema-discovery.json`, gerado em `2026-05-13T10:50:48.671Z`, registra 1101 tabelas e 9681 colunas, compatível com um schema PEC/e-SUS amplo.

Conclusão principal: **o banco alcançável `esus` possui estrutura PEC/DW ampla, mas está sem dados nas principais tabelas fato e de cidadão usadas por C2/C3**. Assim, ele serve para validação estrutural de schema, mas **não é suficiente para painel operacional real nem para cálculo oficial de C2/C3**.

Status arquitetural recomendado para C2/C3 e próximos indicadores: **BLOCKED_BY_DATA_SOURCE_ALIGNMENT**. A implementação C2/C3 pode estar correta no nível de código/schema sintético, mas a validação oficial exige resolver o alvo canônico de banco, dados reais não vazios e contrato multi-tenant.

## 2. Proveniência das evidências

| Proveniência | Evidência usada | Observação |
| --- | --- | --- |
| `source` | `Apps/server/api/src/db/pec-db.ts`, `analytics-db.ts`, `start-server.ts`, `server/app-router.ts`, `saude-brasil-360/router.ts`, `indicadores/indicador-c2.ts`, `indicadores/indicador-c3.ts` | Mapeia conexões e origem dos indicadores. |
| `source` | `Apps/agent/pec-agent-sync/src/config.rs`, `credential_discovery.rs`, `bootstrap.rs` | Mapeia prioridade de conexão do agente PEC e réplica simplificada. |
| `source` | `Apps/server/api/src/agents/migrations.ts`, `payments/migrations.ts`, `correcoes/schema.sql`, `auth/rbac-repository.ts` | Mapeia tabelas de aplicação esperadas no banco analytics/app. |
| `docs` | `docs/README.md`, `architecture.md`, `env.md`, `runbook.md`, `testing.md`, `assumptions.md` | Contexto arquitetural e desvios conhecidos. |
| `docs` | `docs/13-saude-brasil-360/validacao-final-c2-c3-2026-05-23.md` | Status anterior C2/C3: `CODE_COMPLETE_SCHEMA_MAPPED_VALIDATION_PENDING`. |
| `runtime-db` | Consultas somente leitura em `pg_database`, `information_schema` e contagens agregadas em tabelas críticas | Nenhum dado nominal foi consultado/imprimido no relatório. |
| `report` | `reports/pec-schema-discovery.json` | Descoberta antiga de schema: 1101 tabelas, 9681 colunas. |

## 3. Auditoria inicial do repositório

### Estado do workspace

| Item | Valor observado |
| --- | --- |
| Caminho do projeto | `D:\dm-hub\apps\dm-gov\saude\sus-analytics-sync` |
| Branch | `main` |
| Commit | `42b07a94761635953b75f0dc0edf23d56ad7cd59` |
| Node.js | `v24.15.0` |
| `pnpm` direto | não disponível no PATH (`pnpm` não reconhecido) |
| `pnpm` via Corepack | `10.32.0` |
| Package manager configurado | `pnpm@10.32.0` |
| Pasta `docs/13-saude-brasil-360/` | existe; nenhuma estrutura extra foi necessária |
| Relatório C2/C3 anterior | existe: `docs/13-saude-brasil-360/validacao-final-c2-c3-2026-05-23.md` |
| Schema discovery antigo | existe: `reports/pec-schema-discovery.json` |

### `git status --short`

O status curto está volumoso e indica workspace inconsistente:

| Tipo | Quantidade observada |
| --- | ---: |
| `D` | 1114 |
| `??` | 41 |
| Total | 1155 |

Interpretação: há grande volume de arquivos aparecendo como deletados e não rastreados. Isso é risco operacional relevante para qualquer alteração futura. Nesta tarefa, a única alteração realizada foi a criação deste relatório Markdown.

### Scripts relevantes de `package.json`

| Script | Finalidade aparente para banco/saúde 360 |
| --- | --- |
| `start` | Executa `node Apps/server/api/dist/index.js`, runtime backend atual. |
| `pec:schema:discover` | Descoberta de schema PEC via `scripts/14-shared/pec-schema-discover.mjs`; escreve relatório. Não foi executado nesta análise. |
| `preflight:env` | Valida ambiente e conexão PEC/DB. |
| `readyz:diagnose-db` | Diagnóstico de readiness de banco. |
| `db:diagnose-contract` | Diagnóstico de contrato de banco. |
| `agent:replica:diagnose-destination` | Diagnóstico de destino da réplica/agente. |
| `bootstrap:pec-replica` | Bootstrap de réplica PEC simplificada. Não foi executado. |
| `smoke:saude360` | Smoke de indicadores Saúde Brasil 360. Não foi executado nesta análise. |
| `smoke:indicators` | Smoke geral de indicadores. Não foi executado nesta análise. |
| `verify:agent-persistence` | Verificação de persistência do agente. Não foi executado nesta análise. |

### Arquivos `.env*` existentes

Conteúdo sensível não foi reproduzido.

| Arquivo | Existe | Rastreado pelo git | Observação segura |
| --- | ---: | ---: | --- |
| `.env` | sim | não | Configuração local ativa; contém valores sensíveis locais. |
| `.env.bak.1778577138614` | sim | não | Backup local; contém valores sensíveis locais. |
| `.env.docker` | sim | não | Configuração Docker local; contém valores sensíveis locais. |
| `.env.docker.bak.1778577283372` | sim | não | Backup Docker local; contém valores sensíveis locais. |
| `.env.example` | sim | não no estado atual do git | Contém placeholders/valores exemplares; nenhum segredo real confirmado nesta auditoria. |
| `.env.local` | sim | não | Configuração local com placeholders/valores locais. |

Achado de segurança: foram encontrados valores com aparência de segredo em arquivos `.env*` locais não rastreados. Não foram copiados para este relatório. Recomendação: manter fora do versionamento e revisar se algum backup local deve ser removido do ambiente de trabalho.

## 4. Respostas objetivas às perguntas da análise

| Pergunta | Resposta curta |
| --- | --- |
| 1. Qual banco o sistema usa atualmente? | Configuração ativa aponta para `sus_analytics_app` e `esus_restore_20260424` em `127.0.0.1:5432`, mas essa porta recusou conexão. O banco realmente alcançável foi `esus` em `127.0.0.1:5433`. |
| 2. Quais conexões existem configuradas? | `DATABASE_URL`, `SUS_ANALYTICS_DATABASE_URL`, `PEC_REPLICA_*`, `PEC_DB_*`, `PEC_POSTGRES_URL` no agente, Redis opcional. |
| 3. Quais variáveis controlam essas conexões? | `SUS_ANALYTICS_DATABASE_URL`, `DATABASE_URL`, `PEC_REPLICA_HOST/PORT/DB/USER/PASSWORD`, `PEC_DB_HOST/PORT/NAME/USER/PASSWORD`, aliases `PEC_REPLICA_DATABASE`/`PEC_DB_DATABASE`, `PEC_POSTGRES_URL`, `PGHOST`/`PGDATABASE` em buscas gerais, `REDIS_*`. |
| 4. Qual banco o backend usa? | Para aplicação/persistência: `SUS_ANALYTICS_DATABASE_URL`. Para PEC/indicadores: `pecPool`, derivado de `PEC_REPLICA_*`; há fallback direto por `PEC_DB_*` em consultas auxiliares. |
| 5. Qual banco o `pec-agent-sync` usa? | Prioridade: `PEC_POSTGRES_URL` > `PEC_DB_*` > credenciais descobertas/salvas > defaults `127.0.0.1:5432/pec_replica`. No `.env` ativo, tenderia a `esus_restore_20260424` em `5432`; o banco alcançável real é `esus` em `5433`, mas não é o alvo ativo do `.env`. |
| 6. Qual banco C2/C3 usam? | C2/C3 usam `pecPool` do backend, portanto a fonte `PEC_REPLICA_*`, não o banco analytics/app. |
| 7. Quais tabelas existem no banco atual? | No banco alcançável `esus`: 1101 tabelas em `public`, agrupadas em 82 `rl_*`, 170 `ta_*`, 453 `tb_*` core, 88 `tb_dim_*`, 52 `tb_fat_*`, 256 `tl_*`. |
| 8. Descrição funcional das tabelas relevantes? | `tb_fat_*` = fatos/eventos/cadastros; `tb_dim_*` = dimensões/códigos; `tb_*` core = estrutura operacional PEC; `rl_*` = relacionamentos; `ta_*`/`tl_*` = apoio/auditoria/lookups; `agent_*`, `payment_*`, `correction_*`, `rbac_*` = aplicação. |
| 9. Quais tabelas são da aplicação? | Esperadas em `sus_analytics_app`: `agent_*`, `payment_*`, `correction_*`, `rbac_user_scopes`. Não foi possível confirmar fisicamente porque `sus_analytics_app` não estava acessível. |
| 10. Quais tabelas são réplica simplificada? | Fixture/seed simplificado contém 9 tabelas principais: `tb_dim_equipe`, `tb_dim_unidade_saude`, `tb_dim_profissional`, `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto`, `tb_fat_procedimento`, `tb_fat_vacinacao`, `tb_fat_visita_domiciliar`. A réplica `pec_replica` não existe no PostgreSQL alcançável. |
| 11. Quais tabelas são PEC/DW completo? | No `esus` alcançável: conjunto amplo `tb_fat_*`, `tb_dim_*`, `tb_cidadao`, `tb_equipe`, `tb_unidade_saude`, `tb_tipo_equipe`, `rl_*`, `ta_*`, `tl_*`. Porém dados críticos estão vazios. |
| 12. Banco atual é suficiente para painel operacional? | Não. Estrutura existe, mas principais fatos/cidadãos estão com 0 linhas; app DB também não foi alcançado. |
| 13. Banco atual é suficiente para cálculo oficial C2/C3? | Não. Tabelas existem, mas fatos e vínculos necessários estão vazios/incompletos. |
| 14. Fluxo está alinhado ao modelo canônico esperado? | Parcialmente no schema PEC; desalinhado operacionalmente por drift de `.env`, app DB indisponível, ausência de dados reais e ausência de vínculo app-level parceiro CNPJ confirmado. |
| 15. Riscos técnicos atuais? | Drift de portas/bancos, app DB indisponível, fonte PEC vazia, credenciais/autodiscovery ambíguos, LGPD por presença de colunas sensíveis, workspace git inconsistente, validação oficial bloqueada. |
| 16. Decisões antes de C4/C5? | Fixar banco canônico, separar app DB x PEC/DW x réplica, definir hierarquia multi-tenant CNPJ→IBGE→CNES→INE, política de chave protegida do paciente, contrato oficial de dimensões e smoke real obrigatório. |

## 5. Mapa de conexões de banco no código

| Arquivo | Variável/conexão encontrada | Finalidade aparente | Banco alvo inferido | Usado por | Risco |
| --- | --- | --- | --- | --- | --- |
| `Apps/server/api/src/db/analytics-db.ts` | `SUS_ANALYTICS_DATABASE_URL`, `new Pool` | `APP_DB` / `SYNC_TARGET` | `.env`: `127.0.0.1:5432/sus_analytics_app` | agentes, pagamentos, correções, RBAC/admin, persistência B360 | Porta recusou conexão; como a variável existe, o backend considera analytics disponível e pode falhar em runtime. |
| `Apps/server/api/src/db/pec-db.ts` | `PEC_REPLICA_*`, `replicaPool = new Pool(...)` | `PEC_REPLICA` / `INDICATOR_SOURCE` | `.env`: `127.0.0.1:5432/esus_restore_20260424` | indicadores, rotas PEC, B360, tRPC | Banco/porta configurados não estavam acessíveis; C2/C3 ficam sem fonte real. |
| `Apps/server/api/src/db/pec-db.ts` | `PEC_DB_*`, `pecDirectPool = new Pool(...)` | `PEC_DW` fallback direto | `.env`: `127.0.0.1:5432/esus_restore_20260424` | fallback/diagnóstico PEC | Pode mascarar falha da réplica e mistura fonte direta x réplica se contratos não forem explícitos. |
| `Apps/server/api/src/db/pec-credential-discovery.ts` | `resolvePecConfigFromEnvironment()` | `PEC_DW` / `PEC_REPLICA` config resolver | Env-first no `.env`; arquivo padrão de credenciais PEC também existe | backend PEC pool | Ambiguidade entre `.env` e credenciais descobertas; risco de apontar para banco antigo. |
| `Apps/server/api/src/server/start-server.ts` | `getAnalyticsPool()`, `runAgentMigrations`, `runPaymentMigrations`, `pecPool` | `APP_DB` + `PEC_REPLICA` | `sus_analytics_app` + `esus_restore_20260424` pelo `.env` | startup backend | Migrations de app tentam rodar se pool existir; DB indisponível causa degradação/falha operacional. |
| `Apps/server/api/src/routes/readyz.ts` | `pecPool.query("SELECT 1")`, `analyticsPool.query("SELECT 1")` | health/readiness | PEC + analytics | `/readyz` | Readiness falha se `.env` aponta para bancos offline. Observação: docs antigos ainda citam ausência de `/readyz`, mas source atual possui rota. |
| `Apps/server/api/src/server/app-router.ts` | `createSaudeBrasil360Router({ pecPool })` | `INDICATOR_SOURCE` | `PEC_REPLICA_*` | tRPC Saúde Brasil 360 | Indicadores dependem do mesmo pool PEC configurado. |
| `Apps/server/api/src/saude-brasil-360/router.ts` | `calcularIndicador(..., deps.pecPool)` | `INDICATOR_SOURCE` | `PEC_REPLICA_*` | B1-B6, C1-C7, M1-M2 | Se PEC está vazio/offline, resultado pode ser bloqueado, vazio ou não oficial. |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c2.ts` | `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_dim_cbo`, `tb_equipe`, `tb_tipo_equipe`, `tb_fat_*` auxiliares | `INDICATOR_SOURCE` | `PEC_REPLICA_*` | C2 | Tabelas existem no `esus`, mas fatos críticos estão 0; cálculo oficial bloqueado. |
| `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts` | `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_dim_cbo`, `tb_dim_procedimento`, `tb_equipe`, `tb_tipo_equipe`, `tb_fat_*` auxiliares | `INDICATOR_SOURCE` | `PEC_REPLICA_*` | C3 | Mesma limitação; usa SIGTAP via `tb_dim_procedimento`, mas fatos estão 0. |
| `scripts/14-shared/pec-schema-discover.mjs` | `PEC_REPLICA_*`, `information_schema` | `PEC_DW` discovery | `PEC_REPLICA_*` | descoberta de schema | Script escreve relatório; não foi executado nesta tarefa. |
| `scripts/14-shared/preflight-env.mjs` | `PEC_REPLICA_*`, `PEC_DB_*`, `Pool` | diagnóstico | PEC replica/direct | preflight | Pode validar destino errado se `.env` estiver stale. |
| `scripts/14-shared/diagnose-readyz-db.mjs` | `PEC_REPLICA_*`, `PEC_DB_*`, `SELECT current_database()` | diagnóstico | PEC replica/direct | readyz diagnose | Somente diagnóstico; depende de env coerente. |
| `Apps/agent/pec-agent-sync/src/config.rs` | `PEC_POSTGRES_URL`, `PEC_DB_*`, credenciais descobertas | `PEC_DW` fonte do agente | prioridade: URL > env > descoberta > defaults | `pec-agent-sync` | Defaults apontam `127.0.0.1:5432/pec_replica`; banco ausente no PG alcançável. |
| `Apps/agent/pec-agent-sync/src/bootstrap.rs` + `scripts/02-fixtures/pec-replica-seed.sql` | `pec_replica`, seed simplificado | `PEC_REPLICA` simplificada | banco `pec_replica` se bootstrap executado | ambiente dev/teste | Fixture tem estrutura e dados sintéticos; não é DW oficial nem suficiente para C2/C3 oficial. |
| `docker/01-compose/compose.production.yml` | defaults `host.docker.internal`, porta `5433`, banco `esus` para PEC | runtime container | `host.docker.internal:5433/esus` | deploy containerizado | Diverge do `.env` ativo local, que aponta `5432/esus_restore_20260424`. |

## 6. Mapa de bancos configurados por ambiente

Usuários foram mascarados. Senhas, tokens e connection strings completas não foram reproduzidos.

| Variável | Host | Porta | Database | Usuário mascarado | Origem | Finalidade aparente |
| --- | --- | ---: | --- | --- | --- | --- |
| `DATABASE_URL` | `127.0.0.1` | 5432 | `sus_analytics_app` | `s***` | `.env` | `APP_DB` legado/config geral |
| `SUS_ANALYTICS_DATABASE_URL` | `127.0.0.1` | 5432 | `sus_analytics_app` | `s***` | `.env` | `APP_DB` efetivo para backend analytics |
| `PEC_REPLICA_*` | `127.0.0.1` | 5432 | `esus_restore_20260424` | `e***` | `.env` | `PEC_REPLICA` / indicadores |
| `PEC_DB_*` | `127.0.0.1` | 5432 | `esus_restore_20260424` | `e***` | `.env` | `PEC_DW` direto/fallback |
| `DATABASE_URL` | `host.docker.internal` | 5432 | `sus_analytics_app` | `s***` | `.env.docker` | `APP_DB` em container |
| `SUS_ANALYTICS_DATABASE_URL` | `host.docker.internal` | 5432 | `sus_analytics_app` | `s***` | `.env.docker` | `APP_DB` em container |
| `PEC_REPLICA_*` | `host.docker.internal` | 5432 | `esus_restore_20260424` | `e***` | `.env.docker` | `PEC_REPLICA` em container |
| `PEC_DB_*` | `host.docker.internal` | 5432 | `esus_restore_20260424` | `e***` | `.env.docker` | `PEC_DW` direto em container |
| `SUS_ANALYTICS_DATABASE_URL` | `127.0.0.1` | 5434 | `sus_analytics_replica` | `p***` | `.env.bak.*` | histórico `SYNC_TARGET` |
| `PEC_REPLICA_*` | `localhost` | 5433 | `esus` | `e***` | `.env.bak.*` | histórico PEC real |
| `PEC_DB_*` | `localhost` | 5433 | `esus` | `e***` | `.env.bak.*` | histórico PEC real |
| `DATABASE_URL` | `127.0.0.1` | 5432 | `sus_analytics` | `a***` | `.env.example` | exemplo `APP_DB` |
| `PEC_REPLICA_*` | `127.0.0.1` | 5432 | `pec_replica` | `p***` | `.env.example` | exemplo réplica simplificada |
| `PEC_DB_*` | `127.0.0.1` | 5432 | `esus` | `e***` | `.env.example` | exemplo PEC direto |
| `PEC_REPLICA_*` | `127.0.0.1` | 5432 | `pec_replica` | `p***` | `.env.local` | local réplica simplificada |
| `PEC_DB_*` | `127.0.0.1` | 5432 | `esus` | `e***` | `.env.local` | local PEC direto |

### Conectividade observada

| Alvo | Resultado |
| --- | --- |
| `127.0.0.1:5432/sus_analytics_app` | conexão recusada |
| `127.0.0.1:5432/esus_restore_20260424` | conexão recusada |
| `127.0.0.1:5434/sus_analytics_replica` | porta fechada |
| `127.0.0.1:6379` | porta fechada para Redis |
| `127.0.0.1:5433/esus` | conexão somente leitura OK |
| `127.0.0.1:5433/pec_replica` | banco não existe |
| `127.0.0.1:5433/esus_restore_20260424` | banco não existe |
| `127.0.0.1:5433/sus_analytics_app` | banco não existe |

Bancos não-template disponíveis no PostgreSQL alcançável em `127.0.0.1:5433`:

| Database |
| --- |
| `esus` |
| `esus_new` |
| `postgres` |

## 7. Estado do banco `esus` alcançável

### Inventário por prefixo

| Grupo | Quantidade | Interpretação funcional |
| --- | ---: | --- |
| `rl_*` | 82 | tabelas relacionais/de vínculo do PEC/e-SUS |
| `ta_*` | 170 | tabelas auxiliares/auditoria/transacionais do PEC/e-SUS |
| `tb_*` core | 453 | tabelas operacionais principais do PEC/e-SUS |
| `tb_dim_*` | 88 | dimensões DW/SISAB/PEC |
| `tb_fat_*` | 52 | fatos/eventos/cadastros/produção |
| `tl_*` | 256 | lookups/listas/tabelas de apoio |
| Total | 1101 | schema amplo PEC/e-SUS |

O `reports/pec-schema-discovery.json` antigo contém a mesma escala: 1101 tabelas e 9681 colunas, descobertas em `2026-05-13T10:50:48.671Z`.

### Tabelas `tb_fat_*` identificadas

`tb_fat_atd_ind_encaminhamentos`, `tb_fat_atd_ind_exames`, `tb_fat_atd_ind_medicamentos`, `tb_fat_atd_ind_problemas`, `tb_fat_atd_ind_procedimentos`, `tb_fat_atend_dom_prob_cond`, `tb_fat_atend_dom_proced`, `tb_fat_atend_odonto_encaminham`, `tb_fat_atend_odonto_exames`, `tb_fat_atend_odonto_medicament`, `tb_fat_atend_odonto_problemas`, `tb_fat_atend_odonto_proced`, `tb_fat_atendimento_domiciliar`, `tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto`, `tb_fat_atividade_coletiva`, `tb_fat_atvdd_coletiva_ext`, `tb_fat_atvdd_coletiva_int`, `tb_fat_atvdd_coletiva_part`, `tb_fat_atvdd_coletiva_propart`, `tb_fat_avaliacao_elegibilidade`, `tb_fat_cad_dom_familia`, `tb_fat_cad_domiciliar`, `tb_fat_cad_individual`, `tb_fat_cidadao`, `tb_fat_cidadao_pec`, `tb_fat_cidadao_territorio`, `tb_fat_cnslddo_ciddo_fai_cid`, `tb_fat_complementar`, `tb_fat_consolidado_cidadao_fad`, `tb_fat_consolidado_cidadao_fai`, `tb_fat_consolidado_cidadao_fao`, `tb_fat_consolidado_cidadao_fci`, `tb_fat_consolidado_cidadao_fp`, `tb_fat_consolidado_cidadao_fvd`, `tb_fat_cuidado_compartilhado`, `tb_fat_familia`, `tb_fat_familia_territorio`, `tb_fat_fichas`, `tb_fat_ivcf`, `tb_fat_marca_consumo_alimnt`, `tb_fat_op_acompanhamento_idosa`, `tb_fat_proced_atend`, `tb_fat_proced_atend_proced`, `tb_fat_procedimento`, `tb_fat_rel_op_crianca`, `tb_fat_rel_op_gestante`, `tb_fat_rel_op_risco_cardio`, `tb_fat_solicitacao_oci`, `tb_fat_vacinacao`, `tb_fat_vacinacao_vacina`, `tb_fat_visita_domiciliar`.

### Tabelas `tb_dim_*` relevantes

Dimensões críticas presentes incluem: `tb_dim_cbo`, `tb_dim_ciap`, `tb_dim_cid`, `tb_dim_equipe`, `tb_dim_imunobiologico`, `tb_dim_municipio`, `tb_dim_procedimento`, `tb_dim_profissional`, `tb_dim_tempo`, `tb_dim_unidade_saude`, `tb_dim_uf`, `tb_dim_vinculacao_equipes`, além de dimensões de sexo, raça/cor, nacionalidade, tipo de atendimento, local, vacinação, dose, estratégia de vacinação e outras.

### Presença e volume agregado das tabelas críticas

As consultas foram agregadas por `COUNT(*)`; nenhum registro nominal foi impresso.

| Tabela | Presente | Linhas observadas | Relevância |
| --- | ---: | ---: | --- |
| `tb_cidadao` | sim | 0 | cadastro nominal PEC; contém colunas sensíveis, não deve alimentar relatório analítico bruto |
| `tb_fat_cidadao_pec` | sim | 0 | chave fato/protegida do cidadão para DW |
| `tb_fat_cad_individual` | sim | 0 | cadastro individual territorial |
| `tb_fat_atendimento_individual` | sim | 0 | atendimentos individuais; base de C2/C3 |
| `tb_fat_atd_ind_procedimentos` | sim | 0 | procedimentos vinculados ao atendimento; SIGTAP fallback |
| `tb_fat_atd_ind_exames` | sim | 0 | exames solicitados/realizados/resultados |
| `tb_fat_visita_domiciliar` | sim | 0 | visitas domiciliares/territoriais |
| `tb_fat_vacinacao` | sim | 0 | vacinação; imunobiológicos/doses |
| `tb_fat_atendimento_odonto` | sim | 0 | atendimento odontológico |
| `tb_fat_procedimento` | sim | 0 | produção/procedimentos consolidados |
| `tb_dim_tempo` | sim | 0 | dimensão temporal; crítica para períodos oficiais |
| `tb_dim_cbo` | sim | 192 | ocupação/função profissional; CBO não é profissional |
| `tb_dim_procedimento` | sim | 303 | SIGTAP/procedimentos/exames; não pertence ao CBO |
| `tb_dim_cid` | sim | 1 | CID-10; volume insuficiente para validação oficial |
| `tb_dim_ciap` | sim | 53 | CIAP-2 |
| `tb_dim_equipe` | sim | 1 | dimensão equipe/INE |
| `tb_equipe` | sim | 0 | equipe operacional; necessária para tipo e vínculo |
| `tb_tipo_equipe` | sim | 54 | tipos de equipe; usada com `tb_equipe` |
| `tb_dim_unidade_saude` | sim | 1 | unidade/CNES dimensional |
| `tb_unidade_saude` | sim | 0 | unidade operacional/CNES |
| `tb_dim_municipio` | sim | 1 | município/IBGE dimensional |
| `tb_localidade` | sim | 11412 | localidades/território |
| `tb_dim_imunobiologico` | sim | 0 | dimensão de imunobiológicos; vazia |
| `tb_imunobiologico` | sim | 102 | cadastro operacional de imunobiológicos |

### Leitura funcional das tabelas relevantes

| Grupo/tabela | Função | Classificação |
| --- | --- | --- |
| `tb_fat_cidadao_pec` | Entidade DW do cidadão; contém identificadores e vínculos dimensionais. Deve ser usada por chave técnica, não por CPF/CNS em saída analítica. | PEC/DW completo |
| `tb_cidadao` | Cadastro nominal operacional PEC; pode conter nome, documentos, endereço e contato. | PEC operacional sensível |
| `tb_fat_atendimento_individual` | Fato de atendimento individual; contém CBO/equipe/unidade/tempo e filtros CID/CIAP/SIGTAP. | PEC/DW completo |
| `tb_fat_atd_ind_procedimentos` | Procedimentos avaliados/solicitados por atendimento; vincula evento a `tb_dim_procedimento`. | PEC/DW completo |
| `tb_fat_atd_ind_exames` | Exames e resultados por atendimento/cidadão. | PEC/DW completo |
| `tb_fat_vacinacao` e `tb_fat_vacinacao_vacina` | Eventos de vacinação, doses, estratégias e imunobiológicos. | PEC/DW completo |
| `tb_fat_visita_domiciliar` | Visitas domiciliares e acompanhamento territorial. | PEC/DW completo |
| `tb_fat_cad_individual` | Cadastro individual/equipe/território. | PEC/DW completo |
| `tb_dim_cbo` | Classificação Brasileira de Ocupações. CBO é ocupação/função, não pessoa/profissional. | Dimensão nacional/local |
| `tb_dim_procedimento` | Procedimentos/exames SIGTAP. SIGTAP representa procedimento/evento, não CBO. | Dimensão nacional/local |
| `tb_dim_cid` | CID-10 para diagnóstico/condição. | Dimensão clínica |
| `tb_dim_ciap` | CIAP-2 para motivo/condição APS. | Dimensão clínica |
| `tb_dim_municipio` | Município com código IBGE. | Dimensão territorial |
| `tb_dim_unidade_saude` / `tb_unidade_saude` | Unidade de saúde com CNES. | Dimensão/operacional CNES |
| `tb_dim_equipe` / `tb_equipe` / `tb_tipo_equipe` | Equipes, INE e tipo de equipe. | Dimensão/vínculo equipe |
| `tb_dim_imunobiologico` / `tb_imunobiologico` | Imunobiológicos/vacinas. | Dimensão/evento vacinação |

## 8. Tabelas da aplicação, réplica simplificada e PEC/DW completo

### Tabelas da aplicação

Estas tabelas são esperadas no banco de aplicação/analytics (`SUS_ANALYTICS_DATABASE_URL`, atualmente configurado como `sus_analytics_app`). Não foram confirmadas fisicamente porque o banco `sus_analytics_app` não estava acessível.

| Tabela | Origem no source | Função |
| --- | --- | --- |
| `agent_registry` | `agents/migrations.ts` | Registro de agentes instalados, status, token hash e metadados. |
| `agent_heartbeats` | `agents/migrations.ts` | Batimentos/status dos agentes. |
| `agent_source_health` | `agents/migrations.ts` | Saúde da fonte PEC vista pelo agente. |
| `agent_checkpoints` | `agents/migrations.ts` | Cursores/checkpoints de sincronização. |
| `agent_batches` | `agents/migrations.ts` | Lotes recebidos, idempotência e contagem aceita. |
| `agent_events` | `agents/migrations.ts` | Eventos operacionais do agente. |
| `agent_plans` | `agents/migrations.ts` | Planos/slots comerciais de agentes. |
| `agent_activation_codes` | `agents/migrations.ts` | Códigos de ativação de agentes. |
| `agent_registrations` | `agents/migrations.ts` | Registro comercial/tenant/agente. Observação LGPD: source inclui token de agente; deve ser protegido/hasheado quando aplicável. |
| `payment_orders` | `payments/migrations.ts` | Pedidos e status de pagamento. Pode conter dados de cliente; minimizar exposição. |
| `payment_webhook_events` | `payments/migrations.ts` | Eventos de webhook de pagamento. |
| `correction_findings` | `correcoes/schema.sql` | Achados de correção com `source_key_hash`, sem PII direta por contrato. |
| `correction_tasks` | `correcoes/schema.sql` | Tarefas de correção. |
| `correction_events` | `correcoes/schema.sql` | Auditoria de eventos de correção. |
| `correction_evidence` | `correcoes/schema.sql` | Evidências seguras de correção. |
| `rbac_user_scopes` | `auth/rbac-repository.ts` | Escopos RBAC por usuário/município/unidade/equipe; uso referenciado, DDL não confirmado nos trechos lidos. |

### Réplica simplificada

A réplica simplificada aparece no bootstrap/fixture do agente (`scripts/02-fixtures/pec-replica-seed.sql`) e no relatório C2/C3 anterior como uma base de 9 tabelas. Ela é útil para smoke/dev, mas **não é PEC/DW completo** e **não é suficiente para cálculo oficial C2/C3**.

| Tabela simplificada | Função no fixture |
| --- | --- |
| `tb_dim_equipe` | equipe sintética |
| `tb_dim_unidade_saude` | unidade sintética |
| `tb_dim_profissional` | profissional sintético |
| `tb_fat_cidadao_pec` | cidadão sintético; o fixture contém dados nominais sintéticos, não reproduzidos aqui |
| `tb_fat_atendimento_individual` | atendimentos sintéticos |
| `tb_fat_atendimento_odonto` | atendimentos odontológicos sintéticos |
| `tb_fat_procedimento` | procedimentos sintéticos |
| `tb_fat_vacinacao` | vacinação sintética |
| `tb_fat_visita_domiciliar` | visitas sintéticas |

Observação: no PostgreSQL alcançável em `127.0.0.1:5433`, o banco `pec_replica` não existe.

### PEC/DW completo

O banco `esus` alcançável possui estrutura compatível com PEC/e-SUS amplo, incluindo dimensões nacionais/locais e fatos necessários. Porém, a suficiência depende de **dados reais e completude temporal**, e não apenas da existência de tabelas.

Classificação:

| Categoria | Exemplos | Estado atual |
| --- | --- | --- |
| PEC/DW fatos | `tb_fat_atendimento_individual`, `tb_fat_cidadao_pec`, `tb_fat_cad_individual`, `tb_fat_vacinacao`, `tb_fat_visita_domiciliar`, `tb_fat_atd_ind_procedimentos`, `tb_fat_atd_ind_exames` | presentes, mas principais contagens 0 |
| PEC/DW dimensões | `tb_dim_cbo`, `tb_dim_procedimento`, `tb_dim_cid`, `tb_dim_ciap`, `tb_dim_municipio`, `tb_dim_unidade_saude`, `tb_dim_equipe`, `tb_dim_tempo`, `tb_dim_imunobiologico` | presentes; algumas vazias ou incompletas |
| PEC operacional | `tb_cidadao`, `tb_equipe`, `tb_unidade_saude`, `tb_tipo_equipe`, `tb_imunobiologico` | presentes; alguns cadastros críticos vazios |
| App/analytics | `agent_*`, `payment_*`, `correction_*`, `rbac_user_scopes` | esperadas em outro banco; não confirmadas fisicamente |

## 9. C2/C3: fonte, dependências e suficiência

### C2

O source de C2 referencia:

- obrigatórias/base: `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`;
- dimension gates: `tb_dim_cbo`, `tb_equipe`, `tb_tipo_equipe`;
- auxiliares/fallbacks: `tb_fat_cad_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `tb_fat_atd_ind_procedimentos`, `tb_dim_tempo`;
- filtros por CBO via `tb_dim_cbo`;
- SIGTAP/procedimento via `tb_dim_procedimento` em fallback de procedimentos.

No banco `esus` observado, as tabelas existem, mas `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`, `tb_fat_cad_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `tb_fat_atd_ind_procedimentos` e `tb_dim_tempo` têm 0 linhas. Portanto, **C2 não pode ser validado oficialmente neste banco**.

### C3

O source de C3 referencia:

- obrigatórias/base: `tb_fat_cidadao_pec`, `tb_fat_atendimento_individual`;
- dimension gates: `tb_dim_cbo`, `tb_dim_procedimento`, `tb_equipe`, `tb_tipo_equipe`;
- auxiliares/fallbacks: `tb_fat_cad_individual`, `tb_fat_visita_domiciliar`, `tb_fat_vacinacao`, `tb_fat_atd_ind_procedimentos`, `tb_fat_atd_ind_exames`, `tb_fat_atendimento_odonto`, `tb_dim_tempo`;
- CID/CIAP/procedimentos no contexto de gestação, exames e acompanhamento.

No banco `esus` observado, as tabelas existem, mas os fatos estão vazios e dimensões críticas estão incompletas (`tb_dim_tempo = 0`, `tb_dim_imunobiologico = 0`, `tb_dim_cid = 1`). Portanto, **C3 não pode ser validado oficialmente neste banco**.

### Relação com o relatório anterior C2/C3

O relatório `validacao-final-c2-c3-2026-05-23.md` registra:

- status: `CODE_COMPLETE_SCHEMA_MAPPED_VALIDATION_PENDING`;
- testes sintéticos e typecheck passando;
- schema discovery antigo aprovado;
- smoke real C2/C3 pendente;
- PostgreSQL porta 5432 como réplica simplificada insuficiente;
- PostgreSQL porta 5433 como PEC real Barra do Choca offline naquele momento.

Nesta auditoria, a porta 5433 está acessível, mas o banco `esus` contém fatos críticos vazios. O bloqueio mudou de “serviço offline” para **“serviço acessível, porém fonte de dados insuficiente/incompleta para validação oficial”**.

## 10. Alinhamento com o modelo canônico esperado

Modelo esperado:

`parceiro(CNPJ) -> município(IBGE) -> unidade(CNES) -> equipe(INE + tipo) -> profissional(identificador protegido + CBO) -> paciente(chave protegida) -> eventos clínicos/procedimentos/vacinas/exames/visitas`

### O que existe estruturalmente no PEC/DW observado

| Nível canônico | Evidência de schema | Estado |
| --- | --- | --- |
| Município / IBGE | `tb_dim_municipio.co_ibge` | presente; 1 linha observada |
| Unidade / CNES | `tb_dim_unidade_saude.nu_cnes`, `tb_unidade_saude.nu_cnes` | presentes; dimensão com 1 linha, operacional com 0 |
| Equipe / INE | `tb_dim_equipe.nu_ine`, `tb_equipe.nu_ine`, `tb_tipo_equipe.nu_ms` | presentes; `tb_equipe` sem linhas |
| Profissional / CBO | `tb_dim_profissional`, `tb_dim_cbo.nu_cbo`; fatos usam `co_dim_profissional_*` e `co_dim_cbo_*` | presente no schema; fatos vazios |
| Paciente / chave protegida | `tb_fat_cidadao_pec.co_seq_fat_cidadao_pec` | tabela presente, 0 linhas |
| Eventos clínicos | `tb_fat_atendimento_individual`, `tb_fat_atd_ind_procedimentos`, `tb_fat_atd_ind_exames`, `tb_fat_vacinacao`, `tb_fat_visita_domiciliar` | tabelas presentes, 0 linhas |
| Diagnóstico/condição | `tb_dim_cid`, `tb_dim_ciap`, filtros em fatos | presentes; incompletos/vazios nos fatos |
| SIGTAP | `tb_dim_procedimento.co_proced` | presente com 303 linhas |
| Imunobiológicos | `tb_dim_imunobiologico`, `tb_imunobiologico` | dimensão vazia; cadastro operacional com 102 linhas |

### O que falta para o modelo canônico ficar operacional

1. **Parceiro por CNPJ**: não foi confirmado vínculo físico app-level entre parceiro/CNPJ e município/IBGE no banco alcançável.
2. **Banco app/analytics ativo**: `sus_analytics_app` está indisponível; sem ele, tabelas de agente, tenants, pagamentos, correções e RBAC não foram confirmadas.
3. **Dados fatos reais**: principais `tb_fat_*` estão vazias.
4. **Dimensão temporal**: `tb_dim_tempo` está vazia; isso bloqueia período oficial robusto.
5. **Vínculos equipe/unidade operacionais**: `tb_equipe` e `tb_unidade_saude` estão vazias, mesmo com dimensões mínimas presentes.
6. **Política LGPD de chave protegida**: o schema tem colunas sensíveis como CPF/CNS/nome em tabelas PEC; relatórios analíticos devem usar chaves técnicas/hash e minimização.

Conclusão: o fluxo está **parcialmente alinhado no desenho de schema**, mas **não está alinhado operacionalmente** ao modelo canônico esperado.

## 11. Suficiência para painel operacional e cálculo oficial

### Painel operacional

O banco atual observado **não é suficiente** para painel operacional real porque:

- não há fatos de atendimento, vacinação, visitas, procedimentos ou cidadãos no `esus` observado;
- não há confirmação física do banco app/analytics `sus_analytics_app`;
- Redis não estava ativo em `127.0.0.1:6379` no momento da auditoria;
- o `.env` ativo aponta para bancos/portas que não responderam.

Ele pode servir apenas para:

- validação de existência de tabelas/colunas;
- smoke estrutural;
- comparação com schema discovery antigo;
- desenvolvimento de guards de schema.

### Cálculo oficial C2/C3

O banco atual observado **não é suficiente** para cálculo oficial C2/C3 porque:

- C2/C3 dependem de eventos clínicos e vínculos reais;
- tabelas fato necessárias estão vazias;
- `tb_dim_tempo` está vazia;
- `tb_equipe` e `tb_unidade_saude` operacionais estão vazias;
- dimensões clínicas/nacionais estão incompletas no banco observado;
- não há amostra real validada por município/equipe/período;
- a fonte configurada pelo `.env` não é a fonte realmente acessível.

Portanto, qualquer resultado de C2/C3 neste estado deve ser classificado como **não oficial** ou **bloqueado por fonte de dados**, não como validação final.

## 12. Riscos técnicos atuais

| Risco | Impacto | Severidade |
| --- | --- | --- |
| Drift entre `.env` ativo e banco realmente acessível | Backend usa `5432/esus_restore_20260424`, mas único PEC acessível está em `5433/esus` | Alta |
| Banco app/analytics indisponível | Persistência de agente, pagamentos, correções e RBAC não confirmada | Alta |
| Fatos PEC vazios | Painel e indicadores podem retornar vazio/zero sem valor oficial | Alta |
| Réplica simplificada confundida com PEC/DW | Cálculo oficial pode ser validado contra fixture insuficiente | Alta |
| Autodiscovery vs env-first | Credenciais reais do PEC podem ser ignoradas se `.env` estiver stale | Média/Alta |
| Presença de colunas sensíveis no PEC | Risco LGPD se dumps/relatórios copiarem CPF/CNS/nome | Alta |
| Workspace git inconsistente | Alto risco de commit acidental, perda de rastreabilidade ou diff impossível | Alta |
| `pnpm` direto fora do PATH | Execução local depende de Corepack; comandos documentados podem falhar | Baixa/Média |
| Redis indisponível | Cache/fila/estado opcional degradado | Média |
| `DATABASE_URL` vs `SUS_ANALYTICS_DATABASE_URL` | Duas variáveis podem sugerir bancos diferentes em backups/docs | Média |
| C2/C3 com N+1 queries citado no relatório anterior | Pode degradar em volume real | Média/Alta |

## 13. Decisões arquiteturais antes de continuar C4/C5

1. **Fixar o banco canônico de validação Saúde Brasil 360**
   Decidir se o alvo oficial local é `127.0.0.1:5433/esus`, outro restore PEC, ou uma réplica normalizada. Atualizar configuração depois, em tarefa separada e autorizada.

2. **Separar formalmente três papéis de banco**
   - `APP_DB`: aplicação, tenants, agentes, pagamentos, correções, RBAC;
   - `PEC_DW`: fonte completa PEC/e-SUS/SISAB para cálculo oficial;
   - `PEC_REPLICA`: réplica simplificada ou staging de sync, nunca fonte oficial sem contrato.

3. **Definir contrato multi-tenant físico**
   Garantir vínculo `parceiro(CNPJ) -> município(IBGE) -> unidade(CNES) -> equipe(INE/tipo) -> profissional/CBO -> paciente/chave protegida -> eventos` em tabelas app/analytics ou views controladas.

4. **Definir chave protegida de paciente**
   Não usar CPF/CNS como identificador analítico. Usar chave técnica, hash com salt controlado ou identificador interno minimizado, com rastreabilidade e LGPD.

5. **Confirmar dimensões oficiais necessárias para C4/C5**
   Antes de C4/C5, validar CNES, INE, CBO, SIGTAP, CID-10, CIAP-2, imunobiológicos e período oficial contra fonte real e normas.

6. **Exigir smoke real não vazio**
   Nenhum indicador novo deve ser marcado como `READY` sem smoke contra banco real com fatos não vazios, período conhecido, município/equipe conhecidos e contagens plausíveis.

7. **Documentar contrato de fallback**
   Definir quando `PEC_DB_*` pode ser usado como fallback de `PEC_REPLICA_*` e como isso aparece em logs/readiness.

8. **Resolver app DB antes de depender de workflows operacionais**
   Painel operacional, agente, correções, pagamentos e RBAC precisam de `SUS_ANALYTICS_DATABASE_URL` funcional.

## 14. Recomendações imediatas sem executar mudanças nesta tarefa

1. Não prosseguir C4/C5 como oficial até resolver fonte real e app DB.
2. Planejar uma tarefa separada para alinhar `.env`, `.env.docker`, compose e docs com o banco canônico.
3. Executar, em tarefa própria, smoke real C2/C3 contra banco PEC com fatos não vazios.
4. Criar um checklist LGPD para qualquer exportação/relatório: nunca CPF/CNS/nome/endereço/telefone; apenas agregados e chaves protegidas.
5. Confirmar se `esus_restore_20260424` deve ser recriado, substituído por `esus`, ou removido das configurações locais.
6. Confirmar onde vive o `APP_DB` (`sus_analytics_app` ou outro) e se migrations de app devem ser aplicadas em ambiente controlado.

## 15. Rastreabilidade de segurança

- Nenhuma migration foi executada.
- Nenhuma tabela foi criada, alterada ou removida.
- Nenhum `.env` foi alterado.
- Nenhum script foi alterado.
- Nenhum commit foi feito.
- Consultas SQL executadas foram somente leitura (`pg_database`, `information_schema`, `pg_catalog` e `COUNT(*)` agregado em tabelas críticas).
- Senhas, tokens, CPF/CNS e dados nominais não foram reproduzidos neste relatório.
- Foi identificada presença de valores sensíveis em `.env*` locais não rastreados; eles não foram copiados.

## 16. Rollback desta tarefa

Única alteração feita: criação deste arquivo Markdown.

Rollback seguro, se necessário: remover/reverter `docs/13-saude-brasil-360/database-current-state-analysis-2026-05-23.md`. Nenhum estado de banco, schema, `.env`, migration, script ou código-fonte foi alterado.
