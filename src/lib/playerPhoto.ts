import type { Player } from "@/lib/types";
import eaFaceMap from "@/data/fpl-ea-face-map.json";

const API_SPORTS_MEDIA_HOST = "media.api-sports.io";
const PL_PHOTO_HOST = "resources.premierleague.com";
const FUTWIZ_CDN_HOST = "cdn.futwiz.com";

const PL_PHOTO_BASE =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

/** EA FC 27 miniface CDN (transparent 160×160 heads — no club kits). */
export const EA_FACE_GAME = "fc27" as const;
export const EA_FACE_CDN_BASE = `https://${FUTWIZ_CDN_HOST}/assets/img/${EA_FACE_GAME}/faces`;

type EaFaceMapFile = {
  byCode?: Record<string, number>;
};

const EA_ID_BY_FPL_CODE: Record<string, number> =
  (eaFaceMap as EaFaceMapFile).byCode ?? {};

export function apiSportsPlayerPhotoUrl(apiId: number): string {
  return `https://${API_SPORTS_MEDIA_HOST}/football/players/${apiId}.png`;
}

export function fplPlayerPhotoUrl(code: number): string {
  return `${PL_PHOTO_BASE}${code}.png`;
}

export function eaFaceUrl(eaId: number): string {
  return `${EA_FACE_CDN_BASE}/${eaId}.png`;
}

/** Bump when proxy post-processing changes (white-bg strip, etc.). */
const PHOTO_PROXY_REV = "6";

export function eaFaceProxyPath(eaId: number): string {
  return `/api/player-photo?eaId=${eaId}&v=${PHOTO_PROXY_REV}`;
}

export function apiSportsPhotoProxyPath(apiId: number): string {
  return `/api/player-photo?apiId=${apiId}&v=${PHOTO_PROXY_REV}`;
}

/** Resolve EA face id from explicit field or FPL photo code map. */
export function resolveEaFaceId(
  player: Pick<Player, "eaFaceId" | "fplPhotoCode">,
): number | null {
  if (player.eaFaceId != null && player.eaFaceId > 0) return player.eaFaceId;
  const code = player.fplPhotoCode;
  if (code == null || code <= 0) return null;
  const mapped = EA_ID_BY_FPL_CODE[String(code)];
  return mapped != null && mapped > 0 ? mapped : null;
}

export function eaFaceIdFromFplCode(
  code: number | null | undefined,
): number | null {
  if (code == null || code <= 0) return null;
  const mapped = EA_ID_BY_FPL_CODE[String(code)];
  return mapped != null && mapped > 0 ? mapped : null;
}

/** Allowed upstream hosts for /api/player-photo (browser-safe same-origin URLs). */
export function isProxiedPhotoHost(hostname: string): boolean {
  return (
    hostname === API_SPORTS_MEDIA_HOST ||
    hostname === PL_PHOTO_HOST ||
    hostname === FUTWIZ_CDN_HOST
  );
}

export function resolvePlayerPhotoUrl(
  url: string | null | undefined,
): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Already a same-origin proxy path from /api/wc-players or /api/players.
  if (trimmed.startsWith("/api/player-photo")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (isProxiedPhotoHost(parsed.hostname)) {
      return `/api/player-photo?url=${encodeURIComponent(trimmed)}&v=${PHOTO_PROXY_REV}`;
    }
    return trimmed;
  } catch {
    return trimmed.startsWith("/") ? trimmed : null;
  }
}

type PhotoPlayer = Pick<
  Player,
  "photo" | "imageUrl" | "fplPhotoCode" | "apiId" | "eaFaceId"
>;

/** All portrait URL candidates, best first (for img retry on error). */
export function playerPhotoCandidates(player: PhotoPlayer): string[] {
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
  const eaId = resolveEaFaceId(player);
  const direct = player.photo || player.imageUrl;

  // EA FC27 minifaces first — consistent heads, no kits / white plates.
  if (eaId) addPath(eaFaceProxyPath(eaId));

  // World Cup / no FPL code — API-Sports first.
  if (hasApi && !hasFpl) {
    addPath(apiSportsPhotoProxyPath(player.apiId!));
    add(apiSportsPlayerPhotoUrl(player.apiId!));
  }

  if (direct?.startsWith("/api/player-photo")) addPath(direct);

  // EPL: prefer 110×140 cutouts (usually already transparent). 250×250 often
  // ships an opaque white studio plate — strip handles that as fallback.
  if (hasFpl) {
    add(
      `https://${PL_PHOTO_HOST}/premierleague/photos/players/110x140/p${player.fplPhotoCode}.png`,
    );
    add(fplPlayerPhotoUrl(player.fplPhotoCode!));
  }

  if (hasApi && hasFpl) {
    addPath(apiSportsPhotoProxyPath(player.apiId!));
    add(apiSportsPlayerPhotoUrl(player.apiId!));
  }

  if (direct && !direct.startsWith("/api/player-photo")) add(direct);

  return out;
}

/** Best portrait URL for a catalog / squad player (proxied when needed). */
export function playerPhotoSrc(player: PhotoPlayer): string | null {
  return playerPhotoCandidates(player)[0] ?? null;
}

/**
 * Pitch cutout chips — EA FC27 transparent heads first (uniform size, no kits).
 * Then PL 110×140 busts, then API-Sports.
 */
export function pitchCutoutPhotoCandidates(player: PhotoPlayer): string[] {
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
  const eaId = resolveEaFaceId(player);

  if (eaId) addPath(eaFaceProxyPath(eaId));

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
