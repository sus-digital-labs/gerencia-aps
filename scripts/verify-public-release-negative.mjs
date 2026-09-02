import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(
  new URL("./verify-public-release.mjs", import.meta.url)
);
const fixture = mkdtempSync(join(tmpdir(), "sus-analytics-release-negative-"));

const files = {
  "README.md":
    "PUBLIC_STANDALONE\nCurrent standalone capabilities\nRequired backend contracts\nC1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE\n",
  LICENSE: "Apache License 2.0\n",
  NOTICE: "\n",
  "SECURITY.md": "\n",
  "CONTRIBUTING.md": "\n",
  "CODE_OF_CONDUCT.md": "\n",
  ".dockerignore": "\n",
  ".env.example": "\n",
  "apps/frontend/package.json": JSON.stringify({ license: "Apache-2.0" }),
  "apps/frontend/src/config/runtime.ts":
    "CONFIGURATION_ERROR validateRuntimeEnvironment\n",
  "apps/frontend/src/lib/analytics-contract.ts": `
export const QUALITY_APS_CODES = ["B1", "B2", "B3", "B4", "B5", "B6", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "M1", "M2"] as const;
export const CVAT_CODES = ["CVAT1", "CVAT2", "CVAT3", "CVAT4", "CVAT5", "CVAT6"] as const;
export const QUALITY_APS_NAMES = { B4: "Escovação Supervisionada", B5: "Procedimentos Odontológicos Preventivos" };
parseIndicatorResult; CONTRACT_ERROR; C1_REQUIRED_DATA_CONTRACT_FIELDS;
`,
  "apps/frontend/src/components/indicators/IndicatorCard.jsx":
    "API_UNAVAILABLE BLOCKED_BY_DATA_CONTRACT\n",
  "apps/frontend/src/lib/trpc-adapter.ts":
    "export const call = async () => { throw new Error('not implemented'); };\n",
};

try {
  for (const [file, content] of Object.entries(files)) {
    const path = join(fixture, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  }

  const injectionPath = join(fixture, "apps/frontend/src/injected-negative.ts");
  const cases = [
    [
      "host interno",
      "export const url = 'https://bc.dmpec.com.br/api';",
      "Adaptador fail-open ou sucesso sintético",
      "apps/frontend/src/lib/trpc-adapter.ts",
    ],
    [
      "fallback analítico",
      "export const entities = { filter: async () => [], create: async () => ({ success: true }) };",
      "Adaptador fail-open ou sucesso sintético",
      "apps/frontend/src/lib/trpc-adapter.ts",
    ],
    [
      "Math.random",
      "export const value = Math.random();",
      "Código ativo não determinístico ou sem typecheck",
      "apps/frontend/src/injected-negative.ts",
    ],
    [
      "@ts-nocheck",
      "// @ts-nocheck\nexport const value = 1;",
      "Código ativo não determinístico ou sem typecheck",
      "apps/frontend/src/injected-negative.ts",
    ],
    [
      "C1 numérico bloqueado",
      "export const value = { indicator: 'C1', status: 'BLOCKED_BY_DATA_CONTRACT', result_percentage: 42 };",
      "C1 bloqueado com resultado numérico",
      "apps/frontend/src/injected-negative.ts",
    ],
    [
      "cadastro fictício",
      "export const fakeRegistration = { cpf: 'synthetic' };",
      "Cadastro fictício em código ativo",
      "apps/frontend/src/injected-negative.ts",
    ],
    [
      "token semelhante a segredo",
      "export const token = 'not-a-placeholder-token';",
      "Atribuição sensível não permitida",
      "apps/frontend/src/injected-negative.ts",
    ],
  ];

  for (const [name, injection, expectedFailure, targetFile] of cases) {
    if (targetFile.endsWith("trpc-adapter.ts")) {
      writeFileSync(join(fixture, targetFile), injection, "utf8");
      writeFileSync(injectionPath, "export const safe = true;\n", "utf8");
    } else {
      writeFileSync(
        join(fixture, "apps/frontend/src/lib/trpc-adapter.ts"),
        files["apps/frontend/src/lib/trpc-adapter.ts"],
        "utf8"
      );
      writeFileSync(injectionPath, injection, "utf8");
    }

    let rejected = false;
    try {
      execFileSync(process.execPath, [checker], {
        cwd: fixture,
        env: { ...process.env, RELEASE_CHECK_FIXTURE_ROOT: fixture },
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      rejected = true;
      const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
      if (!output.includes(expectedFailure)) {
        throw new Error(
          `Fixture "${name}" rejeitada por motivo inesperado:\n${output}`
        );
      }
    }
    if (!rejected)
      throw new Error(`O release-check aceitou a fixture proibida: ${name}`);
  }

  console.log(
    `Testes negativos concluídos: ${cases.length} políticas recusaram as fixtures controladas.`
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
