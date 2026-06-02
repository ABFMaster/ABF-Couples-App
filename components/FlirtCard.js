'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

export default function FlirtCard({ userId, coupleId, partnerId, partnerName, userName, session }) {
  const [unopened, setUnopened] = useState([])
  const [sent, setSent] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('home')
  const [dropType, setDropType] = useState(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [spotifyQuery, setSpotifyQuery] = useState('')
  const [spotifyResults, setSpotifyResults] = useState([])
  const [spotifySearching, setSpotifySearching] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [gifQuery, setGifQuery] = useState('')
  const [gifResults, setGifResults] = useState([])
  const [gifSearching, setGifSearching] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [holdComplete, setHoldComplete] = useState(false)
  const [reactionSaved, setReactionSaved] = useState(null)
  const fileInputRef = useRef(null)
  const spotifyTimeout = useRef(null)
  const gifTimeout = useRef(null)
  const holdInterval = useRef(null)
  const holdStart = useRef(null)

  const fetchInbox = useCallback(async () => {
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
  }, [session, coupleId])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  const current = view === 'stack' ? unopened[currentIndex] : null

  useEffect(() => {
    if (view === 'stack' && current && !current.opened_at) {
      fetch('/api/flirts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ flirtId: current.id })
      }).catch(() => {})
      setUnopened(prev => prev.map(f => f.id === current.id ? { ...f, opened_at: new Date().toISOString() } : f))
    }
  }, [view, currentIndex, unopened.length])

  useEffect(() => {
    if (current?.reaction) {
      setReactionSaved(current.reaction)
      setHoldComplete(true)
      setHoldProgress(current.reaction === 'needed' ? 100 : current.reaction === 'felt' ? 55 : 20)
    } else {
      setReactionSaved(null)
      setHoldComplete(false)
      setHoldProgress(0)
    }
  }, [current?.id])

  const handleSend = async () => {
    if ((!content.trim() && dropType !== 'song') || sending) return
    if (dropType === 'song' && !selectedTrack) return
    setSending(true)
    try {
      await fetch('/api/flirts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId,
          receiverId: partnerId,
          type: dropType,
          content: dropType === 'song' ? selectedTrack.spotifyUrl : content.trim(),
          metadata: dropType === 'song' ? {
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
      setSelectedTrack(null)
      setSpotifyQuery('')
      setSpotifyResults([])
      setGifQuery('')
      setGifResults([])
      setView('home')
      await fetchInbox()
    } catch {}
    setSending(false)
  }

  const startHold = () => {
    if (reactionSaved || holdComplete) return
    holdStart.current = Date.now()
    setHoldProgress(0)
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current
      const progress = Math.min((elapsed / 800) * 100, 100)
      setHoldProgress(progress)
      if (progress >= 100) {
        clearInterval(holdInterval.current)
        setHoldComplete(true)
        saveReaction('needed')
      }
    }, 16)
  }

  const endHold = () => {
    if (reactionSaved || holdComplete) return
    clearInterval(holdInterval.current)
    const elapsed = Date.now() - holdStart.current
    if (elapsed < 100) {
      setHoldProgress(20)
      saveReaction('seen')
    } else if (elapsed < 800) {
      const progress = Math.min((elapsed / 800) * 100, 100)
      setHoldProgress(progress >= 40 ? 55 : 20)
      saveReaction(elapsed >= 300 ? 'felt' : 'seen')
    }
  }

  const saveReaction = async (reaction) => {
    if (!current || reactionSaved) return
    setReactionSaved(reaction)
    try {
      await fetch('/api/flirts/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ flirtId: current.id, reaction })
      })
      setUnopened(prev => prev.map(f => f.id === current.id ? { ...f, reaction } : f))
    } catch {}
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
          <div style={{ padding: '0 0 8px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#2A2420', margin: 0, lineHeight: 1.7 }}>{flirt.content}</p>
          </div>
        )
      case 'memory':
        return (
          <div style={{ padding: '0 0 8px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#2A2420', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>"{flirt.content}"</p>
          </div>
        )
      case 'song':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 0 8px' }}>
            {flirt.metadata?.album_art && <img src={flirt.metadata.album_art} style={{ width: 48, height: 48, borderRadius: 4, flexShrink: 0 }} alt="" />}
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#2A2420', margin: '0 0 2px' }}>{flirt.metadata?.track_name || flirt.content}</p>
              <p style={{ fontSize: 12, color: '#6B6560', margin: 0 }}>{flirt.metadata?.artist}</p>
              {flirt.metadata?.track_url && <a href={flirt.metadata.track_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#C4694F', textDecoration: 'none', display: 'block', marginTop: 4 }}>Open in Spotify →</a>}
            </div>
          </div>
        )
      case 'photo':
        return <img src={flirt.content} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} alt="" />
      case 'gif':
        return <img src={flirt.content} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} alt="GIF" />
      case 'found':
        return (
          <a href={flirt.content} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', padding: '0 0 8px' }}>
            {flirt.metadata?.image && <img src={flirt.metadata.image} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 6 }} alt="" />}
            <p style={{ fontSize: 13, fontWeight: 600, color: '#2A2420', margin: '0 0 2px', lineHeight: 1.4 }}>{flirt.metadata?.title || flirt.content}</p>
            <p style={{ fontSize: 11, color: '#B0A8A0', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{flirt.metadata?.domain}</p>
          </a>
        )
      default:
        return <p style={{ fontSize: 14, color: '#2A2420', margin: '0 0 8px' }}>{flirt.content}</p>
    }
  }

  if (loading) return null

  const POSTCARD_STYLES = `
    @keyframes stampPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    @keyframes inkFill {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `

  const PostcardShell = ({ children, onClick, sealed }) => (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative', margin: '0 0 16px' }}>
      <style>{POSTCARD_STYLES}</style>
      <div style={{
        background: sealed ? '#FDF8F0' : '#FAFAF7',
        border: `1px solid ${sealed ? '#D4C4A8' : '#DDD5C8'}`,
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Inner border */}
        <div style={{ position: 'absolute', inset: 5, border: `0.5px solid ${sealed ? '#EAE0CC' : '#EEE8DC'}`, borderRadius: 3, pointerEvents: 'none', zIndex: 0 }} />
        {/* POSTCARD label */}
        <div style={{ padding: '8px 12px 0', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#C8B8A0' }}>POSTCARD</span>
        </div>
        {/* Content + address layout */}
        <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )

  const AddressSide = ({ toName, stampSealed, stampProgress, onStampDown, onStampUp, showReaction }) => (
    <div style={{ width: 140, flexShrink: 0, padding: '4px 10px 12px', borderLeft: '0.5px solid #D4C4A8', position: 'relative' }}>
      {/* TO label */}
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#B0A898', marginBottom: 4 }}>TO</div>
      <div style={{ borderBottom: '0.5px solid #D4C4A8', paddingBottom: 4, marginBottom: 6 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#2A2420' }}>{toName}</span>
      </div>
      <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 4, height: 12 }} />
      <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 12, height: 12 }} />

      {/* Stamp */}
      <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
        <div
          onPointerDown={onStampDown}
          onPointerUp={onStampUp}
          onPointerLeave={onStampUp}
          style={{
            width: 40,
            height: 46,
            position: 'relative',
            cursor: showReaction && !reactionSaved ? 'pointer' : 'default',
            animation: stampSealed ? 'stampPulse 2.5s ease-in-out infinite' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {/* Stamp body */}
          <div style={{
            width: 40,
            height: 46,
            borderRadius: 2,
            background: stampSealed ? '#C9A96E' : (stampProgress > 0 ? '#C9A96E' : '#F5F0E8'),
            border: stampSealed ? '2px dashed rgba(255,255,255,0.5)' : '1.5px dashed #D4C4A8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Progress fill overlay */}
            {!stampSealed && stampProgress > 0 && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${stampProgress}%`,
                background: '#C9A96E',
                transition: 'height 0.05s linear'
              }} />
            )}
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1, color: stampSealed ? '#FDF8F0' : (stampProgress > 30 ? '#FDF8F0' : '#C8BFB0'), position: 'relative', zIndex: 1 }}>ABF</span>
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: stampSealed ? 'rgba(255,255,255,0.2)' : 'none',
              border: stampSealed ? 'none' : `1px solid ${stampProgress > 30 ? 'rgba(255,255,255,0.5)' : '#D4C4A8'}`,
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: stampSealed ? '#FDF8F0' : (stampProgress > 30 ? 'rgba(255,255,255,0.8)' : 'transparent'),
                margin: '2px auto',
                position: 'relative',
                zIndex: 1
              }} />
            </div>
          </div>

          {/* Postmark overlay */}
          {(stampSealed || stampProgress > 0) && (
            <div style={{
              position: 'absolute',
              top: -4,
              left: -8,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: `1px solid rgba(196,105,79,${stampSealed ? 0.5 : Math.min(stampProgress / 100 * 0.8, 0.8)})`,
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                height: '0.5px',
                background: `rgba(196,105,79,${stampSealed ? 0.4 : Math.min(stampProgress / 100 * 0.6, 0.6)})`
              }} />
            </div>
          )}
        </div>
        {showReaction && !reactionSaved && (
          <div style={{ fontSize: 8, color: '#C9A96E', textAlign: 'center', marginTop: 3, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>hold</div>
        )}
      </div>
    </div>
  )

  const RuledLines = ({ count = 6, children }) => (
    <div style={{ flex: 1, padding: '4px 12px 12px', position: 'relative', minHeight: 120 }}>
      {[...Array(count)].map((_, i) => (
        <div key={i} style={{ borderBottom: '0.5px solid #EEE8DC', height: i === 0 ? 24 : 20, position: 'relative' }}>
          {i === 0 && children}
        </div>
      ))}
    </div>
  )

  // HOME STATE
  if (view === 'home') {
    const unseenCount = unopened.filter(f => !f.opened_at).length
    const hasUnseen = unseenCount > 0

    return (
      <PostcardShell onClick={() => hasUnseen ? setView('stack') : setView('drop')} sealed={hasUnseen}>
        {/* Message side */}
        <div style={{ flex: 1, padding: '4px 12px 12px', position: 'relative', minHeight: 120 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderBottom: `0.5px solid ${hasUnseen ? '#EAE0CC' : '#EEE8DC'}`, height: i === 0 ? 28 : 20 }}>
              {i === 0 && (
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: hasUnseen ? '#C9A96E' : '#C8BFB0', fontStyle: 'italic' }}>
                  {hasUnseen ? `from ${partnerName} —` : `write something for ${partnerName}...`}
                </span>
              )}
              {i === 1 && hasUnseen && (
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#C4B89A', fontStyle: 'italic' }}>tap to open</span>
              )}
            </div>
          ))}
          {!hasUnseen && sent.length > 0 && (
            <button onClick={e => { e.stopPropagation(); setView('sent') }} style={{ position: 'absolute', bottom: 8, left: 12, background: 'none', border: 'none', fontSize: 10, color: '#B0A8A0', cursor: 'pointer', padding: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>view sent →</button>
          )}
        </div>
        {/* Address side */}
        <AddressSide toName={hasUnseen ? userName : partnerName} stampSealed={hasUnseen} stampProgress={0} />
      </PostcardShell>
    )
  }

  // DROP STATE — writing on the postcard
  if (view === 'drop') {
    const types = ['SONG', 'WORD', 'PHOTO', 'GIF', 'FOUND', 'MEMORY']
    const canSend = dropType === 'song' ? !!selectedTrack : !!content.trim()

    return (
      <div style={{ margin: '0 0 16px' }}>
        <style>{POSTCARD_STYLES}</style>
        <div style={{ background: '#FAFAF7', border: '1px solid #DDD5C8', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 5, border: '0.5px solid #EEE8DC', borderRadius: 3, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ padding: '8px 12px 0', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#C8B8A0' }}>POSTCARD</span>
            <button onClick={() => { setView('home'); setDropType(null); setContent('') }} style={{ background: 'none', border: 'none', fontSize: 18, color: '#B0A8A0', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>

          <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            {/* Message side */}
            <div style={{ flex: 1, padding: '4px 12px 12px' }}>
              {/* Type selector */}
              <div style={{ borderBottom: '0.5px solid #EEE8DC', paddingBottom: 6, marginBottom: 4, display: 'flex', flexWrap: 'wrap', gap: '2px 0' }}>
                {types.map((t, i) => (
                  <span key={t}>
                    <span
                      onClick={() => { setDropType(t.toLowerCase()); setContent(''); setSelectedTrack(null); setSpotifyResults([]); setGifResults([]) }}
                      style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: dropType === t.toLowerCase() ? '#C9A96E' : '#C0B4A4', cursor: 'pointer', textDecoration: dropType === t.toLowerCase() ? 'underline' : 'none', textUnderlineOffset: 2 }}
                    >{t}</span>
                    {i < types.length - 1 && <span style={{ fontSize: 9, color: '#DDD5C8', margin: '0 4px' }}>·</span>}
                  </span>
                ))}
              </div>

              {/* Input area — transforms by type */}
              <div style={{ minHeight: 100 }}>
                {!dropType && (
                  <div style={{ paddingTop: 8 }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{ borderBottom: '0.5px solid #EEE8DC', height: 20 }} />
                    ))}
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#D0C8BC', fontStyle: 'italic', margin: '6px 0 0' }}>choose what to send above...</p>
                  </div>
                )}

                {/* WORD / MEMORY */}
                {(dropType === 'word' || dropType === 'memory') && (
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={dropType === 'word' ? `say something to ${partnerName}...` : 'a memory worth sending...'}
                      rows={5}
                      maxLength={dropType === 'word' ? 200 : 300}
                      autoFocus
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'Georgia, serif',
                        fontSize: dropType === 'word' ? 15 : 13,
                        color: '#2A2420',
                        lineHeight: '20px',
                        padding: '2px 0',
                        boxSizing: 'border-box',
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, #EEE8DC 19px, #EEE8DC 20px)',
                        backgroundSize: '100% 20px'
                      }}
                    />
                  </div>
                )}

                {/* SONG */}
                {dropType === 'song' && !selectedTrack && (
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
                        } else { setSpotifyResults([]); setSpotifySearching(false) }
                      }}
                      placeholder="search for a song..."
                      autoFocus
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid #C9A96E', outline: 'none', fontFamily: 'Georgia, serif', fontSize: 13, color: '#2A2420', padding: '4px 0', boxSizing: 'border-box' }}
                    />
                    {spotifySearching && <p style={{ fontSize: 11, color: '#B0A8A0', margin: '4px 0', fontStyle: 'italic' }}>searching...</p>}
                    <div style={{ maxHeight: 100, overflowY: 'auto' }}>
                      {spotifyResults.slice(0, 4).map(track => (
                        <div key={track.id} onClick={() => { setSelectedTrack(track); setContent(track.spotifyUrl) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #EEE8DC', cursor: 'pointer' }}>
                          {track.albumArtSmall && <img src={track.albumArtSmall} style={{ width: 28, height: 28, borderRadius: 3, flexShrink: 0 }} alt="" />}
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 500, color: '#2A2420', margin: 0 }}>{track.name}</p>
                            <p style={{ fontSize: 11, color: '#8A8078', margin: 0 }}>{track.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dropType === 'song' && selectedTrack && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '0.5px solid #EEE8DC' }}>
                    {selectedTrack.albumArt && <img src={selectedTrack.albumArt} style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }} alt="" />}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#2A2420', margin: 0 }}>{selectedTrack.name}</p>
                      <p style={{ fontSize: 11, color: '#8A8078', margin: 0 }}>{selectedTrack.artist}</p>
                    </div>
                    <button onClick={() => { setSelectedTrack(null); setContent(''); setSpotifyQuery('') }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#B0A8A0', cursor: 'pointer' }}>change</button>
                  </div>
                )}

                {/* GIF */}
                {dropType === 'gif' && !content && (
                  <div>
                    <input
                      value={gifQuery}
                      onChange={e => {
                        setGifQuery(e.target.value)
                        clearTimeout(gifTimeout.current)
                        if (e.target.value.length > 1) {
                          setGifSearching(true)
                          gifTimeout.current = setTimeout(async () => {
                            try {
                              const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${encodeURIComponent(e.target.value)}&limit=6&rating=g`)
                              const data = await res.json()
                              setGifResults(data.data || [])
                            } catch {}
                            setGifSearching(false)
                          }, 400)
                        } else { setGifResults([]); setGifSearching(false) }
                      }}
                      placeholder="search for a GIF..."
                      autoFocus
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid #C9A96E', outline: 'none', fontFamily: 'Georgia, serif', fontSize: 13, color: '#2A2420', padding: '4px 0', boxSizing: 'border-box' }}
                    />
                    {gifSearching && <p style={{ fontSize: 11, color: '#B0A8A0', margin: '4px 0', fontStyle: 'italic' }}>searching...</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 4 }}>
                      {gifResults.slice(0, 6).map(gif => (
                        <img
                          key={gif.id}
                          src={gif.images.fixed_height_small.url}
                          onClick={() => setContent(gif.images.original.url)}
                          style={{ width: '100%', height: 56, objectFit: 'cover', borderRadius: 3, cursor: 'pointer' }}
                          alt=""
                        />
                      ))}
                    </div>
                  </div>
                )}

                {dropType === 'gif' && content && (
                  <div style={{ position: 'relative' }}>
                    <img src={content} style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 4 }} alt="" />
                    <button onClick={() => setContent('')} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                )}

                {/* PHOTO */}
                {dropType === 'photo' && !content && (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const { createClient } = await import('@supabase/supabase-js')
                        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } })
                        const path = `flirts/${userId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
                        const { data } = await sb.storage.from('photos').upload(path, file, { upsert: true })
                        if (data) {
                          const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
                          setContent(urlData.publicUrl)
                        }
                      } catch {}
                    }} />
                    <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '20px 0', background: 'transparent', border: '0.5px dashed #D4C4A8', borderRadius: 4, fontSize: 12, color: '#B0A8A0', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: 4 }}>tap to choose a photo</button>
                  </div>
                )}

                {dropType === 'photo' && content && (
                  <div style={{ position: 'relative' }}>
                    <img src={content} style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 4 }} alt="" />
                    <button onClick={() => setContent('')} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                )}

                {/* FOUND */}
                {dropType === 'found' && (
                  <div>
                    <input
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="paste a link..."
                      autoFocus
                      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '0.5px solid #C9A96E', outline: 'none', fontFamily: 'Georgia, serif', fontSize: 13, color: '#2A2420', padding: '4px 0', boxSizing: 'border-box' }}
                    />
                  </div>
                )}

                {/* MEMORY — timeline picker placeholder */}
                {dropType === 'memory' && !content && (
                  <div style={{ paddingTop: 4 }}>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#C9A96E', fontStyle: 'italic', margin: '0 0 6px' }}>pick a memory from your timeline</p>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#B0A8A0', fontStyle: 'italic', margin: 0 }}>timeline picker coming soon...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address side with Mail it stamp */}
            <div style={{ width: 140, flexShrink: 0, padding: '4px 10px 12px', borderLeft: '0.5px solid #D4C4A8', position: 'relative' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#B0A898', marginBottom: 4 }}>TO</div>
              <div style={{ borderBottom: '0.5px solid #D4C4A8', paddingBottom: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#2A2420' }}>{partnerName}</span>
              </div>
              <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 4, height: 12 }} />
              <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 12, height: 12 }} />

              {/* Stamp — becomes Mail it button when content ready */}
              <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
                <div
                  onClick={canSend ? handleSend : undefined}
                  style={{
                    width: 40,
                    height: 46,
                    borderRadius: 2,
                    background: canSend ? '#C9A96E' : '#F5F0E8',
                    border: canSend ? '2px dashed rgba(255,255,255,0.5)' : '1.5px dashed #D4C4A8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    cursor: canSend ? 'pointer' : 'default',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1, color: canSend ? '#FDF8F0' : '#C8BFB0' }}>ABF</span>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: canSend ? 'rgba(255,255,255,0.2)' : 'none', border: canSend ? 'none' : '1px solid #D4C4A8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: canSend ? '#FDF8F0' : 'transparent' }} />
                  </div>
                </div>
                <div style={{ fontSize: 8, color: canSend ? '#C9A96E' : '#C8BFB0', textAlign: 'center', marginTop: 3, fontFamily: 'Georgia, serif', fontStyle: 'italic', transition: 'color 0.2s' }}>
                  {sending ? 'sending...' : canSend ? 'mail it' : 'stamp'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // STACK STATE — reading received postcard
  if (view === 'stack' && current) {
    return (
      <div style={{ margin: '0 0 16px' }}>
        <style>{POSTCARD_STYLES}</style>
        <div style={{ background: '#FDF8F0', border: '1px solid #D4C4A8', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 5, border: '0.5px solid #EAE0CC', borderRadius: 3, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ padding: '8px 12px 0', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#C8B8A0' }}>POSTCARD</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {unopened.length > 1 && (
                <span style={{ fontSize: 10, color: '#B0A8A0', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{currentIndex + 1} of {unopened.length}</span>
              )}
              <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', fontSize: 18, color: '#B0A8A0', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            </div>
          </div>

          <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            {/* Message side */}
            <div style={{ flex: 1, padding: '4px 12px 12px' }}>
              <div style={{ borderBottom: '0.5px solid #EAE0CC', paddingBottom: 4, marginBottom: 2 }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#C9A96E', fontStyle: 'italic' }}>from {partnerName} —</span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: '#B0A8A0', fontStyle: 'italic', marginLeft: 8 }}>{formatTimeAgo(current.created_at)}</span>
              </div>

              {/* Content on ruled lines */}
              <div style={{ paddingTop: 6, backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, #EAE0CC 19px, #EAE0CC 20px)', backgroundSize: '100% 20px', minHeight: 80 }}>
                {renderFlirtContent(current)}
              </div>

              {unopened.length > 1 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {currentIndex > 0 && <button onClick={() => setCurrentIndex(i => i - 1)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#B0A8A0', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', padding: 0 }}>← prev</button>}
                  {currentIndex < unopened.length - 1 && <button onClick={() => setCurrentIndex(i => i + 1)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#B0A8A0', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', padding: 0 }}>next →</button>}
                </div>
              )}
            </div>

            {/* Address side with hold-to-react stamp */}
            <AddressSide
              toName={userName}
              stampSealed={false}
              stampProgress={holdProgress}
              onStampDown={startHold}
              onStampUp={endHold}
              showReaction={true}
            />
          </div>
        </div>
      </div>
    )
  }

  // SENT STATE
  if (view === 'sent') {
    return (
      <div style={{ margin: '0 0 16px' }}>
        <style>{POSTCARD_STYLES}</style>
        <div style={{ background: '#FAFAF7', border: '1px solid #DDD5C8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #EEE8DC' }}>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#C8B8A0' }}>SENT</span>
            <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', fontSize: 18, color: '#B0A8A0', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>
          {sent.map(f => (
            <div key={f.id} style={{ padding: '10px 12px', borderBottom: '0.5px solid #EEE8DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 13, color: '#2A2420', fontFamily: f.type === 'word' || f.type === 'memory' ? 'Georgia, serif' : 'system-ui' }}>
                  {f.type === 'song' ? (f.metadata?.track_name || 'Song') : f.type === 'found' ? (f.metadata?.title || f.metadata?.domain || 'Link') : f.type === 'photo' ? 'Photo' : f.type === 'gif' ? 'GIF' : f.content?.substring(0, 40)}
                </span>
                <span style={{ fontSize: 11, color: '#B0A8A0', display: 'block', marginTop: 2, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{formatTimeAgo(f.created_at)}</span>
              </div>
              {/* Stamp reaction indicator */}
              <div style={{ width: 28, height: 32, borderRadius: 2, background: f.reaction ? '#C9A96E' : '#F5F0E8', border: f.reaction ? '1.5px dashed rgba(255,255,255,0.5)' : '1px dashed #D4C4A8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: f.reaction ? '#FDF8F0' : 'transparent', border: f.reaction ? 'none' : '1px solid #D4C4A8' }} />
              </div>
            </div>
          ))}
          <div style={{ padding: '12px' }}>
            <button onClick={() => setView('drop')} style={{ width: '100%', padding: '10px', background: '#FFF8F4', border: '0.5px solid #E8E0D8', borderRadius: 8, fontSize: 13, color: '#C4694F', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              send another →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
