# Follow-Through — Generation & Data Spec

Companion to `Sessions/NOW_DO_THIS_DESIGN.md`. That doc settles the design; this one
scopes exactly what gets built: the Nora prompt, the JSON contract, the DB table, and
where it wires into the existing Bet flow. Written to match the codebase's existing
patterns (`lib/nora.js`, `lib/nora-memory.js`, `app/api/bet/respond/route.js`) rather than
inventing new ones.

## Where this fires

Inside `app/api/bet/respond/route.js`, in the existing `if (allFilled && !mine?.nora_reaction)`
block — the same moment `nora_reaction` and `nora_intro` are generated today. Follow-
Through generation happens once, server-side, right after that block succeeds, using data
already fetched in that request (`betRow`, `mine`, `theirs`, `myName`, `partnerName`).

## Per-user generation, not one shared prompt

Bet's own reaction generation already personalizes per person (`userPrompt` speaks to
`myName`, `partnerUserPrompt` speaks to `partnerName`, two separate calls). Follow-Through
does the same: two independent generations, one per partner, each producing its own
action. They are not required to match in kind — one can land other-directed while the
other lands self-directed the same night. The report/reveal UI branches per item, not
per couple (see "Tier 2 rendering" below).

## The generation prompt

One call per partner. Reuses `noraGenerate` (JSON-structured output, same function
`extractStructuredFacts` and claim extraction already use in `lib/nora-memory.js`).
Pull `getNoraMemory(coupleId)` first so the action is grounded in what Nora actually
knows about this couple, not generic — same bar the rest of the app already holds.

```
const memory = await getNoraMemory(coupleId)

const prompt = `The Bet question tonight was: "${betRow.question}"

${myName}'s answer: "${mine.actual_answer}"
${partnerName}'s answer: "${theirs.actual_answer}"

${memory?.couple_notes?.notes ? `WHAT YOU KNOW ABOUT THIS COUPLE:\n${memory.couple_notes.notes}\n` : ''}
${memory?.user1_notes?.notes || memory?.user2_notes?.notes ? `WHAT YOU KNOW ABOUT ${myName.toUpperCase()}:\n${isUser1 ? memory.user1_notes?.notes : memory.user2_notes?.notes}\n` : ''}

RECENT FOLLOW-THROUGH ACTIONS ALREADY GIVEN (do not repeat these or anything close to them):
${recentActionsList || 'None yet.'}

You are Nora. Based on tonight's Bet, give ${myName} ONE specific, real-world thing to do
today or tonight — not homework, an invitation. Something they'd want to do because
they're curious what happens, not because they should.

Two kinds of action exist. Pick whichever tonight's content actually earns:
- OTHER-DIRECTED: something ${myName} does TO or FOR ${partnerName} — said, given, shown.
  ${partnerName} will experience this directly and immediately in the real world.
- SELF-DIRECTED: something ${myName} does privately — notices, writes down, reflects on —
  that ${partnerName} has no way of knowing about unless ${myName} chooses to share it.

Bias toward OTHER-DIRECTED — bids for connection your partner actually receives are the
stronger mechanic here. Only choose SELF-DIRECTED when tonight's content specifically
calls for private reflection rather than an action toward ${partnerName}.

Return ONLY this JSON, no other text:
{
  "action_text": "the invitation itself, max 20 words, speaks directly to ${myName} as 'you', never mentions being generated or is meta about the app",
  "directed": "other" or "self",
  "one_line_why": "max 12 words, private to Nora's own reasoning, never shown to the user — why this action for this couple tonight"
}`
```

`route: 'follow-through/generate'`, `context: 'daily'`, `maxTokens: 200`.

`recentActionsList` — last 5-10 `action_text` values for this couple across both users,
pulled from the new table below. Prevents repeats and lets Nora vary category (a
compliment three nights running is worse than no follow-through at all).

**Parsing:** same defensive pattern as `extractStructuredFacts` — strip code fences,
`JSON.parse`, wrap in try/catch, fall back to `null` (meaning: no Follow-Through
generated that night, fails silently, never blocks the Bet reveal itself). This mirrors
the existing rule that Nora-adjacent generation is always non-blocking to the core flow.

## Data model

One new table, one row per couple per trigger, matching the per-user-columns-on-one-row
shape `bet_responses` already proves out (protocol #16 — single source of truth in DB,
not client state):

```sql
create table follow_throughs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id),
  source_type text not null,        -- 'bet' | 'spark' | 'notice' (v1: always 'bet')
  source_id uuid not null,          -- bet_id / spark_id / etc
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,  -- set per the 6pm-cutoff timing rule

  user1_action_text text,
  user1_directed text,              -- 'other' | 'self'
  user1_status text default 'pending',   -- 'pending' | 'done' | 'declined' | 'expired'
  user1_note text,
  user1_reported_at timestamptz,
  user1_solo_reaction text,         -- Tier 1, private, generated on user1's own report

  user2_action_text text,
  user2_directed text,
  user2_status text default 'pending',
  user2_note text,
  user2_reported_at timestamptz,
  user2_solo_reaction text,

  mutual_synthesis text,            -- Tier 2 for 'other'-directed items — Nora's cross-
                                     -- couple pattern line, generated once BOTH reported
  user1_partner_notified boolean default false,  -- asymmetric-completion soft nudge
  user2_partner_notified boolean default false,

  superseded_at timestamptz,        -- set the instant a new trigger replaces this row
  wildcard boolean default false,
  wildcard_flavor text              -- 'bigger_scope' | 'partner_authored' | null
);
```

Tier 2's content reveal (for self-directed items specifically) lives in the same
`user1_action_text`/`user2_action_text` + `user*_note` columns already on the row —
no separate column needed, since "show the content" for a self-directed item just means
rendering the other partner's existing `action_text` + `note` once both have reported.
The gate (both must report before either sees the other's side) applies uniformly
regardless of directed-type — the BeReal-style "post before you see" incentive holds
either way. Only *what's shown once unlocked* differs: `mutual_synthesis` for other-
directed items, the partner's own `note`/`action_text` for self-directed ones.

## Tier 2 rendering (per item, not per couple)

Since each partner's action is generated and tagged independently, a single night can be
mixed — one partner's action other-directed, the other's self-directed. The report/reveal
screen checks each side's `directed` tag separately when building the mutual-reveal view:
other-directed side → synthesis line; self-directed side → actual content. Both can be
present in the same Tier 2 moment if the night was mixed.

## Signal types — feeding this back into Nora's memory

Two additions to `SIGNAL_TYPES` in `lib/nora-memory.js`:

```
FOLLOW_THROUGH_REPORTED: 'follow_through_reported'   // individual, fires per-user report
FOLLOW_THROUGH_COMPLETED: 'follow_through_completed' // couple-level, fires once both reported
```

Weights: `FOLLOW_THROUGH_REPORTED` individual weight 1 (same tier as `RITUAL_CHECKIN`).
`FOLLOW_THROUGH_COMPLETED` couple weight 2 (same tier as `BET_REVEAL`). This is genuine
behavior data, not self-report — per the existing conflict-resolution rule in
`lib/nora-memory.js` ("behavior beats self-report"), whether a couple actually follows
through on a bid is a stronger signal than anything either partner says about themselves,
and should be treated that way in the notes prompts (`buildPersonNotesPrompt` /
`buildCoupleNotesPrompt` need one new `signalLens` entry each for these two types).

## Expiry, replacement, and the flip — implementation notes

These are already decided in `NOW_DO_THIS_DESIGN.md`; noting here only how they touch
this table specifically:
- `expires_at` is computed at generation time using the 6pm-local-cutoff rule.
- A cron sweep (same pattern as the existing morning-after dates cron) marks rows
  `expired` on both sides past `expires_at`, non-blocking, same "quietly, no guilt"
  treatment already used elsewhere.
- Replacement: when a new Follow-Through generates for a couple and an unresolved row
  still exists, set that row's `superseded_at` and leave its per-user statuses whatever
  they already were (not forced to `expired` — the weekly recap can distinguish "expired
  on its own" from "superseded by the next one" if that distinction ever matters, though
  it doesn't change the user-facing treatment).

## Not yet in this spec (still open, per NOW_DO_THIS_DESIGN.md)

- Distress-sensitivity gating before generation fires at all
- Per-couple opt-out
- Exact copy for the asymmetric-completion soft nudge
- Wildcard generation prompt variant (bigger-scope and partner-authored need their own
  prompt shape, not covered above — above is the standard-night case only)
