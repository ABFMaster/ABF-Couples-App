'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { getModeConfig } from '@/lib/game-room-config'
import { MEMORY_LOCKED_COPY } from '@/lib/challenge-prompts'

function GameRoomLobbyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'rabbit-hole'
  const forceNew = searchParams.get('forceNew') === 'true'
  const config = getModeConfig(mode)

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [iAmIn, setIAmIn] = useState(false)
  const [partnerIsIn, setPartnerIsIn] = useState(false)
  const [together, setTogether] = useState(null)
  const [selectedTimer, setSelectedTimer] = useState(config.defaultTimer || 60)
  const [sessionId, setSessionId] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [entering, setEntering] = useState(false)
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)
  const coupleRef = useRef(null)

  // Challenge-specific state
  const [callSessionId, setCallSessionId] = useState(null)
  const [challengeSessionId, setChallengeSessionId] = useState(null)
  const [challengeRecommendedType, setChallengeRecommendedType] = useState(null)
  const [challengeRecommendedReason, setChallengeRecommendedReason] = useState(null)
  const [challengeAvailableTypes, setChallengeAvailableTypes] = useState([])
  const [challengeSelectedType, setChallengeSelectedType] = useState(null)
  const [showChallengeTypeSelect, setShowChallengeTypeSelect] = useState(false)
  const totalRounds = challengeSelectedType === 'memory' ? 3 : 1

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
      coupleRef.current = couple

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      if (myProfile?.display_name) setUserName(myProfile.display_name)
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      // Check for existing lobby session for this mode
      const { data: existing } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('couple_id', couple.id)
        .eq('mode', mode)
        .eq('status', 'lobby')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setSessionId(existing.id)
        const isUser1 = couple.user1_id === user.id
        const myInLobby = isUser1 ? existing.user1_in_lobby : existing.user2_in_lobby
        const partnerInLobby = isUser1 ? existing.user2_in_lobby : existing.user1_in_lobby
        setIAmIn(myInLobby)
        setPartnerIsIn(partnerInLobby)
        if (existing.timer_minutes) setSelectedTimer(existing.timer_minutes)
        if (existing.together !== null) setTogether(existing.together)
        // Set host: I am host if I am in lobby but partner is not
        setIsHost(existing.host_user_id === user.id)
      }

      setLoading(false)
    }
    init()
  }, [router, mode])

  // Poll for partner joining
  useEffect(() => {
    if (!coupleId || !iAmIn) return
    pollRef.current = setInterval(async () => {
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('couple_id', coupleId)
        .eq('mode', mode)
        .in('status', ['lobby', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sess) {
        const { data: { user } } = await supabase.auth.getUser()
        const freshIsHost = sess.host_user_id === user.id
        console.log('[LOBBY POLL]', { mode, status: sess.status, freshIsHost, hostId: sess.host_user_id, userId: user?.id })
        setIsHost(freshIsHost)

        if (sess.status === 'active') {
          if (mode === 'the-call') {
            if (freshIsHost) return
            const { data: callSess } = await supabase
              .from('call_sessions')
              .select('id')
              .eq('session_id', sess.id)
              .maybeSingle()
            if (callSess) {
              clearInterval(pollRef.current)
              router.push(`/game-room/call/play?sessionId=${sess.id}&callSessionId=${callSess.id}`)
            }
            return
          }
          if (mode === 'challenge') {
            // Only partner polls for challenge session — host navigates directly from Let's go
            if (freshIsHost) return
            const { data: challengeSess } = await supabase
              .from('challenge_sessions')
              .select('id, challenge_type')
              .eq('session_id', sess.id)
              .eq('status', 'active')
              .maybeSingle()
            if (challengeSess) {
              clearInterval(pollRef.current)
              router.push(`/game-room/challenge/play?sessionId=${sess.id}&challengeSessionId=${challengeSess.id}&type=${challengeSess.challenge_type}&rounds=${challengeSess.challenge_type === 'memory' ? 3 : 1}&scribe=false`)
            }
            return
          }
          clearInterval(pollRef.current)
          if (mode === 'the-hunt') {
            router.push(`/game-room/the-hunt/play?sessionId=${sess.id}`)
          } else {
            router.push(`${config.playPath}?sessionId=${sess.id}`)
          }
          return
        }

        const couple = coupleRef.current
        const isUser1 = couple?.user1_id === user?.id
        setPartnerIsIn(isUser1 ? sess.user2_in_lobby : sess.user1_in_lobby)
        setIAmIn(prev => prev ? prev : (isUser1 ? sess.user1_in_lobby : sess.user2_in_lobby))
        if (sess?.id) setSessionId(sess.id)
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [coupleId, iAmIn, router, mode, config.playPath])

  const handleEnterLobby = async () => {
    if (entering || !userId || !coupleId) return
    setEntering(true)
    try {
      const res = await fetch('/api/game-room/enter-lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, mode, forceNew }),
      })
      const data = await res.json()
      if (data.session) {
        setSessionId(data.session.id)
        setIAmIn(true)
        setIsHost(data.session.host_user_id === userId)
      }
    } catch {} finally { setEntering(false) }
  }

  const handleStart = async () => {
    if (starting || !sessionId) return
    if (mode !== 'challenge' && together === null) return
    setStarting(true)
    console.log('[HANDLE START]', { mode, together, sessionId })
    try {
      await fetch('/api/game-room/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          coupleId,
          timerMinutes: config.hasTimer ? selectedTimer : null,
          together,
        }),
      })

      if (mode === 'the-hunt') {
        const res = await fetch('/api/game-room/hunt/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            coupleId,
            sessionId,
            together,
            timeTag: null,
            dateId: searchParams.get('dateId') || null,
          }),
        })
        const data = await res.json()
        if (!data.huntSession) return
        router.push(`/game-room/the-hunt/play?sessionId=${sessionId}`)
        setStarting(false)
        return
      }

      if (mode === 'the-call') {
        const res = await fetch('/api/game-room/call/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, coupleId, userId }),
        })
        const data = await res.json()
        if (!data.callSession) return
        router.push(`/game-room/call/play?sessionId=${sessionId}&callSessionId=${data.callSession.id}`)
        setStarting(false)
        return
      }

      if (mode === 'challenge') {
        const res = await fetch('/api/game-room/challenge/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, coupleId, sessionId, totalRounds }),
        })
        const data = await res.json()
        setChallengeRecommendedType(data.recommendedType)
        setChallengeRecommendedReason(data.reason)
        setChallengeAvailableTypes(data.availableTypes || [])
        setChallengeSelectedType(null)
        setShowChallengeTypeSelect(true)
        setStarting(false)
        return
      }

      router.push(`${config.playPath}?sessionId=${sessionId}`)
    } catch (err) {
      console.log('[HANDLE START ERROR]', err)
      setStarting(false)
    } finally { setStarting(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const CHALLENGE_TYPES = [
    { id: 'story', name: 'Write a Story', emoji: '✍️', description: 'Take a prompt and write something together — absurd, tender, or dramatic.' },
    { id: 'pitch', name: 'The Pitch', emoji: '💼', description: 'Nora gives you something to sell. Convince her to invest.' },
    { id: 'rank', name: 'Rank It', emoji: '🏆', description: 'Nora gives you a list. You put it in order — then defend your choices.' },
    { id: 'plan', name: 'Make a Plan', emoji: '🗓️', description: 'Nora gives you something to plan. Make it real.' },
    { id: 'memory', name: 'Memory Test', emoji: '🧠', description: 'Nora asks about your relationship. How well do you actually know each other?' },
  ]

  if (showChallengeTypeSelect) {
    const recommendedConfig = CHALLENGE_TYPES.find(t => t.id === challengeRecommendedType)
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <div style={{ padding: '56px 24px 120px' }}>

          <button onClick={() => setShowChallengeTypeSelect(false)} style={{ background: 'none', border: 'none', padding: '0 0 20px', cursor: 'pointer', color: '#7A8C6E', fontSize: '14px' }}>
            ← Back
          </button>

          <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>The Challenge</p>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 4px' }}>Pick your challenge</h1>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>Nora has a recommendation.</p>
          </div>

          {/* Nora's recommendation */}
          {recommendedConfig && (
            <div style={{ background: '#EEF2FF', border: '2px solid #4338CA', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#4338CA', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 10px' }}>Nora's pick</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{recommendedConfig.emoji}</span>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', fontWeight: 400, color: '#1A1A1A', margin: 0 }}>{recommendedConfig.name}</p>
              </div>
              {challengeRecommendedReason && (
                <p style={{ fontSize: '14px', color: '#4338CA', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>"{challengeRecommendedReason}"</p>
              )}
            </div>
          )}

          {/* All type cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {CHALLENGE_TYPES.map(type => {
              const isAvailable = challengeAvailableTypes.includes(type.id)
              const isSelected = challengeSelectedType === type.id
              const isMemoryLocked = type.id === 'memory' && !isAvailable

              return (
                <button
                  key={type.id}
                  onClick={() => !isMemoryLocked && setChallengeSelectedType(type.id)}
                  style={{
                    background: isSelected ? '#EEF2FF' : '#FFFFFF',
                    border: `2px solid ${isSelected ? '#4338CA' : '#E8DDD0'}`,
                    borderRadius: '16px',
                    padding: '18px 20px',
                    textAlign: 'left',
                    cursor: isMemoryLocked ? 'default' : 'pointer',
                    opacity: isMemoryLocked ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{type.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', fontWeight: 400, color: isSelected ? '#4338CA' : '#1A1A1A', margin: 0 }}>{type.name}</p>
                      {type.id === challengeRecommendedType && (
                        <span style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#4338CA', background: '#EEF2FF', borderRadius: '6px', padding: '2px 7px', fontWeight: 600 }}>Nora's pick</span>
                      )}
                      {isMemoryLocked && (
                        <span style={{ fontSize: '10px', letterSpacing: '0.08em', color: '#B8A898', background: '#F5F0EA', borderRadius: '6px', padding: '2px 7px' }}>Locked</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.5, margin: 0 }}>
                      {isMemoryLocked ? MEMORY_LOCKED_COPY.body : type.description}
                    </p>
                  </div>
                  {isSelected && !isMemoryLocked && (
                    <span style={{ color: '#4338CA', fontSize: '18px', flexShrink: 0, alignSelf: 'center' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <button
            onClick={async () => {
              if (!challengeSelectedType || !sessionId) return
              const res = await fetch('/api/game-room/challenge/confirm-type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId,
                  coupleId,
                  challengeType: challengeSelectedType,
                  totalRounds,
                }),
              })
              const data = await res.json()
              if (!data.challengeSession) return
              router.push(`/game-room/challenge/play?sessionId=${sessionId}&challengeSessionId=${data.challengeSession.id}&type=${challengeSelectedType}&rounds=${totalRounds}&scribe=true`)
            }}
            disabled={!challengeSelectedType}
            style={{ width: '100%', padding: '16px', background: challengeSelectedType ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0', color: challengeSelectedType ? '#FFFFFF' : '#B8A898', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: challengeSelectedType ? 'pointer' : 'not-allowed' }}
          >
            Let's go →
          </button>

        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const bothInLobby = iAmIn && partnerIsIn
  const canStart = bothInLobby && (mode === 'challenge' || together !== null) && (!config.hasTimer || selectedTimer)

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '56px 24px 120px' }}>

        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '0 0 20px', cursor: 'pointer', color: '#7A8C6E', fontSize: '14px' }}>
          ← Back
        </button>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>The Game Room</p>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 4px' }}>{config.name}</h1>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>{config.tagline}</p>
        </div>

        {/* Lobby slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
          <div style={{ background: '#FFFFFF', border: `2px solid ${iAmIn ? '#4338CA' : '#E8DDD0'}`, borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: iAmIn ? '#EEF2FF' : '#F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {iAmIn ? '✓' : '○'}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{userName || 'You'}</p>
              <p style={{ fontSize: '13px', color: iAmIn ? '#4338CA' : '#9CA3AF', margin: '2px 0 0' }}>{iAmIn ? 'In the lobby' : 'Not yet in'}</p>
            </div>
          </div>
          <div style={{ background: '#FFFFFF', border: `2px solid ${partnerIsIn ? '#4338CA' : '#E8DDD0'}`, borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: partnerIsIn ? '#EEF2FF' : '#F5F0EA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
              {partnerIsIn ? '✓' : '○'}
            </div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{partnerName}</p>
              <p style={{ fontSize: '13px', color: partnerIsIn ? '#4338CA' : '#9CA3AF', margin: '2px 0 0' }}>{partnerIsIn ? 'In the lobby' : iAmIn ? 'Waiting for them...' : 'Not yet in'}</p>
            </div>
          </div>
        </div>

        {/* What you'll need */}
        {config.materials?.length > 0 && (
          <div style={{ background: '#FFFBEB', border: '0.5px solid #FDE68A', borderRadius: '16px', padding: '18px 20px', marginBottom: '24px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#92400E', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 12px' }}>What you'll need</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {config.materials.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '18px' }}>{m.emoji}</span>
                  <p style={{ fontSize: '14px', color: '#78350F', margin: 0 }}>{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Together/Remote + Timer — only show when both in lobby */}
        {bothInLobby && (
          <div style={{ marginBottom: '24px' }}>
            {/* Together or remote — not shown for Challenge since mechanic is proximity-independent */}
            {isHost && mode !== 'challenge' ? (
              <>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '12px' }}>Are you together right now?</p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {[{ value: true, label: '👫 Together' }, { value: false, label: '📱 Remote' }].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setTogether(opt.value)}
                      style={{ flex: 1, padding: '14px 8px', borderRadius: '14px', border: `2px solid ${together === opt.value ? '#4338CA' : '#E8DDD0'}`, background: together === opt.value ? '#EEF2FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 150ms', fontSize: '14px', fontWeight: 600, color: together === opt.value ? '#4338CA' : '#1A1A1A' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {/* Timer — only for modes that need it */}
            {config.hasTimer && (
              isHost ? (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', marginBottom: '12px' }}>How long do you have?</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {config.timerOptions.map(option => (
                      <button
                        key={option.minutes}
                        onClick={() => setSelectedTimer(option.minutes)}
                        style={{ flex: 1, padding: '14px 8px', borderRadius: '14px', border: `2px solid ${selectedTimer === option.minutes ? '#4338CA' : '#E8DDD0'}`, background: selectedTimer === option.minutes ? '#EEF2FF' : '#FFFFFF', cursor: 'pointer', transition: 'all 150ms' }}
                      >
                        <p style={{ fontSize: '15px', fontWeight: 700, color: selectedTimer === option.minutes ? '#4338CA' : '#1A1A1A', margin: 0 }}>{option.label}</p>
                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>{option.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: '14px', color: 'rgba(245,236,215,0.5)', textAlign: 'center', padding: '12px 0', fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic' }}>
                  {selectedTimer ? `${partnerName} set ${selectedTimer} minutes ⏱` : `Waiting for ${partnerName} to set the timer...`}
                </p>
              )
            )}
          </div>
        )}

        {/* CTA */}
        {!iAmIn && (
          <button
            onClick={handleEnterLobby}
            disabled={entering}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: entering ? 'not-allowed' : 'pointer', opacity: entering ? 0.7 : 1 }}
          >
            {entering ? 'Entering...' : 'Enter the lobby'}
          </button>
        )}
        {iAmIn && !partnerIsIn && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Waiting for {partnerName} to join...
            </div>
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
          </div>
        )}
        {bothInLobby && isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart || starting}
            style={{ width: '100%', padding: '16px', background: canStart ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0', color: canStart ? '#FFFFFF' : '#B8A898', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: canStart && !starting ? 'pointer' : 'not-allowed', opacity: starting ? 0.7 : 1 }}
          >
            {starting ? 'Starting...' : together === null && mode !== 'challenge' ? 'Are you together?' : `Let's play — ${config.name}`}
          </button>
        )}
        {bothInLobby && !isHost && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '14px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Waiting for {partnerName} to start…
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default function GameRoomLobbyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <GameRoomLobbyContent />
    </Suspense>
  )
}
