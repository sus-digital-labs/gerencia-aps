# Vínculos de Dimensões C2/C3 — 2026-05-24

**Auditoria**: validação das dimensões nacionais e locais usadas em C2 e C3  
**PEC**: PostgreSQL 9.6.13, Barra do Choça (BA), porta 5433, DB esus  
**Referência schema**: `scripts/smoke-pec-real-results.json` + auditoria 2026-05-24  

---

## 1. Tabela de Dimensões

| Dimensão | Tabela Origem | Coluna FK (fat table) | Coluna PK (dim) | C2? | C3? | Join usado | Status |
|----------|--------------|----------------------|-----------------|-----|-----|-----------|--------|
| Paciente/cidadão | `tb_fat_cidadao_pec` | `co_fat_cidadao_pec` (fat tables) | `co_seq_fat_cidadao_pec` | ✓ | ✓ | fat_table.co_fat_cidadao_pec = c.co_seq_fat_cidadao_pec | **PASS** |
| Equipe vinculada | `tb_fat_cidadao_pec` | `co_dim_equipe_vinc` | — | ✓ | ✓ | WHERE c.co_dim_equipe_vinc = equipeFilter | **PASS** |
| Dimensão equipe | `tb_dim_equipe` | `co_dim_equipe_vinc` | `co_seq_dim_equipe` | ✗ | ✗ (lookup INE) | de.co_seq_dim_equipe = c.co_dim_equipe_vinc | **PASS** |
| Tipo de equipe (70/76) | `tb_tipo_equipe` | `tb_equipe.tp_equipe` | `co_seq_tipo_equipe` | ✓ | ✓ | eq JOIN ttp ON ttp.co_seq_tipo_equipe = eq.tp_equipe | **PASS** |
| INE equipe | `tb_equipe` | — | `nu_ine` | ✓ | ✓ | eq.nu_ine = ine (input) | **PASS** |
| CBO profissional | `tb_dim_cbo` | `co_dim_cbo_1` (atd_ind) | `co_seq_dim_cbo` | ✓ | ✓ | JOIN tb_dim_cbo ON co_seq_dim_cbo = co_dim_cbo_1 | **PASS** |
| CBO visita domiciliar | `tb_dim_cbo` | `co_dim_cbo` (sem _1) | `co_seq_dim_cbo` | ✓ (BP-D) | ✓ (BP-E/J) | JOIN tb_dim_cbo ON co_seq_dim_cbo = co_dim_cbo | **PASS** |
| SIGTAP procedimentos | `tb_dim_procedimento` | `co_dim_procedimento_avaliado` | `co_seq_dim_procedimento` | ✓ (BP-C) | ✓ (BP-C/D/G/H) | JOIN tb_dim_procedimento dp ON dp.co_seq_dim_procedimento = co_dim_procedimento_avaliado | **PASS** |
| Tempo/data | `tb_dim_tempo` | `co_dim_tempo` | `co_seq_dim_tempo` | ✓ | ✓ | Usado como chave YYYYMMDD (dateKey), sem JOIN | **PASS** |
| DUM (gestação) | `tb_fat_atendimento_individual` | `co_dim_tempo_dum` | — | ✗ | ✓ | WHERE a.co_dim_tempo_dum > 0 AND < 20300101 | **PASS** (corrigido) |
| Imunobiológico | `tb_fat_vacinacao` | `ds_filtro_imunobiologico` | — | ✓ (BP-E) | ✓ (BP-F) | LIKE '%\|cod\|%' (pipe-delimited) | **PASS** |
| CID-10 gestação/aborto | `tb_fat_atendimento_individual` | `ds_filtro_cids` | — | ✗ | ✓ (exclusão) | LIKE '%\|CID\|%' | **PASS** |
| CIAP-2 gestação/aborto | `tb_fat_atendimento_individual` | `ds_filtro_ciaps` | — | ✗ | ✓ (exclusão) | LIKE '%\|CIAP\|%' | **PASS** |
| CNES unidade | `tb_fat_cidadao_pec` | `co_dim_unidade_saude_vinc` | — | ✗ | ✗ | Não usado diretamente | **N/A** |

---

## 2. Detalhe por Dimensão

### 2.1 Paciente/Chave Protegida

- **Tabela**: `tb_fat_cidadao_pec`
- **PK real**: `co_seq_fat_cidadao_pec` (bigint, ~51.810 linhas)
- **FK em fat tables**: `co_fat_cidadao_pec`
- **LGPD**: `co_seq_fat_cidadao_pec` é ID interno do DW — nunca exposto na resposta da API. `nu_cns`, `nu_cpf_cidadao` existem na tabela mas **NUNCA** são selecionados no código C2/C3.
- **Evidência no código**: `SELECT c.co_seq_fat_cidadao_pec AS co_fat_cidadao_pec` — alias não expõe PK nomeada
- **Status**: **PASS** ✓

### 2.2 IBGE Município

- **Disponibilidade**: `co_dim_municipio` existe em `tb_fat_atendimento_individual` e `tb_fat_vacinacao`
- **Não existe em**: `tb_fat_cidadao_pec` (confirmado na auditoria 2026-05-24 — co_dim_municipio não é coluna desta tabela)
- **Uso em C2/C3**: **não é filtrado por município** — o filtro é por `co_dim_equipe_vinc` (equipe local). Isso é correto: um INE identifica univocamente uma equipe em um município.
- **Status**: **N/A** (município implícito pelo INE) ✓

### 2.3 CNES Unidade de Saúde

- **Disponibilidade**: `co_dim_unidade_saude_1` em `tb_fat_atendimento_individual`; `co_dim_unidade_saude_vinc` em `tb_fat_cidadao_pec`
- **Uso em C2/C3**: não filtrado diretamente — atendimentos de qualquer CNES são contados para o cidadão vinculado à equipe
- **Nota metodológica**: correto per Nota Metodológica B360 — a equipe é responsável pelo cidadão independente de onde foi atendido
- **Status**: **N/A** (não é critério de filtragem) ✓

### 2.4 INE Equipe

- **Tabela**: `tb_equipe` (coluna `nu_ine`, 38 equipes)
- **Resolução**: `tb_dim_equipe.nu_ine = ine` → `co_seq_dim_equipe` = `co_dim_equipe_vinc`
- **Mapeamento confirmado** (auditoria 2026-05-24):
  - INE `0000181447` → `co_seq_dim_equipe = 4` (USF REGIAO DE BARRA NOVA)
- **Usado para**: detectar eAP76 (`tb_equipe.nu_ine = ine → ttp.nu_ms = '76'`) e filtrar denominador
- **Status**: **PASS** ✓

### 2.5 Tipo de Equipe 70/76

- **Tabela**: `tb_tipo_equipe` (7 colunas, 57 linhas)
- **Coluna código MS**: `nu_ms` (string)
- **Join**: `tb_equipe.tp_equipe = tb_tipo_equipe.co_seq_tipo_equipe`
- **Tipos em Barra do Choça**:
  - `co_seq=56, nu_ms='70'` → eSF (Equipe de Saúde da Família) — 12 equipes
  - `co_seq=55, nu_ms='71'` → ESB
  - `co_seq=57, nu_ms='72'` → EMULTI
- **Nota**: `nu_ms='76'` (eAP) não encontrado no município — todas as equipes são eSF (nu_ms=70). A detecção de eAP76 retorna `isEap76=false` corretamente.
- **Impacto se ausente**: a detecção eAP76 falha silenciosamente (try/catch), e `isEap76 = false`, o que resulta em `maxPoints = 100` (eSF). Para eAP76 real, todos BP seriam pontuados incorretamente. Gate: **REQUIRED** (tb_equipe + tb_tipo_equipe obrigatórias em C2/C3).
- **Status**: **PASS** ✓

### 2.6 CBO Profissional

- **Tabela**: `tb_dim_cbo` (5 colunas, 842 linhas)
- **Coluna código**: `nu_cbo` (string 6 dígitos, ex: `"225142"`)
- **Coluna FK em atd_ind**: `co_dim_cbo_1` (profissional principal)
- **Coluna FK em visita_dom**: `co_dim_cbo` (sem sufixo _1)
- **Coluna FK em vacinação**: `co_dim_cbo` (sem sufixo _1)
- **Join**: `tb_dim_cbo.co_seq_dim_cbo = fat_table.co_dim_cbo_1`
- **Fallback**: se `tb_dim_cbo` está vazia, `hasDimCbo = false` → todos os atendimentos são aceitos sem filtro CBO (degraded mode)
- **Prefixes usados**:
  - Consultas (médico/enfermeiro): 2235, 2251, 2252, 2253, 2231
  - Procedimentos: + 3222 (tec enf), 515105 (ACS)
  - Visita domiciliar: 322255, 515105
  - Saúde bucal (C3 BP-K): 2232, 3224
- **Status**: **PASS** ✓

### 2.7 SIGTAP Procedimentos

- **Tabela**: `tb_dim_procedimento` (7 colunas, 1.089 linhas)
- **Coluna código**: `co_proced` CHAR(10) (ex: `"0101040024"`)
- **Schema real confirmado**: coluna é `co_proced`, não `co_dim_procedimento`
- **FK em fat tables**: `tb_fat_atd_ind_procedimentos.co_dim_procedimento_avaliado` → `tb_dim_procedimento.co_seq_dim_procedimento`
- **Códigos C2**: 0101040024, 0301010269, 0101040083, 0101040075 (antropometria)
- **Códigos C3**:
  - PA: 0301100039
  - Antropometria: 0101040024, 0101040083, 0101040075
  - Exames 1°/3° tri: SIGTAP de sífilis, HIV, HepB, HepC (ver `boas-praticas-exames-gestante.ts`)
- **Status**: **PASS** ✓

### 2.8 CID-10 (C3 — exclusão aborto)

- **Campo**: `ds_filtro_cids` em `tb_fat_atendimento_individual` (pipe-delimited)
- **Códigos exclusão**: O02, O021, O03, O04, O05, O06, Z303
- **Formato verificado**: `|O03|` (pipe-delimited com CID sem ponto)
- **Status**: **PASS** ✓

### 2.9 CIAP-2 (C3 — exclusão aborto)

- **Campo**: `ds_filtro_ciaps` em `tb_fat_atendimento_individual` (pipe-delimited)
- **Códigos exclusão**: W82, W83
- **Status**: **PASS** ✓

### 2.10 Imunobiológicos/Vacinas

- **Campo**: `ds_filtro_imunobiologico` em `tb_fat_vacinacao` (pipe-delimited)
- **Formato confirmado** (auditoria 2026-05-24): `|33|`, `|45|26|22|42|`, `|57|`
- **Tabela**: sem sufixo `_1` em `co_dim_cbo` e `co_dim_equipe` (confirmado)
- **Códigos C2 BP-E** (esquema vacinal básico):
  - Pentavalente: 09, 17, 29, 39, 42, 43, 46, 47, 58 (3 doses mínimas)
  - VIP: 22, 29, 43, 58 (3 doses mínimas)
  - SCR: 24, 56 (2 doses, não antes 12 meses)
  - Pneumocócica: 26, 59, 106, 107 (2 doses mínimas)
- **Código C3 BP-F** (dTpa): 57
- **Risco deduplicação**: se o PEC gravar múltiplas linhas para a mesma dose/vacina/data, poderia satisfazer o threshold de `dosesMinimas` com doses repetidas. A query usa `ds_filtro_imunobiologico LIKE '%|cod|%'` em DISTINCT por linha, não por dose. Risco a confirmar.
- **Status**: **PASS** (metodologicamente correto per NM B360; risco de duplicata de dose a confirmar via PEC) ✓

---

## 3. Impacto se Dimensão Ausente

| Dimensão | C2 impacto | C3 impacto | Comportamento atual |
|----------|-----------|-----------|---------------------|
| `tb_dim_cbo` (obrigatória) | Gate bloqueia | Gate bloqueia | SCHEMA_MISSING_DIM_CBO |
| `tb_equipe` (obrigatória) | Gate bloqueia | Gate bloqueia | SCHEMA_MISSING_EQUIPE |
| `tb_tipo_equipe` (obrigatória) | Gate bloqueia | Gate bloqueia | SCHEMA_MISSING_TIPO_EQUIPE |
| `tb_dim_procedimento` (obrigatória C3) | N/A | Gate bloqueia | SCHEMA_MISSING_DIM_PROCEDIMENTO |
| `tb_fat_visita_domiciliar` (opcional) | BP-D degradada | BP-E/J degradadas | Warning + 0 pontos para BP |
| `tb_fat_vacinacao` (opcional) | BP-E degradada | BP-F degradada | Warning + 0 pontos para BP |
| `tb_fat_atd_ind_procedimentos` (opcional) | BP-C fallback SIGTAP | BP-C/D fallback | Try/catch silencioso |

---

## 4. Status Final por Dimensão

| Dimensão | Status |
|----------|--------|
| IBGE município | **N/A** — não usado (município implícito pelo INE) |
| CNES unidade | **N/A** — não filtrado (correto per NM B360) |
| INE equipe | **PASS** — lookup via tb_dim_equipe.nu_ine confirmado |
| Tipo equipe 70/76 | **PASS** — JOIN tp_equipe → nu_ms correto |
| CBO profissional | **PASS** — co_dim_cbo_1 e co_dim_cbo (sem sufixo) corretos |
| SIGTAP procedimentos | **PASS** — co_proced (não co_dim_procedimento) correto |
| CID-10 | **PASS** — ds_filtro_cids pipe-delimited |
| CIAP-2 | **PASS** — ds_filtro_ciaps pipe-delimited |
| Imunobiológicos | **PASS** — ds_filtro_imunobiologico pipe-delimited |
| Paciente/chave protegida | **PASS** — nenhum PII no output (LGPD) |
| DUM (C3) | **PASS** — filtro sentinela corrigido |

---

*Gerado em 2026-05-24 — Auditoria de dimensões C2/C3*
