# Schema ACS/Território - Saúde Brasil 360

Data: 2026-06-02

## 1. Tabelas encontradas
- analytics: sus_analytics_reference.tb_dim_cbo
- analytics: sus_analytics_replica.acs_agents_snapshot
- analytics: sus_analytics_replica.citizens_snapshot
- analytics: sus_analytics_replica.home_visits_enriched_snapshot
- analytics: sus_analytics_replica.home_visits_snapshot
- analytics: sus_analytics_replica.tb_cds_cad_individual
- analytics: sus_analytics_replica.tb_cidadao
- analytics: sus_analytics_replica.tb_dim_cbo
- analytics: sus_analytics_replica.tb_dim_equipe
- analytics: sus_analytics_replica.tb_dim_profissional
- analytics: sus_analytics_replica.tb_fat_cad_dom_familia
- analytics: sus_analytics_replica.tb_fat_cad_domiciliar
- analytics: sus_analytics_replica.tb_fat_cad_individual
- analytics: sus_analytics_replica.tb_fat_cidadao_pec
- analytics: sus_analytics_replica.tb_fat_visita_domiciliar

## 2. Colunas relevantes
- analytics: sus_analytics_reference.tb_dim_cbo.source_updated_at (text)
- analytics: sus_analytics_reference.tb_dim_cbo.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.acs_agents_snapshot.nome (text)
- analytics: sus_analytics_replica.acs_agents_snapshot.equipe (text)
- analytics: sus_analytics_replica.acs_agents_snapshot.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.acs_agents_snapshot.cns_hash (text)
- analytics: sus_analytics_replica.acs_agents_snapshot.microarea (text)
- analytics: sus_analytics_replica.acs_agents_snapshot.families_count (integer)
- analytics: sus_analytics_replica.acs_agents_snapshot.visits_count (integer)
- analytics: sus_analytics_replica.acs_agents_snapshot.last_visit_date (date)
- analytics: sus_analytics_replica.citizens_snapshot.microarea (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_hash (text)
- analytics: sus_analytics_replica.citizens_snapshot.source_updated_at (text)
- analytics: sus_analytics_replica.citizens_snapshot.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.citizens_snapshot.citizen_name (text)
- analytics: sus_analytics_replica.citizens_snapshot.citizen_cns (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_id (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_name (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_cpf (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_cns (text)
- analytics: sus_analytics_replica.citizens_snapshot.name_quality_status (text)
- analytics: sus_analytics_replica.citizens_snapshot.name_source (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_name_quality_status (text)
- analytics: sus_analytics_replica.citizens_snapshot.family_responsible_name_source (text)
- analytics: sus_analytics_replica.citizens_snapshot.acs_id (text)
- analytics: sus_analytics_replica.citizens_snapshot.moved_territory (boolean)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.acs_id (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.acs_name (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.team_name (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.unit_name (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.visit_date (date)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.visit_type (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.microarea (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.source_updated_at (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.citizen_name (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.citizen_cns (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_id (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_name (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_cpf (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_cns (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.name_quality_status (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.name_source (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_name_quality_status (text)
- analytics: sus_analytics_replica.home_visits_enriched_snapshot.family_responsible_name_source (text)
- analytics: sus_analytics_replica.home_visits_snapshot.acs_id (text)
- analytics: sus_analytics_replica.home_visits_snapshot.visit_date (date)
- analytics: sus_analytics_replica.home_visits_snapshot.visit_type (text)
- analytics: sus_analytics_replica.home_visits_snapshot.microarea (text)
- analytics: sus_analytics_replica.home_visits_snapshot.source_updated_at (text)
- analytics: sus_analytics_replica.home_visits_snapshot.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.home_visits_snapshot.citizen_name (text)
- analytics: sus_analytics_replica.home_visits_snapshot.citizen_cns (text)
- analytics: sus_analytics_replica.home_visits_snapshot.family_responsible_id (text)
- analytics: sus_analytics_replica.home_visits_snapshot.family_responsible_name (text)
- analytics: sus_analytics_replica.home_visits_snapshot.family_responsible_cpf (text)
- analytics: sus_analytics_replica.home_visits_snapshot.family_responsible_cns (text)
- analytics: sus_analytics_replica.tb_cds_cad_individual.source_updated_at (text)
- analytics: sus_analytics_replica.tb_cds_cad_individual.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_cidadao.source_updated_at (text)
- analytics: sus_analytics_replica.tb_cidadao.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_dim_cbo.source_updated_at (text)
- analytics: sus_analytics_replica.tb_dim_cbo.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_dim_equipe.source_updated_at (text)
- analytics: sus_analytics_replica.tb_dim_equipe.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_dim_profissional.source_updated_at (text)
- analytics: sus_analytics_replica.tb_dim_profissional.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_fat_cad_dom_familia.source_updated_at (text)
- analytics: sus_analytics_replica.tb_fat_cad_dom_familia.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_fat_cad_domiciliar.source_updated_at (text)
- analytics: sus_analytics_replica.tb_fat_cad_domiciliar.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_fat_cad_individual.source_updated_at (text)
- analytics: sus_analytics_replica.tb_fat_cad_individual.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_fat_cidadao_pec.source_updated_at (text)
- analytics: sus_analytics_replica.tb_fat_cidadao_pec.updated_at (timestamp with time zone)
- analytics: sus_analytics_replica.tb_fat_visita_domiciliar.source_updated_at (text)
- analytics: sus_analytics_replica.tb_fat_visita_domiciliar.updated_at (timestamp with time zone)

## 3. Relações possíveis
- Relação nominal principal: citizen_id/co_fat_cidadao_pec usado nas listas nominais.
- Relação territorial preferencial: snapshots ACS por citizen_id quando disponíveis.
- Relação alternativa: visita domiciliar recente por citizen_id, microarea e acs_id quando disponível.
- Relação PEC direta: cadastro individual/domiciliar pode conter microarea, mas ACS nominal exige profissional/visita ou snapshot enriquecido.

## 4. Join recomendado
Usar enrichment em lote contra snapshots ACS no analytics DB, por citizen_id, com fallback explícito quando o vínculo não existir. Evita N+1 e não toca o PEC.

## 5. O que existe
- analytics: citizens_snapshot_territory_coverage => {"total":"45693","with_microarea":"45693","with_acs_id":"0"}
- analytics: home_visits_enriched_latest_coverage => {"total":"2072523","with_citizen_id":"2051854","with_microarea":"2072522","with_acs_id":"2072522","latest_visit_date":"2026-05-29"}
- analytics: tb_fat_cad_individual_microarea_coverage => {}; erro=relation "tb_fat_cad_individual" does not exist
- analytics: tb_fat_visita_domiciliar_microarea_professional_coverage => {}; erro=relation "tb_fat_visita_domiciliar" does not exist

## 6. O que não existe
- Nenhum CPF/CNS completo é necessário para o join proposto.
- ACS não deve ser inferido por nome.
- Quando o snapshot ou vínculo por visita não tiver citizen_id compatível, o retorno deve manter território nulo com motivo explícito.

## 7. Contagens agregadas sem PII
- analytics: sus_analytics_reference.tb_dim_cbo => 842 linhas
- analytics: sus_analytics_replica.acs_agents_snapshot => 176 linhas
- analytics: sus_analytics_replica.citizens_snapshot => 45693 linhas
- analytics: sus_analytics_replica.home_visits_enriched_snapshot => 2072523 linhas
- analytics: sus_analytics_replica.home_visits_snapshot => 2072523 linhas
- analytics: sus_analytics_replica.tb_cds_cad_individual => 0 linhas
- analytics: sus_analytics_replica.tb_cidadao => 70569 linhas
- analytics: sus_analytics_replica.tb_dim_cbo => 842 linhas
- analytics: sus_analytics_replica.tb_dim_equipe => 26 linhas
- analytics: sus_analytics_replica.tb_dim_profissional => 520 linhas
- analytics: sus_analytics_replica.tb_fat_cad_dom_familia => 136204 linhas
- analytics: sus_analytics_replica.tb_fat_cad_domiciliar => 144566 linhas
- analytics: sus_analytics_replica.tb_fat_cad_individual => 343500 linhas
- analytics: sus_analytics_replica.tb_fat_cidadao_pec => 51810 linhas
- analytics: sus_analytics_replica.tb_fat_visita_domiciliar => 2072524 linhas

## 8. Risco LGPD
- Baixo para a auditoria: apenas metadados e contagens agregadas.
- CNS profissional só pode ser usado como join interno quando indispensável; não deve ser impresso.
- Respostas nominais continuam com CNS/CPF mascarados.

## 9. Decisão técnica
Usar enrichment em lote contra snapshots ACS no analytics DB, por citizen_id, com fallback explícito quando o vínculo não existir. Evita N+1 e não toca o PEC.
