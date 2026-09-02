# B1 — Saúde Bucal: Primeira Consulta

## 1) Identificação

- código: `B1`
- nome: Primeira Consulta Odontológica Programática
- componente: Saúde Bucal
- fonte normativa/oficial: indicadores de saúde bucal APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: atendimento odontológico inicial

## 2) Público-alvo

- usuários elegíveis para primeira consulta odontológica no território

## 3) Denominador

- população elegível sem consulta inicial válida no ciclo

## 4) Numerador

- usuários com primeira consulta registrada e válida

## 5) Janelas temporais

- competência mensal com regra de primeira ocorrência no ciclo

## 6) CBOs permitidos

- dentista e equipe de saúde bucal conforme norma
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES da unidade e INE da equipe de saúde bucal

## 8) Campos PEC/DW necessários

- identificação do usuário
- data de primeira consulta
- profissional/CBO
- unidade/equipe SB

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto`
- `DW.dim_cidadao`
- `DW.dim_equipe`

## 10) Joins necessários

1. odonto atendimento -> cidadão
2. odonto atendimento -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- registro de primeira consulta válida no período

## 12) Regras de descarte

- consulta não classificada como primeira
- CBO não elegível
- escopo CNES/INE divergente

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B1_NO_FIRST_VISIT` | sem primeira consulta registrada | não pontua |
| `B1_ODONTO_SCOPE` | equipe SB inválida | descarte |

## 14) Ação recomendada

- realizar registro correto da primeira consulta
- ajustar vínculo da equipe SB

Perfil/CBO que pode corrigir: dentista/equipe SB.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento odontológico (`requires_official_validation`)
- payload alto nível: usuário, evento odontológico, CBO, unidade/equipe
- validações locais: primeira ocorrência no ciclo, escopo e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: primeira consulta refletida no indicador B1

## 16) Testes esperados

- conta com primeira consulta válida
- não conta com consulta repetida
- descarte por CBO inválido
- LEDI 400 por estrutura inválida
- confirmação por sync incremental
