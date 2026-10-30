import { NextResponse } from "next/server";
import { clearPartnerSessionCookie } from "@/lib/partners/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL("/partners", origin));
  res.cookies.set(clearPartnerSessionCookie());
  return res;
}

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  res.cookies.set(clearPartnerSessionCookie());
  return res;
}
