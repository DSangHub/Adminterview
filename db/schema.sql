-- ============================================================
-- Adminterview — Supabase schema
-- Run this in Supabase → SQL Editor → New query → Run.
-- ============================================================

-- Extension for UUIDs (usually already enabled on Supabase)
create extension if not exists "pgcrypto";

-- ---------- JOBS ----------
-- A job opening. When one is created, the AI drafts scenario
-- questions + a scoring rubric for the role.
create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'open',   -- open | closed
  questions     jsonb default '[]'::jsonb,       -- AI-generated scenario questions
  rubric        text,                            -- AI-generated scoring rubric
  created_at    timestamptz not null default now()
);

-- ---------- APPLICATIONS ----------
-- One candidate applying to a job. On insert, the AI screens the
-- answers (+ optional resume text) and writes the scores back.
create table if not exists public.applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs(id) on delete cascade,
  candidate_name  text not null,
  candidate_email text,
  resume_text   text,                            -- extracted from an uploaded resume
  answers       jsonb default '[]'::jsonb,       -- candidate's scenario answers

  -- AI results (filled by the scoring function)
  status        text not null default 'scoring', -- scoring | scored | error
  score         int,                             -- overall fit score 0..100
  subscores     jsonb,                           -- {communication, judgment, attention, speed}
  reason        text,                            -- plain-language explanation
  verdict       text,                            -- Strong fit | Consider | Not a fit
  scored_at     timestamptz,

  created_at    timestamptz not null default now()
);

create index if not exists applications_job_id_idx on public.applications(job_id);
create index if not exists applications_score_idx on public.applications(score desc);

-- ============================================================
-- OPTIONAL: fully event-driven scoring (Approach #2)
-- ------------------------------------------------------------
-- The app already scores on submit via the API route. If you'd
-- rather have Supabase itself fire the AI on every INSERT, enable
-- a Database Webhook instead of the code path:
--   Supabase Dashboard → Database → Webhooks → Create
--     Table:  applications
--     Events: INSERT
--     Type:   HTTP Request (POST)
--     URL:    https://<your-app>.vercel.app/api/applications/score-hook
-- Then that endpoint reads the new row, calls Claude, and updates it.
-- (Left as a note — the default build scores inline, which is simpler.)
-- ============================================================
