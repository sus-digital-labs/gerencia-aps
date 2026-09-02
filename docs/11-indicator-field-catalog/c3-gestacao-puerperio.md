# C3 — Gestação e Puerpério

## 1) Identificação

- código: `C3`
- nome: Gestação e Puerpério
- componente: APS
- fonte normativa/oficial: indicador APS de pré-natal/puerpério
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: cadastros gestacionais, consultas e exames

## 2) Público-alvo

- gestantes e puérperas elegíveis no território

## 3) Denominador

- gestantes/puérperas elegíveis no período, com vínculo territorial

## 4) Numerador

- usuárias com consultas/exames/evidências mínimas válidas conforme regra

## 5) Janelas temporais

- trimestre gestacional e janela de puerpério conforme norma

## 6) CBOs permitidos

- médico/enfermagem APS e profissionais autorizados pela norma
- status: `requires_official_validation`

## 7) CNES/INE necessários

- unidade e equipe responsáveis pelo acompanhamento

## 8) Campos PEC/DW necessários

- identificação (CPF/CNS)
- DUM/DPP quando aplicável
- datas de consulta
- exames e procedimentos relacionados
- vínculo equipe/unidade

## 9) Tabelas PEC/DW prováveis

- `DW.dim_cidadao`
- `DW.fat_atendimento_aps`
- `DW.fat_exames`
- `DW.fat_procedimento`
- `DW.dim_equipe`

## 10) Joins necessários

1. gestante -> atendimentos
2. gestante -> exames/procedimentos
3. atendimentos -> equipe/unidade -> município

## 11) Evidências clínicas/cadastrais necessárias

- consultas pré-natal/puerpério válidas
- exames/procedimentos exigidos pela regra

## 12) Regras de descarte

- ausência de identificação
- CBO incompatível
- eventos fora de janela gestacional
- inconsistência temporal (evento antes de elegibilidade)

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C3_PRENATAL_MISSING` | consultas insuficientes | não pontua |
| `C3_EXAM_MISSING` | exame obrigatório ausente | não pontua |
| `C3_SCOPE_OR_CBO` | profissional/escopo inválido | descarte |

## 14) Ação recomendada

- completar acompanhamento clínico no período
- validar profissional/CBO executor
- revisar registros de consulta/exame

Perfil/CBO que pode corrigir: enfermagem/médico com escopo da equipe; aprovação municipal recomendada.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento individual + procedimentos/exames (`requires_official_validation`)
- payload alto nível: identificação, evento clínico, profissional/CBO, unidade/equipe, competência
- validações locais: elegibilidade gestacional, janela, escopo, não duplicidade
- eventos de auditoria: `CORRECTION_*` + `LEDI_*`
- confirmação via próxima sync: evidência reflete no DW e reclassifica pendência

## 16) Testes esperados

- conta com consultas + exames mínimos
- não conta por ausência de exame
- descarte por CBO incompatível
- erro LEDI 400 com feedback acionável
- confirmação positiva na próxima sync
