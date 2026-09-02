# Contexto operacional de município e conexão

## Estado auditado

Este documento registra a auditoria anterior à implementação do seletor de
município/conexão. O Fatura APS foi consultado apenas como referência funcional;
não existe dependência de código, runtime, estilo ou contrato entre os produtos.

Auditoria executada em 2026-08-02:

- e-SUS APS 360: branch `release/design-system-consolidation-20260801`, HEAD
  `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611`;
- Fatura APS: branch `bpa-Insight-separate`, HEAD
  `6cfd1217abf0fec9b6d6867f46ac3c5e036dfe4d`;
- runtime e-SUS ativo: PostgreSQL `sus_analytics_app`, consultado somente por
  metadados e contagens, sem expor credenciais ou dados pessoais;
- nenhum arquivo do Fatura APS foi alterado.

## Matriz comparativa obrigatória

| Responsabilidade | Fatura APS | e-SUS APS 360 antes desta entrega | Reutilizar conceito | Implementar |
|---|---|---|---:|---:|
| Lista de escopos autorizados | Sessão e validações de parceiro/município/agente no backend | Não existe endpoint; telas administrativas listam catálogos globais | Sim | Sim, derivada de identidade, vínculo e entidades persistidas |
| Município ativo | Preferência por usuário revalidada pelo servidor | Escopo B360 único e isolado do restante do produto | Sim | Sim, como preferência validada e não como autorização |
| Parceiro ativo | Parte da chave e da validação | `public.users.parceiroId` existe, mas não chega ao contexto tRPC | Sim | Sim, sempre explícito na chave composta |
| Conexão ativa | Agente/dataset fazem parte do recorte | `agent_registrations` possui identidade persistida; não há política de conexão primária | Sim | Sim, seleção explícita quando houver mais de uma conexão |
| Status do agente | Estado operacional separado da autorização | Heartbeats existem, mas endpoints atuais agregam agentes globalmente | Sim | Sim, status por conexão sem retirar município offline da lista |
| Persistência da seleção | Preferência persistida e revalidada | Não existe preferência operacional canônica | Sim | Sim, no servidor, com revogação e versão |
| Invalidação de cache | Cancelamento, geração de request e limpeza de cache de sessão | TanStack Query possui muitas chaves municipais globais | Sim | Sim, troca atômica, cancelamento e hash escopado |
| Auditoria | Troca registra evento sanitizado | Não existe evento de troca de contexto | Sim | Sim, `OPERATIONAL_SCOPE_CHANGED` com correlation id |
| Segurança backend | Cada escopo é validado antes do uso | `protectedProcedure` autentica, mas não aplica tenant/município; várias rotas confiam em filtros do cliente | Sim | Sim, fail closed e contexto resolvido no Core |

## Entidades reais e autoridade

### Catálogo operacional escolhido

O catálogo operacional canônico para esta feature é o conjunto já persistido no
schema `public`:

- `public.users`: identidade de sessão, papel e `parceiroId`;
- `public.parceiros`: parceiro cadastrado e seu estado;
- `public.municipios`: município, código IBGE, UF, parceiro e estado;
- `public.agent_registrations`: conexão registrada, agente, instalação, tenant,
  parceiro, município, código IBGE e estado;
- `public.agent_registry`: heartbeat e estado recente do agente;
- `public.agent_heartbeats`: histórico operacional;
- `sus_analytics_ingest.normalized_records`: registros persistidos por
  `tenant_id` e `municipality_id`, independentes do agente estar online.

`agent_registrations.id` representa a identidade persistida de uma conexão.
`agentId` representa o agente e `installationId` representa sua instalação. Um
município pode ter zero, uma ou várias conexões; o banco auditado contém mais de
uma conexão ativa para o mesmo município.

### Fontes que não são autoridade do seletor

- `sus_analytics.municipalities` e `sus_analytics.agent_installations` não são
  usados como autoridade porque os registros auditados não correspondem ao
  catálogo e às inscrições reais do schema `public`;
- `agent_registry` sozinho não prova vínculo do usuário, tenant ou parceiro;
- heartbeat, snapshot, cache, navegador e disponibilidade do agente não
  concedem autorização;
- `b360_user_scopes` permanece uma fronteira específica do B360 e tem índice
  único por usuário; isoladamente não modela múltiplos escopos;
- `rbac_user_scopes` também é unitário e possui fallback em memória; não é
  autoridade adequada para alternância multi-município em produção.

## Contrato de contexto

```ts
type ActiveOperationalScope = {
  key: string;
  version: number;
  tenantId: string;
  partnerId: string;
  partnerName: string;
  municipalityId: string;
  municipalityIbge: string;
  municipalityName: string;
  municipalityUf: string | null;
  connectionId: string | null;
  agentId: string | null;
  installationId: string | null;
  connectionStatus:
    | "online"
    | "offline"
    | "syncing"
    | "no_agent"
    | "no_snapshot"
    | "connection_error"
    | "unknown";
  lastSeenAt: string | null;
  lastSyncAt: string | null;
};
```

A chave é a serialização canônica de
`tenantId + partnerId + municipalityId + municipalityIbge + connectionId`.
Os valores são identificadores persistidos; nome de município nunca é chave.
Quando não há agente, `connectionId`, `agentId` e `installationId` são nulos, mas
tenant, parceiro e município continuam explícitos.

## Política para múltiplas conexões

Não existe coluna de conexão primária no Core auditado. Portanto:

- uma única conexão autorizada é exibida diretamente;
- duas ou mais conexões do mesmo município são opções distintas;
- o backend não escolhe silenciosamente o agente online;
- conexão inativa ou revogada não é selecionável;
- o estado offline altera apenas capacidades dependentes do agente;
- a troca de contexto nunca cria comando, coleta, tarefa ou sincronização.

## Fonte de verdade de autorização

A lista efetiva é a interseção, validada no backend, entre:

1. usuário autenticado e ativo;
2. papel real da sessão;
3. vínculos persistidos do usuário;
4. parceiro ativo;
5. município ativo pertencente ao parceiro;
6. conexão ativa pertencente ao mesmo tenant/parceiro/município, quando houver;
7. permissão da operação solicitada.

O modelo precisa de vínculos multi-escopo e preferência ativa próprios no mesmo
banco do Core. Isso é extensão do modelo existente, não um banco ou serviço
paralelo. Ausência, ambiguidade ou indisponibilidade dessa persistência falha
fechado.

## Papéis reais encontrados

| Papel | Origem | Escopos visíveis | Pode trocar | Seleção explícita | Backend valida |
|---|---|---|---:|---:|---:|
| `user` | enum de sessão `public.role` | Somente memberships ativos | Se houver mais de um | Sim | Sim |
| `partner_admin` | enum de sessão `public.role` | Memberships ativos do parceiro da sessão | Sim | Sim | Sim |
| `admin` | enum de sessão `public.role` | Somente memberships administrativos ativos | Sim | Sim | Sim |
| `super_admin` | enum de sessão `public.role` | Somente memberships globais ativos; nenhum acesso global implícito | Sim | Sim | Sim |
| `master_admin` | `sus_analytics.users` | Não é claim reconhecido pela sessão web atual | Não até integração explícita | Sim | Sim |
| `GESTOR_MUNICIPAL` | RBAC B360 legado | Escopo unitário legado | Não no modelo legado | Sim | Sim |
| `GESTOR_UNIDADE` | RBAC B360 legado | Município/unidade do vínculo legado | Não no modelo legado | Sim | Sim |
| `COORDENADOR_EQUIPE` | RBAC B360 legado | Município/unidade/equipe do vínculo legado | Não no modelo legado | Sim | Sim |
| `ACS` | RBAC B360 legado | Equipe do vínculo legado | Não no modelo legado | Sim | Sim |
| `AUDITOR` | RBAC B360 legado | Escopo atribuído; sem global implícito | Conforme membership | Sim | Sim |
| `READONLY` | RBAC B360 legado | Escopo atribuído e somente leitura | Conforme membership | Sim | Sim |

Papéis administrativos não recebem todos os municípios por inferência. A
provisão de memberships é explícita e auditável. Para compatibilidade, vínculos
B360 válidos podem ser migrados para memberships, mas jamais o inverso por
heurística.

## Estado atual das consultas

O Core possui uma fronteira segura no read model Rust do B360: tenant e município
são resolvidos pelo servidor e aplicados ao SQL. O restante do produto ainda
apresenta lacunas:

- `AuthenticatedUser` não transporta tenant, parceiro ou município;
- `protectedProcedure` apenas autentica;
- rotas PEC/Previne recebem equipe, unidade, INE ou município do cliente;
- o pool PEC é único para o processo;
- várias tabelas territoriais persistidas não possuem colunas tenant/município;
- query keys como `pec-summary`, `teams`, `homeVisits` e `qualityIssues` são
  globais;
- endpoints de status e administração agregam agentes de todos os municípios.

Consequentemente, a UI só poderá considerar uma página municipal liberada após
o backend dessa página consumir o contexto autorizado. Rotas ainda não migradas
devem falhar fechadas ou permanecer bloqueadas; nunca podem reutilizar o pool PEC
global sob um rótulo de outro município.

## Realtime, polling e agente offline

Não foi encontrada assinatura SSE/WebSocket municipal ativa no frontend
canônico. Existem intervalos e refetches pontuais; todos deverão ser encerrados
pela geração do contexto durante a troca. O TanStack Query é a autoridade de
cache do frontend.

Heartbeat e conexão online são estado operacional. Município autorizado e dados
normalizados persistidos continuam disponíveis offline. Apenas sincronização,
diagnóstico local, comando e coleta dependem do agente online.

## Conceitos aproveitados e elementos rejeitados do Fatura APS

Conceitos aproveitados:

- árvore de opções agrupada por parceiro;
- validação de escopo no servidor;
- preferência revalidada;
- cancelamento por geração e descarte de respostas antigas;
- limpeza do cache de sessão no switch e no logout;
- separação entre autorização e disponibilidade do agente.

Elementos que não serão copiados:

- montagem de opções a partir de agentes/datasets;
- fallback de opções no frontend;
- opção global silenciosa para superadmin;
- endpoint de troca com semântica de configuração de banco;
- side effects de coleta ao trocar;
- CSS inline, componentes legados, paleta, radius e tipografia do Fatura APS.

## Estado implementado em 2026-08-02

O modelo acima foi implementado no Core, sem dependência do Fatura APS:

- `operational_scope_memberships` mantém grants explícitos e revogáveis;
- `operational_scope_preferences` mantém a seleção ativa e sua versão;
- `operational_scope_audit_events` registra sucesso e negação sem PII;
- `partner_admin` deriva opções somente das conexões ativas do próprio parceiro;
- demais papéis dependem de membership explícito, inclusive `super_admin`;
- a troca usa transação, advisory lock, valida novamente o alvo e espelha o
  tenant/IBGE ativo para a fronteira B360;
- o frontend cancela e remove queries municipais, incrementa a geração do
  contexto, remonta a rota e descarta tentativas antigas;
- cache TanStack e caches server-side relevantes incorporam escopo/versão ou o
  vínculo imutável da fonte física;
- logout limpa runtime e cache do contexto;
- município offline continua selecionável; somente ações dependentes do agente
  ficam indisponíveis.

O pool PEC legado continua sendo uma fonte física não particionada. Por isso,
`/api/pec/*`, `/api/b360/*` e routers tRPC municipais legados usam o mesmo guard
fail-closed e exigem `PEC_OPERATIONAL_SCOPE_IBGE` mais
`PEC_OPERATIONAL_SCOPE_CONNECTION_ID`. O IBGE e a conexão precisam coincidir
com o contexto ativo. Rotas sem vínculo retornam 503; divergências retornam 403.
O read model Rust B360 também exige que seu tenant/município persistido coincida
com o contexto operacional atual.

O seletor canônico fica entre a marca e o primeiro item de navegação. Ele usa
somente componentes/tokens do Design System consolidado, agrupa por parceiro,
distingue conexões do mesmo município, expõe busca para catálogos maiores,
estado online/offline/sincronizando/sem agente e navegação completa por teclado.
