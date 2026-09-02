# Validação — Fundação da Academia PEC & Saúde Brasil 360

**Data:** 2026-08-02

**Status do incremento:** `DONE_FOUNDATION_IMPLEMENTED_VALIDATED`

**Status da funcionalidade completa:** `IMPLEMENTATION_IN_PROGRESS`

## Baseline

- Branch: `DM-Technology/b360-academy-foundation-20260802`.
- Base: `main`/`origin/main` em `75739dd3e3ef49c663d1d2b2b0fcfcc31013a611`.
- Worktree isolado: `D:\dm-hub\apps\dm-gov\saude\esus-aps-360\esus-aps-360-academy-foundation-20260802`.
- O WIP de design system do worktree original não foi movido, limpo ou alterado.
- O plano copiado para a branch confere byte a byte com o original: SHA-256 `AA86D9B5FB8F9278A4FEDB6436DE87C507EE998E09A42EF49AC8C5EF289E0DD5`.

## Implementação

- Quatro flags documentadas com default `false`.
- Resolver booleano estrito: valores diferentes de `true`, `false` ou vazio falham fechados.
- Contrato de capabilities autenticado, sanitizado e versionado.
- Mesmo com flags solicitadas, a fundação retorna `blocked / B360_ACADEMY_FOUNDATION_ONLY`.
- Seis permissões específicas registradas no código.
- Procedimento tRPC de permissão exata, sem bypass implícito para `admin` ou `super_admin`.
- Mount canônico `b360Academy.capabilities` em `Apps/server/api`.
- Nenhum endpoint fake de chat, ingestão, curso ou diagnóstico.
- Nenhuma migration, dado, fonte, container ou endpoint operacional existente alterado.

## Gates executados

| Gate | Resultado | Evidência |
|---|---|---|
| Testes focados | PASS | 13/13 |
| Regressão B360/app-router | PASS | 55/55 |
| Regressão Node aplicável | PASS | 75 arquivos; runner `dot`, zero falhas |
| Vitest web | PASS | 15 arquivos, 117/117 |
| Typecheck completo | PASS | web + backend, zero erros |
| Lint estrutural | PASS | `pnpm run lint` |
| Build completo | PASS | backend + Vite, `RELEASE_READY=true` |
| QA LGPD | PASS com warnings conhecidos | 0 falhas reais, 17 fixtures sinalizadas |
| `git diff --check` | PASS | sem whitespace inválido |

## Limitações de baseline observadas

### `pnpm test`

O comando completo não fica verde no baseline por duas causas fora do diff:

1. `Apps/server/api/src/indicators/__tests__/b360-correcoes-transacional.test.ts` exige o arquivo ignorado e ausente `Apps/server/api/src/correcoes/schema.sql`.
2. O runner raiz inclui `permissions-matrix.test.ts`, que importa Vitest, em uma execução `node --test`. O arquivo passa pelo runner correto do subprojeto web.

Para manter evidência honesta, foi executada toda a regressão Node aplicável excluindo somente esses dois arquivos; o segundo foi coberto pelo Vitest 117/117.

### Lockfile web

`Apps/web/package.json` e `Apps/web/pnpm-lock.yaml` divergem na configuração de overrides. A instalação `--frozen-lockfile` falha com `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Para validar sem alterar o lockfile, as dependências foram instaladas com `--ignore-workspace --no-frozen-lockfile --lockfile=false`.

### Gate de autoridade TypeScript

`scripts/14-shared/check-no-ts-indicator-authority.mjs` não existe no commit base; ele está apenas como arquivo untracked em outro worktree. O gate não foi copiado nem declarado como executado. O diff deste incremento não altera calculadores, indicadores ou read models.

## Runtime auditado

- eSUS `/healthz`: HTTP 200.
- eSUS `/api/health`: HTTP 200; PostgreSQL analítico e Redis conectados.
- eSUS `/readyz`: HTTP 503 por `syncCatalog=fail`.
- causa específica: `sourceDiscoveryStatus=permission_error`, com tabelas PEC requeridas marcadas como ausentes para descoberta direta.
- Zuza `/health`: HTTP 200.
- Zuza `/readyz`: HTTP 200.

O PEC Agent não foi reiniciado ou alterado. O readiness 503 permanece um bloqueio operacional explícito e não impede a fundação desativada.

## Pendências para a próxima fase

1. Aprovar ADR, matriz de permissões e contratos da fundação.
2. Resolver o catálogo/permissões PEC antes de smoke integrado dependente de dados.
3. Implementar migrations multi-tenant da base de conhecimento com up/down e readiness explícito.
4. Corrigir separadamente o lockfile/runner de testes do baseline.
