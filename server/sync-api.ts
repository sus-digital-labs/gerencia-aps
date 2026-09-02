/**
 * API de Sincronização - Recebe dados dos agentes clientes
 * Autor: Eduardo Muniz | DM Technology
 */

import { getDb } from './db';
import { syncHistory } from '../drizzle/schema';

export interface SyncPayload {
  unidade_id: string;
  timestamp: string;
  dados: {
    indicadores: Array<{
      codigo: string;
      numerador: number;
      denominador: number;
      resultado: number;
      meta: number;
    }>;
  };
}

/**
 * Valida token de autenticação do cliente
 */
export function validarTokenCliente(token: string): boolean {
  // TODO: Implementar validação real com banco de dados
  // Por enquanto, aceita qualquer token não vazio
  return Boolean(token && token.length > 10);
}

/**
 * Processa dados recebidos do agente cliente
 */
export async function processarSincronizacao(payload: SyncPayload): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[SYNC] Recebendo dados da unidade ${payload.unidade_id}`);
    console.log(`[SYNC] Timestamp: ${payload.timestamp}`);
    console.log(`[SYNC] Indicadores recebidos: ${payload.dados.indicadores.length}`);

    // Validar payload
    if (!payload.unidade_id || !payload.dados || !Array.isArray(payload.dados.indicadores)) {
      return {
        success: false,
        message: 'Payload inválido',
      };
    }

    const db = await getDb();
    if (db) {
      await db.insert(syncHistory).values({
        unidadeId: payload.unidade_id,
        timestamp: new Date(payload.timestamp),
        dadosJson: payload.dados,
      });
      console.log(`[SYNC] Histórico salvo no banco de dados para unidade ${payload.unidade_id}`);
    } else {
      console.warn(`[SYNC] Banco de dados não disponível, pulando persistência para ${payload.unidade_id}`);
    }

    // Por enquanto, apenas log
    for (const indicador of payload.dados.indicadores) {
      console.log(`  - ${indicador.codigo}: ${indicador.resultado.toFixed(2)}% (Meta: ${indicador.meta}%)`);
    }

    return {
      success: true,
      message: `${payload.dados.indicadores.length} indicadores processados com sucesso`,
    };
  } catch (error: any) {
    console.error(`[SYNC] Erro ao processar sincronização: ${error.message}`);
    return {
      success: false,
      message: `Erro interno: ${error.message}`,
    };
  }
}

/**
 * Gera token de autenticação para novo cliente
 */
export function gerarTokenCliente(unidadeId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${unidadeId}_${timestamp}_${random}`;
}
