# Casos sintéticos de regressão familiar

Todos os identificadores abaixo são tokens sintéticos e não representam CPF/CNS válidos.

| Caso | Entrada | Resultado esperado |
|---|---|---|
| A — CPF+CNS concordantes | `CPF_X` e `CNS_Y` apontam para `citizen-A` | `MATCH`; uma identidade. |
| B — CNS e CPF posterior | Responsável começa com `CNS_A`; depois recebe `CPF_B` | Mesmo `citizen_id`; vínculos históricos por `CNS_A` permanecem. |
| C — conflito | `CPF_B → citizen-1`; `CNS_A → citizen-2` | `IDENTITY_CONFLICT`; nenhum merge. |
| D — somente CNS | `CPF=null`, `CNS_A` válido e conhecido | `MATCH_BY_CNS`. |
| E — insuficiente | CPF/CNS ausentes ou inválidos | `PENDING_IDENTITY` ou `INVALID_IDENTIFIER`; nenhuma pessoa inventada. |

## Regressão 1 + 5

Fixture inicial: um responsável `citizen-R` identificado por `CNS_RESP` e cinco dependentes cujos vínculos familiares guardam o identificador de origem `CNS_RESP`. Esperado: seis moradores e cinco vínculos.

Atualização: adicionar `CPF_RESP` à mesma identidade, preservando `CNS_RESP`. Esperado: seis moradores, cinco vínculos, um responsável, zero órfãos e nenhum novo `citizen_id`.

Conflito: antes da atualização, associar `CPF_RESP` a outro cidadão. Esperado: `IDENTITY_CONFLICT`, família inalterada e pendência auditável.

## Invariantes executáveis futuros

- Contagem de moradores não muda ao acrescentar alias válido.
- Histórico nunca é religado por aproximação.
- Reprocessar o mesmo evento não cria novo vínculo.
- Conflito não escolhe CPF ou CNS silenciosamente.
- Saída de teste não contém identificadores reais.
