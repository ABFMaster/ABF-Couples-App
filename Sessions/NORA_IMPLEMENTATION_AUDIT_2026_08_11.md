# Nora — Implementation-Ready Engineering Plan
**Date:** Aug 11 2026. Final code-level audit of the five changes proposed at the end of the v0.1 spec. Discussion draft — no code written yet, per your instruction.

---

# 1. Final Verdict

The v0.1 architecture survives code verification. Notes-overwrite location, tier duplication, and the safety gap are all exactly where the spec said they'd be. One real finding surfaced this pass that the spec left open (Part 10: "does repeated evidence without explicit user response change confidence?") — I traced it and the answer is **yes**, via a path called `REINFORCE` that I hadn't fully read before. It doesn't invalidate any of the five proposed changes, but it does put a real dent in how airtight the "beliefs only move through demonstrated confirmation" story is. Full detail in Part 7 — I want this in front of you before anything else, because it's more important than any of the five implementation items.

**Solid, unchanged:** notes overwrite at `updateNoraMemory`'s upsert; tier duplication (confirmed — both implementations use identical thresholds today, so it's real duplication but not yet drift); the safety gap (confirmed exactly: crisis instruction is in-prompt only, memory write is unconditional in both routes).

**Changed by this pass:** the REINFORCE finding (Part 7).

**Still uncertain:** whether `nora_claims` has a `created_at` column — never explicitly set on insert, never selected in any query I've read. Needed for the confirmation-rate metric's time-period slice. One-line check needed before building item 4 (see Part 6).

---

# 2. What I Would Build Now

### 1. Sensitive-content gate + memory-write suppression

**A. Current implementation.** Verified in full this pass: `app/api/ai-coach/route.js` and `app/api/couples-session/route.js` both embed a "CRISIS DETECTION" instruction in their system prompts (hotline numbers, encourage professional help). Neither route does anything with user input *before* generation — the message goes straight to `noraChat` (ai-coach line 395, couples-session line 209). Both routes call `updateNoraMemory()` **unconditionally** after every turn (ai-coach lines 425-444; couples-session lines 234-246) — no branch, no check. What's missing: any pre-generation classification, and any conditional skip on the memory write. The proposed change is still necessary and is the smallest fix for a demonstrated (not hypothetical) gap.

**B. Hidden dependencies.** `shouldUpdateMemory()` (nora-memory.js:128-135) is the exact existing pattern to model this on — a single `noraSignal` call, tiny `maxTokens`, returns a boolean, **fails toward `false` on any error** (`catch { return false }`). That convention matters: it tells us how this codebase already handles "what happens when a cheap classifier errors" for this exact call shape, and I'd match it (see the open decision in Part 6). Both routes independently build their system prompt and call `noraChat` — there's no shared "send a Nora message" helper to hook into once, so the gate has to be added at two call sites, not one. AI Coach additionally increments weekly usage (`incrementWeeklyUsage`) *after* the AI call succeeds (line 449) — if a flagged turn short-circuits before `noraChat`, it should probably still not count against the user's free-tier message limit; worth a one-line decision, not a blocker. Couples Session's memory write uses `userId: null` (shared signal) — the same skip-on-flag logic applies identically to both routes' write, no special-casing needed there.

**C. Attack.** Does this need to be more or less sophisticated than proposed? Less, if anything — a single classifier call, three categories (abuse/self-harm/suicidal ideation), matching what's already named in `OPERATIONAL_RULES`. Not inventing new categories. Is there a simpler way to get the same protection? The simplest possible fix that closes the *verified* gap is actually narrower than the full gate: just make the `updateNoraMemory` call conditional on *something*. But without an input-side check, the only signal available for "should this turn's memory write be skipped" would be scanning Nora's own generated response for the hotline text after the fact — messier, and couples the memory-skip logic to prompt wording that could change. The pre-generation classifier is the cleaner minimal fix, not overbuilt.

**Files:** new `lib/safety.js` (`checkSensitiveContent(text)`), `app/api/ai-coach/route.js`, `app/api/couples-session/route.js`.
**Database:** none required for the gate itself. Optional: a minimal `safety_flags` table (couple_id, user_id, route, category, flagged_at) — **metadata only, no message content stored** — so you have visibility into how often it fires without creating a new place sensitive content could live. Treating this as optional, not required for v1.
**Risk:** Low-medium. New code path, but small and isolated. Main real risk is over-flagging — the classifier needs to distinguish "I'm exhausted, I could just scream" from an actual disclosure, and that boundary needs real test phrases reviewed by you before ship, not just my judgment.
**Verification:** A fixed set of test phrases (clear triggers, clear non-triggers, deliberately ambiguous ones) run through `checkSensitiveContent` and reviewed by you. Plus the automated tests in Part 5.

### 2. Notes-history snapshot

**A. Current implementation.** Verified: the overwrite happens at `lib/nora-memory.js:987-1001` — a single `.upsert()` on `nora_memory` with `onConflict: 'couple_id'`, replacing `memory_summary`, `user1_notes`, `user2_notes`, `couple_notes` wholesale. No prior value is preserved anywhere once this runs. The proposed change is still necessary — nothing else in the codebase does this.

**B. Hidden dependencies.** There *is* an existing precedent to reuse the *pattern* of, even though it's a different table: `push_log` (referenced in `app/api/push/send/route.js`) is this codebase's one existing "simple insert-only log table" — same shape I'm proposing here (no generalized framework, no trigger magic, just a plain table and one `INSERT`). The existing values are already computed as local variables (`newUser1Notes`, `newUser2Notes`, `newCoupleNotes`, `newSummary`) right before the upsert — the *old* values (`existingUser1Notes`, `existingUser2Notes`, `existingCoupleNotes`) are also already sitting in scope a few lines earlier (line 879-881). No new fetch required — the snapshot insert can use data the function already has in memory.

**C. Attack.** Does this need a new table, or is there an existing mechanism? No existing mechanism fits — confirmed via search, nothing else in the codebase snapshots prior state on overwrite. A new table is the right call, and `push_log`'s precedent means it's not introducing a new pattern to the codebase, just applying an established one to a new case.

**Schema (minimal, not event sourcing):**
```sql
create table nora_memory_history (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id),
  layer text not null check (layer in ('user1', 'user2', 'couple', 'summary')),
  previous_value text,
  source_signal_type text,
  replaced_at timestamptz not null default now()
);
```
**Write path change:** one block added immediately before the existing upsert (line ~987), inserting a row per layer *only when the old value is non-null* (skip on first-ever write — nothing to snapshot).
**Files:** `lib/nora-memory.js` (`updateNoraMemory`), new migration `docs/database/nora_memory_history.sql`.
**Risk:** Low. Purely additive `INSERT`, doesn't touch the read path (`getNoraMemory`, `getMemoryBriefing`) at all.
**Verification:** Update a test couple's memory twice with different content; confirm one `nora_memory_history` row appears with the *first* value; confirm `getMemoryBriefing`'s output is byte-identical to what it would have been without this change.

### 3. Shared `getTier()`

**A. Current implementation.** Verified both: `getNoraTierContext` (lib/nora-knowledge.js:67) — `individualSignals <= 5 ? 1 : individualSignals <= 15 ? 2 : 3`. `getSurfaceableClaims`'s inline `getTier` (lib/nora-memory.js:666) — `signals <= 5 ? 1 : signals <= 15 ? 2 : 3`. **These are identical today** — same exact boundary values. This is real, confirmed duplication, not yet drift, and not urgent, but cheap and safe to fix now.

**B. Hidden dependencies.** `lib/nora-memory.js` already imports from `lib/nora-knowledge.js` (`getNoraTierContext`) — so exporting one additional `getTier(signals)` function from the same file and importing it at the second call site is a true drop-in with no new dependency edge. Couple-tier uses different thresholds (`<=7`/`<=20`) — that's a *separate*, correctly-not-duplicated calculation; don't conflate the two into one function with a mode flag, that would be adding complexity to solve a problem that doesn't exist (individual and couple tier are legitimately different scales).

**C. Attack.** Consolidate only if genuinely low-risk — confirmed low-risk since the values already match exactly; this is copy-paste-identical logic in two places, not two decisions that happen to currently agree.
**Files:** `lib/nora-knowledge.js` (add and export `getTier`), `lib/nora-memory.js` (import it, delete the inline duplicate in `getSurfaceableClaims`).
**Database:** none.
**Risk:** Very low — mechanical, zero semantic change if thresholds are copied exactly.
**Verification:** Unit test pinning the boundaries: `getTier(0)===1`, `getTier(5)===1`, `getTier(6)===2`, `getTier(15)===2`, `getTier(16)===3`. This test is also the regression guard against the exact drift this change is meant to prevent.

### 4. Claim-confirmation-rate aggregation

**A. Current implementation.** `classifyClaimResponse` already writes `confidence`, `status`, `correction_count`, `user_response`, `user_responded_at`, `updated_at` on every classification (nora-memory.js:701-834). The data this metric needs already exists and is already being written — this is a read-only query over live data, not new instrumentation.

**B. Hidden dependencies / open item.** I have not confirmed `nora_claims` has a `created_at` column — no insert I've read sets it explicitly, no select fetches it. If it's missing, the "time period" slice should use `updated_at` or `user_responded_at` instead. One-line check needed (Part 6) before finalizing the query's exact columns.

**C. Attack.** Is this useful enough to justify now, or is it premature/scope creep? I'd say useful and *not* premature specifically because it costs almost nothing — it's one query, not a feature. It is **not** an eval framework, a dashboard, or a scheduled job. Given your own workflow in this engagement (copy-paste SQL, run it, report results back), the right-sized version of this is a saved `.sql` file you run manually in the Supabase SQL editor when you want to check in — not a live application feature, not new infrastructure.

**Implementation:** a single SQL query (not even necessarily a persisted view — a saved file is enough for v1), grouped by `claim_type`, bucketed confidence bands, and a derived outcome column (`CONFIRMED` when `status` stayed active and confidence rose; `CHALLENGED`/`CORRECTED`/`RETIRED` from `status`), filterable by date range once the `created_at` question is resolved.
**Files:** `docs/database/claim_confirmation_rate.sql` (query only, no schema change).
**Risk:** none — read-only.
**Critical framing, per your explicit instruction:** this measures **relative trend within a `claim_type`, over time** — it is not accuracy, and should never be reported or discussed as "Nora is X% accurate." It's a regression signal, not a validation metric.

### 5. Tests

Given zero existing test infrastructure (confirmed: no test framework in `package.json`, no test directory anywhere in the repo), I'd recommend **Vitest** — lightest fit for a Next.js app doing mostly pure-function and light-mock testing, no need for the heavier Next.js integration-test machinery since most of what's valuable to test here are exported functions, not full running routes.

Full test list is in Part 5.

---

# 3. What I Would NOT Build Now

- Confidence history/trajectory for claims — correctly deferred in the spec, still correct.
- A hard foreign key from `nora_signals` to the claims/notes it produced — still correct to defer.
- Any generalized "beliefs" abstraction unifying claims and notes — explicitly resisted, stays resisted.
- Turning notes into a second claims system — explicitly resisted, stays resisted.
- A dashboard, scheduled report, or persisted analytics view for the confirmation-rate metric — a saved query is enough until it proves it needs more.
- A general CI pipeline or broader test framework beyond Vitest + the six tests in Part 5 — real, but it's a DO NEXT item from the earlier pass, not part of this scope.
- Response-content scanning (checking Nora's *output* for crisis language, not just the input) as a second safety layer — see the residual gap noted under item 1; building this now would be exactly the "two competing safety systems" you told me not to create. The input classifier plus the existing in-prompt instruction is the right-sized v1.
- A `safety_flags` log that stores any actual disclosure content — if built at all, metadata only, and it's optional, not required for the core fix to work.

---

# 4. Code-Level Implementation Sequence

1. **Shared `getTier()` first.** Zero-risk, mechanical, touches the same two files (`nora-knowledge.js`, `nora-memory.js`) that later changes also touch — land and verify this alone before layering anything else in.
2. **Notes-history snapshot second.** Touches `updateNoraMemory` directly, purely additive, no dependency on the safety work. Doing this before item 3 means that once the safety gate lands, you can literally verify the memory-skip is working by confirming *no* new history row appears for a flagged turn either — item 2 becomes a free verification tool for item 3.
3. **Sensitive-content gate + memory-write suppression third.** Highest-value, highest-care item. Sequencing it after 1-2 means `nora-memory.js` has already stabilized from smaller changes, reducing the chance of an unrelated diff colliding with the most important one.
4. **Claim-confirmation-rate query fourth.** Fully independent of 1-3, least time-sensitive, read-only.
5. **Tests land with each item, not batched at the end** — test 3 (tier) with item 1 above, test 6 (notes-history) with item 2, tests 1/2/4/5 with item 3.

---

# 5. Tests

1. **Private notes never cross the partner boundary.** Fixture-based test asserting Couples Session's system-prompt construction never includes `nora_private_notes` content — confirms the existing deliberate exclusion (`couples-session/route.js:167-174`, which skips `claimsBlock` from `getFullNoraContext`) stays true as a regression guard, not just a one-time code review finding.
2. **`TENTATIVE` claims cannot become `DIRECT` through an accidental code path.** Direct unit test against `getSurfaceableClaims`'s mode logic: `confidence: 0.80, tier: 2` → assert `mode === 'TENTATIVE'`; `confidence: 0.90, tier: 3` → assert `mode === 'DIRECT'`; `confidence: 0.90, tier: 1` → assert `mode === 'TENTATIVE'` (confidence alone must never override the tier ceiling).
3. **Tier calculation remains consistent.** The `getTier()` boundary test from item 3 above: `getTier(0)===1`, `getTier(5)===1`, `getTier(6)===2`, `getTier(15)===2`, `getTier(16)===3`.
4. **Sensitive disclosures skip memory extraction.** Given `checkSensitiveContent` returns `flagged: true`, assert `updateNoraMemory` is never called for that turn, in both `ai-coach` and `couples-session` handlers. Will likely need a lightweight mock of the Supabase client and `noraChat` — flagging this as needing slightly more test-harness setup than tests 1-3, which are closer to pure functions.
5. **Normal messages continue through the existing path unchanged.** Regression guard, paired with test 4: given a known non-flagged input, assert the normal path (`noraChat` then `updateNoraMemory`) still fires exactly as before — protects against item 1 accidentally breaking the common case, which is the one that runs thousands of times more often than the flagged case.
6. **Notes-history captures the value being replaced.** Call `updateNoraMemory` twice with different `inputData` for a test couple; assert `nora_memory_history` has exactly one row, and its `previous_value` equals the *first* call's resulting notes, not the second.

Tests 1-3 are close to pure-function tests and cheap to set up. Tests 4-6 need a minimal Supabase/fetch mock since this app has no test-DB convention yet — worth sequencing 1-3 first to establish the Vitest setup, then extending it for 4-6 rather than solving both problems at once.

---

# 6. Open Questions

Only including things that genuinely need your decision or more evidence — not manufacturing uncertainty:

1. **Does `nora_claims` have a `created_at` column?** Quick check: `SELECT column_name FROM information_schema.columns WHERE table_name = 'nora_claims';` — determines whether item 4's time-period slice uses `created_at` or falls back to `updated_at`/`user_responded_at`.
2. **On classifier error in the sensitive-content gate: fail toward "not flagged," or fail toward "flagged"?** I'm recommending "not flagged" (matching `shouldUpdateMemory`'s existing convention in this codebase, relying on the in-prompt instruction as the backup net) — but this is a real tradeoff between "never miss a crisis" and "never make Nora unusable from a transient classifier hiccup," and it should be your explicit call, not something I decide by precedent alone.
3. **Should the safety gate log even metadata (couple_id, route, timestamp — no content) when it fires?** Small, optional, gives you visibility into frequency without storing anything sensitive. Your call whether it's worth the extra table for v1 or better added later once you know how often the gate actually fires.
4. **The REINFORCE finding (Part 7) — does it need a decision now, or is "note it and revisit once the confirmation-rate metric exists" the right call?** I'd lean toward the latter, but want you to explicitly agree rather than let it pass as settled by default.

---

# 7. Pushback

**The most important thing in this document isn't one of the five build items — it's what I found tracing the "repeated evidence" question the spec deliberately left open.** `extractAndUpdateClaims` (lib/nora-memory.js:472-552) fires after *every* notes update, for any signal type that touches notes — and it can return `REINFORCE:[claim_id]` when new notes strengthen an *existing* claim. When that happens, confidence gets the **exact same `+0.10`** a genuine user `CONFIRMED` would produce (line 527) — with **zero user involvement**. A claim can, in principle, climb from 0.3 to the 0.70 surfacing threshold, or even the 0.85 `DIRECT` threshold, purely from Nora's own notes-synthesis calling the same pattern real again and again across sessions — never once checked against what a real person actually said. This is existing, deliberately-built, working behavior, not a bug — I'm calling it **risky**, not **wrong**. But Invariant #3 in the spec ("a belief earns DIRECT-tier expression only through demonstrated confirmation") is less true than it reads, given this. I'm not recommending a change to it right now — no evidence yet that it's caused a real problem, and you were explicit that the claims lifecycle shouldn't change without the audit proving it's broken. But this needs to be named in writing before this spec is treated as settled, because it's exactly the kind of thing that could quietly undermine the actual moat claim: Nora's beliefs are only as trustworthy as their confirmation history, and REINFORCE is confirmation history Nora partially gave itself.

**On your opening concern — "we're building a system that doesn't know if it's reliable until it's evolved."** That's correct, and I don't think there's a way around it that doesn't cost you the actual value of the product faster than it removes the risk — a system that only acts on pre-validated, externally-audited beliefs isn't the thing you're building. But I'd push back gently on "the only option is to wait and see": item 4 (the confirmation-rate query) is a small, near-term way to shrink the *unknown* part of that risk rather than just accept it passively. It's cheap, most of the data already exists, and once it's sliced by `claim_type` *and* by confirmation source (genuine `CONFIRMED` vs. self-`REINFORCE`d, given the finding above), it gives you an early-warning signal — a `claim_type` with a high self-reinforcement ratio or a high later-correction rate — well before "fully evolved" would otherwise mean. It doesn't resolve the underlying concern. It does mean you're not flying fully blind while you wait.

**The fail-open-on-error decision for the safety gate (Open Question 2) is a real judgment call I'm making, not a neutral technical default.** I want to be explicit that recommending "fail toward not-flagged" is me applying an existing codebase convention to a much higher-stakes case than where that convention originated (`shouldUpdateMemory` failing quietly just means a conversation doesn't get remembered — low stakes; this gate failing quietly means a potential crisis disclosure gets normal treatment). Matching precedent felt right to me, but this is exactly the kind of decision that looks fine 99.9% of the time and matters enormously in the 0.1% — it should be a decision you make on purpose, not one that arrives by analogy.

**Smaller point:** the five-item plan is complete for its own stated scope, but I don't want "these five things are done" to quietly get read as "ready for wider exposure." Retry logic, observability, and idempotency from the earlier passes are still real, separate gaps — correctly out of scope for *this* implementation pass, but not solved by it either.
