-- Notes-history snapshot (task #186) — Aug 11 2026
--
-- updateNoraMemory() (lib/nora-memory.js) synthesizes new prose for
-- user1_notes/user2_notes/couple_notes/memory_summary on every meaningful
-- signal, then overwrites nora_memory wholesale via .upsert(). Until this
-- migration, the previous value was never preserved anywhere — a wrong
-- inference from one bad LLM call could silently replace correct context
-- with no way to detect it happened or roll it back. Claims already have
-- real belief-revision history (confidence, status, dormant_linked_claim_id
-- lineage via the CONFIRMED/CHALLENGED/CORRECTED lifecycle) — narrative
-- notes had none of that asymmetric protection.
--
-- Deliberately NOT event sourcing: one row per layer, only written right
-- before it gets overwritten, capturing just enough to answer "what did
-- this say before, and roughly why did it change" for a human debugging a
-- specific bad memory. Modelled on the existing push_log table
-- (see app/api/push/send/route.js) — this codebase's one prior precedent
-- for a simple insert-only log table — rather than introducing a new
-- logging convention. Does not change how memory is ever read; the app
-- never queries this table, only writes to it.
--
-- source_signal_type is stored as free text, not a foreign key, matching
-- how signal_type is already stored on nora_signals — this is a debugging
-- aid, not a table anything else joins against.

create table if not exists public.nora_memory_history (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  layer text not null check (layer in ('user1', 'user2', 'couple', 'summary')),
  previous_value text,
  source_signal_type text,
  replaced_at timestamp with time zone not null default now()
);

create index if not exists nora_memory_history_couple_id_idx
  on public.nora_memory_history (couple_id, replaced_at desc);

-- RLS: same posture as nora_memory/nora_claims/nora_signals — this table is
-- only ever read or written by the service-role client in lib/nora-memory.js,
-- never by a user-scoped client, so it doesn't need a user-facing SELECT
-- policy. Enabling RLS with no policies (service role bypasses RLS
-- entirely) is the same pattern already used for nora_signals.
alter table public.nora_memory_history enable row level security;
