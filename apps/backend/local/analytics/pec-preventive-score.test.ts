import assert from "node:assert/strict";
import { test } from "vitest";
import { preventiveScore } from "./pec-preventive-score";

const counts = {
  A: { linkedPeople: 10, peopleWithEvidence: 5 },
  B: { linkedPeople: 2, peopleWithEvidence: 1 },
  C: { linkedPeople: 30, peopleWithEvidence: 9 },
  D: { linkedPeople: 4, peopleWithEvidence: 3 },
};

test("C7 soma 20, 30, 30 e 20 pontos aplicados às proporções das quatro coortes", () => {
  assert.deepEqual(preventiveScore(counts), { numerator: 49, denominator: 100, value: 49, unit: "percent" });
});

test("C7 aceita zero observado e recusa coorte vazia, desconhecida ou inconsistente", () => {
  assert.equal(preventiveScore({ ...counts, B: { linkedPeople: 2, peopleWithEvidence: 0 } })?.value, 34);
  assert.equal(preventiveScore({ ...counts, B: { linkedPeople: 0, peopleWithEvidence: 0 } }), null);
  assert.equal(preventiveScore({ ...counts, B: { linkedPeople: 2, peopleWithEvidence: 3 } }), null);
  assert.equal(preventiveScore({ ...counts, B: undefined }), null);
});
