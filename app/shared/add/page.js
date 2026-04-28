'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { searchMovies, searchShows, getDetails } from '@/lib/omdb'

const ITEM_TYPES = {
  movie:      { emoji: '🎬', label: 'Movie' },
  show:       { emoji: '📺', label: 'Show' },
  song:       { emoji: '🎵', label: 'Song' },
  restaurant: { emoji: '🍽️', label: 'Restaurant' },
  date_idea:  { emoji: '💡', label: 'Date Idea' },
}

const TAB_COLORS = {
  movie:      '#5A6B8A',
  show:       '#5A6B8A',
  song:       '#7A8C7E',
  restaurant: '#C9A84C',
  date_idea:  '#6B5B8A',
}

// Types that use OMDB search
const OMDB_TYPES = ['movie', 'show']
// Types that use Spotify search
const SPOTIFY_TYPES = ['song']

export default function AddSharedItemPage() {
  const router = useRouter()

  const [type, setType]     = useState('movie')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const [coupleId, setCoupleId] = useState(null)
  const [userId, setUserId]     = useState(null)
  const [sessionToken, setSessionToken] = useState(null)

  // Plain text mode (restaurant, date_idea)
  const [title, setTitle] = useState('')

  // OMDB search mode (movie, show)
  const [query, setQuery]               = useState('')
  const [results, setResults]           = useState([])
  const [searching, setSearching]       = useState(false)
  const [selected, setSelected]         = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Spotify search mode (song)
  const [spotifyConnected, setSpotifyConnected]   = useState(null) // null=loading, true, false
  const [spotifyQuery, setSpotifyQuery]           = useState('')
  const [spotifyResults, setSpotifyResults]       = useState([])
  const [spotifySearching, setSpotifySearching]   = useState(false)
  const [spotifySelected, setSpotifySelected]     = useState(null)

  const debounceRef         = useRef(null)
  const spotifyDebounceRef  = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: { session } } = await supabase.auth.getSession()
      setSessionToken(session?.access_token || null)

      const { data: couple } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)

      // Check Spotify connection
      const { data: spotifyConn } = await supabase
        .from('user_spotify_connections')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      setSpotifyConnected(!!spotifyConn)
    }
    load()
  }, [router])

  // Reset all input state when type changes
  useEffect(() => {
    setQuery('')
    setResults([])
    setSelected(null)
    setTitle('')
    setNote('')
    setError(null)
    setSpotifyQuery('')
    setSpotifyResults([])
    setSpotifySelected(null)
    clearTimeout(debounceRef.current)
    clearTimeout(spotifyDebounceRef.current)
  }, [type])

  // Debounced OMDB search
  useEffect(() => {
    if (!OMDB_TYPES.includes(type) || !query.trim()) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const fn = type === 'movie' ? searchMovies : searchShows
        const res = await fn(query)
        setResults(res)
      } catch { /* network error — leave results empty */ }
      setSearching(false)
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query, type])

  // Debounced Spotify search
  useEffect(() => {
    if (!SPOTIFY_TYPES.includes(type) || !spotifyConnected || !spotifyQuery.trim()) {
      setSpotifyResults([])
      return
    }
    clearTimeout(spotifyDebounceRef.current)
    spotifyDebounceRef.current = setTimeout(async () => {
      setSpotifySearching(true)
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(spotifyQuery)}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        })
        const data = await res.json()
        setSpotifyResults(data.tracks || [])
      } catch { /* network error */ }
      setSpotifySearching(false)
    }, 500)
    return () => clearTimeout(spotifyDebounceRef.current)
  }, [spotifyQuery, type, spotifyConnected, sessionToken])

  const handleSelect = async (result) => {
    setResults([])
    setQuery('')
    setLoadingDetail(true)
    try {
      const detail = await getDetails(result.imdbID)
      setSelected(detail)
    } catch {
      setSelected({ Title: result.Title, Year: result.Year, Poster: result.Poster, imdbID: result.imdbID })
    }
    setLoadingDetail(false)
  }

  const handleSpotifySelect = (track) => {
    setSpotifySelected(track)
    setSpotifyResults([])
    setSpotifyQuery('')
  }

  const handleSave = async () => {
    const isOmdb    = OMDB_TYPES.includes(type)
    const isSpotify = SPOTIFY_TYPES.includes(type)

    let effectiveTitle
    if (isOmdb)    effectiveTitle = selected?.Title
    else if (isSpotify) effectiveTitle = spotifySelected?.name || title.trim()
    else           effectiveTitle = title.trim()

    if (!effectiveTitle || saving || !coupleId) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        couple_id: coupleId,
        user_id:   userId,
        type,
        title: effectiveTitle,
        note:  note.trim() || null,
      }
      if (isOmdb && selected) {
        payload.imdb_id    = selected.imdbID   || null
        payload.poster_url = selected.Poster && selected.Poster !== 'N/A' ? selected.Poster : null
        payload.year       = selected.Year     || null
        payload.rating     = selected.imdbRating && selected.imdbRating !== 'N/A' ? selected.imdbRating : null
        payload.plot       = selected.Plot     && selected.Plot     !== 'N/A' ? selected.Plot     : null
      }
      if (isSpotify && spotifySelected) {
        payload.spotify_track_id  = spotifySelected.id          || null
        payload.artwork_url       = spotifySelected.albumArt    || null
        payload.artist            = spotifySelected.artist      || null
        payload.streaming_url     = spotifySelected.spotifyUrl  || null
        payload.streaming_service = 'spotify'
      }
      const { error: err } = await supabase.from('shared_items').insert(payload)
      if (err) { setError(err.message); return }
      router.push('/us')
    } catch (e) {
      setError('Something went wrong. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const isOmdb    = OMDB_TYPES.includes(type)
  const isSpotify = SPOTIFY_TYPES.includes(type)
  const canSave   = isOmdb
    ? !!selected
    : isSpotify
      ? (!!spotifySelected || !!title.trim())
      : !!title.trim()

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="text-[#9CA3AF] hover:text-[#2D3648] text-sm mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-[#2D3648]">Add an idea</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-32">

        {/* Type selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {Object.entries(ITEM_TYPES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                type === key ? 'bg-[#C4714A] text-white' : 'bg-white text-[#6B7280] border border-gray-200'
              }`}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: TAB_COLORS[key], flexShrink: 0 }} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {isOmdb ? (
          /* ── OMDB search flow ─────────────────────────────────────────── */
          <>
            {selected ? (
              /* Selected movie/show card */
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
                <div className="flex gap-3 p-4">
                  {selected.Poster && selected.Poster !== 'N/A' ? (
                    <img
                      src={selected.Poster}
                      alt={selected.Title}
                      className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{ITEM_TYPES[type].emoji}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="font-bold text-[#2D3648] text-base leading-snug">{selected.Title}</p>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">{selected.Year}</p>
                    {selected.imdbRating && selected.imdbRating !== 'N/A' && (
                      <p className="text-sm text-[#6B7280] mt-1">⭐ {selected.imdbRating}/10</p>
                    )}
                    {selected.Plot && selected.Plot !== 'N/A' && (
                      <p className="text-[#6B7280] text-xs mt-1.5 leading-relaxed line-clamp-3">{selected.Plot}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-full py-2.5 border-t border-gray-100 text-sm text-[#C4714A] font-medium hover:bg-gray-50 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              /* Search input + results dropdown */
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={`Search for a ${ITEM_TYPES[type].label.toLowerCase()}…`}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#C4714A] focus:outline-none text-[#2D3648] bg-white text-base"
                    autoFocus
                    disabled={loadingDetail}
                  />
                  {(searching || loadingDetail) && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {results.length > 0 && (
                  <div className="mt-2 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                    {results.map(result => (
                      <button
                        key={result.imdbID}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FDF6EF] transition-colors border-b border-gray-50 last:border-0 text-left"
                      >
                        {result.Poster && result.Poster !== 'N/A' ? (
                          <img
                            src={result.Poster}
                            alt={result.Title}
                            className="w-10 h-14 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">{ITEM_TYPES[type].emoji}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[#2D3648] font-semibold text-sm leading-tight">{result.Title}</p>
                          <p className="text-[#9CA3AF] text-xs mt-0.5">{result.Year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : isSpotify ? (
          /* ── Spotify search flow ──────────────────────────────────────── */
          <>
            {spotifyConnected === null ? (
              /* Loading */
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#C4714A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : spotifyConnected ? (
              /* Connected — search UI */
              <>
                {spotifySelected ? (
                  /* Selected track card */
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
                    <div className="flex items-center gap-3 p-4">
                      {spotifySelected.albumArt ? (
                        <img
                          src={spotifySelected.albumArt}
                          alt={spotifySelected.name}
                          className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#2D3648] text-base leading-snug truncate">{spotifySelected.name}</p>
                        <p className="text-[#9CA3AF] text-sm mt-0.5 truncate">{spotifySelected.artist}</p>
                        <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{spotifySelected.album}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSpotifySelected(null)}
                      className="w-full py-2.5 border-t border-gray-100 text-sm text-[#C4714A] font-medium hover:bg-gray-50 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  /* Search input + results */
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={spotifyQuery}
                        onChange={e => setSpotifyQuery(e.target.value)}
                        placeholder="Search for a song…"
                        className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#1DB954] focus:outline-none text-[#2D3648] bg-white text-base"
                        autoFocus
                      />
                      {spotifySearching && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    {spotifyResults.length > 0 && (
                      <div className="mt-2 bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                        {spotifyResults.map(track => (
                          <button
                            key={track.id}
                            onClick={() => handleSpotifySelect(track)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0FDF4] transition-colors border-b border-gray-50 last:border-0 text-left"
                          >
                            {track.albumArtSmall ? (
                              <img
                                src={track.albumArtSmall}
                                alt={track.name}
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">🎵</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[#2D3648] font-semibold text-sm leading-tight truncate">{track.name}</p>
                              <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{track.artist}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Not connected — plain text + nudge */
              <>
                <div className="bg-[#F0FDF4] border border-[#1DB954]/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🎵</span>
                  <div>
                    <p className="text-[#2D3648] font-semibold text-sm">Connect Spotify for song search</p>
                    <p className="text-[#6B7280] text-xs mt-0.5">Or just type the song title below.</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="🎵 Song title…"
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#C4714A] focus:outline-none text-[#2D3648] bg-white mb-3 text-base"
                  autoFocus
                />
              </>
            )}
          </>
        ) : (
          /* ── Plain text flow ──────────────────────────────────────────── */
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={`${ITEM_TYPES[type].emoji} ${ITEM_TYPES[type].label} title…`}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#C4714A] focus:outline-none text-[#2D3648] bg-white mb-3 text-base"
            autoFocus
          />
        )}

        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 focus:border-[#C4714A] focus:outline-none text-[#2D3648] bg-white mb-4 text-base"
        />

        {error && (
          <p className="text-red-500 text-sm px-1">{error}</p>
        )}

      </div>

      {/* Fixed submit button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSave || saving || !coupleId}
            className="w-full py-4 bg-gradient-to-r from-[#C4714A] to-[#A0522D] text-white rounded-2xl font-bold text-lg disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving…' : 'Add an idea'}
          </button>
        </div>
      </div>

    </div>
  )
}
