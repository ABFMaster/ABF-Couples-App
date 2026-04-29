'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function DateHistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [dates, setDates] = useState([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle()

    if (!coupleData) { setLoading(false); return }
    const cid = coupleData.id
    const now = new Date().toISOString()

    const [{ data: customDates }, { data: datePlans }] = await Promise.all([
      supabase.from('custom_dates').select('id, title, date_time, created_at, status, user1_rating, user2_rating, stops').eq('couple_id', cid).order('created_at', { ascending: false }).limit(50),
      supabase.from('date_plans').select('id, title, date_time, status, rating').eq('couple_id', cid).order('date_time', { ascending: false }).limit(50),
    ])

    const normalizedCustom = (customDates ?? []).map(c => ({
      id: c.id, source: 'custom', title: c.title,
      date_time: c.date_time || c.created_at,
      rating: c.user1_rating || c.user2_rating || null,
      photo_url: c.stops?.find(s => s.photo_url)?.photo_url || null,
      stop_count: c.stops?.length ?? 0,
      status: c.status,
    }))

    const normalizedPlans = (datePlans ?? []).map(p => ({
      id: p.id, source: 'plan', title: p.title,
      date_time: p.date_time,
      rating: p.rating || null,
      photo_url: null,
      stop_count: 0,
      status: p.status,
    }))

    const allDates = [...normalizedCustom, ...normalizedPlans]
      .sort((a, b) => new Date(b.date_time || b.created_at || 0) - new Date(a.date_time || a.created_at || 0))

    console.log('allDates', allDates.length)
    setDates(allDates)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = dates.filter(d => d.title?.toLowerCase().includes(search.toLowerCase()))
  const sorted = sortBy === 'top'
    ? [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    : filtered

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
        <button onClick={() => router.back()} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
        <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.18em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '4px' }}>Your Shared Life</div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '44px', fontWeight: 300, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>Date History</div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search dates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #D9CBBA', background: 'white', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#1C1410', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
        />

        {/* SORT */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['newest', 'top'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{ fontSize: '11px', fontWeight: 500, padding: '7px 16px', borderRadius: '20px', border: `1px solid ${sortBy === s ? '#C4714A' : '#D9CBBA'}`, background: sortBy === s ? '#C4714A' : 'white', color: sortBy === s ? 'white' : '#8B7355', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize' }}>
              {s === 'newest' ? 'Newest' : 'Top Rated'}
            </button>
          ))}
        </div>

        {/* DATE CARDS */}
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', color: '#C4AA87', marginBottom: '8px' }}>No dates found</div>
            <div style={{ fontSize: '13px', color: '#C4AA87' }}>Try a different search</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sorted.map(date => (
              <div
                key={`${date.source}-${date.id}`}
                onClick={() => router.push(`/dates/${date.id}`)}
                style={{ borderRadius: '16px', overflow: 'hidden', position: 'relative', height: '160px', cursor: 'pointer', boxShadow: '0 2px 12px rgba(28,20,16,0.08)' }}
              >
                {/* Hero image or gradient */}
                {date.photo_url ? (
                  <img src={date.photo_url} alt={date.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #6B5020 0%, #C9A84C 50%, #D4BA7A 100%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)' }} />

                {/* Stop count pill */}
                {date.stop_count > 0 && (
                  <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '9px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {date.stop_count} {date.stop_count === 1 ? 'stop' : 'stops'}
                  </div>
                )}

                {/* Done pill */}
                {date.status === 'completed' && (
                  <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9px', fontWeight: 500, padding: '2px 8px', borderRadius: '20px', background: '#C8952A', color: '#fff' }}>Done</div>
                )}

                {/* Rating */}
                {date.rating > 0 && (
                  <div style={{ position: 'absolute', top: '10px', right: date.status === 'completed' ? '60px' : '10px', fontSize: '11px' }}>
                    {'⭐'.repeat(Math.min(date.rating, 5))}
                  </div>
                )}

                {/* Title + meta */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '20px', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{date.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{fmtDate(date.date_time)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
