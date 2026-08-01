/** Seat / locker hotspots over the equal-width 11+3 face-on plate. */
export type RoomSlot = {
  id: string;
  /** center of hit area, % of scene */
  left: number;
  top: number;
  /** hit box size % */
  w: number;
  h: number;
  z: number;
  /** starter bank (left 11) vs bench bank (right 3) */
  bank: "XI" | "bench";
};

/**
 * Calibrated to the 11+3 curved locker plates (alive set v13/v14/v16 + legacy v7/v9–v12)
 * on a 16:9 cover viewport (shallow C-curve, equal modular bays — stall 11 is a full bay
 * with wall gap before the door).
 * Left = starters 1–11, right = bench B1–B3.
 * Screen widths taper mildly with perspective; real module size stays equal.
 * Re-tune centers if a plate's bay spacing diverges from black steel v13.
 */
export const ROOM_SLOTS: RoomSlot[] = [
  // —— Left XI (starters) ——
  // Centers matched to numbered plaques on v16 at 16:9 object-cover.
  { id: "s1", left: 5.0, top: 54, w: 6.5, h: 42, z: 12, bank: "XI" },
  { id: "s2", left: 11.8, top: 52.5, w: 6.0, h: 42, z: 11, bank: "XI" },
  { id: "s3", left: 18.2, top: 51, w: 5.7, h: 42, z: 10, bank: "XI" },
  { id: "s4", left: 24.5, top: 49.8, w: 5.4, h: 42, z: 9, bank: "XI" },
  { id: "s5", left: 30.5, top: 48.8, w: 5.2, h: 42, z: 8, bank: "XI" },
  { id: "s6", left: 36.2, top: 48.0, w: 5.0, h: 42, z: 7, bank: "XI" },
  { id: "s7", left: 41.5, top: 47.5, w: 4.8, h: 42, z: 6, bank: "XI" },
  { id: "s8", left: 46.5, top: 47.2, w: 4.6, h: 42, z: 5, bank: "XI" },
  { id: "s9", left: 51.5, top: 47.2, w: 4.5, h: 42, z: 4, bank: "XI" },
  { id: "s10", left: 56.2, top: 47.5, w: 4.4, h: 42, z: 3, bank: "XI" },
  { id: "s11", left: 61.0, top: 48.0, w: 4.3, h: 42, z: 2, bank: "XI" },
  // —— Right bench ——
  { id: "b1", left: 79.5, top: 49.5, w: 6.6, h: 42, z: 8, bank: "bench" },
  { id: "b2", left: 86.5, top: 51.5, w: 6.9, h: 42, z: 9, bank: "bench" },
  { id: "b3", left: 93.5, top: 54.0, w: 7.0, h: 42, z: 10, bank: "bench" },
];

export type CastMember = {
  match: string[];
  label: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  teamHint: string;
};

/** Order matches stalls L→R: XI then bench */
export const ROOM_CAST: CastMember[] = [
  { match: ["Pickford"], label: "Pickford", position: "GK", teamHint: "Everton" },
  { match: ["Gabriel"], label: "Gabriel", position: "DEF", teamHint: "Arsenal" },
  { match: ["Van Dijk", "Virgil"], label: "Van Dijk", position: "DEF", teamHint: "Liverpool" },
  { match: ["Saliba"], label: "Saliba", position: "DEF", teamHint: "Arsenal" },
  { match: ["Alexander-Arnold", "Trent"], label: "Trent", position: "DEF", teamHint: "Liverpool" },
  { match: ["Guimarães", "Guimaraes", "B.Guimarães"], label: "Guimarães", position: "MID", teamHint: "Newcastle" },
  { match: ["Fernandes"], label: "B.Fernandes", position: "MID", teamHint: "Man Utd" },
  { match: ["Palmer"], label: "Palmer", position: "MID", teamHint: "Chelsea" },
  { match: ["Saka"], label: "Saka", position: "MID", teamHint: "Arsenal" },
  { match: ["Haaland"], label: "Haaland", position: "FWD", teamHint: "Man City" },
  { match: ["Isak"], label: "Isak", position: "FWD", teamHint: "Newcastle" },
  // bench
  { match: ["Son"], label: "Son", position: "FWD", teamHint: "Spurs" },
  { match: ["Watkins"], label: "Watkins", position: "FWD", teamHint: "Aston Villa" },
  { match: ["Szoboszlai"], label: "Szoboszlai", position: "MID", teamHint: "Liverpool" },
];
