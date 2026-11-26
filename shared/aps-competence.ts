export const firstApsCompetence = "2025-01";

export function currentApsCompetence() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Bahia", year: "numeric", month: "2-digit",
  }).formatToParts();
  return `${parts.find(part => part.type === "year")?.value}-${parts.find(part => part.type === "month")?.value}`;
}

export function shiftApsCompetence(month: string, offset: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + offset, 1)).toISOString().slice(0, 7);
}

export function lastApsCompetenceAt(day: string) {
  const month = day.slice(0, 7);
  const nextDay = new Date(`${day}T00:00:00Z`).getTime() + 86_400_000;
  return new Date(nextDay).toISOString().slice(0, 7) > month ? month : shiftApsCompetence(month, -1);
}
