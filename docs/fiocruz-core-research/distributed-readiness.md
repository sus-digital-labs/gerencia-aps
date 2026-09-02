# Readiness para distribuição

Não foi implementado Kafka, worker, microserviço ou fila.

| Propriedade | Estado | Evidência/gap |
|---|---|---|
| Cálculo puro | `PARTIAL` | Upstream usa relógio, paths e ambiente implícitos. |
| Contexto serializável | `DESIGNED` | `CalculationContext` proposto, ainda não implementado. |
| Idempotente | `PARTIAL` | S10 confirmou caminho controlado; não reproduzível neste checkout. |
| Particionável | `NEEDS_EVIDENCE` | Competência/equipe são candidatos, mas identidade e vínculos podem cruzar partições. |
| Retriable | `NEEDS_EVIDENCE` | Exige chave de execução, outbox e side effects explícitos. |
| Determinístico | `FAIL` no upstream auditado | `datetime.today()` altera coortes. |
| Saída mergeable | `NEEDS_EVIDENCE` | Unidade de contagem/cardinalidade não está fechada. |
| Dependências explícitas | `PARTIAL` | Fontes e code sets ainda não acompanham todos os resultados. |

## Pré-condições

Primeiro: contratos, identidade, relacionamento, idempotência, período explícito e teste diferencial. Depois: benchmark local e definição de partição. Distribuição somente se custo e volume justificarem.

**Distributed implementation:** `NOT_STARTED`.
