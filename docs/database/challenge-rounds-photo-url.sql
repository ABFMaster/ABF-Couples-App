-- Memory Test photo-as-question rounds, Aug 17 2026.
-- ============================================================================
-- Purpose: a new Memory round type where a real photo (with a vision
-- description already cached via docs/database/photo-descriptions.sql) IS
-- the question, rather than a late-stage hint. See
-- app/api/game-room/challenge/generate/route.js's photo-round branch.
--
-- prompt_key doubles as the dedup key for photo rounds too (same mechanism
-- already used for text prompts) -- set to a short deterministic hash of
-- the photo URL rather than a new tracking column.
-- ============================================================================

ALTER TABLE public.challenge_rounds
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
