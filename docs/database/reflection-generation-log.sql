-- Weekly Reflection diagnostic table, Aug 17 2026.
-- ============================================================================
-- Purpose: reflection/generate has been silently failing every Sunday for
-- months with zero trace anywhere Matt can see (Vercel log retention is 1
-- hour on his plan; nora_calls only captures the LLM step itself, and only
-- from the point this table's own migration went live). This logs every
-- single call to reflection/generate — cron or on-demand, success or any
-- specific failure reason — so the next real Sunday run is fully
-- diagnosable with one query, no Vercel access and no manual curl
-- reproduction needed.
--
-- Temporary, same as cron_runs and nora_calls' observability columns —
-- drop once Weekly Reflection is confirmed healthy over a few real Sundays.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reflection_generation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  couple_id UUID,
  week_start DATE,
  caller TEXT,           -- 'cron' | 'user'
  outcome TEXT,           -- 'success' | 'already_existed' | 'parse_failed' | 'incomplete' | 'insert_failed' | 'exception'
  detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_reflection_generation_log_attempted_at
  ON public.reflection_generation_log(attempted_at DESC);

ALTER TABLE public.reflection_generation_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Once this has caught a real Sunday run:
--
-- select attempted_at, couple_id, week_start, caller, outcome, detail
-- from reflection_generation_log
-- order by attempted_at desc
-- limit 20;
-- ============================================================================
