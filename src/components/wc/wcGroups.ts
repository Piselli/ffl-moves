/**
 * 2026 group-stage draw — 12 groups of 4 (48 teams), transcribed from the
 * tournament draw. `code` maps to the real ISO flag artwork in public/flags/4x3
 * (`gb-eng` / `gb-sct` are the home-nation files in that set).
 *
 * Each group carries its own accent so the calendar reads like the official
 * group-stage graphic rather than a flat list.
 */
export interface WcTeam {
  code: string;
  name: string;
}

export interface WcGroup {
  letter: string;
  accent: string;
  teams: WcTeam[];
}

export const WC_GROUPS: WcGroup[] = [
  {
    letter: "A",
    accent: "#22c55e",
    teams: [
      { code: "mx", name: "Mexico" },
      { code: "za", name: "South Africa" },
      { code: "kr", name: "Korea Republic" },
      { code: "cz", name: "Czechia" },
    ],
  },
  {
    letter: "B",
    accent: "#f43f5e",
    teams: [
      { code: "ca", name: "Canada" },
      { code: "ba", name: "Bosnia & Herz." },
      { code: "qa", name: "Qatar" },
      { code: "ch", name: "Switzerland" },
    ],
  },
  {
    letter: "C",
    accent: "#f97316",
    teams: [
      { code: "br", name: "Brazil" },
      { code: "ma", name: "Morocco" },
      { code: "ht", name: "Haiti" },
      { code: "gb-sct", name: "Scotland" },
    ],
  },
  {
    letter: "D",
    accent: "#3b82f6",
    teams: [
      { code: "us", name: "USA" },
      { code: "py", name: "Paraguay" },
      { code: "au", name: "Australia" },
      { code: "tr", name: "Türkiye" },
    ],
  },
  {
    letter: "E",
    accent: "#8b5cf6",
    teams: [
      { code: "de", name: "Germany" },
      { code: "cw", name: "Curaçao" },
      { code: "ci", name: "Côte d'Ivoire" },
      { code: "ec", name: "Ecuador" },
    ],
  },
  {
    letter: "F",
    accent: "#a3e635",
    teams: [
      { code: "nl", name: "Netherlands" },
      { code: "jp", name: "Japan" },
      { code: "se", name: "Sweden" },
      { code: "tn", name: "Tunisia" },
    ],
  },
  {
    letter: "G",
    accent: "#ec4899",
    teams: [
      { code: "be", name: "Belgium" },
      { code: "eg", name: "Egypt" },
      { code: "ir", name: "IR Iran" },
      { code: "nz", name: "New Zealand" },
    ],
  },
  {
    letter: "H",
    accent: "#2dd4bf",
    teams: [
      { code: "es", name: "Spain" },
      { code: "cv", name: "Cabo Verde" },
      { code: "sa", name: "Saudi Arabia" },
      { code: "uy", name: "Uruguay" },
    ],
  },
  {
    letter: "I",
    accent: "#a78bfa",
    teams: [
      { code: "fr", name: "France" },
      { code: "sn", name: "Senegal" },
      { code: "iq", name: "Iraq" },
      { code: "no", name: "Norway" },
    ],
  },
  {
    letter: "J",
    accent: "#06b6d4",
    teams: [
      { code: "ar", name: "Argentina" },
      { code: "dz", name: "Algeria" },
      { code: "at", name: "Austria" },
      { code: "jo", name: "Jordan" },
    ],
  },
  {
    letter: "K",
    accent: "#ef4444",
    teams: [
      { code: "pt", name: "Portugal" },
      { code: "cd", name: "Congo DR" },
      { code: "uz", name: "Uzbekistan" },
      { code: "co", name: "Colombia" },
    ],
  },
  {
    letter: "L",
    accent: "#38bdf8",
    teams: [
      { code: "gb-eng", name: "England" },
      { code: "hr", name: "Croatia" },
      { code: "gh", name: "Ghana" },
      { code: "pa", name: "Panama" },
    ],
  },
];

export const WC_TEAM_COUNT = WC_GROUPS.reduce((n, g) => n + g.teams.length, 0);
export const WC_GROUP_COUNT = WC_GROUPS.length;
