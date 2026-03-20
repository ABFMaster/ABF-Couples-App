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

### Saturday Feature — The Game Room
Design session complete (see above). Build The Rabbit Hole first — it's the most original concept in the library and the best proof of concept for the broader Game Room mechanic. Nora-guided, leaves the app intentionally, returns with a story.

### Nora Architecture (Three-Layer Memory)
Design complete (see above). Highest leverage build in the entire product. Makes Nora genuinely smarter over time. Required before voice refinement pass or any other Nora work.
