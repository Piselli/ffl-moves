import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@/lib/chainClient";
import {
  getFeeSponsorConnection,
  isFeeSponsorConfigured,
  loadFeeSponsorKeypair,
} from "@/lib/server/feeSponsor";
import { safeEqual } from "@/lib/server/clientIp";
import { isSponsorDisabled } from "@/lib/server/sponsorRateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]?.trim());
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

type Check = { role: string; address: string | null; lamports: number | null; min: number; ok: boolean };

async function notify(text: string): Promise<void> {
  const url = process.env.HEALTH_ALERT_WEBHOOK?.trim();
  if (!url) return;
  try {
    // `text` (Slack) and `content` (Discord) so either style of webhook works.
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, content: text }),
    });
  } catch (err) {
    console.warn("[health] webhook failed:", err);
  }
}

/**
 * Operational health: SOL floors for every hot key the system depends on.
 * Returns 503 (so the scheduled GitHub job fails and emails you) when one is low.
 * Auth: Authorization: Bearer $CRON_SECRET.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = getFeeSponsorConnection();
  const targets: Array<{ role: string; address: string | null; min: number }> = [];

  if (isFeeSponsorConfigured()) {
    try {
      targets.push({
        role: "fee_sponsor",
        address: loadFeeSponsorKeypair().publicKey.toBase58(),
        min: envInt("HEALTH_MIN_SPONSOR_LAMPORTS", 20_000_000),
      });
    } catch (err) {
      targets.push({ role: `fee_sponsor(${err instanceof Error ? err.message : "error"})`, address: null, min: 1 });
    }
  } else {
    targets.push({ role: "fee_sponsor(not configured)", address: null, min: 1 });
  }

  try {
    const adminPk = process.env.ADMIN_KEYPAIR?.trim();
    if (adminPk) {
      const { loadAdminKeypair } = await import("@/lib/server/adminSigner");
      targets.push({
        role: "admin_cron",
        address: loadAdminKeypair().publicKey.toBase58(),
        min: envInt("HEALTH_MIN_ADMIN_LAMPORTS", 5_000_000),
      });
    }
  } catch {
    /* admin key is optional for health */
  }

  try {
    const config = await getConfig();
    if (config?.oracle) {
      targets.push({
        role: "oracle",
        address: config.oracle,
        min: envInt("HEALTH_MIN_ORACLE_LAMPORTS", 10_000_000),
      });
    }
  } catch (err) {
    console.warn("[health] config read failed:", err);
  }

  const checks: Check[] = await Promise.all(
    targets.map(async (t) => {
      if (!t.address) return { ...t, lamports: null, ok: false };
      try {
        const lamports = await connection.getBalance(new PublicKey(t.address), "confirmed");
        return { ...t, lamports, ok: lamports >= t.min };
      } catch {
        return { ...t, lamports: null, ok: false };
      }
    }),
  );

  const failing = checks.filter((c) => !c.ok);
  const body = {
    ok: failing.length === 0,
    at: new Date().toISOString(),
    sponsorDisabled: isSponsorDisabled(),
    checks: checks.map((c) => ({
      role: c.role,
      address: c.address,
      sol: c.lamports == null ? null : c.lamports / 1e9,
      minSol: c.min / 1e9,
      ok: c.ok,
    })),
  };

  if (failing.length > 0) {
    await notify(
      `FORM8 health: ${failing
        .map((c) => `${c.role} ${c.lamports == null ? "unavailable" : (c.lamports / 1e9).toFixed(4) + " SOL"} (min ${(c.min / 1e9).toFixed(3)})`)
        .join("; ")}`,
    );
    return NextResponse.json(body, { status: 503 });
  }
  return NextResponse.json(body);
}
