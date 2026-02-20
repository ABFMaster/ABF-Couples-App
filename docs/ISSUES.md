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
