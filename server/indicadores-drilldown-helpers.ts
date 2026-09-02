/**
 * Funções Auxiliares para Drill-Down de Indicadores
 * Autor: Eduardo Muniz | Empresa: DM Technology
 */

import { queryPEC } from './pec-db';
import type { StatusIndicador, PacientePendencia, SubIndicador } from './indicadores-drilldown-types';

export function calcStatus(resultado: number, metaAlta: number, metaBaixa: number): StatusIndicador {
  return resultado >= metaAlta ? 'acima' : resultado >= metaBaixa ? 'na_meta' : 'abaixo';
}

export function calcResultado(numerador: number, denominador: number): number {
  if (denominador === 0) return 0;
  return parseFloat(((numerador / denominador) * 100).toFixed(2));
}

export async function calcularDistribuicaoACS(
  pacientes: PacientePendencia[]
): Promise<{ no_acs: string; qtd_visitas: number }[]> {
  const distribuicao = new Map<string, number>();
  pacientes.forEach(p => {
    const acs = p.no_acs || 'Sem ACS definido';
    distribuicao.set(acs, (distribuicao.get(acs) || 0) + 1);
  });
  return Array.from(distribuicao.entries())
    .map(([no_acs, qtd_visitas]) => ({ no_acs, qtd_visitas }))
    .sort((a, b) => b.qtd_visitas - a.qtd_visitas);
}

export async function calcularSubIndicador(
  query: string,
  params: (string | number)[],
  meta: number,
  metaBaixa: number
): Promise<SubIndicador & { numerador: number; denominador: number; resultado: number; meta: number; status: StatusIndicador }> {
  const result = await queryPEC(query, params);
  const numerador = parseInt(String(result[0]?.numerador || '0'));
  const denominador = parseInt(String(result[0]?.denominador || '1'));
  const resultado = calcResultado(numerador, denominador);
  
  return {
    codigo: '',
    nome: '',
    descricao: '',
    numerador,
    denominador,
    resultado,
    meta,
    status: calcStatus(resultado, meta, metaBaixa)
  };
}

export async function buscarPacientesPendentes(
  query: string,
  params: (string | number)[],
  mapPendencias: (row: any) => { pendencias: string[]; prioridade: 'alta' | 'media' | 'baixa' }
): Promise<PacientePendencia[]> {
  const result = await queryPEC(query, params);
  return result.map((row: any) => {
    const { pendencias, prioridade } = mapPendencias(row);
    return {
      nu_cns: row.nu_cns,
      no_cidadao: row.no_cidadao,
      dt_nascimento: row.dt_nascimento,
      idade: parseInt(String(row.idade || '0')),
      nu_cpf: row.nu_cpf,
      no_equipe: row.no_equipe,
      no_acs: row.no_acs,
      pendencias,
      prioridade,
      ultima_consulta: row.ultima_consulta,
      dias_sem_consulta: parseInt(String(row.dias_sem_consulta || '0'))
    };
  });
}
