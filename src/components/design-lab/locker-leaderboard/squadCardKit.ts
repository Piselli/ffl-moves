import { clubKitFor } from "@/components/design-lab/locker-hero/clubKitColors";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import type { LabSquadPlayer } from "./mockData";

export const PLATE_FONT_SIZE = 10.5;
export const PLATE_TEXT_W = 70;
export const PLATE_CHIP_W = 76;

export function clubShort(player: LabSquadPlayer): string {
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  return kit?.short ?? "—";
}

export function clubFooterColors(teamId: number): { bg: string; fg: string } {
  const colors = clubKitFor(teamId);
  const primary = colors.primary;
  const n = primary.replace("#", "");
  const lum = (() => {
    if (n.length !== 6) return 0.4;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();
  if (lum > 0.72) {
    const sec = colors.secondary;
    const sn = sec.replace("#", "");
    const sl =
      sn.length === 6
        ? (0.299 * parseInt(sn.slice(0, 2), 16) +
            0.587 * parseInt(sn.slice(2, 4), 16) +
            0.114 * parseInt(sn.slice(4, 6), 16)) /
          255
        : 0.2;
    return { bg: sec, fg: sl > 0.55 ? "#111111" : "#FFFFFF" };
  }
  return { bg: primary, fg: "#FFFFFF" };
}

export function clubPrimary(teamId: number): string {
  return clubKitFor(teamId).primary;
}
