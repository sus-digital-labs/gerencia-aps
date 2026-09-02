# Fronteira do produto

**Classificação do checkout:** `PUBLIC_STANDALONE`

## Capacidades atuais

| Componente | Estado | Descrição verificável |
|---|---|---|
| Frontend React/Vite/TypeScript | `CURRENT_RUNTIME` | Aplicação SPA executável com configuração pública de runtime. |
| `analytics-contract` | `CURRENT_RUNTIME` | Catálogo de 21 métricas, estados analíticos, validação runtime de payload e bloqueio do C1. |
| Runtime config | `CURRENT_RUNTIME` | Validação formal de API, município, UF, IBGE e centro do mapa; configuração inválida interrompe o bootstrap. |
| API de dados | `EXTERNAL_CONTRACT` | O frontend pode consumir uma API compatível em `VITE_API_URL`, mas a API não está neste checkout. |
| Exportações | `LOCAL_UI_ONLY` | Componentes visuais podem exibir uma ação, mas nenhuma exportação de dado real é declarada disponível sem integrador autorizado. |

## Ausências comprovadas neste checkout

| Componente | Estado | Implicação |
|---|---|---|
| Backend/API | `NOT_PRESENT` | Não há router, autenticação de servidor, autorização por município/equipe ou cálculo no checkout. |
| Banco de dados | `NOT_PRESENT` | Não há conexão, réplica, migração ou credencial de banco no produto. |
| Ingestão | `NOT_PRESENT` / `FUTURE_CONTRACT` | O frontend não recebe ou materializa dados e-SUS por conta própria. |
| Upsert idempotente | `REQUIRED_CONTRACT` / `NOT_IMPLEMENTED` | A especificação existe, mas não há implementação neste checkout. |
| Validação CNES/INE/CNS/CBO no servidor | `REQUIRED_CONTRACT` / `NOT_IMPLEMENTED` | Não atribuir essa capacidade ao frontend. |
| Motor de cálculo distribuído | `REFERENCE_ONLY` / `FUTURE` | Não usar documentos de outros checkouts como prova de runtime atual. |
| Prontuário e-SUS PEC | `NOT_PRESENT` | Não abrir hosts internos nem sugerir acesso ao prontuário. |

## Regra de evidência

Somente código, testes e artefatos presentes neste checkout podem provar a capacidade do `PUBLIC_STANDALONE`. Documentos de outros repositórios, worktrees, agents, receivers, engines, migrations ou APIs são `REFERENCE_ONLY` e não elevam `NOT_IMPLEMENTED` para `PASS`.

## Regra fail-closed

Quando uma resposta da API estiver ausente, inválida ou indisponível, a aplicação deve mostrar estado de contrato ou indisponibilidade. Não deve exibir percentual, numerador, denominador, score, lista nominal, zero substituto, cadastro fictício ou sucesso sintético.

O C1 permanece bloqueado. A existência de um campo na fonte externa não prova que o contrato local o preserva. A habilitação depende da comprovação do campo, dimensão, join, competência, code set, CBO, equipe, cardinalidade e distinção entre no-data e zero.
