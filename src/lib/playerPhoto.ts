import type { Player } from "@/lib/types";

const API_SPORTS_MEDIA_HOST = "media.api-sports.io";
const PL_PHOTO_HOST = "resources.premierleague.com";

const PL_PHOTO_BASE =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

export function apiSportsPlayerPhotoUrl(apiId: number): string {
  return `https://${API_SPORTS_MEDIA_HOST}/football/players/${apiId}.png`;
}

export function fplPlayerPhotoUrl(code: number): string {
  return `${PL_PHOTO_BASE}${code}.png`;
}

/** Allowed upstream hosts for /api/player-photo (browser-safe same-origin URLs). */
export function isProxiedPhotoHost(hostname: string): boolean {
  return hostname === API_SPORTS_MEDIA_HOST || hostname === PL_PHOTO_HOST;
}

export function resolvePlayerPhotoUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (isProxiedPhotoHost(parsed.hostname)) {
      return `/api/player-photo?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

/** Best portrait URL for a catalog / squad player (proxied when needed). */
export function playerPhotoSrc(player: Pick<Player, "photo" | "imageUrl" | "fplPhotoCode" | "apiId">): string | null {
  const candidates: string[] = [];
  const direct = player.photo || player.imageUrl;
  if (direct) candidates.push(direct);
  if (player.fplPhotoCode != null && player.fplPhotoCode > 0) {
    candidates.push(fplPlayerPhotoUrl(player.fplPhotoCode));
  }
  if (player.apiId != null && player.apiId > 0) {
    candidates.push(apiSportsPlayerPhotoUrl(player.apiId));
  }

  for (const raw of candidates) {
    const resolved = resolvePlayerPhotoUrl(raw);
    if (resolved) return resolved;
  }
  return null;
}
