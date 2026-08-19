/**
 * World Cup is archived — routes stay localhost-only until
 * NEXT_PUBLIC_WC_PUBLIC_ENABLED=true.
 */

import { isLocalPreviewHost, isPublicFlagEnabled } from "@/lib/localPreviewAccess";

export function isWorldCupPublicEnabled(): boolean {
  return isPublicFlagEnabled("NEXT_PUBLIC_WC_PUBLIC_ENABLED");
}

/** Browser or explicit hostname (middleware passes Host without port). */
export function isWorldCupLocalPreviewHost(hostname?: string): boolean {
  if (isWorldCupPublicEnabled()) return true;
  if (typeof window !== "undefined") {
    return isLocalPreviewHost(window.location.hostname);
  }
  if (hostname) return isLocalPreviewHost(hostname);
  return process.env.NODE_ENV === "development";
}

/** Nav links and CTAs that route into /world-cup/* */
export function isWorldCupSurfaceVisible(hostname?: string): boolean {
  return isWorldCupLocalPreviewHost(hostname);
}

export function isWorldCupPath(pathname: string): boolean {
  return pathname === "/world-cup" || pathname.startsWith("/world-cup/");
}
