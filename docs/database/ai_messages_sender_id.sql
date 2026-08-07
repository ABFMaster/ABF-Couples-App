-- Foundation for the Couples Nora Session feature — Aug 7 2026.
--
-- ai_conversations already supports type='shared' in its CHECK constraint
-- and already has RLS policies for it (both couple members can read a
-- shared conversation) — but that path has never actually been used;
-- every conversation created so far has been type='solo'.
--
-- ai_messages, however, has no way to record WHICH partner sent a given
-- 'user' role message. Solo conversations never needed this (there's only
-- ever one person), but a shared conversation needs to know who said what
-- so both partners' history renders correctly and so Nora's prompt can
-- correctly attribute each turn ("Matt said X, Cass said Y") instead of
-- treating every 'user' message as coming from one undifferentiated voice.
--
-- Nullable and additive only — solo conversations leave this column null
-- forever, nothing existing changes behavior.

ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ai_messages_sender ON public.ai_messages(sender_id);
