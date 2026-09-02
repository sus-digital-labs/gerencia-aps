# Registro mestre de fontes oficiais

**Versão:** 2026-08-26  
**Escopo:** Saúde Brasil 360, Siaps, e-SUS APS e cofinanciamento federal da APS

## 1. Objetivo

Este registro separa fontes normativas, fontes contextuais, fontes técnicas de operação e evidências internas. Ele impede que código legado, protótipo ou inferência sobre o banco local seja usado para fechar fórmula oficial.

## 2. Ordem de precedência

| Ordem | Fonte | Uso |
|---:|---|---|
| 1 | Nota metodológica oficial específica do indicador | Fórmula, numerador, denominador, janela, população, CBO e códigos. |
| 2 | Nota técnica oficial vigente do componente | Consolidação mensal/quadrimestral, pesos e classificação. |
| 3 | Portaria vigente | Governança, componentes, elegibilidade macro, cofinanciamento e vigência. |
| 4 | Manual e modelos de informação oficiais | Campos, preenchimento, versões e interoperabilidade. |
| 5 | Página institucional | Contexto e navegação; não fecha fórmula sozinha. |
| 6 | Schema, testes e runtime do produto | Evidência técnica local; não substitui a fonte normativa. |
| 7 | Código legado e relatórios históricos | Migração, comparação e rastreabilidade somente. |

A última linha da tabela acima deve ser interpretada como **somente migração, comparação e rastreabilidade**.

## 3. Status de fonte

| Status | Significado |
|---|---|
| `official_validated` | Fonte específica revisada e suficiente para sustentar a regra documentada. |
| `official_context_only` | Fonte oficial de contexto, governança ou navegação; não fecha a fórmula sozinha. |
| `official_validated_pending_review` | Fonte específica vinculada, mas ainda depende de revisão interna, complemento ou schema. |
| `requires_official_validation` | A implementação ainda não pode ser tratada como normativamente encerrada. |
| `blocked_by_source` | Falta fonte ou variável necessária para calcular com segurança. |
| `deprecated` | Fonte descontinuada ou legada, preservada para migração e comparação. |

## 4. Fontes oficiais registradas

| ID | Título | Data/versão | Escopo | Status | URL |
|---|---|---|---|---|---|
| `SRC-CTX-001` | Saúde Brasil 360 | Portal institucional | Contexto institucional do programa | `official_context_only` | [Página Saúde Brasil 360](https://www.gov.br/saude/pt-br/composicao/saps/saude-brasil-360) |
| `SRC-CTX-002` | Portaria GM/MS nº 3.493 | 10/04/2024 | Novo modelo de cofinanciamento federal da APS | `official_context_only` | [BVS/MS](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3493_11_04_2024.html) |
| `SRC-CTX-003` | FAQ do novo modelo de cofinanciamento federal da APS | Atualizado 12/02/2025 | Componentes, transição, equipes e operação | `official_context_only` | [Ministério da Saúde](https://www.gov.br/saude/pt-br/composicao/saps/esf/faq-novo-modelo-de-cofinanciamento-federal-da-aps) |
| `SRC-CTX-004` | Fichas Técnicas SAPS/MS | Atualização verificada em 2026 | Índice nacional de fichas por equipe | `official_context_only` | [Índice de Fichas Técnicas](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas) |
| `SRC-CTX-005` | Notas Metodológicas do Siaps | Verificado 26/08/2026 | Índice atual, CVAT e Componentes II/III | `official_context_only` | [Siaps — Notas Metodológicas](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/) |
| `SRC-NT-08-2026` | Nota Técnica nº 08/2026 — Cálculo de desempenho quadrimestral | 29/05/2026 | Média mensal, resultado quadrimestral, pesos e classificação | `official_validated` | [PDF oficial](https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf) |
| `SRC-NT-30-2025` | Nota Técnica nº 30/2025-CGESCO/DESCO/SAPS/MS | 2025 | CVAT e orientações de vínculo territorial | `official_validated_pending_review` | [PDF oficial](https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/notas-tecnicas/2025/nota-tecnica-no-30-2025-cgesco-desco-saps-ms.pdf) |
| `SRC-PORT-7639-2025` | Portaria GM/MS nº 7.639 | 18/07/2025 | Instituição do Siaps e alteração normativa correspondente | `official_validated` | [DOU](https://www.in.gov.br/en/web/dou/-/portaria-gm/ms-n-7.639-de-18-de-julho-de-2025-643328272) |
| `SRC-NT-12-2025` | Nota Técnica nº 12/2025-CGIAD/DEAPS/SAPS/MS | 2025 | Critério de validação por versão do modelo de informação | `official_validated` | [PDF oficial](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf) |
| `SRC-NI-13-2025` | Nota Informativa nº 13/2025-CGIAD/DEAPS/SAPS/MS | 24/11/2025 | Cenário nacional de versões incompatíveis com o Siaps | `official_validated` | [PDF oficial](https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf) |
| `SRC-ESUS-5.5.24` | e-SUS APS — Versão 5.5.24 | 03/08/2026 | Alterações de cadastro, identificação e registros | `official_validated` | [Notas da versão](https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5) |
| `SRC-SIAPS-CALENDAR-2026` | Calendário Siaps 2026 | 2026 | Datas limite de envio mensal | `official_validated` | [Calendário oficial](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/) |
| `SRC-SIAPS-OVERVIEW` | Apresentação do Manual do Siaps | Verificado 26/08/2026 | Instituição, finalidade e componentes do sistema | `official_context_only` | [Apresentação](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/inerte/visao-geral) |
| `SRC-EAP-006` | Equipe de Atenção Primária e Saúde da Família | Atualizado 30/09/2025 | C1–C7 e eSF/eAP | `official_context_only` | [Página temática](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia) |
| `SRC-ESB-012` | Equipe de Saúde Bucal | Atualizado 23/09/2025 | B1–B6 e eSB | `official_context_only` | [Página temática](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-saude-bucal) |
| `SRC-EMULTI-014` | Equipes Multiprofissionais | Atualizado 23/09/2025 | M1–M2 e eMulti | `official_context_only` | [Página temática](https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipes-multiprofissionais-emulti) |

As notas metodológicas específicas B1–B6, C1–C7 e M1–M2 estão listadas no índice do Siaps. As cópias locais correspondentes estão em `docs/Saúde Brasil 360/`.

## 5. Catálogo oficial atual

O índice oficial verificado em 26/08/2026 lista as seguintes famílias: C1–C7 para eSF/eAP; B1–B6 para eSB; M1–M2 para eMulti; P1–P6 para Atenção Primária Prisional; CR1–CR4 para Consultório na Rua; e R1–R6 para Saúde da Família Ribeirinha [1].

P1–P6, CR1–CR4 e R1–R6 são fontes oficiais catalogadas, mas estão **fora do escopo operacional atual** do produto. O projeto não deve declarar que os implementa.

## 6. Mapa fonte–indicador do produto

| Indicadores | Fonte primária | Estado do produto em 26/08/2026 |
|---|---|---|
| C1 | Nota Metodológica C1 | `blocked_by_source`: falta variável de tipo de demanda no schema auditado. |
| C2–C7 | Notas Metodológicas C2–C7 | Runtime documentado; manter `requires_official_validation` quando houver proxy, fallback ou pendência de schema. |
| B1–B6 | Notas Metodológicas B1–B6 | Runtime documentado; manter pendências específicas de fonte, escopo e code set. |
| M1–M2 | Notas Metodológicas M1–M2 | Runtime documentado; manter pendências de escopo e identificação de pessoa assistida. |
| CVAT1–CVAT6 | Nota Técnica nº 30/2025 e Nota Técnica nº 08/2026 | `derived_operational_rule`; não apresentar como fórmula normativa fechada sem fonte complementar. |

## 7. Regras de bloqueio

A ausência de uma variável necessária deve produzir `blocked_by_source` ou `blocked_by_schema`. Não é permitido substituir a variável por proxy não documentado.

Código legado não valida regra normativa. Página institucional não fecha numerador, denominador, CBO, code set ou janela sozinha. Resultado `validated_runtime_public` comprova apenas uma execução técnica em determinado ambiente e período.

Toda alteração de numerador, denominador, janela, coorte, peso, CBO, código SIGTAP, modelo de informação ou chave de identidade exige nova `ruleVersion`, atualização dos documentos do indicador e teste de regressão.

## 8. Referências

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Índice oficial de Notas Metodológicas do Siaps"

**Regra final:** sem fonte primária suficiente, a implementação permanece pendente ou bloqueada.
