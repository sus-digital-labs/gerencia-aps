import { Pool } from 'pg';

/**
 * Conexão com PostgreSQL do e-SUS PEC
 * 
 * Suporta 3 modos de conexão:
 * 1. Réplica Docker (porta 5500) - Preferido para produção
 *    - PostgreSQL 16 com FDW conectado ao PEC 9.6
 *    - Schema 'pec' contém views das tabelas do PEC
 *    - search_path: pec, dados, public, pec_fdw
 *    - Tabelas acessíveis sem prefixo (tb_atend, tb_cidadao, etc.)
 * 
 * 2. PEC direto local (porta 5433) - Para desenvolvimento
 * 3. PEC remoto (bc.dmpec.com.br:15433) - Fallback
 */

const PEC_HOST = process.env.PEC_DB_HOST || '149.78.176.0';
const PEC_PORT = parseInt(process.env.PEC_DB_PORT || '5500');
const PEC_DB = process.env.PEC_DB_NAME || 'esus_replica';
const PEC_USER = process.env.PEC_DB_USER || 'sus_analytics';
const PEC_PASS = process.env.PEC_DB_PASSWORD || 'SusAnalytics2026!Secure';

const isReplica = PEC_PORT === 5500 || PEC_DB === 'esus_replica';

export const pecPool = new Pool({
  host: PEC_HOST,
  port: PEC_PORT,
  database: PEC_DB,
  user: PEC_USER,
  password: PEC_PASS,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  ssl: process.env.PEC_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Na réplica Docker, o search_path está configurado como: pec, dados, public, pec_fdw
// Isso permite acessar tb_atend, tb_cidadao, etc. sem prefixo de schema
export const PEC_SCHEMA = isReplica ? 'pec' : 'public';

// Não precisa de mapeamento - search_path resolve automaticamente
const TABLE_MAP: Record<string, string> = {};

// Resolve nome da tabela: se réplica, usa materialized view; se PEC, usa tabela original
export function resolveTable(tableName: string): string {
  if (isReplica && TABLE_MAP[tableName]) {
    return TABLE_MAP[tableName];
  }
  return tableName;
}

// Log de conexão
pecPool.on('connect', () => {
  const mode = isReplica 
    ? `RÉPLICA DOCKER (${PEC_HOST}:${PEC_PORT}/${PEC_DB})`
    : `PEC DIRETO (${PEC_HOST}:${PEC_PORT}/${PEC_DB})`;
  console.log(`[PEC] ✅ Conectado ao PostgreSQL - Modo: ${mode}`);
});

pecPool.on('error', (err) => {
  console.error('[PEC] ❌ Erro na conexão:', err.message);
});

// Helper para executar queries
export async function queryPEC<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const result = await pecPool.query(sql, params);
    return result.rows as T[];
  } catch (error: any) {
    console.error('[PEC] Erro na query:', error.message);
    throw error;
  }
}

// Helper para verificar status da réplica
export async function getReplicaStatus() {
  try {
    const testResult = await queryPEC('SELECT NOW() as server_time, current_database() as db_name');
    
    const counts = await queryPEC(`
      SELECT 
        (SELECT count(*) FROM pec.tb_cidadao) as cidadaos,
        (SELECT count(*) FROM pec.tb_atend) as atendimentos,
        (SELECT count(*) FROM pec.tb_prontuario) as prontuarios
    `);

    const viewCount = await queryPEC(`
      SELECT schemaname, count(*) as total 
      FROM pg_matviews 
      GROUP BY schemaname 
      ORDER BY schemaname
    `);

    const fdwCount = await queryPEC(`
      SELECT count(*) as total 
      FROM information_schema.tables 
      WHERE table_schema = 'pec_fdw'
    `);

    return {
      mode: isReplica ? 'replica_docker' : 'pec_direto',
      host: `${PEC_HOST}:${PEC_PORT}`,
      database: PEC_DB,
      serverTime: testResult[0]?.server_time,
      counts: counts[0] || {},
      materializedViews: viewCount,
      foreignTables: parseInt(fdwCount[0]?.total) || 0,
      status: 'connected'
    };
  } catch (error: any) {
    return { 
      mode: isReplica ? 'replica_docker' : 'pec_direto',
      host: `${PEC_HOST}:${PEC_PORT}`,
      database: PEC_DB,
      error: error.message,
      status: 'error'
    };
  }
}

// Fechar pool ao encerrar aplicação
process.on('SIGTERM', () => {
  pecPool.end();
});
