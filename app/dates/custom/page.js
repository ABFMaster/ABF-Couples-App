'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Constants ──────────────────────────────────────────────────────────────────
const SEATTLE_CENTER = { lat: 47.6062, lng: -122.3321 }

const CATEGORY_CHIPS = [
  { label: 'Dinner',     type: 'restaurant',    emoji: '🍽️' },
  { label: 'Drinks',     type: 'bar',           emoji: '🍸' },
  { label: 'Coffee',     type: 'cafe',          emoji: '☕' },
  { label: 'Activities', type: 'amusement_park', emoji: '🎡' },
  { label: 'Live Music', type: 'night_club',    emoji: '🎵' },
  { label: 'Dessert',    type: 'bakery',        emoji: '🍰' },
  { label: 'Outdoors',   type: 'park',          emoji: '🌿' },
]

function defaultDateName() {
  return `Date Night · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// Haversine distance in km
function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function formatDist(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StopCard({ stop, index, total, travelTime, onMoveUp, onMoveDown, onRemove, onNoteChange }) {
  return (
    <div className="px-5 py-4">
      {/* Travel time connector */}
      {index > 0 && travelTime && (
        <div className="flex items-center gap-2 mb-3 pl-4">
          <div className="w-0.5 h-4 bg-cream-100 ml-3" />
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full ml-1">🚗 {travelTime}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        {/* Badge */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5 shadow-sm">
          {index + 1}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{stop.name}</p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{stop.address}</p>
          <input
            type="text"
            value={stop.note || ''}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add a note… (e.g. make a reservation)"
            className="mt-2 w-full text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-coral-100 focus:bg-white transition-colors"
          />
        </div>
        {/* Controls */}
        <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
          <button onClick={onMoveUp} disabled={index === 0}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          >↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
          >↓</button>
          <button onClick={onRemove}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-red-400 hover:bg-red-50 text-xs"
            title="Remove"
          >✕</button>
        </div>
      </div>
    </div>
  )
}

function PreviewCard({ place, onAdd, alreadyAdded }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {place.photo_url && (
        <div className="h-28 overflow-hidden relative">
          <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{place.name}</p>
          <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{place.address}</p>
          <div className="flex items-center gap-3 mt-1">
            {place.rating && <span className="text-xs text-gray-500">⭐ {place.rating.toFixed(1)}</span>}
            {place.price_level && <span className="text-xs text-gray-500">{'$'.repeat(place.price_level)}</span>}
          </div>
        </div>
        <button
          onClick={() => onAdd(place)}
          disabled={alreadyAdded}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            alreadyAdded
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-coral-500 to-indigo-500 text-white hover:shadow-md active:scale-95'
          }`}
        >
          {alreadyAdded ? '✓ Added' : '+ Add'}
        </button>
      </div>
    </div>
  )
}

function NearbyCard({ place, onAdd, alreadyAdded, userLocation }) {
  const dist = place.lat && place.lng && userLocation
    ? formatDist(haversineKm(userLocation, { lat: place.lat, lng: place.lng }))
    : null

  return (
    <div className="flex-shrink-0 w-40 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {place.photo_url
        ? <div className="h-24"><img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" /></div>
        : <div className="h-16 bg-gradient-to-br from-cream-100 to-indigo-100" />
      }
      <div className="p-3">
        <p className="font-semibold text-gray-900 text-xs leading-tight line-clamp-2 mb-1">{place.name}</p>
        <div className="flex items-center gap-1.5 mb-2">
          {place.rating && <span className="text-xs text-gray-400">⭐ {place.rating.toFixed(1)}</span>}
          {dist && <span className="text-xs text-gray-300">· {dist}</span>}
        </div>
        <button
          onClick={() => onAdd(place)}
          disabled={alreadyAdded}
          className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-all ${
            alreadyAdded ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-coral-500 to-indigo-500 text-white active:scale-95'
          }`}
        >
          {alreadyAdded ? '✓ Added' : '+ Add'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CustomDateBuilderPage() {
  const router = useRouter()

  // UI mode
  const [mode, setMode] = useState('map')

  // Maps
  const [mapsReady, setMapsReady] = useState(false)
  const [userLocation, setUserLocation] = useState(SEATTLE_CENTER)

  // Search
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [previewPlace, setPreviewPlace] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  // Category chips
  const [activeChip, setActiveChip] = useState(null)
  const [chipResults, setChipResults] = useState([])
  const [loadingChip, setLoadingChip] = useState(false)

  // Custom stop
  const [showCustomStop, setShowCustomStop] = useState(false)
  const [customStopName, setCustomStopName] = useState('')

  // Itinerary
  const [itinerary, setItinerary] = useState([])
  const [travelTimes, setTravelTimes] = useState([])

  // Save
  const [dateName, setDateName] = useState(defaultDateName())
  const [dateTime, setDateTime] = useState('')
  const [saveStage, setSaveStage] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Refs
  const mapDivRef       = useRef(null)
  const mapInstance     = useRef(null)
  const markersRef      = useRef([])
  const dirRenderer     = useRef(null)
  const dirService      = useRef(null)
  const debounceRef     = useRef(null)
  const inputRef        = useRef(null)

  // ── Load Google Maps JS API ──────────────────────────────────────
  // Use &callback= (not script.onload) — Maps fires the callback only after
  // window.google.maps and all services are fully initialized.
  // script.onload fires when the script downloads, which can be before Maps
  // is ready, causing "google is not defined" or silent service failures.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) return

    // Already initialized from a previous page visit
    if (window.google?.maps?.places) {
      setMapsReady(true)
      return
    }

    // Script already injected (e.g. hot reload) — callback will still fire
    if (document.getElementById('gmaps-custom')) return

    // Register callback before injecting script so it's available when Maps calls it
    window.__gmapsCustomInit = () => {
      delete window.__gmapsCustomInit
      setMapsReady(true)
    }

    const script = document.createElement('script')
    script.id = 'gmaps-custom'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async&callback=__gmapsCustomInit`
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      // Clean up if component unmounts before the script finishes loading
      if (window.__gmapsCustomInit) delete window.__gmapsCustomInit
    }
  }, [])

  // ── Geolocation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fallback to Seattle
    )
  }, [])

  // ── Init map (once) ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapsReady || !mapDivRef.current || mapInstance.current) return

    const map = new window.google.maps.Map(mapDivRef.current, {
      center: userLocation,
      zoom: 13,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      styles: [
        { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',      elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })

    mapInstance.current = map

    dirRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#E8614D', strokeWeight: 4, strokeOpacity: 0.75 },
    })
    dirRenderer.current.setMap(map)

    dirService.current    = new window.google.maps.DirectionsService()
  }, [mapsReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pan map when location first acquired ────────────────────────
  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.panTo(userLocation)
  }, [userLocation])

  // ── Trigger map resize when switching back to map mode ──────────
  useEffect(() => {
    if (mode !== 'map' || !mapInstance.current) return
    requestAnimationFrame(() => {
      window.google.maps.event.trigger(mapInstance.current, 'resize')
      if (itinerary.length >= 2) {
        const bounds = new window.google.maps.LatLngBounds()
        itinerary.forEach(s => { if (s.lat && s.lng) bounds.extend({ lat: s.lat, lng: s.lng }) })
        mapInstance.current.fitBounds(bounds, 60)
      } else {
        mapInstance.current.setCenter(userLocation)
      }
    })
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync markers + route when itinerary changes ─────────────────
  useEffect(() => {
    if (!mapInstance.current) return

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    // Clear route
    if (dirRenderer.current) dirRenderer.current.setDirections({ routes: [] })
    setTravelTimes([])

    if (itinerary.length === 0) return

    // Drop numbered markers
    itinerary.forEach((stop, i) => {
      if (!stop.lat || !stop.lng) return
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: mapInstance.current,
        label: { text: String(i + 1), color: 'white', fontWeight: 'bold', fontSize: '11px' },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: i === 0 ? '#E8614D' : '#5D55A0',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        },
        zIndex: 10 + i,
      })
      markersRef.current.push(marker)
    })

    // Fit bounds to markers
    if (itinerary.length >= 2) {
      const bounds = new window.google.maps.LatLngBounds()
      itinerary.forEach(s => { if (s.lat && s.lng) bounds.extend({ lat: s.lat, lng: s.lng }) })
      mapInstance.current.fitBounds(bounds, 60)
    } else if (itinerary[0]?.lat) {
      mapInstance.current.setCenter({ lat: itinerary[0].lat, lng: itinerary[0].lng })
      mapInstance.current.setZoom(15)
    }

    // Draw route between 2+ stops
    const valid = itinerary.filter(s => s.lat && s.lng)
    if (valid.length < 2 || !dirService.current) return

    dirService.current.route(
      {
        origin:      { lat: valid[0].lat, lng: valid[0].lng },
        destination: { lat: valid[valid.length - 1].lat, lng: valid[valid.length - 1].lng },
        waypoints:    valid.slice(1, -1).map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
        travelMode:  window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          dirRenderer.current.setDirections(result)
          setTravelTimes(result.routes[0]?.legs.map(leg => leg.duration?.text) ?? [])
        }
      }
    )
  }, [itinerary])

  // ── Debounced autocomplete ───────────────────────────────────────
  const handleQueryChange = useCallback((value) => {
    setQuery(value)
    setPreviewPlace(null)
    clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { AutocompleteSuggestion } =
          await window.google.maps.importLibrary('places')
        const { suggestions } = await AutocompleteSuggestion
          .fetchAutocompleteSuggestions({
            input: value,
            locationBias: {
              center: userLocation,
              radius: 50000
            },
            includedPrimaryTypes: ['establishment']
          })
        const normalized = (suggestions || []).slice(0, 6).map(s => ({
          place_id: s.placePrediction.placeId,
          structured_formatting: {
            main_text: s.placePrediction.mainText?.text || s.placePrediction.text?.text || '',
            secondary_text: s.placePrediction.secondaryText?.text || ''
          },
          description: s.placePrediction.text?.text || ''
        }))
        setPredictions(normalized)
        setShowDropdown(normalized.length > 0)
      } catch (err) {
        console.error('Autocomplete error:', err)
        setPredictions([])
        setShowDropdown(false)
      }
      setSearching(false)
    }, 280)
  }, [userLocation])

  // ── Select prediction → get details → show preview ──────────────
  const handleSelectPrediction = useCallback(async (pred) => {
    setQuery(pred.structured_formatting.main_text)
    setPredictions([])
    setShowDropdown(false)
    setLoadingPreview(true)
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const place = new Place({ id: pred.place_id })
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress',
                 'location', 'photos', 'rating', 'priceLevel']
      })
      setPreviewPlace({
        place_id:    place.id,
        name:        place.displayName || pred.structured_formatting.main_text,
        address:     place.formattedAddress || '',
        lat:         place.location?.lat() ?? null,
        lng:         place.location?.lng() ?? null,
        photo_url:   place.photos?.[0]?.getURI({ maxWidth: 600 }) ?? null,
        rating:      place.rating ?? null,
        price_level: place.priceLevel ?? null,
        note:        '',
      })
    } catch (err) {
      console.error('Place details error:', err)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  // ── Add place to itinerary ───────────────────────────────────────
  const addToItinerary = useCallback((place) => {
    setItinerary(prev => {
      if (prev.some(s => s.place_id === place.place_id)) return prev
      return [...prev, { ...place, note: '' }]
    })
    setPreviewPlace(null)
    setQuery('')
    setActiveChip(null)
    setChipResults([])
  }, [])

  // ── Add custom stop (no address) ────────────────────────────────
  const addCustomStop = () => {
    if (!customStopName.trim()) return
    addToItinerary({
      place_id: `custom-${Date.now()}`,
      name: customStopName.trim(),
      address: '',
      lat: null,
      lng: null,
      photo_url: null,
      rating: null,
      price_level: null,
      note: '',
    })
    setCustomStopName('')
    setShowCustomStop(false)
  }

  // ── Category chip → nearby search ───────────────────────────────
  const handleChipClick = useCallback(async (chip) => {
    if (activeChip === chip.label) { setActiveChip(null); setChipResults([]); return }
    setActiveChip(chip.label)
    setChipResults([])
    setLoadingChip(true)
    try {
      const { Place } = await window.google.maps.importLibrary('places')
      const { places } = await Place.searchNearby({
        fields: ['id', 'displayName', 'formattedAddress',
                 'location', 'photos', 'rating', 'priceLevel'],
        locationRestriction: {
          center: userLocation,
          radius: 5000
        },
        includedTypes: [chip.type],
        maxResultCount: 5
      })
      setChipResults(
        (places || []).map(p => ({
          place_id:    p.id,
          name:        p.displayName || '',
          address:     p.formattedAddress || '',
          lat:         p.location?.lat() ?? null,
          lng:         p.location?.lng() ?? null,
          photo_url:   p.photos?.[0]?.getURI({ maxWidth: 400 }) ?? null,
          rating:      p.rating ?? null,
          price_level: p.priceLevel ?? null,
          note:        '',
        }))
      )
    } catch (err) {
      console.error('Nearby search error:', err)
      setChipResults([])
    } finally {
      setLoadingChip(false)
    }
  }, [activeChip, userLocation])

  // ── Itinerary helpers ────────────────────────────────────────────
  const moveStop = (index, dir) => {
    setItinerary(prev => {
      const next = [...prev]
      const t = index + dir
      if (t < 0 || t >= next.length) return prev
      ;[next[index], next[t]] = [next[t], next[index]]
      return next
    })
  }

  const removeStop    = index => setItinerary(prev => prev.filter((_, i) => i !== index))
  const updateNote    = (index, note) => setItinerary(prev => prev.map((s, i) => i === index ? { ...s, note } : s))

  // ── Save to Supabase ─────────────────────────────────────────────
  const handleSave = async () => {
    if (itinerary.length === 0) return
    setSaveError(null)
    setSaveStage('saving')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveError('Not logged in'); setSaveStage(null); return }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      const coupleId = coupleData?.id ?? null

      // Insert the date first
      const { data: newDate, error } = await supabase
        .from('custom_dates')
        .insert({
          user_id:   user.id,
          couple_id: coupleId,
          title:     dateName.trim() || defaultDateName(),
          stops:     itinerary,
          date_time: dateTime ? new Date(dateTime).toISOString() : null,
          status:    'planned',
        })
        .select()
        .single()

      if (error) throw error

      // Generate conversation starters
      setSaveStage('generating')
      try {
        await fetch('/api/dates/conversation-starters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupleId,
            userId: user.id,
            dateTitle: dateName.trim() || defaultDateName(),
            stops: itinerary,
          })
        }).then(async res => {
          const { starters } = await res.json()
          if (starters) {
            await supabase
              .from('custom_dates')
              .update({ conversation_starters: starters })
              .eq('id', newDate.id)
          }
        })
      } catch (e) {
        console.error('Starters generation failed:', e)
        // Non-fatal — date is already saved
      }

      setSaveStage('done')
      setTimeout(() => router.push(`/dates/${newDate.id}`), 800)
    } catch (err) {
      console.error('Save error:', err)
      setSaveError('Failed to save. Please try again.')
      setSaveStage(null)
    }
  }

  // ── Close dropdown on outside click ─────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (!e.target.closest('[data-search-box]')) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const savedIds = new Set(itinerary.map(s => s.place_id))

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col" style={{ height: '100dvh', minHeight: '100vh' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-20">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 flex-shrink-0"
        >←</button>
        <h1 className="font-bold text-gray-900 flex-1 truncate">Build Your Date Night</h1>
        {/* Map / List toggle */}
        <div className="flex bg-gray-100 rounded-full p-0.5 flex-shrink-0">
          {[{ id: 'map', label: '🗺️ Map' }, { id: 'list', label: '📋 List' }].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                mode === m.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >{m.label}</button>
          ))}
        </div>
      </div>

      {/* ── Search bar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 z-10" data-search-box>
        <div className="relative max-w-2xl mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-sm">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            placeholder="Search restaurants, bars, parks…"
            className="w-full pl-10 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-200 focus:bg-white transition-colors"
          />
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs animate-pulse">●●●</span>
          )}
          {/* Autocomplete dropdown */}
          {showDropdown && predictions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {predictions.map(pred => (
                <button
                  key={pred.place_id}
                  onMouseDown={e => { e.preventDefault(); handleSelectPrediction(pred) }}
                  className="w-full px-4 py-3 text-left hover:bg-cream-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <span className="flex-shrink-0 mt-0.5 text-sm">📍</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{pred.structured_formatting.main_text}</p>
                    <p className="text-gray-400 text-xs truncate mt-0.5">{pred.structured_formatting.secondary_text}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-2">
            {!showCustomStop ? (
              <button
                onClick={() => setShowCustomStop(true)}
                className="text-xs text-gray-400 hover:text-[#E8614D] transition-colors flex items-center gap-1"
              >
                <span>＋</span> Add something without an address
                  (movie at home, Dick's run, etc.)
              </button>
            ) : (
              <div className="flex gap-2 mt-1">
                <input
                  autoFocus
                  type="text"
                  value={customStopName}
                  onChange={e => setCustomStopName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomStop() }}
                  placeholder="e.g. Movie at home, Dick's Drive-In run…"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-200 focus:bg-white"
                />
                <button
                  onClick={addCustomStop}
                  disabled={!customStopName.trim()}
                  className="px-4 py-2.5 bg-[#E8614D] text-white rounded-2xl text-sm font-semibold disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowCustomStop(false); setCustomStopName('') }}
                  className="px-3 py-2.5 bg-gray-100 text-gray-500 rounded-2xl text-sm"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Preview card ────────────────────────────────────────── */}
      {(previewPlace || loadingPreview) && (
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
          <div className="max-w-2xl mx-auto">
            {loadingPreview
              ? <div className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              : <PreviewCard place={previewPlace} onAdd={addToItinerary} alreadyAdded={savedIds.has(previewPlace.place_id)} />
            }
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* MAP PANEL — always in DOM, hidden in list mode (preserves map instance) */}
        <div
          className={`relative flex-shrink-0 lg:flex-1 ${mode === 'list' ? 'hidden' : ''}`}
          style={{ height: '45vh' }}
        >
          <div ref={mapDivRef} className="w-full h-full" />
          {!mapsReady && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-400 animate-pulse">Loading map…</p>
            </div>
          )}
        </div>

        {/* ITINERARY PANEL */}
        <div className={`bg-white flex flex-col overflow-hidden ${
          mode === 'map' ? 'flex-1 lg:flex-none lg:w-96 lg:border-l lg:border-gray-100' : 'flex-1'
        }`}>
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Category chips (shown when no stops yet) */}
            {itinerary.length === 0 && (
              <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick add by category</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {CATEGORY_CHIPS.map(chip => (
                    <button
                      key={chip.label}
                      onClick={() => handleChipClick(chip)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all ${
                        activeChip === chip.label
                          ? 'bg-gradient-to-r from-coral-500 to-indigo-500 text-white border-transparent shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-coral-200'
                      }`}
                    >
                      <span>{chip.emoji}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
                {/* Chip results */}
                {activeChip && (
                  <div className="mt-3">
                    {loadingChip ? (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex-shrink-0 w-40 h-40 bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : chipResults.length > 0 ? (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {chipResults.map(place => (
                          <NearbyCard
                            key={place.place_id}
                            place={place}
                            onAdd={addToItinerary}
                            alreadyAdded={savedIds.has(place.place_id)}
                            userLocation={userLocation}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No results nearby</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Itinerary header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">
                  {mode === 'list' ? 'Date Itinerary' : 'Your Plan'}
                </h3>
                {itinerary.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{itinerary.length} stop{itinerary.length !== 1 ? 's' : ''}</p>
                )}
              </div>
              {itinerary.length > 0 && (
                <button onClick={() => setItinerary([])} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {/* Empty state */}
            {itinerary.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-gray-400 text-sm">Search above or tap a category to start building your date</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {itinerary.map((stop, index) => (
                  <StopCard
                    key={stop.place_id}
                    stop={stop}
                    index={index}
                    total={itinerary.length}
                    travelTime={travelTimes[index - 1]}
                    onMoveUp={() => moveStop(index, -1)}
                    onMoveDown={() => moveStop(index, 1)}
                    onRemove={() => removeStop(index)}
                    onNoteChange={note => updateNote(index, note)}
                  />
                ))}
                <div className="px-5 py-3 text-center">
                  <p className="text-xs text-gray-400">Search above to add another stop</p>
                </div>
              </div>
            )}
          </div>

          {/* Save section — pinned to bottom of panel */}
          {itinerary.length > 0 && (
            <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4 bg-white space-y-3">
              <input
                type="text"
                value={dateName}
                onChange={e => setDateName(e.target.value)}
                placeholder="Name your date…"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral-200 focus:bg-white transition-colors"
              />
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  When is this date? <span className="text-gray-300 font-normal normal-case">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={e => setDateTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E2DD] focus:border-[#E8614D] focus:outline-none text-gray-700 bg-white"
                />
              </div>
              {saveError && <p className="text-xs text-red-500 text-center">{saveError}</p>}
              {saveStage === null && (
                <button
                  onClick={handleSave}
                  disabled={itinerary.length === 0}
                  className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#3D3580] text-white font-bold rounded-2xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  Save Date →
                </button>
              )}
              {saveStage === 'saving' && (
                <div className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#3D3580] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving your date…
                </div>
              )}
              {saveStage === 'generating' && (
                <div className="w-full py-4 bg-gradient-to-r from-[#E8614D] to-[#3D3580] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ✨ Generating conversation starters…
                </div>
              )}
              {saveStage === 'done' && (
                <div className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
                  ✓ Date saved! Heading there now…
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
