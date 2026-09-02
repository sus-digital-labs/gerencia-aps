# FIOCRUZ - ANALYTICS CORE ENTRY AUDIT

Data: 2026-08-26

Natureza: `PRIVATE WORKING DOCUMENT`

Implementação upstream: nenhuma

## Upstream State

Repository: `https://github.com/CampusVirtualFiocruz/painel-esus`

Main SHA: `d21fe44562fd73c4ae46261a40496079b6e94f15`

Main commit: `new docs build`, 2025-11-26

PR #59: aberta, não draft, não mergeada; `devdudumuniz:ci/docs-build -> CampusVirtualFiocruz:main`; última atualização verificada em 2026-08-25. Permaneceu independente e intocada.

## Private Reference Corpus

Docs scanned: 2 documentos presentes em `docs/` no início da auditoria.

Code references followed: módulos TypeScript de indicadores/PEC, componentes relacionados e metadados privados de proveniência, lidos seletivamente pelo `HEAD`.

Mutable worktree: durante a auditoria, uma reestruturação local não commitada removeu os documentos e grande parte da árvore legada. Nada foi restaurado ou sobrescrito.

O corpus não possui, no snapshot auditado, documentação detalhada e confiável sobre C1 atual, Polars, golden fixtures ou cálculo incremental. Também não há licença observável no corpus privado e a autoria histórica foi achatada em um único commit público. Isso impede cópia direta segura.

## Reuse Catalog

Reusable concepts:

- período explícito e escopo INE;
- numerador, denominador e percentual em resultado estruturado;
- validações de data quality;
- separação conceitual entre ingestão, normalização e cálculo;
- experiência com execução incremental/distribuída como referência futura.

Reusable code: nenhum trecho aprovado nesta rodada.

Outdated material: indicadores Previne Brasil antigos rotulados C1-C7.

Project-specific material: queries PEC, UI, conexões, deployment e topologia alvo.

Rejected reuse: dados, PII, credenciais, endpoints, configurações e paths operacionais.

Decisão de proveniência: `ADAPT_CONCEPT_ONLY`.

## Current Fiocruz Analytics Architecture

Fluxo comprovado:

```text
PEC/PostgreSQL
 -> extração SQL em chunks Pandas/Fastparquet
 -> dados/input/*.parquet
 -> scripts Polars por tema
 -> dados/output/*.parquet
 -> DuckDB read_parquet
 -> repositories/use cases/controllers
 -> Flask /v1
 -> React
```

O gerador apaga e recria `dados/`, executa bases de entrada e seis scripts temáticos sequencialmente. Consultas analíticas usam DuckDB sobre Parquet; várias rotas têm cache HTTP de 24h. Paths, relógio e período são implícitos. Não foram encontrados fingerprints, partições sujas, versionamento metodológico ou execução paralela efetiva.

## Existing Indicators

| Indicador | Inputs | Transformações compartilhadas | Materialização | Testes |
|---|---|---|---|---|
| Cadastro | pessoas e múltiplos fatos/dimensões | datas, pessoa, equipe, raça/cor, eventos | `cadastro_db.parquet` | smoke dependente de filesystem |
| Crianças | pessoa, cadastro, atendimentos, visita, alimentação, dimensões | idade, CBO, equipe, datas, dedupe | `crianca.parquet` | smoke dependente de filesystem |
| Diabetes | pessoa, cadastro, atendimentos, CID/CIAP, procedimentos, visita e dimensões | pessoa, CBO, equipe, datas, agravos | `diabetes.parquet` | smoke dependente de filesystem |
| Hipertensão | conjunto semelhante a Diabetes | pessoa, CBO, equipe, datas, agravos | `hipertensao.parquet` | teste temático não encontrado |
| Idosos | pessoa, atendimentos, visita, vacinação, IVCF e dimensões | idade, CBO, equipe, datas, eventos | `idoso.parquet` | smoke dependente de filesystem |
| Saúde bucal | pessoa, cadastro, atendimento odonto e dimensões | pessoa, CBO, equipe, datas | `saude_bucal.parquet` | smoke dependente de filesystem |

Os testes encontrados não são golden tests e não fixam expected values independentes.

## Repeated Transformations

Repetição real em dois ou mais consumidores:

- resolução de `cwd/dados/input|output`;
- leitura/escrita Parquet eager/lazy;
- parse de datas PEC;
- janelas baseadas em `today()`;
- pessoa + cadastro;
- equipe/unidade/INE/CNES;
- CBO e raça/cor;
- fatos de Atendimento Individual;
- joins seguidos de `unique`.

O conjunto de seis scripts contém entre 3 e 17 ocorrências textuais de leitura Parquet por arquivo. Cinco scripts repetem helpers muito semelhantes de I/O. A abstração deve começar por contexto/contrato e cardinalidade, não por um utilitário genérico de `join/unique`.

## Core Gaps

- período e snapshot determinísticos;
- metodologia versionada e com vigência;
- contrato de resultado agregado;
- data quality estruturada;
- contrato e cardinalidade de datasets compartilhados;
- golden fixtures e differential tests;
- métricas de performance e benchmark reproduzível;
- partições/fingerprints para incrementalidade;
- tratamento de falha que interrompa o job quando a base não é válida.

## Our Existing Capabilities

O corpus privado demonstra experiência conceitual com consultas PEC, resultados numerador/denominador, data quality, dashboards e uma arquitetura alvo com workers/eventos. Porém, o snapshot não comprova uma implementação Python/Polars incremental ou distribuída pronta para reuso, e suas fórmulas antigas não são fonte normativa para o C1 vigente.

## Gap Matrix

| Capacidade | Nosso projeto | Fiocruz | Gap | Reutilização possível | Prioridade |
|---|---|---|---|---|---:|
| cálculo de indicadores | queries TS antigas | scripts Polars temáticos | contrato comum e versão | conceito de resultado | alta |
| metodologia/versionamento | implícita e antiga | implícita | rastreabilidade/vigência | conceito somente | alta |
| período de referência | parâmetros parciais | `today()` frequente | determinismo | conceito | alta |
| CBO/CNES/INE | usados em queries | dimensões e joins repetidos | contrato temporal/cardinalidade | conceito | alta |
| data quality | UI e consultas | logs/dedupe local | métricas estruturadas | conceito | alta |
| normalização/joins | acoplada ao PEC | repetida nos scripts | datasets e chaves | conceito | alta |
| processamento incremental | alvo, não comprovado | ausente | partição/fingerprint | desenho futuro | média |
| datasets compartilhados | alvo | Parquets de entrada compartilhados, transforms repetidas | contratos normalizados | conceito | alta |
| I/O/Polars/LazyFrame | não comprovado | uso misto | padronização medida | upstream como base | alta |
| cache técnico | não comprovado | cache HTTP | cache por cálculo/fingerprint | desenho futuro | média |
| reprocessamento seletivo | não comprovado | recomputação total | invalidation | desenho futuro | média |
| benchmarks | ausentes | ausentes | harness e métricas | nenhum código | alta |
| observabilidade | alvo | logs/duração | linhas/bytes/memória/cardinalidade | conceito | média |
| execução paralela | alvo | sequencial | avaliar após I/O | experiência futura | baixa |
| arquitetura distribuída | alvo conceitual | local | sem evidência de necessidade | não reutilizar agora | baixa |
| testes | testes de app | smoke/unit parciais | golden/differential | padrões conceituais | alta |
| documentação | escassa/mutável | Docusaurus + docs de módulos | metodologia analítica | estrutura do relatório | média |

## C1 Data Contract

A nota oficial requer tipo de demanda, competência mensal, INE, CNES, equipe 70/76, CBO elegível, profissional identificado e pessoa identificada.

O upstream extrai de `tb_fat_atendimento_individual` somente ID do evento/pessoa, tempo, CBO, medidas e filtros clínicos. O Parquet não contém os campos suficientes para classificar demanda e validar todos os vínculos normativos.

Estado: `C1_BLOCKED_BY_DATA_CONTRACT`.

Antes de implementar, confirmar coluna/chave e códigos exatos do tipo de atendimento, chaves de profissional/equipe/unidade, vigência da equipe e unidade de contagem. Não inferir demanda por agenda, data ou outro proxy.

## C1 Methodology

Fonte: Nota Metodológica C1 - Mais Acesso, SEI 0054814890, atualizada em 2026-06-24 e verificada em 2026-08-26.

- numerador: demanda programada (agendada programada, cuidado continuado, agendada);
- denominador: programada + espontânea (escuta/orientação, consulta no dia, urgência);
- granularidade: INE;
- periodicidade: mensal, não acumulativo;
- equipes: 70 e 76;
- CBO: 2251-42, 2251-70, 2251-30, 2251-25, 2252-50, 2235-65, 2235-05;
- faixas: Regular `<=10` ou `>70`; Suficiente `>10 <=30`; Bom `>30 <=50`; Ótimo `>50 <=70`.

Denominador zero não é explicitamente definido; `NO_DATA/value=null` é proposta sujeita a alinhamento.

## Minimal Core Proposal

### CalculationContext

Período mensal explícito, escopo com INE e snapshot de entrada. Sem `cwd`, ambiente ou relógio dentro da regra.

### MethodologySpec

Necessário no C1 porque a versão 2026 revoga outra nota e altera CBO. Deve conter código, versão SEI, vigência, URL, granularidade, equipes/CBO e fingerprint.

### CalculationResult

Indicador, versão, período, escopo, numerador, denominador, valor, classificação, status e data quality; sem PII.

### IndicatorRunner

Adiar até um segundo consumidor real. Na primeira contribuição, uma função C1 pura sobre encontros normalizados é menor e mais revisável.

## Shared Data Opportunities

Primeiros candidatos: `NormalizedEncounters` e `NormalizedTeams`, pois C1, Diabetes, Hipertensão, Crianças e Idosos compartilham atendimento/equipe. Só criar após contrato e cardinalidade validados. Outros datasets normalizados ficam para quando dois consumidores e benchmark comprovarem necessidade.

## Baseline Performance

Status: `BLOCKED_BY_ENVIRONMENT`.

Não há dados sintéticos completos no upstream; dependências Python do projeto não estão instaladas no ambiente auditado; dados reais são proibidos. Nenhum runtime/memória foi inventado. O plano 10k/100k/500k/1M está em `benchmark-plan.md`.

## Scalability Findings

Há oportunidade clara de projection/predicate pushdown, filtro antes de join, column pruning, menos materializações e transformações compartilhadas. Polars deve permanecer até benchmark em contrário. O fluxo atual é sequencial e recomputa tudo.

## Incremental Processing Opportunity

Partição candidata: competência + INE. Metadados: input, metodologia e dependências por fingerprint. Mesmos fingerprints permitem skip; input alterado invalida a partição; metodologia alterada invalida seus períodos de vigência. Implementação fica após C1 correto e benchmark.

## Distributed Architecture

Current need: `NOT_YET_JUSTIFIED`.

Evidence: o limite local não foi medido, e ainda existem otimizações locais de menor complexidade. Distribuição deve ser RFC futura e opcional, preservando instalações municipais simples.

## Reuse Decision

`ADAPT_CONCEPT_ONLY`. Nenhum arquivo ou trecho privado foi copiado ao upstream.

## Implementation Performed

Nenhuma implementação no upstream, nenhuma branch de feature, nenhum commit, push, issue ou PR. Foram criados apenas documentos privados autorizados.

## Golden Tests

Planejados para 10, >10, 30, >30, 50, >50, 70, >70, zero denominator/NO_DATA, inválidos, CBO/equipe inelegíveis e duplicata. Bloqueados até validar o contrato PEC.

## Benchmarks

Baseline/after: `NOT_RUN` / `BLOCKED_BY_ENVIRONMENT`. Harness definido para a próxima etapa.

## Compatibility

O desenho preserva o pipeline local, Polars, DuckDB, APIs e frontend existentes. C1 entraria como novo consumidor; indicadores atuais permaneceriam intactos. A futura incrementalidade deve manter fallback de recomputação total.

## Risks

- divergência de schema entre versões PEC;
- códigos de tipo de demanda não confirmados;
- multiplicação de eventos em joins de equipe/profissional;
- confusão entre zero e ausência de dados;
- mudança metodológica sem vigência explícita;
- PII em bases temáticas largas;
- abstração prematura antes do segundo indicador;
- benchmark contaminado por I/O/cache;
- corpus privado mutável e sem licença clara.

## PR Decomposition

1. contrato PEC de Atendimento Individual + fixture/testes;
2. C1 + Context/Spec/Result + golden tests + benchmark;
3. normalização compartilhada se comprovada;
4. incrementalidade;
5. Diabetes diferencial;
6. Hipertensão diferencial.

Etapas 1 e 2 podem ser unidas se o diff permanecer coerente e revisável.

## Maintainer Proposal Draft

Durante a análise para implementação do C1 - Mais Acesso, identifiquei etapas comuns de contexto, metodologia e resultado que podem ser reutilizadas por outros indicadores. A extração atual de Atendimento Individual ainda não materializa todos os campos necessários para provar o contrato da nota vigente. Proponho alinhar primeiro as versões PEC, campos e códigos canônicos; em seguida, preparar uma abordagem pequena com fixture sintética, golden tests, período explícito, metodologia versionada e resultado estruturado, mantendo os indicadores existentes intactos e permitindo adoção incremental.

## Recommended Next Step

`ISSUE_FIRST` ou conversa equivalente com mantenedores, sem publicação automática.

Perguntas: versões PEC suportadas, fonte canônica dos tipos de demanda, semântica de denominador zero e preferência por uma ou duas PRs coerentes.

## Ownership Roadmap

Stage 1: contrato C1 + núcleo mínimo.

Stage 2: benchmark + normalização compartilhada.

Stage 3: incrementalidade.

Stage 4: Diabetes com differential tests.

Stage 5: Hipertensão com differential tests.

## Final Status

`FIOCRUZ_ANALYTICS_CORE_NEEDS_ALIGNMENT`

Razão: arquitetura e repetição foram compreendidas, e uma primitive justificável foi identificada; porém, o C1 ainda não pode ser calculado corretamente sobre o contrato de dados materializado pelo upstream. O próximo avanço depende de alinhamento de schema/metodologia, não de mais código.
