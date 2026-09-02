# Evidências da auditoria upstream

**Repositório auditado:** `CampusVirtualFiocruz/painel-esus`  
**Snapshot:** commit `d21fe44562fd73c4ae46261a40496079b6e94f15` (`new docs build`)  
**Data do commit:** 2025-11-26  
**Método:** clone somente leitura; nenhum issue, branch, commit ou alteração foi enviado ao GitHub.

## Evidências gerais

O README upstream caracteriza o Painel e-SUS APS como software livre, beta e experimental. O próprio texto informa que as métricas dos relatórios temáticos têm finalidade educacional e não substituem os cálculos oficiais do Ministério da Saúde. Também orienta que a versão beta e seus forks não sejam usados para tratativas com o Ministério da Saúde.

O clone não contém os arquivos Parquet consumidos pelo runtime. Os módulos apontam para caminhos relativos como `./dados/input/*.parquet` e `./dados/output/*.parquet`; portanto, o contrato do pipeline que materializa essas bases não está completo no snapshot auditado.

## Evidências por candidato

| Candidato | Código observado | Evidência principal | Estado preliminar |
|---|---|---|---|
| Diabetes | `src/infra/create_base/polars/scripts_dados/indicadores_diabetes_polars.py` | Lê FCI, FAI, códigos de CID/CIAP, procedimentos, FAO, visitas, atividade coletiva, dimensões CBO/equipe/raça; usa `datetime.today()` para janelas de 6/12 meses; agrega por pessoa. | `NEEDS_METHODOLOGY_REVIEW` |
| Hipertensão | `src/infra/create_base/polars/scripts_dados/indicadores_hipertensao_polars.py` e `hypertension_diabetes_queries.py` | Compartilha repositório, adapter e geradores SQL com Diabetes; usa Parquet materializado e agregações clínicas. | `NEEDS_METHODOLOGY_REVIEW` |
| Criança | `src/infra/create_base/polars/scripts_dados/indicadores_crianca_polars.py` e `children/sqls/children_queries.py` | Usa estados tri-state `1/0/99` em marcos, consultas, visitas, odontologia, medidas e alimentação; possui múltiplos joins e agrupamentos por pessoa. | `NEEDS_METHODOLOGY_REVIEW` |
| Idoso | `src/infra/create_base/polars/scripts_dados/indicadores_idoso_polars.py` e `elderly/elderly_repository.py` | Lê cadastro, atendimento individual/odontológico, códigos, visitas, procedimentos, vacinação, IVCF e dimensões; usa `datetime.today()` e muitos joins. | `NEEDS_METHODOLOGY_REVIEW` |
| Saúde Bucal | `oral_health/sqls/oral_health_queries.py` e `oral_health/oral_health_repository.py` | Usa `saude_bucal.parquet`, categorias `atendidas/cadastradas` e campos `agg_*`; a função `supervised_brushing()` reutiliza `agg_realizaram_exodontia`, o que exige revisão metodológica. | `NEEDS_METHODOLOGY_REVIEW` |
| Cadastro | `cadastro/records_repository.py` | Usa `cadastro_db.parquet`; possui agregações, lista nominal e exportação; há repetição de paginação e conversão de vazio em zero. | `LEGACY_ONLY` para migração normativa; consumidor estrutural válido |

## Evidências de problemas compartilhados

1. `HypertensionDiabetesRepository` atende Diabetes e Hipertensão com uma superfície comum. `hipertension_diabetes_queries.py` repete leituras `read_parquet`, interpolação direta de filtros e agregações por contagem.
2. `OralHealthRepository`, `RecordsRepository` e `ElderlyRepository` têm blocos semelhantes de lista nominal. Em vários casos, `limit` e `offset` só são inicializados quando há filtro, mas são usados sempre na query final.
3. Consultas e adaptadores retornam zeros ou estruturas vazias em situações que podem representar ausência de fonte, falha de schema ou ausência real de registros. Esse é um candidato transversal a `DataQualityResult`.
4. O período de cálculo usa `datetime.today()` em geradores de Diabetes e Idoso, e o cache usa `datetime.now()`. O dia de execução pode alterar a coorte sem mudar os dados.
5. `children_queries.py` usa `99` como `nao-se-aplica` em várias métricas. A lista nominal consulta campos `agg_card_*`, enquanto outras consultas usam `agg_dashboard_*`; o mapeamento precisa ser comprovado com fixture antes de qualquer refatoração.
6. `hypertension_diabetes_repository.py` contém uma validação que testa o tipo de `cnes` ao validar `equipe`, além de construir listas nominais com filtros textuais interpolados.
7. `hypertension_diabetes_queries.py` contém `select * from from read_parquet(...)` na distribuição por localidade e separadores textuais dentro de um SELECT, ocorrências que precisam ser tratadas como bugs de execução antes de uma contribuição de core.

## Cobertura observada

Há arquivos de teste para criação de bases, repositórios e adapters, mas a execução direcionada no snapshot não conseguiu exercitar os cálculos porque os Parquet não estão no clone. Resultado registrado em `../upstream-targeted-test-result.txt`: 25 testes coletados, 5 passaram e 20 falharam por ausência de `dados/output/diabetes.parquet`, `idoso.parquet`, `cadastro_db.parquet` e `saude_bucal.parquet`.

O conjunto completo também não pôde ser coletado inicialmente sem `python-dotenv`; depois da instalação do runner e das dependências mínimas, a limitação decisiva permaneceu a ausência das bases derivadas. Isso é `BLOCKED_BY_ENVIRONMENT`, não aprovação de cálculo.

## Limite da evidência

O snapshot auditado não prova a fórmula normativa atual, a versão do modelo de informação, o code set vigente ou a proveniência de cada campo materializado. O próximo passo deve ser solicitar aos maintainers o contrato do pipeline, não inferir a semântica a partir dos nomes locais.
