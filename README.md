# SUS Analytics Web

Painel web para visualização de contratos analíticos, acompanhamento territorial e apoio à gestão de dados da Atenção Primária à Saúde.

## Fronteira do checkout

Este repositório é classificado como **`PUBLIC_STANDALONE`**. Ele contém o frontend React/Vite/TypeScript e seus contratos de consumo. Backend, banco de dados, ingestão, upsert, autorização de servidor, prontuário e motor de cálculo normativo não estão presentes neste checkout.

A aplicação pode consumir uma API compatível configurada em `VITE_API_URL`, mas a existência ou funcionamento dessa API deve ser comprovada fora do frontend. Documentos de outros checkouts são referência e não evidência do runtime atual. Consulte [docs/architecture/product-boundary.md](docs/architecture/product-boundary.md).

## Estado do projeto

O escopo documentado possui **21 métricas**: 15 de Qualidade APS (`B1`–`B6`, `C1`–`C7`, `M1`–`M2`) e 6 de Vínculo e Acompanhamento Territorial (`CVAT1`–`CVAT6`). A página atual apresenta o catálogo de Qualidade APS; a presença no catálogo não significa que exista cálculo disponível no runtime.

O C1 permanece bloqueado de forma fechada. A fonte externa pode possuir a cadeia `fact.co_dim_tipo_atendimento → dimension.co_seq_dim_tipo_atendimento → dimension.nu_identificador`, mas o contrato local ainda não comprova sua preservação, cardinalidade, competência e versionamento. Enquanto isso, o estado é `BLOCKED_BY_DATA_CONTRACT` e o código específico é `C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE`. O frontend não publica percentual, numerador ou denominador do C1.

O software é experimental. Indicadores, relatórios e listas demonstrativas não substituem sistemas oficiais, validação técnica local ou orientação do Ministério da Saúde.

## Current standalone capabilities

- Renderização da SPA e navegação entre páginas disponíveis.
- Validação runtime de payloads analíticos e estados `READY`, `NO_DATA`, `API_UNAVAILABLE`, `MISSING_REQUIRED_CRITERIA`, `BLOCKED_BY_DATA_CONTRACT` e `CONTRACT_ERROR`.
- Validação fail-closed de API, município, UF, IBGE e centro do mapa.
- Exibição de indisponibilidade quando a API não responde, o payload é inválido ou a capacidade não está implementada.
- Testes locais de contrato e configuração com Vitest.
- Gate local de publicação com verificações positivas e negativas.

## Required backend contracts

As capacidades abaixo são contratos futuros ou externos, não funcionalidades presentes neste checkout:

| Capacidade | Estado local |
|---|---|
| API/router compatível | `EXTERNAL_CONTRACT` |
| Banco ou réplica e-SUS APS | `NOT_PRESENT` |
| Ingestão LEDI/e-SUS | `NOT_PRESENT` |
| Upsert idempotente e linhagem | `REQUIRED_CONTRACT / NOT_IMPLEMENTED` |
| Autorização por município, equipe e objeto | `REQUIRED_CONTRACT / NOT_PRESENT` |
| Validação CNES/INE/CNS/CBO no servidor | `REQUIRED_CONTRACT / NOT_PRESENT` |
| Cálculo normativo das 21 métricas | `EXTERNAL_CONTRACT / NOT_PRESENT` |
| C1 | `BLOCKED_BY_DATA_CONTRACT` |
| Motor de cálculo distribuído | `REFERENCE_ONLY / FUTURE` |

## Requisitos

- Node.js 22 ou superior.
- pnpm 10.4 ou superior.

## Desenvolvimento

```bash
pnpm install --frozen-lockfile
cp .env.example apps/frontend/.env.local
pnpm dev
```

A aplicação interrompe o bootstrap com `CONFIGURATION_ERROR` quando API, município, UF, IBGE ou coordenadas obrigatórias estão ausentes ou inválidos. Sem uma API compatível e um payload válido, nenhuma métrica substituta é apresentada.

Município, UF, código IBGE, centro do mapa e URL da API são definidos no `.env.local`. Não há município padrão de produção, resultado enlatado ou dado fictício implícito.

## Qualidade

```bash
pnpm check
pnpm test
pnpm build
pnpm audit
pnpm verify:release
pnpm verify:release:negative
```

Os gates verificam contratos, configuração, ausência de fallbacks numéricos, bloqueio do C1, nomes de arquivos sensíveis, atribuições de licença e falhas negativas em fixtures temporárias.

## Estrutura

```text
apps/frontend/     aplicação React
 docs/              arquitetura, contratos, desenvolvimento e privacidade
scripts/           verificações locais de publicação
.github/            integração contínua e modelos de colaboração
```

Consulte [ARCHITECTURE.md](ARCHITECTURE.md), [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) e [docs/architecture/product-boundary.md](docs/architecture/product-boundary.md).

## Segurança e privacidade

Não envie dados pessoais, dados de saúde, credenciais, dumps, hosts internos ou endereços de infraestrutura para o repositório. Use somente dados sintéticos em desenvolvimento. Nenhuma variável `VITE_*` deve conter segredo; valores `VITE_*` são incorporados ao bundle público. Vulnerabilidades devem ser comunicadas conforme [SECURITY.md](SECURITY.md).

## Autoria e licença

Copyright 2026 Eduardo Muniz.

Distribuído sob a Apache License 2.0. Consulte [LICENSE](LICENSE) e [NOTICE](NOTICE).
