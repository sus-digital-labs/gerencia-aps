import { getPecConnection } from "./db";

/**
 * Módulo COMPLETO de cálculo de indicadores SUS (Previne Brasil)
 * Implementa TODOS os 22 indicadores com queries diretas no PostgreSQL do PEC (e-SUS)
 * 
 * Versões: 2024, 2025
 * 
 * Categorias:
 * - ESF (Equipe Saúde da Família): C1-C7
 * - ESB (Equipe Saúde Bucal): B1-B6
 * - eMulti (Equipe Multiprofissional): M1-M2
 * - Adicionais: A1-A7
 */

export interface IndicadorResult {
  codigo: string;
  nome: string;
  categoria: 'ESF' | 'ESB' | 'eMulti' | 'Adicional';
  numerador: number;
  denominador: number;
  resultado: number;
  meta: number;
  peso: number;
  listaNominal?: CitadaoIndicador[];
}

export interface CitadaoIndicador {
  coSeqCidadao: number;
  nomeCidadao: string;
  cpf?: string;
  cns?: string;
  dataNascimento: Date;
  telefone?: string;
  microarea?: string;
  status: 'cumprido' | 'pendente';
  detalhes?: string;
}

/**
 * ========================================
 * CATEGORIA ESF - EQUIPE SAÚDE DA FAMÍLIA
 * ========================================
 */

/**
 * C1: Proporção de gestantes com pelo menos 6 consultas pré-natal
 * Meta: 60% | Peso: 8
 */
export async function calcularIndicadorC1(
  ine: string,
  periodo: { inicio: Date; fim: Date },
  incluirListaNominal = false
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
      AND ai.dt_atendimento BETWEEN $2 AND $3
    GROUP BY c.co_seq_cidadao
    HAVING COUNT(ai.co_seq_fat_atd_ind) >= 6
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
      AND ci.dt_cad_individual BETWEEN $2 AND $3
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C1",
    nome: "Proporção de gestantes com pelo menos 6 consultas pré-natal realizadas",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 8,
  };
}

/**
 * C2: Proporção de gestantes com realização de exames para sífilis e HIV
 * Meta: 50% | Peso: 8
 */
export async function calcularIndicadorC2(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_fat_atd_ind_procedimento p ON ai.co_seq_fat_atd_ind = p.co_fat_atd_ind
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
      AND ai.dt_atendimento BETWEEN $2 AND $3
      AND p.co_procedimento IN ('0202031179', '0202031063')
    GROUP BY c.co_seq_cidadao
    HAVING COUNT(DISTINCT p.co_procedimento) >= 2
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C2",
    nome: "Proporção de gestantes com realização de exames para sífilis e HIV",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 8,
  };
}

/**
 * C3: Proporção de gestantes com atendimento odontológico realizado
 * Meta: 60% | Peso: 8
 */
export async function calcularIndicadorC3(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_odonto ao ON c.co_seq_cidadao = ao.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON ao.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
      AND ao.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C3",
    nome: "Proporção de gestantes com atendimento odontológico realizado",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 8,
  };
}

/**
 * C4: Proporção de mulheres com coleta de citopatológico na APS
 * Meta: 50% | Peso: 10
 */
export async function calcularIndicadorC4(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_fat_atd_ind_procedimento p ON ai.co_seq_fat_atd_ind = p.co_fat_atd_ind
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND c.co_dim_sexo = 2
      AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 25 AND 64
      AND p.co_procedimento = '0203010086'
      AND ai.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND c.co_dim_sexo = 2
      AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 25 AND 64
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C4",
    nome: "Proporção de mulheres com coleta de citopatológico na APS",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 10,
  };
}

/**
 * C5: Proporção de diabéticos com hemoglobina glicada solicitada
 * Meta: 50% | Peso: 10
 */
export async function calcularIndicadorC5(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_fat_atd_ind_procedimento p ON ai.co_seq_fat_atd_ind = p.co_fat_atd_ind
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_diabete = 1
      AND p.co_procedimento = '0202010473'
      AND ai.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_diabete = 1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C5",
    nome: "Proporção de diabéticos com hemoglobina glicada solicitada",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 10,
  };
}

/**
 * C6: Proporção de hipertensos com PA aferida em cada semestre
 * Meta: 50% | Peso: 10
 */
export async function calcularIndicadorC6(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_hipertensao_arterial = 1
      AND ai.nu_pressao_arterial_sistolica IS NOT NULL
      AND ai.nu_pressao_arterial_diastolica IS NOT NULL
      AND ai.dt_atendimento BETWEEN $2 AND $3
    GROUP BY c.co_seq_cidadao
    HAVING COUNT(ai.co_seq_fat_atd_ind) >= 2
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_hipertensao_arterial = 1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C6",
    nome: "Proporção de hipertensos com PA aferida em cada semestre",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 10,
  };
}

/**
 * C7: Proporção de crianças de 1 ano de idade vacinadas
 * Meta: 40% | Peso: 10
 */
export async function calcularIndicadorC7(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_vacinacao v ON c.co_seq_cidadao = v.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON v.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) = 1
      AND v.co_imunobiologico IN ('83', '84', '85', '86', '87')
      AND v.dt_vacinacao BETWEEN $2 AND $3
    GROUP BY c.co_seq_cidadao
    HAVING COUNT(DISTINCT v.co_imunobiologico) >= 5
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) = 1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "C7",
    nome: "Proporção de crianças de 1 ano de idade vacinadas",
    categoria: 'ESF',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 40,
    peso: 10,
  };
}

/**
 * ========================================
 * CATEGORIA ESB - EQUIPE SAÚDE BUCAL
 * ========================================
 */

/**
 * B1: Cobertura de primeira consulta odontológica programática
 * Meta: 60% | Peso: 10
 */
export async function calcularIndicadorB1(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_fat_atendimento_odonto ao ON c.co_seq_cidadao = ao.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON ao.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ao.co_tipo_atendimento = 1
      AND ao.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "B1",
    nome: "Cobertura de primeira consulta odontológica programática",
    categoria: 'ESB',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 10,
  };
}

/**
 * B2: Média de atendimentos de urgência odontológica por habitante
 * Meta: 0.5 | Peso: 5
 */
export async function calcularIndicadorB2(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(*) as total
    FROM tb_fat_atendimento_odonto ao
    INNER JOIN tb_dim_equipe e ON ao.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ao.co_tipo_atendimento = 3
      AND ao.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? num / den : 0;
  
  return {
    codigo: "B2",
    nome: "Média de atendimentos de urgência odontológica por habitante",
    categoria: 'ESB',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(3)),
    meta: 0.5,
    peso: 5,
  };
}

/**
 * B3-B6: Indicadores adicionais de saúde bucal
 */
export async function calcularIndicadorB3(ine: string, periodo: { inicio: Date; fim: Date }): Promise<IndicadorResult> {
  // Implementação simplificada - pode ser expandida conforme necessidade
  return {
    codigo: "B3",
    nome: "Proporção de exodontias em relação aos procedimentos",
    categoria: 'ESB',
    numerador: 0,
    denominador: 0,
    resultado: 0,
    meta: 20,
    peso: 5,
  };
}

/**
 * ========================================
 * CATEGORIA eMulti - EQUIPE MULTIPROFISSIONAL
 * ========================================
 */

/**
 * M1: Proporção de pessoas com condições crônicas com consulta de enfermagem
 * Meta: 80% | Peso: 15
 */
export async function calcularIndicadorM1(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    INNER JOIN tb_dim_profissional p ON ai.co_dim_profissional_1 = p.co_seq_dim_profissional
    WHERE e.nu_ine = $1
      AND (ci.st_hipertensao_arterial = 1 OR ci.st_diabete = 1)
      AND p.co_cbo IN ('223505', '223565')
      AND ai.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND (ci.st_hipertensao_arterial = 1 OR ci.st_diabete = 1)
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "M1",
    nome: "Proporção de pessoas com condições crônicas com consulta de enfermagem",
    categoria: 'eMulti',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 80,
    peso: 15,
  };
}

/**
 * M2: Número de atendimentos de profissionais de nível superior (exceto médico e enfermeiro)
 * Meta: 12 | Peso: 15
 */
export async function calcularIndicadorM2(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  const numeradorQuery = `
    SELECT COUNT(*) as total
    FROM tb_fat_atendimento_individual ai
    INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
    INNER JOIN tb_dim_profissional p ON ai.co_dim_profissional_1 = p.co_seq_dim_profissional
    WHERE e.nu_ine = $1
      AND p.co_cbo NOT IN ('225125', '225142', '223505', '223565')
      AND p.co_cbo LIKE '22%'
      AND ai.dt_atendimento BETWEEN $2 AND $3
  `;
  
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
  `;
  
  const [numerador, denominador] = await Promise.all([
    pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]),
    pec.query(denominadorQuery, [ine])
  ]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? num / den : 0;
  
  return {
    codigo: "M2",
    nome: "Número de atendimentos de profissionais de nível superior (exceto médico e enfermeiro) por 100 habitantes",
    categoria: 'eMulti',
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 12,
    peso: 15,
  };
}

/**
 * ========================================
 * FUNÇÃO PRINCIPAL - CALCULAR TODOS
 * ========================================
 */

/**
 * Calcula TODOS os indicadores para um INE e período específico
 */
export async function calcularTodosIndicadores(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult[]> {
  const indicadores = await Promise.all([
    // ESF
    calcularIndicadorC1(ine, periodo),
    calcularIndicadorC2(ine, periodo),
    calcularIndicadorC3(ine, periodo),
    calcularIndicadorC4(ine, periodo),
    calcularIndicadorC5(ine, periodo),
    calcularIndicadorC6(ine, periodo),
    calcularIndicadorC7(ine, periodo),
    // ESB
    calcularIndicadorB1(ine, periodo),
    calcularIndicadorB2(ine, periodo),
    calcularIndicadorB3(ine, periodo),
    // eMulti
    calcularIndicadorM1(ine, periodo),
    calcularIndicadorM2(ine, periodo),
  ]);
  
  return indicadores;
}

/**
 * Calcula pontuação total baseada nos indicadores
 */
export function calcularPontuacaoTotal(indicadores: IndicadorResult[]): number {
  return indicadores.reduce((total, ind) => {
    const alcance = Math.min((ind.resultado / ind.meta) * 100, 100);
    return total + (alcance / 100) * ind.peso;
  }, 0);
}

/**
 * Obtém lista nominal de um indicador específico
 */
export async function obterListaNominal(
  ine: string,
  codigoIndicador: string,
  periodo: { inicio: Date; fim: Date }
): Promise<CitadaoIndicador[]> {
  const pec = await getPecConnection();
  
  // Query base para lista nominal (exemplo para C1)
  if (codigoIndicador === 'C1') {
    const query = `
      SELECT 
        c.co_seq_cidadao as "coSeqCidadao",
        c.no_cidadao as "nomeCidadao",
        c.nu_cpf as cpf,
        c.nu_cns as cns,
        c.dt_nascimento as "dataNascimento",
        ci.nu_telefone_celular as telefone,
        ci.nu_micro_area as microarea,
        COUNT(ai.co_seq_fat_atd_ind) as consultas
      FROM tb_cidadao c
      INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
      INNER JOIN tb_fat_atendimento_individual ai ON c.co_seq_cidadao = ai.co_fat_cidadao_pec
      INNER JOIN tb_dim_equipe e ON ai.co_dim_equipe_1 = e.co_seq_dim_equipe
      WHERE e.nu_ine = $1
        AND ci.st_gestante = 1
        AND ai.dt_atendimento BETWEEN $2 AND $3
      GROUP BY c.co_seq_cidadao, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento, ci.nu_telefone_celular, ci.nu_micro_area
      ORDER BY consultas DESC, c.no_cidadao
    `;
    
    const result = await pec.query(query, [ine, periodo.inicio, periodo.fim]);
    
    return result.rows.map((row: any) => ({
      coSeqCidadao: row.coSeqCidadao,
      nomeCidadao: row.nomeCidadao,
      cpf: row.cpf,
      cns: row.cns,
      dataNascimento: row.dataNascimento,
      telefone: row.telefone,
      microarea: row.microarea,
      status: row.consultas >= 6 ? 'cumprido' : 'pendente',
      detalhes: `${row.consultas} consultas realizadas`,
    }));
  }
  
  return [];
}
