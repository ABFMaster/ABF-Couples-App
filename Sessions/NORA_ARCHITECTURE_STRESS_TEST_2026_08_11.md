# Nora — Second-Pass Architecture Stress Test
**Date:** Aug 11 2026. Response to ChatGPT's stress-test prompt against `Sessions/NORA_ARCHITECTURE_AUDIT_2026_08_11.md`. Discussion draft, not committed.

---

## Part 1 — Challenging my own audit

### A. AI Architecture

**Keep:** Response generation (4). Planning, agent loops, goal-based loops, agent orchestration, reflection/self-critique (all 0) — genuinely absent, genuinely not needed by any current feature.

**Lower:** Context assembly, from 3 to **2**. I noted in the original audit that `getFullNoraContext()` exists but isn't universally adopted (`challenge/generate` does its own inline fetching). On reflection, "good foundation, incomplete" undersold the actual risk — there is nothing enforcing which pattern a new feature uses, which means the inconsistency will keep compounding rather than resolving on its own.

**Important capability I failed to identify:** Nora's open-chat surfaces (AI Coach, Couples Session) have **no input classification of any kind**. Every other surface is scoped — the user picks from a fixed set of actions. These two are the only places a user can type anything, and there's no evidence anything checks for sensitive disclosures (self-harm, abuse, crisis language) before Nora just... responds in voice. This isn't a "nice AI architecture pattern" gap, it's a real product-safety gap, and it got buried under "intent processing" scored a 1 with a shrug in the original audit. That was too generous.

**Overly generous because I'm close to the codebase:** the above. I was grading "does a general intent router exist" (correctly: no, not needed) and missed the narrower, much more important question: "does *any* classification happen before Nora responds to free-text input in the two surfaces where that's possible."

### B. Memory

**Keep:** Long-term, semantic, relationship, user profile, memory updates — all genuinely well-evidenced at 4.

**Lower, and this is the harder self-critique:** Memory conflicts (was 3) and memory pruning (was 2-3) — I explicitly wrote in the original audit that I hadn't verified the confidence write-back path or the dormancy-trigger logic, and then scored them anyway based on adjacent code quality. That's exactly the "too close to the codebase" failure mode. Both should be **unverified**, not scored with false confidence.

**Important capability I failed to identify: memory provenance.** `updateNoraMemory()` re-synthesizes `user1_notes`/`user2_notes`/`couple_notes` from existing notes + new input — as far as I can tell this is a **rewrite**, not an append-with-history. If that's correct, there is no record of what the notes said before an update, when a given fact entered memory, or which signal produced it. That means there's no way to audit "why does Nora believe this" or undo a bad inference once it's baked into the summary. I didn't check for this in the first pass and it matters more than almost anything else in the memory section — see Part 3.

### C. Context Engineering

**Lower:** Context construction (was 3) → **2**. I described the block-join pattern as "consistent," but I only verified that in the couple of files I read closely — I shouldn't generalize past that.

**Elevate strategic weight without changing the score:** Token efficiency and prompt caching were scored low (1, 0) and correctly so — but in the original audit I treated them as engineering tidiness. Given the actual business goal (profitable, scalable), cost-per-call compounds directly into unit economics the moment there's more than one couple. Same technical score, higher business priority than I gave it.

### D. Harness

I'd stand by this section, and go further: I didn't grade **idempotency** or **rate limiting** at all in the original pass, and both matter for the reliability work already planned. Idempotency exists in exactly one place I've confirmed (`notifyReflectionReady`'s claim-then-act pattern) — it is not a systematic guarantee across every route that would get retry logic added. Rate limiting: no evidence of any, anywhere. Not urgent at one couple's worth of traffic, but worth naming as a real gap rather than an unexamined one.

### E. Evaluation

Stand by this section without softening — it was already appropriately harsh.

### F. Learning

**Lower, and this is the most important correction in the whole re-pass:** Learning containers, from 4 to **2-3**. I scored this on "do the tables exist" (yes) rather than "do they behave like a learning container should" (recording discrete, attributable, auditable learning events). If `updateNoraMemory` overwrites prose notes rather than appending to a history, what exists is closer to a **mutable belief state** than a learning container. That's a meaningfully weaker thing, and it's the direct mechanism by which bad learning could poison Nora's behavior with zero visibility — see Part 3.

### G. Engineering / H. Product

Stand by both without change. Commercial readiness (1-2) is, if anything, validated more strongly by this exercise, not less.

---

## Part 2 — Classifying the research concepts for Nora

**AI architecture**
- Intent routing — **NOW**, but narrowly scoped: sensitive-content classification on AI Coach / Couples Session input only. Not general intent routing.
- Planning, multi-step reasoning, agent loops, goal-based loops, agent orchestration, multi-agent systems — **NOT APPLICABLE**. No current or foreseeable feature needs any of these.
- Tool calling — **FUTURE / design for, don't build**. Only if a concrete feature (Nora searching Spotify inline, Nora checking real calendar availability) gets prioritized.
- Reflection/self-critique — **NEXT**. Cheap version worth trying on high-stakes generations (Memory Test questions, AI Coach responses) once reliability work is done.
- Verification loops — **NEXT**. Extend the existing narrow pattern (claim classifier) once there's a way to measure whether it's helping.
- Model routing — **partially NOW, already exists**: Haiku for `noraSignal`, Sonnet for everything else, is real (if simple) model routing by call type. Cost-based dynamic routing is FUTURE.

**Memory**
- Semantic, relationship memory — **NOW, exists, keep investing.**
- Episodic memory — **NEXT**, decide if `timeline_events` should feed the claims pipeline more directly.
- Procedural memory — **NOT APPLICABLE** in the agent sense; the real analog (relationship pacing) already exists via the tier system.
- Memory ranking, freshness — **NOW, exists** for claims specifically.
- Memory pruning, conflict resolution — **NEXT**: verify and mature what's there before claiming it works.
- Embedding/vector retrieval, hybrid retrieval — **FUTURE**. No concrete scaling problem yet.
- Learning containers — **NOW to fix**, per Part 1. This is the highest-priority memory item in the whole exercise.
- Memory provenance — **NOW**. Cheap (timestamp + source signal_type on writes), and it's the direct mitigation for the poisoning risk in Part 3.

**Learning**
- Agent traces — **NEXT**, folds into the observability roadmap.
- User corrections — **exists narrowly** (claim classifier); extend opportunistically, not as a new framework.
- Explicit ratings — **NOW, exists** (reaction/rating pills) — but unverified whether they actually influence future content selection. Worth confirming before building anything new here.
- Implicit behavioral signals, learning from failed interventions — **NEXT**. Follow-Through's "declined"/"didn't get to it" is already captured; whether it changes future suggestions is unconfirmed.
- Outcome tracking — **FUTURE**. Needs either a survey instrument or enough couples for usage patterns to mean anything. Not credible at n=1.
- Self-improving prompts — **explicitly resist**. Real risk to voice consistency, which is currently a genuine strength (4/4). Automated prompt mutation without human review is the wrong trade for this product.
- Fine-tuning, custom model training — **NOT APPLICABLE**. No data volume or ROI case; risk of silently degrading quality with no eval framework to catch it.

**Context / harness**
- Prompt caching — **NOW**. Cheap, real cost reduction, directly serves the profitability goal.
- Prompt versioning — **NOW, cheap version only** (comment discipline + git history already does most of this).
- Context budgeting, prioritization (for prompt trimming, not content selection) — **NEXT**.
- Prompt A/B testing — **FUTURE**. Needs real volume to produce a meaningful result.
- Harness portability, provider abstraction — **NOT APPLICABLE**. Would be solving a business risk (vendor lock-in) that doesn't exist yet. This is premature abstraction, i.e. bloat, exactly the thing to avoid.

**Quality**
- Privacy boundary adherence — **NOW**, and should be the very first deterministic test written, full stop. Highest stakes, cheapest to test, doesn't need eval infrastructure to exist first.
- Earned-intimacy adherence, non-repetition, uncertainty handling — **NOW/NEXT**, all genuinely deterministic-testable against existing logic.
- Behavioral specification, acceptance criteria — **NOW**, but as a written document, not infrastructure. Prerequisite for everything else in this section.
- Evals, regression tests (LLM-behavior) — **NEXT**, after the behavioral spec exists.
- LLM-as-judge — **FUTURE**. Real technique, not worth the cost/complexity at current volume.
- Human review — **NOW, already exists** — Matt using the app *is* the current QA process, and that's a legitimate stage-appropriate answer, not a placeholder to apologize for.
- Computer-use verification — **NOT APPLICABLE now**. Solves a real problem (UI regressions) but is disproportionate infrastructure for current team size.
- Production monitoring, trace collection — **NOW**, folds into the harness roadmap already planned.

---

## Part 3 — What is Nora's proprietary intelligence loop, actually?

Stated concretely, using the real architecture:

**interaction** (Spark / Bet / Ritual / Flirt / Date / open conversation / Follow-Through)
→ **Nora call** (`noraChat`/`noraReact`/`noraGenerate`, built from `NORA_VOICE` + tier context + surfaceable claims)
→ **user reaction** (reaction/rating pills, Follow-Through done/declined, claim-response classification)
→ **signal recorded** (`SIGNAL_TYPES`, weighted into `individual_signal_count` / `couple_signal_count`)
→ **memory update** (`updateNoraMemory` rewrites notes, `extractStructuredFacts`, claim confidence adjusts)
→ **tier changes** (crossing a signal threshold changes what Nora is *allowed* to say, not just what it *knows*)
→ **future behavior** (next call gets different claims/tier context)

ChatGPT's example loop is directionally right, but it's missing the step that actually makes this proprietary rather than generic: **the tier gate.** "A model that learns from feedback" is true of every AI product with any memory at all. "Learning is only permitted to change behavior once trust has been *earned*, calibrated per person, not just accumulated as data" is not generic — that's the real asset, and it's already built (`getSurfaceableClaims`'s TENTATIVE/DIRECT gating).

**Signals already captured:** reactions, ratings, claim confirm/deny/reframe, Follow-Through outcomes, weighted engagement counts, multi-week drift detection.

**Signals missing:** any explicit "is this helping" signal; skip/ignore behavior as a distinct negative signal (vs. just not incrementing a count, which looks identical to "hasn't gotten there yet"); timing/context of engagement.

**What should become durable memory:** claims that survive the confidence threshold *and* get confirmed rather than contradicted; structured facts; patterns that repeat, not single data points.

**What should NOT become memory:** unconfirmed single inferences promoted straight to fact (the >0.70 confidence gate already guards this — worth naming as a real, working guardrail, not just a number). Anything from one partner's private conversation reaching couple-facing content (`nora_private_notes`'s separation already guards this — same point, it's core IP, not just a bug fix).

**What should eventually influence evaluation, and is sitting unused right now:** `classifyClaimResponse` already computes whether a surfaced claim got confirmed, denied, or reframed. Nobody aggregates that. A claim-confirmation-rate metric is a real, free, already-computed quality signal for "is Nora's reading of this couple actually accurate" — and it doesn't exist as a number anywhere today. This is the single cheapest, highest-value thing this whole exercise surfaced.

**What should remain isolated by user/couple:** private notes (enforced today). Principle to hold even with zero code today: if cross-couple analytics ever get built, no single couple's specific claims may ever influence another couple's Nora output, even in aggregate-derived form.

**Where bad learning could poison Nora's behavior — the real answer:** the memory-overwrite-without-provenance gap from Part 1. If `updateNoraMemory` rewrites the couple's notes rather than appending to an auditable history, one bad LLM inference can silently replace correct context with wrong context, with no record it happened and no way to roll it back. A perfectly *reliable* system (uptime, retries, no crashes) can still confidently and permanently tell a couple something false forever. Reliability engineering doesn't touch this at all — it's a different failure class entirely.

---

## Part 4 — Evals as behavioral specification

| Category | Measuring | Failure looks like | Deterministic? | LLM judge? | Human? | Production-measurable? |
|---|---|---|---|---|---|---|
| Privacy boundary adherence | Private notes never reach couple-facing prompts | User1's private disclosure appears in something shown to User2 | **Yes — write this first** | No | Spot-check | Yes (can be asserted on every call) |
| Earned-intimacy adherence | TENTATIVE claims never asserted as DIRECT below tier | A claim states plainly what should've been hedged | Yes | No | Spot-check | Yes |
| Non-repetition | Same question/prompt not repeated within its cooldown | Duplicate Bet/Memory question inside 90 days | Yes | No | No | Yes |
| Uncertainty handling | Hedge language present when confidence/tier says it should be | Overconfident phrasing on a low-confidence claim | Mostly | Some | Some | Partially |
| Factual accuracy | Stated fact matches source data | Hallucinated detail not in Spark/Bet/Timeline data | Partial | Yes | Spot-check | Yes — via claim-confirmation rate (already computed, unused) |
| Memory accuracy | Notes/summary reflect what actually happened | Notes drift from reality over successive rewrites | No | Yes | Yes | Partial |
| Relationship-pattern accuracy | Detected drift/pattern is real, not noise | False-positive concern flagged | No | Yes | Yes | Partial |
| Tone/personality consistency | Output matches `NORA_VOICE` | Generic, off-brand, or wrong-register response | No | **Yes — good fit** | Spot-check | No |
| Intervention timing/restraint | Nudges land well, Nora knows when *not* to speak | Naggy, mistimed, or intrusive prompt | No | Partial | Yes | Partial (decline-rate over time) |
| Usefulness / outcome effectiveness | Did this actually help the couple | No measurable change in engagement/satisfaction | No | No | Yes | Only at real volume — FUTURE |

**Two categories missing from the original list, both worth adding:**
- **Safety/crisis handling** — does Nora respond appropriately if a user discloses something serious. Belongs in the spec even before the underlying capability (Part 1/2's intent-classification gap) is built, because it's the category where failure is highest-stakes.
- **Cross-partner consistency** — does Nora's read of the *same* shared event stay coherent between what it tells partner A vs. partner B. A subtle problem specific to a two-sided product that a single-user AI companion would never have to solve.

---

## Part 5 — Reliability stress test

Retry and observability were ranked #1/#2 in the original audit. Stress-tested conclusion: **mostly right, but the order needs one correction.** Adding retry logic to `noraCall()` without first confirming idempotency at each call site is a new risk, not a pure fix — a retried call whose side effect (a memory write, a push notification) *isn't* idempotent could double-fire. `notifyReflectionReady` proves the idempotent claim-then-act pattern already exists and works; it just isn't universal. Revised: **idempotency audit and retry ship together**, scoped first to call sites already safe to retry, rather than retry-first-everywhere.

Everything else from the expanded list, prioritized rather than dumped wholesale:

- **Do now, bundled with the above:** timeout handling (partially done — sweep remaining routes), structured logging, latency measurement, token/cost tracking, basic error classification. These are facets of one observability investment, not five separate projects.
- **Do next:** rate limiting (low urgency at current traffic, real before wider signup), concurrency control (formalize the pattern that already exists ad hoc), CI + unit tests for pure functions, deployment gates.
- **Future, not yet justified:** alerting and synthetic monitoring (no one but Matt to alert yet, and log-reading is still cheap at this volume), integration testing, AI regression testing (needs the eval framework from Part 4 first), load testing (no current scale problem).

---

## Part 6 — What NOT to build

Every item here is something that would add real surface area — new dependencies, new failure modes, new things that could silently break what already works — without a concrete Nora problem driving it:

- **Agent frameworks** (LangGraph, etc.) — no feature demands the control-flow model they provide.
- **Vector databases / RAG infrastructure** — no scaling problem exists yet; the current claims table handles current memory volume fine.
- **Multi-agent orchestration** — no evidence this helps a relationship companion; pure coordination overhead.
- **Custom model training / fine-tuning** — no data volume or ROI case, and no eval framework yet to even detect if a fine-tuned model quietly got worse.
- **Self-improving / auto-optimizing prompts** — directly threatens the one thing that's a genuine 4/4 strength today (voice consistency). Automated mutation without human review is the wrong trade here specifically.
- **Elaborate tool-calling systems** — if a concrete feature needs one tool call later, build that tool call. Don't build a general framework speculatively.
- **Provider / harness abstraction** — solves a vendor-lock-in risk that isn't real yet. This is premature abstraction, which is its own form of bloat.
- **LLM-as-judge at scale** — real technique, wrong cost/complexity trade at current volume; human spot-checking is cheaper and sufficient today.
- **A/B testing infrastructure** — needs real user volume to produce a meaningful signal.
- **Computer-use/browser UI verification** — solves a real problem (the dead-space bug class) but is disproportionate infrastructure for current team size; a lighter design-QA step is the right first fix.

---

## Part 7 — Revised roadmap

**DO NOW**

| Item | Why it matters | Exists today | Missing | Complexity | Depends on | Strategic value |
|---|---|---|---|---|---|---|
| Idempotency audit + scoped retry | Retry without idempotency is a new risk, not a fix | One proven pattern (`notifyReflectionReady`) | Universal application | Low-Medium | Nothing | Directly prevents recurrence of today's bug class |
| Observability (latency/status/error class on `nora_calls` + general request log) | Turns diagnosis into log-reading instead of code-reading | `nora_calls` table (route/model/tokens) | Latency, status, error type, broader route coverage | Low | Nothing | High — this is what today's Memory Test bug needed to be found in seconds instead of minutes |
| Memory provenance (timestamp + source signal on note/claim writes) | Direct mitigation for silent memory poisoning (Part 3) | Nothing | Any write history at all | Low | Nothing | High — foundational for future audit/eval work |
| Privacy-boundary deterministic test | Highest-stakes failure mode, cheapest to test | Manual discipline only | Any automated assertion | Low | Nothing | Very high — trust-critical |
| Prompt caching | Real cost reduction, scales with couple count | Nothing | `cache_control` on `NORA_VOICE` | Low | Nothing | Direct commercial value |
| Sweep other Nora-calling routes for the sequential-query/timeout pattern | Same bug class as Memory Test, likely recurring | One route fixed | Audit of the rest | Low-Medium | Nothing | Prevents the next version of today's bug |
| Narrow sensitive-content classification on AI Coach / Couples Session | Real product-safety gap, not an AI-architecture nicety | Nothing | Classification + a defined escalation path | Medium | **A product decision from you** on what Nora should actually do when it detects something serious | High — matters before wider commercial exposure |

**DO NEXT**
- Behavioral specification write-up (Part 4's categories, as a document — no infrastructure yet).
- Minimal CI (lint + pure-function tests) + deployment gate.
- Confirm existing feedback signals (reaction pills, Follow-Through decline) actually influence future content selection, not just sit as stored telemetry.
- Aggregate the claim-confirmation/rejection rate `classifyClaimResponse` already computes into a real, visible quality metric.
- Extend the verification-loop pattern to 1-2 more surfaces once observability shows where it's most needed.
- Centralize context assembly for routes still doing inline fetching.

**DESIGN FOR, DON'T BUILD**
- Tool calling — don't build a framework; don't structurally block adding a `tools` param to `noraCall` later either.
- Embeddings/vector retrieval — keep memory writes clean and provenanced now so this is an addition later, not a migration.
- Model routing beyond call-type — current Haiku/Sonnet split is fine; don't hardcode assumptions that would make adding a route painful.
- Cross-couple analytics privacy boundary — no code needed today, just hold the principle before anything like this gets built.

**IGNORE**
Everything in Part 6.

---

## Part 8 — Final challenge

**If we followed the original roadmap exactly, what would we fail to build?**
A more *reliable* version of exactly the same product. Retry, observability, caching, CI — all real, all correctly prioritized as engineering hygiene — but none of them touch two things that don't look like "broken routes": the safety gap on open-chat surfaces, and the memory-provenance gap. Both are cases where the system works *exactly as designed*, and the design has a blind spot. Reliability engineering doesn't find those; only asking "is the design itself complete" does.

**What's the single most important capability the original audit under-weighted?**
A way to know when Nora is *wrong*, not just a way to know when Nora is *down*. The entire original roadmap is about availability. Almost nothing in the current architecture — or in what I proposed — answers "did Nora just tell this couple something false or unhelpful, and would we ever find out." The seed of the answer is already built and sitting unused: `classifyClaimResponse`'s confirm/deny/reframe classification is a real correctness signal that nobody is currently looking at.

---

## Bottom Line

1. **Nora's real moat is tier-gated, earned-trust disclosure** — not "has memory." Protect that design principle above nearly everything else on this list.
2. **The biggest risk isn't downtime, it's silent memory corruption** — a bad inference overwriting good context with no audit trail. Fix provenance before almost anything else.
3. **Ship idempotency and retry together, idempotency first.** Retry without it is a new risk, not a pure fix.
4. **A real quality signal already exists and is being wasted**: the claim-confirmation/rejection rate computed inside `classifyClaimResponse`. Surface it before building any new eval infrastructure.
5. **Privacy-boundary correctness should be the first deterministic test written**, full stop — cheapest to build, highest stakes, doesn't need eval infrastructure to exist first.
6. **Don't build agent frameworks, vector search, fine-tuning, or provider abstraction until a concrete Nora problem — not a trend — demands it.** Every one of them adds real surface area for zero current benefit.
7. **The one real product gap this exercise surfaced: open-chat surfaces have no handling for sensitive disclosures.** This needs a decision from you, not just an engineering fix, and belongs before wider commercial exposure.
8. **"Design for, don't build" is the right posture for tool-calling, embeddings, and model routing** — keep the data clean and the interfaces uncluttered now so they're additive later, not rewrites.
