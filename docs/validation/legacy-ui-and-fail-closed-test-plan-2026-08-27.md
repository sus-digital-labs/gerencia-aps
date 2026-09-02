# Diagnóstico do `check:full` e plano de testes fail-closed

**Data:** 2026-08-27  
**Escopo:** `PUBLIC_STANDALONE`  
**Dados reais e credenciais:** não utilizados.

## 1. Resultado atual do `check:full`

A execução do TypeScript completo terminou com código de saída 2 e 114 linhas de diagnóstico. O build Vite continua passando porque transpila o código, mas não substitui o typecheck. A dívida está concentrada na UI legada e em wrappers de componentes, não no gate estrito de contratos/runtime (`pnpm run check`), que permanece verde.

### 1.1. Causas-raiz agrupadas

| Grupo | Arquivos/erros | Causa | Prioridade |
|---|---|---|---|
| Wrappers Radix sem contrato de props | `accordion.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `menubar.tsx`, `radio-group.tsx`, `select.tsx`, `tabs.tsx`, `toggle-group.tsx` | `forwardRef` genérico e props obrigatórias (`value`, `type`) não modeladas; aparecem `TS2741` e `TS2322` | P0 técnico |
| Props implícitas em primitives | `alert-dialog.tsx`, `badge.tsx`, `breadcrumb.tsx`, `calendar.tsx`, `command.tsx`, `dialog.tsx`, `drawer.tsx`, `menubar.tsx`, `pagination.tsx`, `resizable.tsx`, `sheet.tsx`, `skeleton.tsx`, `use-toast.tsx` | Desestruturação sem interfaces provoca `TS7031` e callbacks sem tipo provocam `TS7006` | P0 técnico |
| Contextos criados como `null` | `carousel.tsx`, `chart.tsx`, `sidebar.tsx` | `React.createContext(null)` infere `null`; consumidores ficam com `TS2322`, `TS2339`, `TS2349` e `unknown` | P0 técnico |
| Gráfico e estilos customizados | `chart.tsx` | `config`, `payload`, `itemConfig` e callbacks são `unknown`/`any`; `--color-bg` e `--color-border` não pertencem ao tipo CSS padrão; `TS18046`, `TS7006`, `TS2353` | P1 |
| Biblioteca externa desatualizada | `calendar.tsx`, `sonner.tsx` | `IconLeft` não existe no tipo atual de `CustomComponents` (`TS2353`); `theme` foi tipado como `string`, mas a biblioteca aceita união fechada (`TS2322`) | P1 |
| Formulário controlado | `form.tsx` | Wrapper do `Controller` não recebe `render`; `name` e `id` desaparecem por props não tipadas; `TS2741`, `TS2339` | P1 |
| Inputs e paginação | `input-otp.tsx`, `pagination.tsx` | `maxLength`, `isActive` e `size` são obrigatórios ou unions fechadas e não foram propagados | P1 |
| Dependência local ausente | `sidebar.tsx` | `@/hooks/use-mobile` não existe no checkout; `TS2307` | P0 técnico |
| Callbacks de páginas | `GlobalSearchBar.tsx`, `ACSManagement.tsx` | Eventos `e` implícitos como `any`; `TS7006` | P1 |
| Página e badges | `ACSManagement.tsx`, `DashboardNew.tsx`, `Gamification.tsx` | `Card`/`Badge` receberam props obrigatórias artificiais (`className`, `variant`) por wrappers sem contrato; `TS2741` | P1 |

### 1.2. Priorização de correção

A primeira onda deve tipar os contextos compartilhados (`sidebar`, `chart`, `carousel`), criar os tipos de props dos wrappers Radix e restaurar `hooks/use-mobile`. Em seguida, corrigir as bibliotecas externas e os componentes de formulário/paginação. Só depois vale corrigir eventos e páginas auxiliares. Não reintroduzir `@ts-nocheck`; qualquer escape temporário deve ser local, explícito e acompanhado de issue.

## 2. Lacunas relevantes para a barreira fail-closed

O contrato atual cobre `READY`, `NO_DATA`, `API_UNAVAILABLE`, `MISSING_REQUIRED_CRITERIA` e `BLOCKED_BY_DATA_CONTRACT`. A classe `AnalyticsContractError` usa o código `CONTRACT_ERROR`, mas esse valor não está no tipo `AnalyticsStatus`; isso deve ser resolvido antes de tornar o erro uma resposta de domínio. O adaptador também usa o ano corrente quando o filtro não informa competência; o próximo contrato deve tornar o período explícito ou injetar um relógio controlável em testes.

O parser exige números finitos em `READY` e rejeita números em estados não prontos. A validação rigorosa ainda precisa ser específica por indicador para impedir denominador inválido, percentual fora da faixa normativa, `numerador > denominador` quando a regra exigir essa relação e mistura de competências. Não impor uma regra matemática global onde a nota metodológica não a sustenta.

## 3. Oráculo fail-closed

Defina as seguintes propriedades invariantes:

1. **Não pronto não é resultado.** Para todo status diferente de `READY`, numerador, denominador, percentual, score e campos equivalentes devem estar ausentes; a presença de qualquer um deve produzir `CONTRACT_ERROR`.
2. **Pronto precisa ser completo.** `READY` exige código conhecido, competência válida, numerador, denominador e percentual finitos. Regras adicionais devem vir da ficha do indicador.
3. **Erro não vira dado.** Rejeição de API, timeout, HTTP não-2xx, payload malformado e exceção do adaptador não podem virar `[]`, `0`, `0%`, sucesso ou score.
4. **No-data não vira zero.** `NO_DATA` deve renderizar estado textual e não deve alimentar médias, metas, rankings ou gauges.
5. **C1 nunca é inferido.** Ausência da cadeia fato–dimensão–identificador mantém `BLOCKED_BY_DATA_CONTRACT` e impede todos os números.
6. **Configuração inválida para antes da rede.** Sem API, município, UF, IBGE ou centro válidos, o bootstrap deve parar e nenhuma chamada ao integrador pode ocorrer.
7. **A resposta não pode escolher o tenant.** O frontend não cria município, equipe, unidade, competência ou identidade a partir de defaults.
8. **Determinismo.** O resultado deve depender apenas de entrada, versão e competência explícitas; testes devem controlar relógio, aleatoriedade e ordem dos registros.

## 4. Fixtures determinísticas

Criar fixtures exclusivamente sintéticas, com identificadores manifestamente inválidos para uso produtivo:

| Fixture | Entrada | Resultado esperado |
|---|---|---|
| `ready-valid.json` | Código conhecido e campos finitos | `READY`, números renderizáveis |
| `no-data.json` | Status `NO_DATA` sem campos numéricos | Texto de ausência; nenhum zero implícito |
| `api-unavailable.json` | Falha simulada de transporte | `API_UNAVAILABLE`; nenhum payload substituto |
| `payload-invalid.json` | Código desconhecido, status inválido, string numérica, `NaN` ou `Infinity` | `CONTRACT_ERROR` |
| `numeric-on-blocked.json` | C1 bloqueado com numerador/percentual | Rejeição imediata |
| `c1-missing-fact-field.json` | Sem `co_dim_tipo_atendimento` | C1 bloqueado |
| `c1-missing-dimension.json` | FK presente sem dimensão/`nu_identificador` | C1 bloqueado |
| `config-invalid.json` | API, IBGE, UF ou coordenada inválidos | `CONFIGURATION_ERROR` antes de rede |
| `empty-collections.json` | Listas externas vazias | Estado vazio explícito, nunca sucesso sintético |
| `partial-response.json` | Envelope sem `indicadores` ou sem campo obrigatório | Erro de contrato |

## 5. Camadas de testes automatizados

### Camada A — Parser e invariantes

Usar Vitest para testar todos os códigos `B1`–`B6`, `C1`–`C7`, `M1`–`M2` e `CVAT1`–`CVAT6`. Para cada código, testar `READY`, `NO_DATA`, `API_UNAVAILABLE`, `MISSING_REQUIRED_CRITERIA` e, quando aplicável, `BLOCKED_BY_DATA_CONTRACT`. Fazer mutações sobre uma fixture válida: remover cada campo, trocar números por strings, inserir `NaN`/`Infinity`, injetar números em estados não prontos, trocar código/status e duplicar registros.

Adicionar testes baseados em propriedades: toda transformação de payload que aumenta a disponibilidade numérica sem fornecer contrato completo deve ser rejeitada; toda permutação de registros deve produzir o mesmo resultado quando a regra não depende de ordem; e reprocessar a mesma entrada deve ser idempotente no nível do parser.

### Camada B — Adaptador e transporte

Mockar `trpcClient` sem autenticação real. Verificar que sucesso válido passa pelo parser; erro rejeitado, timeout, resposta `null`, objeto sem envelope, lista sem itens e HTTP não-2xx produzem erro/estado explícito. Espiar chamadas para comprovar que C1 não chama o cálculo enquanto bloqueado. Proibir asserts que aceitem `[]` como sucesso genérico.

### Camada C — Runtime e bootstrap

Testar a matriz de configuração: ausência de cada variável, UF inválida, IBGE com seis/oito dígitos, latitude/longitude fora do intervalo, zoom fora do intervalo, URL `javascript:`, URL protocol-relative e URL vazia. Em cada caso, mockar `fetch`/cliente tRPC e afirmar `not.toHaveBeenCalled()`.

Testar o caminho válido com URL relativa e absoluta permitidas, confirmando que nenhum segredo é lido de `VITE_*`. O mapa deve permanecer indisponível quando chave, endpoint ou centro não forem fornecidos, sem usar centro geográfico genérico.

### Camada D — UI

Usar React Testing Library ou equivalente para renderizar cada estado do `IndicatorCard`, `IndicatorGauge`, Dashboard e detalhe. Afirmar que apenas `READY` contém percentual, numerador, denominador e gauge; nos demais estados, procurar explicitamente a ausência de `0%`, `0 / 0`, score, ranking e lista nominal. Para C1, afirmar texto de bloqueio e ausência de qualquer número derivado.

Testar clique em atualizar quando a API falha, garantindo que o erro permanece visível e não substitui a tela por dados anteriores não comprovados. Testar que exportação e prontuário não aparecem como ações funcionais sem contrato.

### Camada E — Release e análise estática

Manter `pnpm verify:release` como gate positivo e `pnpm verify:release:negative` como prova de que uma fixture com `return []`, `success: true`, arquivo sensível, `@ts-nocheck`, `Math.random()` ou `Date.now()` é recusada. Adicionar fixtures negativas para fallback de município, percentual, numerador, denominador e host interno.

O gate deve continuar limitado a `git ls-files`. Uma auditoria separada pode inspecionar o working tree, mas não deve misturar arquivos gerados, dependências ou a instalação e-SUS na decisão de release.

## 6. Ordem de implementação

| Onda | Entrega | Gate de saída |
|---|---|---|
| 1 | Expandir parser, `CONTRACT_ERROR`, invariantes por indicador e fixtures base | Vitest verde; mutações inválidas rejeitadas |
| 2 | Mockar adaptador/tRPC e provar propagação de erro | Sem `[]`, zero ou sucesso sintético |
| 3 | Testar bootstrap e ausência de rede com configuração inválida | Zero chamadas externas em todos os casos inválidos |
| 4 | Testar componentes e fluxos de Dashboard/detalhe | Nenhum número fora de `READY` |
| 5 | Consolidar release-check negativo e análise estática | Positive/negative gates verdes |
| 6 | Corrigir typecheck da UI por primitives compartilhadas | `check:full` sem TS7006/TS7031/TS2322/TS2741/TS2339/TS2307 |
| 7 | Integração com servidor fake compatível, sem dados reais | Contrato de envelope e códigos comprovado |

## 7. Critério de aceite

A barreira só pode ser considerada validada quando todas as fixtures negativas forem rejeitadas, todos os estados não prontos forem não numéricos na UI, configuração inválida não gerar chamadas de rede, C1 continuar bloqueado e os gates positivo e negativo passarem. Cobertura de linhas, por si só, não é suficiente; cada vetor de fallback precisa de um teste que falhe caso o fallback seja reintroduzido.

Credenciais, base real, instalação e-SUS e backend privado ficam fora desta etapa. Qualquer teste com dados reais exige nova autorização explícita e um plano separado de homologação.
