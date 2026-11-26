import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { initTRPC, TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { parse as parseCookie } from "cookie";
import express, { type Request, type Response } from "express";
import superjson from "superjson";
import { ZodError } from "zod";
import { currentApsCompetence } from "@shared/aps-competence";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { localReturnPath } from "@shared/local-navigation";
import { AggregateCache } from "./cache";
import {
  indicatorRequestSchema, lastPecMonth, loadIndicators, localRuleVersion, type LocalPanelData,
} from "./indicators";
import { closePec, pecReady } from "./pec-db";
import { listPecTeams } from "./pec-directory";
import { contributionRequestSchema, loadContributions, loadRoster, rosterRequestSchema } from "./nominal";
import { credentialsFrom, readOperatorVerifier, verifyOperator } from "./operator-auth";
import { importCvatComplements, readCvatComplements } from "./analytics/cvat-complements";
import { CVAT_FILE_LIMIT } from "./analytics/cvat-files";
import { cvatPublicRequestSchema, importPublicCvatCsv, loadCvatPublic } from "./analytics/cvat-public";
import { acsRouter } from "./acs";
import { mountReportRoutes } from "./reports";
import { territoryRequestSchema, loadTerritory, qualityRequestSchema, loadQuality, qualityListRequestSchema, loadQualityList,
  gamificationRequestSchema, loadGamification, loadLocalSettings, vigilanceRequestSchema, loadVigilance,
  womensHealthRequestSchema, loadWomensHealth } from "./modules";

const port = 3000;
const cacheSeconds = 300;
const panelCache = new AggregateCache<LocalPanelData>(cacheSeconds * 1000, 128);
const directoryCache = new AggregateCache<Awaited<ReturnType<typeof readDirectory>>>(60_000, 1);
const webRoot = fileURLToPath(new URL("./public", import.meta.url));

const operator = readOperatorVerifier("/run/secrets/operator_login");
const cookieName = "sus_analytics_web_anton254_session";
const cookieOptions = { httpOnly: true, sameSite: "strict" as const, path: "/" };
const sessionLifetime = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
let authWindowEnds = 0;
let attempts = 0;
let pendingLogins = 0;

function sessionKey(req: Request) {
  const token = parseCookie(req.get("cookie") ?? "")[cookieName];
  return token && /^[0-9a-f]{64}$/.test(token) ? digest(token) : undefined;
}

function hasSession(req: Request) {
  const key = sessionKey(req);
  if (!key) return false;
  const deadline = sessions.get(key);
  if (deadline && deadline > Date.now()) return true;
  sessions.delete(key);
  return false;
}

function revokeSession(req: Request) {
  const key = sessionKey(req);
  if (key) sessions.delete(key);
}

function sameOrigin(req: Request) {
  return req.get("origin") === `http://${req.get("host")}`;
}

const app = express();
app.disable("x-powered-by");
app.set("query parser", "simple");

app.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (!/^(localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/.test(req.get("host") ?? "")) {
    res.status(421).end();
    return;
  }
  next();
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/readyz", async (_req, res) => {
  const ready = await pecReady();
  res.status(ready ? 200 : 503).json({ pec: ready ? "available" : "unavailable" });
});

app.get("/login", (req, res) => {
  if (hasSession(req)) res.redirect(302, localReturnPath(req.query.next));
  else res.sendFile(`${webRoot}/index.html`);
});

app.post("/api/local/auth/login", express.json({ limit: "4kb" }), async (req, res) => {
  if (!sameOrigin(req) || !req.is("application/json")) {
    res.status(403).json({ message: "Abra o formulário de login do SUS Analytics Web." });
    return;
  }
  const now = Date.now();
  if (now >= authWindowEnds) {
    authWindowEnds = now + 60_000;
    attempts = 0;
  }
  if (attempts >= 8 || pendingLogins >= 2) {
    res.set("Retry-After", String(Math.max(1, Math.ceil((authWindowEnds - now) / 1000))));
    res.status(429).json({ message: "Aguarde antes de tentar entrar novamente." });
    return;
  }
  attempts += 1;
  pendingLogins += 1;
  try {
    const credentials = credentialsFrom(req.body);
    if (!credentials || !await verifyOperator(operator, credentials)) {
      res.status(401).json({ message: "E-mail ou senha inválidos." });
      return;
    }
    revokeSession(req);
    for (const [key, deadline] of sessions) {
      if (deadline <= now) sessions.delete(key);
    }
    const oldest = sessions.keys().next().value;
    if (sessions.size >= 32 && oldest !== undefined) sessions.delete(oldest);
    const token = randomBytes(32).toString("hex");
    sessions.set(digest(token), now + sessionLifetime);
    attempts = 0;
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: sessionLifetime }).status(204).end();
  } catch {
    res.status(503).json({ message: "Login local temporariamente indisponível." });
  } finally {
    pendingLogins -= 1;
  }
});

app.post("/api/local/auth/logout", (req, res) => {
  if (!sameOrigin(req)) {
    res.status(403).end();
    return;
  }
  revokeSession(req);
  res.clearCookie(cookieName, cookieOptions).status(204).end();
});

const rpc = initTRPC.context<{ req: Request; res: Response }>().create({ transformer: superjson });
const authenticated = rpc.procedure.use(({ ctx, next }) => {
  if (!hasSession(ctx.req)) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next();
});
const localRouter = rpc.router({
  auth: rpc.router({
    me: authenticated.query((): { name: string; email: string | null; role: "admin"; loginMethod: "local" } | null =>
      ({ name: "Superadmin", email: null, role: "admin", loginMethod: "local" })),
    logout: authenticated.mutation(({ ctx }) => {
      if (!sameOrigin(ctx.req)) throw new TRPCError({ code: "FORBIDDEN" });
      revokeSession(ctx.req);
      ctx.res.clearCookie(cookieName, cookieOptions);
      return { success: true };
    }),
  }),
});
export type LocalAppRouter = typeof localRouter;
app.use("/api/trpc", createExpressMiddleware({ router: localRouter, createContext: ({ req, res }) => ({ req, res }) }));

app.use("/api", (req, res, next) => {
  if (hasSession(req)) next();
  else res.status(401).json({ message: "Entre com as credenciais do superadmin." });
});

async function readDirectory() {
  const [teams, month] = await Promise.all([listPecTeams(), lastPecMonth()]);
  return { teams, month, currentMonth: currentApsCompetence() };
}

function api(read: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      res.json(await read(req));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Confira a unidade, a equipe, a competência e a página selecionadas." });
      } else if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
        res.status(getHTTPStatusCodeFromError(error)).json({ message: error.message });
      } else {
        res.status(503).json({ message: "O PEC local está temporariamente indisponível." });
      }
    }
  };
}

app.get("/api/local/directory", api(async () => {
  return (await directoryCache.read(currentApsCompetence(), readDirectory)).value;
}));

app.get("/api/local/indicators", api(async req => {
  const codes = typeof req.query.code === "string" ? [req.query.code] : req.query.code;
  const input = indicatorRequestSchema.parse({ ...req.query, codes });
  const complements = readCvatComplements();
  const key = JSON.stringify([
    localRuleVersion, complements.revision, currentApsCompetence(), input.cnes, input.ine, input.month,
    input.codes ? [...new Set(input.codes)].sort() : null,
  ]);
  const { status, value } = await panelCache.read(key, () => loadIndicators(input, complements), data =>
    !data.indicators.some(indicator => indicator.history.some(month => month.status === "API_UNAVAILABLE")),
  );
  return { ...value, cache: { status, ttlSeconds: cacheSeconds } };
}));

app.get("/api/local/roster", api(req => loadRoster(rosterRequestSchema.parse(req.query))));
app.get("/api/local/contributions", api(req => loadContributions(contributionRequestSchema.parse(req.query))));
app.use("/api/local/acs", acsRouter(sameOrigin));
mountReportRoutes(app);
app.get("/api/local/territory", api(req => loadTerritory(territoryRequestSchema.parse(req.query))));
app.get("/api/local/quality", api(req => loadQuality(qualityRequestSchema.parse(req.query))));
app.get("/api/local/quality-list", api(req => loadQualityList(qualityListRequestSchema.parse(req.query))));
app.get("/api/local/vigilance", api(req => loadVigilance(vigilanceRequestSchema.parse(req.query))));
app.get("/api/local/womens-health", api(req => loadWomensHealth(womensHealthRequestSchema.parse(req.query))));
app.get("/api/local/gamification", api(req => loadGamification(gamificationRequestSchema.parse(req.query))));
app.get("/api/local/settings", api(loadLocalSettings));
app.get("/api/local/territorial/siaps", api(req => loadCvatPublic(cvatPublicRequestSchema.parse(req.query))));

function importTerritorialFile(importFile: (contents: Buffer) => unknown) {
  return api(async req => {
    if (!sameOrigin(req)) throw new TRPCError({ code: "FORBIDDEN", message: "Abra a página de Vínculos para importar o arquivo." });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Selecione o arquivo a importar." });
    }
    return importFile(req.body);
  });
}

app.post("/api/local/territorial/siaps", express.raw({ type: "text/csv", limit: CVAT_FILE_LIMIT }), importTerritorialFile(importPublicCvatCsv));
app.post("/api/local/territorial/complements", express.raw({ type: "application/json", limit: CVAT_FILE_LIMIT }), importTerritorialFile(importCvatComplements));
app.use("/api", (_req, res) => res.status(404).json({ message: "Recurso indisponível no perfil local." }));
app.use("/assets", express.static(`${webRoot}/assets`, { immutable: true, maxAge: "1y", fallthrough: false }));
app.get("*", (req, res) => {
  if (hasSession(req)) res.sendFile(`${webRoot}/index.html`);
  else res.redirect(302, `/login?next=${encodeURIComponent(localReturnPath(req.originalUrl))}`);
});

// Keep errors in the response contract and inspect readiness without writing request logs.
app.use((error: { status?: number }, _req: Request, res: Response, _next: express.NextFunction) => {
  if (error.status === 400 || error.status === 413) {
    res.status(error.status).json({ message: "O formulário de login é inválido." });
    return;
  }
  res.status(404).end();
});

const server = app.listen(port, "0.0.0.0");
function shutdown() {
  server.close(() => {
    void closePec().then(() => process.exit(0), () => process.exit(1));
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
