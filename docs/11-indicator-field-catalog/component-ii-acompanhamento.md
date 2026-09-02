# Componente II — Acompanhamento

## 1) Identificação

- código: `COMP_II_ACOMP`
- nome: Componente II Acompanhamento
- componente: Componente II
- fonte normativa/oficial: financiamento APS / acompanhamento de condições e grupos prioritários
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: atendimentos, procedimentos e seguimentos APS

## 2) Público-alvo

- cidadãos elegíveis a acompanhamento em linhas prioritárias

## 3) Denominador

- população elegível acompanhável no território

## 4) Numerador

- cidadãos com seguimento válido no período

## 5) Janelas temporais

- janela por linha de cuidado e ciclo de avaliação

## 6) CBOs permitidos

- APS/eMulti conforme linha de cuidado
- status: `requires_official_validation`

## 7) CNES/INE necessários

- escopo da equipe e unidade executora

## 8) Campos PEC/DW necessários

- identificação do cidadão
- condição/grupo prioritário
- evidência de seguimento
- data/competência
- profissional/CBO e escopo

## 9) Tabelas PEC/DW prováveis

- `DW.fat_acompanhamento`
- `DW.fat_atendimento_aps`
- `DW.fat_procedimento`
- `DW.dim_cidadao`

## 10) Joins necessários

1. condição/grupo -> cidadão
2. cidadão -> evidências de seguimento
3. evidência -> equipe/unidade/município

## 11) Evidências clínicas/cadastrais necessárias

- registro de acompanhamento válido por linha de cuidado

## 12) Regras de descarte

- ausência de evidência no período
- CBO não compatível
- escopo territorial divergente
- duplicidade sem critério

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `ACOMP_NO_FOLLOWUP` | sem registro de acompanhamento | não pontua |
| `ACOMP_SCOPE_ISSUE` | escopo inválido | descarte |
| `ACOMP_STALE_DATA` | atraso de sincronização | pendência técnica |

## 14) Ação recomendada

- organizar agenda de seguimento por risco
- corrigir escopo e vínculos profissionais
- reprocessar sync quando houver atraso técnico

Perfil/CBO que pode corrigir: APS/eMulti com escopo e CBO válidos.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento/seguimento APS (`requires_official_validation`)
- payload alto nível: cidadão, linha de cuidado, evidência, executor/CBO, escopo
- validações locais: elegibilidade, janela e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: evidência refletida no componente II de acompanhamento

## 16) Testes esperados

- conta com seguimento válido
- não conta sem evidência
- descarte por escopo/CBO
- LEDI 5xx com retry idempotente
- confirmação por sync incremental
