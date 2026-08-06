// ============================================================================
// Check-in Pattern Analysis System
// ============================================================================
// Analyzes daily_checkins presence/frequency to detect engagement trends,
// drift, and concerns. Powers the AI coach's proactive-prompt suggestion
// (see app/ai-coach/page.js) and is available for future weekly-summary UI
// (Past Reflections / Sunday Review, both still on the backlog).
//
// Rewritten Aug 2026 — the previous version of this file scored everything
// off daily_checkins.mood/connection_score, columns that belonged to a
// scored/emoji daily check-in UI that was deliberately killed (see
// Sessions/PRODUCT_BACKLOG.md, "Daily Check-in feature confirmed
// intentionally killed"). No live route has written those columns since —
// bet/respond, spark/respond, and ritual/checkin all upsert into
// daily_checkins for question_id/question_text/question_response only.
// mood/connection_score are nullable and have been null on every row since.
// The old code silently ran on defaults (moodToNumber(undefined) always
// returned 3) and had an active false-positive on top of that: JS coerces
// null to 0 in a numeric comparison, so `c.connection_score < 3` evaluated
// true for every row regardless of anything real, meaning the old
// "low_connection" concern fired for any user with 3+ check-ins in a week,
// unconditionally. This version drops mood/connection entirely and works
// off what daily_checkins actually still gives us reliably: whether a row
// exists for a given day. Presence, streaks, gaps, and per-partner
// comparison are the whole signal now — which is also a more honest match
// for what the app itself measures today (Spark/Bet/Ritual engagement, not
// a self-reported mood score).
// ============================================================================

// Deliberately NOT a static top-level import. This file's pure functions
// (computeCouplePatterns, detectConcerns, etc.) have no need for supabase
// at all — only the four DB-fetching wrappers below (analyzeUserPatterns,
// analyzeCouplePatterns, generateWeeklySummary, calculateStreak) do, and
// each imports it lazily via getSupabase() right where it's used. This
// means importing computeCouplePatterns() alone (e.g. from
// scripts/test-checkin-patterns.mjs, run with plain `node`, no Next.js
// build step to resolve aliases or bundle deps) never touches supabase or
// its dependency chain at all — no DB, no network, no auth, just the
// computation. Also fixes what would otherwise be a real footgun: this
// file's supabase client (lib/supabase.js) is the anon-key/RLS-scoped
// browser client, correct for this file's one existing live caller
// (app/ai-coach/page.js, called with the user's own session) but wrong for
// any future server-side caller with no user session — see
// computeCouplePatterns()'s own comment for the full reasoning, which is
// exactly why the cron's processEngagementPatternCheck() fetches with its
// own service-role client and calls computeCouplePatterns() directly
// instead of going through analyzeCouplePatterns().
async function getSupabase() {
  const { supabase } = await import('./supabase.js')
  return supabase
}

// Thresholds for concern detection
const CONCERN_THRESHOLDS = {
  silenceDays: 3,           // Alert after 3+ consecutive days with no check-in
  lowEngagementRatio: 0.5,  // Alert if checked in less than half the expected days
  declineRatio: 0.5,        // Alert if this week's check-in count is <= half last week's
}

// Thresholds for the couple-level drift alert (analyzeCouplePatterns).
// Aug 5 2026 — previously a single 30-day aggregate imbalance was enough to
// fire driftAlert, which meant one unusual week (travel, a busy stretch,
// a dead phone) could trigger it on its own. Matt's call: this data is too
// vague to act on a single window — require the SAME imbalance to hold in
// the two most recent complete weeks independently before calling it a
// pattern worth Nora quietly noting. See lib/nora-memory.js's
// SIGNAL_TYPES.ENGAGEMENT_PATTERN lens for how this is meant to be used
// once flagged (never as a stated diagnosis).
const DRIFT_THRESHOLDS = {
  minMoreActiveCount: 3,     // more-active partner needs at least this many check-ins that week to trust the comparison
  maxLessActiveRatio: 0.4,   // less-active partner at or below 40% of the more-active partner's count
  weeksRequired: 2,          // consecutive most-recent weeks that must both show the imbalance
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDayOfWeek(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
}

function isWeekend(date) {
  const day = new Date(date).getDay()
  return day === 0 || day === 6
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

// Whole-day difference between two dates (a minus b), both as YYYY-MM-DD
// strings or Date objects. Positive when a is later than b.
function daysBetween(a, b) {
  return Math.round((new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24))
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Analyze one user's check-in presence/frequency over the window.
 *
 * @param {string} userId - User's UUID
 * @param {number} daysBack - Number of days to analyze (default 30)
 * @returns {Promise<Object>} Pattern analysis results
 */
export async function analyzeUserPatterns(userId, daysBack = 30) {
  const defaultResult = {
    engagementTrend: 'stable',
    streakDays: 0,
    concernFlags: [],
    positivePatterns: [],
    insights: ['Start checking in daily to see your patterns!'],
    totalCheckins: 0,
    periodDays: daysBack,
  }

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const supabase = await getSupabase()
    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select('check_date, question_text, question_response')
      .eq('user_id', userId)
      .gte('check_date', formatDate(startDate))
      .lte('check_date', formatDate(endDate))
      .order('check_date', { ascending: true })

    if (error) {
      console.error('[CheckinPatterns] Error fetching check-ins:', error)
      return defaultResult
    }

    if (!checkins || checkins.length === 0) {
      return defaultResult
    }

    const engagementTrend = calculateEngagementTrend(checkins, daysBack)
    const streakDays = await calculateStreak(userId)
    const concernFlags = detectConcerns(userId, checkins)
    const positivePatterns = findPositivePatterns(checkins, streakDays, engagementTrend)
    const insights = generateInsights(checkins, daysBack)

    return {
      engagementTrend,
      streakDays,
      concernFlags,
      positivePatterns,
      insights,
      totalCheckins: checkins.length,
      periodDays: daysBack,
    }
  } catch (err) {
    console.error('[CheckinPatterns] Error analyzing user patterns:', err)
    return defaultResult
  }
}

/**
 * Pure computation half of couple pattern analysis — takes a raw array of
 * { check_date, user_id } rows (already fetched by the caller) and returns
 * the same result shape analyzeCouplePatterns() always has. No supabase
 * call inside, on purpose:
 *
 * - lib/checkin-patterns.js's module-level `supabase` is the anon-key
 *   browser client (see lib/supabase.js) — correct for its one existing
 *   caller (app/ai-coach/page.js, called with the user's own session, RLS
 *   scoped to auth.uid()). A server-side caller with no user session (e.g.
 *   a cron route) would hit the same RLS and silently get zero rows back —
 *   exactly the "old code silently ran on defaults" bug shape that's come
 *   up repeatedly in this app. Splitting the fetch from the computation
 *   lets a server-side caller pass its own service-role-fetched rows in
 *   directly instead of going through this file's browser client.
 * - It also means a synthetic-history stress test (see
 *   scripts/test-checkin-patterns.mjs) can call this directly with
 *   fabricated data — no DB, no auth, no network involved.
 *
 * @param {Array<{check_date: string, user_id: string}>} allCheckins
 * @param {number} daysBack - Same daysBack the caller fetched for (used only for periodDays in the returned shape)
 * @returns {Object} Couple pattern analysis result
 */
export function computeCouplePatterns(allCheckins, daysBack = 30) {
  const defaultResult = {
    balanceScore: 0,
    driftAlert: null,
    sharedActiveDays: 0,
    coupleInsights: ['Start checking in to see your patterns!'],
    daysCompared: 0,
    periodDays: daysBack,
  }

  if (!allCheckins || allCheckins.length === 0) {
    return defaultResult
  }

  const byDate = {}
  allCheckins.forEach(c => {
    if (!byDate[c.check_date]) byDate[c.check_date] = new Set()
    byDate[c.check_date].add(c.user_id)
  })

  const userIdsSeen = [...new Set(allCheckins.map(c => c.user_id))]
  const countByUser = {}
  allCheckins.forEach(c => { countByUser[c.user_id] = (countByUser[c.user_id] || 0) + 1 })

  const totalDaysInWindow = Object.keys(byDate).length
  const sharedActiveDays = Object.values(byDate).filter(users => users.size === 2).length

  // Balance score: how evenly matched the two partners' check-in counts
  // are over the FULL window — 100 means identical counts, dropping
  // toward 0 as the gap widens. This is a general read for insights/
  // display only; it does NOT gate driftAlert (see below) — a single
  // window, however long, can't distinguish "genuinely drifting apart"
  // from "one bad week."
  let balanceScore = 0
  if (userIdsSeen.length === 2) {
    const [id1, id2] = userIdsSeen
    const c1 = countByUser[id1] || 0
    const c2 = countByUser[id2] || 0
    const maxCount = Math.max(c1, c2)
    balanceScore = maxCount > 0 ? Math.round((Math.min(c1, c2) / maxCount) * 100) : 100
  }

  const driftAlert = userIdsSeen.length === 2
    ? detectPersistentDrift(allCheckins, userIdsSeen)
    : null

  const coupleInsights = generateCoupleInsights(totalDaysInWindow, sharedActiveDays, driftAlert)

  return {
    balanceScore,
    driftAlert,
    sharedActiveDays,
    coupleInsights,
    daysCompared: totalDaysInWindow,
    periodDays: daysBack,
  }
}

/**
 * Compare both partners' check-in presence to spot drift between them —
 * the couple-level version of "who's showing up and who isn't." Thin
 * fetch-then-compute wrapper around computeCouplePatterns() using this
 * file's own (anon-key, RLS-scoped) supabase client — correct for a
 * client-side caller with a real user session. A server-side caller
 * without one should fetch with its own client and call
 * computeCouplePatterns() directly instead (see that function's comment).
 *
 * @param {string} coupleId - Couple's UUID
 * @param {number} daysBack - Number of days to analyze (default 30)
 * @returns {Promise<Object>} Couple pattern analysis results
 */
export async function analyzeCouplePatterns(coupleId, daysBack = 30) {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const supabase = await getSupabase()
    const { data: allCheckins, error } = await supabase
      .from('daily_checkins')
      .select('check_date, user_id')
      .eq('couple_id', coupleId)
      .gte('check_date', formatDate(startDate))
      .lte('check_date', formatDate(endDate))
      .order('check_date', { ascending: true })

    if (error) {
      console.error('[CheckinPatterns] Error fetching couple check-ins:', error)
      return computeCouplePatterns([], daysBack)
    }

    return computeCouplePatterns(allCheckins, daysBack)
  } catch (err) {
    console.error('[CheckinPatterns] Error analyzing couple patterns:', err)
    return computeCouplePatterns([], daysBack)
  }
}

/**
 * Presence-based concern detection — no mood/connection_score input
 * anymore (see file header). Feeds the AI coach's proactive-prompt
 * suggestion in app/ai-coach/page.js, which maps concernFlags[].type to a
 * suggested opening message — keep type names in sync with that promptMap
 * if these change again.
 *
 * @param {string} userId - User's UUID (kept for signature compatibility / logging)
 * @param {Array} recentCheckins - Array of check-in rows with check_date
 * @returns {Array} Array of concern objects with type, severity, description
 */
export function detectConcerns(userId, recentCheckins) {
  const concerns = []

  if (!recentCheckins || recentCheckins.length === 0) {
    return concerns
  }

  const sorted = [...recentCheckins].sort((a, b) => new Date(b.check_date) - new Date(a.check_date))
  const today = formatDate(new Date())

  // CONCERN 1: gone quiet — days since the most recent check-in
  const daysSinceLast = daysBetween(today, sorted[0].check_date)
  if (daysSinceLast >= CONCERN_THRESHOLDS.silenceDays) {
    concerns.push({
      type: 'silence_streak',
      severity: daysSinceLast >= 7 ? 'high' : 'medium',
      description: `No check-in for ${daysSinceLast} days`,
      daysAffected: daysSinceLast,
    })
  }

  // CONCERN 2: engagement declining — this week's check-in count vs the
  // week before it
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const thisWeekCount = sorted.filter(c => new Date(c.check_date) >= oneWeekAgo).length
  const lastWeekCount = sorted.filter(c => {
    const d = new Date(c.check_date)
    return d >= twoWeeksAgo && d < oneWeekAgo
  }).length

  if (lastWeekCount >= 3 && thisWeekCount <= lastWeekCount * CONCERN_THRESHOLDS.declineRatio) {
    concerns.push({
      type: 'activity_decline',
      severity: thisWeekCount === 0 ? 'high' : 'medium',
      description: `Check-ins dropped from ${lastWeekCount} last week to ${thisWeekCount} this week`,
      previousCount: lastWeekCount,
      recentCount: thisWeekCount,
    })
  }

  // CONCERN 3: low overall engagement relative to how long they've had the
  // chance to check in
  const expectedDays = Math.min(7, daysBetween(today, sorted[sorted.length - 1].check_date) + 1)
  if (expectedDays >= 5 && recentCheckins.length < expectedDays * CONCERN_THRESHOLDS.lowEngagementRatio) {
    concerns.push({
      type: 'low_engagement',
      severity: 'low',
      description: `Only ${recentCheckins.length} check-ins in the last ${expectedDays} days`,
    })
  }

  return concerns
}

/**
 * Weekly presence summary — no mood/connection_score input anymore.
 *
 * @param {string} userId - User's UUID
 * @param {string|Date} startDate - Start of the week
 * @param {string|Date} endDate - End of the week
 * @returns {Promise<Object>} Weekly summary data
 */
export async function generateWeeklySummary(userId, startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : formatDate(startDate)
  const end = typeof endDate === 'string' ? endDate : formatDate(endDate)

  const defaultResult = {
    weekOf: start,
    daysActive: 0,
    activeDates: [],
    keyMoments: ['No check-ins this week'],
    recommendedTopics: ['Start checking in to track your week!'],
    totalCheckins: 0,
  }

  try {
    const supabase = await getSupabase()
    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select('check_date, question_text, question_response')
      .eq('user_id', userId)
      .gte('check_date', start)
      .lte('check_date', end)
      .order('check_date', { ascending: true })

    if (error) {
      console.error('[CheckinPatterns] Error fetching weekly check-ins:', error)
      return defaultResult
    }

    if (!checkins || checkins.length === 0) {
      return defaultResult
    }

    const activeDates = checkins.map(c => c.check_date)
    const keyMoments = generateKeyMoments(checkins)
    const recommendedTopics = generateRecommendedTopics(checkins)

    return {
      weekOf: start,
      daysActive: checkins.length,
      activeDates,
      keyMoments,
      recommendedTopics,
      totalCheckins: checkins.length,
    }
  } catch (err) {
    console.error('[CheckinPatterns] Error generating weekly summary:', err)
    return defaultResult
  }
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Calculate the user's current check-in streak — unchanged, this was
 * already presence-based (checks for a row on each consecutive date) and
 * never touched mood/connection_score.
 * @param {string} userId
 * @returns {Promise<number>} Streak in days
 */
async function calculateStreak(userId) {
  const today = formatDate(new Date())

  const supabase = await getSupabase()
  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('check_date')
    .eq('user_id', userId)
    .order('check_date', { ascending: false })
    .limit(60) // Max reasonable streak to check

  if (!checkins || checkins.length === 0) return 0

  const checkedInToday = checkins[0]?.check_date === today
  if (!checkedInToday) return 0

  let streak = 1
  let expectedDate = new Date(today)

  for (let i = 1; i < checkins.length; i++) {
    expectedDate.setDate(expectedDate.getDate() - 1)
    const expectedDateStr = formatDate(expectedDate)

    if (checkins[i].check_date === expectedDateStr) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * Compare check-in count in the first half of the window vs the second
 * half — same 'improving'/'declining'/'stable' shape the old mood-trend
 * function used, just counting presence instead of averaging a score.
 */
function calculateEngagementTrend(checkins, daysBack) {
  if (!checkins || checkins.length < 4) return 'stable'

  const midpoint = new Date()
  midpoint.setDate(midpoint.getDate() - Math.floor(daysBack / 2))

  const firstHalf = checkins.filter(c => new Date(c.check_date) < midpoint).length
  const secondHalf = checkins.filter(c => new Date(c.check_date) >= midpoint).length

  if (secondHalf - firstHalf >= 2) return 'improving'
  if (firstHalf - secondHalf >= 2) return 'declining'
  return 'stable'
}

/**
 * Bucket check-ins into 7-day weeks ending today (week 0 = most recent 7
 * days, week 1 = the 7 days before that, etc.) and return per-user counts
 * for a given week index.
 */
function weekBucketCounts(checkins, weekIndex) {
  const today = new Date()
  const windowEnd = new Date(today)
  windowEnd.setDate(windowEnd.getDate() - (weekIndex * 7))
  const windowStart = new Date(windowEnd)
  windowStart.setDate(windowStart.getDate() - 6)

  const counts = {}
  for (const c of checkins) {
    const d = new Date(c.check_date)
    if (d >= windowStart && d <= windowEnd) {
      counts[c.user_id] = (counts[c.user_id] || 0) + 1
    }
  }
  return counts
}

/**
 * Couple-level drift detection — deliberately conservative. See
 * DRIFT_THRESHOLDS' comment for why: a single imbalanced window isn't
 * trusted on its own, only the same imbalance repeating across the two
 * most recent complete weeks independently.
 */
function detectPersistentDrift(checkins, userIdsSeen) {
  const [id1, id2] = userIdsSeen
  const { minMoreActiveCount, maxLessActiveRatio, weeksRequired } = DRIFT_THRESHOLDS

  const weeklyResults = []
  for (let week = 0; week < weeksRequired; week++) {
    const counts = weekBucketCounts(checkins, week)
    const c1 = counts[id1] || 0
    const c2 = counts[id2] || 0
    const maxCount = Math.max(c1, c2)
    const minCount = Math.min(c1, c2)
    const moreActiveUserId = c1 >= c2 ? id1 : id2
    const lessActiveUserId = c1 >= c2 ? id2 : id1
    const imbalanced = maxCount >= minMoreActiveCount && (maxCount === 0 ? false : minCount / maxCount <= maxLessActiveRatio)
    weeklyResults.push({ imbalanced, moreActiveUserId, lessActiveUserId, moreActiveCount: maxCount, lessActiveCount: minCount })
  }

  const allWeeksImbalanced = weeklyResults.every(w => w.imbalanced)
  // Also require the SAME partner to be the less-active one across every
  // week — if it flips who's showing up less, that's not a pattern, that's
  // just two different weeks.
  const samePartnerThroughout = weeklyResults.every(w => w.lessActiveUserId === weeklyResults[0].lessActiveUserId)

  if (!allWeeksImbalanced || !samePartnerThroughout) return null

  const mostRecent = weeklyResults[0]
  return {
    type: 'partner_drift',
    moreActiveUserId: mostRecent.moreActiveUserId,
    lessActiveUserId: mostRecent.lessActiveUserId,
    moreActiveCount: mostRecent.moreActiveCount,
    lessActiveCount: mostRecent.lessActiveCount,
    weeksConfirmed: weeksRequired,
  }
}

/**
 * Find positive patterns worth celebrating
 */
function findPositivePatterns(checkins, streakDays, engagementTrend) {
  const patterns = []

  if (streakDays >= 30) {
    patterns.push({ type: 'streak_milestone', description: `Amazing ${streakDays}-day check-in streak!`, milestone: 30 })
  } else if (streakDays >= 14) {
    patterns.push({ type: 'streak_milestone', description: `${streakDays}-day streak — you're building a great habit!`, milestone: 14 })
  } else if (streakDays >= 7) {
    patterns.push({ type: 'streak_milestone', description: `${streakDays}-day streak — one week strong!`, milestone: 7 })
  } else if (streakDays >= 3) {
    patterns.push({ type: 'consistency', description: `${streakDays}-day check-in streak` })
  }

  if (engagementTrend === 'improving') {
    patterns.push({ type: 'engagement_improvement', description: "You've been showing up more lately!" })
  }

  const today = formatDate(new Date())
  const recent = checkins.filter(c => daysBetween(today, c.check_date) <= 7)
  if (recent.length >= 6) {
    patterns.push({ type: 'high_consistency', description: 'You checked in almost every day this week!' })
  }

  return patterns
}

/**
 * Generate user-specific insights based on WHEN they tend to show up (or
 * not) — day-of-week and weekend/weekday presence patterns.
 */
function generateInsights(checkins, daysBack) {
  const insights = []

  if (checkins.length < 7) {
    insights.push('Keep checking in to discover your patterns!')
    return insights
  }

  const byDayOfWeek = {}
  checkins.forEach(c => {
    const day = getDayOfWeek(c.check_date)
    byDayOfWeek[day] = (byDayOfWeek[day] || 0) + 1
  })

  const sortedDays = Object.entries(byDayOfWeek).sort((a, b) => b[1] - a[1])
  if (sortedDays.length >= 5) {
    insights.push(`You check in most consistently on ${sortedDays[0][0]}s`)
    const leastDay = sortedDays[sortedDays.length - 1]
    if (leastDay[1] <= sortedDays[0][1] / 2) {
      insights.push(`${leastDay[0]}s are when you're most likely to miss a check-in`)
    }
  }

  const weekendCount = checkins.filter(c => isWeekend(c.check_date)).length
  const weekdayCount = checkins.length - weekendCount
  const weeksInWindow = daysBack / 7
  if (weeksInWindow >= 2) {
    const weekendRate = weekendCount / (weeksInWindow * 2)
    const weekdayRate = weekdayCount / (weeksInWindow * 5)
    if (weekendRate - weekdayRate >= 0.3) {
      insights.push('You check in more reliably on weekends')
    } else if (weekdayRate - weekendRate >= 0.3) {
      insights.push('You check in more reliably during the week')
    }
  }

  if (insights.length === 0) {
    insights.push('Keep tracking to discover more about your patterns!')
  }

  return insights
}

/**
 * Generate couple-specific insights from shared presence, not shared mood.
 */
function generateCoupleInsights(totalDaysInWindow, sharedActiveDays, driftAlert) {
  const insights = []

  if (totalDaysInWindow > 0) {
    const sharedRate = Math.round((sharedActiveDays / totalDaysInWindow) * 100)
    if (sharedRate >= 60) {
      insights.push("You two tend to check in on the same days — you're in sync")
    }
  }

  if (driftAlert) {
    // Deliberately soft, non-diagnostic phrasing — this string is a
    // display-layer insight, not a clinical read. See
    // lib/nora-memory.js's SIGNAL_TYPES.ENGAGEMENT_PATTERN lens for the
    // fuller reasoning: presence data alone can't distinguish genuine
    // drift from an ordinary busy week, so nothing derived from driftAlert
    // should ever assert drift as settled fact.
    insights.push("Check-in rhythm has looked a little uneven between you two lately — worth a soft check-in with each other, not a verdict")
  }

  if (insights.length === 0) {
    insights.push('Keep checking in together to discover your couple patterns!')
  }

  return insights
}

/**
 * Generate key moments for weekly summary
 */
function generateKeyMoments(checkins) {
  const moments = []

  moments.push(`You checked in ${checkins.length} time${checkins.length !== 1 ? 's' : ''} this week`)

  if (checkins.length >= 5) {
    moments.push('A strong week of staying connected to your daily activities')
  } else if (checkins.length <= 2) {
    moments.push('A quieter week than usual')
  }

  return moments.slice(0, 4)
}

/**
 * Generate recommended discussion topics for weekly review
 */
function generateRecommendedTopics(checkins) {
  const topics = []

  if (checkins.length < 3) {
    topics.push("Talk about what's making it hard to check in lately")
  }

  topics.push('Plan something fun for the coming week')

  return topics.slice(0, 3)
}

// ============================================================================
// Exports
// ============================================================================

export default {
  analyzeUserPatterns,
  analyzeCouplePatterns,
  computeCouplePatterns,
  detectConcerns,
  generateWeeklySummary,
}
