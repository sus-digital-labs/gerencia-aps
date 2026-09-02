# ADR-000: History Strategy

## Contexto
O repositório `sus-analytics-web` atualmente possui referências internas, ferramentas de prototipagem (Manus, Base44) e segredos/PII espalhados pelo histórico (mensagens de commit e diffs anteriores). Para preparar a publicação segura do repositório, precisamos escolher entre reescrever o histórico existente ou iniciar um histórico limpo.

## Matriz de Decisão

| Critério | Rewrite | Clean history |
|----------|---------|---------------|
| Segurança (Secrets) | Risco residual de vazar segredos se a limpeza for incompleta. | **Seguro**, histórico anterior não é carregado. |
| Propriedade Intelectual | Preserva detalhes iterativos que podem não ser relevantes para o público. | **Foco no resultado**, descarta ruído. |
| Qualidade do Histórico | Exige reescrita pesada e curadoria de milhares de commits. | **Limpo e direto**, reflete a arquitetura alvo. |
| Clareza | Commits antigos descrevem arquitetura legada (ex: tRPC e ferramentas externas). | **Alta**, o repositório inicia com a base reestruturada e pronta para Python+Kafka. |
| Risco de Exposição | Alto (exige varredura exaustiva que pode falhar em arquivos obscuros). | **Baixo**, controla-se apenas o HEAD. |

## Decisão Técnica
**Escolha: CLEAN PUBLIC HISTORY (Histórico Limpo)**

Optamos por descartar o histórico Git antigo no repositório que se tornará público.
O histórico original foi backupeado e preservado (`private-audits`) para referência interna. O novo repositório público iniciará a partir de um único commit limpo de inicialização ("chore: initialize public SUS analytics platform"), garantindo eliminação absoluta de referências não autorizadas ou PII no histórico de revisões.

## Consequências
- A contagem de contribuições no GitHub não refletirá o trabalho no protótipo.
- Total segurança quanto ao vazamento de segredos passados.
- Maior velocidade na execução da reengenharia, pois não precisamos reescrever mensagens de commit individuais.
