'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

export default function WeeklyReflectionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [reacted, setReacted] = useState({})
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const uid = session.user.id
        setUserId(uid)

        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .maybeSingle()

        if (!couple) { setError('No couple found.'); setLoading(false); return }
        setCoupleId(couple.id)

        const token = session.access_token

        // Check for existing reflection
        const statusRes = await fetch(`/api/reflection/status?userId=${uid}&coupleId=${couple.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const statusData = await statusRes.json()

        if (statusData.hasReflection) {
          setReflection(statusData.reflection)
          setReacted(statusData.reflection.moment_reactions || {})
          // Mark viewed
          fetch('/api/reflection/viewed', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, coupleId: couple.id, weekStart: statusData.reflection.week_start })
          }).catch(() => {})
        } else {
          // Generate
          setLoading(false)
          setGenerating(true)
          const genRes = await fetch('/api/reflection/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, coupleId: couple.id })
          })
          const genData = await genRes.json()
          if (genData.reflection) {
            setReflection(genData.reflection)
            setReacted(genData.reflection.moment_reactions || {})
            fetch('/api/reflection/viewed', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ userId: uid, coupleId: couple.id, weekStart: genData.reflection.week_start })
            }).catch(() => {})
          } else {
            setError('Could not generate reflection. Try again later.')
          }
          setGenerating(false)
          return
        }
      } catch (err) {
        setError('Something went wrong.')
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleReact = async (momentIndex, reaction) => {
    const newReacted = { ...reacted, [momentIndex]: reaction }
    setReacted(newReacted)
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/api/reflection/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ coupleId, momentIndex, reaction })
    }).catch(() => {})
  }

  const getWeekLabel = (weekStart) => {
    if (!weekStart) return 'This Week'
    const d = new Date(weekStart + 'T12:00:00')
    return 'Week of ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  if (loading || generating) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C4714A', marginBottom: '20px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontSize: '15px', color: '#7A6A54', fontFamily: 'Georgia, serif', fontStyle: 'italic', textAlign: 'center' }}>
          {generating ? 'Nora is thinking about your week.\nThis takes a moment.' : 'Loading your reflection…'}
        </p>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <p style={{ color: '#C4714A', fontSize: '15px', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>{error}</p>
        <button onClick={() => router.push('/us')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#A09080', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
      </div>
    )
  }

  if (!reflection) return null

  const moments = reflection.moments || []

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6EF', fontFamily: 'DM Sans, sans-serif', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px' }}>
        <button onClick={() => router.push('/us')} style={{ background: 'none', border: 'none', color: '#A09080', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C4714A' }} />
          <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87' }}>Nora · {getWeekLabel(reflection.week_start)}</span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 300, color: '#1C1208', lineHeight: 1.3, margin: 0 }}>Weekly Reflection</h1>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* Opening */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#2D2418', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{reflection.opening}</p>
        </div>

        {/* Moments */}
        {moments.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '12px' }}>Moments from this week</div>
            {moments.map((moment, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '10px', border: '1px solid #EDE5D8' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2D2418', lineHeight: 1.5, margin: '0 0 12px' }}>{typeof moment === 'string' ? moment : moment.text || moment}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReact(i, 'lands')}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: reacted[i] === 'lands' ? '#C4714A' : '#EDE5D8', background: reacted[i] === 'lands' ? '#C4714A' : 'transparent', color: reacted[i] === 'lands' ? 'white' : '#A09080', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, transition: 'all 0.15s' }}
                  >lands</button>
                  <button
                    onClick={() => handleReact(i, 'not_quite')}
                    style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: reacted[i] === 'not_quite' ? '#1C1208' : '#EDE5D8', background: reacted[i] === 'not_quite' ? '#1C1208' : 'transparent', color: reacted[i] === 'not_quite' ? 'white' : '#A09080', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, transition: 'all 0.15s' }}
                  >not quite</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pattern */}
        {reflection.pattern && (
          <div style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '16px', border: '1px solid #EDE5D8' }}>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '8px' }}>This week's pattern</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2D2418', lineHeight: 1.5, margin: 0 }}>{reflection.pattern}</p>
          </div>
        )}

        {/* Week ahead */}
        {reflection.week_ahead && (
          <div style={{ background: '#1C1208', borderRadius: '14px', padding: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', marginBottom: '8px' }}>Carry this forward</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#FAF6EF', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{reflection.week_ahead}</p>
          </div>
        )}

        {/* Talk to Nora */}
        <button
          onClick={() => router.push('/nora')}
          style={{ width: '100%', padding: '14px', background: '#C4714A', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: '16px' }}
        >Talk to Nora about this →</button>

        {/* History link */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => router.push('/weekly-reflection/history')} style={{ background: 'none', border: 'none', color: '#A09080', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Past reflections →</button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
