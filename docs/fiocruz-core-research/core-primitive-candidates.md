# Candidatos de primitives para entrada progressiva no core

| Primitive | Problema | Consumidores comprovados/candidatos | Valor | Risco | Prioridade |
|---|---|---|---|---|---|
| `CalculationContext` | Data/período e filtros implícitos | Diabetes + Hipertensão comprovados no upstream; demais candidatos | Determinismo e teste diferencial | Alterar janela sem querer | 1, após fixture/baseline |
| `DataQualityResult` | Zero confunde fonte ausente, schema e vazio | Saúde Bucal + Cadastro; frontend analítico | Fail-closed transversal | Mudança ampla de contrato | 2 |
| `IdentityResolver` | CPF/CNS concorrentes e vínculos históricos | Cadastro, família e território candidatos | Evita merge/perda silenciosa | PII, concorrência e merge incorreto | 2, após contrato persistente |
| `TeamRelationshipResolver` | eSB↔eSF/eAP por competência | B3, B5 e B6 candidatos | Atribuição reprodutível | Fonte oficial ainda não provada | 3 |
| `MethodologySpec` | Regra, code set e versão dispersos | Todos os cálculos | Rastreabilidade | Abstração prematura | 4 |

Somente `CalculationContext` possui dois consumidores concretos no snapshot upstream, mas continua bloqueado por falta de Parquet/fixture e baseline. Os demais são modelos de pesquisa, não pacotes autorizados.
