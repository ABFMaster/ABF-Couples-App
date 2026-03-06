'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const FEATURE_SPOTLIGHTS = [
  {
    id: 'wander',
    title: 'Dream a trip together',
    description: 'Tell Wander where you want to go and it will build an entire trip around you two.',
    action: 'Start Wandering →',
    href: '/trips',
  },
  {
    id: 'reflection',
    title: 'Weekly reflection',
    description: 'Two minutes. One question. A record of your relationship over time.',
    action: 'Start reflecting →',
    href: '/weekly-reflection',
  },
  {
    id: 'timeline',
    title: 'Your relationship timeline',
    description: 'Every memory, milestone, and moment — all in one place.',
    action: 'Add a memory →',
    href: '/timeline',
  },
  {
    id: 'flirts',
    title: 'Send a flirt',
    description: 'A small thing that means a lot. Takes 10 seconds.',
    action: 'Send one now →',
    href: '/flirts',
  },
  {
    id: 'dates',
    title: 'Plan your next date',
    description: 'Let ABF help you plan something worth looking forward to.',
    action: 'Browse ideas →',
    href: '/dates',
  },
]

const NORA_SURPRISES = [
  "What's something small your partner does that still makes you smile?",
  "If you could relive one moment together, which would it be?",
  "What's one thing you've never told your partner that you appreciate about them?",
  "What does a perfect Sunday look like for you two?",
  "What's something you're looking forward to doing together this year?",
  "When did you last laugh together until it hurt?",
  "What's one habit your partner has that you secretly love?",
  "If you could go anywhere together tomorrow, where would it be?",
]

function getDayIndex() {
  const start = new Date('2026-01-01')
  const today = new Date()
  return Math.floor((today - start) / 86400000)
}

export default function TodayPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [streak, setStreak] = useState(0)
  const [daysTogether, setDaysTogether] = useState(0)
  const [flirtCount, setFlirtCount] = useState(0)
  const [lastFlirtDaysAgo, setLastFlirtDaysAgo] = useState(null)
  const [checkinDone, setCheckinDone] = useState(false)
  const [memoryCount, setMemoryCount] = useState(0)
  const [neglectedFeature, setNeglectedFeature] = useState(null)
  const [spotlight, setSpotlight] = useState(null)
  const [noraSurprise, setNoraSurprise] = useState('')
  const [insight, setInsight] = useState(null)

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) { router.push('/connect'); return }

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const days = Math.floor((Date.now() - new Date(couple.created_at).getTime()) / 86400000)
      setDaysTogether(days)

      await Promise.allSettled([

        // User name
        (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .maybeSingle()
          if (data?.display_name) setUserName(data.display_name)
        })(),

        // Partner name
        partnerId ? (async () => {
          const { data } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', partnerId)
            .maybeSingle()
          if (data?.display_name) setPartnerName(data.display_name)
        })() : Promise.resolve(),

        // Streak + checkin
        (async () => {
          const today = new Date().toISOString().split('T')[0]
          const { data } = await supabase
            .from('daily_checkins')
            .select('check_date')
            .eq('user_id', user.id)
            .eq('couple_id', couple.id)
            .not('question_response', 'is', null)
            .order('check_date', { ascending: false })
            .limit(60)
          if (!data?.length) return
          setCheckinDone(data[0].check_date === today)
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

        // Flirts
        (async () => {
          const { data } = await supabase
            .from('flirts')
            .select('sender_id, created_at')
            .eq('couple_id', couple.id)
            .order('created_at', { ascending: false })
            .limit(50)
          const mine = (data || []).filter(f => f.sender_id === user.id)
          setFlirtCount(mine.length)
          if (mine.length > 0) {
            setLastFlirtDaysAgo(Math.floor((Date.now() - new Date(mine[0].created_at).getTime()) / 86400000))
          }
        })(),

        // Memory count
        (async () => {
          const { count } = await supabase
            .from('timeline_events')
            .select('id', { count: 'exact', head: true })
            .eq('couple_id', couple.id)
          setMemoryCount(count || 0)
        })(),

      ])

      setLoading(false)
    } catch (err) {
      console.error('Today error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Compute derived state after data loads
  useEffect(() => {
    if (loading) return
    const dayIndex = getDayIndex()

    // Nora surprise — rotates daily
    setNoraSurprise(NORA_SURPRISES[dayIndex % NORA_SURPRISES.length])

    // Neglected feature — what hasn't been done recently
    if (!checkinDone) {
      setNeglectedFeature({
        verb: 'Check in together',
        hint: 'You haven\'t checked in today yet',
        href: '/checkin',
        urgent: true,
      })
    } else if (lastFlirtDaysAgo === null || lastFlirtDaysAgo >= 3) {
      setNeglectedFeature({
        verb: `Send ${partnerName} a flirt`,
        hint: lastFlirtDaysAgo >= 3 ? `${lastFlirtDaysAgo} days since your last one` : 'You haven\'t sent one yet',
        href: '/flirts',
        urgent: lastFlirtDaysAgo >= 5,
      })
    } else if (memoryCount === 0) {
      setNeglectedFeature({
        verb: 'Add your first memory',
        hint: 'Start your relationship timeline',
        href: '/timeline',
        urgent: false,
      })
    } else {
      setNeglectedFeature({
        verb: 'Start your weekly reflection',
        hint: 'Takes 2 minutes',
        href: '/weekly-reflection',
        urgent: false,
      })
    }

    // Feature spotlight — rotates daily, avoids neglected feature
    const available = FEATURE_SPOTLIGHTS.filter(f =>
      neglectedFeature ? f.href !== neglectedFeature.href : true
    )
    setSpotlight(available[dayIndex % available.length])

    // Relationship insight — one story from real data
    if (streak >= 7) {
      setInsight(`${streak} days in a row. That kind of consistency is rare — and it matters more than you think.`)
    } else if (flirtCount >= 10) {
      setInsight(`${flirtCount} flirts since you started. That's not nothing — that's showing up for each other every day.`)
    } else if (daysTogether > 30) {
      setInsight(`${daysTogether} days together in ABF. The couples who make it this far are the ones who keep going.`)
    } else if (memoryCount > 0) {
      setInsight(`You've saved ${memoryCount} ${memoryCount === 1 ? 'memory' : 'memories'} together. Every one of them is worth keeping.`)
    } else {
      setInsight(`You two are just getting started. The best part about that? Everything is still ahead of you.`)
    }

  }, [loading, checkinDone, lastFlirtDaysAgo, memoryCount, streak, flirtCount, daysTogether, partnerName, neglectedFeature])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF]">
      <div className="px-6 pt-10 pb-32 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[28px] text-neutral-900 leading-tight"
              style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
            Today
          </h1>
        </div>

        {/* SECTION 1 — NORA SURPRISE */}
        <section>
          <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
            From Nora
          </div>
          <div className="bg-gradient-to-br from-[#252048] via-[#3E3585] to-[#6B4A72] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#E8614D]/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40">Nora</span>
              </div>
              <p className="text-white text-[20px] leading-[1.45] mb-5"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {noraSurprise}
              </p>
              <button
                onClick={() => {
                  sessionStorage.setItem('nora_opener', noraSurprise)
                  router.push('/ai-coach?new=true')
                }}
                className="w-full min-h-[48px] bg-white text-[#E8614D] rounded-xl font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md"
              >
                Talk to Nora about this →
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2 — PRIMARY ACTION (neglected feature) */}
        {neglectedFeature && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Pick up where you left off
            </div>
            <button
              onClick={() => router.push(neglectedFeature.href)}
              className={`w-full rounded-2xl p-5 flex items-center gap-4 text-left border active:scale-[0.98] transition-transform shadow-sm ${
                neglectedFeature.urgent
                  ? 'bg-[#FEF3F1] border-[#F5C9C2]'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                neglectedFeature.urgent ? 'bg-[rgba(232,97,77,0.1)]' : 'bg-neutral-100'
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     stroke={neglectedFeature.urgent ? '#E8614D' : '#6B6560'}
                     strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-neutral-900 leading-snug">{neglectedFeature.verb}</p>
                <p className="text-[12px] text-neutral-400 mt-0.5">{neglectedFeature.hint}</p>
              </div>
              <span className="text-neutral-300 text-xl flex-shrink-0">›</span>
            </button>
          </section>
        )}

        {/* SECTION 3 — RELATIONSHIP INSIGHT */}
        {insight && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Something Nora noticed
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <p className="text-[18px] text-neutral-900 leading-[1.5]"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {insight}
              </p>
            </div>
          </section>
        )}

        {/* SECTION 4 — FEATURE SPOTLIGHT */}
        {spotlight && (
          <section>
            <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
              Have you tried this?
            </div>
            <button
              onClick={() => router.push(spotlight.href)}
              className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 text-left active:scale-[0.98] transition-transform"
            >
              <p className="text-[18px] text-neutral-900 mb-2 leading-snug"
                 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                {spotlight.title}
              </p>
              <p className="text-[13px] text-neutral-400 leading-relaxed mb-4">
                {spotlight.description}
              </p>
              <span className="text-[13px] font-semibold text-[#E8614D]">
                {spotlight.action}
              </span>
            </button>
          </section>
        )}

      </div>
    </div>
  )
}
