/** Hostnames that may browse archived / lab routes without a public env flag. */
export const LOCAL_PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function isLocalPreviewHost(host: string): boolean {
  const bare = host.split(":")[0]?.toLowerCase() ?? "";
  return LOCAL_PREVIEW_HOSTS.has(bare);
}

export function isPublicFlagEnabled(envKey: string): boolean {
  const v = process.env[envKey];
  return v === "true" || v === "1";
}

/** Lab pages (/design-lab/*). */
export function isDesignLabPublic(): boolean {
  return isPublicFlagEnabled("NEXT_PUBLIC_DESIGN_LAB_PUBLIC");
}

/** Nav redesign experiments (/design-preview/*). */
export function isDesignPreviewPublic(): boolean {
  return isPublicFlagEnabled("NEXT_PUBLIC_DESIGN_PREVIEW_PUBLIC");
}
