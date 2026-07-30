# Ritual Enrichment — Design (Friday)

Companion to `Sessions/NOW_DO_THIS_DESIGN.md` and `Sessions/FOLLOW_THROUGH_WEEKLY_ROLLOUT.md`.
That doc found Friday's Ritual doesn't mechanically fit Follow-Through's two-tier
blind-reveal shape (weekly not daily, one shared signal not two independent ones) and
recommended exempting it. This doc is the resolution: Ritual doesn't need the mechanic,
it needs the same *spirit* — Nora actually reacting to real content — which it currently
lacks entirely. Settled July 30, 2026, ready for implementation.

## The actual root cause

Rereading `components/RitualCard.js` closely: the weekly commentary during a ritual's
3-week discovering phase isn't generated at all. It's a static lookup table,
`NORA_WEEK_MESSAGES`, three canned lines identical for every couple, every ritual, every
time. Nothing reacts to what the ritual actually is or what this couple did with it.
Separately, once a ritual is adopted, nothing checks on it again, ever — it sits in the
library list with a frozen streak number and zero further tracking. It could go silent
and the app would never notice. Both problems have the same fix: point Nora's existing
generation patterns at data that's currently being ignored.

## Three pieces

### 1. Live Nora reaction replaces canned week-copy (discovering phase)

Delete `NORA_WEEK_MESSAGES`. Replace with a `noraReact` call at check-in time, same
pattern as every other feature, referencing the actual ritual title, description, and
streak — not a generic streak-number template. Persist the result to
`ritual_completions` (new `nora_reaction` column) so it doesn't regenerate on re-render.

### 2. Optional light reflection, shaped like Follow-Through (discovering phase)

Immediately after "We did it," in the same card: a small, skippable optional text box —
"Anything about how this went?" — same quiet visual treatment as Follow-Through's "What
happened?" step. Never required. If given, it feeds directly into the same generation
call from #1, so Nora's reaction can reference it. This is the whole loop borrowing
Follow-Through's rhythm (light action, optional reflection, someone actually reacting)
without needing its blind two-sided data model — the shape transfers, the mechanic
underneath doesn't have to.

### 3. Occasional Nora revisits of adopted (artifact) rituals

This is the piece that needed the design correction: it does not live in the 3-week
discovering window — there's no room there, and nothing has gone unconscious yet in a
ritual that new. It lives entirely in the post-adoption "artifact" phase, and it does two
jobs at once: confirms the ritual is still actually happening (currently nothing does
this — adopted rituals are untracked after adoption), and periodically breathes life into
it with a concrete variation.

**Where it lives:** the existing `LIBRARY` app-state already has a slot that currently
always offers a brand-new ritual to try (`nextSuggestion`). Occasionally, that same slot
surfaces a revisit of an existing adopted ritual instead.

**Cadence — deliberately not on a fixed schedule.** A "notice your unconscious routine"
feature that fires like clockwork becomes exactly the unconscious routine it's meant to
interrupt. Gate on real dormancy: a ritual becomes revisit-eligible once a meaningful
number of weeks have passed since it was adopted or last revisited (needs a
`last_revisited_at` column; a starting point worth testing is ~6 weeks, tunable). When
the `LIBRARY` state renders and at least one adopted ritual is eligible, there's a
moderate chance (~25%, tunable, same spirit as Follow-Through's wildcard roll) it shows
the revisit instead of a brand-new suggestion that visit.

**The interaction is one line, doing both jobs.** No separate confirm-then-suggest steps
— Nora's generated line carries both at once, the same way a wildcard's "runs through the
weekend" framing lives inside the action text rather than a separate UI element:
"Are you two still doing your Sunday walk? If so, try a different route this time."
Two responses, as simple as the existing check-in: "Still going" (logs it, keeps the
streak, `last_revisited_at` resets) or "We drifted from this one" — which reuses the
*existing* `retired` status transition already built for the discovering-phase retire
path (`handleRetire` already does exactly this state change; the adopted-ritual version
is the same transition, different entry point).

**Retiring is a fully fine outcome, not a failure.** This is the important correction to
carry through the copy and the framing, not just the mechanics: the research grounding
this whole feature is about *having an active ritual*, not about any specific ritual
lasting forever. A couple that retires three rituals over a year and always has one or
two going is doing exactly what the research says matters. Nothing about the revisit
copy, the retire confirmation, or the weekly reaction should imply that stopping a ritual
is a loss — same no-guilt principle already threaded through Follow-Through's skip
handling and wildcard framing.

### 4. Partner loop — reuses existing infrastructure, no new UI

Whoever didn't personally tap the weekly check-in gets a quiet, one-time, content-light
nudge next time they open the app: "Cass logged your Sunday walk this week — want to add
a line about it?" with a skippable one-liner. This is not a new card or screen — it's
another candidate message in the same Nora hero-card slot already built for Follow-
Through's asymmetric-completion nudge (`app/api/dashboard/hero/route.js`), just retargeted
at ritual check-ins instead of Follow-Through reports. One new lightweight endpoint to
capture the optional note; the note doesn't need to trigger its own Nora reaction, it just
becomes one more thing Nora knows about this couple's rituals, same as everything else
feeding her memory.

## Status: settled, ready for implementation

All four pieces confirmed July 30, 2026. No open design questions remain. Next step is
building it — same sequence discipline as the main Follow-Through build (one piece at a
time, test before the next, commit after each working change).
