# Calendário Siaps 2026

**Fonte oficial:** Ministério da Saúde — Calendário Siaps [1]  
**Revisão local:** 2026-08-26

O Siaps informa que, para fins de cofinanciamento, a transmissão de dados deve ocorrer mensalmente até o décimo dia útil do mês subsequente ao registro [1]. O calendário abaixo reproduz as datas publicadas para 2026.

| Competência | Período | Data limite |
|---|---|---:|
| Dezembro/2025 | 01/12/2025 a 31/12/2025 | 15/01/2026 |
| Janeiro/2026 | 01/01/2026 a 31/01/2026 | 13/02/2026 |
| Fevereiro/2026 | 01/02/2026 a 28/02/2026 | 13/03/2026 |
| Março/2026 | 01/03/2026 a 31/03/2026 | 15/04/2026 |
| Abril/2026 | 01/04/2026 a 30/04/2026 | 15/05/2026 |
| Maio/2026 | 01/05/2026 a 31/05/2026 | 16/06/2026 |
| Junho/2026 | 01/06/2026 a 30/06/2026 | 14/07/2026 |
| Julho/2026 | 01/07/2026 a 31/07/2026 | 14/08/2026 |
| Agosto/2026 | 01/08/2026 a 31/08/2026 | 15/09/2026 |
| Setembro/2026 | 01/09/2026 a 30/09/2026 | 15/10/2026 |
| Outubro/2026 | 01/10/2026 a 31/10/2026 | 16/11/2026 |
| Novembro/2026 | 01/11/2026 a 30/11/2026 | 14/12/2026 |
| Dezembro/2026 | 01/12/2026 a 31/12/2026 | 15/01/2027 |

## Procedimento interno

O lote deve ser fechado por competência, validado antes do envio e identificado por uma chave idempotente. O produto deve registrar a data efetiva de envio, a resposta da validação, a versão do sistema de origem e o modelo de informação utilizado.

A data limite não altera a fórmula do indicador. Ela define a janela operacional de transmissão e deve ser usada para orientar alertas, reconciliação e fechamento de competência.

## Referência

[1]: https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/calendario-siaps/ "Ministério da Saúde — Calendário Siaps 2026"
