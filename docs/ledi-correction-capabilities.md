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
| Cadastro individual | completar/atualizar dados permitidos | Parcial | Cadastro Individual | requires_official_validation |
| Cadastro domiciliar/territorial | vínculo domicílio/família/território | Parcial | Cadastro Domiciliar/Territorial | requires_official_validation |
| Visita domiciliar | registrar visita válida no período | Parcial | Ficha de Visita Domiciliar | requires_official_validation |
| Vacinação/imunização | registro de vacinação elegível | Parcial | Imunização | requires_official_validation |
| Atendimento/procedimento APS | registrar evidência para numerador | Parcial | Atendimento Individual/Procedimento | requires_official_validation |
| Saúde bucal | evidências odontológicas | Parcial | Atendimento Odontológico | requires_official_validation |
| eMulti | atendimentos/ações interprofissionais | Parcial | Registro eMulti | requires_official_validation |
| Pendência sem modelo oficial | orientação operacional | Não | n/a | confirmed |

## Tratamento de status no envio LEDI

### HTTP 200

- marcar `LEDI_ACCEPTED`
- registrar protocolo/correlação sem PII
- aguardar confirmação por sync subsequente

### HTTP 400

- marcar `LEDI_VALIDATION_ERROR`
- armazenar erro sanitizado (sem payload bruto)
- devolver feedback acionável ao executor

### HTTP 5xx/timeout

- marcar `LEDI_DESERIALIZATION_ERROR` ou `LEDI_RETRY_SCHEDULED`
- aplicar retry idempotente com backoff
- notificar fila de operação

## Retry idempotente

- chave idempotente: `tenant + installation + municipality + correction_id + model + competence`
- política sugerida: exponencial (ex.: 30s, 2m, 10m, 30m, 2h) com limite configurável
- nunca duplicar protocolo de correção validada

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
