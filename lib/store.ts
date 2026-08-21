// ============================================================
// lib/store.ts — data layer
// Uses Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
// Otherwise falls back to an in-memory store (ephemeral) so the demo
// runs with zero config. Same function signatures either way.
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Score } from "./ai";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const DB_LIVE = Boolean(URL && SERVICE_KEY);

let sb: SupabaseClient | null = null;
if (DB_LIVE) sb = createClient(URL as string, SERVICE_KEY as string, { auth: { persistSession: false } });

export type Job = {
  id: string;
  title: string;
  description?: string;
  status: string;
  questions: string[];
  rubric?: string;
  created_at: string;
};
export type Application = {
  id: string;
  job_id: string;
  candidate_name: string;
  candidate_email?: string;
  resume_text?: string;
  answers: string[];
  status: "scoring" | "scored" | "error";
  score?: number;
  subscores?: Score["subscores"];
  reason?: string;
  verdict?: string;
  scored_at?: string;
  created_at: string;
};

// ---------------- in-memory fallback ----------------
const mem = {
  jobs: [] as Job[],
  apps: [] as Application[],
  wallets: {} as Record<string, number>,
  trials: {} as Record<string, string>,
};

export const MAX_TOKENS = 10; // never expire, up to $20 at $2 each
export const TRIAL_DAYS = 7; // free practice trial length
function uid() {
  return "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function seed() {
  if (mem.jobs.length) return;
  mem.jobs.push({
    id: "demo",
    title: "Office Administrator",
    description: "Front-desk operations, scheduling, and document management for a busy team.",
    status: "open",
    questions: [
      "A stakeholder needs a report in 30 minutes but data is missing. How do you handle it?",
      "Describe a time you caught an error others missed. How did you catch it?",
      "You're double-booked for two urgent tasks. How do you decide what to do first?",
      "A coworker keeps sending unclear requests. How do you get what you need?",
    ],
    rubric: "Communication, judgment, attention to detail, and speed.",
    created_at: new Date(0).toISOString(),
  });
  // sample scored applications so the dashboard is populated in demo mode
  const samples: Array<[string, number, SubShape, string, string]> = [
    ["Jordan Rivera", 88, { communication: 92, judgment: 85, attention: 90, speed: 80 }, "Strong fit", "Clear, well-prioritized answers with strong attention to detail."],
    ["Priya Anand", 91, { communication: 89, judgment: 93, attention: 92, speed: 84 }, "Strong fit", "Excellent judgment and precise, thorough responses."],
    ["Marcus Lee", 78, { communication: 80, judgment: 76, attention: 82, speed: 74 }, "Consider", "Solid responses; prioritization could be sharper."],
    ["Dana Whitfield", 64, { communication: 66, judgment: 60, attention: 68, speed: 62 }, "Consider", "Reasonable answers but light on specifics."],
  ];
  for (const [nm, sc, sub, vd, rs] of samples) {
    mem.apps.push({
      id: uid(), job_id: "demo", candidate_name: nm, answers: [],
      status: "scored", score: sc, subscores: sub as any, reason: rs, verdict: vd,
      scored_at: new Date().toISOString(), created_at: new Date().toISOString(),
    });
  }
}
type SubShape = { communication: number; judgment: number; attention: number; speed: number };

// ---------------- JOBS ----------------
export async function createJob(j: {
  title: string;
  description?: string;
  questions: string[];
  rubric?: string;
}): Promise<Job> {
  if (sb) {
    const { data, error } = await sb
      .from("jobs")
      .insert({ title: j.title, description: j.description, questions: j.questions, rubric: j.rubric })
      .select()
      .single();
    if (error) throw error;
    return data as Job;
  }
  seed();
  const job: Job = {
    id: uid(),
    title: j.title,
    description: j.description,
    status: "open",
    questions: j.questions,
    rubric: j.rubric,
    created_at: new Date().toISOString(),
  };
  mem.jobs.unshift(job);
  return job;
}

export async function getJob(id: string): Promise<Job | null> {
  if (sb) {
    const { data } = await sb.from("jobs").select().eq("id", id).single();
    return (data as Job) || null;
  }
  seed();
  return mem.jobs.find((x) => x.id === id) || null;
}

export async function listJobs(): Promise<Job[]> {
  if (sb) {
    const { data } = await sb.from("jobs").select().order("created_at", { ascending: false });
    return (data as Job[]) || [];
  }
  seed();
  return mem.jobs;
}

// ---------------- APPLICATIONS ----------------
export async function createApplication(a: {
  job_id: string;
  candidate_name: string;
  candidate_email?: string;
  resume_text?: string;
  answers: string[];
}): Promise<Application> {
  if (sb) {
    const { data, error } = await sb
      .from("applications")
      .insert({ ...a, status: "scoring" })
      .select()
      .single();
    if (error) throw error;
    return data as Application;
  }
  const app: Application = {
    id: uid(),
    ...a,
    status: "scoring",
    created_at: new Date().toISOString(),
  };
  mem.apps.unshift(app);
  return app;
}

export async function saveScore(id: string, s: Score): Promise<Application> {
  const patch = {
    status: "scored" as const,
    score: s.score,
    subscores: s.subscores,
    reason: s.reason,
    verdict: s.verdict,
    scored_at: new Date().toISOString(),
  };
  if (sb) {
    const { data, error } = await sb.from("applications").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return data as Application;
  }
  const app = mem.apps.find((x) => x.id === id)!;
  Object.assign(app, patch);
  return app;
}

export async function getApplication(id: string): Promise<Application | null> {
  if (sb) {
    const { data } = await sb.from("applications").select().eq("id", id).single();
    return (data as Application) || null;
  }
  return mem.apps.find((x) => x.id === id) || null;
}

export async function listApplications(jobId?: string): Promise<Application[]> {
  if (sb) {
    let q = sb.from("applications").select().order("score", { ascending: false, nullsFirst: false });
    if (jobId) q = q.eq("job_id", jobId);
    const { data } = await q;
    return (data as Application[]) || [];
  }
  let apps = [...mem.apps];
  if (jobId) apps = apps.filter((a) => a.job_id === jobId);
  return apps.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}

// ---------------- PRACTICE SESSIONS ----------------
export async function savePracticeSession(p: {
  candidate_email?: string;
  role: string;
  transcript: { role: string; content: string }[];
  readiness_score: number;
  feedback: string;
  paid: boolean;
  amount_cents?: number;
}): Promise<{ id: string }> {
  if (sb) {
    const { data, error } = await sb
      .from("practice_sessions")
      .insert({
        candidate_email: p.candidate_email,
        role: p.role,
        transcript: p.transcript,
        readiness_score: p.readiness_score,
        feedback: p.feedback,
        paid: p.paid,
        amount_cents: p.amount_cents ?? 200,
        status: "completed",
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: (data as any).id };
  }
  return { id: uid() };
}

// ---------------- PRACTICE WALLET (prepaid tokens) ----------------
export async function getTokens(email: string): Promise<number> {
  if (!email) return 0;
  if (sb) {
    const { data } = await sb.from("practice_wallets").select("tokens").eq("email", email).single();
    return (data as any)?.tokens ?? 0;
  }
  return mem.wallets[email] || 0;
}

export async function addTokens(email: string, n: number): Promise<number> {
  const current = await getTokens(email);
  const next = Math.min(MAX_TOKENS, current + n);
  if (sb) {
    await sb.from("practice_wallets").upsert({ email, tokens: next, updated_at: new Date().toISOString() });
  } else {
    mem.wallets[email] = next;
  }
  return next;
}

// ---------------- FREE TRIAL ----------------
export type TrialStatus = { started: boolean; active: boolean; daysLeft: number };

export async function getTrial(email: string): Promise<TrialStatus> {
  if (!email) return { started: false, active: false, daysLeft: TRIAL_DAYS };
  let startedAt: string | null = null;
  if (sb) {
    const { data } = await sb.from("practice_wallets").select("trial_started_at").eq("email", email).single();
    startedAt = (data as any)?.trial_started_at ?? null;
  } else {
    startedAt = mem.trials[email] ?? null;
  }
  // Not started yet -> eligible for the full free week.
  if (!startedAt) return { started: false, active: true, daysLeft: TRIAL_DAYS };
  const end = new Date(startedAt).getTime() + TRIAL_DAYS * 86400000;
  const remaining = end - Date.now();
  return { started: true, active: remaining > 0, daysLeft: Math.max(0, Math.ceil(remaining / 86400000)) };
}

// Start the trial clock on first free practice (no-op if already started).
export async function startTrial(email: string): Promise<TrialStatus> {
  if (!email) return { started: false, active: false, daysLeft: 0 };
  const current = await getTrial(email);
  if (current.started) return current;
  const nowIso = new Date().toISOString();
  if (sb) {
    await sb.from("practice_wallets").upsert({ email, trial_started_at: nowIso });
  } else {
    mem.trials[email] = nowIso;
  }
  return { started: true, active: true, daysLeft: TRIAL_DAYS };
}

// Spend one token. Returns the new balance, or -1 if none available.
export async function spendToken(email: string): Promise<number> {
  const current = await getTokens(email);
  if (current <= 0) return -1;
  const next = current - 1;
  if (sb) {
    await sb.from("practice_wallets").upsert({ email, tokens: next, updated_at: new Date().toISOString() });
  } else {
    mem.wallets[email] = next;
  }
  return next;
}
