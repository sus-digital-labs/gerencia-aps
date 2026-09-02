/**
 * Drill-Down Indicadores eSF/eAP (C2,C3,C5,C6,C7)
 * Autor: Eduardo Muniz | DM Technology
 */
import { queryPEC } from './pec-db';
import type { DrillDownResult } from './indicadores-drilldown-types';
import { calcularSubIndicador, buscarPacientesPendentes, calcularDistribuicaoACS, calcResultado } from './indicadores-drilldown-helpers';

export async function drilldownC2(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND c.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tb_fat_atendimento_individual a WHERE a.nu_cns = c.nu_cns AND a.dt_inicio BETWEEN $1 AND $2) THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.st_gestante = 1 ${eqFilter}`, params, 80, 70);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.dt_teste_sifilis IS NOT NULL THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.st_gestante = 1 ${eqFilter}`, params, 90, 80);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE c.st_gestante = 1 AND c.dt_teste_sifilis IS NULL ${eqFilter} LIMIT 100`, params, () => ({ pendencias: ['Sem teste de sífilis'], prioridade: 'alta' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 80;
  return {
    indicador: { codigo: 'C2', nome: 'Sífilis e HIV em gestantes', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'C2.1', nome: 'Gestantes com pré-natal', descricao: 'Gestantes com pelo menos 1 consulta de pré-natal' }, { ...sub2, codigo: 'C2.2', nome: 'Gestantes testadas para sífilis', descricao: 'Gestantes com teste de sífilis realizado' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Agendar teste de sífilis para gestantes', responsavel: 'Enfermeira', prazo_dias: 7, pacientes_alvo: pacientes.length, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: pacientes.length, distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: 15 }
  };
}

export async function drilldownC3(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND c.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o WHERE o.nu_cns_paciente = c.nu_cns AND o.dt_atendimento BETWEEN $1 AND $2) THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.st_gestante = 1 ${eqFilter}`, params, 60, 50);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT o.co_seq_fat_atd_odonto) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c LEFT JOIN tb_fat_atendimento_odonto o ON c.nu_cns = o.nu_cns_paciente AND o.dt_atendimento BETWEEN $1 AND $2 WHERE c.st_gestante = 1 ${eqFilter}`, params, 70, 60);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE c.st_gestante = 1 AND NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_odonto o WHERE o.nu_cns_paciente = c.nu_cns AND o.dt_atendimento BETWEEN $1 AND $2) ${eqFilter} LIMIT 100`, params, () => ({ pendencias: ['Sem atendimento odontológico'], prioridade: 'media' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 60;
  return {
    indicador: { codigo: 'C3', nome: 'Atendimento odontológico a gestantes', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'C3.1', nome: 'Gestantes com atendimento odonto', descricao: 'Gestantes com pelo menos 1 atendimento odontológico' }, { ...sub2, codigo: 'C3.2', nome: 'Total de atendimentos', descricao: 'Total de atendimentos odontológicos a gestantes' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'agendamento', descricao: 'Agendar consulta odontológica para gestantes', responsavel: 'eSB', prazo_dias: 10, pacientes_alvo: pacientes.length, impacto_estimado: 25 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: pacientes.length, distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: 20 }
  };
}

export async function drilldownC5(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND c.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN EXISTS(SELECT 1 FROM tb_fat_atendimento_individual a WHERE a.nu_cns = c.nu_cns AND a.dt_inicio BETWEEN $1 AND $2) THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.st_hipertensao_arterial = 1 ${eqFilter}`, params, 50, 40);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.dt_afericao_pa IS NOT NULL THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.st_hipertensao_arterial = 1 ${eqFilter}`, params, 80, 70);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE c.st_hipertensao_arterial = 1 AND NOT EXISTS(SELECT 1 FROM tb_fat_atendimento_individual a WHERE a.nu_cns = c.nu_cns AND a.dt_inicio BETWEEN $1 AND $2) ${eqFilter} LIMIT 100`, params, () => ({ pendencias: ['Sem consulta no período'], prioridade: 'alta' as const }));
  
  const resultadoAtual = sub1.resultado;
  const meta = 50;
  return {
    indicador: { codigo: 'C5', nome: 'Hipertensão com consulta', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'C5.1', nome: 'Hipertensos com consulta', descricao: 'Hipertensos com pelo menos 1 consulta no semestre' }, { ...sub2, codigo: 'C5.2', nome: 'Hipertensos com PA aferida', descricao: 'Hipertensos com aferição de pressão arterial' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'busca_ativa', descricao: 'Buscar hipertensos sem consulta', responsavel: 'ACS', prazo_dias: 15, pacientes_alvo: pacientes.length, impacto_estimado: 35 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: pacientes.length, distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: 30 }
  };
}

export async function drilldownC6(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND c.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.dt_citopatologico IS NOT NULL THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.co_dim_sexo = 2 AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 25 AND 64 ${eqFilter}`, params, 40, 30);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.dt_citopatologico >= CURRENT_DATE - INTERVAL '3 years' THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE c.co_dim_sexo = 2 AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 25 AND 64 ${eqFilter}`, params, 60, 50);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE c.co_dim_sexo = 2 AND EXTRACT(YEAR FROM AGE(c.dt_nascimento)) BETWEEN 25 AND 64 AND (c.dt_citopatologico IS NULL OR c.dt_citopatologico < CURRENT_DATE - INTERVAL '3 years') ${eqFilter} LIMIT 100`, params, (row) => {
    const dtCito = row.dt_citopatologico;
    return { pendencias: dtCito ? ['Citopatológico vencido (>3 anos)'] : ['Nunca realizou citopatológico'], prioridade: dtCito ? 'media' as const : 'alta' as const };
  });
  
  const resultadoAtual = sub1.resultado;
  const meta = 40;
  return {
    indicador: { codigo: 'C6', nome: 'Citopatológico cérvico-uterino', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'C6.1', nome: 'Mulheres com citopatológico', descricao: 'Mulheres 25-64 anos com citopatológico' }, { ...sub2, codigo: 'C6.2', nome: 'Citopatológico atualizado', descricao: 'Mulheres com citopatológico nos últimos 3 anos' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'campanha', descricao: 'Campanha de prevenção câncer de colo', responsavel: 'Enfermeira', prazo_dias: 30, pacientes_alvo: pacientes.length, impacto_estimado: 30 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: Math.ceil(pacientes.length * 0.7), distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: 60 }
  };
}

export async function drilldownC7(dataInicio: string, dataFim: string, equipeId?: number): Promise<DrillDownResult> {
  const params = equipeId ? [dataInicio, dataFim, equipeId] : [dataInicio, dataFim];
  const eqFilter = equipeId ? 'AND c.co_dim_equipe = $3' : '';
  
  const sub1 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.st_vacina_polio = 1 THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE EXTRACT(YEAR FROM AGE(c.dt_nascimento)) < 2 ${eqFilter}`, params, 95, 90);
  const sub2 = await calcularSubIndicador(`SELECT COUNT(DISTINCT CASE WHEN c.st_vacina_pentavalente = 1 THEN c.nu_cns END) as numerador, COUNT(DISTINCT c.nu_cns) as denominador FROM tb_cds_cad_individual c WHERE EXTRACT(YEAR FROM AGE(c.dt_nascimento)) < 2 ${eqFilter}`, params, 95, 90);
  
  const pacientes = await buscarPacientesPendentes(`SELECT c.nu_cns, c.no_cidadao, c.dt_nascimento, EXTRACT(YEAR FROM AGE(c.dt_nascimento))::INTEGER as idade, c.nu_cpf_cidadao as nu_cpf, e.no_equipe, p.no_profissional as no_acs, NULL as ultima_consulta, 0 as dias_sem_consulta FROM tb_cds_cad_individual c LEFT JOIN tb_dim_equipe e ON c.co_dim_equipe = e.co_seq_dim_equipe LEFT JOIN tb_dim_profissional p ON c.co_dim_profissional_acs = p.co_seq_dim_profissional WHERE EXTRACT(YEAR FROM AGE(c.dt_nascimento)) < 2 AND (c.st_vacina_polio = 0 OR c.st_vacina_pentavalente = 0) ${eqFilter} LIMIT 100`, params, (row) => {
    const pendencias = [];
    if (!row.st_vacina_polio) pendencias.push('Vacina Polio pendente');
    if (!row.st_vacina_pentavalente) pendencias.push('Vacina Pentavalente pendente');
    return { pendencias, prioridade: 'alta' as const };
  });
  
  const resultadoAtual = sub1.resultado;
  const meta = 95;
  return {
    indicador: { codigo: 'C7', nome: 'Vacinação de crianças', resultado_atual: resultadoAtual, meta, gap: meta - resultadoAtual },
    subindicadores: [{ ...sub1, codigo: 'C7.1', nome: 'Crianças com Polio', descricao: 'Crianças <2 anos com vacina Polio' }, { ...sub2, codigo: 'C7.2', nome: 'Crianças com Pentavalente', descricao: 'Crianças <2 anos com vacina Pentavalente' }],
    pacientes_pendentes: pacientes,
    acoes_sugeridas: [{ tipo: 'visita_acs', descricao: 'Visitar famílias com crianças sem vacina', responsavel: 'ACS', prazo_dias: 7, pacientes_alvo: pacientes.length, impacto_estimado: 40 }],
    roadmap: { atendimentos_necessarios: Math.ceil((meta - resultadoAtual) / 100 * sub1.denominador), visitas_necessarias: pacientes.length, distribuicao_acs: await calcularDistribuicaoACS(pacientes), prazo_estimado_dias: 15 }
  };
}
