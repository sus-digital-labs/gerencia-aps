# Desenvolvimento

## Fronteira de segurança

O checkout é `PUBLIC_STANDALONE`. O desenvolvimento local não deve conectar banco, instalação e-SUS, réplica, credenciais, backend privado ou qualquer fonte de dados real. Use somente dados sintéticos quando uma fixture for necessária. Não coloque credenciais em arquivos versionáveis nem em variáveis `VITE_*`.

## Configuração obrigatória

Copie `.env.example` para `apps/frontend/.env.local` e preencha somente os valores públicos necessários:

```dotenv
VITE_API_URL=/api/trpc
VITE_MUNICIPALITY_IBGE=3304557
VITE_MUNICIPALITY_NAME=Rio de Janeiro
VITE_MUNICIPALITY_UF=RJ
VITE_MAP_CENTER_LAT=-22.9068
VITE_MAP_CENTER_LNG=-43.1729
VITE_MAP_DEFAULT_ZOOM=10
VITE_DEMO_MODE=false
```

A configuração deve conter uma URL de API válida, IBGE com sete dígitos, nome, UF brasileira, latitude, longitude e zoom dentro das faixas aceitas. Se algum campo obrigatório estiver ausente ou inválido, o bootstrap interrompe a aplicação com `CONFIGURATION_ERROR`. Não há município, coordenada, percentual ou score padrão de produção.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
pnpm audit
pnpm verify:release
pnpm verify:release:negative
```

`pnpm dev` inicia somente o frontend. `pnpm check` executa o typecheck configurado; `pnpm test` executa os testes de contrato e configuração; `pnpm build` gera o bundle; `pnpm verify:release` inspeciona apenas `git ls-files`; e `pnpm verify:release:negative` comprova que uma fixture com fallback é recusada.

## Regras de resultado

Payloads analíticos devem declarar `indicator_code` e `status`. Apenas `READY` pode carregar numerador, denominador e percentual finitos. `NO_DATA`, `API_UNAVAILABLE`, `MISSING_REQUIRED_CRITERIA`, `BLOCKED_BY_DATA_CONTRACT` e `CONTRACT_ERROR` devem permanecer visíveis como estados de contrato. Nunca transformar falha, payload inválido ou capacidade ausente em zero, lista vazia com aparência de sucesso, resultado enlatado ou score sintético.

O C1 permanece bloqueado até a comprovação local da cadeia fato–dimensão–identificador de demanda, incluindo competência, versionamento, code set, equipe, CBO e cardinalidade. Não criar percentual substituto.

## Convenções

- TypeScript para novos módulos e validação runtime explícita nos limites de entrada.
- Componentes pequenos, acessíveis e sem ações que aleguem backend não presente.
- Nenhum `@ts-nocheck` em código ativo.
- Nenhum `Math.random()` ou `Date.now()` para representar dados, IDs, scores ou evidências.
- Dados sintéticos e identificadores manifestamente inválidos em exemplos.
- Chamadas externas documentadas, minimizadas e configuradas por contrato.
- Alterações arquiteturais relevantes registradas em `docs/adr/`.
- Evidências cross-repository classificadas como `REFERENCE_ONLY`, nunca como prova do runtime local.
