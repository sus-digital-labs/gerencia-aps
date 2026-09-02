// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Testes unitários dos algoritmos geoespaciais do Remapeamento Inteligente
// ─────────────────────────────────────────────────────────────────────────────

// Importar funções puras (copiadas do router para teste isolado)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function convexHull(pontos: Array<{ lat: number; lng: number }>): Array<{ lat: number; lng: number }> {
  if (pontos.length < 3) return pontos;
  const sorted = [...pontos].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (o: any, a: any, b: any) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const lower: any[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: any[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function gerarPoligonoGeoJSON(pontos: Array<{ lat: number; lng: number }>): string {
  if (pontos.length === 0) return JSON.stringify({ type: "Polygon", coordinates: [[]] });
  const hull = convexHull(pontos);
  if (hull.length < 3) {
    const centLat = pontos.reduce((s, p) => s + p.lat, 0) / pontos.length;
    const centLng = pontos.reduce((s, p) => s + p.lng, 0) / pontos.length;
    const delta = 0.002;
    const coords = [
      [centLng - delta, centLat - delta],
      [centLng + delta, centLat - delta],
      [centLng + delta, centLat + delta],
      [centLng - delta, centLat + delta],
      [centLng - delta, centLat - delta],
    ];
    return JSON.stringify({ type: "Polygon", coordinates: [coords] });
  }
  const coords = hull.map((p) => [p.lng, p.lat]);
  coords.push(coords[0]);
  return JSON.stringify({ type: "Polygon", coordinates: [coords] });
}

function calcularStatusPnab(totalFamilias: number, totalCidadaos: number): string {
  if (totalFamilias === 0 && totalCidadaos === 0) return "vazia";
  if (totalFamilias > 150 || totalCidadaos > 750) return "excesso";
  if (totalFamilias < 20) return "baixa_cobertura";
  return "normal";
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE DE TESTES
// ─────────────────────────────────────────────────────────────────────────────

describe("Algoritmos Geoespaciais - Remapeamento Inteligente", () => {

  describe("haversineKm", () => {
    it("deve retornar 0 para o mesmo ponto", () => {
      expect(haversineKm(-14.86, -40.57, -14.86, -40.57)).toBe(0);
    });

    it("deve calcular distância aproximada entre dois pontos de Barra do Choça", () => {
      // Dois pontos a ~1km de distância
      const dist = haversineKm(-14.8619, -40.5736, -14.8530, -40.5736);
      expect(dist).toBeGreaterThan(0.9);
      expect(dist).toBeLessThan(1.1);
    });

    it("deve ser simétrico (A→B == B→A)", () => {
      const d1 = haversineKm(-14.86, -40.57, -14.90, -40.60);
      const d2 = haversineKm(-14.90, -40.60, -14.86, -40.57);
      expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
    });

    it("deve retornar valor positivo para pontos distintos", () => {
      expect(haversineKm(-14.86, -40.57, -15.00, -41.00)).toBeGreaterThan(0);
    });
  });

  describe("convexHull", () => {
    it("deve retornar pontos originais para menos de 3 pontos", () => {
      const pontos = [{ lat: -14.86, lng: -40.57 }, { lat: -14.87, lng: -40.58 }];
      const hull = convexHull(pontos);
      expect(hull.length).toBe(2);
    });

    it("deve retornar hull correto para quadrado", () => {
      const pontos = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 0.5, lng: 0.5 }, // ponto interno
      ];
      const hull = convexHull(pontos);
      expect(hull.length).toBe(4); // apenas os 4 vértices do quadrado
    });

    it("deve incluir todos os vértices extremos", () => {
      const pontos = [
        { lat: -14.80, lng: -40.50 },
        { lat: -14.90, lng: -40.50 },
        { lat: -14.90, lng: -40.60 },
        { lat: -14.80, lng: -40.60 },
      ];
      const hull = convexHull(pontos);
      expect(hull.length).toBe(4);
    });
  });

  describe("gerarPoligonoGeoJSON", () => {
    it("deve retornar polígono vazio para array vazio", () => {
      const result = JSON.parse(gerarPoligonoGeoJSON([]));
      expect(result.type).toBe("Polygon");
      expect(result.coordinates[0]).toHaveLength(0);
    });

    it("deve gerar buffer para ponto único", () => {
      const result = JSON.parse(gerarPoligonoGeoJSON([{ lat: -14.86, lng: -40.57 }]));
      expect(result.type).toBe("Polygon");
      expect(result.coordinates[0].length).toBe(5); // 4 vértices + fechamento
    });

    it("deve gerar polígono fechado (primeiro == último ponto)", () => {
      const pontos = [
        { lat: -14.80, lng: -40.50 },
        { lat: -14.90, lng: -40.50 },
        { lat: -14.90, lng: -40.60 },
        { lat: -14.80, lng: -40.60 },
      ];
      const result = JSON.parse(gerarPoligonoGeoJSON(pontos));
      const coords = result.coordinates[0];
      expect(coords[0]).toEqual(coords[coords.length - 1]);
    });

    it("deve retornar GeoJSON válido com type Polygon", () => {
      const pontos = [
        { lat: -14.80, lng: -40.50 },
        { lat: -14.90, lng: -40.55 },
        { lat: -14.85, lng: -40.60 },
      ];
      const result = JSON.parse(gerarPoligonoGeoJSON(pontos));
      expect(result).toHaveProperty("type", "Polygon");
      expect(result).toHaveProperty("coordinates");
      expect(Array.isArray(result.coordinates[0])).toBe(true);
    });
  });

  describe("calcularStatusPnab", () => {
    it("deve retornar 'vazia' para microárea sem famílias", () => {
      expect(calcularStatusPnab(0, 0)).toBe("vazia");
    });

    it("deve retornar 'excesso' quando ultrapassa limite de famílias (150)", () => {
      expect(calcularStatusPnab(151, 100)).toBe("excesso");
    });

    it("deve retornar 'excesso' quando ultrapassa limite de cidadãos (750)", () => {
      expect(calcularStatusPnab(100, 751)).toBe("excesso");
    });

    it("deve retornar 'baixa_cobertura' para microárea com menos de 20 famílias", () => {
      expect(calcularStatusPnab(15, 50)).toBe("baixa_cobertura");
    });

    it("deve retornar 'normal' para microárea dentro dos limites PNAB", () => {
      expect(calcularStatusPnab(100, 500)).toBe("normal");
    });

    it("deve retornar 'normal' no limite exato de famílias (150)", () => {
      expect(calcularStatusPnab(150, 700)).toBe("normal");
    });

    it("deve retornar 'normal' no limite exato de cidadãos (750)", () => {
      expect(calcularStatusPnab(100, 750)).toBe("normal");
    });
  });

  describe("Modelo Unificado Família+Domicílio", () => {
    it("deve validar que família tem campos de endereço e coordenadas", () => {
      const familia = {
        id: 1,
        coFamilia: "FAM001",
        microareaId: 1,
        nomeResponsavel: "João Silva",
        logradouro: "Rua das Flores",
        numero: "123",
        bairro: "Centro",
        municipio: "Barra do Choça",
        uf: "BA",
        cep: "45390-000",
        enderecoCompleto: "Rua das Flores, 123, Centro, Barra do Choça - BA",
        lat: "-14.8619",
        lng: "-40.5736",
        geocodificado: true,
        totalCidadaos: 3,
      };

      // Validações do modelo unificado
      expect(familia.lat).toBeDefined();
      expect(familia.lng).toBeDefined();
      expect(familia.enderecoCompleto).toBeDefined();
      expect(familia.totalCidadaos).toBeGreaterThan(0);
      expect(familia.geocodificado).toBe(true);
    });

    it("deve validar herança de coordenadas para cidadão sem lat/lng", () => {
      const familia = { lat: "-14.8619", lng: "-40.5736" };
      const cidadao = { lat: null, lng: null, coordenadaHerdada: false };

      // Simular herança de coordenadas
      if (!cidadao.lat && familia.lat) {
        cidadao.lat = familia.lat;
        cidadao.lng = familia.lng;
        cidadao.coordenadaHerdada = true;
      }

      expect(cidadao.lat).toBe("-14.8619");
      expect(cidadao.lng).toBe("-40.5736");
      expect(cidadao.coordenadaHerdada).toBe(true);
    });

    it("deve manter coordenadas próprias do cidadão quando existem", () => {
      const familia = { lat: "-14.8619", lng: "-40.5736" };
      const cidadao = { lat: "-14.8700", lng: "-40.5800", coordenadaHerdada: false };

      // Simular lógica de herança
      const latEfetivo = cidadao.lat || familia.lat;
      const lngEfetivo = cidadao.lng || familia.lng;
      const herdada = !cidadao.lat;

      expect(latEfetivo).toBe("-14.8700"); // usa a própria
      expect(herdada).toBe(false);
    });
  });

  describe("Algoritmo Proporcional de Redistribuição", () => {
    it("deve distribuir famílias proporcionalmente à população das vizinhas", () => {
      const vizinhas = [
        { id: 1, totalFamilias: 100 },
        { id: 2, totalFamilias: 50 },
        { id: 3, totalFamilias: 50 },
      ];
      const totalPop = vizinhas.reduce((s, v) => s + v.totalFamilias, 0); // 200
      const quantidadeTotal = 20;

      const distribuicao = vizinhas.map((v) => ({
        id: v.id,
        qtd: Math.round((v.totalFamilias / totalPop) * quantidadeTotal),
      }));

      expect(distribuicao[0].qtd).toBe(10); // 100/200 * 20 = 10
      expect(distribuicao[1].qtd).toBe(5);  // 50/200 * 20 = 5
      expect(distribuicao[2].qtd).toBe(5);  // 50/200 * 20 = 5
    });

    it("deve priorizar famílias mais próximas do destino", () => {
      const centroDestino = { lat: -14.86, lng: -40.57 };
      const familias = [
        { id: 1, lat: "-14.87", lng: "-40.58" }, // ~1.5km
        { id: 2, lat: "-14.86", lng: "-40.58" }, // ~0.9km
        { id: 3, lat: "-14.90", lng: "-40.60" }, // ~5km
      ];

      const ordenadas = familias
        .map((f) => ({
          ...f,
          distancia: haversineKm(
            parseFloat(f.lat), parseFloat(f.lng),
            centroDestino.lat, centroDestino.lng
          ),
        }))
        .sort((a, b) => a.distancia - b.distancia);

      expect(ordenadas[0].id).toBe(2); // mais próxima
      expect(ordenadas[2].id).toBe(3); // mais distante
    });
  });

  describe("Limites PNAB - Portaria 2.436/2017", () => {
    const LIMITE_FAMILIAS = 150;
    const LIMITE_CIDADAOS = 750;

    it("deve identificar microárea dentro dos limites legais", () => {
      expect(calcularStatusPnab(120, 600)).toBe("normal");
    });

    it("deve identificar microárea que excede o limite de famílias", () => {
      expect(calcularStatusPnab(LIMITE_FAMILIAS + 1, 100)).toBe("excesso");
    });

    it("deve identificar microárea que excede o limite de cidadãos", () => {
      expect(calcularStatusPnab(100, LIMITE_CIDADAOS + 1)).toBe("excesso");
    });

    it("deve calcular percentual de capacidade corretamente", () => {
      const totalFamilias = 75;
      const percentual = Math.round((totalFamilias / LIMITE_FAMILIAS) * 100);
      expect(percentual).toBe(50);
    });
  });
});
