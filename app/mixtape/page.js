'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Mixtape() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [songs, setSongs] = useState([])
  const [playingId, setPlayingId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [sessionToken, setSessionToken] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const audioRef = useRef(null)
  const progressIntervalRef = useRef(null)

  useEffect(() => {
    checkAuth()
    return () => {
      stopPlayback()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: { session } } = await supabase.auth.getSession()
      setSessionToken(session?.access_token || null)

      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)

      const partnerUserId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id

      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerUserId)
        .maybeSingle()

      setPartnerName(partnerProfile?.display_name || 'Partner')

      await fetchSongs(coupleData.id)
      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const fetchSongs = async (coupleId) => {
    // Fixed Aug 11 2026 (Mixtape data-flow fix) — this used to filter on
    // spotify_track_id, which the current Flirt send path never populated
    // (song data was refactored into a `metadata` JSONB column and nothing
    // updated this query or the flat spotify_* columns to match, so every
    // song sent since that refactor was invisible here even though it
    // rendered fine inside Flirt). spotify_track_id also isn't something
    // historical rows can ever get retroactively, since the app never
    // captured it before now. spotify_track_name has been present on every
    // real song send since the column existed, so it's both the actual
    // "this is a valid song" signal and the one the backfill migration
    // (docs/database/mixtape_data_flow_fix.sql) can restore for old rows.
    const { data, error } = await supabase
      .from('flirts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('type', 'song')
      .not('spotify_track_name', 'is', null)
      .order('created_at', { ascending: false })

    if (!error) {
      setSongs(data || [])
    }
  }

  // Either partner can remove a song — shared curated list, not a private
  // inbox. Matt's ask (Aug 11 2026): a duplicate from his own testing with
  // no way to remove it. Optimistic removal from local state, rolled back
  // if the request fails.
  const handleDeleteSong = async (songId) => {
    if (!window.confirm('Remove this song from your Mixtape?')) return
    const previousSongs = songs
    setDeletingId(songId)
    setSongs(prev => prev.filter(s => s.id !== songId))
    if (playingId === songId) stopPlayback()
    try {
      const res = await fetch('/api/mixtape/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ flirtId: songId }),
      })
      if (!res.ok) {
        setSongs(previousSongs)
      }
    } catch {
      setSongs(previousSongs)
    }
    setDeletingId(null)
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    setPlayingId(null)
    setProgress(0)
  }

  const togglePlay = (song) => {
    if (!song.spotify_preview_url) return

    if (playingId === song.id) {
      stopPlayback()
      return
    }

    stopPlayback()

    audioRef.current = new Audio(song.spotify_preview_url)
    audioRef.current.volume = 0.7

    audioRef.current.onended = () => {
      setPlayingId(null)
      setProgress(0)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }

    audioRef.current.play()
    setPlayingId(song.id)

    progressIntervalRef.current = setInterval(() => {
      if (audioRef.current) {
        const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100
        setProgress(percent)
      }
    }, 100)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '18px', color: '#C4AA87', fontStyle: 'italic' }}>Loading your mixtape...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: playingId ? '120px' : '80px', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header — restyled Aug 11 2026 to match the app's actual palette
          (Cormorant Garamond / DM Sans / cream, same tokens as /dates)
          instead of the leftover dark Spotify-green look this page shipped
          with before the design refresh. Back button now goes to /dashboard
          — Flirt isn't its own page, it's the FlirtCard component embedded
          there, so the old /flirts target was a dead link. */}
      <div style={{ background: '#FAF6F0', padding: '52px 24px 28px', borderBottom: '1px solid #EDE4D8' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ fontSize: '12px', color: '#8B7355', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #8B4A2A 0%, #C4714A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(139,74,42,0.25)' }}>
            <span style={{ fontSize: '28px' }}>🎵</span>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4AA87', margin: 0, marginBottom: '2px' }}>Playlist</p>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '38px', fontWeight: 300, color: '#1C1410', letterSpacing: '-0.02em', lineHeight: 1 }}>Our Mixtape</div>
            <p style={{ fontSize: '13px', color: '#8B7355', margin: 0, marginTop: '6px' }}>
              {songs.length} song{songs.length !== 1 ? 's' : ''} · You &amp; {partnerName}
            </p>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>
        {songs.length > 0 ? (
          <div>
            {songs.map((song, index) => {
              const isFromMe = song.sender_id === user?.id
              const senderLabel = isFromMe ? 'You' : partnerName
              const isPlaying = playingId === song.id

              return (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 8px',
                    borderRadius: '12px',
                    background: isPlaying ? 'rgba(196,113,74,0.08)' : 'transparent',
                    marginBottom: '2px',
                  }}
                >
                  {/* Track Number / Play Button */}
                  <div style={{ width: '24px', textAlign: 'center', flexShrink: 0 }}>
                    {song.spotify_preview_url ? (
                      <button
                        onClick={() => togglePlay(song)}
                        style={{ width: '24px', height: '24px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isPlaying ? (
                          <svg width="16" height="16" fill="#C4714A" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg width="16" height="16" fill="#8B7355" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                    ) : (
                      <span style={{ color: '#D9CBBA', fontSize: '13px' }}>{index + 1}</span>
                    )}
                  </div>

                  {/* Album Art */}
                  <div style={{ width: '44px', height: '44px', flexShrink: 0, position: 'relative' }}>
                    {song.spotify_album_art ? (
                      <img
                        src={song.spotify_album_art}
                        alt="Album art"
                        style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', borderRadius: '8px', background: '#F0E6D8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '16px' }}>🎵</span>
                      </div>
                    )}

                    {isPlaying && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(0,0,0,0.15)', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: '#C4714A', transition: 'width 0.1s linear' }} />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: isPlaying ? '#C4714A' : '#1C1410', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song.spotify_track_name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#8B7355', margin: 0, marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song.spotify_artist}
                    </p>
                  </div>

                  {/* Sent By */}
                  <div style={{ fontSize: '12px', color: '#C4AA87', flexShrink: 0, display: 'none' }} className="mixtape-sender">
                    {senderLabel}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '11px', color: '#D9CBBA', flexShrink: 0, width: '76px', textAlign: 'right', display: 'none' }} className="mixtape-date">
                    {formatDate(song.created_at)}
                  </div>

                  {/* Spotify Link */}
                  {song.spotify_track_url && (
                    <a
                      href={song.spotify_track_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#D9CBBA', flexShrink: 0, display: 'flex' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}

                  {/* Delete — either partner can remove a song, shared
                      curated list not a private inbox. Matt's ask, Aug 11
                      2026: a duplicate from his own testing with no way to
                      remove it. */}
                  <button
                    onClick={() => handleDeleteSong(song.id)}
                    disabled={deletingId === song.id}
                    aria-label="Remove song"
                    style={{ color: '#D9CBBA', flexShrink: 0, display: 'flex', background: 'none', border: 'none', cursor: deletingId === song.id ? 'default' : 'pointer', padding: 0, opacity: deletingId === song.id ? 0.4 : 1 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ background: 'rgba(250,246,240,0.7)', border: '1px dashed #D9CBBA', borderRadius: '18px', padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎧</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '22px', color: '#C4AA87', marginBottom: '8px' }}>No songs yet</div>
            <p style={{ fontSize: '13px', color: '#8B7355', marginBottom: '20px' }}>
              Start sharing songs with {partnerName} to build your mixtape
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ fontSize: '12px', fontWeight: 500, color: '#FAF6F0', background: '#1C1410', border: 'none', padding: '10px 24px', borderRadius: '24px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.04em' }}
            >
              Send a Song
            </button>
          </div>
        )}
      </div>

      {/* Now Playing Bar */}
      {playingId && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFDF9', borderTop: '1px solid #EDE4D8', padding: '12px 16px', boxShadow: '0 -4px 14px rgba(28,20,16,0.06)' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {(() => {
              const currentSong = songs.find(s => s.id === playingId)
              if (!currentSong) return null

              return (
                <>
                  <img
                    src={currentSong.spotify_album_art}
                    alt="Album art"
                    style={{ width: '44px', height: '44px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(28,20,16,0.15)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#1C1410', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.spotify_track_name}</p>
                    <p style={{ fontSize: '12px', color: '#8B7355', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentSong.spotify_artist}</p>
                  </div>
                  <button
                    onClick={() => togglePlay(currentSong)}
                    style={{ width: '36px', height: '36px', background: '#C4714A', borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .mixtape-sender, .mixtape-date { display: block !important; }
        }
      `}</style>
    </div>
  )
}
