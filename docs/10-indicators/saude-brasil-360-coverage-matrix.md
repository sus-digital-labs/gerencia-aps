
# Matriz de Cobertura — Saúde Brasil 360 / Brasil 360

Data da auditoria histórica: 2026-05-05
Classificação do recorte histórico: `BRASIL_360_COVERAGE_FAILED`

> **Aviso de vigência:** este arquivo é evidência datada e não representa o status canônico de 2026-08-26. Para o estado atual, consulte `docs/13-saude-brasil-360/00-canonical-status-2026-08-26.md` e `docs/13-saude-brasil-360/c1-data-contract-issue-2026-08-26.md`.

## Fontes oficiais obrigatórias

- Ministério da Saúde (notícia oficial dos 15 indicadores de Qualidade APS, publicada em 21/05/2025):
  https://www.gov.br/saude/pt-br/assuntos/noticias/2025/maio/ministerio-da-saude-apresenta-novos-indicadores-de-inducao-de-boas-praticas-para-a-atencao-primaria/
- Fichas Técnicas (SAPS/MS):
  https://www.gov.br/saude/pt-br/composicao/saps/publicacoes/fichas-tecnicas/
- Página oficial de Notas Metodológicas (SIAPS):
  https://sisaps.saude.gov.br/sistemas/siaps/docs/manual/notas-metodologicas/

## Evidências estruturais auditadas

- Runtime backend operacional: `Apps/server/api/dist/index.js` (rota tRPC `/api/trpc`, sem rota HTTP `/api/pec/*` no runtime auditado).
- Frontend canônico: `Apps/web/client/src/pages/Dashboard.tsx` e `Apps/web/client/src/lib/pecApi.ts` (cards dos 15 códigos e consumo de `/api/pec/indicators/summary`).
- Backend de indicadores 15 itens: `Apps/web/server/indicadores-previne-brasil-v2.ts` e router `previneBrasil` em `Apps/web/server/routers.ts`.
- Segurança/RBAC: `previneBrasil.calcularTodos` e `previneBrasil.drilldown` expostos com `publicProcedure` (`Apps/web/server/routers.ts`).

## Matriz

| Código | Bloco | Indicador oficial | Equipe | Fonte oficial | Implementação encontrada | Query PEC real | Endpoint real | source=pec validado | Frontend/card | Drilldown | Teste automatizado | RBAC/LGPD | Mock runtime? | Status | Evidência | Gap | Próxima ação |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | eSF/eAP | Mais acesso à APS | eSF/eAP | Nota C1 (MS) | `calcularC1` histórico | Evidência histórica | Endpoint legado | Não comprovado | Histórico | Histórico | Não | Histórico | Não | `C1_BLOCKED_BY_DATA_CONTRACT` | Matriz histórica não comprova a variável oficial de demanda no contrato atual | Consultar issue P0 e não calcular por heurística |
| C2 | eSF/eAP | Cuidado no Desenvolvimento Infantil | eSF/eAP | Nota C2 (MS) | `calcularC2` | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:85`, `routers.ts:82`, `indicadores-drilldown-esf.ts:13` | Drilldown público expõe `nu_cns/no_cidadao/nu_cpf`; sem RBAC/máscara | Exigir permissão para drilldown + mascarar PII + teste de autorização |
| C3 | eSF/eAP | Cuidado da Gestante e da Puérpera | eSF/eAP | Nota C3 (MS) | `calcularC3` | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:140`, `routers.ts:82`, `indicadores-drilldown-esf.ts:33` | Dados nominais expostos em endpoint público | Aplicar RBAC + máscara + trilha de auditoria nominal |
| C4 | eSF/eAP | Cuidado da pessoa com Diabetes Mellitus | eSF/eAP | Nota C4 (MS) | `calcularC4` | Sim | Sim | Não | Sim | Sim (mock) | Não | `publicProcedure` | Sim | MOCK_RUNTIME_BLOCKER | `indicadores-previne-brasil-v2.ts:196`, `dist/index.js:5599` | Drilldown C4 hardcoded (placeholder), sem diagnóstico real | Implementar drilldown C4 real + proteger com permissão |
| C5 | eSF/eAP | Cuidado da pessoa com Hipertensão Arterial | eSF/eAP | Nota C5 (MS) | `calcularC5` | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:252`, `indicadores-drilldown-esf.ts:53` | Endpoint público com lista nominal | RBAC obrigatório + mascaramento + testes |
| C6 | eSF/eAP | Cuidado da Pessoa Idosa | eSF/eAP | Nota C6 (MS) | `calcularC6` | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:308`, `indicadores-drilldown-esf.ts:73` | Risco LGPD por nominal em rota pública | Proteger por permissão e limitar payload nominal |
| C7 | eSF/eAP | Cuidado da Mulher na Prevenção do Câncer | eSF/eAP | Nota C7 (MS) | `calcularC7` | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:361`, `indicadores-drilldown-esf.ts:96` | Exposição nominal sem autorização dedicada | Adicionar RBAC, máscara e auditoria por acesso |
| M1 | eMulti | Média de atendimentos por pessoa assistida pela eMulti na APS | eMulti | Nota M1 (MS) | `calcularM1` legado auditado em 2026-05-05; Rust M1@2026.6 é autoridade atual | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:679`, `indicadores-drilldown-emulti.ts:16`; autoridade atual em `b360-rust-authority-matrix.*` | Matriz histórica auditava legado; identidade reconciliada em 2026-08-17: M1 = atendimentos/pessoas. RBAC nominal permanece fora desta missão | Manter legado bloqueado; usar somente read model Rust para certificação; tratar RBAC nominal separadamente |
| M2 | eMulti | Ações interprofissionais realizadas pela eMulti na APS | eMulti | Nota M2 (MS) | `calcularM2` legado auditado em 2026-05-05; Rust M2@2026.6 é autoridade atual | Sim | Sim | Não | Sim | Sim | Não | Sem permissão dedicada no `previneBrasil.*` | Não | PARTIAL_WITH_REAL_DATA | `indicadores-previne-brasil-v2.ts:720`, `indicadores-drilldown-emulti.ts:32`; autoridade atual em `b360-rust-authority-matrix.*` | Matriz histórica auditava legado; identidade reconciliada em 2026-08-17: M2 = ações compartilhadas/total, percentual, polaridade neutra | Manter legado bloqueado; reavaliar gaps M2 pelo contrato oficial, não como média de atendimentos |
| B1 | eSB | Escovação dentária supervisionada em faixa etária escolar | eSB | Nota B4 (MS) | `calcularB1` (nome interno diverge da nota oficial) | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:421`, `indicadores-drilldown-esb.ts:16` | Mapeamento oficial vs interno divergente + nominal público | Reindexar B1..B6 conforme nota oficial + RBAC |
| B2 | eSB | Primeira consulta odontológica programada | eSB | Nota B1 (MS) | `calcularB2` (nome interno diverge) | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:463`, `indicadores-drilldown-esb.ts:36` | Divergência semântica e nominal sem proteção | Corrigir mapeamento B2 + permissão nominal |
| B3 | eSB | Tratamento odontológico concluído | eSB | Nota B2 (MS) | `calcularB3` (nome interno diverge) | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:506`, `indicadores-drilldown-esb.ts:56` | Indicador oficial não está com nomenclatura/fórmula comprovada | Reconciliar nomenclatura/fórmula com nota B2 |
| B4 | eSB | Tratamento restaurador atraumático | eSB | Nota B6 (MS) | `calcularB4` (nome interno diverge) | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:547`, `indicadores-drilldown-esb.ts:76` | Mapeamento oficial divergente + nominal sem controle | Ajustar regra B4 oficial (ART) + RBAC |
| B5 | eSB | Procedimentos odontológicos preventivos | eSB | Nota B5 (MS) | `calcularB5` (razão restauração/exodontia) | Sim | Sim | Não | Sim | Sim | Não | Inexistente para `previneBrasil.*` e drilldown com nominal | Não | NEEDS_RBAC_OR_MASKING | `indicadores-previne-brasil-v2.ts:590`, `indicadores-drilldown-esb.ts:99` | Fórmula interna não corresponde claramente ao oficial B5 | Reimplementar fórmula oficial B5 com SIGTAP validado |
| B6 | eSB | Taxa de exodontias realizadas | eSB | Nota B3 (MS) | `calcularB6` (ações coletivas) | Sim | Sim | Não | Sim | Sim | Não | Sem permissão dedicada no `previneBrasil.*` | Não | PARTIAL_WITH_REAL_DATA | `indicadores-previne-brasil-v2.ts:632`, `indicadores-drilldown-esb.ts:115` | Mapeamento B6 divergente do oficial (taxa de exodontia) | Corrigir fórmula/código B6 oficial e validar com nota metodológica |

## Nota de escopo

> Esta matriz cobre apenas os **15 indicadores de Qualidade APS** (B1-B6, C1-C7, M1-M2). O escopo completo do projeto sao **21 metricas operacionais** (15 Qualidade APS + 6 CVAT). Para CVAT, consultar `docs/11-indicator-field-catalog/official-indicators-registry.md`.

## Resumo numérico (esta matriz — 15 Qualidade APS)

- Total indicadores de Qualidade APS: `15`
- `IMPLEMENTED_VALIDATED`: `0`
- `IMPLEMENTED_BACKEND_ONLY`: `0`
- `IMPLEMENTED_FRONTEND_ONLY`: `0`
- `PARTIAL_WITH_REAL_DATA`: `2`
- `MOCK_RUNTIME_BLOCKER`: `2`
- `EMPTY_STATE_HONEST`: `0`
- `MISSING`: `0`
- `BLOCKED_BY_SCHEMA`: `0`
- `BLOCKED_BY_NORMATIVE`: `0`
- `NEEDS_RBAC_OR_MASKING`: `11`
