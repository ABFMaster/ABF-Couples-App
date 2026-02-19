'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DATE_CATEGORIES,
  CATEGORY_CONFIG,
  selectDateSuggestions,
  fetchDateSuggestions,
} from '@/lib/date-suggestions'

// Default location: Seattle, WA
const DEFAULT_LOCATION = { lat: 47.6062, lng: -122.3321 }

const ALL_CATEGORIES = [
  { key: 'all', label: 'All', emoji: '✨' },
  ...Object.entries(DATE_CATEGORIES).map(([key, cat]) => ({
    key,
    label: cat.label,
    emoji: cat.emoji,
  })),
]

// Format a Date object as YYYY-MM-DDTHH:MM in LOCAL time
// (datetime-local inputs require local time, not UTC)
function toDatetimeLocal(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Build a Google Maps directions URL, preferring precise lat/lng
function mapsDirectionsUrl(lat, lng, address, fallbackMapsUrl) {
  if (lat && lng) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  if (fallbackMapsUrl) return fallbackMapsUrl
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return null
}

// Build a Google Static Maps image URL (requires lat/lng + API key)
function staticMapUrl(lat, lng) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!lat || !lng || !key) return null
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}&zoom=15&size=600x200` +
    `&markers=color:red%7C${lat},${lng}` +
    `&key=${key}`
  )
}

// Default datetime: tomorrow at 7pm local time
function defaultDatetime() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(19, 0, 0, 0)
  return toDatetimeLocal(d)
}

// ============================================
// SKELETON CARD
// ============================================
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-8 bg-gray-200 rounded-full flex-1" />
          <div className="h-8 bg-gray-200 rounded-full flex-1" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// PRICE / RATING HELPERS
// ============================================
function PriceDots({ level }) {
  if (!level) return null
  const labels = ['', '$', '$$', '$$$', '$$$$']
  return <span className="text-xs text-gray-500 font-medium">{labels[level] || ''}</span>
}

function StarRating({ rating }) {
  if (!rating) return null
  return <span className="text-xs text-gray-500">⭐ {rating.toFixed(1)}</span>
}

// ============================================
// SUGGESTION CARD
// ============================================
function SuggestionCard({ place, recommendedCategories, assessmentScores, onSave, onPlan, saving, savedIds }) {
  const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.other
  const isRecommended = recommendedCategories.includes(place.category)
  const isSaved = savedIds.has(place.place_id)

  let recommendedReason = null
  if (isRecommended && place.category !== 'all') {
    const catDef = DATE_CATEGORIES[place.category]
    if (catDef?.matchesAssessment) {
      for (const [module, threshold] of Object.entries(catDef.matchesAssessment)) {
        const score = assessmentScores[module]
        if (score !== undefined && score < threshold) {
          const label = module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          recommendedReason = `Helps improve ${label} (${Math.round(score)}%)`
          break
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {/* Photo */}
      <div className="relative h-44 bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0">
        {place.photo_url ? (
          <img src={place.photo_url} alt={place.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{config.emoji}</div>
        )}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </div>
        {recommendedReason && (
          <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            AI Pick
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">{place.title}</h3>
        {place.address && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{place.address}</p>
        )}
        <div className="flex items-center gap-3 mb-3">
          <StarRating rating={place.rating} />
          <PriceDots level={place.price_level} />
        </div>
        {recommendedReason && (
          <div className="bg-pink-50 border border-pink-100 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-pink-700">{recommendedReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onSave(place)}
              disabled={saving === place.place_id || isSaved}
              className="flex-1 text-xs font-medium border border-pink-300 text-pink-600 rounded-full py-2 hover:bg-pink-50 transition-colors disabled:opacity-40"
            >
              {isSaved ? '♥ Saved' : saving === place.place_id ? 'Saving…' : '♡ Save'}
            </button>
            <button
              onClick={() => onPlan(place)}
              className="flex-1 text-xs font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full py-2 hover:opacity-90 transition-opacity"
            >
              Plan This
            </button>
          </div>
          {mapsDirectionsUrl(place.latitude, place.longitude, place.address, place.maps_url) && (
            <a
              href={mapsDirectionsUrl(place.latitude, place.longitude, place.address, place.maps_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-gray-400 hover:text-pink-500 transition-colors py-0.5"
            >
              📍 Get Directions
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// PLAN MODAL  (create new OR edit existing)
// existingPlan: the date_plan row being edited (null for new)
// ============================================
function PlanModal({ place, existingPlan, onClose, onSubmit, submitting }) {
  const isEditing = !!existingPlan
  const [scheduledDate, setScheduledDate] = useState(
    existingPlan?.date_time ? toDatetimeLocal(existingPlan.date_time) : defaultDatetime()
  )
  const [notes, setNotes] = useState(existingPlan?.description || '')
  const config = CATEGORY_CONFIG[place?.category] || CATEGORY_CONFIG.other

  if (!place) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Place preview */}
        <div className="relative h-36 bg-gradient-to-br from-pink-100 to-purple-100">
          {place.photo_url ? (
            <img src={place.photo_url} alt={place.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">{config.emoji}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white font-bold text-lg leading-tight">{place.title}</p>
            {place.address && (
              <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{place.address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-black/60"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="p-5">
          <h2 className="font-bold text-gray-900 text-lg mb-4">
            {isEditing ? 'Edit Date' : 'Schedule this date'}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              When?
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any ideas, reservations to make, or things to bring…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
            />
          </div>

          <button
            onClick={() => onSubmit({ place, scheduledDate, notes, planId: existingPlan?.id ?? null })}
            disabled={submitting || !scheduledDate}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting
              ? isEditing ? 'Updating…' : 'Scheduling…'
              : isEditing ? '✏️ Update Date' : '💕 Schedule Date'}
          </button>
          <button
            onClick={onClose}
            className="w-full mt-2 text-gray-500 text-sm py-2 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// REFLECTION MODAL (mark complete)
// ============================================
function ReflectionModal({ plan, onClose, onSubmit, submitting }) {
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')

  if (!plan) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-lg"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="font-bold text-gray-900 text-xl">How was it?</h2>
          <p className="text-gray-500 text-sm mt-1">{plan.title}</p>
        </div>

        {/* Star picker */}
        <div className="flex justify-center gap-3 mb-5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`text-3xl transition-transform hover:scale-110 ${
                n <= rating ? 'opacity-100' : 'opacity-30'
              }`}
            >
              ⭐
            </button>
          ))}
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Any thoughts? <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What made it special? What would you do differently?"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
          />
        </div>

        <button
          onClick={() => onSubmit({ plan, rating: rating || null, notes })}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save Reflection'}
        </button>
        <button
          onClick={() => onSubmit({ plan, rating: null, notes: '' })}
          disabled={submitting}
          className="w-full mt-2 text-gray-400 text-sm py-2 hover:text-gray-600"
        >
          Skip & Mark Complete
        </button>
      </div>
    </div>
  )
}

// ============================================
// DATE PLAN CARD (My Dates view)
// ============================================
function DatePlanCard({ plan, onMarkComplete, onCancel, onEdit }) {
  const config = CATEGORY_CONFIG[plan.category] || { label: 'Date', emoji: '💕' }
  const isPast = plan.date_time ? new Date(plan.date_time) < new Date() : false
  const isCompleted = plan.status === 'completed'
  const isCancelled = plan.status === 'cancelled'

  // Display date/time in user's local timezone
  const dateLabel = plan.date_time
    ? new Date(plan.date_time).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : null
  const timeLabel = plan.date_time
    ? new Date(plan.date_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <div className={`bg-white rounded-2xl p-4 shadow-sm ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex gap-3">
        {/* Photo or emoji */}
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex-shrink-0 overflow-hidden">
          {plan.photo_url ? (
            <img src={plan.photo_url} alt={plan.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">{config.emoji}</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{plan.title}</h3>
            {isCompleted && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">Done ✓</span>
            )}
            {isCancelled && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">Cancelled</span>
            )}
          </div>

          {plan.address && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{plan.address}</p>
          )}

          {dateLabel && (
            <p className="text-xs text-pink-600 font-medium mt-1">
              {dateLabel} · {timeLabel}
            </p>
          )}

          {/* Reflection */}
          {isCompleted && plan.rating && (
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: plan.rating }).map((_, i) => (
                <span key={i} className="text-xs">⭐</span>
              ))}
            </div>
          )}
          {isCompleted && plan.reflection_notes && (
            <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{plan.reflection_notes}"</p>
          )}

          {/* Notes */}
          {!isCompleted && !isCancelled && plan.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-1">{plan.description}</p>
          )}
        </div>
      </div>

      {/* Static map preview */}
      {staticMapUrl(plan.latitude, plan.longitude) && (
        <a
          href={mapsDirectionsUrl(plan.latitude, plan.longitude, plan.address, plan.maps_url)}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 rounded-xl overflow-hidden"
        >
          <img
            src={staticMapUrl(plan.latitude, plan.longitude)}
            alt={`Map for ${plan.title}`}
            className="w-full h-32 object-cover"
          />
        </a>
      )}

      {/* Actions — vary by state */}
      {!isCompleted && !isCancelled && (
        <div className="flex gap-2 mt-3">
          {mapsDirectionsUrl(plan.latitude, plan.longitude, plan.address, plan.maps_url) && (
            <a
              href={mapsDirectionsUrl(plan.latitude, plan.longitude, plan.address, plan.maps_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium border border-gray-200 text-gray-600 rounded-full px-3 py-2 hover:border-gray-300 whitespace-nowrap"
            >
              📍 Directions
            </a>
          )}

          {/* Upcoming (future): Edit + Cancel */}
          {!isPast && (
            <>
              <button
                onClick={() => onEdit(plan)}
                className="flex-1 text-xs font-medium border border-pink-300 text-pink-600 rounded-full py-2 hover:bg-pink-50 transition-colors"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => onCancel(plan)}
                className="text-xs text-gray-400 px-3 py-2 rounded-full hover:text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          )}

          {/* Past (overdue, not yet completed): Mark Complete + Cancel */}
          {isPast && (
            <>
              <button
                onClick={() => onMarkComplete(plan)}
                className="flex-1 text-xs font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full py-2 hover:opacity-90"
              >
                Mark Complete
              </button>
              <button
                onClick={() => onCancel(plan)}
                className="text-xs text-gray-400 px-3 py-2 rounded-full hover:text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PAGE
// ============================================
export default function DatesPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [assessmentScores, setAssessmentScores] = useState({})
  const [location, setLocation] = useState(DEFAULT_LOCATION)

  // Page tab
  const [pageTab, setPageTab] = useState('suggestions') // 'suggestions' | 'my_dates'

  // Suggestions state
  const [allPlaces, setAllPlaces] = useState([])
  const [recommendedCategories, setRecommendedCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [fetchingPlaces, setFetchingPlaces] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  // Save state
  const [saving, setSaving] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())

  // Plan modal (create + edit)
  const [planModalPlace, setPlanModalPlace] = useState(null)   // place-like object for the modal header
  const [editingPlan, setEditingPlan] = useState(null)         // full date_plan row when editing, null for new
  const [submittingPlan, setSubmittingPlan] = useState(false)

  // My Dates state
  const [datePlans, setDatePlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  // Reflection modal
  const [reflectionPlan, setReflectionPlan] = useState(null)
  const [submittingReflection, setSubmittingReflection] = useState(false)

  // Toast
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ============================================
  // INIT
  // ============================================
  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const init = async () => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    if (error || !authUser) {
      router.push('/login')
      return
    }
    setUser(authUser)

    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .single()

    const cid = coupleData?.id || null
    setCoupleId(cid)

    // Assessment scores
    let scores = {}
    const { data: assessment } = await supabase
      .from('relationship_assessments')
      .select('results')
      .eq('user_id', authUser.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (assessment?.results?.modules) {
      for (const mod of assessment.results.modules) {
        scores[mod.moduleId] = mod.percentage
      }
    }
    setAssessmentScores(scores)

    // Already-saved place_ids
    let recentDates = []
    if (cid) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { data: plans } = await supabase
        .from('couple_date_places')
        .select('place_id')
        .eq('couple_id', cid)
        .gte('created_at', thirtyDaysAgo.toISOString())
      recentDates = plans || []

      const { data: allSaved } = await supabase
        .from('couple_date_places')
        .select('place_id')
        .eq('couple_id', cid)
      if (allSaved) setSavedIds(new Set(allSaved.map(r => r.place_id)))
    }

    // Browser location with Seattle fallback
    let loc = DEFAULT_LOCATION
    try {
      loc = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(DEFAULT_LOCATION),
          { timeout: 5000 }
        )
      })
    } catch {
      // use default
    }
    setLocation(loc)

    const selection = selectDateSuggestions({
      userLocation: loc,
      assessmentScores: scores,
      recentDates,
    })
    setRecommendedCategories(selection.categories)
    setLoading(false)

    fetchPlacesForCategories(selection, loc)
  }

  // ============================================
  // FETCH SUGGESTIONS
  // ============================================
  const fetchPlacesForCategories = useCallback(async (selection, loc) => {
    setFetchingPlaces(true)
    setFetchError(null)
    const collected = []
    const seenIds = new Set()

    for (const category of selection.categories.slice(0, 4)) {
      try {
        const places = await fetchDateSuggestions({
          location: loc,
          category,
          maxPrice: selection.maxPrice,
          radius: selection.radius,
          avoidPlaceIds: selection.avoidPlaceIds,
        })
        for (const p of places) {
          if (!seenIds.has(p.place_id)) {
            seenIds.add(p.place_id)
            collected.push(p)
          }
        }
      } catch (err) {
        console.error(`Failed to fetch places for ${category}:`, err)
      }
    }

    setAllPlaces(collected)
    setFetchingPlaces(false)
    if (collected.length === 0) {
      setFetchError('No places found nearby. Try expanding your search area.')
    }
  }, [])

  // ============================================
  // LOAD DATE PLANS
  // ============================================
  const loadDatePlans = useCallback(async () => {
    if (!coupleId) return
    setLoadingPlans(true)
    const { data } = await supabase
      .from('date_plans')
      .select('*')
      .eq('couple_id', coupleId)
      .order('date_time', { ascending: true })
    setDatePlans(data || [])
    setLoadingPlans(false)
  }, [coupleId])

  useEffect(() => {
    if (pageTab === 'my_dates' && coupleId) {
      loadDatePlans()
    }
  }, [pageTab, coupleId, loadDatePlans])

  // ============================================
  // SAVE PLACE
  // ============================================
  const handleSave = async (place) => {
    if (!coupleId || savedIds.has(place.place_id)) return
    setSaving(place.place_id)
    const { error } = await supabase.from('couple_date_places').insert({
      couple_id: coupleId,
      place_id: place.place_id,
      title: place.title,
      description: place.description,
      category: place.category,
      location_name: place.location_name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      price_level: place.price_level,
      rating: place.rating,
      photo_url: place.photo_url,
      maps_url: place.maps_url,
      source: 'google_places',
    })
    setSaving(null)
    if (!error) {
      setSavedIds(prev => new Set([...prev, place.place_id]))
      showToast(`${place.title} saved!`)
    }
  }

  // Open edit modal: derive a place-like object from the stored plan
  const handleOpenEdit = (plan) => {
    setEditingPlan(plan)
    setPlanModalPlace({
      place_id: plan.place_id,
      title: plan.title,
      address: plan.address,
      location_name: plan.location_name,
      photo_url: plan.photo_url,
      maps_url: plan.maps_url,
      latitude: plan.latitude,
      longitude: plan.longitude,
      category: plan.category,
    })
  }

  const handleClosePlanModal = () => {
    setPlanModalPlace(null)
    setEditingPlan(null)
  }

  // ============================================
  // SCHEDULE DATE (INSERT) or UPDATE existing
  // ============================================
  const handleScheduleDate = async ({ place, scheduledDate, notes, planId }) => {
    if (!coupleId || !user) return
    setSubmittingPlan(true)

    // Convert local datetime-local string to UTC ISO string for storage
    const dateUtc = scheduledDate ? new Date(scheduledDate).toISOString() : null

    let error
    if (planId) {
      // Edit existing plan
      ;({ error } = await supabase
        .from('date_plans')
        .update({
          description: notes || null,
          date_time: dateUtc,
        })
        .eq('id', planId))
    } else {
      // Create new plan
      ;({ error } = await supabase.from('date_plans').insert({
        couple_id: coupleId,
        created_by: user.id,
        title: place.title,
        description: notes || null,
        date_time: dateUtc,
        location: place.address || place.location_name || null,
        location_name: place.location_name,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        photo_url: place.photo_url,
        maps_url: place.maps_url,
        place_id: place.place_id,
        status: 'planned',
      }))
    }

    setSubmittingPlan(false)
    if (!error) {
      handleClosePlanModal()
      showToast(planId ? 'Date updated! ✏️' : `${place.title} scheduled! 💕`)
      if (pageTab === 'my_dates') loadDatePlans()
    }
  }

  // ============================================
  // MARK COMPLETE
  // ============================================
  const handleMarkComplete = async ({ plan, rating, notes }) => {
    setSubmittingReflection(true)
    const { error } = await supabase
      .from('date_plans')
      .update({
        status: 'completed',
        rating: rating || null,
        reflection_notes: notes || null,
      })
      .eq('id', plan.id)
    setSubmittingReflection(false)
    if (!error) {
      setReflectionPlan(null)
      showToast('Date marked as complete! 🎉')
      loadDatePlans()
    }
  }

  // ============================================
  // CANCEL DATE
  // ============================================
  const handleCancelPlan = async (plan) => {
    await supabase
      .from('date_plans')
      .update({ status: 'cancelled' })
      .eq('id', plan.id)
    loadDatePlans()
  }

  // ============================================
  // FILTER / SORT SUGGESTIONS
  // ============================================
  const filteredPlaces = activeCategory === 'all'
    ? allPlaces
    : allPlaces.filter(p => p.category === activeCategory)

  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    const aRec = recommendedCategories.indexOf(a.category)
    const bRec = recommendedCategories.indexOf(b.category)
    const aScore = aRec === -1 ? 999 : aRec
    const bScore = bRec === -1 ? 999 : bRec
    if (aScore !== bScore) return aScore - bScore
    return (b.rating || 0) - (a.rating || 0)
  })

  // Split My Dates
  const now = new Date()
  const upcomingPlans = datePlans.filter(
    p => p.status !== 'cancelled' && p.status !== 'completed' && new Date(p.date_time) >= now
  )
  const pastPlans = datePlans.filter(
    p => p.status === 'completed' || (p.status !== 'cancelled' && p.date_time && new Date(p.date_time) < now)
  )

  const isLocationSeattle =
    Math.abs(location.lat - DEFAULT_LOCATION.lat) < 0.01 &&
    Math.abs(location.lng - DEFAULT_LOCATION.lng) < 0.01

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">💕</div>
          <p className="text-gray-500 text-sm">Finding date ideas for you…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-14 pb-6">
        <button
          onClick={() => router.back()}
          className="text-white/80 text-sm mb-4 flex items-center gap-1 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-1">Date Night</h1>
        <p className="text-pink-100 text-sm">
          {pageTab === 'suggestions'
            ? recommendedCategories.length > 0
              ? 'Personalised to your relationship goals'
              : 'Discover great places to go together'
            : 'Your scheduled dates'}
        </p>
        {pageTab === 'suggestions' && isLocationSeattle && (
          <p className="text-pink-200 text-xs mt-0.5">Showing results near Seattle, WA</p>
        )}

        {/* Page tabs */}
        <div className="flex gap-1 mt-4 bg-white/20 rounded-xl p-1">
          <button
            onClick={() => setPageTab('suggestions')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
              pageTab === 'suggestions' ? 'bg-white text-pink-600' : 'text-white/80 hover:text-white'
            }`}
          >
            Suggestions
          </button>
          <button
            onClick={() => setPageTab('my_dates')}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-colors ${
              pageTab === 'my_dates' ? 'bg-white text-pink-600' : 'text-white/80 hover:text-white'
            }`}
          >
            My Dates {upcomingPlans.length > 0 && `(${upcomingPlans.length})`}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
          ✓ {toast}
        </div>
      )}

      {/* ==============================
          SUGGESTIONS TAB
          ============================== */}
      {pageTab === 'suggestions' && (
        <>
          {/* Category tabs */}
          <div className="px-4 mt-4 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  {cat.key !== 'all' && recommendedCategories[0] === cat.key && (
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Assessment note */}
          {Object.keys(assessmentScores).length > 0 && (
            <div className="mx-4 mt-4 bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-lg mt-0.5">💜</span>
              <div>
                <p className="text-sm font-semibold text-purple-800">Personalised for you</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  Cards marked "AI Pick" are matched to areas your relationship assessment highlighted.
                </p>
              </div>
            </div>
          )}

          {/* Grid */}
          <div className="px-4 mt-4">
            {fetchingPlaces ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : fetchError ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🗺️</p>
                <p className="text-gray-600 font-medium mb-1">No places found</p>
                <p className="text-gray-400 text-sm">{fetchError}</p>
              </div>
            ) : sortedPlaces.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">
                  {ALL_CATEGORIES.find(c => c.key === activeCategory)?.emoji || '✨'}
                </p>
                <p className="text-gray-600 font-medium mb-1">No places in this category</p>
                <p className="text-gray-400 text-sm">Try switching to a different tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedPlaces.map(place => (
                  <SuggestionCard
                    key={place.place_id}
                    place={place}
                    recommendedCategories={recommendedCategories}
                    assessmentScores={assessmentScores}
                    onSave={handleSave}
                    onPlan={setPlanModalPlace}
                    saving={saving}
                    savedIds={savedIds}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==============================
          MY DATES TAB
          ============================== */}
      {pageTab === 'my_dates' && (
        <div className="px-4 mt-4 space-y-6">
          {loadingPlans ? (
            <div className="text-center py-16">
              <div className="text-3xl mb-2">💕</div>
              <p className="text-gray-400 text-sm">Loading your dates…</p>
            </div>
          ) : datePlans.filter(p => p.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📅</p>
              <p className="text-gray-700 font-semibold mb-1">No dates planned yet</p>
              <p className="text-gray-400 text-sm mb-4">Browse suggestions and tap "Plan This" to schedule your first date</p>
              <button
                onClick={() => setPageTab('suggestions')}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold px-6 py-3 rounded-2xl"
              >
                Browse Suggestions
              </button>
            </div>
          ) : (
            <>
              {/* Upcoming */}
              {upcomingPlans.length > 0 && (
                <div>
                  <h2 className="font-bold text-gray-900 text-base mb-3">Upcoming 📅</h2>
                  <div className="space-y-3">
                    {upcomingPlans.map(plan => (
                      <DatePlanCard
                        key={plan.id}
                        plan={plan}
                        onMarkComplete={setReflectionPlan}
                        onCancel={handleCancelPlan}
                        onEdit={handleOpenEdit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past */}
              {pastPlans.length > 0 && (
                <div>
                  <h2 className="font-bold text-gray-900 text-base mb-3">Past Dates ✨</h2>
                  <div className="space-y-3">
                    {[...pastPlans].reverse().map(plan => (
                      <DatePlanCard
                        key={plan.id}
                        plan={plan}
                        onMarkComplete={setReflectionPlan}
                        onCancel={handleCancelPlan}
                        onEdit={handleOpenEdit}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==============================
          MODALS
          ============================== */}
      <PlanModal
        key={editingPlan?.id ?? 'new'}
        place={planModalPlace}
        existingPlan={editingPlan}
        onClose={handleClosePlanModal}
        onSubmit={handleScheduleDate}
        submitting={submittingPlan}
      />

      <ReflectionModal
        plan={reflectionPlan}
        onClose={() => setReflectionPlan(null)}
        onSubmit={handleMarkComplete}
        submitting={submittingReflection}
      />

    </div>
  )
}
