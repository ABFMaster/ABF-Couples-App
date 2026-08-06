// ─────────────────────────────────────────────────────────────────────────────
// SYNTHETIC-HISTORY STRESS TEST — lib/checkin-patterns.js's computeCouplePatterns()
//
// WHY THIS EXISTS: Matt's explicit ask, Aug 5 2026, before ENGAGEMENT_PATTERN
// (lib/nora-memory.js) or the weekly cron check (app/api/cron/scheduled-
// tasks/route.js's processEngagementPatternCheck) got wired to anything
// user-facing: presence-only check-in data can't distinguish genuine
// relational drift from an ordinary busy week, a dead phone, travel, or a
// dozen other benign explanations. Before trusting this signal to feed
// Nora's couple_notes at all, run it against a spread of synthetic
// histories and confirm it fires only where it plausibly should — steady,
// bursty, and single-bad-week histories should all come back with
// driftAlert: null; only a persistent, same-partner, two-consecutive-week
// imbalance should trigger it.
//
// No DB, no network, no auth — computeCouplePatterns() is a pure function
// (see its own comment in lib/checkin-patterns.js for why it was split out
// from analyzeCouplePatterns() specifically to make this possible). Run:
//   node scripts/test-checkin-patterns.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { computeCouplePatterns } from '../lib/checkin-patterns.js'

const USER_A = 'user-a-uuid'
const USER_B = 'user-b-uuid'

function dateNDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

// Builds a 30-day check-in array. `pattern(dayOffset, userId) => boolean`
// decides whether that user checked in on that day (dayOffset 0 = today,
// 29 = 29 days ago).
function buildCheckins(pattern, daysBack = 30) {
  const rows = []
  for (let offset = 0; offset < daysBack; offset++) {
    const date = dateNDaysAgo(offset)
    if (pattern(offset, USER_A)) rows.push({ check_date: date, user_id: USER_A })
    if (pattern(offset, USER_B)) rows.push({ check_date: date, user_id: USER_B })
  }
  return rows
}

const scenarios = [
  {
    name: 'Steady & balanced — both check in ~5x/week, no gap',
    expectDrift: false,
    checkins: buildCheckins((offset, user) => offset % 7 !== 3 && offset % 7 !== 6), // 5/7 days, same for both
  },
  {
    name: 'Bursty but roughly balanced — irregular days, similar totals for both',
    expectDrift: false,
    checkins: buildCheckins((offset, user) => {
      // Pseudo-random but deterministic, same distribution for both users
      const seed = (offset * 7 + (user === USER_A ? 1 : 2)) % 5
      return seed < 3
    }),
  },
  {
    name: 'One-partner single bad week (travel/phone died) — imbalanced week 0 only, week 1 fine',
    expectDrift: false,
    checkins: buildCheckins((offset, user) => {
      if (user === USER_A) return offset % 7 !== 3 // A steady throughout
      if (offset < 7) return false // B silent this most-recent week only
      return offset % 7 !== 3 // B steady before that
    }),
  },
  {
    name: 'Genuine persistent drift — B silent/sparse for 2+ consecutive weeks, A steady',
    expectDrift: true,
    checkins: buildCheckins((offset, user) => {
      if (user === USER_A) return offset % 7 !== 3 // A steady throughout
      if (offset < 14) return offset % 13 === 0 // B nearly silent the last 2 weeks (0-1 check-ins/week)
      return offset % 7 !== 3 // B was steady before that (this is a real change, not just always-quiet)
    }),
  },
  {
    name: 'Flip-flop — different partner is the quiet one week 0 vs week 1 (not a real pattern)',
    expectDrift: false,
    checkins: buildCheckins((offset, user) => {
      const inWeek0 = offset < 7
      const inWeek1 = offset >= 7 && offset < 14
      if (inWeek0) return user === USER_A ? true : (offset % 4 === 0) // A active, B quiet
      if (inWeek1) return user === USER_B ? true : (offset % 4 === 0) // B active, A quiet — flipped
      return offset % 7 !== 3 // steady further back, irrelevant to the 2-week check
    }),
  },
  {
    name: 'Sparse/new couple — barely any data at all, nowhere near the count threshold',
    expectDrift: false,
    checkins: buildCheckins((offset, user) => offset < 3 && user === USER_A), // 3 check-ins total, one user only
  },
  {
    name: 'Both fully silent — no data',
    expectDrift: false,
    checkins: [],
  },
]

let pass = 0
let fail = 0

console.log('Synthetic check-in pattern stress test\n' + '='.repeat(60))

for (const scenario of scenarios) {
  const result = computeCouplePatterns(scenario.checkins, 30)
  const gotDrift = !!result.driftAlert
  const ok = gotDrift === scenario.expectDrift

  if (ok) pass++
  else fail++

  console.log(`\n${ok ? 'PASS' : 'FAIL'} — ${scenario.name}`)
  console.log(`  expected driftAlert: ${scenario.expectDrift ? 'set' : 'null'}, got: ${gotDrift ? 'set' : 'null'}`)
  if (result.driftAlert) {
    console.log(`  driftAlert: moreActive=${result.driftAlert.moreActiveCount} lessActive=${result.driftAlert.lessActiveCount} weeksConfirmed=${result.driftAlert.weeksConfirmed}`)
  }
  console.log(`  balanceScore (full window, display-only): ${result.balanceScore}`)
}

console.log('\n' + '='.repeat(60))
console.log(`${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
