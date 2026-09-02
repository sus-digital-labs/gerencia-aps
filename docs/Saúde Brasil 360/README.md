# Saúde Brasil 360 — fontes oficiais locais

**Revisão:** 2026-08-26

Esta pasta preserva os manuais, notas metodológicas e documentos oficiais utilizados como evidência local para o módulo Saúde Brasil 360. Os PDFs e arquivos assinados aqui armazenados não são alterados pelo produto; a vigência deve ser reconferida no portal do Ministério da Saúde antes de qualquer mudança de regra.

## Ordem de consulta

| Ordem | Conteúdo | Uso |
|---:|---|---|
| 1 | [INDICE_COMPLETO.md](INDICE_COMPLETO.md) | Inventário e sequência desta pasta. |
| 2 | Notas metodológicas C1–C7 | Fórmulas e critérios do cuidado integral. |
| 3 | Notas metodológicas B1–B6 | Fórmulas e critérios de Saúde Bucal. |
| 4 | Notas metodológicas M1–M2 | Fórmulas e critérios de eMulti. |
| 5 | Nota Técnica nº 30/2025 | Referência local para CVAT, sujeita à conferência de vigência. |
| 6 | Documentos de modelos, manuais e preenchimento | Campos, origem e operação do e-SUS APS. |
| 7 | Relatórios, planilhas e textos de apoio datados | Evidência histórica; não substituem a fonte primária. |

## Regra de precedência

A nota metodológica específica do indicador prevalece sobre o texto de apoio, a matriz interna, o código legado, a planilha e o relatório histórico. A presença de um PDF na pasta não significa que ele seja a versão mais recente; compare sempre com o [índice oficial de Notas Metodológicas do Siaps](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/).

## Escopo do produto

O produto utiliza este acervo para sustentar 21 métricas operacionais: B1–B6, C1–C7, M1–M2 e CVAT1–CVAT6. O catálogo oficial do Siaps é mais amplo e também contém P1–P6, CR1–CR4 e R1–R6, que estão fora do escopo operacional atual.

## Bloqueio conhecido do C1

A regra oficial do C1 exige a relação entre demanda programada e total de atendimentos. A documentação local não substitui a variável ausente no schema auditado de `tb_fat_atendimento_individual`. Enquanto o contrato não comprovar o tipo de demanda, consulte [a issue técnica do C1](../13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md) e mantenha o indicador bloqueado, sem heurística.

## Materiais históricos

Arquivos de pesquisa, protótipos, textos sobre QualiSUS/PHP/XAMPP/Apache/MariaDB local e matrizes antigas são preservados para rastreabilidade. Eles não definem a arquitetura, o runtime, a instalação, o deploy ou a fonte operacional atual do produto.

A arquitetura atual deve ser consultada em [../architecture/distributed-ingestion.md](../architecture/distributed-ingestion.md), [../architecture.md](../architecture.md) e [../architecture/agent-rust-architecture.md](../architecture/agent-rust-architecture.md), quando esses arquivos existirem no checkout.

## Referências

- [Siaps — Notas Metodológicas](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/)
- [Siaps — Calendário 2026](https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/)
- [e-SUS APS — Normativas e Portarias](https://sisaps.saude.gov.br/sistemas/esusaps/docs/materiais-de-apoio/normativas-portarias/)
- [Registro mestre de fontes do projeto](../sources/official-sources-registry.md)

**Status:** acervo local organizado; PDFs oficiais preservados; materiais históricos explicitamente não normativos.
