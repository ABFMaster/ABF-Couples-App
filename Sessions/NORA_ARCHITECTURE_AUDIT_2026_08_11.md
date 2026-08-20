# Nora Architecture Audit — Evidence-Based
**Date:** Aug 11 2026
**Method:** Direct inspection of lib/, app/api/, components/, package.json, and deploy config. No test suite or CI exists to run, so "production quality" judgments are based on code inspection, not automated verification. This is a working draft for discussion — not committed to git yet.

**Scope note, stated up front so the grades below aren't over-read:** I read the core LLM call layer (lib/nora.js) in full, the memory system (lib/nora-memory.js) in full, the dashboard hero orchestration route, the cron orchestration route, api-auth.js, checkin-patterns.js's header, and grepped the full repo for retry logic, observability tooling, test infrastructure, and CI config. I did **not** read all ~90 API routes line by line — where a grade depends on a pattern I only sampled (e.g. "is context assembly centralized everywhere"), I've said so explicitly rather than generalizing from one file.

---

## Phase 1 + 2 — Discovery & Grading

### A. AI Architecture

| Capability | Score | Evidence | Limitation |
|---|---|---|---|
| Intent processing | 1 | No general intent router. Each surface (Spark, Bet, Weekly Reflection, Memory Test...) calls a hardcoded Nora function for a hardcoded purpose — the "intent" is decided by which button the user tapped, not inferred from what they said. | Fine for a feature-scoped companion, but if you ever want a single "talk to Nora about anything" entry point that figures out what's being asked, that layer doesn't exist yet. |
| Planning | 0 | No task decomposition anywhere. Every Nora call is one prompt → one completion. | — |
| Prompt construction | 3 | `buildSystem()` (lib/nora.js:30-43) layers `NORA_VOICE` + a per-context register note (`game_room`/`daily`/`conversation`/`verdict`) + route instructions, consistently, everywhere. Route-level user prompts are hand-built template strings with real couple data interpolated (e.g. the Memory Test question prompt in `challenge/generate/route.js:283-326`). | Entirely manual string templating — no structured prompt builder, no versioning, no A/B capability. Works, but every prompt change is a hand-edit with no way to compare old vs. new behavior. |
| Context assembly | 3 | `getFullNoraContext()` (lib/nora-memory.js:594) is a real single entry point that pulls memory briefing + tier context + surfaceable claims into one block. | Not universally adopted — `challenge/generate/route.js` does its own separate Spark/Bet/Timeline/Dates/Flirt fetching (lines 164-282) rather than calling the shared context function. Two parallel context-assembly patterns exist side by side. |
| Tool selection | 0 | No Anthropic tool-use/function-calling anywhere — `anthropic.messages.create()` in lib/nora.js never passes a `tools` array. | — |
| Tool calling | 0 | Same as above. "Tool-like" actions (fetch Spark answers, write memory) are done by application code around the LLM call, never by the model itself. | — |
| Multi-step reasoning | 0-1 | Single-shot completions only. No chain-of-thought scaffolding, no self-directed multi-turn reasoning. | — |
| Agent orchestration | 0 | What looks like orchestration (the cron route, the dashboard hero priority waterfall) is deterministic application code calling Nora as a stateless text-generation service — not an agent making its own control-flow decisions. | — |
| Agent loops | 0 | No observe→act→observe loop. | — |
| Goal-based loops | 0 | No persistent goal state the system works toward across turns. | — |
| Verification loops | 2 | Real, but narrow, in two places: (1) `classifyClaimResponse()` (nora-memory.js:701) watches how a user responds to a claim Nora surfaced and classifies confirm/deny/reframe. (2) `challenge/generate/route.js:370-381` checks whether the generated memory question is actually about the right partner and falls back to a library prompt if Nora got it backwards. | Both are hand-built, single-purpose checks — not a general "verify before returning" layer. |
| Reflection/self-critique | 0 | No second LLM pass reviewing the first call's output before it reaches the user. | — |
| Response generation | 4 | Mature and consistent. Five well-scoped entry points (`noraChat`/`noraReact`/`noraVerdict`/`noraGenerate`/`noraSignal`, lib/nora.js:103-160) each with sensible model/token defaults for their use case. | — |

**Overall read:** This is not an agentic architecture, and it was never trying to be one. It's a *voice-consistent generation layer* wired into deterministic application logic. That's a legitimate, deliberate choice for a relationship companion — the risk in the audit framework above is that most of "AI Architecture" as ChatGPT's prompt defines it (planning, tool calling, agent loops) doesn't apply to what Nora actually is. Don't read the 0s as failures; read them as "not attempted, and arguably not needed yet."

---

### B. Memory

| Capability | Score | Evidence | Limitation |
|---|---|---|---|
| Short-term memory | 3 | Conversation history persisted for Couples Session and AI Coach (message arrays passed into `noraChat`). | Not deeply inspected this pass — didn't verify trimming/windowing behavior as a conversation grows long. |
| Long-term memory | 4 | `nora_memory` table: `user1_notes`, `user2_notes`, `couple_notes`, `memory_summary`, all actively maintained via `updateNoraMemory()` (nora-memory.js:845). | — |
| Semantic memory | 4 | `nora_claims` table — typed claims with a confidence score, tiered disclosure (`getSurfaceableClaims`, nora-memory.js:650), and a corrigibility classifier that updates confidence from real user pushback. This is genuinely more sophisticated than a flat memory blob. | — |
| Episodic memory | 3 | `timeline_events` is a structured, queryable episodic store (title/date/type/description), used directly in Memory Test generation. Most other events get folded into prose notes rather than kept individually queryable. | — |
| Procedural memory | 0-1 | No evidence Nora adapts *how* it operates (pacing, format, verbosity) based on what's worked before for this specific couple. | — |
| Relationship memory | 4 | `couple_notes` + shared claims + timeline together give a real couple-level (not just per-person) memory layer. | — |
| User profile memory | 4 | `user_profiles`, individual notes, `lib/assessment-memory.js`. | — |
| Memory retrieval | 2 | Direct table reads by couple_id — no embeddings, no similarity search, no ranked retrieval over a large corpus. Works fine at current memory volume; will not scale to "search 2 years of history for the relevant thing" without a rewrite. | — |
| Memory ranking | 3 | Claims explicitly ranked by confidence, capped at top 6 (nora-memory.js:658-659). | Only claims are ranked this way — notes/timeline are not. |
| Memory pruning | 2-3 | `dormant_linked_claim_id` on `nora_claims` implies claims can be superseded/retired, not just accumulate forever. | Didn't verify the actual dormancy-trigger logic this pass — flagging as evidence a lifecycle exists, not confirming its maturity. |
| Memory updates | 4 | `updateNoraMemory()` is signal-typed and weighted (66 lines of `SIGNAL_TYPES`/weights, nora-memory.js:15-122) — every meaningful in-app action maps to a specific update path. | — |
| Memory quality | 3 | Dual representation: `extractStructuredFacts()` (structured) alongside prose notes (narrative) — more robust than either alone. | — |
| Memory conflicts | 3 | `classifyClaimResponse()` is a real conflict-resolution mechanism — a claim that gets contradicted by the user should (need to verify the actual confidence-adjustment write-back this pass didn't confirm) lower its own confidence. | Read the classifier's *input* construction, not confirmed the confidence write-back path end to end. |
| Memory freshness | 3 | Tier gating (Earned Intimacy requires 16+ signals), and `checkin-patterns.js` explicitly requires 2+ consecutive weeks of a pattern before flagging drift (task #136) — real anti-staleness, anti-false-positive design. | — |

**Overall read:** This is the strongest category in the whole codebase. The claims/confidence/tier system in particular is a genuinely well-designed piece of architecture — most consumer AI companion products don't have anything this deliberate about *pacing* what the AI is allowed to say based on earned trust.

---

### C. Context Engineering

| Capability | Score | Evidence | Limitation |
|---|---|---|---|
| Context construction | 3 | Consistent block-join pattern (`[noraBriefing, tierContext, claimsBlock].filter(Boolean).join()`). | — |
| Context prioritization | 2 | The dashboard hero route has a genuine explicit priority-1-through-5 waterfall (birthday pre-empt → date night → ritual → promo rotation, etc.) for *what content to show*. There's no equivalent for *what to include in a prompt when the context is getting large* — no token-budget-aware trimming. | — |
| Token efficiency | 1 | No token counting, no budget logic. `maxTokens` is a hardcoded per-call-type constant (the Memory Test bug fixed today was exactly this: 600 vs. 1100, tuned by hand after a failure, not computed). | — |
| Prompt caching | 0 | Confirmed absent — `anthropic.messages.create()` in lib/nora.js:86-91 never passes `cache_control`. Every call re-sends the full `NORA_VOICE` system prompt from scratch. | This is a real, cheap win — see roadmap. |
| Dynamic context | 3 | Context genuinely varies per couple/signal-count/claims — not static. | — |
| Retrieval strategy | 1-2 | Direct fetch, not similarity-based. Same limitation as memory retrieval above. | — |
| Duplicate prevention | 3 | Multiple independent, hand-built dedup mechanisms: `usedQuestions`/`usedKeys` for challenge prompts, promo rotation's anti-repeat cooldown + frequency cap (hero route, `hero_cache.promo_type`), 90-day recyclable-prompt pools. | Each was built separately per feature rather than as one shared utility — works, but is duplicated logic. |
| Context compression | 2 | `getMemoryBriefing()` exists specifically to compress raw memory rows into an injectable text block. | Simple truncation/formatting, not hierarchical summarization — will need revisiting once `memory_summary` itself gets long. |

---

### D. Harness

| Capability | Score | Evidence | Limitation |
|---|---|---|---|
| Overall harness architecture | 2 | `noraCall()` (lib/nora.js:76-98) is the entire harness — one function wrapping the SDK call, system-prompt build, and fire-and-forget logging. No orchestrator, no runtime. | Appropriately thin for what the product needs today; would not support agentic features without real investment. |
| Agent runtime | 0 | None. | — |
| Retry logic | 1 | Effectively absent. `noraCall()` has no retry/backoff around `anthropic.messages.create()` — a transient API error propagates straight to the caller's route-level try/catch and becomes a 500. The one retry that exists anywhere (`app/api/spotify/search/route.js:112-126`) is a narrow, hand-written 401-refresh retry, not generic infrastructure. | This is a real gap — a transient Anthropic API hiccup currently reads to the user exactly like the timeout bug fixed today: "Something went wrong." |
| Failure handling | 3 | Pervasive, consistent pattern: every route wraps in try/catch and returns a graceful error JSON (88 files use `console.error`). Good baseline discipline. | Handling = "catch and return a clean error," not "recover and succeed anyway." |
| State management | 3 | Mostly stateless request/response with the DB as source of truth. Where real client state machines exist, they're well-designed — `FollowThroughCard`'s resting/entering/flipping/settled phase machine (components/FollowThroughCard.js:230) is genuinely careful work. | — |
| Routing | 3 | Standard Next.js file-based API routing. No dynamic/LLM-driven routing, but none is needed. | — |
| Model abstraction | 3 | Five named call types give a clean call-type abstraction over the raw SDK. | — |
| Provider abstraction | 0-1 | Hard-coded to Anthropic — `@anthropic-ai/sdk` is the only LLM dependency in package.json. No provider-agnostic interface. | Only matters if multi-provider fallback or cost-routing ever becomes a goal. |
| Logging | 2 | `console.error` everywhere (Vercel captures these) + a dedicated `nora_calls` table (route/context/model/input+output tokens per call, lib/nora.js:56-73). | No structured/leveled logging, no correlation ID tying a user request to its DB writes and its Nora call together. |
| Observability | 1 | No APM, no tracing platform, no dashboards beyond manually querying Supabase tables. Confirmed no Sentry/Datadog/PostHog/OpenTelemetry in package.json. | When something breaks in production, diagnosis today = Matt describing symptoms in chat, me re-reading code and reasoning about it (exactly what happened with the Memory Test bug this session) — there's no log/trace to just go look at. |
| Trace collection | 1 | `nora_calls` is the only trace-like artifact, and it only covers Nora calls specifically (route, model, tokens) — no latency, no full request trace, no non-LLM route coverage. | — |

**Overall read:** This is the weakest category, and it's the one most directly responsible for today's Memory Test bug being hard to diagnose — I had to reason my way to the root cause from reading code, because there was no log or trace that would have shown "this request ran long and got killed." That's not a criticism of the fix, it's a structural gap: **the harness has no way to tell you why something failed, only that a route returned a 500.**

---

### E. Evaluation

| Capability | Score | Evidence |
|---|---|---|
| Response quality evaluation | 0-1 | None automated. Quality control today is Matt using the app and reporting what feels off. |
| Internal verification | 1-2 | Narrow, feature-specific only (memory-question person-check, claim classifier). |
| Hallucination checking | 1-2 | One real, deliberate instruction: the Memory Test prompt explicitly requires citing a real data point or returning `answerType: "unknown"` rather than inventing an answer (challenge/generate/route.js:310). No automated fact-checking pass against the source data. |
| Tool verification | N/A | No tool calling exists to verify. |
| Memory verification | 2 | `classifyClaimResponse` doubles as memory verification against real user feedback. |
| User outcome evaluation | 0-1 | No measurement of whether Nora's output actually helped — signal counts are a proxy for engagement, not for outcome quality. |
| Acceptance criteria | 0 | None formalized anywhere. |
| Automated evals | 0 | None found in the repo. |
| Regression testing | 1 | The single closest thing in the entire codebase is the synthetic-history stress test built for checkin-patterns.js (task #138) — a one-off script, not a suite, and it doesn't run in CI because there is no CI. |

**Overall read:** This category is close to a blank slate. It's the natural next investment once the product stabilizes, because right now every "is this still working" question gets answered by a human reading code or a human hitting a bug live — there is no cheap, repeatable way to check "did my change break Nora's voice / the claims system / the memory pipeline."

---

### F. Learning

| Capability | Score | Evidence |
|---|---|---|
| Learning from user edits | 0-1 | No capture of "user edited/rejected Nora's suggestion" as a distinct learning signal. |
| Learning from conversations | 4 | `shouldUpdateMemory()` + `updateNoraMemory()` — every meaningful conversation updates persistent notes. This is real and it's the backbone of the whole memory system. |
| Learning from agent failures | 0-1 | No systematic loop. Failures get fixed by a human reading logs/code (me, this session, repeatedly) — there's no "log the failure, feed it back into anything" mechanism. |
| Learning from successful interactions | 2 | Reaction/rating pills capture explicit positive/negative feedback per activity (`mine.reaction_icon`, `mine.question_rating` on Bet). Bet questions do have category tagging + rotation weighting (task #99), but I did not confirm this pass whether it's actually reaction-informed vs. purely diversity-informed — flagging as unverified rather than claiming the loop is closed. |
| Learning containers | 4 | `nora_memory` + `nora_claims` + `nora_private_notes` together are exactly the right substrate for this — a clean place for learning to live. |
| Feedback loops | 2-3 | Strongest instance: `classifyClaimResponse`. Weaker/simpler instance: reaction pills. |
| Memory evolution | 3 | Confidence adjustment + `dormant_linked_claim_id` both point at claims genuinely evolving/getting superseded over time, not just accumulating. |

---

### G. Engineering

| Capability | Score | Evidence |
|---|---|---|
| Code organization | 3 | Clear `lib/` (business logic) vs `app/api/` (routes) vs `components/` (UI) separation, consistent naming throughout. |
| Separation of concerns | 3 | Generally good (auth in `lib/api-auth.js`, memory in `lib/nora-memory.js`, LLM calls in `lib/nora.js`) — though some routes duplicate the "fetch context, build prompt" pattern inline instead of calling the shared helper (see Context Assembly above). |
| Scalability | 2 | Serverless functions on Vercel; the just-fixed Memory Test bug (5 sequential DB round-trips where 5 parallel ones would do) is exactly the kind of pattern that likely exists unaudited elsewhere. Cron processes couples in a loop within a single function invocation — fine at current scale, would need a queue/worker model at meaningfully larger scale. |
| Testing | 0 | Confirmed: no test framework in package.json, no `__tests__`/`test`/`tests` directory anywhere in the repo. |
| CI/CD | 1 | Confirmed: no `.github/workflows`, no CI config of any kind. Deploy is `git push` → Vercel auto-deploy with zero automated quality gate before code reaches production. |
| Security | 4 | Real strength, and hard-won: a dedicated multi-sprint BOLA/confused-deputy remediation swept 71+ routes (tasks #47, #63-#93), server-side `requireUser`/`verifyCoupleMembership` helpers are used consistently, RLS policies were added for previously-open tables. The fact that a similar bug (`challenge/generate` race condition) was still being found and fixed this same period shows this is disciplined manual vigilance, not a systematized guarantee — there's no linter or test that would catch a *new* route shipping without auth. |
| Performance | 1-2 | No load testing, no synthetic monitoring. Performance issues (today's Memory Test timeout) are found reactively, by a live user hitting them, not caught before shipping. |
| Maintainability | 4 | Genuinely unusual strength — nearly every file read this session has inline comments explaining *why*, not just *what* (e.g. the checkin-patterns.js header explaining exactly how and why the old mood/connection_score logic was silently wrong). This matters more than it sounds like for a codebase with no tests: the comments are partially compensating for the missing safety net by making intent legible to whoever reads the code next. |
| Technical debt | 3 | Actively tracked, not hidden — dead tables flagged (`today_responses`), orphaned routes flagged (Spotify OAuth routes after the Client Credentials switch), dead components actually removed (`SongFlirtCard.js`). |

---

### H. Product

| Capability | Score | Evidence |
|---|---|---|
| Nora personality consistency | 4 | Single source of truth (`NORA_VOICE`) + context-specific register notes, applied everywhere through one function. |
| Emotional intelligence | 4 | The tiered-intimacy claims system — "hold it tentatively," "you've earned the right to say this directly" — is a genuinely sophisticated design choice most companion products don't bother with. |
| User experience | 3-4 | Deep, deliberate UX engineering throughout (tab-visibility-based triggers instead of fixed timers, careful fade/flip animation sequencing). But UX bugs (mobile clipping, the dead-space gap fixed today, silent push failures) have consistently been caught by Matt using the live app, never by a design-QA pass — UX verification is entirely reactive. |
| Relationship intelligence | 4 | Follow-Through, claims, weighted signals, drift detection in checkin-patterns.js — a genuinely differentiated feature set, not generic chatbot behavior. |
| Session continuity | 3-4 | Couples Session (shared live chat + history) plus the private/shared notes separation is real, careful design. |
| Commercial readiness | 1-2 | No billing/subscription system observed in this pass. No automated onboarding metrics. Zero test/CI safety net before a change reaches production. Most importantly: **every feature in this codebase has been built and tested against exactly one couple** (you and Cass) — there's no evidence yet of what happens with real variance across many couples' data shapes, edge cases, or usage patterns. |

---

## Phase 3 — Stress Test

Running the "does this already exist?" check against the categories where a rebuild might feel tempting:

- **"Nora needs a memory layer"** — No. It has one, and it's the strongest part of the codebase (claims + confidence + tiers + notes). Any AI-articles idea here should be framed as *extending* this (e.g., embeddings-based retrieval on top of the existing claims table) not replacing it.
- **"Nora needs an agent framework"** — Genuinely doesn't exist, but also isn't clearly needed yet. Before adopting LangGraph/an agent framework/tool-calling, the actual question is: is there a real feature that requires multi-step autonomous reasoning? (Possibly: a "plan next week's dates based on our history" feature would. Today's feature set doesn't.)
- **"Nora needs observability"** — This one's real and cheap relative to its payoff. You already have the pattern (`nora_calls` table) — it just needs latency, error status, and a couple more dimensions to become genuinely useful for diagnosing exactly the kind of bug fixed today.
- **"Nora needs prompt caching"** — Real, cheap, no architecture change required — this is a parameter to add to one function (`lib/nora.js`), not a rebuild.
- **"Nora needs tests"** — Real gap, but the honest scope question is *what* to test first: pure functions (`checkin-patterns.js`'s computation functions, already isolated for exactly this reason) are cheap to test and already structured for it; testing LLM output quality is a much bigger, different problem (see Evaluation).

---

## Phase 4 — Gap Analysis

**Build Now**
1. Retry/backoff around `noraCall()` — currently a transient Anthropic API error reads identically to a real bug (a bare 500 → "Something went wrong"). One function, contained blast radius, directly prevents a recurrence of today's bug class.
2. `maxDuration` + parallelized queries audited across the other Nora-calling routes (dashboard/hero, ai-coach, ritual, wednesday/thursday) — the Memory Test bug fixed today is a pattern, not a one-off; worth a quick pass to check which other routes stack sequential queries in front of an LLM call.
3. Prompt caching on `NORA_VOICE` — cheap win, real cost/latency reduction, zero architecture change.
4. Extend `nora_calls` logging with latency + success/failure status — turns your one existing telemetry table into an actual debugging tool.

**Build Later**
1. A real eval harness for Nora's outputs — even a small set of "given this couple data, does the memory-question generator produce something reasonable" checks would catch regressions before Matt does.
2. Embeddings-based memory retrieval — only worth it once memory volume per couple is large enough that "fetch the row" stops being sufficient (not clearly true yet at one couple's worth of data).
3. Centralize context assembly — route the couple of routes still doing inline data-fetching (like `challenge/generate`) through `getFullNoraContext()` where it fits, reducing duplicated fetch logic.
4. CI: even a minimal pipeline (lint + a handful of pure-function unit tests) before Vercel deploy would catch a real class of mistakes for free.

**Ignore (for now)**
1. Agent orchestration frameworks / tool-calling / multi-step planning — no current feature needs it; adopting one speculatively adds real complexity for a capability nothing in the product asks for yet.
2. Multi-provider LLM abstraction — only matters for cost-routing or provider outage resilience, neither of which is a live problem at current scale.
3. Vector DB / RAG infrastructure — same reasoning as embeddings-based retrieval above; premature at current memory volume.

---

## Phase 5 — Prioritized Roadmap

| # | Item | Impact | Complexity | Risk | Strategic value |
|---|---|---|---|---|---|
| 1 | Retry/backoff in `noraCall()` | High | Low | Low | Directly prevents recurrence of today's bug class |
| 2 | Latency + status fields on `nora_calls` | High | Low | Low | Turns diagnosis from "read code and reason" into "look at a table" |
| 3 | Audit other Nora routes for the sequential-query pattern | Medium-High | Low | Low | Same bug class, other surfaces |
| 4 | Prompt caching | Medium | Low | Low | Cost/latency, no behavior risk |
| 5 | Minimal CI (lint + pure-function tests) | Medium | Low-Medium | Low | Cheap ongoing insurance |
| 6 | Centralize context assembly for remaining routes | Medium | Medium | Low | Reduces duplicated logic, not urgent |
| 7 | Small eval harness for Nora output quality | Medium-High | Medium | Low | First real quality safety net |
| 8 | Embeddings/RAG memory retrieval | Low today, grows over time | High | Medium | Not yet — revisit once memory volume justifies it |
| 9 | Agent/tool-calling framework | Unclear — no feature demands it yet | High | Medium-High | Only pursue if a specific feature (e.g. autonomous date-planning) requires it |

Items 1-4 are all small, contained, and directly trace back to real bugs you've hit (this session alone). That's where I'd start.

---

## Open questions for the ChatGPT side of this discussion

- Where does the 40+ articles' framework diverge most from what's actually here — is there a specific category above where you read something that made you think "we're missing X" and I should go verify X specifically before we agree it's a gap?
- Is there a concrete near-term feature (autonomous planning, cross-session tool use) that would actually justify agent orchestration, or is this audit item more "keep an eye on the field" than "build this"?
