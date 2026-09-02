import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(process.env.RELEASE_CHECK_FIXTURE_ROOT || process.cwd());
const fixtureMode = Boolean(process.env.RELEASE_CHECK_FIXTURE_ROOT);
const normalizePath = path => path.replaceAll("\\", "/");

const walk = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if ([".git", "dist", "node_modules"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const listFiles = () => {
  if (fixtureMode) {
    return walk(root).map(path => normalizePath(relative(root, path)));
  }

  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  });
  const tracked = output.split("\0").filter(Boolean).map(normalizePath);
  const activeUntracked = ["apps/frontend/src", "scripts", "docs"].flatMap(
    directory => {
      const path = join(root, directory);
      return existsSync(path)
        ? walk(path).map(file => normalizePath(relative(root, file)))
        : [];
    }
  );
  return [...new Set([...tracked, ...activeUntracked])];
};

const failures = [];
const files = listFiles();
const read = file => {
  const path = join(root, file);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
};
const requireFile = file => {
  if (!read(file))
    failures.push(`Arquivo obrigatório ausente ou vazio: ${file}`);
};

for (const file of [
  "README.md",
  "LICENSE",
  "NOTICE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".dockerignore",
  ".env.example",
]) {
  requireFile(file);
}

const requirePatterns = (file, patterns, label) => {
  const content = read(file);
  for (const pattern of patterns) {
    if (!pattern.test(content)) failures.push(`${label}: ${file}`);
  }
};

const denyPatterns = (file, patterns, label) => {
  const content = read(file);
  for (const pattern of patterns) {
    if (pattern.test(content)) failures.push(`${label}: ${file}`);
  }
};

requirePatterns(
  "README.md",
  [
    /PUBLIC_STANDALONE/,
    /Current standalone capabilities/,
    /Required backend contracts/,
    /C1_LOCAL_DATA_CONTRACT_MISSING_DEMAND_TYPE/,
  ],
  "README desalinhado"
);
requirePatterns(
  "apps/frontend/src/config/runtime.ts",
  [/CONFIGURATION_ERROR/, /validateRuntimeEnvironment/],
  "Validação runtime ausente"
);
requirePatterns(
  "apps/frontend/src/lib/analytics-contract.ts",
  [
    /parseIndicatorResult/,
    /CONTRACT_ERROR/,
    /C1_REQUIRED_DATA_CONTRACT_FIELDS/,
  ],
  "Contrato runtime incompleto"
);
requirePatterns(
  "apps/frontend/src/components/indicators/IndicatorCard.jsx",
  [/API_UNAVAILABLE/, /BLOCKED_BY_DATA_CONTRACT/],
  "UI sem estado fail-closed"
);
requirePatterns(
  "apps/frontend/src/lib/analytics-contract.ts",
  [
    /B4:\s*"Escovação Supervisionada/,
    /B5:\s*"Procedimentos Odontológicos Preventivos"/,
  ],
  "Nomenclatura canônica B4/B5 ausente"
);

const expectedOperationalCodes = [
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "C7",
  "M1",
  "M2",
  "CVAT1",
  "CVAT2",
  "CVAT3",
  "CVAT4",
  "CVAT5",
  "CVAT6",
];
const contractSource = read("apps/frontend/src/lib/analytics-contract.ts");
const qualityBlock =
  contractSource.match(
    /QUALITY_APS_CODES\s*=\s*\[([\s\S]*?)\]\s*as const/
  )?.[1] ?? "";
const cvatBlock =
  contractSource.match(/CVAT_CODES\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? "";
const declaredOperationalCodes = [qualityBlock, cvatBlock].flatMap(block =>
  [...block.matchAll(/"([A-Z]+\d+)"/g)].map(match => match[1])
);
if (
  declaredOperationalCodes.length !== expectedOperationalCodes.length ||
  declaredOperationalCodes.some(
    (code, index) => code !== expectedOperationalCodes[index]
  )
) {
  failures.push(
    "Escopo canônico deve conter exatamente 15 indicadores de Qualidade APS + 6 métricas CVAT"
  );
}

const policies = [
  [
    "apps/frontend/src/lib/trpc-adapter.ts",
    [
      /@ts-nocheck/,
      /bc\.dmpec\.com\.br/i,
      /Math\.random\(\)/,
      /Date\.now\(\)/,
      /success\s*:\s*true/,
      /return\s*\[\]\s*;?/,
    ],
    "Adaptador fail-open ou sucesso sintético",
  ],
  [
    "apps/frontend/src/pages/Dashboard.jsx",
    [
      /indicadoresPEC/,
      /initialData\s*:/,
      /result_percentage\s*\|\|\s*0/,
      /numerator\s*\|\|\s*0/,
      /denominator\s*\|\|\s*0/,
    ],
    "Dashboard com resultado substituto",
  ],
  [
    "apps/frontend/src/pages/IndicatorDetail.jsx",
    [/esus-pec\.local/i, /fetch\([^)]*ledi\.listaNominal/i],
    "Detalhe com integração não comprovada",
  ],
  [
    "apps/frontend/src/config/runtime.ts",
    [/Município não configurado/, /-14\.235/, /-51\.9253/],
    "Runtime com fallback de configuração",
  ],
];
for (const [file, patterns, label] of policies)
  denyPatterns(file, patterns, label);

for (const file of files) {
  if (!/^apps[\\/]frontend[\\/]src[\\/]/.test(file)) continue;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)) continue;
  denyPatterns(
    file,
    [/@ts-nocheck/, /Math\.random\(\)/, /Date\.now\(\)/],
    "Código ativo não determinístico ou sem typecheck"
  );
  denyPatterns(
    file,
    [
      /C1[\s\S]{0,200}BLOCKED_BY_DATA_CONTRACT[\s\S]{0,200}(?:result_percentage|resultado|numerator|numerador|denominator|denominador)\s*:/,
    ],
    "C1 bloqueado com resultado numérico"
  );
  denyPatterns(
    file,
    [/fakeRegistration|fake_registration/i],
    "Cadastro fictício em código ativo"
  );
}

const deniedNames = [
  /(^|[\\/])\.env\.(production|staging)$/i,
  /(^|[\\/])(credentials|secrets?|credenciais)[^\\/]*\.(json|txt|ya?ml|env)$/i,
  /\.(pem|key|p12|pfx|jks|keystore|dump|gitbundle)$/i,
];
for (const file of files) {
  if (file.replaceAll("\\", "/") === ".github/workflows/secret-scan.yml")
    continue;
  if (deniedNames.some(pattern => pattern.test(file)))
    failures.push(`Nome de arquivo sensível: ${file}`);
}

const textExtensions = new Set([
  ".css",
  ".env",
  ".gradle",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);
const assignment =
  /\b(?:password|passwd|pwd|secret|api[_-]?key|private[_-]?key|client[_-]?secret|token)\s*[:=]\s*["']?([^\s"']+)/i;
const placeholders =
  /^(?:\$\{|<|\(|`?\d{3}\b|primeiros\b|typeof|process\.env|import\.meta\.env|example|placeholder|change-me|your-|sua_|public-client-key-placeholder)/i;
for (const file of files) {
  if (!textExtensions.has(extname(file).toLowerCase())) continue;
  if (/[\\/]verify-public-release-negative\.mjs$/.test(file)) continue;
  read(file)
    .split(/\r?\n/)
    .forEach((line, index) => {
      const match = line.match(assignment);
      if (match && !placeholders.test(match[1]))
        failures.push(
          `Atribuição sensível não permitida: ${file}:${index + 1}`
        );
    });
}

const frontendPackage = read("apps/frontend/package.json");
if (!frontendPackage) failures.push("apps/frontend/package.json ausente");
else {
  try {
    if (JSON.parse(frontendPackage).license !== "Apache-2.0")
      failures.push("apps/frontend/package.json deve declarar Apache-2.0");
  } catch {
    failures.push("apps/frontend/package.json inválido");
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Verificação concluída: ${files.length} arquivos no escopo ${fixtureMode ? "da fixture" : "da release (tracked + código ativo)"}.`
);
