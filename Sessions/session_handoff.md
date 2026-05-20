# ABF Session Handoff — Updated 2026-05-19

## Session Summary
Massive session covering two major feature areas plus Nora standalone launch.

## What Shipped This Session

### Spark Fixes
- Spark reaction UX complete — removed State D, unified reveal, interactive tabs, compact completion summary (❤️ Loved it · 🔥 Keep it coming) after both reaction and rating selected
- Spark submit loading state — "Sharing…" label and disabled during onRespond await
- Spark reaction now saves to DB (question_rating added to /api/spark/react route)
- onReact remount bug fixed — removed from both handleReaction and handleRating

### Nora Hero Card — Full Rewrite
- hero_cache table created (user_id, couple_id, cache_date, type, message, cta_label, cta_href, pills, mode)
- Two generation modes: pre (noraSignal, fast) and post (noraChat, rich)
- Pre-mode: memory-powered observation about this specific person — singular "you", never "you two"
- Post-mode: The Thread — micro-action, pattern connection, or conversation seed after both partners answer
- Cache persists all day, invalidates on Spark respond, Bet respond, Ritual checkin
- Hero card auto-refreshes after Ritual checkin via onCheckinComplete callback
- Ritual longitudinal arc: streak-aware prompts, Week 1/2/3+ language, completion detection
- Pre-mode system prompt rewritten: speaks to individual not couple, singular "you" enforced

### Nora Memory Privacy Fix
- CRITICAL: NORA_CONVERSATION signal was bleeding into couple_notes — private Cass sessions were surfacing in Matt's hero card ("her pressure building sober")
- Fixed: NORA_CONVERSATION and FLIRT_SENT now excluded from couple_notes update
- Existing contaminated couple_notes cleared via SQL
- Architecture clarified: person notes = private per individual, couple_notes = shared signals only (Spark, Bet, Game Room, Ritual, Date, Reflection)

### Push Notification Fixes
- Wrong name bug fixed: sendReengagementPush now generates two separate Nora messages per user (prompt1 for user1, prompt2 for user2) — no more shared copy sent to both
- Ritual push added: fires Friday with ritual title
- Saturday Game Night push added: fires if no session in 3 days, personalized per user
- Sunday Weekly Reflection push added
- Re-engagement scoped to Sunday only (was firing Fri/Sat/Sun)
- Weekly Reflection bug fixed: removed fragile hour !== 3 gate inside processWeeklyReflection, moved day === 0 gate to call site in main loop
- Second cron entry added to vercel.json: 0 13 * * 0 (Sunday 1pm UTC = 6am PT) for Nora synthesis

### Bet Verdict Tone
- Surgical ambiguity guard added to betReactionSettings system prompt: short answers, self-comparison, or self-deprecating humor held lightly — reflect without concluding
- BET_REVEAL memory lens updated: now notes HOW the person expressed their answer (humor, deflection, earnestness) — tone is data

### Me Tab (ABF)
- Profile tab renamed "Me" in BottomNav.js
- Full Me tab built: Notebook (Noticed/Working on/Reflection), Practices (Active/Paused/Done cycle), Nora weekly synthesis card
- Settings moved to initials circle → bottom sheet (Name, Birthday, Anniversary, Timezone, notification toggles, Save, Sign out, Delete)
- hero_cache extended with type column (hero/synthesis), unique constraint updated to (user_id, cache_date, type)
- Sunday synthesis cron wired into scheduled-tasks at 6am gate
- New signal types: NOTEBOOK_ENTRY, PRACTICE_ADDED, PRACTICE_UPDATED — person notes only, never couple_notes
- New tables: notebook_entries, user_practices
- New API routes: /api/notebook/entry, /api/notebook/entries, /api/notebook/entry/[id], /api/practices, /api/practices/[id], /api/me/synthesis

### Nora Standalone — "Nora" app launched
- New repo: ABFMaster/Nora-App
- New Supabase project: nora-standalone (qzhnsxdyqlanwgqlcrin.supabase.co)
- Live at: https://nora-app-mauve.vercel.app
- Stack: Next.js 15, Tailwind, same Anthropic + Supabase patterns as ABF
- Brand identity: coral wordmark, gold dot above for brand contexts, dot-left for in-app presence
- 6-screen onboarding: name, why here, working on (→ first notebook entry), hard feelings (one tap), good week, Nora ready
- Two tabs: Nora (chat) + Me (notebook/practices/synthesis)
- Feedback system: FeedbackCard component (post-session after 4+ messages, mid-check after 12+), Day7Survey in Me tab, /api/feedback route
- Invite message drafted and ready to send
- lib/nora-memory.js adapted for solo use (user_id as key, single user_notes layer, no couple layer)
- vercel.json: Sunday 1pm UTC cron for synthesis

## Verification Checkpoints — Watch This Week
- Wednesday 3am PT: Bet push fires for both Matt and Cass with correct names
- Friday 3am PT: Ritual push fires with "The Six-Second Kiss — check in together today."
- Saturday 3am PT: Game Night push fires if no session in 3 days
- Sunday 3am PT: Weekly Reflection push fires + reflection generates (check Vercel logs for [reflection/generate])
- Sunday 6am PT: Nora synthesis generates for Me tab (check hero_cache for type='synthesis' rows)
- Monday Spark: hero card auto-flips to post-mode after both Matt and Cass answer without manual cache clear

## Active Bugs
- Push delivery logging — no visibility into APNs/FCM failures, need push_log table
- Ritual card resets to pre-state on page reload (separate from hero card, which is correct)
- Nora standalone cron route not yet built — Sunday synthesis will 404 until built
- GoTrueClient singleton warning — low priority

## Architecture Notes
- hero_cache is now the single cache for both hero (dashboard) and synthesis (Me tab) — differentiated by type column
- All hero card logic: check cache first → cache hit serve immediately → cache miss generate → write cache → return
- Cache invalidation: Spark respond, Bet respond, Ritual checkin all delete couple's cache rows fire-and-forget
- Nora memory privacy boundary: SHARED_SIGNALS array in lib/nora-memory.js is the gate — only signals in that array update couple_notes
- Me tab notebook/practices: couple_id nullable throughout — supports solo users

## Key Test User IDs
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0
- Couple ID: 8230e60f-44ca-4668-be28-06cb32b1b831

## Next Session Priorities
1. Verify Wednesday Bet push (correct names, correct copy)
2. Nora standalone cron route — build before Sunday
3. Full Cass end-to-end test — still the beta gate
4. Push delivery logging (push_log table)
5. Weekly Reflection verification Sunday morning
