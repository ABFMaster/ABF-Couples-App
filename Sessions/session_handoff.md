# ABF — Developer Handoff Briefing
# Last Updated: 2026-04-06

---

## SESSION RULES — READ BEFORE EVERY SESSION

These are non-negotiable. If I violate any of these, stop me immediately.

### 1. ROOT CAUSE CHECKLIST — BEFORE ANY FIX
Write this visibly in chat before touching code:
- **Root cause:** [specific answer — not the symptom]
- **Pattern match:** Does this same pattern exist elsewhere in the codebase?
- **Fix scope:** Isolated fix or universal fix needed?
If the answer to pattern match is yes — fix ALL instances at once, not just the one in front of you.

### 2. DESIGN BEFORE CODE — ALL MULTIPLAYER FEATURES
Before writing any code involving two users, async state, or session management:
- Write the complete state machine: every state, every actor, every DB signal
- Answer: what lives in the DB vs client? Anything two clients must agree on → DB
- Get explicit sign-off before opening any file

### 3. THE UNIVERSAL MULTIPLAYER PATTERN
One actor generates/writes → DB signal → other actor polls and reacts.
- Host generates content → writes result + signal to DB → partner polls DB signal
- NEVER both users calling the same generate/write API
- NEVER transition state from an API response — write to DB, poll for the signal, both clients react
- DB fields are the signals: current_round, host_user_id, nora_challenge, nora_verdict, story_complete, rank_round
- If both clients could reach the same endpoint → stop and redesign

### 4. CODE BLOCK DISCIPLINE
- Claude Code prompt → wait for "Done" confirmation → THEN terminal
- Every Claude Code prompt ends with "do not change anything else"
- **New files: ALWAYS git add -A (not git add -u)**
- Before every commit: explicitly state "New files created this session: yes/no" — if yes, use git add -A
- Never use window.location — always useSearchParams with Suspense wrapper

### 5. ONE FEATURE AT A TIME
- Complete to Definition of Done before starting anything new
- Definition of Done: works end-to-end for both users, no console.logs, committed

### 6. GAME MODE BUILD CHECKLIST
Before writing any UI code for a new game mode or mechanic, verify each of these is designed and accounted for:

- **Dual-caller prevention:** Who generates/finalizes? Host only. Partner polls DB signal. Never both users calling the same endpoint.
- **Partner phase transitions:** Every phase change must be detectable via DB poll. Never rely on client state to advance partner. Identify the DB signal for every transition before coding.
- **Loading transitions:** Every state change for every user gets a loading moment. No screen snaps. Add loading phase to the state machine before coding UI.
- **Verdict screen content:** Verdict screen must branch by mode/type. Never render a generic `response` field. Design the verdict display for this specific mode before coding.
- **State reset between rounds:** List every piece of state that must reset when a round advances. Write the reset explicitly. Never assume state clears automatically.

If any of these five are not designed before coding begins — stop and design them first.

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
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`, claude-sonnet-4-6 for synthesis, claude-haiku-4-5-20251001 for fast signal detection)
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
- **`git add -A` for new files — always. `git add -u` for existing files only**
- Before every commit, state explicitly: "New files created this session: yes/no"
- `git push` to deploy — never `npx vercel --prod`
- `git commit` required before `git push` — staged files don't auto-commit
- Commit after every working change with a descriptive message
- Remove all debug logs before closing a feature
- Delete dead code immediately — no accumulation
- `await` all async calls on Vercel

### Checking Work
- After every deploy, verify the change works before moving on
- After git push, wait for "done" from Matt before proceeding — Vercel takes ~30s to deploy

### Session Handoff
- Lives at `Sessions/session_handoff.md`
- Written via Claude Code at end of each session
- Always confirm the file updated with: `head -5 ~/Desktop/abf-app/Sessions/session_handoff.md`

### STATE MACHINE GATE
Before writing any code for a feature involving two users, async state, or session management — write the complete state machine first. Every state, every transition, every actor. Get explicit agreement before coding. No exceptions.

### ROOT CAUSE RULE
Before fixing any bug, answer: (1) What is the actual root cause — not the symptom? (2) Is this fix addressing the root cause or the symptom? (3) Does the fix introduce new fragility? If the answer to #2 is "symptom" — stop and find the root cause.

### ONE FEATURE AT A TIME
Do not context switch mid-session. Complete the current feature to Definition of Done before starting anything new.

---

## 4. AI SELF-REVIEW (REQUIRED BEFORE EVERY HANDOFF)

Before writing the session handoff, Claude must answer these four questions honestly:

1. Where did I struggle this session?
2. What caused that struggle?
3. What should we change in prompts, structure, or tools?
4. What should be standardized going forward?

### Self-Review: 2026-04-06

1. **Where did I struggle?** The Challenge Pitch 404 error consumed enormous time. A new file was created but committed with `git add -u` — a documented rule violation. We debugged state, poll logic, route validation, and DB writes across multiple iterations before a console log revealed the real cause. The universal multiplayer pattern violations also kept recurring across every new game mode built this session.

2. **What caused that?** `git add -u` for new files is a documented rule we violated because we were moving fast. The Game Mode Build Checklist (Rule 6) was added mid-session after bugs appeared — not applied before building. We treated each multiplayer bug as new instead of recognizing the known failure pattern.

3. **What should we change?** Before every commit: explicitly state "New files created this session: yes/no." If yes, `git add -A`. The Game Mode Build Checklist must be applied before state machine design, not after bugs appear.

4. **What should be standardized?** NEVER transition state from an API response — always write to DB and let the poll handle transitions for both users. Every new route file → `git add -A`. Verdict screen always branches by `challengeType`. Universal loading transition applies to every phase change in every game mode.

### Self-Review: 2026-04-02

1. **Where did I struggle?** Multiple iterations on the same Rabbit Hole multiplayer bugs — dual debrief generation, partner stuck in `loading_round` with no exit, `nora_nudge` missing for partner on round transitions. Each fix patched the symptom rather than closing the architectural gap.

2. **What caused that?** Applied the "one actor generates, DB is signal, other actor polls" pattern correctly for round 1 generation but failed to extend it consistently to debrief generation and subsequent round transitions.

3. **What should we change?** The universal multiplayer pattern is now the law for all flows: HOST generates → writes result + signal to DB → PARTNER polls DB signal. Design the data signal before writing any code.

4. **What should be standardized?** For any two-user async operation: (1) identify the one actor who generates, (2) write the result AND a signal to DB, (3) other actor polls that signal. Never have both clients race to the same generation endpoint.

### Self-Review: 2026-03-29

1. **Where did I struggle?** Challenge took many iterations — dual sessions, stale closure on isHost, wrong scribe detection, watcher stuck in loading, Nora verdict listing both rankings.

2. **What caused that?** Did not enforce STATE MACHINE GATE before building. Built client-side isHost state when host identity belongs in the DB.

3. **What should we change?** STATE MACHINE GATE is non-negotiable before any multiplayer feature. DB is source of truth for any state shared between two clients.

4. **What should be standardized?** Before any multiplayer feature: (1) write data model, (2) write full state machine, (3) get explicit sign-off, (4) then build.

---

## 5. TESTING PROTOCOL (PERMANENT SOP)

### Two-account testing
- Regular Chrome window = Matt (always)
- Incognito window = Cass (always)
- Never test two accounts in the same browser context

### Session reset
End Game button now handles session cleanup for all modes. DB reset only needed if app crashed mid-game:
```sql
UPDATE game_sessions SET status = 'expired'
WHERE couple_id = '8230e60f-44ca-4668-be28-06cb32b1b831'
AND status IN ('lobby', 'active', 'completed', 'abandoned')
```

### API verify before UI test
If an API returns the correct data, the code is correct. Browser testing verifies UX, not logic.

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

### Nora's Voice
Not a therapist footnote — the most fun person at the dinner table who has a PhD. Warm, witty, mischievous. Finds what neither person said out loud. Never speaks in third person. Never restates the question. Never starts with an affirmation formula.

**In The Game Room:** Game master who picked the topic and knows how it ends. Present throughout, drives rounds, delivers the payoff. Leads with funny/absurd before insight. Never pits partners against each other — always treats them as a team.

### Product Philosophy — Presence Over Engagement
The goal is never to maximize time in the app — it's to maximize quality of time together outside the app. The app is the ignition, not the destination.

---

## 8. PRODUCT GUARDRAILS

- **Lean ship philosophy:** dead code, dead schema, unsupported APIs get deleted immediately
- Love language, attachment style, conflict style = discovered via assessment, never self-selected
- Features visible day 1, depth unlocks with engagement
- Nora is not a salesperson — she never mentions pricing, tiers, or upgrades
- **Always use real names:** Never "your partner" when the name is available
- Nora never pits partners against each other in verdicts — always treats them as a team

---

## 9. TEST USERS

- **Matt:** `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## 10. NAVIGATION

Five tabs: Home → `/dashboard`, Nora → `/ai-coach`, Us → `/us`, Today → `/today`, Profile → `/profile`

File: `components/BottomNav.js`

The Game Room lives at `/game-room` — accessible via Us page and Today on Saturdays. NOT in the bottom nav.

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

### The Spark ✅ FULLY SHIPPED
- **Component:** `components/SparkCard.js`
- **Days:** Monday, Tuesday, Thursday
- **API routes:** `app/api/spark/today/route.js`, `app/api/spark/respond/route.js`

### The Bet ✅ FULLY SHIPPED
- **Component:** `components/BetCard.js`
- **Days:** Wednesday
- **API routes:** `app/api/bet/today/route.js`, `app/api/bet/lock/route.js`, `app/api/bet/respond/route.js`, `app/api/bet/react/route.js`

### The Ritual ✅ FULLY SHIPPED
- **Component:** `components/RitualCard.js`
- **Page:** `app/ritual/page.js`
- **Days:** Friday (check-in) + persistent `/ritual` page

### Weekly Reflection ✅ FULLY SHIPPED
- **Component:** `components/ReflectionCard.js`
- **Days:** Sunday

### Flirts ✅ FULLY SHIPPED
- `components/FlirtSheet.js` — 4 modes (GIF, Song, Movie/Show, Prompt)

### Nora (`app/ai-coach/page.js`)
Full chat, rich context, cross-session memory via `nora_memory` table.

---

## 13. THE GAME ROOM — CURRENT STATE

### Architecture
- **Landing:** `app/game-room/page.js`
- **Universal Lobby:** `app/game-room/lobby/page.js` — ALL modes route through `?mode=X`
- **Onboarding:** `app/game-room/onboarding/page.js`
- **Visual identity:** Indigo gradient `#1E1B4B→#4338CA` on cream

### End Game Button — ALL MODES ✅
- Sets `game_sessions.status = 'abandoned'`
- Both users' polls detect abandoned status and route to `/game-room`
- Lobby entry (`enter-lobby`) cleans active/abandoned sessions automatically
- No DB reset needed between games

### Mode Status

| Mode | Status | Play Path |
|------|--------|-----------|
| The Rabbit Hole | ✅ Built | `/game-room/rabbit-hole/play` |
| Hot Take | ✅ Built | `/game-room/hot-take` |
| The Call | ✅ Built | `/game-room/call/play` |
| The Challenge — Story | ✅ Rebuilt | `/game-room/challenge/play?type=story` |
| The Challenge — Rank | ✅ Rebuilt | `/game-room/challenge/play?type=rank` |
| The Challenge — Pitch | ✅ Rebuilt | `/game-room/challenge/play?type=pitch` |
| The Challenge — Memory | 🔜 Designed, not built | `/game-room/challenge/play?type=memory` |
| The Remake | 🔜 Designed | `/game-room/remake/play` |
| The Hunt | 🔜 Designed | `/game-room/the-hunt/play` |

---

## 14. THE CALL — ✅ BUILT

**Mechanic:** 5 rounds. Alternating hot seat. Predictor locks answer blind. Hot seat locks real answer. Simultaneous reveal. Hot seat writes one-sentence explanation. Nora scores and comments on gap. Score-based Nora end line.

**State machine:**
- Host = first predictor. Roles alternate each round.
- Host-only generates round, host-only calls next route
- Partner polls for round data before advancing (waits for round to exist in DB)
- Partner polls during reveal phase for host advancing to next round
- `loading_round` phase for partner between rounds

**DB tables:** `call_sessions`, `call_rounds`

**API routes:**
- `app/api/game-room/call/start/route.js`
- `app/api/game-room/call/generate/route.js`
- `app/api/game-room/call/answer/route.js`
- `app/api/game-room/call/explain/route.js`
- `app/api/game-room/call/next/route.js`
- `app/api/game-room/call/verdict/route.js`

**Known issues (bug hunt):**
- Next Round button delay before partner explanation renders — minor, low-pri
- Hot seat countdown not confirmed fixed — monitor

---

## 15. THE CHALLENGE — REBUILT MODES

### Architecture
- **Play page:** `app/game-room/challenge/play/page.js`
- Scribe identity from URL param (`?scribe=true` for host)
- `challengeType` from URL param (`?type=story|rank|pitch|memory`)
- Verdict screen branches by `challengeType` — never renders generic response field
- Story, Rank, Pitch excluded from old scribe UI blocks

### Story ✅ REBUILT
**Mechanic:** 6 alternating blind sentences. Both see full story so far. Writer submits blind. Nora haiku provocation after sentence 3. Sonnet verdict after sentence 6.

**DB columns added:** `sentences` (jsonb), `current_turn_user_id`, `story_complete`, `nora_nudge`

**New route:** `app/api/game-room/challenge/story/submit-sentence/route.js`

**Generate route:** Story prompts returned verbatim — Nora adds one specific personal hook max, no rewriting.

**Prompt library:** `lib/challenge-prompts.js` — expanded from 20 to 65 prompts across absurd/domestic/tender/romantic/genre/relationship categories. Heavy earnest prompts removed.

**Verdict prompt:** Leads with funny/absurd before insight. Game show host energy, not therapist.

### Rank ✅ REBUILT
**Mechanic:** Both rank independently blind (Round 1). Partial reveal — agreed items shown, disagreed shown as `?` (hidden). Nora haiku interjection on most interesting disagreement. Inline Round 2 — `RankInputPartial` component, locked items fixed as green anchors, free items moveable. Full reveal after Round 2. No-agreements shown with both positions. Host-only finalize button. Partner polls for `nora_verdict`.

**DB columns added:** `rank_user1_r1`, `rank_user2_r1`, `rank_user1_r2`, `rank_user2_r2`, `rank_final`, `no_agreements`, `rank_round`, `rank_nora_interjection`

**New routes:**
- `app/api/game-room/challenge/rank/submit/route.js`
- `app/api/game-room/challenge/rank/finalize/route.js`

**Key component:** `RankInputPartial` — locked items filtered by value not index (prevents duplicates).

**Known issue (bug hunt):** Finish → verdict pop-back — poll re-renders verdict after Finish. Clear poll when verdict phase is set.

### Pitch ✅ REBUILT
**Mechanic:** Scribe types pitch, submits. Nora reads pitch, fires one hostile specific challenge question (haiku model). Both see challenge. Scribe types defense, submits. Nora delivers final verdict — invest/pass/conditional. References full arc: pitch → challenge → defense.

**DB columns added:** `nora_challenge`, `challenge_response`

**New route:** `app/api/game-room/challenge/pitch/challenge/route.js`

**Critical lessons:**
- New route file → `git add -A` — 404 caused by `git add -u` not tracking new file
- Poll handles ALL phase transitions — `handlePitchSubmit` fires-and-forgets, never transitions state directly
- Poll resets `response` every tick — fixed to only set if `couple_response` exists in DB
- `generateRound` was wiping `response` for pitch — fixed with `if (challengeType !== 'pitch') setResponse('')`
- `!submitted` gate removed from pitch UI — pitch manages its own state via `pitchPhase`

**Verdict framing:** Treats couple as a team — never attributes different roles or contributions to each person individually.

### Memory 🔜 DESIGNED, NOT BUILT
**Mechanic:**
1. Nora pulls real couple data, generates question + 3 progressive hints upfront
2. User 2 sees the answer privately on load
3. User 1 tries to answer — can tap "I need a hint" up to 3 times
4. User 2 sees grant/deny buttons each request
5. If denied — User 1 sees "[Partner] says no. 😬" — can ask again
6. After 3 denials hint unlocks automatically
7. User 1 submits answer, User 2 reveals correct/incorrect
8. Nora verdict — references the gap or match, notes denial pattern if it happened

**DB columns needed:** `answer`, `hint_1`, `hint_2`, `hint_3`, `hint_requests`, `hint_denials`

**State machine needed before building:**
- User 2 load → sees answer privately
- User 1 hint request → DB signal → User 2 poll detects → grant/deny buttons appear
- Grant/deny → DB signal → User 1 poll detects hint or denial message
- User 1 submits answer → DB signal → User 2 sees answer
- Nora verdict → both see it

---

## 16. VERDICT QUALITY — BACKLOG

All verdict prompts need a quality pass. Current verdicts observe the couple as a unit. Missing three layers:
1. **Individual address** — speak directly to each person's choice
2. **Pattern connection** — connect to Nora memory patterns where available
3. **Something to sit with** — opens territory rather than closing it

See `PRODUCT-BACKLOG.md` for full spec.

---

## 17. TENSION INTELLIGENCE ARC — BACKLOG

Full three-sprint product arc for Nora as relationship safety net. When hard topics cause couples to disengage, Nora notices, holds the signal, and gently offers to help process it.

Sprint 1: Tier 3 pre-game framing, signal logging, post-session soft CTA
Sprint 2: Post-session Nora bridge, pattern detection
Sprint 3: Nora-guided conversation, repair prompt library, timeline of hard conversations

See `PRODUCT-BACKLOG.md` for full spec.

---

## 18. GAME ROOM DB TABLES

| Table | Key Columns |
|-------|-------------|
| `game_sessions` | couple_id, mode, status, host_user_id, together, timer_minutes |
| `game_rounds` | session_id, couple_id, round_number, user1_thread, user2_thread, user1_ready, user2_ready |
| `game_finds` | session_id, couple_id, user_id, find_text, round_number |
| `hot_take_sessions` | session_id, couple_id, questions (jsonb), current_index, show_summary |
| `hot_take_answers` | session_id, couple_id, question_id, user1_answer, user2_answer, agreed, nora_comment |
| `call_sessions` | session_id, couple_id, current_round, total_rounds, status |
| `call_rounds` | session_id, couple_id, round_number, hot_seat_user_id, scenario, option_a/b/c, hot_seat_answer, predictor_answer, hot_seat_explanation, nora_comment, correct, status |
| `challenge_sessions` | session_id, couple_id, challenge_type, current_round |
| `challenge_rounds` | session_id, couple_id, round_number, prompt, prompt_key, couple_response, nora_verdict, sentences, current_turn_user_id, story_complete, nora_nudge, rank_user1_r1, rank_user2_r1, rank_user1_r2, rank_user2_r2, rank_final, no_agreements, rank_round, rank_nora_interjection, nora_challenge, challenge_response |

---

## 19. KEY FILES

| File | Purpose |
|------|---------|
| `app/game-room/page.js` | Game Room landing — mode cards |
| `app/game-room/lobby/page.js` | Universal lobby (all modes) |
| `app/game-room/hot-take/page.js` | Hot Take game |
| `app/game-room/call/play/page.js` | The Call play page |
| `app/game-room/challenge/play/page.js` | Challenge play page (all types) |
| `app/game-room/rabbit-hole/play/page.js` | Rabbit Hole play |
| `app/game-room/rabbit-hole/debrief/page.js` | Rabbit Hole debrief |
| `lib/game-room-config.js` | Mode config |
| `lib/hot-take-questions.js` | 300 Hot Take questions |
| `lib/challenge-prompts.js` | Story (65), Pitch, Rank, Memory prompt libraries |
| `lib/nora-knowledge.js` | Nora frameworks |
| `lib/bet-questions.js` | 120 Bet questions |
| `PRODUCT-BACKLOG.md` | Full backlog |
| `Sessions/session_handoff.md` | This file |

---

## 20. TECHNICAL PATTERNS

### Timezone (CRITICAL)
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
```

### useSearchParams in Next.js App Router
Must be wrapped in Suspense boundary or build will fail.

### New Files
**Always `git add -A` not `git add -u` for new files. State explicitly before every commit: "New files created: yes/no"**

---

## 21. NEXT SESSION PRIORITIES

1. **Challenge Memory** — design state machine, build. Last Challenge mode.
2. **Bug hunt sweep:**
   - Finish → verdict pop-back in Challenge (poll re-renders verdict after Finish)
   - The Call: explanation appears slowly for partner before host can tap Next Round
   - Hot Take: host countdown not confirmed fixed — monitor
   - Challenge: "Matt says you are remote" hardcoded
3. **Verdict quality pass** — all Challenge modes, Hot Take summary, Rabbit Hole debrief
4. **The Remake and The Hunt** — builds
5. **Tension Intelligence Arc Sprint 1** — tier 3 opt-in, signal logging, post-session CTA
6. **Pre-launch codebase audit** — see PRODUCT-BACKLOG.md

---

## 22. KNOWN ISSUES

- Push notifications fire on app open (content created by first opener, not cron)
- Bet card design slightly jarring — full sweep needed
- Google Places API returning 503 for date suggestions
- Too many push notifications firing at game end — audit needed before scaling
- Finish → verdict pop-back in Challenge modes
- The Call: partner sees explanation slowly before host taps Next Round
- Challenge: together/remote value hardcoded in some places

---

## 23. DEPLOY WORKFLOW
```bash
git add -A          # new files (ALWAYS for new files)
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```
