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
  const [showCouplesDebrief, setShowCouplesDebrief] = useState(false)
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
  const [todaysRead, setTodaysRead]             = useState(null)

  // Hydrate localStorage on client only
  useEffect(() => {
    setInviteDismissed(localStorage.getItem('abf_invite_dismissed') === 'true')
  }, [])

  // Fetch Today's Read (non-blocking)
  useEffect(() => {
    fetch('/api/learn/feed')
      .then(r => r.json())
      .then(d => { if (d.articles?.[0]) setTodaysRead(d.articles[0]) })
      .catch(() => {})
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
              .or('date_time.is.null,date_time.gte.' + new Date().toISOString())
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

      // Check if both partners have completed the new-format assessment
      try {
        const [myAssessment, partnerAssessment, myProfile] = await Promise.all([
          supabase
            .from('relationship_assessments')
            .select('id, results')
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => data),
          supabase
            .from('relationship_assessments')
            .select('id, results')
            .eq('user_id', partnerId)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle()
            .then(({ data }) => data),
          supabase
            .from('user_profiles')
            .select('couples_debrief_dismissed')
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => data),
        ])
        const myModules = myAssessment?.results?.modules
        const partnerModules = partnerAssessment?.results?.modules
        const bothHaveNewFormat =
          Array.isArray(myModules) && myModules[0]?.moduleId === 'processing_style' &&
          Array.isArray(partnerModules) && partnerModules[0]?.moduleId === 'processing_style'
        const dismissed = myProfile?.couples_debrief_dismissed === true
          || localStorage.getItem('abf_couples_debrief_dismissed') === 'true'
        if (bothHaveNewFormat && !dismissed) {
          setShowCouplesDebrief(true)
        }
      } catch (err) {
        console.error('Couples debrief check error:', err)
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading…</p>
        </div>
      </div>
    )
  }

  const noraMessage = noraTrigger?.message || `Good ${getGreetingWord()}, ${userName}. How are you two doing today?`

  const pendingDateAction = pendingDate
  const checkinDone = todayCheckinDone

  // Section 3 — build 2 contextual action cards + 1 Nora surprise slot
  const suggestedActions = []

  if (!checkinDone) {
    suggestedActions.push({
      id: 'checkin',
      verb: 'Check in together',
      hint: 'Takes 2 minutes',
      nudge: null,
      urgent: true,
      href: '/checkin',
    })
  }

  if (lastFlirtDaysAgo === null || lastFlirtDaysAgo >= 2) {
    suggestedActions.push({
      id: 'flirt',
      verb: `Send ${partnerName} a flirt`,
      hint: 'Keep the spark going',
      nudge: lastFlirtDaysAgo >= 2 ? `${lastFlirtDaysAgo} days since last one` : null,
      urgent: lastFlirtDaysAgo >= 3,
      href: '/flirts',
    })
  }

  if (!nextDate) {
    suggestedActions.push({
      id: 'date',
      verb: 'Plan a date night',
      hint: 'Nothing on the books yet',
      nudge: null,
      urgent: false,
      href: '/dates',
    })
  }

  if (upcomingTrip === null) {
    suggestedActions.push({
      id: 'trip',
      verb: 'Dream a trip together',
      hint: 'Let Wander take you somewhere',
      nudge: null,
      urgent: false,
      href: '/trips',
    })
  }

  suggestedActions.push({
    id: 'reflection',
    verb: 'Weekly reflection',
    hint: 'Sunday · 2 min',
    nudge: null,
    urgent: false,
    href: '/weekly-reflection',
  })

  const displayActions = suggestedActions.slice(0, 2)

  // Mood vibe from health + streak
  const getMoodVibe = () => {
    if (streak >= 7) return { emoji: '🔥', label: 'On fire this week', sub: `${streak} day streak` }
    if (streak >= 3) return { emoji: '🌿', label: 'You two are in a good rhythm', sub: `${streak} days going strong` }
    if (streak === 0 && healthScore < 50) return { emoji: '🌫️', label: 'A little quiet lately', sub: 'A check-in goes a long way' }
    if (daysTogether > 365) return { emoji: '💛', label: `${Math.floor(daysTogether / 365)} year${daysTogether >= 730 ? 's' : ''} and counting`, sub: 'Something worth celebrating' }
    return { emoji: '💕', label: 'Showing up for each other', sub: `${daysTogether} days together` }
  }
  const mood = getMoodVibe()

  // Upcoming event line
  const getUpcomingEvent = () => {
    if (pendingDateAction) return {
      icon: '💌',
      text: `${partnerName} planned something for you`,
      strong: 'View the plan →',
      href: `/dates/${pendingDateAction.id}`,
    }
    if (nextDate) {
      const days = getDaysUntil(nextDate.date_time)
      const when = days === 0 ? 'Tonight' : days === 1 ? 'Tomorrow' : `in ${days} days`
      return { icon: '📅', text: `${nextDate.title} — ${when}`, strong: null, href: '/dates' }
    }
    if (upcomingTrip) {
      const days = Math.ceil((new Date(upcomingTrip.start_date) - new Date()) / 86400000)
      return { icon: '✈️', text: `${upcomingTrip.destination} in ${days} days`, strong: null, href: '/trips' }
    }
    return null
  }
  const upcomingEvent = getUpcomingEvent()

  // Primary CTA
  const getPrimaryCTA = () => {
    if (pendingDateAction) return { label: `See what ${partnerName} planned →`, href: `/dates/${pendingDateAction.id}` }
    if (!hasPartner) return { label: `Invite ${partnerName} to ABF →`, href: '/connect' }
    if (!checkinDone) return { label: 'Check in together →', href: '/checkin' }
    return { label: 'Talk to Nora →', href: '/ai-coach?new=true' }
  }
  const primaryCTA = getPrimaryCTA()

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="px-6 pt-10 pb-32 space-y-8">

        {/* SECTION 1 — STATUS: Nora hero + mood */}
        <section className="space-y-3">

          {/* Nora message card */}
          <div className="bg-gradient-to-br from-[#252048] via-[#3E3585] to-[#6B4A72] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#E8614D]/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40">Nora</span>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/40 text-xs capitalize">Good {getGreetingWord()}</span>
              </div>

              {upcomingEvent && (
                <div className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 mb-4">
                  <span className="text-base">{upcomingEvent.icon}</span>
                  <span className="text-[13px] text-white/80 font-medium flex-1 leading-snug">
                    {upcomingEvent.text}
                    {upcomingEvent.strong && <span className="text-white font-semibold"> {upcomingEvent.strong}</span>}
                  </span>
                </div>
              )}

              <p className="text-white text-[20px] leading-[1.4] mb-5"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {noraMessage}
              </p>

              <button
                onClick={() => {
                  if (noraTrigger?.message) sessionStorage.setItem('nora_opener', noraTrigger.message)
                  window.location.href = primaryCTA.href
                }}
                className="w-full min-h-[52px] bg-white text-[#E8614D] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md"
              >
                {primaryCTA.label}
              </button>

              {checkinDone && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={() => window.location.href = '/ai-coach'}
                    className="text-[13px] text-white/40 font-medium"
                  >
                    Talk to Nora instead
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mood card */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-2xl flex-shrink-0">
              {mood.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] text-neutral-900 leading-snug"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {mood.label}
              </p>
              <p className="text-[12px] text-neutral-400 mt-0.5">{mood.sub}</p>
            </div>
            <div className="text-center pl-4 border-l border-neutral-200 flex-shrink-0">
              <p className="text-[26px] font-semibold text-[#E8614D] leading-none"
                 style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {streak > 0 ? streak : daysTogether}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 mt-1">
                {streak > 0 ? <>day<br/>streak</> : <>days<br/>together</>}
              </p>
            </div>
          </div>

        </section>

        {/* COUPLES DEBRIEF CARD */}
        {showCouplesDebrief && (
          <section>
            <div className="bg-white border border-[#E8614D]/20 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#E8614D]/5 -translate-y-8 translate-x-8 pointer-events-none" />
              <button
                onClick={() => {
                  localStorage.setItem('abf_couples_debrief_dismissed', 'true')
                  setShowCouplesDebrief(false)
                  supabase.from('user_profiles').update({ couples_debrief_dismissed: true }).eq('user_id', user.id).then(() => {}).catch(() => {})
                }}
                className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-neutral-300 hover:text-neutral-500"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#252048] to-[#6B4A72] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">N</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-neutral-800 mb-1">You both have profiles now</p>
                  <p className="text-[13px] text-neutral-500 leading-relaxed mb-4">Nora has read both of yours. She wants to walk you through what your combination means — what works naturally and what to watch for.</p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        const opener = `${userName || 'Hey'} — I've now read both your profile and ${partnerName}'s. Your combination is really interesting and I want to walk you through it together. There's a lot here about how you naturally complement each other, and a few things worth being mindful of. Where would you like to start — what works, or what to watch for?`
                        sessionStorage.setItem('nora_opener', opener)
                        localStorage.setItem('nora_pending_couples_opener', opener)
                      }
                      localStorage.setItem('abf_couples_debrief_dismissed', 'true')
                      setShowCouplesDebrief(false)
                      supabase.from('user_profiles').update({ couples_debrief_dismissed: true }).eq('user_id', user.id).then(() => {}).catch(() => {})
                      router.push('/ai-coach?new=true')
                    }}
                    className="w-full min-h-[44px] bg-[#E8614D] text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform"
                  >
                    Meet with Nora →
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 2 — PRIMARY ACTION */}
        {nextDate && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Coming up
            </div>
            <button
              onClick={() => window.location.href = '/dates'}
              className="w-full rounded-2xl overflow-hidden relative min-h-[100px] active:scale-[0.99] transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#1B5E47] to-[#2E9B70]" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
              <div className="relative p-5 text-left">
                <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-white/50 mb-2">📅 Date Night</p>
                <p className="text-white text-[22px] leading-tight mb-1"
                   style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                  {nextDate.title}
                </p>
                <p className="text-white/60 text-[12px] font-medium">
                  {(() => {
                    const days = getDaysUntil(nextDate.date_time)
                    if (days === 0) return 'Tonight'
                    if (days === 1) return 'Tomorrow'
                    return `${days} days away`
                  })()}
                </p>
              </div>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white text-lg backdrop-blur-sm">
                ›
              </div>
            </button>
          </section>
        )}

        {/* SECTION 3 — SUGGESTED ACTIONS */}
        <section>
          <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
            Do something together
          </div>
          <div className="grid grid-cols-2 gap-3">
            {displayActions.map(action => (
              <button
                key={action.id}
                onClick={() => window.location.href = action.href}
                className={`rounded-2xl p-4 min-h-[120px] flex flex-col text-left border active:scale-[0.97] transition-transform ${
                  action.urgent
                    ? 'bg-[#FEF3F1] border-[#F5C9C2]'
                    : 'bg-white border-neutral-200'
                } shadow-sm`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg ${
                  action.urgent ? 'bg-[rgba(232,97,77,0.1)]' : 'bg-neutral-100'
                }`}>
                  {action.id === 'checkin' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E8614D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  {action.id === 'flirt' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                  {action.id === 'date' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                  {action.id === 'trip' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                  {action.id === 'reflection' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>}
                </div>
                <p className="text-[13px] font-semibold text-neutral-900 leading-snug mb-1">{action.verb}</p>
                {action.hint && <p className="text-[11px] text-neutral-400 leading-snug mt-auto">{action.hint}</p>}
                {action.nudge && <p className="text-[11px] font-semibold text-[#E8614D] mt-2">{action.nudge}</p>}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 4 — OPTIONAL CONTENT: Today's Read */}
        {todaysRead && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Today's read
            </div>
            <a href={todaysRead.url} target="_blank" rel="noopener noreferrer" className="block">
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                        style={{ backgroundColor: todaysRead.sourceColor || '#3D3580' }}
                      >
                        {todaysRead.source}
                      </span>
                      <span className="text-[11px] text-neutral-400">5 min read</span>
                    </div>
                    <p className="text-[15px] text-neutral-900 leading-snug line-clamp-2"
                       style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                      {todaysRead.title}
                    </p>
                    {todaysRead.description && (
                      <p className="text-[12px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {todaysRead.description}
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 flex-shrink-0 flex items-center justify-center text-2xl">
                    📖
                  </div>
                </div>
              </div>
            </a>
          </section>
        )}

      </div>
    </div>
  )
}
