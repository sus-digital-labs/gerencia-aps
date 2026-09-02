# LEDI Correction Capabilities

## Objetivo

Mapear o que pode (e o que não pode) ser corrigido via fluxo operacional com geração de payload LEDI.

## Regras duras

1. LEDI corrige por modelo oficial, não por UPDATE em tabela.
2. Sem modelo oficial suportado, o sistema apenas orienta ação no PEC.
3. Credenciais LEDI são próprias da API/instalação local.
4. O servidor central nunca recebe senha de banco PEC.

## Capabilities por domínio

| Domínio | Capacidade operacional | Corrigível via app | Modelo LEDI provável | status_fonte |
| --- | --- | --- | --- | --- |
| Cadastro individual | completar/atualizar dados permitidos | Não habilitado | MICI | blocked_by_official_contract |
| Cadastro domiciliar/territorial | vínculo domicílio/família/território | Não habilitado | Cadastro Domiciliar/Territorial | blocked_by_policy |
| Visita domiciliar | registrar visita válida no período | Não habilitado | Ficha de Visita Domiciliar | blocked_by_policy |
| Vacinação/imunização | registro de vacinação elegível | Não habilitado | MIV | blocked_by_official_contract |
| Atendimento/procedimento APS | registrar evidência clínica permitida | Não habilitado | MIAI | blocked_by_official_contract |
| Saúde bucal | evidências odontológicas | Não habilitado | Atendimento Odontológico | blocked_by_policy |
| eMulti | atendimentos/ações interprofissionais | Não habilitado | Registro eMulti | blocked_by_policy |
| Pendência sem modelo oficial | orientação operacional | Não | n/a | blocked_by_policy |

## Tratamento de status no envio LEDI

### HTTP 200

- marcar `LEDI_ACCEPTED`
- registrar protocolo/correlação sem PII
- aguardar confirmação por sync subsequente

### HTTP 400/422 com categoria oficial parseada

- marcar `LEDI_VALIDATION_ERROR` somente quando a resposta oficial identifica validação clínica
- armazenar erro sanitizado (sem payload bruto)
- devolver feedback acionável ao executor

Sem categoria oficial parseada, um `400/422` permanece erro remoto desconhecido;
o status HTTP sozinho não prova validação ou desserialização.

### HTTP 408/429/5xx/timeout

- classificar pela resposta real; `5xx` genérico não é desserialização
- marcar `LEDI_RETRY_SCHEDULED` quando transitório
- aplicar retry idempotente com backoff
- notificar fila de operação

## Retry idempotente

- chave idempotente: `tenant + installation + municipality + correction_id + model + model_version + competence + canonical_payload_hash`
- `max_attempts` é configurável e persistido, limitado pelo schema
- autenticação permite uma única renovação/retry; segunda falha é dead-letter local
- claim usa `lease_owner`, token de fencing e `lease_expires_at`; recovery após crash é auditado
- nunca duplicar protocolo de correção validada
- nunca regenerar UUID no retry da mesma submissão lógica

`FAILED_PERMANENT` é o estado local usado como dead-letter após esgotamento; não
é tratado como código ou diagnóstico retornado pelo PEC.

## Matriz fail-closed implementada

| correction_type | modelo obrigatório | business_reason_code | estado sem contrato |
| --- | --- | --- | --- |
| UPDATE_INDIVIDUAL_REGISTRATION | MICI | enum fechado obrigatório | BLOCKED_BY_OFFICIAL_CONTRACT |
| UPDATE_INDIVIDUAL_ATTENDANCE | MIAI | enum fechado obrigatório | BLOCKED_BY_OFFICIAL_CONTRACT |
| UPDATE_VACCINATION | MIV | enum fechado obrigatório | BLOCKED_BY_OFFICIAL_CONTRACT |
| UPDATE_HOME_VISIT | sem binding aprovado | enum fechado obrigatório | BLOCKED_BY_POLICY |

## Estado do binding

O repositório não contém IDL Thrift oficial versionado, binding gerado com
proveniência ou golden bytes para MICI/MIAI/MIV. Portanto, a geração e o envio
estão fail-closed como `BLOCKED_BY_OFFICIAL_CONTRACT`. O antigo encapsulamento
JSON/Base64 não é LEDI e não pode ser usado.

## Correlação sem PII

- `correlation_id`
- `agent_id`
- `installation_id`
- `municipality_ibge`
- `correction_id`
- `indicator_code`
- `model_version`

## Eventos mínimos obrigatórios

- `CORRECTION_DRAFT_CREATED`
- `CORRECTION_SUBMITTED`
- `CORRECTION_APPROVED`
- `CORRECTION_REJECTED`
- `LEDI_PAYLOAD_GENERATED`
- `LEDI_SENT`
- `LEDI_ACCEPTED`
- `LEDI_VALIDATION_ERROR`
- `LEDI_DESERIALIZATION_ERROR`
- `LEDI_RETRY_SCHEDULED`
- `LEDI_CONFIRMED_BY_REPLICA`
- `LEDI_NOT_REFLECTED_AFTER_SYNC`
