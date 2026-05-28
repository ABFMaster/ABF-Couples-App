# ABF Product Backlog — Updated 2026-05-14

## BUGS — ACTIVE (found in testing, fix before beta)
- [x] Spark reaction (Made me Smile, Keep It Coming) never persists — local state only, never saved to DB — FIXED 2026-05-19
- [x] Nora home prompt showing wrong content on wrong days — Bet/Ritual copy appearing on incorrect days — FIXED force-dynamic 2026-05-14, hero card rewritten 2026-05-19
- [ ] Location images not always showing on date banners and Next Up card
- [ ] Ritual "We did it" not showing progress on Us page after completion
- [x] No Nora verdict on Spark — FIXED: removed await from all push/send calls, verified working 2026-05-13
- [x] Push delivery logging — push_log table built, all 18 peer-to-peer routes labeled, all 6 cron routes labeled 2026-05-21
- [x] Multi-device push — last device wins fix deployed 2026-05-21
- [x] Spark reaction UX — tapping a reaction closes tabs instead of highlighting selection. Cannot change reaction after first tap. Needs persistent selected state with visual highlight.
- [x] Spark submit button no loading state — "Share my answer" shows no feedback for 2-3 seconds after tap
- [x] Nora hero card wrong day content — force-dynamic fix deployed 2026-05-14, FIXED 2026-05-19
- [ ] Bet verdict tone — misreads self-deprecating humor as vulnerability (Cass: "I am already my mother" read as confession not self-aware humor). Needs prompt tuning.
- [ ] Ritual card resets to pre-state on page reload — shows checkin buttons again after completion
- [x] Weekly Reflection not triggering — hour gate removed, day gate moved to call site 2026-05-21
- [ ] Nora standalone synthesis cron route missing — Sunday synthesis will 404, build before 2026-05-25
- [x] Push wrong person name — FIXED 2026-05-19 (per-user reengagement copy), verify Wednesday
- [x] Nora privacy leak — FIXED 2026-05-19 (NORA_CONVERSATION excluded from couple_notes, couple_notes cleared)
- [ ] Google Cloud free trial ended — Places API breaks in 30 days, upgrade required URGENT

## BETA READINESS (do first)
- [x] Onboarding flow visual pass — onboarding/page.js, onboarding/welcome/page.js
- [x] Connect page visual pass — app/connect/page.js
- [x] Dead page audit and cleanup — mixtape, timeline, partner-insights, learn, results, settings
- [x] dates/[id] visual pass — date detail page matches builder aesthetic
- [x] Privacy communication — onboarding screen, How Nora works in settings, first-session acknowledgment
- [x] Push delivery logging — full visibility into all push attempts
- [ ] Full end-to-end test session with Cass — every game mode, every daily activity
- [x] Remove cron diagnostic logs after push confirmed working
- [ ] Run Nora memory test after 2 weeks real usage
- [x] Nora hero card — memory-powered pre/post modes, hero_cache, auto-invalidation
- [x] Me tab — Notebook, Practices, synthesis card, nav renamed

## NORA STANDALONE — LAUNCHED 2026-05-19
- Live: https://nora-app-mauve.vercel.app
- Repo: ABFMaster/Nora-App
- Supabase: nora-standalone project
- Status: functional, ready for friends/family test group
- Pending: synthesis cron route, feedback verification
- Invite message: drafted and ready to send
- Test group: Cass + 2-5 friends/family, direct send

## IMAGE EXPANSION
- [x] Place photo permanent storage — Supabase Storage bucket 'date-photos', lib/place-photo.js, wired into date builder and edit page, backfill script run 2026-05-14
- [ ] Relationship Room — onboarding photo prompts ("Where did you meet?", "Your first date?"), source via Places API or user upload, store as couple visual identity anchors. Solo user arc: build before partner joins.
- [ ] Next Up card photo — show first stop photo on dashboard Next Up card when date is planned
- [ ] Date suggestion cards — surface real place photos on Ideas for You Two suggestion cards
- [ ] Image expansion sprint — surface permanent place photos anywhere a visual anchor elevates experience

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

### Google Maps Platform Upgrades (Cloud Next 2026)
These were announced at Google Cloud Next and are directly relevant to Date Night's roadmap.

**New PlaceTypes (~200 new granular categories)**
- What it is: granular place types like specific cuisine, activity types, venue specifics — far more precise than current broad types (restaurant, bar, park)
- Why it matters: Nora's date suggestions become more specific. Instead of "restaurant" she can suggest "izakaya" or "rooftop bar" or "jazz club" — categories that match couple interests
- What to wire: Update CATEGORY_TO_GOOGLE_TYPE map in dates/suggestions/route.js and CATEGORY_CHIPS in dates/custom/page.js to use new granular types. Map couple interests from game room onboarding to specific place types for Nora intelligence layer
- Priority: K2 — wire during Nora intelligence layer sprint
- Effort: Medium — mapping exercise + API update

**Search Along Route**
- What it is: discover points of interest along a route between origin and destination, up to 13 waypoints
- Why it matters: in-date experience — "you're heading to the concert, here's a dinner stop 10 minutes off your route" — this is the composable date architecture we designed
- What to wire: new /api/dates/along-route endpoint using Grounding with Google Maps, called when a date has 2+ stops with geo coordinates. Surface in date detail view as "stops along your way" suggestions
- Priority: K3 — in-date experience sprint
- Effort: Medium-High — new route, new UI surface in dates/[id]/page.js

**Grounding Lite via MCP (Google Maps MCP server)**
- What it is: lightweight MCP integration giving AI agents access to Places, Routes, and Weather data
- Why it matters: Nora date concept — instead of pre-fetching suggestions, Nora calls Google Maps as a tool during date planning. "Find me a jazz bar within 10 minutes of the venue" becomes a real-time tool call
- What to wire: integrate Google Maps MCP server into /api/dates/suggestions route, allow Nora to make live tool calls for date planning rather than static category fetches
- Priority: K2/K3 — evaluate during Nora date concept sprint
- Effort: High — architectural change to how suggestions work

**3D Maps / Abstract Basemaps**
- What it is: photorealistic 3D maps with brand customization, toggleable between 3D and abstract views
- Why it matters: date detail page and builder map strip could be significantly more visually compelling — showing the date route in 3D would make the "building a date" feeling tangible
- What to wire: replace current flat Google Maps embed in dates/custom/page.js map strip and dates/[id]/page.js static map with 3D Maps for JavaScript. Apply ABF warm color palette as custom basemap
- Priority: Post-K3 — polish sprint after core date functionality complete
- Effort: Medium — SDK swap + styling

**Places UI Kit**
- What it is: ready-to-use component library powered by Google Maps Places data — pre-built place cards, search UI, etc.
- Why it matters: could replace our custom NearbyCard component with Google's native place presentation — photos, hours, ratings, reviews all built in
- What to wire: evaluate as replacement for NearbyCard in dates/custom/page.js. If visual quality exceeds current custom cards, swap out. If not, use only specific data fields
- Priority: K2 evaluation — assess during Nora picks panel polish
- Effort: Low-Medium — component evaluation and potential swap

**Overall Date Night UX note:**
These APIs don't fix UX — they enrich content. The current builder UX is functional but the discovery surface lacks depth and the detail pages lack the immersive quality that makes a date feel exciting before it happens. The right order: fix UX architecture first (K2/K3), then layer in richer map and place data to elevate the visual experience. 3D maps and Places UI Kit are polish that amplifies good UX — they cannot substitute for it.

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
- [ ] Weekly Reflection — rebuilt and live. Nora draws from Sparks, Bets, rituals, dates, nora_memory. Sunday cron generation. "Talk to Nora" handoff. Past reflections archive. Run Nora memory test after 2 weeks real usage to validate reflection quality.

## ONBOARDING & TUTORIAL DESIGN SPRINT
Status: Designed, not built. Requires dedicated session before implementation.

### Core Philosophy (locked)
- Nora is the guide — not tooltips, not carousels, not explainer screens
- Education happens at moment of value, not upfront
- Users go from "this seems cool" to "holy shit she can do that?" through experience
- Nora never announces her own progression ("I know you better now") — she demonstrates it
- Progression is felt, not named

### Tutorial/Walkthrough Design (locked direction, not built)
- No feature carousel upfront
- No tooltip overlays
- Contextual education: after first Spark reveal, after first Bet, etc — Nora delivers one sentence contextualizing what just happened
- First week is a guided experience with Nora as narrator
- Mock up before building — design first

### Nora Introduction — Open Question
How do we elegantly introduce Nora's abilities without scaring users?
- She should be quiet about what she's doing (established principle)
- But there is room to hint at her capabilities early — needs design
- Balance: enough to spark curiosity, not enough to feel invasive
- "This seems cool" → "holy shit she can do that?" arc
- Needs dedicated design work before implementation

### Daily Rhythm Introduction (direction locked)
- Introduce several things on Day 1: Spark, Ritual, Game Room, Reflection
- Expand on others as they arrive: Bet introduced Tuesday, Notice introduced Wednesday, Nora's Day introduced Thursday
- Each new feature gets a Nora contextual introduction on first encounter

### Day 1 vs Day 30 Hero Card (open)
- Day 1: Nora is just getting started — curious, warm, building the picture
- Day 30: Relationship is built, Nora is trusted counsel
- Exact language and design to be determined in design sprint
- Core principle: the progression is felt through specificity, not announced

### The "Aha Moment" (open — requires design sprint)
- Goal: first holy shit moment by Day 7 for engaged couples
- Requires multiple moving parts working together
- Nora's tier system, signal accumulation, hero card specificity all contribute
- Need to design the guaranteed path to this moment
- Questions to answer in design sprint:
  - What is the specific moment we're designing toward?
  - What has to happen in the first week to guarantee it?
  - How do we design for it without making it feel manufactured?

### Nora Arc Progression (open — requires design sprint)
- Individual arc: 0-5 discovery, 6-15 pattern recognition, 16+ earned intimacy
- Couple arc: 0-7 new together, 8-20 building context, 21+ deep familiarity
- Signal definitions and thresholds locked (see NORA INTELLIGENCE section)
- Tier context blocks drafted, reviewed against Voss/Gadney/Van Dam
- Implementation ready pending design sprint sign-off

### Pre-Build Checklist
- [ ] Mock up tutorial flow
- [ ] Design Nora introduction language for onboarding
- [ ] Design Day 1 hero card language
- [ ] Design contextual education sentences for each feature first-encounter
- [ ] Define and design the guaranteed Day 7 aha moment path
- [ ] Sign off on tier context blocks before implementation

## NORA INTELLIGENCE
- [x] Nora architecture unification — NORA_VOICE powers all surfaces, assessment data wired into ai-coach, buildCoachSystem, getMemoryBriefing rename 2026-05-21
- [x] Verdict quality pass — all 7 routes have memory context, names used, find what they didn't say 2026-05-21
- [ ] Nora named address unlock — post-beta, boolean flag Nora sets herself when confident enough
- [ ] Four Horsemen detection — Tension Intelligence Arc Sprint 4
- [ ] Weekly reflection data quality — system claims week-long observation but only 2 data points fed
- [ ] Nora memory data flow audit — verify all signals accumulating correctly
- [ ] Re-run Nora memory quality test after 2 weeks real usage
- [ ] Nora Relationship Arc Sprint — research therapist rapport-building with new couples. Redesign hero card prompt to progress: Week 1 warm curiosity → Week 2 first pattern observations → Week 3+ earned specificity. "Holy shit she sees us" moment by day 7.
- [x] Nora hero card prompt pass — PRE mode rewritten, singular you enforced 2026-05-19
- [x] Bet verdict prompt tuning — surgical ambiguity guard added, BET_REVEAL memory lens updated 2026-05-19

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
- [ ] Joint couple Nora session — both partners in same Nora conversation simultaneously. Review previous design conversations before building.
- [ ] Nora context handoff system — universal pattern for launching Nora from any surface (reflection, verdict, Spark reveal, date debrief) with pre-loaded context. Nora opens conversation, not user.
- [ ] Push delivery logging — log send attempts, endpoint, response code to push_log table
- [ ] Us/Now dynamic presence sprint — day-aware, activity-aware content surfacing. Nora card responds to what happened this week not just the schedule.
- [ ] Nora Relationship Arc — therapist-informed rapport building across first 3 weeks

## TECHNICAL DEBT
- [ ] GoTrueClient multiple instances — parked
- [ ] nearbysearch deprecation watchlist
- [ ] Dead pages: mixtape, timeline, partner-insights, learn, results, settings — audit and delete
- [ ] Cron diagnostic logs — remove after push confirmed working
- [x] conversation-starters route has no auth guard (any caller can trigger)
- [x] Multi-device push deduplication — last device wins 2026-05-21
- [x] Push route labels — all 18 peer-to-peer + 6 cron call sites labeled 2026-05-21
- [ ] window.location usage in dashboard/page.js and us/page.js — should use useSearchParams with Suspense wrapper
- [ ] relationship_points written directly from client components (FlirtView, FlirtComposer) — should go through API route
- [ ] Pre-App Store hardening sprint — add Bearer JWT auth to all 56 unprotected API routes
- [x] force-dynamic missing from all API routes — FIXED 2026-05-14, added to all 68 routes
- [ ] New API route checklist — every new route must include: export const dynamic = 'force-dynamic', Bearer JWT auth, console.error in catch only (no console.log)
- [ ] Nora standalone cron route — build /api/cron/scheduled-tasks in Nora-App before Sunday 2026-05-25
- [ ] hero_cache type constraint — onConflict updated to user_id,cache_date,type everywhere
- [ ] Google Places API key documentation — three keys exist with unclear ownership. Document: NEXT_PUBLIC_GOOGLE_PLACES_API_KEY (browser/Maps JS, referrer-restricted), GOOGLE_PLACES_API_KEY (unknown), GOOGLE_PLACES_SERVER_KEY (server-side, unrestricted, use for Places API calls)

## SECURITY — PRE-SCALE
Items that are acceptable at beta scale but must be addressed before public launch or significant user growth.

### Requires Supabase Pro Plan
- [ ] Prevent use of leaked passwords — enable HaveIBeenPwned password checking in Auth → Attack Protection. Requires Pro plan upgrade.

### Requires attention before 100+ users
- [ ] Public bucket listing — date-photos, photos, timeline-photos, trip-photos buckets allow clients to enumerate all files. Tighten SELECT policies to prevent listing while keeping object URL access. Low risk at beta scale.
- [ ] Authenticated SECURITY DEFINER functions — 9 functions callable by signed-in users via REST API. Currently acceptable as these are intentional features, but should be audited and moved to SECURITY INVOKER where possible before public launch.

### Completed
- [x] Anon SECURITY DEFINER functions — revoked anon execute on 12 functions 2026-05-27
- [x] Google Cloud upgrade — paid account, Places API safe 2026-05-22

### October 30, 2026 deadline
- [ ] Supabase public schema grants — new tables in public schema will require explicit GRANT statements. Run Security Advisor before October 30 and add explicit grants to table-creation flow.
