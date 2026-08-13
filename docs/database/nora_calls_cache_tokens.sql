-- Add cache token tracking to nora_calls.
--
-- Aug 12 2026 — lib/nora.js now marks NORA_VOICE as a prompt-caching
-- breakpoint (cache_control) on every Nora call except noraSignal. Once a
-- system prompt uses caching, Anthropic's usage object on the response
-- reports cache_creation_input_tokens and cache_read_input_tokens as
-- separate fields — they are NOT included in input_tokens. Without these
-- two columns, any cost query against nora_calls (like the one Matt ran to
-- evaluate the Haiku->Sonnet swap for the dashboard hero card) would
-- under-report real spend once caching is live, since it would only see
-- the non-cached portion of input as input_tokens and have no visibility
-- into cache writes/reads at all.
--
-- Run this once in the Supabase SQL Editor. Safe to run any time — until
-- it's applied, lib/nora.js's logCall() will simply fail its insert
-- (caught, logged nowhere, never thrown — same as any other insert error
-- there) and nora_calls logging will have a gap, but the actual Nora
-- response to the user is completely unaffected either way.

ALTER TABLE nora_calls
  ADD COLUMN IF NOT EXISTS cache_creation_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS cache_read_input_tokens INTEGER;

-- Verify after running:
-- select column_name, data_type from information_schema.columns
-- where table_name = 'nora_calls' order by ordinal_position;
