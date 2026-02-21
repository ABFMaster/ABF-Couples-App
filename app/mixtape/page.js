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
    const { data, error } = await supabase
      .from('flirts')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('type', 'song')
      .not('spotify_track_id', 'is', null)
      .order('created_at', { ascending: false })

    if (!error) {
      setSongs(data || [])
    }
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1DB954] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#1DB954] text-lg">Loading your mixtape...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1DB954]/20 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push('/flirts')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Flirts</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1DB954] to-[#1ed760] rounded-xl flex items-center justify-center shadow-2xl">
              <span className="text-4xl">🎵</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm uppercase tracking-wider">Playlist</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Our Mixtape</h1>
              <p className="text-gray-400 mt-1">
                {songs.length} song{songs.length !== 1 ? 's' : ''} • You & {partnerName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <p className="text-white font-medium">Premium Features Coming Soon</p>
              <p className="text-gray-400 text-sm">
                Collaborative playlists, Spotify export, and more!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {songs.length > 0 ? (
          <div className="space-y-2">
            {songs.map((song, index) => {
              const isFromMe = song.sender_id === user?.id
              const senderLabel = isFromMe ? 'You' : partnerName

              return (
                <div
                  key={song.id}
                  className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors ${
                    playingId === song.id ? 'bg-white/10' : ''
                  }`}
                >
                  {/* Track Number / Play Button */}
                  <div className="w-8 text-center flex-shrink-0">
                    {song.spotify_preview_url ? (
                      <button
                        onClick={() => togglePlay(song)}
                        className="w-8 h-8 flex items-center justify-center"
                      >
                        {playingId === song.id ? (
                          <svg className="w-5 h-5 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <>
                            <span className="text-gray-400 group-hover:hidden">{index + 1}</span>
                            <svg className="w-5 h-5 text-white hidden group-hover:block" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-gray-500">{index + 1}</span>
                    )}
                  </div>

                  {/* Album Art */}
                  <div className="w-12 h-12 flex-shrink-0 relative">
                    {song.spotify_album_art ? (
                      <img
                        src={song.spotify_album_art}
                        alt="Album art"
                        className="w-full h-full rounded object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded bg-gray-700 flex items-center justify-center">
                        <span className="text-xl">🎵</span>
                      </div>
                    )}

                    {/* Playing Indicator */}
                    {playingId === song.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b overflow-hidden">
                        <div
                          className="h-full bg-[#1DB954] transition-all duration-100"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      playingId === song.id ? 'text-[#1DB954]' : 'text-white'
                    }`}>
                      {song.spotify_track_name}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {song.spotify_artist}
                    </p>
                  </div>

                  {/* Sent By */}
                  <div className="hidden md:block text-gray-400 text-sm">
                    {senderLabel}
                  </div>

                  {/* Date */}
                  <div className="hidden md:block text-gray-500 text-sm w-24 text-right">
                    {formatDate(song.created_at)}
                  </div>

                  {/* Spotify Link */}
                  {song.spotify_track_url && (
                    <a
                      href={song.spotify_track_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-[#1DB954] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎧</div>
            <h2 className="text-2xl font-bold text-white mb-2">No songs yet</h2>
            <p className="text-gray-400 mb-6">
              Start sharing songs with {partnerName} to build your mixtape
            </p>
            <button
              onClick={() => router.push('/flirts')}
              className="bg-[#1DB954] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#1ed760] transition-colors"
            >
              Send a Song
            </button>
          </div>
        )}
      </div>

      {/* Now Playing Bar (when playing) */}
      {playingId && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-gray-900 border-t border-gray-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {(() => {
              const currentSong = songs.find(s => s.id === playingId)
              if (!currentSong) return null

              return (
                <>
                  <img
                    src={currentSong.spotify_album_art}
                    alt="Album art"
                    className="w-14 h-14 rounded shadow-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{currentSong.spotify_track_name}</p>
                    <p className="text-gray-400 text-sm truncate">{currentSong.spotify_artist}</p>
                  </div>
                  <button
                    onClick={() => togglePlay(currentSong)}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
