/**
 * Serviço LEDI - Edição de Inconsistências e Envio ao PEC
 * 
 * Este serviço permite:
 * 1. Identificar inconsistências nos dados do PEC
 * 2. Editar dados de cidadãos (CPF, CNS, nome, etc.)
 * 3. Gerar fichas LEDI para envio ao PEC
 * 4. Transmitir alterações via API do e-SUS
 */

import { pecPool } from './pec-db';
import { v4 as uuidv4 } from 'uuid';

// Tipos de inconsistências
export interface Inconsistencia {
  id: string;
  tipo: 'cpf_faltante' | 'cns_faltante' | 'nome_incompleto' | 'data_nascimento_invalida' | 'endereco_incompleto' | 'telefone_faltante';
  cidadaoId: number;
  cidadaoNome: string;
  campo: string;
  valorAtual: string | null;
  descricao: string;
  gravidade: 'alta' | 'media' | 'baixa';
  indicadorAfetado: string[];
}

export interface EdicaoCidadao {
  cidadaoId: number;
  campo: string;
  valorAntigo: string | null;
  valorNovo: string;
  motivo: string;
  usuarioId: string;
}

export interface ResultadoEnvioLEDI {
  sucesso: boolean;
  uuid: string;
  mensagem: string;
  dataEnvio: Date;
}

/**
 * Buscar inconsistências nos dados do PEC
 */
export async function buscarInconsistencias(
  tipo?: string,
  equipeId?: number,
  limite: number = 100
): Promise<Inconsistencia[]> {
  const inconsistencias: Inconsistencia[] = [];

  try {
    // CPF Faltante
    const cpfFaltante = await pecPool.query(`
      SELECT 
        c.co_seq_cidadao as id,
        c.no_cidadao as nome,
        c.nu_cpf as cpf,
        c.nu_cns as cns
      FROM tb_cidadao c
      WHERE (c.nu_cpf IS NULL OR c.nu_cpf = '')
      LIMIT $1
    `, [limite]);

    for (const row of cpfFaltante.rows) {
      inconsistencias.push({
        id: uuidv4(),
        tipo: 'cpf_faltante',
        cidadaoId: row.id,
        cidadaoNome: row.nome || 'Nome não informado',
        campo: 'nu_cpf',
        valorAtual: row.cpf,
        descricao: 'CPF não cadastrado - afeta identificação única do cidadão',
        gravidade: 'alta',
        indicadorAfetado: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']
      });
    }

    // CNS Faltante
    const cnsFaltante = await pecPool.query(`
      SELECT 
        c.co_seq_cidadao as id,
        c.no_cidadao as nome,
        c.nu_cns as cns
      FROM tb_cidadao c
      WHERE (c.nu_cns IS NULL OR c.nu_cns = '')
      LIMIT $1
    `, [limite]);

    for (const row of cnsFaltante.rows) {
      inconsistencias.push({
        id: uuidv4(),
        tipo: 'cns_faltante',
        cidadaoId: row.id,
        cidadaoNome: row.nome || 'Nome não informado',
        campo: 'nu_cns',
        valorAtual: row.cns,
        descricao: 'Cartão Nacional de Saúde não cadastrado',
        gravidade: 'media',
        indicadorAfetado: ['C1', 'C4', 'C5']
      });
    }

    // Data de Nascimento Inválida
    const dataNascimentoInvalida = await pecPool.query(`
      SELECT 
        c.co_seq_cidadao as id,
        c.no_cidadao as nome,
        c.dt_nascimento
      FROM tb_cidadao c
      WHERE c.dt_nascimento IS NULL 
         OR c.dt_nascimento > CURRENT_DATE 
         OR c.dt_nascimento < '1900-01-01'
      LIMIT $1
    `, [limite]);

    for (const row of dataNascimentoInvalida.rows) {
      inconsistencias.push({
        id: uuidv4(),
        tipo: 'data_nascimento_invalida',
        cidadaoId: row.id,
        cidadaoNome: row.nome || 'Nome não informado',
        campo: 'dt_nascimento',
        valorAtual: row.dt_nascimento ? row.dt_nascimento.toISOString().split('T')[0] : null,
        descricao: 'Data de nascimento inválida ou não informada',
        gravidade: 'alta',
        indicadorAfetado: ['C2', 'C6', 'C7']
      });
    }

    return inconsistencias;
  } catch (error) {
    console.error('Erro ao buscar inconsistências:', error);
    return [];
  }
}

/**
 * Aplicar edição no banco PEC e gerar ficha LEDI
 */
export async function aplicarEdicao(edicao: EdicaoCidadao): Promise<ResultadoEnvioLEDI> {
  const uuid = uuidv4();
  
  try {
    // Validar campo permitido
    const camposPermitidos = ['nu_cpf', 'nu_cns', 'no_cidadao', 'dt_nascimento', 'ds_endereco', 'nu_telefone'];
    if (!camposPermitidos.includes(edicao.campo)) {
      return {
        sucesso: false,
        uuid,
        mensagem: `Campo '${edicao.campo}' não é permitido para edição`,
        dataEnvio: new Date()
      };
    }

    // Atualizar no banco PEC
    const query = `
      UPDATE tb_cidadao 
      SET ${edicao.campo} = $1
      WHERE co_seq_cidadao = $2
    `;
    
    await pecPool.query(query, [edicao.valorNovo, edicao.cidadaoId]);

    // Registrar log de auditoria
    await registrarLogAuditoria({
      uuid,
      cidadaoId: edicao.cidadaoId,
      campo: edicao.campo,
      valorAntigo: edicao.valorAntigo,
      valorNovo: edicao.valorNovo,
      motivo: edicao.motivo,
      usuarioId: edicao.usuarioId,
      dataHora: new Date()
    });

    // TODO: Gerar ficha LEDI Thrift e enviar via API
    // Por enquanto, apenas registramos a alteração
    
    return {
      sucesso: true,
      uuid,
      mensagem: `Campo '${edicao.campo}' atualizado com sucesso. UUID: ${uuid}`,
      dataEnvio: new Date()
    };
  } catch (error) {
    console.error('Erro ao aplicar edição:', error);
    return {
      sucesso: false,
      uuid,
      mensagem: `Erro ao aplicar edição: ${error}`,
      dataEnvio: new Date()
    };
  }
}

/**
 * Registrar log de auditoria
 */
async function registrarLogAuditoria(log: {
  uuid: string;
  cidadaoId: number;
  campo: string;
  valorAntigo: string | null;
  valorNovo: string;
  motivo: string;
  usuarioId: string;
  dataHora: Date;
}): Promise<void> {
  // TODO: Criar tabela de auditoria no banco local
  console.log('Log de auditoria:', JSON.stringify(log, null, 2));
}

/**
 * Buscar lista nominal de cidadãos para drill-down de indicadores
 */
export async function buscarListaNominalIndicador(
  indicadorCodigo: string,
  tipo: 'numerador' | 'denominador',
  dataInicio: string,
  dataFim: string,
  equipeId?: number,
  limite: number = 100
): Promise<any[]> {
  try {
    let query = '';
    let params: any[] = [];

    switch (indicadorCodigo) {
      case 'C4': // Diabéticos
        if (tipo === 'denominador') {
          query = `
            SELECT DISTINCT 
              c.co_seq_cidadao as id,
              c.no_cidadao as nome,
              c.nu_cpf as cpf,
              c.nu_cns as cns,
              c.dt_nascimento,
              'Diabético cadastrado' as status,
              CASE 
                WHEN c.nu_cpf IS NULL THEN 'CPF faltante'
                WHEN c.nu_cns IS NULL THEN 'CNS faltante'
                ELSE 'Completo'
              END as inconsistencia
            FROM tb_problema p
            INNER JOIN tb_ciap ci ON p.co_ciap = ci.co_seq_ciap
            INNER JOIN rl_grupo_condicao_ciap_cid rl ON ci.co_seq_ciap = rl.co_ciap
            INNER JOIN tb_prontuario pr ON p.co_prontuario = pr.co_seq_prontuario
            INNER JOIN tb_cidadao c ON pr.co_cidadao = c.co_seq_cidadao
            WHERE rl.co_grupo_condicao = 5
            LIMIT $1
          `;
          params = [limite];
        } else {
          query = `
            SELECT DISTINCT 
              c.co_seq_cidadao as id,
              c.no_cidadao as nome,
              c.nu_cpf as cpf,
              c.nu_cns as cns,
              c.dt_nascimento,
              'Com 2+ consultas no período' as status,
              COUNT(a.co_seq_atend) as total_consultas
            FROM tb_problema p
            INNER JOIN tb_ciap ci ON p.co_ciap = ci.co_seq_ciap
            INNER JOIN rl_grupo_condicao_ciap_cid rl ON ci.co_seq_ciap = rl.co_ciap
            INNER JOIN tb_prontuario pr ON p.co_prontuario = pr.co_seq_prontuario
            INNER JOIN tb_cidadao c ON pr.co_cidadao = c.co_seq_cidadao
            INNER JOIN tb_atend a ON a.co_prontuario = pr.co_seq_prontuario
            WHERE rl.co_grupo_condicao = 5
              AND a.dt_inicio BETWEEN $1 AND $2
            GROUP BY c.co_seq_cidadao, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento
            HAVING COUNT(a.co_seq_atend) >= 2
            LIMIT $3
          `;
          params = [dataInicio, dataFim, limite];
        }
        break;

      case 'C5': // Hipertensos
        if (tipo === 'denominador') {
          query = `
            SELECT DISTINCT 
              c.co_seq_cidadao as id,
              c.no_cidadao as nome,
              c.nu_cpf as cpf,
              c.nu_cns as cns,
              c.dt_nascimento,
              'Hipertenso cadastrado' as status,
              CASE 
                WHEN c.nu_cpf IS NULL THEN 'CPF faltante'
                WHEN c.nu_cns IS NULL THEN 'CNS faltante'
                ELSE 'Completo'
              END as inconsistencia
            FROM tb_problema p
            INNER JOIN tb_ciap ci ON p.co_ciap = ci.co_seq_ciap
            INNER JOIN rl_grupo_condicao_ciap_cid rl ON ci.co_seq_ciap = rl.co_ciap
            INNER JOIN tb_prontuario pr ON p.co_prontuario = pr.co_seq_prontuario
            INNER JOIN tb_cidadao c ON pr.co_cidadao = c.co_seq_cidadao
            WHERE rl.co_grupo_condicao = 10
            LIMIT $1
          `;
          params = [limite];
        } else {
          query = `
            SELECT DISTINCT 
              c.co_seq_cidadao as id,
              c.no_cidadao as nome,
              c.nu_cpf as cpf,
              c.nu_cns as cns,
              c.dt_nascimento,
              'Com 2+ consultas no período' as status,
              COUNT(a.co_seq_atend) as total_consultas
            FROM tb_problema p
            INNER JOIN tb_ciap ci ON p.co_ciap = ci.co_seq_ciap
            INNER JOIN rl_grupo_condicao_ciap_cid rl ON ci.co_seq_ciap = rl.co_ciap
            INNER JOIN tb_prontuario pr ON p.co_prontuario = pr.co_seq_prontuario
            INNER JOIN tb_cidadao c ON pr.co_cidadao = c.co_seq_cidadao
            INNER JOIN tb_atend a ON a.co_prontuario = pr.co_seq_prontuario
            WHERE rl.co_grupo_condicao = 10
              AND a.dt_inicio BETWEEN $1 AND $2
            GROUP BY c.co_seq_cidadao, c.no_cidadao, c.nu_cpf, c.nu_cns, c.dt_nascimento
            HAVING COUNT(a.co_seq_atend) >= 2
            LIMIT $3
          `;
          params = [dataInicio, dataFim, limite];
        }
        break;

      default:
        return [];
    }

    console.log('Query lista nominal:', indicadorCodigo, tipo);
    console.log('Params:', params);
    const result = await pecPool.query(query, params);
    console.log('Resultado:', result.rows.length, 'registros');
    return result.rows.map(row => ({
      id: row.id,
      nome: row.nome || 'Nome não informado',
      cpf: row.cpf || 'Não informado',
      cns: row.cns || 'Não informado',
      dataNascimento: row.dt_nascimento ? row.dt_nascimento.toISOString().split('T')[0] : 'Não informada',
      status: row.status,
      inconsistencia: row.inconsistencia || null,
      totalConsultas: row.total_consultas || 0
    }));
  } catch (error) {
    console.error('Erro ao buscar lista nominal:', error);
    return [];
  }
}

/**
 * Estatísticas de inconsistências
 */
export async function obterEstatisticasInconsistencias(): Promise<{
  total: number;
  porTipo: { tipo: string; quantidade: number }[];
  porGravidade: { gravidade: string; quantidade: number }[];
}> {
  try {
    // CPF faltante
    const cpfResult = await pecPool.query(`
      SELECT COUNT(*) as total FROM tb_cidadao 
      WHERE nu_cpf IS NULL OR nu_cpf = ''
    `);

    // CNS faltante
    const cnsResult = await pecPool.query(`
      SELECT COUNT(*) as total FROM tb_cidadao 
      WHERE nu_cns IS NULL OR nu_cns = ''
    `);

    // Data nascimento inválida
    const dtNascResult = await pecPool.query(`
      SELECT COUNT(*) as total FROM tb_cidadao 
      WHERE dt_nascimento IS NULL OR dt_nascimento > CURRENT_DATE OR dt_nascimento < '1900-01-01'
    `);

    const cpfTotal = parseInt(cpfResult.rows[0]?.total) || 0;
    const cnsTotal = parseInt(cnsResult.rows[0]?.total) || 0;
    const dtNascTotal = parseInt(dtNascResult.rows[0]?.total) || 0;

    return {
      total: cpfTotal + cnsTotal + dtNascTotal,
      porTipo: [
        { tipo: 'CPF Faltante', quantidade: cpfTotal },
        { tipo: 'CNS Faltante', quantidade: cnsTotal },
        { tipo: 'Data Nascimento Inválida', quantidade: dtNascTotal }
      ],
      porGravidade: [
        { gravidade: 'Alta', quantidade: cpfTotal + dtNascTotal },
        { gravidade: 'Média', quantidade: cnsTotal },
        { gravidade: 'Baixa', quantidade: 0 }
      ]
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return {
      total: 0,
      porTipo: [],
      porGravidade: []
    };
  }
}
