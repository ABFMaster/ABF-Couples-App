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

- Claude Code prompts, terminal commands, and SQL always in **separate code blocks** — never combined
- Every Claude Code prompt ends with "do not change anything else"
- Read a file before editing it
- One change at a time, test before moving to next
- `git add -A` for new files, `git add -u` for existing files
- `git push` to deploy — never `npx vercel --prod`
- `git commit` required before `git push` — staged files don't auto-commit
- Commit after every working change with a descriptive message
- Remove all debug logs before closing a feature
- Delete dead code immediately — no accumulation
- `await` all async calls on Vercel
- Do NOT attempt to use Claude in Chrome extension — it is not connected and is a distraction

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
Not a therapist footnote — the most fun person at the dinner table who has a PhD. Warm, witty, mischievous. Finds what neither person said out loud. Never speaks in third person. Never restates the question. Never starts with an affirmation formula. For The Bet: game show host energy. For The Spark: quieter, leans across the table. For The Ritual: coach witnessing progress. For Reflection: perceptive friend synthesizing the week.

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
4-section structure: Nora hero / upcoming date / suggested actions / today's read. Couples debrief card appears when BOTH partners have new-format assessments.

**Hero card** — AI-powered dynamic message via `GET /api/dashboard/hero`. Fires on mount using geolocation (with 5s timeout + silent fallback). Returns `{ message, cta_label, cta_href, pills }`. Pulse skeleton while loading. Pills displayed as small schedule chips below CTA (`rgba(255,255,255,0.1)` background, "THU · The Spark" format).

**Memory card** — Random timeline event via `GET /api/dashboard/memory`. Prefers events with photos. Returns flat event object (`{ id, title, event_type, event_date, photo_urls }`). Returns `{ empty: true }` when no events exist. Renders with event_type label mapping (custom→"Memory", trip→"Trip", etc.).

### Today Tab (`app/today/page.js`)
Day-gated feature delivery. Pacific-time day detection via `getTodayString()` from `lib/dates.js`. Each feature rendered in its section with a section label above. Bypass params for testing. "Nothing scheduled today" fallback for Saturday and unscheduled days.

### The Spark ✅ FULLY SHIPPED
- **Component:** `components/SparkCard.js`
- **Visual identity:** Cream base, terracotta `#C1440E` accent, left border on your answer card
- **Reveal animation:** Partner answer slides up (translateY 40px→0, 700ms), Nora 200ms later, pills 400ms later
- **Days:** Monday, Tuesday, Thursday
- **API routes:** `app/api/spark/today/route.js`, `app/api/spark/respond/route.js`
- **Question library:** `spark-questions.json` (difficulty tiers 1/2/3)
- **Blinding logic:** Partner answer hidden until current user submits
- **DB tables:** `sparks`, `spark_responses`

### The Bet ✅ FULLY SHIPPED
- **Component:** `components/BetCard.js`
- **Visual identity:** Full dark takeover `#1C1510`, gold `#D4A853`, diamond motif card backs
- **Mechanic:** Two simultaneous textareas — YOUR ANSWER + YOUR BET ON [PARTNER]. Both submit together.
- **Reveal:** Nora pre-reveal one-liner → "Reveal the cards" button → 2x2 CSS 3D card flip grid (user taps each independently) → Nora reaction fades in → pills fade in
- **Nora pre-reveal:** Haiku model, max_tokens 60, saved as `nora_intro` on both bet_response rows
- **Card backs:** Diamond trellis pattern, gold border, label showing whose answer is behind each card
- **Days:** Wednesday (+ Saturday free play TBD)
- **API routes:** `app/api/bet/today/route.js`, `app/api/bet/lock/route.js`, `app/api/bet/respond/route.js`, `app/api/bet/react/route.js`
- **Question library:** `lib/bet-questions.js` (120 questions, levels 1-3, weighted selection by couple age)
- **DB tables:** `bets`, `bet_responses` (with `nora_reaction`, `nora_intro`, `reaction_icon`, `question_rating`)
- **Note:** `question_category` column exists in `bets` table but is nullable — questions in lib don't have category field yet (backlog)

### The Ritual ✅ FULLY SHIPPED (Phase 1)
- **Component:** `components/RitualCard.js`
- **Visual identity:** Cream base, deep green `#3D6B22` accent
- **States:** Loading → Pending confirmation (partner proposed) → None/first time → Discovering → Library
- **Discovery flow:** One person proposes a ritual (custom or from suggestions) → status `pending` → partner sees confirmation screen → "I'm in" moves to `discovering` → 3 weekly check-ins → adoption offer → `adopted` → streak continues
- **Consensus:** Rituals require both partners to confirm. Custom rituals proposed by one go to partner for confirmation. Suggested rituals need both to tap "We'll try this one."
- **Suggestion library:** `lib/ritual-suggestions.js` — 26 curated rituals across 3 tiers, Gottman-grounded, tagged for profile matching. Used IDs tracked so Nora never repeats.
- **"Let's talk about it":** Sets `needs_discussion = true`, surfaces on Home page (not yet built), does not expire
- **Streak:** Continuous counter, never resets on adoption. Broken streaks don't reset to zero.
- **Seasonal rituals:** `seasonal: true`, `season_start`/`season_end` month numbers, shown as "resting" off-season
- **Days:** Friday
- **API routes:** `app/api/ritual/status/route.js`, `app/api/ritual/start/route.js`, `app/api/ritual/checkin/route.js`, `app/api/ritual/adopt/route.js`, `app/api/ritual/confirm/route.js`
- **DB tables:** `rituals` (id, couple_id, suggestion_id, title, description, frequency, tier, status, seasonal, season_start, season_end, source, streak, longest_streak, adopted_at, proposed_by, partner_confirmed, partner_confirmed_at, needs_discussion), `ritual_completions` (ritual_id, couple_id, week_start, completed, notes)

### Weekly Reflection ✅ FULLY SHIPPED (Phase 1)
- **Component:** `components/ReflectionCard.js`
- **Visual identity:** Cream base, lavender `#6B4E8A` accent
- **Structure:** Opening (emotional weather of the week) → Moments (2-4 specific observations with reaction pills "That lands" / "Not quite") → Pattern (the holy-f*** insight connecting this week to assessment profiles) → Week ahead (one-line anticipation teaser) → "Talk about this with Nora" button
- **Generation:** Claude Sonnet, max_tokens 1200, returns strict JSON with four fields. Idempotent — generates once per week, returns existing if called again.
- **Data sourced:** Spark responses, Bet answers/predictions, Ritual completions, Nora memory, both user profiles/assessments
- **Viewed tracking:** 5-second delay then fire-and-forget PATCH to mark viewed per user
- **Persistence:** Does not expire. Stays available until couple views it. Next Sunday generates new one.
- **History:** TBD — cap at 4 weeks visible, older archived into Nora memory (not built yet)
- **Days:** Sunday
- **API routes:** `app/api/reflection/generate/route.js`, `app/api/reflection/status/route.js`, `app/api/reflection/viewed/route.js`
- **DB table:** `weekly_reflections` (couple_id, week_start, opening, moments jsonb, pattern, week_ahead, generated_at, viewed_by_user1, viewed_by_user2)

### Flirts ✅ FULLY SHIPPED
- `components/FlirtSheet.js` — bottom sheet, dual-mode (send + receive)
- 4 modes: GIF (Giphy), Song (Spotify), Movie/Show (OMDB), Prompt
- `components/NoraConversation.js` — reusable Nora chat component
- `/flirts/onboarding` — flirt profile onboarding
- Full API suite: generate, mark-sent, mark-viewed, unread, check-profile, save-flirt

### Nora (`app/ai-coach/page.js`)
Full chat with rich context builder. Cross-session memory via `nora_memory` table. Knowledge library in `lib/nora-knowledge.js`. Context builder in `lib/ai-coach-context.js`. 20 message/week limit on free tier (tracked in `ai_usage` table).

### Other Features
- **Timeline** (`app/timeline/page.js`) — horizontal scrollable, 8 event types, photo uploads
- **Date Night** (`app/date-night/page.js`) — curated ideas, partner suggestions
- **Trip Planning** (`app/trips/page.js`) — trip list and detail with tabs
- **Invite System** — `invite_previews` table, 7-day expiry

---

## 10. KEY FILES

| File | Purpose |
|------|---------|
| `app/today/page.js` | Today tab — day-gated feature delivery |
| `app/dashboard/page.js` | Dashboard / hype board |
| `app/ai-coach/page.js` | Nora chat |
| `app/api/ai-coach/route.js` | Nora API |
| `components/SparkCard.js` | The Spark component |
| `components/BetCard.js` | The Bet component |
| `components/RitualCard.js` | The Ritual component |
| `components/ReflectionCard.js` | Weekly Reflection component |
| `components/FlirtSheet.js` | Flirt bottom sheet |
| `components/NoraConversation.js` | Reusable Nora chat |
| `components/BottomNav.js` | Nav bar |
| `lib/dates.js` | `getTodayString(timezone)` — Pacific time date utility used across all routes |
| `lib/nora-knowledge.js` | Nora frameworks, pairing matrix, mismatch detection |
| `lib/ai-coach-context.js` | Nora context builder |
| `lib/bet-questions.js` | 120 Bet questions, weighted selection |
| `lib/ritual-suggestions.js` | 26 curated rituals, 3 tiers, Gottman-grounded |
| `lib/spotify.js` | Spotify search utilities |
| `lib/giphy.js` | Giphy search utilities |
| `lib/omdb.js` | OMDB movie search utilities |
| `app/api/spark/today/route.js` | Spark daily question generation |
| `app/api/spark/respond/route.js` | Spark answer submission + Nora reaction |
| `app/api/bet/today/route.js` | Bet daily question, blinding logic |
| `app/api/bet/respond/route.js` | Bet answer submission + Nora reaction + nora_intro |
| `app/api/ritual/status/route.js` | Ritual status fetch |
| `app/api/ritual/start/route.js` | Create new ritual (pending) |
| `app/api/ritual/checkin/route.js` | Weekly ritual check-in |
| `app/api/ritual/adopt/route.js` | Adopt a ritual |
| `app/api/ritual/confirm/route.js` | Partner confirms or flags for discussion |
| `app/api/reflection/generate/route.js` | Generate weekly reflection via Claude |
| `app/api/reflection/status/route.js` | Fetch this week's reflection |
| `app/api/reflection/viewed/route.js` | Mark reflection viewed per user |
| `app/api/dashboard/hero/route.js` | AI hero message: feature status, upcoming date, weather, priority, CTA, pills |
| `app/api/dashboard/memory/route.js` | Random timeline event (prefers photos) for memory card |
| `PROMPTS/session-handoff.md` | Session handoff prompt |
| `PRODUCT-BACKLOG.md` | Tabled ideas |

---

## 11. DATABASE

| Table | Key Columns |
|-------|-------------|
| `user_profiles` | display_name, timezone, love_language_primary, attachment_style, conflict_style, humor_style, flirt_style, flirt_profile_completed, subscription_tier, spark_intro_shown |
| `couples` | user1_id, user2_id, connect_code, flirts_sent, created_at |
| `sparks` | couple_id, question, question_id, spark_date |
| `spark_responses` | spark_id, user_id, couple_id, response_text, nora_reaction, reaction_icon, responded_at |
| `bets` | couple_id, question, question_id, question_level, question_category (nullable), bet_date, locked_by |
| `bet_responses` | bet_id, user_id, couple_id, prediction, actual_answer, nora_reaction, nora_intro, reaction_icon, question_rating |
| `rituals` | couple_id, suggestion_id, title, description, frequency, tier, status, seasonal, season_start, season_end, source, streak, longest_streak, adopted_at, proposed_by, partner_confirmed, partner_confirmed_at, needs_discussion |
| `ritual_completions` | ritual_id, couple_id, week_start, completed, notes |
| `weekly_reflections` | couple_id, week_start, opening, moments (jsonb), pattern, week_ahead, generated_at, viewed_by_user1, viewed_by_user2 |
| `nora_memory` | couple_id, memory_summary |
| `flirts` | sender_id, receiver_id, couple_id, mode, suggestion, nora_note, gif_url, spotify_track_id, media_title |
| `push_subscriptions` | user_id, subscription (jsonb) |
| `ai_usage` | user_id, week_start, message_count |
| `relationship_assessments` | user_id, couple_id, answers, results (jsonb), completed_at |
| `shared_items` | couple_id, type, title, poster_path |
| `timeline_events` | couple_id, event_type, title, event_date, photo_urls |
| `invite_previews` | id (token), sender_id, couple_id, sender_name |

---

## 12. TECHNICAL PATTERNS

### Timezone (CRITICAL)
All date strings use Pacific time. Never use `toISOString().split('T')[0]` — it's UTC and will cause off-by-one day errors.

```javascript
import { getTodayString } from '@/lib/dates'
const todayStr = getTodayString(userProfile.timezone) // falls back to America/Los_Angeles
```

Week start (Monday) calculation:
```javascript
const d = new Date();
d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
const weekStart = d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
```

### Auth (Service Role Pattern — used in all new routes)
```javascript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
// userId comes explicitly from request body or query params — not from session
```

### Supabase Queries
- Always use `.maybeSingle()` not `.single()` — `.single()` throws on zero rows
- Chain `.select()` after `.insert()` to return the created row

### Environment Variables
Must exist in both `.env.local` AND Vercel environment settings. `ANTHROPIC_API_KEY` is server-side only — never prefix with `NEXT_PUBLIC_`.

### Claude Model Usage
- **Sonnet** (`claude-sonnet-4-6`): All Nora reactions, memory updates, Weekly Reflection generation
- **Haiku** (`claude-haiku-4-5-20251001`): Short one-liners — Bet pre-reveal `nora_intro` (max_tokens 60), Dashboard hero card message (max_tokens 80)

### Dashboard Hero Route (`app/api/dashboard/hero/route.js`)
- Priority ladder: P1 feature not started → P2 partner acted, I haven't → P3 both done → P4 date soon → P5 quiet day
- Feature by Pacific day-of-week: Mon/Tue/Thu=Spark, Wed=Bet, Fri=Ritual (Sun=Reflection, no feature queried)
- Pills: scan next 3 days for feature pills; date pill if upcoming date within 7 days
- Pills format: `"THU · The Spark"`, `"FRI · Ritual"`, `"SAT · Dan Savage Date Night"`
- Queries both `date_plans` AND `custom_dates` for upcoming dates — merges and sorts
- System prompt enforces: always name feature first, never quote names, excited language for dates
- Weather: Open-Meteo, notable conditions only (rain/snow/storm/hot≥95/cold≤25), non-blocking

### New Files
Always use `git add -A` (not `git add -u`) when adding new files — `git add -u` only stages existing tracked files.

---

## 13. MONETIZATION (Pre-cut holes only)

- `subscription_tier` column on `user_profiles` — values: `free`, `tier1`, `tier2`. Default: `free`.
- Free tier: all reactive Nora moments (Spark reactions, Bet reactions, Ritual check-ins, Reflection synthesis) are free. 20 message/week limit on conversational Nora tab.
- Paid tier: unlimited Nora sessions, couples sessions (both partners in same conversation), After Dark, Saturday Dare (TBD)
- Nora never mentions pricing — she opens the door, the app handles the transaction
- No gates built yet — column exists for future use

---

## 14. BACKLOG (Priority Order)

1. **Today page + Dashboard cleanup pass** — hype board redesign, remove orphaned dead code, uniform section design. Hero card and memory card are now dynamic (shipped this session). Full design conversation still needed for broader layout refresh.
2. **Saturday feature ("The Dare")** — Saturday is open. Direction: couple is together, in-room energy, something that makes them do something in the real world together. "The Dare" as a term feels right. Dedicated design session needed.
3. **Nora voice refinement pass** — reduce restatement, vary entry points, cut affirmation formula before substance, closing questions should open new territory. System prompt pass across all surfaces.
4. **Nora onboarding tour** — dedicated pass. Nora introduces the weekly rhythm, each feature, what to expect. Conversational, not a slideshow. First-time feature view flag (`first_seen` per feature per user).
5. **Home/Dashboard hype board** — upcoming feature promotion (The Bet is tomorrow, The Spark returns Thursday), upcoming dates, anniversaries. Expand Today cleanup pass to cover this.
6. **"?" help icon + feature guide** — non-intrusive always-available help. Explains features, Nora, app rhythm. Users who need it find it, users who don't never see it.
7. **Ritual `needs_discussion` surface on Home page** — when partner flags "let's talk about it", surfaces as persistent action item on Home. Does not expire.
8. **Weekly Reflection history view** — cap at 4 weeks visible. Older reflections summarized into Nora memory, archived.
9. **Bet question categories** — add `category` field (preferences/likely/reactions/confessions) to all 120 questions in `lib/bet-questions.js`. `question_category` column exists in `bets` table (nullable).
10. **Ritual seasonal logic** — surface seasonal rituals when back in season. "Therapy float season is back. Ready?"
11. **Ritual Week 9+ cadence** — Nora shifts from coaching to witnessing. Option A: Nora stays curious not confirmatory. Ask something deeper about the ritual itself.
12. **Native app (Expo)** — confirmed long-term target. PWA/service worker push stack replaced with APNs/FCM.
13. **Sound design** — Web Audio API, card flip sound, Nora settle, partner submit chime. ~2 days once audio files sourced.
14. **Tabled ideas** in `PRODUCT-BACKLOG.md`: CAH licensing, photo bucket, biometric integration, physical Bet card game, After Dark, community ritual suggestions, Saturday Dare integrations.

---

## 15. KNOWN ISSUES

- **BetCard empty space** — small gap below card grid before Nora/pills appear after all four cards flipped. Marked "good enough" — low priority polish item.
- **ReflectionCard moment reaction pills** — fix deployed, confirm working next session.
- **Google Places API** returning 503 for date suggestions (`/api/dates/suggestions`)
- **Google Maps race condition** in `/dates/custom` — AutocompleteService not initializing reliably
- **Ritual confirmation flow** — "Let's talk about it" needs to surface on Home page (not built yet)

---

## 16. DEPLOY WORKFLOW

```bash
git add -A          # new files
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```

Never use `npx vercel --prod`. Never push without committing first.
