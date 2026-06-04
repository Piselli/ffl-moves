/**
 * 2026 knockout bracket (Appendix A). Each pathway converges from a Round of 32
 * up to its semi-final; the two semi-final winners meet in the Final.
 *
 * `code` is the official match number (M74…M102); `seeds` is the group-seed
 * matchup shown on the entry (R32) ties. Internal ties reference prior winners,
 * so we only carry seeds on the leaves.
 */
export interface BracketNode {
  /** Official match number, e.g. "M89". */
  code: string;
  /** Round label for the column this node sits in. */
  round: "R32" | "R16" | "QF" | "SF";
  /** Group-seed matchup, leaves only (e.g. "1E v 3ABCDF"). */
  seeds?: string;
  /** Two feeder ties; absent on R32 leaves. */
  feeders?: [BracketNode, BracketNode];
}

const leaf = (code: string, seeds: string): BracketNode => ({ code, round: "R32", seeds });

/** Pathway 1 — converges to semi-final M101. */
export const BRACKET_LEFT: BracketNode = {
  code: "M101",
  round: "SF",
  feeders: [
    {
      code: "M97",
      round: "QF",
      feeders: [
        { code: "M89", round: "R16", feeders: [leaf("M74", "1E v 3ABCDF"), leaf("M77", "1I v 3CDFGH")] },
        { code: "M90", round: "R16", feeders: [leaf("M73", "2A v 2B"), leaf("M75", "1F v 2C")] },
      ],
    },
    {
      code: "M98",
      round: "QF",
      feeders: [
        { code: "M93", round: "R16", feeders: [leaf("M83", "2K v 2L"), leaf("M84", "1H v 2J")] },
        { code: "M94", round: "R16", feeders: [leaf("M81", "1D v 3BEFIJ"), leaf("M82", "1G v 3AEHIJ")] },
      ],
    },
  ],
};

/** Pathway 2 — converges to semi-final M102. */
export const BRACKET_RIGHT: BracketNode = {
  code: "M102",
  round: "SF",
  feeders: [
    {
      code: "M99",
      round: "QF",
      feeders: [
        { code: "M91", round: "R16", feeders: [leaf("M76", "1C v 2F"), leaf("M78", "2E v 2I")] },
        { code: "M92", round: "R16", feeders: [leaf("M79", "1A v 3CEFHI"), leaf("M80", "1L v 3EHIJK")] },
      ],
    },
    {
      code: "M100",
      round: "QF",
      feeders: [
        { code: "M95", round: "R16", feeders: [leaf("M86", "1J v 2H"), leaf("M88", "2D v 2G")] },
        { code: "M96", round: "R16", feeders: [leaf("M85", "1B v 3EFGIJ"), leaf("M87", "1K v 3DEIJL")] },
      ],
    },
  ],
};

/** Column labels, outer → centre (left pathway order). */
export const BRACKET_ROUNDS = ["R32", "R16", "QF", "SF"] as const;
