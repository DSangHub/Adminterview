import { NextRequest, NextResponse } from "next/server";
import { getTokens, spendToken, getTrial, startTrial } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Balance + free-trial status
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") || "";
  const [tokens, trial] = await Promise.all([getTokens(email), getTrial(email)]);
  return NextResponse.json({ tokens, trial });
}

// action: "startTrial" -> begin the free week; default -> spend one token
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  if (body.action === "startTrial") {
    const trial = await startTrial(email);
    return NextResponse.json({ trial });
  }

  const tokens = await spendToken(email);
  if (tokens < 0) return NextResponse.json({ error: "no tokens" }, { status: 402 });
  return NextResponse.json({ tokens });
}
