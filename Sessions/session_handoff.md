# ABF — Developer Handoff Briefing
# Last Updated: 2026-04-06

---

## SESSION RULES — READ BEFORE EVERY SESSION

These are non-negotiable. If I violate any of these, stop me immediately.

### 0. ADVERSARIAL VERIFIER — RUN THIS BEFORE ANY FIX

Before proposing or implementing any fix, Claude must answer these questions as a skeptical senior engineer. Assume the current solution is incorrect or incomplete.

1. **Most likely incorrect assumptions** — what are we taking for granted that may not be true?
2. **Specific failure points or edge cases** — where will this break?
3. **What we might be misunderstanding about the root cause** — is this actually the root cause, or a symptom?
4. **The simplest test, log, or observation that would prove this approach is wrong** — what would falsify this fix?

Do not suggest fixes until this checklist is complete. Be critical and concise. If the fix cannot survive adversarial scrutiny, stop and redesign.

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

### NORA ARCHITECTURE RULE (CRITICAL)
- All Anthropic calls go through `lib/nora.js` — NEVER import Anthropic directly in any route or lib file
- Use the correct wrapper: `noraChat` (conversation), `noraReact` (single reaction), `noraVerdict` (game verdict), `noraGenerate` (JSON/structured), `noraSignal` (internal/haiku)
- Routes pass context and instructions ONLY — never write "You are Nora" in a route system prompt
- NORA_VOICE is prepended automatically by the wrapper — routes must not include identity descriptions
- Violation check: `grep -rn "import Anthropic" app/ lib/` should return zero results outside `lib/nora.js`

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

### STALE CLOSURE RULE (CRITICAL FOR ASYNC FEATURES)
Any state variable read inside a `setInterval` callback that is NOT in the `useEffect` dependency array will be stale — it will always read the value from when the effect first mounted, never the updated value.

Symptoms: DB has correct data, but UI condition never triggers. console.log inside the interval shows the old value.

Fix pattern:
1. Create a ref: `const myValueRef = useRef(initialValue)`
2. Sync it: `useEffect(() => { myValueRef.current = myValue }, [myValue])`
3. Read the ref inside the interval: `myValueRef.current` instead of `myValue`

Refs already established in challenge/play/page.js: `phaseRef`, `roundRef`, `isScribeRef`, `memoryVerdictCalledRef`

Debug protocol for two-player async bugs:
1. Verify DB first — is the expected data actually there?
2. If yes — instrument the failing condition with one console.log showing every variable
3. If DB correct but UI wrong — suspect stale closure immediately
4. Check if failing variable is state inside a setInterval with incomplete deps
5. Fix with ref pattern above

Do not add rules to fix blindly. Always state root cause before writing any code.

---

## 4. AI SELF-REVIEW (REQUIRED BEFORE EVERY HANDOFF)

Before writing the session handoff, Claude must answer these four questions honestly:

1. Where did I struggle this session?
2. What caused that struggle?
3. What should we change in prompts, structure, or tools?
4. What should be standardized going forward?

### Self-Review: 2026-04-14

1. **What went wrong this session?**
The Memory mode bug hunt consumed the entire session without resolution. We chased the same stale closure pattern repeatedly — fixing one instance only to find another. The verdict stacking bug for Cass (user 2) persists after a full day of debugging. Multiple fixes were applied between test cycles making it impossible to isolate which change (if any) was effective.

2. **What specific protocols did I violated?**
- ROOT CAUSE RULE: Stated root causes incorrectly multiple times. Applied fixes to symptoms and moved on without verifying the fix worked before the next test cycle.
- ONE FIX AT A TIME: Applied multiple changes between test cycles repeatedly. This made it impossible to know which fix (if any) resolved what.
- PATCH VS FIX: Applied setTimeout guards, DB patches, and hacky cache-busting instead of proper architectural fixes.
- STALE CLOSURE AUDIT: Identified the stale closure pattern correctly 5+ times but kept finding new instances instead of doing a complete audit of ALL state variables in the poll in one pass at the start.

3. **What is the current state of the Memory bug?**
- Verdict fires correctly ✓
- Guesser textarea appears correctly ✓
- Partner advancement code FIRES — confirmed via debug_notes written to DB ✓
- But Cass still sees verdict stacked with round 2 question after advancement ✗
- Cass never sees loading screen during transition ✗
- Round 2 question subject sometimes wrong ✗

4. **What must happen FIRST in the next session?**
Have Cass use browser (not PWA). Play round 1 to verdict. Matt taps Next Round. Cass screenshots the debug overlay IMMEDIATELY — before stacking appears. Read exact phase/noraVerdict/round/isScribe values at the moment of transition. Fix from data only. Do not touch code until root cause is confirmed from the overlay screenshot.

5. **What must change going forward?**
- One change between test cycles. Always.
- Before any fix: state root cause explicitly, verify it in DB or console, THEN write the fix.
- Complete stale closure audit in one pass before touching anything in the poll.
- Never say "that's the fix" until the test confirms it.

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

### Memory ✅ BUILT (bugs being resolved)
- 3-round role-swap game: answer-holder confirms/updates answer, guesser guesses with up to 3 hints, answer-holder reveals, Nora verdict
- DB: `challenge_rounds` has all memory columns, `love_map_updates` stores answers for Nora memory
- Routes: `/memory/generate`, `/memory/ready`, `/memory/hint-request`, `/memory/hint-respond`, `/memory/submit`, `/memory/reveal`, `/memory/verdict`
- Memory unlock: thresholds all set to 0 (effectively unlocked for all couples)
- Known active bug: Cass (user2/non-scribe) sees round 1 verdict persisting into round 2 — verdict stacking after partner round transition. Partner advancement code FIRES (confirmed via debug_notes in DB). Phase resets correctly. But noraVerdict and phase re-set to verdict after transition. Root cause not yet isolated. Debug overlay deployed. Next session: have Cass use browser (not PWA), screenshot overlay at exact moment Matt taps Next Round to capture phase/noraVerdict state at transition.

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

1. **Memory verdict stacking bug — FIRST PRIORITY**
   - Root cause not isolated despite full day of debugging
   - Partner advancement code fires (confirmed via debug_notes in DB)
   - Debug overlay is deployed in challenge/play/page.js
   - Protocol: Have Cass use browser (not PWA). Play round 1 to verdict. Matt taps Next Round. Cass screenshots overlay IMMEDIATELY — before stacking appears. Read phase/noraVerdict/round/isScribe values. Fix from data only.
   - Suspected: noraVerdict being re-set after reset by poll tick that fires between state commits
   - All stale closure fixes applied: phaseRef, roundRef, isScribeRef, currentRoundRef, coupleIdRef, memoryVerdictCalledRef
   - roundAdvancingRef guards poll during transition
   - Interval race condition fixed with local intervalId capture

2. **Remove debug artifacts after Memory bug fix**
   - Remove console.log statements from challenge/play/page.js
   - Remove debug overlay from challenge/play/page.js
   - Remove debug_notes column usage (keep column, stop writing to it)
   - Remove `[ROUND ADVANCE CHECK]` log

3. **Memory round 2 question subject**
   - Nora keeps writing questions about the guesser instead of answer-holder
   - Validation added to reject wrong-subject questions and fall back to library
   - Library prompts use "your partner" which is correct but generic
   - May need stronger prompt instruction or question library specific to each role

4. **Bug hunt sweep with Cass — remaining two-player bugs**
   - The Call: explanation_revealed flag wired, needs verification
   - Spark reaction polling: wired, needs verification with fresh session
   - Story sentence 7: fixed, needs verification

5. **Nora voice quality pass**
   - NORA_VOICE deployed across all routes
   - Third-person pronoun rule added
   - Memory hint copy still theatrical ("spaces between") — needs prompt pass on challenge-prompts.js hint generation
   - Verdict length — some running too long

6. **Orphaned session cleanup**
   - challenge_sessions now marks abandoned instead of deleting ✓
   - Full audit of all child session tables needed pre-launch
   - Add to codebase audit sprint

7. **Onboarding data gap** — living situation + family intent

8. **Timeline + Weekly Reflection + Trips polish** — grouped sprint

9. **The Remake + Us page redesign** — own sprint

---

## 22. KNOWN ISSUES

**P1 — Active, blocking**
- Memory verdict stacking: Cass sees round 1 verdict persisting into round 2. Partner advancement code confirmed firing. Debug overlay deployed. Root cause not isolated. See Section 21 for debug protocol.
- Memory round 2 question subject: Nora generates questions about guesser instead of answer-holder. Validation added but library fallback prompts are generic ("your partner"). Needs stronger fix.

**P2 — Fixed this session, needs verification**
- Challenge Story sentence 7: fixed — story_complete now triggers verdict for both partners
- Spark reaction polling: first submitter now polls for nora_reaction
- Challenge Finish → verdict pop-back: phaseRef prevents poll from overriding complete state
- The Call explanation timing: explanation_revealed flag added
- Together/remote showing "remote" for all partners: DB default removed
- Challenge sessions orphaned: expireAndClean now marks abandoned instead of deleting

**P3 — Known, backlogged**
- Nora punctuation (missing apostrophes in signal calls)
- Verdict length — some running too long
- Memory hint copy theatrical — needs prompt pass on challenge-prompts.js
- Memory unlock thresholds all 0 — raise before wider release
- Memory 3-round role swap — partially working, round 2 transition broken
- Cass PWA caching — use browser for testing until native app
- Push notifications firing too many at game end
- Google Places 503 — date suggestions broken
- Hunt photo capture — aspirational, native app only
- Timeline: no history page, Weekly Reflection page outdated, Trips needs polish
- Orphaned session cleanup — full audit needed pre-launch
- challenge_sessions debug_notes column — clean up after Memory bug fixed
- Bet 401 error on Today page — pre-existing auth issue

---

## 23. DEPLOY WORKFLOW
```bash
git add -A          # new files (ALWAYS for new files)
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```
