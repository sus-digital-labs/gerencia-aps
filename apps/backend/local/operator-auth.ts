import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

type OperatorVerifier = { version: 1; salt: string; digest: string };
type Credentials = { email: string; password: string };

export function credentialsFrom(input: unknown): Credentials | null {
  if (!input || typeof input !== "object" || !("email" in input) || !("password" in input)) return null;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s:@]+@[^\s:@]+\.[^\s:@]+$/.test(email) ||
      !password || Buffer.byteLength(password) > 1024 || /[\r\n\0]/.test(password)) return null;
  return { email, password };
}

export function readOperatorVerifier(path: string): OperatorVerifier {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (value?.version === 1 &&
        typeof value.salt === "string" && /^[0-9a-f]{64}$/.test(value.salt) &&
        typeof value.digest === "string" && /^[0-9a-f]{64}$/.test(value.digest)) {
      return { version: 1, salt: value.salt, digest: value.digest };
    }
  } catch {
    throw new Error("Configuração de autenticação do superadmin indisponível.");
  }
  throw new Error("Configuração de autenticação do superadmin inválida.");
}

function derive({ email, password }: Credentials, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(`${email}:${password}`, Buffer.from(salt, "hex"), 32, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

export async function verifyOperator(verifier: OperatorVerifier, credentials: Credentials) {
  return timingSafeEqual(await derive(credentials, verifier.salt), Buffer.from(verifier.digest, "hex"));
}

export async function buildOperatorVerifier(emailPath: string, passwordPath: string, previousPath?: string) {
  const read = (path: string) => readFileSync(path, "utf8").replace(/^\uFEFF/, "").replace(/\r?\n$/, "");
  const credentials = credentialsFrom({ email: read(emailPath), password: read(passwordPath) });
  if (!credentials) throw new Error("Confira o formato dos dois arquivos de credenciais do superadmin.");

  if (previousPath) {
    const previous = readOperatorVerifier(previousPath);
    if (await verifyOperator(previous, credentials)) return previous;
  }
  const salt = randomBytes(32).toString("hex");
  return { version: 1, salt, digest: (await derive(credentials, salt)).toString("hex") };
}
