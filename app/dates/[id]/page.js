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

  // Partner / send state
  const [currentUserId, setCurrentUserId] = useState(null)
  const [partnerId, setPartnerId] = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [sendingToPartner, setSendingToPartner] = useState(false)
  const [sentToPartner, setSentToPartner] = useState(false)

  // Approval state
  const [approvingDate, setApprovingDate] = useState(false)
  const [approvalError, setApprovalError] = useState(null)

  // Timeline prompt state
  const [showTimelinePrompt, setShowTimelinePrompt] = useState(false)
  const [timelinePhoto, setTimelinePhoto] = useState(null)
  const [addingToTimeline, setAddingToTimeline] = useState(false)
  const [addedToTimeline, setAddedToTimeline] = useState(false)

  useEffect(() => {
    loadDate()
  }, [id])

  const loadDate = async () => {
    // Fetch current user + partner in parallel with date data
    const [{ data: { user } }, { data: plan }, { data: custom }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('date_plans').select('*').eq('id', id).maybeSingle(),
      supabase.from('custom_dates').select('*').eq('id', id).maybeSingle(),
    ])

    // Load user + partner info
    if (user) {
      setCurrentUserId(user.id)
      const { data: coupleData } = await supabase
        .from('couples')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (coupleData) {
        const pId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
        setPartnerId(pId)
        if (pId) {
          const { data: pProfile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', pId)
            .maybeSingle()
          if (pProfile?.display_name) setPartnerName(pProfile.display_name)
        }
      }
    }

    if (plan) {
      setDate({ ...plan, _source: 'plan' })
      setLoading(false)
      return
    }

    if (custom) {
      setDate({ ...custom, _source: 'custom' })
      setSentToPartner(!!custom.shared_with)
      setLoading(false)
      return
    }

    setNotFound(true)
    setLoading(false)
  }

  // ── States ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C4AA87', fontStyle: 'italic' }}>Loading...</p>
    </div>
  )

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  const heroPhoto = date.stops?.find(s => s.photo_url)?.photo_url || null

  const dateStr = fmtDate(isPlan ? date.date_time : (date.date_time || date.created_at))
  const timeStr = date.date_time ? fmtTime(date.date_time) : null

  const now = new Date()
  const dateTimeValue = date.date_time ? new Date(date.date_time) : null
  const isUpcoming = (date.status === 'planned' || date.status === 'approved') && dateTimeValue && dateTimeValue > now
  const isPast = (date.status === 'planned' || date.status === 'approved') && dateTimeValue && dateTimeValue <= now
  const canEdit = isCustom && !isCompleted && (currentUserId === date.user_id || date.shared_with === currentUserId)
  const statusLabel = isCompleted ? '✓ Done' : isUpcoming ? 'Upcoming' : isPast ? 'Awaiting Review' : 'Planned'

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

      const { error } = await supabase
        .from('custom_dates')
        .update(updateData)
        .eq('id', date.id)

      if (error) throw error

      if (bothDone) {
        await supabase
          .from('custom_dates')
          .update({ status: 'completed' })
          .eq('id', date.id)
      }
      setShowCompleteModal(false)
      setShowTimelinePrompt(true)
    } catch (err) {
      console.error('Complete error:', err)
      setCompletionError('Failed to save. Try again.')
    } finally {
      setSubmittingComplete(false)
    }
  }

  const sendToPartner = async () => {
    if (!partnerId || sendingToPartner) return
    setSendingToPartner(true)
    try {
      const { error } = await supabase
        .from('custom_dates')
        .update({ shared_with: partnerId, last_edited_by: currentUserId })
        .eq('id', date.id)
      if (error) throw error

      // Send flirt notification
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .maybeSingle()
      if (coupleData?.id) {
        await supabase.from('flirts').insert({
          couple_id: coupleData.id,
          sender_id: currentUserId,
          receiver_id: partnerId,
          message: `I planned a date for us! Check out "${date.title}" 💕`,
          flirt_type: 'date_shared',
        })
      }
      setSentToPartner(true)
      loadDate()
    } catch (err) {
      console.error('Send to partner error:', err)
    } finally {
      setSendingToPartner(false)
    }
  }

  const addToTimeline = async () => {
    if (addingToTimeline) return
    setAddingToTimeline(true)
    try {
      const stopNames = (date.stops || []).map(s => s.name).filter(Boolean).join(', ')
      const reviews = [date.user1_review, date.user2_review].filter(Boolean).join(' · ')
      const description = [stopNames, reviews].filter(Boolean).join('\n')

      await supabase
        .from('timeline_events')
        .insert({
          couple_id: date.couple_id,
          created_by: currentUserId,
          event_type: 'date_night',
          title: date.title,
          description: description || null,
          event_date: date.date_time || date.created_at,
          photo_urls: timelinePhoto ? [timelinePhoto] : [],
        })

      setAddedToTimeline(true)
      setTimeout(() => {
        setAddedToTimeline(false)
        setShowTimelinePrompt(false)
        loadDate()
      }, 2000)
    } catch (err) {
      console.error('Timeline error:', err)
    } finally {
      setAddingToTimeline(false)
    }
  }

  const approveDatePlan = async () => {
    if (approvingDate) return
    setApprovingDate(true)
    setApprovalError(null)
    try {
      const isCreator = date.user_id === currentUserId
      const updateData = isCreator
        ? { user1_approved_at: new Date().toISOString() }
        : { user2_approved_at: new Date().toISOString() }

      // If other person already approved, mark as approved
      const otherApproved = isCreator ? !!date.user2_approved_at : !!date.user1_approved_at
      if (otherApproved) updateData.status = 'approved'

      const { error } = await supabase
        .from('custom_dates')
        .update(updateData)
        .eq('id', date.id)
      if (error) throw error
      loadDate()
    } catch (err) {
      console.error('Approval error:', err)
      setApprovalError('Failed to confirm. Try again.')
    } finally {
      setApprovingDate(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: '100px', fontFamily: 'DM Sans, sans-serif' }}>

      <div style={{ background: 'linear-gradient(145deg, #1C1410 0%, #2D3561 100%)', padding: '52px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(201,168,76,0.06)' }} />
        <button onClick={() => router.back()} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '32px', fontWeight: 300, color: 'white', lineHeight: 1.2, flex: 1 }}>{date.title}</div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {canEdit && (
              <button onClick={() => router.push(`/dates/${date.id}/edit`)} style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
            )}
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px' }}>{statusLabel}</div>
          </div>
        </div>
      </div>

      {/* ── Map banner ────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '240px', overflow: 'hidden' }}>
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={date.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 50%, #2D3561 100%)' }} />
        )}
      </div>

      <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Date / time ───────────────────────────────────── */}
        {dateStr && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>
              {date.date_time ? 'Scheduled for' : 'Created'}
            </p>
            <p className="font-semibold text-gray-900">
              {dateStr}
              {timeStr && <span className="text-gray-500 font-normal"> · {timeStr}</span>}
            </p>
          </div>
        )}

        {/* ── Location (date_plans) ─────────────────────────── */}
        {isPlan && date.address && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Location</p>
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
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>
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
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Notes</p>
            <p className="text-gray-700 text-sm leading-relaxed">{date.description}</p>
          </div>
        )}

        {/* ── Conversation Starters ─────────────────────────── */}
        {(isCustom || isPlan) && date.conversation_starters && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <button
              onClick={() => setShowStarters(!showStarters)}
              className="w-full flex items-center justify-between"
            >
              <div>
                <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>✨ Conversation Starters</p>
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
                          ? 'bg-[#C4714A] text-white'
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
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>How it went</p>
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
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>
            <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>How it went</p>
            {[
              { rating: date.user1_rating, review: date.user1_review, label: date.user_id === currentUserId ? 'You' : partnerName },
              { rating: date.user2_rating, review: date.user2_review, label: date.user_id === currentUserId ? partnerName : 'You' }
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

        {/* ── Date Status (unified) ──────────────────────────── */}
        {isCustom && !isCompleted && (currentUserId === date.user_id || date.shared_with === currentUserId) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 1px 4px rgba(28,20,16,0.06)' }}>

            {/* State 1: Not yet shared — only creator sees this */}
            {!date.shared_with && currentUserId === date.user_id && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Ready to share?</p>
                <p className="text-gray-500 text-sm mb-3">Send this to {partnerName} so they can review, edit, and approve it.</p>
                <button
                  onClick={sendToPartner}
                  disabled={sendingToPartner}
                  className="w-full py-3 bg-gradient-to-r from-[#3D3580] to-[#5D55A0] text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                >
                  {sendingToPartner ? 'Sending…' : `💌 Send to ${partnerName}`}
                </button>
              </div>
            )}

            {/* State 2: Shared, neither approved */}
            {date.shared_with && !date.user1_approved_at && !date.user2_approved_at && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Date Plan</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💌</span>
                  <p className="text-gray-600 text-sm">Shared with {partnerName} — waiting for approval</p>
                </div>
                {((date.user_id === currentUserId && !date.user1_approved_at) ||
                  (date.shared_with === currentUserId && !date.user2_approved_at)) && (
                  <button
                    onClick={approveDatePlan}
                    disabled={approvingDate}
                    className="w-full py-3 bg-gradient-to-r from-[#C4714A] to-[#3D3580] text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                  >
                    {approvingDate ? 'Confirming…' : "I'm in! 💕"}
                  </button>
                )}
              </div>
            )}

            {/* State 3: One approved, waiting for other */}
            {date.shared_with && (date.user1_approved_at || date.user2_approved_at) &&
             !(date.user1_approved_at && date.user2_approved_at) && (
              <div>
                <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>Date Plan</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      date.user1_approved_at ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {date.user1_approved_at ? '✓' : '○'}
                    </div>
                    <p className="text-sm text-gray-700">
                      {date.user_id === currentUserId ? 'You' : partnerName}
                      <span className="text-gray-400 ml-1.5 text-xs">{date.user1_approved_at ? '· approved' : '· waiting'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      date.user2_approved_at ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {date.user2_approved_at ? '✓' : '○'}
                    </div>
                    <p className="text-sm text-gray-700">
                      {date.shared_with === currentUserId ? 'You' : partnerName}
                      <span className="text-gray-400 ml-1.5 text-xs">{date.user2_approved_at ? '· approved' : '· waiting'}</span>
                    </p>
                  </div>
                </div>
                {((date.user_id === currentUserId && !date.user1_approved_at) ||
                  (date.shared_with === currentUserId && !date.user2_approved_at)) ? (
                  <button
                    onClick={approveDatePlan}
                    disabled={approvingDate}
                    className="w-full py-3 bg-gradient-to-r from-[#C4714A] to-[#3D3580] text-white font-bold rounded-2xl text-sm disabled:opacity-40"
                  >
                    {approvingDate ? 'Confirming…' : "I'm in! 💕"}
                  </button>
                ) : (
                  <p className="text-gray-400 text-sm text-center">Waiting for {partnerName} to approve…</p>
                )}
              </div>
            )}

            {/* State 4: Both approved */}
            {date.user1_approved_at && date.user2_approved_at && (
              <div className="text-center py-2">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-green-600 font-bold text-base">You're going on a date!</p>
                <p className="text-gray-400 text-sm mt-1">Both approved — it's locked in 💕</p>
              </div>
            )}

          </div>
        )}

        {/* ── Mark as Done ──────────────────────────────────── */}
        {isCustom && !isCompleted && (isPast || !dateTimeValue) && (
          <button
            onClick={() => setShowCompleteModal(true)}
            className="w-full py-4 bg-white border-2 border-[#C4714A] text-[#C4714A] font-bold rounded-2xl text-sm"
          >
            ✓ Mark as Done
          </button>
        )}

        {/* ── Plan again CTA ────────────────────────────────── */}
        <button
          onClick={() => router.push('/dates/custom')}
          style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #8B4A2A 0%, #2D3561 100%)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          <span>✨</span> Plan Another Date
        </button>

      </div>

      {/* ── Timeline Prompt Modal ─────────────────────────────── */}
      {showTimelinePrompt && !addedToTimeline && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="text-center mb-5">
              <p className="text-3xl mb-2">🎉</p>
              <h3 className="text-xl font-bold text-gray-900">Date complete!</h3>
              <p className="text-gray-500 text-sm mt-1">
                Add this to your Timeline so you never forget it 💕
              </p>
            </div>

            <div className="bg-[#FDF6EF] rounded-2xl px-4 py-3 mb-4">
              <p className="font-semibold text-gray-900 text-sm">{date.title}</p>
              {date.stops?.length > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  {date.stops.map(s => s.name).filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div className="mb-4">
              <p style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '6px' }}>
                Add a photo? (optional)
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  const ext = file.name.split('.').pop()
                  const path = `timeline/${date.couple_id}/${Date.now()}.${ext}`
                  const { error } = await supabase.storage
                    .from('timeline-photos')
                    .upload(path, file)
                  if (!error) {
                    const { data } = supabase.storage
                      .from('timeline-photos')
                      .getPublicUrl(path)
                    setTimelinePhoto(data.publicUrl)
                  }
                }}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4
                file:rounded-full file:border-0 file:text-xs file:font-semibold
                file:bg-[#C4714A] file:text-white hover:file:bg-[#d4553f]"
              />
              {timelinePhoto && (
                <img src={timelinePhoto} alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-xl" />
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowTimelinePrompt(false); loadDate() }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm"
              >
                Skip
              </button>
              <button
                onClick={addToTimeline}
                disabled={addingToTimeline}
                className="flex-1 py-3 rounded-xl bg-[#C4714A] text-white font-bold text-sm disabled:opacity-40"
              >
                {addingToTimeline ? 'Adding…' : 'Add to Timeline 💕'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addedToTimeline && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 text-center">
            <p className="text-4xl mb-3">💕</p>
            <p className="font-bold text-gray-900 text-lg">Added to your Timeline!</p>
            <p className="text-gray-400 text-sm mt-1">This memory is yours forever</p>
          </div>
        </div>
      )}

      {/* ── Completion Modal ──────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center p-4">
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
              className="w-full p-4 border-2 border-[#E5E2DD] rounded-xl focus:border-[#C4714A] focus:outline-none resize-none h-24 text-sm mb-4"
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
                className="flex-1 py-3 rounded-xl bg-[#C4714A] text-white font-bold text-sm disabled:opacity-40"
              >
                {submittingComplete ? 'Saving…' : 'We Did It! 💕'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
