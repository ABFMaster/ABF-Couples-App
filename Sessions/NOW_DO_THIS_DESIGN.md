# "The Follow-Through" — Design Direction (working name)

Status: Design complete as of July 29, 2026. Direction settled July 28; mechanics
stress-tested and refined July 29 (module real estate, timing, reveal semantics — see
"Mechanics refinement" below); generation, data model, distress gating, wildcard
variants, and the asymmetric-completion nudge all scoped July 29 in
`Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md`. Nothing left open at the design level.
Not yet built — next step is implementation, not further design.

## The problem this solves

Spark, Bet, and Notice all end the moment both partners have answered and read each
other's response. Nothing asks anyone to actually go do something. Two separate signals
pointed at this gap: Matt noticed he moves through the daily activity quickly and doesn't
extend its purpose into the rest of the day, and outside feedback specifically asked for
something tangible to do in the real world, not just another thing to answer.

## The model

Two-part day: (1) the existing daily activity (Spark/Bet/Notice), (2) a specific,
real-world follow-through action tied to what was just shared. Not a new tab, not a
standalone feature, and — per the July 29 refinement below — not even a new card on the
dashboard. It occupies the same card slot the daily activity already lives in.

**Starting scope: Bet only for v1.** It has the richest daily content to generate from
and already has the reveal-card visual language this reuses. Generalize to Spark and
Notice once the mechanic is validated. The mechanics below are written to apply uniformly
across all three once generalized — same underlying rules, different visual skin per
activity.

## Why this design, not something else (research grounding)

- Gottman's rituals of connection / bids for connection — small, repeated, specific daily
  rituals are what the whole Spark/Bet/Notice premise is built on. Bids for connection are
  inherently other-directed (see "Content vs. synthesis" below) — most generated actions
  will be one partner doing something to or for the other, not solo.
- Gable's capitalization / active-constructive responding — how you respond to a partner
  matters more than the content itself
- Aron's self-expansion theory — novel, arousing shared activities (not routine ones)
  measurably reduce boredom and increase closeness, and the effect compounds over months
- Gratitude-expression implementation-intention study — a specific "if X then I will do Y"
  plan caused a measurable increase in real-world co-presence time; this is the closest
  thing in the literature to a controlled proof that a specific one-line nudge changes
  behavior, not just vague encouragement
- Paired (closest competitor) is built around independent-answer-then-mutual-reveal —
  same DNA as our own Bet. Nobody in the category points that reveal loop at a real-world
  action instead of another question — that's the actual whitespace here.
- BeReal validates gating a reveal behind your own action as a genuine pull, not a
  friction problem
- Snapchat Streaks is the closest two-person-daily-loop precedent that exists at scale —
  and it's also a documented cautionary tale (loss aversion, obligation, anxiety around
  breaking a streak). We're taking the daily-cadence part and deliberately engineering out
  the loss mechanic that made it harmful.

## The mechanic

**Generation.** Live Nora generation every time, never a static library. Inputs: today's
specific Bet question and both answers, whatever Nora has learned about each partner
individually over time, and a synthesis of what this couple seems to need more of. Needs
its own prompt-design pass — not scoped in detail yet, but see "Content vs. synthesis"
below for one new hard requirement that pass has to satisfy.

**Timing.** Same-day only, but same-day is time-of-day aware, not a fixed clock phrase.
Reveal before 6pm local (reusing Notice's existing evening-reminder hour, not inventing a
new number) → Nora frames the action as tonight, window runs to tomorrow morning. Reveal
at or after 6pm → framed as tomorrow instead, window shifts a full day later to match.
Never "this week" — that stacks unresolved loops and breaks the one-open-loop-at-a-time
shape that makes the curiosity/anticipation mechanism work.

**Tone.** An invitation/experiment, never an assignment. "Try this and see what happens,"
not "you should do this because it's good for your relationship." This is the single
thing most likely to break the whole idea if it drifts toward therapy-homework framing.

**Delivery — no push notification, no new module.** The prompt attaches to the daily
activity's own card the moment that activity's reveal happens for you personally (see
"Per-user gating" below — this is not the instant you submit your own answer, it's after
you've been through your own reveal experience, so it never competes with that payoff
moment). No badge, no red dot, and critically: no separate card, strip, or section
anywhere else on the page. Home page real estate is already fully committed — see
"Module & real estate" below for how this is enforced structurally, not just as a style
preference.

**Response.** One tap: "Did it" / "Didn't get to it." Optional one-line "what happened"
text box, never required.

**Reveal — two-tier, copying Bet's existing pattern exactly, with one new branch:**
- Tier 1 (immediate, solo): the moment you tap your own response, Nora reacts privately
  to just your side. You are never left with nothing because your partner hasn't
  responded yet. (Mirrors Bet's `nora_solo_insight`, generated on your own submission.)
- Tier 2 (bonus, mutual): once *both* partners have tapped in, a richer mutual reveal
  unlocks. **What that reveal actually contains now branches on what kind of action Nora
  generated** — see "Content vs. synthesis" immediately below. This was the biggest
  correction from the July 29 stress test.

**Skipping.** No guilt, no punishment, no red framing anywhere. If untapped after roughly
24-36 hours, it quietly expires. Represented honestly (not hidden) in the weekly visual,
but never flagged negatively — just a true record. An explicit "Didn't get to it" tap
gets a small, soft Nora acknowledgment (not dead silence — silence after an honest answer
reads as judgment, same as a therapist blankly staring at you after "we didn't do it").
Never opening the card at all is treated identically to a quiet expiry — no separate
messaging needed.

**Tracking — total count, never a breakable streak.** Track a cumulative total ("47
things you've done together") that only ever goes up. Explicitly not a current-streak
number that can be lost — this is the direct fix for the Snapchat Streaks failure mode
(documented anxiety and felt obligation from loss-averse streak mechanics). Treat this as
close to a hard rule, not a nice-to-have.

**Variability — rare wildcard days.** Occasional (not fixed-schedule), Nora's judgment
call, explicitly called out on delivery: "This one's a bit bigger today. Ready?" Distinct
visual treatment (different card color/border) so it reads as a real event, not just a
longer sentence. Two flavors, either can appear on a wildcard day:
  - *Bigger scope* — a larger, more adventurous action, with its own explicit
    different-clock framing (e.g. "runs through the weekend") so it's never ambiguous
    which loop is still open.
  - *Partner-authored* — Nora generates 2-3 candidate actions from today's content, and
    the other partner picks one (single tap, no typing) to send. Real agency, near-zero
    authoring friction.

**Weekly recap.** Folds into the existing live Sunday Weekly Reflection — needs a real
visual element, not just text commentary (a compact row of small keepsake-card
thumbnails, in the spirit of a satisfying Wordle-style result grid, not a new page or nav
item).

**Longer-term extension (not v1):** resolved follow-throughs with notes could auto-
archive into Us/Memory as keepsake entries, the same way the Date Night photo/reflection
work already does — compounds into a growing private archive rather than a one-off daily
hit. Flag for later, do not scope into the first build.

## Mechanics refinement — July 29, 2026 stress test

A full state-machine pass (protocol #15) surfaced several real gaps in the July 28
version. All resolved below; nothing here is still open except where flagged.

### Module & real estate — no new card, ever

The home page already has a fixed, deliberately limited set of permanent modules
(today's activity card, the Nora card, FlirtCard, the memory/timeline card). Follow-
Through does not get a fifth. Instead, it reuses the exact card slot the day's designated
activity already occupies, and that slot does double duty in sequence rather than two
things existing side by side:

1. If there's an unresolved Follow-Through from the previous trigger still open when the
   app loads, that slot shows it first — the report step (Did it / Didn't get to it,
   optional note), styled quietly, no full ceremony, clearly labeled as "last night's"
   rather than a repeat of the original prompt.
2. Reporting (or the item expiring, or a new trigger superseding it — see "Replacement,
   not collision" below) frees the slot to show the actual current day's activity in its
   normal starting state.
3. The transition between those two faces, when it happens live in one sitting, is a
   physical card flip — reusing the exact motif Bet's reveal and FlirtCard's postcard
   already use. Front face: the report step, Tier 1, and (if applicable) Tier 2. Back
   face: today's fresh activity, ready to answer. One tap ("See today's Bet →") triggers
   it.

**Important constraint on the flip:** it must stay deliberately undramatic. Bet's flip
already carries specific meaning — uncovering your partner's hidden answer, the dramatic
tension payoff. If this flip tries to carry that same weight, one gesture ends up doing
three different emotional jobs across three features (Bet, FlirtCard, this). Here the
flip only ever means "this closed, here's today" — it is a wipe, not a reveal. Whatever
emotional payoff exists (Tier 1, Tier 2) happens on the front face, before the flip, not
via the flip itself.

**The flip is a live-session transition, not a replay.** It only plays when the user is
actually present, tapping through in one sitting. A cold app-open on a fresh day, with
everything already resolved from the night before, just renders the currently-correct
face directly — no flip animation for a transition nobody was there to watch happen.

### Same-night close-out (no carryover needed)

If you report before the day rolls over, the AM carryover face never appears at all —
that face only exists for something still genuinely open. Reporting logs your side
immediately (Tier 1 fires right there, that night). If your partner hasn't reported yet,
you're simply done-and-waiting, same as Bet's existing waiting state. If they report
later that same session, Tier 2 can appear right then. If they report after you've left,
you'll see Tier 2 the next time you open the app — live-flipped through if you're
actively using the app in one sitting, or just rendered directly if it's a fresh cold
open on the new day. Either way you are never re-shown the Did-it/Didn't-it prompt once
your own side is already logged.

### Replacement, not collision

There is no scenario where two Follow-Throughs need to coexist or where the app has to
"make room." If a new trigger fires while the previous one is still technically open
(rare, given the expiry window described above is short), the new one simply supersedes
it outright — the old one closes the same way it would on a normal expiry, quietly,
marked not-completed, no guilt, reflected honestly in the weekly recap. In v1 (Bet only,
weekly cadence) this essentially never happens, since the next trigger is a week away.
Locking the rule now so it doesn't need re-litigating once this generalizes to a daily
cadence across Spark/Bet/Notice, where it will matter more.

### Per-user gating — when it's allowed to even appear

Generation itself only requires both partners' answers to exist (a hard data
dependency — Nora can't write the action without both sides of the content). But the
prompt should not be visible to a given user until they've personally been through
their own reveal experience for the source activity, so it never competes with that
payoff moment. This gate is not identical across activities, because the activities
themselves aren't identical:
- **Bet** has an explicit personal action to hang the flag on — the same `reveal_seen_at`
  tap we already built to fix the flip-animation bug. Gate on that.
- **Spark** has no equivalent tap — both partners' reveal auto-plays the instant the data
  says both have answered, no confirm step. Gate on that animation sequence completing
  instead (its `pillsShown`-equivalent moment), not on a tap that doesn't exist for this
  activity.

Worth keeping in mind as this generalizes to Notice or any future activity: check what
that activity's actual reveal mechanism is before assuming either pattern applies.

### Content vs. synthesis — what Tier 2 actually shows

This was the sharpest correction from the stress test. The original assumption was that
Tier 2 always shows both partners' reported content side by side, mirroring Bet's card-
flip reveal. That's wrong for a meaningful share of cases, and building it as a fixed
template risks the whole reveal feeling hollow rather than earned.

The test: **if the generated action is other-directed** — one partner doing or saying
something to or for the other (which most bids-for-connection-style actions will be,
per the Gottman/Gable research this is grounded in) — **the partner who received it
already experienced it live, in the real world, the moment it happened.** Showing them
"here's what your partner did" in the app is not a reveal, it's a redundant replay of
something they were already standing there for. Bet's flip mechanic works because the
answers are genuinely secret data until intentionally uncovered; other-directed follow-
through actions are not secret in that same way.

So Tier 2 branches:
- **Other-directed actions** (most of them): Tier 2 does not restate content either
  partner already lived. It shows only Nora's one-line synthesis of the pattern across
  both reports — something neither partner has on their own, since neither can see their
  own relationship from the outside the way she can. That's the actual new information.
- **Self-directed / solo actions** ("notice something without saying it out loud," write
  down a memory, a private wildcard variant): the partner has no other way of knowing
  what happened unless the app shows it. Here the literal content reveal is genuinely
  valuable and non-redundant, and should be shown much closer to the original Bet-style
  treatment.

**This means generation has to tag every action as other-directed or self-directed at
creation time**, and the report/reveal screen branches its Tier 2 treatment on that tag
rather than using one fixed layout for both. This is now a concrete requirement for the
generation-prompt-mapping work below, not just an open question.

### Asymmetric completion

If only one partner completes their side, that partner still gets their solo Tier 1 —
never left with nothing. The partner who didn't complete never gets a full Tier 2 (there
is nothing to synthesize or show), but they shouldn't be left with total silence either,
since the whole hook depends on "I'm curious what my partner will do" having *some*
closure. Proposed fix: the non-completing partner sees a quiet, content-free signal next
time they open the app — not a push, nothing that names what happened, just enough to
close the curiosity loop without creating pressure. Still needs a final copy/UI pass, but
the shape of the fix is settled.

## The north star sentence for tone/copy

"I bet my partner would like this. And since I'm here to work on my relationship, this
seems like an easy and fun thing to help it." Every piece of generated copy should be
judged against whether it produces that feeling — curiosity about the partner's reaction,
low effort, a little pride — not obligation.

## Naming

"Dare" was considered and rejected — too edgy/challenge-flavored for the warm, curious
feeling above. Leading candidate: "The Follow-Through." Not locked; revisit once the
mechanic is built and there's something real to react to.

## Formerly-open dependencies — resolved July 29

- **Distress-sensitivity.** Resolved with a deliberately modest, two-layer gate rather
  than a claimed real detector: the existing `trajectory` structured fact (skip if
  `'away'`) plus one cheap per-night `noraSignal` classifier on the actual answers. See
  `Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md`. Errs toward silently skipping generation,
  never toward forcing an action into a bad night.
- **Per-couple opt-out.** Resolved: no settings toggle in v1. The mechanic already
  degrades to ignorable at zero cost (no push, no badge, no penalty, quiet expiry), so a
  couple that wants out already has one, for free. Revisit only if real users ask.
- **Generation prompt mapping.** Fully scoped — exact prompt, JSON contract, DB table,
  signal-type additions, wildcard variants (bigger-scope and partner-authored), and the
  asymmetric-completion nudge (reuses the existing Nora hero-card message slot, no new
  UI) all in `Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md`.

## Still open — genuinely deferred, not design gaps

- **Weekly Reflection review.** Confirmed live and triggers each Sunday, but hasn't been
  reviewed end-to-end recently — worth confirming it's doing what's wanted before adding
  the new visual element to it. This is a review task, not a design decision.
- **Longer-term Us/Memory archiving extension.** Explicitly flagged as not-v1 from the
  start — revisit after the core mechanic ships and there's real usage to learn from.
