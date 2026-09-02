# Índice completo — acervo local Saúde Brasil 360

**Revisão:** 2026-08-26

Este arquivo organiza o acervo local. A documentação operacional vigente começa em [docs/13-saude-brasil-360/README.md](../13-saude-brasil-360/README.md). Os arquivos listados abaixo são fontes locais, evidências ou materiais históricos; nenhum deles substitui a publicação oficial mais recente do Ministério da Saúde.

## 1. Sequência canônica do produto

| Ordem | Documento | Finalidade |
|---:|---|---|
| 1 | `../13-saude-brasil-360/README.md` | Entrada única e regra de precedência. |
| 2 | `../sources/official-sources-registry.md` | Fontes oficiais e status. |
| 3 | `../13-saude-brasil-360/00-canonical-status-2026-08-26.md` | Bloqueadores e decisões. |
| 4 | `../13-saude-brasil-360/official-catalog-2026-08-26.md` | Catálogo nacional e escopo de 21 métricas. |
| 5 | `../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md` | Gap do contrato do C1. |
| 6 | `../13-saude-brasil-360/siaps-operational-compatibility-2026-08-26.md` | Compatibilidade e-SUS APS/LEDI/Siaps. |
| 7 | `../13-saude-brasil-360/siaps-calendar-2026.md` | Fechamento mensal de 2026. |

## 2. Documentos oficiais locais

| Grupo | Conteúdo | Regra de uso |
|---|---|---|
| C1–C7 | Notas Metodológicas de cuidado integral | Fonte primária por indicador; conferir vigência no portal. |
| B1–B6 | Notas Metodológicas de Saúde Bucal | Fonte primária por indicador; conferir vigência no portal. |
| M1–M2 | Notas Metodológicas de eMulti | Fonte primária por indicador; conferir vigência no portal. |
| CVAT | Nota Técnica nº 30/2025 e documentos relacionados | Fonte de apoio; não presumir que toda regra local seja normativa. |
| e-SUS APS | Notas técnicas, guias, modelos e manuais | Campos, preenchimento, versões e interoperabilidade. |

## 3. Matriz local de campos e tabelas

| Documento | Uso |
|---|---|
| `MATRIZ_INDICADORES_CODIGO.md` | Cruzamento local entre indicadores, tabelas e código. |
| `GUIA_RAPIDO_TABELAS.md` | Consulta rápida da existência e classificação das tabelas. |
| `ANALISE_TABELAS_ESUS.md` | Análise do acervo de tabelas e seus limites. |
| `MATRIZ_INDICADORES_CODIGO.md` | Matriz de indicadores e código; deve ser confrontada com o registro canônico. |

A matriz não comprova que um campo exista na réplica de produção. Para o C1, a presença documentada de `tb_dim_tipo_atendimento` não substitui a validação da chave e da dimensão no dataset real.

## 4. Materiais históricos preservados

Os seguintes materiais permanecem disponíveis para rastreabilidade, mas não devem orientar nova implementação:

| Material | Classificação |
|---|---|
| `PROCESSO_TABELAS_ESUS.md` | Histórico de processo e categorização. |
| `SUMARIO_SINCRONIZACAO.txt` | Resumo histórico. |
| `BUSCA_CRITERIOSA_RESPOSTA_FINAL.txt` | Evidência de pesquisa anterior. |
| `BUSCA_CRITERIOSA_SUMARIO.txt` | Evidência de pesquisa anterior. |
| `DOC_C5_PATTERN.md` | Padrão histórico do C5; conferir nota vigente. |
| `admin/EXEMPLOS_PRATICOS.php` | Exemplos históricos não canônicos. |
| `admin/sync_tabelas_esus.php` | Script histórico; não definir arquitetura atual. |
| `pages/esf-gestantes-puerperas.php` | Material legado de interface. |
| Planilhas, textos e PDFs datados | Evidência temporal; verificar fonte e vigência. |

Qualquer referência a PHP, XAMPP, Apache local, `htdocs`, QualiSUS ou MariaDB local é histórica e não deve ser usada como dependência atual do SUS Analytics Web.

## 5. Regras de atualização

Ao substituir um PDF, registrar URL, data de consulta, título, versão e impacto sobre a matriz. Ao encontrar divergência entre documento local e portal, manter o arquivo histórico, corrigir o índice e atualizar o registro mestre de fontes.

Não apagar evidência histórica sem decisão de preservação. Não elevar uma regra local a normativa sem fonte específica. Não calcular C1 enquanto o contrato não comprovar a classificação oficial da demanda.

## 6. Referências oficiais

- [Índice de Notas Metodológicas do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/)
- [Calendário Siaps 2026](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/)
- [Normativas e Portarias do e-SUS APS](https://sisaps.saude.gov.br/sistemas/esusaps/docs/materiais-de-apoio/normativas-portarias/)
- [Versões do e-SUS APS](https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5)

**Status:** acervo local indexado; sequência canônica definida; materiais históricos explicitamente classificados.
