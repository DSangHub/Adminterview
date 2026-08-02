// ============================================================
// lib/ai.ts — "the AI role"
// Two jobs:
//   generateQuestions()  -> when a JOB is created
//   scoreApplication()   -> when an APPLICATION is submitted
//
// Uses Claude (Anthropic) when ANTHROPIC_API_KEY is set.
// Falls back to a deterministic mock so the app is fully clickable
// with zero configuration (great for a demo). Add the key to switch
// to real AI — no code change needed.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
export const AI_LIVE = Boolean(KEY);

const client = KEY ? new Anthropic({ apiKey: KEY }) : null;

export type SubScores = {
  communication: number;
  judgment: number;
  attention: number;
  speed: number;
};
export type Score = {
  score: number;
  subscores: SubScores;
  reason: string;
  verdict: "Strong fit" | "Consider" | "Not a fit";
};

// ---- helpers ----
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json in model reply");
  return JSON.parse(raw.slice(start, end + 1));
}
function clamp(n: number, lo = 0, hi = 100) {
  n = Math.round(Number(n) || 0);
  return Math.max(lo, Math.min(hi, n));
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function verdictFor(score: number): Score["verdict"] {
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Consider";
  return "Not a fit";
}

// ============================================================
// 1) JOB CREATED  ->  draft scenario questions + rubric
// ============================================================
export async function generateQuestions(
  title: string,
  description: string
): Promise<{ questions: string[]; rubric: string }> {
  if (client) {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system:
        "You design fair, job-relevant screening interviews for administrative and operations roles. " +
        "Return ONLY JSON.",
      messages: [
        {
          role: "user",
          content:
            `Role title: ${title}\nRole description: ${description || "(none provided)"}\n\n` +
            `Write 5 concise scenario-based screening questions for this role, plus a short scoring rubric ` +
            `covering communication, judgment, attention to detail, and speed. ` +
            `Respond as JSON: {"questions": string[], "rubric": string}.`,
        },
      ],
    });
    const text = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
    const j = extractJson(text);
    return {
      questions: Array.isArray(j.questions) ? j.questions.slice(0, 8) : [],
      rubric: String(j.rubric || ""),
    };
  }

  // ---- mock (no key) ----
  const t = title || "this role";
  return {
    questions: [
      `A stakeholder needs a report in 30 minutes but data is missing. Walk through how you'd handle it as a ${t}.`,
      "Describe a time you caught an error others missed. How did you catch it?",
      "You're double-booked for two urgent tasks. How do you decide what to do first?",
      "A coworker keeps sending unclear requests. How do you get what you need without friction?",
      "How do you keep recurring admin work organized so nothing slips?",
    ],
    rubric:
      "Score communication (clarity, tone), judgment (prioritization, sound decisions), " +
      "attention to detail (accuracy, catching issues), and speed (efficiency). 0–100 each; " +
      "overall is a weighted blend favoring judgment and attention.",
  };
}

// ============================================================
// 2) APPLICATION SUBMITTED  ->  screen + score
// ============================================================
export async function scoreApplication(input: {
  role: string;
  rubric?: string;
  questions: string[];
  answers: string[];
  resumeText?: string;
}): Promise<Score> {
  const { role, rubric, questions, answers, resumeText } = input;

  if (client) {
    const qa = questions
      .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "(no answer)"}`)
      .join("\n\n");
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system:
        "You are a fair, consistent hiring screener for administrative roles. " +
        "Score strictly against the rubric, ignore demographic cues, and return ONLY JSON.",
      messages: [
        {
          role: "user",
          content:
            `Role: ${role}\nRubric: ${rubric || "communication, judgment, attention to detail, speed"}\n\n` +
            (resumeText ? `Resume:\n${resumeText}\n\n` : "") +
            `Screening answers:\n${qa}\n\n` +
            `Return JSON: {"score": 0-100, "subscores": {"communication":0-100,"judgment":0-100,` +
            `"attention":0-100,"speed":0-100}, "reason": "1-2 sentences", ` +
            `"verdict": "Strong fit" | "Consider" | "Not a fit"}.`,
        },
      ],
    });
    const text = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
    const j = extractJson(text);
    const sub = j.subscores || {};
    const subscores: SubScores = {
      communication: clamp(sub.communication),
      judgment: clamp(sub.judgment),
      attention: clamp(sub.attention),
      speed: clamp(sub.speed),
    };
    const score = clamp(j.score);
    return {
      score,
      subscores,
      reason: String(j.reason || "").slice(0, 400),
      verdict: (j.verdict as Score["verdict"]) || verdictFor(score),
    };
  }

  // ---- mock (no key): deterministic, based on answer content ----
  const joined = answers.join(" ").trim();
  const seed = hash(joined || role);
  const len = joined.length;
  const base = 62 + (seed % 26); // 62..87
  const lift = Math.min(10, Math.floor(len / 60)); // more thorough answers score a bit higher
  const communication = clamp(base + lift + ((seed >> 2) % 6));
  const judgment = clamp(base + lift + ((seed >> 4) % 8) - 2);
  const attention = clamp(base + lift + ((seed >> 6) % 7));
  const speed = clamp(70 + ((seed >> 8) % 22));
  const score = clamp(
    Math.round(communication * 0.25 + judgment * 0.3 + attention * 0.3 + speed * 0.15)
  );
  return {
    score,
    subscores: { communication, judgment, attention, speed },
    reason:
      score >= 80
        ? "Clear, well-prioritized answers with strong attention to detail."
        : score >= 60
        ? "Solid responses; some areas could show more depth or precision."
        : "Answers were thin or missed key parts of the scenarios.",
    verdict: verdictFor(score),
  };
}

// ============================================================
// 3) PRACTICE — Claude plays interviewer + coach (candidate side)
// ============================================================
export type ChatMsg = { role: "assistant" | "user"; content: string };

const PRACTICE_QUESTIONS = [
  "To start: tell me about a time you had to juggle several urgent tasks at once. How did you handle it?",
  "A manager asks for a report in 30 minutes, but some data is missing. Walk me through what you'd do.",
  "Describe a time you caught a mistake others had missed. How did you catch it?",
  "How do you keep recurring admin work organized so nothing slips through the cracks?",
  "Last one: a coworker keeps sending vague requests. How do you get what you need without friction?",
];

// One turn of the mock interview. Returns the coach's next message and
// whether the interview is complete.
export async function practiceReply(
  role: string,
  messages: ChatMsg[]
): Promise<{ reply: string; done: boolean }> {
  const answersSoFar = messages.filter((m) => m.role === "user").length;
  const done = answersSoFar >= PRACTICE_QUESTIONS.length;

  if (client) {
    const sys =
      `You are a warm, encouraging interview coach running a MOCK practice interview for a ${role} role. ` +
      `Ask ONE scenario question at a time. After each candidate answer, give 1-2 sentences of specific, kind coaching ` +
      `(what was strong + one concrete improvement), then ask the next question. ` +
      `Ask about 5 questions total, then let them know you'll wrap up with feedback. Keep replies short.`;
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 350,
      system: sys,
      messages: messages.length
        ? messages.map((m) => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: "Let's begin the practice interview." }],
    });
    const reply = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("").trim();
    return { reply, done };
  }

  // ---- mock ----
  if (messages.length === 0) {
    return { reply: `Hi! I'm your practice interviewer for the ${role} role. ${PRACTICE_QUESTIONS[0]}`, done: false };
  }
  const last = messages[messages.length - 1];
  const strong = (last.content || "").length > 80;
  const coach = strong
    ? "Nice — that's specific and shows clear prioritization."
    : "Good start — try adding a concrete example and the outcome to make it land.";
  if (done) return { reply: `${coach} That's all my questions — let's look at your feedback.`, done: true };
  return { reply: `${coach} Next: ${PRACTICE_QUESTIONS[answersSoFar] || PRACTICE_QUESTIONS[0]}`, done: false };
}

export async function practiceSummary(
  role: string,
  messages: ChatMsg[]
): Promise<{ readiness: number; feedback: string }> {
  if (client) {
    const transcript = messages.map((m) => `${m.role === "user" ? "Candidate" : "Coach"}: ${m.content}`).join("\n");
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `You are an encouraging interview coach. Return ONLY JSON.`,
      messages: [
        {
          role: "user",
          content:
            `Role: ${role}\nMock interview transcript:\n${transcript}\n\n` +
            `Give a readiness score and 2-3 sentences of warm, actionable feedback. ` +
            `JSON: {"readiness": 0-100, "feedback": "..."}`,
        },
      ],
    });
    const text = msg.content.map((b: any) => (b.type === "text" ? b.text : "")).join("");
    const j = extractJson(text);
    return { readiness: clamp(j.readiness), feedback: String(j.feedback || "").slice(0, 500) };
  }

  // ---- mock ----
  const ans = messages.filter((m) => m.role === "user");
  const chars = ans.reduce((n, m) => n + (m.content || "").length, 0);
  const readiness = clamp(60 + Math.min(35, Math.floor(chars / 40)));
  return {
    readiness,
    feedback:
      readiness >= 80
        ? "You're interview-ready — your answers were specific and well-structured. Keep leading with a concrete example and the result."
        : "Good foundation. To level up, add a specific example to each answer and finish with the outcome so your impact is clear.",
  };
}
