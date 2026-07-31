-- nora_private_notes — Run this in Supabase SQL Editor
--
-- Holds Nora's synthesized understanding of one individual, built only from
-- their private AI coach conversations (SIGNAL_TYPES.NORA_CONVERSATION).
-- This is the fix for the memory-privacy gap found July 31 2026: that
-- content used to be written into nora_memory.user1_notes/user2_notes,
-- which then got blended into nora_memory.memory_summary and
-- nora_memory.couple_notes.structured_facts — both couple-facing fields,
-- read by Memory Test, the dashboard hero card, Follow-Through, the
-- Wednesday/Thursday cron reveals, and every Game Room debrief. See
-- Sessions/PRODUCT_BACKLOG.md for the full writeup.
--
-- One row per user, never per couple — this table should never be joined
-- into anything that produces couple-facing output. It exists to power
-- continuity within that same person's own AI coach thread only
-- (lib/nora-memory.js, app/api/ai-coach/route.js, app/api/dashboard/hero,
-- app/api/me/synthesis).

CREATE TABLE IF NOT EXISTS public.nora_private_notes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS — defense in depth. The app reads/writes this via the service-role
-- key (bypasses RLS, same as every other table in this app), so this is
-- not the actual enforcement mechanism; the enforcement is that
-- lib/nora-memory.js's couple-facing synthesis functions
-- (buildMemorySummaryPrompt, extractStructuredFacts) simply never receive
-- this table's contents as input. RLS here just means a future direct
-- client-side query (bypassing the API layer entirely) can't read anyone
-- else's private notes either, matching the same pattern already used for
-- ai_conversations/ai_messages (see ai_conversations.sql).
ALTER TABLE public.nora_private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own private notes" ON public.nora_private_notes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own private notes" ON public.nora_private_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own private notes" ON public.nora_private_notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- No DELETE policy — nothing in the app deletes these; account deletion
-- cascades via the FK to auth.users instead (ON DELETE CASCADE above),
-- matching the pattern in app/api/account/delete/route.js for other
-- per-user tables.

CREATE INDEX IF NOT EXISTS idx_nora_private_notes_updated ON public.nora_private_notes(updated_at DESC);
