import { getPecConnection } from "./db";

/**
 * Módulo de cálculo de indicadores SUS (Previne Brasil)
 * Implementa cálculos baseados em queries diretas no PostgreSQL do PEC (e-SUS)
 * 
 * Versões suportadas: 2024, 2025
 */

export interface IndicadorResult {
  codigo: string;
  nome: string;
  numerador: number;
  denominador: number;
  resultado: number;
  meta: number;
  peso: number;
  listaNominal?: any[];
}

/**
 * Calcula o Indicador 1: Proporção de gestantes com pelo menos 6 consultas pré-natal
 * Meta: 60%
 * Peso: 8
 */
export async function calcularIndicador01(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult> {
  const pec = await getPecConnection();
  
  // Numerador: Gestantes com >= 6 consultas no período
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
  
  // Denominador: Total de gestantes cadastradas
  const denominadorQuery = `
    SELECT COUNT(DISTINCT c.co_seq_cidadao) as total
    FROM tb_cidadao c
    INNER JOIN tb_cds_cad_individual ci ON c.co_seq_cidadao = ci.co_seq_cidadao
    INNER JOIN tb_dim_equipe e ON ci.co_dim_equipe = e.co_seq_dim_equipe
    WHERE e.nu_ine = $1
      AND ci.st_gestante = 1
      AND ci.dt_cad_individual BETWEEN $2 AND $3
  `;
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I01",
    nome: "Proporção de gestantes com pelo menos 6 consultas pré-natal realizadas",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 8,
  };
}

/**
 * Calcula o Indicador 2: Proporção de gestantes com realização de exames para sífilis e HIV
 * Meta: 60%
 * Peso: 8
 */
export async function calcularIndicador02(
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
      AND p.co_procedimento IN ('0202031179', '0202031063') -- Sífilis e HIV
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
      AND ci.dt_cad_individual BETWEEN $2 AND $3
  `;
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I02",
    nome: "Proporção de gestantes com realização de exames para sífilis e HIV",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 8,
  };
}

/**
 * Calcula o Indicador 3: Proporção de gestantes com atendimento odontológico realizado
 * Meta: 60%
 * Peso: 8
 */
export async function calcularIndicador03(
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
      AND ci.dt_cad_individual BETWEEN $2 AND $3
  `;
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I03",
    nome: "Proporção de gestantes com atendimento odontológico realizado",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 60,
    peso: 8,
  };
}

/**
 * Calcula o Indicador 4: Proporção de mulheres com coleta de citopatológico na APS
 * Meta: 40%
 * Peso: 10
 */
export async function calcularIndicador04(
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
      AND p.co_procedimento = '0203010086' -- Citopatológico
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
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I04",
    nome: "Proporção de mulheres com coleta de citopatológico na APS",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 40,
    peso: 10,
  };
}

/**
 * Calcula o Indicador 5: Proporção de diabéticos com hemoglobina glicada solicitada
 * Meta: 50%
 * Peso: 10
 */
export async function calcularIndicador05(
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
      AND p.co_procedimento = '0202010473' -- Hemoglobina glicada
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
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I05",
    nome: "Proporção de diabéticos com hemoglobina glicada solicitada",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 10,
  };
}

/**
 * Calcula o Indicador 6: Proporção de hipertensos com PA aferida em cada semestre
 * Meta: 50%
 * Peso: 10
 */
export async function calcularIndicador06(
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
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I06",
    nome: "Proporção de hipertensos com PA aferida em cada semestre",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 50,
    peso: 10,
  };
}

/**
 * Calcula o Indicador 7: Proporção de crianças de 1 ano de idade vacinadas
 * Meta: 95%
 * Peso: 10
 */
export async function calcularIndicador07(
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
      AND v.co_imunobiologico IN ('83', '84', '85', '86', '87') -- Vacinas obrigatórias
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
  
  const numerador = await pec.query(numeradorQuery, [ine, periodo.inicio, periodo.fim]);
  const denominador = await pec.query(denominadorQuery, [ine, periodo.inicio, periodo.fim]);
  
  const num = parseInt(numerador.rows[0]?.total || "0");
  const den = parseInt(denominador.rows[0]?.total || "0");
  const resultado = den > 0 ? (num / den) * 100 : 0;
  
  return {
    codigo: "I07",
    nome: "Proporção de crianças de 1 ano de idade vacinadas",
    numerador: num,
    denominador: den,
    resultado: parseFloat(resultado.toFixed(2)),
    meta: 95,
    peso: 10,
  };
}

/**
 * Calcula todos os indicadores para um INE e período específico
 */
export async function calcularTodosIndicadores(
  ine: string,
  periodo: { inicio: Date; fim: Date }
): Promise<IndicadorResult[]> {
  const indicadores = await Promise.all([
    calcularIndicador01(ine, periodo),
    calcularIndicador02(ine, periodo),
    calcularIndicador03(ine, periodo),
    calcularIndicador04(ine, periodo),
    calcularIndicador05(ine, periodo),
    calcularIndicador06(ine, periodo),
    calcularIndicador07(ine, periodo),
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
