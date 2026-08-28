import { clubKitFor } from "@/components/design-lab/locker-hero/clubKitColors";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import type { Player } from "@/lib/types";

export function sharePlayerSurname(player: Player): string {
  const raw = (player.webName || player.name).trim();
  const parts = raw.split(/\s+/);
  if (parts.length >= 2 && /^(van|von|de|da|dos|del|di|la|le|el)$/i.test(parts[parts.length - 2]!)) {
    return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
  }
  // FPL webName is often already the short display form ("Saka", "Van Dijk").
  if (player.webName?.trim()) return player.webName.trim();
  return parts[parts.length - 1] ?? raw;
}

export function shareClubShort(player: Player): string {
  const kit = player.teamId ? pl2627HomeKit(player.teamId) : null;
  if (kit?.short) return kit.short;
  if (player.team) return player.team.slice(0, 3).toUpperCase();
  return "—";
}

export function shareClubFooterColors(teamId: number): { bg: string; fg: string } {
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
