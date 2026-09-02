# B3 — Exodontias

## 1) Identificação

- código: `B3`
- nome: Exodontias
- componente: Saúde Bucal
- fonte normativa/oficial: indicadores de produção odontológica APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: procedimentos odontológicos de exodontia

## 2) Público-alvo

- usuários com indicação e execução de exodontia em contexto APS

## 3) Denominador

- população elegível conforme regra de produção odontológica

## 4) Numerador

- exodontias válidas registradas no período

## 5) Janelas temporais

- competência mensal e consolidação por ciclo

## 6) CBOs permitidos

- dentista (execução principal)
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES e INE da equipe de saúde bucal

## 8) Campos PEC/DW necessários

- identificação usuário
- código de procedimento exodontia
- data/profissional/CBO
- unidade/equipe

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto_procedimentos`
- `DW.dim_cidadao`
- `DW.dim_equipe`

## 10) Joins necessários

1. procedimento odonto -> cidadão
2. procedimento odonto -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- procedimento de exodontia válido no período

## 12) Regras de descarte

- procedimento fora da lista válida
- profissional não elegível
- evento duplicado ou fora da janela

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B3_NO_VALID_PROC` | código de procedimento inválido | descarte |
| `B3_SCOPE_ISSUE` | CNES/INE incompatível | descarte |

## 14) Ação recomendada

- corrigir classificação de procedimento
- revisar escopo da equipe SB

Perfil/CBO que pode corrigir: dentista com escopo local.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: procedimento odontológico (`requires_official_validation`)
- payload alto nível: usuário, procedimento, data, profissional/CBO, escopo
- validações locais: código válido, janela, escopo e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: procedimento refletido no B3

## 16) Testes esperados

- conta com procedimento válido
- não conta com código inválido
- não conta por escopo inválido
- LEDI 400 por validação de modelo
- confirmação em sync posterior
