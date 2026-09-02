Aqui está o mapa técnico detalhado do Data Warehouse do e-SUS APS (DW PEC), estruturado para a sua equipe de engenharia construir as queries SQL do Motor de Pendências e Indicadores no sistema sus-analytics-sync.
Com base no dicionário de dados do PEC e nos modelos de informação (MIAI, MIAOI, MICI, MICDT, etc.), correlacionei os 21 indicadores (15 de Qualidade + 6 do CVAT) com suas respectivas tabelas Fato (tb_fat_...), Dimensão (co_dim_...) e campos de rastreamento
.

--------------------------------------------------------------------------------
🟢 BLOCO 1: Cuidado Integral (APS Padrão) - C1 a C7
A tabela principal para todos estes indicadores é a tb_fat_atendimento_individual, que armazena a produção clínica do Modelo de Informação de Atendimento Individual (MIAI)
.
C1 - Mais Acesso à APS
Tabela: tb_fat_atendimento_individual
Campos essenciais: co_dim_tipo_atendimento (para diferenciar escuta inicial/urgência de demanda programada continuada), co_dim_cbo_1 (médicos e enfermeiros), co_dim_equipe_1 (INE)
.
C2 - Cuidado no Desenvolvimento Infantil
Tabelas: tb_fat_atendimento_individual, tb_fat_vacinacao (MIV), tb_fat_visita_domiciliar (MIVDT).
Campos essenciais (Atendimento): nu_peso, nu_altura, nu_perimetro_cefalico, co_dim_faixa_etaria (para filtrar < 2 anos), st_vacinacao_em_dia
.
C3 - Cuidado na Gestação e no Puerpério
Tabela: tb_fat_atendimento_individual
Campos essenciais: nu_idade_gestacional_semanas (para validar se a 1ª consulta foi até a 20ª semana), ds_filtro_cids (ex: Z34 para supervisão de gravidez), ds_filtro_ciaps (ex: W78 para gravidez), ds_filtro_proced_avaliados e ds_filtro_proced_solicitados (para capturar os códigos SIGTAP de Sífilis e HIV, ex: 02.14.01.007-4)
.
C4 - Cuidado da Pessoa com Diabetes
Tabela: tb_fat_atendimento_individual
Campos essenciais: ds_filtro_cids (E10 a E14), ds_filtro_ciaps (T89, T90), nu_peso, nu_altura, ds_filtro_proced_avaliados ou ds_filtro_proced_solicitados (código SIGTAP 02.02.01.05-03 para HbA1c)
.
C5 - Cuidado da Pessoa com Hipertensão
Tabela: tb_fat_atendimento_individual
Campos essenciais: ds_filtro_cids (I10 a I15), ds_filtro_ciaps (K86, K87), nu_medicao_pressao_sistolica, nu_medicao_pressao_diastolica, nu_peso, nu_altura
.
C6 - Cuidado da Pessoa Idosa
Tabela: tb_fat_atendimento_individual
Campos essenciais: co_dim_faixa_etaria (filtrar idosos 60+), nu_peso, nu_altura (avaliação antropométrica exigida no indicador), ds_filtro_proced_avaliados (para avaliar se houve aplicação de escalas funcionais como VES-13, se parametrizado localmente)
.
C7 - Cuidado da Mulher na Prevenção do Câncer
Tabelas: tb_fat_atendimento_individual e tb_fat_procedimento.
Campos essenciais: co_dim_faixa_etaria (25 a 64 anos), co_dim_sexo (feminino ou homem trans), ds_filtro_proced_avaliados / ds_filtro_proced_solicitados (códigos SIGTAP 02.01.02.003-3 para exame citopatológico)
.

--------------------------------------------------------------------------------
🔵 BLOCO 2: Saúde Bucal (eSB) - B1 a B6
Estes indicadores derivam principalmente do Modelo de Informação de Atendimento Odontológico Individual (MIAOI) e Atividade Coletiva (MIAC)
.
B1 - 1ª Consulta Odontológica Programada
Tabela provável: tb_fat_atendimento_odonto
Campos essenciais: co_dim_cbo_1 (Cirurgião-Dentista), campo de tipo de consulta (para capturar a 1ª consulta programada odontológica).
B2 - Tratamento Odontológico Concluído
Tabela provável: tb_fat_atendimento_odonto
Campos essenciais: st_conduta_alta_episodio ou campo equivalente de desfecho/alta odontológica do tratamento.
B3 - Taxa de Exodontias
Tabela provável: tb_fat_atendimento_odonto e tb_fat_procedimento
Campos essenciais: Códigos SIGTAP específicos de extração dentária registrados no atendimento do dentista
.
B4 - Procedimentos Odontológicos Preventivos
Tabela provável: tb_fat_atendimento_odonto e tb_fat_procedimento
Campos essenciais: Códigos SIGTAP de prevenção (profilaxia, aplicação tópica de flúor, selantes)
.
B5 - Escovação Supervisionada
Tabela provável: tb_fat_atividade_coletiva
Campos essenciais: Tema da atividade (Saúde Bucal/Escovação), público alvo (co_dim_faixa_etaria escolar 6 a 12 anos), número de participantes
.
B6 - Tratamento Restaurador Atraumático (ART)
Tabela provável: tb_fat_atendimento_odonto
Campos essenciais: Códigos SIGTAP/Procedimentos específicos da técnica ART (restauração sem uso de motor de alta rotação)
.

--------------------------------------------------------------------------------
🟣 BLOCO 3: Equipe Multiprofissional (eMulti) - M1 e M2
Os indicadores da eMulti focam na integração. A tabela principal volta a ser a tb_fat_atendimento_individual, cruzada com a dimensão de profissionais
.
M1 - Média de Atendimentos da eMulti por Pessoa
Tabela: tb_fat_atendimento_individual
Campos essenciais: co_dim_cbo_1 (filtrando psicólogos, fisioterapeutas, nutricionistas vinculados à eMulti), nu_cpf_cidadao (para calcular a média por usuário único atendido)
.
M2 - Ações Interprofissionais da eMulti
Tabela: tb_fat_atendimento_individual e tb_fat_atividade_coletiva
Campos essenciais: st_conduta_agendamento_emulti (indica agendamento cruzado), co_dim_profissional_2 (profissional auxiliar no atendimento compartilhado), e campos legados de transição como st_nasf_aval_diagnostico (agora substituídos por st_emulti_...)
.

--------------------------------------------------------------------------------
🟠 BLOCO 4: Vínculo e Acompanhamento Territorial (CVAT) - CVAT 1 a 6
Estes são os "6 subindicadores" territoriais regulamentados pela NT 30/2025, focados nas tabelas de Cadastro (MICI/MICDT) e na frequência de atendimentos
.
CVAT1 - Cadastro Individual Válido (Regra dos 24 meses)
Tabela provável: tb_fat_cad_individual (ou tabela de consolidação tb_fat_cidadao_pec)
.
Campos essenciais: Data de preenchimento/atualização do cadastro (deve ser <= 24 meses), nu_cpf_cidadao, nu_cns válidos, flag de status indicando recusa ou mudança de território
. (Cadastros rápidos gerados via atendimento não pontuam aqui).
CVAT2 - Completude Domiciliar (Multiplicador 1.5)
Tabelas: tb_fat_cad_individual (MICI) vinculada por chave estrangeira à tb_fat_cad_domiciliar (MICDT).
Campos essenciais: Identificador do domicílio amarrado ao indivíduo, data de atualização do MICDT (<= 24 meses)
. O motor SQL precisará validar se o cidadão reside num endereço com MICDT atualizado.
CVAT3 - Vulnerabilidade Socioeconômica (Peso 1.3)
Tabela: Cruzamento externo / tb_fat_cad_individual
Campos essenciais: Marcadores de Benefício de Prestação Continuada (BPC) e Programa Bolsa Família (PBF) oriundos de batimento federal, geralmente marcados em status na base central, mas que refletem campos sociais do cadastro local
.
CVAT4 - Perfil Demográfico (Peso 1.2 ou 2.5 combinado)
Tabelas: tb_fat_cad_individual / tb_fat_atendimento_individual
Campos essenciais: dt_nascimento ou co_dim_faixa_etaria
. O SQL deve classificar as faixas < 5 anos ou > 60 anos para aplicar o multiplicador
.
CVAT5 - Pessoa Acompanhada (Regra da Prática de Cuidado em 12m)
Tabelas: tb_fat_atendimento_individual, tb_fat_atendimento_odonto, tb_fat_visita_domiciliar, tb_fat_atividade_coletiva, tb_fat_procedimento.
Campos essenciais: dt_inicial_atendimento e nu_cpf_cidadao. A query precisa fazer um COUNT de eventos no CPF nos últimos 12 meses. A regra de negócio exige COUNT > 1, sendo obrigatório que pelo menos um evento venha das tabelas de prática clínica (MIAI, MIAOI, MIAC, MIVDT)
.
CVAT6 - Bônus de Satisfação do Usuário
Tabela: Base nacional / API do Meu SUS Digital.
Campos essenciais: Embora o município não registre isso ativamente no PEC (o cidadão avalia no aplicativo), o DW local precisará cruzar a volumetria de tb_fat_atendimento_individual (denominador de atendimentos) com os relatórios federais de NPS devolvidos pela RNDS/Sisab, avaliando se as respostas atingiram o gatilho de 5% do total de atendimentos
.
🚨 Alerta Arquitetural para o sus-analytics-sync:
Ao construir as visões analíticas, todas as queries nessas tabelas Fato (especialmente tb_fat_atendimento_individual) devem obrigatoriamente realizar um JOIN com as chaves co_dim_municipio, co_dim_unidade_saude_1 (CNES), co_dim_equipe_1 (INE) e co_dim_cbo_1 (CBO do profissional). Se um atendimento for registrado por um CBO não autorizado pelo indicador (ex: recepcionista preenchendo campo restrito a enfermeiro), o Ministério da Saúde descartará esse registro no processamento federal
.
Quais são os principais campos da tabela fato do atendimento individual?

A tabela tb_fat_atendimento_individual é a estrutura central do Data Warehouse (DW PEC) do e-SUS APS para armazenar dados de atendimentos
. Ela é populada sempre que os dados de um atendimento individual são processados, o que inclui a recepção de fichas importadas de sistemas terceiros, atendimentos de puericultura, pré-natal, preenchimento no sistema de Coleta de Dados Simplificada (CDS) e escuta inicial por profissional de nível superior (exceto de odontologia)
.
Para compreender a amplitude dos dados armazenados e facilitar a extração de informações para os indicadores, os principais campos dessa tabela fato são divididos nas seguintes categorias:
1. Metadados e Identificação do Cidadão
Estes campos garantem o rastreamento do registro e a identificação única do paciente na base de dados:
nu_cpf_cidadao e nu_cns: Armazenam, respectivamente, o CPF e o Cartão Nacional de Saúde do cidadão atendido
.
dt_nascimento: Data de nascimento do cidadão
.
nu_prontuario: Número do prontuário do cidadão, mantido de forma criptografada por questões de privacidade e segurança
.
nu_uuid_ficha: Identificador universalmente único (UUID) que permite rastrear o registro específico da ficha de atendimento
.
nu_atendimento: Uma mesma ficha pode conter mais de um atendimento; esse campo é utilizado para ordenar os atendimentos realizados dentro de um mesmo envio
.
2. Medições Clínicas, Sinais Vitais e Antropometria
Estes campos guardam os dados vitais e métricas aferidas no momento do atendimento, sendo essenciais para contabilizar o acompanhamento de condições crônicas:
Pressão Arterial: nu_medicao_pressao_sistolica (pressão sistólica em mmHg) e nu_medicao_pressao_diastolica (pressão diastólica em mmHg)
.
Antropometria: nu_peso (peso em kg) e nu_altura (altura em centímetros)
.
Sinais Vitais Adicionais: nu_medicao_freq_respiratoria (frequência respiratória em mpm), nu_medicao_freq_cardiaca (frequência cardíaca em bpm), nu_medicao_temperatura (temperatura em ºC) e nu_medicao_saturacao_o2 (saturação de oxigênio em percentual)
.
Medições Específicas: nu_medicao_glicemia (glicemia capilar em mg/dL), nu_medicao_circ_abdominal (circunferência abdominal), nu_medicao_perim_pantrlha (perímetro da panturrilha) e nu_perimetro_cefalico (perímetro cefálico em cm)
.
3. Dados Gestacionais e de Saúde da Criança
Informações fundamentais para os indicadores de cuidado na gestação e puerpério, bem como para o acompanhamento infantil:
Gestação: nu_idade_gestacional_semanas (idade gestacional aferida em semanas), nu_gestas_previas (número de gestações anteriores), nu_partos (número de partos que a mulher já teve) e o campo st_gravidez_planejada, que indica o status booleano do planejamento familiar
.
Imunização: st_vacinacao_em_dia, que registra se o calendário vacinal do paciente está em dia naquele momento
.
4. Filtros Clínicos (Diagnósticos, Condições e Exames)
Campos que agrupam os códigos padronizados utilizados pelo profissional para relatar as condições de saúde e o plano terapêutico:
Diagnósticos e Problemas: ds_filtro_cids (agrupa todas as CIDs-10 registradas no atendimento) e ds_filtro_ciaps (agrupa todas as classificações CIAP-2)
.
Exames: ds_filtro_proced_solicitados (agrupa as solicitações de exames feitas) e ds_filtro_proced_avaliados (agrupa os resultados de exames avaliados no dia)
.
5. Condutas, Desfechos e Encaminhamentos
Descrevem qual foi a ação e o destino definido para o paciente ao final da consulta:
Condutas da Atenção Primária: Campos de status como st_conduta_alta_episodio (alta), st_conduta_consulta_agendada (retorno programado), st_conduta_cuidd_conti_program (cuidado continuado) e st_conduta_agendamento_grupos
.
Ações eMulti/Nasf: st_conduta_agendamento_emulti (indica se o atendimento foi agendado para a equipe multiprofissional)
. A tabela também possui campos legados de transição como st_nasf_avaliacao_diagnostico, st_nasf_proce_clin_terapeutico e st_nasf_prescricao_terapeutica, que foram substituídos pelos equivalentes do modelo eMulti a partir da versão 5.5.0 do LEDI
.
Encaminhamentos na Rede: Variáveis como st_encaminhamento_serv_special (serviço especializado), st_encaminhamento_caps (saúde mental), st_encaminhamento_urgencia (urgência), st_encaminhamento_intern_hospi (internação) e st_encaminhamento_servico_ad (atenção domiciliar)
.
6. Relacionamento Temporal e Chaves Estrangeiras (Dimensões)
As chaves estrangeiras conectam a tabela de fatos com as tabelas de dimensão que fornecem o contexto de quando, onde e por quem a ação foi realizada:
Tempo de Atendimento: dt_inicial_atendimento e dt_final_atendimento (marcam o início e o fim da ação clínica em formato de data e hora)
.
Dados Geográficos e de Estrutura: co_dim_municipio (identifica o município)
, co_dim_unidade_saude_1 (identifica a unidade de saúde/CNES do profissional responsável) e co_dim_equipe_1 (identifica a equipe/INE do responsável)
.
Perfil Profissional: co_dim_profissional_1 (identifica quem executou o atendimento) e co_dim_cbo_1 (Código Brasileiro de Ocupação do profissional, essencial para as regras de validação do Ministério da Saúde)
.
Perfil Demográfico e Contexto: co_dim_faixa_etaria, co_dim_sexo
 e co_dim_tipo_atendimento
. O co_dim_tipo_ficha identifica qual modelo estruturou a entrada daquele dado
.
Hoje • 04:16
Quais são as tabelas essenciais para o cálculo do CVAT?

Para operacionalizar o cálculo do Componente de Vínculo e Acompanhamento Territorial (CVAT) no Data Warehouse (DW PEC) do e-SUS APS, é necessário extrair informações de dois grupos principais de tabelas: as responsáveis pela Dimensão Cadastro e as responsáveis pela Dimensão Acompanhamento.
Abaixo estão as tabelas de fatos e dimensões essenciais para estruturar o motor de cálculo:
1. Tabelas da Dimensão Cadastro (30% do escore)
Estas tabelas validam se o cidadão possui um cadastro ativo, no prazo correto e cruzam os dados para aplicação dos pesos de vulnerabilidade.
tb_fat_cad_individual: É a tabela central que armazena os dados do Modelo de Informação de Cadastro Individual (MICI)
. Ela é usada para:
Verificar se o cadastro foi incluído ou atualizado nos últimos 24 meses (CVAT1)
.
Filtrar a data de nascimento para aplicar o peso demográfico de 1,2 para crianças (< 5 anos) ou idosos (> 60 anos) (CVAT4)
.
Nota: O sistema não pontua cadastros rápidos gerados diretamente em atendimentos
.
tb_fat_cad_domiciliar: Armazena o Modelo de Informação de Cadastro Domiciliar e Territorial (MICDT)
. O cruzamento desta tabela com a tb_fat_cad_individual é obrigatório para aplicar o Fator de Multiplicação 1,5, conferido apenas a cidadãos que possuem cadastro completo e válido na base territorial
.
tb_fat_cidadao_pec: Tabela consolidadora que facilita o agrupamento do indivíduo de forma única através do seu CNS ou CPF.
2. Tabelas da Dimensão Acompanhamento (70% do escore)
Para que uma pessoa seja considerada "acompanhada", a equipe precisa registrar mais de um contato assistencial no período de 12 meses, sendo obrigatoriamente um deles uma "prática de cuidado"
. O motor SQL precisará contar os eventos agrupando os registros das seguintes tabelas:
Tabelas de Prática de Cuidado (Obrigatório ao menos 1 registro em 12 meses):
tb_fat_atendimento_individual: Registra as consultas clínicas e multiprofissionais (Modelo de Informação de Atendimento Individual - MIAI)
.
tb_fat_atendimento_odonto: Registra as avaliações com o cirurgião-dentista (MIAOI)
.
tb_fat_atividade_coletiva: Registra as ações de educação e grupos operativos em saúde (MIAC)
.
tb_fat_visita_domiciliar: Registra as visitas realizadas pelos Agentes Comunitários de Saúde (ACS) ou outros membros da equipe (MIVDT)
.
Tabelas de Procedimentos (Combináveis para o "Segundo Contato"):
tb_fat_procedimento e Tabela de Vacinação (ex: tb_fat_vacinacao): Guardam o Modelo de Informação de Procedimentos (MIP) e de Vacinação (MIV). A medição de uma pressão arterial ou a aplicação de uma vacina contam para o acompanhamento se combinadas com uma das práticas de cuidado acima
.
3. Tabelas de Dimensões (Relacionamentos e Filtros de Validação)
Para garantir que o contato assistencial seja vinculado à equipe correta e validado pelas regras federais, todas as consultas às tabelas fato (como a tb_fat_atendimento_individual) devem utilizar chaves estrangeiras (JOINs) com as tabelas de dimensão:
tb_dim_equipe (via co_dim_equipe_1): Valida o Identificador Nacional de Equipes (INE) para atribuir o vínculo do usuário à equipe em que ele possui maior número de atendimentos ou o atendimento mais recente
.
tb_dim_unidade_saude (via co_dim_unidade_saude_1): Relaciona o atendimento ao CNES da Unidade Básica de Saúde
.
tb_dim_cbo (via co_dim_cbo_1): Filtra se o procedimento ou atendimento foi realizado por um profissional compatível com as regras da APS
.
tb_dim_tempo (via co_dim_tempo ou campos de data direta como dt_inicial_atendimento): Fundamental para aplicar a janela temporal estrita (12 meses para acompanhamento e 24 meses para cadastro)
.
4. Integração Externa (Bônus de Satisfação)
Para o Bônus de Satisfação (CVAT6), o sistema utiliza o total de linhas geradas na tb_fat_atendimento_individual para obter o total de atendimentos do quadrimestre. Esse volume funciona como o denominador para calcular a taxa de respostas provenientes do aplicativo Meu SUS Digital (hospedado na Rede Nacional de Dados em Saúde - RNDS), determinando se a equipe atingiu o gatilho de 5% de avaliações.
quais campos da tabela do PEC são responsaveis por todos os dados referente a visita ao atendimento dos agentes de saude - ACS quero saber todos os dados importantes e que contam em indicadores municipais e administração dos serviços realizados pelo agente de saude como quantidade de visitas domiciliares, turno das visitas, geolocalização. campos atualizados que somam como pendentes para um perfil atulizado para que geramos uma boa administração dos seviços e que possamos usar LEDI para correção

Os dados referentes ao trabalho dos Agentes Comunitários de Saúde (ACS) são o alicerce do Componente de Vínculo e Acompanhamento Territorial (CVAT) no novo modelo Saúde Brasil 360
. Para administrar o quantitativo de visitas, turnos, geolocalização e as pendências que afetam os indicadores municipais, você precisará extrair e cruzar dados de três modelos de informação principais: Visita Domiciliar (MIVDT), Cadastro Individual (MICI) e Cadastro Domiciliar (MICDT)
.
Abaixo, detalho os campos, as tabelas, o mapeamento de pendências e o fluxo de correção via LEDI.
1. Dados de Visita Domiciliar e Acompanhamento
As visitas domiciliares realizadas pelo ACS são registradas no e-SUS Território (aplicativo móvel) ou no CDS e armazenadas na tabela Fato tb_fat_visita_domiciliar
. Para que a visita conte no indicador de Acompanhamento (que exige no mínimo um contato no ano)
, os seguintes campos são críticos:
Identificação e Validação:
nu_cpf_cidadao e nu_cns: CPF e Cartão do SUS do cidadão visitado
.
co_dim_profissional_1 e co_dim_cbo_1: Identifica o ACS (CBO 515105). É crucial para validar quem fez a visita
.
co_dim_equipe_1 (INE) e co_dim_unidade_saude_1 (CNES): Vinculam a produção do ACS à equipe correta
.
Quantidade e Turno das Visitas:
dt_inicial_atendimento e dt_final_atendimento: Registram a data e hora exatas da visita
. A partir desses campos de timestamp, o seu sistema de banco de dados pode extrair a hora para gerar dashboards de turnos das visitas (manhã, tarde ou noite).
co_dim_turno: Tabela de dimensão que também auxilia a classificar diretamente o turno do atendimento
.
Regras de Negócio e Indicadores (Campos Clínicos do ACS):
Motivo da Visita (st_motivo_visita): Para que a visita domiciliar seja considerada uma "boa prática" válida para o cofinanciamento, o ACS deve obrigatoriamente preencher o motivo da visita (ex: gestante, criança, idoso, busca ativa)
.
Desfecho da Visita (st_desfecho): O Ministério da Saúde contabiliza para fins de apuração de indicadores as visitas com desfechos: Visita realizada, Visita recusada ou Ausente
.
Antropometria (Peso e Altura): As medições de peso e altura aferidas e registradas pelo ACS durante a visita na tabela tb_fat_visita_domiciliar agora contam validamente para os indicadores C4 (Diabetes), C5 (Hipertensão) e C6 (Pessoa Idosa)
.
Geolocalização:
A geolocalização exata (Lat/Long) é capturada via GPS pelo aplicativo e-SUS Território no momento da visita
. No Data Warehouse analítico, a distribuição geográfica é geralmente traduzida pelas chaves de território: Microárea do cidadão, e dimensões geográficas como co_dim_municipio e o endereço na tabela de cadastro domiciliar
.

--------------------------------------------------------------------------------
2. Monitoramento de Pendências (Perfil Atualizado de Cadastros)
Para uma boa administração, o sistema deve monitorar as Inconsistências Locais de Cadastro geradas pelos ACS. Se os cadastros estiverem inconsistentes, o município perde o fator multiplicador de 1,5 (Cadastro Completo) no CVAT
.
O motor analítico deve mapear os seguintes erros nas tabelas tb_fat_cad_individual e tb_fat_cad_domiciliar:
Validade de 24 meses: Cadastros com a data de atualização superior a 24 meses tornam-se inválidos para financiamento. O sistema deve gerar pendência de "Ficha Desatualizada"
.
Sem Vínculo com Domicílio (Inconsistência 8): Ocorre quando o responsável familiar tem um cadastro individual, mas não foi vinculado a uma ficha de cadastro domiciliar (MICDT). É preciso cruzar o CPF/CNS do responsável entre as duas tabelas
.
Responsável não declarado (Inconsistência 3): Ocorre quando o campo booleano Cidadão é responsável familiar? está nulo ou marcado como "Não", e o campo auxiliar CPF/CNS do Responsável fica em branco no cadastro individual
.
Divergência de Microárea: O sistema deve alertar quando a Microárea informada na tb_fat_cad_individual for diferente da Microárea informada na tb_fat_cad_domiciliar para o mesmo responsável
.
Responsável em outro domicílio (Inconsistência 4): Ocorre quando o ACS cadastra a pessoa em um novo domicílio, mas esquece de atualizar a ficha do domicílio antigo marcando a flag Família Mudou-se
.
Óbito (Inconsistência 6): Quando o ACS marca a flag Óbito no cadastro individual do responsável, mas esquece de atribuir um novo responsável familiar para os demais membros vinculados àquele domicílio
.

--------------------------------------------------------------------------------
3. Como usar a API LEDI para Correção Automática (Correção Assistida)
A grande vantagem de um sistema de "correções operacionais assistidas" é identificar os problemas listados acima no painel e permitir que a equipe os corrija, enviando a solução de volta ao e-SUS PEC oficial de forma automatizada
.
Isso é feito através da API LEDI (Layout e-SUS APS de Dados e Interface), utilizando a tecnologia Apache Thrift
. O fluxo funciona assim:
Detecção Analítica: O sistema rastreia as tabelas fato (tb_fat_cad_individual e tb_fat_cad_domiciliar) em busca de pendências (ex: inconsistência de vínculo ou validade expirada)
.
Ação no Painel: O gestor ou ACS preenche os dados faltantes diretamente no dashboard da sua aplicação (ex: insere o CNS do responsável correto ou marca "Mudou-se")
.
Geração do Payload: A sua aplicação atua como um Adapter, convertendo os dados corrigidos em um arquivo binário no padrão Thrift com a extensão .esus (ex: 0000007-cfdd9b1b-2c4d-4759-b254-76564ec219f3.esus)
.
Transmissão via API: O sistema envia uma requisição POST via protocolo HTTPS para o endpoint oficial de recepção do PEC: /api/v1/recebimento/ficha
.
Monitoramento de Retorno: A API retornará o status 200 (Sucesso) se a ficha for aceita
. Se a equipe preencher um CBO errado ou houver erro de formato, a API devolverá falhas operacionais, como o Erro 400 (LEDI_VALIDATION_ERROR) ou 5xx (LEDI_DESERIALIZATION_ERROR), que devem ser monitorados pelo seu sistema para refação
.
Desta forma, os ACS param de trabalhar no escuro. O sistema monitora a completude territorial e injeta as correções direto na base primária do Ministério da Saúde via LEDI, garantindo o escore máximo (10 pontos) no financiamento por vínculo
.
Quais são os principais campos da tb_fat_atendimento_individual?
Como o sistema trata dados legados de equipes NASF e eMulti?
Quais são as regras para preenchimento da tb_fat_atendimento_individual?
Quais são as regras para preenchimento da tb_fat_atendimento_individual?

A tabela tb_fat_atendimento_individual é populada automaticamente no Data Warehouse (DW PEC) sempre que os dados referentes a um atendimento individual são processados pelo sistema
.
De acordo com a documentação oficial de integração e regras de negócio do e-SUS APS, o preenchimento desta tabela ocorre estritamente quando as seguintes situações (ou eventos) acontecem
:
Importação e Integração de Dados: Quando são recebidas fichas de atendimento individual através da importação de sistemas de terceiros (sistemas próprios que utilizam a API LEDI/Thrift) ou por meio da importação de dados de outras instalações do PEC
.
Atendimento Clínico Padrão: Quando é realizado e finalizado um registro de atendimento individual geral com o paciente
.
Puericultura: Quando é realizado um atendimento específico de puericultura (voltado ao acompanhamento do desenvolvimento infantil)
.
Pré-natal: Quando é realizado um atendimento focado no acompanhamento de pré-natal da gestante
.
Escuta Inicial (Triagem Qualificada): Quando é realizada uma escuta inicial. Neste caso, há uma regra de validação profissional: o preenchimento só ocorre se a escuta for realizada por um profissional de nível superior que não seja de odontologia
. (Os procedimentos odontológicos são direcionados para uma tabela fato própria).
Digitação em Lote (CDS): Quando a ficha de atendimento individual é preenchida através do módulo de Coleta de Dados Simplificada (CDS), que é a interface utilizada para digitar fichas de papel preenchidas em unidades que operam de forma offline
.
Relevância para a Engenharia de Dados: Para o seu projeto de monitoramento (sus-analytics-sync), entender essas regras é fundamental. Qualquer ação clínica que pretenda pontuar para os indicadores de Cuidado Integral (C1 ao C7) ou para a regra de contato assistencial do Componente de Vínculo e Acompanhamento Territorial (CVAT) precisa, obrigatoriamente, satisfazer uma dessas seis condições de entrada para que o sistema do Ministério da Saúde grave a linha na tb_fat_atendimento_individual e a valide para fins de financiamento.