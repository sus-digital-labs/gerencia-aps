import {
  validateRuntimeEnvironment,
  RuntimeConfig,
} from "./runtime-validation";

export { validateRuntimeEnvironment } from "./runtime-validation";
export type {
  RuntimeConfig,
  RuntimeConfigurationError,
  RuntimeConfigurationErrorCode,
} from "./runtime-validation";

export const runtimeConfig: RuntimeConfig = Object.freeze(
  validateRuntimeEnvironment({
    apiUrl: import.meta.env.VITE_API_URL,
    demoMode: import.meta.env.VITE_DEMO_MODE,
    municipalityIbge: import.meta.env.VITE_MUNICIPALITY_IBGE,
    municipalityName: import.meta.env.VITE_MUNICIPALITY_NAME,
    municipalityUf: import.meta.env.VITE_MUNICIPALITY_UF,
    mapCenterLat: import.meta.env.VITE_MAP_CENTER_LAT,
    mapCenterLng: import.meta.env.VITE_MAP_CENTER_LNG,
    mapDefaultZoom: import.meta.env.VITE_MAP_DEFAULT_ZOOM,
  })
);

export function assertRuntimeConfig(
  config: RuntimeConfig = runtimeConfig
): asserts config is RuntimeConfig & { status: "READY" } {
  if (config.status !== "READY") {
    throw new Error(
      `${config.error?.code ?? "CONFIGURATION_ERROR"}: configuração runtime inválida`
    );
  }
}
