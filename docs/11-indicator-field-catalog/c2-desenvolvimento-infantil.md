# C2 — Desenvolvimento Infantil

## 1) Identificação

- código: `C2`
- nome: Desenvolvimento Infantil
- componente: APS
- fonte normativa/oficial: cadernos de indicadores APS (saúde da criança)
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: cadastros infantis, atendimentos e evidências de acompanhamento

## 2) Público-alvo

- crianças na faixa etária definida na regra oficial
- vínculo ativo com equipe/unidade de referência

## 3) Denominador

- crianças elegíveis por faixa etária e território no período

## 4) Numerador

- crianças com evidências de acompanhamento de desenvolvimento no período

## 5) Janelas temporais

- janela mensal de produção
- acumulação por ciclo de avaliação

## 6) CBOs permitidos

- equipe APS (enfermagem, médico, ACS e demais conforme regra)
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES da unidade executora
- INE da equipe vinculada

## 8) Campos PEC/DW necessários

- data de nascimento
- CPF/CNS
- vínculo territorial e equipe
- evidências de acompanhamento (procedimentos/atendimentos)

## 9) Tabelas PEC/DW prováveis

- `DW.dim_cidadao`
- `DW.fat_atendimento_aps`
- `DW.fat_procedimento`
- `DW.bridge_cidadao_domicilio`

## 10) Joins necessários

1. cidadão infantil -> equipe/unidade
2. atendimento/procedimento -> cidadão
3. cidadão -> território/domicílio

## 11) Evidências clínicas/cadastrais necessárias

- registro de acompanhamento dentro da faixa etária e janela
- profissional e escopo válidos

## 12) Regras de descarte

- faixa etária fora do recorte
- identificação inválida
- atendimento fora da janela
- evidência duplicada

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C2_NO_CHILD_VISIT` | sem acompanhamento no período | não pontua numerador |
| `C2_AGE_WINDOW_MISS` | fora da janela etária/temporal | descarte |
| `C2_ID_SCOPE_ISSUE` | inconsistência CPF/CNS ou escopo | exclusão por qualidade |

## 14) Ação recomendada

- regularizar cadastro infantil
- planejar atendimento dentro da janela
- validar escopo CNES/INE

Perfil/CBO que pode corrigir: APS infantil com escopo válido; aprovação local para envio LEDI sensível.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento individual infantil / cadastro (`requires_official_validation`)
- payload alto nível: identificação infantil, atendimento/procedimento, profissional/CBO, unidade/equipe
- validações locais: idade, janela, escopo e deduplicação
- eventos de auditoria: fluxo `CORRECTION_*` e `LEDI_*`
- confirmação via próxima sync: recálculo remove pendência quando evidência refletir no DW

## 16) Testes esperados

- conta para criança elegível com evidência
- não conta sem evidência
- pendente por janela etária
- LEDI 400 por validação
- confirmação após sync incremental
