import 'dotenv/config';
import cron from 'node-cron';
import axios from 'axios';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/15 * * * *';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'local_test_token';
const CHECKPOINT_FILE = path.join(process.cwd(), 'checkpoints.json');

const TABLES_TO_SYNC = [
  { name: 'tb_dim_unidade_saude', cursorCol: 'co_seq_dim_unidade_saude' },
  { name: 'tb_dim_equipe', cursorCol: 'co_seq_dim_equipe' },
  { name: 'tb_fat_atendimento_individual', cursorCol: 'co_seq_fat_atd_ind' },
  { name: 'tb_cds_cad_individual', cursorCol: 'co_seq_cds_cad_individual' },
  { name: 'tb_fat_visita_domiciliar', cursorCol: 'co_seq_fat_visita_domiciliar' }
];

const db = new Pool({
  connectionString: process.env.PEC_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/esus',
});

async function loadCheckpoints() {
  try {
    const data = await fs.readFile(CHECKPOINT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

async function saveCheckpoints(checkpoints: Record<string, string>) {
  await fs.writeFile(CHECKPOINT_FILE, JSON.stringify(checkpoints, null, 2));
}

async function runSync() {
  console.log(`[SYNC] Iniciando sincronização incremental com o PEC...`);
  let hasErrors = false;
  
  try {
    const checkpoints = await loadCheckpoints();

    for (const table of TABLES_TO_SYNC) {
      console.log(`[SYNC] Processando tabela: ${table.name}`);
      
      const cursor = checkpoints[table.name] || '0';
      
      // Simulação ou chamada real ao PG (ajuste query real baseada no rust collector.rs)
      // Exemplo de query baseada no log de testes do rust:
      const query = `SELECT * FROM ${table.name} WHERE ${table.cursorCol} > $1::text::bigint ORDER BY ${table.cursorCol} ASC LIMIT 500`;
      
      let rows: any[] = [];
      try {
        const result = await db.query(query, [cursor]);
        rows = result.rows;
      } catch (err: any) {
        console.error(`[SYNC] Erro ao ler tabela ${table.name} (PEC pode estar inacessível, pulando...)`);
        hasErrors = true;
        continue;
      }

      if (rows.length === 0) {
        console.log(`[SYNC] Tabela ${table.name} atualizada. Nenhum dado novo.`);
        continue;
      }

      console.log(`[SYNC] Extraídos ${rows.length} registros da tabela ${table.name}.`);

      const payload = {
        table: table.name,
        cursor: cursor,
        rows: rows
      };

      // Compressão GZIP conforme especificação S05 Edge (rust sender.rs)
      const compressedPayload = await gzip(JSON.stringify(payload));

      try {
        const response = await axios.post(`${SERVER_URL}/v1/sync/batches`, compressedPayload, {
          headers: {
            'Authorization': `Bearer ${AGENT_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip'
          }
        });

        if (response.status === 200 || response.status === 202) {
          // Update checkpoint based on the last row's cursor
          const lastRow = rows[rows.length - 1];
          checkpoints[table.name] = lastRow[table.cursorCol].toString();
          await saveCheckpoints(checkpoints);
          console.log(`[SYNC] Lote confirmado pelo servidor. Checkpoint de ${table.name} avançou para ${checkpoints[table.name]}.`);
        }
      } catch (err: any) {
        console.error(`[SYNC] Falha ao enviar lote para o servidor: ${err.message}`);
        hasErrors = true;
      }
    }

  } catch (error: any) {
    console.error(`[SYNC] Erro crítico durante a sincronização:`, error.message);
  } finally {
    if (!hasErrors) {
      console.log(`[SYNC] Ciclo de sincronização concluído com sucesso.`);
    }
  }
}

// Inicia o daemon
console.log(`[DAEMON] Agente Local de Sincronização (TS Port) iniciado. Cron: ${SYNC_INTERVAL}`);
cron.schedule(SYNC_INTERVAL, runSync);

// Executa imediatamente na inicialização
runSync();
