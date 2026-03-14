# Known Bugs & Issues

Active bugs and known improvements. Fixed items at the bottom.

---

## 🔴 Critical (Blocking Core Functionality)

### Date Suggestions — Google Places API Not Loading
**Status:** Open
**Priority:** P0
**Affected Feature:** Date Night suggestions
**Impact:** Users can't browse AI-recommended date ideas

**Symptoms:**
- `/api/dates/suggestions` returns 503 errors
- "No outgoing requests" in Vercel function logs
- Function executes in 12ms then exits
- No date suggestion cards display (only manually created dates work)

**Root Cause:**
Unknown — API key is configured correctly in Vercel, code checks pass, but Google Places API is never called.

**Attempted Fixes:**
1. ✅ Fixed Supabase client authentication in API route
2. ✅ Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel
3. ✅ Changed env var from `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` to `GOOGLE_PLACES_API_KEY`
4. ✅ Verified all environment variables present in Vercel (Production, Preview, Development)
5. ❌ Still failing

**Next Debug Steps:**
- Add detailed console.logging in API route to trace execution path
- Test Google Places API directly with curl using same credentials
- Check if error is being caught and swallowed silently
- Verify Google Places API (New) has correct permissions/billing enabled
- Test API route locally vs production

**Files Involved:**
- `app/api/dates/suggestions/route.js`
- `lib/date-suggestions.js`
- `app/dates/page.js`

**Created:** 2026-02-19
**Last Updated:** 2026-02-19

---

## 🟠 High

### Fragmented Onboarding Creates Incomplete Data
**Priority:** High
**Status:** Known issue
No guaranteed path ensures both partners complete all assessments. Matt was missing a `user_profiles` row as a result. Need linear onboarding flow: signup → individual assessment → profile quiz → partner invite → dashboard. No skipping allowed. Both partners must complete before accessing features.

---

## 🟡 Medium

### Google Maps Not Rendering in /dates/custom
**Priority:** Medium
**Status:** Known bug
AutocompleteService predictions not showing, map not initializing. Suspected race condition between Google Maps script load and component mount. Both API keys set in `.env.local` and Vercel. Fix: use named callback pattern for script loading.

### Dashboard Needs Redesign as Relationship Health Overview
**Priority:** Medium
**Status:** Known improvement
Redesign dashboard to tell the couple's relationship story. Lead with health score, recent check-in summary, upcoming date, and one AI insight. Features become secondary navigation.

### weekly-reflection Uses Stale daily_checkins Schema
**Priority:** Medium
**Status:** Known risk
`app/weekly-reflection/page.js` queries `daily_checkins` with `.gte('date', ...)` and reads `user1_answer` / `user2_answer`. If `daily_checkins` schema changed (e.g. `check_date` replacing `date`), this page will silently return no results. Verify column names match before enabling weekly reflection feature.

### Giphy API — Upgrade Beta Key to Production
**Priority:** Medium
**Status:** Known improvement
Current key is a beta/dev key with rate limits and attribution requirements that differ from production. Go to developers.giphy.com, create production app, get new API key, update `NEXT_PUBLIC_GIPHY_API_KEY` in Vercel and `.env.local`.

### No CTA to Complete Profile
**Priority:** Medium
**Status:** Known improvement
Profile is only accessible via the gear icon — no prompt or nudge for new users to complete it. Critical for coach personalization. Needs a CTA during onboarding or on the dashboard for users who haven't completed their assessment.

---

## 🟢 Low

### Date Suggestion Teaser Takes Too Much Real Estate
**Priority:** Low
**Status:** Known improvement
Reduce "Date Ideas for You" section on dashboard to a subtle nudge that drives users to `/dates` without dominating the layout.

### FlirtComposer Reads from Potentially Deprecated Table
**Priority:** Low
**Status:** Known risk
`components/FlirtComposer.js` reads love language from `onboarding_responses.answers.q8`. This table may be deprecated in favor of `relationship_assessments`. Validate `onboarding_responses` still exists in DB, or migrate read to `relationship_assessments.answers.le_1`.

### individual_profiles Table — Confirmed Redundant, Pending Removal
**Priority:** Low
**Status:** Known issue
Table is a duplicate of `relationship_assessments` created during early development. References found in 5 files (9 total): `app/dashboard/page.js` (line 700), `app/profile/page.js` (lines 39, 138, 143, 196, 212), `app/profile/results/page.js` (line 91), `app/checkin/page.js` (line 167), `app/onboarding/page.js` (line 40). Do NOT drop yet — schedule migration sprint to redirect all reads/writes to `relationship_assessments`, then drop after verification.

---

## 🧹 Cleanup Backlog

- Us tab: Trips icon showing phone instead of plane/map
- Today tab Section 2: "No date planned yet" copy should be more inviting
- Today tab Section 1: some questions don't suit "This is us" reaction — fix when question library is built
- Today tab Section 3: Nora commentary card needs pulse dot + "Nora" label
- Conflict style schema mismatch: DB allows `talk_immediately/need_space/write_it_out/avoid` but profile data uses `validator/avoider` — needs remapping
- Assessment completion should auto-write `couple_id` to `relationship_assessments`
- Assessment completion should auto-write `attachment_style` to `user_profiles`
- Nora avatar: replace with something warmer
- PWA icon-192.png missing (harmless 404)

---

## 💰 Revenue Opportunities (Background)

### Spotify Affiliate Program
- Commission: $7.35 per new Premium signup, 45-day cookie
- Apply: sovrn.com (search "Spotify" in advertiser directory)
- Requires: live website with custom domain
- Add affiliate token to all `spotify_track_url` links in FlirtView, flirts page, Our Space
- Implementation: `lib/affiliates.js` → `appendSpotifyAffiliate(url)`

### Apple Music Affiliate Program
- Commission: 7% on purchases + one-time on new memberships, 30-day cookie
- Apply: performance-partners.apple.com (more selective — apply when ABF has more traction)
- Add token to Apple Music links when that integration is built

---

## ✅ Fixed

### .single() → .maybeSingle() — Complete Sweep (Feb 2026)
40+ `.single()` Supabase calls across 23 files caused 400/406 errors when zero rows returned. All fixed. Remaining: `scripts/add-matt-profile.js` (one-off admin script, acceptable as-is).

---

## 📝 Notes

- Priority levels: P0 (critical) / P1 (high) / P2 (medium) / P3 (low)
- Update status and add findings as debugging progresses
- Move to "Fixed" section when resolved, include commit SHA
