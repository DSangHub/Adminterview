import { NextRequest, NextResponse } from "next/server";
import { practiceReply, practiceSummary, type ChatMsg } from "@/lib/ai";
import { savePracticeSession } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = String(body.role || "Office Administrator");
    const messages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : [];

    if (body.action === "finish") {
      const { readiness, feedback } = await practiceSummary(role, messages);
      await savePracticeSession({
        candidate_email: body.email ? String(body.email) : undefined,
        role,
        transcript: messages,
        readiness_score: readiness,
        feedback,
        paid: Boolean(body.paid),
      });
      return NextResponse.json({ readiness, feedback });
    }

    // default: next coach message
    const { reply, done } = await practiceReply(role, messages);
    return NextResponse.json({ reply, done });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
