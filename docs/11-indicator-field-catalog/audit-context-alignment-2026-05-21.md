# Relatório de Auditoria — Alinhamento Contexto × Código × Fontes

> **Data:** 2026-05-21
> **Status:** PARTIAL — divergências críticas de vínculo código↔registry identificadas
> **Repositório:** sus-analytics-sync

---

## 1. Resumo executivo

Auditoria completa de `.github/` (85 arquivos) e `docs/` (140+ arquivos) contra o registry canônico de 21 métricas e o código-fonte em `Apps/web/server/indicadores-previne-brasil-v2.ts`.

**Achados principais:**
- 22 context files de `.github/` não mencionavam escopo 21/CVAT/Saúde Brasil 360 → **corrigidos**
- 21 arquivos obsoletos/stale → **movidos para `temp/`**
- Sub-agent duplicado do principal em `sub-agents/` → **movido para `temp/`**
- Divergência **CRÍTICA** de mapeamento B1-B6 entre código e notas oficiais do MS
- Divergência de mapeamento M1/M2 entre código e notas oficiais
- Drilldowns com dados nominais em `publicProcedure` (risco LGPD ativo)

---

## 2. Arquivos corrigidos nesta sessão

### .github/context/ (escopo 21 adicionado)

| Arquivo | Correção |
|---|---|
| project_brief.md | Adicionado escopo 21, endpoints canônicos, /readyz |
| module_index.md | Adicionado domínio Saúde Brasil 360 como prioritário |
| entrypoints.md | Adicionados endpoints saudeBrasil360.* e CVAT, separado legado |
| sus-analytics-sync.contexto.md | Adicionado escopo 21 e referência ao registry |
| sus-analytics-sync.dados.md | Adicionado escopo 21 e mapa CVAT |
| sus-analytics-sync.rotas.md | Adicionados endpoints canônicos B360 e deprecação previne |
| sus-analytics-sync.modulos.md | Adicionado módulo B360 |
| sus-analytics-sync.qa.md | Adicionado skill/runbook de auditoria |
| sus-analytics-sync.seguranca.md | Adicionado risco LGPD em drilldowns |
| sus-analytics-sync.arquitetura.md | Adicionado pipeline dos 21 indicadores |
| sus-analytics-sync.operacao.md | Adicionado smoke dos 21 indicadores |
| operations_map.md | Adicionada seção escopo 21 métricas |

### .github/instructions/

| Arquivo | Correção |
|---|---|
| previne.instructions.md | Marcado como LEGADO, referência ao registry canônico |

### docs/

| Arquivo | Correção |
|---|---|
| indicators/saude-brasil-360-coverage-matrix.md | Qualificado "15" como Qualidade APS, nota de escopo 21 |
| indicators/saude-brasil-360-validation-report.md | Qualificado "15 indicadores" |
| testing.md | Qualificado "15 indicadores" + nota CVAT |

---

## 3. Arquivos movidos para `temp/`

### temp/github-context-stale/

| Arquivo | Motivo |
|---|---|
| README-unificacao-github-zuza.md | Histórico já aplicado |
| sus-analytics-sync.agent.md (sub-agents/) | Duplicata desatualizada do agente principal |
| roadmap_sprints.md | Genérico (sprints de agente, não do produto) |
| current/legacy-php-modernization.md | Duplica docs/17-legacy-php/ |

### temp/github-zuza/

| Arquivo | Motivo |
|---|---|
| .zuza/context/change_log.md | Pasta .zuza duplica .github/context/ |

### temp/docs-stale/

| Arquivo | Motivo |
|---|---|
| gate-sprint-02.md | Gate report datado, superado |
| gate-web-agent-1-changelog.md | Gate report datado, superado |
| gate-web-restore-2.md | Gate report datado, superado |
| audit-gate1.0.1-integrity-report.md | 802 linhas, gate superado |
| data-quality-rules.md | Duplica docs/11-indicator-field-catalog/data-quality-rules.md |
| security-auth-current-state.md | 522 linhas, superado por docs/23-security/ |
| security-nominal-routes.md | Superado por route-access-matrix |
| remapeamento-skills.md | Skill avulso sem referência em código/agent |
| build-gap.md | Info já em runtime-source-convergence.md |
| ci-release-build-gap.md | Info já em runtime-source-convergence.md |
| main-test-gap.md | Superado por testing.md e QA checklist |
| web-test-gate.md | Gate fechado, superado |
| source-health.md | Snapshot stale one-time |
| runtime-detected.md | Snapshot stale one-time |
| project-layout-detected.md | Snapshot stale one-time |
| notifications.md | Sem referência ativa |

---

## 4. DIVERGÊNCIAS CRÍTICAS — Código × Registry × Fontes Oficiais

### 4.1 Mapeamento B1-B6 invertido

O código em `indicadores-previne-brasil-v2.ts` usa nomenclatura **diferente** das notas metodológicas oficiais do MS:

| Código | Registry canônico (oficial) | Código no código (legado) | Nome no código |
|---|---|---|---|
| B1 | Primeira Consulta Programada eSB | calcularB1 | Primeira Consulta Odontológica |
| B2 | Tratamento Concluído eSB | calcularB2 | Pré-Natal Odontológico |
| B3 | Taxa de Exodontia eSB (faixa ótima) | calcularB3 | Atendimento Programado |
| B4 | Escovação Supervisionada 6-12a | calcularB4 | Tratamento Concluído |
| B5 | Procedimentos Preventivos (faixa ótima) | calcularB5 | Razão Restauração/Exodontia |
| B6 | ART | calcularB6 | Ações Coletivas |

**Impacto:** Fórmulas, denominadores e metas podem estar trocadas. B3 oficial tem polaridade de faixa ótima; no código está como "Atendimento Programado" que é maior-melhor. Risco de cálculo incorreto de cofinanciamento.

**Classificação:** `CRITICAL_BINDING_MISMATCH`

### 4.2 Mapeamento M1/M2 invertido

| Código | Registry canônico | Nome no código |
|---|---|---|
| M1 | Ações interprofissionais eMulti | Atendimentos eMulti |
| M2 | Média de atendimentos por pessoa eMulti | Consultas Especialidades |

O código de M1 consulta `tb_cds_atend_odonto` com `st_nasf=1` — tabela errada para ações interprofissionais. M2 consulta `rl_cds_atend_odonto_tipo_encam` — semanticamente diferente da nota oficial.

**Classificação:** `CRITICAL_BINDING_MISMATCH`

### 4.3 Drilldowns em publicProcedure (risco LGPD)

`previneBrasil.calcularTodos` e `previneBrasil.drilldown` estão em `publicProcedure` no router `Apps/web/server/routers.ts`. Drilldowns retornam `nu_cns`, `nu_cpf`, `no_cidadao` sem máscara.

**Classificação:** `SECURITY_P0`

### 4.4 CVAT sem implementação SQL

CVAT1-CVAT6 estão documentados como `derived-operational-rule` no registry mas não existe SQL validado nem endpoint real além dos stubs em `saudeBrasil360.cvat*`.

**Classificação:** `BLOCKED_BY_SOURCE`

---

## 5. Pendências técnicas

| # | Pendência | Severidade | Sprint sugerida |
|---|---|---|---|
| 1 | Reconciliar mapeamento B1-B6 com notas oficiais do MS | CRITICAL | B360-1 |
| 2 | Reconciliar mapeamento M1/M2 com notas oficiais do MS | CRITICAL | B360-1 |
| 3 | Proteger drilldowns com RBAC (sair de publicProcedure) | SECURITY P0 | B360-1 |
| 4 | Mascarar PII (nu_cpf, nu_cns, no_cidadao) nos drilldowns | SECURITY P0 | B360-1 |
| 5 | Validar fórmulas B3 e B5 com polaridade de faixa ótima | HIGH | B360-1 |
| 6 | Validar fórmula C1 com teto (não é maior-melhor puro) | HIGH | B360-1 |
| 7 | Implementar SQL validado para CVAT1-CVAT5 | MEDIUM | B360-2 |
| 8 | Deprecar router previneBrasil.* e migrar para saudeBrasil360.* | MEDIUM | B360-1 |
| 9 | Confirmar tb_cds_cad_individual na réplica para CVAT | MEDIUM | B360-2 |
| 10 | Build/test/lint gates (requer pnpm em ambiente Windows) | MEDIUM | Imediato |
| 11 | Sub-agents não referenciam escopo 21 (17 sub-agents) | LOW | B360-2 |
| 12 | .github/context/change_log.md (563 linhas) precisa de curadoria | LOW | B360-2 |

---

## 6. Plano de avanço

### Sprint B360-1 (próxima — prioridade máxima)

**Tema: Reconciliação de vínculos e RBAC**

1. **Reconciliar B1-B6**: Comparar cada `calcularBx` com nota metodológica oficial; corrigir nome, fórmula, tabelas DW e meta. Manter backward-compat no frontend via alias.
2. **Reconciliar M1/M2**: Corrigir tabelas consultadas (M1 não pode consultar `tb_cds_atend_odonto`).
3. **RBAC nos drilldowns**: Migrar de `publicProcedure` para `protectedProcedure` com permissão `indicators.drilldown.read`.
4. **Máscara PII**: Mascarar `nu_cpf`, `nu_cns`, `no_cidadao` nos payloads de drilldown.
5. **Faixa ótima B3/B5/C1**: Implementar lógica de classificação por faixa (não apenas `>=meta`).
6. **Deprecar previneBrasil.***: Adicionar `@deprecated` e redirect para `saudeBrasil360.*`.

**Gate de saída:** Smoke indicators sem `erroTecnico`, RBAC validado, nenhum dado nominal em rota pública.

### Sprint B360-2

**Tema: CVAT e convergência source-first**

1. Implementar SQL CVAT1-CVAT5 validado contra tabelas do DW PEC.
2. Confirmar `tb_cds_cad_individual` na réplica.
3. Migrar frontend de `/api/pec/*` para `saudeBrasil360.*`.
4. Atualizar sub-agents com escopo 21.
5. Curadoria do change_log.md.

### Sprint B360-3+

**Tema: Validação normativa e primeiro IMPLEMENTED_VALIDATED**

1. Primeiro indicador com status `IMPLEMENTED_VALIDATED` (C1 ou C4).
2. Teste de contrato por indicador.
3. Monitorar Diário Oficial para nota metodológica detalhada do CVAT.
4. Todas as 21 métricas `IMPLEMENTED_VALIDATED`.

---

## 7. Checklist QA desta auditoria

- [x] 12 context files de .github/ corrigidos com escopo 21
- [x] 1 instruction file marcado como legado
- [x] 3 docs/ corrigidos com qualificação de escopo
- [x] 21 arquivos obsoletos movidos para temp/
- [x] Sub-agent duplicado movido para temp/
- [x] Divergência B1-B6 documentada com evidência de código
- [x] Divergência M1/M2 documentada com evidência de código
- [x] Risco LGPD em drilldowns documentado
- [x] Nenhum segredo exposto
- [x] Nenhum CPF/CNS nos novos arquivos
- [ ] Build/test — BLOCKED (sandbox sem pnpm)

---

## 8. Próximas 3 ações

1. **Rodar build+test+lint em ambiente Windows** e commitar se gates passarem.
2. **Abrir issue para reconciliação B1-B6/M1-M2** com notas oficiais — é o risco mais alto do projeto.
3. **Proteger drilldowns com RBAC** antes de qualquer deploy — risco LGPD P0 ativo.
