'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { searchMovies, searchShows, getDetails } from '@/lib/omdb'

// ── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 47.6062, lng: -122.3321 }

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
  return 'Date Night'
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
  const isEvent = stop.source === 'ticketmaster' || stop.place_id?.startsWith('event-')
  return (
    <div style={{ marginBottom: '10px' }}>
      {index > 0 && travelTime && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0 8px 28px' }}>
          <div style={{ width: '1px', height: '12px', background: '#E8DFD0' }} />
          <span style={{ fontSize: '11px', color: '#A09080', background: '#FAF6EF', padding: '2px 8px', borderRadius: '10px' }}>🚗 {travelTime}</span>
        </div>
      )}
      <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #EDE5D8', display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
        <div style={{ width: '36px', background: isEvent ? '#1C1208' : '#FAF0E6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#C4714A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, color: 'white' }}>{index + 1}</div>
        </div>
        {stop.photo_url && (
          <div style={{ width: '68px', height: '68px', flexShrink: 0, overflow: 'hidden' }}>
            <img src={stop.photo_url} alt={stop.name} style={{ width: '68px', height: '68px', objectFit: 'cover' }} />
          </div>
        )}
        {!stop.photo_url && (
          <div style={{ width: '68px', height: '68px', flexShrink: 0, background: isEvent ? 'linear-gradient(160deg,#3A2818,#1C1208)' : 'linear-gradient(160deg,#EDE5D8,#D9CCBA)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isEvent && <span style={{ fontSize: '18px', opacity: 0.2, color: '#FAF6EF' }}>♪</span>}
          </div>
        )}
        <div style={{ padding: '10px 10px 10px 12px', flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1C1208', margin: '0 0 2px', lineHeight: 1.3 }}>{stop.name}</p>
          <p style={{ fontSize: '11px', color: isEvent ? '#C4714A' : '#A09080', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.address}</p>
          <input
            type="text"
            value={stop.note || ''}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add a note…"
            style={{ width: '100%', fontSize: '11px', color: '#7A6A54', background: '#FAF6EF', border: '0.5px solid #EDE5D8', borderRadius: '8px', padding: '5px 8px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 8px 8px 0', flexShrink: 0, justifyContent: 'center' }}>
          <button onClick={onMoveUp} disabled={index === 0} style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FAF6EF', border: '0.5px solid #EDE5D8', fontSize: '11px', color: '#A09080', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button onClick={onMoveDown} disabled={index === total - 1} style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FAF6EF', border: '0.5px solid #EDE5D8', fontSize: '11px', color: '#A09080', cursor: index === total-1 ? 'not-allowed' : 'pointer', opacity: index === total-1 ? 0.3 : 1 }}>↓</button>
          <button onClick={onRemove} style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#FAF6EF', border: '0.5px solid #EDE5D8', fontSize: '11px', color: '#C47A6A', cursor: 'pointer' }}>✕</button>
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
  const isEvent = place.source === 'ticketmaster'
  const imageUrl = place.photo_url || place.image || null
  const dist = !isEvent && place.lat && place.lng && userLocation
    ? formatDist(haversineKm(userLocation, { lat: place.lat, lng: place.lng }))
    : null
  return (
    <div style={{ flexShrink: 0, width: isEvent ? '150px' : '138px', background: isEvent ? '#1C1208' : 'white', borderRadius: '14px', border: isEvent ? 'none' : '0.5px solid #EDE5D8', overflow: 'hidden' }}>
      {imageUrl
        ? <div style={{ height: '88px', overflow: 'hidden' }}><img src={imageUrl} alt={place.name} style={{ width: '100%', height: '88px', objectFit: 'cover' }} /></div>
        : <div style={{ height: '88px', background: isEvent ? 'linear-gradient(160deg,#3A2818,#1C1208)' : 'linear-gradient(160deg,#EDE5D8,#C8B89A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isEvent && <span style={{ fontSize: '24px', opacity: 0.2, color: '#FAF6EF' }}>♪</span>}
          </div>
      }
      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: isEvent ? '#FAF6EF' : '#1C1208', lineHeight: 1.3, margin: '0 0 4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</p>
        <div style={{ fontSize: '10px', color: isEvent ? '#C4714A' : '#A09080', marginBottom: '8px' }}>
          {isEvent
            ? `${place.date || ''}${place.time ? ' · ' + place.time.substring(0,5) : ''}`
            : <>{place.rating && `⭐ ${place.rating.toFixed(1)}`}{dist && ` · ${dist}`}</>
          }
        </div>
        {isEvent
          ? <a href={place.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', padding: '6px', borderRadius: '10px', background: 'transparent', border: '0.5px solid #C4714A', color: '#C4714A', fontSize: '11px', fontWeight: 500, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Tickets →</a>
          : <button onClick={() => onAdd(place)} disabled={alreadyAdded} style={{ width: '100%', padding: '6px', borderRadius: '10px', background: alreadyAdded ? '#F0EBE3' : '#C4714A', border: 'none', color: alreadyAdded ? '#A09080' : 'white', fontSize: '11px', fontWeight: 500, cursor: alreadyAdded ? 'not-allowed' : 'pointer' }}>{alreadyAdded ? '✓ Added' : '+ Add'}</button>
        }
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CustomDateBuilderPage() {
  const router = useRouter()

  // UI mode
  const [mode, setMode] = useState('list')
  const [mapExpanded, setMapExpanded] = useState(false)

  // Maps
  const [mapsReady, setMapsReady] = useState(false)
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER)

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

  // Media search (OMDB)
  const [showMediaSearch, setShowMediaSearch] = useState(false)
  const [mediaQuery, setMediaQuery] = useState('')
  const [mediaType, setMediaType] = useState('movie') // 'movie' | 'show'
  const [mediaResults, setMediaResults] = useState([])
  const [mediaSearching, setMediaSearching] = useState(false)
  const mediaDebounceRef = useRef(null)

  // Itinerary
  const [itinerary, setItinerary] = useState([])
  const [travelTimes, setTravelTimes] = useState([])

  // Save
  const [dateName, setDateName] = useState(defaultDateName())
  const [dateTime, setDateTime] = useState('')
  const [saveStage, setSaveStage] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Preloaded suggestions from Ideas for You Two
  const [preloadedSuggestions, setPreloadedSuggestions] = useState(null)
  const [suggestionVibe, setSuggestionVibe] = useState(null)

  // Refs
  const mapDivRef       = useRef(null)
  const mapInstance     = useRef(null)
  const markersRef      = useRef([])
  const dirRenderer     = useRef(null)
  const dirService      = useRef(null)
  const debounceRef     = useRef(null)
  const inputRef        = useRef(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('date_suggestions')
    const vibe = sessionStorage.getItem('date_suggestion_vibe')
    if (raw) {
      try { setPreloadedSuggestions(JSON.parse(raw)) } catch {}
      sessionStorage.removeItem('date_suggestions')
    }
    if (vibe) {
      setSuggestionVibe(vibe)
      sessionStorage.removeItem('date_suggestion_vibe')
    }
  }, [])

  // ── Load Google Maps JS API ──────────────────────────────────────
  // Use &callback= (not script.onload) — Maps fires the callback only after
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      },
      () => {
        setUserLocation(DEFAULT_CENTER)
      }
    )
  }, [])

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
      polylineOptions: { strokeColor: '#C4714A', strokeWeight: 4, strokeOpacity: 0.75 },
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
          fillColor: i === 0 ? '#C4714A' : '#5D55A0',
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

  // ── Debounced media search ───────────────────────────────────────
  useEffect(() => {
    if (!showMediaSearch || !mediaQuery.trim()) { setMediaResults([]); return }
    clearTimeout(mediaDebounceRef.current)
    mediaDebounceRef.current = setTimeout(async () => {
      setMediaSearching(true)
      try {
        const results = mediaType === 'movie'
          ? await searchMovies(mediaQuery)
          : await searchShows(mediaQuery)
        setMediaResults((results || []).slice(0, 6))
      } catch (e) {
        console.error('OMDB search error:', e)
        setMediaResults([])
      }
      setMediaSearching(false)
    }, 350)
  }, [mediaQuery, mediaType, showMediaSearch])

  // ── Add media stop (movie/show) ──────────────────────────────────
  const addMediaStop = async (result) => {
    let stop
    try {
      const details = await getDetails(result.imdbID)
      stop = {
        place_id: `media-${result.imdbID}`,
        name: details.Title || result.Title,
        address: [details.Genre, details.Year].filter(Boolean).join(' · '),
        lat: null,
        lng: null,
        photo_url: result.Poster !== 'N/A' ? result.Poster : null,
        rating: null,
        price_level: null,
        note: '',
      }
    } catch {
      stop = {
        place_id: `media-${result.imdbID}`,
        name: result.Title,
        address: result.Year || '',
        lat: null,
        lng: null,
        photo_url: result.Poster !== 'N/A' ? result.Poster : null,
        rating: null,
        price_level: null,
        note: '',
      }
    }
    addToItinerary(stop)
    setShowMediaSearch(false)
    setMediaQuery('')
    setMediaResults([])
  }

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

  // ── Pre-populate stops from date suggestion ──────────────────────
  useEffect(() => {
    const savedItinerary = sessionStorage.getItem('customDateItinerary')
    if (savedItinerary) {
      try {
        const stops = JSON.parse(savedItinerary)
        setItinerary(stops)
        sessionStorage.removeItem('customDateItinerary')
      } catch (e) {
        console.error('Failed to parse saved itinerary', e)
      }
    }
  }, [])

  const savedIds = new Set(itinerary.map(s => s.place_id))

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100vh', background: '#FAF6EF', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ flexShrink: 0, background: '#FAF6EF', borderBottom: '0.5px solid #E8DFD0', padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20 }}>
        <button onClick={() => router.back()} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0E8DC', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: '#5A4A36' }}>←</button>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#1C1208', fontWeight: 400, fontStyle: 'italic' }}>Build your date night</span>
        <div style={{ display: 'flex', gap: '2px', background: '#EDE5D8', borderRadius: '20px', padding: '3px' }}>
          {[{id:'list',label:'List'},{id:'map',label:'Map'}].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{ fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '16px', border: 'none', cursor: 'pointer', color: mode === m.id ? '#1C1208' : '#7A6A54', background: mode === m.id ? '#FAF6EF' : 'transparent', transition: 'all 0.15s' }}>{m.label}</button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Search bar */}
        <div style={{ padding: '12px 16px 0', position: 'relative', zIndex: 10 }} data-search-box>
          <div style={{ background: 'white', border: '0.5px solid #E8DFD0', borderRadius: '24px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <span style={{ color: '#B5A899', fontSize: '15px' }}>⌕</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              onFocus={() => predictions.length > 0 && setShowDropdown(true)}
              placeholder="Search restaurants, bars, parks…"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#1C1208' }}
            />
            {searching && <span style={{ fontSize: '11px', color: '#C4B09A' }}>●●●</span>}
          </div>
          {showDropdown && predictions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% - 4px)', left: '16px', right: '16px', zIndex: 50, background: 'white', borderRadius: '16px', boxShadow: '0 4px 24px rgba(28,18,8,0.12)', border: '0.5px solid #EDE5D8', overflow: 'hidden' }}>
              {predictions.map(pred => (
                <button key={pred.place_id} onMouseDown={e => { e.preventDefault(); handleSelectPrediction(pred) }} style={{ width: '100%', padding: '12px 16px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '0.5px solid #F5F0E8', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ flexShrink: 0, marginTop: '2px', fontSize: '13px' }}>📍</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#1C1208', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pred.structured_formatting.main_text}</p>
                    <p style={{ fontSize: '11px', color: '#A09080', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pred.structured_formatting.secondary_text}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom stop + media buttons */}
        <div style={{ display: 'flex', gap: '8px', padding: '10px 16px 0' }}>
          {!showCustomStop && !showMediaSearch && (
            <>
              <button onClick={() => setShowCustomStop(true)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '0.5px solid #E8DFD0', background: 'white', fontSize: '12px', color: '#5A4A36', cursor: 'pointer' }}>+ Custom stop</button>
              <button onClick={() => setShowMediaSearch(true)} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '0.5px solid #E8DFD0', background: 'white', fontSize: '12px', color: '#5A4A36', cursor: 'pointer' }}>🎬 Movie or show</button>
            </>
          )}
          {showCustomStop && (
            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
              <input autoFocus type="text" value={customStopName} onChange={e => setCustomStopName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomStop() }} placeholder="e.g. Dick's Drive-In run…" style={{ flex: 1, padding: '8px 12px', borderRadius: '10px', border: '0.5px solid #E8DFD0', background: 'white', fontSize: '12px', outline: 'none', color: '#1C1208' }} />
              <button onClick={addCustomStop} disabled={!customStopName.trim()} style={{ padding: '8px 14px', borderRadius: '10px', background: '#C4714A', border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer' }}>Add</button>
              <button onClick={() => { setShowCustomStop(false); setCustomStopName('') }} style={{ padding: '8px 10px', borderRadius: '10px', background: '#F0EBE3', border: 'none', color: '#7A6A54', fontSize: '12px', cursor: 'pointer' }}>✕</button>
            </div>
          )}
          {showMediaSearch && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {['movie','show'].map(t => (
                  <button key={t} onClick={() => { setMediaType(t); setMediaResults([]) }} style={{ padding: '5px 12px', borderRadius: '20px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: mediaType === t ? '#C4714A' : '#F0EBE3', color: mediaType === t ? 'white' : '#7A6A54' }}>{t === 'movie' ? '🎬 Movie' : '📺 Show'}</button>
                ))}
                <button onClick={() => { setShowMediaSearch(false); setMediaQuery(''); setMediaResults([]) }} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: '20px', background: '#F0EBE3', border: 'none', color: '#7A6A54', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              </div>
              <input autoFocus type="text" value={mediaQuery} onChange={e => setMediaQuery(e.target.value)} placeholder={`Search ${mediaType === 'movie' ? 'movies' : 'shows'}…`} style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '0.5px solid #E8DFD0', background: 'white', fontSize: '12px', outline: 'none', color: '#1C1208', boxSizing: 'border-box' }} />
              {mediaSearching && <p style={{ fontSize: '11px', color: '#A09080', margin: 0 }}>Searching…</p>}
              {mediaResults.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {mediaResults.map(result => (
                    <div key={result.imdbID} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '10px', padding: '8px 10px', border: '0.5px solid #EDE5D8' }}>
                      {result.Poster !== 'N/A' ? <img src={result.Poster} alt={result.Title} style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : <div style={{ width: '36px', height: '48px', background: '#EDE5D8', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>{mediaType === 'movie' ? '🎬' : '📺'}</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: '#1C1208', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.Title}</p>
                        <p style={{ fontSize: '11px', color: '#A09080', margin: 0 }}>{result.Year}</p>
                      </div>
                      <button onClick={() => addMediaStop(result)} disabled={savedIds.has(`media-${result.imdbID}`)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: savedIds.has(`media-${result.imdbID}`) ? '#F0EBE3' : '#C4714A', color: savedIds.has(`media-${result.imdbID}`) ? '#A09080' : 'white', flexShrink: 0 }}>{savedIds.has(`media-${result.imdbID}`) ? '✓' : '+ Add'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview card */}
        {(previewPlace || loadingPreview) && (
          <div style={{ padding: '10px 16px 0' }}>
            {loadingPreview
              ? <div style={{ height: '80px', background: '#EDE5D8', borderRadius: '14px', animation: 'pulse 1.5s infinite' }} />
              : <PreviewCard place={previewPlace} onAdd={addToItinerary} alreadyAdded={savedIds.has(previewPlace.place_id)} />
            }
          </div>
        )}

        {/* Map strip — collapsible */}
        <div onClick={() => setMapExpanded(e => !e)} style={{ margin: '12px 16px 0', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', height: mapExpanded ? '220px' : '88px', transition: 'height 0.3s ease', position: 'relative', flexShrink: 0 }}>
          <div ref={mapDivRef} style={{ width: '100%', height: '220px' }} />
          {!mapsReady && <div style={{ position: 'absolute', inset: 0, background: '#EDE5D8', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' }}><p style={{ fontSize: '13px', color: '#A09080' }}>Loading map…</p></div>}
          <div style={{ position: 'absolute', bottom: '8px', right: '10px', background: 'rgba(28,18,8,0.55)', color: '#FAF6EF', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', pointerEvents: 'none' }}>{mapExpanded ? 'Tap to collapse' : 'Tap to expand'}</div>
        </div>

        {/* Category chips */}
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {CATEGORY_CHIPS.map(chip => (
            <button key={chip.label} onClick={() => handleChipClick(chip)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '20px', border: activeChip === chip.label ? 'none' : '0.5px solid #E8DFD0', background: activeChip === chip.label ? '#C4714A' : 'white', color: activeChip === chip.label ? 'white' : '#5A4A36', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '13px' }}>{chip.emoji}</span> {chip.label}
            </button>
          ))}
        </div>

        {/* Chip results */}
        {activeChip && (
          <div style={{ padding: '10px 16px 0' }}>
            {loadingChip ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1,2,3].map(i => <div key={i} style={{ flexShrink: 0, width: '138px', height: '160px', background: '#EDE5D8', borderRadius: '14px' }} />)}
              </div>
            ) : chipResults.length > 0 ? (
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {chipResults.map(place => <NearbyCard key={place.place_id} place={place} onAdd={addToItinerary} alreadyAdded={savedIds.has(place.place_id)} userLocation={userLocation} />)}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#A09080' }}>No results nearby</p>
            )}
          </div>
        )}

        {/* Nora's picks */}
        {preloadedSuggestions && preloadedSuggestions.length > 0 && (() => {
          const noraEvents = preloadedSuggestions.filter(s => s.source === 'ticketmaster')
          const noraPlaces = preloadedSuggestions.filter(s => s.source !== 'ticketmaster')
          return (
            <div style={{ margin: '12px 0 0', background: '#FDF3E3', borderTop: '0.5px solid #EDD9B0', borderBottom: '0.5px solid #EDD9B0', padding: '14px 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '13px', color: '#A07840' }}>Nora picked these for {suggestionVibe}</span>
                <button onClick={() => setPreloadedSuggestions(null)} style={{ fontSize: '11px', color: '#C4A882', background: 'none', border: 'none', cursor: 'pointer' }}>Dismiss</button>
              </div>
              {noraEvents.length > 0 && (
                <div style={{ marginBottom: noraPlaces.length > 0 ? '14px' : 0 }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '11px', color: '#C4A882', margin: '0 0 8px' }}>Events</p>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', paddingRight: '40px', WebkitOverflowScrolling: 'touch' }}>
                      {noraEvents.map(s => <NearbyCard key={s.id} place={s} onAdd={addToItinerary} alreadyAdded={itinerary.some(i => i.id && i.id === s.id)} userLocation={userLocation} />)}
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 4, width: '48px', background: 'linear-gradient(to left, #FDF3E3, transparent)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}
              {noraPlaces.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '11px', color: '#C4A882', margin: '0 0 8px' }}>Places</p>
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', paddingRight: '40px', WebkitOverflowScrolling: 'touch' }}>
                      {noraPlaces.map(s => <NearbyCard key={s.place_id} place={s} onAdd={addToItinerary} alreadyAdded={itinerary.some(i => i.place_id && i.place_id === s.place_id)} userLocation={userLocation} />)}
                    </div>
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 4, width: '48px', background: 'linear-gradient(to left, #FDF3E3, transparent)', pointerEvents: 'none' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Your Plan header */}
        {itinerary.length > 0 && (
          <div style={{ margin: '14px 16px 0', padding: '14px 16px', background: 'white', borderRadius: '14px', border: '0.5px solid #EDE5D8' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16px', color: '#1C1208', margin: '0 0 4px' }}>Your plan</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#A09080' }}>{itinerary.length} {itinerary.length === 1 ? 'stop' : 'stops'} planned</span>
              <button onClick={() => setItinerary([])} style={{ fontSize: '11px', color: '#C4714A', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {itinerary.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', margin: '0 0 10px' }}>✨</p>
            <p style={{ fontSize: '13px', color: '#A09080', lineHeight: 1.6, margin: 0 }}>Search above or tap a category<br />to start building your date</p>
          </div>
        )}

        {/* Stop cards */}
        {itinerary.length > 0 && (
          <div style={{ padding: '10px 16px 0' }}>
            {itinerary.map((stop, i) => (
              <StopCard
                key={stop.place_id}
                stop={stop}
                index={i}
                total={itinerary.length}
                travelTime={travelTimes[i - 1]}
                onMoveUp={() => moveStop(i, -1)}
                onMoveDown={() => moveStop(i, 1)}
                onRemove={() => removeStop(i)}
                onNoteChange={note => updateNote(i, note)}
              />
            ))}
          </div>
        )}

        {/* Date name + time + save */}
        {itinerary.length > 0 && (
          <div style={{ padding: '16px 16px 32px' }}>
            <div style={{ background: 'white', borderRadius: '14px', border: '0.5px solid #EDE5D8', padding: '16px' }}>
              <input
                type="text"
                value={dateName}
                onChange={e => setDateName(e.target.value)}
                placeholder="Name your date…"
                style={{ width: '100%', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16px', color: '#1C1208', background: 'transparent', border: 'none', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <div style={{ height: '0.5px', background: '#EDE5D8', marginBottom: '12px' }} />
              <input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                style={{ width: '100%', fontSize: '13px', color: '#7A6A54', background: 'transparent', border: 'none', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              {saveError && <p style={{ fontSize: '12px', color: '#C47A6A', marginBottom: '10px' }}>{saveError}</p>}
              <button
                onClick={handleSave}
                disabled={itinerary.length === 0 || !!saveStage}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: saveStage ? '#EDE5D8' : '#C4714A', border: 'none', color: saveStage ? '#A09080' : 'white', fontSize: '15px', fontWeight: 500, cursor: saveStage ? 'not-allowed' : 'pointer' }}
              >
                {saveStage === 'saving' ? 'Saving…' : saveStage === 'generating' ? 'Getting conversation starters…' : saveStage === 'done' ? '✓ Saved' : 'Save date night'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
