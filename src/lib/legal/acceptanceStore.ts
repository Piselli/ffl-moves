import { Redis } from "@upstash/redis";
import { createHash } from "crypto";
import { LEGAL_VERSION } from "@/lib/legal/version";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = hasUpstash ? Redis.fromEnv() : null;

export type LegalAcceptanceRecord = {
  version: string;
  acceptedAt: string;
  locale: string;
  ipHash?: string;
};

function key(wallet: string): string {
  return `legal:accept:${wallet.toLowerCase()}`;
}

export function hashIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  const salt = process.env.LEGAL_IP_SALT?.trim();
  if (!salt) return undefined;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function getLegalAcceptance(
  wallet: string,
): Promise<LegalAcceptanceRecord | null> {
  if (!redis || !wallet) return null;
  try {
    const raw = await redis.get<LegalAcceptanceRecord | string>(key(wallet));
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as LegalAcceptanceRecord;
      } catch {
        return null;
      }
    }
    return raw;
  } catch {
    return null;
  }
}

export function isLegalAccepted(
  record: LegalAcceptanceRecord | null,
  version: string = LEGAL_VERSION,
): boolean {
  return Boolean(record && record.version === version);
}

export async function hasAcceptedCurrentLegal(wallet: string): Promise<boolean> {
  if (!hasUpstash) {
    // Without Redis we cannot persist — allow in local/dev so builds aren't blocked,
    // but production should have Upstash. Client still shows the checkbox.
    return process.env.NODE_ENV !== "production";
  }
  const record = await getLegalAcceptance(wallet);
  return isLegalAccepted(record);
}

export async function saveLegalAcceptance(
  wallet: string,
  input: { locale: string; ipHash?: string },
): Promise<LegalAcceptanceRecord> {
  if (!redis) {
    throw new Error("Upstash Redis is not configured for legal acceptance.");
  }
  const record: LegalAcceptanceRecord = {
    version: LEGAL_VERSION,
    acceptedAt: new Date().toISOString(),
    locale: input.locale || "en",
    ...(input.ipHash ? { ipHash: input.ipHash } : {}),
  };
  await redis.set(key(wallet), record);
  return record;
}
