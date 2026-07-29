# "The Follow-Through" — Design Direction (working name)

Status: Direction settled July 28, 2026. Not yet built. Generation-prompt mapping and
a few open dependencies (below) still need resolution before this goes into a sprint.

## The problem this solves

Spark, Bet, and Notice all end the moment both partners have answered and read each
other's response. Nothing asks anyone to actually go do something. Two separate signals
pointed at this gap: Matt noticed he moves through the daily activity quickly and doesn't
extend its purpose into the rest of the day, and outside feedback specifically asked for
something tangible to do in the real world, not just another thing to answer.

## The model

Two-part day: (1) the existing daily activity (Spark/Bet/Notice), (2) a specific,
real-world follow-through action tied to what was just shared. Not a new tab, not a
standalone feature — it tags along with the daily activity and disappears if ignored.

**Starting scope: Bet only for v1.** It has the richest daily content to generate from
and already has the reveal-card visual language this reuses. Generalize to Spark and
Notice once the mechanic is validated.

## Why this design, not something else (research grounding)

- Gottman's rituals of connection / bids for connection — small, repeated, specific daily
  rituals are what the whole Spark/Bet/Notice premise is built on
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
its own prompt-design pass — not scoped in detail yet.

**Timing.** Same-day only. "Tonight, when X happens, do Y." Never "this week" — that
stacks unresolved loops and breaks the one-open-loop-at-a-time shape that makes the
curiosity/anticipation mechanism work. Resolves by the next morning.

**Tone.** An invitation/experiment, never an assignment. "Try this and see what happens,"
not "you should do this because it's good for your relationship." This is the single
thing most likely to break the whole idea if it drifts toward therapy-homework framing.

**Delivery — no push notification.** A face-down card sits wherever the next daily
activity naturally lives on the home screen (reusing Bet's existing "tap to reveal" card-
back visual language). No badge, no red dot. It's just there the next time they open the
app anyway, which they already do daily for Spark/Bet.

**Response.** One tap: "Did it" / "Didn't get to it." Optional one-line "what happened"
text box, never required.

**Reveal — two-tier, copying Bet's existing pattern exactly:**
- Tier 1 (immediate, solo): the moment you tap your own response, Nora reacts privately
  to just your side. You are never left with nothing because your partner hasn't
  responded yet. (Mirrors Bet's `nora_solo_insight`, generated on your own submission.)
- Tier 2 (bonus, mutual): once *both* partners have tapped in, a richer mutual reveal
  unlocks — same payoff energy as Bet's card-flip reveal. (Mirrors Bet's `nora_reaction`,
  generated once both sides are in.)

**Skipping.** No guilt, no punishment, no red framing anywhere. If untapped after roughly
24-36 hours, it quietly expires. Represented honestly (not hidden) in the weekly visual,
but never flagged negatively — just a true record.

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

## The north star sentence for tone/copy

"I bet my partner would like this. And since I'm here to work on my relationship, this
seems like an easy and fun thing to help it." Every piece of generated copy should be
judged against whether it produces that feeling — curiosity about the partner's reaction,
low effort, a little pride — not obligation.

## Naming

"Dare" was considered and rejected — too edgy/challenge-flavored for the warm, curious
feeling above. Leading candidate: "The Follow-Through." Not locked; revisit once the
mechanic is built and there's something real to react to.

## Open dependencies — not solved yet, flagged honestly

- **Distress-sensitivity.** Nora's existing "trajectory"/"unsaid thing" signal in
  nora_memory is soft and inferred, not a validated distress detector. A playful action
  prompt landing on a couple mid-conflict is a real risk. This needs its own design pass
  before broad rollout — do not assume it's handled.
- **Per-couple opt-out.** Undecided whether this is always-on once shipped, or needs a
  settings toggle for couples who just want the daily question without the follow-through
  layer.
- **Generation prompt mapping.** The exact inputs/prompt structure for Nora's generation
  need to be scoped as their own task before implementation starts.
- **Weekly Reflection review.** Confirmed live and triggers each Sunday, but hasn't been
  reviewed end-to-end recently — worth confirming it's doing what's wanted before adding
  the new visual element to it.
