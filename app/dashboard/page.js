'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FlirtSheet from '@/components/FlirtSheet'
import SparkCard from '@/components/SparkCard'
import BetCard from '@/components/BetCard'
import RitualCard from '@/components/RitualCard'

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()

  const [loading, setLoading]         = useState(true)
  const [user, setUser]               = useState(null)
  const [userName, setUserName]       = useState('there')
  const [couple, setCouple]           = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [flirtSheetOpen, setFlirtSheetOpen] = useState(false)
  const [partnerId, setPartnerId]     = useState(null)
  const [daysTogether, setDaysTogether] = useState(0)

  const [memoryCard, setMemoryCard]   = useState(null)
  const [memoryLoading, setMemoryLoading] = useState(true)

  const [heroData, setHeroData]       = useState(null)
  const [heroLoading, setHeroLoading] = useState(true)
  const [weather, setWeather]         = useState(null)

  const [spark, setSpark]             = useState(null)
  const [mine, setMine]               = useState(null)
  const [theirs, setTheirs]           = useState(null)
  const [sparkIntroShown, setSparkIntroShown] = useState(false)
  const [bet, setBet]                 = useState(null)
  const [betMine, setBetMine]         = useState(null)
  const [betTheirs, setBetTheirs]     = useState(null)

  const todayName = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' })
  const params = typeof window !== 'undefined' ? window.location.search : ''
  const showSpark = ['Monday', 'Tuesday', 'Thursday'].includes(todayName) || params.includes('spark=true')
  const showBet = todayName === 'Wednesday' || params.includes('bet=true')
  const showRitual = todayName === 'Friday' || params.includes('ritual=true')
  const showGameRoom = todayName === 'Saturday' || params.includes('game=true')
  const anyScheduled = showSpark || showBet || showRitual || showGameRoom

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
      setPartnerId(partnerId)
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

      ])

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!user?.id || !couple?.id) return
    setMemoryLoading(true)
    fetch(`/api/dashboard/memory?userId=${user.id}&coupleId=${couple.id}`)
      .then(r => r.json())
      .then(d => setMemoryCard(d))
      .catch(() => setMemoryCard(null))
      .finally(() => setMemoryLoading(false))
  }, [user, couple])

  useEffect(() => {
    if (!user?.id || !couple?.id) return
    setHeroLoading(true)
    const params = new URLSearchParams({
      userId: user.id,
      coupleId: couple.id,
      userName,
      partnerName,
    })
    const doFetch = (lat, lon) => {
      if (lat != null && lon != null) {
        params.set('lat', lat)
        params.set('lon', lon)
        fetch(`/api/weather?lat=${lat}&lon=${lon}`)
          .then(r => r.json())
          .then(d => { if (d.temp != null) setWeather(d) })
          .catch(() => {})
      }
      fetch(`/api/dashboard/hero?${params}`)
        .then(r => r.json())
        .then(d => setHeroData(d))
        .catch(() => {})
        .finally(() => setHeroLoading(false))
    }
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => doFetch(pos.coords.latitude, pos.coords.longitude),
        () => doFetch(null, null),
        { timeout: 5000 }
      )
    } else {
      doFetch(null, null)
    }
  }, [user, couple, userName, partnerName])

  useEffect(() => {
    const initPush = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { registerPushSubscription } = await import('@/lib/push-notifications')
        await registerPushSubscription(supabase, user.id)
      } catch (err) {
        console.error('Push init error:', err)
      }
    }
    initPush()
  }, [])

  useEffect(() => {
    if (!user?.id || !couple?.id) return
    if (showSpark) fetchSpark()
    if (showBet) fetchBet()
  }, [user, couple])

  const fetchSpark = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/spark/today?spark=true', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.spark) setSpark(data.spark)
      if (data.mine) setMine(data.mine)
      if (data.theirs) setTheirs(data.theirs)
    } catch {}
  }

  const fetchBet = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/bet/today?bet=true', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.bet) setBet(data.bet)
      if (data.mine) setBetMine(data.mine)
      if (data.theirs) setBetTheirs(data.theirs)
    } catch {}
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

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const coupleMoment = null

  return (
    <div style={{ minHeight: '100vh', background: '#F7F4EF' }}>
      <div style={{ paddingTop: 52, paddingBottom: 120 }}>

        {/* SECTION 1 — HEADER */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 38, fontWeight: 300, color: '#1C1410', lineHeight: 1.15, margin: 0, marginBottom: 5 }}>
            Good {timeOfDay}, {userName}.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#C4AA87', margin: 0, marginBottom: coupleMoment ? 10 : 0 }}>
            {dateStr}{weather?.temp ? ` · ${weather.temp}° ${weather.condition}` : ''} · {daysTogether} days together
          </p>
          {coupleMoment && (
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: '#C4714A', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#1C1410' }}>{coupleMoment}</span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#C4AA87' }}>›</span>
            </button>
          )}
        </div>
        <div style={{ height: 1, background: '#EDE4D8', margin: '0 20px 20px' }} />

        {/* SECTION 2 — TODAY'S FEATURE CARD */}
        {showSpark && !spark && (
          <div style={{ margin: '0 16px 14px', padding: '20px', background: 'white', borderRadius: '18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#C4AA87', fontSize: '16px' }}>Loading today's Spark...</p>
          </div>
        )}
        {showSpark && spark && (
          <div style={{ margin: '0 16px 14px' }}>
            <SparkCard
              spark={spark}
              mine={mine}
              theirs={theirs}
              partnerName={partnerName}
              sparkIntroShown={sparkIntroShown}
              onRespond={() => fetchSpark()}
              onSkip={() => fetchSpark()}
              onReact={() => fetchSpark()}
            />
          </div>
        )}
        {showBet && !bet && (
          <div style={{ margin: '0 16px 14px', padding: '20px', background: 'white', borderRadius: '18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: '#C4AA87', fontSize: '16px' }}>Loading today's Bet...</p>
          </div>
        )}
        {showBet && bet && (
          <div style={{ margin: '0 16px 14px' }}>
            <BetCard
              bet={bet}
              mine={betMine}
              theirs={betTheirs}
              partnerId={partnerId}
              partnerName={partnerName}
              userId={user?.id}
              coupleId={couple?.id}
            />
          </div>
        )}
        {showRitual && user?.id && couple?.id && (
          <div style={{ margin: '0 16px 14px' }}>
            <RitualCard
              userId={user?.id}
              coupleId={couple?.id}
              partnerName={partnerName}
            />
          </div>
        )}
        {showGameRoom && (
          <div style={{ margin: '0 16px 14px' }}>
            <button
              onClick={() => router.push('/game-room')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
                borderRadius: '20px',
                padding: '24px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 6px' }}>The Game Room</p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '24px', fontWeight: 300, color: '#FFFFFF', margin: '0 0 6px', lineHeight: 1.2 }}>
                What are we playing?
              </p>
              <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>
                Two games ready. Nora picks the topic.
              </p>
            </button>
          </div>
        )}
        {!anyScheduled && (
          <div style={{ margin: '0 16px 14px', textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', color: '#C4AA87', fontSize: '18px' }}>Nothing scheduled today. Enjoy the day.</p>
          </div>
        )}

        {/* SECTION 3 — NORA SECONDARY CARD */}
        <div style={{ background: 'linear-gradient(145deg, #1C1410 0%, #2D3561 100%)', borderRadius: 18, padding: '18px 20px', margin: '0 16px 14px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9, position: 'relative' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, color: '#C9A84C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Nora</span>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 16, fontWeight: 300, fontStyle: 'italic', color: '#fff', lineHeight: 1.55, margin: 0, marginBottom: 10, position: 'relative' }}>
            {heroLoading
              ? <span style={{ display: 'inline-block', width: 180, height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 4 }} />
              : heroData?.message || `Good ${timeOfDay}, ${userName}.`}
          </p>
          <button
            onClick={() => router.push('/ai-coach')}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'block', position: 'relative' }}
          >
            Talk to Nora →
          </button>
        </div>

        {/* SECTION 4 — DAYS TOGETHER + MEMORY */}
        <div style={{ padding: '0 16px' }}>

          {memoryLoading ? (
            <div>
              <div className="h-4 w-32 bg-neutral-200 rounded mb-3 animate-pulse" />
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 h-24 animate-pulse" />
            </div>
          ) : memoryCard?.empty ? (
            <div>
              <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
                Your Story
              </div>
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F2A090]" />
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#E8614D]">Nora</span>
                </div>
                <p className="text-[14px] text-neutral-600 leading-relaxed mb-3">
                  Every relationship has a story. Add your first memory — your first date, a trip, anything that matters.
                </p>
                <button
                  onClick={() => router.push('/timeline')}
                  className="text-[14px] font-semibold text-[#E8614D]"
                >
                  Add a memory →
                </button>
              </div>
            </div>
          ) : memoryCard && !memoryCard.empty ? (
            <div>
              <div className="text-[11px] font-bold tracking-[0.09em] uppercase text-neutral-400 mb-3 px-1">
                From Your Timeline
              </div>
              <button
                onClick={() => router.push('/timeline')}
                className="w-full bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden text-left active:scale-[0.99] transition-transform"
              >
                {memoryCard.photo_urls?.[0] && (
                  <img
                    src={memoryCard.photo_urls[0]}
                    alt={memoryCard.title}
                    className="w-full h-36 object-cover"
                  />
                )}
                <div className="p-5">
                  {memoryCard.event_type && (
                    <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-1">
                      {({ custom: 'Memory', trip: 'Trip', milestone: 'Milestone', anniversary: 'Anniversary', first: 'First', other: 'Moment' }[memoryCard.event_type] ?? memoryCard.event_type.charAt(0).toUpperCase() + memoryCard.event_type.slice(1))}
                    </p>
                  )}
                  <p className="text-[18px] text-neutral-900 leading-snug mb-1"
                     style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}>
                    {memoryCard.title}
                  </p>
                  {memoryCard.event_date && (
                    <p className="text-[12px] text-neutral-400">
                      {new Date(memoryCard.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </button>
            </div>
          ) : null}

        </div>

        {/* SECTION 5 — FLIRTS */}
        <div style={{ padding: '0 16px', marginTop: 22 }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4AA87', margin: 0, marginBottom: 10 }}>
            Send a flirt
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              onClick={() => setFlirtSheetOpen(true)}
              style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #EDE4D8', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#7A8C7E', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#1C1410', fontFamily: "'DM Sans', sans-serif", margin: 0, marginBottom: 3 }}>Send a song</p>
              <p style={{ fontSize: 10, color: '#C4AA87', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>What you're thinking of</p>
            </button>
            <button
              onClick={() => setFlirtSheetOpen(true)}
              style={{ background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #EDE4D8', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#C4714A', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#1C1410', fontFamily: "'DM Sans', sans-serif", margin: 0, marginBottom: 3 }}>Send a prompt</p>
              <p style={{ fontSize: 10, color: '#C4AA87', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Start a conversation</p>
            </button>
          </div>
        </div>

      </div>

      <FlirtSheet
        isOpen={flirtSheetOpen}
        onClose={() => setFlirtSheetOpen(false)}
        partnerName={partnerName}
        partnerId={partnerId}
        userId={user?.id}
      />
    </div>
  )
}
