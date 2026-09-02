# FIOCRUZ — CORE ANALYTICS PHASE 2

> **Working paper privado. Não publicar automaticamente no GitHub.**

**Data da auditoria:** 2026-08-27  
**Upstream auditado:** `CampusVirtualFiocruz/painel-esus`  
**Snapshot:** `d21fe44562fd73c4ae46261a40496079b6e94f15` (`new docs build`)

## C1

**Status:** `C1_BLOCKED_BY_DATA_CONTRACT`  
**Decisão:** `ISSUE_FIRST` / `FAIL_CLOSED`

A regra oficial exige a proporção de atendimentos de demanda programada sobre o total de atendimentos elegíveis. O contrato auditado não comprova uma variável confiável que distinga demanda programada de espontânea. O C1 não deve ser implementado, calculado por proxy ou usado para forçar a criação do core.

## Upstream Issue Draft

**Arquivo:** `c1-upstream-issue-draft.md`  
**Título:** C1 — identificar contrato oficial para classificação de demanda no Atendimento Individual

**Problema:** o pipeline que alimenta as bases derivadas precisa indicar onde a classificação oficial de demanda é preservada.

**Evidência:** a documentação normativa define a regra; o snapshot upstream expõe bases Parquet derivadas, mas não traz os Parquet nem o contrato completo de materialização.

**Pergunta aos maintainers:** qual campo ou relação distingue demanda programada e espontânea, com versão, competência, code set e cardinalidade verificáveis?

**Critérios de aceite:** identificador estável, competência, equipe, unidade, profissional/CBO, tipo de atendimento, classificação oficial, versão/modelo, cardinalidade, code set e histórico/backfill.

O rascunho não contém paths privados, nomes de runtime do produto ou uma solução imposta. Não foi criada issue no GitHub.

## Indicator Candidates

| Indicador | Contract | Methodology | Tests | Core readiness |
|---|---|---|---|---|
| Diabetes | Parquet e múltiplos fatos; contrato de materialização ausente no snapshot | Manual temático e code sets presentes, mas versão de regra não é fechada | Testes de geração/repositório; integração bloqueada sem Parquet | `NEEDS_METHODOLOGY_REVIEW` |
| Hipertensão | Mesmo repositório/queries de Diabetes; contrato derivado ausente | Manual temático e agregações clínicas precisam de revisão | Testes de repositório/adapter; integração bloqueada | `NEEDS_METHODOLOGY_REVIEW` |
| Criança | `crianca.parquet`, derivado de várias fontes | Estados `1/0/99` e múltiplos marcos requerem confirmação | Testes de geração; sem base materializada | `NEEDS_METHODOLOGY_REVIEW` |
| Idoso | `idoso.parquet`, muitas fontes e joins | Janelas, IVCF e vacinação dependem de contexto explícito | Testes de geração/repositório/adapter; sem base | `NEEDS_METHODOLOGY_REVIEW` |
| Saúde Bucal | `saude_bucal.parquet`, categorias atendidas/cadastradas | Há campo possivelmente incorreto em escovação supervisionada | Testes de query; sem base | `NEEDS_METHODOLOGY_REVIEW` |
| Cadastro | `cadastro_db.parquet`, estrutura nominal e agregada | Baixa confiança para migração normativa; útil como consumidor estrutural | Testes de repositório; sem base | `LEGACY_ONLY` para indicador; candidato estrutural |

## Selected A / Selected B

**Selected A:** Diabetes.  
**Selected B:** Hipertensão.

A seleção é estrutural, não normativa: os dois consumidores compartilham `HypertensionDiabetesRepository`, adapters e geradores SQL. Isso oferece dois consumidores concretos para um contexto determinístico sem reescrever seis famílias de indicadores.

Nenhum dos dois está aprovado para migração de fórmula. Ambos permanecem `NEEDS_METHODOLOGY_REVIEW` até que o contrato das bases derivadas e a baseline numérica estejam disponíveis.

## Shared Problem

O problema compartilhado é a falta de contexto explícito de execução. As janelas são calculadas com `datetime.today()`, os filtros de unidade/equipe são montados separadamente e os Parquet são resolvidos por caminhos relativos dependentes do diretório corrente. A mesma entrada lógica pode produzir uma coorte diferente ou falhar por localização de arquivo.

Problemas adjacentes — no-data versus zero, paginação nominal, joins sem cardinalidade documentada e proteção de exportação — aparecem em outros consumidores, mas não devem ser misturados à primeira contribuição.

## Determinism Audit

Os geradores de Diabetes e Hipertensão usam `datetime.today()` para janelas de 6/12 meses. Idoso usa janelas de 12/24 meses; Criança usa 12/24/36 meses; Saúde Bucal usa 24/30 meses; Cadastro usa cortes temporais próprios. O cache usa `datetime.now()` somente para medir duração.

A classificação é `NON_DETERMINISTIC` quando o relógio define a regra. `os.getcwd()` e `LAZY_ON` são contexto de infraestrutura e devem ser registrados. O audit completo está em `determinism-audit.md`.

## Cardinality Audit

Diabetes e Hipertensão combinam FCI, FAI, códigos CID/CIAP, procedimentos, FAOI, visitas e dimensões de CBO. O código reduz em alguns pontos por atendimento ou pessoa, mas o contrato não demonstra a cardinalidade das dimensões e a unidade de contagem de cada etapa.

Criança, Idoso, Saúde Bucal e Cadastro usam bases derivadas em que `count(*)` pode pressupor uma linha por pessoa. A auditoria de joins exige fixtures com múltiplos códigos por atendimento, múltiplos eventos por pessoa, dimensões duplicadas e vínculos históricos. O resultado esperado deve preservar a unidade de contagem declarada.

## No-data Audit

Há padrões de fallback para zero ou estruturas vazias em repositórios e adapters. Isso pode confundir população vazia, fonte ausente, Parquet inexistente, schema incompleto e falha de consulta.

A primeira contribuição não corrige todo o contrato de resposta, mas deve manter essa lacuna aberta para uma futura `DataQualityResult`. Nenhum teste deve aceitar que uma exceção de leitura seja apresentada como zero real.

## Methodology Traceability

O snapshot upstream contém manuais temáticos e code sets, mas não carrega em cada resultado uma versão de metodologia, versão de modelo, competência e linhagem da materialização. O resultado é `METHODOLOGY_TRACEABILITY_GAP`.

O README upstream afirma que o Painel beta é experimental e que as métricas têm finalidade educacional; isso impede tratar a saída do snapshot como homologação oficial [1].

## Baseline

**Estado:** `BLOCKED_BY_ENVIRONMENT`.

No clone não existem `dados/output/diabetes.parquet`, `idoso.parquet`, `cadastro_db.parquet` ou `saude_bucal.parquet`. A execução direcionada coletou 25 testes: 5 passaram e 20 falharam por ausência das bases derivadas. Nenhum cálculo de indicador foi validado. O resultado está em `baseline.md` e `upstream-targeted-test-result.txt`.

Quando os dados sintéticos estiverem disponíveis, capturar `rows_input`, `rows_output`, duração, memória quando possível, arquivos lidos, materializações, `reference_date`, `rule_version` e hash de saída sanitizada.

## Selected Core Primitive

**Nome:** `CalculationContext`.

**Problema resolvido:** tornar explícitos período/data de referência, filtros de unidade/equipe e versão de regra/modelo, sem mudar a fórmula.

**Consumidores:** Diabetes e Hipertensão.

**Por que core:** há dois consumidores reais, o problema afeta a reprodutibilidade, a adoção pode ser incremental e o custo de revisão é menor que o de uma normalização completa de encontros ou metodologia.

**Por que não maior:** `NormalizedEncounter` exige contrato de identidade/cardinalidade; `MethodologySpec` exige fechar regras normativas; `DataQualityResult` altera resposta e deve vir depois.

## Differential Test Plan

1. Gerar `OLD_RESULT` com data, competência e filtros fixos em cópia intocada.
2. Aplicar somente o contexto determinístico em branch privada.
3. Gerar `NEW_RESULT` com exatamente as mesmas entradas.
4. Comparar linhas, chaves, flags, agregados e hash sanitizado.
5. Exigir `EXACT_EQUIVALENCE` quando nenhuma regra foi alterada.
6. Classificar qualquer diferença como bug, mudança normativa ou ambiente; nunca ocultar.

## Local Scalability Findings

Os módulos usam `read_parquet`, `scan_parquet`, `LazyFrame`, `collect`, `filter`, `select`, `join`, `sort` e `unique`. Há oportunidade de projection pushdown, predicate pushdown, filtro precoce e scans compartilhados, mas nenhuma otimização deve ser aplicada antes da baseline.

Os caminhos relativos e chamadas repetidas de leitura são riscos de reprodutibilidade e custo. A primeira primitive deve apenas tornar o contexto observável; performance é medição da baseline, não hipótese.

## Distributed Readiness

Registrar somente as propriedades necessárias para futura escala: funções puras, contexto serializável, determinismo, particionamento, idempotência, estado externo e possibilidade de merge do resultado.

Não implementar infraestrutura distribuída nesta fase. Não alterar o comportamento por paralelismo, cache compartilhado ou materialização adicional antes de entender o custo local.

## Recommended Contribution Sequence

1. Revisar o rascunho da issue C1 internamente e solicitar o contrato oficial aos maintainers.
2. Obter ou construir, com aprovação, fixtures sintéticas que representem o contrato dos Parquet.
3. Capturar baseline de Diabetes e Hipertensão com data fixa.
4. Prototipar `CalculationContext` para os dois consumidores, sem mudança metodológica.
5. Executar teste diferencial com equivalência exata e revisão de privacidade.
6. Separar bugs de execução, correções metodológicas e refatoração estrutural.
7. Escolher entre nova issue, `DIRECT_PR` pequeno ou mais investigação.

## Recommended Upstream Action

**C1:** `ISSUE_FIRST`. Não publicar nesta rodada; revisar o draft e aguardar evidência do contrato.

**Core:** `ISSUE_FIRST` enquanto não houver Parquet/fixtures e baseline. Depois, decidir entre `DIRECT_PR` da primitive mínima ou nova issue técnica, sem criar engine genérico.

## Final State

`FIOCRUZ_CORE_NEEDS_MORE_EVIDENCE`.

A pesquisa encontrou uma entrada estrutural plausível, mas ainda não há evidência suficiente para afirmar `FIOCRUZ_CORE_PRIMITIVE_READY`. C1 continua bloqueado corretamente, e a primeira contribuição deve ser conquistada por contrato comprovado, baseline reproduzível e teste diferencial.

## Referências

[1]: https://github.com/CampusVirtualFiocruz/painel-esus/tree/d21fe44562fd73c4ae46261a40496079b6e94f15 "CampusVirtualFiocruz/painel-esus — snapshot auditado"
[2]: https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view "Ministério da Saúde — Nota Metodológica C1"
