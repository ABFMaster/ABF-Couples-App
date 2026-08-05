# Pre-Launch Sprint Plan — path to 1-3 couples, 1 month trial
Written: Aug 5, 2026

Where we are: every daily-rhythm activity now has Follow-Through (Bet, Spark, Wednesday, Thursday), both critical RLS/cron migrations are live and verified, and the assessment-memory pipeline is fixed both retroactively (Matt & Cass backfilled) and going forward (every future couple protected at pairing time). This document is the plan for everything between here and handing the app to real couples.

Three phases. Phase 1 is new — Matt's request for a full code audit. Phases 2 and 3 consolidate what was already sitting in the backlog, unscoped, across the last two weeks of sprints.

---

## Phase 1 — Full code audit (new)

### Why this scope, not a full re-sweep
Date Night, Game Room, Daily Rhythm, Nora memory/signals, and the security/BOLA rollout have each already had a dedicated audit pass, and the re-checks after fixing came back clean. Re-running those again is real time for low expected yield. The pattern worth paying attention to instead: **every feature that turned out to have a live bug had never been deliberately audited as its own surface** — Follow-Through's card-refresh bug, the push-subscription overwrite, and today's assessment-memory gap all lived in code nobody had swept end-to-end. That's the actual signal for where to point this.

### Surfaces that have never had a dedicated audit
1. **Assessment / Onboarding** — the irony of today's find is that this whole flow (assessment completion, solo-onboarding save path, couple pairing/connect-code flow, `OnboardingGuard`) has never been read end-to-end as its own surface. Everything found so far was found by accident while building something else.
2. **AI Coach** (`app/ai-coach/*`, `lib/ai-coach-context.js`) — got BOLA/auth fixes during the Aug 4 security sprint, but never a full feature-logic pass (session handling, context assembly, `checkin-patterns.js` consumption — which Matt already flagged as needing a stress test, see Phase 2).
3. **Notebook / Practices** (`app/profile/notebook*`, `app/profile/practices*`, related API routes) — same story: BOLA-fixed, never feature-audited. `PRACTICE_ADDED`/`PRACTICE_UPDATED`/`NOTEBOOK_ENTRY` signals were found mid-security-sprint to have never reached Nora's memory at all (client never sent a `coupleId`) — fixed as a side effect, but the surface itself was never swept on its own terms.
4. **Profile / Couples Memory / Timeline** (`app/profile/*`, `app/us/*`, `app/timeline/*`) — lightest-touched area of the whole app. Dream trip flow is a known stub (see Phase 2). Never had a dedicated pass.
5. **Push notification system, broadly** — the subscription-overwrite bug was found reactively (Matt's missed-notification report), not systematically. Worth one deliberate pass across every `sendPush`/`registerPushSubscription` call site now that the core bug is fixed, to check nothing else in the same family is lurking.

### Specific loose threads already flagged, never resolved
These were found during earlier sprints, explicitly logged as "found but not fixed, needs a decision," and never actually decided. Given the assessment bug was the exact same shape (signal has a full prompt lens, correctly logged, but missing from a routing array — silently never reaches notes) and turned out to matter, these deserve the same treatment now rather than staying deferred:
- `FLIRT_RECEIVED` missing from `SHARED_NOTE_SIGNALS`/`INDIVIDUAL_NOTE_SIGNALS` — updates `couple_notes` and signal counts, but the per-person hypothesis its prompt lens was written for never reaches `user1_notes`/`user2_notes`.
- `PRACTICE_ADDED`, `PRACTICE_UPDATED`, `SHARED_ITEM_COMPLETED` missing from `INDIVIDUAL_SIGNAL_WEIGHTS` — correctly routed to notes, but never increment the signal counts that gate things like Memory Test eligibility.
- `MEMORY_REFLECTION` missing from `COUPLE_SIGNAL_WEIGHTS`/`SHARED_SIGNALS` — revisiting a shared timeline memory never reaches `couple_notes`.
- `flirts/save-profile` reuses the `FLIRT_SENT` signal type for a structurally different action (building a flirt profile vs. sending one) — Nora's `FLIRT_SENT` notes lens gets applied to content it wasn't written for.
- The orphaned `game-room/challenge/start` route decision — flagged July 31, never resolved. Likely stale now: the Memory Test eligibility gate it used to guard was rebuilt properly later (`lib/memory-unlock.js`, enforced server-side in `confirm-type`), so the route may now be safe to just delete. Worth a quick confirm-and-delete rather than leaving it as a landmine.
- `app/api/game-room/lobby-status/.junk_...` — an inert leftover file with a live unauthenticated service-role handler inside it, non-functional only because its filename doesn't match Next.js's route convention. Should just be deleted, not left as a landmine for someone to accidentally resurrect.

### Dead code
`~25 exported functions/constants in lib/ with zero imports` was flagged during the Daily Rhythm audit but never individually verified — worth actually going through that list (particularly the `checkin-patterns.js` trio and `getDiscrepancyNotes`, which looked like whole built-and-abandoned capabilities, not just unused helpers) and either wiring them in or removing them. Plus the already-confirmed dead files (`lib/spark-questions.json`, `components/ReflectionCard.js`, `lib/checkin-questions.js`, unused `ritual-suggestions.js` exports) — these were confirmed dead but never actually deleted.

### Stale docs
`docs/database/daily-checkins.sql` vs `daily-checkins-v2.sql` describe two different, incompatible shapes for the same live table. `docs/database/relationship-assessments.sql` documents a `module_results` column nothing in the app actually reads or writes by that name. Both are cheap to reconcile and worth doing so the next person (including me, in a future session) doesn't get misled.

---

## Phase 2 — Known open items needing live confirmation

Consolidated from "not yet live-tested end to end" notes scattered across every sprint this engagement. None of these are code fixes — they're real usage, which only Matt and Cass (and then the trial couples) can actually provide. Grouping them here so there's one checklist instead of them being buried across a dozen backlog entries:

- Follow-Through: Spark, Wednesday, and Thursday haven't been through a full cycle the way Bet has (blend → same-night report → next-day standalone if unresolved).
- Memory Test: a full round with real Spark/Bet/Timeline/Date/Flirt history behind it, confirming generated questions actually reference real shared content.
- Game Room: Rabbit Hole debrief, The Hunt, Hot Take, The Call, and The Challenge, live, since the BOLA/confused-deputy fix sprint.
- AI Coach, Flirts, Practices, Notebook entries — live, since the Aug 4 auth-tightening sprint.
- Date Night: "Ideas For You Two," planning/editing/deleting a custom date (shared and unshared), Date History — live, since the Aug 3 fix sprint.
- Ritual editing (`handleSaveEdit` / `/api/ritual/update`) — the route exists now; confirm the save actually round-trips.
- `checkin-patterns.js`'s rebuilt drift/concern detection — Matt's own flagged item. Needs a deliberate stress test against synthetic check-in histories (steady, declining, bursty, one-partner-only) before it's trusted for anything user-facing, since real usage alone won't cleanly distinguish "genuine drift" from "normal life" (travel, a busy week, etc.).

---

## Phase 3 — Small cleanup, deliberately time-gated

- Remove the temporary `cron_runs` diagnostic table and its logging block once cron health is confirmed stable over a few weeks (both are commented `TEMPORARY DIAGNOSTIC` for easy grep-and-removal). Not yet — it hasn't had enough time to catch anything.
- Pre-existing `react/no-unescaped-entities` lint errors scattered across `app/dashboard/page.js`, `components/RitualCard.js`, `app/ritual/page.js`, `app/connect/page.js`, `app/onboarding/page.js` — cosmetic, never blocking, worth one pass to clear the noise before it hides a real lint error in the future.

---

## Deliberately out of scope for this trial

Carried over from the backlog, still correctly deferred — no change recommended:
- AI web-search suggestion agent (Date Night) — explicitly waiting on real usage data from the wired-up version first.
- Session-based Nora conversations for couples — designed, not built; a real feature addition, not a launch blocker.
- Dream trip flow (`/us/add`) — currently stubs to `/shared/add` without erroring; a real gap but not launch-blocking for 1-3 couples over a month.
- Everything under Nora Standalone / Nora for Practitioners / App Store — different product surface entirely.

---

## Suggested order of operations

1. Phase 1 audit, surface by surface (Assessment/Onboarding first, given today's find and because pairing/onboarding is literally the first thing any new trial couple will do).
2. Resolve the specific flagged signal-routing gaps and orphaned-code items alongside the audit that finds them, rather than re-logging them a third time.
3. Phase 2's live-confirmation checklist happens naturally as Matt & Cass use the app, and again once trial couples are on it — no dedicated engineering time needed, just deliberate attention while it's happening.
4. Phase 3 stays parked until its own time gate (cron table) or gets swept in five minutes whenever convenient (lint cleanup).

Ready to start with Assessment/Onboarding whenever Matt gives the go-ahead.
