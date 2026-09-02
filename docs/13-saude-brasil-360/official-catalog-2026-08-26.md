# Catálogo oficial do Saúde Brasil 360 e escopo do produto

**Data de conferência:** 2026-08-26  
**Fonte primária:** índice oficial de Notas Metodológicas do Siaps [1]

## 1. Distinção obrigatória

O catálogo publicado pelo Ministério da Saúde é mais amplo que o conjunto atualmente implementado no SUS Analytics Web. A documentação deve usar a expressão **catálogo oficial do Siaps** para a lista nacional publicada e **escopo operacional do produto** para as métricas efetivamente tratadas pelo contrato local.

> **Escopo operacional atual do produto: 21 métricas = 15 indicadores de Qualidade APS + 6 subindicadores operacionais de CVAT.**

A existência de uma nota metodológica no catálogo oficial não significa que o indicador esteja implementado no produto. Nenhum indicador novo deve ser incluído por inferência ou por mera presença no portal.

## 2. Catálogo atualmente publicado no Siaps

| Família | Códigos publicados | Equipe ou domínio | Presença no produto |
|---|---|---|---|
| Cuidado da equipe de Atenção Primária e Saúde da Família | C1–C7 | eSF/eAP | Incluídos no escopo de Qualidade APS; C1 está bloqueado por contrato de dados. |
| Saúde Bucal | B1–B6 | eSB | Incluídos no escopo de Qualidade APS, com pendências de fonte, schema ou validação conforme indicador. |
| Equipes Multiprofissionais | M1–M2 | eMulti | Incluídos no escopo de Qualidade APS, com pendências de escopo e validação conforme indicador. |
| Atenção Primária Prisional | P1–P6 | eAPP | Publicados no catálogo oficial; fora do escopo operacional atual. |
| Consultório na Rua | CR1–CR4 | eCR | Publicados no catálogo oficial; fora do escopo operacional atual. |
| Saúde da Família Ribeirinha | R1–R6 | eSFR | Publicados no catálogo oficial; fora do escopo operacional atual. |
| Vínculo e Acompanhamento Territorial | CVAT | eSF/eAP e equipes relacionadas conforme normativas | Representado no produto por CVAT1–CVAT6 como regras operacionais derivadas. |

O índice oficial também apresenta a Nota Técnica nº 08/2026 para o cálculo quadrimestral dos Componentes II e III e registra versões anteriores descontinuadas [1].

## 3. Regras oficiais de periodicidade e consolidação

A Nota Técnica nº 08/2026 estabelece que os resultados mensais são apresentados para monitoramento, enquanto os resultados quadrimestrais são calculados pela média dos meses válidos. A Nota Final do Componente III é obtida pela soma das notas de cada indicador ponderadas pelos respectivos pesos [2].

Para os indicadores C2 e C3, a mesma nota determina tratamento específico: o quadrimestre considera somente os meses que possuam, respectivamente, crianças completando dois anos ou gestações que tenham atingido o 42º dia de puerpério no período avaliado [2].

| Conceito do indicador | Pontuação usada na Nota Final |
|---|---:|
| Regular | 0,25 |
| Suficiente | 0,50 |
| Bom | 0,75 |
| Ótimo | 1,00 |

Os pesos e as faixas devem ser extraídos da nota vigente de cada família e não devem ser copiados de um indicador para outro.

## 4. Escopo operacional do produto

### 4.1 Qualidade APS — 15 indicadores

| Segmento | Códigos | Descrição resumida |
|---|---|---|
| Saúde Bucal | B1–B6 | Primeira consulta programada, tratamento concluído, taxa de exodontia, escovação supervisionada, procedimentos preventivos e tratamento restaurador atraumático. |
| Cuidado Integral | C1–C7 | Acesso, desenvolvimento infantil, gestação e puerpério, diabetes, hipertensão, pessoa idosa e prevenção do câncer da mulher. |
| eMulti | M1–M2 | Média de atendimentos por pessoa e ações interprofissionais. |

### 4.2 Vínculo e Acompanhamento Territorial — 6 subindicadores

| Código | Dimensão | Estado documental |
|---|---|---|
| CVAT1–CVAT2 | Cadastro | Regra operacional derivada; confirmar campos e janela na fonte vigente. |
| CVAT3–CVAT4 | Vulnerabilidade e perfil demográfico | Regra operacional derivada; confirmar fatores e disponibilidade dos dados. |
| CVAT5 | Acompanhamento | Regra operacional derivada; confirmar definição de contato qualificado. |
| CVAT6 | Satisfação | Dependente de fonte de pesquisa; não presumir disponibilidade no DW PEC. |

A Nota Técnica nº 08/2026 é a referência atual para consolidação quadrimestral. A Nota Técnica nº 30/2025 permanece referência operacional do CVAT quando compatível com a publicação vigente; qualquer divergência deve ser registrada antes de alterar a regra.

## 5. Indicadores fora do escopo atual

P1–P6, CR1–CR4 e R1–R6 devem ser mantidos no catálogo de referência, mas classificados como **fora do escopo operacional**. Para incorporá-los seriam necessários decisão de produto, fontes específicas, modelagem de equipes, catálogo de campos, testes, política de acesso e nova versão do contrato.

Essa separação evita duas conclusões incorretas: declarar que o produto implementa todo o catálogo nacional ou reduzir o escopo do produto a apenas 15 indicadores, ignorando CVAT1–CVAT6.

## 6. Regra do C1

A nota metodológica do C1 define o indicador como a relação entre o número de atendimentos de demanda programada e o total de atendimentos [3]. A auditoria do schema local não encontrou, em `tb_fat_atendimento_individual`, uma variável que permita separar demanda programada de demanda espontânea. Por isso, C1 deve permanecer `blocked_by_source` até que o contrato ou a fonte de ingestão exponha a variável oficial necessária.

O sistema não deve substituir a variável por tipo genérico de acesso, proxy textual, contagem de consulta ou outra heurística. O bloqueio está detalhado em [c1-data-contract-issue-2026-08-26.md](c1-data-contract-issue-2026-08-26.md).

## 7. Regras de nomenclatura e precedência

Os códigos devem ser escritos exatamente como publicados. B1 não pode ser usado para representar B4, B2 não pode representar B1 e assim por diante. O registro canônico em [../official-indicators-registry.md](../official-indicators-registry.md) deve ser a referência interna única para nome, fórmula, unidade, polaridade, fonte e status.

Relatórios datados, protótipos e códigos legados podem documentar o estado de uma época, mas não promovem nem revogam uma regra normativa. A alteração do catálogo deve sempre ser acompanhada por atualização do registro de fontes, matriz de campos, testes e changelog.

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Ministério da Saúde — Notas Metodológicas do Siaps"
[2]: https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf "Ministério da Saúde — Nota Técnica nº 08/2026"
[3]: https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/equipe-de-atencao-primaria-e-saude-da-familia/nota-metodologica-c1-mais-acesso/view "Ministério da Saúde — Nota Metodológica C1"

**Conclusão:** o catálogo oficial foi atualizado no documento, mas o contrato do produto continua limitado a 21 métricas até que novas incorporações sejam formalmente aprovadas e implementadas.
