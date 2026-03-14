# ABF — Developer Handoff Briefing
# Last Updated: 2026-03-14

Pick up cold with this file. Everything you need to understand the app, what's been built, and what's next.

---

## THE APP

**ABF (Always Be Flirting)** — a couples relationship app. Partners connect via a 6-character code. Once linked, the app surfaces daily rituals, Nora (the AI coach), and shared features that deepen connection over time.

- **Repo:** https://github.com/ABFMaster/ABF-Couples-App
- **Live:** https://abf-couples-app.vercel.app
- **Local:** ~/Desktop/abf-app

---

## STACK

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Auth — token-based for API routes (NOT cookie-based)
- **Storage:** Supabase Storage (private buckets)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Styling:** Tailwind CSS
- **Deploy:** Vercel

---

## DESIGN SYSTEM (LOCKED)

- Calm, emotionally warm, minimal (Timo-inspired)
- One primary action per screen — non-negotiable
- Max 4 sections per screen
- Card-based, 8px grid, generous whitespace
- Typography: Fraunces (serif) for emotional content, DM Sans for UI
- Colors: bg `#F7F4EF`, coral `#E8614D`, purple gradient `from-[#252048] via-[#3E3585] to-[#6B4A72]`
- Lucide icons throughout — no emoji in UI
- Max 2 gradients across entire app
- No bullet points, no excessive bold, no headers in UI text
- Buttons: primary coral / secondary white+border / tertiary plain text

---

## TEST USERS

- **Matt:** `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## NAVIGATION

Five tabs: Home / Nora / Us / Today / Profile
Lucide icons: Home, Sparkles, Heart, Sun, User
File: `components/BottomNav.js`

---

## FEATURES BUILT

### Authentication & Onboarding
- Email/password signup/login via Supabase Auth
- `OnboardingGuard` component redirects incomplete users to `/onboarding/welcome`
- 18-question compatibility assessment on first run
- Individual profile quiz: love languages, communication styles, values
- Partner connection via 6-character code

### Dashboard (`app/dashboard/page.js`)
- 4-section structure: Nora hero / upcoming date / suggested actions / today's read
- Primary CTA logic: pending date → partner planned / no partner → invite / no checkin → check in / else → Talk to Nora
- Couples debrief card: appears when BOTH partners have new-format assessments; dismissed state stored in `user_profiles.couples_debrief_dismissed` (DB, not localStorage)
- FlirtSheet component inline (sheet slides up from bottom)

### Today Tab (`app/today/page.js`)
- Section 1: Nora prompt card — daily rotating question, 3 reaction pills, optional note, saves to `today_responses`, shows partner's response when available
- Section 2: For Your Partner — pulls partner's `love_language_primary`, surfaces one coaching action
- Section 3: Worth Reading — live RSS feed via `/api/learn/feed`, filtered by profile tags, Nora commentary
- Section 4: Try This Together — rotating feature spotlight
- FlirtSheet component inline (tapping "Send [partner] something" opens sheet)
- Invite share row: appears after reaction saved when no partner linked

### Us Tab (`app/us/page.js`)
- "Do Together": Date Night, Trips, Timeline, Weekly Reflection entry cards
- "Your List": shared items with filter tabs (All / Movies / Shows / Songs / Restaurants / Ideas)
- Both partners can mark items done

### Profile Tab (`app/profile/page.js`)
- 6 sections: You / Who You Are / Partner / Preferences / Notifications / Sign out
- Attachment style, conflict style, love language — all discovered via assessment, never self-selected

### Nora (AI Coach) (`app/ai-coach/page.js`)
- Full chat with rich context builder
- Fresh session via `?new=true`
- Pre-loaded opener via `sessionStorage.setItem('nora_opener', '...')`
- Persistent couples debrief opener via `localStorage.nora_pending_couples_opener`
- 72hr stale check before resuming vs fresh start
- `sessionType: 'couples_debrief'` suppresses activity opener
- Knowledge library (`lib/nora-knowledge.js`): Gottman, attachment, love languages, conflict styles, pairing matrix
- Context builder (`lib/ai-coach-context.js`): pulls attachment, conflict, love language, checkin history, mood, dates, flirts, trips, shared items

### Flirts (`components/FlirtSheet.js`)
- Bottom sheet component used on Dashboard and Today tab
- Modes: GIF, Song (Spotify), Movie/Show (OMDB), Prompt, Memory
- Nora generates suggestion via `/api/flirts/generate` using Claude
- "Get another" passes `previousSuggestion` to avoid repetition
- "Send it" fires push notification to partner + marks flirt sent
- `formatModeLabel()` handles all mode display labels

### Our Timeline (`app/timeline/page.js`)
- Horizontal scrollable timeline, oldest to newest
- Stats header: together for X years, X months, X days
- 8 event types with icons/colors
- Photo uploads to `timeline-photos` Supabase bucket
- Modals: `AddEventModal.js`, `EventDetailModal.js`

### Date Night (`app/date-night/page.js`)
- "Our Dates": stats, upcoming, past
- "Get Inspired": category filters, budget slider, 58 curated ideas
- Partner suggestion flow: accept/decline
- Modals: `CreateDateModal.js`, `DateSuggestionCard.js`

### Trip Planning (`app/trips/page.js`, `app/trips/[id]/page.js`)
- Trip list with status badges
- Trip detail with tabs: Overview / Itinerary / Packing / Photos
- Modals: `CreateTripModal.js`, `AddItineraryItemModal.js`, `AddPackingItemModal.js`
- Components: `TripCard.js`, `ItineraryDay.js`, `PackingItem.js`, `TripPhotoGrid.js`

### Invite System
- Table: `invite_previews` (token = row UUID, 7-day expiry)
- API: `/api/invite/create`
- Public preview page: `/invite/[token]`
- Share button on Today tab after reaction saved, only when no partner linked

---

## KEY FILES

| File | Purpose |
|------|---------|
| `app/dashboard/page.js` | Dashboard |
| `app/today/page.js` | Today tab |
| `app/us/page.js` | Us tab |
| `app/profile/page.js` | Profile hub |
| `app/profile/assessment/page.js` | Individual assessment |
| `app/profile/assessment/results/page.js` | Assessment results |
| `app/ai-coach/page.js` | Nora chat |
| `app/api/ai-coach/route.js` | Nora API |
| `app/api/flirts/generate/route.js` | Flirt generation via Claude |
| `app/api/invite/create/route.js` | Invite token creation |
| `app/invite/[token]/page.js` | Public invite preview |
| `components/FlirtSheet.js` | Flirt bottom sheet |
| `components/BottomNav.js` | Nav bar |
| `components/OnboardingGuard.js` | New user redirect |
| `components/ui/abf.js` | Component library |
| `lib/nora-triggers.js` | Nora contextual message system |
| `lib/ai-coach-context.js` | Nora context builder |
| `lib/nora-knowledge.js` | Nora frameworks + pairing matrix |
| `lib/individual-profile-questions.js` | Assessment questions + insights |

---

## DATABASE — KEY TABLES

| Table | Purpose |
|-------|---------|
| `user_profiles` | name, birthday, anniversary, timezone, love_language_primary, attachment_style, conflict_style, notification_preferences, couples_debrief_dismissed |
| `relationship_assessments` | user_id, couple_id, answers, results (jsonb), completed_at |
| `couples` | user1_id, user2_id, connect_code |
| `daily_checkins` | mood, connection_score, question_response |
| `date_plans` | title, date_time, status (suggested/accepted/planned/completed/cancelled) |
| `shared_items` | couple_id, type, title, poster_path |
| `ai_conversations` | user_id, type, updated_at |
| `ai_messages` | conversation_id, role, content |
| `invite_previews` | id (token), sender_id, couple_id, prompt, reaction, note, sender_name |
| `flirts` | sender_id, couple_id, mode, suggestion, nora_note, media fields |
| `timeline_events` | couple_id, event_type, title, event_date, photo_urls |
| `trips` | couple_id, destination, start_date, end_date, status |
| `nora_memory` | couple_id, memory_summary |

---

## TECHNICAL PATTERNS

### Auth (Token-Based — required for Next.js 15 API routes)
```javascript
// Client: include token in request headers
const { data: { session } } = await supabase.auth.getSession()
fetch('/api/...', { headers: { 'Authorization': `Bearer ${session?.access_token}` } })

// Server: create Supabase client with token
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
```

### RLS (EXISTS pattern)
```sql
USING (EXISTS (
  SELECT 1 FROM couples
  WHERE couples.id = table.couple_id
  AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
))
```

### Supabase queries
- Always use `.maybeSingle()` not `.single()` — `.single()` throws on zero rows

---

## KNOWN ISSUES

See `docs/BUGS.md` for the full list. Summary:

- **P0:** Google Places API not loading for date suggestions (`/api/dates/suggestions` returns 503)
- **High:** Fragmented onboarding — no guaranteed path for both partners to complete all assessments
- **Medium:** Google Maps not rendering in `/dates/custom` (race condition on script load)
- **Medium:** Dashboard needs redesign as relationship health overview
- **Medium:** `weekly-reflection` queries `daily_checkins` with potentially stale column names
- **Medium:** Giphy API key is beta/dev — needs upgrade to production key
- **Low:** `FlirtComposer` reads from `onboarding_responses.answers.q8` — table may be deprecated
- **Low:** `individual_profiles` table is redundant — migration sprint needed before dropping
- **Cleanup:** Conflict style schema mismatch (`talk_immediately/need_space` vs `validator/avoider`)
- **Cleanup:** Assessment completion doesn't write `couple_id` or `attachment_style` on save
- **Cleanup:** Us tab Trips icon showing phone instead of plane/map
- **Cleanup:** PWA icon-192.png missing (harmless 404)

---

## NEXT SPRINT PRIORITIES

1. **Retention mechanics** — push notifications, red badge on unread partner content, streak surfacing
2. **Habit anchor** — morning/evening notification arc
3. **Onboarding hardening** — linear forced flow: signup → assessment → profile quiz → partner invite → dashboard, no skipping
4. **Trip Planning** — feature is scaffolded in the codebase; needs DB migration and full build-out
5. **Nora pattern recognition** — inject conversation history summary for cross-session memory
6. **Assessment fixes** — auto-write `couple_id` and `attachment_style` on completion
7. **Affiliate programs** — apply to Spotify (sovrn.com) and Apple Music (performance-partners.apple.com)

---

## PRODUCT DECISIONS (LOCKED)

- Love language, attachment style, conflict style = DISCOVERED via assessment, never self-selected
- Settings page retired — all in Profile
- Nora is not a chatbot — she's a relationship that deepens over time
- Features visible day 1, depth unlocks with engagement
- Today tab = what YOU should do today (personalized per user)
- Us tab = where you DO things together (feature hub)
- Dashboard = daily primitives (checkin + flirts front and center)
- Couples debrief dismissed state = DB not localStorage (device-agnostic)
- Solo value arc: days 1–3 solo → days 4–7 partner pull → week 2+ coupled experience

---

## DEPLOY WORKFLOW

1. Write and test changes locally
2. Confirm clean build: `npm run build`
3. `git add . && git commit -m "..." && git push origin main`
4. Vercel auto-deploys on push to main
5. Test on live URL
