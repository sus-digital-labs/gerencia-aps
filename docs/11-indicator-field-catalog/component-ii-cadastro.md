# Componente II — Cadastro

## 1) Identificação

- código: `COMP_II_CAD`
- nome: Componente II Cadastro
- componente: Componente II
- fonte normativa/oficial: financiamento APS / qualidade cadastral
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: cadastro individual + domiciliar + territorial

## 2) Público-alvo

- população cadastrada no território APS

## 3) Denominador

- cidadãos elegíveis para cadastro válido no período

## 4) Numerador

- cadastros válidos e completos conforme regra de qualidade

## 5) Janelas temporais

- atualização contínua com recorte mensal para cálculo

## 6) CBOs permitidos

- ACS, recepção/cadastro e gestão autorizada
- status: `requires_official_validation`

## 7) CNES/INE necessários

- unidade/equipe responsável pelo cadastro

## 8) Campos PEC/DW necessários

- CPF/CNS
- nome (uso mínimo e protegido)
- data nascimento/sexo
- endereço e vínculo domiciliar
- equipe e território

## 9) Tabelas PEC/DW prováveis

- `DW.dim_cidadao`
- `DW.dim_domicilio`
- `DW.bridge_cidadao_domicilio`
- `DW.dim_equipe`

## 10) Joins necessários

1. cidadão -> domicílio/família
2. cidadão -> equipe/unidade/município

## 11) Evidências clínicas/cadastrais necessárias

- cadastro individual completo
- vínculo domiciliar/territorial válido

## 12) Regras de descarte

- CPF/CNS inválido ou ausente
- endereço incompleto
- ausência de vínculo territorial
- duplicidade cadastral não reconciliada

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `CAD_NO_VALID_ID` | CPF/CNS inválido | descarte |
| `CAD_INCOMPLETE_ADDRESS` | endereço incompleto | perda de elegibilidade |
| `CAD_NO_TERRITORY_LINK` | sem vínculo domicílio/equipe | não compõe componente |

## 14) Ação recomendada

- saneamento cadastral dirigido por pendências
- regularização de vínculo domicílio/família/equipe

Perfil/CBO que pode corrigir: ACS/cadastro com escopo local; aprovação municipal para lotes sensíveis.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: cadastro individual e domiciliar (`requires_official_validation`)
- payload alto nível: identificação, endereço, vínculo domiciliar, equipe
- validações locais: formato documento, consistência de endereço, escopo territorial
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: redução de pendências cadastrais após replicação

## 16) Testes esperados

- conta com cadastro completo
- não conta com CPF/CNS inválido
- pendente por vínculo territorial ausente
- LEDI 400 por validação de cadastro
- confirmação na réplica após sync
