# ABF Session Handoff — March 11, 2026

Use this prompt to pick up exactly where the previous session left off.

---

## What was just built

### Daily Spark — Phase 1 (COMPLETE)

The Today tab has been rebuilt with a full Spark mechanic. Here is the current state of every file touched:

**`app/today/page.js`** — complete rewrite. Key changes:
- `getTodayGameType()` function: Mon/Tue/Wed/Thu → `'spark'`, Fri → `'ritual'`, Sat → `'bet_live'`, Sun → `'reflection'`. Currently all non-ritual/non-reflection days return spark.
- Time-of-day detection: `morning` (5am–noon), `afternoon` (noon–5pm), `evening` (5pm+). Applied as a subtle gradient on the header — amber/golden morning, warm yellow afternoon, indigo/violet evening. SVG sun/moon icon in header corner.
- Full Spark state: `sparkAnswer`, `sparkSubmitted`, `partnerSparkAnswer`, `partnerHasAnswered`, `sparkRevealed`, `noraSparkReaction`, `eligibleSparkQuestions`, `sparkQuestionIndex`, `overrideSparkQuestion`, `sparkSkipCount`, `hasGeneratedReaction` ref.
- `today_responses` table select now includes `spark_question, spark_answer, spark_submitted_at`. On load: restores user's saved answer, detects partner answer status, auto-sets `sparkRevealed` if both answered.
- Three UI states: (A) input + submit + skip, (B) your answer + waiting, (C) reveal with both answers + Nora one-liner.
- Skip logic: skip 1 → next in eligible array; skip 2 → level-1 override question; skip 3 → redirect to Nora. Lock skip if partner has answered.
- `generateSparkReaction()` calls `/api/spark-reaction`. Guarded by `hasGeneratedReaction` ref to prevent double-calls.
- Non-spark days (Fri/Sat/Sun) still show the original dark Nora prompt card unchanged.
- All existing data fetching, streak/flirt/memory counts, partner coaching, article section, and feature spotlight preserved.

**`app/api/spark-reaction/route.js`** — new file. Lightweight POST route. Accepts `question, myAnswer, partnerAnswer, userName, partnerName`. Calls `claude-sonnet-4-20250514` with max_tokens 60 for a sub-20-word Nora reaction. Returns `{ reaction: string }`. Uses `NEXT_PUBLIC_ANTHROPIC_API_KEY`.

**`lib/spark-questions.json`** — 200 questions across 4 tones (deep, playful, spicy, forward) and 3 levels:
- Level 1: 42 questions — accessible day one, no shared history required
- Level 2: 121 questions — require ~30+ days, observed patterns, shared memories
- Level 3: 37 questions — earned, hard, require trust and significant history

Question selection is filtered by couple age (`daysTogether`): <30 days → level 1 only; <90 days → levels 1–2; 90+ days → all. Indexed by `getDayIndex() % eligible.length`.

**`PRODUCT-BACKLOG.md`** — living product document with tabled ideas, parking lot, and next sprint queue.

**`PROMPTS/spark-questions-prompt.md`** — generation prompt for the question library, archived for future expansion.

---

## Database migration required (NOT YET RUN)

Run this in Supabase SQL editor before the Spark mechanic can save answers:

```sql
ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_question text;
ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_answer text;
ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_submitted_at timestamptz;
```

These columns are also commented at the top of `app/today/page.js` as a reminder. Until the migration runs, `submitSparkAnswer` will log `sparkError` to console with the detail message.

---

## What needs testing

Test in this order, with two active user accounts in the same couple:

### 1. DB migration
- Run the three ALTER TABLE statements above
- Verify columns appear in Supabase table editor for `today_responses`

### 2. Spark — solo flow (one user, partner hasn't answered)
- Open Today tab. Confirm Daily Spark section appears (it's a weekday).
- Confirm question loads with tone badge.
- Type an answer and submit. Confirm State B appears: your answer shown, "hasn't answered yet" message.
- Refresh page. Confirm answer is restored from DB (State B persists).
- Check Supabase `today_responses` row: `spark_answer` and `spark_submitted_at` should be populated.

### 3. Spark — partner indicator
- Log in as the second user (same couple) before submitting.
- Confirm "[PartnerName] has answered — your turn" indicator appears in State A after first user submits.
- Confirm skip is locked: "already answered — this one's locked in" message shows instead of skip link.

### 4. Spark — reveal
- Submit answer as second user.
- Confirm State C reveals both answers side by side.
- Confirm "Nora is thinking…" appears briefly, then Nora's one-line reaction loads from `/api/spark-reaction`.
- Reload page as first user. Confirm reveal state is restored (both answers already in DB).

### 5. Skip mechanic
- Without partner having answered: tap "Not today →" once. Confirm question changes.
- Tap again. Confirm a level-1 question loads regardless of couple age.
- Tap again. Confirm the Nora redirect message appears with "Talk to Nora" button.
- Confirm skip count resets on page reload.

### 6. Time-of-day header
- Check at different hours or temporarily override `hour` to confirm gradient and icon change correctly.
- Morning: amber gradient + sun icon in amber
- Afternoon: yellow gradient + sun icon in yellow
- Evening: indigo gradient + moon icon in violet

### 7. Non-spark days
- Temporarily change `getTodayGameType()` to return `'ritual'` and reload.
- Confirm the existing dark Nora prompt card appears unchanged with reaction pills.
- Revert after testing.

---

## Known issues / watch for

- **`sparkError` in console**: If the three DB columns haven't been added yet, `submitSparkAnswer` will log the error detail but still set `sparkSubmitted = true` locally. The answer won't persist. Run the migration first.
- **Partner answer polling**: There is no real-time subscription — partner's answer is only detected on page load. If both users are on the page simultaneously, the second user needs to refresh to see the reveal. A future improvement would be a Supabase realtime subscription on `today_responses`.
- **`hasGeneratedReaction` ref**: Prevents double-calling Nora reaction, but resets on page reload. If the page is reloaded after the reveal, the Nora reaction won't be regenerated — it's not persisted to DB. A future improvement would save `spark_nora_reaction` to `today_responses`.
- **Wednesday is spark**: `getTodayGameType()` returns `'spark'` for Wednesday (day 3). This was changed from `'bet'` late in the session. The Bet mechanic for Wednesday is deferred to a future sprint.

---

## Next sprint — priority order

All items are from `PRODUCT-BACKLOG.md` "NEXT SPRINT" section:

### Priority 1 — Spark persistence fix
Save Nora's spark reaction to `today_responses` so it survives page reload.

```sql
ALTER TABLE today_responses ADD COLUMN IF NOT EXISTS spark_nora_reaction text;
```

In `app/today/page.js`:
- After `setNoraSparkReaction(data.reaction)` in `generateSparkReaction`, upsert `spark_nora_reaction` to `today_responses`
- In `fetchAll`, load `spark_nora_reaction` from `mine` and set state

### Priority 2 — Spark real-time reveal
Add Supabase realtime subscription so the reveal triggers automatically when partner submits, without requiring a page reload.

In `fetchAll`, after loading initial state, subscribe:
```js
const channel = supabase
  .channel(`spark-${couple.id}-${today}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'today_responses',
    filter: `couple_id=eq.${couple.id}`
  }, payload => {
    if (payload.new.user_id === partnerId && payload.new.spark_answer) {
      setPartnerHasAnswered(true)
      setPartnerSparkAnswer(payload.new.spark_answer)
    }
  })
  .subscribe()
return () => supabase.removeChannel(channel)
```

### Priority 3 — Nora Voice Refinement (from Parking Lot)
Nora's response structure has consistent anti-patterns: restates user input before responding, affirmation formula before every response, closing questions summarize rather than open. Fix is a targeted system prompt pass. Test against 5 saved conversation transcripts from `ai_messages` table before deploying.
Files to touch: `app/api/ai-coach/route.js` (the `NORA_SYSTEM_PROMPT` constant in `lib/ai-coach-context.js` or wherever it lives).

### Priority 4 — Nora-Curated Flirt with Media
Nora generates a flirt suggestion calibrated to the partner's love language. MVP: text flirt only (no media yet). Structure:
- New route `app/api/flirt/generate/route.js` — accepts `partnerLoveLanguage, partnerName, context`; returns `{ flirt: string }`
- Surface in Today tab below partner coaching section (or in the existing `/flirts` page)
- Save accepted flirt to `flirts` table with `nora_generated: true` flag

### Priority 5 — Ritual Builder Phase 1
7-day micro-challenge assigned by Nora. Requires new DB tables:
```sql
CREATE TABLE IF NOT EXISTS rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples(id),
  title text,
  description text,
  started_at date,
  completed_at timestamptz,
  challenge_days jsonb -- array of daily tasks
);
```
UI: new `/ritual` page with day-by-day checklist, daily nudge from Nora, day 8 reflection prompt.

---

## Architecture notes for new session

- **Stack**: Next.js App Router, Supabase (`@supabase/ssr` createBrowserClient), Anthropic SDK (`claude-sonnet-4-20250514` for most AI calls), Tailwind CSS, Fraunces serif for display text.
- **Env var**: `NEXT_PUBLIC_ANTHROPIC_API_KEY` is the key used across all AI routes (both server-side API routes and `lib/nora-memory.js`).
- **AI routes pattern**: All routes in `app/api/` use `import Anthropic from '@anthropic-ai/sdk'` with `process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY`. No auth validation on spark-reaction; ai-coach route uses full Supabase session validation.
- **today_responses table**: Unique on `(user_id, prompt_date)`. One row per user per day. Holds both the old reaction fields (`reaction, note, prompt`) and the new spark fields (`spark_question, spark_answer, spark_submitted_at`). Upsert pattern: `onConflict: 'user_id,prompt_date'`.
- **Nora memory**: `lib/nora-memory.js` — `maybeUpdateNoraMemory(conversationId, coupleId, supabase)` called after each ai-coach POST response; `getNoraMemory(coupleId, supabase)` called at session open. Memory stored in `nora_memory` table, keyed by `couple_id`.
- **Nora briefing**: `lib/nora-knowledge.js` — `getNoraBriefing(userProfile, partnerProfile, behaviorSignals)` returns a rich couple-specific context string injected into the ai-coach system prompt. Includes attachment pairing, conflict dynamic, love language dynamic, mismatch detection (HIGH/MODERATE alerts for anxious/avoidant + volatile/avoiding combinations), flooding notes, discrepancy notes.
- **Spark questions**: `lib/spark-questions.json` — 200 questions, fields: `id, question, tone, level`. Imported statically in `app/today/page.js`. No API call needed.
- **getDayIndex()**: Anchored to `2026-01-01`. Used for deterministic daily rotation of questions, articles, and spotlights. Both partners see the same question index on the same day.

---

## WORKING PROCESS HABITS

These habits apply to every session. Follow them without being asked.

**Prompt separation:**
- Claude Code prompts are always separate from Terminal (bash) commands
- SQL is always separate from both
- Never bundle them together in one block

**Before writing any code:**
- Read the relevant file first before editing
- Check existing code and patterns before writing new ones
- Confirm DB columns exist before writing code that uses them

**During a build:**
- One change at a time — never bundle unrelated changes
- End every Claude Code prompt with "do not change anything else"
- Remove debug logging before considering anything done
- Env vars go in both .env.local AND Vercel — never one without the other

**After a change:**
- Commit after every working change — never stack unvalidated features
- Commit messages are descriptive: "Fix: spark save 400 error" not "updates"
- Test the change before building the next thing
- Dead code is deleted immediately — no comments, no TODOs, no "clean up later"

**Vercel specific:**
- Async operations must be awaited — no fire-and-forget on serverless
- Check for silent error swallowing in try/catch blocks
- Always verify env var names match exactly between .env.local and the code
