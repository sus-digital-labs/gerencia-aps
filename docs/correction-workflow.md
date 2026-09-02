# Correction Workflow (Indicador → LEDI → Confirmação)

## Fluxo operacional

1. Pendência detectada no cálculo de indicador.
2. Classificação de causa raiz e elegibilidade de correção.
3. Verificação de RBAC + CBO + escopo territorial.
4. Criação de rascunho de correção (formulário operacional).
5. Validação local de consistência.
6. Aprovação (quando política exigir).
7. Geração de payload LEDI.
8. Envio de comando ao agente local.
9. Agente despacha para PEC/LEDI local.
10. Registro de sucesso/erro técnico.
11. Próxima sincronização confirma entrada da evidência.

## Estados sugeridos

- `draft`
- `submitted`
- `approved`
- `rejected`
- `ledi_generated`
- `ledi_sent`
- `ledi_accepted`
- `ledi_error`
- `awaiting_sync_confirmation`
- `confirmed_by_replica`
- `not_reflected_after_sync`

## Regras de aprovação

- sem aprovação para ações técnicas sem impacto clínico
- com aprovação para ações clínicas/cadastrais sensíveis
- obrigatória aprovação municipal em cenários de alto risco regulatório

## Validações locais antes de LEDI

- campos obrigatórios preenchidos
- compatibilidade de CBO/perfil
- escopo municipal + CNES + INE válido
- janela temporal do indicador vigente
- deduplicação por chave idempotente

## Eventos de auditoria

- sempre sem PII em log operacional
- vínculo com `correlation_id` e `correction_id`
- trilha completa de quem criou, aprovou, enviou e confirmou

## SLA sugerido

- validação inicial: até 24h
- aprovação: até 48h (quando aplicável)
- retry técnico: automático com backoff
- confirmação por sync: conforme janela incremental do agente

## status_fonte

- workflow e eventos: `confirmed` (diretriz arquitetural)
- SLA e política por município: `requires_official_validation`
