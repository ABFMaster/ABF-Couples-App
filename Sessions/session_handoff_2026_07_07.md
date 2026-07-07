# ABF Session Handoff — July 7, 2026

## What Was Built This Session

### Session-Based Conversations — COMPLETE
Full session lifecycle working correctly:

- close-session route at app/api/ai-coach/close-session/route.js — generates evocative title via noraSignal, fires memory synthesis
- ai-coach GET route updated — returns titled session history (up to 30), filters to solo type with non-null title
- ai-coach POST route updated — on new conversation creation, finds previous untitled session and fires close-session
- ai-coach/page.js updated — always-continue behavior (no stale check), History/New controls above input, history panel, warm opener rotation, loadingOpener state prevents welcome screen flash
- isNewSession hoisted to component scope
- Session controls placed above input (not in header) — correct iOS PWA pattern, always visible above keyboard
- Header simplified to back button + Nora name only
- 100dvh layout with interactiveWidget viewport meta

### Session Lifecycle — Industry Standard Pattern
- Sessions close server-side when first message of new session is sent (not on button tap)
- Title generation fires at that moment via close-session route
- Previous close-session-on-tap bug caused corruption — fixed
- Warm opener: 6 rotating personalized greetings using user name, no AI generation

### Other Fixes This Session
- Talk to Nora fixed across all navigation sites — nora_opener in sessionStorage before navigating
- Sunday Review status route now serves most recent reflection (not current week only)
- Push notification deep link updated to /weekly-reflection
- NoraCouplesChat component built — Sunday Review and Rabbit Hole debrief
- Moment reactions fixed — persists on reload via reflectionId, one-and-done, scoped to correct partner
- Generation prompt tags each moment with user1/user2 subject
- Thursday now fed with Wednesday notices, Game Room sessions, completed dates
- Friday Ritual Check in with Nora link wired
- Us page weekly reflection label shows "Week of [date]"
- Anthropic API credits exhausted mid-session — added $20, enabled auto-reload at $20 minimum

---

## Known Issues / Backlog

### Fix Soon
1. Game Room inline verdicts (Hunt, Hot Take, The Call, Challenge) — check if Talk to Nora link exists, add if missing. NoraCouplesChat may be overkill here — simple link may suffice given weekend game context.
2. NoraCouplesChat not yet wired into Hot Take, The Call, Challenge, Hunt debrief pages
3. Past Reflections — collapsed list design (currently all expanded inline, gets long at scale)
4. Sunday Review outcome tracking — wire valence classification from inline Nora responses back into memory synthesis

### Design Sprint Required
5. Friday Ritual in-page Nora — existing page already has Nora blocks woven through it, needs design review before adding more Nora layer

### Large Builds (Backlog)
6. Dedicated couples Nora chat — future build after session architecture is stable
7. Eval infrastructure — three baseline metrics: claim correction rate, Friday Ritual completion rate, conversation continuation rate
8. Extraction pipeline self-improvement — wait for 8 weeks outcome data first
9. Outcome-calibrated confidence — future research

---

## Architecture Decisions Made This Session

### Session Lifecycle (Industry Standard)
- Title generation fires server-side on first message of new session
- close-session never fires on button tap — only on new session creation
- Sessions are discrete rows in ai_conversations, messages in ai_messages

### iOS PWA Layout
- Session controls (History/New) live above input area, not in header
- Header is identity only (back + Nora name)
- 100dvh with interactiveWidget:resizes-content in viewport meta
- flexShrink:0 on header, session controls, and input area

### Nora Presence Model (confirmed)
- Individual surfaces: Talk to Nora link → dedicated individual Nora chat
- Couple surfaces: NoraCouplesChat inline → option to continue in dedicated couples chat
- Async surfaces (Spark, Bet): individual Talk to Nora link only

---

## Reference
- Matt: fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870
- Cass: 7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0
- Couple: 8230e60f-44ca-4668-be28-06cb32b1b831
- Repo: https://github.com/ABFMaster/ABF-Couples-App
- Production: https://abf-couples-app.vercel.app
