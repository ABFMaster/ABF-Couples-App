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

import { supabase } from '@/lib/supabase'

// Thresholds for concern detection
const CONCERN_THRESHOLDS = {
  silenceDays: 3,           // Alert after 3+ consecutive days with no check-in
  lowEngagementRatio: 0.5,  // Alert if checked in less than half the expected days
  declineRatio: 0.5,        // Alert if this week's check-in count is <= half last week's
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
 * Compare both partners' check-in presence to spot drift between them —
 * the couple-level version of "who's showing up and who isn't."
 *
 * @param {string} coupleId - Couple's UUID
 * @param {number} daysBack - Number of days to analyze (default 30)
 * @returns {Promise<Object>} Couple pattern analysis results
 */
export async function analyzeCouplePatterns(coupleId, daysBack = 30) {
  const defaultResult = {
    balanceScore: 0,
    driftAlert: null,
    sharedActiveDays: 0,
    coupleInsights: ['Start checking in to see your patterns!'],
    daysCompared: 0,
    periodDays: daysBack,
  }

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const { data: allCheckins, error } = await supabase
      .from('daily_checkins')
      .select('check_date, user_id')
      .eq('couple_id', coupleId)
      .gte('check_date', formatDate(startDate))
      .lte('check_date', formatDate(endDate))
      .order('check_date', { ascending: true })

    if (error) {
      console.error('[CheckinPatterns] Error fetching couple check-ins:', error)
      return defaultResult
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
    // are — 100 means identical counts, dropping toward 0 as the gap widens.
    let balanceScore = 0
    let driftAlert = null
    if (userIdsSeen.length === 2) {
      const [id1, id2] = userIdsSeen
      const c1 = countByUser[id1] || 0
      const c2 = countByUser[id2] || 0
      const maxCount = Math.max(c1, c2)
      balanceScore = maxCount > 0 ? Math.round((Math.min(c1, c2) / maxCount) * 100) : 100

      // Only flag real drift once there's enough data to trust the
      // comparison (5+ check-ins from the more active partner) and the gap
      // is wide (the less active partner at 40% or less of the other's count).
      if (maxCount >= 5 && balanceScore <= 40) {
        driftAlert = {
          type: 'partner_drift',
          moreActiveUserId: c1 >= c2 ? id1 : id2,
          lessActiveUserId: c1 >= c2 ? id2 : id1,
          moreActiveCount: maxCount,
          lessActiveCount: Math.min(c1, c2),
        }
      }
    }

    const coupleInsights = generateCoupleInsights(totalDaysInWindow, sharedActiveDays, driftAlert)

    return {
      balanceScore,
      driftAlert,
      sharedActiveDays,
      coupleInsights,
      daysCompared: totalDaysInWindow,
      periodDays: daysBack,
    }
  } catch (err) {
    console.error('[CheckinPatterns] Error analyzing couple patterns:', err)
    return defaultResult
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
    insights.push('One of you has been showing up a lot more than the other lately')
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
  detectConcerns,
  generateWeeklySummary,
}
