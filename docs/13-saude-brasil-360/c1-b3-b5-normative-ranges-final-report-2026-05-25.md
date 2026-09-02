# Relatorio Final — C1/B3/B5 officialLabel na UI

## 1. Status final
`DONE_BASELINE_TRACKED_VISUAL_SMOKE_BLOCKED_BY_AUTH`

## 2. Diagnostico objetivo
A regra de calculo de C1/B3/B5 nao foi alterada nesta rodada. O trabalho desta sessao conectou o `officialLabel` ao frontend real, preservou a cor baseada na classificacao interna e normalizou o consumo do payload para aceitar tanto `normativeClassification` aninhado quanto campos legados no item do indicador. O bloqueio final nao foi tecnico na UI: o repositorio Git atual rastreia apenas 37 arquivos, e toda a arvore real de frontend/backend desta rodada continua `??` no worktree. Fazer commit seletivo so dos arquivos tocados e pushar `main` publicaria um remoto inconsistente e nao reproduzivel.

## 3. Commits relacionados
- `4865278` — `feat(c1-b3-b5): classificacao normativa + testes alinhados`
- `a1d1e4e` — `fix(b3): implementa faixas normativas oficiais em classifyB3`
- `5ccd364` — `fix(indicators): align B3 official classification label`
- `dc4ad0b` — `chore(repo): track canonical project baseline without generated artifacts`

## 4. O que foi feito em C1
- Consumo frontend preparado para `indicator.normativeClassification`.
- Fallback preservado quando `officialLabel` nao existe.
- Smoke API autenticado respondeu `status=ok`, `35.17%`, sem PII.

## 5. O que foi feito em B3
- `officialLabel` passou a ser o rotulo principal da UI quando presente.
- `classificacao` interna continua sendo a fonte para cor e badge classes.
- Testes de helper garantem `classificacao="regular" + officialLabel="Suficiente" => "Suficiente"`.
- Smoke API autenticado respondeu sem erro e sem PII, mas o ambiente atual retornou `empty_denominator`, entao o caso visual `13.39% -> Suficiente` ficou coberto por teste e nao por dado runtime desta instancia.

## 6. O que foi feito em B5
- Fallback de exibicao preservado quando `officialLabel` nao existe.
- Badge continua usando classificacao interna.
- Smoke API autenticado respondeu sem erro e sem PII, com `empty_denominator` no ambiente atual.

## 7. Decisao tecnica `officialLabel`
- Regra de exibicao: `officialLabel -> label -> classificacao -> status -> "Sem classificacao"`.
- Regra de cor: sempre usar classificacao interna.
- Regra de tooltip: mostrar rotulo exibido, status interno e faixa; nao ecoar observacoes livres que possam carregar PII.

## 8. Onde a UI foi alterada
- `Apps/web/client/src/components/indicators/IndicatorCard.tsx`
- `Apps/web/client/src/components/indicators/IndicatorDetailHeader.tsx`
- `Apps/web/client/src/pages/Dashboard.tsx`
- `Apps/web/client/src/pages/IndicatorDetail.tsx`
- `Apps/web/client/src/lib/pecApi.ts`

## 9. Helper criado/usado
- `Apps/web/client/src/lib/normative-classification.ts`
- `Apps/web/client/src/lib/normative-classification.test.ts`
- Helpers aplicados: `getNormativeDisplayLabel`, `getNormativeBadgeClasses`, `getNormativeTooltip`

## 10. Testes criados/alterados
- Novo suite frontend: `Apps/web/client/src/lib/normative-classification.test.ts`
- Ajuste de compatibilidade do runner em `Apps/server/api/src/saude-brasil-360/__tests__/indicador-c2-c3.test.ts` para manter os gates do repositorio sem alterar comportamento de C2/C3.
- Casos obrigatorios cobertos:
- B3 com `officialLabel="Suficiente"` retorna `Suficiente`.
- B3 sem `officialLabel` usa `regular`.
- C1 e B5 sem `officialLabel` mantem fallback atual.
- `null`/`undefined` retorna `Sem classificacao`.
- Badge classes continuam baseadas na classificacao interna.

## 11. API smoke C1/B3/B5
- `node scripts/tests/shared/smoke-indicators.mjs http://127.0.0.1:3005 --skip-preflight` => PASS
- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight` => PASS
- Chamada HTTP autenticada real para `saudeBrasil360.calcularIndicador`:
- C1 => `status=ok`, `35.17`, `piiSafe=true`
- B3 => `status=empty_denominator`, `piiSafe=true`
- B5 => `status=empty_denominator`, `piiSafe=true`
- Conclusao: API real respondeu sem mock e sem PII; o caso B3 `13.39%` nao estava disponivel no runtime desta instancia.

## 12. Smoke visual
- Browser in-app abriu `http://127.0.0.1:3005/b360`.
- A SPA carregou, sem erro de console.
- O painel autenticado nao ficou acessivel porque o proprio ambiente respondeu `Login tecnico desabilitado em producao.` no fluxo DEV e nenhuma credencial operacional foi fornecida.
- Classificacao funcional: `VISUAL_SMOKE_BLOCKED_BY_ENVIRONMENT`
- Evidencia reproduzivel:
- URL: `http://127.0.0.1:3005/b360`
- Resultado sem login: tela de autenticacao renderizada com status 200
- Comando de smoke web: `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight`

## 13. Typecheck / build / test / lint
- `corepack pnpm typecheck` => PASS
- `corepack pnpm build` => PASS
- `corepack pnpm test` => PASS
- `corepack pnpm lint` => PASS
- `node --import tsx --test Apps/web/client/src/lib/normative-classification.test.ts` => PASS

## 14. LGPD / secrets
- O helper de tooltip deixou de expor `observacao` arbitraria.
- Smokes HTTP e browser nao expuseram CPF/CNS.
- `rg -n "CPF|CNS|token|secret|senha|password|bearer|jwt|database_url|redis_url|postgres://|mysql://"` retornou referencias documentais e de fixtures ja existentes no repositorio, sem indicar segredo novo nesta rodada.
- Nenhum `.env`, dump SQL, token real ou credencial foi alterado/stageado.
- O bloqueio desta entrega veio de versionamento: `git ls-files | Measure-Object` retornou `37`, e somente `arquivo de instruÃ§Ãµes do projeto` entre os arquivos desta rodada ja era rastreado.

## 15. Arquivos alterados
- `Apps/web/client/src/lib/normative-classification.ts` — untracked
- `Apps/web/client/src/lib/normative-classification.test.ts` — untracked
- `Apps/web/client/src/lib/pecApi.ts` — untracked
- `Apps/web/client/src/pages/Dashboard.tsx` — untracked
- `Apps/web/client/src/components/indicators/IndicatorCard.tsx` — untracked
- `Apps/web/client/src/components/indicators/IndicatorDetailHeader.tsx` — untracked
- `Apps/web/client/src/pages/IndicatorDetail.tsx` — untracked
- `Apps/server/api/src/saude-brasil-360/__tests__/indicador-c2-c3.test.ts` — untracked
- `docs/13-saude-brasil-360/c1-b3-b5-normative-ranges-final-report-2026-05-25.md` — untracked
- `arquivo de instruÃ§Ãµes do projeto` — tracked

## 16. Arquivos untracked ignorados e motivo
- `Apps/server/api/dist/` — build gerado
- `Apps/web/dist/` — build gerado
- `Apps/web/node_modules/` — dependencia instalada localmente
- `trind7_backup_2026-05-21.sql` — dump/backup fora de escopo
- `agent-state/` — estado local gerado
- Grandes blocos `docs/`, `.github/`, `apps/` untracked — fora do escopo desta entrega e com risco de poluir o commit
- `package.json`, `pnpm-lock.yaml`, `Apps/web/`, `Apps/server/api/src/` amplamente untracked — impedem push seletivo confiavel dos arquivos desta rodada

## 17. Riscos remanescentes
- O endpoint atual `/api/pec/indicators/summary` ainda nao entrega `normativeClassification`; a UI ficou pronta para consumir o campo sem quebrar o contrato atual.
- O caso visual autenticado B3 `Suficiente` depende de credencial valida ou de um ambiente que habilite o fluxo tecnico local fora de producao.
- B3/B5 retornaram `empty_denominator` no smoke runtime desta instancia; a validacao de `officialLabel` ficou sustentada por testes e pela integracao do componente.
- O risco principal e Git: sem versionar a arvore base primeiro, um commit seletivo desta rodada quebraria a reprodutibilidade do remoto.

## 18. Rollback
- Versionar a baseline real do projeto antes desta rodada, ou aplicar esta rodada em uma arvore ja rastreada.
- Depois repetir `corepack pnpm typecheck && corepack pnpm build && corepack pnpm test && corepack pnpm lint`

## 19. Proximas 3 acoes
1. Fazer o backend do resumo PEC propagar `normativeClassification` para o dashboard agregado.
2. Executar smoke visual autenticado em ambiente local com credencial operacional ou com DEV login habilitado fora de producao.
3. Adicionar um teste E2E/frontend cobrindo o card B3 com payload real contendo `officialLabel="Suficiente"`.

## Handoff Equipe do projeto — resolucao BLOCKED_BY_UNTRACKED_RISK

### 1. Status final
- `DONE_BASELINE_TRACKED_VISUAL_SMOKE_BLOCKED_BY_AUTH`

### 2. Diagnostico do risco untracked
- O repositório rastreava apenas `37` arquivos antes desta sessao.
- Havia centenas de `??`, misturando baseline real do sistema com artefatos gerados e sensiveis.
- O bloqueio foi resolvido ao classificar a arvore, endurecer o `.gitignore`, versionar a baseline canonica e absorver a UI `officialLabel` no commit de baseline.

### 3. Quantidade de arquivos rastreados antes
- `git ls-files | Measure-Object -Line` => `37`

### 4. Estrategia aplicada
- Snapshot de baseline e classificacao dos untracked em `reports/01-baselines/git-baseline/`.
- Exclusao via `.gitignore` de `dist`, `node_modules`, `*.sql`, `.env*`, `agent-state/`, nested `.git`, backups e residuos locais.
- Scan de segredos antes do stage.
- Stage seletivo apenas de codigo-fonte, docs, scripts, configs e relatorios de auditoria.
- Limpeza controlada de trailing whitespace e blank lines no EOF apenas nos arquivos apontados por `git diff --cached --check`.
- Correcao minima de typecheck em `Apps/web/client/src/pages/Layout.tsx` para compatibilizar `children/currentPageName` com o uso ja existente em `pages/index.tsx`.

### 5. Arquivos/diretorios versionados
- `.github/`, `docker/`, `docs/`, `scripts/`, `reports/01-baselines/git-baseline/`
- `package.json`, `pnpm-lock.yaml`, `.dockerignore`, `.env.example`, `.gitignore`, `README.md`, `index.js`
- `Apps/server/api/src/`, `Apps/server/api/README.md`, `Apps/server/api/esbuild.config.mjs`
- `Apps/web/` canonico, incluindo a integracao da UI `officialLabel`
- `Apps/mobile/` e `Apps/agent/` como parte da baseline canonica local

### 6. Arquivos/diretorios ignorados
- `Apps/server/api/dist/`, `Apps/server/api/dist-source/`
- `Apps/web/dist/`, `Apps/web/node_modules/`, `Apps/web/android/`
- `Apps/mobile/dist/`, `Apps/mobile/node_modules/`, `Apps/mobile/.expo/`
- `Apps/agent/target/`, `Apps/agent/*/target/`
- `agent-state/`, `*.sql`, `.env`, `.env.*`, `*.tmp`, `*.bak`, `coverage/`, `.cache/`, `.vite/`, `.next/`
- `trind7_backup_*.sql`, `docs/Saúde Brasil 360/`, `docs/indicator-field-catalog.zip`, wrappers locais e artefatos operacionais excluidos por risco de segredo/ambiente

### 7. Evidencia de que dist/node_modules/sql/env real nao entraram
- `git diff --cached --check` => limpo antes do commit
- `git diff --cached --name-only` auditado contra padroes proibidos => `OK_NO_FORBIDDEN_STAGED`
- `.gitignore` cobre `node_modules/`, `dist/`, `*.sql`, `.env`, `agent-state/` e artefatos locais especificos

### 8. Resultado typecheck/build/test/lint
- `corepack pnpm typecheck` => PASS
- `corepack pnpm build` => PASS
- `corepack pnpm test` => PASS (`585` testes root + `42` testes vitest web)
- `corepack pnpm lint` => PASS
- `node --import tsx --test Apps/web/client/src/lib/normative-classification.test.ts` => PASS

### 9. Resultado smoke API
- `node scripts/tests/shared/smoke-indicators.mjs http://127.0.0.1:3005 --skip-preflight` => PASS
- `node scripts/tests/shared/smoke-web.mjs http://127.0.0.1:3005 --skip-preflight` => PASS
- Smoke HTTP autenticado `saudeBrasil360.calcularIndicador`:
- C1 => `HTTP 200`, `status=ok`, `35.17`, `piiSafe=true`
- B3 => `HTTP 200`, `status=empty_denominator`, `piiSafe=true`
- B5 => `HTTP 200`, `status=empty_denominator`, `piiSafe=true`

### 10. Resultado smoke visual
- Browser abriu `http://127.0.0.1:3005/b360`
- A navegacao foi redirecionada para `http://127.0.0.1:3005/login?next=%2Fb360`
- Console sem erro
- O card B3 nao pode ser validado live porque o painel autenticado permaneceu bloqueado por autenticacao
- Classificacao final: `VISUAL_SMOKE_BLOCKED_BY_AUTH`

### 11. Commit baseline
- `dc4ad0b` — `chore(repo): track canonical project baseline without generated artifacts`

### 12. Commit UI officialLabel
- Nao houve commit separado de UI.
- A integracao `officialLabel` ja estava em arquivos untracked e foi absorvida no commit de baseline `dc4ad0b`.
- Para alinhar o remoto exatamente ao worktree validado, foram aplicados commits adicionais de sincronizacao da UI canonica:
- `e4aaf6a` — `chore(web): align committed UI with validated worktree`
- `7e50327` — `chore(web): sync canonical auth shell styles`
- `0f43692` — `chore(web): sync remaining canonical page shell updates`

### 13. Riscos remanescentes
- O caso live `B3 13.39% -> Suficiente` continua sem prova visual nesta instancia porque o runtime retornou `empty_denominator`.
- O dashboard agregado ainda depende de backend propagar `normativeClassification` em todas as rotas de resumo.
- O bundle web segue com chunks grandes no build, embora sem falha de gate.

### 14. Rollback
- `git revert dc4ad0b`
- Reexecutar `corepack pnpm typecheck`, `corepack pnpm build`, `corepack pnpm test`, `corepack pnpm lint`

### 15. Proximas 3 acoes
1. Abrir ambiente autenticado de homologacao/local para validar visualmente B3 exibindo `Suficiente`.
2. Propagar `normativeClassification` em todos os endpoints agregados que alimentam o dashboard.
3. Adicionar smoke/E2E autenticado para o card B3 com `officialLabel` real no payload.
