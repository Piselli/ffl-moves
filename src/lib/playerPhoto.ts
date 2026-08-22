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

  // Already a same-origin proxy path from /api/wc-players or /api/players.
  if (trimmed.startsWith("/api/player-photo")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (isProxiedPhotoHost(parsed.hostname)) {
      return `/api/player-photo?url=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith("/") ? trimmed : null;
  }
}

export function apiSportsPhotoProxyPath(apiId: number): string {
  return `/api/player-photo?apiId=${apiId}`;
}

/** All portrait URL candidates, best first (for img retry on error). */
export function playerPhotoCandidates(
  player: Pick<Player, "photo" | "imageUrl" | "fplPhotoCode" | "apiId">,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string | null | undefined) => {
    const resolved = resolvePlayerPhotoUrl(raw);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      out.push(resolved);
    }
  };
  const addPath = (path: string) => {
    if (!seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  };

  const hasFpl = player.fplPhotoCode != null && player.fplPhotoCode > 0;
  const hasApi = player.apiId != null && player.apiId > 0;
  const direct = player.photo || player.imageUrl;

  // World Cup / no FPL code — API-Sports first.
  if (hasApi && !hasFpl) {
    addPath(apiSportsPhotoProxyPath(player.apiId!));
    add(apiSportsPlayerPhotoUrl(player.apiId!));
  }

  if (direct?.startsWith("/api/player-photo")) addPath(direct);

  // EPL: official PL kit headshots first (consistent FPL look). API-Sports
  // white cutouts only when PL CDN 403s / has no asset yet.
  if (hasFpl) {
    add(fplPlayerPhotoUrl(player.fplPhotoCode!));
    add(
      `https://${PL_PHOTO_HOST}/premierleague/photos/players/110x140/p${player.fplPhotoCode}.png`,
    );
  }

  if (hasApi && hasFpl) {
    addPath(apiSportsPhotoProxyPath(player.apiId!));
    add(apiSportsPlayerPhotoUrl(player.apiId!));
  }

  if (direct && !direct.startsWith("/api/player-photo")) add(direct);

  return out;
}

/** Best portrait URL for a catalog / squad player (proxied when needed). */
export function playerPhotoSrc(
  player: Pick<Player, "photo" | "imageUrl" | "fplPhotoCode" | "apiId">,
): string | null {
  return playerPhotoCandidates(player)[0] ?? null;
}

/**
 * Pitch cutout chips — prefer PL 110×140 busts (consistent framing; some
 * 250×250 codes 403, e.g. Virgil). Then 250×250, then API-Sports.
 */
export function pitchCutoutPhotoCandidates(
  player: Pick<Player, "photo" | "imageUrl" | "fplPhotoCode" | "apiId">,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string | null | undefined) => {
    const resolved = resolvePlayerPhotoUrl(raw);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      out.push(resolved);
    }
  };
  const addPath = (path: string) => {
    if (!seen.has(path)) {
      seen.add(path);
      out.push(path);
    }
  };

  const hasFpl = player.fplPhotoCode != null && player.fplPhotoCode > 0;
  const hasApi = player.apiId != null && player.apiId > 0;
  const code = player.fplPhotoCode;

  if (hasFpl && code) {
    add(
      `https://${PL_PHOTO_HOST}/premierleague/photos/players/110x140/p${code}.png`,
    );
    add(fplPlayerPhotoUrl(code));
  }

  if (hasApi) {
    addPath(apiSportsPhotoProxyPath(player.apiId!));
    add(apiSportsPlayerPhotoUrl(player.apiId!));
  }

  const direct = player.photo || player.imageUrl;
  if (direct?.startsWith("/api/player-photo")) addPath(direct);
  else if (direct) add(direct);

  return out;
}
