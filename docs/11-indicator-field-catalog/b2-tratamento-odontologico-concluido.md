# B2 — Tratamento Odontológico Concluído

## 1) Identificação

- código: `B2`
- componente: Saúde Bucal
- regra: `B2@2026.5`
- fonte oficial: Nota Metodológica B2, SEI `0054640775`
- periodicidade operacional: mensal
- avaliação: quadrimestral
- estado Rust: `BLOQUEADO_POR_FONTE`
- estado BFF/painel: legado, sem cutover

## 2) Denominador oficial

Pessoas com primeira consulta odontológica programática no mês:

- tipo de consulta `1`
- procedimento SIGTAP `0301010153`
- CBO de cirurgião-dentista elegível
- deduplicação por pessoa + dentista + dia
- exclusão de repetição para a mesma pessoa + dentista nos doze meses
  anteriores

## 3) Numerador oficial

Pessoas com tratamento concluído no mês, identificadas por
`st_conduta_tratamento_concluid`, com os mesmos requisitos de identidade,
CBO, escopo e deduplicação.

Numerador e denominador são fluxos mensais independentes. Não se exclui
tratamento concluído por encaminhamento, e o numerador pode superar o
denominador.

## 4) Classificação

| Percentual | Classificação |
|---|---|
| `<= 25` | `REGULAR` |
| `> 25 e <= 50` | `SUFFICIENT` |
| `> 50 e <= 75` | `GOOD` |
| `> 75 e <= 100` | `OPTIMAL` |
| `> 100` | `REGULAR` |

Denominador zero produz resultado sem métrica e sem classificação.

## 5) CBOs e escopo

- CBOs: `223208`, `223293`, `223272`
- equipe: eSB 40h elegível
- escopo materializado: tenant + município + competência + INE/CNES
- requisito pendente: vínculo oficial exato eSB para eSF/eAP

## 6) Tabelas normalizadas

- `tb_dim_cbo`
- `tb_dim_equipe`
- `tb_dim_procedimento`
- `tb_dim_profissional`
- `tb_dim_tipo_consulta_odonto`
- `tb_dim_unidade_saude`
- `tb_fat_atend_odonto_proced`
- `tb_fat_atendimento_odonto`

## 7) Qualidade e bloqueios detectáveis

| Código | Causa | Efeito |
|---|---|---|
| `B2_FIRST_CONSULTATION_PROCEDURE_MISSING` | primeira consulta sem SIGTAP `0301010153` | bloqueia fonte |
| `DENTAL_LINKAGE_EVIDENCE_MISSING` | vínculo oficial eSB→eSF/eAP ausente | bloqueia elegibilidade |
| `SOURCE_TEAM_ELIGIBILITY_INCOMPLETE` | autoridade de equipe incompleta | bloqueia materialização READY |
| `B2_PERSON_IDENTITY_INCOMPLETE` | identidade pseudonimizada ausente | bloqueia fonte |
| `B2_DENTIST_IDENTITY_INCOMPLETE` | profissional não identificável | bloqueia fonte |
| `B2_DUPLICATE_EVENT_IDENTITY` | evento lógico duplicado | bloqueia fonte |
| `B2_EVENT_DATE_INVALID` | data inválida | bloqueia fonte |

## 8) Evidência de 25/07/2026

No município `2902906`, INE `0001823299`, CNES `2402734`, abril/2026:

- `1.662` eventos elegíveis no histórico de doze meses
- `145` eventos elegíveis no mês
- agregado oficial: `19/34 = 55,882353%`
- resultado: `BLOCKED_BY_SOURCE`
- oito fontes de linhagem
- replay idempotente

Uma das 36 primeiras consultas candidatas não possui o procedimento oficial.
A eSB está homologada como 40h, mas o vínculo ministerial exato não está
presente na evidência disponível.

## 9) Correção operacional

O resultado só pode ser promovido após:

1. corrigir/reprocessar a primeira consulta inconsistente na fonte oficial;
2. fornecer e ingerir evidência versionada do vínculo eSB→eSF/eAP;
3. gerar golden clínico independente e executar dual-run;
4. auditar cutover antes de registrar B2 no BFF.

Não há autorização para escrever no PEC nem para usar proxies legados como
substitutos dessas evidências.

## 10) Testes obrigatórios

- pareamento pessoa + dentista em doze meses
- fluxos independentes de primeira consulta e conclusão
- deduplicação diária
- percentual acima de 100% classificado como `REGULAR`
- ausência de exclusão por encaminhamento
- fail-closed para identidade, CBO, tipo, SIGTAP, data e autoridade da equipe
- idempotência de materialização e replay
- golden e dual-run apenas com fonte READY
