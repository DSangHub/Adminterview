import { NextRequest, NextResponse } from "next/server";
import { getTokens, spendToken } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Balance
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") || "";
  return NextResponse.json({ tokens: await getTokens(email) });
}

// Spend one token to start a session
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const tokens = await spendToken(String(email));
  if (tokens < 0) return NextResponse.json({ error: "no tokens" }, { status: 402 });
  return NextResponse.json({ tokens });
}
