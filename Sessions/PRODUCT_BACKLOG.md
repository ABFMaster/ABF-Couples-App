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
- ✅ "The Follow-Through" (working name) — post-activity real-world action mechanic, built July 29. Design settled July 28-29 after a full research + competitor pass and state-machine stress test — see Sessions/NOW_DO_THIS_DESIGN.md and Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md. Bet-only v1: per-partner Nora-generated action (tagged other-directed or self-directed at generation time, determines what Tier 2 shows), two-tier reveal (solo reaction on your own report, mutual synthesis once both report), distress gate (trajectory check + per-night classifier), rare wildcards (bigger-scope or partner-authored, ~10% eligible nights), asymmetric-completion nudge reusing the existing Nora hero-card slot. No new dashboard module — reuses Bet's own card slot, morphing between a carryover report face and today's activity via a flip transition. Not yet live-tested end to end (next Tuesday's Bet, or a forced `?bet=true`, is the first real chance). Weekly Reflection visual element (the recap row) not yet built — separate follow-up.
- ✅ Follow-Through extended to Spark (July 30) — built per Sessions/FOLLOW_THROUGH_WEEKLY_ROLLOUT.md. Added spark_responses.reveal_seen_at (set automatically once Spark's pillsShown animation completes, mirroring Bet's tap-based flag). Extracted the Bet-only generateFollowThrough() into lib/follow-through.js, generalized over source type/label/question/answers, so both routes share one implementation. FollowThroughCard now wraps SparkCard the same way it wraps BetCard. Wednesday/Thursday's fixed-7pm-clock reveal trigger is still unresolved — deliberately deferred to its own investigation, not guessed at.
- ✅ Real bug found and fixed during the Spark extension: /api/follow-through/today never gated on the user's own source-activity reveal (bet_responses.reveal_seen_at / spark_responses.reveal_seen_at) before going active — meaning Follow-Through could steal the card slot the instant generation fired, before either partner had even seen their own Bet/Spark reveal. This was explicitly called for in NOW_DO_THIS_DESIGN.md's "Per-user gating" section but never actually wired in. Fixed via hasSeenSourceReveal() in the /today route.
- ✅ Ritual enrichment built (July 30) — all 4 pieces from Sessions/RITUAL_ENRICHMENT_DESIGN.md. (1) Deleted the static NORA_WEEK_MESSAGES lookup table, replaced with a live noraReact call at check-in time referencing the actual ritual + streak, persisted to ritual_completions.nora_reaction. (2) Added an optional, skippable reflection textarea at check-in (ritual_completions.reflection_note), feeding the same generation call. (3) Added an occasional (~6-week dormancy gate, ~25% roll) Nora "still going?" revisit of adopted rituals, surfaced in the Library view's suggestion slot (rituals.last_revisited_at, rituals.pending_revisit_message) — "Still going" resets the dormancy clock, "We drifted from this one" retires the ritual through the same two-person confirm transition adopting it required. (4) Partner-loop nudge: whoever didn't personally check in gets a one-time nudge via the same hero-card slot Follow-Through's nudge uses (ritual_completions.partner_notified, .partner_note), with a genuine lightweight capture point (a small skippable textarea on /dashboard, reached via a URL param, no new screen).
- ✅ Real bug found and fixed during the Ritual enrichment build — discovering-phase "Not for us" (handleRetire) never persisted status='retired' anywhere; it only logged a checkin and set the status on local client state, so reloading the dashboard silently un-retired the ritual. Fixed by adding a guarded `retire` flag to /api/ritual/checkin (only applies from 'discovering' status, so it can never bypass the two-person confirm an ADOPTED ritual's retire requires). Caught while tracing the exact transition the new revisit mechanic's "We drifted from this one" needed to reuse.
- ✅ Extracted the two-person retire request/confirm logic (previously only in /api/ritual/retire) into lib/ritual-retire.js so the new revisit mechanic's "drifted" response could call the identical transition instead of duplicating it.
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

### Audit findings — July 29 code review (Follow-Through sprint)
- 🟢 partnerId accepted by generateFollowThrough() in app/api/bet/respond/route.js but never referenced in the function body — caught before commit, removed from both the call site and signature.
- 🟢 Duplicate prefix/status computation in app/api/follow-through/today/route.js (myPrefixEarly/myStatusEarly recomputed the same values as myPrefix/mine.status a few lines later) — introduced during a mid-build fix, cleaned up same session before the sprint closed.
- 📋 5 pre-existing react/no-unescaped-entities lint errors in app/dashboard/page.js (lines ~415, 435, 603, 632, 713 as of July 29) predate this sprint — not introduced by Follow-Through, left alone to avoid unrelated scope creep, but worth a quick cleanup pass.
- 🟢 New routes (/api/follow-through/today, /api/follow-through/report) both carry force-dynamic — verified.
- 🟢 No new cron entries added for Follow-Through — expiry is lazy (checked on read in /today), deliberately avoiding a 4th route on an app already flagged for nearing the Vercel Hobby cron cap.

### Audit findings — July 30 code review (Spark extension + Ritual enrichment)
- 🟢 All 6 new routes this sprint (spark/reveal, ritual/revisit-check, ritual/revisit-respond, ritual/partner-note, plus modified follow-through/today, bet/respond, spark/respond, ritual/checkin, ritual/retire, dashboard/hero) carry force-dynamic — verified individually.
- 🟢 No debug console.log left in any touched file — checked every file this sprint touched, only console.error remains, matching the existing convention.
- 🟢 No new cron entries added — the Ritual revisit mechanic's dormancy check runs inline when the Library view loads (same lazy-check pattern as Follow-Through's expiry), not on a schedule.
- 🟢 Two real pre-existing bugs found and fixed while building on top of this code, not invented scope: the /today source-reveal gate (see Daily Rhythm above) and the discovering-phase retire persistence gap (see Daily Rhythm above). Both were caught by tracing the exact mechanism a new feature needed to depend on, root-caused, and fixed before building on top of them, per protocol.
- 🟢 lib/follow-through.js and lib/ritual-retire.js extractions verified as pure refactors — re-read both call sites (bet/respond, spark/respond for the first; ritual/retire, ritual/revisit-respond for the second) to confirm no behavior change, only de-duplication.
- 📋 Same 10 pre-existing react/no-unescaped-entities lint errors in components/RitualCard.js and the same pre-existing 5 in app/dashboard/page.js persist (line numbers shifted from July 29's count as content was added around them) — none introduced this sprint, still not worth a dedicated cleanup pass on their own.
- 📋 Not yet live-tested end to end: Spark's Follow-Through generation (next Monday/Thursday, or a forced `?spark=true`, is the first real chance) and all four Ritual enrichment pieces (next Friday, or a forced ritual check-in, is the first real chance).

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
