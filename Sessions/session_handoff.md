# ABF Session Handoff — Updated 2026-05-21

## Session Summary
Two-day session covering Nora architecture unification, standalone Nora launch, privacy implementation, sprint quality work, and push system completion.

## What Shipped This Session

### Nora Architecture Unification — Most Important Work
- NORA_VOICE (lib/nora-knowledge.js) now powers ALL surfaces — ai-coach, verdicts, game room, hero card, standalone Nora. One character foundation everywhere.
- buildCoachSystem() added to lib/nora.js — ai-coach now builds prompt from NORA_VOICE + clinical knowledge + operational rules
- getNoraBriefing from nora-knowledge.js finally wired into ai-coach — assessment data (attachment styles, conflict styles, love languages, pairing matrix) now flows into coaching sessions for the first time
- getMemoryBriefing rename — getNoraBriefing in nora-memory.js renamed to avoid naming conflict. 8 call sites updated atomically.
- ai-coach now receives BOTH assessment briefing (nora-knowledge.js) AND memory briefing (nora-memory.js) — full context for the first time
- Calibrated question technique (Voss) added to CLINICAL_KNOWLEDGE — how/what questions, tactical empathy, mirroring
- Guide character framing (Gadney) added — Nora is a presence in this couple's story, not a tool
- NORA_SYSTEM_PROMPT deleted and replaced with CLINICAL_KNOWLEDGE + OPERATIONAL_RULES constants built via buildCoachSystem()
- Standalone Nora chat route wired to NORA_VOICE — same character foundation as ABF

### Verdict Quality Pass — All 7 Routes
- getNoraMemory + getMemoryBriefing added to all 7 verdict routes
- Nora now has memory context in every game room verdict — no longer observing strangers
- System prompts updated: use actual names not "one of you", find what they didn't say, don't explain it
- updateNoraMemory added to challenge/memory/verdict and challenge/rank/finalize (were missing entirely)

### Privacy Implementation
- app/onboarding/privacy/page.js — new screen between welcome and onboarding. Matt's personal commitment. "Before we begin."
- "How Nora works" added to Me tab settings sheet — full privacy statement always accessible
- Nora first-session acknowledgment added to NORA_SYSTEM_PROMPT — she naturally names the privacy boundary in the first message of a new conversation
- Settings sheet close bug fixed — × button added, maxHeight 80vh, position context fix

### Push System Completion
- push_log table created — logs every push attempt with status, status_code, error_message, route, title, body
- Route labels added to all 6 cron triggers (spark, bet, ritual, game-night, reflection, reengagement)
- Route labels added to all 18 peer-to-peer push call sites
- Multi-device push bug fixed — all user subscriptions deleted before new registration, last device wins
- Weekly Reflection cron bug fixed — removed fragile hour !== 3 gate, moved day === 0 check to call site
- Ritual push added (Friday), Saturday Game Night push added, Sunday Reflection push added
- Re-engagement scoped to Sunday only
- Second cron entry added to vercel.json: Sunday 1pm UTC (6am PT) for Nora synthesis

### Nora Standalone — Launched
- Live at: https://nora-app-mauve.vercel.app
- Repo: ABFMaster/Nora-App
- Supabase: nora-standalone project
- Full onboarding: 6 screens, seeds notebook + Nora memory
- Feedback system: FeedbackCard (post-session, mid-check), Day7Survey in Me tab
- Welcome email: Resend integration, personal letter from Matt, fires on onboarding completion
- Feedback re-show bug fixed — DB as source of truth on mount
- Nora synthesis cron confirmed working (processed 2/2 manually tested)

### Me Tab (ABF)
- Profile tab renamed "Me"
- Notebook, Practices, Nora synthesis card all working
- Sunday synthesis cron wired at 6am gate
- Settings sheet: all profile fields, How Nora works section, close button

### Bet Verdict Tone
- Surgical ambiguity guard — short/self-deprecating answers held lightly
- BET_REVEAL memory lens updated — tone is data

### Hero Card
- Pre-mode system prompt rewritten — singular "you", speaks to individual not couple
- Cache auto-invalidation on Spark, Bet, Ritual completion

## Verification Checkpoints — Watch This Week
- Friday 3am PT — Ritual push fires with ritual title
- Saturday 3am PT — Game Night push fires if no session in 3 days
- Sunday 3am PT — Weekly Reflection push + reflection generates
- Sunday 6am PT — Nora synthesis generates for Me tab
- Next Wednesday 3am PT — First logged Bet cron push

## Active Bugs
- Ritual card resets to pre-state on page reload — seeding fix deployed, verify Friday
- GoTrueClient singleton warning — low priority
- Google Cloud free trial ended — 30 day countdown before Places API breaks, URGENT

## Architecture Notes
- NORA_VOICE in lib/nora-knowledge.js is the single source of truth for Nora's character
- buildCoachSystem(clinicalKnowledge, operationalRules) in lib/nora.js builds the ai-coach prompt
- getNoraBriefing (nora-knowledge.js) = assessment data, takes full profile objects
- getMemoryBriefing (nora-memory.js) = synthesized memory notes, takes (memory, user1Name, user2Name)
- ai-coach uses both: assessmentBriefing + memoryBriefing combined into fullContext
- All verdict routes use getMemoryBriefing for memory context
- push_log table captures every push attempt — query for visibility into delivery failures
- Last device wins for push subscriptions — multi-device deduplication fixed

## Key Test User IDs
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0
- Couple ID: 8230e60f-44ca-4668-be28-06cb32b1b831

## Next Session Priorities
1. Google Cloud upgrade — urgent, Places API breaks in 30 days
2. Full Cass end-to-end test — beta gate
3. Verify Friday Ritual push and Saturday Game Night push
4. Nora standalone — send invites to test group
5. Invite-only signup end-to-end test with real new user
6. Nora Relationship Arc design sprint
7. Weekly rhythm rebuild — Thursday Nora gap prompt, Tuesday Hot Take lite
