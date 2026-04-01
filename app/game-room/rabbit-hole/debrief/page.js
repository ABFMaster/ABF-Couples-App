'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function RabbitHoleDebriefContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [session, setSession] = useState(null)
  const [debrief, setDebrief] = useState(null)
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState('factual') // factual | truth
  const [savedToTimeline, setSavedToTimeline] = useState(false)

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

      if (!sessionIdParam) { router.push('/game-room'); return }

      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionIdParam)
        .maybeSingle()

      if (!sess) { router.push('/game-room'); return }
      setSession(sess)

      const isHostUser = sess.host_user_id === user.id

      if (isHostUser) {
        // Host generates the debrief — single generation, clean data
        const debriefRes = await fetch('/api/game-room/generate-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sess.id, coupleId: couple.id }),
        })
        const debriefData = await debriefRes.json()

        if (debriefData.error) {
          setError(debriefData.error)
          setLoading(false)
          return
        }

        setDebrief(debriefData)
        setLoading(false)
        setTimeout(() => setPhase('truth'), 10000)
      } else {
        // Partner polls for debrief to be ready — reads from DB once generated
        const pollDebrief = setInterval(async () => {
          const { data: updatedSess } = await supabase
            .from('game_sessions')
            .select('debrief_generated, convergence, factual_close, debrief_questions')
            .eq('id', sess.id)
            .maybeSingle()

          if (updatedSess?.debrief_generated && updatedSess.convergence) {
            clearInterval(pollDebrief)
            setDebrief({
              convergence_reveal: updatedSess.convergence,
              factual_close: updatedSess.factual_close,
              questions: updatedSess.debrief_questions || [],
            })
            setLoading(false)
            setTimeout(() => setPhase('truth'), 10000)
          }
        }, 2000)
      }
    }
    init()
  }, [router])

  const handleSaveToTimeline = async () => {
    try {
      await supabase
        .from('timeline_events')
        .insert({
          couple_id: coupleId,
          event_type: 'custom',
          title: `Rabbit Hole: ${session?.hole_topic}`,
          description: session?.convergence,
          event_date: new Date().toISOString().split('T')[0],
          created_by: userId,
        })
      setSavedToTimeline(true)
    } catch {}
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>Nora is pulling the threads together...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1A1A1A', marginBottom: '16px' }}>Something went wrong.</p>
          <button onClick={() => router.push('/game-room')} style={{ background: '#4338CA', color: '#FFFFFF', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '15px', cursor: 'pointer' }}>Back to Game Room</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A5B4FC' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Nora · The Convergence</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: '0 0 4px' }}>{session?.hole_topic}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#FFFFFF', lineHeight: 1.6, margin: 0 }}>
              {debrief?.convergence_reveal}
            </p>
          </div>
        </div>

        {/* PART 1 — Factual close */}
        {phase === 'factual' && (
          <div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>The bigger picture</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#1A1A1A', lineHeight: 1.65, margin: 0 }}>
                {debrief?.convergence_reveal}
              </p>
            </div>
          </div>
        )}

        {/* PART 2 — Human truth */}
        {phase === 'truth' && (
          <div>
            <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>What actually happened</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#1E1B4B', lineHeight: 1.65, margin: 0 }}>
                {debrief?.factual_close}
              </p>
            </div>

            {/* Debrief questions */}
            {debrief?.questions?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>Talk about this</p>
                {debrief.questions.map((q, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '18px 20px', marginBottom: '8px' }}>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.5, margin: 0 }}>{q}</p>
                  </div>
                ))}
              </div>
            )}

            {savedToTimeline ? (
              <div style={{ background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: '16px', padding: '16px 20px', textAlign: 'center', marginBottom: '10px' }}>
                <p style={{ fontSize: '14px', color: '#065F46', fontWeight: 600, margin: 0 }}>Saved to your timeline ✓</p>
              </div>
            ) : (
              <button
                onClick={handleSaveToTimeline}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}
              >
                Save to our timeline ✦
              </button>
            )}
            <button
              onClick={() => router.push('/game-room')}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Back to Game Room
            </button>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function RabbitHoleDebriefPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RabbitHoleDebriefContent />
    </Suspense>
  )
}
