## Dashboard

### Dashboard needs redesign as relationship health overview
**Priority:** Medium
**Status:** Known improvement
Redesign dashboard to tell the couple's relationship story. Lead with health score, recent check-in summary, upcoming date, and one AI insight. Features become secondary navigation.

### Date suggestion teaser takes too much real estate
**Priority:** Low
**Status:** Known improvement
Reduce "Date Ideas for You" section to a subtle nudge that drives users to /dates without dominating the layout.

## Date Night

### Google Maps not rendering in /dates/custom
**Priority:** Medium
**Status:** Known bug
AutocompleteService predictions not showing, map not initializing. Suspected race condition between Google Maps script load and component mount. Both API keys set in .env.local and Vercel. Fix: use named callback pattern for script loading.
## Onboarding

### No CTA to complete profile
**Priority:** Medium
**Status:** Known improvement
Profile is only accessible via gear icon — no prompt or nudge for new users 
to complete it. Needs a CTA during onboarding or on the dashboard for users 
who haven't completed their assessment. Critical for coach personalization.

## Onboarding

### Fragmented onboarding creates incomplete data
**Priority:** High
**Status:** Known issue
No guaranteed path ensures both partners complete all assessments.
Matt missing user_profiles row as a result. Need linear onboarding flow:
signup → individual assessment → profile quiz → partner invite → dashboard.
No skipping allowed. Both partners must complete before accessing features.

### No CTA to complete profile
**Priority:** Medium
**Status:** Known improvement
Profile only accessible via gear icon. No nudge for incomplete profiles.
Coach personalization suffers when data is missing.

---

## Database Audit (completed Feb 2026)

### individual_profiles — confirmed redundant, pending removal
**Finding:** Table is a duplicate of `relationship_assessments` created during early development.
**References found in 5 files (9 total):**
- `app/dashboard/page.js` (line 700)
- `app/profile/page.js` (lines 39, 138, 143, 196, 212)
- `app/profile/results/page.js` (line 91)
- `app/checkin/page.js` (line 167)
- `app/onboarding/page.js` (line 40)

**Action:** Do NOT drop yet. Schedule migration sprint to redirect all reads to `relationship_assessments` and all writes to `relationship_assessments`. Drop table after verification.
**Documented in:** `docs/DATABASE.md`

### user_profiles — Matt's row added, love_language_primary deprecated
**Finding:** Matt (`fe1e0be6-4574-4bc1-8c89-9cb1b6bbe870`) was missing a `user_profiles` row due to fragmented onboarding. `love_language_primary` column exists but is not the source of truth.
**Action taken:**
- Migration script created at `scripts/add-matt-profile.js` — run to insert the missing row
- `love_language_primary` marked deprecated in code and `docs/DATABASE.md`
- `lib/ai-coach-context.js` treats it as last-resort fallback only
- Source of truth for love languages is `relationship_assessments.answers.le_1`

### relationship_points — confirmed active, added to coach context
**Finding:** Table is a silent behavioral activity log (not a gamification system). Was not being used by the AI coach despite containing useful pattern data.
**Action taken:** Added read query to `lib/ai-coach-context.js` (section 10). Coach now receives an action summary (e.g., `checkin_completed: 12x, affection_shown: 4x`). Never shown to users as points.

### date_suggestions — confirmed dormant pending Maps fix
**Finding:** Table is populated, feature is built, but Google Maps API race condition prevents display.
**Status:** Dormant. Fix tracked under "Google Maps not rendering in /dates/custom" issue above.

### user_spotify_connections — confirmed dormant pending Spotify activation
**Finding:** Table and OAuth integration built. Blocked on Spotify app registration approval.
**Status:** Dormant. Activate when Spotify developer account opens.

### weekly_reflections — confirmed dormant pending feature build
**Finding:** Table exists. Feature writes `relationship_points` on completion but the weekly reflection flow is not fully built.
**Status:** Dormant — feature sprint needed.

---

## Code Audit (completed Feb 2026)

### .single() → .maybeSingle() — complete sweep done
**Finding:** 40+ `.single()` Supabase calls across 23 files caused 400/406 errors when zero rows were returned (e.g. user not yet in a couple, no existing assessment, Spotify not connected).
**Files fixed:**
- `app/assessment/page.js` (3 fixes)
- `app/assessment/results/page.js` (4 fixes)
- `app/date-night/page.js`, `app/checkin/weekly/page.js`, `app/trips/page.js`, `app/timeline/page.js`, `app/mixtape/page.js`, `app/ai-coach/page.js` (1 fix each)
- `app/trips/[id]/page.js` (2 fixes)
- `app/api/spotify/search/route.js` (1 fix)
- `app/api/ai-coach/route.js` (3 fixes)
- `app/dates/page.js`, `app/flirts/page.js`, `app/connect/page.js`, `app/weekly-reflection/page.js` (1–4 fixes each)
- `app/dates/custom/page.js` (1 fix)
- `components/HealthMeter.js`, `components/FlirtComposer.js`, `components/AddEventModal.js`, `components/AddPackingItemModal.js`, `components/AddItineraryItemModal.js`, `components/CreateTripModal.js`, `components/CreateDateModal.js` (1 fix each)
**Remaining:** `scripts/add-matt-profile.js` (1 call — one-off admin script, not user-facing, acceptable as-is)

### weekly-reflection uses stale daily_checkins schema
**Finding:** `app/weekly-reflection/page.js` queries `daily_checkins` with `.gte('date', ...)` and reads `user1_answer` / `user2_answer`. If `daily_checkins` schema changed (e.g. `check_date` replacing `date`), this page will silently return no results.
**Priority:** Medium
**Status:** Known risk — verify `daily_checkins` column names match before enabling weekly reflection feature.

### FlirtComposer reads from onboarding_responses — table may be obsolete
**Finding:** `components/FlirtComposer.js` reads love language from `onboarding_responses.answers.q8`. This table may be deprecated in favor of `relationship_assessments`.
**Priority:** Low
**Status:** Known risk — validate `onboarding_responses` still exists in DB, or migrate read to `relationship_assessments.answers.le_1`.
