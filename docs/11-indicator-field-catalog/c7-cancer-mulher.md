# C7 — Câncer da Mulher

## 1) Identificação

- código: `C7`
- nome: Câncer da Mulher
- componente: APS
- fonte normativa/oficial: indicador APS de rastreamento/seguimento
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: população feminina elegível + exames/atendimentos

## 2) Público-alvo

- mulheres na faixa etária alvo conforme regra oficial

## 3) Denominador

- mulheres elegíveis com vínculo territorial no período

## 4) Numerador

- mulheres com evidência de exame/atendimento válido na janela

## 5) Janelas temporais

- janela de rastreamento conforme norma vigente

## 6) CBOs permitidos

- enfermagem, médico e profissionais autorizados
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES/INE da equipe executora

## 8) Campos PEC/DW necessários

- sexo e faixa etária
- identificação (CPF/CNS)
- registro de exame/procedimento
- data e competência
- profissional/CBO

## 9) Tabelas PEC/DW prováveis

- `DW.dim_cidadao`
- `DW.fat_exames`
- `DW.fat_atendimento_aps`
- `DW.fat_procedimento`

## 10) Joins necessários

1. cidadã elegível -> exames/procedimentos
2. exames -> equipe/unidade
3. unidade -> município

## 11) Evidências clínicas/cadastrais necessárias

- evidência de rastreamento válida na janela

## 12) Regras de descarte

- faixa etária fora da regra
- exame fora de janela
- CBO/escopo incompatível
- identificação inconsistente

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C7_NO_SCREENING` | sem exame válido no período | não pontua |
| `C7_WINDOW_EXPIRED` | exame fora da janela | descarte |
| `C7_SCOPE_OR_ID` | escopo ou identificação inválida | descarte |

## 14) Ação recomendada

- convocação ativa e registro de rastreamento
- revisão de cadastro e vínculo territorial
- checagem de escopo profissional

Perfil/CBO que pode corrigir: enfermagem/médico com escopo local válido.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento/procedimento/exame (`requires_official_validation`)
- payload alto nível: dados mínimos de rastreamento, profissional/CBO, escopo territorial
- validações locais: faixa etária, janela, escopo, deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via próxima sync: entrada de evidência e recomputação C7

## 16) Testes esperados

- conta com exame na janela
- não conta sem exame
- descarte por faixa etária incorreta
- LEDI 400 por inconsistência de payload
- confirmação por sync subsequente
