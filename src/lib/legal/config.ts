/**
 * Operator / compliance fields for legal pages.
 * Contact is the only firm public address until incorporation.
 */
export const LEGAL_CONFIG = {
  contactEmail: "support@form8.football",
  /** Site is deployed on Vercel; change if that moves. */
  hostingProvider: "Vercel",
} as const;

/** Markdown placeholders → config keys (render-time substitution). */
export const LEGAL_PLACEHOLDERS: ReadonlyArray<{
  token: string;
  key: keyof typeof LEGAL_CONFIG;
}> = [
  { token: "[CONTACT EMAIL]", key: "contactEmail" },
  { token: "[HOSTING PROVIDER]", key: "hostingProvider" },
];

export function applyLegalPlaceholders(markdown: string): string {
  let out = markdown;
  for (const { token, key } of LEGAL_PLACEHOLDERS) {
    const value = LEGAL_CONFIG[key]?.trim();
    if (value) out = out.split(token).join(value);
  }
  return out;
}

export const LEGAL_SITE_URL = "https://www.form8.football";
export const LEGAL_SLUGS = ["terms", "privacy", "risk", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
