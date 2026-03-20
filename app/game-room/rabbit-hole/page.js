'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TIMER_OPTIONS = [
  { minutes: 30, label: '30 min', description: 'Quick dive' },
  { minutes: 60, label: '1 hour', description: 'Good depth' },
  { minutes: 90, label: '90 min', description: 'Go deep' },
]

export default function RabbitHoleLobbyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [iAmIn, setIAmIn] = useState(false)
  const [partnerIsIn, setPartnerIsIn] = useState(false)
  const [selectedTimer, setSelectedTimer] = useState(60)
  const [sessionId, setSessionId] = useState(null)
  const [entering, setEntering] = useState(false)
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: couple } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id

      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      if (myProfile?.display_name) setUserName(myProfile.display_name)
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      // Check for existing lobby session
      const res = await fetch(`/api/game-room/lobby-status?coupleId=${couple.id}&mode=rabbit-hole`)
      const data = await res.json()
      if (data.session) {
        setSessionId(data.session.id)
        const isUser1 = couple.user1_id === user.id
        setIAmIn(isUser1 ? data.session.user1_in_lobby : data.session.user2_in_lobby)
        setPartnerIsIn(isUser1 ? data.session.user2_in_lobby : data.session.user1_in_lobby)
        if (data.session.timer_minutes) setSelectedTimer(data.session.timer_minutes)
        if (data.session.status === 'active') {
          router.push('/game-room/rabbit-hole/play')
          return
        }
      }

      setLoading(false)
    }
    init()
  }, [router])

  // Poll for partner joining
  useEffect(() => {
    if (!coupleId || !iAmIn) return
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/game-room/lobby-status?coupleId=${coupleId}&mode=rabbit-hole`)
      const data = await res.json()
      if (data.session) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: couple } = await supabase.from('couples').select('user1_id').eq('id', coupleId).maybeSingle()
        const isUser1 = couple?.user1_id === user?.id
        setPartnerIsIn(isUser1 ? data.session.user2_in_lobby : data.session.user1_in_lobby)
        if (data.session.status === 'active') {
          clearInterval(pollRef.current)
          router.push('/game-room/rabbit-hole/play')
        }
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [coupleId, iAmIn, router])

  const handleEnterLobby = async () => {
    if (entering || !userId || !coupleId) return
    setEntering(true)
    try {
      const res = await fetch('/api/game-room/enter-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, mode: 'rabbit-hole' }),
      })
      const data = await res.json()
      if (data.session) {
        setSessionId(data.session.id)
        setIAmIn(true)
      }
    } catch {} finally { setEntering(false) }
  }

  const handleStart = async () => {
    if (starting || !sessionId) return
    setStarting(true)
    try {
      await fetch('/api/game-room/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, coupleId, timerMinutes: selectedTimer }),
      })
      router.push('/game-room/rabbit-hole/play')
    } catch {} finally { setStarting(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const bothInLobby = iAmIn && partnerIsIn

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '56px 24px 120px' }}>

        {/* Header */}
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '0 0 20px', cursor: 'pointer', color: '#7A8C6E', fontSize: '14px' }}>
          ← Back
        </button>

        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
          borderRadius: '20px',
          padding: '28px 24px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>The Rabbit Hole</p>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 6px' }}>
            The Lobby
          </h1>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>
            Both of you need to be here before Nora drops you in.
          </p>
        </div>

        {/* Lobby slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {/* Me */}
          <div style={{
            background: '#FFFFFF',
            border: `2px solid ${iAmIn ? '#4338CA' : '#E8DDD0'}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'border-color 300ms',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: iAmIn ? '#EEF2FF' : '#F5F0EA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {iAmIn ? '✓' : '○'}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{userName || 'You'}</p>
              <p style={{ fontSize: '13px', color: iAmIn ? '#4338CA' : '#9CA3AF', margin: '2px 0 0' }}>
                {iAmIn ? 'In the lobby' : 'Not yet in'}
              </p>
            </div>
          </div>

          {/* Partner */}
          <div style={{
            background: '#FFFFFF',
            border: `2px solid ${partnerIsIn ? '#4338CA' : '#E8DDD0'}`,
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            transition: 'border-color 300ms',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: partnerIsIn ? '#EEF2FF' : '#F5F0EA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>
              {partnerIsIn ? '✓' : '○'}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{partnerName}</p>
              <p style={{ fontSize: '13px', color: partnerIsIn ? '#4338CA' : '#9CA3AF', margin: '2px 0 0' }}>
                {partnerIsIn ? 'In the lobby' : iAmIn ? 'Waiting for them...' : 'Not yet in'}
              </p>
            </div>
          </div>
        </div>

        {/* Timer selection — only show once both are in */}
        {bothInLobby && (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '12px' }}>How long do you have?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {TIMER_OPTIONS.map(option => (
                <button
                  key={option.minutes}
                  onClick={() => setSelectedTimer(option.minutes)}
                  style={{
                    flex: 1,
                    padding: '14px 8px',
                    borderRadius: '14px',
                    border: `2px solid ${selectedTimer === option.minutes ? '#4338CA' : '#E8DDD0'}`,
                    background: selectedTimer === option.minutes ? '#EEF2FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 700, color: selectedTimer === option.minutes ? '#4338CA' : '#1A1A1A', margin: 0 }}>{option.label}</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {!iAmIn ? (
          <button
            onClick={handleEnterLobby}
            disabled={entering}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: '30px',
              fontSize: '16px', fontWeight: 600, cursor: entering ? 'not-allowed' : 'pointer',
              opacity: entering ? 0.7 : 1,
            }}
          >
            {entering ? 'Entering...' : 'Enter the lobby'}
          </button>
        ) : !partnerIsIn ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Waiting for {partnerName} to join...
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={starting}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: '30px',
              fontSize: '16px', fontWeight: 600, cursor: starting ? 'not-allowed' : 'pointer',
              opacity: starting ? 0.7 : 1,
            }}
          >
            {starting ? 'Dropping you in...' : "We're both here — drop us in 🕳️"}
          </button>
        )}

      </div>
    </div>
  )
}
