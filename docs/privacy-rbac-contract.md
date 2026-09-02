# Privacy RBAC Contract

Proibido em agregado: CPF/CNS completo, nome completo, telefone, endereco, connection string, token/JWT.

Permissoes canonicas:
- saude360.indicators.read
- saude360.indicators.pending_list
- saude360.indicators.citizen_diagnostic
- saude360.data_quality.nominal_data

Permissoes legadas (compat): indicators.previne.read, indicators:pending_list, indicators:citizen_diagnostic, data_quality:nominal_data.

Eventos de auditoria:
- saude360_indicator_aggregate_accessed
- saude360_indicator_pending_list_accessed
- saude360_citizen_diagnostic_accessed
- nominal_list_accessed

Payload permitido: user_id, role, indicator_code, program, competencia, unidade_id, equipe_id, timestamp, request_id, returned_count.
Payload proibido: CPF, CNS, nome, telefone, endereco, token, senha, connection string.
