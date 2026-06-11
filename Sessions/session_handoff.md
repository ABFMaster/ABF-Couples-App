- SPARK_DAYS = [1] (Monday only)
- BET_DAYS = [2] (Tuesday)
- Thursday removed from Spark days
- showSpark fixed to Monday only in dashboard
- showBet fixed to Tuesday only in dashboard
- anyScheduled updated to include showNotice and showThursday

### The Notice — Wednesday (confirmed working)
- wednesday_notices table created
- /api/wednesday/today and /api/wednesday/send routes built
- WednesdayCard component — pre-send, post-send, reveal views
- Morning push fires with action-oriented copy
- Evening 7pm reveal confirmed working with Nora synthesis
- Push subscription churn fix: only deletes on endpoint change, not every app load
- Privacy: Thursday generation uses couple_notes only, never user1_notes/user2_notes

### Nora's Day — Thursday (confirmed working)
- thursday_entries table created
- /api/thursday/today and /api/thursday/respond routes built
- ThursdayCard component — pre-response, post-response, reveal views
- processThursdayGeneration (3am Thursday) and processThursdayReveal (7pm Thursday)
- Privacy fix: generation uses couple_notes only after data bleed investigation
- Confirmed Cass session data was NOT bleeding into Matt notes — same dynamic described independently from both perspectives

### Nora Relationship Arc — Live
- individual_signal_count and couple_signal_count columns added to nora_memory
- INDIVIDUAL_TIER_CONTEXT, COUPLE_TIER_CONTEXT constants added to lib/nora-knowledge.js
- getNoraTierContext() exported from nora-knowledge.js
- Signal weight maps added to lib/nora-memory.js — increments on every signal type
- Tier context wired into: ai-coach, hero card pre-mode, Thursday generation
- Matt and Cass seeded at individual=12, couple=16 (Tier 2 Pattern Recognition)
- Tier thresholds: 0-5 discovery, 6-15 pattern recognition, 16+ earned intimacy
- Couple thresholds: 0-7 new together, 8-20 building context, 21+ deep familiarity

### Nora Architecture Unification — Confirmed Working
- NORA_VOICE powers all surfaces
- buildCoachSystem() in lib/nora.js
- getNoraBriefing (nora-knowledge.js) = assessment data wired into ai-coach
- getMemoryBriefing (nora-memory.js) = synthesized memory — renamed from getNoraBriefing (8 call sites updated)
- Both assessment AND memory briefing feed ai-coach
- Standalone Nora same character foundation
- Confirmed: ABF Nora and standalone Nora producing excellent outputs

### Flirts — Postcard Redesign
- flirts table renamed to flirts_legacy, new clean flirts table created
- Four API routes: /api/flirts/inbox, /api/flirts/send, /api/flirts/open, /api/flirts/react
- FlirtCard component — full postcard design
  - Home state: postcard with TO: partner, stamp, ruled lines
  - Drop state: type selector (SONG · WORD · PHOTO · GIF · FOUND · MEMORY), writing on ruled lines, stamp fills gold when content ready, "mail it" CTA
  - Stack state: received postcard with content on ruled lines, hold-to-react stamp mechanic
  - Sent state: sent flirts list with stamp indicators
- Spotify in-app search wired (existing API)
- GIPHY search wired (public API)
- OG metadata fetch for Found type
- Photo upload to Supabase storage
- Gold dot reaction: tap=seen, hold halfway=felt, hold to completion=needed
- Received flirts accessible after closing (received state)
- Old FlirtSheet removed from dashboard

### Privacy Implementation
- app/onboarding/privacy/page.js — Matt's personal commitment before onboarding
- "How Nora Works" in Me tab settings sheet
- Nora first-session acknowledgment in system prompt
- Settings sheet close bug fixed — × button, maxHeight 80vh

### Push System
- push_log table with all 18 peer-to-peer + 6 cron route labels
- Multi-device fix: only deletes subscription on endpoint change (not every app load)
- Wednesday/Thursday/Ritual/Saturday/Sunday pushes all confirmed firing
- Subscription churn root cause identified and fixed

### Supabase Security
- Revoked anon execute on 12 SECURITY DEFINER functions
- Security pre-scale backlog items documented

### Nora Standalone
- Welcome email confirmed working (Resend, onboarding@resend.dev)
- Feedback system: FeedbackCard (post-session, mid-check), Day7Survey
- Feedback re-show bug fixed — DB as source of truth on mount
- Synthesis cron confirmed working

## Active Bugs / Known Issues
- FlirtCard stamp visual — reads as stamp but needs perforation polish (backlogged)
- Thursday card showed private session content on first run — fixed (couple_notes only now)
- Cron fires within 1-hour window on Vercel Hobby plan — occasional timing variance
- GoTrueClient singleton warning — low priority

## Verification Checkpoints
- Tuesday 3am PT — Bet push fires
- Wednesday 3am PT — Notice generates and push fires
- Wednesday 7pm PT — Notice reveal + synthesis
- Thursday 3am PT — Nora's Day generates
- Thursday 7pm PT — Nora's Day reveal
- Friday 3am PT — Ritual push
- Saturday 3am PT — Game Night push
- Sunday 3am PT — Weekly Reflection
- Sunday 6am PT — Nora synthesis

## Architecture Notes
- NORA_VOICE in lib/nora-knowledge.js = single source of truth for Nora character
- buildCoachSystem(clinicalKnowledge, operationalRules) in lib/nora.js
- getNoraBriefing (nora-knowledge.js) = assessment data, takes full profile objects
- getMemoryBriefing (nora-memory.js) = synthesized memory notes
- getNoraTierContext (nora-knowledge.js) = tier context from signal counts
- Privacy boundary: shared surfaces use couple_notes only, never individual notes
- All card components live in root /components/ not /app/components/
- Weekly cron gates: SPARK_DAYS=[1], BET_DAYS=[2], day===3 Notice, day===4 Nora, day===5 Ritual, day===6 GameNight, day===0 Reflection
- Reveal crons: Thursday 7pm = Friday 2am UTC (0 2 * * 5), Wednesday 7pm = Thursday 2am UTC (0 2 * * 4)

## Key Test User IDs
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0
- Couple ID: 8230e60f-44ca-4668-be28-06cb32b1b831

## Recent Completions (Sprint 1 — Onboarding Overhaul)
- Assessment framework replaced — 3 modules (attachment_profile, conflict_profile, love_expression), 10 scenario-based questions, ECR-S attachment scoring, Gottman conflict styles, love expression profile
- Assessment visual redesign — full ABF aesthetic, tap-to-rank replacing select dropdowns
- Assessment results page — "My first read on you", personal synthesis via /api/assessment/personal-summary, first-person Nora voice, important dates capture
- Onboarding flow fixed — assessment always routes to results page, results routes to dashboard, no more step gates blocking new users
- Solo user dashboard — isSolo detection (no couple row OR unconnected couple), connect card, photo upload card, no /connect redirect
- couple_id write-back — prepareStep4 now upserts couple_id to user_profiles after couple row creation
- Photo upload — dashboard card with grid upload, drag-and-drop, Timeline event creation per photo, persistence via timeline_events check + localStorage skip flag
- Important dates capture — results page section with 4 preset dates + custom dates, feeds timeline_events and Nora memory
- Seeded Nora chat — hero card CTA passes full observation as ?seed= param, injected as Nora's opening message in ai-coach
- Hero card new user experience — noraChat model, Esther Perel register, assessment context from user_profiles, isNewUser detection, "Tell Nora →" CTA
- "Tell Nora →" standardized across all surfaces replacing "Talk to Nora →"
- Nora image URL sanitization — strips photo URLs from synthesis prompts before they reach Nora
- Assessment seed-memory route — fires after assessment completion, writes attachment_style/conflict_style/love_language_primary to user_profiles, invalidates hero cache
- Bob test account — bob@gmail.com used for all new user flow testing

## Recent Completions (Session 2026-06-10 — Timeline Redesign + Onboarding Completion)

### Onboarding & Profile
- Your Story section added to Me tab — persistent important dates entry and photo upload for all users
- Important dates now feed timeline_events correctly with proper date timezone fix (T12:00:00)
- Photo upload working from Me tab — Supabase Storage, timeline event creation, grid display
- couple_id now written back to user_profiles in prepareStep4 — systemic fix
- Dashboard catch-up card — shows when no first_date/first_kiss/anniversary events exist
- Inline dates modal on dashboard for existing users
- Date display timezone fix — all Us tab and Timeline date formatting uses T12:00:00

### Timeline Redesign
- BEEN tab redesigned — 3 card types: dark milestone cards, photo hero cards, white event cards
- Photo cards show actual photos with caption overlay
- Detail view — full screen push navigation, photo/gradient header, Nora block, actions
- Empty milestone cards prompt users to add missing foundational dates
- Milestone entry sheet — location autocomplete via Maps SDK, Places photo fetch, save to timeline
- MEMORY_REFLECTION signal type added to nora-memory.js
- nora_observation column added to timeline_events table
- Archive overlay rows now tappable to detail view
- Detail view z-index fixed (150) to sit above archive (100)
- Smart photo button label — "Change photo" vs "+ Add photo"
- Title extraction fixed — place name only, not full address
- Photo deduplication — same title + couple_id skips insert
- Date display fixed across Us tab (T12:00:00 append)
- computeMissingMilestones — detects missing first_date/first_kiss/anniversary
- Curated BEEN events — milestones first, then photos, then others

### Assessment & Results
- Assessment results page incomplete states — love profile fallback with deep-link to specific module
- Couple insight graceful degradation — partner remind button
- Assessment deep-link — ?module= param jumps to specific module
- Personal summary prompt improved — no sentence limit, open door closing, 500 maxTokens

### Session 2026-06-10 (continued)
- Timeline edit/delete — edit sheet with title/description/date, ownership-based (created_by), delete with confirmation
- MEMORY_REFLECTION signal wired — Tell Nora about this fires updateNoraMemory and seeds ai-coach
- /api/timeline/event/update and /api/timeline/event/delete routes built
- /api/timeline/event/signal route built
- Foundation cycling card — replaces static milestone cards, cycles through milestones with photo support, Places API photo fetch
- Nora surfaced this — random memory card at top of BEEN, replaces static placeholder
- Full Timeline page — chronological dot-and-line, year groupings, thumbnails, milestone treatment
- Detail view photo — object-fit contain, dark background, full image visible, title moved below photo
- Date Night timeline — falls back to stop hero photo when no manual photo uploaded
- BET_DAYS fix — corrected to Tuesday (2), stops Wednesday 404 console flood
- Photo upload persistence — localStorage flags for done/skip
- Catch-up card detection fix — milestone only (not generic milestone type)
- Milestone entry sheet — location autocomplete, Places photo, save to timeline
- Add/Change photo on timeline entries — file upload wired to update route
- Duplicate timeline event prevention — same title + couple_id deduplication

## Next Session Priorities
1. Photo title and date picker during upload — when uploading photos, prompt for title and actual date taken
2. Focal point / photo positioning — backlogged, needed for native app sprint
3. Preferences wired to Nora — hobbies/date_preferences never read by any prompt
4. Wire assessment catch-up for Matt and Cass — both need attachment/conflict scores updated
5. Full Cass end-to-end test — BETA GATE
6. Timeline shared items display — movies/shows/songs need proper type labels and artwork
7. Photo titles cleanup — "A moment from our story" generic titles need user tagging

## Key Test Accounts
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870 (coggan11@gmail.com)
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0 (cassiwika@gmail.com)
- Couple: 8230e60f-44ca-4668-be28-06cb32b1b831
- Bob (test): bob@gmail.com — use for new user flow testing, safe to reset
