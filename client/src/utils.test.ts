import { describe, expect, it } from "vitest";

import { createPageUrl, formatNumber, formatPercentage } from "./utils";

describe("createPageUrl", () => {
  it("mapeia páginas conhecidas", () => {
    expect(createPageUrl("ACSManagement")).toBe("/acs");
    expect(createPageUrl("DataQuality")).toBe("/qualidade");
  });

  it("fornece uma rota previsível para páginas desconhecidas", () => {
    expect(createPageUrl("NovaPagina")).toBe("/novapagina");
  });
});

describe("formatação numérica", () => {
  it("usa vírgula decimal", () => {
    expect(formatNumber(12.345, 2)).toBe("12,35");
    expect(formatPercentage(87.5)).toBe("87,5%");
  });
});
