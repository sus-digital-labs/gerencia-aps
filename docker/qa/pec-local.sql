-- Synthetic subset of the PEC 9.6 schema for the read-only local journeys.
CREATE TABLE tb_tipo_equipe (co_seq_tipo_equipe int PRIMARY KEY, nu_ms text);
CREATE TABLE tb_unidade_saude (co_seq_unidade_saude int PRIMARY KEY, nu_cnes text, no_unidade_saude text, st_ativo int);
CREATE TABLE tb_equipe (co_unidade_saude int, nu_ine text, no_equipe text, st_ativo int, tp_equipe int);
CREATE TABLE tb_cidadao (
  co_seq_cidadao int PRIMARY KEY, no_cidadao text, no_social text, nu_cpf text, nu_cns text,
  dt_nascimento date, dt_obito date, st_ativo_para_exibicao int, st_ativo int, st_faleceu int
);
CREATE TABLE tb_cidadao_vinculacao_equipe (
  nu_cnes text, nu_ine text, co_cidadao int, st_saida_cadastro_obito int, st_saida_cadastro_territorio int
);
CREATE TABLE tb_dim_equipe (co_seq_dim_equipe int PRIMARY KEY, nu_ine text);
CREATE TABLE tb_dim_unidade_saude (co_seq_dim_unidade_saude int PRIMARY KEY, nu_cnes text);
CREATE TABLE tb_dim_cbo (co_seq_dim_cbo int PRIMARY KEY, nu_cbo text);
CREATE TABLE tb_dim_tipo_ficha (co_seq_dim_tipo_ficha int PRIMARY KEY, nu_identificador text);
CREATE TABLE tb_dim_tipo_atendimento (co_seq_dim_tipo_atendimento int PRIMARY KEY, nu_identificador text);
CREATE TABLE tb_dim_profissional (co_seq_dim_profissional int PRIMARY KEY, nu_cns text);
CREATE TABLE tb_fat_cidadao_pec (co_seq_fat_cidadao_pec int PRIMARY KEY, co_cidadao int);
CREATE TABLE tb_dim_tempo (co_seq_dim_tempo int PRIMARY KEY, dt_registro date);
CREATE TABLE tb_dim_procedimento (co_seq_dim_procedimento int PRIMARY KEY, co_proced text);
CREATE TABLE tb_fat_atendimento_individual (
  co_dim_tempo int, nu_uuid_ficha text, nu_atendimento int, co_dim_tipo_atendimento int,
  co_dim_equipe_1 int, co_dim_unidade_saude_1 int, co_dim_cbo_1 int, co_dim_tipo_ficha int,
  co_dim_profissional_1 int, co_fat_cidadao_pec int
);
CREATE TABLE tb_fat_atend_odonto_proced (
  co_dim_tempo int, nu_uuid_ficha text, nu_atendimento int, co_dim_procedimento int, qt_procedimentos int,
  co_dim_equipe_1 int, co_dim_unidade_saude_1 int, co_dim_cbo_1 int, co_dim_tipo_ficha int,
  co_dim_profissional_1 int, co_fat_cidadao_pec int
);
CREATE TABLE tb_fat_atividade_coletiva (co_dim_tempo int);

INSERT INTO tb_tipo_equipe VALUES (1, '70'), (2, '71'), (3, '72');
INSERT INTO tb_unidade_saude VALUES (1, '9900001', 'Unidade sintética A', 1), (2, '9900002', 'Unidade sintética B', 1);
INSERT INTO tb_equipe VALUES (1, '9900000001', 'Equipe sintética APS', 1, 1),
  (2, '9900000002', 'Equipe sintética Bucal', 1, 2), (2, '9900000003', 'Equipe sintética Multi', 1, 3),
  (1, '9900000004', 'Equipe inativa', 0, 1);
INSERT INTO tb_cidadao
  SELECT i, 'Registro sintético ' || lpad(i::text, 2, '0'), NULL, NULL, NULL, DATE '2000-01-01', NULL, 1, 1, 0
  FROM generate_series(1, 53) i;
UPDATE tb_cidadao SET nu_cns = '700000000000005' WHERE co_seq_cidadao = 1;
UPDATE tb_cidadao SET nu_cns = '700000000000013', no_social = 'Nome social sintético 02' WHERE co_seq_cidadao = 2;
UPDATE tb_cidadao SET st_faleceu = 1 WHERE co_seq_cidadao = 52;
INSERT INTO tb_cidadao_vinculacao_equipe SELECT '9900001', '9900000001', i, 0, 0 FROM generate_series(1, 52) i;
INSERT INTO tb_cidadao_vinculacao_equipe VALUES ('9900002', '9900000002', 53, 0, 0);
INSERT INTO tb_dim_equipe VALUES (1, '9900000001'), (2, '9900000002');
INSERT INTO tb_dim_unidade_saude VALUES (1, '9900001'), (2, '9900002');
INSERT INTO tb_dim_cbo VALUES (1, '225142'), (2, '223208');
INSERT INTO tb_dim_tipo_ficha VALUES (1, '4'), (2, '5');
-- Surrogate keys intentionally differ from the semantic codes.
INSERT INTO tb_dim_tipo_atendimento VALUES (10, '1'), (20, '5'), (30, '-');
INSERT INTO tb_dim_profissional VALUES (1, '700000000000005');
INSERT INTO tb_fat_cidadao_pec VALUES (1, 1), (2, 2);
INSERT INTO tb_dim_tempo VALUES (20250831, '2025-08-31'), (20250930, '2025-09-30'), (20251031, '2025-10-31');
INSERT INTO tb_fat_atendimento_individual VALUES
  (20250831, 'fixture-a', 1, 10, 1, 1, 1, 1, 1, 1),
  (20250831, 'fixture-a', 1, 10, 1, 1, 1, 1, 1, 1),
  (20250831, 'fixture-b', 1, 20, 1, 1, 1, 1, 1, 2),
  (20250930, 'fixture-c', 1, 10, 1, 1, 1, 1, 1, 1),
  (20250930, 'fixture-d', 1, 30, 1, 1, 1, 1, 1, 2),
  (20251031, 'fixture-e', 1, 20, 1, 1, 1, 1, 1, 2);
INSERT INTO tb_dim_procedimento VALUES (1, '0414020138'), (2, '0307010074');
INSERT INTO tb_fat_atend_odonto_proced VALUES
  (20251031, 'fixture-f', 1, 1, 1, 2, 2, 2, 2, 1, 1),
  (20251031, 'fixture-g', 1, 2, 1, 2, 2, 2, 2, 1, 2);
INSERT INTO tb_fat_atividade_coletiva VALUES (20251031);

-- Positive M1 fixture, with two individual visits and one group participation.
ALTER TABLE tb_equipe ADD COLUMN co_seq_equipe int;
UPDATE tb_equipe SET co_seq_equipe = 3 WHERE nu_ine = '9900000003';
ALTER TABLE tb_fat_atendimento_individual ADD COLUMN co_dim_cbo_2 int,
  ADD COLUMN co_dim_profissional_2 int, ADD COLUMN co_dim_equipe_2 int, ADD COLUMN co_dim_unidade_saude_2 int;
ALTER TABLE tb_fat_atividade_coletiva ADD COLUMN co_seq_fat_atividade_coletiva int,
  ADD COLUMN nu_uuid_ficha text, ADD COLUMN co_dim_tipo_atividade int, ADD COLUMN co_dim_cbo int,
  ADD COLUMN co_dim_profissional int, ADD COLUMN co_dim_unidade_saude int, ADD COLUMN co_dim_equipe int;
CREATE TABLE tb_dim_tipo_atividade (co_seq_dim_tipo_atividade int PRIMARY KEY, nu_identificador text);
CREATE TABLE ta_lotacao (
  co_unico_lotacao text, co_equipe int, co_unidade_saude int, co_seq_talotacao int, co_prof int,
  dt_auditoria timestamp, dt_desativacao_lotacao timestamp, co_tipo_auditoria text
);
CREATE TABLE tb_prof (co_seq_prof int PRIMARY KEY, nu_cns text);
CREATE TABLE tb_fat_atvdd_coletiva_propart (
  co_dim_profssinal_participante int, co_dim_cbo_participante int, co_fat_atividade_coletiva int
);
CREATE TABLE tb_fat_atvdd_coletiva_part (co_fat_atividade_coletiva int, co_fat_cidadao_pec int);
CREATE TABLE ta_cidadao_vinculacao_equipe (
  co_cidadao int, nu_cnes text, nu_ine text, co_tipo_auditoria text,
  st_saida_cadastro_obito int, st_saida_cadastro_territorio int,
  dt_auditoria timestamp, dt_atualizacao_cadastro timestamptz, co_seq_tacidadaovinculacaoequp int
);
INSERT INTO tb_dim_equipe VALUES (3, '9900000003');
INSERT INTO tb_dim_cbo VALUES (3, '224140');
INSERT INTO tb_dim_tipo_atividade VALUES (1, '4');
INSERT INTO tb_fat_atendimento_individual (co_dim_tempo) VALUES (20250701);
INSERT INTO tb_fat_atendimento_individual (co_dim_tempo, nu_uuid_ficha, nu_atendimento,
  co_dim_equipe_1, co_dim_unidade_saude_1, co_dim_cbo_1, co_dim_tipo_ficha, co_dim_profissional_1, co_fat_cidadao_pec) VALUES
  (20251031, 'fixture-m1-a', 1, 3, 2, 3, 1, 1, 1),
  (20251031, 'fixture-m1-b', 1, 3, 2, 3, 1, 1, 1);
INSERT INTO tb_fat_atividade_coletiva (co_dim_tempo) VALUES (20250701);
INSERT INTO tb_fat_atividade_coletiva VALUES (20251031, 1, 'fixture-m1-c', 1, 3, 1, 2, 3);
INSERT INTO tb_fat_atvdd_coletiva_part VALUES (1, 2);
INSERT INTO ta_cidadao_vinculacao_equipe VALUES
  (1, '9900001', '9900000001', 'I', 0, 0, '2025-01-01', '2025-01-01T12:00:00Z', 1),
  (2, '9900001', '9900000001', 'I', 0, 0, '2025-01-01', '2025-01-01T12:00:00Z', 2);

CREATE ROLE sus_analytics_web_anton254 LOGIN NOINHERIT PASSWORD :'fixture_password';
ALTER ROLE sus_analytics_web_anton254 IN DATABASE esus SET default_transaction_read_only = on;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO sus_analytics_web_anton254;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sus_analytics_web_anton254;
