# Normalização dos achados S10

**Data:** 2026-08-27  
**Escopo:** checkout `PUBLIC_STANDALONE` e evidência controlada registrada pela S10.

| Achado antigo | S10 | Estado atual | Ação |
|---|---|---|---|
| Backend atual não existe | `FALSE_ALARM` | A afirmação universal foi desmentida; este checkout standalone, especificamente, não inclui backend ativo | Remover alegação genérica e declarar o escopo do checkout. |
| Importação/upsert inexistente | `FALSE_ALARM` | `VERIFIED_IN_CONTROLLED_PATH`; a S10 registrou `ON CONFLICT DO UPDATE` e outbox, mas o código não está neste checkout | Preservar a evidência; reexecutar os testes no checkout que contém o importador. |
| Idempotência completa | `PARTIAL` | Confirmada onde implementada, sem prova universal de conflict target, campos imutáveis ou colisão entre tenants | Não promover a garantia além do caminho auditado. |
| Município/UF hardcoded | `FALSE_ALARM` | Runtime standalone exige IBGE, nome, UF e centro do mapa; não há fallback municipal silencioso | Manter testes de configuração. |
| Router central usa `@ts-nocheck` | `FALSE_ALARM` | Nenhuma ocorrência em código frontend ativo; routers/backend estão fora deste checkout | Manter busca no release-check. |
| Dois routers ativos divergentes | `LEGACY_ONLY` | Arquivos históricos estão removidos do working tree | Não restaurar nem tratar como incidente atual. |
| C1 pode usar evidência genérica de acesso | `CONFIRMED` como risco | Proibido; contrato permanece incompleto | `ISSUE_FIRST`, `FAIL_CLOSED`. |
| Escopo total é 15 indicadores | `FIXED` | 21 cálculos: 15 Qualidade APS + 6 métricas CVAT | Guard automatizado no registry/release-check. |
| B4/B5 com nomes históricos | `CONFIRMED` | Encontrado em componentes ativos | Corrigido e coberto por regressão. |

## Limite da evidência

`VERIFIED_IN_CONTROLLED_PATH` não significa `VERIFIED_IN_PUBLIC_STANDALONE`. Neste checkout, testes reais de upsert são `NOT_RUN` porque a implementação não está presente. Isso não reabre o falso alarme; apenas impede uma afirmação mais ampla que a evidência.
