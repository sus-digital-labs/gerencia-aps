# Indicator Field Catalog - Canonical Saude Brasil 360

## Fonte unica canonica
- Saude Brasil 360: canonical/current.
- Previne Brasil: legacy_runtime/deprecated_contract/migration_reference_only.
- Fonte metodologica prioritaria desta fase: `docs/Saude Brasil 360/*`.

## Ordem de leitura
1. [legacy-previne-migration.md](legacy-previne-migration.md)
2. [sources/official-sources-registry.md](sources/official-sources-registry.md)
3. [sources/source-review-checklist.md](sources/source-review-checklist.md)
4. [sources/saude-brasil-360.md](sources/saude-brasil-360.md)
5. [sources/cofinanciamento-aps.md](sources/cofinanciamento-aps.md)
6. [sources/saude-bucal-esb.md](sources/saude-bucal-esb.md)
7. [sources/emulti.md](sources/emulti.md)
8. [rule-versioning.md](rule-versioning.md)
9. [data-sources.md](data-sources.md)
10. [freshness-cache-contract.md](freshness-cache-contract.md)
11. [privacy-rbac-contract.md](privacy-rbac-contract.md)
12. [data-quality-rules.md](data-quality-rules.md)
13. [operational-matrix.md](operational-matrix.md)
14. [implementation-backlog-ind21.md](implementation-backlog-ind21.md)
15. [post-implementation-hardening.md](post-implementation-hardening.md)
16. [normative-alignment-audit.md](normative-alignment-audit.md)
17. [validation/official-sources.md](validation/official-sources.md)
18. [validation/test-scenarios.md](validation/test-scenarios.md)

## Fontes oficiais do projeto
- Registro mestre: [sources/official-sources-registry.md](sources/official-sources-registry.md)
- Checklist de revisao: [sources/source-review-checklist.md](sources/source-review-checklist.md)
- Contexto institucional: [sources/saude-brasil-360.md](sources/saude-brasil-360.md)
- Cofinanciamento APS: [sources/cofinanciamento-aps.md](sources/cofinanciamento-aps.md)
- Bloco eSB: [sources/saude-bucal-esb.md](sources/saude-bucal-esb.md)
- Bloco eMulti: [sources/emulti.md](sources/emulti.md)
- Copias locais oficiais desta fase: `docs/Saude Brasil 360/*`

## Ordem obrigatoria antes de codar ou reescrever regra
1. consultar [sources/official-sources-registry.md](sources/official-sources-registry.md)
2. verificar a nota metodologica especifica do indicador em `docs/Saude Brasil 360`
3. aplicar [sources/source-review-checklist.md](sources/source-review-checklist.md)
4. abrir ou atualizar [normative-alignment-audit.md](normative-alignment-audit.md) se houver divergencia
5. atualizar `ruleVersion` quando numerador, denominador, janela, CBO ou code set mudarem
6. so entao alterar o calculo canonico

## Indicadores
- ESF: [C1](indicators/C1.md), [C2](indicators/C2.md), [C3](indicators/C3.md), [C4](indicators/C4.md), [C5](indicators/C5.md), [C6](indicators/C6.md), [C7](indicators/C7.md)
- ESB: [B1](indicators/B1.md), [B2](indicators/B2.md), [B3](indicators/B3.md), [B4](indicators/B4.md), [B5](indicators/B5.md), [B6](indicators/B6.md)
- eMulti: [M1](indicators/M1.md), [M2](indicators/M2.md)

## Escopo operacional do projeto — 21 metricas

O projeto trata **21 metricas operacionais**:
- **15 indicadores de Qualidade APS**: B1-B6, C1-C7, M1-M2
- **6 regras operacionais CVAT** (Vinculo e Acompanhamento Territorial): CVAT1-CVAT6

Registro canonico completo: [official-indicators-registry.md](official-indicators-registry.md)

## Status consolidado — Componente de Qualidade APS (15 indicadores)
- `validated_runtime_public`: `C1..C7`, `B1..B6`, `M1`, `M2`
- estados honestos dentro do runtime publicado:
  - `B1`: `blocked_by_source`
  - `B5`: `empty_denominator`
- `requires_official_validation`: mantido em todos os 15 indicadores de Qualidade APS publicados
- alinhamento normativo P0 fechado nesta rodada:
  - `C5`: corrigido para hipertensao
  - `B3`: corrigido para taxa de exodontia
  - `B4`: corrigido para escovacao supervisionada 6 a 12 anos
  - `B5`: corrigido para procedimentos preventivos individuais
  - `B6`: corrigido para ART sobre restauradores
- proximo foco: hardening de denominador/escopo e reducao de proxies, nao implementacao de novos indicadores

## Status consolidado — CVAT (6 regras operacionais)
- `derived-operational-rule`: CVAT1-CVAT6 operam com regras derivadas da NT 30/2025
- endpoints tRPC: `saudeBrasil360.cvatCalcularEquipe`, `saudeBrasil360.cvatRankingEquipes`, `saudeBrasil360.cvatSimularFinanceiro`, `saudeBrasil360.cvatResumoMunicipal`
- pendencia: nota metodologica oficial detalhada nao publicada ate 2026-05-20
- source map: [cvat-source-map.md](../\_context/cvat-source-map.md)

## Regra de honestidade
- `validated_runtime_public` nao equivale a `normative_validated`.
- documentacao nao prova runtime.
- warning, proxy ou fallback so saem com fonte oficial especifica, teste e smoke local/publico.
