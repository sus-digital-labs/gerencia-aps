# Auditoria do Denominador C3 — 2026-05-24

**Indicador**: C3 — Cuidado na Gestação e Puerpério (Saúde Brasil 360)  
**PEC auditado**: PostgreSQL 9.6.13, Barra do Choça (BA), porta 5433, DB esus  
**Período avaliado**: 2025-05-01 a 2026-04-30 (12 meses)  
**Script de auditoria**: `scripts/14-shared/audit-denominador-c3.mjs`
**Resultados brutos**: `scripts/audit-denominador-c3-results.json`  

---

## 1. Resumo Executivo

O smoke anterior reportou **C3 = 43.892/1.935.400 pts ≈ 2,27%** para INE `0000181447`.  
Este resultado estava **incorreto por dois motivos confirmados**:

| Bug | Descrição | Impacto |
|-----|-----------|---------|
| **B1 (Sentinel DUM)** | `co_dim_tempo_dum = 30001231` (ano 3000) é placeholder do PEC — aceito pelo filtro `> 0` | Denominador inflado com gestantes fantasma que sempre pontuam 0, deprimindo o % artificialmente |
| **B2 (equipeId ausente)** | Smoke passou `ine='0000181447'` mas omitiu `equipeId`. `normalizeDimFilter(undefined) = null` → sem filtro `co_dim_equipe_vinc` | Denominador = município inteiro (19.354) em vez da equipe (1.555) |

Status correto: **`PARTIAL_RUNTIME_VALIDATED_RULE_REVIEW_REQUIRED`** até re-smoke com as correções.

---

## 2. Dados Brutos da Auditoria

### 2.1 Fluxo do Denominador

| Filtro | Contagem |
|--------|----------|
| Linhas brutas com DUM > 0 no período | 97.426 |
| Pacientes únicos com DUM > 0 | 21.846 |
| Com vínculo de equipe + vivos + não deletados | **19.354** ← denominador do smoke anterior |

### 2.2 DUM Sentinel — Bug B1

| Valor DUM | Ocorrências | Classificação |
|-----------|-------------|---------------|
| `30001231` | **94.959** | Sentinela inválida (ano 3000) |
| `20250902` | 32 | DUM real (2025) |
| `20250805` | 23 | DUM real (2025) |
| ... | ≤ 21 | DUM real |

**Interpretação**: 94.959 de 97.426 linhas (97,5%) contêm o sentinela. As 2.467 linhas restantes têm DUM reais. O sentinela `30001231` é o valor padrão que o PEC grava quando a DUM não é conhecida — equivalente a NULL semântico, mas não NULL estrutural.

**Consequência**: Gestantes com DUM = sentinela eram incluídas no denominador, mas a DUM parsed resulta em `new Date('3000-12-31')`. O intervalo de avaliação das BPs (gestacaoEndKey, puerperioEndKey etc.) fica no ano 3000-3001, portanto nenhum atendimento real é encontrado → score = 0 para todas as BPs → numerador não aumenta, denominador aumenta.

### 2.3 Distribuição por Equipe — Bug B2

| co_dim_equipe_vinc | co_seq_dim_equipe (INE) | Gestantes (com sentinela) |
|--------------------|--------------------------|--------------------------|
| 13 | 0000181498 (USF OURO VERDE, tipo 70/eSF) | 2.384 |
| 7 | 0000181528 (USF PEDRO SANTINO, tipo 70/eSF) | 2.178 |
| 6 | 0000181439 (USF BARRA NOVA, tipo 70/eSF) | 2.011 |
| 15 | 0000181579 (USF PRIMAVERA, tipo 70/eSF) | 1.815 |
| 17 | 0000181544 (USF ALTO DA BARRA, tipo 70/eSF) | 1.700 |
| 16 | 0000181455 (USF DO CENTRO, tipo 70/eSF) | 1.571 |
| **4** | **0000181447 (USF REGIAO DE BARRA NOVA, eSF)** | **1.555** |
| 19 | 0000181560 (USF BOM RETIRO, tipo 70/eSF) | 1.509 |
| 2 | 0000181471 (USF CAFEZAL, tipo 70/eSF) | 1.289 |
| 8 | 0000181463 (USF DE SANTO ANTONIO, tipo 70/eSF) | 1.244 |
| 5 | 0000181536 (USF PAU BRASIL, tipo 70/eSF) | 1.236 |
| 3 | 0000181501 (USF DE SOSSEGO, tipo 70/eSF) | 850 |
| ... | ESB/EMULTI | ≤ 4 |
| **Total município** | | **19.354** |

**Mapeamento INE → equipeId**:  
`tb_dim_equipe.nu_ine = '0000181447'` → `co_seq_dim_equipe = 4`  
`tb_fat_cidadao_pec.co_dim_equipe_vinc = 4` → 1.555 gestantes (com sentinela)

### 2.4 Múltiplas DUM por Paciente

| Métrica | Valor |
|---------|-------|
| Pacientes com múltiplas DUM distintas | 1.547 |
| Média de DUM por paciente (multi) | 2,39 |
| Máximo de DUM distintas por paciente | 10 |

**Interpretação**: A maioria das "múltiplas DUM" reflete a mistura de sentinela (`30001231`) + DUM real para o mesmo paciente. Com a correção do sentinela, a contagem de múltiplas DUM reais cai substancialmente.

**Estratégia adotada**: `GROUP BY + MIN(co_dim_tempo_dum)` — pega a DUM mais antiga válida por paciente. Gestantes com mais de uma gestação real no período são contadas uma vez (primeira gestação).

### 2.5 Outros Dados Relevantes

| Verificação | Resultado |
|-------------|-----------|
| Pacientes com CID/CIAP de gestação (O*, W7x-W9x) | 915 de 21.846 (4,2%) |
| Pacientes com apenas DUM (sem CID/CIAP gestação) | 21.651 |
| Óbitos entre as gestantes | 112 |
| Deletados | 0 |
| Sem equipe vinculada | 2.492 (excluídos corretamente) |
| Abortos registrados (CID/CIAP) | 50 |
| Atendimentos puerperais sem nova DUM | 0 (sem risco de duplicação) |

---

## 3. Bugs Confirmados e Correções Aplicadas

### Bug B1: DUM Sentinel `30001231`

**Arquivo**: `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c3.ts`

**Antes**:
```sql
AND a.co_dim_tempo_dum > 0
```

**Depois** (em `denomSql`):
```sql
AND a.co_dim_tempo_dum > 0
AND a.co_dim_tempo_dum < 20300101
```

**Defesa adicional** (no loop de scoring):
```typescript
if (dumKeyRaw >= 20300101) {
  warnings.push(`SENTINEL_DUM_SKIPPED: co_fat_cidadao_pec=${cidadaoId} dum=${dumKeyRaw}`);
  continue;
}
```

### Bug B2: Deduplicação não-determinística

**Antes**:
```sql
SELECT DISTINCT c.co_seq_fat_cidadao_pec AS co_fat_cidadao_pec,
       a.co_dim_tempo_dum
  FROM ...
ORDER BY c.co_seq_fat_cidadao_pec
```
Mais deduplicação em JS (pegava "primeiro" por inserção — não determinístico quando ORDER BY não inclui `co_dim_tempo_dum`).

**Depois**:
```sql
SELECT c.co_seq_fat_cidadao_pec AS co_fat_cidadao_pec,
       MIN(a.co_dim_tempo_dum)::int AS co_dim_tempo_dum
  FROM ...
GROUP BY c.co_seq_fat_cidadao_pec
ORDER BY c.co_seq_fat_cidadao_pec
```
Um registro por paciente, DUM mínima (mais antiga) válida.

### Bug B3: equipeId não resolvido no smoke

**Arquivo**: `scripts/smoke-c2-c3-calc.ts`

Adicionado lookup de `co_seq_dim_equipe` via `tb_dim_equipe.nu_ine = ineEsf` antes de chamar os indicadores. O valor resolvido é passado como `equipeId` no input.

**Resolução confirmada**: INE `0000181447` → `equipeId = 4`.

---

## 4. Impacto Esperado das Correções

| Métrica | Antes (smoke errado) | Depois (esperado) |
|---------|---------------------|-------------------|
| Denominador | 19.354 gestantes (município) | ~1.555 → esperado cair com filtro sentinela |
| equipeId aplicado | Não | Sim (equipeId=4) |
| Sentinela filtrado | Não | Sim (< 20300101) |
| Deduplicação | Não-determinística | MIN(DUM) por paciente |
| Tempo de execução (507s) | Para 19.354 gestantes | Estimativa: ~40-80s para ~1.555 |

O denominador real para INE `0000181447` após filtro de sentinela é desconhecido até re-smoke — será menor que 1.555.

---

## 5. Observações Metodológicas

### 5.1 Gestantes com apenas DUM (sem CID/CIAP de gestação)
915 de 21.846 têm CID/CIAP de gestação. Os 21.651 restantes têm apenas DUM registrada.  
**Decisão**: O indicador C3 oficial usa `co_dim_tempo_dum > 0` como critério de inclusão — não exige CID/CIAP. Isso está alinhado com a Nota Metodológica SAPS. Manter.

### 5.2 Abortos (50 pacientes)
O código já exclui gestantes com CID O02-O06/Z303 e CIAP W82/W83 no loop de scoring (`evalAbortoMem`). Esses 50 não contribuem para o numerador.

### 5.3 Múltiplas DUM legítimas
Uma mulher pode ter tido 2 gestações no período de 12 meses. A estratégia MIN(DUM) conta essa mulher como 1 gestante com sua primeira gestação. Isso subestima ligeiramente a cobertura se ela recebeu bom cuidado na segunda gestação mas não na primeira — risco aceitável e alinhado com a definição do denominador que é "gestantes vinculadas", não "gestações".

---

## 6. Próximos Passos

1. **[FEITO]** Correções aplicadas em `indicador-c3.ts` (sentinel + GROUP BY + MIN)
2. **[FEITO]** `smoke-c2-c3-calc.ts` agora resolve e passa `equipeId`
3. **[PENDENTE]** Re-smoke com as correções: `node_modules/.bin/tsx scripts/smoke-c2-c3-calc.ts`
4. **[PENDENTE]** Auditoria denominador C2 (análogo a esta)
5. **[PENDENTE]** Validação API/tRPC via HTTP (porta 3005)

---

## 7. Rastreabilidade

| Artefato | Status |
|----------|--------|
| `scripts/14-shared/audit-denominador-c3.mjs` | Executado 2026-05-24T10:11:58Z |
| `scripts/audit-denominador-c3-results.json` | Gerado — dados fonte deste relatório |
| `indicador-c3.ts` — sentinela | Corrigido 2026-05-24 |
| `indicador-c3.ts` — GROUP BY MIN | Corrigido 2026-05-24 |
| `indicador-c3.ts` — sentinel guard no loop | Adicionado 2026-05-24 |
| `smoke-c2-c3-calc.ts` — equipeId lookup | Corrigido 2026-05-24 |
| Typecheck pós-correção | PASS (0 erros) |

---

*Relatório gerado pelo processo de auditoria — 2026-05-24*  
*Status do indicador C3: `PARTIAL_RUNTIME_VALIDATED_RULE_REVIEW_REQUIRED`*
