# Arquitetura

## Classificação

Este checkout é `PUBLIC_STANDALONE`. A aplicação presente é uma SPA frontend em React, Vite e TypeScript. Backend, banco, ingestão, upsert, autorização de servidor e motor de cálculo normativo são contratos externos ou futuros; não estão implementados neste repositório.

```text
Navegador
   |
   | configuração pública e cookies quando o integrador fornecer sessão
   v
Frontend React  ---->  API compatível configurada em VITE_API_URL
   |
   +----> exportações locais somente quando houver integração autorizada
```

## Current standalone capabilities

O frontend renderiza a aplicação, valida a configuração de runtime, valida payloads analíticos recebidos, exibe estados de contrato e apresenta as páginas disponíveis. O contrato de métricas contempla 21 códigos, mas a presença de um código no catálogo não prova que o cálculo esteja implementado ou disponível.

A API compatível é uma fronteira externa. O frontend não pode tratá-la como autoridade comprovada apenas por tipagem TypeScript, resposta vazia ou objeto parcial.

## Required backend contracts

| Capacidade | Contrato | Implementação neste checkout | Validação local |
|---|---|---|---|
| API/router canônico | Definido como integração | `NOT_PRESENT` | `NOT_RUN` sem servidor compatível |
| Autenticação e autorização | Obrigatório no servidor | `NOT_PRESENT` | `NOT_RUN` |
| Banco/réplica e-SUS | Obrigatório para dados reais | `NOT_PRESENT` | `NOT_RUN` |
| Ingestão e materialização | Obrigatório para fontes | `NOT_PRESENT` | `NOT_RUN` |
| Upsert idempotente | Especificado em contrato | `NOT_IMPLEMENTED` | `NOT_RUN` |
| Cálculo das métricas | Externo ao frontend | `NOT_PRESENT` | `NOT_RUN` |
| Motor distribuído | Referência futura | `REFERENCE_ONLY` | `NOT_RUN` |

## Limites de confiança

1. Todo payload recebido do integrador deve passar por validação runtime antes de ser renderizado.
2. Cookies de sessão não substituem autorização por função, município, equipe e objeto no servidor.
3. Importação e upsert são contratos externos; o frontend não deve afirmar que reprocessamento é idempotente.
4. Ausência de API, fonte ou dados deve produzir `API_UNAVAILABLE`, `NO_DATA` ou `CONTRACT_ERROR`, nunca valores de fallback.
5. O escopo canônico é 21 métricas operacionais: 15 de Qualidade APS e 6 CVAT.
6. O C1 falha de forma fechada enquanto o contrato local não comprovar a cadeia fato–dimensão–identificador de demanda.
7. Variáveis `VITE_*` são públicas por definição e não podem conter segredos.
8. Exportações, quando integradas, transferem a responsabilidade de proteção ao dispositivo do usuário.
9. O repositório aceita apenas dados sintéticos em testes e exemplos.

## Evidência cross-repository

Arquivos, worktrees, agentes, receivers, engines, migrations, bancos e APIs de outros repositórios são `REFERENCE_ONLY`. Não podem elevar `NOT_IMPLEMENTED` para `PASS` neste checkout. Qualquer afirmação de execução deve apontar para código, teste ou artefato que exista localmente.

## C1

A fonte externa pode possuir `co_dim_tipo_atendimento`, mas uma FK não é o code set semântico. O contrato local precisa preservar a dimensão correspondente, `nu_identificador`, competência, versão, cardinalidade e critérios de equipe/CBO. Enquanto isso não for comprovado, o frontend não exibe percentual, numerador ou denominador.
