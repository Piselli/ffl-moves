/**
 * Map football-data.org team names / 3-letter codes onto our WC draw indices.
 */

import { WC_GROUPS } from "@/components/wc/wcGroups";
import { teamIndexFor, WC_TEAMS } from "@/lib/wcBracketPrediction";

/** FIFA / football-data TLA → flag file stem in public/flags/4x3. */
const TLA_TO_CODE: Record<string, string> = {
  MEX: "mx",
  RSA: "za",
  KOR: "kr",
  CZE: "cz",
  CAN: "ca",
  BIH: "ba",
  QAT: "qa",
  SUI: "ch",
  USA: "us",
  BRA: "br",
  HAI: "ht",
  AUS: "au",
  GER: "de",
  NED: "nl",
  CIV: "ci",
  CUW: "cw",
  SWE: "se",
  ESP: "es",
  BEL: "be",
  KSA: "sa",
  IRN: "ir",
  FRA: "fr",
  IRQ: "iq",
  ARG: "ar",
  AUT: "at",
  POR: "pt",
  ENG: "gb-eng",
  GHA: "gh",
  UZB: "uz",
  SCO: "gb-sct",
  TUR: "tr",
  ECU: "ec",
  TUN: "tn",
  URY: "uy",
  NZL: "nz",
  NOR: "no",
  JOR: "jo",
  COL: "co",
  MAR: "ma",
  PAR: "py",
  JPN: "jp",
  CPV: "cv",
  COD: "cd",
  DZA: "dz",
  HRV: "hr",
  PAN: "pa",
  EGY: "eg",
  SYR: "sy",
};

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const NAME_TO_INDEX = new Map<string, number>();

for (const t of WC_TEAMS) {
  NAME_TO_INDEX.set(normName(t.name), t.index);
}

/** Extra aliases from football-data / broadcast naming. */
const ALIASES: Record<string, string> = {
  "south africa": "South Africa",
  "korea republic": "Korea Republic",
  "south korea": "Korea Republic",
  "united states": "USA",
  "bosnia herzegovina": "Bosnia & Herz.",
  "bosnia and herzegovina": "Bosnia & Herz.",
  "bosnia herz": "Bosnia & Herz.",
  "cote d ivoire": "Côte d'Ivoire",
  "ivory coast": "Côte d'Ivoire",
  "curacao": "Curaçao",
  "turkiye": "Türkiye",
  "turkey": "Türkiye",
  "ir iran": "IR Iran",
  "iran": "IR Iran",
  "saudi arabia": "Saudi Arabia",
  "cabo verde": "Cabo Verde",
  "cape verde": "Cabo Verde",
  "congo dr": "Congo DR",
  "dr congo": "Congo DR",
  "democratic republic of the congo": "Congo DR",
  "scotland": "Scotland",
  england: "England",
  "korea rep": "Korea Republic",
  "republic of korea": "Korea Republic",
};

for (const [alias, canonical] of Object.entries(ALIASES)) {
  const idx = WC_TEAMS.find((t) => t.name === canonical)?.index;
  if (idx != null) NAME_TO_INDEX.set(normName(alias), idx);
}

for (const g of WC_GROUPS) {
  for (let slot = 0; slot < g.teams.length; slot++) {
    const t = g.teams[slot]!;
    NAME_TO_INDEX.set(normName(t.name), teamIndexFor(g.letter, slot));
  }
}

/** Resolve a team name or TLA to our flat draw index (0–47). */
export function lookupTeamIndex(name: string | null | undefined, tla?: string | null): number | null {
  if (tla) {
    const code = TLA_TO_CODE[tla.toUpperCase()];
    if (code) {
      const hit = WC_TEAMS.find((t) => t.code === code);
      if (hit) return hit.index;
    }
  }
  if (!name) return null;
  const direct = NAME_TO_INDEX.get(normName(name));
  if (direct != null) return direct;

  const alias = ALIASES[normName(name)];
  if (alias) {
    const hit = WC_TEAMS.find((t) => t.name === alias);
    if (hit) return hit.index;
  }

  return null;
}
