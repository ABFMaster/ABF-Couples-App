-- Mixtape data-flow fix (task #166) — Aug 11 2026
--
-- Root cause: Mixtape (app/mixtape/page.js) reads songs from a set of flat
-- columns on `flirts` (spotify_track_id, spotify_track_name, spotify_artist,
-- spotify_album_art, spotify_preview_url, spotify_track_url) that were added
-- by docs/database/song_flirts.sql during an earlier version of the Flirt
-- send flow. Flirt was later refactored to store song data in a single
-- `metadata` JSONB column instead (see app/api/flirts/send/route.js), and
-- nothing ever updated Mixtape or backfilled the flat columns to match — so
-- every song sent since that refactor has been invisible to Mixtape, even
-- though it renders fine inside Flirt itself.
--
-- Step 1 is a safe no-op if song_flirts.sql already ran (IF NOT EXISTS).
-- Step 2 backfills existing song flirts using COALESCE, so it only fills
-- rows that are actually missing the data — safe to run more than once.

-- 1. Make sure the flat columns exist (idempotent).
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_track_id TEXT;
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_track_name TEXT;
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_artist TEXT;
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_album_art TEXT;
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_preview_url TEXT;
ALTER TABLE public.flirts ADD COLUMN IF NOT EXISTS spotify_track_url TEXT;

-- 2. Backfill from the metadata JSONB every song flirt has actually been
-- written to since the refactor. track_id is deliberately NOT backfilled
-- here — the app never captured it in metadata until this fix, so there's
-- nothing to recover for historical rows. The code fix relaxes Mixtape's
-- eligibility check to key off spotify_track_name instead (always present),
-- so old songs still show up correctly without a track_id.
UPDATE public.flirts
SET
  spotify_track_name  = COALESCE(spotify_track_name,  metadata->>'track_name'),
  spotify_artist       = COALESCE(spotify_artist,       metadata->>'artist'),
  spotify_album_art    = COALESCE(spotify_album_art,    metadata->>'album_art'),
  spotify_preview_url  = COALESCE(spotify_preview_url,  metadata->>'preview_url'),
  spotify_track_url    = COALESCE(spotify_track_url,    metadata->>'track_url')
WHERE type = 'song'
  AND metadata IS NOT NULL
  AND spotify_track_name IS NULL;
