'use client'

import { useState, useRef } from 'react'

export default function SongFlirtCard({
  flirt,
  isFromMe,
  senderName,
  onReact,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)
  const progressIntervalRef = useRef(null)

  const togglePlay = () => {
    if (!flirt.spotify_preview_url) return

    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(flirt.spotify_preview_url)
        audioRef.current.volume = 0.7

        audioRef.current.onended = () => {
          setIsPlaying(false)
          setProgress(0)
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
          }
        }
      }

      audioRef.current.currentTime = 0
      audioRef.current.play()
      setIsPlaying(true)

      // Update progress bar
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100
          setProgress(percent)
        }
      }, 100)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isFromMe ? 'order-1' : ''}`}>
        {/* Sender Name */}
        {!isFromMe && (
          <p className="text-xs text-gray-500 mb-1 ml-1">{senderName}</p>
        )}

        {/* Song Card */}
        <div
          className={`rounded-2xl overflow-hidden shadow-md ${
            isFromMe
              ? 'bg-gradient-to-br from-pink-500 to-rose-500'
              : 'bg-gradient-to-br from-gray-800 to-gray-900'
          }`}
        >
          {/* Album Art & Info */}
          <div className="p-4">
            <div className="flex gap-3">
              {/* Album Art with Play Button */}
              <div className="relative w-16 h-16 flex-shrink-0">
                {flirt.spotify_album_art ? (
                  <img
                    src={flirt.spotify_album_art}
                    alt="Album art"
                    className="w-full h-full rounded-lg object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-full h-full rounded-lg bg-gray-700 flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                )}

                {/* Play Button Overlay */}
                {flirt.spotify_preview_url && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg hover:bg-black/50 transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    )}
                  </button>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0 text-white">
                <p className="font-bold truncate">{flirt.spotify_track_name}</p>
                <p className={`text-sm truncate ${isFromMe ? 'text-pink-100' : 'text-gray-400'}`}>
                  {flirt.spotify_artist}
                </p>

                {/* Open in Spotify */}
                {flirt.spotify_track_url && (
                  <a
                    href={flirt.spotify_track_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-xs mt-1 ${
                      isFromMe ? 'text-pink-200 hover:text-white' : 'text-[#1DB954] hover:text-[#1ed760]'
                    } transition-colors`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Open in Spotify
                  </a>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {isPlaying && (
              <div className="mt-3 h-1 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Message (if any) */}
          {flirt.message && (
            <div className={`px-4 pb-4 ${isFromMe ? 'text-white' : 'text-gray-300'}`}>
              <p className="text-sm italic">"{flirt.message}"</p>
            </div>
          )}
        </div>

        {/* Timestamp & Reactions */}
        <div className={`flex items-center gap-2 mt-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-400">{formatTime(flirt.created_at)}</span>

          {/* Heart Reaction */}
          {flirt.reaction && (
            <span className="text-sm">{flirt.reaction}</span>
          )}

          {/* React Button (only for received flirts) */}
          {!isFromMe && !flirt.reaction && onReact && (
            <button
              onClick={() => onReact(flirt.id, '❤️')}
              className="text-gray-400 hover:text-pink-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
