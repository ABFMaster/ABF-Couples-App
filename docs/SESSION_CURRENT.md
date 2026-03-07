# ABF App — Current Session State
# Last Updated: 2026-03-07

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
- Dismissed via localStorage `abf_couples_debrief_dismissed`

### Today Tab (`app/today/page.js`)
- 4 sections: Nora Surprise / Neglected Action / Relationship Insight / Feature Spotlight
- Nora surprises rotate daily via getDayIndex()

### Us Tab (`app/us/page.js`)
- Full shared items list with Supabase fetch
- Filter tabs: All / Movies / Shows / Songs / Restaurants / Ideas
- Both partners can mark items done (RLS fixed)

### Profile Tab (`app/profile/page.js`)
- 6 sections: You / Who You Are / Partner / Preferences / Notifications / Sign out
- Who You Are: Attachment style, Conflict style, Love language (all from assessments)
- Matt: Secure / Validator / Words of Affirmation ✅
- Cass: needs to retake assessment (old format)

### Nora Tab (`app/ai-coach/page.js`)
- Full chat with context builder
- Fresh session via `?new=true`
- Pre-loaded opener via `sessionStorage.setItem('nora_opener', '...')`
- 24hr stale check before resuming vs starting fresh

---

## ASSESSMENT SYSTEM

### Individual Profile Assessment
- File: `app/profile/assessment/page.js`
- Questions lib: `lib/individual-profile-questions.js`
- Saves to: `relationship_assessments` table (upsert on user_id)
- Module IDs (NEW FORMAT): `processing_style`, `emotional_patterns`, `connection_style`, `core_values`, `love_needs`
- Auto-saves love language to `user_profiles.love_language_primary` on completion
- On completion: pre-loads Nora debrief opener into sessionStorage

### Results Page (`app/profile/assessment/results/page.js`)
- Shows 5 dimension cards with StrengthPill (Strong/Good/Developing/Growing)
- Hero: purple gradient, "Profile complete" checkmark
- Buttons: "Talk to Nora about this →" (primary, routes to /ai-coach?new=true) / "Back to Profile" / "Retake assessment"
- OLD FORMAT results (Cass's Feb 16 record) will NOT render cards — she needs to retake

### Attachment/Conflict Assessments
- Separate tables: `attachment_assessments`, `conflict_assessments`
- File: `app/learn/assessment/attachment/page.js`

---

## NORA SYSTEM

### Individual Debrief (BUILT ✅)
- Triggers on assessment completion
- Opener stored in sessionStorage before routing to results
- User taps "Talk to Nora about this →" → `/ai-coach?new=true` → picks up opener
- Opener references top module, love needs strength

### Couples Debrief (BUILT, UNTESTED ⏳)
- Dashboard card appears when BOTH partners have new-format assessments
- Card pre-loads couples opener into sessionStorage
- Routes to `/ai-coach?new=true`
- BLOCKED: Cass still has old-format assessment (Feb 16). She needs to retake.
- Detection: checks `results.modules[0].moduleId === 'processing_style'` for both users

### Nora Context Builder (`lib/ai-coach-context.js`)
- Pulls: attachment style, conflict style, love language, check-in history, mood patterns, dates, flirts, trips, shared items
- Conflict pairing insights built in (validator/volatile, avoider/avoider, etc.)
- Rich context — Nora knows your relationship deeply

### Nora Triggers (`lib/nora-triggers.js`)
- Priority system: assessment completed → low mood → missed checkins → dream trip → default greeting

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
- `components/BottomNav.js` — nav
- `components/ui/abf.js` — component library
- `components/OnboardingGuard.js` — redirects new users
- `lib/nora-triggers.js` — Nora contextual message system
- `lib/ai-coach-context.js` — Nora context builder
- `lib/individual-profile-questions.js` — profile assessment questions + insights

---

## DATABASE — KEY TABLES
- `user_profiles` — name, birthday, anniversary, timezone, love_language_primary, attachment_style, conflict_style, notification_preferences
- `relationship_assessments` — user_id, answers, results (jsonb), completed_at
- `couples` — user1_id, user2_id, connect_code
- `daily_checkins` — mood, connection_score, question_response
- `date_plans` — title, date_time, status (planned/approved/completed)
- `shared_items` — couple_id, type, title, poster_path
- `ai_conversations` — user_id, type, updated_at
- `ai_messages` — conversation_id, role, content

---

## PENDING / NEXT UP
1. **Cass retakes assessment** → test couples debrief end to end
2. **Today tab** — wire Nora data signals to personalized feed logic
3. **Us tab** — add Date Night, Trips, Timeline entry points (feature hub)
4. **Nora knowledge library** — Gottman research, attachment theory, love language interaction patterns
5. **Trial retention arc** — feature depth unlocks with engagement ("first date with Nora" framing)
6. **Feature progression** — map full arc of what Nora unlocks as she learns more about the couple

## BACKLOG (DEFERRED)
- Nora commentary on content (movie/song reactions) — v2
- Nora persistent widget — let need reveal organically
- Loop 3 micro-interactions — not yet built
- Layout flash on first load — monitoring

---

## PRODUCT DECISIONS (LOCKED)
- Love language, attachment style, conflict style = DISCOVERED via assessment, never self-selected
- Settings page retired — all in Profile
- Nora is not a chatbot — she's a relationship that deepens over time
- Features visible day 1, depth unlocks with engagement
- Today tab = what YOU should do today (personalized per user)
- Us tab = where you DO things together (feature hub)
- Dashboard = daily primitives (checkin + flirts front and center)