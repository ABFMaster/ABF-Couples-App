# ABF — Developer Handoff Briefing
# Last Updated: 2026-03-28

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

### Code Block Rules (CRITICAL)
- Claude Code prompts, Terminal commands, and SQL must always be in **completely separate labeled code blocks** — never combined in one block
- Every Claude Code prompt ends with **"do not change anything else."**
- Label each block clearly above it: **Claude Code**, **Terminal**, or **Supabase**
- When Matt says "done" after a Claude Code prompt, that means Claude Code executed it successfully — proceed to the next step
- When Matt says "done" after a Terminal command, that means it ran successfully — check output if needed
- When Matt says "success" after a Supabase SQL block, that means the query ran successfully

### Development Rules
- Read a file before editing it — always
- One change at a time, test before moving to next
- `git add -A` for new files, `git add -u` for existing files only
- `git push` to deploy — never `npx vercel --prod`
- `git commit` required before `git push` — staged files don't auto-commit
- Commit after every working change with a descriptive message
- Remove all debug logs before closing a feature
- Delete dead code immediately — no accumulation
- `await` all async calls on Vercel
- New files require `git add -A` not `git add -u` — `git add -u` only stages already-tracked files

### Checking Work
- After every deploy, use Claude in Chrome to visually verify the change looks correct
- After git push, wait for "done" from Matt before checking — Vercel takes ~30s to deploy
- When checking a page, scroll to see the full state — don't assume from a partial screenshot
- If a build fails, read the Vercel error output carefully before attempting a fix

### Session Handoff
- Lives at `Sessions/session_handoff.md`
- Written via Claude Code at end of each session — no downloads, no manual copying
- Matt runs one git command to commit and push
- Always confirm the file updated with: `head -5 ~/Desktop/abf-app/Sessions/session_handoff.md`

### STATE MACHINE GATE
Before writing any code for a feature involving two users, async state, or session management — write the complete state machine first. Every state, every transition, every actor. Get explicit agreement before coding. No exceptions.

### ROOT CAUSE RULE
Before fixing any bug, answer: (1) What is the actual root cause — not the symptom? (2) Is this fix addressing the root cause or the symptom? (3) Does the fix introduce new fragility? If the answer to #2 is "symptom" — stop and find the root cause fix.

### ONE FEATURE AT A TIME
Do not context switch mid-session. Complete the current feature to Definition of Done before starting anything new. If a blocker is found, catalog it and finish the current feature first.

---

## 4. AI SELF-REVIEW (REQUIRED BEFORE EVERY HANDOFF)

Before writing the session handoff, Claude must answer these four questions honestly:

1. Where did I struggle this session?
2. What caused that struggle?
3. What should we change in prompts, structure, or tools?
4. What should be standardized going forward?

Answers go into the handoff doc under a dated "AI Self-Review" entry. This is non-negotiable SOP.

### Self-Review: 2026-03-28

1. **Where did I struggle?** Chased several Hot Take bugs sequentially that were all symptoms of the same root cause — no shared session state between rounds. Fixed poll guard, upsert, countdown, and next-question advancement each separately before identifying that Play Another Round bypassing the lobby was the architectural root cause.

2. **What caused that?** Didn't map the full state machine before fixing individual symptoms. Each fix exposed the next symptom.

3. **What should we change?** For any multiplayer feature bug session, draw the full state machine first — every state both users can be in — before touching code. Don't fix symptoms in isolation.

4. **What should be standardized?** Before fixing a multiplayer bug, list every state both users can be in and confirm each transition has a handler. If any transition is missing, that's the root cause.

---

### Self-Review: 2026-03-27

1. **Where did I struggle?** The round-ready poll block was removed as part of the unilateral architecture, then had to be added back. Got the "bring it home is unilateral" correct but over-applied unilateralism to the pre-debrief round advancement flow, which still requires both users to signal before Nora sends Thread N+1.

2. **What caused that?** Incomplete flow tracing before removing mechanisms. Focused on the terminal case (bring it home) without verifying all intermediate paths (non-final round advancement) still worked.

3. **What should we change?** When making architectural changes that remove existing mechanisms, enumerate every user flow and confirm each path is still covered before deleting anything.

4. **What should be standardized?** For state machine refactors: write out all transitions (state → event → new state) before touching code. Verify every path has a handler. Then build.

---

## 5. TESTING PROTOCOL (PERMANENT SOP)

### Two-account testing
- Regular Chrome window = Matt (always)
- Incognito window = Cass (always)
- Never test two accounts in the same browser context — sessions will cross and create false failures

### Before every lobby/multiplayer test
Run this SQL to clear stale sessions:
```sql
UPDATE game_sessions
SET status = 'expired'
WHERE status = 'lobby'
AND couple_id = '8230e60f-44ca-4668-be28-06cb32b1b831'
```

### API verify before UI test
If an API returns the correct data, the code is correct. Browser testing verifies UX, not logic. Never treat a browser test failure as a code failure without verifying the API directly first.

### Vercel deployment
- Always use `npx vercel --prod --yes` to deploy directly — do not rely on GitHub webhook
- Check `vercel.json` cron schedules against the current Vercel plan before deploying
- Hobby plan: once per day max per cron job, 10-second function timeout

---

## 6. DEFINITION OF DONE

A feature is only complete if:
- Functionality works end-to-end for both users
- Edge cases are handled (not catalogued — handled)
- Code addresses root cause, not symptoms
- No console.log statements remain
- Committed with a descriptive message

---

## 7. DESIGN SYSTEM

### Platform Base
- Background: `#FAF6F0` warm cream
- Typography: Fraunces serif for emotional/question content, DM Sans for UI labels
- Card style: white background, `0.5px solid #E8DDD0` border, `border-radius: 20px`
- Generous whitespace, minimal formatting

### Feature Visual Identities

| Feature | Base | Accent | Energy |
|---------|------|--------|--------|
| The Bet | Dark `#1C1510` card on cream | Gold `#D4A853` | Game night, competitive |
| The Spark | Cream `#FAF6F0` | Terracotta `#C1440E` | Intimate, morning coffee |
| The Ritual | Cream `#FAF6F0` | Deep green `#3D6B22` | Intentional, repeatable |
| Weekly Reflection | Cream `#FAF6F0` | Lavender `#6B4E8A` | Reflective, gentle |
| The Game Room | Cream `#FAF6F0` | Indigo gradient `#1E1B4B→#4338CA` | Saturday night, play |

**Note:** The Bet was updated to a dark card ON cream background (not full-page takeover) after Cass feedback. Full design sweep still needed.

### Nora's Voice
Not a therapist footnote — the most fun person at the dinner table who has a PhD. Warm, witty, mischievous. Finds what neither person said out loud. Never speaks in third person. Never restates the question. Never starts with an affirmation formula.

**In The Game Room:** Game master who picked the topic and knows how it ends — "I know how it ends. I just don't know how you'll get there." Present throughout, drives rounds, delivers the payoff.

### Product Philosophy — Presence Over Engagement
The goal is never to maximize time in the app — it's to maximize quality of time together outside the app. Every feature should ask: "does this pull them back to their phones, or does it enrich what's happening between them?" Capture mechanisms must be one tap maximum during shared experiences. Debriefs happen after, never during. The app is the ignition, not the destination.

---

## 8. PRODUCT GUARDRAILS

- **Lean ship philosophy:** dead code, dead schema, unsupported APIs get deleted immediately
- Love language, attachment style, conflict style = discovered via assessment, never self-selected
- Features visible day 1, depth unlocks with engagement
- Nora is not a salesperson — she never mentions pricing, tiers, or upgrades
- The "holy f***" moment: Nora finds what neither person said explicitly by synthesizing both answers
- Presence over engagement: app is ignition, not destination. One-tap capture during shared experiences.
- **Always use real names:** Wherever the app addresses a user about their partner, use the partner's real name — never "your partner" when the name is available. Applies to instructional text, waiting states, reveal states, push notifications, and all UI copy. `partnerName` is available in all feature components.

---

## 9. TEST USERS

- **Matt:** `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## 10. NAVIGATION

Five tabs: Home → `/dashboard`, Nora → `/ai-coach`, Us → `/us`, Today → `/today`, Profile → `/profile`

File: `components/BottomNav.js`

The Game Room lives at `/game-room` — accessible via Us page (DO TOGETHER section) and Today on Saturdays. NOT in the bottom nav.

---

## 11. WEEKLY SCHEDULE

| Day | Feature | Bypass param |
|-----|---------|-------------|
| Monday | The Spark | `?spark=true` |
| Tuesday | The Spark | `?spark=true` |
| Wednesday | The Bet | `?bet=true` |
| Thursday | The Spark | `?spark=true` |
| Friday | The Ritual | `?ritual=true` |
| Saturday | The Game Room | `?game=true` |
| Sunday | Weekly Reflection | `?reflection=true` |

---

## 12. FEATURES BUILT

### Auth & Onboarding
Email/password signup via Supabase Auth. `OnboardingGuard` redirects incomplete users to `/onboarding/welcome`. 28-question compatibility assessment on first run. Partner connection via 6-character code.

### Dashboard (`app/dashboard/page.js`)
4-section structure: Nora hero / upcoming date / suggested actions / today's read. Weather widget via Open-Meteo (no API key). Memory card uses deterministic daily seed.

### Today Tab (`app/today/page.js`)
Day-gated feature delivery. Pacific-time day detection. Each feature rendered in its section. Bypass params for testing.

### The Spark ✅ FULLY SHIPPED
- **Component:** `components/SparkCard.js`
- **Days:** Monday, Tuesday, Thursday
- **API routes:** `app/api/spark/today/route.js`, `app/api/spark/respond/route.js`
- **Known issue:** Push notification fires to BOTH users when Spark is created on app open (not cron) — backlogged

### The Bet ✅ FULLY SHIPPED
- **Component:** `components/BetCard.js`
- **Visual:** Dark `#1C1510` card with border/shadow on cream (not full takeover)
- **Days:** Wednesday
- **API routes:** `app/api/bet/today/route.js`, `app/api/bet/lock/route.js`, `app/api/bet/respond/route.js`, `app/api/bet/react/route.js`
- **Known issue:** Same push notification issue as Spark

### The Ritual ✅ FULLY SHIPPED
- **Component:** `components/RitualCard.js`
- **Page:** `app/ritual/page.js` — persistent home, accessible from Us page any day
- **Days:** Friday (check-in) + persistent `/ritual` page
- **Key logic:**
  - `source: 'existing'` → straight to `adopted`, no trial
  - `source: 'custom'` or `'suggested'` → `pending` → partner confirms → `discovering` → 3-week trial
  - Check-in buttons hidden if ritual confirmed THIS week
  - "Ongoing" streak pill for existing rituals with no streak
- **API routes:** `app/api/ritual/` — status, start, checkin, adopt, confirm, retire, update

### Weekly Reflection ✅ FULLY SHIPPED
- **Component:** `components/ReflectionCard.js`
- **Days:** Sunday
- **API routes:** `app/api/reflection/` — generate, status, viewed

### Flirts ✅ FULLY SHIPPED
- `components/FlirtSheet.js` — 4 modes (GIF, Song, Movie/Show, Prompt)
- `/flirts/onboarding` — Nora conversation, saves to `user_profiles`

### Nora (`app/ai-coach/page.js`)
Full chat, rich context, cross-session memory via `nora_memory` table.

---

## 13. THE GAME ROOM 🆕 CURRENT SPRINT

### Architecture
- **Landing:** `app/game-room/page.js` — mode cards, gates to onboarding if interests not completed
- **Universal Lobby:** `app/game-room/lobby/page.js` — ALL modes route through `?mode=X`
  - Both enter lobby → together/remote selection → materials panel → timer (if mode needs it) → "Let's play"
  - `lib/game-room-config.js` drives all mode-specific config (timer, materials, playPath)
- **Onboarding:** `app/game-room/onboarding/page.js` — Nora captures game interests, saves to `user_profiles.game_interests`
- **Visual identity:** Indigo gradient `#1E1B4B→#4338CA` on cream

### Mode Status
| Mode | Status | Play Path |
|------|--------|-----------|
| The Rabbit Hole | ✅ Built | `/game-room/rabbit-hole/play` |
| Hot Take | ✅ Built | `/game-room/hot-take` |
| The Challenge | 🔜 Designed | `/game-room/challenge/play` |
| The Remake | 🔜 Designed | `/game-room/remake/play` |
| The Hunt | 🔜 Designed | `/game-room/the-hunt/play` |

### The Rabbit Hole — ✅ BUILT, ARCHITECTURE REFACTORED 2026-03-27
**Flow:** Universal Lobby → play (multi-round) → both signal ready → next round OR "Bring it home" at min rounds → debrief

**Key design decisions (confirmed after playtests):**
- Same topic, DIFFERENT ANGLES — both on same case/event, different investigation threads
- Nora is HOST — "I know how it ends. I just don't know how you'll get there."
- BOTH must signal "Ready for next" before Nora sends Thread 2, 3, etc. (poll detects both-ready → `loadNextRound`)
- Min rounds by timer: 30min=2, 60min=3, 90min=4 (`MIN_ROUNDS` constant) — at minRounds, choice UI appears
- **"Bring it home" is UNILATERAL** — first player to tap marks `session.status = 'completed'`; partner navigates via poll
- Timer expiry → "Don't let me stop you — keep going" (never 0:00)
- 24hr → Nora fires convergence automatically (cron not yet built)
- Two-part convergence: factual close (what happened) THEN human truth (Nora's layer)
- Debrief = inline Nora chat pre-seeded with full game context — NOT main Nora page
- "Tell me more" button on partner finds → push notification only, NOT a Nora data point

**State machine in play/page.js (`gamePhase`):**
- `loading_initial` → set immediately on init start, prevents stale content flash
- `playing` → normal game flow, both-ready round advancement via poll
- `choice` → min rounds reached, "Keep going →" or "Bring it home ✦" visible
- `loading_round` → between rounds
- `loading_debrief` → after "Bring it home" tapped, session marked completed
- `gamePhaseRef` mirrors every `setGamePhase(...)` call — fixes closure staleness in `setInterval` poll

**Poll behavior:**
1. Session status check → if `completed`, navigate to debrief (handles partner carry)
2. Finds polling → new partner finds trigger theatre animation
3. Round-ready check (gated: `gamePhaseRef.current !== 'choice'`) → both-ready → `loadNextRound(roundNumber + 1)`

**Pages:**
- `app/game-room/rabbit-hole/play/page.js` — multi-round, find theatre, gamePhase state machine
- `app/game-room/rabbit-hole/debrief/page.js` — two-part convergence + inline Nora chat

**API routes:**
- `app/api/game-room/enter-lobby/route.js`
- `app/api/game-room/lobby-status/route.js` — returns lobby+active only
- `app/api/game-room/start-session/route.js` — saves together flag, mode-aware push notifications
- `app/api/game-room/generate-hole/route.js` — same topic/different angles, multi-round, idempotent
- `app/api/game-room/round-ready/route.js` — both-ready mechanic
- `app/api/game-room/generate-debrief/route.js` — factual close + human truth + 3 questions
- `app/api/game-room/save-interests/route.js`

### Hot Take — ✅ BUILT
**Flow:** Universal Lobby → tier selection → rapid fire agree/disagree → Nora one-liner after each → summary

**Key design decisions:**
- 300 question library in `lib/hot-take-questions.js` — 3 tiers, 6 categories
- Together mode: tap → answer highlights → "Show your partner" → physical phone reveal
- Remote mode: both tap blind → simultaneous screen reveal
- Nora Haiku one-liner after EVERY take (5-8 words, pure wit)
- Agreement → Nora provokes anyway ("Of course. But WHY?")
- Skip always available
- 15 questions per session, summary after all answered
- "Play another round" restarts with fresh questions

**Pages/API:**
- `app/game-room/hot-take/page.js`
- `app/api/game-room/hot-take/start/route.js`
- `app/api/game-room/hot-take/answer/route.js`

**DB tables:** `hot_take_sessions`, `hot_take_answers`

### Remaining 3 Modes — DESIGNED, NOT BUILT

**The Challenge:**
- Nora recommends a type, couple can browse all 5: Story, Pitch, Rank, Memory, Plan
- Scribe designated before challenge (rotates per round)
- Prominent in-app countdown timer starts on challenge reveal
- Story: Nora gives specific title/prompt
- Plan → Dream Trip integration at end ("Want to actually do this?")
- Result: scribe types shared result, Nora gives verdict/winner

**The Remake:**
- Nora picks moment from relationship history (timeline, trips, dates, Spark/Bet answers)
- Tonight vs Plan It selection — messaged clearly, degrees of difficulty
- Photo/note capture when done, Nora compares to original
- Requires relationship data threshold

**The Hunt:**
- Knowledge hunt (not physical) — trivia only you two would know
- Multimedia clues: Google Maps pins, timeline photo fragments, movie/show quotes
- Hints available but "cost" something
- Nora-prepared "treasure" at end
- Requires significant relationship data — greyed out early, unlocks as milestone achievement
- Data gathering philosophy: low friction, obvious value, tied to achievements

---

## 14. GAME ROOM DB TABLES

| Table | Key Columns |
|-------|-------------|
| `game_sessions` | couple_id, mode, status, timer_minutes, together, user1_in_lobby, user2_in_lobby, started_at, expires_at, hole_topic, hole_entry, nora_send_off, convergence, factual_close, topic_media, debrief_generated, mode_config |
| `game_rounds` | session_id, couple_id, round_number, user1_thread, user2_thread, user1_ready, user2_ready, status |
| `game_finds` | session_id, couple_id, user_id, find_text, round, round_number |
| `hot_take_sessions` | session_id, couple_id, questions (jsonb), current_index |
| `hot_take_answers` | session_id, couple_id, question_id, user1_answer, user2_answer, agreed, nora_comment |

---

## 15. PUSH NOTIFICATIONS — KNOWN ARCHITECTURE ISSUE

**Current behavior is WRONG:**
- `spark/today` and `bet/today` CREATE content when user opens the app, then notify BOTH users (including the opener)
- **Correct:** Vercel cron at 3am (user's timezone) creates content, notifies both users
- `spark/today` and `bet/today` should become READ-ONLY fetch routes

**Notifications correctly firing:**
- Ritual proposed → partner ✅
- Ritual confirmed/discussed → proposer ✅
- Bet/Spark partner responds → user ✅
- Reflection generated → both ✅
- Game Room: lobby join, round ready, both ready, mode-aware start ✅
- Rabbit Hole: "Tell me more" → partner ✅

**Cron refactor:** See PRODUCT-BACKLOG.md

---

## 16. KEY FILES

| File | Purpose |
|------|---------|
| `app/today/page.js` | Today tab |
| `app/dashboard/page.js` | Dashboard |
| `app/ritual/page.js` | Ritual persistent home |
| `app/game-room/page.js` | Game Room landing |
| `app/game-room/lobby/page.js` | Universal lobby (all modes) |
| `app/game-room/onboarding/page.js` | Game interests onboarding |
| `app/game-room/rabbit-hole/play/page.js` | Rabbit Hole play |
| `app/game-room/rabbit-hole/debrief/page.js` | Rabbit Hole debrief |
| `app/game-room/hot-take/page.js` | Hot Take game |
| `lib/game-room-config.js` | Mode config (timer, materials, playPath) |
| `lib/hot-take-questions.js` | 300 Hot Take questions, getHotTakeQuestions() |
| `lib/dates.js` | All timezone-safe date utilities |
| `lib/ritual-suggestions.js` | 26 curated rituals |
| `lib/bet-questions.js` | 120 Bet questions |
| `lib/nora-knowledge.js` | Nora frameworks |
| `components/NoraConversation.js` | Reusable Nora chat — prop is `completionTrigger` not `completionToken` |
| `PRODUCT-BACKLOG.md` | Full backlog + parking lot |
| `Sessions/session_handoff.md` | This file |

---

## 17. DATABASE

| Table | Key Columns |
|-------|-------------|
| `user_profiles` | display_name, timezone, game_interests (jsonb), game_interests_completed |
| `couples` | user1_id, user2_id, connect_code |
| `rituals` | couple_id, title, status, source, streak, proposed_by, partner_confirmed, partner_confirmed_at, retire_requested_by |
| `nora_memory` | couple_id, memory_summary, user1_notes (jsonb), user2_notes (jsonb), couple_notes (jsonb) |
| `sparks` | couple_id, question, question_id, spark_date |
| `spark_responses` | spark_id, user_id, response_text, nora_reaction |
| `bets` | couple_id, question, bet_date |
| `bet_responses` | bet_id, user_id, prediction, actual_answer, nora_reaction, nora_intro |
| `weekly_reflections` | couple_id, week_start, opening, moments, pattern, week_ahead |
| `timeline_events` | couple_id, event_type, title, event_date |

---

## 18. TECHNICAL PATTERNS

### Timezone (CRITICAL)
All date strings use Pacific time. Never use `toISOString().split('T')[0]`.
```javascript
import { getTodayString } from '@/lib/dates'
const todayStr = getTodayString(userProfile.timezone)
```

### Auth (Service Role Pattern)
```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
// userId comes explicitly from request body — not from session
```

### NoraConversation component
Prop is `completionTrigger` NOT `completionToken` — learned the hard way.

### useSearchParams in Next.js App Router
Must be wrapped in a Suspense boundary or build will fail:
```javascript
export default function Page() {
  return <Suspense fallback={<Spinner />}><PageContent /></Suspense>
}
function PageContent() {
  const searchParams = useSearchParams()
  // ...
}
```

### New Files
Always `git add -A` not `git add -u` for new files.

---

## 19. CURRENT SPRINT — GAME ROOM WEEK

**COMPLETED THIS SESSION (2026-03-26/27):**
- Rabbit Hole end-to-end playable: same topic both users, debrief works for both, gamePhase state machine, unilateral Bring it Home
- `generate-debrief` stores full content for both users via `debrief_questions` column
- Lobby: session ID in URL, host-only timer/Together-Remote, poll passes sessionId to partner
- `enter-lobby` finds active sessions, 24hr active session cleanup
- `game_rounds` unique constraint prevents race condition
- Nora three-layer platinum memory architecture deployed
- Nora signal routes wired: Spark, Bet, Reflection, Game Room, Ritual
- `bet/today` bearer token auth
- Cron fix: queries `user_profiles` by `user_id`
- `play/page.js` gamePhase state machine refactor (replaced `showRoundChoice` / `loadingNextRound` / `bringingItHome` / `loading`)
- `PRODUCT-BACKLOG.md` updated with LOBBY & GAME ROOM BUGS section and UX polish list

**COMPLETED THIS SESSION (2026-03-28):**
- Hot Take end-to-end fixed and playable: upsert race condition fixed with unique constraint on (session_id, question_id), session ID in URL pattern applied, tier selection locked via host-picks mechanic, 3-2-1 countdown reveal on every question for both users, first-tap Next Take advances partner via current_index poll on hot_take_sessions, See Summary advances partner via show_summary flag, Play Another Round routes to lobby with forceNew flag to expire old session and guarantee fresh questions, scores consistent for both users

**NEXT SESSION PRIORITY ORDER:**
1. The Challenge — test end-to-end, apply session ID in URL pattern
2. Rabbit Hole UX polish (see PRODUCT-BACKLOG.md)
3. `generate-debrief`: fix Convergence and Bigger Picture showing same text
4. Nora topic variety — `generate-hole` uses couple interests more aggressively
5. Vercel Pro upgrade before 20 test users
6. Code quality audit

---

## 20. BACKLOG (See PRODUCT-BACKLOG.md for full detail)

- Notification cron architecture (3am per timezone, read-only fetch routes)
- Nora three-layer memory (DB columns added, logic not built)
- Date Night debrief + capture flow
- Rabbit Hole: 24hr auto-convergence, "ask for more rounds", affiliate links
- Ritual proximity edge case (4th check-in: "we didn't see each other")
- Per-user timezone for notifications
- Bet card design sweep
- Us page audit
- Weekly Reflection history view
- Hot Take library expansion (300 → 500+, community submissions)

---

## 21. KNOWN ISSUES

- Push notifications fire on app open (content created by first opener, not cron)
- Bet card design slightly jarring — shadow/border added, full sweep needed
- Google Places API returning 503 for date suggestions
- Google Maps race condition in `/dates/custom`

---

## 22. DEPLOY WORKFLOW
```bash
git add -A          # new files
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```

---

## SESSION PROMPT — ENGINEERING STANDARD
*Adopted: 2026-03-27*

At the start of every session, Claude operates under these principles:

### PROJECT MEMORY
- Always read Sessions/session_handoff.md at session start
- Always read PRODUCT-BACKLOG.md before suggesting new work
- Do not create features.md or progress.md — use existing files

### FEATURE-DRIVEN WORK
- Work on ONE feature at a time
- Select from the priority order in the Current Sprint section
- Do not start new features until current one meets Definition of Done

### DEFINITION OF DONE
A feature is only complete when:
- Works end-to-end for both users on real devices
- Edge cases handled — not catalogued, handled
- Code addresses root cause not symptoms
- No console.log statements remain
- Committed with descriptive message

### DESIGN BEFORE CODE
- For any feature involving two users, async state, or session management: write the complete state machine first — every state, every transition, every actor — and get explicit agreement before writing any code
- For any intelligence/AI feature: research the established pattern first (therapy models, AI memory architecture, etc.) before designing
- For any bug fix: answer the three-question root cause checklist before touching code

### ROOT CAUSE CHECKLIST
Before any fix:
1. What is the actual root cause — not the symptom?
2. Is this fix addressing the root cause or the symptom?
3. Does this fix introduce new fragility?
If #2 is "symptom" — stop and find the root cause.

### STANDARD
The code quality standard is: would a senior engineer at a top-tier company be proud of this? Not perfect — but clean, intentional, and built to last. Prefer correctness over speed. Never leave broken functionality.

### SESSION FLOW
Start: Read handoff → identify next feature → confirm with user
During: One feature, step by step, design before code
End: AI self-review → update handoff → commit
