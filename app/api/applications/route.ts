import { NextRequest, NextResponse } from "next/server";
import { scoreApplication } from "@/lib/ai";
import { getJob, createApplication, saveScore, listApplications } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A candidate applies -> record it, then the AI screens + scores it.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jobId = String(body.jobId || "demo");
    const name = String(body.name || "").trim();
    const answers: string[] = Array.isArray(body.answers) ? body.answers.map(String) : [];
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const job = await getJob(jobId);
    if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

    // 1) record the application
    const app = await createApplication({
      job_id: jobId,
      candidate_name: name,
      candidate_email: body.email ? String(body.email) : undefined,
      resume_text: body.resumeText ? String(body.resumeText) : undefined,
      answers,
    });

    // 2) the AI role: screen + score, then save
    const result = await scoreApplication({
      role: job.title,
      rubric: job.rubric,
      questions: job.questions,
      answers,
      resumeText: app.resume_text,
    });
    const scored = await saveScore(app.id, result);

    return NextResponse.json({ application: scored });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId") || undefined;
  return NextResponse.json({ applications: await listApplications(jobId) });
}
