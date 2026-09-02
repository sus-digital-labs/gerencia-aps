# B4 — Preventivos Odontológicos

## 1) Identificação

- código: `B4`
- nome: Preventivos Odontológicos
- componente: Saúde Bucal
- fonte normativa/oficial: indicador de ações preventivas em saúde bucal
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: procedimentos preventivos odontológicos

## 2) Público-alvo

- população elegível para ações preventivas de saúde bucal

## 3) Denominador

- população alvo no território da equipe SB

## 4) Numerador

- usuários com registro válido de ação/procedimento preventivo

## 5) Janelas temporais

- competência mensal com janela de elegibilidade por faixa etária quando aplicável

## 6) CBOs permitidos

- dentista, ASB/TSB conforme regra
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES unidade + INE equipe SB

## 8) Campos PEC/DW necessários

- identificação do usuário
- procedimento preventivo
- data, profissional/CBO
- unidade/equipe

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto_preventivos`
- `DW.dim_cidadao`
- `DW.dim_equipe`

## 10) Joins necessários

1. preventivo -> cidadão
2. preventivo -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- ação preventiva dentro da janela

## 12) Regras de descarte

- procedimento fora de lista elegível
- profissional não autorizado
- escopo territorial inválido

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B4_NO_PREVENTIVE_RECORD` | ausência de ação preventiva | não pontua |
| `B4_INVALID_CBO` | CBO fora do escopo | descarte |

## 14) Ação recomendada

- registrar ação preventiva conforme protocolo
- corrigir vínculo profissional/equipe

Perfil/CBO que pode corrigir: equipe SB autorizada.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: procedimento/ação odontológica (`requires_official_validation`)
- payload alto nível: usuário, ação preventiva, CBO, data, escopo
- validações locais: elegibilidade do procedimento, escopo e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: refletir no indicador B4

## 16) Testes esperados

- conta com ação preventiva válida
- não conta sem registro
- descarte por CBO inválido
- LEDI 400 por inconsistência de payload
- confirmação após sync
