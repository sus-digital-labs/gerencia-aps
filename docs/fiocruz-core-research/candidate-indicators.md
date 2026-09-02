# Indicadores candidatos à entrada no core

**Snapshot auditado:** `CampusVirtualFiocruz/painel-esus` em `d21fe44562fd73c4ae46261a40496079b6e94f15`  
**Estado:** pesquisa privada; nenhuma migração ou publicação autorizada.

## Critério

Um indicador só pode ser classificado como `READY_FOR_CORE_MIGRATION` quando há fonte metodológica específica, contrato de dados reproduzível, implementação atual entendida, testes que exercitam o cálculo e uma transformação compartilhada comprovada. O README upstream alerta que o Painel é beta/experimental e que suas métricas têm finalidade educacional; portanto, a análise abaixo não promove nenhum número a resultado oficial [1].

| Indicador/candidato | SOURCE_METHOD | DATA_CONTRACT | CURRENT_IMPLEMENTATION | TEST_COVERAGE | SHARED_TRANSFORMATIONS | RUNTIME_COST | METHODOLOGY_CONFIDENCE | Classificação |
|---|---|---|---|---|---|---|---|---|
| Diabetes | Manual temático e fichas de FCI/FAI/FAO/FCDT/visitas | Vários Parquet e códigos materializados; contrato de origem não está no clone | Polars agrupa pessoas, diagnósticos CID/CIAP/ABP, exames, visitas e procedimentos; período depende de `datetime.today()` | Há testes de geração e repositório, mas integração não roda sem Parquet | Compartilha repositório, adapter, filtros e exportação com Hipertensão | Alto: muitas fontes e joins | Média-baixa | `NEEDS_METHODOLOGY_REVIEW` |
| Hipertensão | Manual temático e fichas de FCI/FAI/FAO/FCDT/visitas | Parquet `hipertensao.parquet`; mapeamento de origem não está fechado no snapshot | Repositório e queries compartilhados com Diabetes; agregações de exames, IMC, complicações e listas nominais | Testes de repositório/adapter; integração bloqueada pela ausência do Parquet | Mesmo módulo e mesmos problemas de período, filtros, no-data e exportação | Alto | Média-baixa | `NEEDS_METHODOLOGY_REVIEW` |
| Criança | Manual temático e fichas de acompanhamento infantil | `crianca.parquet` derivado de múltiplas fontes; sem contrato de materialização no clone | Agrega marcos, consultas, visitas, odontologia, medidas e alimentação; usa estados `1/0/99` | Testes de geração existentes; integração depende de dados derivados | Reutiliza leitura Parquet, filtros CNES/equipe, agrupamento por pessoa e status | Alto | Média-baixa | `NEEDS_METHODOLOGY_REVIEW` |
| Idoso | Manual temático e fichas de acompanhamento, IVCF, vacinação e visitas | `idoso.parquet` derivado de muitas fontes; versão e competência não são parte clara da saída | Usa Polars, múltiplos joins, IVCF, vacinação, consultas, procedimentos e CBO; período depende de `datetime.today()` | Testes de geração/repositório/adapter; integração bloqueada pela ausência do Parquet | Compartilha leitura, filtros, datas e listas nominais com outros temas | Alto | Baixa-média | `NEEDS_METHODOLOGY_REVIEW` |
| Saúde Bucal | Manual temático e fichas odontológicas | `saude_bucal.parquet`; categorias `atendidas/cadastradas` e code sets exigem prova | Queries contam primeiras consultas, tratamentos, exodontias, preventivos, ART e escovação | Testes de query existentes; integração bloqueada pela ausência do Parquet | Compartilha filtro CNES/equipe, paginação e no-data com Cadastro/Idoso | Médio | Baixa | `NEEDS_METHODOLOGY_REVIEW` |
| Cadastro | Manual temático de qualidade cadastral | `cadastro_db.parquet`; contrato do derivado não está no clone | Totais, taxas, origem, status, lista nominal e exportação | Testes de repositório existentes; integração bloqueada pela ausência do Parquet | Forte consumidor estrutural de filtros, paginação, privacidade e no-data | Médio | Baixa para indicador normativo | `LEGACY_ONLY` para migração normativa; candidato estrutural |

## Dois consumidores selecionados para o primeiro problema compartilhado

Os primeiros consumidores escolhidos para comparação são **Diabetes** e **Hipertensão**. A escolha não afirma que qualquer um deles esteja metodologicamente pronto. Ela se apoia no fato de que ambos usam o mesmo `HypertensionDiabetesRepository`, o mesmo `HypertensionAdapter`/`DiabetesAdapter` e o mesmo gerador SQL em `hypertension_diabetes_queries.py`.

O problema estrutural comum é a combinação de período implícito, filtros CNES/equipe, agregações por pessoa e tratamento ambíguo de ausência de dados. Isso permite uma contribuição pequena e observável sem alterar a definição de Diabetes ou Hipertensão.

**Corroboradores:** Idoso, Saúde Bucal e Cadastro repetem parte das mesmas falhas de paginação, no-data/zero e contexto de execução. Eles entram como evidência de reutilização futura, não como consumidores da primeira contribuição.

## Por que nenhum indicador está pronto

Os Parquet não estão no snapshot auditado, então os testes de integração não puderam provar numerador, denominador ou cardinalidade real. Além disso, os geradores materializam campos derivados sem carregar de modo explícito a versão da metodologia e dependem do dia de execução em janelas temporais. O resultado correto é `FIOCRUZ_CORE_NEEDS_MORE_EVIDENCE`, não `READY_FOR_CORE_MIGRATION`.

## Próxima decisão

A primeira contribuição estrutural deve ser uma única primitive de contexto determinístico, adotada inicialmente por Diabetes e Hipertensão, acompanhada de baseline e teste diferencial. Nenhuma fórmula deve ser corrigida na mesma mudança.

## Referências

[1]: https://github.com/CampusVirtualFiocruz/painel-esus/tree/d21fe44562fd73c4ae46261a40496079b6e94f15 "CampusVirtualFiocruz/painel-esus — snapshot auditado"
[2]: ../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md "Issue privada do C1 — apenas contexto de decisão"
