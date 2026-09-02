# C1 — Mais Acesso

## 1) Identificação

- código: `C1`
- nome: Mais Acesso
- componente: APS
- fonte normativa/oficial: Saúde Brasil 360l / manuais de indicadores APS
- status da fonte: `requires_official_validation`
- vigência: ciclo vigente de financiamento APS
- periodicidade: mensal com consolidação quadrimestral
- prazo Siaps aplicável: atualização até o 10º dia útil do mês subsequente (`requires_official_validation`)
- extração oficial aplicável: produção ambulatorial APS e vínculos territoriais

## 2) Público-alvo

- população adscrita à APS no território da equipe
- cidadãos com identificação válida e vínculo territorial ativo

## 3) Denominador

- cidadãos elegíveis no período por território/equipe
- filtros: município, CNES, INE, faixa etária/condição quando aplicável

## 4) Numerador

- cidadãos com evidência válida de acesso/atendimento no período
- evidência depende de procedimento/registro aceito pela regra oficial

## 5) Janelas temporais

- competência mensal
- consolidação quadrimestral e histórico anual

## 6) CBOs permitidos

- CBOs da APS vinculados à equipe (médico, enfermagem, ACS e demais conforme regra)
- status: `requires_official_validation`

## 7) CNES/INE necessários

- `CNES` da unidade executora
- `INE` da equipe responsável

## 8) Campos PEC/DW necessários

- identificação: CPF/CNS (com mascaramento fora de contexto autorizado)
- territorialização: IBGE, CNES, INE
- produção: data, competência, profissional/CBO, código de procedimento

## 9) Tabelas PEC/DW prováveis

- `DW.fat_atendimento_aps`
- `DW.dim_cidadao`
- `DW.dim_equipe`
- `DW.dim_unidade`
- `DW.dim_municipio`

## 10) Joins necessários

1. `fat_atendimento_aps -> dim_cidadao`
2. `fat_atendimento_aps -> dim_equipe -> dim_unidade`
3. `dim_unidade -> dim_municipio`

## 11) Evidências clínicas/cadastrais necessárias

- atendimento válido no período
- profissional com CBO elegível
- vínculo territorial compatível

## 12) Regras de descarte

- CPF/CNS inválido/ausente
- CBO incompatível
- CNES/INE inválido
- registro fora da janela
- duplicidade de evidência

## 13) Pendências detectáveis

| código pendência | causa raiz provável | impacto |
| --- | --- | --- |
| `C1_NO_VALID_CONTACT` | ausência de atendimento válido | não entra no numerador |
| `C1_SCOPE_MISMATCH` | CNES/INE fora do escopo | descarte por territorialização |
| `C1_ID_ISSUE` | CPF/CNS inconsistente | descarte por qualidade |

## 14) Ação recomendada

- revisar vínculo territorial
- regularizar identificação
- registrar atendimento válido conforme protocolo

Perfil/CBO que pode corrigir: APS com escopo válido; aprovação municipal quando política exigir.

## 15) Correção via app/LEDI

- correção via app permitida: `Parcial`
- precisa aprovação: `Sim` (dependendo da política local)
- modelo LEDI aplicável: atendimento/procedimento APS (`requires_official_validation`)
- payload LEDI esperado (alto nível): identificação do cidadão, data/competência, profissional/CBO, unidade/equipe, evidência de procedimento
- validações locais antes do LEDI: CBO + escopo CNES/INE + janela + deduplicação
- eventos de auditoria: `CORRECTION_*`, `LEDI_*`
- confirmação esperada via próxima sync: evidência aparece no DW e reclassifica status da pendência

## 16) Testes esperados

- caso conta (evidência válida)
- caso não conta (sem evidência)
- caso pendente por escopo
- caso corrigível via LEDI
- caso LEDI 400
- caso confirmado na réplica após sync
