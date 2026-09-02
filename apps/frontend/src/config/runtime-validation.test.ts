import { describe, expect, it } from "vitest";
import { validateRuntimeEnvironment } from "./runtime-validation";

const validEnvironment = {
  apiUrl: "/api/trpc",
  demoMode: "false",
  municipalityIbge: "3304557",
  municipalityName: "Rio de Janeiro",
  municipalityUf: "RJ",
  mapCenterLat: "-22.9068",
  mapCenterLng: "-43.1729",
  mapDefaultZoom: "10",
};

describe("runtime configuration", () => {
  it("accepts a complete standalone configuration", () => {
    expect(validateRuntimeEnvironment(validEnvironment)).toMatchObject({
      status: "READY",
      apiUrl: "/api/trpc",
      municipality: { ibge: "3304557", name: "Rio de Janeiro", uf: "RJ" },
    });
  });

  it("returns CONFIGURATION_ERROR when required configuration is missing", () => {
    const result = validateRuntimeEnvironment({});
    expect(result.status).toBe("CONFIGURATION_ERROR");
    expect(result.error?.fields).toEqual(
      expect.arrayContaining([
        "VITE_API_URL",
        "VITE_MUNICIPALITY_IBGE",
        "VITE_MUNICIPALITY_NAME",
        "VITE_MUNICIPALITY_UF",
        "VITE_MAP_CENTER_LAT",
        "VITE_MAP_CENTER_LNG",
        "VITE_MAP_DEFAULT_ZOOM",
      ])
    );
  });

  it.each([
    ["municipalityIbge", "123", "VITE_MUNICIPALITY_IBGE"],
    ["municipalityUf", "XX", "VITE_MUNICIPALITY_UF"],
    ["mapCenterLat", "91", "VITE_MAP_CENTER_LAT"],
    ["mapCenterLng", "181", "VITE_MAP_CENTER_LNG"],
    ["mapDefaultZoom", "25", "VITE_MAP_DEFAULT_ZOOM"],
    ["apiUrl", "not-a-url", "VITE_API_URL"],
  ])("rejects invalid %s", (field, value, errorField) => {
    const result = validateRuntimeEnvironment({
      ...validEnvironment,
      [field]: value,
    });
    expect(result.status).toBe("CONFIGURATION_ERROR");
    expect(result.error?.fields).toContain(errorField);
  });

  it("accepts an absolute HTTP API URL and rejects protocol-relative URLs", () => {
    expect(
      validateRuntimeEnvironment({
        ...validEnvironment,
        apiUrl: "https://example.invalid/api",
      }).status
    ).toBe("READY");
    expect(
      validateRuntimeEnvironment({
        ...validEnvironment,
        apiUrl: "//internal.example/api",
      }).status
    ).toBe("CONFIGURATION_ERROR");
  });
});
