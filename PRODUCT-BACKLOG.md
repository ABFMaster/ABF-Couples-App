# ABF Product Backlog — Updated 2026-06-03

## HOW TO USE THIS BACKLOG
- Sprints are sequenced — work top to bottom within each sprint
- Parked items are real ideas, not dead ones — revisit at the right time
- Any idea mentioned in session gets a one-liner added before the session closes
- Test accounts: use matt+test@ email for onboarding work, never test on primary accounts

---

## SPRINT 1 — ONBOARDING OVERHAUL (BETA GATE)
Nothing ships to strangers until this sprint is done. A new couple needs to land, feel Nora's presence immediately, complete setup, and feel like the app already knows them before they hit the dashboard.

### 1A — Test Infrastructure (do first)
- [ ] Create dedicated test Supabase accounts (matt+test@, cass+test@) for onboarding work — never test onboarding on primary accounts
- [ ] Confirm test accounts can be fully reset without affecting Matt/Cass production data

### 1B — Visual Unification
- [ ] Assessment page visual pass — currently Tailwind/coral (#E8614D), needs to match ABF warm aesthetic (#FAF6F0, #C4714A, Cormorant Garamond headers, DM Sans body)
- [ ] Ranking question UX — replace <select> dropdowns with drag-and-drop or tap-to-rank interaction (mobile-first)
- [ ] Welcome carousel — add Nora's Day, The Bet, The Notice, Weekly Reflection to feature cards (currently only 4 features shown)
- [ ] Confirm /nora-avatar.svg asset exists and renders correctly
- [ ] Partner invite flow redesign — what Partner 2 sees is the conversion moment, needs to be beautiful and compelling

### 1C — Nora Voice In Onboarding
- [ ] Nora frames every step — she introduces herself, contextualizes the assessment, reacts to completion. Zero form-collection energy.
- [ ] Assessment intro — Nora explains why she's asking, not just what she's asking
- [ ] Assessment completion — Nora reacts to results with one specific observation before routing to dashboard
- [ ] Remove the two empty isOnboarding blocks (lines 183-184, 266-267 in assessment/page.js) — implement or delete

### 1D — Important Dates Capture
- [ ] Add important dates step to onboarding — "When did you meet?", "First date?", "First kiss?", "Anniversary?" — each answer auto-creates a timeline_event row with correct event_type
- [ ] Wire date capture to Timeline — entries appear immediately in the Timeline tab
- [ ] These dates become the first seeds of Nora's memory — wire to updateNoraMemory with SIGNAL_TYPES.TIMELINE_EVENT

### 1E — Photo Anchors
- [ ] Add photo prompt step to onboarding — "Where did you have your first date?", "Where did you meet?" → fetch via Places API or user upload
- [ ] Store as permanent couple visual identity anchors in Supabase Storage
- [ ] Use throughout app — dashboard ambient visuals, Timeline entries, Nora context
- [ ] If user skips photo, gracefully defer — "You can add this later in your Timeline"

### 1F — Data Wiring (assessment data actually feeds Nora)
- [ ] completeAssessment calls updateNoraMemory — assessment completion is a high-signal event, Nora should know immediately
- [ ] Hero card calls getNoraBriefing — currently reads nora_memory directly but skips assessment data entirely
- [ ] attachment_style and conflict_style reliably written to user_profiles on assessment completion (currently sometimes missing — manually patched in SQL)
- [ ] Hobbies and date preferences wired into Nora context — collected during onboarding, currently never read by any Nora prompt
- [ ] Assessment questions Gottman/EFT grounded — current conflict style and attachment capture is thin. Requires a dedicated content sprint with research. Do not rush this.

### 1G — Solo User Arc (minimum viable)
- [ ] When Partner 2 hasn't joined yet, Partner 1 needs real value — not a blank state
- [ ] Nora speaks to the individual meaningfully in this state — "I'm getting to know you while you wait"
- [ ] Relationship Room foundation — Partner 1 can start building the couple's visual identity solo (photo anchors, important dates) before Partner 2 joins
- [ ] Partner invite flow — Nora helps draft the invite, shows Partner 2 what the coupled experience looks like

---

## SPRINT 2 — NORA SIGNAL INTEGRITY
Nora needs to be eating everything she should be eating. Until this sprint is done, Nora will feel generic to new couples who haven't built history yet.

### 2A — Flirt Signal Gaps
- [ ] FLIRT_SENT does not increment signal counts — Nora Arc never learns from flirt behavior. Add FLIRT_SENT to INDIVIDUAL_SIGNAL_WEIGHTS and COUPLE_SIGNAL_WEIGHTS.
- [ ] FLIRT_RECEIVED signal type doesn't exist — reactions don't feed Nora at all. Create FLIRT_RECEIVED signal, call updateNoraMemory from flirts/react route.
- [ ] couple_notes blind to all flirt activity — FLIRT_SENT absent from SHARED_SIGNALS. Add and define couple-level lens.
- [ ] Both user notes currently update from sender perspective only — receiver gets notes written about a flirt they didn't send. Audit whether this is intentional or a latent bug.

### 2B — Timeline Signal Gaps
- [ ] Game Room sessions (non-Rabbit Hole modes) don't create timeline_events — Hot Take, The Challenge, The Call completions should auto-create entries
- [ ] conversation event_type exists in config but no insert path creates it — wire or remove
- [ ] song event_type in timeline config is orphaned — songs come through as shared_item with item_subtype=song, not event_type=song. Align config with reality or build the insert path.
- [ ] Flirt songs sent — no timeline wire. Decide: should a sent song flirt create a timeline entry?

### 2C — Nora Vision Commentary (backlogged feature)
- [ ] When a flirt with an image is sent (photo type, or memory type with image_url), make a proper Anthropic vision API call with the image as a content block
- [ ] Nora actually sees the photo and writes a specific observation into user notes
- [ ] Prerequisite: confirm Supabase Storage photo URLs are publicly accessible (required for Anthropic vision API)
- [ ] This is the correct long-term fix — image URLs as text strings in prompts (now sanitized) was never the right approach

### 2D — Assessment → Memory Wire
- [ ] Assessment completion should fire updateNoraMemory with full profile data as a PROFILE_UPDATE signal
- [ ] Couples debrief completion should fire a couple-level signal
- [ ] Structured facts from couple_notes.structured_facts not surfacing in hero card — audit and wire

---

## SPRINT 3 — POLISH & FUNCTIONAL CLEANUP
Every screen a stranger touches needs to feel intentional. Nothing janky, nothing confusing.

### 3A — Active Bugs (fix before beta)
- [ ] Location images not always showing on date banners and Next Up card
- [ ] Ritual card resets to pre-state on page reload — shows checkin buttons again after completion
- [ ] Ritual "We did it" not showing progress on Us page after completion
- [ ] Bet verdict tone — misreads self-deprecating humor as vulnerability. Needs prompt tuning.
- [ ] Google Cloud free trial ended — Places API breaks in 30 days. Upgrade required. URGENT.
- [ ] Nora standalone synthesis cron route — build before Sunday synthesis 404s

### 3B — Nora Voice Quality Pass
- [ ] Reduce response restatement — Nora echoes back what the user said before adding anything
- [ ] Vary entry points — too many responses start the same way
- [ ] Cut affirmation formula — substance before validation, not after
- [ ] Closing questions should open new territory, not summarize what was just said
- [ ] Verdict quality pass — Nora addresses couple as a unit in verdicts. Needs a layer speaking to what each individual's choices reveal specifically.

### 3C — Weekly Rhythm Visual Pass
- [ ] Weekly Reflection page — outdated design, needs full redesign
- [ ] Weekly Reflection history — no history page exists, users can't see past reflections
- [ ] Timeline polish — design pass across all card layouts and event types
- [ ] Trips polish — detail page needs visual pass

### 3D — Stamp Perforation Polish
- [ ] FlirtCard stamp visual — reads as stamp but needs perforation refinement. Research CSS/SVG perforation patterns.

---

## SPRINT 4 — FULL CASS END-TO-END TEST
Nothing moves to external beta until this passes.

- [ ] Every game mode — Hot Take, Rabbit Hole, The Challenge (all sub-modes), The Call
- [ ] Every daily card — Spark, Bet, The Notice, Nora's Day, Ritual, Game Room, Weekly Reflection
- [ ] Flirts — send/receive all 6 types (song, word, photo, gif, found, memory), reactions
- [ ] Nora — ai-coach full conversation, hero card pre/post modes
- [ ] Timeline — add event, view, filter
- [ ] Date Night — build a date, view it, complete it, add to Timeline
- [ ] Us tab — all sections, Ahead list, shared items
- [ ] Me tab — Notebook, Practices, settings
- [ ] Push notifications — confirm all cron and peer-to-peer pushes fire correctly
- [ ] Onboarding — full flow on test account from landing to dashboard

---

## GAME ROOM — UNBUILT MODES
### The Remake
- [ ] Designed, not built — own sprint, paired with Us page redesign
- [ ] Pulls from couple's shared history (Timeline, flirts, dates) and recreates or reacts to it
- [ ] Needs onboarding data (important dates, photo anchors) to work well — do after Sprint 1

### The Hunt
- [ ] Designed, not built
- [ ] Hybrid of Option B (Nora sends you somewhere specific based on what she knows) and Option C (mild challenge outside comfort zone — self-expansion effect)
- [ ] Uses Maps API, couple's location history, and relationship memory
- [ ] Needs photo capture — best on native app, deferred until App Store sprint

### Rank UX Fix
- [ ] The Challenge → Rank mode: mechanic and DB working correctly, UI doesn't communicate the two-round reconciliation clearly. Users confused about what's happening between rounds.

---

## NORA INTELLIGENCE — DEEPER FEATURES
These are designed and validated in product thinking. Build after core signal integrity is solid.

### Tension Intelligence Arc (three-sprint arc)
- [ ] Sprint 1 — Silent signal detection: Nora notices disengagement patterns (one partner stops answering, short answers after long ones, topic avoidance) without surfacing anything to the couple
- [ ] Sprint 2 — Gentle surface: "I noticed you both dropped off after X. Is that something you'd want to talk through?" Mutual opt-in only. Both responses respected.
- [ ] Sprint 3 — Nora-guided post-tension conversation: structured but not scripted. Nora holds context, opens conversation, follows couple's lead.
- [ ] Sprint 4 — Four Horsemen detection: criticism, contempt, defensiveness, stonewalling patterns across sessions

### Repair / Rupture Mechanic
- [ ] "Rough patch" mode — private signal either partner can send to Nora
- [ ] Post-conflict Nora check-in — not intrusive, not diagnostic, just present
- [ ] Repair prompt library: specific to conflict type, attachment pairing, what was surfaced. Draws from Gottman repair attempt research.
- [ ] This is also a Trojan horse for Nora chat habit formation

### Individual Wellbeing Pulse
- [ ] Weekly one-word check-in before Spark reveal — "Before we get into this — how are you doing? One word."
- [ ] Free text, no scale, no emoji picker
- [ ] If word is heavy (exhausted, anxious, disconnected) Nora adjusts session tone
- [ ] Partner never sees it. Feeds nora_memory as individual wellbeing signal.

### Shared Meaning / Us in 5 Years
- [ ] Builds over time via Sunday Reflection prompts — monthly/quarterly/yearly cadence
- [ ] Starts broad ("Where do you see yourselves?"), gets specific over time ("We live in Austin with 2 dogs...")
- [ ] Becomes a living document Nora references when making suggestions
- [ ] Not a form — emerges from conversation

### Love Language Expression Tracking
- [ ] Nora notices when flirts, dates, or gestures align with partner's love language
- [ ] Lightweight prompt: suggest expression in partner's love language when relevant
- [ ] Signal feeds nora_memory — Nora learns what expressions land vs. miss

### Gratitude Send
- [ ] Lightweight flirt-adjacent mechanic — quick organic acknowledgment, not "Nora said send this"
- [ ] Could live in Flirts as a type, or as a standalone moment mechanic
- [ ] No AI generation — user writes it, Nora notices it happened

### Nora Named Address Unlock
- [ ] Post-beta feature. Nora earns right to address individuals by name as couple history deepens.
- [ ] Grounded in Terry Real framework.
- [ ] Boolean flag Nora sets herself in nora_memory when confident enough in individual read.
- [ ] Not built until beta validates memory depth.

---

## RELATIONSHIP ROOM (IMAGE EXPANSION)
- [ ] Onboarding photo prompts — "Where did you meet?", "Your first date?" → Places API fetch or user upload → stored as permanent couple visual identity anchors
- [ ] Photo bucket — dedicated upload space in Us tab, no event required, just "photos of us"
- [ ] Nora pulls contextually — surfaces a photo from two summers ago tied to today's Spark or a specific memory
- [ ] Next Up card photo — show first stop photo on dashboard when date is planned
- [ ] Date suggestion cards — surface real place photos on Ideas for You Two cards
- [ ] Timeline entries get richer visual treatment when photo anchors exist

---

## SPRINT K — DATE NIGHT (in progress)
- [ ] K2: Nora intelligence layer — vibe selection from couple_notes, "why this" one-liner per suggestion
- [ ] K2: Nora date concept — event as anchor, dinner + after suggestions around it
- [ ] K3: In-date experience — automatic date start push at date_time, "We're here" per-stop mechanic
- [ ] K3: In-moment photo capture tied to stop
- [ ] K3: Post-date Nora synthesis
- [ ] K4: Co-creation — partner can suggest/add stops before date locks
- [ ] nearbysearch → Places API New migration (works now, will break eventually)
- [ ] Backfill photo_url on custom_dates stops
- [ ] Google Cloud billing upgrade — free trial ended, Places API breaks in 30 days URGENT

---

## WEEKLY RHYTHM — REMAINING GAPS
- [ ] Bet questions categorization — add category field (preferences/likely/reactions/confessions) to all 120 questions in lib/bet-questions.js. question_category column exists in bets table, nullable.
- [ ] Spark State B individual Nora insight — deployed, needs real-world validation with new couples
- [ ] Bet State B individual Nora insight — deployed, needs real-world validation
- [ ] Love language flirt mode — Nora suggests expression in partner's love language when relevant

---

## SINGLE USER ARC
- [ ] Partner 2 hasn't joined — Partner 1 gets real value, not a blank state (see Sprint 1G)
- [ ] Asymmetric engagement — when one partner consistently engages less, Nora adapts tone not content
- [ ] Solo Nora session quality — Nora should feel useful and specific even without couple data

---

## API AUTH HARDENING (pre-launch)
- [ ] 56 unprotected routes identified — audit and add Bearer JWT auth + force-dynamic to all
- [ ] /api/assessment/insight has no auth guard — fix
- [ ] Systematic pass: every new route must have force-dynamic, Bearer JWT auth, console.error in catch

---

## PRE-APP STORE
- [ ] App Store assets — icon, screenshots, preview video
- [ ] Privacy Policy — public URL required for App Store submission
- [ ] App Store description copy
- [ ] TestFlight setup for beta distribution
- [ ] Native push notification upgrade — PWA push works but native is more reliable
- [ ] Photo capture for The Hunt — camera access, native app only

---

## MONETIZATION (post-beta)
- [ ] Pricing model decision — subscription tiers vs. one-time
- [ ] After Dark — separate premium experience, mutual opt-in gate, own design sprint
- [ ] Paywall placement — what's free, what's paid, how Nora's depth is the upsell

---

## PARKING LOT — REAL IDEAS, NOT DEAD
- [ ] CAH Licensing Partnership — Cards Against Humanity x ABF. Their cards, our couples data, Nora as host. Personalized by conflict/attachment pairing. Target when 1,000+ active couples.
- [ ] The Bet — physical card game version. Print-on-demand once mechanic validated in-app.
- [ ] Biometric integration — HRV as Nora signal for stress/arousal context. Native app only.
- [ ] Learn hub — article feed, books, podcasts. Content curation feature. Revisit post-beta.
- [ ] Dream Trip — shelf properly, let Ahead handle travel for now. Revisit when photo/memory richer.
- [ ] Giphy production key — blocked externally, follow up when ready for App Store.

---

## TECHNICAL DEBT
- [ ] Dead code audit — remove any remaining orphaned components, unused routes, dead TODO comments
- [ ] Schema cleanup — attachment_assessments and conflict_assessments tables orphaned (learn/ removed). Drop or keep?
- [ ] Test data scrub — remove Matt/Cass test sessions from DB before external beta
- [ ] Stale emoji in Idea card titles — display sanitization pass
- [ ] Game Room day label hardcoded "Saturday" — should be dynamic
- [ ] cta_label/cta_href/pills from heroData — never rendered, remove or wire
- [ ] GoTrueClient singleton warning — low priority but clean up before App Store
- [ ] Flirt retention policy — GIFs/ephemeral types: 90-day delete. Permanent counter on couples table never decremented. Implement before scale.

---

## SECURITY — PRE-SCALE
- [ ] 12 SECURITY DEFINER functions with anon execute revoked — done. Document what was changed.
- [ ] RLS audit — confirm all tables have appropriate policies before external users
- [ ] API auth hardening — 56 unprotected routes (see above)
- [ ] Signed URL expiry — confirm photo URLs in Supabase Storage don't expire (must be public bucket)
