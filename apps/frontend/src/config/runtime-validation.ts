export type RuntimeConfigurationErrorCode = "CONFIGURATION_ERROR";

export interface RuntimeConfigurationError {
  status: "CONFIGURATION_ERROR";
  code: RuntimeConfigurationErrorCode;
  fields: string[];
}

export interface RuntimeConfig {
  status: "READY" | "CONFIGURATION_ERROR";
  apiUrl: string;
  demoMode: boolean;
  municipality: {
    ibge: string;
    name: string;
    uf: string;
    center: {
      lat: number;
      lng: number;
      zoom: number;
    };
  };
  error?: RuntimeConfigurationError;
}

export interface RuntimeEnvironment {
  apiUrl?: unknown;
  demoMode?: unknown;
  municipalityIbge?: unknown;
  municipalityName?: unknown;
  municipalityUf?: unknown;
  mapCenterLat?: unknown;
  mapCenterLng?: unknown;
  mapDefaultZoom?: unknown;
}

const VALID_UFS = new Set([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
]);

const readEnv = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const parseNumber = (value: unknown): number | undefined => {
  const text = readEnv(value);
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isValidApiUrl = (value: string): boolean => {
  if (!value) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

export function validateRuntimeEnvironment(
  input: RuntimeEnvironment
): RuntimeConfig {
  const apiUrl = readEnv(input.apiUrl);
  const ibge = readEnv(input.municipalityIbge);
  const name = readEnv(input.municipalityName);
  const uf = readEnv(input.municipalityUf).toUpperCase();
  const lat = parseNumber(input.mapCenterLat);
  const lng = parseNumber(input.mapCenterLng);
  const zoom = parseNumber(input.mapDefaultZoom);
  const errors: string[] = [];

  if (!isValidApiUrl(apiUrl)) errors.push("VITE_API_URL");
  if (!/^\d{7}$/.test(ibge)) errors.push("VITE_MUNICIPALITY_IBGE");
  if (!name) errors.push("VITE_MUNICIPALITY_NAME");
  if (!VALID_UFS.has(uf)) errors.push("VITE_MUNICIPALITY_UF");
  if (lat === undefined || lat < -90 || lat > 90)
    errors.push("VITE_MAP_CENTER_LAT");
  if (lng === undefined || lng < -180 || lng > 180)
    errors.push("VITE_MAP_CENTER_LNG");
  if (zoom === undefined || zoom < 0 || zoom > 24)
    errors.push("VITE_MAP_DEFAULT_ZOOM");

  const error =
    errors.length > 0
      ? {
          status: "CONFIGURATION_ERROR" as const,
          code: "CONFIGURATION_ERROR" as const,
          fields: errors,
        }
      : undefined;

  if (error) {
    return {
      status: "CONFIGURATION_ERROR",
      apiUrl: "",
      demoMode: input.demoMode === "true",
      municipality: {
        ibge: "",
        name: "",
        uf: "",
        center: { lat: 0, lng: 0, zoom: 4 },
      },
      error,
    };
  }

  return {
    status: "READY",
    apiUrl,
    demoMode: input.demoMode === "true",
    municipality: {
      ibge,
      name,
      uf,
      center: { lat: lat as number, lng: lng as number, zoom: zoom as number },
    },
  };
}
