import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { error: "Email / dev login disabled. Use a whitelisted wallet." },
    { status: 410 },
  );
}
