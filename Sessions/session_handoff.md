# ABF — Developer Handoff Briefing
# Last Updated: 2026-03-19

---

## 1. THE APP

ABF (Always Be Flirting) is a couples relationship app. Partners connect via a 6-character code. Once linked, the app surfaces a weekly rhythm of features powered by Nora (the AI relationship coach) that deepen connection over time. The product philosophy is warmth over gamification — Nora gets smarter with every session, and the couple's history becomes the moat.

- **Repo:** https://github.com/ABFMaster/ABF-Couples-App
- **Live:** https://abf-couples-app.vercel.app
- **Local:** ~/Desktop/abf-app

---

## 2. STACK

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Auth — token-based for API routes, NOT cookie-based
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-6`)
- **Styling:** Tailwind CSS + inline styles for feature-specific visual identities
- **Deploy:** Vercel

---

## 3. WORKING RULES

⚠️ These rules are non-negotiable and must be followed in every response, every session, without exception.

### Code Block Formatting (CRITICAL — violations have caused repeated bugs)
- Claude Code prompts, terminal/bash commands, and SQL queries must ALWAYS be in **completely separate code blocks** — never combined in the same block, ever
- A Claude Code prompt and a bash command must never appear in the same code block
- A Claude Code prompt and a SQL query must never appear in the same code block
- Every single Claude Code prompt must end with **"do not change anything else."** — no exceptions

### Development Discipline
- Read a file before editing it — always, no exceptions
- One change at a time — never bundle unrelated changes into one prompt
- Test before moving to the next change
- `git add -A` for new files, `git add -u` for existing files
- `git push` to deploy — never `npx vercel --prod`
- `git commit` required before `git push` — staged files don't auto-commit
- Commit after every working change with a descriptive message
- Remove all debug logs before closing a feature
- Delete dead code immediately — no accumulation
- `await` all async calls on Vercel

---

## 4. DESIGN SYSTEM

### Platform Base
- Background: `#FAF6F0` warm cream
- Typography: Fraunces serif for emotional/question content, DM Sans for UI labels
- Card style: white background, `0.5px solid #E8DDD0` border, `border-radius: 20px`
- Generous whitespace, minimal formatting

### Feature Visual Identities
Each feature has its own accent layered on the cream platform base. The Bet is the only exception — it earns a full dark takeover because it's a game.

| Feature | Base | Accent | Energy |
|---------|------|--------|--------|
| The Bet | Dark `#1C1510` | Gold `#D4A853` | Game night, competitive |
| The Spark | Cream `#FAF6F0` | Terracotta `#C1440E` | Intimate, morning coffee |
| The Ritual | Cream `#FAF6F0` | Deep green `#3D6B22` | Intentional, repeatable |
| Weekly Reflection | Cream `#FAF6F0` | Lavender `#6B4E8A` | Reflective, gentle |

### Nora's Voice
Not a therapist footnote — the most fun person at the dinner table who has a PhD. Warm, witty, mischievous. Finds what neither person said out loud. Never speaks in third person. Never restates the question. Never starts with an affirmation formula. For The Bet: game show host energy. For The Spark: quieter, leans across the table. For The Ritual: coach witnessing progress. For Reflection: perceptive friend synthesizing the week. For the hero card: alarm clock energy — personal, schedule-aware, pulls you forward.

### Animation Rules
- Fade + upward rise: opacity 0→1, translateY 20px→0, 500ms ease-out
- Stagger: 200ms between elements
- Reaction pill tap: scale pulse 0.97→1.02→1.0, 150ms
- Card flip (The Bet): 0.6s cubic-bezier(0.22, 1, 0.36, 1)
- Slide-up reveal (The Spark): translateY 40px→0, 700ms cubic-bezier(0.22, 1, 0.36, 1)
- No bouncing, no confetti, no celebration animations
- Dramatic pauses: pulsing text only, never spinners

---

## 5. PRODUCT GUARDRAILS

- **Lean ship philosophy:** dead code, dead schema, unsupported APIs get deleted immediately — "we are a ship on the sea and if we take on too much weight we will sink"
- Love language, attachment style, conflict style = discovered via assessment, never self-selected
- Features visible day 1, depth unlocks with engagement
- Nora is not a salesperson — she never mentions pricing, tiers, or upgrades
- The "holy f***" moment: Nora finds what neither person said explicitly by synthesizing both answers
- Weather informs Nora's message occasionally (P6 quiet days, notable conditions only) — not a standard, a tool she uses
- Integrations (OpenTable, Spotify, Expedia) are Phase 2 — pre-cut the holes, don't tear walls

---

## 6. TEST USERS

- **Matt:** `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## 7. NAVIGATION

Five tabs: Home → `/dashboard`, Nora → `/ai-coach`, Us → `/us`, Today → `/today`, Profile → `/profile`

File: `components/BottomNav.js`

---

## 8. WEEKLY SCHEDULE

The Today page gates features by day of week (Pacific time). One feature per day.

| Day | Feature | Bypass param |
|-----|---------|-------------|
| Monday | The Spark | `?spark=true` |
| Tuesday | The Spark | `?spark=true` |
| Wednesday | The Bet | `?bet=true` |
| Thursday | The Spark | `?spark=true` |
| Friday | The Ritual | `?ritual=true` |
| Saturday | TBD — Saturday feature (see backlog) | — |
| Sunday | Weekly Reflection | `?reflection=true` |

No feature scheduled → shows "Nothing scheduled today. Enjoy the day." in Fraunces italic.

---

## 9. FEATURES BUILT

### Auth & Onboarding
Email/password signup via Supabase Auth. `OnboardingGuard` redirects incomplete users to `/onboarding/welcome`. 28-question compatibility assessment on first run. Partner connection via 6-character code.

### Dashboard (`app/dashboard/page.js`)
Five sections: Dynamic Nora hero / Streak card / Timeline memory card / Coming Up date / Today's Read.

**Dead features removed this session:** Check in together, View the plan banner, Do Something Together section, generateNoraTrigger, noraTrigger state.

### Dynamic Nora Hero Card ✅ FULLY SHIPPED
- Schedule-aware alarm clock powered by `app/api/dashboard/hero/route.js`
- Fetches: today's feature status (Bet/Spark/Ritual by day), upcoming dates (both `date_plans` AND `custom_dates`), optional weather from Open-Meteo
- Priority logic: P1 feature available → P2 partner answered you haven't → P3 both answered → P4 date within 3 days → P5 quiet day
- Haiku model, max_tokens 80, must name the feature by name, never quote names, make dates feel anticipated
- Returns: `{ message, cta_label, cta_href, pills }`
- Pills: feature schedule pills show only 3 days ahead, date/event pills show 7 days ahead
- TV Guide pill format: "FRI · Ritual", "SAT · Dan Savage Date Night"
- Geolocation: browser `navigator.geolocation` → lat/lon passed to route → Open-Meteo weather context
- **Known issue:** Date pill day label computing one day off — cosmetic bug, fix next session

### Timeline Memory Card ✅ FULLY SHIPPED
- `app/api/dashboard/memory/route.js` — fetches random `timeline_events` row for couple
- Prefers events with photos over events without
- Three states: loading skeleton / empty (Nora tip + "Add a memory →") / event with photo
- Event type mapping: `custom → "Memory"`, `trip → "Trip"`, `milestone → "Milestone"`, `anniversary → "Anniversary"`, `date_night → "Date Night"`, `first → "First"`, `other → "Moment"`
- Taps through to `/timeline`

### Today Tab (`app/today/page.js`)
Day-gated feature delivery. Three sections: daily feature card, Flirt card, Worth Reading.

**Dead features removed this session:** "For Cass" coaching nudge, Nora commentary above Worth Reading, Try This Together spotlight section.

**Flirt card:** FLIRTS label (coral), "Send [partnerName] a Flirt" title (Fraunces), "Let Nora do the work" subtitle, chevron → opens FlirtSheet.

### The Spark ✅ FULLY SHIPPED
- **Component:** `components/SparkCard.js`
- **Visual identity:** Cream base, terracotta `#C1440E` accent, left border on your answer card
- **Days:** Monday, Tuesday, Thursday
- **API routes:** `app/api/spark/today/route.js`, `app/api/spark/respond/route.js`
- **DB tables:** `sparks`, `spark_responses`

### The Bet ✅ FULLY SHIPPED
- **Component:** `components/BetCard.js`
- **Visual identity:** Full dark takeover `#1C1510`, gold `#D4A853`, diamond motif card backs
- **Mechanic:** Two simultaneous textareas — YOUR ANSWER + YOUR BET ON [PARTNER]
- **Reveal:** Nora pre-reveal one-liner → "Reveal the cards" → 2x2 CSS 3D card flip → Nora reaction → pills
- **Days:** Wednesday
- **API routes:** `app/api/bet/today/route.js`, `app/api/bet/lock/route.js`, `app/api/bet/respond/route.js`, `app/api/bet/react/route.js`
- **Question library:** `lib/bet-questions.js` (120 questions)
- **DB tables:** `bets`, `bet_responses`
- **Badge:** NavBadges fires when: neither answered, partner answered you haven't, both answered but reveal not seen

### The Ritual ✅ FULLY SHIPPED (Phase 1)
- **Component:** `components/RitualCard.js`
- **Visual identity:** Cream base, deep green `#3D6B22` accent
- **Suggestion library:** `lib/ritual-suggestions.js` — 26 curated rituals, 3 tiers
- **Days:** Friday
- **API routes:** `app/api/ritual/status/route.js`, `app/api/ritual/start/route.js`, `app/api/ritual/checkin/route.js`, `app/api/ritual/adopt/route.js`, `app/api/ritual/confirm/route.js`
- **DB tables:** `rituals`, `ritual_completions`

### Weekly Reflection ✅ FULLY SHIPPED (Phase 1)
- **Component:** `components/ReflectionCard.js`
- **Visual identity:** Cream base, lavender `#6B4E8A` accent
- **Moment reaction pills:** "That lands" / "Not quite" — persisted to `moment_reactions` jsonb, loaded on render, filled lavender selected state
- **Reaction API:** `app/api/reflection/react/route.js` — updates by most recent row for couple (not computed week_start)
- **Days:** Sunday
- **API routes:** `app/api/reflection/generate/route.js`, `app/api/reflection/status/route.js`, `app/api/reflection/viewed/route.js`, `app/api/reflection/react/route.js`
- **DB table:** `weekly_reflections`

### Flirts ✅ FULLY SHIPPED
- `components/FlirtSheet.js` — bottom sheet, dual-mode (send + receive)
- `/flirts/onboarding` — Nora conversation to build flirt profile, redirects to `/today` on completion
- `app/flirts/page.js` — **DELETED** (was broken and unreachable)
- Full API suite: generate, mark-sent, mark-viewed, unread, check-profile, save-flirt

### NavBadges (`components/NavBadges.js`)
Today tab red dot. Aware of Spark and Bet activity. Rechecks every 60s and on tab visibility change.

### Nora (`app/ai-coach/page.js`)
Full chat with rich context builder. Cross-session memory via `nora_memory` table. 20 message/week limit on free tier.

---

## 10. KEY FILES

| File | Purpose |
|------|---------|
| `app/today/page.js` | Today tab — day-gated feature delivery |
| `app/dashboard/page.js` | Dashboard — hero, streak, timeline memory, coming up, today's read |
| `app/ai-coach/page.js` | Nora chat |
| `app/api/dashboard/hero/route.js` | Dynamic Nora hero — schedule-aware, weather-aware, Haiku |
| `app/api/dashboard/memory/route.js` | Random timeline memory card |
| `components/SparkCard.js` | The Spark component |
| `components/BetCard.js` | The Bet component |
| `components/RitualCard.js` | The Ritual component |
| `components/ReflectionCard.js` | Weekly Reflection component |
| `components/FlirtSheet.js` | Flirt bottom sheet |
| `components/NavBadges.js` | Today/Home tab badge logic |
| `components/NoraConversation.js` | Reusable Nora chat |
| `components/BottomNav.js` | Nav bar |
| `lib/dates.js` | `getTodayString(timezone)` — Pacific time date utility |
| `lib/nora-knowledge.js` | Nora frameworks, pairing matrix, mismatch detection |
| `lib/bet-questions.js` | 120 Bet questions, weighted selection |
| `lib/ritual-suggestions.js` | 26 curated rituals, 3 tiers, Gottman-grounded |
| `docs/sessions/SESSION_HANDOFF.md` | This file |
| `PRODUCT-BACKLOG.md` | Tabled ideas |

---

## 11. DATABASE

| Table | Key Columns |
|-------|-------------|
| `user_profiles` | display_name, timezone, love_language_primary, attachment_style, conflict_style, humor_style, flirt_style, flirt_profile_completed, subscription_tier |
| `couples` | user1_id, user2_id, connect_code, flirts_sent, created_at |
| `sparks` | couple_id, question, question_id, spark_date |
| `spark_responses` | spark_id, user_id, couple_id, response_text, nora_reaction, reaction_icon, responded_at |
| `bets` | couple_id, question, question_id, question_level, question_category (nullable), bet_date, locked_by |
| `bet_responses` | bet_id, user_id, couple_id, prediction, actual_answer, nora_reaction, nora_intro, reaction_icon, question_rating |
| `rituals` | couple_id, suggestion_id, title, description, frequency, tier, status, seasonal, season_start, season_end, source, streak, longest_streak, adopted_at, proposed_by, partner_confirmed, partner_confirmed_at, needs_discussion |
| `ritual_completions` | ritual_id, couple_id, week_start, completed, notes |
| `weekly_reflections` | couple_id, week_start, opening, moments (jsonb), pattern, week_ahead, generated_at, viewed_by_user1, viewed_by_user2, moment_reactions (jsonb) |
| `nora_memory` | couple_id, memory_summary |
| `flirts` | sender_id, receiver_id, couple_id, mode, suggestion, nora_note, gif_url, spotify_track_id, media_title |
| `timeline_events` | couple_id, event_type, title, description, event_date, photo_urls, created_by |
| `date_plans` | couple_id, title, date_time, stops, status |
| `custom_dates` | couple_id, title, date_time, stops, status, hype_line |
| `push_subscriptions` | user_id, subscription (jsonb) |
| `ai_usage` | user_id, week_start, message_count |
| `relationship_assessments` | user_id, couple_id, answers, results (jsonb), completed_at |
| `shared_items` | couple_id, type, title, poster_path |
| `invite_previews` | id (token), sender_id, couple_id, sender_name |

---

## 12. TECHNICAL PATTERNS

### Timezone (CRITICAL)
All date strings use Pacific time. Never use `toISOString().split('T')[0]` — it's UTC and will cause off-by-one errors.

```javascript
import { getTodayString } from '@/lib/dates'
const todayStr = getTodayString(userProfile.timezone)
```

### Auth (Service Role Pattern)
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
// userId comes explicitly from request body or query params
```

### Supabase Queries
- Always use `.maybeSingle()` not `.single()`
- Always verify column names against DB before writing queries — schema drift is a recurring bug source

### Claude Model Usage
- **Sonnet** (`claude-sonnet-4-6`): Nora reactions, memory updates, Reflection generation
- **Haiku** (`claude-haiku-4-5-20251001`): Short one-liners (Bet nora_intro, Dashboard hero message)

### Weather (Open-Meteo)
Free, no API key required.
```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit
```
Only passed to Nora when condition is notable (rain/snow/storm/≥95°F/≤25°F).

### Upcoming Dates
Always query BOTH `date_plans` AND `custom_dates` tables — dates can live in either. Merge, sort by `date_time` ASC, take first.

---

## 13. MONETIZATION (Pre-cut holes only)

- `subscription_tier` on `user_profiles` — values: `free`, `tier1`, `tier2`. Default: `free`
- No gates built yet — column exists for future use
- Nora never mentions pricing

---

## 14. BACKLOG (Priority Order)

1. **Weather widget on Today + Dashboard headers** — subtle temp + condition icon. Open-Meteo, browser geolocation. Hero route already has weather support built in.
2. **Date pill day label bug** — hero pills showing wrong day for upcoming dates. Cosmetic, low priority.
3. **Saturday feature ("The Dare")** — dedicated design session needed.
4. **Nora voice refinement pass** — all surfaces.
5. **Nora onboarding tour** — first-time feature view flags.
6. **Worth Reading rethink** — dedicated session. RSS excerpt bug. Nora as curator concept.
7. **Ritual `needs_discussion` surface on Home page** — persistent, does not expire.
8. **Weekly Reflection history view** — cap 4 weeks, older into Nora memory.
9. **Bet question categories** — add `category` field to `lib/bet-questions.js`.
10. **Ritual seasonal logic** and **Week 9+ cadence**.
11. **Native app (Expo)** — long-term target.
12. **Sound design**.
13. **Tabled:** CAH licensing, photo bucket, biometric, physical Bet card game, After Dark, community ritual suggestions.

---

## 15. KNOWN ISSUES

- **Date pill day label** — hero pills showing wrong day for upcoming dates. Cosmetic.
- **Bet push notification** — partner gets push banner but red dot relies on 60s poll, not instant.
- **Google Places API** returning 503 for date suggestions
- **Google Maps race condition** in `/dates/custom`
- **Ritual `needs_discussion`** — not yet surfaced on Home page

---

## 16. DEPLOY WORKFLOW

```bash
git add -A
git commit -m "descriptive message"
git push
```

Never use `npx vercel --prod`. Never push without committing first.
