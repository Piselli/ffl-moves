import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { playerPhotoSrc } from "@/lib/playerPhoto";
import type { Player } from "@/lib/types";

/**
 * GET /api/wc-players
 *
 * Serves the World Cup player catalog built by `scripts/fetch-wc-players.mjs`
 * (public/data/wc-players.json). Same Player[] shape the squad picker consumes,
 * plus apiId/apiTeamId. Returns [] until the catalog is built.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "public", "data", "wc-players.json");
    const raw = fs.readFileSync(file, "utf8");
    const players = JSON.parse(raw) as Player[];
    const withProxiedPhotos = Array.isArray(players)
      ? players.map((p) => {
          const proxied = playerPhotoSrc(p);
          return proxied ? { ...p, photo: proxied } : p;
        })
      : [];
    return NextResponse.json(withProxiedPhotos, {
      headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
    });
  } catch (err) {
    console.error("Failed to read WC players catalog:", err);
    return NextResponse.json([], {
      headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
    });
  }
}
