// DEPRECATED / DEAD FILE — confirmed unused during the Aug 5 2026 full code
// audit (zero importers anywhere in the app). todayPST()/nowPST() hardcoded
// a fixed UTC-8 offset for "PST," which is actually wrong for about 8
// months of the year during Pacific Daylight Time (UTC-7) — moot since
// nothing ever called these, but worth knowing if this is ever revived: use
// lib/dates.js's getTodayString(timezone)/getHourInTimezone(timezone)
// instead, which handle DST correctly via real timezone-aware formatting.
//
// Could not delete this file from the sandbox this session (unlink/rm is
// blocked on this mount). Matt: safe to run `rm lib/date-utils.js` locally.
