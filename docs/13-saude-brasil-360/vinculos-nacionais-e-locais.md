# Vinculos Nacionais e Locais — Saude Brasil 360

> Versao: 1.0 | Data: 2026-05-23

## 1. Principio

Todo indicador do Saude Brasil 360 depende de vinculos entre entidades que possuem **identificadores nacionais padronizados**. A corretude do calculo depende de mapear corretamente esses vinculos tanto no nivel nacional (registry) quanto no nivel local (PEC do municipio).

## 2. Binding Matrix

| Entidade | Identificador Nacional | Fonte Autoritativa | Cardinalidade | Imutavel? |
|----------|----------------------|---------------------|---------------|-----------|
| Parceiro | CNPJ (14 digitos) | Receita Federal | 1 parceiro : N municipios | Sim |
| Municipio | Codigo IBGE (7 digitos) | IBGE | 1 municipio : N unidades | Sim |
| Unidade de Saude | CNES (7 digitos) | CNES/SCNES | 1 unidade : N equipes | Nao (pode ser desativada) |
| Equipe de Saude | INE (10 digitos) + Tipo | CNES/INE | 1 equipe : N profissionais | Nao (pode mudar tipo) |
| Profissional | CPF (hash) + CNS (hash) | — | 1 profissional : N CBOs | Sim (pessoa) |
| Atribuicao CBO | CBO-S (6 digitos) | MTE/CBO-S | N:N temporal (prof × CBO) | Nao (temporal) |
| Paciente/Cidadao | co_fat_cidadao_pec (interno) | PEC local | 1 cidadao : N atendimentos | Sim (ID) |
| Procedimento | SIGTAP (10 digitos) | SIGTAP/DATASUS | Referencia | Nao (versionado) |
| Diagnostico CID | CID-10 (alfanum) | OMS/MS | Referencia | Nao (versionado) |
| Diagnostico CIAP | CIAP-2 (alfanum) | WONCA/MS | Referencia | Nao (versionado) |
| Imunobiologico | Codigo MS (2-3 digitos) | PNI/MS | Referencia | Nao (versionado) |

## 3. Vinculo Local vs Nacional

### 3.1 Vinculo Local (PEC do Municipio)

Relacoes armazenadas no PostgreSQL do PEC da instalacao local:

```
tb_dim_municipio (co_ibge)
  └── tb_dim_unidade_saude (co_cnes)
        └── tb_equipe (nu_ine, co_tipo_equipe via tb_tipo_equipe)
              └── tb_fat_atendimento_individual (co_dim_equipe_1)
                    └── tb_fat_cidadao_pec (co_fat_cidadao_pec)
```

**Particularidades:**
- O PEC usa surrogate keys internas (co_seq_dim_*) que sao especificas da instalacao
- O mapeamento surrogate → nacional e feito pelas tabelas tb_dim_* (ex: tb_dim_cbo.nu_cbo)
- Nem toda instalacao tem todas as dimensoes populadas (ex: replica simplificada sem tb_dim_cbo)

### 3.2 Vinculo Nacional (Registry)

Tabelas de referencia mantidas pelo MS/DATASUS, versionadas por competencia:

| Dimensao | Chave | Atualizacao | Tamanho Aprox. |
|----------|-------|-------------|----------------|
| dim_municipality_ibge | ibge_code (7) | Anual (IBGE) | ~5.570 registros |
| dim_cnes_health_unit | cnes (7) | Mensal (SCNES) | ~350.000 registros |
| dim_cbo | cbo_code (6) | Eventual (MTE) | ~2.500 registros |
| dim_cid10 | cid_code | Eventual (OMS) | ~16.000 registros |
| dim_ciap2 | ciap_code | Eventual (WONCA) | ~800 registros |
| dim_sigtap | sigtap_code (10) | Mensal (DATASUS) | ~5.000 registros |
| dim_immunobiological | ms_code (2-3) | Eventual (PNI) | ~80 registros |
| dim_team_type | type_code (int) | Eventual (SAPS) | ~30 registros |
| dim_competence_calendar | competence (YYYY-MM) | Automatica | 12/ano |

### 3.3 Resolucao de Conflitos

Quando o PEC local e o registry nacional divergem:

1. **CNES ausente no registry:** Unidade nao credenciada ou inativa → warning, nao bloqueia calculo
2. **CBO ausente no registry:** CBO invalido ou descontinuado → bloqueia classificacao profissional
3. **SIGTAP ausente no registry:** Procedimento descontinuado → warning se historico, bloqueia se corrente
4. **IBGE ausente no registry:** Municipio invalido → bloqueia calculo completamente
5. **INE sem tipo:** Equipe sem classificacao → nao e possivel determinar eSF vs eAP → bloqueia pontuacao

## 4. Impacto nos Indicadores C2 e C3

### 4.1 Dimensoes Obrigatorias por Indicador

| Dimensao | C2 | C3 | Impacto se Ausente |
|----------|----|----|---------------------|
| tb_dim_cbo (nu_cbo) | Todas as BPs | Todas as BPs | BLOCKED — nao filtra profissional |
| tb_dim_procedimento (co_proced) | BP(C) antropometria | BP(C) PA, BP(D), BP(F-H) exames | BLOCKED — nao resolve SIGTAP |
| tb_equipe + tb_tipo_equipe | Denominador + pontuacao | Denominador + pontuacao | BLOCKED — nao classifica eSF/eAP |
| tb_fat_vacinacao | BP(E) | — | BP(E) zerada, warning |
| tb_fat_visita_domiciliar | BP(D) | BP(E), BP(J) | BPs zeradas, warning |
| tb_fat_atd_ind_exames | — | BP(F-H) exames | Fallback ds_filtro, warning |

### 4.2 Status de Retorno

Quando uma dimensao obrigatoria esta ausente, o indicador retorna:
```typescript
{
  status: "blocked_by_schema",
  errorCode: "SCHEMA_MISSING_DIM_CBO",  // exemplo
  coverageStatus: "BLOCKED_BY_SOURCE",
  message: "Dimensao obrigatoria ausente: tb_dim_cbo"
}
```

## 5. Regra de Ouro: profissional ≠ CBO

Um profissional pode atuar com diferentes CBOs ao longo do tempo:
- Enfermeiro (2235-05) que se torna Enfermeiro da Estrategia (2235-67)
- Medico generalista (2251-XX) que faz residencia e muda para 2253-XX
- Tecnico de enfermagem (3222-05) que acumula funcao de TACS (3222-55)

**Consequencia:** a filtragem por CBO deve ser feita no **atendimento** (co_dim_cbo_1 do fato), nao no cadastro do profissional. Isso ja esta implementado em C2/C3 via `buildCboJoinClause`.

## 6. Regra de Ouro: patient via hash, nunca PII

- `co_fat_cidadao_pec` e um ID interno sequencial — nao e PII, mas e especifico da instalacao
- CPF e CNS **nunca** aparecem em logs, resultados ou payloads
- Para deduplicacao cross-municipio (futuro): usar SHA-256 do CPF ou CNS
- `dt_nascimento` (como date_key YYYYMMDD) e necessario para calculo de idade — excecao permitida pela LGPD para calculo agregado de indicadores de saude publica

## 7. Checklist de Validacao de Vinculos

- [ ] IBGE do municipio confere com o cadastro no PEC?
- [ ] CNES das unidades esta ativo no SCNES?
- [ ] INE das equipes existe e tem tipo valido (70 ou 76)?
- [ ] tb_dim_cbo esta populada com nu_cbo?
- [ ] tb_dim_procedimento esta populada com co_proced?
- [ ] tb_tipo_equipe contem os tipos esperados (70, 76)?
- [ ] Profissionais tem co_dim_cbo_1 preenchido nos atendimentos?
- [ ] co_fat_cidadao_pec e consistente entre tabelas de fato?
