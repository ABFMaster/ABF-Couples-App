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
// PRICE DOTS
// ============================================
function PriceDots({ level }) {
  if (!level) return null
  const labels = ['', '$', '$$', '$$$', '$$$$']
  return (
    <span className="text-xs text-gray-500 font-medium">{labels[level] || ''}</span>
  )
}

// ============================================
// STAR RATING
// ============================================
function StarRating({ rating }) {
  if (!rating) return null
  return (
    <span className="text-xs text-gray-500">
      ⭐ {rating.toFixed(1)}
    </span>
  )
}

// ============================================
// SUGGESTION CARD
// ============================================
function SuggestionCard({ place, recommendedCategories, assessmentScores, onSave, onPlan, saving }) {
  const config = CATEGORY_CONFIG[place.category] || CATEGORY_CONFIG.other
  const isRecommended = recommendedCategories.includes(place.category)

  // Find which assessment reason applies for this category
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
          <img
            src={place.photo_url}
            alt={place.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {config.emoji}
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </div>

        {/* AI Recommended badge */}
        {recommendedReason && (
          <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            AI Pick
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
          {place.title}
        </h3>
        {place.address && (
          <p className="text-xs text-gray-500 line-clamp-1 mb-2">{place.address}</p>
        )}

        <div className="flex items-center gap-3 mb-3">
          <StarRating rating={place.rating} />
          <PriceDots level={place.price_level} />
        </div>

        {/* Recommended reason */}
        {recommendedReason && (
          <div className="bg-pink-50 border border-pink-100 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs text-pink-700">{recommendedReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={() => onSave(place)}
            disabled={saving === place.place_id}
            className="flex-1 text-xs font-medium border border-pink-300 text-pink-600 rounded-full py-2 hover:bg-pink-50 transition-colors disabled:opacity-50"
          >
            {saving === place.place_id ? 'Saving…' : '♡ Save'}
          </button>
          <a
            href={place.maps_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-xs font-medium bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full py-2 text-center hover:opacity-90 transition-opacity"
          >
            Plan This
          </a>
        </div>
      </div>
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

  // Suggestions state
  const [allPlaces, setAllPlaces] = useState([])           // flat list of all fetched places
  const [recommendedCategories, setRecommendedCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [fetchingPlaces, setFetchingPlaces] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  // Save state
  const [saving, setSaving] = useState(null)   // place_id being saved
  const [savedIds, setSavedIds] = useState(new Set())
  const [saveMsg, setSaveMsg] = useState(null)

  // ============================================
  // INIT: auth + profile + assessment
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

    // Fetch couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('id')
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .single()

    const cid = coupleData?.id || null
    setCoupleId(cid)

    // Fetch latest assessment scores
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

    // Fetch recent completed date_plans (last 30 days) to avoid repeats
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

      // Track already-saved ids
      const { data: allSaved } = await supabase
        .from('couple_date_places')
        .select('place_id')
        .eq('couple_id', cid)

      if (allSaved) {
        setSavedIds(new Set(allSaved.map(r => r.place_id)))
      }
    }

    // Try to get user's browser location; fall back to Seattle
    try {
      await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            resolve()
          },
          () => resolve(),   // silently fall back
          { timeout: 5000 }
        )
      })
    } catch {
      // use default
    }

    // Run smart selection
    const selection = selectDateSuggestions({
      userLocation: location,
      assessmentScores: scores,
      recentDates,
    })
    setRecommendedCategories(selection.categories)

    setLoading(false)

    // Fetch places for top recommended categories
    fetchPlacesForCategories(selection, location)
  }

  // ============================================
  // FETCH PLACES
  // ============================================
  const fetchPlacesForCategories = useCallback(async (selection, loc) => {
    setFetchingPlaces(true)
    setFetchError(null)

    const categoriesToFetch = selection.categories.slice(0, 4)
    const collected = []
    const seenIds = new Set()

    for (const category of categoriesToFetch) {
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
  // SAVE PLACE
  // ============================================
  const handleSave = async (place) => {
    if (!coupleId) return
    if (savedIds.has(place.place_id)) return

    setSaving(place.place_id)

    const { error } = await supabase
      .from('couple_date_places')
      .insert({
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
      setSaveMsg(`${place.title} saved!`)
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  // ============================================
  // FILTER
  // ============================================
  const filteredPlaces = activeCategory === 'all'
    ? allPlaces
    : allPlaces.filter(p => p.category === activeCategory)

  // Sort: recommended categories first, then by rating
  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    const aRec = recommendedCategories.indexOf(a.category)
    const bRec = recommendedCategories.indexOf(b.category)
    const aScore = aRec === -1 ? 999 : aRec
    const bScore = bRec === -1 ? 999 : bRec
    if (aScore !== bScore) return aScore - bScore
    return (b.rating || 0) - (a.rating || 0)
  })

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
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-14 pb-8">
        <button
          onClick={() => router.back()}
          className="text-white/80 text-sm mb-4 flex items-center gap-1 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold mb-1">Date Night Ideas</h1>
        <p className="text-pink-100 text-sm">
          {recommendedCategories.length > 0
            ? 'Personalised to your relationship goals'
            : 'Discover great places to go together'}
        </p>
        {isLocationSeattle && (
          <p className="text-pink-200 text-xs mt-1">Showing results near Seattle, WA</p>
        )}
      </div>

      {/* Save toast */}
      {saveMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          ✓ {saveMsg}
        </div>
      )}

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
              {/* Dot if this is a recommended category */}
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
                onPlan={() => {}}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
