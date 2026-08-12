# Nora Architecture

**Status:** Canonical / Living Document
**Current as-of:** August 12, 2026
**Purpose:** Authoritative architecture reference for Nora — the person/couple-specific memory, belief, and safety system underlying the ABF app.
**Supersedes:** `NORA_ARCHITECTURE_AUDIT_2026_08_11.md`, `NORA_ARCHITECTURE_STRESS_TEST_2026_08_11.md`, `NORA_INTELLIGENCE_SPEC_v0.1_2026_08_11.md`, `NORA_IMPLEMENTATION_AUDIT_2026_08_11.md`. Those were discussion drafts on the way here; this is the settled reference. Future architecture decisions update this document rather than spawning a new one.

---

## 1. One-Page Summary

Nora is not intelligent merely because it uses an LLM or stores memory. Nora's intelligence is the discipline of a person/couple-specific belief formation and revision loop layered over a general-purpose language model.

The model provides language generation and general pattern recognition. Nora's differentiated system is its structured, revisable understanding of specific people and couples:

- Evidence becomes candidate beliefs.
- Beliefs have confidence.
- Beliefs can be surfaced according to confidence and trust tier.
- User responses can confirm, challenge, or correct a belief.
- Corrections create inspectable lineage — nothing is silently overwritten.
- Repeated supporting evidence can also reinforce a claim through the existing REINFORCE pathway, separately from user confirmation.
- Narrative memory provides continuity and texture but is not equivalent to a governed claim.

This architecture creates the conditions for learning. Whether Nora's beliefs actually get more accurate over time is an open empirical question, not a settled claim — `claim_confirmation_rate.sql` (Section 3) exists specifically to start answering it. Do not represent this architecture, in product copy or elsewhere, as having already proven improved relationship outcomes or superior accuracy.

Four concepts must never be collapsed into one generic "memory" idea:

| Concept | Is |
|---|---|
| Structured claim | A governed belief — individually confirmable, challengeable, correctable, retirable |
| Narrative memory | Ambient continuity — tone, texture, callbacks |
| Trust tier | Relationship-level permission and voice register |
| Confidence | Evidentiary weight for one specific claim |

---

## 2. Core Vocabulary

### Evidence
A discrete, timestamped record of something that actually happened: an interaction, a response, a reaction, a completed activity, a correction. Evidence is not an interpretation — Nora-generated output is not evidence, and an unchecked inference is not evidence. Implemented as `nora_signals` (append-only) plus the signal-weighting tables (`INDIVIDUAL_SIGNAL_WEIGHTS`, `COUPLE_SIGNAL_WEIGHTS`) in `lib/nora-memory.js`.

### Belief / Claim
A belief is an assertion Nora holds about a person or couple that goes beyond raw evidence and is revisable. A claim is the structured, falsifiable representation of a belief, stored in `nora_claims` — kept separate from narrative memory specifically so it can be individually confirmed, challenged, corrected, or retired, rather than blended into prose that can only be overwritten wholesale.

### Narrative Memory
Ambient context for continuity, texture, tone, and callbacks — `nora_memory`'s `user1_notes` / `user2_notes` / `couple_notes` / `memory_summary`. Narrative memory is **not** a governed claim: it must not independently establish a settled factual assertion, bypass claim confidence, or drive consequential behavior on its own.

### Confidence
A claim-level evidentiary-weight heuristic — **not** a calibrated probability of factual correctness. Confidence and permission (whether a claim may be expressed DIRECT) are conceptually separate, even though permission is currently derived partly from confidence — see Trust Tier. Confidence answers "how much evidence supports this specific claim," nothing more.

### Trust Tier
A relationship-level ceiling based on accumulated signal volume, computed once by `getTier()` in `lib/nora-knowledge.js`:

- Tier 1: 0–5 individual signals
- Tier 2: 6–15
- Tier 3: 16+

(Couple-level tier uses separate ≤7 / ≤20 thresholds — a legitimately different scale, not consolidated with individual tier.)

Tier governs voice/register and the maximum directness a claim may be expressed with. Tier does **not** determine whether a claim is true — per-claim confidence does that. Never describe tier as an accuracy score.

### Confirmation / Challenge / Correction
The claim-response lifecycle, implemented in `classifyClaimResponse()` (`lib/nora-memory.js`):

- **CONFIRMED** — the user agrees, recognizes themselves in it. The strongest direct validation signal. Confidence +0.10.
- **CHALLENGED** — the user disagrees without offering an alternative explanation. Confidence −0.25.
- **CORRECTED** — the user disagrees and supplies their own explanation. First correction on a lineage: the original claim goes `dormant`; a new claim is created from the user's own words at confidence 0.75, linked via `dormant_linked_claim_id`. Second correction on that same lineage: `retired`, terminal.

### REINFORCE
A separate confidence pathway — **not** equivalent to CONFIRMED. Inside `extractAndUpdateClaims()`, when new notes independently re-notice an existing pattern, with zero user response involved, confidence moves by the identical +0.10 a genuine CONFIRMED would, and `supporting_signal_count` increments. This is existing, deliberately-built behavior, not a bug — but it means a claim can in principle reach the DIRECT threshold through self-reinforcement alone. Its calibration relative to explicit confirmation is a deliberately open question — see Section 5.

### Retirement
A terminal lifecycle state for one specific claim lineage. A retired claim does not resurrect automatically. Retirement does not prevent a genuinely new claim of the same `claim_type` from being proposed later if fresh evidence supports it — it's the lineage that's retired, not the topic.

### Provenance
The ability to answer "why does Nora believe this." For claims: lifecycle state, `user_response`, `correction_count`, and `dormant_linked_claim_id` lineage. For narrative memory: `nora_memory_history` provides pre-overwrite snapshots of each layer. This is **not** full claim-to-signal provenance — there is no link from a specific `nora_signals` row to the specific claim it produced. That remains explicitly out of scope (Section 5).

### Safety
Sensitive disclosures — abuse, self-harm, suicidal ideation, active crisis — are kept out of Nora's belief/memory pipeline via `lib/safety.js`. This taxonomy is intentionally narrow and should not be expanded without a concrete reason. See Invariants 8–10 for the exact failure-direction rule.

---

## 3. Current Implementation Map

| Concept | Location | What it does |
|---|---|---|
| `getTier()` | `lib/nora-knowledge.js` | Single canonical individual trust-tier function (0–5 / 6–15 / 16+) |
| `getClaimMode()` | `lib/nora-memory.js` | DIRECT vs TENTATIVE decision (confidence ≥ 0.85 **and** tier ≥ 3) |
| `getSurfaceableClaims()` | `lib/nora-memory.js` | Fetches claims above confidence 0.70, formats them for prompt injection |
| `classifyClaimResponse()` | `lib/nora-memory.js` | Classifies a user's reply to a surfaced claim: CONFIRMED / CHALLENGED / CORRECTED / NEUTRAL |
| `extractAndUpdateClaims()` | `lib/nora-memory.js` | Creates candidate claims from new notes; also the REINFORCE pathway |
| `updateNoraMemory()` | `lib/nora-memory.js` | Main write entry point — synthesizes notes, snapshots history, writes `nora_memory` |
| `getFullNoraContext()` | `lib/nora-memory.js` | Shared context-assembly entry point; never queries `nora_private_notes` |
| Sensitive-content gate | `lib/safety.js` | `checkSensitiveContent()`, `resolveSafetyAction()`, `SAFETY_RESPONSE` |
| AI Coach safety wiring | `app/api/ai-coach/route.js` | Gate before `noraChat` and before `updateNoraMemory` |
| Couples Session safety wiring | `app/api/couples-session/route.js` | Same pattern, shared/couple-facing |
| Free-text route — notebook | `app/api/notebook/entry/route.js` | Entry always saves; memory write gated |
| Free-text route — ritual note | `app/api/ritual/partner-note/route.js` | Note always saves; memory write gated |
| Free-text route — timeline | `app/api/timeline/event/route.js` | Event always saves; memory write gated |
| Free-text route — date review | `app/api/dates/complete/route.js` | Review always saves; memory write **and** the generated Nora observation + push are both gated |
| Free-text route — shared item | `app/api/ahead/complete/route.js` | Completion always saves; memory write gated |
| `nora_memory` | Supabase table | Mutable notes/summary layers, overwritten wholesale on each update |
| `nora_memory_history` | Supabase table, `docs/database/nora_memory_history.sql` | Insert-only snapshot of each layer's previous value before overwrite |
| `nora_claims` | Supabase table | Structured claims: confidence, status, lineage |
| `nora_signals` | Supabase table | Append-only raw signal event log |
| `nora_private_notes` | Supabase table | Solo/private notes, never read by couple-facing context |
| `claim_confirmation_rate.sql` | `docs/database/claim_confirmation_rate.sql` | Read-only saved query distinguishing CONFIRMED / CHALLENGED / CORRECTED / REINFORCE |
| Test suite | `tests/*.test.js`, `vitest.config.js` | 6 suites, 24 tests: tier, claim-mode, privacy-boundary, notes-history, safety, safety-gate-decision |

This table is navigational, not exhaustive — it points at where to look, not everywhere Nora is touched.

---

## 4. Architectural Invariants

Rules future implementation must preserve. Each has a one-line implementation consequence — what breaking it would actually look like.

1. **PRIVATE BOUNDARY.** Private/solo-disclosed information never enters couple-facing context.
   *Consequence:* `getFullNoraContext()` never queries `nora_private_notes`; `NORA_CONVERSATION` signals route to `nora_private_notes` exclusively, never touching `couple_notes`/`memory_summary`.

2. **LLM VS STATE.** LLMs interpret and classify; deterministic code owns durable state transitions.
   *Consequence:* confidence deltas, status transitions, and tier thresholds are hardcoded constants in code, never decided directly by a model call.

3. **BELIEF UPDATE.** Nora's structured beliefs are updated through deterministic state transitions driven by explicit user responses and, in the existing REINFORCE pathway, repeated supporting evidence. Explicit confirmation is the strongest direct validation signal; REINFORCE is a separate, currently unvalidated reinforcement pathway.
   *Consequence:* don't describe REINFORCE as user validation in product copy, docs, or investor materials.

4. **DIRECT EXPRESSION.** A claim may only be expressed DIRECT when its confidence and the applicable trust-tier ceiling both permit it.
   *Consequence:* `getClaimMode()` requires confidence ≥ 0.85 **and** tier ≥ 3 together; neither alone is sufficient.

5. **CORRECTION LINEAGE.** Corrections preserve prior beliefs through inspectable lineage; they do not silently overwrite or delete the old belief.
   *Consequence:* `dormant_linked_claim_id` links every corrected claim to what it replaced.

6. **NARRATIVE MEMORY BOUNDARY.** Narrative memory may provide tone, continuity, texture, and references. It may not independently justify a direct assertion or a consequential decision.
   *Consequence:* DIRECT-tier disclosure gating applies only to `nora_claims`, never to raw notes prose.

7. **TIER SCOPE.** Tier governs disclosure directness and voice/register — it is not a general-purpose permission system.
   *Consequence:* don't use tier to gate unrelated features (feature access, billing, etc.) without a fresh, explicit decision.

8. **SAFETY.** Safety-sensitive content must not enter Nora's belief/memory pipeline.
   *Consequence:* every route that writes free text into `updateNoraMemory` must run it through `checkSensitiveContent` first.

9. **SAFETY FAILURE DIRECTION.** Generation fails open; memory fails closed.
   *Consequence:* a classifier error means Nora still responds normally (`resolveSafetyAction()` returns `GENERATE_ONLY`), but no `updateNoraMemory` call fires for that turn.

10. **USER-OWNED RECORDS.** On the five free-text data-entry routes, the user's own record is preserved even when safety classification flags it or can't classify it — only the Nora-memory write is gated.
    *Consequence:* notebook entries, ritual notes, timeline events, date reviews, and completion notes always save; `dates/complete` additionally gates the generated Nora observation and its push notification the same way.

11. **PROMPT GOVERNANCE.** No automated mutation of core prompts or voice without human review.
    *Consequence:* `NORA_VOICE` and the context notes in `lib/nora-knowledge.js` are hand-edited only.

12. **CONFIDENCE GOVERNANCE.** Confidence deltas and thresholds are deliberate, human-set constants — not auto-tuned.
    *Consequence:* the +0.10 / −0.25 deltas and the 0.70 / 0.85 thresholds require an explicit decision to change, never a data-driven auto-adjustment.

13. **PROVENANCE.** Belief-affecting writes remain traceable to their source as far as the current architecture supports.
    *Consequence:* don't strip `user_response` / `user_responded_at` / `correction_count` from future claim-write paths without replacing that traceability.

14. **SINGLE SOURCE OF TRUTH.** Derived values such as individual trust tier have exactly one implementation.
    *Consequence:* `getTier()` in `lib/nora-knowledge.js` is the only place individual-tier thresholds are defined — don't reintroduce a second inline copy.

15. **METRIC DISCIPLINE.** Confirmation metrics are a relative/regression signal, not a measure of accuracy, and must be sliced by dimensions like `claim_type` and confirmation source where relevant.
    *Consequence:* never describe a number from `claim_confirmation_rate.sql` as "Nora is X% accurate."

16. **NO SPECULATIVE INFRASTRUCTURE.** Don't introduce new AI infrastructure without a concrete, current product problem.
    *Consequence:* check Section 5's excluded list before proposing embeddings, vector databases, agent frameworks, or model routing.

17. **RETIREMENT.** Retirement is terminal for a specific claim lineage; fresh evidence can create a new claim later.
    *Consequence:* don't build a "revive a retired claim" mechanism — let a new claim of the same type form naturally if warranted.

18. **NOTES HISTORY.** Narrative-memory overwrites preserve prior values through `nora_memory_history`. This is a recovery/debugging mechanism, not event sourcing.
    *Consequence:* don't build a read path against `nora_memory_history` — it's write-only from the application's perspective by design.

---

## 5. Deferred vs Excluded

This distinction matters. Deferred means "not yet, pending evidence." Excluded means "settled — don't reopen without a concrete new reason."

### Deferred — open questions
Legitimate future questions, not decided against:

- **REINFORCE calibration/weighting** — should it move confidence by the same amount as explicit confirmation, or less?
- **Confidence trajectory/history** — should a claim's confidence path over time be tracked, not just its current value?
- **Additional claim provenance** beyond the existing `dormant_linked_claim_id` lineage.

The trigger for revisiting any of these is real data from `claim_confirmation_rate.sql` — specifically, evidence that a `claim_type` with a high self-reinforcement ratio is also correcting or retiring at a meaningfully higher rate than explicitly-confirmed claims.

### Explicitly excluded — do not casually reopen
Settled for this architecture phase. Reopening any of these requires a concrete new product problem, not just a preference:

- Confidence-history as a schema feature
- Claim-to-signal foreign keys
- A generalized belief abstraction (unifying claims and notes)
- Embeddings / vector databases
- Dashboards or scheduled analytics for the confirmation-rate metric
- A broader safety taxonomy beyond abuse/self-harm/suicidal ideation/crisis
- Response-output safety scanning (checking Nora's generated text, not just user input)
- A second claims system for notes
- Any change to confidence deltas
- Any change to confidence or tier thresholds
- Any change to the existing claims lifecycle

---

## 6. Adding a New Feature That Writes User Text into Nora's Memory

If a new feature accepts user-generated text and might write it into Nora's memory:

1. Identify the user's own record separately from Nora's derived memory — they're not the same save.
2. Run `checkSensitiveContent()` on the text before the memory write.
3. Preserve the user's own record according to that feature's own product rules — don't block a save just because content was flagged, unless the feature is itself a generated reply (see below).
4. Gate the `updateNoraMemory()` call on `resolveSafetyAction()` returning `GENERATE_AND_REMEMBER`.
5. Follow the current failure direction: generation may fail open, memory must fail closed.
6. If the feature also *generates* Nora content from the user's text (like `dates/complete`'s Nora observation), gate that generation step too — don't let it slip through because "it's not really a chat."
7. Never silently bypass the gate because the new route "isn't really Nora" or the text seems low-risk — that reasoning is exactly how the five-route gap this document's Section 3 lists got created in the first place.
8. Add tests for both a flagged input and an ordinary input.
9. Reuse `lib/safety.js` — don't invent a second safety classifier.

Use `app/api/notebook/entry/route.js` (simple case) or `app/api/dates/complete/route.js` (generation + memory both gated) as implementation templates.

---

## 7. Changelog

The commits from the Aug 2026 trust/safety/memory-integrity phase, in order:

1. `eb6a505` — Consolidate signal-count-to-tier into one shared `getTier()`
2. `c46e0ba` — Add Vitest + first three test suites
3. `11ce212` — Add notes-history snapshot before memory overwrite
4. `24cd754` — Add sensitive-content safety gate + memory suppression
5. `f83d554` — Add claim confirmation-rate SQL query
6. `7024c13` — Correct REINFORCE architecture language in code
7. `2e7424a` — Switch confirmation-rate query to `created_at` now that it's confirmed to exist
8. `cf465f2` — Extend sensitive-content safety gate to 5 free-text data-entry routes

---

## How to Use This Document

- This is the canonical architecture reference for Nora. Future architecture decisions update this document rather than creating a parallel spec.
- Code is the final authority on current implementation. If code and this document disagree, verify the code first, then update this document.
- Deferred questions stay in Section 5 until deliberately resolved — don't quietly start building toward one because it seems reasonable.
- Explicitly excluded items are not reopened casually.
- When a change touches an invariant in Section 4, update this document in the same change, not as a follow-up someone forgets to do.
