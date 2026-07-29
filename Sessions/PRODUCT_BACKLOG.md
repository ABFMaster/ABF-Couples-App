# ABF + Nora — Product Backlog
Last updated: July 28, 2026

This file is permanent and cumulative. Add items, update status, never delete history.

---

## STATUS KEY
- 🔴 Blocked
- 🟡 Designed, not built
- 🟢 Ready to build
- ✅ Done
- 📋 Backlog

---

## ABF — FEATURES

### Date Night
- ✅ Planning flow redesign — itinerary-first, stops visible as cards while building, not hidden in bottom bar
- ✅ Photo upload in date detail — multi-select, uploads all chosen files
- 🟢 Home page upcoming strip — show planned date within 48 hours contextually, disappears otherwise. Agreed design: one line between Nora card and Flirt card, only within 48hr window
- ✅ Movie/Show stop map fix — non-location stops cause map to disappear
- ✅ List/Map toggle — removed dead toggle in custom/page.js (edit/page.js's toggle was already functional, untouched)
- ✅ Expanding map hides category pills — resolved via the planning-flow redesign above
- ✅ Ideas For You Two personalization — built differently than originally scoped: instead of passing Nora's free-text couple knowledge into a search prompt, wired selectDateSuggestions() to weight each vibe's category by the couple's relationship_assessments scores, exclude previously-visited places (avoidPlaceIds), and apply real price-level filtering. Ticketmaster events now vary per vibe via a keyword param (adventure -> "experience", culture -> "theater", nightlife -> "music"). Passing actual Nora couple-knowledge into a live web-search prompt is still the bigger unbuilt idea — see AI web-search agent below.
- ✅ Post-date reflection mechanic (new item, not originally listed) — replaced the 5-star "How was the date?" modal with 4 text reaction pills (Loved it / Really good / It was fine / Not for us — no emoji, ABF rule), optional note, per-user Mark as Done guard (was repeat-clickable before), immediate push to the partner when one side completes, Nora observation once both have reflected, and a once-daily cron nudge for whoever hasn't reflected on a past date yet.
- 🟡 During-date interactivity — location-based prompts, Game Room integration at stops, photo capture prompt
- 📋 Game Room + Date Night integration — promote Game Room within date flow, between stops
- 🟡 AI web-search suggestion agent — discussed in depth July 27-28. Cost estimate ~$0.05-0.08/request ($25-3000/month at 100-10k users, Sonnet 5 pricing + $0.01/search). Explicit sequencing agreed: wire up the existing engine first (done above), then decide if it's still needed. Verdict as of July 28: Ticketmaster keyword variation is a band-aid, not a real fix — it can't surface non-Ticketmaster experiences (the "Mind of a Serial Killer" example) no matter how it's tuned. Still holding off building until real usage data comes in on the wired-up version.

### Couples Memory
- 🟢 Dream trip flow on /us/add — currently stubs to /shared/add, needs proper creation flow
- 📋 Photo attribution in memory events — subtle indicator of who added which photo. Not vital, tabled.

### Daily Rhythm
- 🟡 "The Follow-Through" (working name) — post-activity real-world action mechanic. Design settled July 28 after a full research + competitor pass — see Sessions/NOW_DO_THIS_DESIGN.md. Starts on Bet only: same-day Nora-generated action tied to today's answers, two-tier reveal (solo Nora reaction immediately, mutual bonus reveal once both respond), no push notification (passive card surfaced at next natural app-open), total-count tracking never a breakable streak, rare wildcard days (bigger scope or partner-authored). Folds into the existing live Sunday Weekly Reflection with a new visual element. Open dependencies before build: distress-sensitivity in generation isn't solved yet, per-couple opt-out undecided, generation prompt inputs need their own scoping pass.
- ✅ Bet flip animation only triggerable by whoever answers last (July 28) — root cause: the reveal-skip shortcut was gated on the couple both having answered, not on whether this specific user had personally triggered their own reveal yet. Whoever answers first has nothing to do but leave and come back, so they'd reopen to an already-resolved Bet and get skipped straight past the flip animation, while whoever answered last (still on the live page) got the full experience. Fixed via bet_responses.reveal_seen_at, set per-user the first time they tap "Reveal the cards" — needs a migration, see chat.
- 📋 Past Reflections collapsed list design
- 📋 Sunday Review outcome tracking
- 📋 Game Room Talk to Nora links — verify exist, add if missing

### Session-Based Conversations (ABF)
- 🟡 Session-based Nora conversations for couples — designed (SESSION-DESIGN.md), not built. Nora Standalone has it. ABF needs same pattern.

---

## ABF — TECHNICAL

### Security
- 🟢 57 API routes without explicit auth — re-confirmed accurate July 28 (109 total routes, exactly 57 have no auth-check pattern). Real vulnerability. Must fix before public launch. Not blocking current private users. This is the single highest-priority technical item outstanding.

### Data
- 🟢 Bet questions category field — 120 questions in lib/bet-questions.js need { category } added (preferences/likely/reactions/confessions). question_category column exists in bets table and is nullable.

### Audit findings — July 28 code review
- ✅ Daily Check-in feature confirmed intentionally killed (July 28) — not a bug. Spark, Bet, etc. are the actual daily-activity engagement surface; Daily Check-in was deliberately retired. Still open: lib/checkin-questions.js is fully orphaned (zero imports) and lib/checkin-patterns.js's analyzeUserPatterns() (used by the AI coach) still reads from the now-dead daily_checkins table. Cleanup pass needed: delete lib/checkin-questions.js, decide whether analyzeUserPatterns should be retired too or repointed at Spark/Bet response data instead.
- 🟢 Morning-after reflection push (see Post-date reflection mechanic above) was gated on a local hour with no corresponding cron schedule entry — fixed July 28, added a dedicated vercel.json cron. Flag: app now has 7 cron entries on one route; Vercel Hobby plan caps at 2, worth confirming plan/dashboard state.
- 🟢 maxPrice/price_level accepted by app/api/dates/suggestions/route.js but never applied to the Google Places call — fixed July 28.
- 📋 ~25 exported functions/constants in lib/ have zero imports anywhere else in the app (e.g. lib/checkin-patterns.js's analyzeCouplePatterns/detectConcerns/generateWeeklySummary, lib/nora-knowledge.js's getDiscrepancyNotes, lib/ritual-suggestions.js's getRitualsByTag/getRitualsByTier/getSeasonalRituals, lib/date-suggestions.js's fetchNearbyPlaces). Some are likely intentional (raw data arrays consumed internally by a wrapper function in the same file); a few look like whole built-but-never-wired capabilities worth a closer look, particularly the checkin-patterns trio and getDiscrepancyNotes. Not verified individually — worth a dedicated pass, not urgent.
- 📋 Known low-priority edge cases documented in code comments, not fixed: a narrow race if both partners tap Mark as Done within the same instant (app/api/dates/complete/route.js), and unavoidable category overlap between two vibes' assessment-driven alternates (app/dates/page.js VIBE_CATEGORIES) when only 5 categories exist for 3 vibes.

---

## NORA STANDALONE

### App Store
- 🔴 Apple Developer account — $99/year enrollment at developer.apple.com/programs/enroll. Blocks device signing and submission. Everything else is ready.
- 🟡 App Store assets — screenshots, description, keywords. Not yet created.

### Monetization
- 🟡 Freemium model — 30-day reverse trial (unlimited), then 100 msg/month free, $7.99/month premium. Designed in detail, not built. Requires RevenueCat + StoreKit 2 integration.

### Infrastructure
- 🟢 Nora email domain — privacy policy uses coggan11@gmail.com. Needs proper domain before public launch.
- 🟢 Welcome email sender — currently onboarding@resend.dev. Needs branded sender.
- 🟢 nora_conversations table — safe to deprecate 30 days after migration to nora_sessions (migrated July 2026).

---

## NORA FOR PRACTITIONERS

- 🟡 Constitution V1 — drafted
- 🟡 Research — Tally form live at tally.so/r/aQgao2, two practitioners contacted
- 📋 Product build — waiting on practitioner research synthesis before scoping
- 📋 Practitioner dashboard — therapist sets frame, Nora holds between-session space

---

## BOTH PRODUCTS

### Voice + Quality
- 🟢 Nora voice refinement — reduce response restatement, vary entry points, cut affirmation formula before substance, closing questions should open new territory not summarize. System prompt pass needed on BOTH products.

### UX
- 📋 Pinch to zoom in photo viewer — blocked by PWA viewport restrictions. Log for native app era.

---

## COMPLETED (recent)

- ✅ FlirtCard redesign — retro postcard front, 3D flip, airmail back, ABF stamp, tap reactions
- ✅ Memory / Photo feature — /us/add, partner photo append, Nora observation, photo gallery viewer
- ✅ Notice late submission — extended to 10pm Pacific, 6pm evening reminder push
- ✅ Date Night — color palette, custom_dates consolidation, creator auto-confirm, mark done guard, conversation starters fixed, Next Up hero photo
- ✅ Security audit — Next.js 16.2.10, ANTHROPIC_API_KEY fix, RLS verified, rate limiting
- ✅ Nora Standalone — iOS simulator verified, new user experience, push notifications, privacy/terms
- ✅ July 28 — Date Night bug batch: grid ordering, hero image locking, dead List/Map toggle removed, Movie/Show map fix, planning-flow redesign, multi-photo upload, dashboard hero CTA routing fix
- ✅ July 28 — Full palette pass across Date Night (2 rounds — CURATED_IDEAS cards, history header, Next Up banner, button gradients), km→miles distance fix
- ✅ July 28 — Post-date reflection mechanic (reaction pills, no stars/emoji, Mark as Done per-user guard + partner push, Nora observation, morning-after cron nudge)
- ✅ July 28 — Ideas For You Two personalization (assessment-weighted category picking, avoidPlaceIds, Ticketmaster keyword variation), fixed two follow-on bugs (Slow/Just Us collapsing onto the same category by default; maxPrice/price_level never actually applied)
- ✅ July 28 — Code audit: missing force-dynamic on 1 route, 4 leftover debug console.logs in profile photo upload, missing cron schedule entry for the morning-after push, Date History star badge silently going blank for new completions
