/**
 * Nameplate face styles for locker door panels.
 * Picked visually at /design-lab/locker-hero/nameplates/styles
 */

export type NameplateStyleId =
  | "door-ink"
  | "crest-surname"
  | "everton-card"
  | "arsenal-rim"
  | "led-city";

export type NameplateStyle = {
  id: NameplateStyleId;
  name: string;
  tagline: string;
  /** Face canvas size before corner-pin */
  faceW: number;
  faceH: number;
};

export const NAMEPLATE_STYLES: readonly NameplateStyle[] = [
  {
    id: "door-ink",
    name: "Door ink",
    tagline: "Crest sticker + surname printed on the white door — no plate",
    faceW: 220,
    faceH: 52,
  },
  {
    id: "crest-surname",
    name: "Crest · surname",
    tagline: "Classic dressing-room: badge left, bold caps right",
    faceW: 220,
    faceH: 52,
  },
  {
    id: "everton-card",
    name: "Number card",
    tagline: "White placard · surname over number · Oswald",
    faceW: 280,
    faceH: 90,
  },
  {
    id: "arsenal-rim",
    name: "Rim plaque",
    tagline: "Thin red outline · crest + name (Arsenal white board)",
    faceW: 220,
    faceH: 48,
  },
  {
    id: "led-city",
    name: "LED panel",
    tagline: "Soft blue digital strip · name + number (City)",
    faceW: 220,
    faceH: 52,
  },
] as const;

export function getNameplateStyle(id: NameplateStyleId): NameplateStyle {
  return NAMEPLATE_STYLES.find((s) => s.id === id) ?? NAMEPLATE_STYLES[0]!;
}

/** Demo cast for style previews — matches hang bay order. */
export type NameplateDemoPlayer = {
  bayId: string;
  name: string;
  number: string;
  short: string;
  /** Premier League badge code (resources.premierleague.com) */
  badgeCode: number;
};

export const NAMEPLATE_DEMO_CAST: readonly NameplateDemoPlayer[] = [
  { bayId: "h1", name: "PICKFORD", number: "1", short: "EVE", badgeCode: 11 },
  { bayId: "h2", name: "GABRIEL", number: "6", short: "ARS", badgeCode: 3 },
  { bayId: "h3", name: "VAN DIJK", number: "4", short: "LIV", badgeCode: 14 },
  { bayId: "h4", name: "SALIBA", number: "2", short: "ARS", badgeCode: 3 },
  { bayId: "h5", name: "TRENT", number: "66", short: "LIV", badgeCode: 14 },
  { bayId: "h6", name: "BRUNO G", number: "39", short: "NEW", badgeCode: 4 },
  { bayId: "h7", name: "B.FERNANDES", number: "8", short: "MUN", badgeCode: 1 },
  { bayId: "h8", name: "PALMER", number: "20", short: "CHE", badgeCode: 8 },
  { bayId: "h9", name: "SAKA", number: "7", short: "ARS", badgeCode: 3 },
  { bayId: "h10", name: "HAALAND", number: "9", short: "MCI", badgeCode: 43 },
  { bayId: "h11", name: "ISAK", number: "14", short: "NEW", badgeCode: 4 },
  { bayId: "hb1", name: "SON", number: "7", short: "TOT", badgeCode: 6 },
  { bayId: "hb2", name: "WATKINS", number: "11", short: "AVL", badgeCode: 7 },
  { bayId: "hb3", name: "SZOBOSZLAI", number: "8", short: "LIV", badgeCode: 14 },
];

export function plBadgeUrl(code: number, size: 70 | "" = 70): string {
  const folder = size === 70 ? "badges/70" : "badges";
  return `https://resources.premierleague.com/premierleague/${folder}/t${code}.png`;
}
