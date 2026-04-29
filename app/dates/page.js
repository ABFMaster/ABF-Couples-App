'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const CURATED_IDEAS = [
  { id: 'quality-time', title: 'Something Slow', tag: 'Quality Time', gradient: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 100%)' },
  { id: 'adventure', title: 'Something New', tag: 'Adventure', gradient: 'linear-gradient(135deg, #2D3561 0%, #4A3570 100%)' },
  { id: 'connection', title: 'Something Just Us', tag: 'Connection', gradient: 'linear-gradient(135deg, #1C3A2A 0%, #4A6B5A 100%)' },
]

export default function DatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [upcomingDate, setUpcomingDate] = useState(null)
  const [pastDates, setPastDates] = useState([])

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/login'); return }

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    const cid = coupleData?.id ?? null
    if (!cid) { setLoading(false); return }

    const now = new Date().toISOString()

    const [{ data: upcoming }, { data: upcomingCustom }] = await Promise.all([
      supabase.from('date_plans').select('*').eq('couple_id', cid).eq('status', 'planned').gt('date_time', now).order('date_time', { ascending: true }).limit(1).maybeSingle(),
      supabase.from('custom_dates').select('*').eq('couple_id', cid).eq('status', 'planned').gt('date_time', now).order('date_time', { ascending: true }).limit(1).maybeSingle(),
    ])

    let upcomingToShow = null
    if (upcoming && upcomingCustom) {
      upcomingToShow = new Date(upcoming.date_time) <= new Date(upcomingCustom.date_time) ? upcoming : upcomingCustom
    } else if (upcoming) {
      upcomingToShow = upcoming
    } else if (upcomingCustom) {
      upcomingToShow = upcomingCustom
    }
    setUpcomingDate(upcomingToShow)

    const { data: pastPlans } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', cid)
      .neq('status', 'cancelled')
      .or(`status.eq.completed,date_time.lt.${now}`)
      .order('date_time', { ascending: false })
      .limit(10)

    const { data: customDates } = await supabase
      .from('custom_dates')
      .select('id, title, date_time, created_at, status, user1_rating, user2_rating, stops')
      .eq('couple_id', cid)
      .order('created_at', { ascending: false })
      .limit(6)

    const normalized = [
      ...(pastPlans ?? []).map(p => ({
        id: p.id, source: 'plan', title: p.title, date: p.date_time,
        stops: null, status: p.status, rating: p.rating,
      })),
      ...(customDates ?? []).map(c => ({
        id: c.id, source: 'custom', title: c.title, date: c.date_time || c.created_at,
        stops: c.stops, status: c.status, rating: c.user1_rating || c.user2_rating || null,
      })),
    ].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0))

    setPastDates(normalized)
    setLoading(false)
  }

  const handleBuildIdea = () => { router.push('/dates/custom') }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C4AA87', fontStyle: 'italic' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: '100px', fontFamily: 'DM Sans, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(145deg, #1C1410 0%, #2D3561 100%)', padding: '52px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(201,168,76,0.06)' }} />
        <button onClick={() => router.back()} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.18em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '4px' }}>Your Shared Life</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '44px', fontWeight: 300, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>Date Night</div>
          </div>
          <button onClick={() => router.push('/dates/custom')} style={{ fontSize: '12px', fontWeight: 500, color: '#C9A84C', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', padding: '10px 18px', borderRadius: '24px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' }}>
            + Plan a Date
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>

        {/* NEXT UP */}
        <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '12px' }}>Next Up</div>

        {upcomingDate ? (
          <div onClick={() => router.push(`/dates/${upcomingDate.id}`)} style={{ borderRadius: '18px', overflow: 'hidden', marginBottom: '24px', boxShadow: '0 2px 16px rgba(28,20,16,0.10)', cursor: 'pointer', position: 'relative', height: '200px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 50%, #2D3561 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />
            <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}>Date Night</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '24px', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: '4px' }}>{upcomingDate.title}</div>
              {upcomingDate.date_time && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmtDate(upcomingDate.date_time)} · {fmtTime(upcomingDate.date_time)}</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(250,246,240,0.7)', border: '1px dashed #D9CBBA', borderRadius: '18px', padding: '32px 20px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#C4AA87', marginBottom: '8px' }}>Nothing planned yet</div>
            <div style={{ fontSize: '13px', color: '#C4AA87', marginBottom: '20px' }}>Your next date is waiting to be made.</div>
            <button onClick={() => router.push('/dates/custom')} style={{ fontSize: '12px', fontWeight: 500, color: '#8B7355', background: 'none', border: '1px solid #D9CBBA', padding: '10px 24px', borderRadius: '24px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Plan one →
            </button>
          </div>
        )}

        {/* DATE HISTORY */}
        {pastDates.length > 0 && (
          <>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '12px' }}>Date History</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' }}>
              {pastDates.slice(0, 6).map(date => (
                <div key={`${date.source}-${date.id}`} onClick={() => router.push(`/dates/${date.id}`)} style={{ borderRadius: '14px', overflow: 'hidden', position: 'relative', height: '160px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(28,20,16,0.08)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #6B5020 0%, #C9A84C 50%, #D4BA7A 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />
                  {date.stops?.length > 0 && (
                    <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '9px', fontWeight: 500, padding: '2px 7px', borderRadius: '20px', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date.stops.length} stops</div>
                  )}
                  {date.status === 'completed' && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: '#C8952A', color: '#fff' }}>Done</div>
                  )}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: '3px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{date.title}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{fmtDate(date.date)}</div>
                  </div>
                </div>
              ))}
            </div>
            {pastDates.length > 6 && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button onClick={() => router.push('/dates/history')} style={{ fontSize: '12px', fontWeight: 500, color: '#8B7355', background: 'none', border: '1px solid #D9CBBA', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>See all dates →</button>
              </div>
            )}
          </>
        )}

        {/* IDEAS PLACEHOLDER */}
        <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '4px' }}>Ideas for You Two</div>
        <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#C4AA87', marginBottom: '16px' }}>Nora is building something for you</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CURATED_IDEAS.map(idea => (
            <div key={idea.id} onClick={() => handleBuildIdea(idea)} style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '110px', cursor: 'pointer' }}>
              <div style={{ position: 'absolute', inset: 0, background: idea.gradient }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 70%)' }} />
              <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '20px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}>{idea.tag}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#fff', lineHeight: 1.2 }}>{idea.title}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
