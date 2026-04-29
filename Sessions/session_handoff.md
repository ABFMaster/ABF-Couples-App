# ABF — Developer Handoff Briefing
# Last Updated: 2026-04-24

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

### Self-Review: 2026-04-24 (Sprint B)

1. **What went wrong this session?**
Nothing broke during Sprint B. The visual pass was clean and surgical. The biggest risk was the Nora chat page using Tailwind throughout while the rest of the app uses inline styles — managed correctly by converting to inline styles without breaking functionality.

2. **What specific protocols were followed well?**
- Read before write on every file
- One change at a time, commit after each verified change
- Design decisions made before code written (Ahead/Ideas artwork discussion before touching add page)
- Product decisions documented in backlog before building

3. **What is the current state?**
Sprint B complete:
- Game Room landing: Cormorant Garamond, geometric dots, grain texture, dynamic day, distinct mode colors per mode
- Nora chat: header redesigned, cartoon avatar replaced with gold dot presence marker, message bubbles warm palette, input area redesigned
- Profile: design system applied throughout
- Add an idea page: renamed from "Add to Our Space", emoji tabs replaced with geometric color squares

4. **What must change going forward?**
Sprint C is Ahead/Ideas with artwork. Design the card first, then build the add flow around what the card needs. Never build the input flow before the display is designed.

### Self-Review: 2026-04-24

1. **What went wrong this session?**
The dashboard temporal dead zone bug required two debugging cycles — the production bundler caught a const declaration order issue that dev mode masked. The Us page auth loop was caused by creating a new Supabase client instance instead of importing the shared singleton. Both were diagnosed correctly but required extra cycles that better upfront discipline would have prevented.

2. **What specific protocols were violated?**
- New file discipline: the Us page rewrite created a new supabase client instead of following the established import pattern used in every other page. Always check how existing pages import shared dependencies before writing new ones.
- Temporal dead zone: computed variables referenced before their declaration in the same component. In production builds, declaration order matters strictly.

3. **What is the current state?**
Sprint A complete:
- Navigation restructured: Today tab retired, Game Room promoted to first-class tab
- /today → /dashboard redirect in place, today/page.js deleted
- All /today references updated across codebase (13 files)
- Dashboard Home redesigned: greeting header with weather/days-together, real Spark/Bet/Ritual/GameRoom routing, Nora secondary card, memory card, flirts section
- Us page rebuilt: Been/Now/Ahead architecture with real data wired
- 310 lines of dead code removed from dashboard
- Timeline test data scrubbed

4. **What must change going forward?**
Before writing any new page or component, check how existing pages import shared dependencies (supabase, auth) and follow the same pattern. Never create a new client instance in a page component.

### Self-Review: 2026-04-22

1. **What went wrong this session?**
The Rank stale closure bug required multiple iterations to fully resolve. We fixed the poll entry guard (round vs roundRef), added waiting phases, added guards to prevent revert, then discovered the guards blocked legitimate advancement — requiring a third pass to distinguish terminal vs transitional phases. The root cause chain was correct each time but we didn't anticipate the downstream consequence of each fix.

2. **What specific protocols were violated?**
- ADVERSARIAL VERIFIER: Applied correctly on the Rank bug but not before adding the waiting phase guards — we added them without fully thinking through how they would interact with the advancement conditions.
- ROOT CAUSE RULE: Each fix addressed a real root cause but we didn't model the full state machine before implementing, which caused the fix chain.

3. **What is the current state?**
- Hot Take: verified end-to-end ✓
- Rabbit Hole: verified end-to-end ✓
- Spark reaction polling: verified ✓
- Challenge container flattened — Story, Pitch, Rank, Plan, Memory promoted to first-class modes ✓
- Play Again: all modes ✓
- All Challenge modes single round except Memory (3 rounds) ✓
- NORA_VOICE v3: Perel, Sedaris, Schwarzenegger, dinner party brief, hard moments, trust, questioning philosophy ✓
- Route-level Nora instructions: 9 routes wired ✓
- Rank: fully functional end-to-end ✓

4. **What must change going forward?**
When adding new phases to a poll-driven state machine, explicitly design whether each phase is terminal or transitional before writing any code. Write the full transition table first.

### Self-Review: 2026-04-17

1. **What went wrong this session?**
Hot Take required multiple fix iterations on skip functionality because the nextPoll useEffect condition was too restrictive — it only ran when bothAnswered was true, which meant skipped questions left the partner stranded. The poll condition should have been audited before the first fix was shipped.

2. **What specific protocols were violated?**
- ADVERSARIAL VERIFIER: Applied reactively on some fixes but not consistently before every change. The skip bug required 3 iterations that a single adversarial pass would have caught upfront.
- ROOT CAUSE RULE: The nextPoll condition was the root cause but was missed in the first two fixes.

3. **What is the current state?**
- Hot Take: fully rebuilt to follow universal host-only pattern ✓
- Push notifications: cleaned up — together/remote gating, host suppression, lobby dedup ✓
- Verdict double-generation: fixed for Hot Take (host-only + DB idempotency) and The Call (DB idempotency) ✓
- Story: fully verified end-to-end ✓
- The Call: fully verified end-to-end ✓
- Memory: fully verified end-to-end ✓
- All game modes now follow universal multiplayer pattern ✓

4. **What must change going forward?**
Run the adversarial verifier on every fix before shipping. One pass upfront is cheaper than three fix iterations.

### Self-Review: 2026-04-16

1. **What went wrong this session?**
Multiple incremental patches before committing to proper re-architecture on the Memory poll. Story verdict required 6+ fix attempts due to compounding issues: stale closures, missing select fields, variable naming conflict with imported function, and empty string validation. Each fix revealed the next hidden issue rather than being diagnosed holistically upfront.

2. **What specific protocols were violated?**
- ADVERSARIAL VERIFIER: Not applied consistently before each fix. Applied reactively after failures instead of proactively before writing code.
- ROOT CAUSE RULE: Several fixes addressed symptoms (adding guards, patching fields) before the actual root cause was confirmed via logs.

3. **What is the current state?**
- Memory: fully verified end-to-end ✓
- The Call: fully verified end-to-end ✓
- Story: fully verified end-to-end ✓
- Spark reaction polling: pending (needs Spark day)
- All RLS policies audited and gaps filled ✓
- Universal watcher block architecture: loading→challenge transition now happens before any type-specific poll logic ✓

4. **What must change going forward?**
Run the adversarial verifier before every fix, not after it fails. Read the actual error before guessing the cause.

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
| The Rabbit Hole | ✅ Verified | `/game-room/rabbit-hole/play` |
| Hot Take | ✅ Verified | `/game-room/hot-take` |
| The Call | ✅ Built | `/game-room/call/play` |
| Write a Story | ✅ Verified | `/game-room/challenge/play?type=story` |
| Rank It | ✅ Verified | `/game-room/challenge/play?type=rank` |
| The Pitch | ✅ Built | `/game-room/challenge/play?type=pitch` |
| Make a Plan | ✅ Built | `/game-room/challenge/play?type=plan` |
| Memory Test | 🔜 Built, locked | `/game-room/challenge/play?type=memory` |
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

1. **Flirts product redesign** — feature feels flimsy. Full product discussion needed before any build. Questions: what is a flirt actually for, what makes it feel like a moment not a feature, how does artwork elevate it, how does Nora connect to it.

2. **Sprint C — Ahead/Ideas with artwork**
   - Design artwork-first Ideas card (poster, album art, gradient placeholders)
   - Movie vs Show type pill on Watch cards
   - OMDB search wired for Watch add flow
   - Spotify search wired for Listen add flow (already built, needs UI)
   - Completion state: warm overlay + gold Done pill + Nora acknowledgment
   - Done events write to Nora memory layer
   - Save to Been: completion promotes item to timeline memory

3. **Date Night sprint** — agent architecture with tool-based design. Blocked on Google Places API fix. Tools designed: get_couple_date_preferences, suggest_date_options, build_date_itinerary, save_date_plan.

4. **Signal Registry Phase 1** — deferred to 50 real couples. Three signals: participation symmetry, engagement trend, repair after friction. Shadow mode required before surfacing.

5. **Nora onboarding voice** — earned disclosure framing. First conversation sets expectation that Nora watches and deepens over time.

6. **Cass as real tester** — schedule dedicated session. All verification solo so far.

7. **Timeline improvements** — delete button on items (P2), back button routing fix (P3).

8. **Push notification re-registration** — Cass daily notifications not delivering.

---

## 22. KNOWN ISSUES

**P1 — Active, blocking**
- None.

**P2 — Fixed, needs verification with real users**
- Spark reaction polling: verified with test accounts, needs real couple verification
- Rank: fully fixed and verified end-to-end

**P3 — Known, backlogged**
- Hot Take: skip button not visible for User 2 (host-only skip is intentional design decision, mutual skip backlogged)
- Hot Take: skip transition snaps with no loading moment — polish post-launch
- Hot Take: skip button appears on reveal screen — should be hidden — post-launch
- Rabbit Hole: Tell Me More button fires push notification only, no in-app response — complete or remove post-launch
- Rabbit Hole: Back to Game Room requires both users to tap — passive routing needed pre-launch
- Rabbit Hole: topic pool small enough that same topic can repeat — add deduplication logic
- Rank: no drag-to-reorder on mobile (arrow buttons only) — UX improvement post-launch
- Push notifications: some redundancy in game-end notifications still possible
- Bet 401 error on Today page — pre-existing auth issue
- Google Places 503 — date suggestions broken
- Memory unlock thresholds — all 0, raise before wider release
- Orphaned session cleanup — full audit needed pre-launch
- Codebase quality audit — pre-wider-release requirement
- Game Room redesign — Featured + Grid layout, Nora mode recommendations
- Timeline: delete button missing on timeline items
- Timeline: back button routes to Home instead of previous screen
- Archive overlay (Us/Been): visual redesign needed — Sprint B
- Home flirts section: only shows song and prompt, GIF and movie/show cards missing
- Today page: deleted, redirect in place. Weekly-reflection page: redirect in place.
- Nora chat: third-person pronoun violation observed in conversation ("she's someone who reads people") — NORA_VOICE rule states never use third-person for either partner. System prompt pass needed.
- Date Night: agent architecture redesign planned. Current implementation broken at Google Places API level. Tool-based architecture designed: get_couple_date_preferences, suggest_date_options, build_date_itinerary, save_date_plan. Build deferred until Google Places fixed.
- Claude Code usage tracking: erratic behavior reported 2026-04-24, usage jumping 0-100% in 5 prompts, prepaid extra usage disappeared unexpectedly. Reported to Anthropic support.

---

## 23. DEPLOY WORKFLOW
```bash
git add -A          # new files (ALWAYS for new files)
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```

---
## Self-Review 2026-04-27

### Sprint C — Ahead/Been card visual + completion mechanic

**What was built:**
- SharedItemCard: full bleed portrait, scrim, type pill, ghost icon fallback, Done pill
- Ahead section wired to shared_items — live data, category chip filtering, 2-col grid
- Capture sheet fires for all types before promotion — is the UX feedback moment
- app/api/ahead/complete/route.js — dual write to shared_items + timeline_events
- app/api/ahead/nora-line/route.js — haiku call, one sentence, correct tone
- Been section renders SharedItemCard for shared_item event_type
- RLS on shared_items confirmed
- Both Matt and Cass confirmed identical Been view

**Mistakes caught:**
- createRouteHandlerClient wrong pattern — caught at deploy, fixed to createClient service role
- userId not passed in POST body after removing auth session — caught by Claude Code review
- Direct Anthropic import violation in nora-line route — caught before commit, fixed to noraSignal
- timeline_events select missing image_url, item_subtype, artist — caught by Claude Code, fixed before deploy
- Missing labeled code blocks and deployment prompts mid-session — process failure, corrected

**Known issues open:**
- P2: Back button inside Been card navigates to Homepage instead of staying in Us
- P2: Nora completion lines generating correctly in DB but not surfaced in UI — design decision needed
- P3: #E8614D brand color still in shared/add tab active state and submit button

**Product decisions locked:**
- Flirts redesign brief complete — parked, not this sprint
- Unified card language: Option A full bleed, gradient + ghost icon fallback
- Been architecture: timeline_events single source of truth (Option A)
- Completion mechanic: capture sheet for all types, note is optional
- Nora line: haiku model, one sentence, no affirmations, specific to title

---
## Self-Review 2026-04-28

### Sprints C, D, E — Ahead/Been card visual, completion mechanic, Been detail sheet, Sprint E fixes

**What was built:**
- SharedItemCard: full bleed portrait, scrim, type pill, ghost icon fallback, Done pill — unified card language across Ahead, Been, Home
- Ahead section wired to shared_items — live data, category chip filtering, 2-col grid
- Capture sheet fires for all types — photo picker (JPEG + HEIC canvas conversion), note field, Save to Been
- Photo upload to Supabase storage photos bucket — completion_photo_url populated, renders as hero in Been detail sheet
- app/api/ahead/complete/route.js — idempotency guard, dual write to shared_items + timeline_events
- app/api/ahead/nora-line/route.js — haiku model, one sentence, prompt tightened
- Been detail sheet — full-bleed hero, photo-aware (media = API art, rich = user photo), type pill display labels, completion note, Nora line, Close + scrim dismiss
- Home memory card — full bleed, photo_urls[0] fix, event_date fix, Cormorant font, #E8614D → #C4714A, routes to /us?section=been
- shared/add routes to /us after save — was hitting 404
- Game mode weekly rotation in Now tab
- RLS on shared_items confirmed
- Both Matt and Cass confirmed identical Been view

**Mistakes caught:**
- createRouteHandlerClient wrong pattern — caught at deploy
- userId not in POST body — caught by review
- Direct Anthropic import violation — caught before commit
- timeline_events select missing source_id, image_url, item_subtype, artist — caught by audit
- HEIC preview broken — caught during testing, fixed with canvas transcoding
- photo_url vs photo_urls field mismatch on home card — caught by audit
- event_date vs date field mismatch on home card — caught by audit
- Labeled code blocks and deployment steps dropped mid-session — process failure, corrected

**Known issues open:**
- P2: Nora completion lines — tone needs work, wrapping into Sprint H Nora voice pass
- P2: Photo crop objectPosition fine-tuning — Sprint H papercut
- P2: Been tab refresh delay after completion — timeline_events re-fetch added to submitComplete, confirm working
- P2: Push notifications cron broken since DST — Sprint F
- P3: DATE_IDEA raw string still showing in some detail sheet type pills
- P3: Game Room day label hardcoded Saturday

**Next session priorities:**
1. Sprint F — Push notifications audit and fix
2. Sprint G — Date Night redesign
3. Sprint H — Nora verdict + voice system prompt pass
4. Sprint I — Papercut pass
5. Sprint J — Code debt + hygiene
