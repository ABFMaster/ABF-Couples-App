-- Weekly Reflection push-reliability fix (task #179) — Aug 11 2026
--
-- Root cause of the recurring "Weekly Reflection didn't fire" reports
-- (logged 3 times now: Jul 28, Aug 9/10, Aug 11): the push notification
-- telling a couple their reflection is ready had exactly ONE unconditional
-- trigger — a block inside processDailyContent (app/api/cron/scheduled-
-- tasks/route.js) gated on hour===3 && day===0, completely independent of
-- whether generation actually succeeded that run. reflection/generate's own
-- push send only fires the FIRST time a given call is the one that creates
-- the row (the `alreadyExists` early-return path never re-sends), so if the
-- 3am-hour cron tick was ever skipped, delayed outside Vercel's flexible
-- firing window, or errored before reaching that block, nothing else would
-- ever catch it — no fallback path existed.
--
-- Fix: reflection/generate/route.js now checks/stamps this column on EVERY
-- call (whether it creates a new reflection or finds an existing one) and
-- only sends the push if it hasn't gone out yet this week. Since
-- processWeeklyReflection already runs on every Sunday cron tick
-- unconditionally (vercel.json has 3 separate windows that touch Sunday:
-- 10 UTC daily, 13 UTC Sunday-specific, 17 UTC daily), this turns three
-- previously-redundant-for-generation-only windows into real redundancy for
-- the push too, with no single point of failure left.

ALTER TABLE public.weekly_reflections
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
