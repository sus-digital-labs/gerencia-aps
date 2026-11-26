import assert from "node:assert/strict";
import { test } from "vitest";
import { chronicCareScore } from "./pec-chronic-rules";

const observed = {
  consultation: 8, pressure: 7, anthropometry: 5, visits: 2, hemoglobin: 9, feet: 3, influenza: 6,
};

test("C4 soma os pontos e aplica a dispensa de visita da eAP apenas nessa prática", () => {
  assert.deepEqual(chronicCareScore("C4", 10, observed, "70"), {
    numerator: 560, denominator: 1000, value: 56, unit: "percent",
  });
  assert.deepEqual(chronicCareScore("C4", 10, observed, "76"), {
    numerator: 720, denominator: 1000, value: 72, unit: "percent",
  });
});

test("C5 usa as quatro práticas e C6 inclui a influenza", () => {
  assert.equal(chronicCareScore("C5", 10, observed, "70")?.value, 55);
  assert.equal(chronicCareScore("C6", 10, observed, "70")?.value, 52.5);
});

test("coorte vazia ou prática sem contagem comprovada não vira zero", () => {
  assert.equal(chronicCareScore("C4", 0, observed, "70"), null);
  assert.equal(chronicCareScore("C6", 10, { ...observed, influenza: null }, "70"), null);
  assert.equal(chronicCareScore("C5", 10, { ...observed, visits: 11 }, "76"), null);
});
