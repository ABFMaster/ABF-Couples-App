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

## Known Bugs — To Fix in Signal Registry Sprint

### Bug 1 — userId routing bug (affects all individual signals)
**Root cause:** `updateNoraMemory` sets `updateUser1 = true` and `updateUser2 = updateUser1` for all individual signals. The `userId` parameter is passed in but never used to determine whose notes to update. Result: both users' notes get written from the acting user's signal data, regardless of who performed the action.

**Fix:** Replace the static `updateUser1/updateUser2` logic with userId-based routing:
- If `userId === couple.user1_id` → update user1 notes only
- If `userId === couple.user2_id` → update user2 notes only
- If `userId` is null (shared signal) → update both

**Affected signals:** All individual signals — NORA_CONVERSATION, SPARK_REVEAL, BET_REVEAL, WEEKLY_REFLECTION, GAME_ROOM_DEBRIEF, NOTEBOOK_ENTRY, PRACTICE_ADDED, PRACTICE_UPDATED, FLIRT_SENT, MEMORY_REFLECTION

---

### Bug 2 — Missing weights on live signals
These signals fire and write notes but never increment counters. Tier system doesn't learn from them.

| Signal | Should have individual weight | Should have couple weight |
|---|---|---|
| DATE_COMPLETED | 1 | 2 |
| TIMELINE_EVENT | 1 | 1 |
| SHARED_ITEM_COMPLETED | 0 | 1 |
| MEMORY_REFLECTION | 1 | 0 |
| FLIRT_SENT | 1 | 1 |

---

### Bug 3 — FLIRT_RECEIVED missing entirely
No signal type, no weight, no synthesis lens, no call in the react route.

**Required additions:**
- Add `FLIRT_RECEIVED: 'flirt_received'` to SIGNAL_TYPES
- Individual weight: 1 (receiver only)
- Couple weight: 1
- Updates individual notes: receiver only
- Updates couple notes: yes
- Add synthesis lens: "Focus on what the receiver's reaction reveals about how this person receives love and desire — what landed, what moved them, what they did with it."
- Add call to `updateNoraMemory` in `/api/flirts/react/route.js` after reaction is saved

---

### Bug 4 — Assessment → memory wire missing
Assessment completion is the highest-signal onboarding event. It fires nothing.

**Required addition:**
- Add `ASSESSMENT_COMPLETE: 'assessment_complete'` to SIGNAL_TYPES
- Individual weight: 3 (highest single signal — full profile data)
- Couple weight: 2 (if both assessed)
- Updates individual notes: acting user only
- Updates couple notes: only if both partners have completed assessment
- Synthesis lens: "Full profile synthesis. Use attachment scores, conflict style, love language, and flooding data to build the most complete opening hypothesis possible. This is the foundation everything else builds on."
- Add call in `/api/assessment/seed-memory/route.js`

---

### Bug 5 — FLIRT_SENT couple notes blind
FLIRT_SENT not in SHARED_SIGNALS. Nora never learns about flirt activity at the couple level.

**Fix:** Add FLIRT_SENT and FLIRT_RECEIVED to SHARED_SIGNALS array.

---

## Target Registry — Post Sprint

This is what the registry should look like after the signal registry sprint is complete.

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

## Signal Registry Sprint — Execution Order

1. Fix userId routing bug in `updateNoraMemory` — this affects everything, fix first
2. Add missing weights for DATE_COMPLETED, TIMELINE_EVENT, SHARED_ITEM_COMPLETED, MEMORY_REFLECTION, FLIRT_SENT
3. Add FLIRT_RECEIVED to SIGNAL_TYPES, weights, lenses, and react route
4. Add ASSESSMENT_COMPLETE to SIGNAL_TYPES, weights, lenses, and seed-memory route
5. Add FLIRT_SENT and FLIRT_RECEIVED to SHARED_SIGNALS
6. Test each fix independently before stacking
7. Verify signal counts incrementing correctly in DB after each fix

---

*This document is the spec. No signal wiring changes ship without updating this document first.*
