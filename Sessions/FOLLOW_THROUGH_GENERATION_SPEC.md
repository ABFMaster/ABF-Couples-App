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
  wildcard_flavor text,             -- 'bigger_scope' | 'partner_authored' | null
  candidate_actions jsonb,          -- { for: 'user1'|'user2', options: [...] } — partner-authored wildcard, cleared once picked

  user1_moved_on_at timestamptz,    -- added post-implementation, see note below
  user2_moved_on_at timestamptz
);
```

**Built, not just specced — one addition beyond the original design.** Implementation
surfaced a real gap: `superseded_at` alone can't gate per-user visibility, because under
Bet-only's weekly cadence a resolved row can sit un-superseded for up to a week. Without a
per-user "have I already tapped through this" flag, the shared slot would keep showing a
fully-resolved Follow-Through all week instead of handing back to the day's actual
activity — same bug shape as Bet's `reveal_seen_at` fix earlier this session. Fixed by
adding `user{N}_moved_on_at`, set when that user taps "See today's Bet →". A row is
active for a given user only if their status is still actionable, or they haven't yet
moved on past a resolved one — never gated on the row's shared `superseded_at` alone.

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
- `expires_at` is computed at generation time using the 6pm-local-cutoff rule, via the
  new `hoursUntilNextLocalMorning()` helper in `lib/dates.js`.
- Implemented as **lazy expiry on read**, not a cron sweep: `/api/follow-through/today`
  checks `expires_at` against now on every fetch and flips any still-open side to
  `expired` inline before responding. Simpler than a scheduled sweep, always correct
  (nobody can see a stale un-expired row, since the check runs exactly when it's read),
  and avoids adding a 4th cron entry to an app already flagged for being near the Hobby
  plan's cap. No vercel.json change needed for this piece.
- Replacement: when a new Follow-Through generates for a couple and an unresolved row
  still exists, set that row's `superseded_at` and leave its per-user statuses whatever
  they already were (not forced to `expired` — the weekly recap can distinguish "expired
  on its own" from "superseded by the next one" if that distinction ever matters, though
  it doesn't change the user-facing treatment).

## Distress-sensitivity gate

Not a validated distress detector — we don't have one, and building generation logic
that pretends otherwise would be overclaiming (flagged honestly earlier in this design
process). What we do have is two cheap, existing-pattern signals, used conservatively:
err toward silently skipping generation, never toward forcing an action into a bad night.

**Layer 1 — coarse, couple-level, free (data already exists).** Before generating,
check `memory.couple_notes.structured_facts.trajectory` (already computed by the existing
`extractStructuredFacts` in `lib/nora-memory.js`). If `trajectory === 'away'`, skip
generation entirely for both partners tonight. No new call, no new cost — this data is
already being written every time Bet/Spark/etc. update couple notes.

**Layer 2 — fine, per-night, cheap.** Trajectory is a slow-moving signal and can lag an
acute bad night. Add one `noraSignal` call (same fast/cheap Haiku pattern already used by
`shouldUpdateMemory`) reading tonight's actual Bet answers specifically:

```
const distressCheck = await noraSignal(
  `Tonight's Bet question: "${betRow.question}"\n${myName}: "${mine.actual_answer}"\n${partnerName}: "${theirs.actual_answer}"\n\nDoes either answer suggest active distress, conflict, or a rough patch tonight, as opposed to normal playful or reflective engagement? Answer exactly YES or NO.`,
  { route: 'follow-through/distress-check', maxTokens: 10 }
)
```

If either layer trips, skip generation for both partners that night. No row is created,
nothing is shown, nothing expires and nothing needs explaining — a missing Follow-Through
isn't a signal either partner is watching for the way a missing partner-response is, so
silence here costs nothing.

## Per-couple opt-out

Decision: **no settings toggle in v1.** The mechanic already degrades gracefully to
ignorable — no push, no badge, no penalty, quietly expires if untouched. A couple that
doesn't want this can already opt out for free by simply never engaging with it, at zero
cost to them. Building a dedicated toggle means new settings UI, a new preference column,
and gating logic in every generation path, for a feature that already has a soft off-
switch built in. Same reasoning already applied to the AI web-search suggestion agent
decision this session: wire up the real thing, see actual usage, add a toggle later only
if real users ask for one.

## Wildcard variants

**Eligibility check (runs before either wildcard flavor is considered):** both partners'
`individual_signal_count` must be above the existing Tier 1 threshold (reusing the
`getTier()` cutoff already defined in `lib/nora-memory.js` — Tier 2 requires >5), the
distress gate above must have passed clean, and no wildcard has fired for this couple in
the last 14 days (`select 1 from follow_throughs where couple_id = ? and wildcard = true
and created_at > now() - interval '14 days'`). Skip wildcard entirely if any of these
fail — falls back to a normal night, never blocks generation itself.

If eligible, roll a flat 10% chance. If it hits, pick `bigger_scope` or `partner_authored`
50/50 and tag `wildcard_flavor` accordingly.

**Bigger scope.** Same generation call as the standard prompt, with this appended:

```
This is a wildcard night — Nora occasionally gives something with more scope than usual.
Give ${myName} something bigger: more time, more effort, more intention than a typical
night's action, appropriate for a couple who's earned it. Explicitly frame the timing —
say when this runs through (e.g. "sometime this weekend"), so it's never ambiguous
which loop is still open.
```

`expires_at` for these rows is set explicitly from the stated timeframe rather than the
standard 6pm-cutoff window — computed from what Nora's `action_text` actually says, not
a fixed offset (a "runs through the weekend" action generated on a Tuesday needs a
different expiry than one generated on a Thursday).

**Partner-authored.** Only one partner's action becomes partner-authored per wildcard
night (chosen randomly between the two); the other partner's action is generated
normally. Nora generates candidates instead of a single action:

```
Return ONLY this JSON:
{
  "candidates": [
    {"action_text": "...", "directed": "other"},
    {"action_text": "...", "directed": "other"},
    {"action_text": "...", "directed": "self"}
  ]
}
```

These candidates are shown to the *other* partner (not the one they're for) with framing
like "Pick one for ${myName} tonight" — single tap, no typing. Whichever is picked gets
copied into the normal `action_text`/`directed` columns for that user, and from that point
forward the row behaves exactly like any other Follow-Through — partner-authored only
changes how the action was chosen, not the schema or the report/reveal flow downstream.
Needs one transient state before `pending`: `awaiting_partner_pick`, plus a temporary
`candidate_actions` jsonb column to hold the 2-3 options until one is chosen.

## Asymmetric-completion nudge — placement and copy

Resolved by reusing existing real estate rather than building anything new: the Nora
secondary card (`app/api/dashboard/hero/route.js`, the same `message`/`cta_label`/
`cta_href` slot that already drives the dashboard's Nora card) gets one more candidate
input. That route already does an early-exit priority check (see its `mode === 'post'`
branch) — add a similar early check: does this user have a Follow-Through where their
partner's side is `done` or `declined`, their own side is still `pending`, and
`user{N}_partner_notified` is still false? If so, return that as the hero message instead
of the normal rotation, content-free:

> "Something happened after last night's Bet — worth asking Cass about it."

No `cta_href` needed (there's no dedicated screen to send them to yet — this is a nudge,
not a report interface). Mark `user{N}_partner_notified = true` immediately after this
message is computed once, same as any other Nora card message naturally rotates away and
never needs a dedicated dismiss action.

## Status: built, July 29, 2026

Migration run (including the post-implementation `moved_on_at` addition above),
generation wired into `bet/respond/route.js`, report/reveal endpoints live at
`/api/follow-through/today` and `/api/follow-through/report`, and `FollowThroughCard`
wraps Bet on the dashboard. Not yet live-tested end to end in the app (next Tuesday's
Bet, or a forced test via `?bet=true`, is the first real chance to see it fire).

Known v1 simplifications, honest and deliberate rather than oversights:
- If a partner reports very late — after the other has already tapped through to
  today's activity — that user will not get a special re-surfacing of the Tier 2 mutual
  moment. It is still recorded and reflected in the weekly recap; it just will not
  interrupt them again that session. Acceptable for how rarely this can even occur under
  Bet-only's weekly cadence.
- `awaiting_partner_pick` (the partner-authored wildcard's pick step) has no polling or
  push — the picking partner has to happen to open the app before the picked action
  shows up for the other side. Fine for a ~5%-of-nights wildcard case in v1.
