/** Stable hue 0–359 from any string (e.g. club name) for avatar gradients. */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h) % 360;
}

/**
 * Two-letter initials from display name (web_name or full name).
 * "Erling Haaland" → "EH", "Palmer" → "PA", "K. De Bruyne" → "KD"
 */
export function initialsFromDisplayName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter((p) => p.length > 0);
  const letter = (chunk: string) => {
    const m = chunk.match(/[A-Za-z]/);
    return m ? m[0].toUpperCase() : "";
  };
  if (parts.length >= 2) {
    const a = letter(parts[0]);
    const b = letter(parts[parts.length - 1]!);
    const out = (a + b).slice(0, 2);
    return out.length > 0 ? out : "?";
  }
  const w = parts[0] ?? t;
  const cleaned = w.replace(/[^A-Za-z0-9]/g, "");
  if (cleaned.length >= 2) return cleaned.slice(0, 2).toUpperCase();
  if (cleaned.length === 1) return (cleaned[0]!.toUpperCase() + "?").slice(0, 2);
  return "?";
}
