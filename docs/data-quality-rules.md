# Data Quality Rules

| Codigo | Tipo | Severidade | Afeta denominador? | Afeta numerador? | Exibe em pendencia? | Permite retorno nominal? | Permissao necessaria | Observacao |
|---|---|---|---|---|---|---|---|---|
| `MISSING_CPF_OR_CNS` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `INVALID_CNS_TRAINING` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MISSING_BIRTH_DATE` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `CITIZEN_NOT_LINKED_TO_TEAM` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `CITIZEN_NOT_LINKED_TO_HOUSEHOLD` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `RESPONSIBLE_WITHOUT_INDIVIDUAL_CADASTRE` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MISSING_REQUIRED_PROCEDURE` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MISSING_REQUIRED_MEASUREMENT` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `INVALID_TEMPORARY_CID_CIAP` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `INVALID_CBO` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `OUT_OF_TIME_WINDOW` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MONTH_WITHOUT_OUTCOME_DISCARDED` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `DUPLICATED_CPF_CNS` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `DW_ETL_NOT_UPDATED` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `LEDI_PAYLOAD_REJECTED` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `LEDI_DESERIALIZATION_ERROR` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MOBILE_DEVICE_NOT_SYNCED` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `NIGHT_PROCESSING_PENDING` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `HOUSEHOLD_WITHOUT_RESPONSIBLE` | rejeição/pendência | alta | sim | sim | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | responsável declarado exige CPF ou CNS; verificar duplicidade antes de corrigir |
| `CNES_INE_MISMATCH_REQUIRES_VALIDATION` | rejeição/pendência | alta | sim | sim | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | validar o par CNES/INE no SCNES da competência; não inferir vínculo |
| `INVALID_PROFESSIONAL_IDENTITY` | rejeição | alta | sim | sim | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | CNS profissional deve existir e estar ativo no SCNES aplicável |
| `MISSING_CBO` | rejeição | alta | sim | sim | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | validar CBO e compatibilidade com o tipo de ficha |

## Regras de processamento

- CPF e CNS são identificadores concorrentes. A resolução de identidade deve manter a proveniência e sinalizar ambiguidades; nunca mesclar pessoas apenas por nome ou endereço.
- O par CNES/INE deve ser validado na competência do evento.
- CNS e CBO do profissional devem ser validados contra a referência SCNES aplicável.
- Registros rejeitados pelo LEDI/SISAB permanecem auditáveis e não entram silenciosamente nos numeradores ou denominadores.
- Falta de fonte, tabela vazia ou réplica indisponível gera estado explícito e não autoriza dados sintéticos.
