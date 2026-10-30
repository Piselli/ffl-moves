import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Google login removed — partners sign in with a whitelisted wallet. */
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/partners?err=use_wallet", req.nextUrl.origin));
}
