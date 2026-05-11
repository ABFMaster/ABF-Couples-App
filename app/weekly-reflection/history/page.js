'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'

export default function ReflectionHistoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [reflections, setReflections] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const uid = session.user.id

        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .maybeSingle()

        if (!couple) { setError('No couple found.'); setLoading(false); return }

        const { data: rows } = await supabase
          .from('weekly_reflections')
          .select('id, week_start, opening, moments, pattern, week_ahead, generated_at')
          .eq('couple_id', couple.id)
          .not('opening', 'is', null)
          .order('week_start', { ascending: false })

        setReflections(rows || [])
      } catch {
        setError('Something went wrong.')
      }
      setLoading(false)
    }
    init()
  }, [])

  const getWeekLabel = (weekStart) => {
    if (!weekStart) return 'Unknown week'
    const d = new Date(weekStart + 'T12:00:00')
    return 'Week of ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C4714A', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <p style={{ color: '#C4714A', fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }}>{error}</p>
        <button onClick={() => router.push('/weekly-reflection')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#A09080', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6EF', fontFamily: 'DM Sans, sans-serif', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px' }}>
        <button onClick={() => router.push('/weekly-reflection')} style={{ background: 'none', border: 'none', color: '#A09080', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C4714A' }} />
          <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87' }}>Nora · Archive</span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 300, color: '#1C1208', lineHeight: 1.3, margin: 0 }}>Past Reflections</h1>
      </div>

      <div style={{ padding: '0 24px' }}>
        {reflections.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#A09080', fontStyle: 'italic' }}>No reflections yet. Check back after your first week.</p>
          </div>
        ) : (
          reflections.map((r, idx) => (
            <div key={r.id} style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: idx < reflections.length - 1 ? '1px solid #EDE5D8' : 'none' }}>
              {/* Week label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4AA87' }} />
                <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87' }}>{getWeekLabel(r.week_start)}</span>
              </div>

              {/* Opening */}
              {r.opening && (
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', color: '#2D2418', lineHeight: 1.6, margin: '0 0 16px', fontStyle: 'italic' }}>{r.opening}</p>
              )}

              {/* Moments */}
              {r.moments?.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '8px' }}>Moments</div>
                  {r.moments.map((moment, i) => (
                    <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', border: '1px solid #EDE5D8' }}>
                      <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2D2418', lineHeight: 1.5, margin: 0 }}>{typeof moment === 'string' ? moment : moment.text || moment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Pattern */}
              {r.pattern && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Pattern</div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2D2418', lineHeight: 1.5, margin: 0 }}>{r.pattern}</p>
                </div>
              )}

              {/* Week ahead */}
              {r.week_ahead && (
                <div style={{ background: '#1C1208', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', marginBottom: '6px' }}>Carried forward</div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#FAF6EF', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{r.week_ahead}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
