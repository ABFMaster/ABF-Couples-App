-- TEMPORARY DIAGNOSTIC TABLE — added Aug 2026
-- ============================================================================
-- Purpose: real visibility into whether /api/cron/scheduled-tasks is
-- actually firing and which conditional blocks (Weekly Reflection,
-- Thursday, Wednesday x3, etc.) ran on each invocation — without needing
-- a paid Vercel plan for extended log retention. Requested by Matt after
-- investigating a missed Weekly Reflection (Sunday 8/2/2026).
--
-- This is meant to be removed once cron health is confirmed over a few
-- weeks of real data. See Sessions/PRODUCT_BACKLOG.md for the removal
-- note — do not let this outlive its usefulness (Matt's explicit
-- instruction). Removal is just: drop this table, and revert the
-- diagnostic block in app/api/cron/scheduled-tasks/route.js's GET handler.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cron_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ran_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  utc_day INTEGER NOT NULL,        -- 0 = Sunday ... 6 = Saturday
  utc_hour INTEGER NOT NULL,
  blocks_fired TEXT[] NOT NULL DEFAULT '{}',
  couples_processed INTEGER NOT NULL DEFAULT 0,
  couples_errored INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_ran_at ON public.cron_runs(ran_at DESC);

-- RLS enabled with zero policies — this table is only ever written by the
-- cron route's service-role client, which bypasses RLS entirely. Enabling
-- RLS with no policies just means a client-side (anon/authenticated) call
-- against this table directly would see nothing, which is the correct
-- default for a table with no legitimate client use case.
ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Useful queries once this has been live a while:
--
-- Every run in the last 7 days, most recent first:
-- select ran_at, utc_day, utc_hour, blocks_fired, couples_processed, couples_errored
-- from cron_runs order by ran_at desc limit 50;
--
-- Did Weekly Reflection actually fire on a given Sunday:
-- select * from cron_runs where utc_day = 0 and 'weeklyReflection' = any(blocks_fired)
-- order by ran_at desc;
--
-- Any invocation where couples_errored > 0:
-- select * from cron_runs where couples_errored > 0 order by ran_at desc;
-- ============================================================================

-- STATUS: Not yet applied by Matt.
