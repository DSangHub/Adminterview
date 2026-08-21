import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/ai";
import { createJob, listJobs } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create a job opening -> AI drafts the screening questions + rubric.
export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    if (!title || !String(title).trim())
      return NextResponse.json({ error: "title required" }, { status: 400 });

    const { questions, rubric } = await generateQuestions(String(title), String(description || ""));
    const job = await createJob({ title: String(title), description, questions, rubric });
    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ jobs: await listJobs() });
}
