# Adminterview — AI-automated hiring

A Next.js app where the AI screens candidates automatically:

- **When a job is posted** → the AI drafts scenario questions + a scoring rubric.
- **When a candidate applies** → the AI screens the answers and writes back a fit
  score, sub-scores (communication, judgment, attention, speed), a verdict, and a reason.

It works with **zero configuration** in demo mode (mock AI + in-memory data), and
becomes production by adding two sets of keys — no code changes.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Pages: `/` landing · `/employers` post a role · `/apply/demo` candidate flow · `/dashboard` ranked candidates.

## Turn on real AI (Claude)

Add to your environment (Vercel → Project → Settings → Environment Variables):

```
ANTHROPIC_API_KEY = sk-ant-...        # from console.anthropic.com
ANTHROPIC_MODEL   = claude-3-5-sonnet-latest   # optional
```

Without the key, scoring uses a deterministic mock so the app still runs.

## Turn on the database (Supabase — persists jobs & applications)

1. In Supabase → SQL Editor, run `db/schema.sql` (creates the `jobs` and `applications` tables).
2. Add these env vars in Vercel (Project Settings → Environment Variables):

```
SUPABASE_URL              = https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service role key>   # Supabase → Project Settings → API
```

Without these, data lives in memory (fine for a demo, resets between requests).

> The service role key is a **secret** — it lives only in server-side env vars, never in the browser.

## How the "AI runs on create" wiring works

- The default build scores **inline** in the API route the moment a row is created
  (`app/api/applications/route.ts` → `lib/ai.ts`). Simplest and reliable.
- For fully event-driven scoring, use a **Supabase Database Webhook** on `INSERT`
  into `applications` (see the note at the bottom of `db/schema.sql`).

## Where things live

```
app/
  page.tsx                     landing page
  employers/page.tsx           post a role  -> POST /api/jobs
  apply/[jobId]/page.tsx       candidate flow -> POST /api/applications
  dashboard/page.tsx           ranked candidates
  api/jobs/route.ts            create job (AI drafts questions)
  api/applications/route.ts    apply (AI screens + scores)
lib/
  ai.ts                        the AI role: generateQuestions() + scoreApplication()
  store.ts                     Supabase or in-memory data layer
db/
  schema.sql                   run this in Supabase
```
