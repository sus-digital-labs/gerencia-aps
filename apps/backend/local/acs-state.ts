import { createHmac, timingSafeEqual } from "node:crypto";
import { closeSync, constants, lstatSync, openSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const directory = "/run/acs-state";
const filename = `${directory}/task-status.sqlite`;
const tokenPattern = /^[0-9a-f]{64}\.\d{13}\.[0-9a-f]{64}$/;

export const isAcsTaskToken = (value: string) => tokenPattern.test(value);
export type AcsTaskStatus = "open" | "completed";
type State = { status: AcsTaskStatus; updatedAt: string };
type TaskState = {
  key: (origin: string) => string;
  handle: (key: string) => string;
  read: (keys: string[]) => Map<string, State>;
  update: (handle: string, status: AcsTaskStatus) => State | undefined;
};

let store: TaskState | undefined;

function openPrivateDatabase() {
  const mounted = readFileSync("/proc/self/mountinfo", "utf8").split("\n").some(entry => entry.split(" ")[4] === directory);
  if (!mounted || !lstatSync(directory).isDirectory()) return;
  try {
    closeSync(openSync(filename, constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW | constants.O_RDWR, 0o600));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const file = lstatSync(filename);
  if (!file.isFile() || (file.mode & 0o077) !== 0) return;
  return new DatabaseSync(filename);
}

export function getAcsTaskState(): TaskState | undefined {
  if (store) return store;
  let db: DatabaseSync | undefined;
  try {
    db = openPrivateDatabase();
    if (!db) return;
    db.exec(`
      PRAGMA busy_timeout = 1500;
      CREATE TABLE IF NOT EXISTS metadata (secret TEXT NOT NULL, id INTEGER PRIMARY KEY CHECK (id=1));
      INSERT OR IGNORE INTO metadata (id,secret) VALUES (1, hex(randomblob(32)));
      CREATE TABLE IF NOT EXISTS task_status (
        task_key TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('open','completed')),
        updated_at TEXT NOT NULL
      );
    `);
    const secret = db.prepare("SELECT secret FROM metadata WHERE id=1").get()?.secret;
    if (typeof secret !== "string" || !/^[0-9A-F]{64}$/.test(secret)) throw new Error("Configuração de tarefas inválida.");
    const sign = (text: string) => createHmac("sha256", Buffer.from(secret, "hex")).update(text).digest("hex");
    const find = db.prepare(`
      SELECT s.task_key AS key, s.status, s.updated_at AS updatedAt
      FROM json_each(?) input JOIN task_status s ON s.task_key=input.value
    `);
    const write = db.prepare(`
      INSERT INTO task_status (task_key,status,updated_at) VALUES (?,?,?)
      ON CONFLICT(task_key) DO UPDATE SET status=excluded.status,
        updated_at=CASE WHEN task_status.status=excluded.status THEN task_status.updated_at ELSE excluded.updated_at END
      RETURNING status, updated_at AS updatedAt
    `);
    const read = (keys: string[]) => new Map(
      (find.all(JSON.stringify(keys)) as Array<State & { key: string }>)
        .map(row => [row.key, { status: row.status, updatedAt: row.updatedAt }]),
    );
    store = {
      key: origin => sign(`key:${origin}`),
      handle: key => {
        const expires = Date.now() + 30 * 60 * 1000;
        return `${key}.${expires}.${sign(`edit:${key}:${expires}`)}`;
      },
      read,
      update: (handle, status) => {
        if (!isAcsTaskToken(handle)) return;
        const [key, expires, signature] = handle.split(".");
        if (Number(expires) < Date.now() || !timingSafeEqual(
          Buffer.from(signature, "hex"), Buffer.from(sign(`edit:${key}:${expires}`), "hex"),
        )) return;
        return write.get(key, status, new Date().toISOString()) as State;
      },
    };
    return store;
  } catch {
    db?.close();
    return undefined;
  }
}
