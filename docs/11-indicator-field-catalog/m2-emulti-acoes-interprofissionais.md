# M2 — eMulti Ações Interprofissionais

## 1) Identificação

- código: `M2`
- nome: eMulti Ações Interprofissionais
- componente: eMulti
- fonte normativa/oficial: componente eMulti APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: ações interprofissionais eMulti

## 2) Público-alvo

- cidadãos/territórios com ação interprofissional elegível

## 3) Denominador

- casos elegíveis para atuação interprofissional no período

## 4) Numerador

- ações interprofissionais registradas e válidas

## 5) Janelas temporais

- competência mensal + ciclo de acompanhamento

## 6) CBOs permitidos

- categorias eMulti elegíveis por regra
- status: `requires_official_validation`

## 7) CNES/INE necessários

- unidade/equipe eMulti responsável

## 8) Campos PEC/DW necessários

- tipo de ação interprofissional
- profissionais participantes/CBO
- data, competência, escopo territorial

## 9) Tabelas PEC/DW prováveis

- `DW.fat_emulti_interprof`
- `DW.dim_profissional`
- `DW.dim_equipe`
- `DW.dim_cidadao`

## 10) Joins necessários

1. ação interprofissional -> participantes/CBO
2. ação interprofissional -> cidadão/território
3. ação interprofissional -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- registro de ação com composição multiprofissional válida

## 12) Regras de descarte

- ação sem composição interprofissional exigida
- CBO não elegível
- escopo territorial inválido

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `M2_NO_INTERPROF_ACTION` | sem ação interprofissional | não pontua |
| `M2_TEAM_COMPOSITION_ISSUE` | composição profissional inválida | descarte |

## 14) Ação recomendada

- registrar ação interprofissional com participantes corretos
- revisar escopo de execução

Perfil/CBO que pode corrigir: equipe eMulti habilitada.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: ação multiprofissional (`requires_official_validation`)
- payload alto nível: ação, participantes/CBO, data, escopo
- validações locais: composição mínima, escopo e janela
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: evidência refletida no M2

## 16) Testes esperados

- conta com ação interprofissional válida
- não conta sem composição mínima
- descarte por escopo inválido
- LEDI 5xx com retry idempotente
- confirmação no sync subsequente
