'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RabbitHoleDebriefPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [debrief, setDebrief] = useState(null)
  const [activeQuestion, setActiveQuestion] = useState(0)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: couple } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)

      // Get active/completed session
      const statusRes = await fetch(`/api/game-room/lobby-status?coupleId=${couple.id}&mode=rabbit-hole`)
      const statusData = await statusRes.json()
      if (!statusData.session) {
        router.push('/game-room')
        return
      }
      setSessionId(statusData.session.id)

      // Generate debrief
      const debriefRes = await fetch('/api/game-room/generate-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: statusData.session.id, coupleId: couple.id }),
      })
      const debriefData = await debriefRes.json()

      if (debriefData.error) {
        setError(debriefData.error)
      } else {
        setDebrief(debriefData)
      }

      setLoading(false)
    }
    init()
  }, [router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>
            Nora is pulling the threads together...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1A1A1A', marginBottom: '16px' }}>Something went wrong with the debrief.</p>
          <button onClick={() => router.push('/game-room')} style={{ background: '#4338CA', color: '#FFFFFF', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '15px', cursor: 'pointer' }}>
            Back to Game Room
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
          borderRadius: '20px', padding: '28px 24px', marginBottom: '24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A5B4FC' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Nora · The Convergence</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: '0 0 4px' }}>
              {debrief?.topic}
            </p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#FFFFFF', lineHeight: 1.6, margin: 0 }}>
              {debrief?.convergence_reveal}
            </p>
          </div>
        </div>

        {/* Questions */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 700 }}>
            Talk about this
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {debrief?.questions?.map((q, i) => (
              <button
                key={i}
                onClick={() => setActiveQuestion(i)}
                style={{
                  background: activeQuestion === i ? '#EEF2FF' : '#FFFFFF',
                  border: `1.5px solid ${activeQuestion === i ? '#4338CA' : '#E8DDD0'}`,
                  borderRadius: '16px', padding: '18px 20px',
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'all 150ms',
                }}
              >
                <p style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: '16px',
                  color: activeQuestion === i ? '#1E1B4B' : '#1A1A1A',
                  lineHeight: 1.5, margin: 0,
                }}>
                  {q}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Talk to Nora */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => {
              if (debrief?.questions?.[activeQuestion]) {
                sessionStorage.setItem('nora_opener', debrief.questions[activeQuestion])
              }
              router.push('/ai-coach?new=true')
            }}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
              color: '#FFFFFF', border: 'none', borderRadius: '30px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Talk to Nora about this
          </button>
          <button
            onClick={() => router.push('/game-room')}
            style={{
              width: '100%', padding: '14px',
              background: 'transparent', border: '0.5px solid #E8DDD0',
              borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer',
            }}
          >
            Back to Game Room
          </button>
        </div>

        {/* Timeline note */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#B8A898', marginTop: '24px', fontStyle: 'italic' }}>
          This session has been saved to your timeline ✓
        </p>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
