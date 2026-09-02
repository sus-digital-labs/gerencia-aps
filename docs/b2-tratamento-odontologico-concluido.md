# B2 — Tratamento Odontológico Concluído

## 1) Identificação

- código: `B2`
- nome: Tratamento Odontológico Concluído
- componente: Saúde Bucal
- fonte normativa/oficial: indicadores de saúde bucal APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: plano/tratamento odontológico

## 2) Público-alvo

- usuários com tratamento odontológico em curso no território

## 3) Denominador

- usuários elegíveis com tratamento iniciado

## 4) Numerador

- usuários com tratamento concluído e registrado conforme regra

## 5) Janelas temporais

- ciclo de tratamento dentro da competência de avaliação

## 6) CBOs permitidos

- dentista (principal) e apoio SB conforme regra
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES/INE da equipe SB responsável

## 8) Campos PEC/DW necessários

- identificação usuário
- plano/tratamento e status conclusão
- data de conclusão
- profissional/CBO

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto`
- `DW.fat_odonto_tratamento`
- `DW.dim_cidadao`

## 10) Joins necessários

1. tratamento odonto -> cidadão
2. tratamento odonto -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- status de tratamento concluído com validade temporal

## 12) Regras de descarte

- tratamento não concluído
- conclusão fora da janela
- escopo/CBO inválido

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B2_TREATMENT_OPEN` | tratamento sem conclusão | não pontua |
| `B2_SCOPE_CBO_ISSUE` | execução fora de escopo | descarte |

## 14) Ação recomendada

- finalizar plano terapêutico e registrar conclusão
- revisar escopo de equipe/profissional

Perfil/CBO que pode corrigir: dentista da equipe SB.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: evolução/atendimento odontológico (`requires_official_validation`)
- payload alto nível: usuário, status conclusão, data, CBO e escopo
- validações locais: coerência do plano, janela e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: tratamento concluído refletido no B2

## 16) Testes esperados

- conta com conclusão válida
- não conta sem conclusão
- descarte por escopo inválido
- LEDI 5xx com retry idempotente
- confirmação via sync subsequente
