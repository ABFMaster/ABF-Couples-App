'use client'

import { useState } from 'react'

const MODE_DEFS = [
  {
    id: 'gif',
    label: 'GIF',
    desc: 'Perfect reaction',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M7 10v4M7 12h2.5"/><path d="M13 10v4h-1.5"/><path d="M17 10h2v2h-2v2h2"/>
      </svg>
    ),
  },
  {
    id: 'song',
    label: 'Song',
    desc: 'Set the mood',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    ),
  },
  {
    id: 'movie_show',
    label: 'Movie / Show',
    desc: 'Watch together',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2"/>
        <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/>
        <line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'prompt',
    label: 'Prompt',
    desc: 'Start something',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
]

function formatModeLabel(mode) {
  if (!mode) return ''
  return mode === 'movie_show' ? 'MOVIE / SHOW' : mode.toUpperCase()
}

export default function FlirtSheet({ isOpen, onClose, partnerName, partnerId, userId }) {
  const [view, setView] = useState('modes') // 'modes' | 'loading' | 'result'
  const [selectedMode, setSelectedMode] = useState(null)
  const [flirt, setFlirt] = useState(null)
  const [error, setError] = useState(false)
  const [sending, setSending] = useState(false)

  const generate = async (mode, previousSuggestion) => {
    setSelectedMode(mode)
    setView('loading')
    setError(false)
    try {
      const res = await fetch('/api/flirts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerId, userId, mode, previousSuggestion: previousSuggestion || null }),
      })
      const data = await res.json()
      if (data.flirt) {
        setFlirt(data.flirt)
        setView('result')
      } else {
        setError(true)
        setView('result')
      }
    } catch {
      setError(true)
      setView('result')
    }
  }

  const handleClose = () => {
    setView('modes')
    setSelectedMode(null)
    setFlirt(null)
    setError(false)
    onClose()
  }

  const sendFlirt = async () => {
    setSending(true)
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: partnerId, title: "You've got a flirt 💌", body: "Open ABF to see what they sent you", url: "/flirts/inbox" }),
      })
      await fetch('/api/flirts/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flirtId: flirt.id, userId }),
      })
    } finally {
      setSending(false)
      handleClose()
    }
  }

  const handleBack = () => {
    setView('modes')
    setFlirt(null)
    setError(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-lg transition-transform duration-300 ease-out h-auto overflow-y-auto ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-200" />
        </div>

        {/* Close button */}
        <div className="absolute top-3 right-4">
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-24 pt-2 max-h-[85vh] overflow-y-auto">

          {/* MODE SELECTION */}
          {view === 'modes' && (
            <>
              <div className="mb-6 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#F2A090]" />
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
                </div>
                <h2
                  className="text-[22px] text-neutral-900 leading-snug"
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                >
                  Send {partnerName} something
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {MODE_DEFS.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => generate(mode.id)}
                    className="bg-neutral-50 hover:bg-[#FEF3F1] border border-neutral-200 hover:border-[#F5C9C2] rounded-2xl p-4 flex flex-col items-start gap-2.5 text-left active:scale-[0.97] transition-all"
                  >
                    <span className="text-[#E8614D]">{mode.icon}</span>
                    <div>
                      <p className="text-[14px] font-semibold text-neutral-900">{mode.label}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{mode.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Photo — coming soon */}
              <button
                disabled
                className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex items-center gap-3 opacity-40 cursor-not-allowed"
              >
                <span className="text-neutral-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-semibold text-neutral-900">Photo</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Coming soon</p>
                </div>
              </button>
            </>
          )}

          {/* LOADING */}
          {view === 'loading' && (
            <div className="flex flex-col items-center py-14 gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[13px] text-neutral-400">Nora is thinking…</p>
            </div>
          )}

          {/* RESULT */}
          {view === 'result' && !flirt && !error && (
            <div className="flex flex-col items-center py-14 gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2.5 h-2.5 bg-[#E8614D] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-[13px] text-neutral-400">Nora is thinking…</p>
            </div>
          )}
          {view === 'result' && (flirt || error) && (
            <>
              {/* Back */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 mb-5 mt-1 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>

              {error ? (
                <div className="flex flex-col items-center py-8 gap-4">
                  <p className="text-[14px] text-neutral-500">Something went wrong.</p>
                  <button
                    onClick={() => generate(selectedMode)}
                    className="px-5 py-2 bg-[#E8614D] text-white text-[13px] font-semibold rounded-full"
                  >
                    Try again
                  </button>
                </div>
              ) : flirt ? (
                <>
                  {/* Mode badge */}
                  <div className="mb-4">
                    <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#E8614D]">
                      {formatModeLabel(flirt.mode)}
                    </span>
                  </div>

                  {/* GIF */}
                  {flirt.mode === 'gif' && flirt.gif_url && (
                    <div className="flex justify-center mb-4">
                      <div style={{width:'100px', height:'100px', borderRadius:'8px', overflow:'hidden', flexShrink:0}}>
                        <img src={flirt.gif_url} alt={flirt.suggestion} style={{width:'100px', height:'100px', objectFit:'cover', display:'block'}} />
                      </div>
                    </div>
                  )}

                  {/* Song */}
                  {flirt.mode === 'song' && flirt.spotify_album_art && (
                    <div className="flex items-center gap-3 mb-4 bg-neutral-50 rounded-xl p-3">
                      <img
                        src={flirt.spotify_album_art}
                        alt={flirt.spotify_track_name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-neutral-900 truncate">{flirt.spotify_track_name}</p>
                        <p className="text-[12px] text-neutral-500 truncate">{flirt.spotify_artist}</p>
                        {flirt.spotify_track_url && (
                          <a
                            href={flirt.spotify_track_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold mt-0.5 inline-block"
                            style={{ color: '#1DB954' }}
                          >
                            Open in Spotify →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Movie / Show */}
                  {(flirt.mode === 'movie' || flirt.mode === 'show' || flirt.mode === 'movie_show') && flirt.media_poster && flirt.media_poster !== 'N/A' && (
                    <div className="flex items-start gap-3 mb-4 bg-neutral-50 rounded-xl p-3">
                      <img
                        src={flirt.media_poster}
                        alt={flirt.media_title}
                        className="w-14 h-20 rounded-lg object-cover flex-shrink-0"
                      />
                      <div>
                        <p className="text-[14px] font-semibold text-neutral-900">{flirt.media_title}</p>
                        {flirt.media_year && (
                          <p className="text-[12px] text-neutral-500 mt-0.5">{flirt.media_year}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggestion */}
                  <p
                    className="text-[20px] text-neutral-900 leading-snug mb-3 text-center"
                    style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                  >
                    {flirt.suggestion}
                  </p>

                  {/* Nora's note */}
                  {flirt.nora_note && (
                    <p className="text-[13px] text-neutral-400 italic leading-relaxed mb-6 text-center">
                      {flirt.nora_note}
                    </p>
                  )}

                  {/* Actions */}
                  <button
                    onClick={sendFlirt}
                    disabled={sending}
                    className="w-full py-3 bg-[#E8614D] text-white text-[15px] font-semibold rounded-full mb-3 active:scale-[0.98] transition-transform disabled:opacity-60"
                  >
                    {sending ? 'Sending...' : 'Send it'}
                  </button>
                  <div className="text-center">
                    <button
                      onClick={() => generate(selectedMode, flirt.suggestion)}
                      className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      Get another
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}

        </div>
      </div>
    </>
  )
}
