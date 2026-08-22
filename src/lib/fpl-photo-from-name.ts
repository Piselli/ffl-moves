import catalog from "@/data/players.json";

type CatalogRow = {
  name: string;
  webName?: string;
  teamId?: number;
  fplPhotoCode?: number | null;
};

export type CatalogPhotoHit = { code: number; teamId: number };

/**
 * Display-name aliases used on the results pitch (mock XI) that don't match
 * FPL `webName` 1:1 — same players the squad picker resolves by id.
 */
const ALIASES: Record<string, string> = {
  bruno: "bfernandes",
  vandijk: "virgil",
  alisson: "abecker",
};

function norm(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function add(index: Map<string, CatalogPhotoHit[]>, key: string, hit: CatalogPhotoHit) {
  if (!key) return;
  const list = index.get(key);
  if (!list) {
    index.set(key, [hit]);
    return;
  }
  if (!list.some((h) => h.code === hit.code && h.teamId === hit.teamId)) {
    list.push(hit);
  }
}

let index: Map<string, CatalogPhotoHit[]> | null = null;

function photoIndex(): Map<string, CatalogPhotoHit[]> {
  if (index) return index;
  index = new Map();
  for (const row of catalog as CatalogRow[]) {
    const code = row.fplPhotoCode;
    if (code == null || code <= 0) continue;
    const hit: CatalogPhotoHit = { code, teamId: row.teamId ?? 0 };
    const web = row.webName?.trim() ?? "";
    add(index, norm(web), hit);
    add(index, norm(row.name), hit);
    const last = row.name.trim().split(/\s+/).pop();
    if (last) add(index, norm(last), hit);
    if (web.includes(".")) {
      const after = web.slice(web.lastIndexOf(".") + 1);
      if (after.length > 2) add(index, norm(after), hit);
    }
  }
  return index;
}

function pick(
  hits: CatalogPhotoHit[] | undefined,
  teamId?: number | null,
): CatalogPhotoHit | null {
  if (!hits?.length) return null;
  if (teamId != null && teamId > 0) {
    const byTeam = hits.find((h) => h.teamId === teamId);
    if (byTeam) return byTeam;
  }
  return hits[0]!;
}

/** Catalog photo + club for a display name (mock XI / pitch chips). */
export function catalogHitFromName(
  name: string | null | undefined,
  teamId?: number | null,
): CatalogPhotoHit | null {
  if (!name?.trim()) return null;
  const key = norm(name);
  if (!key) return null;
  const idx = photoIndex();
  const aliased = ALIASES[key];
  return (
    pick(idx.get(key), teamId) ??
    (aliased ? pick(idx.get(aliased), teamId) : null)
  );
}

/** Atlas `element.code` for a pitch-chip label, when the squad row has no id. */
export function fplPhotoCodeFromName(
  name: string | null | undefined,
  teamId?: number | null,
): number | null {
  return catalogHitFromName(name, teamId)?.code ?? null;
}
