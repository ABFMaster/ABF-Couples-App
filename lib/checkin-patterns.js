// ============================================================================
// Check-in Pattern Analysis System
// ============================================================================
// Analyzes daily check-in data to detect trends, concerns, and insights.
// Powers dashboard widgets, weekly summaries, and AI coach recommendations.
// ============================================================================

import { supabase } from '@/lib/supabase'

// ============================================================================
// Constants
// ============================================================================

// Map mood strings to numeric values for trend analysis
// Higher numbers = better mood
const MOOD_VALUES = {
  amazing: 5,   // Note: Some places use 'amazing', others use 'great'
  great: 5,
  good: 4,
  okay: 3,
  down: 2,
  stressed: 1,
  struggling: 1,
}

// Reverse mapping for display
const MOOD_LABELS = {
  5: 'great',
  4: 'good',
  3: 'okay',
  2: 'down',
  1: 'stressed',
}

// Thresholds for concern detection
const CONCERN_THRESHOLDS = {
  consecutiveStressDays: 3,      // Alert after 3+ days of stressed/down
  lowConnectionDays: 3,          // Alert after 3+ days with connection < 3
  connectionDropPoints: 2,       // Alert if connection drops 2+ points
  connectionDropWindow: 3,       // ...within this many days
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert mood string to numeric value
 * @param {string} mood - Mood string (great, good, okay, down, stressed)
 * @returns {number} Numeric value 1-5
 */
function moodToNumber(mood) {
  return MOOD_VALUES[mood?.toLowerCase()] || 3 // Default to 'okay' if unknown
}

/**
 * Calculate average of an array of numbers
 * @param {number[]} arr - Array of numbers
 * @returns {number} Average, or 0 if empty
 */
function average(arr) {
  if (!arr || arr.length === 0) return 0
  return arr.reduce((sum, val) => sum + val, 0) / arr.length
}

/**
 * Determine trend by comparing first half vs second half of values
 * @param {number[]} values - Array of numeric values (oldest first)
 * @returns {'improving' | 'declining' | 'stable'} Trend direction
 */
function calculateTrend(values) {
  if (!values || values.length < 4) return 'stable'

  const midpoint = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, midpoint)
  const secondHalf = values.slice(midpoint)

  const firstAvg = average(firstHalf)
  const secondAvg = average(secondHalf)

  // Require at least 0.3 difference to call it a trend
  const threshold = 0.3

  if (secondAvg - firstAvg > threshold) return 'improving'
  if (firstAvg - secondAvg > threshold) return 'declining'
  return 'stable'
}

/**
 * Get day of week name from date
 * @param {Date} date
 * @returns {string} Day name (Monday, Tuesday, etc.)
 */
function getDayOfWeek(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Check if a date is a weekend
 * @param {string|Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const day = new Date(date).getDay()
  return day === 0 || day === 6
}

/**
 * Format date as YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]
}

// ============================================================================
// Main Analysis Functions
// ============================================================================

/**
 * Analyze patterns in a single user's check-ins
 *
 * @param {string} userId - User's UUID
 * @param {number} daysBack - Number of days to analyze (default 30)
 * @returns {Promise<Object>} Pattern analysis results
 */
export async function analyzeUserPatterns(userId, daysBack = 30) {
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  // Fetch user's check-ins for the period
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('check_date', formatDate(startDate))
    .lte('check_date', formatDate(endDate))
    .order('check_date', { ascending: true })

  if (error) {
    console.error('[CheckinPatterns] Error fetching check-ins:', error)
    return null
  }

  if (!checkins || checkins.length === 0) {
    return {
      moodTrend: 'stable',
      moodAverage: 0,
      connectionTrend: 'stable',
      connectionAverage: 0,
      streakDays: 0,
      concernFlags: [],
      positivePatterns: [],
      insights: ['Start checking in daily to see your patterns!'],
    }
  }

  // Extract numeric values for analysis
  const moodValues = checkins.map(c => moodToNumber(c.mood))
  const connectionValues = checkins.map(c => c.connection_score)

  // Calculate trends and averages
  const moodTrend = calculateTrend(moodValues)
  const moodAverage = Math.round(average(moodValues) * 10) / 10
  const connectionTrend = calculateTrend(connectionValues)
  const connectionAverage = Math.round(average(connectionValues) * 10) / 10

  // Calculate streak (consecutive days up to today)
  const streakDays = await calculateStreak(userId)

  // Detect concerns
  const concernFlags = detectConcerns(userId, checkins)

  // Find positive patterns
  const positivePatterns = findPositivePatterns(checkins, streakDays, moodTrend, connectionTrend)

  // Generate insights
  const insights = generateInsights(checkins)

  return {
    moodTrend,
    moodAverage,
    connectionTrend,
    connectionAverage,
    streakDays,
    concernFlags,
    positivePatterns,
    insights,
    // Include raw data for advanced analysis
    totalCheckins: checkins.length,
    periodDays: daysBack,
  }
}

/**
 * Analyze patterns between both partners in a couple
 *
 * @param {string} coupleId - Couple's UUID
 * @param {number} daysBack - Number of days to analyze (default 30)
 * @returns {Promise<Object>} Couple pattern analysis results
 */
export async function analyzeCouplePatterns(coupleId, daysBack = 30) {
  // Calculate date range
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)

  // Fetch all check-ins for the couple
  const { data: allCheckins, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('couple_id', coupleId)
    .gte('check_date', formatDate(startDate))
    .lte('check_date', formatDate(endDate))
    .order('check_date', { ascending: true })

  if (error) {
    console.error('[CheckinPatterns] Error fetching couple check-ins:', error)
    return null
  }

  if (!allCheckins || allCheckins.length === 0) {
    return {
      alignmentScore: 0,
      divergenceAlerts: [],
      sharedHighs: [],
      sharedLows: [],
      coupleInsights: ['Start checking in together to see your patterns!'],
    }
  }

  // Group check-ins by date and user
  const byDate = {}
  allCheckins.forEach(checkin => {
    if (!byDate[checkin.check_date]) {
      byDate[checkin.check_date] = {}
    }
    byDate[checkin.check_date][checkin.user_id] = checkin
  })

  // Analyze dates where both partners checked in
  const divergenceAlerts = []
  const sharedHighs = []
  const sharedLows = []
  let alignmentDays = 0
  let totalComparedDays = 0

  Object.entries(byDate).forEach(([date, users]) => {
    const userIds = Object.keys(users)

    // Only analyze days where both partners checked in
    if (userIds.length !== 2) return

    totalComparedDays++

    const [user1Id, user2Id] = userIds
    const user1 = users[user1Id]
    const user2 = users[user2Id]

    const mood1 = moodToNumber(user1.mood)
    const mood2 = moodToNumber(user2.mood)
    const conn1 = user1.connection_score
    const conn2 = user2.connection_score

    const moodDiff = Math.abs(mood1 - mood2)
    const connDiff = Math.abs(conn1 - conn2)

    // Check for alignment (moods within 1 point AND connection within 1 point)
    if (moodDiff <= 1 && connDiff <= 1) {
      alignmentDays++
    }

    // Detect divergence (significant gap in how partners feel)
    if (moodDiff >= 2 || connDiff >= 2) {
      divergenceAlerts.push({
        date,
        user1Mood: user1.mood,
        user2Mood: user2.mood,
        user1Connection: conn1,
        user2Connection: conn2,
        connectionGap: connDiff,
        moodGap: moodDiff,
      })
    }

    // Track shared highs (both feeling great and connected)
    if (mood1 >= 4 && mood2 >= 4 && conn1 >= 4 && conn2 >= 4) {
      sharedHighs.push({
        date,
        user1Mood: user1.mood,
        user2Mood: user2.mood,
        avgConnection: (conn1 + conn2) / 2,
      })
    }

    // Track shared lows (both struggling)
    if ((mood1 <= 2 && mood2 <= 2) || (conn1 <= 2 && conn2 <= 2)) {
      sharedLows.push({
        date,
        user1Mood: user1.mood,
        user2Mood: user2.mood,
        avgConnection: (conn1 + conn2) / 2,
      })
    }
  })

  // Calculate alignment score (0-100)
  const alignmentScore = totalComparedDays > 0
    ? Math.round((alignmentDays / totalComparedDays) * 100)
    : 0

  // Generate couple-specific insights
  const coupleInsights = generateCoupleInsights(byDate, sharedHighs, sharedLows, divergenceAlerts)

  return {
    alignmentScore,
    divergenceAlerts: divergenceAlerts.slice(-5), // Most recent 5
    sharedHighs: sharedHighs.slice(-5),
    sharedLows: sharedLows.slice(-3),
    coupleInsights,
    // Stats for context
    daysCompared: totalComparedDays,
    periodDays: daysBack,
  }
}

/**
 * Quick check for immediate concerns in recent check-ins
 * Used for real-time alerting and crisis detection
 *
 * @param {string} userId - User's UUID (used for logging)
 * @param {Array} recentCheckins - Array of recent check-in objects
 * @returns {Array} Array of concern objects with type, severity, description
 */
export function detectConcerns(userId, recentCheckins) {
  const concerns = []

  if (!recentCheckins || recentCheckins.length === 0) {
    return concerns
  }

  // Sort by date descending (most recent first) for analysis
  const sorted = [...recentCheckins].sort((a, b) =>
    new Date(b.check_date) - new Date(a.check_date)
  )

  // CONCERN 1: Consecutive stressed/down days
  // Count how many of the last N days were stressed or down
  let consecutiveStress = 0
  for (const checkin of sorted) {
    const moodValue = moodToNumber(checkin.mood)
    if (moodValue <= 2) { // down or stressed
      consecutiveStress++
    } else {
      break // Streak broken
    }
  }

  if (consecutiveStress >= CONCERN_THRESHOLDS.consecutiveStressDays) {
    concerns.push({
      type: 'consecutive_stress',
      severity: consecutiveStress >= 5 ? 'high' : 'medium',
      description: `Stressed or down for ${consecutiveStress} consecutive days`,
      daysAffected: consecutiveStress,
    })
  }

  // CONCERN 2: Low connection score for multiple days
  // Check last 7 days for connection < 3
  const recentConnections = sorted.slice(0, 7)
  const lowConnectionDays = recentConnections.filter(c => c.connection_score < 3).length

  if (lowConnectionDays >= CONCERN_THRESHOLDS.lowConnectionDays) {
    concerns.push({
      type: 'low_connection',
      severity: lowConnectionDays >= 5 ? 'high' : 'medium',
      description: `Connection score below 3 for ${lowConnectionDays} of the last 7 days`,
      daysAffected: lowConnectionDays,
    })
  }

  // CONCERN 3: Sudden connection drop
  // Compare most recent 3 days to 3 days before that
  if (sorted.length >= 6) {
    const recent3 = sorted.slice(0, 3)
    const previous3 = sorted.slice(3, 6)

    const recentAvg = average(recent3.map(c => c.connection_score))
    const previousAvg = average(previous3.map(c => c.connection_score))

    const drop = previousAvg - recentAvg

    if (drop >= CONCERN_THRESHOLDS.connectionDropPoints) {
      concerns.push({
        type: 'connection_drop',
        severity: drop >= 3 ? 'high' : 'medium',
        description: `Connection dropped from ${previousAvg.toFixed(1)} to ${recentAvg.toFixed(1)}`,
        dropAmount: Math.round(drop * 10) / 10,
      })
    }
  }

  // CONCERN 4: Consistently not checking in (engagement drop)
  // This would need to compare expected days vs actual check-ins
  const today = new Date()
  const expectedDays = Math.min(7, sorted.length > 0 ?
    Math.ceil((today - new Date(sorted[sorted.length - 1].check_date)) / (1000 * 60 * 60 * 24)) : 7
  )

  if (recentCheckins.length < expectedDays * 0.5 && expectedDays >= 5) {
    concerns.push({
      type: 'low_engagement',
      severity: 'low',
      description: `Only ${recentCheckins.length} check-ins in the last ${expectedDays} days`,
    })
  }

  return concerns
}

/**
 * Generate a weekly summary for the review feature
 *
 * @param {string} userId - User's UUID
 * @param {string|Date} startDate - Start of the week
 * @param {string|Date} endDate - End of the week
 * @returns {Promise<Object>} Weekly summary data
 */
export async function generateWeeklySummary(userId, startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : formatDate(startDate)
  const end = typeof endDate === 'string' ? endDate : formatDate(endDate)

  // Fetch check-ins for the week
  const { data: checkins, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .gte('check_date', start)
    .lte('check_date', end)
    .order('check_date', { ascending: true })

  if (error) {
    console.error('[CheckinPatterns] Error fetching weekly check-ins:', error)
    return null
  }

  if (!checkins || checkins.length === 0) {
    return {
      weekOf: start,
      moodDistribution: { great: 0, good: 0, okay: 0, down: 0, stressed: 0 },
      avgConnection: 0,
      bestDay: null,
      worstDay: null,
      keyMoments: ['No check-ins this week'],
      recommendedTopics: ['Start checking in to track your week!'],
      totalCheckins: 0,
    }
  }

  // Calculate mood distribution
  const moodDistribution = { great: 0, good: 0, okay: 0, down: 0, stressed: 0 }
  checkins.forEach(c => {
    const normalizedMood = c.mood === 'amazing' ? 'great' :
                          c.mood === 'struggling' ? 'stressed' : c.mood
    if (moodDistribution.hasOwnProperty(normalizedMood)) {
      moodDistribution[normalizedMood]++
    }
  })

  // Calculate average connection
  const avgConnection = Math.round(
    average(checkins.map(c => c.connection_score)) * 10
  ) / 10

  // Find best and worst days
  // Best: highest combined mood + connection
  // Worst: lowest combined score
  let bestDay = null
  let worstDay = null
  let bestScore = -Infinity
  let worstScore = Infinity

  checkins.forEach(c => {
    const score = moodToNumber(c.mood) + c.connection_score

    if (score > bestScore) {
      bestScore = score
      bestDay = {
        date: c.check_date,
        dayOfWeek: getDayOfWeek(c.check_date),
        mood: c.mood,
        connection: c.connection_score,
        why: isWeekend(c.check_date) ? 'Weekend together' : null,
      }
    }

    if (score < worstScore) {
      worstScore = score
      worstDay = {
        date: c.check_date,
        dayOfWeek: getDayOfWeek(c.check_date),
        mood: c.mood,
        connection: c.connection_score,
      }
    }
  })

  // Generate key moments (notable observations)
  const keyMoments = generateKeyMoments(checkins, bestDay, worstDay)

  // Generate recommended discussion topics
  const recommendedTopics = generateRecommendedTopics(checkins, bestDay, worstDay, moodDistribution)

  return {
    weekOf: start,
    moodDistribution,
    avgConnection,
    bestDay,
    worstDay,
    keyMoments,
    recommendedTopics,
    totalCheckins: checkins.length,
  }
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Calculate the user's current check-in streak
 * @param {string} userId
 * @returns {Promise<number>} Streak in days
 */
async function calculateStreak(userId) {
  const today = formatDate(new Date())

  // Fetch recent check-ins ordered by date descending
  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('check_date')
    .eq('user_id', userId)
    .order('check_date', { ascending: false })
    .limit(60) // Max reasonable streak to check

  if (!checkins || checkins.length === 0) return 0

  // Check if user checked in today
  const checkedInToday = checkins[0]?.check_date === today
  if (!checkedInToday) return 0

  // Count consecutive days backwards from today
  let streak = 1
  let expectedDate = new Date(today)

  for (let i = 1; i < checkins.length; i++) {
    expectedDate.setDate(expectedDate.getDate() - 1)
    const expectedDateStr = formatDate(expectedDate)

    if (checkins[i].check_date === expectedDateStr) {
      streak++
    } else {
      break // Streak broken
    }
  }

  return streak
}

/**
 * Find positive patterns worth celebrating
 * @param {Array} checkins - User's check-ins
 * @param {number} streakDays - Current streak
 * @param {string} moodTrend - Mood trend direction
 * @param {string} connectionTrend - Connection trend direction
 * @returns {Array} Positive pattern objects
 */
function findPositivePatterns(checkins, streakDays, moodTrend, connectionTrend) {
  const patterns = []

  // Streak milestones
  if (streakDays >= 30) {
    patterns.push({
      type: 'streak_milestone',
      description: `Amazing ${streakDays}-day check-in streak!`,
      milestone: 30,
    })
  } else if (streakDays >= 14) {
    patterns.push({
      type: 'streak_milestone',
      description: `${streakDays}-day streak - you're building a great habit!`,
      milestone: 14,
    })
  } else if (streakDays >= 7) {
    patterns.push({
      type: 'streak_milestone',
      description: `${streakDays}-day streak - one week strong!`,
      milestone: 7,
    })
  } else if (streakDays >= 3) {
    patterns.push({
      type: 'consistency',
      description: `${streakDays}-day check-in streak`,
    })
  }

  // Improving trends
  if (moodTrend === 'improving') {
    patterns.push({
      type: 'mood_improvement',
      description: 'Your mood has been trending up!',
    })
  }

  if (connectionTrend === 'improving') {
    patterns.push({
      type: 'connection_improvement',
      description: 'You\'re feeling more connected lately!',
    })
  }

  // High averages (last 7 days)
  const recent = checkins.slice(-7)
  if (recent.length >= 3) {
    const recentMoodAvg = average(recent.map(c => moodToNumber(c.mood)))
    const recentConnAvg = average(recent.map(c => c.connection_score))

    if (recentMoodAvg >= 4) {
      patterns.push({
        type: 'high_mood',
        description: 'You\'ve been feeling great this week!',
      })
    }

    if (recentConnAvg >= 4) {
      patterns.push({
        type: 'strong_connection',
        description: 'Strong connection with your partner this week!',
      })
    }
  }

  return patterns
}

/**
 * Generate user-specific insights based on patterns in data
 * @param {Array} checkins - User's check-ins
 * @returns {Array} Insight strings
 */
function generateInsights(checkins) {
  const insights = []

  if (checkins.length < 7) {
    insights.push('Keep checking in to discover your patterns!')
    return insights
  }

  // Analyze by day of week
  const byDayOfWeek = {}
  checkins.forEach(c => {
    const day = getDayOfWeek(c.check_date)
    if (!byDayOfWeek[day]) {
      byDayOfWeek[day] = { moods: [], connections: [] }
    }
    byDayOfWeek[day].moods.push(moodToNumber(c.mood))
    byDayOfWeek[day].connections.push(c.connection_score)
  })

  // Find best/worst days of week
  let bestDay = null
  let bestDayScore = -1
  let worstDay = null
  let worstDayScore = 6

  Object.entries(byDayOfWeek).forEach(([day, data]) => {
    if (data.moods.length >= 2) { // Need at least 2 samples
      const avgScore = (average(data.moods) + average(data.connections)) / 2
      if (avgScore > bestDayScore) {
        bestDayScore = avgScore
        bestDay = day
      }
      if (avgScore < worstDayScore) {
        worstDayScore = avgScore
        worstDay = day
      }
    }
  })

  if (bestDay && bestDayScore >= 3.5) {
    insights.push(`You tend to feel best on ${bestDay}s`)
  }

  if (worstDay && worstDayScore < 3 && worstDay !== bestDay) {
    insights.push(`${worstDay}s tend to be more challenging for you`)
  }

  // Weekend vs weekday comparison
  const weekendCheckins = checkins.filter(c => isWeekend(c.check_date))
  const weekdayCheckins = checkins.filter(c => !isWeekend(c.check_date))

  if (weekendCheckins.length >= 3 && weekdayCheckins.length >= 5) {
    const weekendConnAvg = average(weekendCheckins.map(c => c.connection_score))
    const weekdayConnAvg = average(weekdayCheckins.map(c => c.connection_score))

    if (weekendConnAvg - weekdayConnAvg >= 0.5) {
      insights.push('You feel more connected on weekends')
    } else if (weekdayConnAvg - weekendConnAvg >= 0.5) {
      insights.push('Interestingly, you feel more connected during the week')
    }
  }

  // If no specific insights, add generic encouragement
  if (insights.length === 0) {
    insights.push('Keep tracking to discover more about your patterns!')
  }

  return insights
}

/**
 * Generate couple-specific insights
 * @param {Object} byDate - Check-ins organized by date
 * @param {Array} sharedHighs - Dates when both felt great
 * @param {Array} sharedLows - Dates when both struggled
 * @param {Array} divergenceAlerts - Days with significant differences
 * @returns {Array} Insight strings
 */
function generateCoupleInsights(byDate, sharedHighs, sharedLows, divergenceAlerts) {
  const insights = []

  // Analyze shared highs by day of week
  if (sharedHighs.length >= 2) {
    const highDays = {}
    sharedHighs.forEach(h => {
      const day = getDayOfWeek(h.date)
      highDays[day] = (highDays[day] || 0) + 1
    })

    const mostCommonHighDay = Object.entries(highDays)
      .sort((a, b) => b[1] - a[1])[0]

    if (mostCommonHighDay && mostCommonHighDay[1] >= 2) {
      insights.push(`You both feel most connected on ${mostCommonHighDay[0]}s`)
    }
  }

  // Check for weekend patterns
  const weekendHighs = sharedHighs.filter(h => isWeekend(h.date))
  if (weekendHighs.length >= sharedHighs.length * 0.6 && sharedHighs.length >= 2) {
    insights.push('Weekends tend to be your best times together')
  }

  // Check for midweek stress pattern
  const midweekDiverges = divergenceAlerts.filter(d => {
    const day = new Date(d.date).getDay()
    return day >= 2 && day <= 4 // Tuesday-Thursday
  })

  if (midweekDiverges.length >= divergenceAlerts.length * 0.5 && divergenceAlerts.length >= 2) {
    insights.push('Stress tends to spike mid-week for both of you')
  }

  // Recent improvement
  const dates = Object.keys(byDate).sort()
  if (dates.length >= 7) {
    const recentDates = dates.slice(-3)
    const recentHighs = recentDates.filter(d => sharedHighs.some(h => h.date === d))

    if (recentHighs.length >= 2) {
      insights.push("You've both been feeling great together recently!")
    }
  }

  // If divergence is common, suggest conversation
  if (divergenceAlerts.length >= 3) {
    insights.push("You've had some days where you felt differently - might be worth checking in")
  }

  // Fallback
  if (insights.length === 0) {
    insights.push('Keep checking in together to discover your couple patterns!')
  }

  return insights
}

/**
 * Generate key moments for weekly summary
 */
function generateKeyMoments(checkins, bestDay, worstDay) {
  const moments = []

  if (bestDay) {
    const moodValue = moodToNumber(bestDay.mood)
    if (moodValue >= 4 && bestDay.connection >= 4) {
      moments.push(`${bestDay.dayOfWeek} was a great day - you felt ${bestDay.mood} and very connected`)
    }
  }

  if (worstDay && worstDay.date !== bestDay?.date) {
    const moodValue = moodToNumber(worstDay.mood)
    if (moodValue <= 2 || worstDay.connection <= 2) {
      moments.push(`${worstDay.dayOfWeek} was challenging - you felt ${worstDay.mood}`)
    }
  }

  // Look for mood swings (big day-to-day changes)
  for (let i = 1; i < checkins.length; i++) {
    const prev = checkins[i - 1]
    const curr = checkins[i]
    const moodChange = moodToNumber(curr.mood) - moodToNumber(prev.mood)

    if (moodChange >= 2) {
      moments.push(`Mood improved significantly on ${getDayOfWeek(curr.check_date)}`)
      break // Only report one
    } else if (moodChange <= -2) {
      moments.push(`Mood dropped on ${getDayOfWeek(curr.check_date)}`)
      break
    }
  }

  // Add check-in count
  moments.push(`You checked in ${checkins.length} time${checkins.length !== 1 ? 's' : ''} this week`)

  return moments.slice(0, 4) // Max 4 moments
}

/**
 * Generate recommended discussion topics for weekly review
 */
function generateRecommendedTopics(checkins, bestDay, worstDay, moodDistribution) {
  const topics = []

  // If there was a tough day, suggest discussing
  if (worstDay && moodToNumber(worstDay.mood) <= 2) {
    topics.push(`Talk about what made ${worstDay.dayOfWeek} difficult`)
  }

  // If there was a great day, celebrate
  if (bestDay && moodToNumber(bestDay.mood) >= 4 && bestDay.connection >= 4) {
    topics.push(`Celebrate what made ${bestDay.dayOfWeek} so good!`)
  }

  // If lots of stressed days, suggest support conversation
  const stressedDays = moodDistribution.stressed + moodDistribution.down
  if (stressedDays >= 3) {
    topics.push('Check in about stress levels and how to support each other')
  }

  // If connection was low on average
  const avgConnection = average(checkins.map(c => c.connection_score))
  if (avgConnection < 3) {
    topics.push('Discuss ways to feel more connected this week')
  }

  // Plan something positive
  topics.push('Plan something fun for the coming week')

  return topics.slice(0, 3) // Max 3 topics
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
