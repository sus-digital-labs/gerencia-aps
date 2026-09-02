# Data Quality Rules

| Codigo | Tipo | Severidade | Afeta denominador? | Afeta numerador? | Exibe em pendencia? | Permite retorno nominal? | Permissao necessaria | Observacao |
|---|---|---|---|---|---|---|---|---|
| `MISSING_CPF_OR_CNS` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `INVALID_CNS_TRAINING` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `MISSING_BIRTH_DATE` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `CITIZEN_NOT_LINKED_TO_TEAM` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `CITIZEN_NOT_LINKED_TO_HOUSEHOLD` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
| `HOUSEHOLD_WITHOUT_RESPONSIBLE` | descarte/pendencia/issue | media | depende | depende | sim | sim (RBAC) | `saude360.data_quality.nominal_data` | detalhar por regra |
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
