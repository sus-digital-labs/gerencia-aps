# Autoridade de cálculo em Rust

## Decisão

O estado alvo atribui ao runtime Rust a autoridade exclusiva por recepção,
validação, idempotência, state machine, normalização, cálculo versionado e
materialização dos indicadores. O backend TypeScript permanece como BFF:
autentica, autoriza o escopo persistido do usuário, aplica paginação/filtros e
entrega DTOs já calculados. O navegador não define tenant/município e não
recalcula score, janela ou situação oficial.

Esta decisão é um **GO condicionado por indicador**, não um cutover global.
Em 25/07/2026, somente M1 e M2 estão `ACTIVE_AND_PROVEN`. B3, B5 e B6 têm
implementação, resultado histórico, golden e dual-run, mas permanecem
registrados e fail-closed porque a fonte disponível não comprova o vínculo
oficial eSB→eSF/eAP. C1/C2 também estão registrados e fail-closed; os outros
14 cálculos também estão reservados ao Rust e fail-closed, mas ainda precisam
cumprir individualmente todos os gates descritos neste documento.

## Evidência do estado atual

### Source

- `Apps/ingest/dm-sync-ingest` já recebe chunks gzip autenticados, valida o
  envelope e persiste o payload de forma idempotente antes de publicar no
  Redis Stream.
- `dm-sync-normalizer` Rust é o worker ativo sobre a state machine de chunks.
- O registry de cálculo Rust v7 é fechado nos 21 códigos B1-B6, C1-C7,
  CVAT1-CVAT6 e M1-M2. Somente M1 e M2 possuem todos os gates correntes para
  consumo ativo.
- B3/B5/B6 possuem fatos clínicos reais e resultados históricos, mas os três
  manifestos existentes não estão vinculados a uma prova canônica de equipe.
  O gate odontológico preservado pelo registry v7 exige essa proveniência e
  mantém os indicadores bloqueados.
- O frontend dos indicadores registrados não deriva janela, score ou situação
  oficial; apenas formata o valor materializado quando o gate do BFF autoriza.
  Os indicadores ainda bloqueados precisam cumprir seus gates individuais de
  fonte, golden, dual-run, auditoria e painel.
- Em 26/07/2026, o BFF v7 foi publicado de forma fail-closed: o processo e o
  resumo sem valores TypeScript responderam. O read source operacional foi
  corrigido de `pec` para `analytics`, alinhando o runtime aos read models
  persistidos. `/readyz` permaneceu HTTP 503 porque o catálogo de sincronização
  detectou permissões de origem e relações requeridas ausentes. Isso bloqueia
  promoção operacional, não autoriza inferência nem substitui os gates clínicos
  individuais.

### Runtime observado em 2026-07-20

- Receiver Rust e backend responderam `healthz`/`readyz` com PostgreSQL e Redis
  disponíveis.
- O banco compartilhado continha 1.340 chunks processados e 20 chunks antigos
  em `processing/queued` sem `processed_at`.
- O grupo Redis `sync-normalizers` mantinha 20 mensagens pendentes atribuídas a
  consumidor anterior, sem uso de `XAUTOCLAIM` no código.
- O worker TypeScript libera a transação após marcar `processing`, não grava
  lease/fencing e executa `XACK` também no caminho de erro. Uma queda pode
  órfãr o chunk sem possibilidade automática de recuperação.
- Operações `delete` são aceitas pelo receiver, mas descartadas pelo
  normalizador TypeScript.

### External-compose

- A aplicação usa o PostgreSQL e Redis compartilhados do grupo `anton-infra`;
  nenhum banco, cache ou volume persistente é criado no Compose da aplicação.
- O Compose de produção inicia API Node, receiver Rust e normalizador
  TypeScript. Durante shadow/dual-run, apenas um worker pode estar em modo
  ativo sobre a state machine de chunks.

## Fronteira de autoridade

| Responsabilidade | Durante o piloto | Estado alvo |
| --- | --- | --- |
| Recepção, validação e persistência idempotente do chunk | Rust | Rust |
| Claim, lease, retry, DLQ, tombstone e normalização | TS ativo; Rust shadow | Rust |
| Regras oficiais B3/B5/B6 | Rust implementado; consumo bloqueado pela prova eSB→eSF/eAP ausente | Rust |
| Regras oficiais M1/M2 | Rust ativo e comprovado | Rust |
| C1/C2 | Rust registrado, fail-closed por gates de fonte/evidência | Rust |
| Demais 14 métricas | Rust registrado, consumo fail-closed | Rust, após gates individuais |
| Autenticação, RBAC, paginação, filtros e DTO | TypeScript | TypeScript |
| Score/janela/situação oficial no browser | apresentação de read model Rust; sem fallback | proibido |

PostgreSQL é a fonte de verdade semântica. Redis Streams acelera descoberta e
distribuição de trabalho, mas uma mensagem só pode ser reconhecida após um
resultado durável no PostgreSQL. `SKIP LOCKED` é usado apenas para concorrência
na fila; lease com fencing decide quem pode concluir o processamento.

## State machine e garantias

```text
persisted|queued|failed_due|processing_expired
  -> processing(lease_owner, lease_token, lease_expires_at)
  -> processed
  -> failed + pending(next_retry_at)
  -> dead_letter
```

Regras obrigatórias:

1. Claim e criação do token de fencing ocorrem em uma transação curta.
2. Toda conclusão filtra por `chunk_id`, `lease_owner` e `lease_token`.
3. A transação de normalização aplica dados scoped, tombstones, lineage e estado
   final de forma atômica.
4. Falha faz rollback e uma transação curta grava retry/backoff sanitizado.
5. `XACK` só ocorre para `processed`, `already_processed` ou retry/DLQ já
   persistido. Outcome desconhecido ou perda do fencing não recebe ACK.
6. `XAUTOCLAIM` recupera pendentes órfãos; polling PostgreSQL mantém progresso
   quando Redis estiver indisponível.
7. `SIGINT`/`SIGTERM` interrompem novos claims e deixam trabalho incompleto
   recuperável por expiração da lease.
8. Delete só existe por tombstone explícito. Ausência em página incremental ou
   snapshot incompleto nunca implica exclusão.

## Contratos persistidos

### Estado operacional

`sus_analytics_ingest.sync_chunks` recebe, de forma aditiva e idempotente:

- `lease_owner`, `lease_token`, `lease_expires_at`;
- `processing_started_at` e `normalizer_version`;
- retry/backoff e estado terminal preservando o payload durável.

### Normalização autoritativa

`sus_analytics_ingest.normalized_records` usa chave composta
`(tenant_id, municipality_id, source_table, source_key)` e registra schema,
operação, hashes, payload protegido, run/table/chunk de origem, timestamps e
estado de exclusão. A tabela de tombstones é append-only, idempotente por
chunk/tabela/chave e não duplica PII em colunas operacionais.

### Read models

Todo resultado materializado inclui no mínimo:

- `tenant_id`, `municipio_id`, `competencia` e `indicator_id`;
- granularidade e identificador de município, CNES e/ou INE;
- numerador, denominador, valor e dimensões agregadas permitidas;
- `rule_version`, `schema_version`, `source_snapshot` e `pipeline_run_id`;
- `calculated_at`, qualidade/freshness e lineage reproduzível.

Read models são produzidos por SQL set-based, snapshots ou materialized views
quando isso reduzir custo. Loops por cidadão em Rust não são aceitos como
substituto de uma consulta set-based sem benchmark que prove a necessidade.

## Escopo e segurança no BFF

O BFF resolve `tenant_id` e `municipio_id` a partir de uma associação
persistida ao usuário autenticado. Município não pode determinar tenant por
inferência: o runtime atual possui município associado a mais de um tenant.
Escopo ausente, inativo, ambíguo ou indisponível falha fechado com erro tipado.
Filtros enviados pelo cliente somente restringem um escopo já autorizado.

O piloto retorna apenas agregados. CNS, CPF, nome, endereço, payload nominal,
credenciais e tokens não aparecem em logs, DTOs, tombstones ou artefatos de
teste. Logs operacionais incluem request/correlation id, tenant, município,
indicador, versão da regra, run e contagens não nominais.

## Piloto C2

O contrato normativo é `C2@2026.4`, baseado na Nota Metodológica C2 SEI
`0054824593`, publicada em 24/06/2026. Ela revoga a edição `0049702562`
versionada anteriormente no repositório. Entre as mudanças verificadas estão:

- exigência de Problema/Condição Avaliada `Puericultura` nas consultas A/B;
- inclusão de CBOs adicionais para antropometria;
- vacina ou transcrição com todas as doses recomendadas;
- pontuação integral da boa prática D para eAP tipo 76.

O resultado legado `C2@B360-2026.3` é somente baseline. Divergência esperada
por mudança normativa recebe reason code; divergência sem explicação bloqueia
cutover. Fato normativo ausente produz estado explícito de cobertura bloqueada,
nunca zero inferido.

### Contrato do consumidor Rust

O corte de leitura é individual e não promove indicadores sem evidência:

- `Dashboard` e `IndicatorDetail` consultam `b360ReadModel.aggregate` para
  qualquer um dos 21 códigos quando a autoridade estiver ativa;
- todos os códigos registrados usam exclusivamente o consumidor genérico do
  read model Rust; desativação ou falta de readiness significa
  indisponibilidade explícita, nunca fallback TypeScript;
- o browser envia somente competência e filtros restritivos CNES/INE; tenant e
  município continuam sendo resolvidos pelo BFF a partir do usuário autenticado;
- o BFF devolve `selection=SELECTED|REQUIRED|NOT_MATERIALIZED`. Como o resultado
  Rust é materializado por INE, `REQUIRED` obriga a escolha de equipe e proíbe
  agregar ou escolher uma linha no browser;
- `metric_value` é o score médio persistido, em pontos por criança elegível
  (`earned_points / eligible_count`, faixa 0..100). A UI apenas formata esse
  valor como `pts`; ela não refaz a divisão nem deriva o score oficial;
- `BLOCKED_BY_SOURCE`, `EMPTY_DENOMINATOR`, `FAILED`, `CANCELLED`, ausência de
  materialização e falha de RBAC possuem estados explícitos. Valores numéricos
  não são renderizados em bloqueio/erro;
- histórico, comparativo e listas nominais do legado não são acionados para C2.
  O painel informa que o read model atual é agregado, sem fallback silencioso.

O DTO do browser valida versão `C2@2026.4`, schema 1, status, invariantes
numéricas, seleção de escopo e lineage. Contrato inválido falha fechado.

### Registry e consumidor genérico

O BFF expõe `b360ReadModel.authorityRegistry` e
`b360ReadModel.aggregate`. A allowlist v7 é fechada nos 21 códigos do registry
Rust; qualquer outro código é rejeitado pelo schema de entrada. O SQL recebe
código, versão e schema exclusivamente do registry do servidor, depois de
resolver tenant e município no escopo persistido do usuário.

- `C1@2026.4` e `C2@2026.4` permanecem `DISABLED` por padrão.
  `b360ReadModel.c2Aggregate` é mantido apenas como adapter compatível e aplica
  exatamente o mesmo gate do consumidor genérico.
- M1/M2 foram ativados no escopo provado após resultado, golden, dual-run e
  auditoria persistidos.
- A ativação anterior de B3/B5/B6 foi invalidada quando a regra oficial de
  vínculo de equipe foi confrontada com as fontes reais. A migration
  `0011_dental_team_authority` e o registry v7 exigem registro `READY`,
  homologação ministerial, padrão de vínculo exato e hashes da autoridade no
  manifesto clínico. Na ausência dessa prova, flags em `true` ainda resultam
  em `READINESS_REQUIRED`.
- As defaults de Compose e `.env.example` continuam `false`; no runtime
  corrigido, B3/B5/B6 estão explicitamente desativados.
- Cada indicador só passa a `RUST_READ_MODEL` quando suas variáveis
  `B360_RUST_<CODIGO>_AUTHORITY_ENABLED=true` e
  `B360_RUST_<CODIGO>_PARITY_APPROVED=true` estiverem presentes no mesmo
  runtime **e** o BFF comprovar materialização atual e auditoria persistida
  `READY_FOR_REVIEW` para competência, tenant, município e filtros autorizados.
- C1 desabilitado não consulta o cálculo TypeScript, listas nominais,
  histórico ou comparativo por equipe. O browser apresenta um estado explícito
  sem numerador, denominador, percentual ou zero sintético.
- C1 usa janela mensal (`AAAA-MM-01` até o fim da competência). A avaliação
  quadrimestral é cadência de acompanhamento e não amplia a janela para quatro
  meses; essa regra vale tanto no estado desabilitado quanto após o cutover.
- Ao ativar C1, falha de materialização, contrato, RBAC ou banco permanece
  erro/bloqueio Rust; não há fallback para `saudeBrasil360.calcularIndicador`.
- Os routers legados `saudeBrasil360`, `indicadores` e `previneBrasil` recusam
  qualquer código registrado com `B360_RUST_AUTHORITY_REQUIRED` antes de cache,
  banco ou executor TypeScript. Desativar a autoridade significa
  indisponibilidade, não restauração do cálculo legado.
- O resumo REST legado `/api/pec/indicators/summary` não é uma fonte de read
  model. Para C1/C2 ele devolve apenas `authority=rust_read_model`,
  `status=rust_read_model_required`, `errorCode=UNAVAILABLE_IN_PEC_SUMMARY` e
  campos numéricos `null`; nunca afirma materialização sem consultar o read
  model, usa contagens PEC como denominador ou sintetiza zero. O endpoint
  autoritativo é `b360ReadModel.aggregate`; códigos ainda não registrados
  mantêm o contrato existente até seu próprio lote.
- As query keys incluem CNES/INE resolvidos e `cacheVersion` do registry. Uma
  mudança `DISABLED -> RUST_READ_MODEL` não reutiliza cache legado.

O contrato C1 usa os campos persistidos `numerator_count`,
`denominator_count` e `metric_value`. O BFF valida contagens, versão, documento
fonte e invariantes, mas não recalcula o percentual. Os DTOs e logs continuam
agregados e não carregam CPF, CNS, nome, endereço ou payload nominal.

## Rollout e gates de cutover

1. Baseline imutável de resultados, tempos, fontes e versões.
2. Rust `disabled` por padrão e shadow sem claim nem escrita de produto.
3. Testes unitários, property-based/golden e integração real PostgreSQL/Redis.
4. Dual-run C2 com comparação por reason code e cobertura de todos os fatos.
5. Parada controlada do worker TypeScript; ativação exclusiva do worker Rust.
6. Recuperação dos órfãos PostgreSQL/Redis e prova de convergência do backlog.
7. BFF lê read model scoped; browser prova `React -> BFF -> PostgreSQL` sem
   cálculo oficial no cliente.
8. Observação por janela acordada; rollback ensaiado.
9. Migração individual das 14 métricas ainda não registradas.
10. Remoção do legado somente após todos os consumidores e métricas migrarem.

Nenhum gate não executado é sucesso. Dependência externa indisponível é `SKIP`;
timeout, payload inválido, resposta vazia ou diferença sem causa é `FAIL`.

## Observabilidade

- `healthz` comprova vida do processo; `readyz` comprova PostgreSQL, Redis,
  migrações e capacidade de claim conforme o modo.
- Métricas: chunks por estado, leases ativas/expiradas/perdidas, retries/DLQ,
  backlog PostgreSQL, pending/lag Redis, duração e throughput, freshness dos
  read models e divergência Rust x legado por reason code.
- Runbook inclui diagnóstico e recuperação sem apagar checkpoints, payloads ou
  streams.

Janus não é introduzido neste ciclo porque não há requisito de presença,
mensageria interativa ou áudio/vídeo; o fluxo já possui Redis Streams para
descoberta assíncrona e PostgreSQL para verdade transacional. Se a UI passar a
exigir push em tempo real, Janus pode transportar notificações, sem se tornar a
autoridade de cálculo.

## Rollback

1. Parar novos claims Rust.
2. Aguardar conclusão ou expiração das leases; não limpar stream/checkpoints.
3. Reenfileirar somente leases Rust expiradas e não processadas, com filtro
   revisado.
4. Redeployar uma imagem Rust anterior revisada; rollback para o normalizador
   TypeScript removido não é suportado.
5. Verificar contagens por estado, pending Redis, read models e amostras
   representativas antes de retomar ingestão.
6. Reverter código/Compose sem reescrever histórico. Migrações aditivas podem
   permanecer inativas; down migration destrutiva não é necessária.

## Riscos ainda bloqueantes

- cobertura completa dos joins/fatos normativos C2 no payload sincronizado;
- exportação oficial reproduzível do vínculo eSB `0001823299`→eSF/eAP,
  compatível com a carga horária e homologação registradas, para liberar
  B3/B5/B6;
- associação RBAC tenant/município sem backfill ambíguo;
- paridade de normalização para tabelas de referência, fatos e ACS;
- concorrência, reclaim, Redis/PostgreSQL indisponíveis e SIGTERM em testes
  reais;
- migração e prova individual das outras 14 métricas;
- desempenho set-based e retenção/LGPD sob volume de produção.
