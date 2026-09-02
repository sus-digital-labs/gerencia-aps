# Plano de Migracao — Registry Nacional Versionado

> Versao: 1.0 | Data: 2026-05-23 | Status: PLANEJADO

## 1. Objetivo

Criar um registry nacional versionado que serve como fonte autoritativa de dimensoes para o calculo de indicadores. Hoje, os indicadores C2/C3 dependem exclusivamente das tabelas tb_dim_* do PEC DW local. O registry nacional permite:

1. Validar se os codigos locais (CBO, SIGTAP, CNES) existem no padrao nacional
2. Versionar por competencia (mensal ou anual)
3. Operar mesmo quando o PEC DW tem dimensoes ausentes (replica simplificada)
4. Cross-validate entre municipios de um mesmo parceiro

## 2. Dimensoes do Registry

### 2.1 Tabelas e Fontes

| Dimensao | Chave Primaria | Fonte Publica | Formato | Frequencia |
|----------|---------------|---------------|---------|------------|
| dim_municipality_ibge | ibge_code CHAR(7) | IBGE API | JSON | Anual |
| dim_cnes_health_unit | cnes CHAR(7) | CNES/DATASUS FTP | CSV/DBF | Mensal |
| dim_cbo | cbo_code CHAR(6), version | CBO-S MTE | CSV | Eventual |
| dim_cid10 | cid_code VARCHAR(6), version | DATASUS | CSV/DBF | Eventual |
| dim_ciap2 | ciap_code VARCHAR(6), version | DATASUS | CSV | Eventual |
| dim_sigtap | sigtap_code CHAR(10), competence CHAR(7) | SIGTAP/DATASUS | TXT/ZIP mensal | Mensal |
| dim_immunobiological | ms_code VARCHAR(3) | PNI/SIPNI | Manual | Eventual |
| dim_team_type | type_code INT | SAPS/MS portarias | Manual | Eventual |
| dim_competence_calendar | competence CHAR(7) | Gerado | — | Automatico |

### 2.2 Schema DDL (PostgreSQL)

```sql
-- Schema dedicado para registry nacional
CREATE SCHEMA IF NOT EXISTS registry;

-- Municipios IBGE
CREATE TABLE registry.dim_municipality_ibge (
  ibge_code    CHAR(7) PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  uf           CHAR(2) NOT NULL,
  mesoregion   VARCHAR(60),
  microregion  VARCHAR(60),
  population   INT,
  version_year INT NOT NULL DEFAULT 2024,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Unidades de saude CNES
CREATE TABLE registry.dim_cnes_health_unit (
  cnes           CHAR(7) PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  ibge_code      CHAR(7) NOT NULL REFERENCES registry.dim_municipality_ibge(ibge_code),
  unit_type_code INT,
  unit_type_name VARCHAR(80),
  is_active      BOOLEAN DEFAULT TRUE,
  competence     CHAR(7) NOT NULL, -- YYYY-MM da carga
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- CBO-S
CREATE TABLE registry.dim_cbo (
  cbo_code    CHAR(6) NOT NULL,
  version     VARCHAR(10) NOT NULL DEFAULT '2022',
  title       VARCHAR(200) NOT NULL,
  family_code CHAR(4),
  family_name VARCHAR(200),
  is_health   BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (cbo_code, version)
);

-- CID-10
CREATE TABLE registry.dim_cid10 (
  cid_code    VARCHAR(6) NOT NULL,
  version     VARCHAR(10) NOT NULL DEFAULT '10',
  description VARCHAR(300) NOT NULL,
  chapter     VARCHAR(10),
  group_code  VARCHAR(10),
  PRIMARY KEY (cid_code, version)
);

-- CIAP-2
CREATE TABLE registry.dim_ciap2 (
  ciap_code   VARCHAR(6) NOT NULL,
  version     VARCHAR(10) NOT NULL DEFAULT '2',
  description VARCHAR(300) NOT NULL,
  chapter     VARCHAR(10),
  PRIMARY KEY (ciap_code, version)
);

-- SIGTAP (versionado por competencia)
CREATE TABLE registry.dim_sigtap (
  sigtap_code  CHAR(10) NOT NULL,
  competence   CHAR(7) NOT NULL,  -- YYYY-MM
  description  VARCHAR(300) NOT NULL,
  modality     VARCHAR(10),
  instrument   VARCHAR(10),
  is_active    BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (sigtap_code, competence)
);

-- Imunobiologicos
CREATE TABLE registry.dim_immunobiological (
  ms_code     VARCHAR(3) NOT NULL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  abbreviation VARCHAR(20),
  is_calendar BOOLEAN DEFAULT FALSE, -- esta no calendario oficial PNI?
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de equipe
CREATE TABLE registry.dim_team_type (
  type_code INT PRIMARY KEY,
  name      VARCHAR(100) NOT NULL,
  category  VARCHAR(50),  -- 'esf', 'eap', 'esb', 'emulti', 'nasf', etc.
  is_aps    BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendario de competencias
CREATE TABLE registry.dim_competence_calendar (
  competence       CHAR(7) PRIMARY KEY,  -- YYYY-MM
  year             INT NOT NULL,
  month            INT NOT NULL,
  quadrimester     INT NOT NULL,          -- 1, 2 ou 3
  semester         INT NOT NULL,          -- 1 ou 2
  is_current       BOOLEAN DEFAULT FALSE,
  evaluation_start DATE,
  evaluation_end   DATE
);
```

## 3. Fases de Migracao

### Fase 0 — Gates de Dimensao (ATUAL — em implementacao)

**Escopo:** Adicionar verificacao de dimensoes obrigatorias em C2/C3 antes do calculo.

**Implementacao:**
- `checkTable()` ja existe em common.ts
- Adicionar `findMissingColumns()` para validar colunas especificas
- Retornar `blocked_by_schema` com errorCode quando dimensao critica estiver ausente
- Nao depende do registry nacional — usa apenas as tabelas locais do PEC DW

**Criterio de conclusao:** C2/C3 retornam `SCHEMA_MISSING_DIM_*` ao inves de resultado incorreto.

### Fase 1 — Registry Seed (MVP)

**Escopo:** Popular as dimensoes mais criticas para C2/C3.

**Prioridade:**
1. `dim_cbo` — necessaria para filtrar profissionais (todas as BPs)
2. `dim_sigtap` — necessaria para validar procedimentos (exames, antropometria, PA)
3. `dim_team_type` — necessaria para distinguir eSF vs eAP (pontuacao)
4. `dim_immunobiological` — necessaria para esquema vacinal C2 BP(E)

**Fonte de dados para seed:**
- CBO: extrair do PEC DW (tb_dim_cbo) + complementar com arquivo CBO-S do MTE
- SIGTAP: download da competencia corrente de ftp.datasus.gov.br/dissemin/pacotes/SIGTAP
- Team types: lista fixa extraida de portarias SAPS (70=eSF, 76=eAP, 72=eAPP, etc.)
- Imunobiologicos: lista fixa do PNI (os 80 codigos do calendario oficial)

**Entrega:** Script `scripts/registry-seed.mjs` que popula as 4 tabelas.

### Fase 2 — Validacao Cruzada

**Escopo:** Validar dados locais do PEC contra registry nacional.

**Implementacao:**
- Novo modulo `src/saude-brasil-360/registry/validator.ts`
- Funcao `validateLocalAgainstRegistry(pool, registryPool)` que:
  1. Lista CBOs usados em tb_fat_atendimento_individual.co_dim_cbo_1
  2. Verifica quais existem em registry.dim_cbo
  3. Reporta CBOs invalidos/descontinuados
  4. Repete para SIGTAP, INE/tipo equipe, CNES

**Entrega:** Report de divergencias sem bloquear calculo — apenas warnings.

### Fase 3 — Registry como Fallback

**Escopo:** Quando tb_dim_* local estiver ausente, usar registry nacional como fonte de dimensao.

**Implementacao:**
- Modificar `buildCboJoinClause` em C2/C3 para aceitar source alternativo
- Se `tb_dim_cbo` local MISSING → usar `registry.dim_cbo` como JOIN
- Se `tb_dim_procedimento` local MISSING → usar `registry.dim_sigtap` como JOIN

**Risco:** Registry pode nao ter a mesma granularidade que o PEC DW local (ex: versao de SIGTAP diferente da competencia do atendimento).

**Mitigacao:** Sempre logar quando fallback e ativado; incluir warning no resultado.

### Fase 4 — Atualizacao Automatica

**Escopo:** Manter registry atualizado automaticamente.

**Implementacao:**
- Scheduled task: download mensal SIGTAP + CNES
- Scheduled task: download anual IBGE + CBO
- Versionamento por competencia (nunca sobrescrever, sempre inserir nova versao)
- Cleanup de versoes > 24 meses

## 4. Impacto em C2/C3

### 4.1 Mudancas no Codigo

| Arquivo | Mudanca | Fase |
|---------|---------|------|
| common.ts | Adicionar `checkDimensionGate()` | 0 |
| indicador-c2.ts | Chamar gates antes do calculo | 0 |
| indicador-c3.ts | Chamar gates antes do calculo | 0 |
| types.ts | Novos errorCodes SCHEMA_MISSING_* | 0 |
| registry/validator.ts | Novo modulo de validacao | 2 |
| common.ts | Modificar buildCboJoinClause para aceitar registry | 3 |

### 4.2 Compatibilidade

- **Backward compatible:** nenhuma mudanca na interface B360IndicatorResult
- **Novos errorCodes:** adicionam informacao, nao quebram contratos existentes
- **Registry e opcional:** se nao existir, o sistema opera como hoje (SQL direto no PEC DW)

## 5. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| FTP DATASUS indisponivel | Media | Medio | Cache local + retry + fallback para ultima versao |
| Divergencia SIGTAP local vs nacional | Baixa | Alto | Validacao cruzada (Fase 2) antes de usar fallback |
| Performance JOIN cross-schema | Baixa | Baixo | Registry e pequeno (<500K registros total) |
| PEC DW muda schema em atualizacao | Media | Alto | pec-schema-discover.mjs detecta drift |
| Registry desatualizado | Media | Medio | Alerta quando ultima atualizacao > 60 dias |

## 6. Proximas 3 Acoes

1. **Implementar Fase 0** — Gates de dimensao em C2/C3 (esta sessao)
2. **Criar script seed** — `scripts/registry-seed.mjs` para dim_cbo + dim_sigtap + dim_team_type + dim_immunobiological
3. **Validar contra PEC real** — Conectar na porta 5433 quando servico estiver ativo e rodar discovery + gates
