'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function HuntPlayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [userName, setUserName] = useState('')
  const [huntSession, setHuntSession] = useState(null)
  const [phase, setPhase] = useState('loading')
  const [dropText, setDropText] = useState('')
  const [debriefText, setDebriefText] = useState('')
  const [user1Sentence, setUser1Sentence] = useState('')
  const [user2Sentence, setUser2Sentence] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [debriefSubmitted, setDebriefSubmitted] = useState(false)
  const [noraVerdict, setNoraVerdict] = useState(null)
  const [saveToTimeline, setSaveToTimeline] = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    async function init() {
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
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle()
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (myProfile?.display_name) setUserName(myProfile.display_name)
    }
    init()
  }, [router])

  // Poll for hunt session state
  useEffect(() => {
    if (!sessionId || !userId) return
    pollRef.current = setInterval(async () => {
      // Check for abandoned session
      const { data: sessStatus } = await supabase
        .from('game_sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle()
      if (sessStatus?.status === 'abandoned') {
        clearInterval(pollRef.current)
        router.push('/game-room')
        return
      }

      const { data: hunt } = await supabase
        .from('hunt_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (!hunt) return
      setHuntSession(hunt)

      if (hunt.nora_verdict && phase !== 'verdict') {
        setNoraVerdict(hunt.nora_verdict)
        setPhase('verdict')
        return
      }

      if (hunt.status === 'returned' && phase === 'active') {
        setPhase('debrief')
        return
      }

      if (hunt.status === 'active' && phase === 'briefing') {
        setPhase('active')
        return
      }

      if (hunt.status === 'briefing' && phase === 'loading') {
        setPhase('briefing')
        return
      }

      if (phase === 'loading' && hunt.status) {
        if (hunt.status === 'complete') { setNoraVerdict(hunt.nora_verdict); setPhase('verdict') }
        else if (hunt.status === 'returned') setPhase('debrief')
        else if (hunt.status === 'active') setPhase('active')
        else setPhase('briefing')
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [sessionId, userId, phase])

  async function handleEndGame() {
    await fetch('/api/game-room/enter-lobby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, coupleId, action: 'abandon', sessionId }),
    })
    router.push('/game-room')
  }

  async function handleConfirm() {
    if (submitting) return
    setSubmitting(true)
    await fetch('/api/game-room/hunt/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setPhase('active')
    setSubmitting(false)
  }

  async function handleDrop() {
    if (!dropText.trim() || submitting) return
    setSubmitting(true)
    await fetch('/api/game-room/hunt/drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId, coupleId, dropText }),
    })
    setDropText('')
    setSubmitting(false)
  }

  async function handleReturn() {
    if (submitting) return
    setSubmitting(true)
    await fetch('/api/game-room/hunt/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setPhase('debrief')
    setSubmitting(false)
  }

  async function handleDebrief() {
    if (!debriefText.trim() || submitting) return
    setSubmitting(true)
    setDebriefSubmitted(true)
    const res = await fetch('/api/game-room/hunt/debrief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId, coupleId, debriefText }),
    })
    const data = await res.json()
    if (data.verdict) {
      setNoraVerdict(data.verdict)
      setPhase('verdict')
    }
    setSubmitting(false)
  }

  const indigo = 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)'

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1C1510', opacity: 0.6 }}>Nora is finding your mission…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ padding: '48px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={handleEndGame} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
          End game
        </button>
        <span style={{ fontSize: '12px', color: '#9CA3AF' }}>The Hunt</span>
      </div>

      <div style={{ padding: '0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* BRIEFING */}
        {phase === 'briefing' && huntSession && (
          <div>
            <div style={{ background: indigo, borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>Your Mission</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: '0 0 16px' }}>{huntSession.nora_intro}</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', lineHeight: 1.5, color: '#FFFFFF', margin: 0 }}>{huntSession.mission_text}</p>
            </div>

            {huntSession.hint && (
              <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>Nora's note</p>
                <p style={{ fontSize: '14px', color: '#1E1B4B', margin: 0, fontStyle: 'italic' }}>{huntSession.hint}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={submitting}
              style={{ width: '100%', padding: '16px', background: submitting ? '#E5E7EB' : indigo, color: submitting ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? 'Starting…' : "We're in →"}
            </button>
          </div>
        )}

        {/* ACTIVE — out in the world */}
        {phase === 'active' && huntSession && (
          <div>
            <div style={{ background: indigo, borderRadius: '20px', padding: '28px 24px', marginBottom: '24px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>The Mission</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', lineHeight: 1.5, color: '#FFFFFF', margin: 0 }}>{huntSession.mission_text}</p>
            </div>

            {/* Drop a find */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 10px' }}>Drop something you found</p>
              <textarea
                value={dropText}
                onChange={e => setDropText(e.target.value)}
                placeholder="Something you noticed, found, or want to remember…"
                rows={3}
                style={{ width: '100%', padding: '12px', border: '0.5px solid #E8DDD0', borderRadius: '10px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", resize: 'none', background: '#FAF6F0', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <button
                onClick={handleDrop}
                disabled={!dropText.trim() || submitting}
                style={{ width: '100%', padding: '12px', background: !dropText.trim() ? '#F3F4F6' : '#1E1B4B', color: !dropText.trim() ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: !dropText.trim() ? 'not-allowed' : 'pointer' }}>
                Drop it
              </button>
            </div>

            {/* Show drops if any */}
            {(huntSession.user1_drop || huntSession.user2_drop) && (
              <div style={{ marginBottom: '16px' }}>
                {huntSession.user1_drop && (
                  <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dropped</p>
                    <p style={{ fontSize: '14px', color: '#1C1510', margin: 0 }}>{huntSession.user1_drop}</p>
                  </div>
                )}
                {huntSession.user2_drop && (
                  <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Dropped</p>
                    <p style={{ fontSize: '14px', color: '#1C1510', margin: 0 }}>{huntSession.user2_drop}</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleReturn}
              disabled={submitting}
              style={{ width: '100%', padding: '16px', background: submitting ? '#E5E7EB' : 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: submitting ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting ? '…' : "We're back →"}
            </button>
          </div>
        )}

        {/* DEBRIEF */}
        {phase === 'debrief' && huntSession && (
          <div>
            <div style={{ background: indigo, borderRadius: '20px', padding: '24px', marginBottom: '24px' }}>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#FFFFFF', margin: '0 0 8px' }}>You're back.</p>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Tell Nora what happened.</p>
            </div>

            {!debriefSubmitted ? (
              <div>
                <textarea
                  value={debriefText}
                  onChange={e => setDebriefText(e.target.value)}
                  placeholder="What happened? What surprised you? What will you remember?"
                  rows={5}
                  style={{ width: '100%', padding: '14px', border: '0.5px solid #E8DDD0', borderRadius: '12px', fontSize: '15px', fontFamily: "'DM Sans', sans-serif", resize: 'none', background: '#FFFFFF', boxSizing: 'border-box', marginBottom: '12px' }}
                />
                <button
                  onClick={handleDebrief}
                  disabled={!debriefText.trim() || submitting}
                  style={{ width: '100%', padding: '16px', background: !debriefText.trim() ? '#E5E7EB' : indigo, color: !debriefText.trim() ? '#9CA3AF' : '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: !debriefText.trim() ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Sending…' : 'Tell Nora →'}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>Waiting for {partnerName}…</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VERDICT */}
        {phase === 'verdict' && noraVerdict && (
          <div>
            <div style={{ background: indigo, borderRadius: '20px', padding: '28px 24px', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>Nora's Verdict</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', lineHeight: 1.6, color: '#FFFFFF', margin: 0 }}>{noraVerdict}</p>
            </div>

            {/* Mission recap */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>The Mission</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1C1510', margin: 0, fontStyle: 'italic' }}>{huntSession?.mission_text}</p>
            </div>

            {/* Save to Timeline */}
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', color: '#1C1510', margin: '0 0 2px', fontWeight: 500 }}>Save to Timeline</p>
                  <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>Add this Hunt to your relationship story</p>
                </div>
                <button
                  onClick={async () => {
                    setSaveToTimeline(true)
                    await supabase.from('hunt_sessions').update({ save_to_timeline: true }).eq('session_id', sessionId)
                  }}
                  disabled={saveToTimeline}
                  style={{ padding: '8px 16px', background: saveToTimeline ? '#ECFDF5' : '#1E1B4B', color: saveToTimeline ? '#059669' : '#FFFFFF', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: saveToTimeline ? 'default' : 'pointer' }}>
                  {saveToTimeline ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push('/game-room')}
              style={{ width: '100%', padding: '16px', background: indigo, color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: 'pointer' }}>
              Back to Game Room
            </button>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  )
}

export default function HuntPlayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <HuntPlayContent />
    </Suspense>
  )
}
