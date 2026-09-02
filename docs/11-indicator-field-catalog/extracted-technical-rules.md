# Regras Técnicas Consolidadas: Integração LEDI e Indicadores eMulti (M1/M2)

> **Data de Consolidação:** 22 de Junho de 2026
> **Contexto:** Componentes Críticos do Saúde Brasil 360

Este documento extrai e consolida restrições técnicas do formato de dados LEDI (Layout e-SUS APS de Dados e Interface) e o estado operacional atual das lógicas de cálculo para as equipes eMulti.

> Classificação desta síntese: `operational_reference`. Fórmula-base e domínio M1/M2 possuem fonte oficial vinculada, mas proxies de escopo, CBO elegível completo, sinais de multiprofissionalidade e mapeamentos LEDI específicos ainda permanecem em `requires_official_validation`.

---

## 1. Regras e Restrições de Integração LEDI (Correções via Agente)

O fluxo LEDI é o canal oficial de correções transacionais para a base do PEC municipal. O SUS Analytics Sync **não** deve fazer UPDATES diretos na base PEC. O agente despacha *payloads* no formato LEDI para o e-SUS local avaliar.

### Guardrails Críticos (LEDI)
- **Proibição Absoluta:** O servidor central (Node/TypeScript) nunca se comunica diretamente via LEDI, nem persiste o payload LEDI contendo PII em Logs Analíticos. O payload é gerado, despachado ao Agente (Rust), e o agente entrega ao e-SUS local.
- **Taxonomia de Estados LEDI (Auditoria):**
  - `LEDI_PAYLOAD_REJECTED` (Erro 400 - Estrutura de dados rejeitada localmente)
  - `LEDI_DESERIALIZATION_ERROR`
  - `LEDI_VALIDATION_ERROR` (Erro Clínico - ex: incoerência de exames C5/C7)
  - `LEDI_RETRY_SCHEDULED` (Erro 5xx - O Agente fará retry idempotente)
  - `LEDI_CONFIRMED_BY_REPLICA` (Sucesso confirmado após novo sync analítico)
- **Modelos LEDI mapeados (síntese operacional, não taxonomia normativa fechada):**
  - *Cadastro (Componente II / C2):* cadastro individual e domiciliar.
  - *Atendimento/Procedimento (B1 a B6 / C4 a C7):* ação coletiva, atendimento individual APS.
  - *eMulti (M1/M2):* atendimento multiprofissional.
- **RBAC (Acesso):** Operações que geram fluxos LEDI exigem autorização explícita do usuário logado e escopo nominal compatível; a matriz final de permissões/CBOs ainda requer validação oficial adicional.

---

## 2. Regras de Cálculo para Equipes eMulti (Indicadores M1 e M2)

As métricas da eMulti não se referem ao modelo eSF/eAP clássico e introduzem complexidade na amarração de dados porque o e-SUS (PEC) não exibe explicitamente as equipes vinculadas como "tipo 72" no DW. O estado atual depende de proxies operacionais documentados em `docs/11-indicator-field-catalog/sources/emulti.md`.

### M1 - Média de Atendimentos por Pessoa pela eMulti na APS
- **Objetivo:** Calcular o volume médio de ações por indivíduo pela eMulti.
- **Numerador:** Total de atendimentos individuais + participações em atividades coletivas realizadas *pela eMulti*.
- **Denominador:** Pessoas distintas assistidas pela eMulti.
- **Proxies de Escopo (Atenção):** A identificação do profissional eMulti depende hoje da tabela `tb_dim_profissional` e `tb_dim_cbo` cruzadas com filtros como `tb_dim_equipe.ds_filtro` e `st_conduta_agendamento_emulti`; esta amarração continua em `requires_official_validation`.
- **Descarte de dados:** `M1_NO_MULTI_VISIT` (Sem atendimento eMulti válido no período).

### M2 - Ações Interprofissionais realizadas pela eMulti na APS
- **Objetivo:** Mensurar a proporção de ações *compartilhadas* (interprofissionais).
- **Numerador:** Ações compartilhadas/interprofissionais realizadas pela eMulti.
- **Denominador:** Total de ações (individuais e coletivas) realizadas pela eMulti.
- **Validação de Multiprofissionalidade:** A verificação de que a ação foi *compartilhada* busca hoje sinais operacionais no atendimento individual, como a presença de um segundo profissional (`co_dim_profissional_2`), variáveis `st_nasf_*` e `st_conduta_agendamento_*`, além de agregação por `nu_uuid_ficha` para coletivas.

> **Aviso de Evolução:** Até que as atualizações do Ministério da Saúde reestruturem o DW para classificar equipes eMulti de forma explícita na réplica PEC, as consultas do banco analítico em escala estadual podem precisar materializar essas heurísticas (M1 e M2) em views ou projeções dedicadas para mitigar o impacto computacional. Esta direção é arquitetural, não artefato já implementado.
