# C5 — Hipertensão

## 1) Identificação

- código: `C5`
- nome: Hipertensão
- componente: APS
- fonte normativa/oficial: indicador APS de acompanhamento da pessoa hipertensa
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: condições crônicas + sinais vitais + atendimentos

## 2) Público-alvo

- pessoas hipertensas elegíveis no território

## 3) Denominador

- população hipertensa elegível no período e vinculada à APS

## 4) Numerador

- indivíduos com evidência mínima de acompanhamento (ex.: PA aferida) na janela válida

## 5) Janelas temporais

- janela de competência e período de avaliação da condição

## 6) CBOs permitidos

- enfermagem e médico APS, conforme regra oficial
- status: `requires_official_validation`

## 7) CNES/INE necessários

- unidade e equipe responsáveis pelo acompanhamento

## 8) Campos PEC/DW necessários

- condição hipertensão
- pressão arterial (quando exigida)
- data/competência
- profissional/CBO
- escopo territorial

## 9) Tabelas PEC/DW prováveis

- `DW.fat_condicoes_cronicas`
- `DW.fat_sinais_vitais`
- `DW.fat_atendimento_aps`
- `DW.dim_cidadao`

## 10) Joins necessários

1. condição crônica -> cidadão
2. sinais vitais/atendimento -> cidadão
3. atendimento -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- aferição/registro válido dentro da janela
- vínculo com equipe responsável

## 12) Regras de descarte

- ausência de identificação
- sinal vital fora da janela
- CBO/escopo incompatível
- duplicidade de registro

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C5_NO_BP_IN_WINDOW` | falta PA aferida no período | não pontua |
| `C5_SCOPE_MISMATCH` | unidade/equipe divergente | descarte |
| `C5_STALE_SYNC` | atraso de sync/freshness | pendência técnica |

## 14) Ação recomendada

- agendar atendimento para aferição
- validar escopo da equipe
- reprocessar sync se atraso técnico

Perfil/CBO que pode corrigir: enfermagem/médico da equipe APS com escopo válido.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento individual com sinais vitais (`requires_official_validation`)
- payload alto nível: cidadão, data, PA, profissional/CBO, unidade/equipe
- validações locais: janela, escopo, consistência dos sinais vitais
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via próxima sync: evidência clínica refletida no DW e recontagem

## 16) Testes esperados

- conta quando há PA no período
- não conta sem PA
- não conta por CBO incompatível
- LEDI 400 com erro de validação clínica
- confirmação após sync incremental
