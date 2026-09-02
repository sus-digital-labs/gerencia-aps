# Relatório de hardening — PUBLIC_STANDALONE

**Data:** 2026-08-27  
**Checkout:** `D:\dm-hub\apps\dm-contribution\sus-analytics-web`  
**Escopo autorizado:** auditoria e correção local fail-closed.  
**Dados reais:** não utilizados.  
**Credenciais locais:** não utilizadas, lidas ou copiadas.

## Resultado executivo

O checkout permanece classificado como `PUBLIC_STANDALONE`. Não foram restaurados backend, banco, ingestão, upsert, router privado, receiver, agent ou motor distribuído. Também não foram realizados commit, push, pull request ou publicação.

O frontend agora falha fechado quando a configuração pública obrigatória é inválida, rejeita payloads analíticos sem contrato runtime, mantém o C1 bloqueado e não exibe resultados enlatados, zeros substitutos, scores sintéticos ou listas nominais como se fossem dados válidos.

## Correções aplicadas

| Área | Alteração | Estado |
|---|---|---|
| Fronteira do produto | Criado `docs/architecture/product-boundary.md` e alinhados README/arquitetura | `DONE` |
| Contrato analítico | Parser runtime para códigos, status e campos numéricos; `CONTRACT_ERROR` em payload inválido | `DONE` |
| C1 | Exigida cadeia fato–dimensão–identificador; código `C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE` | `BLOCKED_BY_DATA_CONTRACT` |
| Configuração | `validateRuntimeEnvironment`; API, IBGE, nome, UF, latitude, longitude e zoom obrigatórios | `DONE` |
| Bootstrap | `CONFIGURATION_ERROR` interrompe a aplicação antes de criar chamadas ao integrador | `DONE` |
| Adaptador | Removidos sucessos sintéticos, listas vazias silenciosas, `Date.now()` e limiares enlatados | `DONE` |
| Dashboard | Removidos dados hardcoded, `initialData`, zeros substitutos e score padrão | `DONE` |
| Detalhe | Removidos fallback de lista nominal, chamada direta a endpoint não comprovado e host interno | `DONE` |
| Lista nominal | Exportação e prontuário não aparecem como ações funcionais sem integrador autorizado | `DONE` |
| Mapa | Sem endpoint/chave/centro padrão; falha fechada quando não configurado | `DONE` |
| Settings | Reclassificada como visão de fronteiras, sem administração simulada | `DONE` |
| Typecheck | Criado `tsconfig.contracts.json`; `@ts-nocheck` removido do código ativo | `DONE` |
| Release-check | Passa a usar `git ls-files`, valida políticas negativas e rejeita arquivos sensíveis | `DONE` |

## Gates executados

| Gate | Resultado | Evidência |
|---|---|---|
| Testes Vitest | `PASS` — 3 arquivos, 21 testes | `pnpm --filter @sus-analytics/frontend test` |
| Typecheck de contratos | `PASS` | `pnpm run check` |
| Build Vite | `PASS` | `pnpm --filter @sus-analytics/frontend build` |
| Release positivo | `PASS` — 364 arquivos no escopo de `git ls-files` | `pnpm run verify:release` |
| Release negativo | `PASS` — fixture fail-open recusada | `pnpm run verify:release:negative` |
| Diff whitespace | `PASS` | `git diff --check` |
| Padrões proibidos no código ativo | `PASS` — sem `@ts-nocheck`, `Math.random`, `Date.now`, host interno ou `success: true` | auditoria textual local |

## Typecheck completo legado

O comando `pnpm run check:full` continua disponível para revelar a dívida de tipagem da UI legada. Ele não foi usado para mascarar erros: a remoção de `@ts-nocheck` tornou explícitos erros em componentes shadcn/legados, páginas auxiliares e declarações incompletas. O gate padrão permanece restrito aos contratos e ao runtime que foram corrigidos nesta rodada, enquanto a dívida completa deve ser tratada em uma etapa própria.

## Limitações remanescentes

A ausência de uma API compatível, banco, ingestão e dados reais continua sendo uma limitação deliberada do checkout. Sem esses componentes não é possível declarar indicadores calculados, validar fórmulas com dados de produção, executar listas nominais ou provar autorização de servidor.

O C1 não foi reaberto. Sua habilitação depende de evidência local do campo de demanda, da dimensão correspondente, do identificador semântico, da competência, da versão do code set, dos filtros de equipe/CBO e da cardinalidade do join.

O build produz um aviso de chunk acima de 500 kB. Isso não bloqueou a compilação, mas deve ser tratado em uma etapa de performance por divisão de código.

## Arquivos principais

- `docs/architecture/product-boundary.md`
- `docs/18-contracts/analytics-runtime-contract.md`
- `apps/frontend/src/lib/analytics-contract.ts`
- `apps/frontend/src/lib/analytics-contract.test.ts`
- `apps/frontend/src/config/runtime-validation.ts`
- `apps/frontend/src/config/runtime-validation.test.ts`
- `apps/frontend/src/config/runtime.ts`
- `apps/frontend/src/lib/trpc-adapter.ts`
- `scripts/verify-public-release.mjs`
- `scripts/verify-public-release-negative.mjs`
- `docs/DEVELOPMENT.md`

## Decisão de segurança

Nenhuma etapa desta rodada acessou a instalação e-SUS, abriu o arquivo `C:\Program Files\e-SUS\webserver\config\credenciais.txt`, usou credenciais, conectou banco ou leu base real. Qualquer uso futuro exigirá uma nova autorização explícita e uma etapa separada de homologação com escopo e proteção definidos.
