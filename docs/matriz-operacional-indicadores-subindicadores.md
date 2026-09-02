# Matriz Operacional — Indicadores, Subindicadores e Tabelas (Saude Brasil 360)

## Escopo operacional do projeto — 21 metricas

> **Regra canonica**: O projeto trata **21 metricas operacionais**:
> - **15 indicadores de Qualidade APS**: B1-B6, C1-C7, M1-M2
> - **6 subindicadores CVAT**: CVAT1-CVAT6
>
> Registro canonico completo: [official-indicators-registry.md](official-indicators-registry.md)

**Nota historica**: O agente Rust usa internamente `IND_21` referindo-se a 15 indicadores + 6 subindicadores compostos (C2.1/C2.2, C3.1/C3.2, C5.1/C5.2). Essa nomenclatura e um artefato de codigo que nao equivale ao escopo operacional de 21 metricas do projeto (15 Qualidade APS + 6 CVAT). O CVAT existe separadamente como `IND_CVAT`.

## Escopo validado em source

- Agente Rust sincroniza **34 tabelas** incrementais (`Apps/agent/pec-agent-sync/src/sync.rs`).
- Escopo de calculo no agente: `IND_21` (15 indicadores + subindicadores compostos) + `IND_CVAT` (CVAT separado).
- **CVAT faz parte do escopo completo do projeto** e nao deve ser tratado como "fora da lista".

## 34 tabelas sincronizadas

1. `tb_cds_cad_individual`
2. `tb_cidadao`
3. `tb_dim_equipe`
4. `tb_dim_profissional`
5. `tb_dim_tempo`
6. `tb_dim_unidade_saude`
7. `tb_fat_atd_ind_encaminhamentos`
8. `tb_fat_atd_ind_exames`
9. `tb_fat_atd_ind_medicamentos`
10. `tb_fat_atd_ind_problemas`
11. `tb_fat_atd_ind_procedimentos`
12. `tb_fat_atend_odonto_encaminham`
13. `tb_fat_atend_odonto_exames`
14. `tb_fat_atend_odonto_medicament`
15. `tb_fat_atend_odonto_problemas`
16. `tb_fat_atend_odonto_proced`
17. `tb_fat_atendimento_domiciliar`
18. `tb_fat_atendimento_individual`
19. `tb_fat_atendimento_odonto`
20. `tb_fat_atividade_coletiva`
21. `tb_fat_atvdd_coletiva_ext`
22. `tb_fat_atvdd_coletiva_int`
23. `tb_fat_atvdd_coletiva_part`
24. `tb_fat_atvdd_coletiva_propart`
25. `tb_fat_cad_dom_familia`
26. `tb_fat_cad_domiciliar`
27. `tb_fat_cad_individual`
28. `tb_fat_cidadao_pec`
29. `tb_fat_ivcf`
30. `tb_fat_marca_consumo_alimnt`
31. `tb_fat_proced_atend`
32. `tb_fat_vacinacao`
33. `tb_fat_visita_domiciliar`
34. `tb_registro_vacinacao`

## Matriz 21 itens (vinculo regra/tabela/endpoint)

| Item | Dominio | Regra operacional atual | Tabelas de calculo (source atual) | Cobertura no sync (34) | Endpoint canônico `saudeBrasil360.calcularIndicador` | Endpoint legado `previneBrasil.drilldown` |
|---|---|---|---|---:|---|---|
| C1 | ESF | Mais acesso APS (placeholder) | tb_cds_cad_individual; tb_fat_atendimento_individual (previne drilldown retorna placeholder) | 20 tabelas | stub | stub |
| C2 | ESF | Gestantes com pré-natal/testagem | tb_cds_cad_individual; tb_fat_atendimento_individual; tb_dim_equipe; tb_dim_profissional | 20 tabelas | nao implementado | implementado |
| C3 | ESF | Gestantes com atendimento odontológico | tb_cds_cad_individual; tb_fat_atendimento_odonto; tb_dim_equipe; tb_dim_profissional | 26 tabelas | nao implementado | implementado |
| C4 | ESF | Diabetes (placeholder no drilldown legado) | tb_fat_atd_ind_procedimentos (legado C4 em ajuste de schema); tb_fat_atendimento_individual | 20 tabelas | nao implementado | stub |
| C5 | ESF | Hipertensão/Diabetes conforme módulo (validar nome normativo) | canônico: tb_cidadao; tb_cds_cad_individual; tb_fat_atendimento_individual; tb_fat_atd_ind_procedimento; tb_dim_equipe. drilldown: tb_cds_cad_individual; tb_fat_atendimento_individual | 20 tabelas | implementado (C5) | implementado |
| C6 | ESF | Mulheres 25-64 com citopatológico (nome legado) | tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 20 tabelas | nao implementado | implementado |
| C7 | ESF | Vacinação <2 anos (nome legado) | tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 22 tabelas | nao implementado | implementado |
| B1 | ESB | Primeira consulta odontológica | tb_fat_atendimento_odonto; tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 22 tabelas | nao implementado | implementado |
| B2 | ESB | Atendimento urgência/resolutividade | tb_fat_atendimento_odonto; tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 22 tabelas | nao implementado | implementado |
| B3 | ESB | Escovação supervisionada | tb_fat_atendimento_odonto; tb_fat_atividade_coletiva; tb_cds_cad_individual | 22 tabelas | nao implementado | implementado |
| B4 | ESB | Tratamento odontológico concluído | tb_fat_atendimento_odonto; tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 22 tabelas | nao implementado | implementado |
| B5 | ESB | Consultas de manutenção | tb_fat_atendimento_odonto; tb_cds_cad_individual; tb_dim_equipe; tb_dim_profissional | 22 tabelas | nao implementado | implementado |
| B6 | ESB | Ações coletivas de saúde bucal | tb_fat_atividade_coletiva; tb_cds_cad_individual | 22 tabelas | nao implementado | implementado |
| M1 | eMulti | Atendimentos individuais eMulti | tb_fat_atendimento_individual; tb_dim_profissional; tb_cds_cad_individual; tb_dim_equipe | 17 tabelas | nao implementado | implementado |
| M2 | eMulti | Atividades coletivas eMulti | tb_fat_atividade_coletiva; tb_dim_profissional; tb_cds_cad_individual | 17 tabelas | nao implementado | implementado |
| C2.1 | ESF | Gestantes com pré-natal | tb_cds_cad_individual; tb_fat_atendimento_individual | 20 tabelas | nao implementado | implementado |
| C2.2 | ESF | Gestantes testadas para sífilis | tb_cds_cad_individual | 20 tabelas | nao implementado | implementado |
| C3.1 | ESF | Gestantes com >=1 atendimento odonto | tb_cds_cad_individual; tb_fat_atendimento_odonto | 26 tabelas | nao implementado | implementado |
| C3.2 | ESF | Total de atendimentos odonto em gestantes | tb_fat_atendimento_odonto | 26 tabelas | nao implementado | implementado |
| C5.1 | ESF | Hipertensos com consulta | tb_cds_cad_individual; tb_fat_atendimento_individual | 20 tabelas | nao implementado | implementado |
| C5.2 | ESF | Hipertensos com PA aferida | tb_cds_cad_individual | 20 tabelas | nao implementado | implementado |

## Observacoes criticas

1. **C1 e C4**: no endpoint legado de drilldown ainda retornam placeholder/stub.
2. **Canônico desktop (`saudeBrasil360`)**: apenas **C5** tem calculo real hoje; demais retornam contrato `NOT_IMPLEMENTED`.
3. **Nomes C1..C7 no `catalog.ts`** divergem da nomenclatura normativa usada em documentos de campo; validar harmonizacao sem quebrar contratos existentes.
4. **21 itens priorizados** no agente sao metadado de cobertura (`required_for`) e nao substituem validacao normativa final dos 21 subindicadores oficiais do MS.

## Referencias de codigo

- `Apps/agent/pec-agent-sync/src/sync.rs`
- `Apps/server/api/src/saude-brasil-360/router.ts`
- `Apps/server/api/src/saude-brasil-360/indicadores/indicador-c5.ts`
- `Apps/web/server/routers.ts`
- `Apps/web/server/indicadores-drilldown-esf.ts`
- `Apps/web/server/indicadores-drilldown-esb.ts`
- `Apps/web/server/indicadores-drilldown-emulti.ts`
