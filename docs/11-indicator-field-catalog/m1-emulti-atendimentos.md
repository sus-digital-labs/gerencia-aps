# M1 — eMulti Atendimentos

## 1) Identificação

- código: `M1`
- nome: eMulti Atendimentos
- componente: eMulti
- fonte normativa/oficial: componente eMulti da APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: atendimentos multiprofissionais eMulti

## 2) Público-alvo

- cidadãos elegíveis acompanhados por equipes eMulti

## 3) Denominador

- população elegível no território com vínculo eMulti

## 4) Numerador

- atendimentos eMulti válidos no período

## 5) Janelas temporais

- competência mensal e ciclo de financiamento vigente

## 6) CBOs permitidos

- categorias multiprofissionais habilitadas eMulti
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES unidade + INE equipe eMulti / equipe vinculada

## 8) Campos PEC/DW necessários

- identificação do cidadão
- categoria profissional e CBO
- tipo de atendimento e data
- escopo territorial

## 9) Tabelas PEC/DW prováveis

- `DW.fat_emulti_atendimentos`
- `DW.dim_profissional`
- `DW.dim_cidadao`
- `DW.dim_equipe`

## 10) Joins necessários

1. atendimento eMulti -> cidadão
2. atendimento eMulti -> profissional/CBO
3. atendimento eMulti -> equipe/unidade/município

## 11) Evidências clínicas/cadastrais necessárias

- atendimento multiprofissional válido e no escopo

## 12) Regras de descarte

- categoria profissional não elegível
- ausência de vínculo com equipe eMulti
- evento fora da janela

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `M1_NO_MULTI_VISIT` | sem atendimento eMulti válido | não pontua |
| `M1_CBO_SCOPE_ISSUE` | CBO/escopo incompatível | descarte |

## 14) Ação recomendada

- registrar atendimento eMulti com classificação correta
- ajustar vínculo de equipe/profissional

Perfil/CBO que pode corrigir: profissionais eMulti com escopo válido.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento multiprofissional (`requires_official_validation`)
- payload alto nível: cidadão, atendimento, categoria/CBO, equipe, competência
- validações locais: elegibilidade CBO, escopo e janela
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: atualização de M1 no próximo ciclo incremental

## 16) Testes esperados

- conta com atendimento eMulti válido
- não conta sem atendimento
- descarte por CBO inválido
- LEDI 400 com validação de categoria
- confirmação após sync
