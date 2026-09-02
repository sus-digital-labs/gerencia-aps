/**
 * PADRÃO C5 HIPERTENSÃO - DOCUMENTAÇÃO ARQUITETURAL
 *
 * Aplicável a indicadores C5, C4 (Diabética) e similares com múltiplos critérios de scoring.
 * Criado: 08/05/2026 | Versão: 1.0
 */

─────────────────────────────────────────────────────────────────────────────
1. ESTRUCTURA DE ELEGIBILIDADE
─────────────────────────────────────────────────────────────────────────────

Regra C5 (Hipertensão):
  • Diagnóstico: CID I10/I11/I12/I13/I15/O10/O11 OU CIAP K86/K87
  • Elegíveis ativos em tb_cidadao: st_ativo = 1
  • Base: tb_fat_atd_ind_problemas (não filtrar por CBO aqui!)
  • Total C5: 3.885 pessoas (Qualisus)

SQL Pattern:
  WITH hipertensao_base AS (
    SELECT DISTINCT ON (TRIM(p.nu_cns))
      TRIM(p.nu_cns) AS nu_cns,
      p.co_dim_equipe_1 AS equipe_id
    FROM tb_fat_atd_ind_problemas p
    LEFT JOIN tb_dim_cid dc ON dc.co_seq_dim_cid = p.co_dim_cid
    LEFT JOIN tb_dim_ciap ci ON ci.co_seq_dim_ciap = p.co_dim_ciap
    WHERE (
      COALESCE(dc.nu_cid,'') ~ '^(I10|I11|I12|I13|I15|O10|O11)'
      OR COALESCE(ci.nu_ciap,'') IN ('K86','K87')
    )
    ORDER BY TRIM(p.nu_cns), p.co_dim_tempo DESC, p.co_seq_fat_atend_ind_problemas DESC
  )

Cautela: NÃO usar CBO como filtro de elegibilidade.
         CBO é usado para VALIDAR CRITÉRIOS (consulta de médico/enfermeiro, ACS visitas, etc.)

─────────────────────────────────────────────────────────────────────────────
2. CRITÉRIOS DE SCORING (A-D)
─────────────────────────────────────────────────────────────────────────────

A) Consulta Médica/Enfermeira (25 pontos)
   • Tabela: tb_fat_atendimento_individual
   • Período: últimos 6 meses
   • CBO profissional: 2231, 2235, 2251, 2252, 2253 (médico/enfermeiro)
   • Validação: f.dt_inicial_atendimento::date >= (CURRENT_DATE - INTERVAL '6 months')

B) Aferição PA (25 pontos)
   • Fonte 1 (FAI): tb_fat_atendimento_individual com nu_pressao_sistolica/diastolica
   • Fonte 2 (Procedimento): tb_fat_atd_ind_procedimentos co_proced='0301100039'
   • Período: 6 meses
   • Profissional: CBO 2231-2253 (médico/enfermeiro) + 3222, 5151 (técnico/ACS)

C) Peso + Altura (25 pontos)
   • Fonte 1: tb_fat_atendimento_individual (f.nu_peso AND f.nu_altura)
   • Fonte 2: tb_fat_atd_ind_procedimentos co_proced='0101040024' (antropometria)
   • Fonte 3: Mesmo dia = co_proced em ('0101040083','0101040075') (peso + altura)
   • Período: 12 meses

D) Visitas ACS/TACS com intervalo ≥30 dias (25 pontos)
   • Tabela: tb_fat_visita_domiciliar
   • CBO: 5151-05 (ACS), 3222-55 (TACS)
   • Critério: 2+ visitas com gap ≥ 30 dias (usar window function LAG)
   • Período: 12 meses

─────────────────────────────────────────────────────────────────────────────
3. PADRÃO PHP - ESTRUTURA EM 3 CAMADAS
─────────────────────────────────────────────────────────────────────────────

Camada 1: Página Principal (pages/esf-pessoa-hipertensa-c5-v2.php)
  └─ Renderiza filtros (Equipe, Microárea)
  └─ Renderiza abas (Pessoas, Percentual) vazias
  └─ JavaScript carrega dados via AJAX ao clicar "Carregar Dados"
  └─ Usa pageStart(), pageEnd(), Bootstrap classes

Camada 2: API Microárea (api/c5-microareas-by-equipe.php)
  └─ GET ?equipe_id=<int>
  └─ JSON: {status, data: [{codigo, nome}]}
  └─ Cascata de filtros funciona automaticamente

Camada 3: APIs de Dados
  ├─ api/c5-pessoas-dados.php
  │  └─ GET ?equipe=<int|all>&microarea=<str|todas>&limit=200&offset=0
  │  └─ JSON: {status, data: [pessoa com A/B/C/D/pontos/classificacao]}
  │  └─ Batch-load via prepared statements
  │
  └─ api/c5-percentual.php
     └─ GET ?equipe=<int|all>&microarea=<str|todas>
     └─ JSON: {status, data: [equipe com numerador/denominador/pontuacao/classificacao]}
     └─ CTE paralelas para cada critério

─────────────────────────────────────────────────────────────────────────────
4. JAVASCRIPT - FLUXO AJAX
─────────────────────────────────────────────────────────────────────────────

1) equipeSel.addEventListener('change'):
   a) Se equipe === 'all' → microSel desabilita
   b) Senão → fetch /api/c5-microareas-by-equipe.php?equipe_id=X
   c) Popula microSel com as 11 microáreas (ex: CABECEIRA)

2) btnCarregar.addEventListener('click'):
   a) fetch /api/c5-pessoas-dados.php?equipe=X&microarea=Y&limit=200
   b) Aguarda ~4 segundos (critérios em batch, sem N+1)
   c) Simultaneamente fetch /api/c5-percentual.php?equipe=X&microarea=Y
   d) Renderiza tabela em contPessoas (Sim/Não com cores)
   e) Renderiza tabela em contPercentual (badges por classificação)

─────────────────────────────────────────────────────────────────────────────
5. PERFORMANCE & OTIMIZAÇÕES
─────────────────────────────────────────────────────────────────────────────

• Carregamento sob demanda via AJAX (evita timeout de 3885 pessoas)
• Batch SQL com placeholders (prepared statements) → sem N+1 queries
• CTEs paralelas em um único query (não múltiplos SELECT)
• Limit 200-500 pessoas por page (paginação em breve)
• JSON parsing + badge rendering no navegador (sem backend rendering)
• Cache de microáreas em localStorage opcional

Tempos observados:
  • Renderização página: < 100ms
  • Filtro equipe → microárea: ~1s (API fetch)
  • Carregamento 200 pessoas + percentual: ~4s (paralelo)

─────────────────────────────────────────────────────────────────────────────
6. VALIDAÇÃO & DEBUGGING
─────────────────────────────────────────────────────────────────────────────

Arquivos de apoio criados (pode remover após validação):
  • temp_c5_debug_counts.php — contagem de elegíveis por CID/CIAP
  • temp_c5_test_load.php — teste de carregamento das primeiras 5 pessoas
  • temp_schema_procedimentos.php — schema da tabela de procedimentos

Errors esperados:
  • "co_dim_procedimento does not exist" → usar co_dim_procedimento_avaliado
  • API retorna 401 → sessão expirada; fazer login novamente
  • 0 elegíveis em query → verificar se CBO está filtrando elegibilidade (deve estar apenas nos critérios)

─────────────────────────────────────────────────────────────────────────────
7. REPLICAÇÃO PARA OUTROS INDICADORES
─────────────────────────────────────────────────────────────────────────────

Para criar C4 (Diabética) ou C3 (Gestante), seguir este padrão:

1. Adaptarazão CTE base:
   - C4: CID E10, E11 (diabetes tipo 1/2)
   - C3: CID O09-O99 (gravidez)

2. Adaptar critérios (A-D):
   - Podem variar em período (6/12 meses), CBO, procedimentos

3. Reusar templates:
   - pages/esf-pessoa-{indicador}-c{n}-v2.php
   - api/c{n}-microareas-by-equipe.php (genérico)
   - api/c{n}-pessoas-dados.php (customizar critérios)
   - api/c{n}-percentual.php (customizar scoring)

4. Testar:
   - Elegibilidade com temp_debug_counts.php
   - Carregamento de 200+ pessoas
   • Aba Percentual com dados por equipe

─────────────────────────────────────────────────────────────────────────────
8. REFERÊNCIAS & NOTAS
─────────────────────────────────────────────────────────────────────────────

Nota Metodológica C5:
  • Fonte: Protocolo eSUS-AB Hipertensão
  • Critérios: A (consulta), B (PA), C (peso/altura), D (visitas)
  • Pontuação: 25 por critério (100 máximo)
  • Período: 6 ou 12 meses conforme critério

Tabelas eSUS Core:
  • tb_fat_atd_ind_problemas (elegibilidade por CID/CIAP)
  • tb_fat_atendimento_individual (consultas, PA, peso/altura)
  • tb_fat_atd_ind_procedimentos (PA por procedimento, antropometria)
  • tb_fat_visita_domiciliar (ACS home visits)
  • tb_cidadao (pessoa master, microarea, st_ativo)
  • tb_equipe (9 equipes em Qualisus)
  • tb_dim_{cid,ciap,cbo,procedimento,tempo,equipe,unidade_saude}

PostgreSQL DISTINCT ON:
  • Mais eficiente que GROUP BY para pegar 1 registro por CNS
  • Requer ORDER BY primeiro, depois DISTINCT ON coluna
  • Exemplo: DISTINCT ON (TRIM(p.nu_cns)) ORDER BY TRIM(p.nu_cns), p.co_dim_tempo DESC

─────────────────────────────────────────────────────────────────────────────
Fim da documentação. Mantenha este arquivo como referência para expansão C5.
─────────────────────────────────────────────────────────────────────────────
