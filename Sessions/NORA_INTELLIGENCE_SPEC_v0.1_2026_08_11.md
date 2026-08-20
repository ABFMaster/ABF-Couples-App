# Nora — v0.1 Intelligence Architecture Specification
**Date:** Aug 11 2026. Discussion draft, not committed.

**Verification note, per the constraint that code wins over prompt assumptions:** I re-read `updateNoraMemory()`, `extractAndUpdateClaims()`, `classifyClaimResponse()`'s write-back, `getMemoryBriefing()`, `getFullNoraContext()`, `getSurfaceableClaims()`, tier calculation, and — new this pass — the **full route handlers for `app/api/ai-coach/route.js` and `app/api/couples-session/route.js`**. That last read produced one real contradiction of an assumption both this prompt and my own prior two passes made. See Part 6 — it changes the safety section materially and I want it flagged before anything else.

---

## Part 1 — Nora's intelligence model

**What is Nora's intelligence?**

Not the language model. Not the presence of stored memory. Nora's intelligence is the discipline of a belief-formation-and-revision loop wrapped around a general-purpose model: the capacity to form couple- and person-specific beliefs from real interaction evidence, hold each belief at a confidence level earned by that evidence, and only let behavior toward a person reflect a belief once *that specific belief* has survived real user engagement — confirmation, challenge, or correction — rather than simply having been inferred once and never checked.

The model supplies fluency and pattern recognition. Nora's actual intelligence is the couple-specific, self-correcting belief state that governs what that fluency is permitted to say, to this person, about this person, at this point in the relationship. A generic assistant with the same model and a longer context window would have more *information*. It would not have this.

This is architecture, not a claim about outcomes yet — see Part 10.

---

## Part 2 — Core concepts

**Evidence.** A discrete, timestamped record of something that actually happened: an interaction, a response, a reaction, a completed activity, a correction. Evidence is raw; it is not itself an interpretation. In code: a `nora_signals` row, a reaction/rating tap, a Follow-Through outcome, a `classifyClaimResponse` result. Not all evidence is equally meaningful — this is already encoded via `INDIVIDUAL_SIGNAL_WEIGHTS`/`COUPLE_SIGNAL_WEIGHTS` (e.g. `ASSESSMENT_COMPLETE` weighted 3, `TIMELINE_EVENT` weighted 1). **What does not count as evidence:** Nora's own generated text (output, not input), and an inference that hasn't been checked against anything (that's a candidate belief, not evidence).

**Belief.** An assertion Nora holds about a person or couple that goes beyond raw evidence — held with a degree of confidence, and revisable. Different from "memory" in the generic sense: memory is storage; a belief is storage plus a stance. "Matt's birthday is X" is a fact — retrieved, not inferred, not meaningfully revisable. "Matt tends to withdraw during conflict" is a belief — inferred, uncertain, and exactly the kind of thing that should be able to change.

**Claim.** Why does `nora_claims` exist separately from narrative memory? Because a claim is a belief made *falsifiable* — extracted into a form specific and atomic enough to be individually confirmed, challenged, corrected, or retired. A sentence buried in synthesized prose can't be individually confirmed or corrected; a `claim_text` row can. That granularity is exactly why the separate structure exists. "Claim" is the right term — it already carries the right epistemic weight (an assertion put forward, open to challenge) and the code's own vocabulary (`CHALLENGED`, `CORRECTED`) matches it. Keep it.

**Narrative memory.** Should function as ambient, low-stakes context — texture and continuity that makes Nora feel like it remembers the relationship, not a set of assertions the system is staking accuracy claims on. **Allowed to influence:** tone, warmth, what Nora chooses to ask about or reference. **Should never be trusted to decide:** anything where being wrong has real cost. Never the sole basis for treating something as settled fact; never a bypass around a claim's confidence gate; never the sole trigger for a consequential decision outside the conversation itself (see Part 4).

**Confidence.** The code currently makes this number do two jobs at once: a rough proxy for "how likely is this true," and, directly and mechanically, the surfacing-permission threshold (`>0.70` to surface at all, `>=0.85` to go `DIRECT`). That conflation is real and worth naming rather than leaving implicit. Going forward, confidence should mean one thing: **accumulated evidentiary weight for this specific claim**, moved only by confirm/challenge/correct events. It is not a calibrated statistical probability of factual correctness — nothing has validated it as one — it's an evidentiary-weight heuristic, and should be described that way. Permission (Part 2's next entry) is a *separate* question that happens to be derived from this number plus tier; that's a reasonable implementation, but conceptually, confidence answers "how much evidence supports this," and permission answers "is that enough, for this relationship, right now."

**Trust / tier.** A coarse, relationship-level ceiling — not claim-level — on how directly *any* belief may be expressed, and how warm/familiar Nora's general register can be, derived from accumulated signal volume. **Governs:** voice register, and the `DIRECT` vs. `TENTATIVE` ceiling on individual claims (a claim can never express as `DIRECT` above what tier allows, regardless of its own confidence). **Does not govern:** whether a specific belief is *true* — that's confidence's job. Tier answers "have we been together long enough to earn this register," confidence answers "is this specific thing actually accurate." Multiplying them (tier ceiling × per-claim confidence) is correct; collapsing them into one number would not be.

**Correction.** Per the code, `CORRECTED` specifically means the user disagreed *and* supplied their own alternative explanation — meaningfully more than a bare `CHALLENGED` (disagreement, no alternative offered). Correction differs from disagreement in exactly this way: disagreement lowers confidence in the existing belief; correction additionally supplies new evidence (the user's own words), which seeds a *replacement* belief — a new claim at 0.75 starting confidence, linked via `dormant_linked_claim_id`. This is a deliberate, already-built distinction, not incidental.

**Retirement.** Two corrections on the same lineage (the original plus its one already-attempted replacement) triggers permanent `retired` status. **Can a retired belief return?** Not automatically — no code path resurrects a retired claim. That's the correct design: a belief wrong twice in a row, even after one attempted fix, shouldn't get a third chance without genuinely fresh evidence. Retirement is terminal for *that specific claim* — it does not block a brand-new candidate claim of the same `claim_type` from being proposed later if new evidence actually supports it; it just won't be linked to the retired lineage.

**Provenance.** Minimum information to answer "why does Nora believe this?" For claims: mostly already answerable — starting confidence, confirm/challenge/correct history via `correction_count`/`user_response`, and the `dormant_linked_claim_id` lineage. For notes: not currently answerable beyond "as of the last update" — see the notes-history proposal carried over from the prior pass.

**Safety.** Information that must never enter the normal belief system: sensitive disclosures (self-harm, abuse, crisis content). This should never produce a `nora_signals` entry that feeds `updateNoraMemory`/`extractAndUpdateClaims`, and should never appear in notes, summary, or claims. **This is now a verified gap, not a hypothetical one** — see Part 6.

---

## Part 3 — Belief lifecycle

Mapping the proposed lifecycle against the actual code:

`Observed evidence` (real — `nora_signals` insert) → `Candidate belief` (real — `extractAndUpdateClaims`'s LLM call, starting confidence 0.2-0.4 by instruction) → `Confidence` (real, but conflated per Part 2) → `Surfaced` (real — `getSurfaceableClaims`, gated by `>0.70` + tier) → `User response` (real — the next turn's message) → `Confirmed / challenged / corrected` (real — `classifyClaimResponse`, an LLM judgment call) → `Updated belief` (real — plain deterministic `.update()` calls, separate from the LLM call) → `Retired if repeatedly contradicted` (real — `correction_count >= 2`).

**Two stages in the proposed lifecycle are not verified this pass, and I want to be explicit about that rather than assume:** "repeated evidence" and "more trusted through repetition alone" (i.e., does a claim's confidence rise just from the same pattern showing up again in notes, without an explicit user confirm/challenge exchange)? I did not confirm whether `extractAndUpdateClaims` checks for and reinforces an *existing* active claim of the same type versus always proposing a fresh candidate. This is a real open question, not a settled "yes" — flagged in Part 10.

**Clean separation, as requested:**
- **LLM judgment occurs:** deciding whether a notes update contains something claim-worthy and what a reasonable starting confidence is (candidate creation); classifying a user's reply as `CONFIRMED`/`CHALLENGED`/`CORRECTED`/`NEUTRAL`.
- **Deterministic code owns every state mutation:** the confidence math, status changes, and lineage writes all happen in plain JS *after* the LLM call returns a classification — never inside the generation call itself. This is already correctly built, and it's worth stating as a confirmed strength, not a gap: the magnitude of a confidence change is a fixed constant, not something an LLM is trusted to freehand each time.
- **Users are the source of truth:** a belief only moves because of what a user actually said in response, never because Nora unilaterally decided it was confident enough.
- **What should never be decided by an LLM alone:** the size of a confidence change (already deterministic — good), and whether content is safety-sensitive enough to bypass the belief pipeline entirely (should be a rule-based gate feeding a decision, not left to the same general classification call to quietly handle).

---

## Part 4 — Claims vs. narrative memory: the central question

**Choosing Option C** — claims and notes serve genuinely different purposes and should coexist, but notes need explicit boundaries.

**Why not B (notes derived exclusively from governed claims):** this is the architecturally elegant answer, and it's wrong for this product. Notes exist to capture texture and continuity that isn't reducible to discrete falsifiable assertions — "the conversation had a tender quality," "they're both clearly still raw about last week." Forcing that through claim extraction either breaks it (texture doesn't survive being made falsifiable) or bloats `nora_claims` with hundreds of low-value, non-actionable entries. B also kills the fast, cheap "Nora feels continuous" quality notes currently provide, in exchange for rigor a system with this purpose doesn't actually need everywhere.

**Why not A as currently practiced (fully unconstrained):** this is close to today's actual state, and it's the exact asymmetry flagged across all three passes — unconstrained notes get injected into every relevant call with zero gating, meaning a bad synthesis influences behavior with the same unconditional force as a well-earned `DIRECT` claim, without ever passing through confirmation.

**C, with explicit boundaries, is the right answer for the least unnecessary complexity:**
1. Notes may inform tone, warmth, and what Nora references — never a standalone assertion treated as settled fact.
2. Anything in notes that hasn't gone through claim extraction and confirmation should be voiced, if at all, with the *same epistemic humility* the claims system requires of a fresh, unconfirmed claim — an operating principle for the system prompt, not necessarily a hard technical gate on every sentence.
3. Notes get the minimum-viable provenance fix (history snapshot, unchanged from the prior pass) — not the full claims lifecycle, just enough that a bad synthesis is recoverable.
4. Notes should never be the sole basis for a decision with consequences outside the conversation itself (triggering a specific nudge, Follow-Through, or intervention) — those should be sourced from structured signals/claims, which are individually inspectable; an opaque paragraph shouldn't be.

---

## Part 5 — Earned trust, precisely

Not one global number. At least three levels already exist in the code, plus one gap worth naming:

- **Per-claim confidence** (`nora_claims.confidence`) — is *this specific belief* accurate.
- **Per-person tier** (individual signal count) — how much register/directness *this person's* relationship with Nora has earned, independent of their partner.
- **Per-couple tier** (couple signal count) — how much the couple *jointly* has earned for couple-level register and `couple_notes`-informed content.
- **Per-claim-type trust (not currently modeled)** — the code doesn't distinguish "Nora reads Matt's communication preferences well" from "Nora is shakier on Matt's conflict patterns" as separate trust pools. Today, all of a person's claims share the same tier ceiling regardless of that specific `claim_type`'s track record. Worth naming as a real, currently-uncaptured layer — not fixing now (needs the confirmation-rate metric to exist first, see Part 10), but naming it now so it isn't lost.

**What actually causes tier to rise, today:** signal count/volume only — a proxy for engagement duration and depth, **not** claim accuracy. Worth stating plainly, even though it's slightly uncomfortable: a couple could accumulate a lot of low-quality or even frequently-corrected signals and still climb tier by volume alone, since tier and confirmation-rate are currently fully decoupled. Not proposing a fix — this is an empirical question (Part 10) about whether it actually causes visible problems, not yet a confirmed one. But it's a real gap between the stated thesis ("earn the right by being accurate") and the actual mechanism ("earn the right by being present"), and it should be named as such rather than assumed away.

---

## Part 6 — Safety boundary

**The code contradicts an assumption in this prompt, and in both of my own prior passes.** Both `app/api/ai-coach/route.js` and `app/api/couples-session/route.js` already contain an explicit "CRISIS DETECTION" instruction inside their system prompts:

> *"If the user mentions abuse, self-harm, or suicidal thoughts: National Domestic Violence Hotline: 1-800-799-7233. Crisis Text Line: text HOME to 741741. Encourage professional support immediately."*

So detection isn't *absent* — it exists, but as a prompt instruction to the same generation call, not a deterministic gate. That's a meaningfully weaker architecture than "nothing exists," and re-reading the surrounding code surfaces two concrete, **verified** (not hypothetical) problems:

1. It depends entirely on the LLM noticing and prioritizing this one instruction correctly, buried inside a large system prompt (clinical knowledge, memory briefing, tier context, claims, operational rules). No test, no fallback if it's missed.
2. **This is the important one:** even when it *does* fire correctly, the surrounding pipeline doesn't know or care. Both routes call `updateNoraMemory()` unconditionally after every single turn (`ai-coach/route.js:425`, `couples-session/route.js:236-244`) — there is no check for whether the turn contained a crisis disclosure. A disclosure the LLM correctly handled by returning hotline resources is, right now, still fed into `shouldUpdateMemory` → `updateNoraMemory` → `extractAndUpdateClaims`, with a real chance it gets synthesized into that person's private notes, couple notes, or a claim. **This is the concrete, already-happening version of "what should never become memory" — not a hypothetical risk.**

**Revised architecture, given what's actually there:** don't discard the existing prompt-level instruction — it's a reasonable, cheap last-resort layer. Add a deterministic gate in front of it, and fix the part that's actually broken today:

`user input → checkSensitiveContent(text) [cheap classifier, same shape/cost as the existing shouldUpdateMemory gate] → if flagged: skip normal generation, return the existing fixed hotline message, skip the memory write entirely for this turn → if not flagged: proceed as today (the prompt-level instruction remains as a secondary net for anything the classifier misses — but if it fires, the memory write must be skipped too, which it isn't today).`

The single most important, concrete, already-necessary fix in this document: **make the `updateNoraMemory` call for a turn conditional on "was this flagged as sensitive, by either layer" rather than unconditional.** That's fixing a demonstrated gap, not a theoretical one.

**Categories:** keep narrow — abuse, self-harm, suicidal ideation, crisis — matching what the product already names in `OPERATIONAL_RULES`, not inventing new ones.
**Before memory extraction?** Yes — this is the crux of the fix.
**Enters private/shared memory?** Currently: yes for both (AI Coach → `nora_private_notes`; Couples Session → both partners' notes *and* `couple_notes`, since `COUPLES_SESSION` is a shared signal type). Under the fix: neither.
**Response — generated or fixed?** Fixed when the deterministic gate fires (model variance is unacceptable here); the existing LLM-prompt instruction remains as an imperfect secondary net.
**Classifier uncertain?** Treat uncertain as flagged — same "safer failure direction" principle already used elsewhere in this codebase (the claim-then-act idempotent pattern). A false positive costs an unnecessary resource message; a false negative risks the disclosure entering shared memory.

---

## Part 7 — Evaluation model: what success and failure mean

| Signal | What it measures | What it cannot measure | Deterministic? | LLM judge? | Human? |
|---|---|---|---|---|---|
| Private notes never cross the shared boundary | A hard privacy invariant | — | Yes | No | No |
| `TENTATIVE` claims never surface as `DIRECT` incorrectly | Tier/confidence gate correctness | — | Yes | No | No |
| Cooldowns prevent inappropriate repetition | Dedup logic correctness | — | Yes | No | No |
| Tier calculation stays consistent | Internal logic consistency (post the shared-`getTier()` fix) | — | Yes | No | No |
| Claim confirmation/challenge/correction rate | *Relative trend*, within the same `claim_type`, over time — a real regression signal | **Absolute accuracy.** Do not call this "accuracy." | No | Partially (the classification itself is LLM-judged) | Spot-check |
| Safety handling | Whether the gate fires and the memory-skip happens | — | Partially (the gate firing is testable) | Not sufficient alone | **Yes, mandatory** |

**On the confirmation-rate metric specifically:** it is not accuracy. Biases that could mislead it: sycophantic confirmation (Nora's voice is deliberately warm, which structurally raises the risk of confirmation-for-agreeableness rather than genuine recognition); avoidant denial (a true but badly-timed claim could get `CHALLENGED` for landing wrong, not for being wrong — concerning given `CHALLENGED` costs 2.5x what `CONFIRMED` earns); and `claim_type`-dependent variance (a low-stakes claim like "loves surprises" is easier to confirm than one about conflict style, so a single aggregate number would actively mislead — it must be sliced by `claim_type` and confidence band before it means anything).

**On the `+0.10`/`−0.25` constants, per the constraint not to change them yet:** the asymmetry is a reasonable prior *if* false-confirmation is more common than false-challenge — plausible, but currently unverified. The evidence that would justify revisiting them: the confirmation-rate metric above, sliced by `claim_type`, specifically watching for claims that get `CONFIRMED` now and `CORRECTED` later (a pattern suggesting confirmations are being granted too easily relative to their weight). Without that data, adjusting the constants today would be a guess wearing the clothes of a fix.

---

## Part 8 — The proprietary learning loop

```
Evidence (interaction, signal)
      │
      ▼
Interpretation (LLM: candidate belief, OR notes synthesis)
      │
      ├── Claim path: Belief + confidence → tier+confidence-gated surfacing
      │        → user response → LLM classifies (confirm/challenge/correct)
      │        → deterministic state update → lineage (dormant/retired) or reinforced
      │        → permission for future behavior
      │
      └── Narrative path: Belief (no confidence) → overwrite → unconditional
               injection — the loop-closing step (user reaction) is not
               currently wired back to notes at all.
```

**In one paragraph:** Nora's proprietary loop is not "the model learns" — it's that every meaningful interaction becomes either a falsifiable claim that must survive real user pushback before it can be spoken directly, or an ambient note that shapes tone without ever being staked as fact, and the discipline of keeping those two paths separate — with the claims path gated by earned, couple-specific confirmation history rather than raw data volume — is what should let Nora's understanding of a specific couple compound in a way a generic assistant's context window never does. Whether it *actually* compounds into better outcomes, rather than just more elaborate-sounding output, is the empirical question this whole exercise keeps correctly returning to. The architecture creates the conditions for that to be true. It doesn't yet prove it.

---

## Part 9 — Nora Architectural Invariants

1. Private, solo-disclosed information never enters couple-facing context.
2. LLMs interpret and classify; deterministic code owns every durable state mutation (confidence, status, tier, lineage).
3. A belief earns `DIRECT`-tier expression only through demonstrated confirmation — never through volume or recency alone.
4. Corrections create inspectable lineage (dormant + linked replacement); they never silently overwrite or delete the prior belief.
5. Narrative notes may shape tone and continuity; they may never alone justify a direct assertion or drive a consequential decision outside the conversation.
6. Tier governs disclosure directness and voice register only — never an unexamined default permission system for unrelated features, unless a future feature deliberately and explicitly extends it.
7. Safety-sensitive disclosures are detected before generation, answered with fixed/reviewed content, and never enter the belief or memory pipeline.
8. No automated mutation of core prompts or voice without human review.
9. Confidence deltas and thresholds are constants set by deliberate human decision, changed only with evidence, never auto-tuned.
10. Every belief-affecting write should be traceable to the evidence that produced it, even approximately — a hard link is not required by default.
11. No new AI infrastructure (agent frameworks, vector DBs, fine-tuning, provider abstraction) without a concrete, current product problem driving it.
12. A derived value with more than one implementation (e.g. tier-from-signal-count) is a defect waiting to happen — one source of truth only.
13. A behavioral metric (e.g. claim confirmation rate) must be sliced by the dimension that affects its meaning before being treated as a quality signal — never reported as a single aggregate implying uniform meaning.
14. Retirement is terminal for a specific claim; it does not block a fresh claim of the same type from being proposed later if new evidence supports it.

---

## Part 10 — What we deliberately do not know yet

- Whether confidence trajectory (not just current value) needs to be persisted for claims, or whether point-in-time is sufficient indefinitely.
- Whether tier should ever govern content selection (Bet questions, date suggestions) beyond disclosure/register — an undecided product question, not yet a choice anyone made on purpose.
- Whether "repeated evidence without explicit confirmation" moves confidence at all today (Part 3's flagged, unverified lifecycle stage) — needs a code-verification pass or a deliberate decision.
- Whether claims eventually need a hard link back to the `nora_signals` row(s) that produced them, or whether type+timestamp correlation stays sufficient as memory volume grows.
- Whether embeddings/vector retrieval ever becomes necessary — contingent on memory volume per couple actually outgrowing direct fetch; not true today.
- Whether outcome effectiveness (did Nora's understanding actually help the relationship) can eventually be measured, and how — needs either a survey instrument or enough couples/time for usage-pattern proxies to mean anything.
- Whether the `+0.10`/`−0.25` constants and the `0.70`/`0.85` thresholds are calibrated correctly — requires the claim-type-sliced confirmation-rate metric to exist first.
- Whether trust should eventually be sliceable per `claim_type` (Part 5) rather than just per-person/per-couple — premature to answer without data on whether coarse tiering is actually causing visible problems.
- Whether the crisis-detection category list (abuse/self-harm/suicidal ideation) is complete, or whether other categories (e.g. infidelity disclosure, addiction) deserve the same "never enters shared memory" treatment without being safety-critical in the clinical sense — a product/legal question, not an engineering one.

---

## Part 11 — Mapping architecture to the current codebase

| Principle | Status | Note |
|---|---|---|
| Private info never crosses to couple-facing context | **Already correct** | `nora_private_notes` separation; Couples Session explicitly excludes `claimsBlock` from `getFullNoraContext` for this exact reason (`couples-session/route.js:167-174`) |
| LLM interprets, code mutates state | **Already correct** | `classifyClaimResponse` (LLM) → separate deterministic `.update()` calls |
| `DIRECT` only via demonstrated confirmation | **Already correct** | `getSurfaceableClaims`'s confidence+tier gate |
| Corrections create lineage, not silent overwrite (claims) | **Already correct** | `dormant_linked_claim_id` |
| Notes never alone justify `DIRECT` / consequential decisions | **Partially implemented** | No technical gate; currently a principle to adopt explicitly, not a code enforcement |
| Tier governs disclosure/register only | **Partially implemented** | True for claims/register; not verified for Bet-question or date-suggestion selection — an open question, not a violation |
| Safety-sensitive disclosures detected pre-generation, never enter memory | **Missing / potentially wrong** | Detection exists only as an in-prompt instruction to the *same* generation call; verified: `updateNoraMemory` fires unconditionally after every turn regardless of crisis content |
| No automated prompt mutation without human review | **Already correct** | All prompts hand-authored; no auto-optimization exists — worth stating as something to actively not build, not just something not yet built |
| Confidence deltas are deliberate constants | **Already correct** | Hardcoded, human-set; unexamined against evidence, which is fine per Part 7 |
| Belief-affecting writes traceable to evidence | **Partially implemented** | True for claims; missing for notes (no history at all) |
| One source of truth for derived values | **Potentially wrong** | `getNoraTierContext` and `getSurfaceableClaims`'s inline `getTier` compute tier independently |
| Confirmation-rate sliced by `claim_type` before being treated as a signal | **Missing** | The metric doesn't exist yet, aggregate or sliced |
| Retirement terminal per-claim | **Already correct** | Scoped to the individual claim id |
| No speculative AI infrastructure | **Already correct** | Confirmed absence of agent frameworks, vector DB, fine-tuning, etc. |

**Smallest changes required — not a refactor:**
1. Guard the `updateNoraMemory` call in both `ai-coach/route.js` and `couples-session/route.js` behind a sensitive-content check for that turn.
2. Add a deterministic `checkSensitiveContent()` gate ahead of `noraChat` in both routes.
3. Add the notes-history snapshot table + one insert inside `updateNoraMemory`.
4. Extract one shared `getTier()` function, used by both current call sites.
5. Add a claim-confirmation-rate aggregation query, sliced by `claim_type`/confidence band.

Five small, additive changes. None of them a rewrite.

---

## The Architecture in One Page

**1. What Nora is.** A voice-consistent relationship companion whose intelligence is a couple-specific, self-correcting belief system layered over a general-purpose model — not the model itself.

**2. What Nora learns.** Falsifiable claims about specific people and couples, confirmed, challenged, corrected, or retired through real interaction — and ambient narrative context that shapes tone and continuity without ever being staked as fact.

**3. How Nora learns.** Evidence from real interactions → LLM-proposed candidate beliefs (claims) or synthesized notes → for claims, real user responses classified by the LLM as confirm/challenge/correct → deterministic code updates confidence, status, and lineage. The LLM interprets; code owns every durable state change.

**4. What Nora is allowed to remember.** Anything a person or couple actually did or said within the product, captured as evidence — except sensitive disclosures (abuse, self-harm, crisis content), which must never enter the belief or memory pipeline at all.

**5. What Nora is allowed to say.** A claim may be stated directly only once its confidence *and* the relevant tier both support it; below that, tentatively or not at all. Private information never crosses the partner boundary.

**6. What Nora must never do.** Treat an unconfirmed inference as settled fact. Let narrative notes alone justify a direct assertion or a consequential decision. Attempt clinical or crisis counseling. Silently overwrite a corrected belief without lineage. Mutate its own prompts automatically.

**7. How we know Nora is getting better.** Mostly an open, empirical question. The architecture is built to make it measurable — claim confirmation rate, sliced by type, over time — but that measurement doesn't exist yet, and no outcome claim should be made until it does.

**8. Rules that must not be violated.** Private information never crosses the partner boundary. LLMs interpret; deterministic code owns state. Corrections create lineage, never silent deletion. Safety-sensitive content never enters the belief pipeline. Tier governs disclosure and register only — not an unexamined general permission system. No new AI infrastructure without a concrete, current problem. No automated prompt mutation without human review.
