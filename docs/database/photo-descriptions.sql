-- Photo vision descriptions, Aug 17 2026.
-- ============================================================================
-- Purpose: Memory Test (and eventually Weekly Reflection/other Nora surfaces)
-- can now draw on what's actually IN a couple's real photos, not just text
-- fields. A one-time Claude vision call runs at upload time (lib/nora.js's
-- noraDescribePhoto), never per-generation, and the resulting factual
-- description is cached here so nothing re-analyzes the same photo twice.
--
-- Scope, per Matt's decision Aug 17 2026:
-- - Real date/timeline photos (custom_dates.photos, timeline_events.photo_urls)
--   AND date-stop preview photos (stops[].photo_url) both get descriptions —
--   "can we do both" — even though stop photos are often generic venue shots
--   pulled during planning rather than something the couple experienced.
-- - No sensitive-content gate on top of this. Matt: both partners already
--   see every photo directly in the app, so there's no partner-facing
--   privacy boundary the way there was with AI Coach's private notes
--   (task #187/nora_private_notes) — that gate existed to stop one partner's
--   private disclosure from leaking to the other, which doesn't apply to
--   photos both of them already uploaded/viewed together. The only guardrail
--   is at the prompt level: factual and tasteful, scene-only, never
--   identity/appearance analysis of the people in it.
--
-- custom_dates.photos and timeline_events.photo_urls are plain string arrays
-- (URLs) already read directly by existing client code — adding a parallel
-- JSONB map column (url -> description) instead of restructuring those
-- arrays keeps every existing read site working unchanged.
-- stops[].photo_url lives inside the stops JSONB array itself, so its
-- description is written as a `photo_description` key on the same stop
-- object — no schema change needed there, just an application-level write.
-- ============================================================================

ALTER TABLE public.custom_dates
  ADD COLUMN IF NOT EXISTS photo_descriptions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.timeline_events
  ADD COLUMN IF NOT EXISTS photo_descriptions JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- Once backfilled, spot-check with:
--
-- select id, title, photos, photo_descriptions
-- from custom_dates
-- where photos is not null and array_length(photos, 1) > 0
-- order by date_time desc
-- limit 10;
-- ============================================================================
