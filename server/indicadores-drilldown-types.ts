/**
 * Tipos e Interfaces para Drill-Down de Indicadores Previne Brasil
 * Autor: Eduardo Muniz | Empresa: DM Technology
 */

export type StatusIndicador = 'acima' | 'na_meta' | 'abaixo';
export type PrioridadePaciente = 'alta' | 'media' | 'baixa';
export type TipoAcao = 'agendamento' | 'busca_ativa' | 'visita_acs' | 'campanha' | 'educacao';

export interface SubIndicador {
  codigo: string; // Ex: "C1.1", "B3.2"
  nome: string;
  descricao: string;
  numerador: number;
  denominador: number;
  resultado: number; // Percentual
  meta: number;
  status: StatusIndicador;
}

export interface PacientePendencia {
  nu_cns: string;
  no_cidadao: string;
  dt_nascimento: string;
  idade: number;
  nu_cpf: string | null;
  no_equipe: string;
  no_acs: string | null;
  pendencias: string[]; // Lista de pendências específicas
  prioridade: PrioridadePaciente;
  ultima_consulta?: string | null;
  dias_sem_consulta?: number;
}

export interface AcaoSugerida {
  tipo: TipoAcao;
  descricao: string;
  responsavel: string; // Ex: "ACS", "Enfermeira", "Médico"
  prazo_dias: number;
  pacientes_alvo: number; // Quantos pacientes serão impactados
  impacto_estimado: number; // Percentual estimado de melhoria no indicador
}

export interface Roadmap {
  atendimentos_necessarios: number;
  visitas_necessarias: number;
  distribuicao_acs: { no_acs: string; qtd_visitas: number }[];
  prazo_estimado_dias: number;
}

export interface DrillDownResult {
  indicador: {
    codigo: string;
    nome: string;
    resultado_atual: number;
    meta: number;
    gap: number; // Diferença para a meta
  };
  subindicadores: SubIndicador[];
  pacientes_pendentes: PacientePendencia[];
  acoes_sugeridas: AcaoSugerida[];
  roadmap: Roadmap;
}
