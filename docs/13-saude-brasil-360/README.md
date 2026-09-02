# Saúde Brasil 360 — documentação canônica

**Versão documental:** 2026-08-26

Este diretório concentra a documentação operacional do projeto **FIOCRUZ Analytics Core / SUS Analytics Web** relacionada ao Saúde Brasil 360. A fonte normativa externa é o Ministério da Saúde, especialmente o Siaps, as notas metodológicas e as portarias vinculadas ao cofinanciamento federal da Atenção Primária à Saúde (APS).

> **Regra de precedência:** a nota metodológica oficial do indicador prevalece sobre código legado, protótipo, relatório de auditoria, planilha, texto de pesquisa ou inferência feita a partir do banco local.

## Sequência obrigatória de leitura

| Ordem | Documento | Finalidade | Natureza |
|---:|---|---|---|
| 1 | [00-canonical-status-2026-08-26.md](00-canonical-status-2026-08-26.md) | Estado consolidado, decisões e bloqueadores | Operacional |
| 2 | [official-catalog-2026-08-26.md](official-catalog-2026-08-26.md) | Catálogo oficial vigente e separação do escopo implementado | Governança |
| 3 | [c1-data-contract-issue-2026-08-26.md](c1-data-contract-issue-2026-08-26.md) | Issue para correção do contrato de dados do C1 | Bloqueador P0 |
| 4 | [siaps-operational-compatibility-2026-08-26.md](siaps-operational-compatibility-2026-08-26.md) | Compatibilidade e-SUS APS/LEDI/Siaps e qualidade cadastral | Operação |
| 5 | [siaps-calendar-2026.md](siaps-calendar-2026.md) | Calendário oficial de envio em 2026 | Operação |
| 6 | [canonical-health-model.md](canonical-health-model.md) | Modelo de dados canônico | Técnico |
| 7 | [final-21-indicators-detail-matrix-2026-06-02.md](final-21-indicators-detail-matrix-2026-06-02.md) | Matriz detalhada do escopo operacional | Evidência |
| 8 | [validation-checklist.md](validation-checklist.md) | Checklist de validação | Qualidade |

## Escopo do produto

O **escopo operacional do produto continua sendo de 21 métricas**: 15 indicadores do Componente III — Qualidade (B1–B6, C1–C7 e M1–M2) e 6 subindicadores operacionais do Componente II — Vínculo e Acompanhamento Territorial (CVAT1–CVAT6). Esse escopo não deve ser confundido com o catálogo oficial mais amplo, que atualmente também lista notas para equipes de Atenção Primária Prisional, Consultório na Rua e Saúde da Família Ribeirinha [1].

A Nota Técnica nº 08/2026 atualizou o cálculo quadrimestral dos Componentes II e III: os resultados mensais servem ao monitoramento, os resultados quadrimestrais são obtidos pela média dos meses válidos e a Nota Final do Componente III é calculada pela ponderação dos indicadores [2]. Para C2 e C3 há tratamento específico para meses sem crianças completando dois anos ou sem gestações que atinjam o 42º dia de puerpério [2].

## Bloqueio do C1

O C1 está **bloqueado por contrato de dados**. A regra oficial exige a relação entre atendimentos de demanda programada e o total de atendimentos. O contrato analítico auditado não comprova ponta a ponta a relação entre `tb_fat_atendimento_individual.co_dim_tipo_atendimento`, `tb_dim_tipo_atendimento.co_seq_dim_tipo_atendimento` e um campo semântico versionado. A chave estrangeira do fato não pode ser interpretada diretamente como code set. Sem a dimensão, o campo semântico, a cardinalidade e a vigência comprovados, qualquer percentual seria uma heurística não autorizada.

O comportamento canônico deve ser `blocked_by_source`, com motivo sanitizado, evidência do schema e abertura da issue [c1-data-contract-issue-2026-08-26.md](c1-data-contract-issue-2026-08-26.md). Não publicar percentual substituto.

## Riscos técnicos e operacionais prioritários

A auditoria S10 encerrou como falsos alarmes as alegações genéricas de ausência de idempotência, município/UF fixos, routers centrais sem typecheck e backend inexistente. A evidência vale somente para o caminho controlado em que foi observada; o checkout `PUBLIC_STANDALONE` atual não contém o importador/backend e não deve declarar essas capacidades como próprias. Permanecem prioritários o contrato do C1, a resolução de identidade FCI/FCDT e a validação dos vínculos entre equipes. A normalização está registrada em [../fiocruz-core-research/s10-findings-normalization.md](../fiocruz-core-research/s10-findings-normalization.md).

A Nota Técnica nº 12/2025 e a Nota Informativa nº 13/2025 determinam que dados enviados por versões incompatíveis com o Siaps não sejam considerados válidos a partir de 1º de janeiro de 2026. O catálogo de versões local deve ser conferido na página oficial de versões do e-SUS APS antes de qualquer sincronização [3] [4].

## Fontes oficiais locais

Os arquivos oficiais fornecidos para consulta estão em [../Saúde Brasil 360](../Saúde%20Brasil%20360/). Eles incluem as notas metodológicas B1–B6, C1–C7 e M1–M2, a Nota Técnica nº 30/2025 e a apresentação do componente de qualidade.

A cópia local é uma referência de trabalho. A vigência deve ser conferida novamente no [índice oficial de Notas Metodológicas do Siaps][1] antes de alterar fórmula, janela, peso, CBO, código de procedimento, modelo de informação ou critério de elegibilidade.

## Documentos históricos

Arquivos com datas anteriores, relatórios de auditoria, protótipos e materiais de pesquisa permanecem preservados para rastreabilidade. Eles não alteram o contrato canônico. O arquivo [legacy-previne-migration.md](../legacy-previne-migration.md) deve ser consultado apenas para migração e comparação.

## Convenção de status

| Status | Significado |
|---|---|
| `official_validated` | Fonte oficial específica revisada e suficiente para sustentar a regra documentada. |
| `official_validated_pending_review` | Existe fonte específica, mas ainda há dependência de revisão interna, complemento ou validação de schema. |
| `requires_official_validation` | A implementação não pode ser tratada como normativamente encerrada. |
| `blocked_by_source` | A fonte de dados ou o contrato necessário não permite calcular a regra com segurança. |
| `derived_operational_rule` | Regra operacional derivada de fonte oficial, sem equivalência a fórmula normativa publicada. |
| `deprecated` | Material preservado apenas para migração, comparação ou histórico. |

## Política de manutenção

Toda alteração deve registrar data de revisão, URL oficial consultada, identificador da fonte, versão da regra e impacto no runtime. Quando a fonte oficial não fechar uma regra, a documentação deve declarar a pendência em vez de preencher a lacuna com aproximação.

Não incluir CPF, CNS, nome, telefone, endereço ou SQL bruto em payloads agregados, logs ou exemplos públicos. Qualquer mudança de numerador, denominador, janela, coorte, CBO, code set ou campo de identidade exige nova revisão documental, teste e atualização do changelog.

## Referências

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Ministério da Saúde — Notas Metodológicas do Siaps"
[2]: https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf "Ministério da Saúde — Nota Técnica nº 08/2026"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Ministério da Saúde — Nota Técnica nº 12/2025"
[4]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Ministério da Saúde — Nota Informativa nº 13/2025"

**Última revisão:** 2026-08-26.
