'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FlirtCard from '@/components/FlirtCard'
import SparkCard from '@/components/SparkCard'
import BetCard from '@/components/BetCard'
import RitualCard from '@/components/RitualCard'
import ThursdayCard from '@/components/ThursdayCard'
import WednesdayCard from '@/components/WednesdayCard'

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()

  const [loading, setLoading]         = useState(true)
  const [user, setUser]               = useState(null)
  const [userName, setUserName]       = useState('there')
  const [couple, setCouple]           = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [partnerId, setPartnerId]     = useState(null)
  const [daysTogether, setDaysTogether] = useState(0)

  const [memoryCard, setMemoryCard]   = useState(null)
  const [memoryLoading, setMemoryLoading] = useState(true)

  const [session, setSession]         = useState(null)
  const [isSolo, setIsSolo]           = useState(false)
  const [heroData, setHeroData]       = useState(null)
  const [heroLoading, setHeroLoading] = useState(true)
  const [weather, setWeather]         = useState(null)

  const [spark, setSpark]             = useState(null)
  const [mine, setMine]               = useState(null)
  const [theirs, setTheirs]           = useState(null)
  const [sparkIntroShown, setSparkIntroShown] = useState(false)
  const [sparkSubmitting, setSparkSubmitting] = useState(false)
  const [bet, setBet]                 = useState(null)
  const [betMine, setBetMine]         = useState(null)
  const [betTheirs, setBetTheirs]     = useState(null)

  const [relationshipPhotos, setRelationshipPhotos]     = useState([])
  const [uploadingPhotos, setUploadingPhotos]           = useState(false)
  const [photoUploadComplete, setPhotoUploadComplete]   = useState(false)
  const photoUploadRef = useRef(null)

  const todayName = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' })
  const params = typeof window !== 'undefined' ? window.location.search : ''
  const showSpark = todayName === 'Monday' || params.includes('spark=true')
  const showBet = todayName === 'Tuesday' || params.includes('bet=true')
  const showNotice = todayName === 'Wednesday' || params.includes('notice=true')
  const showThursday = todayName === 'Thursday' || params.includes('thursday=true')
  const showRitual = todayName === 'Friday' || params.includes('ritual=true')
  const showGameRoom = todayName === 'Saturday' || params.includes('game=true')
  const anyScheduled = showSpark || showBet || showRitual || showGameRoom || showNotice || showThursday

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUser(user)

      const { data: { session: s } } = await supabase.auth.getSession()
      setSession(s)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!coupleData || !coupleData.connected_at) {
        setIsSolo(true)
        if (!coupleData) {
          setLoading(false)
          return
        }
      }
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

  const fetchHero = useCallback(() => {
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
    fetchHero()
  }, [fetchHero])

  useEffect(() => {
    const initPush = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { registerPushSubscription } = await import('@/lib/push-notifications')
        await registerPushSubscription(user.id)
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

  const handleSparkInvite = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({
        userId: partnerId,
        title: 'The Spark',
        body: `${userName} wants to know what you think.`,
        url: '/dashboard',
        route: 'dashboard',
      }),
    }).catch(() => {})
  }

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

  const handleSparkRespond = async (answerText) => {
    if (sparkSubmitting) return
    setSparkSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/spark/respond', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sparkId: spark.id, responseText: answerText }),
      })
      if (!res.ok) return
      await fetchSpark()
    } finally {
      setSparkSubmitting(false)
    }
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

  const uploadRelationshipPhoto = async (file) => {
    if (!file || !user?.id) return
    try {
      const sb = supabase
      const path = `relationship/${couple?.id || user.id}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { data } = await sb.storage.from('photos').upload(path, file, { upsert: true })
      console.log('[photo] upload result:', data)
      const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const token = session?.access_token
      if (token) {
        fetch('/api/timeline/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            coupleId: couple?.id || null,
            userId: user.id,
            title: 'A moment from our story',
            eventType: 'custom',
            eventDate: new Date().toISOString().split('T')[0],
            photoUrls: [publicUrl],
          })
        }).catch(() => {})
      }

      setRelationshipPhotos(prev => [...prev, publicUrl])
      console.log('[photo] relationshipPhotos length after set:', relationshipPhotos.length + 1)
    } catch(e) {
      console.error('Photo upload error:', e)
    }
  }

  const handlePhotoFiles = async (files) => {
    if (!files?.length) return
    setUploadingPhotos(true)
    await Promise.allSettled(Array.from(files).map(f => uploadRelationshipPhoto(f)))
    setUploadingPhotos(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C4714A] border-t-transparent mx-auto mb-4" />
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
              onRespond={handleSparkRespond}
              onSkip={() => fetchSpark()}
              onReact={() => fetchSpark()}
              onInvite={handleSparkInvite}
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
        {showNotice && (
          <WednesdayCard
            userId={user?.id}
            coupleId={couple?.id}
            userName={userName}
            partnerName={partnerName}
            session={session}
          />
        )}
        {showRitual && user?.id && couple?.id && (
          <div style={{ margin: '0 16px 14px' }}>
            <RitualCard
              userId={user?.id}
              coupleId={couple?.id}
              partnerName={partnerName}
              onCheckinComplete={fetchHero}
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
            onClick={() => router.push(heroData?.cta_href || '/ai-coach')}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.45)', cursor: 'pointer', display: 'block', position: 'relative' }}
          >
            {heroData?.cta_label || 'Tell Nora →'}
          </button>
        </div>

        {/* SECTION 3.5 — THURSDAY CARD */}
        {showThursday && (
          <ThursdayCard
            userId={user?.id}
            coupleId={couple?.id}
            userName={userName}
            partnerName={partnerName}
            session={session}
          />
        )}

        {isSolo && (
          <div style={{ margin: '0 20px 20px', padding: '20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8DDD0' }}>
            <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8 }}>BRING THEM IN</div>
            <p style={{ fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', color: '#1C1410', lineHeight: 1.5, margin: '0 0 16px' }}>Share a code with your partner and Nora can start seeing you both.</p>
            <button
              onClick={() => router.push('/connect')}
              style={{ width: '100%', background: '#1C1410', color: '#FAF6F0', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer' }}>
              Get your connect code →
            </button>
          </div>
        )}

        {/* SECTION 3.6 — PHOTO UPLOAD */}
        <div style={{ margin: '0 20px 20px' }}>
          {!photoUploadComplete ? (
            <div style={{ padding: '20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8DDD0' }}>
              <div style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.12em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 8 }}>YOUR STORY IN PHOTOS</div>
              <p style={{ fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif', color: '#1C1410', lineHeight: 1.5, margin: '0 0 16px' }}>
                Add a photo that captures something real about you two. A trip, a moment, a Tuesday.
              </p>
              {relationshipPhotos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {relationshipPhotos.map((url, i) => (
                    <img key={i} src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              )}
              <input
                ref={photoUploadRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => e.target.files?.length && handlePhotoFiles(Array.from(e.target.files))}
              />
              <button
                onClick={() => photoUploadRef.current?.click()}
                disabled={uploadingPhotos}
                style={{ width: '100%', background: uploadingPhotos ? '#E8DDD0' : '#1C1410', color: uploadingPhotos ? '#8B7355' : '#FAF6F0', border: 'none', borderRadius: 10, padding: '13px 16px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: uploadingPhotos ? 'default' : 'pointer' }}>
                {uploadingPhotos ? 'Uploading…' : relationshipPhotos.length > 0 ? 'Add more photos →' : 'Add a photo →'}
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 16px', background: '#F0EDE8', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>📷</span>
              <span style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#8B7355' }}>Photos added. Nora will remember them.</span>
            </div>
          )}
        </div>

        {/* SECTION 3.7 — FLIRT CARD */}
        <FlirtCard
          userId={user?.id}
          coupleId={couple?.id}
          partnerId={partnerId}
          partnerName={partnerName}
          userName={userName}
          session={session}
        />

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
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#C4714A]">Nora</span>
                </div>
                <p className="text-[14px] text-neutral-600 leading-relaxed mb-3">
                  Every relationship has a story. Add your first memory — your first date, a trip, anything that matters.
                </p>
                <button
                  onClick={() => router.push('/timeline')}
                  className="text-[14px] font-semibold text-[#C4714A]"
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
              <div
                onClick={() => router.push('/us?section=been')}
                style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '12px', boxShadow: '0 2px 12px rgba(28,20,16,0.08)', cursor: 'pointer', position: 'relative', height: '260px' }}
              >
                {memoryCard.photo_urls?.[0] ? (
                  <img
                    src={memoryCard.photo_urls?.[0]}
                    alt={memoryCard.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #6B5020 0%, #C9A84C 50%, #D4BA7A 100%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />
                <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}>
                  {(() => {
                    const labels = { custom: 'Memory', trip: 'Trip', milestone: 'Milestone', anniversary: 'Anniversary', first: 'First', shared_item: 'Memory', other: 'Memory' }
                    return labels[memoryCard.event_type] || 'Memory'
                  })()}
                </div>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: '4px' }}>
                    {memoryCard.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                    {memoryCard.event_date ? new Date(memoryCard.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </div>

      </div>
    </div>
  )
}
