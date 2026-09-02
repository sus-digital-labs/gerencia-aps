/**
 * Drill-Down Indicadores eMulti (M1-M2)
 * Autor: Eduardo Muniz | DM Technology
 */
import { queryPEC } from './pec-db';
import type { DrillDownResult } from './indicadores-drilldown-types';
import { calcularSubIndicador, buscarPacientesPendentes, calcularDistribuicaoACS } from './indicadores-drilldown-helpers';

export async function drilldownM1(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND a.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT a.co_seq_fat_atd_individual) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('a.', 'c.')}) as denominador FROM tb_fat_atendimento_individual a INNER JOIN tb_dim_profissional p ON a.co_dim_profissional = p.co_seq_dim_profissional WHERE a.dt_inicio BETWEEN $1 AND $2 AND p.co_cbo IN ('225125','223505','251510','223810','223905','224105','223605','226310') ${eqFilter}`, params, 15, 10);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT a.co_seq_fat_atd_individual) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('a.', 'c.')}) as denominador FROM tb_fat_atendimento_individual a INNER JOIN tb_dim_profissional p ON a.co_dim_profissional = p.co_seq_dim_profissional WHERE a.dt_inicio BETWEEN $1 AND $2 AND p.co_cbo = '225125' ${eqFilter}`, params, 5, 3);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, pr.no_profissional as no_acs, MAX(a.dt_inicio) as ultima_consulta, CURRENT_DATE - MAX(a.dt_inicio)::DATE as dias_sem_consulta FROM tb_fat_atendimento_individual a INNER JOIN tb_cds_cad_individual c ON a.nu_cns_paciente = c.nu_cns INNER JOIN tb_dim_profissional p ON a.co_dim_profissional = p.co_seq_dim_profissional LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional pr ON c.co_dim_profissional_acs = pr.co_seq_dim_profissional WHERE a.dt_inicio BETWEEN $1 AND $2 AND p.co_cbo IN ('225125','223505','251510','223810','223905','224105','223605','226310') ${eqFilter} GROUP BY c.nu_cns, c.no_cidadao, c.dt_nascimento, c.nu_cpf_cidadao, e.no_equipe, pr.no_profissional HAVING COUNT(DISTINCT a.co_seq_fat_atd_individual) = 1 LIMIT 100`, params, (row) => {
    const dias = parseInt(String(row.dias_sem_consulta || '0'));
    return { pendencias: [`Apenas 1 atendimento eMulti (${dias} dias)`], prioridade: dias > 90 ? 'alta' as const : 'media' as const };
  });
  
  const resultadoAtual = sub1.resultado;
  const meta = 15;
  return {
    indicador: { codigo: 'M1', nome: 'Atendimentos individuais eMulti', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'M1.1', nome: 'Atendimentos eMulti', descricao: 'Total de atendimentos da equipe multiprofissional' }, { ...sub2, codigo: 'M1.2', nome: 'Atendimentos de Fisioterapia', descricao: 'Atendimentos individuais de fisioterapia' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Agendar retornos para pacientes eMulti', responsavel: 'eMulti', prazo_dias: 10, pacientes_alvo: pacientes.length, impacto_estimado: 25 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.3), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 10) }
  };
}

export async function drilldownM2(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND ac.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT ac.co_seq_fat_atividade_coletiva) as numerador, 24 as denominador FROM tb_fat_atividade_coletiva ac INNER JOIN tb_dim_profissional p ON ac.co_dim_profissional = p.co_seq_dim_profissional WHERE ac.dt_atividade BETWEEN $1 AND $2 AND p.co_cbo IN ('225125','223505','251510','223810','223905','224105','223605','226310') ${eqFilter}`, params, 80, 60);
  const sub2 = await calcularSubIndicador(`SELECT COALESCE(SUM(ac.nu_participantes), 0) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('ac.', 'c.')}) as denominador FROM tb_fat_atividade_coletiva ac INNER JOIN tb_dim_profissional p ON ac.co_dim_profissional = p.co_seq_dim_profissional WHERE ac.dt_atividade BETWEEN $1 AND $2 AND p.co_cbo IN ('225125','223505','251510','223810','223905','224105','223605','226310') ${eqFilter}`, params, 20, 15);
  
  const pacientes: any[] = [];
  
  const resultadoAtual = sub1.resultado;
  const meta = 80;
  return {
    indicador: { codigo: 'M2', nome: 'Atividades coletivas eMulti', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'M2.1', nome: 'Atividades coletivas', descricao: 'Total de atividades coletivas da eMulti' }, { ...sub2, codigo: 'M2.2', nome: 'Participantes', descricao: 'Total de participantes nas atividades' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'campanha', descricao: 'Criar grupos terapêuticos', responsavel: 'Coordenação eMulti', prazo_dias: 30, pacientes_alvo: 30, impacto_estimado: 35 }],
    roadmap: { atendimentos_necessarios: Math.max(0, 24 - sub1.numerador), visitas_necessarias: 0, distribuicao_acs: [], prazo_estimado_dias: Math.ceil((24 - sub1.numerador) * 15) }
  };
}
