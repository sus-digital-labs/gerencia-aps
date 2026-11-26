import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { buildOperatorVerifier } from "../../apps/backend/local/operator-auth.ts";

const origin = "http://127.0.0.1:3000";
const email = "operador@example.test";
const password = randomBytes(24).toString("hex");
const primary = "cnes=9900001&ine=9900000001";
const dental = "cnes=9900002&ine=9900000002";
const multi = "cnes=9900002&ine=9900000003";
const teams = "9900000001,9900000002,9900000003";
const secret = "/run/secrets/";
writeFileSync(`${secret}pec_password`, process.env.SUS_FIXTURE_PEC_PASSWORD, { mode: 0o600 });
writeFileSync(`${secret}email`, email, { mode: 0o600 });
writeFileSync(`${secret}password`, password, { mode: 0o600 });
const verifier = await buildOperatorVerifier(`${secret}email`, `${secret}password`);
writeFileSync(`${secret}operator_login`, JSON.stringify(verifier), { mode: 0o600 });

async function until(description, check) {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch {
      // Server and browser navigation briefly close their connections during startup.
    }
    await delay(120);
  }
  throw new Error(description);
}

function request(path, options) {
  return fetch(`${origin}${path}`, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...options });
}

function login(loginPassword, source = origin) {
  return request("/api/local/auth/login", {
    method: "POST", headers: { origin: source, "content-type": "application/json" },
    body: JSON.stringify({ email, password: loginPassword }),
  });
}

function startApp(env = process.env) {
  return spawn(process.execPath, ["dist/pec-local.js"], { env, stdio: "inherit" });
}

async function stopApp(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once("exit", resolve));
  child.kill();
  await exited;
}

let app = startApp();
let browser;
let socket;
try {
  await until("Prontidão do PEC sintético", async () => (await request("/readyz")).ok);
  assert.equal((await request("/healthz")).status, 200);
  assert.equal((await request("/nominais")).status, 302);
  for (const resource of ["directory", "indicators", "roster", "contributions"]) {
    assert.equal((await request(`/api/local/${resource}`)).status, 401);
  }
  assert.equal((await login("fixture-rejeitada")).status, 401);
  assert.equal((await login(password, "https://example.test")).status, 403);
  const session = await login(password);
  assert.equal(session.status, 204);
  const setCookie = session.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const headers = { cookie: setCookie.split(";")[0] };
  const api = (path, query) => request(`/api/local/${path}${query ? `?${query}` : ""}`, { headers });
  async function json(path, query) {
    const response = await api(path, query);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("cache-control"), "no-store");
    return response.json();
  }

  const directory = await json("directory");
  assert.equal(directory.teams.map(team => team.ine).join(), teams);
  assert.equal(directory.month, "2025-10");
  assert.equal((await api("roster", "cnes=9900001&ine=9900000002")).status, 403);
  assert.equal((await api("roster", `${primary}&page=0`)).status, 400);
  const roster1 = await json("roster", `${primary}&page=1`);
  const roster2 = await json("roster", `${primary}&page=2`);
  assert.equal(roster1.rows.length, 50);
  assert.equal(roster1.rows[0].name, "Nome social sintético 02");
  assert.equal(roster1.hasNextPage, true);
  assert.deepEqual(roster2, { rows: [{ name: "Registro sintético 51" }], page: 2, hasNextPage: false });
  assert.deepEqual((await json("roster", dental)).rows, [{ name: "Registro sintético 53" }]);
  assert.deepEqual((await json("roster", multi)).rows, []);
  console.log("PASS SAW-01 autenticação e barreira da API / SAW-03 cadastro, paginação e escopo SQL");

  const result = (metric, month) => metric.history.find(item => item.referenceMonth === month);
  const c1Query = `${primary}&month=2025-10&code=C1`;
  const c1 = (await json("indicators", c1Query)).indicators[0];
  assert.deepEqual(c1.history.map(item => item.status), ["NO_DATA", "READY", "BLOCKED_BY_DATA_CONTRACT", "READY"]);
  const aug = result(c1, "2025-08");
  assert.deepEqual([aug.numerator, aug.denominator, aug.value], [1, 2, 50]);
  const sep = result(c1, "2025-09");
  assert.equal(Object.hasOwn(sep, "value"), false);
  const oct = result(c1, "2025-10");
  assert.deepEqual([oct.numerator, oct.denominator, oct.value], [0, 1, 0]);
  assert.equal((await json("indicators", c1Query)).cache.status, "HIT");
  const contributions = (await json("contributions", `${primary}&month=2025-08&code=C1`)).rows;
  assert.equal(contributions.reduce((count, row) => count + row.numerator, 0), aug.numerator);
  assert.equal(contributions.reduce((count, row) => count + row.denominator, 0), aug.denominator);
  const blockedList = await api("contributions", `${primary}&month=2025-09&code=C1`);
  assert.equal(blockedList.status, 412);
  assert.equal(Object.hasOwn(await blockedList.json(), "rows"), false);
  assert.equal((await api("contributions", `${primary}&month=${directory.currentMonth}&code=C1`)).status, 412);
  assert.equal((await api("contributions", `${dental}&month=2025-08&code=C1`)).status, 403);

  const primaryPanel = await json("indicators", `${primary}&month=2025-08`);
  const dentalPanel = await json("indicators", `${dental}&month=2025-10`);
  const multiPanel = await json("indicators", `${multi}&month=2025-10`);
  assert.deepEqual(primaryPanel.indicators.map(item => item.code), ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "CVAT1", "CVAT2", "CVAT3", "CVAT4", "CVAT5", "CVAT6"]);
  assert.deepEqual(dentalPanel.indicators.map(item => item.code), ["B1", "B2", "B3", "B4", "B5", "B6"]);
  assert.deepEqual(multiPanel.indicators.map(item => item.code), ["M1", "M2"]);
  for (const code of ["CVAT5", "CVAT6"]) {
    const metric = primaryPanel.indicators.find(item => item.code === code);
    assert.equal(result(metric, "2025-08").status, "BLOCKED_BY_DATA_CONTRACT");
  }
  const source = { authority: "Fonte sintética", document: "CVAT-QA", coveredThrough: "2025-08-31" };
  const records = ["2025-05", "2025-06", "2025-07", "2025-08"].map(month => ({
    cnes: "9900001", ine: "9900000001", month,
    benefits: { coverage: "PBF_E_BPC", withoutPriority: 300, demographicOnly: 100, benefitOnly: 100, both: 100, source },
    consolidation: {
      referencePopulation: 1000, individualOnly: 200, individualAndHousehold: 500,
      attendanceCount: 200, evaluations: 20, tieGroups: [],
      registrySource: source, populationSource: source, satisfactionSource: source,
    },
  }));
  const complements = "/run/b360/complementos.json";
  const cvatQuery = `${primary}&month=2025-08&code=CVAT5&code=CVAT6`;
  assert.equal(result((await json("indicators", cvatQuery)).indicators[0], "2025-08").status, "BLOCKED_BY_DATA_CONTRACT");
  writeFileSync(complements, JSON.stringify({ schema: "sus-analytics-web.cvat-complements.v1", records }));
  const complemented = (await json("indicators", cvatQuery)).indicators.map(metric => result(metric, "2025-08"));
  assert.deepEqual(complemented.map(item => [item.status, item.source, item.value]), [
    ["READY", "COMPLEMENTO", 800 / 600], ["READY", "COMPLEMENTO", 8.55],
  ]);
  writeFileSync(complements, "{}");
  assert.equal(result((await json("indicators", cvatQuery)).indicators[0], "2025-08").status, "BLOCKED_BY_DATA_CONTRACT");
  for (const [code, value] of [["B3", 50], ["B5", 0], ["B6", 100], ["M1", 1.5]]) {
    const isM1 = code === "M1";
    const panel = isM1 ? multiPanel : dentalPanel;
    const metric = result(panel.indicators.find(item => item.code === code), "2025-10");
    assert.equal(metric.value, value, code);
    const rows = (await json("contributions", `${isM1 ? multi : dental}&month=2025-10&code=${code}`)).rows;
    assert.equal(rows.reduce((count, row) => count + row.numerator, 0), metric.numerator, code);
    assert.equal(rows.reduce((count, row) => count + row.denominator, 0), metric.denominator, code);
  }
  assert.equal(result(multiPanel.indicators[1], "2025-10").status, "API_UNAVAILABLE");
  console.log("PASS SAW-02 21 códigos, séries C1/B3/B5/B6/M1 e CVAT5/6 / SAW-03 reconciliação nominal C1/B3/B5/B6/M1");

  const chromium = readdirSync("/ms-playwright").find(file => file.startsWith("chromium_headless_shell-"));
  browser = spawn(`/ms-playwright/${chromium}/chrome-headless-shell-linux64/chrome-headless-shell`, [
    "--no-sandbox", "--no-proxy-server", "--window-size=1360,900", "--remote-debugging-port=9222", "about:blank",
  ], { stdio: "ignore" });
  const page = await until("Página Chromium de QA", async () => {
    const response = await fetch("http://127.0.0.1:9222/json/list");
    return (await response.json()).find(item => item.type === "page");
  });
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let id = 0;
  const calls = new Map();
  socket.addEventListener("message", ({ data }) => {
    const reply = JSON.parse(data);
    calls.get(reply.id)?.(reply);
  });
  function command(method, params) {
    const call = ++id;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { calls.delete(call); reject(new Error(method)); }, 5_000);
      calls.set(call, reply => {
        clearTimeout(timer);
        calls.delete(call);
        if (reply.error) reject(new Error(reply.error.message));
        else resolve(reply.result);
      });
      socket.send(JSON.stringify({ id: call, method, params }));
    });
  }
  async function evaluate(expression) {
    const value = await command("Runtime.evaluate", { expression, returnByValue: true });
    if (value.exceptionDetails) throw new Error("Falha ao inspecionar a página Chromium.");
    return value.result.value;
  }
  const see = text => until(`Navegador deveria exibir: ${text}`, () => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`));
  const open = path => command("Page.navigate", { url: `${origin}${path}` });
  async function click(selectors, label) {
    const point = await until(`Controle esperado: ${label ?? selectors}`, () => evaluate(`(() => {
      const label = ${JSON.stringify(label ?? null)};
      const control = [...document.querySelectorAll(${JSON.stringify(selectors)})]
        .find(item => label === null || item.textContent.trim() === label);
      if (!control) return null;
      control.scrollIntoView({ block: 'nearest' });
      const rect = control.getBoundingClientRect();
      return rect.width && rect.height ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
    })()`));
    await command("Input.dispatchMouseEvent", { ...point, type: "mousePressed", button: "left", clickCount: 1 });
    await command("Input.dispatchMouseEvent", { ...point, type: "mouseReleased", button: "left", clickCount: 1 });
  }
  const detail = `/indicador?code=C1&${primary}&competencia=2025-08`;
  await open(detail);
  await see("Use as credenciais");
  await evaluate(`(() => {
    const form = document.querySelector('form');
    form.email.value = ${JSON.stringify(email)};
    form.password.value = ${JSON.stringify(password)};
    form.requestSubmit();
  })()`);
  await see("Detalhe do Indicador C1");
  await see("50%");
  await click('[role="tab"]', "Lista nominal");
  await see("Nome social sintético 02");
  await click('[role="combobox"][aria-label="Mês"]');
  await click('[role="option"]', "Setembro");
  await until("Filtro conserva o indicador e atualiza a competência", () => evaluate(`(() => {
    const params = new URLSearchParams(location.search);
    return params.get('code') === 'C1' && params.get('competencia') === '2025-09';
  })()`));
  await see("O recorte não tem contribuições nominais disponíveis.");
  await click('[role="tab"]', "Visão Geral");
  await until("Cartão C1 indica bloqueio no mês escolhido", () =>
    evaluate("Boolean(document.querySelector('[data-indicator-code=C1][data-pec-status=BLOCKED_BY_DATA_CONTRACT]'))"));
  await open(`/nominais?${primary}`);
  await see("Página 1");
  await click("button", "Próxima");
  await see("Página 2");
  await see("Registro sintético 51");
  await click('[role="combobox"][aria-label="Unidade"]');
  await click('[role="option"]', "Unidade sintética B");
  await see("Registro sintético 53");
  await open(`/equipes?${primary}`);
  await see("Equipe sintética Multi");
  assert.equal(await evaluate("document.body.innerText.includes('Equipe inativa')"), false);
  assert.equal(await evaluate(`[
    "Dashboard", "Lista nominal", "Vínculos e acompanhamento", "Gestão ACS", "Território", "Vigilância", "Relatórios",
    "Saúde da Mulher", "Análises de saúde", "Qualidade de Dados", "Gamificação", "Equipes", "Configurações"
  ].every(label => [...document.querySelectorAll('aside nav a')].some(link => link.textContent.includes(label)))`), true);
  await see("Superadmin");
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Superadmin')).focus()");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await see("Sair");
  await click('[role="menuitem"]', "Sair");
  await see("Use as credenciais");
  await open(detail);
  await see("Use as credenciais");
  const logout = await request("/api/local/auth/logout", { method: "POST", headers: { ...headers, origin } });
  assert.equal(logout.status, 204);
  assert.equal((await api("directory")).status, 401);
  console.log("PASS Chromium: login, detalhe → lista nominal, paginação, troca de recorte, equipes e logout");

  await stopApp(app);
  const database = new pg.Client({
    host: "fixture-pec", database: "esus", user: "postgres", password: process.env.SUS_FIXTURE_PEC_PASSWORD,
  });
  await database.connect();
  try {
    await database.query("GRANT CREATE ON SCHEMA public TO PUBLIC");
  } finally {
    await database.end();
  }
  app = startApp();
  await until("Liveness com permissão inadequada", async () => (await request("/healthz")).ok);
  assert.equal((await request("/readyz")).status, 503);
  console.log("PASS SAW-01 readiness recusa CREATE efetivo no schema do PEC");

  await stopApp(app);
  app = startApp({ ...process.env, SUS_PEC_HOST: "127.0.0.1" });
  await until("Liveness com a origem PEC indisponível", async () => (await request("/healthz")).ok);
  assert.equal((await request("/readyz")).status, 503);
  const isolatedSession = await login(password);
  assert.equal(isolatedSession.status, 204);
  const isolatedCookie = isolatedSession.headers.get("set-cookie").split(";")[0];
  assert.equal((await request("/api/local/directory", { headers: { cookie: isolatedCookie } })).status, 503);
  console.log("PASS SAW-01 origem indisponível: liveness 200, readiness e diretório 503");
} finally {
  socket?.close();
  browser?.kill();
  await stopApp(app);
}
