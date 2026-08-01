/**
 * Premier League 2026/27 home kit catalog.
 * Keys match FPL `teamId` from `src/data/players.json`.
 *
 * Sources: club unveil posts + Flashscore / ESPN 26/27 kit roundups (Jul 2026).
 * Leeds + Sunderland home details still partly leak-confirmed where noted.
 */

export type KitPattern =
  | "solid"
  | "vstripes"
  | "hstripes"
  | "pinstripe"
  | "gradient"
  | "sash"
  | "sleeves";

export type Pl2627HomeKit = {
  teamId: number;
  club: string;
  short: string;
  maker: string;
  /** Primary fabric read from across the room */
  primary: string;
  secondary: string;
  accent?: string;
  /** Back name / number ink */
  ink: string;
  pattern: KitPattern;
  /** One-line visual brief for hang-asset generation */
  brief: string;
  /** confirmed | leak | inferred */
  status: "confirmed" | "leak" | "inferred";
};

/** Promoted 26/27: Coventry, Ipswich, Hull. Relegated out: West Ham, Burnley, Wolves. */
export const PL_2627_CLUBS: readonly Pl2627HomeKit[] = [
  {
    teamId: 1,
    club: "Arsenal",
    short: "ARS",
    maker: "Adidas",
    primary: "#C8102E",
    secondary: "#FFFFFF",
    accent: "#6B0F1A",
    ink: "#FFFFFF",
    pattern: "sleeves",
    brief:
      "Rich red body with white raglan sleeves, two-tone red depth, Emirates-roofline crew collar, burgundy trim",
    status: "confirmed",
  },
  {
    teamId: 2,
    club: "Aston Villa",
    short: "AVL",
    maker: "Adidas",
    primary: "#670E36",
    secondary: "#95BFE5",
    ink: "#95BFE5",
    pattern: "sleeves",
    brief:
      "Classic claret body with sky-blue sleeves only, no gold, faux collar placket, 1960s archive restraint",
    status: "confirmed",
  },
  {
    teamId: 3,
    club: "Bournemouth",
    short: "BOU",
    maker: "Hummel",
    primary: "#DA291C",
    secondary: "#000000",
    accent: "#C5A572",
    ink: "#FFFFFF",
    pattern: "vstripes",
    brief:
      "Wide red and black vertical stripes wrapping full shirt, gold chevron accents, black ribbed crew neck, tonal 1936 crest texture in red bands",
    status: "confirmed",
  },
  {
    teamId: 4,
    club: "Brentford",
    short: "BRE",
    maker: "Joma",
    primary: "#E30613",
    secondary: "#FFFFFF",
    accent: "#F5B800",
    ink: "#FFFFFF",
    pattern: "vstripes",
    brief:
      "Red and white vertical stripes, honey-yellow collar/cuff/side trim, beehive detail at back neck (2026–28 two-season shirt)",
    status: "confirmed",
  },
  {
    teamId: 5,
    club: "Brighton",
    short: "BHA",
    maker: "Nike",
    primary: "#0057B8",
    secondary: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "pinstripe",
    brief:
      "Solid royal blue with fine white pinstripes (1983 FA Cup nod), white neckline, blue shoulder piping — no thick stripes",
    status: "confirmed",
  },
  {
    teamId: 6,
    club: "Chelsea",
    short: "CHE",
    maker: "Nike",
    primary: "#034694",
    secondary: "#C5A572",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Bright blue body, button-down collar, Midwest Gold accents on lion and swoosh, woven crest texture in fabric, no chest sponsor",
    status: "confirmed",
  },
  {
    teamId: 7,
    club: "Coventry City",
    short: "COV",
    maker: "Hummel",
    primary: "#1E6BB8",
    secondary: "#FFFFFF",
    ink: "#1E6BB8",
    pattern: "vstripes",
    brief:
      "Blue and white vertical striped homage to 1986/87 FA Cup Hummel shirt — not solid sky blue",
    status: "confirmed",
  },
  {
    teamId: 8,
    club: "Crystal Palace",
    short: "CRY",
    maker: "Macron",
    primary: "#F5F5F5",
    secondary: "#C4122E",
    accent: "#1B458F",
    ink: "#1B458F",
    pattern: "sash",
    brief:
      "White base with narrowing red-and-blue diagonal sash from left shoulder (1976 nod), circular retro badge — not full stripes",
    status: "confirmed",
  },
  {
    teamId: 9,
    club: "Everton",
    short: "EVE",
    maker: "Castore",
    primary: "#003399",
    secondary: "#F5C518",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Plain royal blue with amber-yellow collar and cuff trim (docklands / signal-flag brief)",
    status: "confirmed",
  },
  {
    teamId: 10,
    club: "Fulham",
    short: "FUL",
    maker: "Adidas",
    primary: "#F8F8F8",
    secondary: "#111111",
    accent: "#E30613",
    ink: "#111111",
    pattern: "solid",
    brief:
      "Crisp white with black branding, red flash on collar, subtle embossed chevron-wave Thames texture",
    status: "confirmed",
  },
  {
    teamId: 11,
    club: "Hull City",
    short: "HUL",
    maker: "Oxen",
    primary: "#F5A12D",
    secondary: "#111111",
    ink: "#111111",
    pattern: "solid",
    brief:
      "Vintage amber/black 1978/79-inspired home — tiger print retired; clean old-school cut and colour",
    status: "confirmed",
  },
  {
    teamId: 12,
    club: "Ipswich Town",
    short: "IPS",
    maker: "Umbro",
    primary: "#0033A0",
    secondary: "#0A1F4D",
    accent: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Royal blue with navy and white trim, repeating diamond lattice embossed from Portman Road floodlight framework",
    status: "confirmed",
  },
  {
    teamId: 13,
    club: "Leeds",
    short: "LEE",
    maker: "Adidas",
    primary: "#FFFFFF",
    secondary: "#1D428A",
    accent: "#FBE122",
    ink: "#1D428A",
    pattern: "hstripes",
    brief:
      "White body with fine horizontal blue and yellow pinstripes, blue collar with yellow rim (first horizontal home pinstripe)",
    status: "leak",
  },
  {
    teamId: 14,
    club: "Liverpool",
    short: "LIV",
    maker: "Adidas",
    primary: "#8B1A2B",
    secondary: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Deep Active Maroon Candy 1989/91 homage with geometric fleck pattern, less dense than original",
    status: "confirmed",
  },
  {
    teamId: 15,
    club: "Man City",
    short: "MCI",
    maker: "Puma",
    primary: "#6CABDD",
    secondary: "#F5F8FC",
    accent: "#C0C0C0",
    ink: "#1C2C5B",
    pattern: "gradient",
    brief:
      "Sky-blue gradient darker at shoulders fading toward white at hem, metallic silver crest",
    status: "confirmed",
  },
  {
    teamId: 16,
    club: "Man Utd",
    short: "MUN",
    maker: "Adidas",
    primary: "#DA291C",
    secondary: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Clean solid red, polo collar, banded cuffs — 50 years since 1977 FA Cup final, no body pattern",
    status: "confirmed",
  },
  {
    teamId: 17,
    club: "Newcastle",
    short: "NEW",
    maker: "Adidas",
    primary: "#241F20",
    secondary: "#FFFFFF",
    accent: "#00A3E0",
    ink: "#FFFFFF",
    pattern: "vstripes",
    brief:
      "Black and white stripes of varying/disrupted widths, bright blue crew collar and shoulder accents, magpie at back neck",
    status: "confirmed",
  },
  {
    teamId: 18,
    club: "Nott'm Forest",
    short: "NFO",
    maker: "Adidas",
    primary: "#DD0000",
    secondary: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "solid",
    brief:
      "Garibaldi red with V-neck and subtle mottled/lyric pattern in fabric, misty Trent graphic effect",
    status: "confirmed",
  },
  {
    teamId: 19,
    club: "Spurs",
    short: "TOT",
    maker: "Nike",
    primary: "#F8F8FA",
    secondary: "#132257",
    ink: "#132257",
    pattern: "solid",
    brief:
      "Lilywhite with navy trim, faint diagonal tonal striping nodding to mid-1980s Hummel",
    status: "confirmed",
  },
  {
    teamId: 20,
    club: "Sunderland",
    short: "SUN",
    maker: "Hummel",
    primary: "#EB172B",
    secondary: "#FFFFFF",
    ink: "#FFFFFF",
    pattern: "vstripes",
    brief:
      "Traditional red and white vertical stripes, white polo collar with subtle buttons, 1937 shield badge",
    status: "leak",
  },
] as const;

export const PL_2627_BY_ID: Record<number, Pl2627HomeKit> = Object.fromEntries(
  PL_2627_CLUBS.map((k) => [k.teamId, k]),
);

export function pl2627HomeKit(teamId: number): Pl2627HomeKit | null {
  return PL_2627_BY_ID[teamId] ?? null;
}
