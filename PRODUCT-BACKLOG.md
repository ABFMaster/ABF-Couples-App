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

## PRE-LAUNCH REQUIREMENTS
*Items that must be resolved before Friends & Family release*

### RLS Policy Audit
Every new DB table must have a `couple_access` RLS policy before shipping. `call_sessions` and `call_rounds` were missing policies and caused silent auth failures in production. Add to new table checklist: create RLS policy, verify client-side read works before closing feature.

### Host Push Notification Fix
Host receives their own "game is starting" push notification. On mobile this can pull the host away from the app mid-navigation. Fix written but never deployed: only send push to partner (not host) in `start-session/route.js`. Deploy before F&F testing.

### End Game Session Cleanup Verification
Manual DB resets were required multiple times during testing. Verify End Game button correctly cleans all session state for every game mode before F&F release. Test: play each mode, tap End Game, start a new session — confirm no stale state.

### Shadowed Import Audit
`challenge/submit/route.js` had `noraVerdict` imported as a function and redeclared as a local variable — silent 500 in production. Pre-launch: grep for shadowed imports across all routes. Command: `grep -rn "const noraVerdict\|const noraChat\|const noraReact\|const noraGenerate\|const noraSignal" app/api/`

### Universal Verdict Double-Generation
Both clients independently call verdict routes before either writes to DB — produces two different Nora verdicts. Confirmed in The Call, likely affects Hot Take. Fix: host-only generation, write verdict to DB, partner polls. Requires adding `nora_verdict` column to `call_sessions` and `hot_take_sessions`. Audit all verdict routes. Own sprint before F&F.

### Challenge Instruction Copy Audit
Story instruction was wrong ("One of you take the lead — write together out loud"). Fixed. Audit all `CHALLENGE_INSTRUCTIONS` entries in `challenge/play/page.js` for accuracy before F&F.

### Push Subscription Staleness
Cass's push subscriptions are from March and daily notifications are not delivering despite `Push errors: []` in Vercel logs. Web-push reports success but Apple APNS may be silently dropping stale subscriptions. Needs investigation:
1. Check if subscriptions are being re-registered on PWA open — verify service worker push registration fires on every app open, not just first install
2. Add subscription freshness check — re-register if subscription is older than 7 days
3. Consider adding a visible "Enable notifications" button in Profile so users can manually re-register
4. Test end-to-end: send a test push directly to Cass's subscription endpoint and verify delivery

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

### SESSION TECHNICAL DEBT — 2026-04-14
Items identified during Memory mode bug hunt that need cleanup:

1. **challenge_sessions.debug_notes column** — added for debugging, remove usage before launch. Column can stay for future debugging but stop writing to it.
2. **Orphaned session audit** — challenge_sessions accumulate as active even when parent game_sessions expire. expireAndClean now marks them abandoned. Need full audit of ALL child session tables (hunt_sessions, call_sessions, hot_take_sessions) to verify consistent cleanup across all modes.
3. **Memory poll complete refactor** — the challenge/play/page.js poll has grown into a complex multi-branch system with 8+ refs to manage stale closures. Before launch, consider refactoring to Supabase realtime subscriptions which eliminate the stale closure problem entirely.
4. **Memory hint copy** — hints in challenge-prompts.js still use theatrical language ("spaces between"). Needs voice pass before Memory is released to wider audience.
5. **debug_notes column on challenge_sessions** — created 2026-04-14 for debugging. Clean up write calls after Memory bug is resolved.

### Saturday Feature — The Game Room
Design session complete (see above). Build The Rabbit Hole first — it's the most original concept in the library and the best proof of concept for the broader Game Room mechanic. Nora-guided, leaves the app intentionally, returns with a story.

### Nora Architecture (Three-Layer Memory)
Design complete (see above). Highest leverage build in the entire product. Makes Nora genuinely smarter over time. Required before voice refinement pass or any other Nora work.

---

## VERDICT QUALITY PASS — Nora speaks to the individual, not just the couple
*Added: 2026-04-05*

Current verdict quality is observational — Nora names what happened between the couple but doesn't tell the individual what it means about them specifically. The person reading it wants to know: is this a pattern? Is this a strength or a weakness? What does this say about me, not just about us?

**Design principle — Memory as earned specificity, never as a summary screen:**
The temptation is to make Nora's memory visible as a profile or list ("Nora remembers that you feel loved when..."). This is the wrong execution — it turns a relationship into a data dashboard and kills the magic. Memory should show up as earned specificity in the moment. The felt value comes from Nora saying something that could only be said about this specific couple — not from displaying what she knows. A verdict that references a real moment, a real pattern, a real signal she's observed is worth ten memory profile screens. Build toward this in verdict prompts as Nora memory accumulates depth.

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

### THE HUNT — Full Design Spec
*Designed: 2026-04-07*

**What it is:** Nora gives the couple a mission. They leave the app. They complete it together in the real world. They come back with a story. The only Game Room mode explicitly designed to create the self-expansion neurological state — novelty + mild challenge + shared action — that research shows directly combats relationship boredom and restores early-relationship satisfaction.

**Research foundation:** Aron et al. (2000) — couples doing novel/arousing activities showed significantly greater relationship satisfaction increases vs pleasant activities or no-activity control. Effect held across lab experiments, door-to-door surveys, and newspaper questionnaires. Boredom at year 7 predicted less satisfaction at year 16 (Tsapelas, Aron & Orbuch, 2009). Self-expansion through shared novel experiences is one of the most replicable findings in relationship science.

**Gap filled:** ABF currently deepens connection through reflection (Spark, Remake), knowledge (Memory, Bet), and shared creativity (Challenge, Hot Take). Nothing in the ecosystem explicitly creates the novelty + mild challenge + shared action state. The Hunt fills that gap.

**Relationship to other features:**
- Different from Rabbit Hole: Rabbit Hole = shared curiosity, can happen on the couch. The Hunt = shared action, leaves the app and often the house.
- Different from Date Night: Date Night = logistics and planning. The Hunt = the experience layer on top of the plan, or the plan itself.
- Complementary to Date Night: "Add a Hunt" button on date page launches The Hunt with date location + time as Nora context. Full bidirectional integration (Hunt as first-class date stop) is a Date Night redesign sprint item.

**Mission library — 4 categories, all tagged with time + together/remote:**

DISCOVERY missions — go find something specific
- Places-powered: Nora queries Google Places filtered against couple's date history → surfaces genuinely new places nearby. "You've never been to Altura. It's 4 minutes away. Go find out if it's yours."
- Sensory discovery: "Find something in your neighborhood that looks like it's been there forever. Photograph it and tell Nora what you think its story is."
- Stranger interaction: "Find someone who looks interesting and ask them one question: what's the best meal they've ever had?"
- New order: "Find a restaurant neither of you has been to and order one thing neither of you has ever eaten."

RETURN missions — go back to somewhere that matters (requires couple history — rooted+ stage)
- "Go back to the neighborhood where you had your first date. Find one thing that's changed."
- "Go to the place you were when you first said I love you. Just stand there for five minutes."
- "Find the place that best represents where you are as a couple right now."

CHALLENGE missions — do something together you wouldn't normally do
- "Walk somewhere for 20 minutes without using maps. Navigate only by instinct and conversation."
- "Go somewhere in your city neither of you has been. You have 45 minutes."
- "Order the thing on the menu neither of you would ever order. Eat the whole thing."

CREATION missions — make something together
- "Take one photograph each that represents how you feel about each other right now. Compare."
- "Write one sentence each about where you want to be in five years. Read them to each other." (text captured in app, feeds Nora memory)
- "Find an object that costs nothing that represents where you are as a couple today. Photograph it. Add it to your Timeline."

**Mission selection logic:**
- Together/remote flag: return + discovery missions require together. Challenge + creation can work remote with adaptation.
- Couple stage: return missions require shared history (rooted+). All others available from day one.
- Time available: Quick Hunt (15-30 min, no travel) vs Adventure Hunt (1-2hr, leaves house) vs Date Hunt (time inherited from date)
- Location: geolocation feeds Places query for discovery missions. If unavailable, falls back to non-location missions.
- Date context: if launched from Date Night, Nora uses date destination + time as mission framing.

**State machine:**
BRIEFING → both see mission, both tap "We're in" → MISSION (app goes quiet, timer visible, "Drop a find" + photo available) → RETURN (either partner taps "We're back", both confirm) → DEBRIEF (each types/drops what happened, optional photo) → NORA VERDICT (reads drops + context, delivers short verdict, directed closing question, "Save to Timeline?" prompt)

**Photo capture — first class:**
- "Drop a photo" is front and center during mission, not buried
- Every photo drop auto-prompts "Add to Timeline?" — one tap
- Creation missions explicitly require photo as the output
- This is ABF's primary photo capture surface — use it aggressively

**Data capture:**
- Creation mission text responses (5-year sentences, etc) → write to love_map_updates
- Photo drops → Timeline prompt
- Nora debrief responses → Nora memory
- Coaching signals → love_map_updates (same pattern as Remake)

**Date Night integration — V1 (this sprint):**
- "Add a Hunt" button on date page → navigates to Game Room lobby with ?mode=hunt&dateId=X
- Hunt play page reads dateId, Nora uses date location + time as mission context
- One-way bridge: 30 lines of code, no schema changes to dates table

**Date Night integration — V2 (Date Night redesign sprint):**
- Hunt as first-class stop in date itinerary
- Any Game Room mode attachable as a date activity stop
- Push notification trigger from scheduled date start time: "You're heading out tonight. Want a mission?"
- Full bidirectional relationship

**New files:**
- lib/hunt-missions.js — mission library
- app/game-room/hunt/play/page.js — play page
- app/api/game-room/hunt/start/route.js
- app/api/game-room/hunt/confirm/route.js
- app/api/game-room/hunt/drop/route.js
- app/api/game-room/hunt/return/route.js
- app/api/game-room/hunt/debrief/route.js

**Places integration:**
- Reuse existing /api/dates/suggestions infrastructure
- Add couple date history filter: query dates table, exclude visited places from Places results
- ~2 hours of work on top of existing plumbing

**Build complexity:** Simplest Game Room mode. No alternating turns, no blind submissions, no verdict complexity. Four states, two users, one Nora generation call at start and one at end. Estimate: 1-2 sessions.

### THE REMAKE — Full Design Spec
*Designed: 2026-04-07*

**What it is:** A 5-day private reflection cycle where both partners independently revisit a significant shared moment through escalating daily prompts. Reveals on Day 5. Nora synthesizes both partners' responses and hands the conversation back to them.

**Therapeutic target:** Narrative coherence and savoring — the couple actively constructing and dwelling in their shared story. Backed by EFT research (Angus & Greenberg), Gottman oral history findings, and Slatcher & Pennebaker journaling research.

**Architecture — different from all Game Room modes:**
- Persistent state across 5 days (not a single session)
- Daily prompt surfaces as a Today action when a cycle is active
- Inline Nora drawer on prompt page — no navigation away, slides up from bottom
- Coaching conversation writes signals to love_map_updates (flagged as coaching-sourced, not submitted)
- Only explicit partner submissions feed the reveal
- Reveal = Nora synthesis + explicit handoff to live conversation + loop-close ("come back and tell me")

**Moment library — Tier 1 (20 universal moments, written and ready):**
Each moment has: key, category, stage (new/established/rooted/committed/any), title, Nora intro, 5-day prompt arc (sensory → observation → interior → turning point → carry-forward)
Categories: firsts (5), commitment (2), hard_times (3), good_times (3), ordinary (2), change (2), present (1)
Full library exists in design session transcript 2026-04-07 — copy into lib/remake-moments.js when building.

**Moment selection logic:**
- Nora selects from Tier 1 using couple context: anniversary date, birthdays, assessment answers, Nora memory, living situation, family intent
- Couple stage derived from anniversary math (new <1yr, established 1-3yr, rooted 3+yr, committed = explicit)
- "Does this fit your relationship?" mutual confirmation before cycle starts — either partner can decline and Nora surfaces another
- Tier 2 (specific moments from Timeline/app data) unlocks after sufficient history — same pattern as Memory

**Inline Nora coaching:**
- Available on every prompt page as a persistent element: "Struggling with this? I can help"
- Slides up as a drawer — prompt stays visible, no navigation
- Body-first coaching methodology: physical → observation → meaning
- Coaching conversation is private from reveal but feeds Nora memory signals
- This drawer pattern should become a design standard across ABF wherever Nora needs to be inline

**Privacy model:**
- Coaching conversation never surfaces in reveal without partner's explicit choice
- Coaching signals write to love_map_updates for Nora memory only
- Partner always controls what gets submitted

**Where it lives:** Us page redesign — entry

### ONBOARDING DATA GAP
*Added: 2026-04-07*
The 28-question compatibility assessment captures love language, attachment style, and conflict style — but is missing high-value life stage signals that would make Nora significantly smarter across the entire app.

Minimum additions needed:
- Living situation (live together / long distance / same city different homes)
- Family intent (have kids / want kids / not for us / not sure yet)
- Relationship length confirmation (anniversary date already in profile — confirm it populates correctly from onboarding)

Wider audit: review all 28 existing questions and identify any other gaps against what Nora needs to speak correctly to different couple types. Cross-reference against Gottman's relationship assessment dimensions and EFT intake questions.

This data improves: Remake moment selection, Ritual suggestions, Spark question relevance, Bet question categories, Hot Take tier selection, Nora memory synthesis quality, Hunt mission selection.

Do this before building The Remake. Can run in parallel with Us page redesign.

### WEEKLY RHYTHM AUDIT — Research + ABF Gap Analysis
*Added: 2026-04-07*
Sprint effort. Two parts:
1. Research audit — identify the highest-value daily/weekly relationship habits from Gottman, EFT, attachment theory, journaling research, and broader couples therapy literature. Map what each habit achieves therapeutically.
2. ABF audit — map current weekly features (Spark, Bet, Ritual, Weekly Reflection, Game Room) against the research findings. Identify genuine gaps — things the research says matter that ABF doesn't currently do.
Output: a prioritized list of 2-3 new daily feature candidates to replace the 2 redundant Spark days. At least one candidate should address narrative coherence / shared meaning construction (the gap identified during The Remake design session). One candidate may be a Game Room mode migrated to a daily slot.
Do this before committing to any new daily feature builds.

### GAME ROOM DATA CLEANUP
*Added: 2026-04-07*
All challenge_rounds, hot_take_answers, call_rounds, and game_finds records for couple_id 8230e60f-44ca-4668-be28-06cb32b1b831 contain test/placeholder data from development. Clean all game room data for this couple once all Game Room modes are functionally complete and signed off. Do not clean until building and testing is fully done — Nora memory synthesis depends on this data being present during development.

### CHALLENGE MEMORY — REMAINING ITEMS
*Added: 2026-04-07*
- Restore MEMORY_UNLOCK thresholds (minTimelineEvents: 5, minSparkBetResponses: 10, minAccountAgeWeeks: 3) before any wider release — currently set to 0 for testing
- Full 3-round playtest with role swap not yet completed — verify guesser/answer-holder roles flip correctly each round
- Hint quality pass — hints occasionally too abstract, needs prompt tuning in generate route (part of broader verdict quality pass)
- Love Map data structure — build proper dimension-mapping schema, map Spark/Bet/Timeline data points to Love Map dimensions, store confirmed/updated answers per dimension. Shell exists (love_map_updates table). Full build is a dedicated session.
- After Dark — two Gottman sexual preference questions (favorite time for lovemaking, what turns partner on sexually) parked for After Dark feature when built

---

## BACKLOG ADDITIONS — 2026-04-22

### HOT TAKE — MUTUAL SKIP
*Added: 2026-04-22*
Both users can skip independently. Option A reveal: "passed on this one" soft label. Medium lift, post-launch.

### RABBIT HOLE — PLAY AGAIN
*Added: 2026-04-22*
Added to debrief screen ✓ (shipped)

### CHALLENGE MODES — SINGLE ROUND + PLAY AGAIN
*Added: 2026-04-22*
All modes now single round except Memory. Play Again wired to correct mode. ✓ (shipped)

### NORA_VOICE v3
*Added: 2026-04-22*
Perel precision, Sedaris humor, Schwarzenegger attention, dinner party brief, hard moments, trust, questioning philosophy. Living document — refine from real usage data.

### GAME ROOM REDESIGN
*Added: 2026-04-22*
Featured + Grid layout. Nora recommends mode based on couple history. Story, Pitch, Rank, Plan, Memory now first-class cards — visual identity (accent colors, taglines, icons) locked in code but layout needs full redesign sprint.

### RANK UX — DRAG TO REORDER
*Added: 2026-04-22*
No drag-to-reorder on mobile. Arrow buttons functional but less intuitive. UX improvement post-launch.

---

## BACKLOG ADDITIONS — 2026-04-24

### Us PAGE — Ideas/Ahead section: shared_items integration
*Added: 2026-04-24*
Build real shared_items integration for Watch/Eat/Listen/Do/Travel buckets in the Ahead tab. Currently shows empty state only. Wire to existing shared_items table — filter by type, display per category bucket, support add/toggle-done from the Ahead view.

### Us PAGE — Been echoes: game session echo mechanic
*Added: 2026-04-24*
Game session echo mechanic not yet implemented. Echoes currently only show timeline_events filtered by event_type. The `game_echo` event_type is declared in code but never written to the DB — game sessions don't auto-create echo entries. Design and build the echo write path: after a game session verdict, write a lightweight timeline_event of type `game_echo` with session summary. This populates the Been section without requiring manual saves.

### Us PAGE — Now: wire real Nora mode recommendation
*Added: 2026-04-24*
Game Room suggestion in Now tab is hardcoded "Rank It". Wire real Nora mode recommendation based on couple history — most recently played modes, Spark/Bet answer patterns, time of week. Requires `/api/dashboard/hero` or a dedicated recommendation endpoint that reads couple game history.

### Us PAGE — Now: couple moment line in header
*Added: 2026-04-24*
`coupleMoment` is a null placeholder in the dashboard header. Wire to next date_plan or trip so the header subtitle shows something meaningful ("Date night Thursday" or "Tokyo in 3 weeks"). Low complexity — read from already-fetched nextDate/nextTrip state.

### SIGNAL REGISTRY — Phase 1 design
*Added: 2026-04-24*
Phase 1 design complete, build deferred to 50 real couples + 3 months of data. Shadow mode validation required before surfacing to users. Three signals only: participation symmetry (are both partners engaging equally?), engagement trend (is interaction increasing or declining over 4 weeks?), repair after friction (do they re-engage after a skipped or abandoned session?). No signal surfaces to users in Phase 1 — data collection only. Nora reads the signals internally but doesn't label them for the couple.

### NORA IDENTITY — avatar redesign
*Added: 2026-04-24*
Cartoon avatar needs replacing. Nora is not a character — she is a presence. A dedicated design sprint is needed to define what that presence looks like visually: typography treatment, color system, motion, absence of illustration. This is a brand-level decision, not a component tweak. Blocked until there is time to do it correctly.

### CUSTOM NAV ICONS
*Added: 2026-04-24*
Backlogged. Currently text labels + placeholder geometric shapes. Custom icons needed for Home, Nora, Us, Game Room, Profile. Design sprint item.

### WORTH READING — deferred removal
*Added: 2026-04-24*
Removed from app. Reintroduce when content pipeline is robust. Nora can surface reading contextually in conversation in the meantime — "I came across something that made me think of you two" as a natural Nora touch rather than a dedicated tab.
