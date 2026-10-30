import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(new URL("/partners?err=use_wallet", origin));
}
