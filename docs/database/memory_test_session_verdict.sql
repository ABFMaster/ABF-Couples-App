-- Memory Test: session-level verdict + per-round result classification.
--
-- Aug 12 2026 — Game Room audit found Memory Test has no score of any kind
-- during play and no session-level verdict: it ends on a generic static
-- card ("Memory tested. 3 rounds. Nora's impressed.") with no recap of
-- what was asked, guessed, or missed. The Call has both (call_rounds has
-- an explicit `correct` boolean it computes deterministically from an
-- exact option match; call_sessions.nora_verdict aggregates all 5 rounds
-- into one closing verdict). Memory's guesses are free text, so "correct"
-- can't be computed deterministically the way it is for The Call — Nora
-- has to judge it, which is why this needs a column to store that
-- judgment rather than just re-parsing prose after the fact.
--
-- Run this once in the Supabase SQL Editor.

ALTER TABLE challenge_rounds
  ADD COLUMN IF NOT EXISTS result TEXT CHECK (result IN ('hit', 'close', 'miss'));

ALTER TABLE challenge_sessions
  ADD COLUMN IF NOT EXISTS nora_verdict TEXT;

-- Verify after running:
-- select column_name, data_type from information_schema.columns
-- where table_name in ('challenge_rounds', 'challenge_sessions')
-- order by table_name, ordinal_position;
