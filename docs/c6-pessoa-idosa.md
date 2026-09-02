# C6 — Pessoa Idosa

## 1) Identificação

- código: `C6`
- nome: Pessoa Idosa
- componente: APS
- fonte normativa/oficial: indicadores APS para população idosa
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: cadastro territorial + atendimentos de seguimento

## 2) Público-alvo

- população idosa elegível por faixa etária e vínculo territorial

## 3) Denominador

- idosos elegíveis adscritos à equipe no período

## 4) Numerador

- idosos com acompanhamento/evidência válida de cuidado no período

## 5) Janelas temporais

- janelas mensais e ciclo de avaliação acumulado

## 6) CBOs permitidos

- APS/eMulti conforme regra
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES/INE da unidade/equipe responsável

## 8) Campos PEC/DW necessários

- idade/data nascimento
- identificação válida
- atendimento/procedimento de acompanhamento
- profissional/CBO

## 9) Tabelas PEC/DW prováveis

- `DW.dim_cidadao`
- `DW.fat_atendimento_aps`
- `DW.fat_procedimento`
- `DW.dim_equipe`

## 10) Joins necessários

1. cidadão idoso -> atendimento/procedimento
2. atendimento -> equipe/unidade/município

## 11) Evidências clínicas/cadastrais necessárias

- evidência de acompanhamento em janela vigente

## 12) Regras de descarte

- faixa etária fora do recorte
- sem identificação válida
- evento fora de janela
- escopo profissional incompatível

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C6_NO_FOLLOWUP` | ausência de cuidado registrado | não pontua |
| `C6_AGE_SCOPE_ISSUE` | idade/escopo inconsistente | descarte |
| `C6_DUPLICATE_EVENT` | duplicidade sem critério | descarte técnico |

## 14) Ação recomendada

- organizar seguimento da população idosa
- corrigir cadastro e territorialização
- validar profissional/CBO executor

Perfil/CBO que pode corrigir: APS/eMulti com vínculo local válido.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento individual / ações de cuidado (`requires_official_validation`)
- payload alto nível: identificação, ação realizada, profissional/CBO, escopo
- validações locais: idade, escopo, janela e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via próxima sync: atualização no indicador C6

## 16) Testes esperados

- conta com ação válida
- não conta sem evidência
- pendente por escopo incorreto
- LEDI 5xx com retry
- confirmação por réplica em sync
