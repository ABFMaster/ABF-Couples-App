'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, X, ArrowLeft, Play, Pause, Music } from 'lucide-react'

// ROOT CAUSE FIX Aug 18 2026 — this modal was built as a standalone "send a
// song" flow but never wired into the app anywhere (dead code alongside
// FlirtSheet.js). Wiring it in surfaced two real problems, both fixed here:
// 1. handleSend used to insert directly into `flirts` from the browser via
//    the client Supabase call, bypassing /api/flirts/send entirely — no
//    server-side couple-membership check beyond RLS, and it skipped the
//    updateNoraMemory(FLIRT_SENT) signal that route fires, so Nora never
//    found out a song was sent this way. Now posts through the same route
//    FlirtCard.js uses, with the same content/metadata shape, so it's
//    authenticated and Nora-aware like every other flirt send.
// 2. Fully off-brand styling (Spotify-green gradients, rounded-3xl Tailwind
//    SaaS look) — restyled to match the app's actual cream/serif design
//    language (see Mixtape's own restyle, task #169).
// The old optional "message" textarea wrote to a `message` column nothing
// downstream ever reads for song flirts (checked: no `.message` reference
// for songs in FlirtCard.js or app/mixtape/page.js) — dropped rather than
// carried forward as dead functionality.
export default function SendSongModal({
  isOpen,
  onClose,
  coupleId,
  partnerId,
  partnerName,
  onSent,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tracks, setTracks] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [playingPreview, setPlayingPreview] = useState(null)
  const audioRef = useRef(null)
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setTracks([])
      setSelectedTrack(null)
      setError('')
      stopPreview()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTracks(searchQuery)
      }, 300)
    } else {
      setTracks([])
    }

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [searchQuery])

  const searchTracks = async (query) => {
    setSearching(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Please log in again')
        setSearching(false)
        return
      }

      const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        setError(response.status === 400 ? 'Please connect your Spotify account first' : 'Search failed. Please try again.')
        setSearching(false)
        return
      }

      const data = await response.json()
      setTracks(data.tracks || [])
    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
    }

    setSearching(false)
  }

  const playPreview = (track) => {
    if (!track.previewUrl) return
    if (playingPreview === track.id) { stopPreview(); return }
    stopPreview()
    setPlayingPreview(track.id)
    audioRef.current = new Audio(track.previewUrl)
    audioRef.current.volume = 0.5
    audioRef.current.play()
    audioRef.current.onended = () => setPlayingPreview(null)
  }

  const stopPreview = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlayingPreview(null)
  }

  const handleSelectTrack = (track) => { stopPreview(); setSelectedTrack(track) }
  const handleBack = () => setSelectedTrack(null)

  const handleSend = async () => {
    if (!selectedTrack || !coupleId || !partnerId) return

    setSending(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in again')
        setSending(false)
        return
      }

      // Same route + payload shape as components/FlirtCard.js's song send —
      // see comment at the top of this file.
      const res = await fetch('/api/flirts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId,
          receiverId: partnerId,
          type: 'song',
          content: selectedTrack.spotifyUrl,
          metadata: {
            track_id: selectedTrack.id,
            track_name: selectedTrack.name,
            artist: selectedTrack.artist,
            album_art: selectedTrack.albumArt,
            preview_url: selectedTrack.previewUrl,
            track_url: selectedTrack.spotifyUrl,
          },
        }),
      })

      if (!res.ok) {
        setError('Failed to send song. Please try again.')
        setSending(false)
        return
      }

      onSent?.()
      onClose()
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to send song. Please try again.')
    }

    setSending(false)
  }

  const handleClose = () => { stopPreview(); onClose() }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,20,16,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: '#FAF6F0', width: '100%', maxWidth: '480px', maxHeight: '85vh', borderRadius: '20px 20px 0 0', boxShadow: '0 -4px 24px rgba(28,20,16,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid #EDE4D8', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Music size={18} color="#8B7355" strokeWidth={1.75} />
              <div>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#1C1410' }}>
                  {selectedTrack ? 'Send this song' : 'Find a song'}
                </div>
                <div style={{ fontSize: '11px', color: '#8B7355', marginTop: '1px' }}>
                  {selectedTrack ? `to ${partnerName}` : 'Search to add to your mixtape'}
                </div>
              </div>
            </div>
            <button onClick={handleClose} aria-label="Close" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #D9CBBA', background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8B7355' }}>
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          {!selectedTrack ? (
            <div>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={15} strokeWidth={1.75} color="#C4AA87" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a song..."
                  autoFocus
                  style={{ width: '100%', padding: '12px 14px 12px 38px', border: '1px solid #D9CBBA', borderRadius: '12px', fontSize: '14px', color: '#1C1410', background: '#FFFFFF', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                />
                {searching && (
                  <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', border: '2px solid #D9CBBA', borderTopColor: '#8B7355', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                )}
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#FBEAE7', color: '#B4432E', borderRadius: '10px', fontSize: '12px', marginBottom: '14px' }}>{error}</div>
              )}

              <div>
                {tracks.map((track) => (
                  <div key={track.id} onClick={() => handleSelectTrack(track)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                      {track.albumArtSmall ? (
                        <img src={track.albumArtSmall} alt="" style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '8px', background: '#EDE4D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Music size={16} color="#C4AA87" strokeWidth={1.75} />
                        </div>
                      )}
                      {track.previewUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); playPreview(track) }}
                          aria-label={playingPreview === track.id ? 'Pause preview' : 'Play preview'}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,16,0.35)', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF' }}
                        >
                          {playingPreview === track.id ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#1C1410', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
                      <div style={{ fontSize: '12px', color: '#8B7355', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                    </div>
                  </div>
                ))}

                {searchQuery.length >= 2 && !searching && tracks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#C4AA87' }}>
                    <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '16px' }}>No songs found</div>
                    <div style={{ fontSize: '12px', marginTop: '2px' }}>Try a different search</div>
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: '#C4AA87' }}>
                    <Music size={26} strokeWidth={1.5} style={{ marginBottom: '6px' }} />
                    <div style={{ fontSize: '13px' }}>Search for a song to send</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#8B7355', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
                <ArrowLeft size={14} strokeWidth={1.75} />
                Back to search
              </button>

              <div style={{ background: '#1C1410', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                {selectedTrack.albumArt ? (
                  <img src={selectedTrack.albumArt} alt="" style={{ width: '76px', height: '76px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '76px', height: '76px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={24} color="#C4AA87" strokeWidth={1.5} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#FAF6F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTrack.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(250,246,240,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTrack.artist}</div>
                  {selectedTrack.previewUrl && (
                    <button onClick={() => playPreview(selectedTrack)} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', background: 'none', border: 'none', color: '#C4AA87', fontSize: '11px', cursor: 'pointer', padding: 0 }}>
                      {playingPreview === selectedTrack.id ? <Pause size={12} strokeWidth={2} /> : <Play size={12} strokeWidth={2} />}
                      {playingPreview === selectedTrack.id ? 'Pause preview' : 'Play preview'}
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#FBEAE7', color: '#B4432E', borderRadius: '10px', fontSize: '12px', marginTop: '14px' }}>{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTrack && (
          <div style={{ padding: '16px 22px 22px', borderTop: '1px solid #EDE4D8', flexShrink: 0 }}>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ width: '100%', padding: '14px', background: '#1C1410', color: '#FAF6F0', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}
            >
              {sending ? 'Sending...' : `Send to ${partnerName}`}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  )
}
