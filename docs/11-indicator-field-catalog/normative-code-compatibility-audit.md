# Auditoria de Compatibilidade Normativa × Código — Saúde Brasil 360

> **Data:** 2026-05-21
> **Etapa:** 1 — Diagnóstico (somente leitura, sem alteração de código)
> **Status:** PARTIAL — divergências críticas C2/C3 no catálogo canônico
> **Repositório:** sus-analytics-sync
> **Código canônico auditado:** `Apps/server/api/src/saude-brasil-360/**`
> **Código legado auditado:** `Apps/web/server/indicadores-previne-brasil-v2.ts`, `routers-previne.ts`

---

## 1. Resumo executivo

Auditoria cruzada entre 15 notas metodológicas oficiais do MS (PDFs), código canônico em `saude-brasil-360/`, catálogo (`catalog.ts`), registry (`official-indicators-registry.md`), e rotas de acesso nominal.

**Achados principais:**

1. **C2 e C3 no catálogo/código canônico estão com nomes e implementações do programa anterior** — `WRONG_INDICATOR_MAPPING` crítico.
2. **Código legado (`indicadores-previne-brasil-v2.ts`) tem B1-B6 e M1/M2 completamente invertidos** — confirmado na sessão anterior, mantém-se.
3. **Código canônico B1-B6, M1-M2 têm nomes corretos** e implementações estruturalmente alinhadas, porém com warnings de validação oficial pendente.
4. **C4, C5, C6, C7 canônicos estão nominalmente corretos** e com boas práticas compatíveis.
5. **Dados nominais** presentes em `routers-previne.ts` (legado) e `pec-api.ts` — classificados conforme LEDI taxonomy.
6. **Router canônico** (`saude-brasil-360/router.ts`) usa `protectedProcedure` em todos os endpoints de cálculo — RBAC correto.

---

## 2. Matriz de Compatibilidade Normativa — 15 Indicadores Qualidade APS

### C1 — Mais acesso à APS

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C1 |
| 2 | Nome oficial | Mais acesso à Atenção Primária à Saúde (APS) |
| 3 | Fonte oficial primária | Nota Metodológica C1 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar proporção de demanda programada sobre demanda total |
| 5 | Numerador oficial | Atendimentos individuais de demanda programada (tipo 1, 2) por CBOs elegíveis |
| 6 | Denominador oficial | Total de atendimentos individuais (tipo 1, 2, 4, 5, 6) por CBOs elegíveis |
| 7 | Fórmula oficial | (demanda programada / total demandas) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Não se aplica (faixa ótima) |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP (tipo 70, 76) |
| 13 | CBO oficial | 2251-42, 2251-70, 2251-30, 2235-65, 2235-05 |
| 14 | SIGTAP oficial | N/A (baseado em tipo de atendimento) |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAI |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_dim_equipe, tb_dim_cbo, tb_dim_tipo_atendimento |
| 18 | Código fonte atual | `indicador-c1.ts` → `calcularC1ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c1.ts` |
| 20 | ruleVersion atual | C1@2026.2 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS (requires_official_validation) |
| 22 | Divergência encontrada | CBOs no código usam formato 6 dígitos (225142) vs oficial 7 com hífen (2251-42). Polaridade oficial = "Não se aplica" (faixa ótima), código trata como percentual simples sem classificação por faixa. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | HIGH |
| 25 | Ação recomendada | Implementar classificação por faixa ótima (Ótimo/Bom/Suficiente/Regular). Validar mapeamento CBO 6→7 dígitos. |

### C2 — Cuidado no desenvolvimento infantil

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C2 |
| 2 | Nome oficial | Cuidado no desenvolvimento infantil na APS |
| 3 | Fonte oficial primária | Nota Metodológica C2 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar acesso e monitoramento de crianças até 2 anos (5 boas práticas, 100 pts) |
| 5 | Numerador oficial | Somatório de boas práticas pontuadas: (A) 1ª consulta ≤30d=20pts, (B) 9 consultas=20pts, (C) 9 registros peso+altura=20pts, (D) 2 visitas ACS/TACS=20pts, (E) vacinação completa=20pts |
| 6 | Denominador oficial | Nº crianças ≤2 anos vinculadas à equipe |
| 7 | Fórmula oficial | (soma_pontos / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP (tipo 70, 76) |
| 13 | CBO oficial | Médicos (2251, 2252, 2253, 2231), Enfermeiros (2235), Técnicos (3222), ACS (5151-05), TACS (3222-55) |
| 14 | SIGTAP oficial | 01.01.04.002-4, 01.01.04.008-3, 01.01.04.007-5, 03.01.01.026-9, 03.01.01.027-7, 03.01.01.025-0 |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAI, MIP, MIVDT, MIV, RIA |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_cidadao_pec, tb_fat_visita_domiciliar, tb_fat_vacinacao |
| 18 | Código fonte atual | `indicador-c2.ts` → `calcularC2ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c2.ts` |
| 20 | ruleVersion atual | C2@2026.1 |
| 21 | Status runtime | WRONG_INDICATOR_MAPPING |
| 22 | Divergência encontrada | **CRÍTICO**: O código implementa "Gestantes: sífilis e HIV" (exames de sífilis/HIV em gestantes). O C2 oficial é "Cuidado no desenvolvimento infantil" com 5 boas práticas para crianças ≤2 anos. O código consulta `tb_fat_atd_ind_exames` e `tb_dim_procedimento` para códigos de sífilis/HIV — nada disso corresponde ao C2 oficial. |
| 23 | Classificação | `wrong_indicator_mapping` |
| 24 | Prioridade | CRITICAL |
| 25 | Ação recomendada | Reescrever completamente `indicador-c2.ts` para implementar as 5 boas práticas do desenvolvimento infantil. A implementação atual de sífilis/HIV pertence ao C3 oficial (boa prática G/H). Atualizar `catalog.ts` com nome correto. |

### C3 — Cuidado na gestação e puerpério

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C3 |
| 2 | Nome oficial | Cuidado na Gestação e Puerpério na APS |
| 3 | Fonte oficial primária | Nota Metodológica C3 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar acesso durante gestação e puerpério (11 boas práticas, 100 pts) |
| 5 | Numerador oficial | Somatório de 11 boas práticas: (A) captação precoce ≤12sem=10pts, (B) 7 consultas=10pts, (C) 7 aferições PA=10pts, (D) 7 peso+altura=10pts, (E) 3 visitas ACS=10pts, (F) dTpa ≥20sem=5pts, (G) testes sífilis/HIV/HepB/HepC 1ºtri=10pts, (H) testes sífilis/HIV 3ºtri=10pts, (I) consulta puerperal=10pts, (J) visita puerperal=5pts, (K) saúde bucal=10pts |
| 6 | Denominador oficial | Nº gestantes/puérperas ativas vinculadas à equipe |
| 7 | Fórmula oficial | (soma_pontos / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP (tipo 70, 76) |
| 13 | CBO oficial | Médicos (2231/2251/2252/2253), Enfermeiros (2235), Dentistas (2232), Farmacêuticos (2234), ACS (5151-05), TACS (3222-55), + vários |
| 14 | SIGTAP oficial | 03.01.10.003-9, 03.01.01.003-0, 03.01.01.006-4, 03.01.01.011-0, 03.01.01.012-9, 03.01.01.013-7, 03.01.01.025-0, + testes rápidos (02.14.01.*), + antropometria |
| 15 | CID/CIAP oficial | CID-10 aborto para interrupção |
| 16 | Modelo de informação | MIAI, MIP, MIVDT, MIV, RIA, MIAC, MIAOI |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_atendimento_odonto, tb_fat_visita_domiciliar, tb_fat_vacinacao, tb_fat_atd_ind_exames |
| 18 | Código fonte atual | `indicador-c3.ts` → `calcularC3ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c3.ts` |
| 20 | ruleVersion atual | C3@2026.1 |
| 21 | Status runtime | WRONG_INDICATOR_MAPPING |
| 22 | Divergência encontrada | **CRÍTICO**: O código implementa "Gestantes: atendimento odontológico" (gestantes com st_gestante=1 em tb_fat_atendimento_odonto). O C3 oficial é o indicador COMPLETO de gestação+puerpério com 11 boas práticas. O código cobre apenas 1 das 11 boas práticas (K — saúde bucal). Faltam: captação precoce, consultas, PA, peso, visitas ACS, dTpa, testes laboratoriais, puerpério. |
| 23 | Classificação | `wrong_indicator_mapping` |
| 24 | Prioridade | CRITICAL |
| 25 | Ação recomendada | Reescrever completamente `indicador-c3.ts` para implementar as 11 boas práticas. A implementação atual de sífilis/HIV do C2-código pode ser aproveitada como sub-componente G/H do C3 real. Atualizar `catalog.ts`. |

### C4 — Cuidado da pessoa com diabetes

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C4 |
| 2 | Nome oficial | Cuidado da pessoa com Diabetes Mellitus na APS |
| 3 | Fonte oficial primária | Nota Metodológica C4 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar 6 boas práticas: (A) consulta 6m, (B) PA 6m, (C) peso+altura 12m, (D) visitas ACS 12m, (E) HbA1c 12m, (F) exame pé 12m |
| 5 | Numerador oficial | Somatório das boas práticas pontuadas |
| 6 | Denominador oficial | Pessoas com diabetes vinculadas (CID E10-E14, CIAP T89/T90) |
| 7 | Fórmula oficial | (soma_pontos / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP |
| 13 | CBO oficial | Médicos, Enfermeiros, ACS/TACS |
| 14 | SIGTAP oficial | HbA1c: 0202010503. Exame pé: 0301040095 |
| 15 | CID/CIAP oficial | CID E10.*, E11.*, E14.*. CIAP T89, T90 |
| 16 | Modelo de informação | MIAI, MIP, MIVDT |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_cidadao_pec, tb_fat_visita_domiciliar |
| 18 | Código fonte atual | `indicador-c4.ts` → `calcularC4ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c4.ts` |
| 20 | ruleVersion atual | C4@2026.2 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. Usa C4_HBA1C_CODES=["0202010503","ABEX008"] e C4_FOOT_EXAM_CODES=["0301040095"] — alinhado. CBOs por prefixo ["225","2235"] — proxy, não exato. Boas práticas implementadas via ponderação. Precisa validação oficial de fórmula. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar pesos de cada boa prática contra nota oficial. Verificar se CBO por prefixo é suficiente. Confirmar CID/CIAP na identificação de diabéticos. |

### C5 — Cuidado da pessoa com hipertensão

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C5 |
| 2 | Nome oficial | Cuidado da pessoa com Hipertensão Arterial na APS |
| 3 | Fonte oficial primária | Nota Metodológica C5 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar 4 boas práticas: (A) consulta 6m, (B) PA 6m, (C) peso+altura 12m, (D) visitas ACS 12m |
| 5 | Numerador oficial | Somatório das boas práticas pontuadas |
| 6 | Denominador oficial | Pessoas com hipertensão (CID I10-I15, O10-O11, CIAP K86/K87) |
| 7 | Fórmula oficial | (soma_pontos / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP |
| 13 | CBO oficial | Médicos (2231/2251/2252/2253), Enfermeiros (2235), ACS (5151-05), TACS (3222-55) |
| 14 | SIGTAP oficial | 03.01.10.003-9 (aferição PA) |
| 15 | CID/CIAP oficial | CID I10-I15, O10-O11. CIAP K86, K87 |
| 16 | Modelo de informação | MIAI, MIP, MIVDT |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_cidadao_pec, tb_fat_visita_domiciliar |
| 18 | Código fonte atual | `indicador-c5.ts` → `calcularC5ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c5.ts` |
| 20 | ruleVersion atual | C5@2026.4 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. 4 boas práticas (sem HbA1c, sem exame pé) — correto para C5 vs C4. C5_VISIT_CBO_CODES=["515105","322255"] — alinhado com ACS/TACS. Sem divergência estrutural encontrada. Precisa validação oficial. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar pesos e CID/CIAP usados na identificação de hipertensos. Confirmar que HbA1c NÃO está incluído (correto). |

### C6 — Cuidado da pessoa idosa

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C6 |
| 2 | Nome oficial | Cuidado da pessoa idosa na APS |
| 3 | Fonte oficial primária | Nota Metodológica C6 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar 4 boas práticas: (A) consulta 12m=25pts, (B) peso+altura 12m=25pts, (C) 2 visitas ACS 12m=25pts, (D) vacina influenza 12m=25pts |
| 5 | Numerador oficial | Somatório das boas práticas pontuadas |
| 6 | Denominador oficial | Pessoas ≥60 anos vinculadas à equipe |
| 7 | Fórmula oficial | (soma_pontos / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP (tipo 70, 76) |
| 13 | CBO oficial | Médicos, Enfermeiros, ACS/TACS, + multiprofissionais |
| 14 | SIGTAP oficial | 01.01.04.002-4, 01.01.04.008-3, 01.01.04.007-5, 03.01.01.003-0, 03.01.01.006-4, 03.01.01.025-0 |
| 15 | CID/CIAP oficial | N/A (critério etário ≥60) |
| 16 | Modelo de informação | MIAI, MIP, MIVDT, MIV, RIA |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_cidadao_pec, tb_fat_visita_domiciliar, tb_fat_vacinacao |
| 18 | Código fonte atual | `indicador-c6.ts` → `calcularC6ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c6.ts` |
| 20 | ruleVersion atual | C6@2026.1 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. C6_INFLUENZA_CODES=["33","77"] — alinhado (trivalente/tetravalente). C6_VISIT_CBO_CODES=["515105","322255"] — correto. 4 boas práticas estruturalmente alinhadas. Precisa validação oficial de pesos. Boa prática (C) não condicionante para eAP tipo 76 — verificar se código implementa essa exceção. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Verificar exceção eAP tipo 76 para boa prática (C). Validar pesos 25/25/25/25. |

### C7 — Cuidado da mulher na prevenção do câncer

| # | Campo | Valor |
|---|---|---|
| 1 | Código | C7 |
| 2 | Nome oficial | Cuidado da mulher na prevenção do câncer na APS |
| 3 | Fonte oficial primária | Nota Metodológica C7 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | 4 boas práticas com coortes etárias diferentes: (A) rastreamento colo útero 25-64a 36m=20pts, (B) HPV 9-14a=30pts, (C) saúde sexual/reprodutiva 14-69a 12m=30pts, (D) rastreamento mama 50-69a 24m=20pts |
| 5 | Numerador oficial | Somatório ponderado por coorte |
| 6 | Denominador oficial | Mulheres e homens transgênero 9-69a, por coorte |
| 7 | Fórmula oficial | (A+B+C+D)×100 com fórmulas individuais por boa prática |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSF / eAP |
| 13 | CBO oficial | Médicos, Enfermeiros, + multiprofissionais |
| 14 | SIGTAP oficial | 02.04.03.003-0 (mamografia), 02.04.03.018-8 (mamografia rastreamento), 02.01.02.003-3 (coleta citopatológico), 02.03.01.008-6, 02.03.01.001-9, 02.01.02.007-6, 02.01.02.008-4 |
| 15 | CID/CIAP oficial | N/A (critério etário + sexo/identidade de gênero) |
| 16 | Modelo de informação | MIAI, MIP, MIV, RIA |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_cidadao_pec, tb_fat_vacinacao, tb_fat_atd_ind_exames |
| 18 | Código fonte atual | `indicador-c7.ts` → `calcularC7ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-c7.ts` |
| 20 | ruleVersion atual | C7@2026.1 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. Implementação com coortes ponderadas e evidências de rastreamento/HPV/saúde sexual. Inclusão de homens transgênero conforme nota. Precisa validar: ABP023 (rastreamento mama), códigos HPV (67, 93), esquemas de dose. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar esquema HPV dose única. Verificar inclusão de auto-coleta HPV (02.01.02.008-4). Confirmar ABP023. |

### B1 — Primeira consulta odontológica programada

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B1 |
| 2 | Nome oficial | Primeira consulta odontológica programática por eSB |
| 3 | Fonte oficial primária | Nota Metodológica B1 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar acesso à primeira consulta odontológica programática |
| 5 | Numerador oficial | Pessoas com 1ª consulta odontológica programática pela eSB (SIGTAP 03.01.01.015-3) |
| 6 | Denominador oficial | Pessoas vinculadas à eSF/eAP da eSB de referência |
| 7 | Fórmula oficial | (numerador / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h vinculada a eSF ou 2 eAP 20h |
| 13 | CBO oficial | 2232-08, 2232-93, 2232-72 |
| 14 | SIGTAP oficial | 03.01.01.015-3 |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAOI |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_odonto, tb_dim_equipe, tb_dim_cbo |
| 18 | Código fonte atual | `indicador-b1.ts` → `calcularB1ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-b1.ts` |
| 20 | ruleVersion atual | B1@2026.3 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. Usa `b-common.ts` com BUCAL_DENTIST_CBO_CODES=["223208","223293","223272"] — alinhado. Deduplicação por pessoa+dentista em 12 meses a verificar. Scope eSB 40h por proxy ds_filtro — limitação conhecida. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar regra de deduplicação oficial. Confirmar escopo eSB 40h. |

### B2 — Tratamento concluído

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B2 |
| 2 | Nome oficial | Tratamento Concluído por equipe de Saúde Bucal (eSB) |
| 3 | Fonte oficial primária | Nota Metodológica B2 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar resolutividade: relação tratamento concluído / 1ª consulta programática |
| 5 | Numerador oficial | Nº pessoas com tratamento odontológico concluído pela eSB |
| 6 | Denominador oficial | Nº pessoas com primeira consulta odontológica programática pela eSB |
| 7 | Fórmula oficial | (tratamentos concluídos / 1as consultas programáticas) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Atualização e monitoramento mensal; avaliação quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h |
| 13 | CBO oficial | 2232-08, 2232-93, 2232-72 |
| 14 | SIGTAP oficial | 03.01.01.015-3 (denominador). Conduta "Tratamento concluído" (numerador) |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAOI |
| 17 | Tabelas eSUS confirmadas | tb_dim_cbo, tb_dim_equipe, tb_dim_procedimento, tb_dim_profissional, tb_dim_tipo_consulta_odonto, tb_dim_unidade_saude, tb_fat_atend_odonto_proced, tb_fat_atendimento_odonto |
| 18 | Código Rust atual | `b2.rs`, `dental_materialize.rs`, `materialize.rs`, `golden_bundle.rs` |
| 19 | Código TypeScript legado | `saude-brasil-360/indicadores/indicador-b2.ts` |
| 20 | ruleVersion atual | B2@2026.5 |
| 21 | Status runtime | `BLOQUEADO_POR_FONTE`; resultado Rust persistido 19/34, sem ativação BFF |
| 22 | Divergência encontrada | Rust implementa tipo 1 + SIGTAP 0301010153, conduta concluída, dedupe pessoa+dentista em 12 meses e não exclui encaminhamentos. O legado usa base 1..4 e proxies de encaminhamento, produzindo 19/139 no mesmo escopo. |
| 23 | Classificação | `rust_implemented_source_blocked_legacy_divergent` |
| 24 | Prioridade | HIGH |
| 25 | Ação recomendada | Corrigir a consulta sem SIGTAP oficial, prover vínculo eSB→eSF/eAP, gerar golden independente e dual-run antes do cutover. |

### B3 — Taxa de exodontia

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B3 |
| 2 | Nome oficial | Taxa de exodontias realizadas por eSB |
| 3 | Fonte oficial primária | Nota Metodológica B3 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar proporção de exodontias sobre total de procedimentos |
| 5 | Numerador oficial | Exodontias (SIGTAP 0414020138, 0414020146) |
| 6 | Denominador oficial | Procedimentos preventivos + curativos/restauradores + exodontias |
| 7 | Fórmula oficial | (exodontias / total) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Não se aplica (faixa ótima: Ótimo ≥8<10, Bom ≥10<12, Suficiente ≥12<14, Regular <8 ou ≥14) |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h |
| 13 | CBO oficial | 2232-08, 2232-93, 2232-72 |
| 14 | SIGTAP oficial | Exodontia: 0414020138, 0414020146. Preventivos e restauradores: lista longa |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAOI, MIP |
| 17 | Tabelas eSUS prováveis | tb_fat_atend_odonto_proced, tb_fat_atendimento_odonto |
| 18 | Código fonte atual | `indicador-b3.ts` → `calcularB3ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-b3.ts` |
| 20 | ruleVersion atual | B3@2026.3 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. BUCAL_EXODONTIA_PROCEDURE_CODES=["0414020138","0414020146"] — alinhado. Usa preventivos + curativos/restauradores + exodontias como denominador — conforme nota. **Falta implementação de classificação por faixa ótima** (Ótimo/Bom/Suficiente/Regular com faixas numéricas). |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | HIGH |
| 25 | Ação recomendada | Implementar classificação por faixa ótima conforme parâmetros oficiais. B3 NÃO é "maior-melhor". |

### B4 — Escovação supervisionada 6-12 anos

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B4 |
| 2 | Nome oficial | Escovação dentária supervisionada em faixa etária escolar de 6 a 12 anos |
| 3 | Fonte oficial primária | Nota Metodológica B4 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar cobertura de escovação supervisionada em crianças 6-12a |
| 5 | Numerador oficial | Crianças 6-12a participantes de ação coletiva de escovação supervisionada |
| 6 | Denominador oficial | Crianças 6-12a vinculadas à eSF/eAP da eSB de referência |
| 7 | Fórmula oficial | (numerador / denominador) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor (Ótimo >1, Bom >0.5≤1, Suficiente >0.25≤0.5, Regular ≤0.25) |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h |
| 13 | CBO oficial | Dentistas (2232), TSB (3224-05, 3224-25), ASB (3224-15, 3224-30) |
| 14 | SIGTAP oficial | 0101020031 (escovação supervisionada) |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAC (atividade coletiva tipo 4) |
| 17 | Tabelas eSUS prováveis | tb_fat_atividade_coletiva, tb_fat_cidadao_pec |
| 18 | Código fonte atual | `indicador-b4.ts` → `calcularB4ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-b4.ts` |
| 20 | ruleVersion atual | B4@2026.3 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. BUCAL_BRUSHING_PROCEDURE_CODES=["0101020031"] e BUCAL_BRUSHING_ACTIVITY_IDENTIFIERS=["4"] — alinhado. Parâmetros de faixa presentes na nota (>1, >0.5≤1, etc) — verificar se código implementa. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar classificação por parâmetro. Verificar CBOs incluem TSB e ASB. |

### B5 — Procedimentos odontológicos preventivos

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B5 |
| 2 | Nome oficial | Procedimentos odontológicos individuais preventivos por eSB |
| 3 | Fonte oficial primária | Nota Metodológica B5 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar proporção de procedimentos preventivos sobre total de procedimentos individuais |
| 5 | Numerador oficial | Procedimentos preventivos individuais |
| 6 | Denominador oficial | Total de procedimentos odontológicos individuais |
| 7 | Fórmula oficial | (preventivos / total) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Não se aplica (faixa ótima) |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h |
| 13 | CBO oficial | Dentistas (2232), TSB (3224-05, 3224-25) |
| 14 | SIGTAP oficial | Preventivos: lista de códigos conforme nota |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAOI, MIP |
| 17 | Tabelas eSUS prováveis | tb_fat_atend_odonto_proced, tb_fat_atendimento_odonto |
| 18 | Código fonte atual | `indicador-b5.ts` → `calcularB5ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-b5.ts` |
| 20 | ruleVersion atual | B5@2026.3 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. BUCAL_PREVENTIVE_PROCEDURE_CODES com 6 códigos. Falta classificação por faixa ótima (polaridade = "Não se aplica"). |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | HIGH |
| 25 | Ação recomendada | Implementar classificação por faixa ótima. Validar lista completa de códigos preventivos contra nota oficial. |

### B6 — Tratamento restaurador atraumático

| # | Campo | Valor |
|---|---|---|
| 1 | Código | B6 |
| 2 | Nome oficial | Tratamento Restaurador Atraumático (ART) por eSB |
| 3 | Fonte oficial primária | Nota Metodológica B6 (MS/SAPS/DESCO/CGSB) |
| 4 | Objetivo oficial | Avaliar proporção de ART sobre procedimentos restauradores |
| 5 | Numerador oficial | Procedimentos ART (SIGTAP 03.07.01.007-4) |
| 6 | Denominador oficial | Procedimentos restauradores |
| 7 | Fórmula oficial | (ART / restauradores) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Maior-melhor |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eSB 40h |
| 13 | CBO oficial | 2232-08, 2232-93, 2232-72 |
| 14 | SIGTAP oficial | ART: 0307010074. Restauradores: lista completa |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAOI, MIP |
| 17 | Tabelas eSUS prováveis | tb_fat_atend_odonto_proced |
| 18 | Código fonte atual | `indicador-b6.ts` → `calcularB6ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-b6.ts` |
| 20 | ruleVersion atual | B6@2026.3 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. BUCAL_ART_PROCEDURE_CODES=["0307010074"] — alinhado. BUCAL_RESTORATIVE_PROCEDURE_CODES com 8 códigos — verificar completude contra nota. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar lista de restauradores contra nota oficial. |

### M1 — Média de atendimentos por pessoa pela eMulti

| # | Campo | Valor |
|---|---|---|
| 1 | Código | M1 |
| 2 | Nome oficial | Média de atendimentos por pessoa assistida pela eMulti na APS |
| 3 | Fonte oficial primária | Nota Metodológica M1 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar média de atendimentos individuais+coletivos por pessoa pela eMulti |
| 5 | Numerador oficial | Atendimentos individuais + coletivos pela eMulti |
| 6 | Denominador oficial | Pessoas atendidas pela eMulti |
| 7 | Fórmula oficial | numerador / denominador (média, não percentual) |
| 8 | Unidade de medida | Média (atendimentos/pessoa) |
| 9 | Polaridade | Maior-melhor (Ótimo >3) |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eMulti |
| 13 | CBO oficial | Todos profissionais eMulti (multiprofissional) |
| 14 | SIGTAP oficial | N/A (baseado em atendimento individual e atividade coletiva) |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAI, MIAC |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_atividade_coletiva, tb_dim_equipe, tb_dim_profissional |
| 18 | Código fonte atual | `indicador-m1.ts` → `calcularM1ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-m1.ts` |
| 20 | ruleVersion atual | M1@2026.2 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. Usa `tb_fat_atendimento_individual` + `tb_fat_atividade_coletiva` — alinhado. Escopo eMulti por ds_filtro/no_equipe regex — proxy, não exato. Person key usa `co_fat_cidadao_pec` ou `nu_cns` — proxy para deduplicação. metricKind="mean" corretamente. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar escopo eMulti. Confirmar contagem de atividades coletivas (participantes vs ações). |

### M2 — Ações interprofissionais pela eMulti

| # | Campo | Valor |
|---|---|---|
| 1 | Código | M2 |
| 2 | Nome oficial | Ações interprofissionais realizadas pela eMulti na APS |
| 3 | Fonte oficial primária | Nota Metodológica M2 (MS/SAPS/DESCO) |
| 4 | Objetivo oficial | Avaliar proporção de ações compartilhadas/interprofissionais sobre total de ações eMulti |
| 5 | Numerador oficial | Ações compartilhadas/interprofissionais eMulti |
| 6 | Denominador oficial | Total de ações eMulti |
| 7 | Fórmula oficial | (ações compartilhadas / total ações) × 100 |
| 8 | Unidade de medida | Percentual |
| 9 | Polaridade | Neutra |
| 10 | Periodicidade | Mensal / Quadrimestral |
| 11 | Dia de extração | 20º dia útil |
| 12 | Equipe elegível | eMulti |
| 13 | CBO oficial | Todos profissionais eMulti |
| 14 | SIGTAP oficial | N/A |
| 15 | CID/CIAP oficial | N/A |
| 16 | Modelo de informação | MIAI, MIAC |
| 17 | Tabelas eSUS prováveis | tb_fat_atendimento_individual, tb_fat_atividade_coletiva |
| 18 | Código fonte atual | `indicador-m2.ts` → `calcularM2ComEvidencia` |
| 19 | Função/módulo atual | `saude-brasil-360/indicadores/indicador-m2.ts` |
| 20 | ruleVersion atual | M2@2026.2 |
| 21 | Status runtime | PARTIAL_WITH_WARNINGS |
| 22 | Divergência encontrada | Nome correto. Polaridade neutra conforme nota. Precisa validar definição de "ação compartilhada" vs "ação específica" no código. |
| 23 | Classificação | `partially_aligned` |
| 24 | Prioridade | MEDIUM |
| 25 | Ação recomendada | Validar definição operacional de "ação compartilhada/interprofissional" contra nota oficial. |

---

## 3. Divergência adicional: catalog.ts × types.ts

O arquivo `catalog.ts` e `types.ts` ambos exportam `B360_CATALOG` — duplicação com risco de drift. O `catalog.ts` inclui `canonicalEvidence` que `types.ts` não tem.

**Classificação:** `documentation_only`
**Ação:** Unificar exportação em `catalog.ts` e remover duplicata de `types.ts`.

---

## 4. Auditoria de Dados Nominais / LEDI

| Rota | Arquivo | Dado nominal | Auth | Classificação LEDI |
|---|---|---|---|---|
| `indicadores.listaNominal` | `routers/indicadores.ts:29` | Retorna lista nominal para correção | `protectedProcedure` | `nominal_required_for_operation` |
| `routers-previne.ts` drilldown C4/C5/C7 | `routers-previne.ts:555-617` | `no_cidadao`, `nu_cpf_cidadao` | `permissionProcedure` | `nominal_required_for_operation` |
| `pec-api.ts` drilldown | `routes/pec-api.ts:896-940` | `no_cidadao`, `nu_cpf`, `nu_cns` | Express middleware (não tRPC) | `nominal_exposed_without_auth` — **P0** |
| `routers/acs.ts` getAll | `routers/acs.ts:50,69` | `nu_cns` (profissional, não cidadão) | `protectedProcedure` | `nominal_exposed_with_auth` |
| `cadastros/*.ts` | `cadastros/duplicados.ts, sem-documento.ts` | `nu_cpf_cidadao`, `nu_cns` em queries internas | `protectedProcedure` | `nominal_audited` |
| `saude-brasil-360/indicadores/*.ts` | Todos os indicador-*.ts | Nenhum dado nominal exposto | `protectedProcedure` | N/A — sem PII |
| `saude-brasil-360/indicadores/indicador-m1.ts` | `indicador-m1.ts:120` | `nu_cns` usado como person_key interno, não retornado | `protectedProcedure` | `nominal_not_audited` (interno) |
| `indicators/routers-indicators.ts` result/diagnostics | `routers-indicators.ts:43-81` | Sem dado nominal, mas em `publicProcedure` | `publicProcedure` | `public_leak_risk` (dados agregados, sem PII) |

**P0 de acesso nominal:**
- `pec-api.ts` drilldown (Express routes) — retorna `no_cidadao`, `nu_cpf`, `nu_cns` sem autenticação tRPC. Necessita middleware auth Express ou migração para tRPC `protectedProcedure`.

**Confirmação:** Nenhum dado nominal foi removido nesta etapa. Dados nominais necessários ao LEDI estão preservados.

---

## 5. Resumo de Classificações

| Indicador | Classificação | Prioridade |
|---|---|---|
| C1 | `partially_aligned` | HIGH |
| **C2** | **`wrong_indicator_mapping`** | **CRITICAL** |
| **C3** | **`wrong_indicator_mapping`** | **CRITICAL** |
| C4 | `partially_aligned` | MEDIUM |
| C5 | `partially_aligned` | MEDIUM |
| C6 | `partially_aligned` | MEDIUM |
| C7 | `partially_aligned` | MEDIUM |
| B1 | `partially_aligned` | MEDIUM |
| B2 | `rust_implemented_source_blocked_legacy_divergent` | HIGH |
| B3 | `partially_aligned` | HIGH |
| B4 | `partially_aligned` | MEDIUM |
| B5 | `partially_aligned` | HIGH |
| B6 | `partially_aligned` | MEDIUM |
| M1 | `partially_aligned` | MEDIUM |
| M2 | `partially_aligned` | MEDIUM |

**Indicadores alinhados:** 0
**Parcialmente alinhados:** 12
**Implementado em Rust, bloqueado por fonte e legado divergente:** 1 (B2)
**Incorretos (wrong_indicator_mapping):** 2 (C2, C3)

---

## 6. Plano de Correção Proposto

### Etapa 2 — C2/C3 (CRITICAL)
1. Reescrever `indicador-c2.ts` para Cuidado no Desenvolvimento Infantil (5 boas práticas, crianças ≤2a)
2. Reescrever `indicador-c3.ts` para Cuidado na Gestação e Puerpério (11 boas práticas)
3. Atualizar `catalog.ts` e `types.ts` com nomes corretos
4. Aproveitar código atual de sífilis/HIV do C2-código como sub-componente G/H do C3 real

### Etapa 3 — Faixas ótimas (HIGH)
1. C1: implementar classificação por faixa ótima
2. B3: implementar faixas (Ótimo ≥8<10, Bom ≥10<12, etc)
3. B5: implementar faixas ótimas

### Etapa 4 — Validação oficial (MEDIUM)
1. C4/C5/C6/C7: validar pesos de boas práticas
2. B1/B2/B4/B6: validar regras de deduplicação e listas SIGTAP
3. M1/M2: validar escopo eMulti e definições operacionais

### Etapa 5 — Dados nominais / LEDI
1. Proteger `pec-api.ts` drilldowns com auth middleware
2. Manter contrato nominal para LEDI
3. Adicionar auditoria de acesso

---

## 7. Confirmações de Segurança

- [x] Dados nominais NÃO foram removidos
- [x] Nenhum código foi alterado
- [x] Nenhum commit foi executado
- [x] Nenhum push foi executado
- [x] PEC tratado como somente leitura
- [x] Nenhuma fórmula, CBO, SIGTAP, CID ou CIAP foi inventada
- [x] Todas as informações normativas vêm dos PDFs oficiais do MS

---

## 8. Próximas 3 Ações

1. **Corrigir C2/C3 no código canônico** — reescrever `indicador-c2.ts` e `indicador-c3.ts` conforme notas oficiais (Etapa 2).
2. **Implementar classificação por faixa ótima em C1, B3, B5** — esses indicadores têm polaridade "Não se aplica" e precisam de classificação por faixa, não "maior-melhor" simples.
3. **Proteger `pec-api.ts` com auth** — P0 de acesso nominal ativo, Express routes expõem PII sem autenticação tRPC.
