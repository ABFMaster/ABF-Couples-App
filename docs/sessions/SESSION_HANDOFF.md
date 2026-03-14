# ABF — Developer Handoff Briefing
# Last Updated: 2026-03-14

---

## 1. THE APP

ABF (Always Be Flirting) is a couples relationship app. Partners connect via a 6-character code. Once linked, the app surfaces daily rituals, Nora (the AI coach), and shared features that deepen connection over time. The product philosophy is warmth over gamification — Nora gets smarter with every session, and the couple's history becomes the moat.

- **Repo:** https://github.com/ABFMaster/ABF-Couples-App
- **Live:** https://abf-couples-app.vercel.app
- **Local:** ~/Desktop/abf-app

---

## 2. STACK

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Auth — token-based for API routes, NOT cookie-based
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`, model: `claude-sonnet-4-6`)
- **Styling:** Tailwind CSS
- **Deploy:** Vercel

---

## 3. WORKING RULES

- Claude Code prompts, terminal commands, and SQL always in separate code blocks — never combined
- Every Claude Code prompt ends with "do not change anything else"
- Read a file before editing it
- One change at a time, test before moving to next
- `git add -A` for new files, `git add -u` for existing files
- `git push` to deploy — never `npx vercel --prod`
- Commit after every working change with a descriptive message
- Remove all debug logs before closing a feature
- Delete dead code immediately — no accumulation
- `await` all async calls on Vercel

---

## 4. DESIGN SYSTEM

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
- Bottom sheet for moments, not full pages

---

## 5. PRODUCT GUARDRAILS

- **Lean ship philosophy:** dead code, dead schema, and unsupported APIs get deleted immediately
- Love language, attachment style, conflict style = discovered via assessment, never self-selected
- **Nora's voice:** speaks directly using "you/her", never third person, never restates the question, no affirmation formula before substance
- Features visible day 1, depth unlocks with engagement
- **Timeline:** curated gallery not storage unit — only intentional saves appear, users can delete entries but no archiving or folders
- **Flirt retention:** GIF/Prompt delete after 3 days, Song/Movie delete after 3 days unless saved to Us
- **Flirt count:** permanent counter on `couples.flirts_sent` — never decremented by deletions
- **Save to Us maps:** song → Us Music, movie_show → Us Watchlist, photo → Us Photos
- **Receive flow:** push → Today or Dashboard → auto-open FlirtSheet in receive mode
- Bottom sheet is the established pattern for all moment interactions

---

## 6. TEST USERS

- **Matt:** `fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`
- **Cass:** `7d1ef6c1-5fac-4ae0-9c04-e73158a1eff0`
- **Couple ID:** `8230e60f-44ca-4668-be28-06cb32b1b831`

---

## 7. NAVIGATION

Five tabs: Home → `/dashboard`, Nora → `/ai-coach`, Us → `/us`, Today → `/today`, Profile → `/profile`

File: `components/BottomNav.js`

---

## 8. FEATURES BUILT

### Auth & Onboarding
Email/password signup via Supabase Auth. `OnboardingGuard` redirects incomplete users to `/onboarding/welcome`. 28-question compatibility assessment on first run. Partner connection via 6-character code.

### Dashboard (`app/dashboard/page.js`)
4-section structure: Nora hero / upcoming date / suggested actions / today's read. FlirtSheet inline (sheet slides up from bottom). Couples debrief card appears when BOTH partners have new-format assessments; dismissed state stored in `user_profiles.couples_debrief_dismissed`.

### Today Tab (`app/today/page.js`)
Nora prompt card with daily rotating question and 3 reaction pills. For Your Partner section pulls partner's love language and surfaces one coaching action. Worth Reading live RSS feed via `/api/learn/feed`. FlirtSheet inline — tapping "Send [partner] something" opens sheet.

### Us Tab (`app/us/page.js`)
Do Together entry cards: Date Night, Trips, Timeline, Weekly Reflection. Shared items list with filter tabs (All / Movies / Shows / Songs / Restaurants / Ideas). Both partners can mark items done.

### Profile (`app/profile/page.js`)
6 sections: You / Who You Are / Partner / Preferences / Notifications / Sign out. All profile data discovered via assessment, never self-selected.

### Nora (`app/ai-coach/page.js`)
Full chat with rich context builder. Cross-session memory via `nora_memory` table — `maybeUpdateNoraMemory` fires post-conversation. Knowledge library in `lib/nora-knowledge.js` (Gottman, attachment, love languages, conflict styles, pairing matrix). Context builder in `lib/ai-coach-context.js`. Fresh session via `?new=true`. Pre-loaded opener via `sessionStorage`. Persistent couples debrief opener via `localStorage`.

### Flirts
- `components/FlirtSheet.js` — bottom sheet used on Dashboard and Today tab
- 4 modes: GIF (Giphy), Song (Spotify), Movie/Show (OMDB), Prompt
- `components/NoraConversation.js` — reusable Nora chat component
- `/flirts/onboarding` — flirt profile onboarding (humor style, flirt style, media touchstones, inside joke)
- `app/api/flirts/generate/route.js` — Claude generates suggestion, enriched via Giphy/Spotify/OMDB
- `app/api/flirts/mark-sent/route.js` — sets `sent_at` on flirt row
- "Send it" fires push notification to partner via `/api/push/send`
- "Get another" passes `previousSuggestion` to avoid repetition

### Our Timeline (`app/timeline/page.js`)
Horizontal scrollable, oldest to newest. Stats header: together X years, X months, X days. 8 event types with icons/colors. Photo uploads to `timeline-photos` Supabase bucket.

### Date Night (`app/date-night/page.js`)
Our Dates: stats, upcoming, past. Get Inspired: category filters, budget slider, 58 curated ideas. Partner suggestion accept/decline flow.

### Trip Planning (`app/trips/page.js`, `app/trips/[id]/page.js`)
Trip list with status badges. Trip detail with tabs: Overview / Itinerary / Packing / Photos.

### Invite System
`invite_previews` table (token = row UUID, 7-day expiry). API: `/api/invite/create`. Public preview page: `/invite/[token]`.

---

## 9. KEY FILES

| File | Purpose |
|------|---------|
| `app/dashboard/page.js` | Dashboard |
| `app/today/page.js` | Today tab |
| `app/us/page.js` | Us tab |
| `app/profile/page.js` | Profile hub |
| `app/ai-coach/page.js` | Nora chat |
| `app/api/ai-coach/route.js` | Nora API |
| `app/api/flirts/generate/route.js` | Flirt generation via Claude |
| `app/api/flirts/mark-sent/route.js` | Mark flirt sent |
| `app/api/push/send/route.js` | Push notification sender |
| `app/flirts/onboarding/page.js` | Flirt profile onboarding |
| `app/invite/[token]/page.js` | Public invite preview |
| `components/FlirtSheet.js` | Flirt bottom sheet |
| `components/NoraConversation.js` | Reusable Nora chat component |
| `components/BottomNav.js` | Nav bar |
| `components/OnboardingGuard.js` | New user redirect |
| `lib/nora-knowledge.js` | Nora frameworks and pairing matrix |
| `lib/ai-coach-context.js` | Nora context builder |
| `lib/spotify.js` | Spotify search utilities |
| `lib/giphy.js` | Giphy search utilities |
| `lib/omdb.js` | OMDB movie search utilities |
| `docs/sessions/SESSION_HANDOFF.md` | This file |
| `docs/BACKLOG.md` | Feature backlog |
| `docs/BUGS.md` | Known issues |

---

## 10. DATABASE

| Table | Key Columns |
|-------|-------------|
| `user_profiles` | name, birthday, anniversary, timezone, love_language_primary, attachment_style, conflict_style, humor_style, flirt_style, media_touchstones, inside_joke, flirt_profile_completed, notification_preferences, couples_debrief_dismissed |
| `couples` | user1_id, user2_id, connect_code, flirts_sent |
| `flirts` | sender_id, receiver_id, couple_id, mode, suggestion, nora_note, gif_url, gif_id, spotify_track_id, spotify_track_name, spotify_artist, spotify_album_art, spotify_track_url, media_title, media_year, media_poster, sent_at |
| `push_subscriptions` | user_id, subscription (jsonb) |
| `nora_memory` | couple_id, memory_summary |
| `relationship_assessments` | user_id, couple_id, answers, results (jsonb), completed_at |
| `daily_checkins` | user_id, couple_id, mood, connection_score, question_response |
| `date_plans` | couple_id, title, date_time, status |
| `shared_items` | couple_id, type, title, poster_path |
| `ai_conversations` | user_id, type, updated_at |
| `ai_messages` | conversation_id, role, content |
| `invite_previews` | id (token), sender_id, couple_id, prompt, reaction, note, sender_name |
| `timeline_events` | couple_id, event_type, title, event_date, photo_urls |
| `trips` | couple_id, destination, start_date, end_date, status |

---

## 11. TECHNICAL PATTERNS

### Auth (Token-Based — required for Next.js 15 API routes)
```javascript
// Client: include token in request headers
const { data: { session } } = await supabase.auth.getSession()
fetch('/api/...', { headers: { 'Authorization': `Bearer ${session?.access_token}` } })

// Server: create Supabase client with token
const supabase = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } }
})
// Service role key for server-side writes that bypass RLS
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
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

### Environment variables
Must exist in both `.env.local` AND Vercel environment settings. Missing server-side vars are a recurring failure mode — verify both locations when debugging 500 errors.

### Column name gotcha
`flirts` table uses `sender_id` not `user_id` — always check column names before writing queries against this table.

---

## 12. KNOWN ISSUES

Full list in `docs/BUGS.md`. Summary:

- `pathname.startsWith` crash in `BottomNav` is intermittent — null guard added but not fully confirmed resolved
- Cass has not completed flirt onboarding — `flirt_profile_completed` is false, so generate route falls back to null profile fields
- Push notification URL goes to `/flirts/inbox` which does not exist yet — will 404 on tap
- Google Places API returning 503 for date suggestions (`/api/dates/suggestions`)
- Google Maps race condition in `/dates/custom` — AutocompleteService not initializing reliably

---

## 13. NEXT SPRINT

In priority order:

1. Persistent flirt counter — increment `couples.flirts_sent` on send
2. Receive UI for Cass — FlirtSheet receive mode, auto-open on Today/Dashboard when unseen flirt exists
3. Save to Us button on Song and Movie/Show receive view
4. Timeline entry created on save
5. 3-day retention cleanup job
6. Cass flirt onboarding
7. Daily Spark feature
8. Nora voice refinement pass (parking lot)

---

## 14. DEPLOY WORKFLOW

```bash
git add -A          # new files
git add -u          # existing files only
git commit -m "descriptive message"
git push            # Vercel auto-deploys on push to main
```

Never use `npx vercel --prod`.
