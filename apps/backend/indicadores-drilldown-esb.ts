/**
 * Drill-Down Indicadores eSB (B1-B6)
 * Autor: Eduardo Muniz | DM Technology
 */
import { queryPEC } from './pec-db';
import type { DrillDownResult } from './indicadores-drilldown-types';
import { calcularSubIndicador, buscarPacientesPendentes, calcularDistribuicaoACS } from './indicadores-drilldown-helpers';

export async function drilldownB1(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND o.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT o.nu_cns_paciente) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('o.', 'c.')}) as denominador FROM tb_fat_atendimento_odonto o WHERE o.co_tipo_consulta = 1 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 40, 35);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.st_gestante = 1 THEN o.nu_cns_paciente END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c LEFT JOIN tb_fat_atendimento_odonto o ON c.nu_cns = o.nu_cns_paciente AND o.dt_atendimento BETWEEN $1 AND $2 WHERE c.st_gestante = 1 ${eqFilter.replace('o.', 'c.')}`, params, 60, 50);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o WHERE o.nu_cns_paciente = c.nu_cns AND o.dt_atendimento BETWEEN $1 AND $2) ${eqFilter.replace('o.', 'c.')} LIMIT 100`, params, () => ({ pendencias: ['Sem consulta odontológica'], prioridade: 'media' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 40;
  return {
    indicador: { codigo: 'B1', nome: 'Primeira consulta odontológica', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B1.1', nome: '1ª consulta programática', descricao: 'População com primeira consulta odontológica' }, { ...sub2, codigo: 'B1.2', nome: 'Gestantes com consulta odonto', descricao: 'Gestantes com consulta odontológica' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Abrir agenda de 1ª consulta odontológica', responsavel: 'eSB', prazo_dias: 5, pacientes_alvo: pacientes.length, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.5), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 8) }
  };
}

export async function drilldownB2(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND o.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT o.co_seq_fat_atd_odonto) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('o.', 'c.')}) as denominador FROM tb_fat_atendimento_odonto o WHERE o.co_tipo_consulta = 2 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 8, 5);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN o.st_encaminhamento IS NULL OR o.st_encaminhamento = 0 THEN o.co_seq_fat_atd_odonto END) as numerador, COUNT(DISTINCT o.co_seq_fat_atd_odonto) as denominador FROM tb_fat_atendimento_odonto o WHERE o.co_tipo_consulta = 2 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 80, 70);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, pr.no_profissional as no_acs, MAX(o.dt_atendimento) as ultima_consulta, CURRENT_DATE - MAX(o.dt_atendimento)::DATE as dias_sem_consulta FROM tb_fat_atendimento_odonto o INNER JOIN tb_cds_cad_individual c ON o.nu_cns_paciente = c.nu_cns LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional pr ON c.co_dim_profissional_acs = pr.co_seq_dim_profissional WHERE o.co_tipo_consulta = 2 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter} GROUP BY c.nu_cns, c.no_cidadao, c.dt_nascimento, c.nu_cpf_cidadao, e.no_equipe, pr.no_profissional LIMIT 100`, params, () => ({ pendencias: ['Urgência sem tratamento programático'], prioridade: 'alta' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 8;
  return {
    indicador: { codigo: 'B2', nome: 'Atendimento de urgência odontológica', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B2.1', nome: 'Atendimentos de urgência', descricao: 'Total de atendimentos de urgência odontológica' }, { ...sub2, codigo: 'B2.2', nome: 'Resolutividade', descricao: 'Urgências resolvidas sem encaminhamento' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Agendar tratamento programático pós-urgência', responsavel: 'eSB', prazo_dias: 7, pacientes_alvo: pacientes.length, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.max(0, Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador)), visitas_necessarias: Math.ceil(pacientes.length * 0.3), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 10) }
  };
}

export async function drilldownB3(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND o.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT o.nu_cns_paciente) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('o.', 'c.')}) as denominador FROM tb_fat_atendimento_odonto o WHERE o.co_procedimento = '0101020058' AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 30, 25);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT ac.co_seq_fat_atividade_coletiva) as numerador, 12 as denominador FROM tb_fat_atividade_coletiva ac WHERE ac.co_tipo_atividade = 4 AND ac.dt_atividade BETWEEN $1 AND $2 ${eqFilter.replace('o.', 'ac.')}`, params, 80, 60);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 0 AND 12 AND NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o WHERE o.nu_cns_paciente = c.nu_cns AND o.co_procedimento = '0101020058' AND o.dt_atendimento BETWEEN $1 AND $2) ${eqFilter.replace('o.', 'c.')} LIMIT 100`, params, () => ({ pendencias: ['Sem escovação supervisionada'], prioridade: 'baixa' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 30;
  return {
    indicador: { codigo: 'B3', nome: 'Escovação dental supervisionada', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B3.1', nome: 'Cobertura de escovação', descricao: 'População com escovação supervisionada' }, { ...sub2, codigo: 'B3.2', nome: 'Ações coletivas', descricao: 'Ações de escovação realizadas' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'campanha', descricao: 'Ação de escovação nas escolas', responsavel: 'TSB + Dentista', prazo_dias: 15, pacientes_alvo: pacientes.length, impacto_estimado: 40 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.2), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 20) }
  };
}

export async function drilldownB4(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND o.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN o.co_tipo_consulta = 4 THEN o.nu_cns_paciente END) as numerador, COUNT(DISTINCT CASE WHEN o.co_tipo_consulta = 1 THEN o.nu_cns_paciente END) as denominador FROM tb_fat_atendimento_odonto o WHERE o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 50, 40);
  const sub2 = await calcularSubIndicador(`SELECT COALESCE(AVG(tc.dias_tratamento)::INTEGER, 0) as numerador, 90 as denominador FROM (SELECT MIN(o2.dt_atendimento)::DATE - MIN(o1.dt_atendimento)::DATE as dias_tratamento FROM tb_fat_atendimento_odonto o1 INNER JOIN tb_fat_atendimento_odonto o2 ON o1.nu_cns_paciente = o2.nu_cns_paciente WHERE o1.co_tipo_consulta = 1 AND o2.co_tipo_consulta = 4 AND o1.dt_atendimento BETWEEN $1 AND $2 AND o2.dt_atendimento BETWEEN $1 AND $2 ${eqFilter.replace('o.', 'o1.')} GROUP BY o1.nu_cns_paciente) tc`, params, 70, 50);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, pr.no_profissional as no_acs, MAX(o.dt_atendimento) as ultima_consulta, CURRENT_DATE - MAX(o.dt_atendimento)::DATE as dias_sem_consulta FROM tb_fat_atendimento_odonto o INNER JOIN tb_cds_cad_individual c ON o.nu_cns_paciente = c.nu_cns LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional pr ON c.co_dim_profissional_acs = pr.co_seq_dim_profissional WHERE o.co_tipo_consulta = 1 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter} AND NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o2 WHERE o2.nu_cns_paciente = c.nu_cns AND o2.co_tipo_consulta = 4 AND o2.dt_atendimento BETWEEN $1 AND $2) GROUP BY c.nu_cns, c.no_cidadao, c.dt_nascimento, c.nu_cpf_cidadao, e.no_equipe, pr.no_profissional LIMIT 100`, params, (row) => {
    const dias = parseInt(String(row.dias_sem_consulta || '0'));
    return { pendencias: [dias > 90 ? `Tratamento abandonado (${dias} dias)` : `Tratamento em andamento (${dias} dias)`], prioridade: dias > 90 ? 'alta' as const : 'media' as const };
  });
  
  const resultadoAtual = sub1.resultado;
  const meta = 50;
  return {
    indicador: { codigo: 'B4', nome: 'Tratamento odontológico concluído', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B4.1', nome: 'Taxa de conclusão', descricao: 'Pacientes com tratamento concluído' }, { ...sub2, codigo: 'B4.2', nome: 'Tempo médio', descricao: 'Tempo médio de tratamento (dias)' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Reagendar pacientes com tratamento pendente', responsavel: 'eSB', prazo_dias: 7, pacientes_alvo: pacientes.length, impacto_estimado: 35 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.5), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 6) }
  };
}

export async function drilldownB5(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND o.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o2 WHERE o2.nu_cns_paciente = o.nu_cns_paciente AND o2.co_tipo_consulta = 3 AND o2.dt_atendimento BETWEEN $1 AND $2) THEN o.nu_cns_paciente END) as numerador, COUNT(DISTINCT o.nu_cns_paciente) as denominador FROM tb_fat_atendimento_odonto o WHERE o.co_tipo_consulta = 4 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}`, params, 30, 25);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o WHERE o.nu_cns_paciente = c.nu_cns AND o.co_tipo_consulta = 3 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter}) THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE EXTRACT(YEAR FROM AGE(c.dt_nascimento)) >= 60 ${eqFilter.replace('o.', 'c.')}`, params, 20, 15);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, pr.no_profissional as no_acs, MAX(o.dt_atendimento) as ultima_consulta, CURRENT_DATE - MAX(o.dt_atendimento)::DATE as dias_sem_consulta FROM tb_fat_atendimento_odonto o INNER JOIN tb_cds_cad_individual c ON o.nu_cns_paciente = c.nu_cns LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional pr ON c.co_dim_profissional_acs = pr.co_seq_dim_profissional WHERE o.co_tipo_consulta = 4 AND o.dt_atendimento BETWEEN $1 AND $2 ${eqFilter} AND NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o2 WHERE o2.nu_cns_paciente = c.nu_cns AND o2.co_tipo_consulta = 3 AND o2.dt_atendimento > o.dt_atendimento) GROUP BY c.nu_cns, c.no_cidadao, c.dt_nascimento, c.nu_cpf_cidadao, e.no_equipe, pr.no_profissional LIMIT 100`, params, (row) => {
    const dias = parseInt(String(row.dias_sem_consulta || '0'));
    return { pendencias: [`Tratamento concluído há ${dias} dias sem retorno`], prioridade: dias > 180 ? 'alta' as const : 'media' as const };
  });
  
  const resultadoAtual = sub1.resultado;
  const meta = 30;
  return {
    indicador: { codigo: 'B5', nome: 'Consultas de manutenção odontológica', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B5.1', nome: 'Taxa de retorno', descricao: 'Pacientes que retornaram para manutenção' }, { ...sub2, codigo: 'B5.2', nome: 'Idosos com manutenção', descricao: 'Idosos (60+) com consulta de manutenção' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Agendar manutenção pós-tratamento', responsavel: 'eSB', prazo_dias: 10, pacientes_alvo: pacientes.length, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.4), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: Math.ceil(pacientes.length / 6) }
  };
}

export async function drilldownB6(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND ac.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT ac.co_seq_fat_atividade_coletiva) as numerador, 12 as denominador FROM tb_fat_atividade_coletiva ac WHERE ac.co_tipo_atividade IN (4, 5, 6) AND ac.dt_atividade BETWEEN $1 AND $2 ${eqFilter}`, params, 80, 60);
  const sub2 = await calcularSubIndicador(`SELECT COALESCE(SUM(ac.nu_participantes), 0) as numerador, (SELECT COUNT(DISTINCT nu_cns) FROM tb_cds_cad_individual WHERE 1=1 ${eqFilter.replace('ac.', 'c.')}) as denominador FROM tb_fat_atividade_coletiva ac WHERE ac.co_tipo_atividade IN (4, 5, 6) AND ac.dt_atividade BETWEEN $1 AND $2 ${eqFilter}`, params, 30, 20);
  
  const pacientes: any[] = [];
  
  const resultadoAtual = sub1.resultado;
  const meta = 80;
  return {
    indicador: { codigo: 'B6', nome: 'Ações coletivas de saúde bucal', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'B6.1', nome: 'Ações realizadas', descricao: 'Total de ações coletivas de saúde bucal' }, { ...sub2, codigo: 'B6.2', nome: 'Participantes', descricao: 'Total de participantes nas ações' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'campanha', descricao: 'Planejar ações coletivas mensais', responsavel: 'eSB', prazo_dias: 7, pacientes_alvo: 50, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.max(0, 12 - sub1.numerador), visitas_necessarias: 0, distribuicao_acs: [], prazo_estimado_dias: Math.ceil((12 - sub1.numerador) * 30) }
  };
}
