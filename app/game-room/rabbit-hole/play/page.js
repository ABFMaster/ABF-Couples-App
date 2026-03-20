'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RabbitHolePlayPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [session, setSession] = useState(null)
  const [hole, setHole] = useState(null)
  const [myThread, setMyThread] = useState(null)
  const [partnerThread, setPartnerThread] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [isUser1, setIsUser1] = useState(false)
  const [phase, setPhase] = useState('drop') // drop | find | dropped | debrief
  const [findText, setFindText] = useState('')
  const [myFind, setMyFind] = useState(null)
  const [partnerFind, setPartnerFind] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)
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

      const user1 = couple.user1_id === user.id
      setIsUser1(user1)

      const partnerId = user1 ? couple.user2_id : couple.user1_id
      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      if (myProfile?.display_name) setUserName(myProfile.display_name)
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      // Get active session
      const statusRes = await fetch(`/api/game-room/lobby-status?coupleId=${couple.id}&mode=rabbit-hole`)
      const statusData = await statusRes.json()
      if (!statusData.session || statusData.session.status !== 'active') {
        router.push('/game-room/rabbit-hole')
        return
      }
      setSession(statusData.session)

      // Generate or fetch the hole
      const holeRes = await fetch('/api/game-room/generate-hole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: statusData.session.id, coupleId: couple.id }),
      })
      const holeData = await holeRes.json()
      setHole(holeData)
      setMyThread(user1 ? holeData.thread_user1 : holeData.thread_user2)

      // Set timer
      if (statusData.session.expires_at) {
        const remaining = Math.max(0, new Date(statusData.session.expires_at) - new Date())
        setTimeLeft(Math.floor(remaining / 1000))
      }

      // Load any existing finds
      const { data: finds } = await supabase
        .from('game_finds')
        .select('*')
        .eq('session_id', statusData.session.id)
        .order('created_at', { ascending: true })

      if (finds?.length > 0) {
        const mine = finds.find(f => f.user_id === user.id)
        const theirs = finds.find(f => f.user_id !== user.id)
        if (mine) { setMyFind(mine); setPhase('dropped') }
        if (theirs) setPartnerFind(theirs)
      }

      setLoading(false)
    }
    init()
  }, [router])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null])

  // Poll for partner's find
  useEffect(() => {
    if (!session?.id || !userId) return
    pollRef.current = setInterval(async () => {
      const { data: finds } = await supabase
        .from('game_finds')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })
      if (finds?.length > 0) {
        const theirs = finds.find(f => f.user_id !== userId)
        if (theirs) setPartnerFind(theirs)
      }
    }, 5000)
    return () => clearInterval(pollRef.current)
  }, [session, userId])

  const handleDropFind = async () => {
    if (!findText.trim() || submitting) return
    setSubmitting(true)
    try {
      const { data } = await supabase
        .from('game_finds')
        .insert({
          session_id: session.id,
          couple_id: coupleId,
          user_id: userId,
          find_text: findText.trim(),
          round: 1,
        })
        .select('*')
        .maybeSingle()
      if (data) {
        setMyFind(data)
        setPhase('dropped')
        setFindText('')
      }
    } catch {} finally { setSubmitting(false) }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>Nora is picking your hole...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Timer bar */}
        {timeLeft !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={() => router.push('/game-room/rabbit-hole')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
              ← Back
            </button>
            <div style={{
              background: timeLeft < 300 ? '#FEF2F2' : '#EEF2FF',
              borderRadius: '20px', padding: '6px 14px',
              fontSize: '14px', fontWeight: 600,
              color: timeLeft < 300 ? '#DC2626' : '#4338CA',
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* THE DROP — entry point */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
          borderRadius: '20px', padding: '28px 24px', marginBottom: '24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A5B4FC' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Nora · The Drop</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#FFFFFF', lineHeight: 1.6, margin: '0 0 16px', fontStyle: 'italic' }}>
              {hole?.entry}
            </p>
            {hole?.nora_send_off && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, fontStyle: 'italic' }}>
                {hole.nora_send_off}
              </p>
            )}
          </div>
        </div>

        {/* YOUR THREAD */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>Your thread</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.55, margin: 0 }}>
            {myThread}
          </p>
        </div>

        {/* PARTNER THREAD — hidden until they drop a find */}
        {partnerFind && (
          <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>{partnerName} found something 🕳️</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A1A1A', lineHeight: 1.55, margin: 0 }}>
              {partnerFind.find_text}
            </p>
          </div>
        )}

        {/* DROP A FIND */}
        {phase === 'drop' ? (
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 12px' }}>Drop a find</p>
            <textarea
              value={findText}
              onChange={e => setFindText(e.target.value)}
              placeholder="What did you find? Paste a link, type a fact, share something wild..."
              style={{
                width: '100%', background: '#FAF6F0', border: '0.5px solid #E8DDD0',
                borderRadius: '12px', padding: '14px', fontSize: '14px',
                fontFamily: "'Fraunces', Georgia, serif", color: '#1A1A1A',
                resize: 'none', height: '100px', outline: 'none', boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleDropFind}
              disabled={!findText.trim() || submitting}
              style={{
                width: '100%', marginTop: '12px', padding: '14px',
                background: findText.trim() ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0',
                color: findText.trim() ? '#FFFFFF' : '#B8A898',
                border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600,
                cursor: findText.trim() && !submitting ? 'pointer' : 'not-allowed',
                transition: 'all 150ms',
              }}
            >
              {submitting ? 'Dropping...' : 'Drop it 🕳️'}
            </button>
          </div>
        ) : (
          <div>
            {/* My find — already dropped */}
            <div style={{ background: '#EEF2FF', border: '0.5px solid #C7D2FE', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>You dropped</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A1A1A', lineHeight: 1.55, margin: 0 }}>
                {myFind?.find_text}
              </p>
            </div>

            {!partnerFind && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: '14px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Waiting for {partnerName} to drop something...
                </div>
              </div>
            )}

            {/* Both dropped — show debrief CTA */}
            {myFind && partnerFind && (
              <button
                onClick={() => router.push('/game-room/rabbit-hole/debrief')}
                style={{
                  width: '100%', padding: '16px', marginTop: '8px',
                  background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
                  color: '#FFFFFF', border: 'none', borderRadius: '30px',
                  fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                We're back — talk to Nora 🕳️
              </button>
            )}
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
    </div>
  )
}
