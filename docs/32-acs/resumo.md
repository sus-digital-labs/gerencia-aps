Vou analisar o documento e mapear todas as tabelas do Data Warehouse PEC mencionadas.

Read [](file:///d%3A/dm-hub/apps/dm-gov/saude/sus-analytics-sync/docs/32-acs/tabelas-acs-admin.md#1-1), lines 1 to 50

## 📊 Resumo Executivo - Mapeamento de Tabelas DW PEC para Indicadores Saúde Brasil 360

### 🎯 Escopo: 21 indicadores (15 Qualidade APS + 6 CVAT)

---

## 📋 TABELAS FATO (tb_fat_*)

### **1. tb_fat_atendimento_individual** (⭐ TABELA CENTRAL)
**Modelo**: MIAI (Modelo de Informação de Atendimento Individual)
**Indicadores**: C1-C7, M1-M2, CVAT5
**Campos principais**:
- **Identificação**: `nu_cpf_cidadao`, `nu_cns`, `nu_prontuario`, `nu_uuid_ficha`
- **Antropometria**: `nu_peso`, `nu_altura`, `nu_perimetro_cefalico`, `nu_medicao_circ_abdominal`
- **Sinais vitais**: `nu_medicao_pressao_sistolica`, `nu_medicao_pressao_diastolica`, `nu_medicao_glicemia`, `nu_medicao_temperatura`, `nu_medicao_saturacao_o2`, `nu_medicao_freq_respiratoria`, `nu_medicao_freq_cardiaca`
- **Gestação**: `nu_idade_gestacional_semanas`, `nu_gestas_previas`, `nu_partos`, `st_gravidez_planejada`
- **Diagnósticos**: `ds_filtro_cids`, `ds_filtro_ciaps`, `ds_filtro_proced_solicitados`, `ds_filtro_proced_avaliados`
- **Condutas**: `st_conduta_alta_episodio`, `st_conduta_consulta_agendada`, `st_conduta_cuidd_conti_program`, `st_conduta_agendamento_emulti`, `st_conduta_agendamento_grupos`
- **Encaminhamentos**: `st_encaminhamento_serv_special`, `st_encaminhamento_caps`, `st_encaminhamento_urgencia`, `st_encaminhamento_intern_hospi`, `st_encaminhamento_servico_ad`
- **Temporal**: `dt_inicial_atendimento`, `dt_final_atendimento`
- **Chaves FK**: `co_dim_municipio`, `co_dim_unidade_saude_1`, `co_dim_equipe_1`, `co_dim_profissional_1`, `co_dim_cbo_1`, `co_dim_faixa_etaria`, `co_dim_sexo`, `co_dim_tipo_atendimento`, `co_dim_tipo_ficha`
- **Imunização**: `st_vacinacao_em_dia`
- **eMulti/NASF legado**: `st_nasf_avaliacao_diagnostico`, `st_nasf_proce_clin_terapeutico`, `st_nasf_prescricao_terapeutica` (substituídos por campos `st_emulti_*`)

---

### **2. tb_fat_atendimento_odonto**
**Modelo**: MIAOI (Modelo de Informação de Atendimento Odontológico Individual)
**Indicadores**: B1-B6
**Campos principais**:
- `co_dim_cbo_1` (Cirurgião-Dentista CBO)
- `st_conduta_alta_episodio` (desfecho/alta odontológica)
- Códigos SIGTAP de procedimentos odontológicos

---

### **3. tb_fat_visita_domiciliar** (⭐ TABELA CRÍTICA ACS)
**Modelo**: MIVDT (Modelo de Informação de Visita Domiciliar e Territorial)
**Indicadores**: C2, CVAT5
**Fonte de dados**: e-SUS Território (app móvel) ou CDS (digitação)

#### **🔑 Identificação do Cidadão Visitado**
- `nu_cpf_cidadao` - CPF do cidadão visitado
- `nu_cns` - Cartão Nacional de Saúde
- `nu_uuid_ficha` - UUID único da ficha de visita

#### **👤 Identificação do Profissional ACS**
- `co_dim_profissional_1` - ID do profissional que realizou a visita
- `co_dim_cbo_1` - CBO do profissional (515105 = ACS, mas pode incluir enfermeiros e outros)
- `co_dim_equipe_1` - INE da equipe (Identificador Nacional de Equipes)
- `co_dim_unidade_saude_1` - CNES da Unidade Básica de Saúde

#### **⏰ Temporal, Turnos e Horários**
- `dt_inicial_atendimento` - **Timestamp completo** (data + hora) do início da visita
- `dt_final_atendimento` - **Timestamp completo** (data + hora) do fim da visita
- `co_dim_turno` - FK para `tb_dim_turno` (classificação: manhã/tarde/noite)

**Extração de turno via SQL**:
```sql
-- Classificar turno a partir do timestamp
SELECT
    dt_inicial_atendimento,
    CASE
        WHEN EXTRACT(HOUR FROM dt_inicial_atendimento) BETWEEN 6 AND 11 THEN 'Manhã'
        WHEN EXTRACT(HOUR FROM dt_inicial_atendimento) BETWEEN 12 AND 17 THEN 'Tarde'
        ELSE 'Noite'
    END AS turno_calculado,
    EXTRACT(HOUR FROM dt_inicial_atendimento) AS hora_inicio,
    EXTRACT(MINUTE FROM dt_inicial_atendimento) AS minuto_inicio
FROM tb_fat_visita_domiciliar;
```

**Duração da visita**:
```sql
-- Calcular duração média das visitas em minutos
SELECT
    EXTRACT(EPOCH FROM (dt_final_atendimento - dt_inicial_atendimento))/60 AS duracao_minutos
FROM tb_fat_visita_domiciliar;
```

#### **📊 Motivo e Desfecho da Visita (OBRIGATÓRIOS para indicadores)**
- `st_motivo_visita` - **Campo obrigatório** para validação CVAT. Valores típicos:
  - Gestante
  - Criança (< 2 anos)
  - Idoso
  - Hipertenso
  - Diabético
  - Busca ativa
  - Acamado
  - Saúde Mental

- `st_desfecho` - Status do resultado da visita:
  - **Visita realizada** (contabiliza para indicadores)
  - **Visita recusada** (contabiliza para indicadores)
  - **Ausente** (contabiliza para indicadores)

⚠️ **Regra crítica**: Visitas sem `st_motivo_visita` preenchido NÃO pontuam no CVAT mesmo que tenham desfecho válido.

#### **🏥 Dados Clínicos Coletados pelo ACS (Novo no modelo 2025)**
- `nu_peso` - Peso em kg aferido durante a visita domiciliar
- `nu_altura` - Altura em cm aferida durante a visita domiciliar

**Validação importante**: A partir da versão 5.5+ do e-SUS APS, medições antropométricas realizadas pelo ACS em visita domiciliar **contam validamente** para os indicadores:
- C4 (Diabetes)
- C5 (Hipertensão)
- C6 (Pessoa Idosa)

Anteriormente, apenas medições em `tb_fat_atendimento_individual` eram aceitas.

#### **🗺️ Geolocalização e Território**

**Captura automática via GPS** (e-SUS Território):
- `latitude` - Coordenada de latitude decimal (verificar se campo existe no schema local)
- `longitude` - Coordenada de longitude decimal (verificar se campo existe no schema local)
- `nu_precisao_gps_metros` - Precisão do sinal GPS em metros (campo opcional, verificar schema)
- `st_geolocalizacao_validada` - Flag booleana de qualidade da captura GPS (verificar schema)

**Processamento no DW**:
As coordenadas brutas são normalizadas e vinculadas a dimensões territoriais:
- Microárea (extraída de `tb_fat_cad_individual` via JOIN por CPF/CNS)
- `co_dim_municipio` - Código IBGE do município
- Endereço do domicílio (via JOIN com `tb_fat_cad_domiciliar`)

**Query para análise geográfica**:
```sql
-- Distribuição de visitas por microárea
SELECT
    ci.microarea,
    COUNT(DISTINCT v.nu_cpf_cidadao) AS cidadaos_unicos_visitados,
    COUNT(*) AS total_visitas,
    COUNT(CASE WHEN v.st_desfecho = 'Visita realizada' THEN 1 END) AS visitas_realizadas,
    AVG(EXTRACT(EPOCH FROM (v.dt_final_atendimento - v.dt_inicial_atendimento))/60) AS duracao_media_min
FROM tb_fat_visita_domiciliar v
INNER JOIN tb_fat_cad_individual ci ON v.nu_cpf_cidadao = ci.nu_cpf_cidadao
WHERE v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 months'
  AND v.co_dim_cbo_1 = (SELECT co_seq_dim_cbo FROM tb_dim_cbo WHERE codigo_cbo = '515105')
GROUP BY ci.microarea
ORDER BY total_visitas DESC;
```

#### **📈 Queries Úteis para Gestão de Visitas**

**1. Quantidade de visitas por ACS por turno**:
```sql
SELECT
    p.nome_profissional,
    t.descricao_turno,
    COUNT(*) AS total_visitas,
    COUNT(CASE WHEN v.st_desfecho = 'Visita realizada' THEN 1 END) AS realizadas,
    COUNT(CASE WHEN v.st_desfecho = 'Visita recusada' THEN 1 END) AS recusadas,
    COUNT(CASE WHEN v.st_desfecho = 'Ausente' THEN 1 END) AS ausentes,
    ROUND(AVG(EXTRACT(EPOCH FROM (v.dt_final_atendimento - v.dt_inicial_atendimento))/60), 1) AS duracao_media_min
FROM tb_fat_visita_domiciliar v
INNER JOIN tb_dim_profissional p ON v.co_dim_profissional_1 = p.co_seq_dim_profissional
INNER JOIN tb_dim_turno t ON v.co_dim_turno = t.co_seq_dim_turno
INNER JOIN tb_dim_cbo cbo ON v.co_dim_cbo_1 = cbo.co_seq_dim_cbo
WHERE cbo.codigo_cbo = '515105' -- ACS
  AND v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.nome_profissional, t.descricao_turno
ORDER BY p.nome_profissional, total_visitas DESC;
```

**2. Distribuição de visitas por horário do dia**:
```sql
SELECT
    EXTRACT(HOUR FROM dt_inicial_atendimento) AS hora,
    COUNT(*) AS total_visitas,
    COUNT(DISTINCT nu_cpf_cidadao) AS cidadaos_distintos
FROM tb_fat_visita_domiciliar
WHERE dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY hora
ORDER BY hora;
```

**3. Produtividade semanal do ACS**:
```sql
SELECT
    p.nome_profissional,
    TO_CHAR(v.dt_inicial_atendimento, 'IYYY-IW') AS ano_semana,
    COUNT(*) AS visitas_semana,
    COUNT(DISTINCT v.nu_cpf_cidadao) AS familias_distintas
FROM tb_fat_visita_domiciliar v
INNER JOIN tb_dim_profissional p ON v.co_dim_profissional_1 = p.co_seq_dim_profissional
INNER JOIN tb_dim_cbo cbo ON v.co_dim_cbo_1 = cbo.co_seq_dim_cbo
WHERE cbo.codigo_cbo = '515105'
  AND v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY p.nome_profissional, ano_semana
ORDER BY p.nome_profissional, ano_semana;
```

#### **⚠️ Validações para CVAT5 (Pessoa Acompanhada)**

Para que a visita domiciliar conte no indicador **CVAT5 - Pessoa Acompanhada**, ela deve atender:

1. ✅ **Motivo preenchido**: `st_motivo_visita IS NOT NULL`
2. ✅ **Desfecho válido**: `st_desfecho IN ('Visita realizada', 'Visita recusada', 'Ausente')`
3. ✅ **Profissional válido**: CBO autorizado (ACS 515105 ou outro profissional da equipe)
4. ✅ **Janela temporal**: Últimos 12 meses
5. ✅ **Vinculação correta**: `co_dim_equipe_1` e `co_dim_unidade_saude_1` preenchidos
6. ✅ **Contato múltiplo**: Cidadão precisa ter **> 1 registro** somando todas as tabelas fato no ano (visita + atendimento + procedimento + vacinação + atividade coletiva)

**Query de validação CVAT5**:
```sql
-- Cidadãos com pelo menos 1 visita válida nos últimos 12 meses
SELECT
    v.nu_cpf_cidadao,
    COUNT(*) AS total_contatos_visita
FROM tb_fat_visita_domiciliar v
WHERE v.st_motivo_visita IS NOT NULL
  AND v.st_desfecho IS NOT NULL
  AND v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY v.nu_cpf_cidadao
HAVING COUNT(*) >= 1;
```

#### **🔍 Campos Críticos Ausentes no Schema (Verificar localmente)**

Se os campos abaixo não existirem explicitamente na sua instalação do PEC, a geolocalização pode estar sendo:
- Processada para dimensões territoriais (microárea/setor censitário)
- Armazenada em tabelas auxiliares de auditoria/log do e-SUS Território
- Não capturada (instalações antigas ou configuração de GPS desabilitada)

**Campos GPS esperados** (verificar com `DESCRIBE tb_fat_visita_domiciliar;`):
- `latitude` / `ds_latitude`
- `longitude` / `ds_longitude`
- `nu_precisao_gps` / `nu_precisao_gps_metros`
- `st_geolocalizacao_validada` / `fl_geolocalizacao_ok`
- `dt_captura_gps` (timestamp da captura GPS)

---

### **4. tb_fat_atividade_coletiva**
**Modelo**: MIAC (Modelo de Informação de Atividade Coletiva)
**Indicadores**: B5, M2, CVAT5
**Campos principais**:
- Tema da atividade (ex: "Saúde Bucal/Escovação")
- `co_dim_faixa_etaria` (público-alvo escolar 6-12 anos para B5)
- Número de participantes

---

### **5. tb_fat_procedimento**
**Modelo**: MIP (Modelo de Informação de Procedimentos)
**Indicadores**: B3, B4, C7, CVAT5
**Campos principais**:
- Códigos SIGTAP de procedimentos
- Vínculo com atendimento/profissional

---

### **6. tb_fat_vacinacao**
**Modelo**: MIV (Modelo de Informação de Vacinação)
**Indicadores**: C2, CVAT5
**Campos principais**:
- Status de vacinação
- Calendário vacinal

---

### **7. tb_fat_cad_individual**
**Modelo**: MICI (Modelo de Informação de Cadastro Individual)
**Indicadores**: CVAT1, CVAT2, CVAT3, CVAT4
**Campos principais**:
- **Identificação**: `nu_cpf_cidadao`, `nu_cns`
- **Temporal**: Data de preenchimento/atualização (validade 24 meses)
- **Demográfico**: `dt_nascimento`, `co_dim_faixa_etaria` (< 5 anos ou > 60 anos = peso 1,2)
- **Responsável**: Flag "Cidadão é responsável familiar?", CPF/CNS do responsável
- **Território**: Microárea
- **Vulnerabilidade**: Marcadores BPC/Bolsa Família

---

### **8. tb_fat_cad_domiciliar** (Complemento Geográfico)
**Modelo**: MICDT (Modelo de Informação de Cadastro Domiciliar e Territorial)
**Indicadores**: CVAT2
**Fonte**: e-SUS Território ou CDS (Ficha de Cadastro Domiciliar)

#### **🏠 Identificação do Domicílio**
- `co_seq_fat_cad_domiciliar` - Identificador único do domicílio no DW
- `nu_uuid_ficha` - UUID da ficha de cadastro domiciliar
- Vínculo com responsável familiar (CPF/CNS do responsável via JOIN com `tb_fat_cad_individual`)

#### **📍 Localização e Território**
- **Microárea** - Código da microárea de saúde
- **Endereço completo**:
  - Logradouro
  - Número
  - Complemento
  - Bairro
  - CEP
  - `co_dim_municipio` - Código IBGE

- **Coordenadas geográficas do domicílio**:
  - `latitude` / `ds_latitude` (verificar schema local)
  - `longitude` / `ds_longitude` (verificar schema local)
  - Capturadas durante cadastro via e-SUS Território

#### **⏱️ Temporal e Validade**
- `dt_cadastro` / `dt_atualizacao` - Data de preenchimento/atualização
- **Validade**: 24 meses (CVAT exige atualização bienal)
- `dt_inativacao` - Data de inativação (quando família muda ou domicílio é desativado)

#### **🚪 Status do Domicílio**
- `st_familia_mudou` / `fl_familia_mudou_se` - Flag "Família Mudou-se"
- `st_domicilio_ativo` - Status de atividade do cadastro
- `nu_moradores` - Número de moradores cadastrados no domicílio

#### **🔗 Cruzamento com Visitas Domiciliares**

**Query para mapear visitas por domicílio**:
```sql
-- Visitas realizadas por domicílio
SELECT
    d.co_seq_fat_cad_domiciliar,
    d.microarea,
    d.logradouro,
    d.numero,
    d.nu_moradores,
    COUNT(DISTINCT v.nu_cpf_cidadao) AS moradores_visitados,
    COUNT(v.co_seq_fat_visita) AS total_visitas,
    MAX(v.dt_inicial_atendimento) AS ultima_visita,
    CASE
        WHEN MAX(v.dt_inicial_atendimento) >= CURRENT_DATE - INTERVAL '30 days' THEN 'Recente'
        WHEN MAX(v.dt_inicial_atendimento) >= CURRENT_DATE - INTERVAL '90 days' THEN 'Regular'
        ELSE 'Pendente'
    END AS status_cobertura
FROM tb_fat_cad_domiciliar d
LEFT JOIN tb_fat_cad_individual ci ON d.co_seq_fat_cad_domiciliar = ci.co_seq_fat_cad_domiciliar
LEFT JOIN tb_fat_visita_domiciliar v ON ci.nu_cpf_cidadao = v.nu_cpf_cidadao
WHERE d.st_domicilio_ativo = TRUE
  AND d.dt_atualizacao >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY d.co_seq_fat_cad_domiciliar, d.microarea, d.logradouro, d.numero, d.nu_moradores
ORDER BY status_cobertura, ultima_visita DESC NULLS LAST;
```

#### **🚨 Inconsistências CVAT2 (Cadastro Completo)**

Para aplicar o **Fator Multiplicador 1,5**, o domicílio deve estar:

1. ✅ Atualizado nos últimos 24 meses
2. ✅ Vinculado a pelo menos 1 responsável familiar válido
3. ✅ Com microárea preenchida
4. ✅ Com status ativo (não mudou/não inativado)

**Inconsistências que bloqueiam o multiplicador**:
- **Inconsistência 8**: Responsável tem cadastro individual mas sem vínculo com MICDT
- **Inconsistência 4**: Responsável cadastrado em outro domicílio sem marcar "Mudou-se" no antigo
- **Validade expirada**: Cadastro domiciliar > 24 meses sem atualização
- **Divergência de microárea**: Microárea do indivíduo ≠ microárea do domicílio

---

### **9. tb_fat_cidadao_pec**
**Tipo**: Tabela consolidadora
**Indicadores**: CVAT (todos)
**Função**: Agrupamento único por CNS/CPF

---

## 📐 TABELAS DE DIMENSÃO (tb_dim_*)

### **10. tb_dim_equipe**
**FK**: `co_dim_equipe_1`
**Conteúdo**: INE (Identificador Nacional de Equipes)

### **11. tb_dim_unidade_saude**
**FK**: `co_dim_unidade_saude_1`
**Conteúdo**: CNES da UBS

### **12. tb_dim_cbo**
**FK**: `co_dim_cbo_1`
**Conteúdo**: Código Brasileiro de Ocupação (validação de profissional APS)

### **13. tb_dim_tempo**
**FK**: `co_dim_tempo`
**Conteúdo**: Janelas temporais (12 meses acompanhamento, 24 meses cadastro)

### **14. tb_dim_municipio**
**FK**: `co_dim_municipio`
**Conteúdo**: Código IBGE

### **15. tb_dim_faixa_etaria**
**FK**: `co_dim_faixa_etaria`
**Conteúdo**: Faixas etárias padronizadas

### **16. tb_dim_sexo**
**FK**: `co_dim_sexo`
**Conteúdo**: Sexo/Gênero

### **17. tb_dim_tipo_atendimento**
**FK**: `co_dim_tipo_atendimento`
**Conteúdo**: Escuta inicial/urgência vs demanda programada

### **18. tb_dim_turno**
**FK**: `co_dim_turno`
**Conteúdo**: Classificação de turno (manhã/tarde/noite)

---

---

## 🗺️ QUERIES INTEGRADAS - Análise Territorial de Visitas

### **Dashboard de Cobertura Territorial por Microárea**
```sql
-- Cobertura de visitas domiciliares por microárea nos últimos 30 dias
WITH domicilios_ativos AS (
    SELECT
        d.microarea,
        COUNT(DISTINCT d.co_seq_fat_cad_domiciliar) AS total_domicilios,
        SUM(d.nu_moradores) AS total_moradores
    FROM tb_fat_cad_domiciliar d
    WHERE d.st_domicilio_ativo = TRUE
      AND d.dt_atualizacao >= CURRENT_DATE - INTERVAL '24 months'
    GROUP BY d.microarea
),
visitas_mes AS (
    SELECT
        ci.microarea,
        COUNT(DISTINCT v.nu_cpf_cidadao) AS cidadaos_visitados,
        COUNT(*) AS total_visitas,
        COUNT(CASE WHEN v.st_desfecho = 'Visita realizada' THEN 1 END) AS visitas_realizadas
    FROM tb_fat_visita_domiciliar v
    INNER JOIN tb_fat_cad_individual ci ON v.nu_cpf_cidadao = ci.nu_cpf_cidadao
    WHERE v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY ci.microarea
)
SELECT
    da.microarea,
    da.total_domicilios,
    da.total_moradores,
    COALESCE(vm.cidadaos_visitados, 0) AS cidadaos_visitados,
    COALESCE(vm.total_visitas, 0) AS total_visitas,
    COALESCE(vm.visitas_realizadas, 0) AS visitas_realizadas,
    ROUND(100.0 * COALESCE(vm.cidadaos_visitados, 0) / NULLIF(da.total_moradores, 0), 1) AS perc_cobertura
FROM domicilios_ativos da
LEFT JOIN visitas_mes vm ON da.microarea = vm.microarea
ORDER BY perc_cobertura DESC;
```

### **Mapa de Calor - Horários de Pico de Visitas**
```sql
-- Distribuição de visitas por hora e dia da semana
SELECT
    TO_CHAR(dt_inicial_atendimento, 'Day') AS dia_semana,
    EXTRACT(DOW FROM dt_inicial_atendimento) AS dia_num,
    EXTRACT(HOUR FROM dt_inicial_atendimento) AS hora,
    COUNT(*) AS total_visitas,
    COUNT(CASE WHEN st_desfecho = 'Visita realizada' THEN 1 END) AS realizadas,
    ROUND(AVG(EXTRACT(EPOCH FROM (dt_final_atendimento - dt_inicial_atendimento))/60), 1) AS duracao_media
FROM tb_fat_visita_domiciliar
WHERE dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY dia_semana, dia_num, hora
ORDER BY dia_num, hora;
```

### **Ranking de Produtividade ACS por Turno**
```sql
-- Top ACS por turno com métricas de qualidade
SELECT
    p.nome_profissional,
    t.descricao_turno,
    e.nome_equipe,
    u.nome_unidade,
    COUNT(*) AS total_visitas,
    COUNT(DISTINCT v.nu_cpf_cidadao) AS familias_distintas,
    COUNT(CASE WHEN v.st_desfecho = 'Visita realizada' THEN 1 END) AS realizadas,
    ROUND(100.0 * COUNT(CASE WHEN v.st_desfecho = 'Visita realizada' THEN 1 END) / NULLIF(COUNT(*), 0), 1) AS taxa_sucesso,
    ROUND(AVG(EXTRACT(EPOCH FROM (v.dt_final_atendimento - v.dt_inicial_atendimento))/60), 1) AS duracao_media_min,
    COUNT(CASE WHEN v.st_motivo_visita IS NULL THEN 1 END) AS visitas_sem_motivo
FROM tb_fat_visita_domiciliar v
INNER JOIN tb_dim_profissional p ON v.co_dim_profissional_1 = p.co_seq_dim_profissional
INNER JOIN tb_dim_turno t ON v.co_dim_turno = t.co_seq_dim_turno
INNER JOIN tb_dim_equipe e ON v.co_dim_equipe_1 = e.co_seq_dim_equipe
INNER JOIN tb_dim_unidade_saude u ON v.co_dim_unidade_saude_1 = u.co_seq_dim_unidade_saude
INNER JOIN tb_dim_cbo cbo ON v.co_dim_cbo_1 = cbo.co_seq_dim_cbo
WHERE cbo.codigo_cbo = '515105'
  AND v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.nome_profissional, t.descricao_turno, e.nome_equipe, u.nome_unidade
HAVING COUNT(*) > 0
ORDER BY total_visitas DESC, taxa_sucesso DESC
LIMIT 20;
```

### **Análise de Domicílios Não Visitados (Risco de Perda CVAT)**
```sql
-- Domicílios ativos sem visita nos últimos 60 dias
SELECT
    d.microarea,
    d.logradouro,
    d.numero,
    d.nu_moradores,
    d.dt_atualizacao AS ultima_atualizacao_cadastro,
    MAX(v.dt_inicial_atendimento) AS ultima_visita,
    CURRENT_DATE - MAX(v.dt_inicial_atendimento) AS dias_sem_visita,
    CASE
        WHEN MAX(v.dt_inicial_atendimento) IS NULL THEN 'Nunca visitado'
        WHEN CURRENT_DATE - MAX(v.dt_inicial_atendimento) > 180 THEN 'Crítico (>6 meses)'
        WHEN CURRENT_DATE - MAX(v.dt_inicial_atendimento) > 90 THEN 'Alerta (>3 meses)'
        ELSE 'Atenção (>60 dias)'
    END AS status_risco
FROM tb_fat_cad_domiciliar d
LEFT JOIN tb_fat_cad_individual ci ON d.co_seq_fat_cad_domiciliar = ci.co_seq_fat_cad_domiciliar
LEFT JOIN tb_fat_visita_domiciliar v ON ci.nu_cpf_cidadao = v.nu_cpf_cidadao
    AND v.dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 months'
WHERE d.st_domicilio_ativo = TRUE
  AND d.dt_atualizacao >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY d.co_seq_fat_cad_domiciliar, d.microarea, d.logradouro, d.numero, d.nu_moradores, d.dt_atualizacao
HAVING MAX(v.dt_inicial_atendimento) IS NULL
    OR CURRENT_DATE - MAX(v.dt_inicial_atendimento) > 60
ORDER BY dias_sem_visita DESC NULLS FIRST, d.nu_moradores DESC;
```

### **Validação CVAT5 - Cidadãos Acompanhados com Múltiplos Contatos**
```sql
-- Cidadãos com pelo menos 2 contatos (1 deve ser visita ou atendimento)
WITH contatos_cidadao AS (
    SELECT nu_cpf_cidadao, dt_inicial_atendimento, 'Visita' AS tipo
    FROM tb_fat_visita_domiciliar
    WHERE dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 months'
      AND st_motivo_visita IS NOT NULL

    UNION ALL

    SELECT nu_cpf_cidadao, dt_inicial_atendimento, 'Atendimento' AS tipo
    FROM tb_fat_atendimento_individual
    WHERE dt_inicial_atendimento >= CURRENT_DATE - INTERVAL '12 months'

    UNION ALL

    SELECT nu_cpf_cidadao, dt_realizacao, 'Procedimento' AS tipo
    FROM tb_fat_procedimento
    WHERE dt_realizacao >= CURRENT_DATE - INTERVAL '12 months'

    UNION ALL

    SELECT nu_cpf_cidadao, dt_vacinacao, 'Vacinação' AS tipo
    FROM tb_fat_vacinacao
    WHERE dt_vacinacao >= CURRENT_DATE - INTERVAL '12 months'
)
SELECT
    c.nu_cpf_cidadao,
    ci.nome_cidadao,
    ci.microarea,
    COUNT(*) AS total_contatos,
    COUNT(CASE WHEN c.tipo = 'Visita' THEN 1 END) AS visitas,
    COUNT(CASE WHEN c.tipo = 'Atendimento' THEN 1 END) AS atendimentos,
    COUNT(CASE WHEN c.tipo = 'Procedimento' THEN 1 END) AS procedimentos,
    COUNT(CASE WHEN c.tipo = 'Vacinação' THEN 1 END) AS vacinacoes,
    CASE
        WHEN COUNT(*) >= 2
            AND (COUNT(CASE WHEN c.tipo IN ('Visita', 'Atendimento') THEN 1 END) >= 1)
        THEN 'ACOMPANHADO ✓'
        ELSE 'NÃO ACOMPANHADO ✗'
    END AS status_cvat5
FROM contatos_cidadao c
INNER JOIN tb_fat_cad_individual ci ON c.nu_cpf_cidadao = ci.nu_cpf_cidadao
GROUP BY c.nu_cpf_cidadao, ci.nome_cidadao, ci.microarea
HAVING COUNT(*) >= 1
ORDER BY total_contatos DESC, status_cvat5;
```

---

## 🔗 REGRAS DE JOIN OBRIGATÓRIAS

**CRÍTICO**: Todas as queries nas tabelas FATO devem fazer JOIN com:
- `co_dim_municipio`
- `co_dim_unidade_saude_1` (CNES)
- `co_dim_equipe_1` (INE)
- `co_dim_cbo_1` (validação MS)

**Motivo**: Atendimento por CBO não autorizado é descartado pelo Ministério da Saúde.

---

## 🚨 INCONSISTÊNCIAS DE CADASTRO (Pendências LEDI)

**Fonte**: Cruzamento `tb_fat_cad_individual` ↔ `tb_fat_cad_domiciliar`

1. **Inconsistência 3**: Responsável não declarado
2. **Inconsistência 4**: Responsável em outro domicílio
3. **Inconsistência 6**: Óbito sem novo responsável
4. **Inconsistência 8**: Sem vínculo com domicílio
5. **Validade 24m**: Cadastro desatualizado
6. **Divergência Microárea**: Individual ≠ Domiciliar

---

## 📡 INTEGRAÇÃO EXTERNA

### **API LEDI (Correção via Thrift)**
- Endpoint: `POST /api/v1/recebimento/ficha`
- Formato: `.esus` (binário Thrift)
- Status: 200 (sucesso), 400 (validação), 5xx (desserialização)

### **Meu SUS Digital (CVAT6)**
- Fonte: RNDS (Rede Nacional de Dados em Saúde)
- Denominador: Total de linhas `tb_fat_atendimento_individual`
- Gatilho: 5% de avaliações = Bônus de Satisfação

---

## 🎯 MAPA DE COBERTURA POR INDICADOR

| Indicador | Tabelas Principais | Modelo Info |
|-----------|-------------------|-------------|
| **C1-C6** | `tb_fat_atendimento_individual` | MIAI |
| **C7** | `tb_fat_atendimento_individual`, `tb_fat_procedimento` | MIAI + MIP |
| **B1-B4, B6** | `tb_fat_atendimento_odonto`, `tb_fat_procedimento` | MIAOI + MIP |
| **B5** | `tb_fat_atividade_coletiva` | MIAC |
| **M1-M2** | `tb_fat_atendimento_individual`, `tb_fat_atividade_coletiva` | MIAI + MIAC |
| **CVAT1** | `tb_fat_cad_individual` | MICI |
| **CVAT2** | `tb_fat_cad_individual`, `tb_fat_cad_domiciliar` | MICI + MICDT |
| **CVAT3** | `tb_fat_cad_individual` + batimento federal | MICI |
| **CVAT4** | `tb_fat_cad_individual` | MICI |
| **CVAT5** | `tb_fat_atendimento_individual`, `tb_fat_atendimento_odonto`, `tb_fat_visita_domiciliar`, `tb_fat_atividade_coletiva`, `tb_fat_procedimento`, `tb_fat_vacinacao` | Todos |
| **CVAT6** | `tb_fat_atendimento_individual` + API RNDS | MIAI |

---

**Total de tabelas mapeadas**: 18 (9 fato + 9 dimensão)
