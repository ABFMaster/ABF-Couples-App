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
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'top'

  const fetchData = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!coupleData) { router.push('/dates'); return }

      const { data: completedDates } = await supabase
        .from('custom_dates')
        .select('id, title, date_time, created_at, status, user1_rating, user2_rating, user1_review, user2_review, stops')
        .eq('couple_id', coupleData.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })

      const { data: completedPlans } = await supabase
        .from('date_plans')
        .select('id, title, date_time, created_at, status, rating, reflection_notes, address, latitude, longitude')
        .eq('couple_id', coupleData.id)
        .eq('status', 'completed')
        .order('date_time', { ascending: false })

      const normalizedCustom = (completedDates || []).map(d => ({
        id: d.id,
        source: 'custom',
        title: d.title,
        date_time: d.date_time || d.created_at,
        created_at: d.created_at,
        user1_rating: d.user1_rating,
        user2_rating: d.user2_rating,
        user1_review: d.user1_review,
        user2_review: d.user2_review,
        stops: d.stops,
        avgRating: d.user1_rating && d.user2_rating
          ? (d.user1_rating + d.user2_rating) / 2
          : d.user1_rating || d.user2_rating || 0
      }))

      const normalizedPlans = (completedPlans || []).map(p => ({
        id: p.id,
        source: 'plan',
        title: p.title,
        date_time: p.date_time || p.created_at,
        created_at: p.created_at,
        user1_rating: p.rating,
        user2_rating: null,
        user1_review: p.reflection_notes,
        user2_review: null,
        stops: p.address ? [{ name: p.address }] : [],
        avgRating: p.rating || 0
      }))

      const allDates = [...normalizedCustom, ...normalizedPlans]
        .sort((a, b) => new Date(b.date_time) - new Date(a.date_time))

      setDates(allDates)
      setLoading(false)
    } catch (err) {
      console.error('History fetch error:', err)
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = dates
    .filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'top') return b.avgRating - a.avgRating
      return new Date(b.date_time) - new Date(a.date_time)
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF6EF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDF6EF] pb-24">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.push('/dates')}
            className="text-[#9CA3AF] hover:text-[#2D3648] text-sm mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#2D3648]">Date History</h1>
            <img src="/logo-wordmark.png" alt="ABF" className="h-8 w-auto" />
          </div>
          <p className="text-[#9CA3AF] text-sm mt-1">Every date you've completed together</p>
        </div>
      </header>

      {/* Search + Sort */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search dates…"
          className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E8614D]/20"
        />
        <div className="flex gap-2">
          {['newest', 'top'].map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                sortBy === s
                  ? 'bg-[#E8614D] text-white'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {s === 'newest' ? 'Newest' : 'Top Rated'}
            </button>
          ))}
        </div>
      </div>

      {/* Dates list */}
      <div className="max-w-2xl mx-auto px-4 space-y-3 pb-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm mt-4">
            <p className="text-5xl mb-4">💕</p>
            <p className="text-[#2D3648] font-semibold text-lg mb-2">No completed dates yet</p>
            <p className="text-[#9CA3AF] text-sm max-w-xs mx-auto">
              Complete your first date to start your history 💕
            </p>
          </div>
        ) : (
          filtered.map(date => {
            const firstStop = date.stops?.[0]?.name || null
            const firstReview = date.user1_review || date.user2_review || ''
            const snippet = firstReview.length > 80 ? firstReview.slice(0, 80) + '…' : firstReview

            return (
              <div
                key={date.id}
                className="bg-white rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dates/${date.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-base truncate">{date.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(date.date_time)}</p>
                    {firstStop && (
                      <p className="text-xs text-gray-500 mt-1">📍 {firstStop}</p>
                    )}
                    {snippet && (
                      <p className="text-gray-500 text-xs mt-2 italic">"{snippet}"</p>
                    )}
                  </div>
                  {date.avgRating > 0 && (
                    <div className="flex-shrink-0 text-right">
                      <p className="text-base">{'⭐'.repeat(Math.round(date.avgRating))}</p>
                      {date.avgRating % 1 !== 0 && (
                        <p className="text-xs text-gray-400">{date.avgRating.toFixed(1)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
