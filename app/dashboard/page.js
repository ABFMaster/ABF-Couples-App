'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { todayPST } from '@/lib/date-utils'
import { generateNoraTrigger } from '@/lib/nora-triggers'

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const ITEM_TYPES = {
  movie:      { emoji: '🎬', label: 'Movie' },
  show:       { emoji: '📺', label: 'Show' },
  song:       { emoji: '🎵', label: 'Song' },
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  date_idea:  { emoji: '💡', label: 'Date Idea' },
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getGreetingWord() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getDaysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  return diff
}

function getDateHype(daysUntil, title, hypeLine) {
  const emoji = daysUntil === 0 ? '🔥' : daysUntil === 1 ? '😍' : daysUntil <= 3 ? '🎉' : '💕'
  if (hypeLine) return { emoji, text: hypeLine }
  if (daysUntil === 0) return { emoji: '🔥', text: `Tonight is the night — ${title}!` }
  if (daysUntil === 1) return { emoji: '😍', text: `Tomorrow! ${title} is almost here` }
  if (daysUntil <= 3)  return { emoji: '🎉', text: `${title} in ${daysUntil} days — get excited!` }
  if (daysUntil <= 7)  return { emoji: '💕', text: `${title} coming up in ${daysUntil} days` }
  return { emoji: '🗓️', text: `Something to look forward to — ${title}` }
}


function buildFeatureCards({ todayCheckinDone, nextDate, lastFlirtDaysAgo, memoryCount, activeTrip }) {
  return [
    {
      emoji: '💬',
      label: 'Daily Check-in',
      status: todayCheckinDone ? 'Done today ✓' : 'Not done yet',
      statusColor: todayCheckinDone ? 'text-green-500' : 'text-[#9CA3AF]',
      href: '/checkin',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '🗓️',
      label: 'Date Night',
      status: nextDate ? nextDate.title : 'Plan something special',
      statusColor: nextDate ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/dates',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '💌',
      label: 'Send a Flirt',
      status: lastFlirtDaysAgo === null
        ? 'Send one now'
        : lastFlirtDaysAgo === 0
          ? 'Sent today ✓'
          : `Sent ${lastFlirtDaysAgo}d ago`,
      statusColor: lastFlirtDaysAgo === 0 ? 'text-green-500' : 'text-[#9CA3AF]',
      href: '/flirts',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '💬',
      label: 'Nora',
      status: 'Chat now',
      statusColor: 'text-[#3D3580]',
      href: '/ai-coach',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '🗺️',
      label: 'Trip Planning',
      status: activeTrip || 'Plan a trip',
      statusColor: activeTrip ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/trips',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '📸',
      label: 'Our Timeline',
      status: memoryCount > 0 ? `${memoryCount} memories` : 'Add your first memory',
      statusColor: memoryCount > 0 ? 'text-[#3D3580]' : 'text-[#9CA3AF]',
      href: '/timeline',
      accent: 'border-[#E8614D]',
    },
    {
      emoji: '📝',
      label: 'Weekly Reflection',
      status: 'Reflect on the week',
      statusColor: 'text-[#9CA3AF]',
      href: '/weekly-reflection',
      accent: 'border-[#E8614D]',
    },
  ]
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()

  const [loading, setLoading]                   = useState(true)
  const [user, setUser]                         = useState(null)
  const [userName, setUserName]                 = useState('there')
  const [couple, setCouple]                     = useState(null)
  const [partnerName, setPartnerName]           = useState('your partner')
  const [hasPartner, setHasPartner]             = useState(false)
  const [connectCode, setConnectCode]           = useState(null)
  const [inviteDismissed, setInviteDismissed]   = useState(true)
  const [codeCopied, setCodeCopied]             = useState(false)

  const [healthScore, setHealthScore]           = useState(null)
  const [streak, setStreak]                     = useState(0)
  const [flirtsThisWeek, setFlirtsThisWeek]     = useState(0)
  const [daysTogether, setDaysTogether]         = useState(0)
  const [todayCheckinDone, setTodayCheckinDone] = useState(false)
  const [nextDate, setNextDate]                 = useState(null)
  const [upcomingDates, setUpcomingDates]       = useState([])
  const [lastFlirtDaysAgo, setLastFlirtDaysAgo] = useState(null)
  const [memoryCount, setMemoryCount]           = useState(0)
  const [activeTrip]                            = useState(null)

  const [sharedPreview, setSharedPreview]       = useState([])
  const [pendingDate, setPendingDate]           = useState(null)
  const [upcomingTrip, setUpcomingTrip]         = useState(null)
  const [noraTrigger, setNoraTrigger]           = useState(null)

  // Hydrate localStorage on client only
  useEffect(() => {
    setInviteDismissed(localStorage.getItem('abf_invite_dismissed') === 'true')
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUser(user)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!coupleData) { router.push('/connect'); return }
      setCouple(coupleData)

      const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
      setHasPartner(!!partnerId)
      setConnectCode(coupleData.connect_code || null)
      setDaysTogether(Math.floor((Date.now() - new Date(coupleData.created_at).getTime()) / 86400000))

      await Promise.allSettled([

        // User display name
        (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.display_name) setUserName(data.display_name)
        })(),

        // Partner display name
        partnerId ? (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', partnerId)
            .maybeSingle()
          if (data?.display_name) setPartnerName(data.display_name)
        })() : Promise.resolve(),

        // Relationship health score
        (async () => {
          const { data } = await supabase
            .from('relationship_health')
            .select('overall_score')
            .eq('couple_id', coupleData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (data) setHealthScore(data.overall_score ?? null)
        })(),

        // Check-in streak + today status
        (async () => {
          const today = todayPST()
          const { data } = await supabase
            .from('daily_checkins')
            .select('check_date')
            .eq('user_id', user.id)
            .eq('couple_id', coupleData.id)
            .not('question_response', 'is', null)
            .order('check_date', { ascending: false })
            .limit(60)
          if (!data?.length) return
          setTodayCheckinDone(data[0].check_date === today)
          let count = 0
          const cursor = new Date(today)
          for (const row of data) {
            if (row.check_date === cursor.toISOString().split('T')[0]) {
              count++
              cursor.setDate(cursor.getDate() - 1)
            } else break
          }
          setStreak(count)
        })(),

        // Flirts this week
        (async () => {
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          weekStart.setHours(0, 0, 0, 0)
          const { data } = await supabase
            .from('flirts')
            .select('sender_id, created_at')
            .eq('couple_id', coupleData.id)
            .gte('created_at', weekStart.toISOString())
            .order('created_at', { ascending: false })
          const mine = (data || []).filter(f => f.sender_id === user.id)
          setFlirtsThisWeek(mine.length)
          if (mine.length > 0) {
            setLastFlirtDaysAgo(Math.floor((Date.now() - new Date(mine[0].created_at).getTime()) / 86400000))
          }
        })(),

        // Next upcoming dates (check both date_plans and custom_dates)
        (async () => {
          const now = new Date().toISOString()
          const cid = coupleData.id
          const { data: planDates } = await supabase
            .from('date_plans')
            .select('id, title, date_time, stops, status')
            .eq('couple_id', cid)
            .in('status', ['planned', 'approved'])
            .gte('date_time', now)
            .order('date_time', { ascending: true })
            .limit(5)

          const { data: customDates } = await supabase
            .from('custom_dates')
            .select('id, title, date_time, stops, status, hype_line')
            .eq('couple_id', cid)
            .in('status', ['planned', 'approved'])
            .gte('date_time', now)
            .order('date_time', { ascending: true })
            .limit(5)

          const allUpcoming = [
            ...(planDates || []).map(d => ({ ...d, source: 'plan' })),
            ...(customDates || []).map(d => ({ ...d, source: 'custom' }))
          ].sort((a, b) => new Date(a.date_time) - new Date(b.date_time)).slice(0, 5)

          setUpcomingDates(allUpcoming)
          setNextDate(allUpcoming[0] || null)
        })(),

        // Timeline memory count
        (async () => {
          const { count } = await supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('couple_id', coupleData.id)
          setMemoryCount(count || 0)
        })(),

        // Shared items preview
        (async () => {
          try {
            const { data } = await supabase
              .from('shared_items')
              .select('id, type, title')
              .eq('couple_id', coupleData.id)
              .eq('completed', false)
              .order('created_at', { ascending: false })
              .limit(5)
            setSharedPreview(data || [])
          } catch { /* table may not exist yet */ }
        })(),

        // Pending date plans shared with me
        (async () => {
          try {
            const { data } = await supabase
              .from('custom_dates')
              .select('id, title, stops, date_time')
              .eq('shared_with', user.id)
              .eq('status', 'planned')
              .order('created_at', { ascending: false })
              .limit(1)
            if (data?.[0]) setPendingDate(data[0])
          } catch { /* ignore */ }
        })(),

        // Upcoming trip (for hero card upcoming line)
        (async () => {
          try {
            const { data } = await supabase
              .from('trips')
              .select('destination, start_date, trip_type')
              .eq('couple_id', coupleData.id)
              .gte('start_date', new Date().toISOString())
              .order('start_date', { ascending: true })
              .limit(1)
              .maybeSingle()
            if (data) setUpcomingTrip(data)
          } catch { /* ignore */ }
        })(),

      ])

      // Fetch Nora trigger (non-blocking)
      generateNoraTrigger(user.id, coupleData.id, null, null)
        .then(trigger => setNoraTrigger(trigger))
        .catch(() => {})

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(connectCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const handleDismissInvite = () => {
    localStorage.setItem('abf_invite_dismissed', 'true')
    setInviteDismissed(true)
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4" />
          <p className="text-[#6B7280] font-medium">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const healthColor  = healthScore === null
    ? 'text-[#9CA3AF]'
    : healthScore >= 70 ? 'text-[#E8614D]'
    : healthScore >= 50 ? 'text-amber-500'
    : 'text-[#9CA3AF]'
  const featureCards = buildFeatureCards({ todayCheckinDone, nextDate, lastFlirtDaysAgo, memoryCount, activeTrip })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F6F3]">

      {/* ===== INVITE BANNER ===== */}
      {!hasPartner && !inviteDismissed && connectCode && (
        <div className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                💌 Invite {partnerName} to unlock shared features
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-white/80 font-mono text-sm tracking-[0.2em]">{connectCode}</span>
                <button
                  onClick={handleCopyCode}
                  className="text-white/90 text-xs border border-white/40 px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors"
                >
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissInvite}
              className="text-white/60 hover:text-white text-2xl leading-none flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ===== PENDING DATE BANNER ===== */}
      {pendingDate && (
        <div className="bg-gradient-to-r from-[#3D3580] to-[#5D55A0] px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">
                💌 {partnerName} planned a date for you!
              </p>
              <p className="text-white/70 text-xs mt-0.5 truncate">{pendingDate.title}</p>
            </div>
            <button
              onClick={() => router.push(`/dates/${pendingDate.id}`)}
              className="flex-shrink-0 bg-white text-[#3D3580] font-bold px-4 py-1.5 rounded-full text-xs hover:bg-white/90 transition-colors"
            >
              View Plan →
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6 space-y-7">

        {/* ===== SECTION 1: HERO (Nora-owned) ===== */}
        {(() => {
          // Compute upcoming line from nextDate or upcomingTrip (whichever is sooner)
          let upcomingLine = null
          if (nextDate && upcomingTrip) {
            const dateSoon = new Date(nextDate.date_time) <= new Date(upcomingTrip.start_date)
            if (dateSoon) {
              const days = getDaysUntil(nextDate.date_time)
              const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`
              upcomingLine = `📅 ${nextDate.title} · ${label}`
            } else {
              upcomingLine = `✈️ ${upcomingTrip.destination} · ${new Date(upcomingTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            }
          } else if (nextDate) {
            const days = getDaysUntil(nextDate.date_time)
            const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`
            upcomingLine = `📅 ${nextDate.title} · ${label}`
          } else if (upcomingTrip) {
            upcomingLine = `✈️ ${upcomingTrip.destination} · ${new Date(upcomingTrip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          }

          // Compute secondary button
          let secondaryLabel, secondaryHref
          if (!todayCheckinDone) {
            secondaryLabel = 'Check In →'
            secondaryHref  = '/checkin'
          } else if (!nextDate && !upcomingTrip) {
            secondaryLabel = 'Plan Something →'
            secondaryHref  = '/dates'
          } else {
            secondaryLabel = 'Add Memory →'
            secondaryHref  = '/timeline'
          }

          const noraMessage = noraTrigger?.message || `Good ${getGreetingWord()}, ${userName}.`

          return (
            <section className="relative bg-gradient-to-br from-[#E8614D] to-[#3D3580] rounded-3xl p-6 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
              <div className="relative">
                {/* Top row: NORA label + greeting */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Nora</span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-white/60 text-xs capitalize">Good {getGreetingWord()}</span>
                </div>

                {/* Nora's contextual message */}
                <p className="text-white text-lg font-medium leading-snug mb-4 line-clamp-3">
                  {noraMessage}
                </p>

                {/* Upcoming line (date or trip) */}
                {upcomingLine && (
                  <p className="text-white/60 text-sm mb-5">{upcomingLine}</p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (noraTrigger?.message) {
                        sessionStorage.setItem('nora_opener', noraTrigger.message)
                      }
                      router.push('/ai-coach?new=true')
                    }}
                    className="bg-white text-[#E8614D] font-semibold px-4 py-2 rounded-full text-sm hover:bg-white/90 transition-colors"
                  >
                    Talk to Nora →
                  </button>
                  <button
                    onClick={() => router.push(secondaryHref)}
                    className="bg-white/20 text-white font-semibold px-4 py-2 rounded-full text-sm hover:bg-white/30 transition-colors border border-white/30"
                  >
                    {secondaryLabel}
                  </button>
                </div>
              </div>
            </section>
          )
        })()}

        {/* ===== SECTION 2: RELATIONSHIP PULSE ===== */}
        <section>
          <h2 className="text-lg font-bold text-[#2D3648] mb-3">Relationship Pulse</h2>
          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={() => router.push('/assessment/results')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className={`text-3xl font-bold ${healthColor}`}>
                {healthScore !== null ? healthScore : '—'}
                <span className="text-base font-normal text-gray-200">/100</span>
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Relationship Health</p>
            </button>

            <button
              onClick={() => router.push('/checkin')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#E8614D]">
                {streak}{streak > 3 ? ' 🔥' : ''}
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Day Streak</p>
            </button>

            <button
              onClick={() => router.push('/flirts')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#E8614D]">{flirtsThisWeek} 💌</p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Flirts This Week</p>
            </button>

            <button
              onClick={() => router.push('/timeline')}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <p className="text-3xl font-bold text-[#3D3580]">{daysTogether} ❤️</p>
              <p className="text-xs text-[#9CA3AF] mt-1.5 font-medium">Days Together</p>
            </button>

          </div>
        </section>

        {/* ===== SECTION 3: SHARED SPACE PREVIEW ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#2D3648]">Our Space 💑</h2>
            <Link href="/shared" className="text-sm text-[#E8614D] font-semibold">See All →</Link>
          </div>

          {sharedPreview.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <p className="text-4xl mb-3">🎬📺🎵</p>
              <p className="text-[#6B7280] text-sm mb-4 max-w-xs mx-auto">
                Start building your shared list — movies, shows, songs, and more
              </p>
              <button
                onClick={() => router.push('/shared/add')}
                className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                + Add Something
              </button>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {sharedPreview.map(item => (
                <Link
                  key={item.id}
                  href="/shared"
                  className="flex-shrink-0 bg-white rounded-2xl p-4 shadow-sm w-36 hover:shadow-md transition-shadow"
                >
                  <span className="text-3xl block mb-2">{ITEM_TYPES[item.type]?.emoji || '✨'}</span>
                  <p className="text-[#2D3648] font-semibold text-sm line-clamp-2 leading-tight mb-1">{item.title}</p>
                  <p className="text-[#9CA3AF] text-xs">{ITEM_TYPES[item.type]?.label}</p>
                </Link>
              ))}
              <button
                onClick={() => router.push('/shared/add')}
                className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 shadow-sm border-2 border-dashed border-gray-200 hover:border-[#E8614D] flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <span className="text-2xl text-gray-300 group-hover:text-[#E8614D] transition-colors">+</span>
                <span className="text-xs text-gray-400 group-hover:text-[#E8614D] transition-colors font-medium text-center">
                  Add Something
                </span>
              </button>
            </div>
          )}
        </section>

        {/* ===== SECTION 4: FEATURE NAVIGATION ===== */}
        <section>
          <h2 className="text-lg font-bold text-[#2D3648] mb-3">Explore</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featureCards.map(card => (
              <button
                key={card.href}
                onClick={() => router.push(card.href)}
                className={`bg-[#FDF6EF] border-l-4 ${card.accent} rounded-2xl p-4 text-left shadow-sm hover:shadow-md transition-shadow`}
              >
                <span className="text-3xl block mb-2">{card.emoji}</span>
                <p className="text-[#2D3648] font-semibold text-sm mb-0.5">{card.label}</p>
                <p className={`text-xs ${card.statusColor}`}>{card.status}</p>
              </button>
            ))}
          </div>
          <div className="mt-2 text-right">
            <button
              onClick={() => router.push('/weekly-reflection/history')}
              className="text-xs text-[#9CA3AF] hover:text-[#E8614D] transition-colors"
            >
              View reflection history →
            </button>
          </div>
        </section>

      </div>

    </div>
  )
}
