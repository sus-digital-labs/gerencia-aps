# Catálogo documental — SUS Analytics Web

**Revisão:** 2026-08-26

Esta pasta contém a documentação técnica, normativa e operacional do SUS Analytics Web. O módulo Saúde Brasil 360 é organizado por precedência de fonte, contrato de dados, operação, validação e histórico.

> **Regra de precedência:** notas metodológicas e normativas oficiais do Ministério da Saúde prevalecem sobre código legado, relatórios antigos, protótipos e inferências do banco local.

## Ordem obrigatória de leitura

1. [13-saude-brasil-360/README.md](13-saude-brasil-360/README.md) — entrada canônica.
2. [sources/official-sources-registry.md](sources/official-sources-registry.md) — registro mestre de fontes.
3. [sources/external-research-2026-08-26.md](sources/external-research-2026-08-26.md) — fontes consultadas nesta revisão.
4. [13-saude-brasil-360/00-canonical-status-2026-08-26.md](13-saude-brasil-360/00-canonical-status-2026-08-26.md) — status e bloqueadores.
5. [13-saude-brasil-360/official-catalog-2026-08-26.md](13-saude-brasil-360/official-catalog-2026-08-26.md) — catálogo e escopo.
6. [13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md](13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md) — issue P0 do C1.
7. [13-saude-brasil-360/siaps-operational-compatibility-2026-08-26.md](13-saude-brasil-360/siaps-operational-compatibility-2026-08-26.md) — compatibilidade.
8. [13-saude-brasil-360/siaps-calendar-2026.md](13-saude-brasil-360/siaps-calendar-2026.md) — calendário 2026.
9. [official-indicators-registry.md](official-indicators-registry.md) — registro interno.
10. [operational-matrix.md](operational-matrix.md) — matriz de implementação.
11. [rule-versioning.md](rule-versioning.md) — versionamento.
12. [data-quality-rules.md](data-quality-rules.md) — qualidade e reconciliação.
13. [privacy-rbac-contract.md](privacy-rbac-contract.md) — privacidade e acesso.
14. [validation/official-sources.md](validation/official-sources.md) — fontes.
15. [validation/test-scenarios.md](validation/test-scenarios.md) — testes.

## Escopo operacional de 21 métricas

| Bloco | Códigos |
|---|---|
| Saúde Bucal | B1–B6 |
| Cuidado Integral | C1–C7 |
| eMulti | M1–M2 |
| Vínculo e Acompanhamento Territorial | CVAT1–CVAT6 |

O catálogo oficial do Siaps também lista P1–P6, CR1–CR4 e R1–R6. Esses grupos permanecem fora do escopo atual e não devem ser apresentados como implementados.

## Status consolidado

O C1 está `blocked_by_source`: o schema auditado de `tb_fat_atendimento_individual` não comprova a variável de demanda programada/espontânea exigida pela regra oficial. Não usar heurística nem publicar percentual substituto.

C2–C7, B1–B6 e M1–M2 mantêm seus status individuais. Quando houver proxy, fallback, code set não confirmado ou pendência de schema, o status permanece `requires_official_validation`. CVAT1–CVAT6 são regras operacionais derivadas.

## Regras de manutenção

Antes de alterar uma regra, consultar o registro de fontes, conferir o modelo de informação e registrar a nova `ruleVersion`. Ausência de campo obrigatório produz bloqueio; não autoriza inferência.

Toda ingestão deve registrar versão de origem, modelo de informação, competência, chave idempotente, resultado da validação e motivo de rejeição. Não incluir PII ou SQL bruto em agregados, logs ou exemplos públicos.

Relatórios datados, auditorias, protótipos e materiais de migração permanecem como evidência histórica e não têm precedência sobre o registro de fontes.

**Última revisão:** 2026-08-26.
