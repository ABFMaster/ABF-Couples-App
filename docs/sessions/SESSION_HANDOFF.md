# ABF — Developer Handoff Briefing
# Last Updated: 2026-03-20

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

### Code Block Formatting (CRITICAL)
- Claude Code prompts, terminal/bash commands, and SQL queries must ALWAYS be in completely separate code blocks — never combined
- Every Claude Code prompt must be a single copyable block containing both the instruction text AND the code
- Every single Claude Code prompt must end with "do not change anything else." — no exceptions
- Label each block above it as: Claude Code / Terminal / Supabase — label outside the block, content inside

### Development Discipline
- Read a file before editing it — always, no exceptions
- One change at a time — never bundle unrelated changes into one prompt
- Test before moving to the next change
- `git add -A` for new files, `git add -u` for existing files
- Always use: `git add && git commit -m "message" && git push` — all three in one command
- `git push` to deploy — never `npx vercel --prod`
- `git commit` required before `git push` — staged files don't auto-commit
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
| The Game Room | TBD — design session needed | | Saturday, playful, release |

### Nora's Voice
Not a therapist footnote — the most fun person at the dinner table who has a PhD. Warm, witty, mischievous. Finds what neither person said out loud. Never speaks in third person. Never restates the question. Never starts with an affirmation formula. For The Bet: game show host energy. For The Spark: quieter, leans across the table. For The Ritual: coach witnessing progress. For Reflection: perceptive friend synthesizing the week. For the Game Room: invisible game master who already built the cave.

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
| Saturday | The Game Room | `?game=true` |
| Sunday | Weekly Reflection | `?reflection=true` |

No feature scheduled → shows "Nothing scheduled today. Enjoy the day." in Fraunces italic.

---

## 9. FEATURES BUILT

### Auth & Onboarding
Email/password signup via Supabase Auth. `OnboardingGuard` redirects incomplete users to `/onboarding/welcome`. 28-question compatibility assessment on first run. Partner connection via 6-character code.

### Dashboard (`app/dashboard/page.js`)
Dynamic Nora hero card / Streak+days together card / Timeline memory card / Coming Up date card / Today's Read.

**Hero card** — AI-powered dynamic message via `GET /api/dashboard/hero`. Geolocation → weather. Returns `{ message, cta_label, cta_href, pills }`. Haiku model, max_tokens 80. Pills: next 3 feature days + upcoming date within 7 days. `WeatherWidget` component renders temp + condition icon in top-right of hero card when location granted.

**Memory card** — Deterministic daily selection via `GET /api/dashboard/memory`. Seeded by `coupleId + todayStr` — same memory all day, rotates at midnight Pacific.

### Today Tab (`app/today/page.js`)
Day-gated feature delivery. Pacific-time day detection via `getTodayString()` from `lib/dates.js`. Weather widget in header (same `WeatherWidget` component, light mode). Bypass params for testing.

### Weather Widget ✅ SHIPPED
- `components/WeatherWidget.js` — temp + SVG condition icon, `dark` prop for hero card, light mode for Today header
- `app/api/weather/route.js` — `GET /api/weather?lat=&lon=` → `{ temp, code, condition }` via Open-Meteo
- Conditions: clear / cloudy / fog / rain / snow / storm
- Graceful degradation — widget simply doesn't render if geolocation unavailable

### The Spark ✅ FULLY SHIPPED
- **Component:** `components/SparkCard.js`
- **Visual identity:** Cream base, terracotta `#C1440E` accent
- **Days:** Monday, Tuesday, Thursday
- **API routes:** `app/api/spark/today/route.js`, `app/api/spark/respond/route.js`
- **DB tables:** `sparks`, `spark_responses`
- **Instructional text:** Confirmed working for both Matt and Cass

### The Bet ✅ FULLY SHIPPED
- **Component:** `components/BetCard.js`
- **Visual identity:** Full dark takeover `#1C1510`, gold `#D4A853`, diamond motif card backs
- **Mechanic:** Two simultaneous textareas — YOUR ANSWER + YOUR BET ON [PARTNER]
- **Reveal:** Nora pre-reveal one-liner → "Reveal the cards" → 2x2 CSS 3D card flip → Nora reaction → pills
- **Days:** Wednesday
- **API routes:** `app/api/bet/today/route.js`, `app/api/bet/lock/route.js`, `app/api/bet/respond/route.js`, `app/api/bet/react/route.js`
- **Question library:** `lib/bet-questions.js` (120 questions)
- **DB tables:** `bets`, `bet_responses`

### The Ritual ✅ FULLY SHIPPED
- **Component:** `components/RitualCard.js` — Friday Today page only, all check-in actions live here
- **Page:** `app/ritual/page.js` — persistent home, accessible from Us page any day
- **Visual identity:** Cream base, deep green `#3D6B22` accent
- **States:** Pending confirmation (role-aware) / Discovering (Nora week coaching, read-only on /ritual) / Adopted (streak) / Needs discussion / Empty
- **Two-party retire flow:** `retire_requested_by` column — first partner flags, second confirms
- **Inline editing:** Custom rituals (suggestion_id === null) can be edited inline on /ritual page
- **Custom ritual entry:** "We already do something →" at bottom of /ritual page
- **Suggestion library:** `lib/ritual-suggestions.js` — 26 curated rituals, 3 tiers
- **Days:** Friday (check-in actions) — Us page row visible every day
- **API routes:** `app/api/ritual/status`, `start`, `checkin`, `adopt`, `confirm`, `update`, `retire`
- **DB tables:** `rituals` (incl. `retire_requested_by` column), `ritual_completions`

### Weekly Reflection ✅ FULLY SHIPPED (Phase 1)
- **Component:** `components/ReflectionCard.js`
- **Visual identity:** Cream base, lavender `#6B4E8A` accent
- **Days:** Sunday
- **API routes:** `app/api/reflection/generate`, `status`, `viewed`, `react`
- **DB table:** `weekly_reflections`

### Flirts ✅ FULLY SHIPPED
- `components/FlirtSheet.js` — bottom sheet, dual-mode (send + receive)
- `/flirts/onboarding` — Nora conversation to build flirt profile
- Full API suite: generate, mark-sent, mark-viewed, unread, check-profile, save-flirt

### Us Page (`app/us/page.js`)
DO TOGETHER section: Date Night / Trips / Timeline / Weekly Reflection / The Ritual. Each taps to dedicated detail page. YOUR LIST section: shared movies, shows, songs, restaurants, ideas — filterable by type.

**The Ritual row** shows live status: "Waiting for [partner] to confirm" / "[partner] proposed a ritual" / "Week X of 3" / streak / "Start your first ritual". Taps to `/ritual`.

**Known gap:** Weekly Reflection row links to `/weekly-reflection` — should link to `/reflections` history page (not yet built). Us page needs full design audit for mobile-friendly layout.

### Nora (`app/ai-coach/page.js`)
Full chat with rich context builder. Cross-session memory via `nora_memory` table (`maybeUpdateNoraMemory` fires post-conversation). Knowledge library in `lib/nora-knowledge.js`. Context builder in `lib/ai-coach-context.js`. 20 message/week limit on free tier.

**Current Nora limitations (see Nora Architecture in backlog):**
- No Spark/Bet data injected — Nora doesn't know what questions were asked or answered
- Memory is a single text blob — passive, 400 word cap, gets noisier over time
- No pre-session brief — Nora starts cold each conversation
- No structured per-person notes — she knows the couple as a unit but not each person deeply

---

## 10. KEY FILES

| File | Purpose |
|------|---------|
| `app/today/page.js` | Today tab — day-gated feature delivery |
| `app/dashboard/page.js` | Dashboard |
| `app/ai-coach/page.js` | Nora chat |
| `app/us/page.js` | Us page — DO TOGETHER + shared list |
| `app/ritual/page.js` | Ritual persistent home — all states, inline editing, retire flow |
| `app/api/dashboard/hero/route.js` | Dynamic Nora hero |
| `app/api/dashboard/memory/route.js` | Deterministic daily memory card |
| `app/api/weather/route.js` | Weather endpoint — Open-Meteo, no API key |
| `app/api/ritual/update/route.js` | Edit custom ritual title/description |
| `app/api/ritual/retire/route.js` | Two-party retire flow |
| `components/WeatherWidget.js` | Temp + condition icon, dark/light mode |
| `components/SparkCard.js` | The Spark |
| `components/BetCard.js` | The Bet |
| `components/RitualCard.js` | The Ritual (Friday Today only) |
| `components/ReflectionCard.js` | Weekly Reflection |
| `components/FlirtSheet.js` | Flirt bottom sheet |
| `components/BottomNav.js` | Nav bar |
| `components/NoraConversation.js` | Reusable Nora chat |
| `lib/dates.js` | `getTodayString`, `getDayOfWeek`, `getDayLabel`, `getDateDayLabel`, `getWeekStart` — ALL date logic lives here |
| `lib/nora-knowledge.js` | Nora frameworks, pairing matrix |
| `lib/ai-coach-context.js` | Nora context builder |
| `lib/nora-memory.js` | `maybeUpdateNoraMemory`, `getNoraMemory` |
| `lib/bet-questions.js` | 120 Bet questions |
| `lib/ritual-suggestions.js` | 26 curated rituals |
| `docs/sessions/SESSION_HANDOFF.md` | This file |
| `PRODUCT-BACKLOG.md` | Tabled ideas and parking lot |

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
| `rituals` | couple_id, suggestion_id, title, description, frequency, tier, status, seasonal, season_start, season_end, source, streak, longest_streak, adopted_at, proposed_by, partner_confirmed, partner_confirmed_at, needs_discussion, retire_requested_by |
| `ritual_completions` | ritual_id, couple_id, week_start, completed, notes |
| `weekly_reflections` | couple_id, week_start, opening, moments (jsonb), pattern, week_ahead, generated_at, viewed_by_user1, viewed_by_user2 |
| `nora_memory` | couple_id, memory_summary, conversation_count, last_updated |
| `flirts` | sender_id, receiver_id, couple_id, mode, suggestion, nora_note, gif_url, spotify_track_id, media_title |
| `push_subscriptions` | user_id, subscription (jsonb) |
| `ai_usage` | user_id, week_start, message_count |
| `relationship_assessments` | user_id, couple_id, answers, results (jsonb), completed_at |
| `shared_items` | couple_id, type, title, poster_path |
| `timeline_events` | couple_id, event_type, title, event_date, photo_urls |
| `invite_previews` | id (token), sender_id, couple_id, sender_name |

---

## 12. TECHNICAL PATTERNS

### Timezone (CRITICAL — solved this session)
All date logic goes through `lib/dates.js`. Never use raw `new Date()` for date strings. Never use `toISOString().split('T')[0]`.
```javascript
import { getTodayString, getDayOfWeek, getDayLabel, getDateDayLabel, getWeekStart } from '@/lib/dates'
const todayStr = getTodayString(userProfile.timezone)  // "2026-03-20"
const dayOfWeek = getDayOfWeek(timezone)                // 0-6, Pacific
const weekStart = getWeekStart(timezone)                // Most recent Monday
const dateLabel = getDateDayLabel(dateTimeString, tz)   // "FRI"
```

Streak cursor comparison: always use `.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })` not `.toISOString().split('T')[0]`.

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
- Chain `.select()` after `.insert()` to return created row

### Claude Model Usage
- **Sonnet** (`claude-sonnet-4-6`): Nora reactions, memory updates, Reflection generation
- **Haiku** (`claude-haiku-4-5-20251001`): Short one-liners (Bet nora_intro max_tokens 60, Dashboard hero max_tokens 80)

### New Files
Always use `git add -A` (not `git add -u`) when adding new files.

---

## 13. MONETIZATION (Pre-cut holes only)

- `subscription_tier` on `user_profiles` — values: `free`, `tier1`, `tier2`. Default: `free`
- No gates built yet — column exists for future use
- Nora never mentions pricing
- Game Room is a natural monetization surface: free tier gets Rabbit Hole + Challenge, paid tier unlocks Mission + Remake + Extended Bet

---

## 14. BACKLOG (Priority Order)

1. **The Game Room — The Rabbit Hole (first mode)** — Full design complete (see below). Build interests onboarding first, then first Rabbit Hole end to end. Get Matt + Cass to play it this weekend.

2. **Nora Architecture (Three-Layer Memory)** — Highest leverage build in the product. Makes Nora genuinely smarter over time. Full design complete (see below). Build before any other Nora work.

3. **Us Page full audit** — Design pass for mobile-friendly layout, uniform design language, proper feature coverage. Weekly Reflection row currently links to wrong destination.

4. **Weekly Reflection history view** — `/reflections` page, cap 4 weeks, older into Nora memory. Us page Weekly Reflection row should link here once built.

5. **Nora voice refinement pass** — System prompt pass across all surfaces. Block until Nora Architecture is built — voice refinement on top of broken memory is wrong order.

6. **Bet question categories** — Add `category` field to all 120 questions in `lib/bet-questions.js`. Column exists in DB (nullable).

7. **Ritual seasonal logic + Week 9+ cadence** — Nora shifts from coaching to witnessing after adoption.

8. **Ritual `needs_discussion` on Home page** — Not yet surfaced. Low priority now that `/ritual` page exists as persistent home.

9. **Worth Reading rethink** — Dedicated session. May be replaced or absorbed.

10. **Native app (Expo)** — Long-term target. PWA push stack replaced with APNs/FCM.

11. **Sound design** — Card flip, Nora settle, partner submit chime.

---

## 15. THE GAME ROOM — FULL DESIGN (ready to build)

### Concept
Saturday is The Game Room. Not one feature — a collection of shared experiences the couple chooses from. The choice itself is data for Nora. Couples are together (or online simultaneously) — it's the only synchronous feature in ABF.

### The 5 Modes
1. **The Rabbit Hole** — Nora sends couple down separate threads of a shared topic. They find things, drop them, compare. Nora brings threads to convergence. Build first.
2. **The Challenge** — Creative constraint done together. Chopped-style, timed, real output.
3. **The Remake** — Recreate something from the relationship's history. Nora helps stage it.
4. **Hot Take** — Rapid fire opinions, agree/disagree together, Nora reacts.
5. **The Hunt** — Scavenger hunt Nora builds from relationship data.

### Saturday Flow
- Saturday morning notification: "Want to play a game?"
- Person 1 opens Game Room, picks a mode (or spins for Nora's pick), proposes to Person 2
- Person 2 accepts or counter-proposes — they agree on a mode
- Game selected but not started — they can play later (over drinks, after dinner)
- When ready: both enter the Lobby
- **Lobby:** "Cass has entered the lobby" — both slots fill, timer selection (30/60/90 min), "We're in" button starts the game
- Game plays out
- Debrief with Nora
- Story added to Timeline automatically

### The Rabbit Hole — Full Spec

**The Drop (Act 1)**
Nora gives each person a different thread from the same starting topic. Not a topic — a specific irresistible first sentence. Two modes: Nora picks (profile + interests based) or Spin (random surprise).

Entry point format: One specific, irresistible sentence that makes both people go "wait, tell me more." Example: "In 1977 NASA launched a golden record into space. One of the sounds on it was a kiss. Go find out what else is on it — and why those specific things were chosen."

Nora pre-builds the hole around a human truth (not specific facts) — making it robust to unexpected finds. Each hole has 3-4 branch levels and a convergence point. Convergence is thematic not factual — "almost any path through a good topic leads to something true about people."

**The Find Loop (Act 2)**
- Nora gives Person 1 Thread A, Person 2 Thread B — different angles, same topic
- Each goes off to find their thread — 5-10 min, bite-sized, specific task not open exploration
- "Drop a Find" button — one tap, type or paste what they found, posts to shared thread both see
- ABF delivers Person 1's find to Person 2 and vice versa — the reveal IS the fun
- Nora reads both drops, picks juiciest thread, sends them deeper
- Repeat 3-4 rounds until timer ends or convergence
- Optional Nora check-in at halfway point of chosen timer
- Couple can pause or close the hole at any time
- Abandoned holes stay open 24 hours, then expire with Nora note

**The Convergence (Act 3 — The Payoff)**
After 3-4 rounds, Nora brings both threads together. The surprising connection neither of them saw coming. The holy f*** moment. Then 3 real Nora questions — not a survey, a real conversation. Story auto-added to Timeline.

**Robustness**
If someone drops something unexpected (wrong thread, tangent): Nora uses it. "Interesting — you went sideways. Here's why that's actually more connected than you think." Built on human truths not specific facts — almost impossible to break.

**Rabbit Hole Library**
~20 seed entries at launch + Nora-generated custom holes from couple profile. Tagged by: category (historical mystery, scientific wonder, cultural archaeology, local/geographic, philosophical puzzle, couple-specific), energy (light/funny vs deep/serious), time requirement (30/60/90 min).

### User Interests Onboarding (required before Game Room)
Short Nora conversation before first Game Room play. Captures: topics they geek out on, things that make them laugh, podcasts/shows/music, places they've been. Feeds Rabbit Hole personalization and all Game Room modes. Same pattern as Flirt onboarding (`NoraConversation` component).

---

## 16. NORA ARCHITECTURE — FULL DESIGN (next focused build after Game Room)

Nora is the product. The current memory model is insufficient. This architecture makes her genuinely smarter over time — like the greatest therapist on the planet who reviews notes before every session.

### Layer 1 — Structured Per-Person Notes
After each substantive conversation, Nora updates a structured JSON object per person. Fields: `patterns` (behavioral tendencies), `stated_beliefs` (things they've said about themselves/partner), `open_threads` (unresolved things to revisit), `breakthroughs` (moments of genuine shift), `humor_style` (how they use humor and what it signals), `emotional_tells` (what defensiveness/fear/longing looks like). Critical: notes distinguish humor/deflection from stated facts — never files a joke as a fact.

### Layer 2 — Couple Dynamic Notes
Couple-level observations: negative cycle/dance if identified, repair patterns, friction points, genuine strengths, open couple threads. Privacy absolute: Layer 1 individual notes never cross to partner's session. Only Layer 2 + shared activity data crosses.

### Layer 3 — Pre-Session Brief (lib/nora-brief.js)
Fast Haiku call before every conversation. Inputs ALL available data: Layer 1 notes for this user, Layer 2 couple notes, last 5 Spark Q+A pairs (both partners labeled), last 3 Bet Q+prediction+actual pairs, current ritual state+streak, weekly reflection pattern, recent flirts, upcoming/recent dates, timeline events, trips, shared items (movies/songs/restaurants). Output: 200-word brief in Nora's voice — "Before you talk to Cass today, here's what you know..." This eliminates whose-answer-is-whose confusion and passive memory problem.

### DB Changes Required
```sql
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS user1_notes jsonb;
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS user2_notes jsonb;
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS couple_notes jsonb;
```
Keep `memory_summary` as legacy fallback during migration.

### Why This Matters
Nora currently starts cold each session. By session 10 she should know Cass the way a therapist who's seen her 10 times knows her — not as a blob of text but as structured, growing, synthesized understanding. Every conversation makes her more precise. Every data point feeds the picture.

---

## 17. KNOWN ISSUES

- **Google Places API** returning 503 for date suggestions (`/api/dates/suggestions`)
- **Google Maps race condition** in `/dates/custom` — AutocompleteService not initializing reliably
- **Push notification red dot** — relies on 60s poll, not instant
- **Us page Weekly Reflection row** — links to `/weekly-reflection` instead of future `/reflections` page
- **VPN blocks weather widget** on desktop — works correctly on mobile

---

## 18. DEPLOY WORKFLOW
```bash
git add -A && git commit -m "descriptive message" && git push
```

Never use `npx vercel --prod`. Never push without committing. Always all three commands together.
