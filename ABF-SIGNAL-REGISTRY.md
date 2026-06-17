# ABF SIGNAL REGISTRY
*The authoritative map of every user action to its Nora memory impact.*
*All changes to signal wiring must be reflected here first, then implemented.*
*Established June 2026*

---

## How to read this document

**Individual weight** — how much this signal increments `individual_signal_count` for the acting user. Drives tier progression for that person.

**Couple weight** — how much this signal increments `couple_signal_count`. Drives couple tier progression.

**Updates individual notes** — whether Nora writes/updates per-person notes for the acting user.

**Updates couple notes** — whether Nora writes/updates shared couple notes.

**userId required** — whether the signal is user-specific (sender only) vs. shared (both users implicitly).

---

## Current Signal Registry

| Signal | Individual Weight | Couple Weight | Updates Individual Notes | Updates Couple Notes | userId Required | Status |
|---|---|---|---|---|---|---|
| NORA_CONVERSATION | 2 | 1 | ✅ acting user only | ✅ | ✅ | Live |
| SPARK_REVEAL | 1 | 2 | ✅ acting user only | ✅ | ✅ | Live |
| BET_REVEAL | 1 | 2 | ✅ acting user only | ✅ | ✅ | Live |
| WEEKLY_REFLECTION | 1 | 2 | ✅ acting user only | ✅ | ✅ | Live |
| GAME_ROOM_DEBRIEF | 2 | 2 | ✅ acting user only | ✅ | ✅ | Live |
| RITUAL_CHECKIN | 1 | 2 | ✅ acting user only | ✅ | ✅ | Live |
| NOTEBOOK_ENTRY | 1 | 0 | ✅ acting user only | ❌ | ✅ | Live |
| PRACTICE_ADDED | 1 | 0 | ✅ acting user only | ❌ | ✅ | Live |
| PRACTICE_UPDATED | 1 | 0 | ✅ acting user only | ❌ | ✅ | Live |
| DATE_COMPLETED | 0 | 0 | ✅ both users | ✅ | ❌ | Live — weights missing (bug) |
| TIMELINE_EVENT | 0 | 0 | ✅ both users | ✅ | ❌ | Live — weights missing (bug) |
| SHARED_ITEM_COMPLETED | 0 | 0 | ❌ | ✅ | ❌ | Live — weights missing (bug) |
| MEMORY_REFLECTION | 0 | 0 | ✅ acting user only | ❌ | ✅ | Live — weights missing (bug) |
| FLIRT_SENT | 0 | 0 | ✅ both users (bug — should be sender only) | ❌ | ✅ | Live — weights missing, routing bug |
| FLIRT_RECEIVED | — | — | — | — | — | ❌ Missing entirely |

---

## Signal Registry Sprint — COMPLETE (closed June 16-17, 2026)

All bugs identified in this registry have been fixed, deployed, and verified in production.

### Bug 1 — userId routing bug — FIXED
`updateNoraMemory` now routes individual notes updates based on `userId` matching `couple.user1_id` or `couple.user2_id`, rather than updating both users unconditionally. Shared signals (DATE_COMPLETED, TIMELINE_EVENT, SHARED_ITEM_COMPLETED, RITUAL_CHECKIN) update both regardless of userId, as they have no single actor.

Audit performed across all call sites confirmed three signals were missing `userId` entirely: SPARK_REVEAL, BET_REVEAL, and NORA_CONVERSATION. All three fixed. Every other individual signal call site (FLIRT_SENT, NOTEBOOK_ENTRY, PRACTICE_ADDED, PRACTICE_UPDATED, MEMORY_REFLECTION, DATE_COMPLETED, TIMELINE_EVENT) was already passing userId correctly.

### Bug 2 — Missing weights on live signals — FIXED
DATE_COMPLETED, TIMELINE_EVENT, MEMORY_REFLECTION, and FLIRT_SENT now have individual and/or couple weights as specified in the target registry below. SHARED_ITEM_COMPLETED now has a couple weight.

### Bug 3 — FLIRT_RECEIVED missing entirely — FIXED
Added to SIGNAL_TYPES, both weight maps, the individual synthesis lens, and wired into `/api/flirts/react/route.js` to fire on reaction with the receiver's userId.

### Bug 4 — Assessment to memory wire missing — FIXED
Added ASSESSMENT_COMPLETE to SIGNAL_TYPES, both weight maps, and the synthesis lens. Fixed the dead `'PROFILE_UPDATE'` string literal in `/api/assessment/seed-memory/route.js` that was firing a signal type matching nothing in the registry — replaced with the proper `SIGNAL_TYPES.ASSESSMENT_COMPLETE` constant.

### Bug 5 — FLIRT_SENT couple notes blind — FIXED
FLIRT_SENT and FLIRT_RECEIVED added to SHARED_SIGNALS. Couple notes now update on flirt activity.

### Additional fix — nora_signals table wired (Architecture Doc Step 2)
`nora_signals` table created with RLS enabled. Every `updateNoraMemory` call now logs a raw signal event (couple_id, user_id, signal_type, input_data, created_at) before synthesis proceeds. Two production bugs caught and fixed during this work: an incorrectly chained `.catch()` on the Supabase query builder (replaced with proper try/await), and missing userId on NORA_CONVERSATION signal calls (same pattern as Bug 1, caught by direct testing rather than static audit).

### Verification performed
All fixes confirmed via direct production testing — Nora conversation, Spark, Bet, and flirt reactions triggered live and verified against `nora_signals` and `nora_memory` tables showing correct signal_type, userId attribution, and counter increments. No fix was marked complete without DB-level confirmation.

### What this sprint did NOT touch
- nora_claims table — not yet built, deferred to corrigibility design session (see ABF-NORA-ARCHITECTURE.md Step 6)
- Claim extraction pipeline — not yet built
- Skills refactor — not yet built

This registry document remains the authoritative signal reference. Any new signal type added to ABF must be added here first, with weights and routing behavior specified, before implementation.

## Target Registry — Current State

| Signal | Individual Weight | Couple Weight | Notes layer | userId routing |
|---|---|---|---|---|
| NORA_CONVERSATION | 2 | 1 | Acting user only | userId-based |
| SPARK_REVEAL | 1 | 2 | Acting user only | userId-based |
| BET_REVEAL | 1 | 2 | Acting user only | userId-based |
| WEEKLY_REFLECTION | 1 | 2 | Acting user only | userId-based |
| GAME_ROOM_DEBRIEF | 2 | 2 | Acting user only | userId-based |
| RITUAL_CHECKIN | 1 | 2 | Acting user only | userId-based |
| NOTEBOOK_ENTRY | 1 | 0 | Acting user only | userId-based |
| PRACTICE_ADDED | 1 | 0 | Acting user only | userId-based |
| PRACTICE_UPDATED | 1 | 0 | Acting user only | userId-based |
| DATE_COMPLETED | 1 | 2 | Both users | Shared — no userId |
| TIMELINE_EVENT | 1 | 1 | Acting user only | userId-based |
| SHARED_ITEM_COMPLETED | 0 | 1 | Neither | Shared — no userId |
| MEMORY_REFLECTION | 1 | 0 | Acting user only | userId-based |
| FLIRT_SENT | 1 | 1 | Sender only | userId-based |
| FLIRT_RECEIVED | 1 | 1 | Receiver only | userId-based |
| ASSESSMENT_COMPLETE | 3 | 2 | Acting user only | userId-based |

---

## Synthesis Lenses — Complete Reference

These are the per-signal focus instructions injected into Nora's notes prompts.

### Individual lenses (buildPersonNotesPrompt)

**NORA_CONVERSATION**
Full hypothesis update. Look across everything said for patterns, fears, and what actually moves this person.

**SPARK_REVEAL**
Focus on what this answer reveals about what love actually feels like to this person in practice — not what they claim to want, what shows up in how they answered.

**BET_REVEAL**
Focus on what the prediction and actual answer reveal about this person's self-knowledge and how they see themselves in this relationship. Also note HOW they expressed their answer — whether with humor, deflection, earnestness, or self-deprecation. Tone is data. Note the ambiguity when it exists rather than resolving it prematurely.

**WEEKLY_REFLECTION**
Focus on what this person's framing of the week reveals about what they're tracking and what matters to them.

**GAME_ROOM_DEBRIEF**
Focus on how this person engaged in play — what they reached for, what they avoided, what came alive.

**RITUAL_CHECKIN**
Lightweight signal. Note only if something meaningful about showing up or withdrawing is evident.

**DATE_COMPLETED**
Focus on what this person's engagement with the date reveals about how they invest in shared experience.

**TIMELINE_EVENT**
Focus on what they chose to memorialize — what this reveals about what they value.

**MEMORY_REFLECTION**
What does reflecting on this specific memory reveal about how this person holds their relationship history? What does choosing to revisit this moment say about what they're tracking and what matters to them?

**NOTEBOOK_ENTRY**
Focus on what this entry reveals about this person's interior life — what they are noticing about themselves, what they are working to change, what patterns are emerging.

**PRACTICE_ADDED**
Focus on what this practice intention reveals about what this person is trying to build in themselves and in the relationship.

**PRACTICE_UPDATED**
Focus on what the status change reveals — completion, avoidance, or honest pause.

**FLIRT_SENT**
Focus on what the choice of flirt reveals about how this person expresses desire and love in practice.

**FLIRT_RECEIVED** *(to be added)*
Focus on what the receiver's reaction reveals about how this person receives love and desire — what landed, what moved them, what they did with it.

**ASSESSMENT_COMPLETE** *(to be added)*
Full profile synthesis. Use attachment scores, conflict style, love language, and flooding data to build the most complete opening hypothesis possible. This is the foundation everything else builds on.

---

### Couple lenses (buildCoupleNotesPrompt)

**NORA_CONVERSATION**
Full couple hypothesis update. Track the dynamic between them, the cycle, the trajectory.

**SPARK_REVEAL**
Focus on what the contrast between their two answers reveals about the couple dynamic — alignment, surprise, distance, or connection.

**BET_REVEAL**
Focus on how well they know each other — what the prediction accuracy reveals about the current state of their attunement.

**WEEKLY_REFLECTION**
Focus on the trajectory signal — how they describe the week together reveals whether they are moving toward or away from each other.

**GAME_ROOM_DEBRIEF**
Focus on how they operated as a team — who led, who followed, where friction appeared, where they were in sync.

**RITUAL_CHECKIN**
Lightweight signal. Note consistency pattern — are they showing up for each other? Streak data is attachment behavior data.

**DATE_COMPLETED**
Focus on shared experience quality — did they invest, did it land, what does their engagement reveal about where they are right now.

**TIMELINE_EVENT**
Focus on what they chose to memorialize together — shared meaning signal.

**MEMORY_REFLECTION**
Note if both partners have reflected on the same memory — alignment or divergence in how they describe the same moment reveals how shared their meaning-making actually is.

**FLIRT_SENT / FLIRT_RECEIVED** *(to be added)*
Focus on the health of desire and playfulness in the relationship — are they reaching for each other? What type of connection are they seeking?

**ASSESSMENT_COMPLETE** *(to be added)*
Full couple dynamic synthesis from combined profiles. Establish the baseline hypothesis about their cycle, their pairing risks, and what Nora will be watching for from here.

---

## Signal Registry Sprint — Execution Order — COMPLETE

1. Fix userId routing bug in `updateNoraMemory` — this affects everything, fix first ✅
2. Add missing weights for DATE_COMPLETED, TIMELINE_EVENT, SHARED_ITEM_COMPLETED, MEMORY_REFLECTION, FLIRT_SENT ✅
3. Add FLIRT_RECEIVED to SIGNAL_TYPES, weights, lenses, and react route ✅
4. Add ASSESSMENT_COMPLETE to SIGNAL_TYPES, weights, lenses, and seed-memory route ✅
5. Add FLIRT_SENT and FLIRT_RECEIVED to SHARED_SIGNALS ✅
6. Test each fix independently before stacking ✅
7. Verify signal counts incrementing correctly in DB after each fix ✅

---

*This document is the spec. No signal wiring changes ship without updating this document first.*
