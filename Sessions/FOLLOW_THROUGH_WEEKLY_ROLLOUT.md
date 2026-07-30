# Follow-Through — Weekly Rollout Map (Mon-Fri)

Companion to `Sessions/NOW_DO_THIS_DESIGN.md` and `Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md`.
Those cover the mechanic itself, built and shipped against Bet (Tuesday). This maps what
it takes to extend to each other weekday, grounded in actually reading
`SparkCard.js`, `WednesdayCard.js`, `ThursdayCard.js`, and `RitualCard.js` — not assumed.

Headline finding: four of the five days fit the mechanic. One does not, structurally,
and forcing it would break the "behaves the same each time" rule rather than serve it.

## Monday — Spark — low risk, one real gap

**Data shape:** one `response_text` per partner, no prediction/actual contrast like Bet.
Thinner material to generate from, but workable — Nora reacts to what each person said,
not to a guess-vs-truth gap.

**Reveal trigger:** same as Bet — fires the instant both have answered, whenever in the
day that happens. Good match for Follow-Through's existing trigger point.

**The gap:** Spark has no equivalent of Bet's `reveal_seen_at`. Its reveal auto-plays a
timed animation sequence (`partnerCardShown` → `myCardShown` → `noraShown` → `pillsShown`)
the instant the component mounts with both answers present — no confirming tap to hang a
per-user flag on, and if you reopen Spark after the fact, it replays that animation from
scratch every time. Follow-Through's per-user gate ("has this person been through their
own reveal yet") needs *something* to key off. Recommendation: add a `spark_responses`
column analogous to `reveal_seen_at`, set automatically client-side once `pillsShown`
fires (a fire-and-forget POST, same shape as Bet's `/api/bet/reveal`, just triggered by a
timer completing instead of a tap). Small, contained addition — not a redesign.

**Skip interacts cleanly:** Spark's "Not feeling this one" skip means some days there's no
real content from one or both sides. Follow-Through simply doesn't fire that day, same as
an unanswered Bet — no special handling needed.

## Tuesday — Bet — built

Baseline. Live as of this session.

## Wednesday — Notice — needs investigation before it can be scoped precisely

**Structural mismatch, the important one:** Notice does not reveal when both partners
have answered. It reveals at a **fixed clock time — 7pm Pacific — regardless of whether
either partner sent anything.** The component says so explicitly: "Nora reveals tonight
at 7pm either way." Bet and Spark's trigger ("both have responded, whenever that is") does
not exist here at all. Follow-Through's entire generation trigger is built around "both
answers just came in" — Notice can reveal with one Notice sent, or zero.

**What this means concretely:** the hook point can't be a respond-route the way Bet's is,
because submission and reveal are decoupled by design — someone could submit at 2pm and
nothing happens until 7pm, or submit at 7:30pm during the late window and the "reveal"
already technically fired without them. Whatever computes the 7pm reveal (almost
certainly a scheduled job in `app/api/cron/scheduled-tasks/route.js` or a dedicated
Wednesday route not yet read closely this session) is the actual place generation would
need to hook in — and it would need its own rule for what happens when only one side (or
neither) sent a Notice that day. My instinct: no Follow-Through fires unless both sides
actually have content, same principle as Spark's skip case — but I have not read the
reveal-computation code closely enough yet to confirm there isn't a reason it's built to
reveal "either way" that would make a partial Follow-Through the right call instead.
**This one needs a dedicated read of the Wednesday cron/reveal path before it's specced
further, not a next-session guess.**

## Thursday — Nora Thursday — most promising content, same clock-trigger issue as Wednesday

**Data shape is the richest of the week.** Unlike Bet/Spark/Notice, each partner gets a
*different*, individually-generated `myObservation` + `myQuestion` — already Nora's own
synthesis about that specific person, presumably drawn from the same notes/claims
infrastructure `lib/nora-memory.js` already maintains. A Follow-Through built from
Thursday's content has the best raw material of any day, and structurally it's already
shaped like Follow-Through's own per-partner-independent-generation pattern — this is
the one day where the two mechanics are naturally similar rather than needing to be
forced together.

**Same clock-based reveal issue as Wednesday:** "Nora reveals tonight at 7pm" appears
here too — reveal is time-triggered, not response-triggered. Whatever job resolves
Wednesday's reveal likely resolves Thursday's the same way, so solving the hook-in
question for one probably solves it for both.

**Recommendation:** worth prioritizing once the Wednesday investigation is done, given
the content quality — but blocked on the same open question.

## Friday — Ritual — does not fit, and forcing it would work against the design, not for it

This is the one you flagged as tricky, and having read `RitualCard.js` in full, here's
why: it isn't structured like the other four days at all.

- **It's weekly, not daily.** Ritual check-ins happen once a week (Friday), tracked as a
  streak across weeks (1, 2, 3, then an adoption decision) — a completely different
  temporal rhythm than Follow-Through's same-day-resolves-by-tomorrow design.
- **It isn't two independent answers.** Bet, Spark, Notice, and Thursday all produce two
  separate, private inputs that get synthesized together. Ritual produces one shared
  signal — did the couple do the thing this week, yes or no — logged by whichever partner
  happens to check in, not two parallel private reports. Follow-Through's entire
  mechanism (private Tier 1 on your own report, blind until both report, Tier 2 mutual
  synthesis) has nothing to attach to here — there is no "both sides" to be blind between.
- **The real finding:** Ritual doesn't need Follow-Through bolted onto it, because a
  ritual's weekly check-in *already is* "a specific real-world action, reported back."
  That's the exact shape Follow-Through was invented to create for the other four days.
  Wrapping one mechanic that produces real-world-action-plus-report around a feature that
  already *is* real-world-action-plus-report would be redundant, not additive — and
  forcing Follow-Through's per-partner-blind-reveal shape onto a single-signal system
  would break the "behaves the same each time" rule rather than honor it, since it would
  need visibly different plumbing than the other four days to fake having two sides.

**Recommendation: exempt Friday.** Not a gap to close — a day that already has its own,
different, equally-valid version of the same underlying idea.

## Suggested order, given all of the above

1. **Spark (Monday)** — lowest risk, one contained addition (the reveal-seen flag), data
   shape already understood. Natural next step.
2. **Wednesday/Thursday reveal-trigger investigation** — a research task, not a build
   task: read the actual cron/reveal computation for Notice and Thursday before either
   can be scoped with real confidence. Do this before attempting either day's build.
3. **Thursday** — once the trigger question is answered, likely the best per-partner
   content of the week given the existing personalization Nora already does there.
4. **Wednesday** — same trigger fix, but the "reveals either way, even with partial
   content" question needs its own answer before generation logic can be written.
5. **Friday — do not build.** Log as intentionally exempt, not deferred.
