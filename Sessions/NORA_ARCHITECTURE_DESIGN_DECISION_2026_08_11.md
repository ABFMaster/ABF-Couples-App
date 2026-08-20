# Nora — From Architecture Audit to Design Decision
**Date:** Aug 11 2026. Response to ChatGPT's third-pass prompt. Discussion draft, not committed.

**Before anything else:** I went back and read the actual write paths this pass — `updateNoraMemory()` in full, `extractAndUpdateClaims()`, `classifyClaimResponse()`'s confidence write-back, and `getMemoryBriefing()`. That changed one of my own second-pass conclusions materially (see 1C). I'm flagging that up front because it's the clearest evidence in this whole exercise that "attack your own thesis" has to mean *re-checking the code*, not just re-arguing from the previous summary.

---

## Part 1 — Attacking the thesis

### A. Is "earned-trust disclosure" actually the moat?

Partially, and I think the framing needs a correction. Tier gating *as a mechanism* — `if (confidence > X && signals > Y) speak plainly else hedge` — is not hard to copy. Any competent team could ship that pattern in a sprint. So the mechanism itself isn't the moat.

What's actually hard to copy: the corpus of confirmed, corrected, and retired claims built from months of *this specific couple's* real reactions — the `dormant_linked_claim_id` lineage, the confidence trajectory, the things Nora used to believe and got corrected on. A competitor can ship tier gating on day one. They cannot ship two years of Matt & Cass's corrected claim history on day one.

Revised claim: **the moat is the accumulating, self-correcting, couple-specific belief corpus. Tier gating is the delivery mechanism that makes it safe to keep collecting that corpus** — without it, surfacing everything Nora infers immediately would make users guarded, which would starve the very data the moat depends on. It's necessary infrastructure *for* the moat, not the moat itself. This distinction matters for investor-facing language: "we have tier gating" is a feature description; "our AI gets measurably more accurate about each specific couple over time, and only acts on what it's earned the right to say" is the moat claim — and that second claim currently has no metric behind it (see 1D and the Do Next list).

### B. Is Evidence → Beliefs → Confidence → Permission → Behavior correct?

Partially, and the code surfaces a real asymmetry the diagram hides.

- **Confidence isn't a separate layer for claims** — it's a mutable column on the belief row itself, updated in the same transaction as belief-status changes (`CONFIRMED`/`CHALLENGED`/`CORRECTED`). For claims, "Belief" and "Confidence" are one thing, not two layers.
- **"Beliefs" and "claims" are correctly conflated for `nora_claims`** — that table *is* the belief store. But the model is missing an entire second belief store: the prose notes (`user1_notes`/`user2_notes`/`couple_notes`/`memory_summary`). Those are just as much "what Nora believes about this couple" as claims are — arguably more central, since `getMemoryBriefing()` injects them into **every** relevant prompt, unconditionally, regardless of tier or confidence. Claims have the whole confidence/lifecycle/gating apparatus. Notes have none of it — just an overwrite and a timestamp.

  **This is the single most important finding from re-reading the code this pass: the Evidence→Beliefs→Confidence→Permission model is only actually true for the claims subsystem. The subsystem that's injected into more calls, more directly, has no confidence layer and no permission layer at all.** That's not a missing box in a diagram — it's a live asymmetry in the running system.

- **Missing gate:** safety doesn't belong anywhere in this chain as drawn, and shouldn't be forced in. Permission governs *how directly Nora can state what it believes* — a dial. Safety is a floor, evaluated on *input*, before generation even starts, not a pacing question about output. Model it as a separate, earlier gate, not a rung on this ladder.
- **Too deterministic?** Partially fair, and I'd push back on part of it. The confidence math (+0.10 confirm, −0.25 challenge, fixed constants) is deterministic — and I'd defend that specifically, not concede it: deterministic confidence arithmetic is easier to test and reason about than an LLM "deciding" how much to trust something each time. What's *not* deterministic, correctly, is the classification step upstream (`classifyClaimResponse` is an LLM judgment call on what the user's reply meant). That's the right split — LLM judges intent, deterministic code updates state — not a flaw to fix.

**Revised model:**
Evidence (`nora_signals`, append-only, currently *not* linked forward to what it produced) → two parallel belief stores of very different maturity — structured (`nora_claims`: belief+confidence unified, real lifecycle, tier-gated) and narrative (notes/summary: belief only, no confidence, no gating, injected unconditionally) → Permission (governs claims today; does not govern notes) → Safety floor (input-side, doesn't exist yet) → Behavior.

### C. Attacking the provenance thesis — where I'm correcting myself

My second-pass audit called provenance "a major missing capability," full stop. Having now actually read `updateNoraMemory()`, `extractAndUpdateClaims()`, and the confidence write-back in `classifyClaimResponse()`, that was too strong, and I want to correct the record rather than let a wrong premise carry into a roadmap.

**What already exists, and is genuinely good:**
- `nora_signals` — a real append-only evidence log (`signal_type`, `input_data`, `user_id`, `created_at`) written on every meaningful interaction.
- `nora_claims` — `updated_at`, `user_response`, `user_responded_at`, `correction_count`, and — this is the part I underrated — **`dormant_linked_claim_id`**, which creates a genuine lineage between a corrected belief and its replacement (first correction → old claim goes `dormant`, a new claim is created *from the user's own stated explanation*, linked back to the original; second correction on that lineage → `retired` permanently). That's real, working belief-revision provenance, and it's more thoughtfully designed than a generic `confidence_history` array would be — a wrong belief and its correction both stay inspectable as first-class rows, not collapsed into a lossy number.

**What's actually missing, precisely — smaller than I originally claimed:**
1. `nora_signals` rows aren't linked to which claim(s) or note-version they produced. You can see *that* something happened and separately see the *current* belief, but can't mechanically trace one to the other.
2. Confidence has no trajectory — only the current number. "0.3 six months ago, climbing steadily" and "spiked once, never moved again" look identical today.
3. Notes/summary have none of the above — no confidence, no per-change record, no link to source, just an overwrite with one `updated_at`.

**Is durable provenance necessary at current scale?** For claims — no, leave it alone, it's already a well-designed lifecycle. For notes — yes, but the minimum fix is much smaller than "provenance" as a term implies: snapshot the previous value before each overwrite. Not event sourcing. See Part 2.

### D. Attacking the claim-confirmation metric

Real biases worth naming:
- **Sycophantic confirmation** — Nora's voice is deliberately warm and validating, which structurally raises the risk that users confirm a plausible-sounding claim just to keep the conversation moving, not because it's accurate.
- **Avoidant denial** — a true but uncomfortable claim might get `CHALLENGED` for being badly timed, not wrong. At −0.25 against +0.10 for confirmation, that's a real risk of an accurate claim being punished disproportionately for landing at the wrong moment.
- **`CORRECTED` is the most information-dense of the three and currently the least examined** — a user who corrects Nora with their own explanation is engaging seriously, and the system already handles this well (spins up a new claim from their own words rather than just discarding the old one). Worth defending this design, not flagging it as a gap.
- **Confirmation rates will legitimately vary by `claim_type`** in ways that say nothing about overall quality — a "loves surprises" claim is lower-stakes and easier to confirm than a claim about conflict style. A single aggregate number would be actively misleading; it needs to be sliced by `claim_type` and confidence band before it means anything.

**What it can legitimately measure:** relative trend, within the same `claim_type`, over time — a genuinely useful regression signal (did a prompt change make Nora worse at reading conflict-style claims specifically). **What it cannot measure:** absolute accuracy, timing-appropriateness, or quality independent of social pressure to agree.

### E. Attacking the safety conclusion

I'd defend the narrow framing (not general intent routing) but the second pass underspecified *what happens when it triggers*, which is the part that actually matters. For a relationship product, not a clinical one, the right behavior is almost certainly **not** "Nora attempts to help" — Nora has no clinical training, and pretending otherwise is a real liability, not a feature. Minimum credible version: detect → redirect away from Nora attempting to counsel → surface a static, human-reviewed resource message (not freshly LLM-generated in the moment — this is exactly the kind of output where model variance is unacceptable) → **do not feed the disclosure into `updateNoraMemory`/claims at all.** That last point matters on its own: a crisis disclosure should probably never become a "claim" the couple-shared belief system reasons about later. That's a small, bounded build, and it's the thing that keeps this from turning into a pseudo-therapy feature.

---

## Part 2 — Architecture, if the thesis survives

### A. Core objects — minimum useful structure

- **`nora_signals`** (exists) — evidence, append-only. No structural change. Optional, cheap addition: nothing required for v1 (see C below on why a hard link isn't worth it yet).
- **`nora_claims`** (exists) — structured belief + confidence + lifecycle, already well-designed. No new table.
- **Notes/summary** (exists, in `nora_memory`) — needs exactly one new thing: an insert-only history table, written right before the existing upsert in `updateNoraMemory`. Not event sourcing — one new table, one new insert in one existing function.
- **Tier/permission state** — already correctly *derived* from signal counts on every call, not stored. Keep it that way; persisting something this cheap to compute would just be a new place for it to go stale.
- **Private boundary** (`nora_private_notes`) — already a separate table, correctly isolated. No change.

**Don't build:** a generic polymorphic "beliefs" table unifying claims and notes into one schema. Tempting on a whiteboard, but claims and notes are legitimately different maturity levels of belief today, and forcing them into one structure is complexity added to make the diagram prettier, not to solve a real problem — exactly what the constraints for this exercise warned against.

### B. Belief lifecycle

The claims lifecycle already matches — and is more specific than — the proposed generic one:
`Observed (nora_signals insert) → candidate belief (extractAndUpdateClaims, starting confidence 0.2-0.4) → confirmation/contradiction (classifyClaimResponse) → confidence update OR correction (dormant + linked replacement) OR retirement (2nd correction) → surfaced (tier-gated) → response → loop.`
Leave it as-is.

Notes need a *much simpler* parallel, not the same rigor: `Observed → re-synthesized (already happens) → snapshot previous version before overwrite (new) → injected unconditionally (already happens, unchanged).` Notes don't need confirmation/contradiction/tier-gating bolted on to match claims — that would be over-engineering prose memory to solve a problem (silent overwrite) that the snapshot alone already fixes.

### C. Minimum viable provenance schema

For the new notes-history table — genuinely minimal:
`couple_id, layer (user1 | user2 | couple | summary), notes (the value being replaced), source_signal_type, replaced_at`

That's it. No `confidence_history` (notes don't have confidence). No hard foreign key to the source `nora_signals` row for v1 — a `signal_type` plus a close timestamp is enough for a human debugging a specific bad memory, and a hard FK adds real coupling cost to what's fundamentally a debugging table, not a queried-in-production one.

For claims: no new schema needed. A `confidence_history` log is a real, legitimate future addition, but only if trajectory visibility becomes an actual product need — current point-in-time confidence + status + `correction_count` already answers the question that matters for behavior ("is this belief currently trustworthy"). Trajectory only matters for a future analytics view. **Design for, don't build.**

### D. Tier gating — making the boundary explicit

What tier **currently governs**, precisely, from the code:
1. General conversational register/warmth (`INDIVIDUAL_TIER_CONTEXT`/`COUPLE_TIER_CONTEXT` — voice instructions injected into system prompts).
2. Whether a specific claim can be stated `DIRECT` vs. must stay `TENTATIVE` (`getSurfaceableClaims`).

What tier **does not currently govern**, and shouldn't without a deliberate decision:
- Whether narrative notes/summary get injected at all — they always do, at every tier (same asymmetry as 1B).
- Content selection — I don't see tier consulted anywhere in Bet-question weighting or date suggestions. If a low-trust couple can get a highly personal Bet question because that selection logic doesn't check tier, that's an unexamined gap, not a decided tradeoff.

**Recommended explicit boundary: tier governs disclosure directness and voice register — nothing else, unless deliberately extended.** Content selection is a separate concern that may eventually also want to respect tier, but shouldn't silently inherit it by accident. This is the guardrail against "tier" becoming a vague catch-all permission system, which is the exact risk flagged in the prompt.

**One more finding worth naming:** there are currently **two independent implementations** of "signal count → tier number" — one in `lib/nora-knowledge.js`'s `getNoraTierContext`, one inline inside `getSurfaceableClaims` in `lib/nora-memory.js`. They use the same thresholds today by inspection. Nothing enforces they stay in sync if one gets tuned later. Small, cheap fix, see roadmap.

### E. Safety architecture

Smallest credible version: one new function (`checkSensitiveContent(text)`), called at the top of both open-chat message handlers (AI Coach, Couples Session) before the message reaches `noraChat`. A cheap classifier call, same shape/cost as the existing `shouldUpdateMemory` gate (Haiku, narrow prompt, fast). On trigger: skip normal generation, return a **fixed, human-reviewed** redirect message — not freshly generated text, model variance is unacceptable here — and skip the `updateNoraMemory`/claims call for that turn entirely, so the disclosure never enters the shared belief system. This is a gate, not a feature. It should be boring and reviewed by you before it ships, not iterated on by an LLM.

### F. Evaluation — smallest layer that makes sense now

| Category | Deterministic? | LLM judge? | Human? | Notes |
|---|---|---|---|---|
| Privacy boundary | **Yes** | No | No | Unit test: private-notes content must never appear in couple-facing prompt output, against fixture data. No LLM call needed. |
| Earned-intimacy/tier | **Yes** | No | No | Assert claim mode (TENTATIVE/DIRECT) matches confidence+tier per the code's own stated logic — regression guard, especially once the tier-duplication fix lands. |
| Non-repetition | **Yes** | No | No | Assert a prompt/question doesn't reappear within its stated cooldown, against existing dedup logic. |
| Uncertainty handling | Partial | Yes | Spot-check | Whether hedge language actually shows up in generated prose isn't purely mechanical. |
| Claim confirmation/rejection | N/A — this is a metric, not a test | No | No | One SQL aggregation over existing `nora_claims` data, sliced by `claim_type`/confidence band. No new infrastructure. |
| Safety handling | No | Not sufficient alone | **Yes, mandatory** | Do not ship on LLM-judge confidence alone, at least initially. |

I would not build a general eval framework right now. Items 1-3 are three small test functions. Item 4 is a handful of spot-checked examples. Item 5 is one query. Item 6 is a fixed message plus your review. That's the entire "smallest evaluation layer" — it fits without inventing new infrastructure.

---

## Part 3 — Implementation plan

**DO NOW**

| # | Item | Problem solved | Architectural change | Files | Complexity | Dependencies | Verification |
|---|---|---|---|---|---|---|---|
| 1 | Notes-history snapshot | Silent overwrite with no history (1C) | One insert-only table; one new insert in `updateNoraMemory`, right before the existing upsert | `lib/nora-memory.js`, new migration | Low | None | Write a note, confirm a history row appears with the pre-update value; confirm couple-facing behavior is unchanged (purely additive) |
| 2 | Privacy-boundary deterministic test | Highest-stakes failure mode currently backed only by manual discipline | First real test in the repo, against fixture data | New test file, likely against `getFullNoraContext`/`buildSystem` | Low | Pick a test runner (Vitest is the lightest fit) | Test passes today; would fail if private notes ever leaked into shared context |
| 3 | Sensitive-content gate | Real product-safety gap on the only free-text surfaces (AI Coach, Couples Session) | New `checkSensitiveContent()`, called pre-generation, short-circuits to a fixed message, skips memory write on trigger | New lib file, `app/api/ai-coach/route.js`, Couples Session's message route | Medium | **Your sign-off on redirect copy and trigger categories — this is a product decision, not just engineering** | A set of known trigger/non-trigger/ambiguous test phrases, reviewed by you before ship |
| 4 | Extract shared `getTier()` | Two independent tier implementations that could silently drift | One function, two call sites updated | `lib/nora-knowledge.js` or a shared util, `lib/nora-memory.js` | Low | None | Existing tier-dependent behavior unchanged for known signal counts |
| 5 | Idempotency audit + scoped retry, observability, prompt caching, timeout/query sweep | Unchanged from the second pass | Unchanged | Unchanged | Low-Medium | None | Unchanged |

**DO NEXT**
- Claim-confirmation-rate aggregation, sliced by `claim_type`/confidence band — surfaced somewhere you can actually see it.
- Behavioral spec write-up (Part 2F's categories, as a real document).
- A deliberate decision on whether tier should govern content selection (Bet questions, date suggestions) beyond disclosure/register — currently an unexamined default, not a choice anyone made on purpose.
- Minimal CI (lint + the two new unit tests from DO NOW).

**DESIGN FOR, DON'T BUILD**
- Confidence-history for claims — only if trajectory visibility becomes a real product need.
- Hard FK from `nora_signals` to what it produced — nice-to-have, not necessary for the debugging value the history table already provides.
- Tool calling, embeddings/vector retrieval, model routing beyond call-type — unchanged from the second pass.

**IGNORE**
- Everything from the second pass's list, plus: a generic polymorphic "beliefs" table unifying claims and notes. False economy — adds abstraction cost to force two genuinely different-maturity things into one shape.

---

## Where I Think You're Wrong

1. **Tier gating itself isn't the moat — you're one level removed from where it actually is.** The moat is the accumulated, corrected, couple-specific belief corpus; tier gating is the (copyable) mechanism that makes it safe to keep collecting it. This matters for how you eventually describe this to investors: "we have tier gating" is a feature. "Our AI gets measurably more accurate about each specific couple over time, and only acts on what it's earned the right to say" is the moat claim — and right now that second sentence has no metric behind it, because the confirmation-rate aggregation doesn't exist yet.

2. **I was wrong, in the second pass, to call provenance "a major missing capability" without qualification.** It's genuinely missing for notes; it's already reasonably good for claims, and the `dormant_linked_claim_id` lineage is better-designed than what I was implicitly assuming needed to be built. I'm naming this correction explicitly because it's the clearest evidence in this whole exercise that a design conclusion has to be checked against the actual write path, not against a description of it from a prior pass — including my own.

3. **Neither pass has questioned whether the confirmation/challenge asymmetry (+0.10 / −0.25) is calibrated correctly.** That's a real product decision sitting inside a constant that looks reasonable and has gone unexamined twice now. Not flagging it as broken — flagging it as exactly the kind of quietly load-bearing number nobody notices until the confirmation-rate metric (Do Next) exists and someone asks why it looks off.

4. **You asked whether I'm protecting against theoretical problems instead of concrete ones — I want to hold myself to that on item 1 in DO NOW specifically.** I have not observed an actual incident of memory poisoning in this codebase. I'm recommending the notes-history snapshot because the mechanism for it exists and is cheap to defend against, not because it's already caused a visible failure. That's a legitimate reason to build something (cheap insurance against a plausible, currently-invisible failure mode) — but it's a different category from the retry/observability items, which are fixing bugs you've actually hit. Worth being honest about which category each roadmap item is really in when you're deciding what's truly "before wider exposure" versus "good hygiene worth doing anyway."
