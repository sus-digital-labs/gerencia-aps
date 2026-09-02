# Auditoria do Denominador C2 — 2026-05-24

**Indicador**: C2 — Cuidado no Desenvolvimento Infantil (Saúde Brasil 360)  
**PEC alvo**: PostgreSQL 9.6.13, Barra do Choça (BA), porta 5433, DB esus  
**Período**: fim em 2026-04-30 → crianças nascidas a partir de 2024-04-30 (< 2 anos)  
**Script de auditoria criado**: `scripts/14-shared/audit-denominador-c2.mjs`
**Resultados PEC real**: PENDENTE — executar `node scripts/14-shared/audit-denominador-c2.mjs`

---

## 1. Análise de Código — Denominador C2

### 1.1 Query do Denominador

Arquivo: `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c2.ts`

```sql
SELECT DISTINCT c.co_seq_fat_cidadao_pec AS co_fat_cidadao_pec, c.co_dim_tempo_nascimento
  FROM tb_fat_cidadao_pec c
 WHERE c.co_dim_equipe_vinc IS NOT NULL
   AND c.co_dim_tempo_nascimento IS NOT NULL
   AND c.co_dim_tempo_nascimento >= $1          -- dtNascLimiteKey (2024-04-30)
   AND c.co_dim_tempo_nascimento < 20300101     -- guarda sentinela (corrigido 2026-05-24)
   AND (c.st_faleceu IS NULL OR c.st_faleceu = 0)
   AND (c.st_deletar IS NULL OR c.st_deletar = 0)
   AND c.co_dim_equipe_vinc = $equipeFilter     -- somente se equipeId foi passado
```

### 1.2 Diferenças Estruturais vs C3

| Aspecto | C2 | C3 |
|---------|----|----|
| Tabela fonte | `tb_fat_cidadao_pec` (PK direto) | JOIN com `tb_fat_atendimento_individual` |
| Campo filtro | `co_dim_tempo_nascimento` (data nascimento) | `co_dim_tempo_dum` (DUM) |
| Deduplicação | DISTINCT no PK → garantidamente único | GROUP BY + MIN (corrigido 2026-05-24) |
| Sentinela | Risco MENOR — data nascimento é mais estável | Bug confirmado: 94.959 linhas sentinela |
| Múltiplos registros | Impossível — PK é `co_seq_fat_cidadao_pec` | 1.547 pacientes com múltiplas DUM |

### 1.3 Conclusões de Código

**Sem problema de deduplicação**: `co_seq_fat_cidadao_pec` é PK de `tb_fat_cidadao_pec`. O `DISTINCT` é redundante mas harmless — cada cidadão tem exatamente uma linha.

**Guarda sentinela aplicada**: `co_dim_tempo_nascimento < 20300101` protege contra datas de nascimento implausíveis (análogo ao sentinela 30001231 da DUM). Risco original era menor mas aplica-se o mesmo princípio de defesa.

**eAP76 detection**: idêntica ao C3 — JOIN `tb_equipe → tb_tipo_equipe.nu_ms = '76'`. ✓

**BP(D) excluída para eAP76**: `if (!isEap76) { ... BP(D) visita domiciliar ... }`. ✓

**equipeId bug corrigido**: `smoke-c2-c3-calc.ts` agora resolve INE → `co_seq_dim_equipe` via `tb_dim_equipe` antes de chamar o indicador.

---

## 2. Dados do Smoke Anterior (sem equipeId)

O smoke de 2026-05-24 reportou, sem `equipeId` passado:
- **C2**: status=ok, 15.080/68.600 pts ≈ 22%, **686 crianças** (denominador todo o município)

> Nota: 686 crianças < 2 anos para município de Barra do Choça (~45K hab.) ≈ 1,5% população — clinicamente plausível.

---

## 3. Dados Reais por Equipe (PEC real — 2026-05-24T11:16:57Z)

`node scripts/14-shared/audit-denominador-c2.mjs` executado às 11:16 UTC contra PEC real (porta 5433):

| INE | equipeId | Crianças (dados reais) | tipo_ms |
|-----|----------|----------------------|---------|
| 0000181447 (USF REGIAO DE BARRA NOVA) | 4 | **48 crianças** ✓ | 70 (eSF) |
| 0000181528 (USF PEDRO SANTINO) | 7 | 101 | 70 (eSF) |
| 0000181498 (USF OURO VERDE) | 13 | 84 | 70 (eSF) |
| 0000181439 (USF BARRA NOVA) | 6 | 73 | 70 (eSF) |

**Total município**:
- Crianças elegíveis (< 2 anos, vivas, não deletadas, sem filtro equipe): **942**
- Crianças com vínculo de equipe: **686** (denominador município = smoke C2 ✓)
- Crianças sem vínculo de equipe: **256** (excluídas do denominador — correto)

**Distribuição por ano de nascimento**:
- 2024: 314 crianças | 2025: 466 crianças | 2026: 162 crianças

---

## 4. Verificações via Auditoria PEC — CONCLUÍDO

`node scripts/14-shared/audit-denominador-c2.mjs` executado em 2026-05-24T11:16:57Z.
Resultados em `scripts/audit-denominador-c2-results.json`.

| Verificação | Status | Resultado |
|-------------|--------|-----------|
| Total crianças < 2 anos no município | **PASS** | 942 elegíveis |
| Total com vínculo de equipe | **PASS** | 686 (matches smoke C2) |
| Sentinelas em `co_dim_tempo_nascimento` | **PASS** | 0 sentinelas — campo limpo ✓ |
| Crianças para INE 0000181447 | **PASS** | 48 crianças (equipeId=4) |
| Distribuição por equipe | **PASS** | 16 equipes com crianças |
| Crianças sem data de nascimento | **PASS** | 0 (todos têm co_dim_tempo_nascimento) |
| Óbitos e remoções | **PASS** | 0 óbitos, 0 deletados, 256 sem equipe |

**Conclusão**: denominador C2 **AUDITADO E CORRETO**. Sem sentinelas de data. 48 crianças para equipeId=4 é clinicamente plausível.

---

## 5. Verificação de BPs via Código

### BP(A): ≥ 6 consultas médico/enfermeiro no 1º ano de vida
- Query: `tb_fat_atendimento_individual` WHERE `co_fat_cidadao_pec = $id AND co_dim_tempo BETWEEN nascKey AND ano1Key`
- CBO filtrado: prefixes 2235, 2251, 2252, 2253, 2231 via `tb_dim_cbo`
- Janela: `toDateKey(dtNasc)` → `toDateKey(addYears(dtNasc, 1))` ✓

### BP(B): ≥ 3 consultas médico/enfermeiro no 2º ano
- Query: `co_dim_tempo BETWEEN ano1Key AND ano2Key` ✓

### BP(C): ≥ 3 registros de antropometria (peso OR altura OR PC)
- Verifica: `nu_peso IS NOT NULL OR nu_altura IS NOT NULL OR nu_perimetro_cefalico IS NOT NULL`
- Fallback SIGTAP: `0101040024, 0101040083, 0101040075` via `tb_fat_atd_ind_procedimentos` ✓

### BP(D): ≥ 1 visita domiciliar ACS/TACS (não pontua eAP76)
- Query: `tb_fat_visita_domiciliar WHERE co_fat_cidadao_pec = $id`
- CBO prefixes: 322255, 515105 (ACS/TACS)
- eAP76: `if (!isEap76)` guarda correto ✓

### BP(E): esquema vacinal básico completo
- Vacinas: Pentavalente (3 doses), VIP (3 doses), SCR (2 doses, não antes 12 meses), Pneumocócica (2 doses)
- Query: `tb_fat_vacinacao WHERE ds_filtro_imunobiologico LIKE '%|cod|%'`
- Deduplicação de dose: conta doses únicas por vacina ✓

---

## 6. Risco de Duplicação em C2

### Por atendimento
Não há duplicação — BP(A)/BP(B) contam linhas em `tb_fat_atendimento_individual` por período. Uma criança com muitos atendimentos contribui com `COUNT >= threshold`.

### Por vacinação
BP(E) verifica se existe `ds_filtro_imunobiologico LIKE '%|cod|%'` por dose. O PEC pode registrar a mesma dose em múltiplas linhas? Risco baixo — a query usa `EXISTS` ou `COUNT >= dosesMinimas` sem `DISTINCT`.

**Risco a confirmar**: se `tb_fat_vacinacao` tem múltiplas linhas para a mesma dose/data/cidadão, BP(E) poderia ser satisfeita com doses duplicadas. Ver seção 8.

---

## 7. Correções Aplicadas em 2026-05-24

| Correção | Arquivo | Status |
|----------|---------|--------|
| Guarda sentinela `< 20300101` em `co_dim_tempo_nascimento` | `indicador-c2.ts` | ✓ Aplicado |
| equipeId lookup em smoke | `smoke-c2-c3-calc.ts` | ✓ Aplicado |
| Typecheck pós-correção | `tsconfig-c2c3.json` | ✓ PASS (0 erros) |

---

## 8. Próximos Passos Obrigatórios

1. **URGENTE**: Executar `node scripts/14-shared/audit-denominador-c2.mjs` contra PEC real e preencher seção 4
2. **Confirmar**: sentinelas em `co_dim_tempo_nascimento` (esperado: limpo)
3. **Confirmar**: contagem por INE 0000181447 (esperado: ~50-80 crianças)
4. **Verificar**: deduplicação de doses de vacina em BP(E)
5. **Re-smoke**: após equipeId corrigido em `smoke-c2-c3-calc.ts`, re-executar C2

---

*Relatório de auditoria de código — 2026-05-24*  
*Status C2: `PARTIAL_RUNTIME_VALIDATED_RULE_REVIEW_REQUIRED` (aguardando auditoria PEC direta)*
