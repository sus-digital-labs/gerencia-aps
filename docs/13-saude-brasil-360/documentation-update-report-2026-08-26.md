# Relatório final de atualização documental — Saúde Brasil 360

**Projeto:** SUS Analytics Web  
**Data da revisão:** 2026-08-26  
**Escopo:** documentação técnica, manuais locais, contratos, fontes e referências tecnológicas em documentação/código versionável.

## Resultado executivo

A documentação foi reorganizada em uma sequência canônica que começa pelo índice do módulo, passa pelo registro mestre de fontes, catálogo oficial, status, issue de contrato, compatibilidade operacional, calendário, contratos internos e validação.

O catálogo oficial do Siaps foi separado do escopo operacional do produto. O projeto permanece com 21 métricas: B1–B6, C1–C7, M1–M2 e CVAT1–CVAT6. P1–P6, CR1–CR4 e R1–R6 permanecem catalogados como oficiais, mas fora do escopo operacional atual.

## Decisões críticas

### C1

O C1 foi classificado como `blocked_by_source` com o código `C1_BLOCKED_BY_DATA_CONTRACT`. A regra requer atendimentos de demanda programada sobre o total de atendimentos elegíveis. O schema auditado de `tb_fat_atendimento_individual` não comprova a variável que distingue demanda programada e espontânea.

A decisão é `ISSUE_FIRST` / `FAIL_CLOSED`: não há heurística por tipo genérico de consulta, procedimento, texto livre ou evidência indireta de acesso. O retorno bloqueado não publica percentual, numerador ou denominador como resultado válido.

### Compatibilidade

Foram incorporadas as regras oficiais de validação por versão e modelo de informação, o cenário de versões incompatíveis e a versão e-SUS APS 5.5.24. O manual registra a necessidade de rejeitar ou manter pendentes lotes incompatíveis, com motivo e linhagem.

### Identidade

Foi documentado o risco de reconciliação entre FCI e FCDT. CPF e CNS não devem ser unidos por aproximação silenciosa. Registros ambíguos permanecem pendentes e são contabilizados separadamente.

### Cronologia

A cronologia foi corrigida para não afirmar que o Siaps foi lançado antes da Portaria GM/MS nº 7.639, de 18 de julho de 2025.

## Arquivos canônicos criados ou atualizados

| Área | Arquivos |
|---|---|
| Índices | `docs/README.md`, `docs/13-saude-brasil-360/README.md`, `docs/Saúde Brasil 360/INDICE_COMPLETO.md` |
| Fontes | `docs/sources/official-sources-registry.md`, `docs/sources/external-research-2026-08-26.md` |
| Catálogo e status | `docs/13-saude-brasil-360/official-catalog-2026-08-26.md`, `docs/13-saude-brasil-360/00-canonical-status-2026-08-26.md` |
| C1 | `docs/13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md`, `docs/11-indicator-field-catalog/indicators/C1.md`, `docs/indicators/C1.md` |
| Operação | `docs/13-saude-brasil-360/siaps-operational-compatibility-2026-08-26.md`, `docs/13-saude-brasil-360/siaps-calendar-2026.md` |
| Acervo local | `docs/Saúde Brasil 360/README.md`, `CADERNO_TECNICO_SAUDE_BRASIL_360.md`, `ANALISE_TABELAS_ESUS.md`, `GUIA_RAPIDO_TABELAS.md`, `PROCESSO_TABELAS_ESUS.md`, `PRIORIDADE_SAUDE_BRASIL_360.md`, `SUMARIO_SINCRONIZACAO.txt`, `PROJETO_FINALIZADO.txt`, `MATRIZ_INDICADORES_CODIGO.md` |
| Registros complementares | `docs/official-indicators-registry.md`, `docs/10-indicators/saude-brasil-360-coverage-matrix.md`, `docs/changelog.md` |

Relatórios históricos e PDFs oficiais foram preservados. Os materiais antigos foram classificados como evidência temporal; não definem o runtime ou as regras vigentes.

## Higienização tecnológica

Foi realizada auditoria nas áreas `docs`, `apps`, `libs`, `scripts`, `esus-pec` e `.github`, excluindo dependências e artefatos gerados. O resultado final foi:

| Verificação | Resultado |
|---|---:|
| Referências editoriais a ferramentas externas | 0 |
| Referências a `temp/qualisus` | 0 |
| Fichas canônicas do C1 com status inválido `ok`/`validated_runtime_public` | 0 |
| Links internos fundamentais ausentes | 0 |

Nomes históricos de branches e autores foram neutralizados quando continham identificadores de provedores ou agentes automáticos.

## Limites da validação

A revisão documental não constitui homologação do Siaps e não substitui execução de build, testes de integração ou validação contra um DW de produção. A reinstalação de dependências e os gates de runtime devem ocorrer no ambiente Windows/CI do projeto. O C1 só pode ser reaberto após os critérios de aceite da issue P0 passarem.

## Fontes oficiais principais

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/ "Índice de Notas Metodológicas do Siaps"
[2]: https://sisaps.saude.gov.br/sistemas/siaps/assets/files/NT_08-2025_cvat-8638ee08a7310014262c2326c234d35a.pdf "Nota Técnica nº 08/2026"
[3]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NT_12-2025_criterio_validacao_dados_siaps-0394bed57dc6efcddaa83dab337f9533.pdf "Nota Técnica nº 12/2025"
[4]: https://sisaps.saude.gov.br/sistemas/esusaps/assets/files/NI_13-2025_cenario_versoes_incompativeis-90647909abe17697641f1a44b859e48a.pdf "Nota Informativa nº 13/2025"
[5]: https://sisaps.saude.gov.br/sistemas/esusaps/docs/Versoes/versao_5_5 "e-SUS APS versão 5.5.24"
[6]: https://www.in.gov.br/en/web/dou/-/portaria-gm/ms-n-7.639-de-18-de-julho-de-2025-643328272 "Portaria GM/MS nº 7.639, de 18 de julho de 2025"

**Status final:** documentação atualizada, sequenciada e validada quanto à presença dos arquivos fundamentais, referências tecnológicas proibidas e bloqueio honesto do C1.
