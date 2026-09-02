# Relatório de Auditoria: Particionamento Multi-tenant vs Layouts e-SUS APS

**Data:** 22 de Junho de 2026
**Objetivo:** Cruzar a estratégia de particionamento físico proposta para escalar a aplicação a nível estadual com a estrutura (layout) real de dados oriunda das réplicas PEC (e-SUS APS).

---

## 1. O Desafio Multi-tenant no Layout e-SUS PEC (Réplica Read-Only)

Os bancos do e-SUS PEC foram concebidos pelo Ministério da Saúde (SAPS) no modelo *single-tenant* (uma base por município/instalação). A base PEC não possui nativamente colunas de "Estado" ou "Município IBGE" em todas as linhas, uma vez que o limite geográfico sempre foi implícito.

### Tabela: Cobertura Nativa do PEC vs Necessidade Multi-tenant Analítica
| Tabela e-SUS PEC (Fato) | Possui `co_cnes`? | Possui `co_ine`? | Possui `municipio_ibge`? | Viabilidade de Sync Estadual Direto |
| --- | --- | --- | --- | --- |
| `tb_fat_atendimento_individual` | Indireto (Unidade) | Sim (`co_dim_equipe_1`) | NÃO | Requer Enriquecimento no Agente/Worker |
| `tb_fat_atendimento_odonto` | Indireto | Sim | NÃO | Requer Enriquecimento no Agente/Worker |
| `tb_fat_procedimento` | Não | Sim | NÃO | Requer Enriquecimento no Agente/Worker |
| `tb_fat_vacinacao` | Não | Sim | NÃO | Requer Enriquecimento no Agente/Worker |
| `tb_fat_cidadao_pec` | Não | Não | NÃO | Requer Enriquecimento no Agente/Worker |

---

## 2. Auditoria da Estratégia de Particionamento (Banco Analítico central)

Para unificar centenas de instalações de municípios em um único banco analítico (SUS Analytics), as tabelas como `indicator_results`, os registros brutos em `sus_analytics_ingest.sync_chunks` e as projeções em `sus_analytics_replica.*` não podem herdar a estrutura cega (sem ID de município) do PEC.

A estratégia proposta e documentada em `docs/05-database/sync-partitioning-strategy.md` propõe a hierarquia:
`tenant_id` -> `installation_id` -> `municipio_ibge` -> `co_cnes` -> `co_ine`

### 2.1 Análise de Compatibilidade (Veredicto)
**Status da Estratégia:** ✅ **Aprovada, mas Requer Ação no Agente Edge.**

O banco PostgreSQL central pode usar `PARTITION BY LIST (municipio_ibge)`, no entanto, o motor de sincronização (`Apps/ingest/dm-sync-ingest` e worker normalizer) **PRECISA** propagar `municipio_ibge` e `tenant_id` desde o metadata do chunk até a consolidação analítica.

### 2.2 Migração de Dados Exigida na Escala Estadual (DDL Obrigatório)
Para todas as views materializadas (`mv_isf_municipio`) e tabelas de consolidação do Saúde Brasil 360, a seguinte estrutura física garante o isolamento no PostgreSQL 14+:

```sql
ALTER TABLE indicator_results
  ADD COLUMN tenant_id UUID NOT NULL,
  ADD COLUMN municipio_ibge TEXT NOT NULL,
  ADD COLUMN installation_id UUID NOT NULL;

-- Para permitir que queries estaduais por municipio não façam full-table scan:
CREATE INDEX idx_tenant_municipio ON indicator_results (tenant_id, municipio_ibge);
```

## 3. Conclusão da Auditoria
A aplicação foi desenvolvida baseada no layout legado local (onde 1 Banco = 1 Município). Para que a "Estratégia Estadual" seja concluída, o plano de implementação exigirá que os agentes Rust persistam e reaproveitem sua identidade local (`agent-state/identity.json`, caminho configurável) e propaguem `tenant_id`/`municipality_id` no metadata de cada chunk, mantendo o contrato atual de headers do receiver. Somente assim o worker poderá consolidar o payload na partição analítica correta do município.
