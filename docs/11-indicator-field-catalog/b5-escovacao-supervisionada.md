# B5 — Escovação Supervisionada

## 1) Identificação

- código: `B5`
- nome: Escovação Supervisionada
- componente: Saúde Bucal
- fonte normativa/oficial: ações coletivas de saúde bucal
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: ações coletivas/educativas registradas

## 2) Público-alvo

- grupos elegíveis para ação coletiva de escovação supervisionada

## 3) Denominador

- público-alvo previsto no território da unidade/equipe

## 4) Numerador

- ações coletivas válidas registradas no período

## 5) Janelas temporais

- competência mensal e ciclo de avaliação

## 6) CBOs permitidos

- equipe de saúde bucal (dentista/ASB/TSB)
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES/INE da equipe executora

## 8) Campos PEC/DW necessários

- tipo de ação coletiva
- público atingido
- data, profissional/CBO
- escopo unidade/equipe

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto_coletivo`
- `DW.dim_equipe`
- `DW.dim_unidade`

## 10) Joins necessários

1. ação coletiva -> equipe/unidade
2. equipe/unidade -> município

## 11) Evidências clínicas/cadastrais necessárias

- registro de ação coletiva válida no período

## 12) Regras de descarte

- ação não classificada como escovação supervisionada
- CBO não elegível
- escopo territorial incompatível

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B5_NO_GROUP_ACTION` | ausência de ação coletiva válida | não pontua |
| `B5_SCOPE_OR_CLASSIFICATION` | classificação/escopo inválidos | descarte |

## 14) Ação recomendada

- registrar corretamente ação coletiva
- ajustar classificação e equipe executora

Perfil/CBO que pode corrigir: equipe SB habilitada.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: ação coletiva odontológica (`requires_official_validation`)
- payload alto nível: ação coletiva, público, executor/CBO, escopo
- validações locais: tipo de ação, escopo e consistência temporal
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: evidência passa a compor B5

## 16) Testes esperados

- conta com ação coletiva válida
- não conta sem ação
- descarte por classificação incorreta
- LEDI 5xx com retry
- confirmação após sync incremental
