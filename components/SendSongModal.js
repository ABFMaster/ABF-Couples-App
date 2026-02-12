'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
  const [message, setMessage] = useState('')
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
      setMessage('')
      setError('')
      stopPreview()
    }
  }, [isOpen])

  useEffect(() => {
    // Debounced search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTracks(searchQuery)
      }, 300)
    } else {
      setTracks([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
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
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 400) {
          setError('Please connect your Spotify account first')
        } else {
          setError('Search failed. Please try again.')
        }
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

    if (playingPreview === track.id) {
      stopPreview()
      return
    }

    stopPreview()
    setPlayingPreview(track.id)

    audioRef.current = new Audio(track.previewUrl)
    audioRef.current.volume = 0.5
    audioRef.current.play()
    audioRef.current.onended = () => setPlayingPreview(null)
  }

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingPreview(null)
  }

  const handleSelectTrack = (track) => {
    stopPreview()
    setSelectedTrack(track)
  }

  const handleBack = () => {
    setSelectedTrack(null)
    setMessage('')
  }

  const handleSend = async () => {
    if (!selectedTrack) return

    setSending(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error: insertError } = await supabase
        .from('flirts')
        .insert({
          couple_id: coupleId,
          sender_id: user.id,
          receiver_id: partnerId,
          type: 'song',
          message: message.trim() || null,
          spotify_track_id: selectedTrack.id,
          spotify_track_name: selectedTrack.name,
          spotify_artist: selectedTrack.artist,
          spotify_album_art: selectedTrack.albumArt,
          spotify_preview_url: selectedTrack.previewUrl,
          spotify_track_url: selectedTrack.spotifyUrl,
        })

      if (insertError) {
        console.error('Error sending song:', insertError)
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

  const handleClose = () => {
    stopPreview()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:w-[500px] md:max-h-[90vh] max-h-[85vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slideUp flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎵</span>
              <div>
                <h2 className="text-xl font-bold">
                  {selectedTrack ? 'Send Song' : 'Search Songs'}
                </h2>
                <p className="text-green-100 text-sm">
                  {selectedTrack ? `to ${partnerName}` : 'Find the perfect song'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedTrack ? (
            // Search View
            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for a song..."
                  className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none transition-colors"
                  autoFocus
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}

              {/* Search Results */}
              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(track)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {/* Album Art */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {track.albumArtSmall ? (
                        <img
                          src={track.albumArtSmall}
                          alt={track.album}
                          className="w-full h-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-xl">🎵</span>
                        </div>
                      )}

                      {/* Preview Play Button */}
                      {track.previewUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            playPreview(track)
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {playingPreview === track.id ? (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{track.name}</p>
                      <p className="text-sm text-gray-500 truncate">{track.artist}</p>
                    </div>

                    {/* Select Arrow */}
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}

                {searchQuery.length >= 2 && !searching && tracks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No songs found</p>
                    <p className="text-sm mt-1">Try a different search</p>
                  </div>
                )}

                {searchQuery.length < 2 && (
                  <div className="text-center py-8 text-gray-400">
                    <span className="text-4xl mb-2 block">🎧</span>
                    <p>Search for a song to send</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Selected Track View
            <div className="p-6">
              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to search
              </button>

              {/* Selected Track Display */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white mb-4">
                <div className="flex items-center gap-4">
                  {selectedTrack.albumArt ? (
                    <img
                      src={selectedTrack.albumArt}
                      alt={selectedTrack.album}
                      className="w-24 h-24 rounded-xl shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-700 flex items-center justify-center">
                      <span className="text-4xl">🎵</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{selectedTrack.name}</p>
                    <p className="text-gray-400 truncate">{selectedTrack.artist}</p>
                    <p className="text-gray-500 text-sm truncate">{selectedTrack.album}</p>

                    {/* Preview Button */}
                    {selectedTrack.previewUrl && (
                      <button
                        onClick={() => playPreview(selectedTrack)}
                        className="mt-2 flex items-center gap-2 text-[#1DB954] text-sm font-medium hover:text-[#1ed760]"
                      >
                        {playingPreview === selectedTrack.id ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                            </svg>
                            Pause Preview
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play Preview
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add a message <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="This song made me think of you..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none transition-colors resize-none"
                  maxLength={500}
                />
                <p className="text-right text-gray-400 text-xs mt-1">{message.length}/500</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-4">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTrack && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 bg-gradient-to-r from-[#1DB954] to-[#1ed760] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sending...
                </>
              ) : (
                <>
                  <span>🎵</span>
                  Send to {partnerName}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
