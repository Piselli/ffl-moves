/**
 * Premier League 2026/27 goalkeeper kit briefs for hang-plate generation.
 * Keys match FPL teamId. Prefer confirmed unveil notes; else inferred neon/contrast GK read.
 */

export type Pl2627GkKit = {
  teamId: number;
  club: string;
  short: string;
  /** One-line visual brief — back of shirt facing camera */
  brief: string;
  status: "confirmed" | "leak" | "inferred";
};

export const PL_2627_GK: readonly Pl2627GkKit[] = [
  {
    teamId: 1,
    club: "Arsenal",
    short: "ARS",
    brief:
      "Adidas Trefoil GK — vivid green body with black tonal graphic panels, black collar, blank back",
    status: "inferred",
  },
  {
    teamId: 2,
    club: "Aston Villa",
    short: "AVL",
    brief:
      "Electric purple GK shirt with light-blue accents, solid back, blank nameplate",
    status: "inferred",
  },
  {
    teamId: 3,
    club: "Bournemouth",
    short: "BOU",
    brief:
      "Neon yellow-green Hummel GK with black chevron accents, blank back",
    status: "inferred",
  },
  {
    teamId: 4,
    club: "Brentford",
    short: "BRE",
    brief:
      "Bright orange Joma GK with black trim, blank back",
    status: "inferred",
  },
  {
    teamId: 5,
    club: "Brighton",
    short: "BHA",
    brief:
      "Volt green Nike GK with navy accents, blank back",
    status: "inferred",
  },
  {
    teamId: 6,
    club: "Chelsea",
    short: "CHE",
    brief:
      "Neon green Nike GK with black paneling, blank back",
    status: "inferred",
  },
  {
    teamId: 7,
    club: "Coventry City",
    short: "COV",
    brief:
      "Hot pink / magenta Hummel GK with white trim, blank back",
    status: "inferred",
  },
  {
    teamId: 8,
    club: "Crystal Palace",
    short: "CRY",
    brief:
      "Lime green Macron GK with navy accents, blank back",
    status: "inferred",
  },
  {
    teamId: 9,
    club: "Everton",
    short: "EVE",
    brief:
      "Orange Castore GK with navy trim, blank back",
    status: "inferred",
  },
  {
    teamId: 10,
    club: "Fulham",
    short: "FUL",
    brief:
      "Purple Adidas GK with white accents, blank back",
    status: "inferred",
  },
  {
    teamId: 11,
    club: "Hull City",
    short: "HUL",
    brief:
      "Neon green Oxen GK with black trim, blank back",
    status: "inferred",
  },
  {
    teamId: 12,
    club: "Ipswich Town",
    short: "IPS",
    brief:
      "Yellow Umbro GK with navy trim, blank back",
    status: "inferred",
  },
  {
    teamId: 13,
    club: "Leeds",
    short: "LEE",
    brief:
      "Bright green Adidas GK with blue accents, blank back",
    status: "inferred",
  },
  {
    teamId: 14,
    club: "Liverpool",
    short: "LIV",
    brief:
      "Vibrant green Adidas GK with dense scattered geometric fleck pattern (1989–91 homage), blank back",
    status: "confirmed",
  },
  {
    teamId: 15,
    club: "Man City",
    short: "MCI",
    brief:
      "Puma GK — orange-to-black gradient with oversized honeycomb/hex graphic (1990s nod), blank back",
    status: "confirmed",
  },
  {
    teamId: 16,
    club: "Man Utd",
    short: "MUN",
    brief:
      "Neon green Adidas GK with black panels, blank back",
    status: "inferred",
  },
  {
    teamId: 17,
    club: "Newcastle",
    short: "NEW",
    brief:
      "Bright purple Adidas GK with white accents, blank back",
    status: "inferred",
  },
  {
    teamId: 18,
    club: "Nott'm Forest",
    short: "NFO",
    brief:
      "Volt yellow Adidas GK with red accents, blank back",
    status: "inferred",
  },
  {
    teamId: 19,
    club: "Spurs",
    short: "TOT",
    brief:
      "Neon green Nike GK with navy trim, blank back",
    status: "inferred",
  },
  {
    teamId: 20,
    club: "Sunderland",
    short: "SUN",
    brief:
      "Black Hummel GK with red accents, blank back",
    status: "inferred",
  },
] as const;

export const PL_2627_GK_BY_ID: Record<number, Pl2627GkKit> = Object.fromEntries(
  PL_2627_GK.map((k) => [k.teamId, k]),
);
