# ADR — Fronteiras de autoridade da Academia PEC & Saúde Brasil 360

**Status:** aceito para a fundação, implementação funcional ainda bloqueada

**Data:** 2026-08-02

## Contexto

A Academia combinará conteúdo normativo, aprendizagem, conversas assistidas e dados dos indicadores. Essas áreas têm autoridades e níveis de sensibilidade diferentes. Uma integração direta do navegador com o Zuza ou a reimplementação de regras oficiais no BFF criaria risco de autorização, LGPD, divergência normativa e resultados sintéticos.

O runtime auditado em 2026-08-02 apresenta:

- `/healthz=200` e `/api/health=200`;
- PostgreSQL analítico e Redis conectados;
- `/readyz=503` por `syncCatalog=fail`;
- descoberta direta da fonte PEC com `source_permission_error`;
- Zuza `/health=200` e `/readyz=200`;
- nenhuma credencial M2M least-privilege aprovada para a Academia;
- nenhuma materialização Rust pseudonimizada por pessoa/regra para diagnóstico individual.

## Decisão

### Frontend

`Apps/web/client` apenas apresenta contratos autorizados emitidos pelo BFF. O navegador não chama Zuza, PostgreSQL, Redis, storage ou PEC diretamente e não fornece tenant/município como autoridade.

### BFF

`Apps/server/api` é o único backend web canônico da Academia. Ele resolve sessão e escopo, aplica permissões explícitas, coordena retrieval, CitationGuard, persistência, streaming e ferramentas reais. Ele não calcula indicadores oficiais.

### Rust

`Apps/rules/b360-rules` mantém autoridade exclusiva de regras, resultados, ruleVersion, lineage e freshness. Diagnóstico individual só será disponibilizado após uma materialização Rust pseudonimizada, versionada e sem CPF, CNS, nome ou payload clínico bruto.

### Zuza APS

O Zuza será apenas motor de geração/streaming por integração servidor-a-servidor. Antes da ativação, precisa de credencial de serviço com scope exclusivo, rota `no_fallback`, modo efêmero e testes negativos contra code, SSH, sandbox, tasks e administração.

### Fontes

Fontes normativas são versões binárias imutáveis verificadas por SHA-256 contra o manifesto oficial. Conteúdo não verificado, divergente ou revogado não entra no snapshot publicado.

### Flags

As quatro flags da fundação têm default `false`:

- `B360_ACADEMY_ENABLED`;
- `B360_KNOWLEDGE_INGESTION_ENABLED`;
- `B360_ZUZA_ENABLED`;
- `B360_SUBJECT_DIAGNOSTICS_ENABLED`.

Neste incremento, flags não tornam nenhuma capacidade pronta. Uma solicitação de ativação resulta em `blocked` com `B360_ACADEMY_FOUNDATION_ONLY`. Valor booleano inválido resulta em `B360_ACADEMY_CONFIG_INVALID`.

### Permissões

As permissões iniciais são:

- `knowledge.b360.read`;
- `knowledge.b360.ask`;
- `knowledge.b360.progress.write`;
- `knowledge.b360.admin`;
- `knowledge.b360.diagnostics.read`;
- `knowledge.b360.audit.read`.

O procedimento específico exige grant exato. Os papéis `admin` e `super_admin` não recebem bypass implícito.

## Consequências

- A rota `b360Academy.capabilities` é autenticada e informa somente estado sanitizado da fundação.
- Não existem endpoints de pergunta, ingestão, curso ou diagnóstico nesta fase.
- O painel existente e os endpoints `/api/b360/*` não são alterados.
- A ativação funcional depende de migrations, storage, fontes publicadas, M2M e gates específicos.
- O `readyz=503` do catálogo PEC continua visível e não é convertido em zero ou sucesso parcial.

## Rollback

Remover o mount `b360Academy` do app router e as quatro flags restaura integralmente o contrato anterior. Não há migration nem dado persistido neste incremento.
