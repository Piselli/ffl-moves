import { NextRequest, NextResponse } from "next/server";

/**
 * Seeds the admin oracle input from `API_SPORTS_KEY` (.env.local).
 * Localhost / 127.0.0.1 only — never expose the key on deployed hosts.
 */
export async function GET(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0]?.toLowerCase() ?? "";
  const allowed = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (!allowed) {
    return NextResponse.json({ key: null }, { status: 404 });
  }

  const key = (process.env.API_SPORTS_KEY || "").trim();
  if (!key) {
    return NextResponse.json({ key: null });
  }
  return NextResponse.json({ key });
}
