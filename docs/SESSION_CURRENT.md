# ABF App — Current Session State
# Last Updated: 2026-03-08

## HOW TO USE THIS FILE
Drag this file into a new Claude chat window to instantly resume work.
Start with: "I'm working on the ABF app. Read this file and let's keep building."

---

## PROJECT
- **App:** ABF (Always Be Flirting) — couples relationship app
- **Stack:** Next.js, Supabase, Vercel
- **Repo:** https://github.com/ABFMaster/ABF-Couples-App
- **Live:** https://abf-couples-app.vercel.app
- **Local:** ~/Desktop/abf-app

## WORKING PROCEDURE
1. Write prompt for Claude Code (in VS Code terminal)
2. Confirm clean build: `npm run build`
3. Deploy: `git add . && git commit -m "..." && git push origin main`
4. Test on Vercel live URL
5. Screenshot to confirm

---

## DESIGN SYSTEM — LOCKED
- Calm, emotionally warm, minimal (Timo-inspired)
- One primary action per screen (non-negotiable)
- Max 4 sections per screen
- Card-based, 8px grid, generous whitespace
- Typography: Fraunces (serif) for emotional content, DM Sans for UI
- Color: bg `#F7F4EF`, coral `#E8614D`, purple gradient `from-[#252048] via-[#3E3585] to-[#6B4A72]`
- Lucide icons throughout (no emoji in UI)
- Max 2 gradients across entire app
- NO bullet points, NO excessive bold, NO headers in UI text
- Buttons: primary coral, secondary white/border, tertiary plain text

---

## NAVIGATION
Home / Nora / Us / Today / Profile — Lucide icons (Home, Sparkles, Heart, Sun, User)
File: `components/BottomNav.js`

---

## USERS (TEST DATA)
- **Matt:** user_id = `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** user_id = `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## CURRENT STATE — ALL TABS

### Dashboard (`app/dashboard/page.js`)
- 4-section structure: Nora hero / upcoming date / suggested actions / today's read
- Primary CTA logic: pending date → partner planned / no partner → invite / no checkin → check in / else → Talk to Nora
- Couples debrief card: shows between Section 1 and Section 2 when BOTH partners have new-format assessments
- Dismissed state now stored in `user_profiles.couples_debrief_dismissed` (DB, not localStorage)
- Detection requires `couple_id` on `relationship_assessments` rows

### Today Tab (`app/today/page.js`)
- Section 1: Nora prompt card — daily rotating question, 3 reaction pills (This is us / Made me think / Tell Nora), optional text note, saves to `today_responses` table, shows partner's response when available
- Section 2: For Your Partner — pulls partner's `love_language_primary`, surfaces one coaching action. Falls back to neglected feature logic if love language unknown
- Section 3: Worth Reading — live RSS feed via `/api/learn/feed`, filtered by user's profile tags, Nora commentary above article card
- Section 4: Try This Together — feature spotlight framed as relationship exercise, rotates daily
- Invite share row: appears below Section 1 reaction when `reactionSaved` and `partnerName === 'your partner'`

### Us Tab (`app/us/page.js`)
- Top section: "Do Together" — 4 feature entry cards (Date Night, Trips, Timeline, Weekly Reflection) with live status lines
- Bottom section: "Your List" — shared items with filter tabs (All / Movies / Shows / Songs / Restaurants / Ideas)
- Both partners can mark items done (RLS fixed)

### Profile Tab (`app/profile/page.js`)
- 6 sections: You / Who You Are / Partner / Preferences / Notifications / Sign out
- Who You Are: Attachment style, Conflict style, Love language (all from assessments)
- Matt: Secure / need_space / Words of Affirmation ✅
- Cass: Secure / need_space / Physical Touch ✅

### Nora Tab (`app/ai-coach/page.js`)
- Full chat with context builder
- Fresh session via `?new=true`
- Pre-loaded opener via `sessionStorage.setItem('nora_opener', '...')`
- Persistent couples debrief opener via localStorage `nora_pending_couples_opener` — survives navigation, takes priority over conversation resume
- 72hr stale check before resuming vs starting fresh
- `sessionType: 'couples_debrief'` suppresses activity opener, keeps Nora focused on profile debrief

---

## ASSESSMENT SYSTEM

### Individual Profile Assessment
- File: `app/profile/assessment/page.js`
- Questions lib: `lib/individual-profile-questions.js`
- Saves to: `relationship_assessments` table (upsert on user_id)
- Module IDs (NEW FORMAT): `processing_style`, `emotional_patterns`, `connection_style`, `core_values`, `love_needs`
- Auto-saves love language to `user_profiles.love_language_primary` on completion
- On completion: pre-loads Nora debrief opener into sessionStorage
- KNOWN ISSUE: does not yet write `couple_id` or `attachment_style` on save

### Results Page (`app/profile/assessment/results/page.js`)
- Shows 5 dimension cards with StrengthPill (Strong/Good/Developing/Growing)
- Hero: purple gradient, "Profile complete" checkmark
- Buttons: "Talk to Nora about this →" (primary, routes to /ai-coach?new=true) / "Back to Profile" / "Retake assessment"
- OLD FORMAT results will NOT render cards — user needs to retake

### Attachment/Conflict Assessments
- Separate tables: `attachment_assessments`, `conflict_assessments`
- File: `app/learn/assessment/attachment/page.js`

---

## NORA SYSTEM

### Individual Debrief ✅
- Triggers on assessment completion
- Opener stored in sessionStorage before routing to results
- User taps "Talk to Nora about this →" → `/ai-coach?new=true` → picks up opener
- Opener references top module, love needs strength

### Couples Debrief ✅
- Dashboard card appears when BOTH partners have new-format assessments
- Dismissed state in `user_profiles.couples_debrief_dismissed`
- Card pre-loads couples opener into localStorage `nora_pending_couples_opener`
- Routes to `/ai-coach?new=true`
- `sessionType: 'couples_debrief'` keeps Nora focused

### Nora Knowledge Library (`lib/nora-knowledge.js`) ✅
- Section 1: Frameworks — Gottman, attachment, love languages, conflict styles (behavioral, never clinical)
- Section 2: Pairing matrix — attachment (4 pairings), conflict (3 pairings), love language (5 pairings)
- Section 3: `getNoraBriefing(userProfile, partnerProfile)` — assembles custom briefing, symmetric key lookup, graceful fallbacks
- Injected into every Nora conversation between contextString and activityNote
- Medium depth (~400–600 words) — preserves context window for conversation history growth

### Nora Context Builder (`lib/ai-coach-context.js`)
- Pulls: attachment style, conflict style, love language, check-in history, mood patterns, dates, flirts, trips, shared items
- Conflict pairing insights built in
- Rich context — Nora knows your relationship deeply

### Nora Triggers (`lib/nora-triggers.js`)
- Priority system: assessment completed → low mood → missed checkins → dream trip → default greeting

---

## INVITE SYSTEM ✅
- Table: `invite_previews` (token = row UUID, sender_id, couple_id, prompt, reaction, note, sender_name, expires_at 7 days)
- API: `/api/invite/create` — authenticated POST, returns `{ token }`
- Preview page: `/invite/[token]` — public, no auth required, purple gradient hero, warm framing, coral CTA to onboarding
- Share button: appears on Today tab Section 1 after reaction saved, only when no partner linked yet
- Once both partners in app: replaced by push notifications + badge system (not yet built)

---

## COMPONENT LIBRARY
File: `components/ui/abf.js`
Components: Card, PrimaryButton, IconContainer, SectionHeader, ReflectionCard, ActionCard, ReadingCard, AppHeader

---

## KEY FILES
- `app/dashboard/page.js` — dashboard
- `app/today/page.js` — Today tab
- `app/us/page.js` — Us tab
- `app/profile/page.js` — Profile hub
- `app/profile/assessment/page.js` — assessment
- `app/profile/assessment/results/page.js` — results
- `app/onboarding/welcome/page.js` — welcome screens
- `app/ai-coach/page.js` — Nora chat
- `app/api/ai-coach/route.js` — Nora API
- `app/api/invite/create/route.js` — invite token creation
- `app/invite/[token]/page.js` — public invite preview
- `components/BottomNav.js` — nav
- `components/ui/abf.js` — component library
- `components/OnboardingGuard.js` — redirects new users
- `lib/nora-triggers.js` — Nora contextual message system
- `lib/ai-coach-context.js` — Nora context builder
- `lib/nora-knowledge.js` — Nora frameworks + pairing matrix
- `lib/individual-profile-questions.js` — profile assessment questions + insights

---

## DATABASE — KEY TABLES
- `user_profiles` — name, birthday, anniversary, timezone, love_language_primary, attachment_style, conflict_style, notification_preferences, couples_debrief_dismissed
- `relationship_assessments` — user_id, couple_id, answers, results (jsonb), completed_at
- `couples` — user1_id, user2_id, connect_code
- `daily_checkins` — mood, connection_score, question_response
- `date_plans` — title, date_time, status (planned/approved/completed)
- `shared_items` — couple_id, type, title, poster_path
- `ai_conversations` — user_id, type, updated_at
- `ai_messages` — conversation_id, role, content
- `invite_previews` — id (token), sender_id, couple_id, prompt, reaction, note, sender_name, created_at

---

## PENDING / NEXT UP
1. **Retention mechanics** — push notifications, red badge on unread partner content, streak surfacing
2. **Habit anchor** — morning/evening notification arc
3. **Better assessment questions** — more nuanced conflict style and attachment style capture
4. **Nora knowledge library** — expand pairing matrix with more combinations
5. **Nora pattern recognition** — inject conversation history summary for cross-session memory
6. **Trial retention arc** — feature depth unlocks with engagement
7. **Invite flow** — test with genuinely unlinked user

## CLEANUP BACKLOG
- Us tab: Trips icon showing phone instead of plane/map
- Today tab Section 2: "No date planned yet" copy should be more inviting
- Today tab Section 1: question/reaction mismatch — some questions don't suit "This is us" — fix when question library built
- Today tab Section 3: Nora commentary card needs pulse dot + "Nora" label
- Conflict style schema mismatch: DB allows `talk_immediately/need_space/write_it_out/avoid` but profile data uses `validator/avoider` — needs remapping
- Assessment completion should auto-write `couple_id` to `relationship_assessments`
- Assessment completion should auto-write `attachment_style` to `user_profiles`
- Nora avatar: replace with something warmer
- PWA icon-192.png missing (harmless 404)

---

## PRODUCT DECISIONS (LOCKED)
- Love language, attachment style, conflict style = DISCOVERED via assessment, never self-selected
- Settings page retired — all in Profile
- Nora is not a chatbot — she's a relationship that deepens over time
- Features visible day 1, depth unlocks with engagement
- Today tab = what YOU should do today (personalized per user)
- Us tab = where you DO things together (feature hub)
- Dashboard = daily primitives (checkin + flirts front and center)
- Invite flow = partner-generated content as acquisition hook, not generic app link
- Couples debrief dismissed state = DB not localStorage (device-agnostic)
- Nora knowledge library = medium depth briefing (~500 words) + growing conversation history
- Solo value arc: days 1–3 solo value → days 4–7 partner pull → week 2+ coupled experience
