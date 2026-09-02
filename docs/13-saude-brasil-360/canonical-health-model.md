# Modelo Canonico de Saude — Saude Brasil 360

> Versao: 1.0 | Data: 2026-05-23 | Status: CODE_COMPLETE_SCHEMA_MAPPED_VALIDATION_PENDING

## 1. Visao Geral — 3 Camadas

```
┌──────────────────────────────────────────────────────────┐
│                   INDICATOR ENGINE                        │
│  C2, C3, C4..C7, B1..B6, M1, M2, CVAT                  │
│  Consome canonical model + registry nacional              │
│  Retorna B360IndicatorResult auditavel                    │
├──────────────────────────────────────────────────────────┤
│              CANONICAL HEALTH MODEL                       │
│  Entidades normalizadas, sem PII                          │
│  partner → tenant_municipality → health_unit → health_team│
│  professional → patient → clinical_event                  │
├──────────────────────────────────────────────────────────┤
│               RAW SYNC LAYER                              │
│  PEC DW (tb_fat_*, tb_dim_*) via pec-agent-sync           │
│  Replica direta, sem transformacao                        │
└──────────────────────────────────────────────────────────┘
```

## 2. Camada 1 — Raw Sync Layer

Replica direta do Data Warehouse do PEC (e-SUS AB).

**Origem:** PostgreSQL do PEC (porta 5433 na instalacao local).

**Tabelas criticas para C2/C3:**

| Tabela | Tipo | Uso |
|--------|------|-----|
| tb_fat_atendimento_individual | fact | Atendimentos individuais (consultas, procedimentos) |
| tb_fat_atd_ind_exames | fact | Exames solicitados/avaliados por atendimento |
| tb_fat_vacinacao | fact | Doses de imunobiologicos aplicadas |
| tb_fat_visita_domiciliar | fact | Visitas domiciliares por ACS/TACS |
| tb_fat_cidadao_pec | fact/dim | Cadastro de cidadaos (sem PII — so co_fat_cidadao_pec, dt_nascimento, flags) |
| tb_dim_procedimento | dim | SIGTAP: co_proced → no_proced |
| tb_dim_cbo | dim | CBO: nu_cbo → no_cbo |
| tb_dim_tempo | dim | Calendario: co_dim_tempo (YYYYMMDD) |
| tb_equipe | dim-like | INE, tipo equipe, unidade vinculada |
| tb_tipo_equipe | dim | co_tipo_equipe → tp_equipe (70=eSF, 76=eAP) |
| tb_dim_unidade_saude | dim | CNES da unidade |
| tb_dim_municipio | dim | Codigo IBGE do municipio |

**Regra:** nenhuma transformacao nesta camada. Colunas e tipos sao os do PEC DW original.

## 3. Camada 2 — Canonical Health Model

Modelo normalizado que abstrai as diferencas entre versoes do PEC e permite validacao estruturada.

### 3.1 Entidades

#### partner
Empresa parceira registrada no ecossistema (ex: DM Technology).
```
partner {
  id: uuid
  cnpj: string(14)         -- vinculo nacional CNPJ
  name: string
  status: 'active' | 'suspended' | 'inactive'
  created_at: timestamp
}
```

#### tenant_municipality
Municipio vinculado a um parceiro. Um parceiro pode ter N municipios.
```
tenant_municipality {
  id: uuid
  partner_id: uuid → partner.id
  ibge_code: string(7)     -- vinculo nacional IBGE
  name: string
  uf: string(2)
  population: int | null
  pec_db_config: jsonb      -- host, port, db, schema (sem senha)
  status: 'active' | 'suspended'
}
```

#### health_unit
Unidade de saude (UBS, USF, etc). Vinculo nacional via CNES.
```
health_unit {
  id: uuid
  tenant_municipality_id: uuid → tenant_municipality.id
  cnes: string(7)           -- vinculo nacional CNES
  name: string
  unit_type: string
  pec_co_seq: int | null     -- FK local no PEC DW
}
```

#### health_team
Equipe de saude vinculada a uma unidade. INE + tipo identificam unicamente.
```
health_team {
  id: uuid
  health_unit_id: uuid → health_unit.id
  ine: string(10)            -- vinculo nacional INE
  team_type_code: int        -- 70=eSF, 76=eAP
  team_type_name: string
  area: string | null
  pec_co_seq: int | null     -- FK local no PEC DW
}
```

#### professional
Profissional de saude. NAO e o CBO — profissional pode ter N CBOs ao longo do tempo.
```
professional {
  id: uuid
  health_team_id: uuid → health_team.id
  cns_hash: string(64)      -- SHA-256 do CNS, nunca CNS raw
  name_hash: string(64)     -- SHA-256, para dedup apenas
  pec_co_seq: int | null
}
```

#### professional_cbo_assignment
Relacao N:N temporal entre profissional e CBO.
```
professional_cbo_assignment {
  id: uuid
  professional_id: uuid → professional.id
  cbo_code: string(6)       -- vinculo nacional CBO
  valid_from: date
  valid_to: date | null
}
```

#### patient
Cidadao/paciente. Identificado por hash, nunca por CPF/CNS direto.
```
patient {
  id: uuid
  tenant_municipality_id: uuid → tenant_municipality.id
  pec_cidadao_id: bigint     -- co_fat_cidadao_pec (ID interno, nao PII)
  birth_date_key: int        -- YYYYMMDD
  sex: 'M' | 'F' | null
  is_deceased: boolean
  is_deleted: boolean
  cpf_hash: string(64) | null
  cns_hash: string(64) | null
}
```

#### clinical_event
Evento clinico unificado (atendimento, vacina, visita, exame).
```
clinical_event {
  id: uuid
  patient_id: uuid → patient.id
  health_team_id: uuid → health_team.id
  professional_id: uuid | null → professional.id
  event_type: 'individual_visit' | 'vaccination' | 'home_visit' | 'exam' | 'procedure'
  event_date_key: int        -- YYYYMMDD
  pec_source_table: string   -- tb_fat_atendimento_individual, tb_fat_vacinacao, etc.
  pec_source_pk: bigint | null
}
```

#### clinical_event_code
Codigos associados a um evento clinico (SIGTAP, CID10, CIAP2, imunobiologico).
```
clinical_event_code {
  id: uuid
  clinical_event_id: uuid → clinical_event.id
  code_system: 'sigtap' | 'cid10' | 'ciap2' | 'immunobiological'
  code: string
  qualifier: 'requested' | 'evaluated' | 'applied' | null
}
```

### 3.2 Regras de Negocio

1. **parceiro = CNPJ** — vinculo unico nacional, imutavel
2. **municipio = codigo IBGE** — 7 digitos, vincula a base do IBGE
3. **unidade = CNES** — 7 digitos, Cadastro Nacional de Estabelecimentos de Saude
4. **equipe = INE + tipo** — INE identifica a equipe, tipo (70/76) determina regras de pontuacao
5. **profissional ≠ CBO** — profissional e uma entidade; CBO e uma *atribuicao temporal*
6. **patient via hash** — nunca CPF/CNS em texto claro; usar SHA-256 para dedup
7. **clinical_event unifica** — um unico modelo para atendimento, vacina, visita, exame
8. **code_system padronizado** — SIGTAP, CID10, CIAP2, imunobiologico como code_system enum

## 4. Camada 3 — Indicator Engine

Consome o canonical model (ou diretamente o Raw Sync Layer quando o canonical model ainda nao esta materializado) e calcula indicadores.

**Contrato de saida:** `B360IndicatorResult` (types.ts).

**Fluxo:**
1. Recebe `IndicatorCalculationInput` (INE, periodo, equipeId, unidadeId)
2. Verifica gates: tabelas existem? Dimensoes obrigatorias presentes?
3. Se gate falha → retorna `blocked_by_schema` com errorCode especifico
4. Busca denominador (populacao elegivel)
5. Busca numerador (criterios de boas praticas)
6. Calcula pontuacao por BP
7. Agrega resultado final com evidencias e warnings

**Gates de dimensao (NOVO — a implementar):**
- `SCHEMA_MISSING_DIM_CBO` — tb_dim_cbo ausente bloqueia C2/C3
- `SCHEMA_MISSING_DIM_PROCEDIMENTO` — tb_dim_procedimento ausente bloqueia exames
- `SCHEMA_MISSING_DIM_EQUIPE` — tb_equipe/tb_tipo_equipe ausente bloqueia classificacao eSF/eAP
- `SCHEMA_MISSING_FACT_VACINACAO` — tb_fat_vacinacao ausente bloqueia BP(E) do C2
- `SCHEMA_MISSING_FACT_VISITA` — tb_fat_visita_domiciliar ausente bloqueia BP(D) do C2 e BP(E/J) do C3

## 5. Decisao Arquitetural: Direct SQL vs Canonical Materialized

**Estado atual:** C2/C3 consultam diretamente o Raw Sync Layer (SQL contra tb_fat_*, tb_dim_*).

**Estado futuro (planejado):** Canonical Health Model materializado em tabelas proprias, alimentado por sync incremental do Raw Layer.

**Justificativa para manter SQL direto no curto prazo:**
- Evita duplicacao de dados antes de validar schema completo
- Permite validacao imediata contra PEC real
- Materializar antes de ter o schema validado criaria dados intermediarios incorretos

**Criterio de transicao:**
Migrar para canonical materializado quando:
1. Schema do PEC DW estiver 100% validado contra instalacao real (porta 5433)
2. Pelo menos 3 indicadores (C2, C3, C4) estiverem implementados
3. Performance SQL direto for insuficiente (>5s por indicador)

## 6. Mapeamento Raw → Canonical (referencia)

| Raw (PEC DW) | Canonical | Vinculo Nacional |
|---|---|---|
| tb_dim_municipio.co_ibge | tenant_municipality.ibge_code | IBGE 7 digitos |
| tb_dim_unidade_saude.nu_cnes | health_unit.cnes | CNES 7 digitos |
| tb_equipe.nu_ine | health_team.ine | INE 10 digitos |
| tb_tipo_equipe.co_tipo_equipe | health_team.team_type_code | 70=eSF, 76=eAP |
| tb_dim_cbo.nu_cbo | professional_cbo_assignment.cbo_code | CBO 6 digitos |
| tb_fat_cidadao_pec.co_fat_cidadao_pec | patient.pec_cidadao_id | ID interno |
| tb_fat_atendimento_individual | clinical_event (type=individual_visit) | — |
| tb_fat_vacinacao | clinical_event (type=vaccination) | — |
| tb_fat_visita_domiciliar | clinical_event (type=home_visit) | — |
| tb_fat_atd_ind_exames | clinical_event (type=exam) | — |
| tb_dim_procedimento.co_proced | clinical_event_code (system=sigtap) | SIGTAP 10 digitos |

## 7. Seguranca e LGPD

- **Nenhum campo PII** no canonical model: CPF e CNS sao armazenados apenas como SHA-256
- **co_fat_cidadao_pec** e ID interno do PEC, nao e PII per se
- **dt_nascimento** armazenado como date_key (YYYYMMDD) — necessario para calculo de idade em C2
- **Logs e erros** nunca incluem dados nominais
- **Auditoria** via ruleVersion em cada B360IndicatorResult
