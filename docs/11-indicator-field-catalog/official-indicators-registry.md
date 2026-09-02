# Registro Canônico — 21 Métricas Operacionais Saúde Brasil 360

> **Nota de supersessão (25/07/2026):** este documento continua sendo o catálogo
> semântico dos 21 códigos, mas suas afirmações históricas de validação,
> implementação e runtime não representam prontidão da autoridade Rust. Use a
> [matriz canônica de autoridade Rust](../indicators/b360-rust-authority-matrix.md)
> para estado operacional e o
> [manifesto de fontes oficiais](./sources/official-source-manifest-2026-07-25.json)
> para proveniência normativa verificável. Referências abaixo a PDFs locais em
> `docs/Saúde Brasil 360/` são históricas: esses arquivos não estão versionados
> neste checkout.
>
> **Atualização:** 2026-05-21
> **Proveniência:** Notas Metodológicas 2025/2026, Portaria GM/MS 3.493/2024, Portaria SAPS/MS 161/2024, Portaria GM/MS 6.907/2025, Nota Técnica 30/2025, DW PEC v7.4.0
> **Regra:** Este arquivo é a fonte única de verdade do escopo operacional do projeto. Qualquer outro artefato que contradiga este registro deve ser corrigido.
> **Versão JSON:** `.ai/CONTEXT/indicator-registry.json`
> **Mapa de unificação:** `.github/context/unification-map.md`
> **Fontes locais PDF:** `docs/Saúde Brasil 360/` (15 notas metodológicas + NT 30/2025 + apresentação oficial)
> **Fontes web confirmadas:**
> - [Portaria GM/MS 3.493/2024](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2024/prt3493_11_04_2024.html)
> - [Portaria GM/MS 6.907/2025](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2025/prt6907_08_05_2025.html) — Anexo V confirma os 15 indicadores de Qualidade APS
> - [Portaria SAPS/MS 161/2024](https://bvsms.saude.gov.br/bvs/saudelegis/saps/2024/prt0161_20_12_2024_comp.html)
> **CVAT:** Os 6 itens CVAT são regras operacionais derivadas (DERIVED_OPERATIONAL_RULE), não indicadores com nota metodológica própria. Fonte: NT 30/2025.
> **Proibido:** Nunca usar decomposição C2.1/C2.2/C3.1/C3.2/C5.1/C5.2 (Previne Brasil, programa anterior).

---

## Escopo operacional do projeto

| Componente | Qtd | Códigos |
|---|---|---|
| Qualidade APS — Saúde Bucal | 6 | B1, B2, B3, B4, B5, B6 |
| Qualidade APS — Cuidado Integral | 7 | C1, C2, C3, C4, C5, C6, C7 |
| Qualidade APS — eMulti | 2 | M1, M2 |
| Vínculo e Acompanhamento Territorial (CVAT) | 6 | CVAT1, CVAT2, CVAT3, CVAT4, CVAT5, CVAT6 |
| **Total operacional** | **21** | |

> **Atenção:** Não confundir "15 indicadores de Qualidade APS" com "escopo completo do projeto". O escopo completo são 21 métricas operacionais.

---

## Componente I — Qualidade APS (15 indicadores)

### Saúde Bucal (B1-B6)

#### B1 — Primeira Consulta Programada por equipe de Saúde Bucal

| Campo | Valor |
|---|---|
| Código | B1 |
| Nome | Primeira Consulta Programada por equipe de Saúde Bucal |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Aferir a proporção de pessoas vinculadas à eSB que receberam a primeira consulta odontológica programada no período |
| Numerador | Pessoas vinculadas à eSB com primeira consulta odontológica programada na competência |
| Denominador | Pessoas cadastradas e vinculadas à equipe de Saúde Bucal |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | Maior-melhor |
| Janela temporal | atualização mensal com deduplicação pessoa+dentista nos 12 meses anteriores; avaliação quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B1 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atendimento_odonto, tb_dim_tipo_consulta_odonto, tb_dim_equipe, tb_dim_cbo, tb_fat_cad_individual |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=B1) |
| Status implementação | validated_runtime_public / blocked_by_source (denominador eSB) |
| Evidência | Snapshot público: 0/0 blocked_by_source |

#### B2 — Tratamento Concluído por equipe de Saúde Bucal

| Campo | Valor |
|---|---|
| Código | B2 |
| Nome | Tratamento Concluído por equipe de Saúde Bucal |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Aferir a proporção de tratamentos concluídos entre as primeiras consultas realizadas |
| Numerador | Pessoas com tratamento odontológico concluído no período |
| Denominador | Pessoas com primeira consulta programada no período |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | Maior-melhor |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B2 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_dim_cbo, tb_dim_equipe, tb_dim_procedimento, tb_dim_profissional, tb_dim_tipo_consulta_odonto, tb_dim_unidade_saude, tb_fat_atend_odonto_proced, tb_fat_atendimento_odonto |
| Endpoint tRPC | legado; B2 Rust ainda não ativado |
| Status implementação | `BLOQUEADO_POR_FONTE` |
| Evidência | Rust real: 19/34 = 55,882353%, resultado bloqueado, 8 fontes de linhagem |

#### B3 — Taxa de Exodontia por equipe de Saúde Bucal

| Campo | Valor |
|---|---|
| Código | B3 |
| Nome | Taxa de Exodontia por equipe de Saúde Bucal |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Monitorar a proporção de extrações em relação ao total de procedimentos (preventivos + curativos/restauradores + exodontias) |
| Numerador | Exodontias no período (SIGTAP grupo 04) |
| Denominador | Preventivos + curativos/restauradores + exodontias no período |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | **Faixa ótima** — NÃO é simplesmente maior-melhor nem menor-melhor. Superar a faixa ou ficar muito abaixo gera classificação regular/insuficiente |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B3 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atend_odonto_proced, tb_dim_procedimento, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=B3) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 77/575 = 13.39% |

#### B4 — Escovação Supervisionada em faixa etária escolar de 6 a 12 anos

| Campo | Valor |
|---|---|
| Código | B4 |
| Nome | Escovação Supervisionada em faixa etária escolar (6 a 12 anos) |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Aferir cobertura de crianças de 6–12 anos em ações coletivas de escovação supervisionada |
| Numerador | Crianças 6–12 anos participantes de ação coletiva de escovação no período |
| Denominador | Crianças 6–12 anos vinculadas à unidade/população de referência |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | Maior-melhor |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B4 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atividade_coletiva, tb_fat_atvdd_coletiva_part, tb_fat_atvdd_coletiva_ext, tb_dim_tipo_atividade, tb_dim_procedimento, tb_fat_cidadao_pec, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=B4) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 0/402 = 0% |

#### B5 — Procedimentos Odontológicos Preventivos

| Campo | Valor |
|---|---|
| Código | B5 |
| Nome | Procedimentos Odontológicos Preventivos |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Proporção de procedimentos preventivos individuais sobre total de procedimentos odontológicos individuais |
| Numerador | Procedimentos preventivos individuais (SIGTAP) no período |
| Denominador | Total de procedimentos odontológicos individuais no período |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | **Faixa ótima com limite superior** — Nota indica faixa ideal (ex: 80-85%). Acima ou abaixo pode indicar distorção |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B5 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atend_odonto_proced, tb_dim_procedimento, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=B5) |
| Status implementação | validated_runtime_public / empty_denominator |
| Evidência | Snapshot público: 359/945 = 37.99% |

#### B6 — Tratamento Restaurador Atraumático

| Campo | Valor |
|---|---|
| Código | B6 |
| Nome | Tratamento Restaurador Atraumático (ART) |
| Componente | Qualidade APS |
| Segmento | Saúde Bucal |
| Objetivo | Proporção de ART sobre procedimentos restauradores |
| Numerador | Procedimentos ART no período (SIGTAP) |
| Denominador | Procedimentos restauradores no período |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | Maior-melhor |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica B6 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atend_odonto_proced, tb_dim_procedimento, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=B6) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 7/113 = 6.19% |

### Cuidado Integral (C1-C7)

#### C1 — Mais Acesso à APS

| Campo | Valor |
|---|---|
| Código | C1 |
| Nome | Mais Acesso à APS |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Proporção de atendimentos programados/continuados sobre total de atendimentos |
| Numerador | Indisponível no contrato auditado; requer classificação oficial de demanda programada |
| Denominador | Indisponível no contrato auditado; requer universo elegível e classificação de demanda |
| Fórmula | (atendimentos programados / atendimentos elegíveis) × 100, somente após validação do contrato |
| Polaridade | **Faixa ótima com teto** — NÃO é maior-melhor puro. A nota indica faixa ideal (ex: 50-70%). 100% programado indicaria ausência de demanda espontânea |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C1 |
| Tabelas DW/PEC | `tb_fat_atendimento_individual` e dimensão oficial de tipo de atendimento, ainda não comprovada na réplica |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C1) |
| Status implementação | `blocked_by_source` (`C1_BLOCKED_BY_DATA_CONTRACT`) |
| Evidência | Nenhum valor numérico certificado; o contrato auditado não comprova a variável oficial de demanda |

> Não calcular por heurística enquanto tipo de demanda, equipe da produção e unidade da produção não estiverem disponíveis e versionados.

#### C2 — Cuidado no Desenvolvimento Infantil

| Campo | Valor |
|---|---|
| Código | C2 |
| Nome | Cuidado no Desenvolvimento Infantil |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Boas práticas para crianças ≤ 2 anos (consultas, antropometria, visita, vacinação) |
| Numerador | Score ponderado de boas práticas por criança elegível |
| Denominador | Crianças ≤ 2 anos vinculadas à equipe |
| Fórmula | Média ponderada de critérios cumpridos |
| Polaridade | Maior-melhor |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C2 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_visita_domiciliar, tb_fat_vacinacao, tb_dim_tempo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C2) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 0/19 = 0% |

#### C3 — Cuidado na Gestação e Puerpério

| Campo | Valor |
|---|---|
| Código | C3 |
| Nome | Cuidado na Gestação e Puerpério |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Boas práticas para gestantes e puérperas (pré-natal, testes, exames, odonto, vacinação) |
| Numerador | Score ponderado de boas práticas por gestante elegível |
| Denominador | Gestantes/puérperas elegíveis por CID/CIAP |
| Fórmula | Média ponderada de critérios cumpridos |
| Polaridade | Maior-melhor |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C3 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_atendimento_odonto, tb_fat_visita_domiciliar, tb_fat_rel_op_gestante, tb_dim_equipe |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C3) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 0/19 = 0% |

#### C4 — Cuidado da Pessoa com Diabetes

| Campo | Valor |
|---|---|
| Código | C4 |
| Nome | Cuidado da Pessoa com Diabetes |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Boas práticas para pessoas com diabetes (consulta, PA, antropometria, HbA1c, pé diabético, visita) |
| Numerador | Score ponderado de boas práticas por pessoa elegível |
| Denominador | Pessoas com diabetes (CID/CIAP) vinculadas à equipe |
| Fórmula | Média ponderada de critérios cumpridos |
| Polaridade | Maior-melhor |
| Janela temporal | 6/12 meses conforme critério |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C4 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_atd_ind_procedimentos, tb_fat_visita_domiciliar, tb_dim_procedimento, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C4) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 6425/14800 = 43.41% |

#### C5 — Cuidado da Pessoa com Hipertensão

| Campo | Valor |
|---|---|
| Código | C5 |
| Nome | Cuidado da Pessoa com Hipertensão |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Boas práticas para hipertensos (consulta, PA, peso+altura, visita ACS/TACS) |
| Numerador | Score ponderado de boas práticas por pessoa elegível |
| Denominador | Pessoas com hipertensão (CID/CIAP) vinculadas à equipe |
| Fórmula | Média ponderada com critério de 2 visitas ACS/TACS com intervalo ≥30 dias |
| Polaridade | Maior-melhor |
| Janela temporal | 6/12 meses conforme critério |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C5 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_visita_domiciliar, tb_dim_equipe, tb_dim_cbo, tb_fat_cad_individual, tb_fat_cidadao_pec |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C5) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 26375/52000 = 50.72% |

#### C6 — Cuidado da Pessoa Idosa

| Campo | Valor |
|---|---|
| Código | C6 |
| Nome | Cuidado da Pessoa Idosa |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Boas práticas para pessoas ≥60 anos (consulta, antropometria, visita, influenza) |
| Numerador | Score ponderado de 4 práticas de 25 pontos por pessoa elegível |
| Denominador | Pessoas ≥60 anos vinculadas à equipe |
| Fórmula | Média ponderada de critérios cumpridos |
| Polaridade | Maior-melhor |
| Janela temporal | 12 meses / competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C6 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_cidadao_pec, tb_fat_atendimento_individual, tb_fat_visita_domiciliar, tb_fat_vacinacao, tb_fat_ivcf, tb_fat_op_acompanhamento_idosa, tb_dim_equipe, tb_dim_cbo |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C6) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 23825/52600 = 45.29% |

#### C7 — Cuidado da Mulher na Prevenção do Câncer

| Campo | Valor |
|---|---|
| Código | C7 |
| Nome | Cuidado da Mulher na Prevenção do Câncer |
| Componente | Qualidade APS |
| Segmento | Cuidado Integral |
| Objetivo | Coortes ponderadas: citopatológico, mamografia, HPV e saúde sexual/reprodutiva |
| Numerador | Score ponderado por coorte/critério |
| Denominador | Mulheres/homens trans elegíveis por faixa etária |
| Fórmula | Média ponderada de coortes |
| Polaridade | Maior-melhor |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica C7 (SEI 25000.053348/2026-78) |
| Tabelas DW/PEC | tb_fat_cidadao_pec, tb_fat_atendimento_individual, tb_fat_vacinacao, tb_registro_vacinacao, tb_dim_equipe |
| Endpoint tRPC | saudeBrasil360.calcularIndicador (code=C7) |
| Status implementação | validated_runtime_public |
| Evidência | Snapshot público: 8310/66700 = 12.46% |

### eMulti (M1-M2)

#### M1 — Média de Atendimentos por Pessoa pela eMulti na APS

| Campo | Valor |
|---|---|
| Código | M1 |
| Nome | Média de Atendimentos por Pessoa pela eMulti na APS |
| Componente | Qualidade APS |
| Segmento | eMulti |
| Objetivo | Volume médio de atendimentos (individuais + coletivos) por pessoa assistida pela eMulti |
| Numerador | Total de atendimentos individuais + participações em atividades coletivas pela eMulti |
| Denominador | Pessoas distintas assistidas pela eMulti |
| Fórmula | numerador / denominador |
| Polaridade | Maior-melhor (com faixa de referência na nota) |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica M1, SEI 0055952286, processo 25000.137969/2025-22 |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_atividade_coletiva, tb_fat_atvdd_coletiva_part, tb_dim_equipe, tb_dim_profissional, tb_dim_cbo |
| Endpoint tRPC | b360ReadModel.aggregate (indicatorCode=M1); legado bloqueado |
| Status implementação | rust-read-model-active |
| Evidência | PDF oficial SHA-256 `a54d272643037916225a249360a22363e587c0f19a4d79489d3961154c981d49`; Rust READY 387/320 = 1,209375; golden e dual-run MATCH; cutover READY_FOR_REVIEW; painel autenticado comprovado em 2026-04 |

#### M2 — Ações Interprofissionais realizadas pela eMulti na APS

| Campo | Valor |
|---|---|
| Código | M2 |
| Nome | Ações Interprofissionais realizadas pela eMulti na APS |
| Componente | Qualidade APS |
| Segmento | eMulti |
| Objetivo | Proporção de ações interprofissionais da eMulti |
| Numerador | Ações compartilhadas/interprofissionais da eMulti |
| Denominador | Total de ações MIAI + MIAC + MIAOI + Compartilhamento do Cuidado PEC pela eMulti |
| Fórmula | (numerador / denominador) × 100 |
| Polaridade | Neutra |
| Janela temporal | Competência quadrimestral |
| Granularidade | Equipe (INE) → Unidade → Município |
| Fonte oficial | Nota Metodológica M2, SEI 0055952438, processo 25000.137969/2025-22 |
| Tabelas DW/PEC | tb_fat_atendimento_individual, tb_fat_atendimento_odonto, tb_fat_atividade_coletiva, tb_fat_atvdd_coletiva_propart, tb_fat_cuidado_compartilhado, tb_dim_equipe, tb_dim_profissional, tb_dim_cbo |
| Endpoint tRPC | b360ReadModel.aggregate (indicatorCode=M2); legado bloqueado |
| Status implementação | rust-read-model-active |
| Evidência | PDF oficial SHA-256 `38bfc95af308f3c06604fbba3a61193939eb6fbb3a9abdd8f6c0aaa28934fbd3`; Rust READY 3/410 = 0,731707%; golden e dual-run MATCH; cutover READY_FOR_REVIEW; painel autenticado comprovado em 2026-04 |

---

## Componente II — Vínculo e Acompanhamento Territorial / CVAT (6 regras operacionais)

> **Fonte:** Portaria SAPS/MS 161/2024, Nota Técnica nº 30/2025 (CGESCO/DESCO/SAPS/MS)
> **Status geral:** derived-operational-rule — até maio/2026 não existe nota metodológica detalhada com fórmula final publicada.
> **Estrutura:** Cadastro (30%) + Acompanhamento (70%) + Bônus satisfação (0,15 ou 0,30 ponto)

#### CVAT1 — Cadastro válido

| Campo | Valor |
|---|---|
| Código | CVAT1 |
| Nome | Cadastro válido |
| Componente | CVAT |
| Segmento | Cadastro (peso 30%) |
| Objetivo | Verificar se o cidadão possui MICI válido, sem indicação de Fora de Área ou Mudança de Território |
| Regra | MICI válido e territorialmente elegível; a atualização temporal é registrada separadamente em CVAT3 |
| Polaridade | Maior-melhor |
| Fonte oficial | Nota Técnica nº 30/2025, Portaria SAPS/MS 161/2024 |
| Tabelas DW/PEC | tb_fat_cidadao_pec, tb_fat_cad_individual, tb_dim_equipe, tb_dim_tempo |
| Dependências de dados | Cadastro individual, vínculo cidadão/equipe, data de atualização |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule |
| Pendência | Transformar em regra SQL validada contra tabelas reais; aguardar nota metodológica oficial detalhada |

#### CVAT2 — Cadastro completo

| Campo | Valor |
|---|---|
| Código | CVAT2 |
| Nome | Cadastro completo |
| Componente | CVAT |
| Segmento | Cadastro (peso 30%) |
| Objetivo | Verificar se o cidadão possui MICI e MICDT válidos |
| Regra | CVAT1 + MICDT válido; a atualização temporal de ambos é registrada separadamente em CVAT3 |
| Polaridade | Maior-melhor |
| Fonte oficial | Nota Técnica nº 30/2025, Portaria SAPS/MS 161/2024 |
| Tabelas DW/PEC | tb_fat_cidadao_pec, tb_fat_cad_individual, tb_fat_cad_domiciliar, tb_fat_cidadao_territorio, tb_dim_equipe |
| Dependências de dados | Cadastro individual, cadastro domiciliar/territorial, vínculo territorial |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule |
| Pendência | Transformar em regra SQL validada; confirmar se atualização domiciliar também segue regra de 24 meses |

#### CVAT3 — Cadastro atualizado

| Campo | Valor |
|---|---|
| Código | CVAT3 |
| Nome | Cadastro atualizado |
| Componente | CVAT |
| Segmento | Cadastro (peso 30%) |
| Objetivo | Verificar separadamente a atualização de MICI e MICDT |
| Regra | Cada modelo deve possuir atualização válida dentro da janela oficial de 24 meses |
| Polaridade | Maior-melhor |
| Fonte oficial | Nota Técnica nº 30/2025 |
| Tabelas DW/PEC | tb_fat_cad_individual, tb_fat_cad_domiciliar, tb_fat_cidadao_territorio |
| Dependências de dados | Datas reais de atualização MICI e MICDT |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule |
| Pendência | Confirmar campos reais, transformação do agente e contrato nominal Rust |

#### CVAT4 — Acompanhamento

| Campo | Valor |
|---|---|
| Código | CVAT4 |
| Nome | Pessoa acompanhada por contato assistencial qualificado |
| Componente | CVAT |
| Segmento | Acompanhamento (peso 70%) |
| Objetivo | Identificar pessoas com pelo menos dois contatos em 12 meses, incluindo ao menos uma prática de cuidado |
| Regra | MIV/MIP contam como contato; ao menos um MIAI/MIAOI/MIAC/MIMCA/MIVDT é obrigatório |
| Polaridade | Maior-melhor |
| Fonte oficial | Nota Técnica nº 30/2025 |
| Tabelas DW/PEC | Fontes reais dos sete modelos de informação devem ser confirmadas por contrato |
| Dependências de dados | MIAI, MIAOI, MIAC, MIMCA, MIVDT, MIV e MIP |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule |
| Pendência | Criar contratos nominais Rust, snapshot producer e integração PostgreSQL real |

#### CVAT5 — Vulnerabilidade e ponderação

| Campo | Valor |
|---|---|
| Código | CVAT5 |
| Nome | Vulnerabilidade e ponderação |
| Componente | CVAT |
| Segmento | Fator de ponderação |
| Objetivo | Aplicar ponderação demográfica e socioeconômica às pessoas acompanhadas |
| Regra | Sem vulnerabilidade=1,0; criança <5 ou pessoa ≥60=1,2; PBF/BPC=1,3; combinação=2,5 |
| Polaridade | N/A — fator de ponderação |
| Fonte oficial | Nota Técnica nº 30/2025, Portaria SAPS/MS 161/2024 |
| Tabelas DW/PEC | Cidadão/cadastro para nascimento; fonte canônica PBF/BPC ainda não comprovada |
| Dependências de dados | Data de nascimento e microdados PBF/BPC |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule / blocked-by-source |
| Pendência | Confirmar fonte canônica PBF/BPC; ausência de fonte não pode ser tratada como ausência de vulnerabilidade |

#### CVAT6 — Vínculo, desempate e escore consolidado

| Campo | Valor |
|---|---|
| Código | CVAT6 |
| Nome | Vínculo, desempate e escore consolidado |
| Componente | CVAT |
| Segmento | Consolidação |
| Objetivo | Resolver a equipe oficial da pessoa e consolidar Cadastro (X) + Acompanhamento (Y) |
| Regra | Desempate: mais atendimentos em 12 meses, atendimento mais recente, atualização cadastral mais recente; empate exato bloqueia. Escore final=X+Y |
| Polaridade | Maior-melhor |
| Fonte oficial | Nota Técnica nº 30/2025 |
| Tabelas DW/PEC | Vínculos, cadastros e atendimentos; o bônus de satisfação depende de Meu SUS Digital |
| Dependências de dados | Candidatos a vínculo, escores X/Y e avaliações externas quando disponíveis |
| Endpoint tRPC | saudeBrasil360.cvatCalcularEquipe |
| Status implementação | derived-operational-rule / blocked-by-data |
| Pendência | Criar contratos nominais; integrar Meu SUS Digital para bônus 0,15/0,30; comprovar empate e consolidação no runtime |

---

## Regras canônicas deste registro

1. **15 + 6 = 21**: O projeto trata 21 métricas operacionais. Nunca declarar que o escopo completo são apenas 15.
2. **Separação obrigatória**: Qualidade APS (B/C/M) e CVAT são componentes distintos. Não misturar.
3. **Proveniência**: Nenhuma fórmula, peso, tabela ou fonte pode ser declarada sem evidência oficial.
4. **Polaridade especial**: B3 (faixa ótima), B5 (faixa ótima com limite superior) e C1 (faixa ótima com teto) NÃO são simplesmente maior-melhor.
5. **CVAT sem nota metodológica detalhada**: Até 2026-05-20, CVAT opera com regras derivadas da NT 30/2025 e Portaria 161/2024. Quando a nota oficial for publicada, este registro deve ser atualizado.
6. **Status honestos**: Nenhum indicador pode ser declarado READY sem validação de runtime (build + test + smoke).
