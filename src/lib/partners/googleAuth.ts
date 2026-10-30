import { createHash, randomBytes } from "crypto";

export const PARTNER_OAUTH_STATE_COOKIE = "ffl_partner_oauth_state";
export const PARTNER_OAUTH_NEXT_COOKIE = "ffl_partner_oauth_next";

const AUTH_COOKIE_MAX = 600;

export function partnerAuthCookie(name: string, value: string) {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/partners/auth",
    maxAge: AUTH_COOKIE_MAX,
  };
}

export function clearPartnerAuthCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/partners/auth",
    maxAge: 0,
  };
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createOAuthState(): string {
  return b64url(randomBytes(16));
}

export function partnersGoogleRedirectUri(origin: string): string {
  const fromEnv = process.env.PARTNERS_GOOGLE_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;
  return `${origin.replace(/\/$/, "")}/api/partners/auth/callback`;
}

export function buildGoogleAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", opts.state);
  u.searchParams.set("prompt", "select_account");
  u.searchParams.set("access_type", "online");
  return u.toString();
}

export type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export async function exchangeGoogleCode(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code: opts.code,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export type GoogleUserInfo = {
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google userinfo failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    email?: string;
    email_verified?: boolean | string;
    name?: string;
    picture?: string;
  };
  if (!json.email) throw new Error("Google userinfo missing email");
  const verified = json.email_verified === true || json.email_verified === "true";
  return {
    email: json.email,
    emailVerified: verified,
    name: json.name,
    picture: json.picture,
  };
}

/** Safe next path — only /partners* relative paths. */
export function sanitizePartnerNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/partners") || raw.startsWith("//")) return "/partners";
  if (raw.includes("://")) return "/partners";
  return raw.slice(0, 200);
}

/** Stable fingerprint for logs (never log raw emails). */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
}
