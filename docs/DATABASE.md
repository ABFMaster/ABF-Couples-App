# ABF Database Reference

Last audited: February 2026

---

## Active Tables

### ai_conversations
**Purpose:** Stores AI coach conversation sessions
**Key fields:** `id`, `user_id`, `couple_id`, `title`, `created_at`, `updated_at`
**Used by:** `app/ai-coach/page.js`, `app/api/ai-coach/route.js`
**Status:** Active

---

### ai_messages
**Purpose:** Individual messages within AI coach conversations
**Key fields:** `id`, `conversation_id`, `role` (user/assistant), `content`, `created_at`
**Used by:** `app/api/ai-coach/route.js`
**Status:** Active

---

### ai_usage
**Purpose:** Weekly message bank tracking for freemium model
**Key fields:** `user_id`, `week_start` (YYYY-MM-DD, most recent Monday), `message_count`
**Used by:** `app/api/ai-coach/route.js`
**Notes:** Upserted via RPC `increment_ai_usage`. Free tier = 20 messages/week.
**Status:** Active

---

### checkin_questions
**Purpose:** Question bank for daily check-ins, organized by category
**Key fields:** `id`, `question_text`, `category`
**Used by:** `app/checkin` pages, `lib/checkin-questions.js`
**Status:** Active

---

### couples
**Purpose:** Links two users together as a couple
**Key fields:** `id`, `user1_id`, `user2_id`
**Used by:** Everywhere `couple_id` is needed — core relational anchor
**Status:** Active — core table

---

### custom_dates
**Purpose:** User-built date nights with stop-by-stop itinerary
**Key fields:** `id`, `user_id`, `couple_id`, `title`, `date_time`, `stops` (jsonb), `rating`, `review`
**Used by:** `app/dates/custom/page.js`, `lib/ai-coach-context.js`
**Status:** Active

---

### daily_checkins
**Purpose:** Daily mood and connection check-in responses
**Key fields:** `id`, `user_id`, `couple_id`, `check_date`, `mood`, `connection_score`, `question_text`, `question_response`
**Used by:** `app/checkin` pages, `lib/ai-coach-context.js`
**Status:** Active

---

### date_plans
**Purpose:** Planned date nights (suggested or manual)
**Key fields:** `id`, `couple_id`, `title`, `date_time`, `location`, `status` (planned/accepted/completed/cancelled)
**Used by:** `app/dates` pages, `lib/ai-coach-context.js`
**Status:** Active

---

### date_suggestions
**Purpose:** Curated date ideas pulled from Google Places API
**Key fields:** `id`, `title`, `category`, `place_id`, location data
**Used by:** `app/dates` pages — currently blocked
**Notes:** Dormant pending Google Maps race condition fix (see ISSUES.md). Feature is built; Maps API integration needs `named callback` pattern.
**Status:** Dormant — will be activated when Maps issue resolved

---

### flirts
**Purpose:** Flirt messages sent between partners
**Key fields:** `id`, `sender_id`, `receiver_id`, `couple_id`, `type`, `message`, `created_at`, `is_read`
**Used by:** `app/flirts` pages, `lib/ai-coach-context.js`
**Status:** Active

---

### individual_profiles
**Purpose:** DUPLICATE of `relationship_assessments` — created during early development, now redundant
**Key fields:** Mirrors `relationship_assessments` — `user_id`, `answers`, `results`, `completed_at`
**Used by:** ⚠️ **STILL REFERENCED IN 5 FILES — DO NOT DROP YET**
- `app/dashboard/page.js` (line 700) — reads personality data
- `app/profile/page.js` (lines 39, 138, 143, 196, 212) — reads and writes
- `app/profile/results/page.js` (line 91) — reads results
- `app/checkin/page.js` (line 167) — reads profile data
- `app/onboarding/page.js` (line 40) — writes during onboarding

**Migration plan:** All reads should be migrated to `relationship_assessments`. Writes during onboarding should target `relationship_assessments`. Schedule migration sprint before dropping table.
**Status:** REDUNDANT — pending migration. Table retained until all references are updated.

---

### onboarding_responses
**Purpose:** Stores quiz answer codes from onboarding flow
**Key fields:** `user_id`, `couple_id`, `answers` (jsonb with `q1`–`q18` answer codes)
**Used by:** Onboarding flow
**Notes:** Stores raw answer codes, not readable data. No names, no love languages. Limited utility for AI coaching — not a reliable data source.
**Status:** Active but limited — review during onboarding sprint

---

### relationship_assessments
**Purpose:** PRIMARY individual assessment data — love languages, personality, emotional patterns, connection style, core values
**Key fields:** `user_id`, `answers` (jsonb), `results` (jsonb), `completed_at`
**Answer fields of note:**
- `answers.le_1` — love language ranking object (primary key)
- `answers.ln_1` — love language ranking (fallback key)
- Format: `{ touch: 5, time: 4, gifts: 3, words: 2, service: 1 }` — **HIGHER = more preferred**

**Results fields of note:**
- `results.modules` — array of module objects with `moduleId`, `percentage`, `insights.headline`, `insights.description`
- Key moduleIds: `processing_style`, `emotional_patterns`, `connection_style`, `core_values`, `love_needs`, `love_expressions`, `attachment_security`, `communication`, `shared_vision`, `know_your_partner`
- `results.overallPercentage` — overall assessment score

**Used by:** `lib/ai-coach-context.js` (single source of truth), `app/profile` pages (via `individual_profiles` — migration pending)
**Status:** Active — core table, do not modify schema

---

### relationship_health
**Purpose:** Calculated relationship health score over time
**Key fields:** `couple_id`, `score` OR `overall_score` (check both — column name inconsistent), `created_at`
**Used by:** `app/dashboard/page.js`, `lib/ai-coach-context.js`
**Notes:** Query with `.order('created_at', { ascending: false }).limit(1)` to get latest score.
**Status:** Active

---

### relationship_points
**Purpose:** Silent behavioral activity log — tracks couple actions for health score and AI coaching patterns
**Key fields:** `user_id`, `couple_id`, `action`, `points`, `created_at`
**Action values include:** `affection_shown`, `affection_received`, `positive_communication`, `date_completed`, `checkin_completed`, etc.
**Used by:**
- `app/dashboard/page.js` — writes silently on activity
- `app/weekly-reflection/page.js` — writes silently on reflection
- `lib/ai-coach-context.js` — reads for coach pattern recognition

**⚠️ IMPORTANT: This is NOT a visible points/gamification system.** Never display point totals or counts to users. It is a behavioral activity log used internally for health scoring and AI coaching context.
**Rename intent:** All code comments should refer to this as "activity log" not "points" to prevent future confusion.
**Status:** Active

---

### timeline_events
**Purpose:** Relationship memory/scrapbook entries
**Key fields:** `id`, `couple_id`, `user_id`, `title`, `description`, `date`, `photo_url`
**Used by:** `app/timeline` pages, `lib/ai-coach-context.js` (count only)
**Notes:** `lib/ai-coach-context.js` queries this table (not `timeline_entries`).
**Status:** Active

---

### trips
**Purpose:** Trip planning — stores trip metadata
**Key fields:** `id`, `couple_id`, `title`, `destination`, `start_date`, `end_date`
**Used by:** `app/trips` pages
**Status:** Active

---

### trip_itinerary
**Purpose:** Day-by-day itinerary items for a trip
**Key fields:** `id`, `trip_id`, `day`, `time`, `activity`, `notes`
**Used by:** `app/trips` pages
**Status:** Active

---

### trip_packing
**Purpose:** Collaborative packing list for a trip
**Key fields:** `id`, `trip_id`, `item`, `packed`, `user_id`
**Used by:** `app/trips` pages
**Status:** Active

---

### trip_photos
**Purpose:** Photo gallery for a trip
**Key fields:** `id`, `trip_id`, `url`, `caption`, `uploaded_by`
**Used by:** `app/trips` pages
**Status:** Active

---

### user_profiles
**Purpose:** Lightweight user preferences — NOT assessment data
**Key fields:** `user_id`, `display_name`, `preferred_checkin_time`, `hobbies`, `date_preferences`, `stress_response`
**Deprecated field:** `love_language_primary` — column exists but is NOT the source of truth. `relationship_assessments.answers.le_1` is. This field is only used as a last-resort fallback in `lib/ai-coach-context.js` and as a manual override in `app/settings/page.js`. Do not rely on it for coaching logic.
**Used by:** `lib/ai-coach-context.js` (preferences + name fallback), `app/settings/page.js` (read/write)
**Notes:**
- Matt (`fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`) was missing a row — inserted via `scripts/add-matt-profile.js`
- Always use `.maybeSingle()` when querying — not all users have a row
- Never use `.single()` on this table (will throw on missing rows)

**Status:** Active but incomplete — row missing for some users

---

### user_spotify_connections
**Purpose:** Stores Spotify OAuth tokens for Song Flirts feature
**Key fields:** `user_id`, `access_token`, `refresh_token`, `expires_at`
**Used by:** Spotify integration (built, not yet activated)
**Notes:** Dormant pending Spotify app registration approval.
**Status:** Dormant — will be activated when Spotify registration opens

---

### weekly_reflections
**Purpose:** End-of-week relationship summary and reflection
**Key fields:** `id`, `couple_id`, `user_id`, `reflection_text`, `week_start`, `created_at`
**Used by:** `app/weekly-reflection/page.js`
**Notes:** Feature partially built — writes `relationship_points` on completion.
**Status:** Dormant — feature not yet fully built

---

## Deprecated / Candidate for Removal

### individual_profiles
See entry above. Redundant with `relationship_assessments`. Retained until all 5 referencing files are migrated. Drop after migration sprint.

---

## Key Query Patterns

### Always use maybeSingle()
Tables where rows may not exist for all users: `user_profiles`, `individual_profiles`, `relationship_health`

```js
const { data } = await supabase
  .from('user_profiles')
  .select('...')
  .eq('user_id', userId)
  .maybeSingle(); // never .single() — throws on 0 rows
```

### User names
Names come from `auth.users.raw_user_meta_data.first_name` via admin client:
```js
const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
const name = user?.user_metadata?.first_name || null;
```
Fallback chain: `auth.users` → `user_profiles.display_name` → `'the user'`

### Love language ranking
Source: `relationship_assessments.answers.le_1` (fallback: `answers.ln_1`)
Sort: **DESCENDING** — higher number = more preferred (5 = primary)
```js
const sorted = Object.entries(answers.le_1).sort((a, b) => b[1] - a[1]);
// sorted[0][0] = primary love language key
```

### Partner ID
```js
const { data: couple } = await supabase.from('couples').select('user1_id, user2_id').eq('id', coupleId).maybeSingle();
const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id;
```
