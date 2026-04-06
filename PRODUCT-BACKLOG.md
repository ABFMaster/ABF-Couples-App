# ABF Product Backlog
*Living document — add to this, never delete. Date each entry.*

---

## TABLED IDEAS (not now, not never)

### CAH Licensing Partnership
*Tabled: March 11, 2026*
Reach out to Cards Against Humanity about a licensing deal. Their cards, our couples data, Nora as host. A completely personalized date night product where the CAH deck is filtered and sequenced by the couple's conflict style, attachment pairing, and love language profile. A volatile/avoiding couple gets a different experience than a secure/secure couple. CAH has done brand extensions before. We bring the intelligence layer they can't build. They bring the brand permission and card library we can't replicate. Target conversation: when ABF has 1,000+ active couples and a demonstrated engagement metric to show.

### Photo Bucket Feature
*Tabled: March 11, 2026*
Dedicated upload space for couple photos — separate from timeline memories, no event required. Just "photos of us" that Nora can pull from contextually for flirts, reveals, and ritual moments. Encourage upload during onboarding. Standard camera roll access on mobile plus upload UI. Store in Supabase storage bucket per couple_id. Tagged with upload date. Nora pulls by recency, season, or contextual relevance.

### The Bet — Date Night Physical Product
*Tabled: March 11, 2026*
The Bet mechanic has legs beyond the app. A physical card game version that couples can play on date nights without their phones. In-app version and physical version feed each other. Explore print-on-demand or small production run once the mechanic is validated in-app.

### Biometric Integration (Oura, Apple Watch)
*Tabled: March 11, 2026*
Passive mood and stress data from wearables would make Nora's behavioral intelligence dramatically more accurate. Oura ring HRV and readiness score correlated with Spark answer tone could give Nora a genuinely predictive signal for relationship health. Revisit when product-market fit is confirmed and there is budget for health data privacy compliance.

### EventBrite + OpenTable + Expedia Integration (Full Suite)
*Tabled: March 11, 2026*
Ritual Builder is the primary bridge to third-party integrations. When a couple commits to a ritual that involves going somewhere or doing something, Nora surfaces the relevant partner. Revenue model: affiliate commission on bookings generated from genuine couple intent. Build order: Ritual Builder must be live and validated before integrations activate. Start with OpenTable as first integration — highest frequency use case, clearest affiliate path.

---

## PARKING LOT (needs more thought before backlog)

### Game Room Gameplay Polish Sweep
*Parked: 2026-03-30*
After all Game Room modes are functionally complete and signed off, do a full gameplay sweep of Hot Take and The Challenge covering: Nora comment quality and diversity, summary depth and insight, "The One That Surprised Me Most" mechanic, Challenge prompt quality (Write a Story too abstract, Rank verdict incorrectly lists both rankings), overall game pacing and UX feel.

### Solo User Value Arc
*Parked: March 11, 2026*
Experience for users whose partner has not joined yet. Days 1-3 solo assessment and Nora intro. Days 4-7 partner pull mechanic. Week 2 onwards Nora coaches solo user on their own patterns while waiting. Build after core coupled experience is validated with test couples.

### Nora Voice Refinement Pass
*Parked: March 19, 2026*
Nora's response structure has repetitive patterns: restates what user said before engaging, affirmation formula before substance, closing questions summarize rather than open new territory. Fix is a system prompt pass focused on voice not content. Block until Nora Architecture is built — voice refinement on top of broken memory is the wrong order.

### Weekly Reflection History View
*Parked: March 19, 2026*
Cap at 4 weeks visible on a /reflections page. Older reflections summarized into Nora memory and archived. Weekly Reflection row on Us page currently links to /weekly-reflection which is wrong — should link to /reflections once that page exists.

### Bet Question Categories
*Parked: March 19, 2026*
Add category field (preferences/likely/reactions/confessions) to all 120 questions in lib/bet-questions.js. question_category column exists in bets table (nullable). Needed before building category-based UI or Nora logic.

### Ritual Proximity Edge Case
*Parked: March 20, 2026*
Couples who don't see each other daily will always "fail" daily rituals like The Six-Second Kiss. Fix: add a fourth check-in option "We didn't see each other this week" that skips the week without penalizing the streak. Broader proximity-aware onboarding (how often do you see each other?) should be addressed when building multi-couple-type support. Do not filter ritual suggestions by proximity — let couples choose freely.

### Per-User Timezone for Notifications
*Parked: March 21, 2026*
All timed notifications (3am content creation, noon nudge) must fire at 3am in the USER's timezone, not a fixed UTC time. Timezone is already stored in `user_profiles.timezone`. Eventually geolocation should update this automatically. For now, a single Vercel cron at 3am Pacific covers Matt and Cass (both Pacific). When scaling, implement per-timezone cron scheduling or a worker that reads each couple's timezone and fires at the right UTC offset. Noon nudge (did you interact yet?) also fires in user's local timezone.

### Notification Architecture — Cron Refactor
*Parked: March 21, 2026*
Current behavior is wrong: spark/today and bet/today CREATE content when a user opens the app, then fire notifications to both users including the person who just opened the app. Correct architecture: Vercel cron jobs create content at 3am in user's timezone, notify both users. spark/today and bet/today become read-only fetch routes. Routes needed: app/api/cron/spark, app/api/cron/bet, app/api/cron/reflection. Noon nudge cron checks if either partner hasn't interacted and fires a gentle reminder. vercel.json cron schedule definitions needed.

### Rabbit Hole — Play UX, Pacing & Mechanics (Full Design)
*Parked: March 20, 2026*

**Drop a Find flow:**
User selects specific text on any webpage (long press → drag handles) → Copy → opens ABF → pastes in Drop a Find field → taps Drop it. Four natural steps, trained behavior. No clipboard auto-detection needed. Drop a Find must be front and center — the primary action, always one tap away during active session. Clear in-game instructions explain how to play including how to drop a find.

**Partner find reveal — theatre:**
A find arriving is an EVENT not a list update. The screen should signal arrival dramatically — card slides or pulses in. "[Cass] dropped a find 🕳️" displayed prominently. Find text large and readable. "Tell me more" button below.

**"Tell me more" mechanic:**
Button on received find card. Tapping fires a push notification to partner that reads exactly: "Tell me more" — nothing else. It's a reaction signal between partners, not a Nora data point. Nora does NOT track whether it was tapped. Conversation happens off-app. Whether they tapped or just reacted in person — Nora only needs the find text for the debrief.

**Minimum depth before convergence:**
Both partners must drop minimum 2 finds each before convergence unlocks. If one partner races through, Nora sends a deeper thread: "Go further. Find the why behind what you found." Prevents the escape room with an unlocked exit door problem.

**Asymmetric pacing:**
If one partner is moving slower, Nora sends a bridge prompt: "Your partner just found something. Here's a new angle while they dig deeper." Keeps both partners engaged without forcing lockstep.

**Timer behavior:**
Timer is intention-setting (how much time do we have?), not a hard boundary. Three scenarios:
1. Hard stop before timer — "Pause & save" always available. Session stays open 24 hours.
2. Done too fast — minimum 2 finds each enforced. Nora controls depth, not the timer.
3. Going way past timer — Nora says "Don't let me stop you. Keep going." They end when they want. Can ask Nora for more threads.

**24-hour expiry — the payoff is guaranteed:**
If session is abandoned or night got away from them, Nora fires the convergence and debrief at 24-hour expiry regardless. Couple receives "Rabbit Hole Summary" as a gift. It never just disappears.

**Native build (Expo):**
Register as iOS/Android Share Sheet target for text-selection share. User selects text in Safari → Share → ABF → pre-filled with snippet + source. Build when going native.

---

## NORA ARCHITECTURE (priority build — next focused session)
*Designed: March 19, 2026*

Nora is the product. The current memory model (single text blob, passive, 400 word cap) is insufficient for the world-class therapist she needs to be. The following architecture makes Nora genuinely smarter over time.

### Layer 1 — Structured Per-Person Notes
After each conversation that crosses the substance threshold, Nora updates a structured JSON object per person stored in nora_memory. Fields: patterns (behavioral tendencies observed), stated_beliefs (things they've explicitly said about themselves or partner), open_threads (unresolved things worth revisiting), breakthroughs (moments of genuine shift), humor_style (how they use humor and what it signals), emotional_tells (what defensiveness/fear/longing looks like for this person). Critical: notes distinguish between stated facts, patterns, humor/deflection, and beliefs — never files a joke as a fact.

### Layer 2 — Couple Dynamic Notes
Separate from individual notes. Stored in nora_memory at couple level. Tracks: the negative cycle/dance if identified, repair patterns, recurring friction points, genuine strengths, open couple-level threads. Privacy absolute: individual notes never cross to partner's session. Only Layer 2 and shared activity data crosses.

### Layer 3 — Pre-Session Brief (lib/nora-brief.js)
Fast Haiku call before every conversation opens. Inputs everything: Layer 1 notes for this user, Layer 2 couple notes, last 5 Spark question+answer pairs (both partners labeled), last 3 Bet question+prediction+actual answer pairs, current ritual state+streak, weekly reflection pattern, recent flirts sent/received, upcoming/recent dates, recent timeline events, recent trips, recent shared items (movies, songs, restaurants), nora_memory full history. Output: 200-word brief in Nora's voice — "Before you talk to Cass today, here's what you know..." Structured, specific, ready. This eliminates the whose-answer-is-whose confusion and the passive memory problem entirely.

### DB Changes Required
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS user1_notes jsonb;
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS user2_notes jsonb;
ALTER TABLE nora_memory ADD COLUMN IF NOT EXISTS couple_notes jsonb;
Keep memory_summary as legacy fallback during migration.

### Memory Update Prompt Improvements
Explicitly tags humor vs fact vs belief vs pattern. Never overwrites — always synthesizes forward. Flags open threads explicitly. Notes when something contradicts an earlier observation.

---

## SATURDAY FEATURE — THE GAME ROOM
*Designed: March 19, 2026*

Saturday is open. The feature is not a single dare — it's a Game Room. A collection of shared experiences the couple chooses from. The choice itself is data for Nora. Each mode is a different flavor of doing something together. Nora delivers, guides, checks in, and captures the story.

### The Rabbit Hole
Nora sends the couple down a shared curiosity thread based on what she knows about them. A single question or topic to explore together — Wikipedia, YouTube, their neighborhood, a cookbook, a memory. The app hands them a starting point and they follow it wherever it goes. They come back and tell Nora what happened. She adds it to their story. No win condition imposed — the couple decides when they've gone deep enough. Scales from 20 minutes on the couch to 3 hours out in the world.

### The Mission
A micro-adventure with a starting point but no fixed ending. Leave the house, Nora gives you a heading. Returns with a story.

### The Challenge
A creative constraint done together. Chopped-style, timed, real output at the end.

### The Remake
Recreate something from the relationship's history. First date, a trip, a specific memory. Nora helps stage it.

### The Extended Bet
Longer-form version of The Bet that plays out in real life over the day.

### Saturday Screen Design
"What kind of Saturday is it?" — couple picks their mode. Nora tailors the specific experience within that type based on profile. Natural monetization surface: free tier gets Rabbit Hole + Challenge, paid tier unlocks Mission + Remake + Extended Bet.

---

## Us PAGE AUDIT
*Added: March 19, 2026*
The Us page was deprioritized during Home and Today builds. Needs a full design audit for clean, uniform design consistent with the rest of the app, mobile-friendly layout, and proper feature coverage. Known gaps: Weekly Reflection row links to wrong destination (/weekly-reflection instead of future /reflections page). All DO TOGETHER rows should tap to dedicated detail pages following the Timeline/Date Night pattern.

---

## NEXT SPRINT (ready to build)

---

## TENSION INTELLIGENCE ARC — Nora as Relationship Safety Net
*Designed: 2026-04-03*

### The Problem
ABF surfaces real relationship topics. Real topics sometimes create real tension. The product currently has no way to notice, hold, or help when that happens. A couple that hits a hard question and goes quiet is invisible to the app. That gap is both a product failure and a missed opportunity.

### The Philosophy
ABF is not here to make every night easy. It is here to make relationships stronger. Sometimes those are different things. The product needs to say this clearly, repeatedly, and without fear — and then back it up with intelligence that earns the couple's trust.

Nora is not a therapist. She is not a referee. She notices, names, and offers. She never diagnoses, never demands, never overreacts. Trust is built through consistency, transparency, and restraint.

### Sprint 1 — Foundation (ready to design)
- Tier 3 pre-game framing: one Nora line on Hot Take tier selection screen before game starts. Mutual opt-in tap from both users before tier 3 questions fire. Sets the contract without killing the fun.
- Signal logging: log skip, abandon, and stall events tagged to question ID, tier, and couple ID. Abandon = session ended mid-game. Skip = neither user answered. Stall = 3x average response time with no answer. None of these are proof of tension — all are signals.
- Post-session soft CTA: when a tier 3 signal is detected, Hot Take summary screen shows a quiet Nora line below the score — not a button, not an alarm. "One of those questions seemed to land differently. Nora's here if you want to talk it through." Tap opens ai-coach pre-loaded with question and both answers as context.

### Sprint 2 — Intelligence (requires convincing)
- Post-session Nora bridge: when couple returns to app after an abandoned session, Nora appears once — not immediately, not aggressively. "I noticed you both dropped off after the question about X. Is that something you'd want to talk through?" Two responses: Yes or Not right now. Both respected.
- Signal pattern detection: if same topic triggers a signal across multiple sessions, Nora connects the dots. "This has come up before. You two have a pattern here worth understanding."
- Nora memory update from tension signals: Nora files what she noticed — not what happened. She never assumes. She holds the signal until the couple opens the door.

Note: Matt is skeptical this can be built at the required level of elegance. It needs to be this good or not at all. A clumsy version is worse than nothing — it breaks trust instead of building it.

### Sprint 3 — Depth (connection math)
- Nora-guided post-tension conversation: structured but not scripted. Nora holds the context, opens the conversation, follows the couple's lead.
- Repair prompt library: specific to conflict type, attachment pairing, and what was surfaced. Draws from Gottman repair attempt research.
- Relationship timeline of hard conversations: couple can see what they've worked through together. Reframes tension as progress.

### Why other apps don't do this
Fear and capability. Fear of liability, negative reviews, being blamed for a fight. Lack of memory — a generic app can't tell the difference between playful disagreement and a real fault line. ABF has the memory. ABF has Nora. ABF can go where others won't — and that is the moat.

### The onboarding contract (needs to be written)
Not a disclaimer. A philosophy. Woven into onboarding, tier selection, and Nora's first message after assessment completion. The couple needs to know from day one that ABF is built for both easy and hard — and that Nora will always ask before she goes anywhere with what she notices.

### Game Room Code Quality Audit
*Added: 2026-04-01*
Four-part audit of all Game Room code (Rabbit Hole, Hot Take, The Challenge). Do this before building The Remake or The Hunt.
- Part 1 — Dual-caller pattern scan: grep every API call in every game room page, confirm host-generates/partner-polls pattern throughout. Fix any stragglers in the same pass.
- Part 2 — Dead code removal: read each game room page top to bottom, delete unused state variables, orphaned useEffects, functions that were patched around rather than deleted.
- Part 3 — DB schema cleanup: confirm every column added during game room build is in use. Remove any that aren't. Verify expireAndClean covers all child tables.
- Part 4 — Console.log sweep: grep all game room files for debug logs, remove all.
Estimated time: one focused session, ~2-3 hours.

### Pre-Nora Full Codebase Audit
*Added: 2026-04-01*
Full audit of all pre-protocol code before Nora architecture is built. Covers: Spark, The Bet, Date Night, Us page, Weekly Reflection, notifications, onboarding. This code was written before the state machine gate, root cause checklist, and dead code discipline were established. Nora's memory architecture will touch nearly every feature — it needs clean ground to build on.
- Audit scope: console.logs, dead state, symptom-patch fixes, any dual-caller patterns in older async features, notification route logic
- Do NOT build Nora architecture until this audit is complete.
Estimated time: 2-3 sessions.

### Saturday Feature — The Game Room
Design session complete (see above). Build The Rabbit Hole first — it's the most original concept in the library and the best proof of concept for the broader Game Room mechanic. Nora-guided, leaves the app intentionally, returns with a story.

### Nora Architecture (Three-Layer Memory)
Design complete (see above). Highest leverage build in the entire product. Makes Nora genuinely smarter over time. Required before voice refinement pass or any other Nora work.

---

## VERDICT QUALITY PASS — Nora speaks to the individual, not just the couple
*Added: 2026-04-05*

Current verdict quality is observational — Nora names what happened between the couple but doesn't tell the individual what it means about them specifically. The person reading it wants to know: is this a pattern? Is this a strength or a weakness? What does this say about me, not just about us?

The fix is three-layered:

**Layer 1 — Individual address:** Every verdict should speak directly to each person's choice, not just describe the couple dynamic. "Matt, you put price third because..." not "Matt put price third." The reader should feel seen as an individual, not just as half of a couple.

**Layer 2 — Pattern connection:** Where Nora's memory has context, she connects the verdict to a pattern she's observed before. "This is consistent with what I've seen from you..." — not a diagnosis, but a recognition. Makes the verdict feel earned and specific rather than generated.

**Layer 3 — Something to sit with:** Not a question, not a summary — an observation that opens territory rather than closing it. The goal is that the couple puts their phones down and keeps talking. The verdict is the ignition, not the destination.

**Scope:** All Challenge mode verdicts, Hot Take summary Nora insight, Rabbit Hole debrief convergence. Each prompt needs a targeted pass to build in these three layers.

**Dependency:** Layer 2 requires Nora memory to be populated with sufficient couple history. Build Layer 1 and 3 first — they require prompt engineering only. Layer 2 follows naturally as memory accumulates.

---

## TECHNICAL DEBT — DATA INTEGRITY

### user_profiles ID mismatch
*Catalogued: 2026-03-25*

**The issue:**
`user_profiles` table uses its own generated UUIDs as the primary key (`id`), completely disconnected from `auth.users.id`. Every API route correctly uses the `user_id` column (which stores the auth UUID) for lookups — so the app works. But the `id` column is meaningless and creates confusion for any join that assumes `user_profiles.id = auth.users.id`.

**Current workaround:**
All API routes query by `.eq('user_id', ...)` — not by `.id`. The cron had a bug where it joined by `id` instead of `user_id` — fixed 2026-03-25.

**The correct architecture:**
`user_profiles.id` should equal `auth.users.id`. This is the Supabase standard pattern — user_profiles is created with `id uuid references auth.users(id)` so the primary key IS the auth ID. No separate `user_id` column needed.

**What a proper migration looks like:**
1. Create new `user_profiles` rows keyed by auth UUID
2. Migrate all data from old rows to new rows
3. Update all foreign key references across every table that references `user_profiles.id`
4. Drop the old `user_id` column
5. Update every API route to use `.eq('id', ...)` instead of `.eq('user_id', ...)`

**Risk level:** Medium. Safe to defer until pre-launch cleanup sprint. Must be done before public launch.

**Why it matters for scale:**
Any new developer, any new feature, any ORM or query tool will assume `user_profiles.id = auth.users.id`. Every exception to this pattern is a trap waiting to cause a bug.

---

### sanda@gmail.com orphan account
*Catalogued: 2026-03-25*

An unknown user created an account (`id: 019ac609-7b08-49b2-9d84-fb1d9ab84ff8`, email: `sanda@gmail.com`) but never connected to a partner. They have a `user_profiles` row with `display_name: sai` and no `couple_id`. Origin unknown — possibly a test signup or someone who discovered the URL. No data risk currently. Delete before public launch or investigate how they found the signup flow.

---

## LOBBY & GAME ROOM BUGS

- Rabbit Hole: "Bring it home" is unilateral — first tap wins, partner gets no notification that the other user triggered it. Consider adding a push notification or in-app prompt to partner when session is marked completed. Low priority — game is playable, this is a UX refinement.

### RABBIT HOLE — UX POLISH (post-launch):
- Drop presentation design — each find needs better visual treatment
- New round load should scroll to top and center on new thread/topic info
- Nora nudge not firing on timer expiry (stale closure)
- Keep Going button needs stronger visual contrast
- Bring it Home is unilateral with no partner notification (first tap wins — logged, acceptable for now)
- Debrief: Convergence and Bigger Picture show same text — generate-debrief needs separate prompts for factual_close vs convergence fields
- Save to Timeline needs stronger CTA visual treatment
- Tell me more (remote play) — only fires a message, doesn't share find content with partner
