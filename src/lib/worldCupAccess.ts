/**
 * World Cup routes stay localhost-only until the owner sets
 * NEXT_PUBLIC_WC_PUBLIC_ENABLED=true (e.g. to publish bracket results).
 */

const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function isWorldCupPublicEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_WC_PUBLIC_ENABLED;
  return v === "true" || v === "1";
}

/** Browser or explicit hostname (middleware passes Host without port). */
export function isWorldCupLocalPreviewHost(hostname?: string): boolean {
  if (isWorldCupPublicEnabled()) return true;
  if (typeof window !== "undefined") {
    return LOCAL_PREVIEW_HOSTS.has(window.location.hostname);
  }
  if (hostname) return LOCAL_PREVIEW_HOSTS.has(hostname);
  return process.env.NODE_ENV === "development";
}

/** Nav links and CTAs that route into /world-cup/* */
export function isWorldCupSurfaceVisible(hostname?: string): boolean {
  return isWorldCupLocalPreviewHost(hostname);
}

export function isWorldCupPath(pathname: string): boolean {
  return pathname === "/world-cup" || pathname.startsWith("/world-cup/");
}
