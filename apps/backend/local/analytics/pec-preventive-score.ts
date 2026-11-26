// Nota Metodológica C7, SEI 0054641718: a soma usa quatro proporções
// independentes, com uma população elegível distinta por prática.
export const preventivePractices = {
  A: { label: "Rastreamento do colo do útero", weight: 20 },
  B: { label: "Vacinação contra HPV", weight: 30 },
  C: { label: "Saúde sexual e reprodutiva", weight: 30 },
  D: { label: "Rastreamento de mama", weight: 20 },
} as const;

export type PreventivePractice = keyof typeof preventivePractices;
export type PracticeCounts = { linkedPeople: number; peopleWithEvidence: number };

export function preventiveScore(counts: Partial<Record<PreventivePractice, PracticeCounts>>) {
  let numerator = 0;
  let denominator = 0;
  for (const [practice, { weight }] of Object.entries(preventivePractices)) {
    const observed = counts[practice as PreventivePractice];
    if (!observed) return null;
    const { linkedPeople, peopleWithEvidence } = observed;
    if (!Number.isSafeInteger(linkedPeople) || linkedPeople <= 0 || !Number.isSafeInteger(peopleWithEvidence)
      || peopleWithEvidence < 0 || peopleWithEvidence > linkedPeople) return null;
    numerator += weight * peopleWithEvidence / linkedPeople;
    denominator += weight;
  }
  return { numerator, denominator, value: 100 * numerator / denominator, unit: "percent" as const };
}
