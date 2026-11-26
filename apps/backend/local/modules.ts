import { lastPecMonth } from "./indicators";
import { pecReady } from "./pec-db";
import { listPecTeams } from "./pec-directory";

export { loadTerritory, territoryRequestSchema } from "./modules-territory";
export { loadQuality, loadQualityList, qualityRequestSchema, qualityListRequestSchema } from "./modules-quality";
export { loadVigilance, loadWomensHealth, vigilanceRequestSchema, womensHealthRequestSchema } from "./modules-care";
export { loadGamification, gamificationRequestSchema } from "./modules-gamification";

export async function loadLocalSettings() {
  const available = await pecReady();
  if (!available) return { available, lastCompetence: null, teams: null, units: null };
  const [directory, lastCompetence] = await Promise.all([listPecTeams(), lastPecMonth()]);
  return { available, lastCompetence, teams: directory.length, units: new Set(directory.map(team => team.cnes)).size };
}
