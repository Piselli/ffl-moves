import type { Player } from "./types";

/** Fill catalog gaps for chain ids (e.g. not in `/api/players` because can_select=false). */
export async function mergeFplCatalogForChainIds(
  catalog: Map<number, Player>,
  chainIds: number[],
): Promise<void> {
  const missing = chainIds.filter((id) => Number.isFinite(id) && id > 0 && !catalog.has(id));
  if (!missing.length) return;

  try {
    const res = await fetch("/api/players-resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: missing }),
    });
    if (!res.ok) return;
    const list = (await res.json()) as Player[];
    if (!Array.isArray(list)) return;
    for (const p of list) {
      if (p?.id != null) catalog.set(p.id, p);
    }
  } catch {
    /* ignore */
  }
}
