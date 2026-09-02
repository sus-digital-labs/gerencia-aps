# Performance C3 — Batch Loading 2026-05-24

**Fase 7 do mandato de auditoria**  
**Problema original**: 507 segundos para 19.354 gestantes (N+1 queries)  
**Solução implementada**: batch loading em 7 queries paralelas  
**Status**: BATCH_IMPLEMENTED — aguarda re-smoke para confirmar tempo real  

---

## 1. Problema Original (N+1)

A implementação original de C3 fazia 5-11 queries por gestante:

```
Para cada gestante (até 19.354):
  - checkAbortoExclusion()     → 1 query
  - evaluateBpA()              → 1 query
  - evaluateBpB()              → 1 query
  - evaluateBpC()              → 1-2 queries (PA + SIGTAP fallback)
  - evaluateBpD()              → 1-2 queries (peso/altura + SIGTAP)
  - evaluateBpE()              → 2 queries (firstPrenatal + visita)
  - evaluateBpF()              → 1 query (vacinação)
  - evaluateBpG()              → 4 queries (sifilis + HIV + HepB + HepC)
  - evaluateBpH()              → 2 queries (sifilis + HIV 3°tri)
  - evaluateBpI()              → 1 query (puerpério)
  - evaluateBpJ()              → 1 query (visita puerperal)
  - evaluateBpK()              → 1-2 queries (odonto + atd_ind fallback)
```

**Total estimado**: ~15 queries por gestante × 19.354 gestantes ≈ **290.310 queries**  
**Tempo**: 507 segundos = ~0,26ms por query (muito otimizado por query, mas N+1 é o gargalo)

---

## 2. Solução Implementada (Batch Loading)

### Arquitetura

```
buildBatchCtx(pool, cidadaoIds, minDateKey, maxDateKey)
  ├── 1 query: tb_dim_cbo (todo o dicionário CBO)
  └── Promise.all([
      ├── 1 query: tb_fat_atendimento_individual WHERE co_fat_cidadao_pec = ANY($ids)
      ├── 1 query: tb_fat_visita_domiciliar WHERE co_fat_cidadao_pec = ANY($ids)
      ├── 1 query: tb_fat_vacinacao WHERE co_fat_cidadao_pec = ANY($ids)
      ├── 1 query: tb_fat_atendimento_odonto WHERE co_fat_cidadao_pec = ANY($ids)
      ├── 1 query: tb_fat_atd_ind_exames JOIN tb_dim_procedimento WHERE ids AND sigtap
      └── 1 query: tb_fat_atd_ind_procedimentos JOIN tb_dim_procedimento WHERE ids AND sigtap
  ])
```

**Total de queries**: 7 (independente do número de gestantes)  
**Todas as avaliações de BP**: em memória (funções síncronas)

### Código — `buildBatchCtx`

Arquivo: `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts`, linha ~400

Carrega todos os dados relevantes para todas as gestantes em 7 queries paralelas e organiza em `Map<cidadaoId, linhas[]>`.

### Avaliação em Memória

Funções `eval*Mem` (ex: `evalBpAMem`, `evalBpBMem`) operam sobre os dados em memória:
- Sem nenhuma query adicional no loop
- Filtros de data/CBO aplicados em JavaScript sobre arrays
- `matchesCbo()` consulta o `Map<co_seq_dim_cbo, nu_cbo>` pré-carregado

---

## 3. Análise de Complexidade

| Abordagem | Queries | Complexidade |
|-----------|---------|--------------|
| Original (N+1) | ~15 × N | O(N) queries |
| Batch loading | 7 (constante) | O(1) queries |
| Memória batch | N × linhas/cidadão | O(M) memória |

**Onde M = total de linhas retornadas** (todas as fat tables para todos os cidadãos no período)

---

## 4. Estimativa de Tempo com Correções

### Cenário por equipe (INE 0000181447, equipeId=4)

Com as correções de 2026-05-24:
- Denominador: ~1.555 gestantes (antes: 19.354 sem equipeId)
- Após filtro sentinela DUM: estimado ~400-600 gestantes com DUM real

**Estimativa de tempo** (com batch loading):
- 7 queries em paralelo: ~500ms-2s cada (PostgreSQL 9.6, tabelas grandes)
- Processamento em memória: proporcional ao volume de dados carregado
- Total estimado: **5-30 segundos** (vs 507 segundos anterior)

**Nota**: O volume de dados retornado pelo `ANY($ids)` com 400-600 cidadãos de `tb_fat_atendimento_individual` (457K linhas total) ainda pode ser significativo. O índice em `co_fat_cidadao_pec` é crítico para performance.

---

## 5. Verificação de Índices

**Recomendado verificar no PEC**:
```sql
-- Verificar índices em tb_fat_atendimento_individual
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tb_fat_atendimento_individual'
  AND indexdef LIKE '%co_fat_cidadao_pec%';
```

Se não houver índice em `co_fat_cidadao_pec`, a query `WHERE co_fat_cidadao_pec = ANY($ids)` fará seq scan em 457K linhas, o que pode ser lento. O PostgreSQL 9.6 pode fazer bitmap index scan se o índice existir.

---

## 6. Limites de Memória

Com batch de 400-600 cidadãos e ~457K linhas totais, a proporção esperada:
- `tb_fat_atendimento_individual`: ~400-600 cidadãos × ~média 30 atendimentos = ~15-20K linhas
- `tb_fat_vacinacao`: similar proporção
- Total em memória: estimado ~50K objetos JS = ~10-20MB RAM

**Dentro de limites aceitáveis** para instância de produção.

---

## 7. Risco Residual

| Risco | Mitigação |
|-------|-----------|
| Seq scan em `tb_fat_atendimento_individual` sem índice | Verificar/criar índice em `co_fat_cidadao_pec` |
| Batch muito grande (município inteiro ~19K gestantes) | Garantir `equipeId` filtrado antes de chamar o indicador |
| Memória alta se cidadaoIds muito grande | Paginação ou sub-batch (futuro) |
| `ANY($ids::bigint[])` com array grande (>10K) | PostgreSQL 9.6 tem limitações com arrays muito grandes |

---

## 8. Status

| Métrica | Antes | Depois | Verificação |
|---------|-------|--------|-------------|
| Queries por cálculo | ~290.310 (N+1) | 7 (batch) | Código revisado |
| Tempo estimado (19K gestantes) | 507s | ~60-120s | PENDENTE re-smoke |
| Tempo estimado (1.5K gestantes) | ~40s | ~5-30s | PENDENTE re-smoke |
| N+1 eliminado | ✗ | ✓ | Código confirma |

**Status**: `BATCH_IMPLEMENTED_PENDING_REVALIDATION`  
A otimização está no código (commit 8c5599d e iterações anteriores). Re-smoke com equipeId correto é necessário para confirmar performance real.

---

## 9. Próximas Ações de Performance

1. **URGENTE**: Re-smoke com `equipeId=4` após GRANT de permissões → medir tempo real
2. **VERIFICAR**: Existência de índice em `co_fat_cidadao_pec` nas fat tables
3. **MONITORAR**: Tempo de resposta API C3 em produção (target: < 60s para 1.500 gestantes)
4. **FUTURO**: Sub-batch se volume por equipe exceder 5.000 gestantes

---

*Performance audit — 2026-05-24*  
*Bloqueio de performance original (507s): resolvido em código (batch loading)*
