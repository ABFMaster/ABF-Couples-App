'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────
function staticMapUrl(lat, lng) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!lat || !lng || !key) return null
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=14&size=800x320` +
    `&markers=color:0xec4899%7C${lat},${lng}` +
    `&key=${key}&style=feature:poi%7Cvisibility:off`
  )
}

function multiStopMapUrl(stops) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key || !stops?.length) return null
  const valid = stops.filter(s => s.lat && s.lng)
  if (!valid.length) return null
  const markers = valid.slice(0, 6)
    .map((s, i) => `markers=color:0xec4899%7Clabel:${i + 1}%7C${s.lat},${s.lng}`)
    .join('&')
  return (
    `https://maps.googleapis.com/maps/api/staticmap?size=800x320&${markers}` +
    `&key=${key}&style=feature:poi%7Cvisibility:off`
  )
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DateDetailPage({ params }) {
  const { id } = use(params)
  const router = useRouter()

  const [date, setDate]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showStarters, setShowStarters] = useState(false)
  const [activeCategory, setActiveCategory] = useState('personalized')
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [submittingComplete, setSubmittingComplete] = useState(false)
  const [completionError, setCompletionError] = useState(null)

  useEffect(() => {
    loadDate()
  }, [id])

  const loadDate = async () => {
    // Try date_plans first, then custom_dates
    const { data: plan } = await supabase
      .from('date_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (plan) {
      setDate({ ...plan, _source: 'plan' })
      setLoading(false)
      return
    }

    const { data: custom } = await supabase
      .from('custom_dates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (custom) {
      setDate({ ...custom, _source: 'custom' })
      setLoading(false)
      return
    }

    setNotFound(true)
    setLoading(false)
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💕</div>
          <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-800 mb-1">Date not found</p>
          <p className="text-gray-400 text-sm mb-5">It may have been deleted or the link is invalid.</p>
          <button
            onClick={() => router.push('/dates')}
            className="text-coral-500 font-semibold text-sm"
          >
            ← Back to Date Night
          </button>
        </div>
      </div>
    )
  }

  const isPlan   = date._source === 'plan'
  const isCustom = date._source === 'custom'
  const isCompleted = date.status === 'completed'

  const mapUrl = isCustom
    ? multiStopMapUrl(date.stops)
    : staticMapUrl(date.latitude, date.longitude)

  const dateStr = fmtDate(isPlan ? date.date_time : (date.date_time || date.created_at))
  const timeStr = date.date_time ? fmtTime(date.date_time) : null

  const now = new Date()
  const dateTimeValue = date.date_time ? new Date(date.date_time) : null
  const isUpcoming = date.status === 'planned' && dateTimeValue && dateTimeValue > now
  const isPast = date.status === 'planned' && dateTimeValue && dateTimeValue <= now

  const handleComplete = async () => {
    if (!myRating || submittingComplete) return
    setSubmittingComplete(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const isUser1 = date.user_id === user.id

      const updateData = isUser1 ? {
        user1_rating: myRating,
        user1_review: myReview.trim() || null,
        user1_completed_at: new Date().toISOString()
      } : {
        user2_rating: myRating,
        user2_review: myReview.trim() || null,
        user2_completed_at: new Date().toISOString()
      }

      // Check if partner already completed
      const bothDone = isUser1
        ? !!date.user2_completed_at
        : !!date.user1_completed_at

      if (bothDone) {
        updateData.status = 'completed'
      }

      const { error } = await supabase
        .from('custom_dates')
        .update(updateData)
        .eq('id', date.id)

      if (error) throw error
      setShowCompleteModal(false)
      loadDate() // Refresh
    } catch (err) {
      console.error('Complete error:', err)
      setCompletionError('Failed to save. Try again.')
    } finally {
      setSubmittingComplete(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">

      {/* ── Sticky header ─────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push('/dates')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 flex-shrink-0"
        >←</button>
        <h1 className="font-bold text-gray-900 flex-1 truncate">{date.title}</h1>
        {isCompleted && (
          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">✓ Done</span>
        )}
        {isUpcoming && (
          <span className="flex-shrink-0 text-xs bg-cream-100 text-coral-700 px-2.5 py-1 rounded-full font-semibold">Upcoming</span>
        )}
        {isPast && !isCompleted && (
          <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold">Awaiting Review</span>
        )}
      </div>

      {/* ── Map banner ────────────────────────────────────────── */}
      {mapUrl && (
        <div className="h-52 overflow-hidden">
          <img src={mapUrl} alt="Map" className="w-full h-full object-cover" />
        </div>
      )}

      {!mapUrl && (
        <div className="h-24 bg-gradient-to-br from-coral-400 to-indigo-400" />
      )}

      <div className="px-5 py-5 space-y-4 max-w-2xl mx-auto">

        {/* ── Date / time ───────────────────────────────────── */}
        {dateStr && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {isPlan ? 'Scheduled for' : 'Created'}
            </p>
            <p className="font-semibold text-gray-900">
              {dateStr}
              {timeStr && <span className="text-gray-500 font-normal"> · {timeStr}</span>}
            </p>
          </div>
        )}

        {/* ── Location (date_plans) ─────────────────────────── */}
        {isPlan && date.address && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Location</p>
            <p className="text-gray-900 text-sm">{date.address}</p>
            {date.latitude && date.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${date.latitude},${date.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-coral-500 font-semibold mt-2 inline-block hover:text-coral-600"
              >
                📍 Get Directions →
              </a>
            )}
          </div>
        )}

        {/* ── Stops (custom_dates) ──────────────────────────── */}
        {isCustom && date.stops?.length > 0 && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Stops · {date.stops.length}
            </p>
            <div className="space-y-4">
              {date.stops.map((stop, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-coral-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{stop.name}</p>
                    {stop.address && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate">{stop.address}</p>
                    )}
                    {stop.note && (
                      <p className="text-gray-500 text-xs mt-1 italic">"{stop.note}"</p>
                    )}
                    {stop.lat && stop.lng && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-coral-400 font-medium mt-1 inline-block hover:text-coral-500"
                      >
                        Directions →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Notes (date_plans) ────────────────────────────── */}
        {isPlan && date.description && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
            <p className="text-gray-700 text-sm leading-relaxed">{date.description}</p>
          </div>
        )}

        {/* ── Conversation Starters ─────────────────────────── */}
        {(isCustom || isPlan) && date.conversation_starters && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <button
              onClick={() => setShowStarters(!showStarters)}
              className="w-full flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">✨ Conversation Starters</p>
                <p className="text-gray-600 text-sm mt-0.5">
                  {showStarters ? 'Tap to hide' : 'Things to talk about tonight'}
                </p>
              </div>
              <span className="text-gray-400 text-lg">{showStarters ? '↑' : '↓'}</span>
            </button>

            {showStarters && (
              <div className="mt-4">
                <div className="flex gap-2 mb-4">
                  {['personalized', 'fun', 'growth'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                        activeCategory === cat
                          ? 'bg-[#E8614D] text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat === 'personalized' ? '💡 Us' : cat === 'fun' ? '😄 Fun' : '💬 Deeper'}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {(date.conversation_starters[activeCategory] || []).map((q, i) => (
                    <div key={i} className="bg-[#FDF6EF] rounded-xl px-4 py-3">
                      <p className="text-gray-700 text-sm leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Reflection (completed date_plans) ────────────── */}
        {isPlan && isCompleted && (date.rating || date.reflection_notes) && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">How it went</p>
            {date.rating > 0 && (
              <p className="text-xl mb-2">{'⭐'.repeat(date.rating)}</p>
            )}
            {date.reflection_notes && (
              <p className="text-gray-600 text-sm italic leading-relaxed">"{date.reflection_notes}"</p>
            )}
          </div>
        )}

        {/* ── Reviews (completed custom_dates) ─────────────── */}
        {isCustom && isCompleted && (
          <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">How it went</p>
            {[
              { rating: date.user1_rating, review: date.user1_review, label: 'Partner 1' },
              { rating: date.user2_rating, review: date.user2_review, label: 'Partner 2' }
            ].filter(r => r.rating).map((r, i) => (
              <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}>
                <p className="text-lg mb-1">{'⭐'.repeat(r.rating)}</p>
                {r.review && (
                  <p className="text-gray-600 text-sm italic">"{r.review}"</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Mark as Done ──────────────────────────────────── */}
        {isCustom && !isCompleted && (isPast || !dateTimeValue) && (
          <button
            onClick={() => setShowCompleteModal(true)}
            className="w-full py-4 bg-white border-2 border-[#E8614D] text-[#E8614D] font-bold rounded-2xl text-sm"
          >
            ✓ Mark as Done
          </button>
        )}

        {/* ── Plan again CTA ────────────────────────────────── */}
        <button
          onClick={() => router.push('/dates/custom')}
          className="w-full py-4 bg-gradient-to-r from-coral-500 to-indigo-500 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-shadow text-sm flex items-center justify-center gap-2"
        >
          <span>✨</span> Plan Another Date
        </button>

      </div>

      {/* ── Completion Modal ──────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-1">How was the date? 💕</h3>
            <p className="text-gray-500 text-sm mb-5">Rate and leave a note for your memory book</p>

            <div className="flex gap-2 justify-center mb-5">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setMyRating(star)}
                  className={`text-3xl transition-transform ${myRating >= star ? 'scale-110' : 'opacity-30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>

            <textarea
              value={myReview}
              onChange={e => setMyReview(e.target.value)}
              placeholder="What made it special? (optional)"
              className="w-full p-4 border-2 border-[#E5E2DD] rounded-xl focus:border-[#E8614D] focus:outline-none resize-none h-24 text-sm mb-4"
            />

            {completionError && (
              <p className="text-red-500 text-sm mb-3">{completionError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={!myRating || submittingComplete}
                className="flex-1 py-3 rounded-xl bg-[#E8614D] text-white font-bold text-sm disabled:opacity-40"
              >
                {submittingComplete ? 'Saving…' : 'Save Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
