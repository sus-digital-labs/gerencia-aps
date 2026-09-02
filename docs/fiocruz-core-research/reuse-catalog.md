# Private Reference Corpus - Reuse Catalog

## Inventário de documentação

No início da auditoria, `docs/` continha dois documentos. Durante a análise, uma reestruturação local não commitada removeu esse diretório do working tree; a leitura complementar foi feita pelo `HEAD` imutável, sem restaurar arquivos.

| Documento | Tema | Relevância para Fiocruz | Pode reutilizar? | Ação |
|---|---|---|---|---|
| `docs/PUBLICATION_REPORT.md` | estado e arquitetura alvo do projeto privado | média para comparação de capacidades; baixa como fonte normativa | conceitos somente | classificar arquitetura distribuída como `NOT_YET_JUSTIFIED` |
| `docs/adr/ADR-000-HISTORY-STRATEGY.md` | sanitização e estratégia de histórico | baixa para o motor analítico; alta para proveniência | não diretamente | manter como evidência interna de cautela, não levar ao upstream |

Não foram encontrados documentos específicos sobre C1-C7, Polars, cálculo incremental, benchmarks ou golden fixtures dentro de `docs/` no snapshot observado.

## Referências de código seguidas

Foram examinados por busca e leitura seletiva no `HEAD`:

- módulos TypeScript de indicadores e consultas PEC;
- componentes de data quality e indicadores;
- documentação de conexão/deploy apenas para classificar risco de configuração;
- relatório de proveniência e metadados do backup privado.

Diretórios de credenciais e qualquer conteúdo operacional sensível foram explicitamente excluídos da leitura.

## Proveniência

| Candidato | Classificação | Evidência | Decisão |
|---|---|---|---|
| padrões conceituais de resultado com numerador/denominador | `ADAPT_CONCEPT_ONLY` | presentes em módulos do projeto privado; autoria histórica foi achatada | reutilizar apenas o conceito |
| queries antigas de indicadores Previne Brasil | `OUTDATED` + `PROJECT_SPECIFIC` | metodologia anterior e forte acoplamento ao schema local | rejeitar cópia; fonte oficial atual prevalece |
| arquitetura central/workers/eventos | `PROJECT_SPECIFIC` | aparece como arquitetura alvo, não como implementação comprovada no snapshot | manter como experiência futura, não propor agora |
| frontend e componentes visuais | `PROJECT_SPECIFIC` | não necessários ao C1/core analítico | fora de escopo |
| código do upstream Painel e-SUS | `UPSTREAM_DERIVED` | licença e histórico do próprio upstream | modificar apenas no repositório upstream, preservando attribution |
| dependências Polars/DuckDB | `THIRD_PARTY` | pacotes externos com suas licenças | usar pelas APIs públicas; não copiar código |
| conteúdo sem autoria/licença verificável | `UNKNOWN` | histórico público achatado e ausência de licença no corpus privado observado | `ADAPT_CONCEPT_ONLY` |

## Classificação normativa

| Material privado | Estado frente ao C1 vigente |
|---|---|
| fórmulas Previne Brasil antigas | `OUTDATED` |
| uso de INE como parâmetro | `ALIGNED` em conceito |
| retorno numerador/denominador/percentual | `REUSABLE` como contrato conceitual |
| queries ligadas a tabelas e colunas locais | `PROJECT_SPECIFIC` |
| data quality de duplicidade/identificação | `NEEDS_REVIEW` antes de integrar ao método oficial |
| desenho distribuído/Kafka | `NOT_YET_JUSTIFIED` |

## Reuse Decision

- Reusable concepts: período explícito, escopo INE, resultado estruturado, validação de qualidade, separação entre ingestão e cálculo.
- Reusable code: nenhum trecho aprovado para cópia direta nesta rodada.
- Outdated material: regras Previne Brasil antigas rotuladas C1-C7.
- Project-specific material: queries, conexões, UI, deployment e topologia distribuída.
- Rejected reuse: configurações, paths operacionais, credenciais, dados, logs e qualquer PII.

Decisão: `ADAPT_CONCEPT_ONLY` até que autoria e licença de um trecho específico sejam comprovadas separadamente.

