# ABF Session Handoff — July 2, 2026

## What Was Built This Session

### Signal Registry Sprint — COMPLETE
All five bugs from the signal registry fixed, deployed, and verified in production:
1. userId routing bug fixed — individual signals now target acting user only
2. Missing weights added — DATE_COMPLETED, TIMELINE_EVENT, MEMORY_REFLECTION, FLIRT_SENT, SHARED_ITEM_COMPLETED
3. FLIRT_RECEIVED added end-to-end — signal type, weights, lens, react route call
4. ASSESSMENT_COMPLETE added — fixed broken PROFILE_UPDATE string in seed-memory route
5. FLIRT_SENT and FLIRT_RECEIVED added to SHARED_SIGNALS

### Nora Intelligence Architecture — COMPLETE
Full seven-step architecture built, tested, and verified in production:
- nora_signals table created with RLS — every updateNoraMemory call logs raw signal event
- nora_claims table created with RLS — full corrigibility schema (confidence, status, correction_count, dormant_linked_claim_id)
- extractAndUpdateClaims — Haiku extraction pipeline fires after synthesis, NONE/REINFORCE/new-claim logic
- getSurfaceableClaims — confidence-gated (>0.70), tier-ceiling enforced (DIRECT requires tier 3 + confidence >=0.85)
- classifyClaimResponse — corrigibility state machine, bracket-stripping bug fixed, CONFIRMED/CHALLENGED/CORRECTED/NEUTRAL
- getFullNoraContext — shared helper wired into all Tier 1 and Game Room verdict surfaces (11 routes)
- Per-person signal counts — user1_individual_signal_count and user2_individual_signal_count replacing shared column
- All 7 Game Room verdict routes upgraded to full stack (notes + tier + claims)
- spark/respond and reflection/generate upgraded to full stack
- reflection/generate critical write bug fixed — was writing to non-existent 'summary'/'updated_at' columns

Governing documents committed to repo root:
- ABF-CONSTITUTION.md
- ABF-SIGNAL-REGISTRY.md (sprint marked complete)
- ABF-NORA-ARCHITECTURE.md (full research lineage, Steps 1-7 all complete)

### Talk to Nora — FIXED
All broken navigation sites now set nora_opener in sessionStorage before navigating to /ai-coach?new=true:
- dashboard/page.js — hero card message as opener
- profile/page.js — navigates with ?new=true
- profile/assessment/results/page.js — builds opener from module headlines
- components/CoachInsightCard.js — insight.text as opener
Weekly reflection and assessment already worked correctly. us/page.js uses ?seed= param (working correctly).

### Sunday Review — FIXED
- Status route now serves most recent reflection (ordered by week_start desc) instead of current week only
- Push notification deep link updated from /dashboard to /weekly-reflection
- Us page weekly reflection tab now shows "Week of [Month Day]" instead of relative days ("Yesterday")

### NoraCouplesChat Component — BUILT
New shared component at components/NoraCouplesChat.js:
- Collapsible inline couples chat, backed by /api/nora-inline route
- Animated three-dot thinking indicator
- Server-authoritative messages stored in nora_inline_sessions table
- Both partners see shared thread, each identified by name
- "Take this further in Nora →" appears after 2+ user exchanges, carries last Nora message as opener
- defaultExpanded prop for auto-open surfaces
- isInitialLoad ref prevents auto-scroll on mount
- 16px input font prevents iOS auto-zoom

Wired into:
- Weekly Reflection — defaultExpanded, pattern merged into Nora opener (standalone pattern card removed)
- Game Room Rabbit Hole debrief — light mode, collapsed by default, opens with convergence reveal

New infrastructure:
- nora_inline_sessions table with RLS (couple_id, context_type, context_id, messages JSONB, UNIQUE constraint)
- /api/nora-inline route — GET fetches session, POST sends message and gets Nora response

### Architectural Review
Three-round architectural review completed (standard, adversarial acquisition, CTO decision):
- Decision: B — Targeted refactor of specific subsystems
- Implement now: baseline three eval metrics, wire outcome tracking into Sunday Review inline Nora
- Validate first: extraction pipeline self-improvement (needs 8 weeks outcome data)
- Future: outcome-calibrated confidence, predictive world model, intervention registry

---

## Current Production State

Real claims in nora_claims for Matt/Cass couple:
- 8 active claims, all below 0.70 surfacing threshold (correct — still building confidence)
- Highest confidence: 0.45 (growth_edge — trust accumulation pattern)
- Matt individual signals: 24 (Tier 3 — Earned Intimacy)
- Cass individual signals: 2 (Tier 1 — Discovery)
- Couple signals: 12

---

## Known Issues / Backlog

### Fix Soon
1. lands/not quite buttons not sticking on weekly reflection moments — pre-existing bug, reactions not persisting
2. Both partners can react to each other's individual moments on weekly reflection — should be scoped to own moments only
3. Friday Ritual "Check in with Nora on Friday" text — needs to become real Talk to Nora link with ritual context as opener
4. Game Room debrief NoraCouplesChat — only wired into Rabbit Hole, needs to be added to all other Game Room debrief pages (Hunt, Hot Take, The Call, Memory Challenge, Challenge)
5. Sunday Review inline Nora outcome tracking — wire valence classification from user responses back into memory synthesis

### Design Sprint Required
6. Past Reflections page — currently fully expanded inline, gets long at scale. Needs collapsed list, tap to expand.
7. In-page Nora design review for remaining surfaces — Friday Ritual needs its own design pass

### Large Builds (Backlog)
8. Session-based conversations — cross-product build per SESSION-DESIGN.md at repo root. Replaces infinite thread model. Ships to ABF and Nora Standalone together.
9. Dedicated couples Nora chat — future build after session architecture exists
10. Eval infrastructure — three baseline metrics: claim correction rate, Friday Ritual completion rate, conversation continuation rate
11. Extraction pipeline self-improvement — weekly cron analyzing corrected claims. Wait for 8 weeks outcome data first.
12. Outcome-calibrated confidence — replace signal-count tier thresholds with outcome history. Future research.

### Nora Standalone
13. Full intelligence port not yet complete — see NORA-STANDALONE-SESSION-KICKOFF.md in nora-app repo for complete build sequence
14. Daily reminder cron — infrastructure exists, route itself missing

---

## Architecture Decisions Made This Session

### Nora Presence Model (governing decision)
- Individual Nora surfaces (Thursday note, Hero card, ai-coach, personal reflection): Talk to Nora link → dedicated individual Nora chat with observation as opener
- Couple Nora surfaces (Sunday Review, Game Room debrief): NoraCouplesChat inline component → option to continue in dedicated couples chat
- Async surfaces (Spark reveal, Bet reveal): individual Talk to Nora link only — no couples chat due to async timing problem
- This decision is documented here and governs all future Nora surface decisions

### Loop Architecture Decision
Current architecture: Memory accumulation + Belief revision (achieved)
Not yet: Predictive learning, System learning, Product learning
Next move: Baseline eval metrics, then let data drive architecture decisions

---

## Reference
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870 (coggan11@gmail.com)
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0 (cassiwika@gmail.com)
- Couple: 8230e60f-44ca-4668-be28-06cb32b1b831
- ABF repo: ABFMaster/ABF-Couples-App
- Nora standalone repo: ABFMaster/Nora-App
- Production ABF: abf-couples-app.vercel.app
- Production Nora: nora-app-mauve.vercel.app
