# 🐛 Known Bugs & Issues

Active bugs and their status. Fixed bugs are moved to the bottom.

---

## 🔴 Critical (Blocking Core Functionality)

### Date Suggestions - Google Places API Not Loading
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
Unknown - API key is configured correctly in Vercel, code checks pass, but Google Places API is never called.

**Attempted Fixes:**
1. ✅ Fixed Supabase client authentication in API route
2. ✅ Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel
3. ✅ Changed env var from `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` to `GOOGLE_PLACES_API_KEY`
4. ✅ Verified all environment variables present in Vercel (Production, Preview, Development)
5. ❌ Still failing

**What Works:**
- Manual date creation ✓
- Scheduled dates display on dashboard ✓
- "Get Directions" on scheduled dates ✓
- Maps Static API enabled in Google Cloud ✓

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

## 🟡 Medium (Degraded Experience)

*No medium priority bugs at this time*

---

## 🟢 Low (Minor Issues)

*No low priority bugs at this time*

---

## ✅ Fixed

*Fixed bugs will be moved here with resolution notes*

---

## 📝 Notes

- Use this file to track bugs discovered during testing
- Update status and add new findings as debugging progresses
- Move to "Fixed" section when resolved with commit SHA
- Priority levels: P0 (critical), P1 (high), P2 (medium), P3 (low)
