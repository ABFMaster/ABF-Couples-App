'use client'
import { useState, useEffect, useRef } from 'react'

export default function FlirtCard({ userId, coupleId, partnerId, partnerName, userName, session }) {
  const [unopened, setUnopened] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home') // home | drop | stack | sent
  const [dropType, setDropType] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reacting, setReacting] = useState(false)
  const [spotifyQuery, setSpotifyQuery] = useState('')
  const [spotifyResults, setSpotifyResults] = useState([])
  const [spotifySearching, setSpotifySearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const fileInputRef = useRef(null)
  const spotifyTimeout = useRef(null)

  const fetchInbox = async () => {
    if (!session || !coupleId) return
    try {
      const res = await fetch(`/api/flirts/inbox?coupleId=${coupleId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      setUnopened(data.unopened || [])
      setSent(data.sent || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchInbox() }, [session, coupleId])

  const current = view === 'stack' ? unopened[currentIndex] : null

  useEffect(() => {
    if (view === 'stack' && current && !current.opened_at) {
      handleOpen(current)
    }
  }, [view, currentIndex, unopened.length])

  const handleSend = async () => {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/flirts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId,
          receiverId: partnerId,
          type: dropType,
          content,
          metadata: dropType === 'song' && selectedTrack ? {
            track_name: selectedTrack.name,
            artist: selectedTrack.artist,
            album_art: selectedTrack.albumArt,
            preview_url: selectedTrack.previewUrl,
            track_url: selectedTrack.spotifyUrl
          } : undefined
        })
      })
      setContent('')
      setDropType(null)
      setView('home')
      setSelectedTrack(null)
      setSpotifyQuery('')
      setSpotifyResults([])
      await fetchInbox()
    } catch {}
    setSending(false)
  }

  const handleOpen = async (flirt) => {
    if (flirt.opened_at) return
    try {
      await fetch('/api/flirts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ flirtId: flirt.id })
      })
      setUnopened(prev => prev.map(f => f.id === flirt.id ? { ...f, opened_at: new Date().toISOString() } : f))
    } catch {}
  }

  const handleReact = async (flirt, reaction) => {
    if (reacting || flirt.reaction) return
    setReacting(true)
    try {
      await fetch('/api/flirts/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ flirtId: flirt.id, reaction })
      })
      setUnopened(prev => prev.map(f => f.id === flirt.id ? { ...f, reaction, reacted_at: new Date().toISOString() } : f))
    } catch {}
    setReacting(false)
  }

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const renderFlirtContent = (flirt) => {
    switch (flirt.type) {
      case 'word':
        return (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: '#1A1A1A', margin: 0, lineHeight: 1.3 }}>{flirt.content}</p>
          </div>
        )
      case 'memory':
        return (
          <div style={{ padding: '24px 20px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#1A1A1A', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{flirt.content}"</p>
          </div>
        )
      case 'song':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px' }}>
            {flirt.metadata?.album_art && (
              <img src={flirt.metadata.album_art} style={{ width: 64, height: 64, borderRadius: 8, flexShrink: 0 }} alt="album art" />
            )}
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>{flirt.metadata?.track_name || flirt.content}</p>
              <p style={{ fontSize: 13, color: '#6B6560', margin: 0 }}>{flirt.metadata?.artist}</p>
              {flirt.metadata?.track_url && (
                <a href={flirt.metadata.track_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#C4694F', textDecoration: 'none', display: 'block', marginTop: 6 }}>Open in Spotify →</a>
              )}
            </div>
          </div>
        )
      case 'gif':
        return (
          <img src={flirt.content} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block', borderRadius: 0 }} alt="GIF" />
        )
      case 'photo':
        return (
          <img src={flirt.content} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} alt="flirt photo" />
        )
      case 'found':
        return (
          <a href={flirt.content} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '16px 18px' }}>
            {flirt.metadata?.image && (
              <img src={flirt.metadata.image} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} alt="preview" />
            )}
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px', lineHeight: 1.4 }}>{flirt.metadata?.title || flirt.content}</p>
            {flirt.metadata?.description && <p style={{ fontSize: 12, color: '#6B6560', margin: '0 0 6px', lineHeight: 1.4 }}>{flirt.metadata.description}</p>}
            <p style={{ fontSize: 11, color: '#B0A8A0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{flirt.metadata?.domain}</p>
          </a>
        )
      default:
        return <p style={{ padding: '20px', color: '#1A1A1A' }}>{flirt.content}</p>
    }
  }

  if (loading) return null

  // HOME STATE
  if (view === 'home') {
    const unseenCount = unopened.filter(f => !f.opened_at).length
    const hasUnseen = unseenCount > 0

    return (
      <div style={{ margin: '0 0 16px' }}>
        <style>{`
          @keyframes sealPulse {
            0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
            50% { opacity: 0.7; transform: translateX(-50%) scale(1.2); }
          }
          @keyframes envelopeFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
          }
        `}</style>

        <div
          onClick={() => hasUnseen ? setView('stack') : setView('drop')}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#C9A96E', textTransform: 'uppercase' }}>
            {hasUnseen ? `From ${partnerName}` : `Flirt with ${partnerName}`}
          </span>

          <div style={{ width: '100%', position: 'relative' }}>
            <div style={{ position: 'relative', animation: hasUnseen ? 'envelopeFloat 3s ease-in-out infinite' : 'none' }}>

              {/* Stack layers */}
              {unseenCount > 2 && (
                <svg width="100%" height="140" style={{ position: 'absolute', top: -10, left: 6, zIndex: 0 }} viewBox="0 0 320 140">
                  <rect x="0" y="0" width="320" height="140" rx="8" fill="#E8DDD0" stroke="#D4C8B8" strokeWidth="0.5"/>
                </svg>
              )}
              {unseenCount > 1 && (
                <svg width="100%" height="140" style={{ position: 'absolute', top: -5, left: 3, zIndex: 1 }} viewBox="0 0 320 140">
                  <rect x="0" y="0" width="320" height="140" rx="8" fill="#EDE4D8" stroke="#D8CCBA" strokeWidth="0.5"/>
                </svg>
              )}

              {/* Main envelope SVG */}
              <svg width="100%" height="140" viewBox="0 0 320 140" style={{ position: 'relative', zIndex: 2, display: 'block' }}>
                {/* Envelope body */}
                <rect x="0" y="0" width="320" height="140" rx="8" fill={hasUnseen ? "#FDF8F2" : "#FAFAF8"} stroke={hasUnseen ? "#D4C4A8" : "#E8E0D8"} strokeWidth="0.5"/>

                {/* Bottom left fold */}
                <path d="M 0 140 L 0 55 L 152 100 Z" fill="#EDE8DE" stroke="#E0D8CC" strokeWidth="0.5"/>

                {/* Bottom right fold */}
                <path d="M 320 140 L 320 55 L 168 100 Z" fill="#EDE8DE" stroke="#E0D8CC" strokeWidth="0.5"/>

                {/* Bottom center fold line */}
                <path d="M 0 140 L 160 95 L 320 140" fill="none" stroke="#D8D0C4" strokeWidth="0.5"/>

                {hasUnseen ? (
                  /* Sealed flap — pointing down */
                  <path d="M 0 0 L 320 0 L 160 78 Z" fill="#EDE0C8" stroke="#D4C4A8" strokeWidth="0.5"/>
                ) : (
                  /* Open flap — pointing up, rotated */
                  <path d="M 0 0 L 320 0 L 160 65 Z" fill="#F0EBE0" stroke="#E0D4C0" strokeWidth="0.5" transform="rotate(180 160 34)"/>
                )}

                {/* Empty state text */}
                {!hasUnseen && (
                  <>
                    <text x="160" y="82" textAnchor="middle" fill="#C0B8B0" fontSize="12" fontFamily="Georgia, serif" fontStyle="italic">leave something</text>
                    <text x="160" y="100" textAnchor="middle" fill="#C0B8B0" fontSize="12" fontFamily="Georgia, serif" fontStyle="italic">for {partnerName}...</text>
                  </>
                )}
              </svg>

              {/* Wax seal */}
              <div style={{
                position: 'absolute',
                top: hasUnseen ? 64 : 'auto',
                bottom: hasUnseen ? 'auto' : 30,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#C9A96E',
                zIndex: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                animation: hasUnseen ? 'sealPulse 2.5s ease-in-out infinite' : 'none'
              }}>
                {unseenCount > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#C4694F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'white'
                  }}>{unseenCount}</div>
                )}
              </div>
            </div>
          </div>

          {!hasUnseen && sent.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setView('sent') }}
              style={{ background: 'none', border: 'none', fontSize: 11, color: '#B0A8A0', cursor: 'pointer', padding: 0, letterSpacing: '0.04em' }}
            >view sent →</button>
          )}
        </div>
      </div>
    )
  }

  // DROP SHEET
  if (view === 'drop') {
    const types = [
      { key: 'gif', label: 'GIF', placeholder: 'Search for a GIF...' },
      { key: 'song', label: 'Song', placeholder: 'Paste a Spotify link...' },
      { key: 'word', label: 'Word', placeholder: `One word for ${partnerName}...`, maxLength: 20 },
      { key: 'photo', label: 'Photo', placeholder: null },
      { key: 'memory', label: 'Memory', placeholder: 'Something worth remembering...', maxLength: 120 },
      { key: 'found', label: 'Found', placeholder: 'Paste a URL...' },
    ]
    const selected = types.find(t => t.key === dropType)

    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid #E8E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Flirt with {partnerName}</span>
          </div>
          <button onClick={() => { setView('home'); setDropType(null); setContent(''); setSelectedTrack(null); setSpotifyQuery(''); setSpotifyResults([]) }} style={{ background: 'none', border: 'none', fontSize: 20, color: '#B0A8A0', cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {!dropType && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#E8E0D8' }}>
            {types.map((t, index) => (
              <button
                key={t.key}
                onClick={() => setDropType(t.key)}
                style={{
                  padding: '20px 16px',
                  background: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 15,
                  color: '#1A1A1A',
                  fontFamily: 'Georgia, serif',
                  gridColumn: index === types.length - 1 && types.length % 2 !== 0 ? '1 / -1' : undefined
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {dropType === 'song' && (
          <div style={{ padding: '16px 18px' }}>
            <button onClick={() => { setDropType(null); setContent(''); setSpotifyResults([]); setSelectedTrack(null) }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#B0A8A0', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}>← Song</button>

            {!selectedTrack ? (
              <div>
                <input
                  value={spotifyQuery}
                  onChange={e => {
                    setSpotifyQuery(e.target.value)
                    clearTimeout(spotifyTimeout.current)
                    if (e.target.value.length > 2) {
                      setSpotifySearching(true)
                      spotifyTimeout.current = setTimeout(async () => {
                        try {
                          const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(e.target.value)}`, {
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                          })
                          const data = await res.json()
                          setSpotifyResults(data.tracks || [])
                        } catch {}
                        setSpotifySearching(false)
                      }, 400)
                    } else {
                      setSpotifyResults([])
                      setSpotifySearching(false)
                    }
                  }}
                  placeholder="Search for a song..."
                  style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.5px solid #E8E0D8', fontSize: 15, background: 'transparent', outline: 'none', boxSizing: 'border-box', color: '#1A1A1A' }}
                  autoFocus
                />
                {spotifySearching && <p style={{ fontSize: 12, color: '#B0A8A0', marginTop: 8 }}>Searching...</p>}
                {spotifyResults.length > 0 && (
                  <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto' }}>
                    {spotifyResults.slice(0, 6).map(track => (
                      <div
                        key={track.id}
                        onClick={() => {
                          setSelectedTrack(track)
                          setContent(track.spotifyUrl)
                          setSpotifyResults([])
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #F0EAE2', cursor: 'pointer' }}
                      >
                        {track.albumArtSmall && <img src={track.albumArtSmall} style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }} alt="" />}
                        <div>
                          <p style={{ fontSize: 14, color: '#1A1A1A', margin: '0 0 2px', fontWeight: 500 }}>{track.name}</p>
                          <p style={{ fontSize: 12, color: '#6B6560', margin: 0 }}>{track.artist}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid #E8E0D8', marginBottom: 16 }}>
                  {selectedTrack.albumArt && <img src={selectedTrack.albumArt} style={{ width: 52, height: 52, borderRadius: 6, flexShrink: 0 }} alt="" />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', margin: '0 0 3px' }}>{selectedTrack.name}</p>
                    <p style={{ fontSize: 13, color: '#6B6560', margin: 0 }}>{selectedTrack.artist}</p>
                  </div>
                  <button onClick={() => { setSelectedTrack(null); setContent(''); setSpotifyQuery('') }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#B0A8A0', cursor: 'pointer' }}>Change</button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSend} disabled={sending} style={{ background: '#C4694F', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{sending ? 'Dropping...' : 'Drop it'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {dropType === 'gif' && (
          <div style={{ padding: '16px 18px' }}>
            <button onClick={() => { setDropType(null); setContent('') }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#B0A8A0', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}>← GIF</button>
            <input
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste a GIPHY or Tenor link..."
              style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.5px solid #E8E0D8', fontSize: 15, background: 'transparent', outline: 'none', boxSizing: 'border-box', color: '#1A1A1A' }}
              autoFocus
            />
            {content && content.includes('giphy') || content && content.includes('tenor') ? (
              <div style={{ marginTop: 12 }}>
                <img src={content} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} alt="GIF preview" onError={() => {}} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button onClick={handleSend} disabled={!content.trim() || sending} style={{ background: '#C4694F', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{sending ? 'Dropping...' : 'Drop it'}</button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {dropType && dropType !== 'photo' && dropType !== 'song' && dropType !== 'gif' && (
          <div style={{ padding: '16px 18px' }}>
            <button onClick={() => { setDropType(null); setContent('') }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#B0A8A0', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}>← {selected?.label}</button>
            {dropType === 'word' ? (
              <input
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={selected?.placeholder}
                maxLength={selected?.maxLength}
                style={{ width: '100%', padding: '12px 0', border: 'none', borderBottom: '0.5px solid #E8E0D8', fontSize: 28, fontFamily: 'Georgia, serif', color: '#1A1A1A', background: 'transparent', outline: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={selected?.placeholder}
                maxLength={selected?.maxLength}
                rows={dropType === 'memory' ? 3 : 2}
                style={{ width: '100%', padding: '10px 0', border: 'none', borderBottom: '0.5px solid #E8E0D8', fontSize: 15, fontFamily: dropType === 'memory' ? 'Georgia, serif' : 'system-ui', color: '#1A1A1A', background: 'transparent', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                autoFocus
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={handleSend}
                disabled={!content.trim() || sending}
                style={{ background: content.trim() ? '#C4694F' : '#E8E0D8', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: content.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}
              >{sending ? 'Dropping...' : `Drop it`}</button>
            </div>
          </div>
        )}

        {dropType === 'photo' && (
          <div style={{ padding: '16px 18px' }}>
            <button onClick={() => setDropType(null)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#B0A8A0', cursor: 'pointer', padding: '0 0 12px', display: 'block' }}>← Photo</button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const { createClient } = await import('@supabase/supabase-js')
                const sb = createClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                  { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
                )
                const path = `flirts/${userId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
                const { data, error } = await sb.storage.from('photos').upload(path, file, { upsert: true })
                if (error) { console.error('Upload error:', error); return }
                const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
                setContent(urlData.publicUrl)
              } catch (err) {
                console.error('Photo upload error:', err)
              }
            }} />
            {!content ? (
              <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '32px', border: '0.5px dashed #E8E0D8', borderRadius: 10, background: '#FFF8F4', cursor: 'pointer', fontSize: 14, color: '#B0A8A0' }}>
                Tap to choose a photo
              </button>
            ) : (
              <div>
                <img src={content} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10 }} alt="preview" />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <button onClick={() => setContent('')} style={{ background: 'none', border: 'none', fontSize: 13, color: '#B0A8A0', cursor: 'pointer' }}>Change</button>
                  <button onClick={handleSend} disabled={sending} style={{ background: '#C4694F', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{sending ? 'Dropping...' : 'Drop it'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // STACK VIEW — receiver seeing flirts
  if (view === 'stack') {
    const allFlirts = unopened
    if (!current) return null

    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E8E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>
              From {partnerName} {allFlirts.length > 1 ? `· ${currentIndex + 1} of ${allFlirts.length}` : ''}
            </span>
          </div>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', fontSize: 20, color: '#B0A8A0', cursor: 'pointer', padding: 0 }}>×</button>
        </div>

        {renderFlirtContent(current)}

        <div style={{ padding: '12px 18px', borderTop: '0.5px solid #E8E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#B0A8A0' }}>{formatTimeAgo(current.created_at)}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {allFlirts.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {currentIndex > 0 && <button onClick={() => setCurrentIndex(i => i - 1)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#B0A8A0', cursor: 'pointer' }}>← prev</button>}
                {currentIndex < allFlirts.length - 1 && <button onClick={() => setCurrentIndex(i => i + 1)} style={{ background: 'none', border: 'none', fontSize: 13, color: '#B0A8A0', cursor: 'pointer' }}>next →</button>}
              </div>
            )}
            {/* Gold dot reaction */}
            <button
              onClick={() => !current.reaction && handleReact(current, 'seen')}
              onDoubleClick={() => !current.reaction && handleReact(current, 'felt')}
              onContextMenu={e => { e.preventDefault(); !current.reaction && handleReact(current, 'needed') }}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: current.reaction ? '#C9A96E' : 'transparent',
                border: `2px solid ${current.reaction ? '#C9A96E' : '#E8E0D8'}`,
                cursor: current.reaction ? 'default' : 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title={current.reaction ? current.reaction : 'tap to react'}
            />
          </div>
        </div>
      </div>
    )
  }

  // SENT VIEW
  if (view === 'sent') {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid #E8E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }} />
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Sent</span>
          </div>
          <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', fontSize: 20, color: '#B0A8A0', cursor: 'pointer', padding: 0 }}>×</button>
        </div>
        <div style={{ padding: '8px 0' }}>
          {sent.map(f => (
            <div key={f.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid #F0EAE2', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 13, color: '#1A1A1A', fontFamily: f.type === 'word' || f.type === 'memory' ? 'Georgia, serif' : 'system-ui' }}>
                  {f.type === 'song'
                    ? (f.metadata?.track_name || 'Song')
                    : f.type === 'found'
                    ? (f.metadata?.title || f.metadata?.domain || 'Link')
                    : f.type === 'gif'
                    ? 'GIF'
                    : f.type === 'photo'
                    ? 'Photo'
                    : f.content.substring(0, 40)
                  }
                </span>
                <span style={{ fontSize: 11, color: '#B0A8A0', display: 'block', marginTop: 2 }}>{formatTimeAgo(f.created_at)}</span>
              </div>
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: f.reaction ? '#C9A96E' : 'transparent',
                border: `1.5px solid ${f.reaction ? '#C9A96E' : '#E8E0D8'}`,
                flexShrink: 0
              }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '14px 18px' }}>
          <button onClick={() => setView('drop')} style={{ width: '100%', padding: '12px', background: '#FFF8F4', border: '0.5px solid #E8E0D8', borderRadius: 10, fontSize: 14, color: '#C4694F', cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
            Flirt with {partnerName} →
          </button>
        </div>
      </div>
    )
  }

  return null
}
