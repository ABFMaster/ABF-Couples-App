# ABF Product Backlog — Updated 2026-05-07

## BETA READINESS (do first)
- [ ] Onboarding flow visual pass — onboarding/page.js, onboarding/welcome/page.js
- [ ] Connect page visual pass — app/connect/page.js
- [ ] Dead page audit and cleanup — mixtape, timeline, partner-insights, learn, results, settings
- [ ] dates/[id] visual pass — date detail page matches builder aesthetic
- [ ] Full end-to-end test session with Cass — every game mode, every daily activity
- [ ] Remove cron diagnostic logs after push confirmed working
- [ ] Run Nora memory test after 2 weeks real usage

## SPRINT K — DATE NIGHT (in progress)
- [ ] K2: Nora intelligence layer — vibe selection from couple_notes, "why this" one-liner per suggestion
- [ ] K2: Nora date concept — event as anchor, dinner + after suggestions around it
- [ ] K3: In-date experience — automatic date start push at date_time, "We're here" per-stop mechanic
- [ ] K3: In-moment photo capture tied to stop
- [ ] K3: Post-date Nora synthesis
- [ ] K4: Co-creation — partner can suggest/add stops before date locks
- [ ] nearbysearch → Places API New migration (watchlist — works now, will break eventually)
- [ ] Backfill photo_url on custom_dates stops
- [ ] Wire FLIRT_SENT on individual send after Flirts redesign

## SINGLE USER ARC
- [ ] Nora individual insight in Spark State B — deployed, needs real-world validation
- [ ] Nora individual insight in Bet State B — deployed, needs real-world validation
- [ ] Solo experience when Partner 2 hasn't joined yet — Partner 1 needs value before couple is formed
- [ ] Asymmetric engagement handling — when one partner consistently engages less, Nora adapts tone not content

## WEEKLY RHYTHM REDESIGN
- [ ] Tuesday: Hot Take lite — async, simultaneous delivery, both get same questions
- [ ] Thursday: Nora gap prompt — memory-powered question, fallback hierarchy (full memory → question bank → generic)
- [ ] Individual wellbeing pulse — one word before Spark reveal, feeds Nora context
- [ ] Love language flirt mode — flirt generator suggests expression in partner's love language

## NORA INTELLIGENCE
- [ ] Nora named address unlock — post-beta, boolean flag Nora sets herself when confident enough
- [ ] Four Horsemen detection — Tension Intelligence Arc Sprint 4
- [ ] Weekly reflection data quality — system claims week-long observation but only 2 data points fed
- [ ] Nora memory data flow audit — verify all signals accumulating correctly
- [ ] Re-run Nora memory quality test after 2 weeks real usage

## ALWAYS BE FEEDING — REMAINING GAPS
- [ ] Wire FLIRT_SENT on individual flirt send (post Flirts redesign)
- [ ] Manual timeline events via API routes (AddEventModal, date night write, Rabbit Hole) — currently client-side direct writes, low priority

## NEW FEATURES — DESIGNED, NOT BUILT
- [ ] Repair + rupture mechanic — private signal to Nora "things feel off", adjusts week's prompts silently
- [ ] The Dream — shared meaning build on Us page, grows over time via Sunday Reflection prompts
- [ ] Gratitude send — "Send a moment", free text, push notification, no AI, pure signal
- [ ] Notice — one tap "I noticed you today" with optional one line, repurposes flirt infrastructure
- [ ] Replay — Nora resurfaces past Been moment "Still true?" one tap yes/no
- [ ] After Dark — locked section, mutual opt-in, full design sprint when core product validated
- [ ] Individual wellbeing pulse — one word before Spark reveal, partner never sees it

## TENSION INTELLIGENCE ARC
- [ ] Sprint 1: Pre-game tier framing with mutual opt-in
- [ ] Sprint 2: Silent signal detection (skip, stall, abandon tagged to question tier)
- [ ] Sprint 3: Post-session Nora bridge for disengagement
- [ ] Sprint 4: Four Horsemen detection in Nora chat

## ENGAGEMENT & RETENTION
- [ ] Personalized re-engagement push — deployed, validate effectiveness after beta
- [ ] Peer-to-peer Spark invite — deployed, validate usage after beta
- [ ] Game Room as re-engagement tool — Nora suggests game when couple goes quiet on Sparks
- [ ] Push subscription deduplication on registration — prevent cross-account testing conflicts

## PRE-BETA HARDENING (mostly done)
- [x] Beta invite gate
- [x] In-app feedback button
- [x] Data deletion flow (App Store compliant)
- [x] All push/send callers authenticated
- [x] force-dynamic on cron route
- [ ] GoTrueClient singleton — console warning, low priority
- [ ] Invite-only signup fully tested end-to-end with real new user

## PRE-APP STORE
- [ ] Privacy policy
- [ ] Terms of service
- [ ] App Store assets — screenshots, description, preview video
- [ ] iOS push notification permission flow language
- [ ] Native app build (Expo/React Native or PWA wrapper)
- [ ] Data deletion flow verification on App Store review
- [ ] Solo user arc complete before App Store submission

## FLIRTS REDESIGN
- [ ] Feature feels thin — full product discussion needed
- [ ] Nora connection not designed
- [ ] Love language flirt mode (lightweight addition to existing generator)
- [ ] Gratitude send mechanism (could fold into flirts)

## MONETIZATION (post-beta)
- [ ] Define free vs paid tiers
- [ ] Natural paywall moment — when does couple feel "we don't want to lose this"?
- [ ] Subscription trigger design
- [ ] After Dark as premium tier consideration

## PARKING LOT — IDEAS
- [ ] Nora named address unlock — post-beta feature
- [ ] CAH licensing consideration
- [ ] Photo bucket / biometric integration
- [ ] Physical Bet card game
- [ ] Weekly Reflection history view — /reflections page
- [ ] Bet question categories — 120 questions need category field
- [ ] Us in 5 Years / The Dream — designed above
- [ ] Sexual intimacy / After Dark — product decision locked

## TECHNICAL DEBT
- [ ] GoTrueClient multiple instances — parked
- [ ] nearbysearch deprecation watchlist
- [ ] Dead pages: mixtape, timeline, partner-insights, learn, results, settings — audit and delete
- [ ] Cron diagnostic logs — remove after push confirmed working
- [ ] conversation-starters route has no auth guard (any caller can trigger)
