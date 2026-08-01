/** Premier League kit colours keyed by FPL `teamId` — from 2026/27 home catalog. */

import { pl2627HomeKit } from "./pl2627HomeKits";

export type ClubKit = {
  primary: string;
  secondary: string;
  /** Text / number on the back */
  ink: string;
};

const FALLBACK: ClubKit = {
  primary: "#3a3d42",
  secondary: "#d8d8d8",
  ink: "#f2f2f2",
};

export function clubKitFor(teamId: number): ClubKit {
  const kit = pl2627HomeKit(teamId);
  if (!kit) return FALLBACK;
  return {
    primary: kit.primary,
    secondary: kit.secondary,
    ink: kit.ink,
  };
}
