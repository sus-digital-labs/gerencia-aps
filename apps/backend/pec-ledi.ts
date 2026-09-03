/**
 * Módulo de Edição de Inconsistências PEC via LEDI
 * LEDI = Layout de Envio de Dados e Informações
 * 
 * Permite correção de dados diretamente no PEC e-SUS
 */

import { getPecConnection } from './db';

export interface InconsistenciaDetectada {
  tipo: 'cpf_invalido' | 'cns_invalido' | 'duplicata' | 'obito' | 'endereco_incompleto' | 'dados_faltantes';
  cidadao_id: string;
  cidadao_nome: string;
  cpf?: string;
  cns?: string;
  descricao: string;
  severidade: 'alta' | 'media' | 'baixa';
  campo_afetado: string;
  valor_atual: string | null;
  valor_sugerido?: string;
}

export interface CorrecaoLEDI {
  inconsistencia_id: number;
  cidadao_id: string;
  campo: string;
  valor_antigo: string | null;
  valor_novo: string;
  usuario_id: number;
  justificativa: string;
  timestamp: Date;
}

/**
 * Detectar inconsistências no banco PEC
 */
export async function detectarInconsistencias(unitId?: string): Promise<InconsistenciaDetectada[]> {
  const pecDb = await getPecConnection();
  if (!pecDb) {
    throw new Error('Conexão com PEC não disponível');
  }

  const inconsistencias: InconsistenciaDetectada[] = [];

  try {
    // 1. CPF Inválidos ou faltantes
    const cpfInvalidos = await pecDb.query(`
      SELECT 
        co_seq_dim_cidadao as cidadao_id,
        no_cidadao as cidadao_nome,
        nu_cpf as cpf,
        nu_cns as cns
      FROM tb_dim_cidadao
      WHERE 
        (nu_cpf IS NULL OR LENGTH(nu_cpf) != 11 OR nu_cpf = '00000000000')
        AND st_faleceu = 0
      LIMIT 1000
    `);

    for (const row of cpfInvalidos.rows) {
      inconsistencias.push({
        tipo: 'cpf_invalido',
        cidadao_id: row.cidadao_id,
        cidadao_nome: row.cidadao_nome,
        cpf: row.cpf,
        cns: row.cns,
        descricao: 'CPF ausente ou inválido',
        severidade: 'alta',
        campo_afetado: 'nu_cpf',
        valor_atual: row.cpf
      });
    }

    // 2. CNS Inválidos
    const cnsInvalidos = await pecDb.query(`
      SELECT 
        co_seq_dim_cidadao as cidadao_id,
        no_cidadao as cidadao_nome,
        nu_cpf as cpf,
        nu_cns as cns
      FROM tb_dim_cidadao
      WHERE 
        (nu_cns IS NULL OR LENGTH(nu_cns) != 15)
        AND st_faleceu = 0
      LIMIT 1000
    `);

    for (const row of cnsInvalidos.rows) {
      inconsistencias.push({
        tipo: 'cns_invalido',
        cidadao_id: row.cidadao_id,
        cidadao_nome: row.cidadao_nome,
        cpf: row.cpf,
        cns: row.cns,
        descricao: 'CNS ausente ou inválido',
        severidade: 'alta',
        campo_afetado: 'nu_cns',
        valor_atual: row.cns
      });
    }

    // 3. Duplicatas (mesmo CPF)
    const duplicatas = await pecDb.query(`
      SELECT 
        nu_cpf as cpf,
        COUNT(*) as total,
        STRING_AGG(co_seq_dim_cidadao::text, ',') as cidadaos_ids,
        STRING_AGG(no_cidadao, ' | ') as nomes
      FROM tb_dim_cidadao
      WHERE nu_cpf IS NOT NULL AND LENGTH(nu_cpf) = 11
      GROUP BY nu_cpf
      HAVING COUNT(*) > 1
      LIMIT 500
    `);

    for (const row of duplicatas.rows) {
      const ids = row.cidadaos_ids.split(',');
      const nomes = row.nomes.split(' | ');
      
      inconsistencias.push({
        tipo: 'duplicata',
        cidadao_id: ids[0],
        cidadao_nome: nomes[0],
        cpf: row.cpf,
        descricao: `${row.total} registros com mesmo CPF`,
        severidade: 'alta',
        campo_afetado: 'nu_cpf',
        valor_atual: row.cpf
      });
    }

    // 4. Óbitos não registrados (cruzamento com SIM)
    // TODO: Implementar integração com Sistema de Informação sobre Mortalidade

    // 5. Endereços incompletos
    const enderecosIncompletos = await pecDb.query(`
      SELECT 
        c.co_seq_dim_cidadao as cidadao_id,
        c.no_cidadao as cidadao_nome,
        c.nu_cpf as cpf,
        e.no_bairro,
        e.no_logradouro
      FROM tb_dim_cidadao c
      LEFT JOIN tb_dim_endereco_localidade e ON c.co_dim_endereco_localidade = e.co_seq_dim_endereco_localidade
      WHERE 
        (e.no_bairro IS NULL OR e.no_logradouro IS NULL)
        AND c.st_faleceu = 0
      LIMIT 500
    `);

    for (const row of enderecosIncompletos.rows) {
      inconsistencias.push({
        tipo: 'endereco_incompleto',
        cidadao_id: row.cidadao_id,
        cidadao_nome: row.cidadao_nome,
        cpf: row.cpf,
        descricao: 'Endereço incompleto (falta bairro ou logradouro)',
        severidade: 'media',
        campo_afetado: 'endereco',
        valor_atual: `${row.no_logradouro || ''}, ${row.no_bairro || ''}`
      });
    }

    return inconsistencias;
  } catch (error) {
    console.error('[PEC-LEDI] Erro ao detectar inconsistências:', error);
    throw error;
  }
}

/**
 * Corrigir inconsistência no PEC
 */
export async function corrigirInconsistencia(correcao: CorrecaoLEDI): Promise<boolean> {
  const pecDb = await getPecConnection();
  if (!pecDb) {
    throw new Error('Conexão com PEC não disponível');
  }

  try {
    // Validar campo permitido
    const camposPermitidos = ['nu_cpf', 'nu_cns', 'no_cidadao', 'dt_nascimento', 'co_dim_sexo'];
    if (!camposPermitidos.includes(correcao.campo)) {
      throw new Error(`Campo ${correcao.campo} não permitido para correção`);
    }

    // Executar UPDATE no PEC
    await pecDb.query(`
      UPDATE tb_dim_cidadao
      SET 
        ${correcao.campo} = $1,
        dt_atualizacao = NOW()
      WHERE co_seq_dim_cidadao = $2
    `, [correcao.valor_novo, correcao.cidadao_id]);

    // Registrar auditoria
    await pecDb.query(`
      INSERT INTO tb_auditoria_correcao (
        cidadao_id,
        campo_alterado,
        valor_antigo,
        valor_novo,
        usuario_id,
        justificativa,
        dt_correcao
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      correcao.cidadao_id,
      correcao.campo,
      correcao.valor_antigo,
      correcao.valor_novo,
      correcao.usuario_id,
      correcao.justificativa
    ]);

    console.log(`[PEC-LEDI] Correção aplicada: cidadao=${correcao.cidadao_id}, campo=${correcao.campo}`);
    return true;
  } catch (error) {
    console.error('[PEC-LEDI] Erro ao corrigir inconsistência:', error);
    throw error;
  }
}

/**
 * Validar CPF (algoritmo oficial)
 */
export function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto >= 10 ? 0 : resto;

  if (digito1 !== parseInt(cpf.charAt(9))) {
    return false;
  }

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto >= 10 ? 0 : resto;

  return digito2 === parseInt(cpf.charAt(10));
}

/**
 * Validar CNS (Cartão Nacional de Saúde)
 */
export function validarCNS(cns: string): boolean {
  cns = cns.replace(/[^\d]/g, '');
  
  if (cns.length !== 15) {
    return false;
  }

  // CNS provisório (começa com 7, 8 ou 9)
  if (['7', '8', '9'].includes(cns[0])) {
    let soma = 0;
    for (let i = 0; i < 15; i++) {
      soma += parseInt(cns.charAt(i)) * (15 - i);
    }
    return soma % 11 === 0;
  }

  // CNS definitivo (começa com 1 ou 2)
  if (['1', '2'].includes(cns[0])) {
    let soma = 0;
    for (let i = 0; i < 11; i++) {
      soma += parseInt(cns.charAt(i)) * (15 - i);
    }
    let resto = soma % 11;
    let dv = 11 - resto;
    
    if (dv === 11) dv = 0;
    if (dv === 10) {
      soma = 0;
      for (let i = 0; i < 11; i++) {
        soma += parseInt(cns.charAt(i)) * (15 - i);
      }
      soma += 2;
      resto = soma % 11;
      dv = 11 - resto;
    }
    
    return dv === parseInt(cns.substring(11, 13));
  }

  return false;
}

/**
 * Gerar arquivo LEDI para envio ao e-SUS
 */
export async function gerarArquivoLEDI(correcoes: CorrecaoLEDI[]): Promise<string> {
  // TODO: Implementar geração de arquivo XML no formato LEDI
  // Formato: https://sisaps.saude.gov.br/esus/
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ledi versao="3.2">
  <header>
    <cnes>${process.env.CNES_UNIDADE}</cnes>
    <ine>${process.env.INE_EQUIPE}</ine>
    <data>${new Date().toISOString()}</data>
  </header>
  <correcoes>
    ${correcoes.map(c => `
    <correcao>
      <cidadao_id>${c.cidadao_id}</cidadao_id>
      <campo>${c.campo}</campo>
      <valor>${c.valor_novo}</valor>
      <justificativa>${c.justificativa}</justificativa>
    </correcao>
    `).join('')}
  </correcoes>
</ledi>`;

  return xml;
}
