/**
 * Best-effort client IP for rate limiting.
 * On Vercel `x-vercel-forwarded-for` / `x-real-ip` are set by the platform and
 * cannot be spoofed by the caller; a raw `x-forwarded-for` can be on other hosts,
 * so it is only the last resort.
 */
import { createHash, timingSafeEqual } from "crypto";

export function clientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xf = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xf) return xf;
  return "unknown";
}

/** Constant-time string comparison for secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
