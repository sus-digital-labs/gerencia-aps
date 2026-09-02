# C4 — Diabetes

## 1) Identificação

- código: `C4`
- nome: Diabetes
- componente: APS
- fonte normativa/oficial: indicador APS de acompanhamento de pessoa com diabetes
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente
- periodicidade: mensal / quadrimestral
- prazo Siaps aplicável: até 10º dia útil (`requires_official_validation`)
- extração oficial aplicável: condições crônicas + atendimentos/procedimentos

## 2) Público-alvo

- pessoas com condição de diabetes elegíveis no território

## 3) Denominador

- população com diabetes cadastrada/elegível no período

## 4) Numerador

- indivíduos com acompanhamento/evidência clínica válida na janela

## 5) Janelas temporais

- janela anual/mensal conforme regra vigente

## 6) CBOs permitidos

- médicos, enfermagem e demais autorizados em APS
- status: `requires_official_validation`

## 7) CNES/INE necessários

- CNES e INE da equipe que acompanha o cidadão

## 8) Campos PEC/DW necessários

- condição crônica ativa
- atendimento/procedimento válido
- data/competência
- profissional/CBO e escopo

## 9) Tabelas PEC/DW prováveis

- `DW.fat_condicoes_cronicas`
- `DW.fat_atendimento_aps`
- `DW.fat_procedimento`
- `DW.dim_cidadao`

## 10) Joins necessários

1. condição crônica -> cidadão
2. cidadão -> atendimento/procedimento
3. atendimento -> equipe/unidade

## 11) Evidências clínicas/cadastrais necessárias

- registro de acompanhamento da condição no período

## 12) Regras de descarte

- condição sem elegibilidade ativa
- evento fora da janela
- CBO/escopo inválido
- duplicidade de evento

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C4_NO_FOLLOWUP` | ausência de acompanhamento | não pontua |
| `C4_STALE_RECORD` | dado desatualizado no ciclo | pendência técnica |
| `C4_SCOPE_MISMATCH` | evento fora do escopo territorial | descarte |

## 14) Ação recomendada

- planejar atendimento de acompanhamento
- validar elegibilidade e escopo da equipe
- revisar registros incompletos

Perfil/CBO que pode corrigir: médico/enfermagem APS com escopo válido.

## 15) Correção via app/LEDI

- permitida: `Parcial`
- aprovação: `Sim`
- modelo LEDI aplicável: atendimento/procedimento APS (`requires_official_validation`)
- payload alto nível: cidadão elegível, evidência clínica, profissional, unidade/equipe
- validações locais: elegibilidade da condição, janela, escopo e deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação via sync: recálculo da condição no indicador C4

## 16) Testes esperados

- conta com acompanhamento válido
- não conta sem evidência clínica
- descarte por escopo inválido
- LEDI 5xx com retry idempotente
- confirmação por réplica em sync subsequente

## 17) Compatibilidade tecnica de schema (Gate 2026-04-28)

Proveniencia auditada:

- `source`: `Apps/server/api/src/routers-previne.ts`
- `runtime`: `Apps/server/api/dist/index.js`
- `dataset`: `esus_restore_20260424`

Achado tecnico:

- no ramo legado de `previne.painelGeral` (Ind4 interno), havia referencia a `tb_fat_procedimento.co_fat_cidadao_pec`.
- no schema restaurado, `tb_fat_procedimento` nao possui essa coluna.

Compatibilidade aplicada (menor mudanca segura):

- uso de `tb_fat_atd_ind_procedimentos.co_fat_cidadao_pec` com join em `tb_dim_procedimento` (`co_dim_procedimento_avaliado` / `co_dim_procedimento_solicitado`) filtrando `co_proced = '0203010086'`.
- manutencao de uniao com `tb_fat_atendimento_individual` para compatibilidade com dados textuais (`ds_filtro_proced_*`).

Hardening de erro:

- indicador passa a expor erro tecnico explicito em caso de falha SQL (`erroTecnico`, `erroCodigo='SQL_ERROR_C4'`).
- smoke automatizado falha se esse erro aparecer, evitando mascaramento silencioso.

Observacao de governanca:

- esta correcao foi de compatibilidade de schema; nao altera regra normativa de pontuacao.
