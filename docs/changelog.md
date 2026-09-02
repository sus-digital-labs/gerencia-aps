# Changelog

## 2026-05-16
- criou catalogo canonical Saude Brasil 360.
- reclassificou previne* como legado/deprecated.
- adicionou templates obrigatorios para indicadores e subindicadores.
- consolidou matriz operacional e backlog IND_21.

## 2026-08-26

- Atualizou o índice raiz e a sequência canônica do módulo Saúde Brasil 360.
- Incorporou o catálogo oficial vigente do Siaps, incluindo C1–C7, B1–B6, M1–M2, P1–P6, CR1–CR4 e R1–R6, com separação explícita do escopo operacional do produto.
- Manteve o escopo operacional em 21 métricas: 15 indicadores de Qualidade APS e 6 subindicadores CVAT.
- Registrou fontes oficiais atualizadas: Nota Técnica nº 08/2026, Nota Técnica nº 12/2025, Nota Informativa nº 13/2025, versão e-SUS APS 5.5.24 e Calendário Siaps 2026.
- Classificou o C1 como `blocked_by_source` por ausência comprovada da variável oficial de tipo de demanda no contrato auditado de `tb_fat_atendimento_individual`.
- Criou a issue P0 `C1_BLOCKED_BY_DATA_CONTRACT` com critérios de aceite, testes, backfill e comportamento fail-closed.
- Corrigiu a cronologia institucional do Siaps para a Portaria GM/MS nº 7.639, de 18 de julho de 2025.
- Documentou a compatibilidade de versões e o risco operacional de dados enviados por aplicações descontinuadas.
- Organizou os documentos oficiais locais e classificou relatórios, protótipos e materiais antigos como evidência histórica.
- Removeu referências a modelos, provedores e agentes automáticos das áreas de documentação e código versionável.
