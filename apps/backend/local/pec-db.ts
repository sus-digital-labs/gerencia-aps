import { readFileSync } from "node:fs";
import { TRPCError } from "@trpc/server";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const maxActive = 3;
const maxWaiting = 12;
const pool = new Pool({
  host: process.env.SUS_PEC_HOST ?? "127.0.0.1",
  port: 5432,
  database: process.env.SUS_PEC_DATABASE ?? "esus",
  user: process.env.SUS_PEC_USER ?? "sus_analytics_web",
  password: () => readFileSync("/run/secrets/pec_password", "utf8").trim(),
  max: maxActive,
  connectionTimeoutMillis: 2_500,
  idleTimeoutMillis: 20_000,
  query_timeout: 27_000,
  application_name: process.env.SUS_PEC_APPLICATION_NAME ?? "sus-analytics-web",
  options: [
    "-c default_transaction_read_only=on",
    "-c statement_timeout=24000",
    "-c lock_timeout=2000",
    "-c idle_in_transaction_session_timeout=27000",
    "-c search_path=pg_catalog,public",
  ].join(" "),
});

let active = 0;
const queue: Array<() => void> = [];
let availability: { ready: boolean; expiresAt: number } | undefined;
let probing: Promise<boolean> | undefined;

pool.on("error", () => {
  availability = undefined;
});

function busy() {
  return new TRPCError({ code: "TOO_MANY_REQUESTS", message: "O PEC está atendendo outras consultas. Tente novamente." });
}

async function takeSlot() {
  if (active < maxActive) {
    active += 1;
    return;
  }
  if (queue.length >= maxWaiting) throw busy();
  await new Promise<void>((resolve, reject) => {
    const start = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      const position = queue.indexOf(start);
      if (position >= 0) queue.splice(position, 1);
      reject(busy());
    }, 25_000);
    queue.push(start);
  });
}

async function readOnly<T>(operation: (client: PoolClient) => Promise<T>) {
  await takeSlot();
  let client: PoolClient | undefined;
  let complete = false;
  try {
    client = await pool.connect();
    await client.query("BEGIN READ ONLY");
    const result = await operation(client);
    await client.query("COMMIT");
    complete = true;
    return result;
  } finally {
    client?.release(!complete);
    const next = queue.shift();
    if (next) next();
    else active -= 1;
  }
}

export async function queryPEC<Row extends QueryResultRow>(
  sql: string, values: unknown[] = [], options: { setBased?: boolean } = {},
): Promise<Row[]> {
  if (!/^\s*(SELECT|WITH)\b/i.test(sql)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta operação não é uma consulta do PEC." });
  }
  try {
    const statement = { text: sql, values, queryMode: "extended" as const };
    return await readOnly(async client => {
      // PostgreSQL 9.6 underestimates the territorial coorte built from audit tables.
      if (options.setBased) await client.query("SET LOCAL enable_nestloop = off");
      return (await client.query<Row>(statement)).rows;
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Consulta ao PEC indisponível." });
  }
}

export async function pecReady() {
  if (availability && Date.now() < availability.expiresAt) return availability.ready;
  if (probing) return probing;
  probing = queryPEC<{ allowed: boolean }>(`
    SELECT current_setting('transaction_read_only') = 'on'
      AND NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
      AND NOT has_database_privilege(current_database(), 'CREATE')
      AND has_table_privilege('public.tb_equipe', 'SELECT')
      AND has_table_privilege('public.tb_unidade_saude', 'SELECT')
      AND has_table_privilege('public.tb_cidadao_vinculacao_equipe', 'SELECT')
      AND has_table_privilege('public.tb_cidadao', 'SELECT')
      AND NOT has_table_privilege('public.tb_cidadao', 'INSERT, UPDATE, DELETE, TRUNCATE')
      AS allowed
    FROM pg_roles r WHERE r.rolname = current_user
  `).then(rows => rows[0]?.allowed === true, () => false)
    .then(ready => {
      availability = { ready, expiresAt: Date.now() + (ready ? 20_000 : 3_000) };
      return ready;
    }).finally(() => {
      probing = undefined;
    });
  return probing;
}

export function closePec() {
  return pool.end();
}
