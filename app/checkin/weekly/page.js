'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MOOD_OPTIONS } from '@/lib/checkin-questions'
import { generateWeeklySummary, analyzeCouplePatterns } from '@/lib/checkin-patterns'

// ============================================================================
// Constants
// ============================================================================

// Mood value mapping for charts
const MOOD_VALUES = {
  amazing: 5,
  great: 5,
  good: 4,
  okay: 3,
  down: 2,
  stressed: 1,
  struggling: 1,
}

// Chart colors
const CHART_COLORS = {
  user: {
    line: '#C9184A',
    fill: 'rgba(201, 24, 74, 0.1)',
    gradient: ['#FF6B9D', '#C9184A'],
  },
  partner: {
    line: '#2563EB',
    fill: 'rgba(37, 99, 235, 0.1)',
    gradient: ['#60A5FA', '#2563EB'],
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the start and end dates for a week
 * @param {number} weeksAgo - 0 = current week, 1 = last week, etc.
 * @returns {{ start: Date, end: Date }}
 */
function getWeekDates(weeksAgo = 1) {
  const today = new Date()
  const dayOfWeek = today.getDay()

  // Calculate start of current week (Sunday)
  const startOfCurrentWeek = new Date(today)
  startOfCurrentWeek.setDate(today.getDate() - dayOfWeek)
  startOfCurrentWeek.setHours(0, 0, 0, 0)

  // Go back the specified number of weeks
  const startOfTargetWeek = new Date(startOfCurrentWeek)
  startOfTargetWeek.setDate(startOfTargetWeek.getDate() - (weeksAgo * 7))

  const endOfTargetWeek = new Date(startOfTargetWeek)
  endOfTargetWeek.setDate(endOfTargetWeek.getDate() + 6)

  return { start: startOfTargetWeek, end: endOfTargetWeek }
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  return date.toISOString().split('T')[0]
}

/**
 * Format date for display (e.g., "Feb 9")
 */
function formatDisplayDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Get day of week abbreviation
 */
function getDayAbbrev(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Get mood value for chart
 */
function getMoodValue(mood) {
  return MOOD_VALUES[mood?.toLowerCase()] || 3
}

/**
 * Get mood emoji from value
 */
function getMoodEmoji(mood) {
  const option = MOOD_OPTIONS.find(m => m.value === mood)
  return option?.emoji || '😐'
}

// ============================================================================
// Chart Components
// ============================================================================

/**
 * Simple line chart with gradient fill
 */
function LineChart({ data, userKey, partnerKey, maxY = 5, height = 160 }) {
  const width = 100 // Percentage-based
  const padding = { top: 20, right: 10, bottom: 30, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Generate points for user line
  const userPoints = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - ((d[userKey] || 0) / maxY) * chartHeight
    return { x, y, value: d[userKey] }
  }).filter(p => p.value !== null && p.value !== undefined)

  // Generate points for partner line
  const partnerPoints = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - ((d[partnerKey] || 0) / maxY) * chartHeight
    return { x, y, value: d[partnerKey] }
  }).filter(p => p.value !== null && p.value !== undefined)

  // Create path strings
  const createLinePath = (points) => {
    if (points.length === 0) return ''
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}`).join(' ')
  }

  const createAreaPath = (points) => {
    if (points.length === 0) return ''
    const linePath = createLinePath(points)
    const lastPoint = points[points.length - 1]
    const firstPoint = points[0]
    return `${linePath} L ${lastPoint.x}% ${padding.top + chartHeight} L ${firstPoint.x}% ${padding.top + chartHeight} Z`
  }

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {/* Grid lines */}
      {[1, 2, 3, 4, 5].map(i => {
        const y = padding.top + chartHeight - (i / maxY) * chartHeight
        return (
          <line
            key={i}
            x1={`${padding.left}%`}
            y1={y}
            x2={`${width - padding.right}%`}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        )
      })}

      {/* Gradient definitions */}
      <defs>
        <linearGradient id="userGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CHART_COLORS.user.gradient[0]} stopOpacity="0.3" />
          <stop offset="100%" stopColor={CHART_COLORS.user.gradient[1]} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="partnerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={CHART_COLORS.partner.gradient[0]} stopOpacity="0.3" />
          <stop offset="100%" stopColor={CHART_COLORS.partner.gradient[1]} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Partner area fill */}
      {partnerPoints.length > 1 && (
        <path
          d={createAreaPath(partnerPoints)}
          fill="url(#partnerGradient)"
        />
      )}

      {/* User area fill */}
      {userPoints.length > 1 && (
        <path
          d={createAreaPath(userPoints)}
          fill="url(#userGradient)"
        />
      )}

      {/* Partner line */}
      {partnerPoints.length > 1 && (
        <path
          d={createLinePath(partnerPoints)}
          fill="none"
          stroke={CHART_COLORS.partner.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* User line */}
      {userPoints.length > 1 && (
        <path
          d={createLinePath(userPoints)}
          fill="none"
          stroke={CHART_COLORS.user.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Partner dots */}
      {partnerPoints.map((p, i) => (
        <circle
          key={`partner-${i}`}
          cx={`${p.x}%`}
          cy={p.y}
          r="4"
          fill="white"
          stroke={CHART_COLORS.partner.line}
          strokeWidth="2"
        />
      ))}

      {/* User dots */}
      {userPoints.map((p, i) => (
        <circle
          key={`user-${i}`}
          cx={`${p.x}%`}
          cy={p.y}
          r="4"
          fill="white"
          stroke={CHART_COLORS.user.line}
          strokeWidth="2"
        />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => {
        const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
        return (
          <text
            key={i}
            x={`${x}%`}
            y={height - 5}
            textAnchor="middle"
            className="text-[8px] fill-gray-500"
          >
            {getDayAbbrev(d.date)}
          </text>
        )
      })}
    </svg>
  )
}

/**
 * Chart legend
 */
function ChartLegend({ userName = 'You', partnerName = 'Partner' }) {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.user.line }} />
        <span className="text-sm text-gray-600">{userName}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.partner.line }} />
        <span className="text-sm text-gray-600">{partnerName}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function WeeklyReviewPage() {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerId, setPartnerId] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [weeksAgo, setWeeksAgo] = useState(1) // Default to last week

  // Data state
  const [userCheckins, setUserCheckins] = useState([])
  const [partnerCheckins, setPartnerCheckins] = useState([])
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [couplePatterns, setCouplePatterns] = useState(null)

  // Computed week dates
  const weekDates = useMemo(() => getWeekDates(weeksAgo), [weeksAgo])

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (user && couple) {
      fetchWeekData()
    }
  }, [user, couple, weeksAgo])

  const checkAuth = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)

      // Fetch couple data
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
        .maybeSingle()

      if (!coupleData) {
        router.push('/dashboard')
        return
      }

      setCouple(coupleData)

      // Get partner info
      const partnerUserId = coupleData.user1_id === authUser.id
        ? coupleData.user2_id
        : coupleData.user1_id

      setPartnerId(partnerUserId)

      if (partnerUserId) {
        const { data: partnerProfile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', partnerUserId)
          .maybeSingle()

        if (partnerProfile?.display_name) {
          setPartnerName(partnerProfile.display_name)
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      router.push('/login')
    }
  }

  const fetchWeekData = async () => {
    setLoading(true)

    const startDate = formatDate(weekDates.start)
    const endDate = formatDate(weekDates.end)

    try {
      // Fetch user's check-ins for the week
      const { data: userData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_date', startDate)
        .lte('check_date', endDate)
        .order('check_date', { ascending: true })

      setUserCheckins(userData || [])

      // Fetch partner's check-ins for the week
      if (partnerId) {
        const { data: partnerData } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', partnerId)
          .gte('check_date', startDate)
          .lte('check_date', endDate)
          .order('check_date', { ascending: true })

        setPartnerCheckins(partnerData || [])
      }

      // Generate weekly summary
      const summary = await generateWeeklySummary(user.id, startDate, endDate)
      setWeeklySummary(summary)

      // Get couple patterns (for additional insights)
      if (couple?.id) {
        const patterns = await analyzeCouplePatterns(couple.id, 30)
        setCouplePatterns(patterns)
      }
    } catch (err) {
      console.error('Error fetching week data:', err)
    }

    setLoading(false)
  }

  // ============================================================================
  // Computed Data
  // ============================================================================

  // Create merged daily data for charts
  const chartData = useMemo(() => {
    const days = []
    const current = new Date(weekDates.start)

    while (current <= weekDates.end) {
      const dateStr = formatDate(current)
      const userCheckin = userCheckins.find(c => c.check_date === dateStr)
      const partnerCheckin = partnerCheckins.find(c => c.check_date === dateStr)

      days.push({
        date: dateStr,
        userMood: userCheckin ? getMoodValue(userCheckin.mood) : null,
        userConnection: userCheckin?.connection_score || null,
        partnerMood: partnerCheckin ? getMoodValue(partnerCheckin.mood) : null,
        partnerConnection: partnerCheckin?.connection_score || null,
        userMoodRaw: userCheckin?.mood,
        partnerMoodRaw: partnerCheckin?.mood,
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }, [weekDates, userCheckins, partnerCheckins])

  // Calculate completion stats
  const completionStats = useMemo(() => {
    const userCount = userCheckins.length
    const partnerCount = partnerCheckins.length
    return {
      userCount,
      partnerCount,
      totalDays: 7,
      userComplete: userCount === 7,
      partnerComplete: partnerCount === 7,
    }
  }, [userCheckins, partnerCheckins])

  // Find most common mood
  const dominantMood = useMemo(() => {
    if (userCheckins.length === 0) return null

    const moodCounts = {}
    userCheckins.forEach(c => {
      moodCounts[c.mood] = (moodCounts[c.mood] || 0) + 1
    })

    const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0]
  }, [userCheckins])

  // Calculate average connection
  const avgConnection = useMemo(() => {
    if (userCheckins.length === 0) return 0
    const sum = userCheckins.reduce((acc, c) => acc + (c.connection_score || 0), 0)
    return Math.round((sum / userCheckins.length) * 10) / 10
  }, [userCheckins])

  // Check if we have enough data
  const hasEnoughData = userCheckins.length >= 3

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="animate-pulse text-[#2D3648]">Loading your week...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#2D3648] hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Dashboard</span>
            </button>

            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeeksAgo(w => w + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Previous week"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm font-medium text-[#2D3648]">
                {formatDisplayDate(weekDates.start)} - {formatDisplayDate(weekDates.end)}
              </span>

              <button
                onClick={() => setWeeksAgo(w => Math.max(0, w - 1))}
                disabled={weeksAgo === 0}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next week"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ================================================================== */}
        {/* SECTION 1: Hero - Week Overview */}
        {/* ================================================================== */}
        <section className="bg-gradient-to-br from-[#C9184A] to-[#FF6B9D] rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">Week in Review</h1>
          <p className="text-white/80 text-sm mb-6">
            {formatDisplayDate(weekDates.start)} - {formatDisplayDate(weekDates.end)}
          </p>

          {hasEnoughData ? (
            <div className="grid grid-cols-3 gap-4">
              {/* Dominant Mood */}
              <div className="text-center">
                <div className="text-4xl mb-1">{getMoodEmoji(dominantMood)}</div>
                <div className="text-sm text-white/80">Most Common</div>
              </div>

              {/* Average Connection */}
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">{avgConnection}</div>
                <div className="text-lg">{'❤️'.repeat(Math.round(avgConnection))}</div>
                <div className="text-sm text-white/80">Avg Connection</div>
              </div>

              {/* Completion */}
              <div className="text-center">
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span>You:</span>
                    <span className="font-bold">{completionStats.userCount}/7</span>
                    {completionStats.userComplete && <span>✓</span>}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span>{partnerName}:</span>
                    <span className="font-bold">{completionStats.partnerCount}/7</span>
                    {completionStats.partnerComplete && <span>✓</span>}
                  </div>
                </div>
                <div className="text-sm text-white/80 mt-1">Check-ins</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-white/90">Not enough data for this week</p>
              <p className="text-white/70 text-sm">Check in at least 3 days to see your weekly summary</p>
            </div>
          )}
        </section>

        {hasEnoughData && (
          <>
            {/* ================================================================== */}
            {/* SECTION 2: Mood Trends Chart */}
            {/* ================================================================== */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Mood Trends</h2>

              <div className="h-44">
                <LineChart
                  data={chartData}
                  userKey="userMood"
                  partnerKey="partnerMood"
                  maxY={5}
                  height={160}
                />
              </div>

              <ChartLegend userName="You" partnerName={partnerName} />

              {/* Mood scale reference */}
              <div className="flex justify-between mt-4 text-xs text-gray-400 px-2">
                <span>😫 Stressed</span>
                <span>😐 Okay</span>
                <span>🌟 Amazing</span>
              </div>

              {/* Highlight best/worst days */}
              {weeklySummary?.bestDay && weeklySummary?.worstDay && (
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-green-600 font-medium">Best Day</div>
                    <div className="text-sm font-bold text-green-800">{weeklySummary.bestDay.dayOfWeek}</div>
                    <div className="text-lg">{getMoodEmoji(weeklySummary.bestDay.mood)}</div>
                  </div>
                  <div className="flex-1 bg-orange-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-orange-600 font-medium">Challenging</div>
                    <div className="text-sm font-bold text-orange-800">{weeklySummary.worstDay.dayOfWeek}</div>
                    <div className="text-lg">{getMoodEmoji(weeklySummary.worstDay.mood)}</div>
                  </div>
                </div>
              )}
            </section>

            {/* ================================================================== */}
            {/* SECTION 3: Connection Score Chart */}
            {/* ================================================================== */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Connection Scores</h2>

              <div className="h-44">
                <LineChart
                  data={chartData}
                  userKey="userConnection"
                  partnerKey="partnerConnection"
                  maxY={5}
                  height={160}
                />
              </div>

              <ChartLegend userName="You" partnerName={partnerName} />

              {/* Connection scale reference */}
              <div className="flex justify-between mt-4 text-xs text-gray-400 px-2">
                <span>❤️ Distant</span>
                <span>❤️❤️❤️ Okay</span>
                <span>❤️❤️❤️❤️❤️ Very Connected</span>
              </div>

              {/* Alignment indicator */}
              {couplePatterns?.alignmentScore !== undefined && (
                <div className="mt-4 bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm text-gray-600">
                    Alignment Score: <span className="font-bold text-[#2D3648]">{couplePatterns.alignmentScore}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    How often your moods and connection levels match
                  </div>
                </div>
              )}
            </section>

            {/* ================================================================== */}
            {/* SECTION 4: Key Moments */}
            {/* ================================================================== */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Key Moments</h2>

              <div className="space-y-3">
                {weeklySummary?.keyMoments?.map((moment, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="text-lg">
                      {moment.includes('great') || moment.includes('improved') ? '✨' :
                       moment.includes('challenging') || moment.includes('dropped') ? '💭' :
                       moment.includes('checked in') ? '📊' : '📝'}
                    </div>
                    <p className="text-sm text-[#2D3648]">{moment}</p>
                  </div>
                ))}

                {/* Shared highs from couple patterns */}
                {couplePatterns?.sharedHighs?.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                    <div className="text-lg">💕</div>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Shared High Point</p>
                      <p className="text-xs text-emerald-600">
                        You both felt great on {formatDisplayDate(couplePatterns.sharedHighs[0].date)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================================== */}
            {/* SECTION 5: Insights & Patterns */}
            {/* ================================================================== */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Insights</h2>

              <div className="space-y-3">
                {/* Weekly summary insights */}
                {weeklySummary?.moodDistribution && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg">📈</div>
                    <p className="text-sm text-purple-800">
                      This week: {weeklySummary.moodDistribution.great || 0 + weeklySummary.moodDistribution.good || 0} good days,{' '}
                      {weeklySummary.moodDistribution.okay || 0} okay days,{' '}
                      {(weeklySummary.moodDistribution.down || 0) + (weeklySummary.moodDistribution.stressed || 0)} tough days
                    </p>
                  </div>
                )}

                {/* Couple insights */}
                {couplePatterns?.coupleInsights?.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                  >
                    <div className="text-lg">
                      {insight.includes('weekend') ? '🌴' :
                       insight.includes('stress') ? '😓' :
                       insight.includes('connected') ? '💑' :
                       insight.includes('great') ? '🎉' : '💡'}
                    </div>
                    <p className="text-sm text-blue-800">{insight}</p>
                  </div>
                ))}

                {/* Divergence alert */}
                {couplePatterns?.divergenceAlerts?.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                    <div className="text-lg">⚡</div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Emotional Divergence Detected</p>
                      <p className="text-xs text-amber-600">
                        On {formatDisplayDate(couplePatterns.divergenceAlerts[0].date)}, you were feeling differently.
                        Might be worth discussing!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ================================================================== */}
            {/* SECTION 6: Conversation Starters */}
            {/* ================================================================== */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#2D3648] mb-4">Conversation Starters</h2>
              <p className="text-sm text-gray-500 mb-4">Topics to discuss based on your week</p>

              <div className="space-y-3">
                {weeklySummary?.recommendedTopics?.map((topic, index) => (
                  <div
                    key={index}
                    className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#C9184A] hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#C9184A]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-[#C9184A] font-bold text-sm">{index + 1}</span>
                      </div>
                      <p className="text-sm text-[#2D3648] leading-relaxed">{topic}</p>
                    </div>
                  </div>
                ))}

                {/* Add custom prompts based on data */}
                {weeklySummary?.bestDay && weeklySummary?.bestDay.connection >= 4 && (
                  <div className="p-4 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600 text-lg">💚</span>
                      </div>
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        {weeklySummary.bestDay.dayOfWeek} was amazing! What made it so special? How can you create more days like that?
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ================================================================== */}
        {/* SECTION 7: Actions */}
        {/* ================================================================== */}
        <section className="space-y-3 pb-8">
          {/* Share Button */}
          <button
            onClick={() => {
              // Copy summary to clipboard
              const summary = `Week of ${formatDisplayDate(weekDates.start)}-${formatDisplayDate(weekDates.end)}\n` +
                `Mood: ${dominantMood || 'N/A'}\n` +
                `Avg Connection: ${avgConnection}/5\n` +
                `Check-ins: ${completionStats.userCount}/7 days`
              navigator.clipboard.writeText(summary)
              alert('Summary copied to clipboard!')
            }}
            className="w-full py-3 bg-[#2D3648] text-white rounded-xl font-medium hover:bg-[#3d4a5f] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Summary with {partnerName}
          </button>

          {/* Back to Dashboard */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-white text-[#2D3648] rounded-xl font-medium border-2 border-gray-200 hover:border-[#C9184A] transition-colors"
          >
            Back to Dashboard
          </button>
        </section>
      </div>
    </div>
  )
}
