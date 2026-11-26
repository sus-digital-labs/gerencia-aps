import { z } from "zod";

export const cnesSchema = z.string().regex(/^\d{7}$/);
export const ineSchema = z.string().regex(/^\d{10}$/);
export const pecTeamScopeSchema = z.object({ cnes: cnesSchema, ine: ineSchema });
export type PecTeamScope = z.infer<typeof pecTeamScopeSchema>;

export function samePecTeam(a: PecTeamScope, b: PecTeamScope) {
  return a.cnes === b.cnes && a.ine === b.ine;
}
