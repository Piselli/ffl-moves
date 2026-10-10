/**
 * Remap oracle stats objects keyed by the legacy API-Sports catalog `id`
 * (`public/data/players.json`) onto FPL element ids used in register_team.
 *
 * Bridge: legacyRow.apiId → fplPlayer.apiId → fplPlayer.id
 */
export async function remapStatsKeysToFplIds(
  stats: Record<string, Record<string, unknown>>,
): Promise<Record<string, Record<string, unknown>>> {
  const keys = Object.keys(stats);
  if (keys.length === 0) return stats;

  let fplCatalog: Array<{ id?: number; apiId?: number }> = [];
  let legacyCatalog: Array<{ id?: number; apiId?: number }> = [];
  try {
    const [fplRes, legacyRes] = await Promise.all([
      fetch("/api/players", { cache: "no-store" }),
      fetch("/data/players.json", { cache: "no-store" }),
    ]);
    if (fplRes.ok) fplCatalog = await fplRes.json();
    if (legacyRes.ok) legacyCatalog = await legacyRes.json();
  } catch {
    return stats;
  }

  const fplByApiId = new Map<number, number>();
  for (const p of fplCatalog) {
    const apiId = Number(p.apiId);
    const id = Number(p.id);
    if (Number.isFinite(apiId) && apiId > 0 && Number.isFinite(id) && id > 0) {
      fplByApiId.set(apiId, id);
    }
  }
  if (fplByApiId.size === 0) return stats;

  const legacyById = new Map<number, number>();
  for (const p of legacyCatalog) {
    const id = Number(p.id);
    const apiId = Number(p.apiId);
    if (Number.isFinite(id) && id > 0 && Number.isFinite(apiId) && apiId > 0) {
      legacyById.set(id, apiId);
    }
  }

  // If most keys already look like FPL ids present in the FPL catalog, keep as-is.
  const fplIds = new Set(
    fplCatalog.map((p) => Number(p.id)).filter((n) => Number.isFinite(n) && n > 0),
  );
  const alreadyFpl = keys.filter((k) => fplIds.has(Number(k))).length;
  if (alreadyFpl >= Math.ceil(keys.length * 0.5)) return stats;

  const out: Record<string, Record<string, unknown>> = {};
  let remapped = 0;
  for (const [key, row] of Object.entries(stats)) {
    const sid = Number(key);
    const apiId = legacyById.get(sid);
    const fplId = apiId != null ? fplByApiId.get(apiId) : undefined;
    if (fplId != null) {
      out[String(fplId)] = row;
      remapped += 1;
    }
  }

  return remapped > 0 ? out : stats;
}
