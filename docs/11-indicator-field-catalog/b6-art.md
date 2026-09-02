# B6 — ART

## 1) Identificação

- código: `B6`
- nome: ART (Ação/Registro Terapêutico em Saúde Bucal)
- componente: Saúde Bucal
- fonte normativa/oficial: regras de saúde bucal do ciclo APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: registros terapêuticos odontológicos

## 2) Público-alvo

- usuários elegíveis ao acompanhamento terapêutico odontológico

## 3) Denominador

- usuários com elegibilidade para ART no período

## 4) Numerador

- usuários com ART registrada/validada conforme regra

## 5) Janelas temporais

- janela de acompanhamento terapêutico no ciclo vigente

## 6) CBOs permitidos

- dentista e equipe SB conforme norma
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES da unidade e INE da equipe SB

## 8) Campos PEC/DW necessários

- identificação usuário
- registro ART/plano terapêutico
- status do seguimento
- data e executor/CBO

## 9) Tabelas PEC/DW prováveis

- `DW.fat_odonto_art`
- `DW.fat_odonto_tratamento`
- `DW.dim_cidadao`

## 10) Joins necessários

1. ART -> cidadão
2. ART -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- registro terapêutico válido e dentro da janela

## 12) Regras de descarte

- ausência de vínculo terapêutico válido
- CBO não elegível
- escopo territorial incompatível

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `B6_NO_ART_RECORD` | sem registro ART no período | não pontua |
| `B6_SCOPE_ISSUE` | executor fora de escopo | descarte |

## 14) Ação recomendada

- registrar/atualizar ART conforme protocolo
- revisar escopo da equipe SB

Perfil/CBO que pode corrigir: dentista da equipe SB.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento/evolução odontológica (`requires_official_validation`)
- payload alto nível: usuário, plano/art, data, CBO, equipe/unidade
- validações locais: consistência terapêutica, escopo e não duplicidade
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: atualização refletida em B6

## 16) Testes esperados

- conta com ART válida
- não conta sem ART
- descarte por CBO/escopo
- LEDI 400 por regras de validação
- confirmação pela réplica
