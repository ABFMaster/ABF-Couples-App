# ABF + Nora — Product Backlog
Last updated: July 27, 2026

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
- 🟢 Planning flow redesign — itinerary-first, stops visible as cards while building, not hidden in bottom bar
- 🟢 Photo upload in date detail — users want to add photos during/after the date
- 🟢 Home page upcoming strip — show planned date within 48 hours contextually, disappears otherwise. Agreed design: one line between Nora card and Flirt card, only within 48hr window
- 🟢 Movie/Show stop map fix — non-location stops cause map to disappear
- 🟢 List/Map toggle — currently does nothing
- 🟢 Expanding map hides category pills — z-index issue
- 🟡 Ideas For You Two personalization — pass Nora's couple knowledge into search prompt so results are specific to Matt + Cass not generic
- 🟡 During-date interactivity — location-based prompts, Game Room integration at stops, photo capture prompt
- 📋 Game Room + Date Night integration — promote Game Room within date flow, between stops

### Couples Memory
- 🟢 Dream trip flow on /us/add — currently stubs to /shared/add, needs proper creation flow
- 📋 Photo attribution in memory events — subtle indicator of who added which photo. Not vital, tabled.

### Daily Rhythm
- 🟡 "Now do this" post-activity mechanic — after Spark, Bet, Notice etc. External advisor flagged this gap. TBD design — where does it go without cluttering home page?
- 📋 Past Reflections collapsed list design
- 📋 Sunday Review outcome tracking
- 📋 Game Room Talk to Nora links — verify exist, add if missing

### Session-Based Conversations (ABF)
- 🟡 Session-based Nora conversations for couples — designed (SESSION-DESIGN.md), not built. Nora Standalone has it. ABF needs same pattern.

---

## ABF — TECHNICAL

### Security
- 🟢 57 API routes without explicit auth — real vulnerability. Must fix before public launch. Not blocking current private users.

### Data
- 🟢 Bet questions category field — 120 questions in lib/bet-questions.js need { category } added (preferences/likely/reactions/confessions). question_category column exists in bets table and is nullable.

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
