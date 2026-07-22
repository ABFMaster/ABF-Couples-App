'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function FlirtCard({ userId, coupleId, partnerId, partnerName, userName, session }) {
  const [unopened, setUnopened] = useState([])
  const [received, setReceived] = useState([])
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
  const [cardFlipped, setCardFlipped] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [selectedMemory, setSelectedMemory] = useState(null)
  const [metadata, setMetadata] = useState(null)
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
      setReceived([...(data.unopened || []), ...(data.opened || [])])
      setSent(data.sent || [])
    } catch {}
    setLoading(false)
  }, [session, coupleId])

  useEffect(() => { fetchInbox() }, [fetchInbox])

  const fetchTimeline = useCallback(async () => {
    if (!coupleId) return
    setTimelineLoading(true)
    try {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('id, event_type, title, description, event_date, photo_urls, image_url, item_subtype, artist')
        .eq('couple_id', coupleId)
        .order('event_date', { ascending: false })
      if (!error && data) setTimelineEvents(data)
    } catch {}
    setTimelineLoading(false)
  }, [coupleId])

  useEffect(() => {
    if (dropType === 'memory' && timelineEvents.length === 0) fetchTimeline()
  }, [dropType, timelineEvents.length, fetchTimeline])

  const current = view === 'stack' ? received[currentIndex] : null

  useEffect(() => {
    if (view === 'stack' && current && !current.opened_at) {
      fetch('/api/flirts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ flirtId: current.id })
      }).catch(() => {})
      setReceived(prev => prev.map(f => f.id === current.id ? { ...f, opened_at: new Date().toISOString() } : f))
      setUnopened(prev => prev.map(f => f.id === current.id ? { ...f, opened_at: new Date().toISOString() } : f))
    }
  }, [view, currentIndex, received.length])

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
    if ((!content.trim() && dropType !== 'song' && dropType !== 'memory') || sending) return
    if (dropType === 'song' && !selectedTrack) return
    if (dropType === 'memory' && !selectedMemory) return
    setSending(true)
    try {
      await fetch('/api/flirts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          coupleId,
          receiverId: partnerId,
          type: dropType,
          content: dropType === 'song' ? selectedTrack.spotifyUrl : dropType === 'memory' ? (selectedMemory?.title || 'a memory') : content.trim(),
          metadata: dropType === 'song' ? {
            track_name: selectedTrack.name,
            artist: selectedTrack.artist,
            album_art: selectedTrack.albumArt,
            preview_url: selectedTrack.previewUrl,
            track_url: selectedTrack.spotifyUrl
          } : dropType === 'memory' ? metadata : undefined
        })
      })
      setContent('')
      setDropType(null)
      setSelectedTrack(null)
      setSelectedMemory(null)
      setMetadata(null)
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

  const MemoryEventIcon = ({ event_type, size = 40 }) => {
    const base = { width: size, height: size, viewBox: '0 0 40 40', fill: 'none', stroke: '#8B7355', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }
    switch (event_type) {
      case 'first_date':
        return <svg {...base}><path d="M13 30v-8M10 13h6l-3 9"/><line x1="11" y1="30" x2="15" y2="30"/><path d="M27 30v-8M24 13h6l-3 9"/><line x1="25" y1="30" x2="29" y2="30"/><line x1="17" y1="10" x2="20" y2="8"/><line x1="23" y1="10" x2="20" y2="8"/></svg>
      case 'first_kiss':
        return <svg {...base}><path d="M8 20q4-6 12-3 8-3 12 3-4 8-12 8-8 0-12-8z"/><path d="M15 20q2.5 2.5 5 0 2.5 2.5 5 0" strokeWidth="1"/></svg>
      case 'anniversary':
        return <svg {...base}><path d="M20 28l-10-9.5a5.5 5.5 0 1 1 10-4.5 5.5 5.5 0 1 1 10 4.5z"/><circle cx="30" cy="10" r="1.5" fill="#8B7355" stroke="none"/></svg>
      case 'milestone':
        return <svg {...base}><circle cx="20" cy="17" r="9"/><path d="M15 26l-2.5 5m15-5 2.5 5m-11.5 0h7"/></svg>
      case 'trip':
        return <svg {...base}><path d="M6 30l9-17 4 8 5-14 10 23"/><circle cx="29" cy="10" r="2.5"/></svg>
      case 'date_night':
        return <svg {...base}><path d="M22 10a9 9 0 1 1-8 13A6.5 6.5 0 0 0 22 10z"/><path d="M31 8l.8 2 2 .7-2 .8-.8 2-.8-2-2-.7 2-.8z" fill="#8B7355" stroke="none"/></svg>
      case 'achievement':
        return <svg {...base}><path d="M14 10h12v10a6 6 0 0 1-12 0z"/><path d="M14 15h-4a4 4 0 0 0 4 4m12-4h4a4 4 0 0 1-4 4"/><line x1="20" y1="26" x2="20" y2="30"/><line x1="15" y1="30" x2="25" y2="30"/></svg>
      case 'shared_item':
        return <svg {...base}><circle cx="20" cy="20" r="13"/><path d="M16 14l12 6-12 6z"/></svg>
      case 'custom':
      default:
        return <svg {...base}><path d="M20 8l2.5 9.5 9.5 2.5-9.5 2.5-2.5 9.5-2.5-9.5-9.5-2.5 9.5-2.5z"/></svg>
    }
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
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 0 8px' }}>
            {(flirt.metadata?.photo_url || flirt.metadata?.image_url) ? (
              <img src={flirt.metadata.photo_url || flirt.metadata.image_url} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }} alt="" />
            ) : (
              <div style={{ width: '100%', padding: 16, background: '#F5F0E8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <MemoryEventIcon event_type={flirt.metadata?.event_type} size={56} />
              </div>
            )}
            <p style={{ fontSize: 13, fontWeight: 500, color: '#2C2C2C', margin: '0 0 4px' }}>{flirt.metadata?.title || flirt.content}</p>
            {flirt.metadata?.event_date && <p style={{ fontSize: 11, color: '#8B7355', margin: '0 0 4px' }}>{new Date(flirt.metadata.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
            {flirt.metadata?.description && <p style={{ fontSize: 11, color: '#6B6B6B', fontStyle: 'italic', margin: 0 }}>{flirt.metadata.description}</p>}
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
    @keyframes fcStampPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    .fc-mem-chips::-webkit-scrollbar { display: none; }
    .fc-card-scene { perspective: 700px; width: 100%; }
    .fc-card-inner { position: relative; width: 100%; transform-style: preserve-3d; transition: transform 0.5s ease; }
    .fc-card-inner.flipped { transform: rotateY(180deg); }
    .fc-card-face { position: absolute; width: 100%; top: 0; left: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; min-height: 220px; border-radius: 6px; overflow: hidden; height: 100%; }
    .fc-card-back { backface-visibility: hidden; -webkit-backface-visibility: hidden; position: absolute; top: 0; left: 0; right: 0; transform: rotateY(180deg); }
    .fc-stripe-border { position: absolute; inset: 0; z-index: 2; pointer-events: none; border-radius: 6px; background: repeating-linear-gradient(-45deg, #c4694f 0, #c4694f 6px, transparent 6px, transparent 10px, #1a3a52 10px, #1a3a52 16px, transparent 16px, transparent 20px); -webkit-mask: linear-gradient(#000 0, #000 0) content-box, linear-gradient(#000 0, #000 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0, #000 0) content-box, linear-gradient(#000 0, #000 0); mask-composite: exclude; padding: 7px; }
    .fc-rcv-stripe { position: absolute; inset: 0; z-index: 1; pointer-events: none; background: repeating-linear-gradient(-45deg, #c4694f 0, #c4694f 4px, transparent 4px, transparent 7px, #1a3a52 7px, #1a3a52 11px, transparent 11px, transparent 14px); -webkit-mask: linear-gradient(#000 0, #000 0) content-box, linear-gradient(#000 0, #000 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0, #000 0) content-box, linear-gradient(#000 0, #000 0); mask-composite: exclude; padding: 5px; }
  `

  const PostcardShell = ({ children, onClick, sealed }) => (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', position: 'relative', margin: '0 16px 16px' }}>
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
    <div style={{ width: 120, flexShrink: 0, padding: '6px 8px 12px', borderLeft: '0.5px solid #D4C4A8', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 160 }}>
      {/* Top row: TO label left, stamp right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#B0A898', marginBottom: 3 }}>TO</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#2A2420' }}>{toName}</div>
        </div>
        {/* Stamp top right */}
        <div
          onPointerDown={onStampDown}
          onPointerUp={onStampUp}
          onPointerLeave={onStampUp}
          style={{ cursor: showReaction && !reactionSaved ? 'pointer' : 'default', userSelect: 'none', WebkitUserSelect: 'none', flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 42, position: 'relative', flexShrink: 0 }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 1,
              border: `2px dotted ${stampSealed ? '#B8943A' : (stampProgress > 0 ? '#B8943A' : '#C8BFB0')}`,
              background: stampSealed ? '#C9A96E' : (stampProgress > 0 ? '#C9A96E' : '#F0EBE0'),
              overflow: 'hidden'
            }}>
              {!stampSealed && stampProgress > 0 && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${stampProgress}%`, background: '#C9A96E', transition: 'height 0.05s linear' }} />
              )}
              <div style={{ position: 'absolute', inset: 3, border: `0.5px solid ${stampSealed || stampProgress > 20 ? 'rgba(255,255,255,0.4)' : 'rgba(180,168,150,0.4)'}`, borderRadius: 1 }} />
              <div style={{ position: 'absolute', top: 7, left: 0, right: 0, textAlign: 'center', fontSize: 6, fontWeight: 700, letterSpacing: 1, color: stampSealed || stampProgress > 30 ? '#FDF8F0' : '#B0A898', fontFamily: 'system-ui', zIndex: 1 }}>ABF</div>
              <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', border: `1px solid ${stampSealed || stampProgress > 30 ? 'rgba(255,255,255,0.5)' : '#C8BFB0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: stampSealed || stampProgress > 50 ? '#FDF8F0' : 'transparent' }} />
              </div>
            </div>
          </div>
          {showReaction && !reactionSaved && <div style={{ fontSize: 7, color: '#C9A96E', textAlign: 'center', marginTop: 2, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>hold</div>}
          {stampSealed && <div style={{ fontSize: 7, color: '#C9A96E', textAlign: 'center', marginTop: 2, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>sealed</div>}
        </div>
      </div>
      {/* Ruled lines below */}
      <div style={{ borderBottom: '0.5px solid #E0D8CC', marginBottom: 6, marginTop: 4 }} />
      <div style={{ borderBottom: '0.5px solid #E0D8CC', marginBottom: 6 }} />
      <div style={{ borderBottom: '0.5px solid #E0D8CC' }} />
      {/* Postmark */}
      {(stampSealed || stampProgress > 0) && (
        <div style={{ position: 'absolute', top: 28, left: 8, width: 28, height: 28, borderRadius: '50%', border: `1px solid rgba(196,105,79,${Math.min((stampProgress || 100) / 100 * 0.6, 0.6)})`, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '0.5px', background: `rgba(196,105,79,0.4)` }} />
        </div>
      )}
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
      <div style={{ margin: '0 16px 16px', position: 'relative' }}>
        <style>{POSTCARD_STYLES}</style>
        <div className="fc-card-scene">
          <div className={`fc-card-inner${cardFlipped ? ' flipped' : ''}`}>

            {/* FRONT — postcard image */}
            <div className="fc-card-face">
              <div
                style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: '1px solid #D4C4A8', cursor: 'pointer' }}
                onClick={() => setCardFlipped(true)}
              >
                <img
                  src="/flirt-postcard.png"
                  alt="Greetings from Always Be Flirting"
                  style={{ width: '100%', display: 'block', borderRadius: 6 }}
                />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(to top, rgba(10,15,25,0.82) 0%, transparent 100%)', borderRadius: '0 0 6px 6px', display: 'flex', alignItems: 'flex-end', padding: '0 14px 12px', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontStyle: 'italic', color: hasUnseen ? '#f2c96e' : 'rgba(253,248,244,0.95)', letterSpacing: '0.02em' }}>
                    {hasUnseen ? `${partnerName} sent you a flirt — tap to open` : `Send ${partnerName} a flirt →`}
                  </span>
                  {hasUnseen ? (
                    <div style={{ background: '#c4694f', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: 'white', fontFamily: 'system-ui', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>
                      {unseenCount} new
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BACK — postcard back with compose or open */}
            <div className="fc-card-back">
              <div style={{ background: hasUnseen ? '#FDF8F0' : '#FAFAF7', border: `1px solid ${hasUnseen ? '#D4C4A8' : '#DDD5C8'}`, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div className={hasUnseen ? 'fc-rcv-stripe' : 'fc-stripe-border'} />
                <div style={{ position: 'absolute', inset: 5, border: `0.5px solid ${hasUnseen ? '#EAE0CC' : '#EEE8DC'}`, borderRadius: 3, pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ padding: '8px 12px 0', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#C8B8A0' }}>POSTCARD</span>
                  <button onClick={() => setCardFlipped(false)} style={{ background: 'none', border: 'none', fontSize: 10, color: '#B0A8A0', cursor: 'pointer', padding: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>← flip back</button>
                </div>

                <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                  {/* Message side */}
                  <div style={{ flex: 1, padding: '4px 12px 12px', position: 'relative', minHeight: 140 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ borderBottom: `0.5px solid ${hasUnseen ? '#EAE0CC' : '#EEE8DC'}`, height: i === 0 ? 28 : 20 }}>
                        {i === 0 && (
                          <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: hasUnseen ? '#C9A96E' : '#C8BFB0', fontStyle: 'italic' }}>
                            {hasUnseen ? `from ${partnerName} —` : `write something for ${partnerName}...`}
                          </span>
                        )}
                        {i === 1 && hasUnseen && (
                          <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#C4B89A', fontStyle: 'italic' }}>waiting to be opened</span>
                        )}
                      </div>
                    ))}
                    {!hasUnseen && sent.length > 0 && (
                      <button onClick={e => { e.stopPropagation(); setView('sent') }} style={{ position: 'absolute', bottom: 8, left: 12, background: 'none', border: 'none', fontSize: 10, color: '#B0A8A0', cursor: 'pointer', padding: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>view sent →</button>
                    )}
                  </div>
                  {/* Address side */}
                  <AddressSide toName={hasUnseen ? userName : partnerName} stampSealed={hasUnseen} stampProgress={0} />
                </div>

                {/* Action button */}
                <div style={{ padding: '0 12px 12px', position: 'relative', zIndex: 1 }}>
                  <button
                    onClick={() => hasUnseen ? setView('stack') : setView('drop')}
                    style={{ width: '100%', padding: '9px', background: hasUnseen ? '#C4694F' : '#FFF8F4', border: `0.5px solid ${hasUnseen ? '#C4694F' : '#E8E0D8'}`, borderRadius: 8, fontSize: 13, color: hasUnseen ? 'white' : '#C4694F', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
                  >
                    {hasUnseen ? 'open flirt →' : 'send a flirt →'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // DROP STATE — writing on the postcard
  if (view === 'drop') {
    const types = ['SONG', 'WORD', 'PHOTO', 'GIF', 'FOUND', 'MEMORY']
    const canSend = dropType === 'song' ? !!selectedTrack : dropType === 'memory' ? !!selectedMemory : !!content.trim()

    return (
      <div style={{ margin: '0 16px 16px' }}>
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
                      onClick={() => { setDropType(t.toLowerCase()); setContent(''); setSelectedTrack(null); setSelectedMemory(null); setMetadata(null); setSpotifyResults([]); setGifResults([]) }}
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
                {dropType === 'word' && (
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={`say something to ${partnerName}...`}
                      rows={5}
                      maxLength={200}
                      autoFocus
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'Georgia, serif',
                        fontSize: 15,
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

                {/* MEMORY — timeline picker */}
                {dropType === 'memory' && !selectedMemory && (
                  <div style={{ paddingTop: 4 }}>
                    {/* Filter chips */}
                    <div className="fc-mem-chips" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {['all', 'trip', 'date_night', 'milestone', 'anniversary', 'first_date', 'first_kiss', 'achievement', 'custom'].map(f => (
                        <button key={f} onClick={() => setTimelineFilter(f)} style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, padding: '3px 8px', borderRadius: 20, border: `1px solid ${timelineFilter === f ? '#C9A96E' : '#D4C4A8'}`, background: timelineFilter === f ? '#C9A96E' : 'transparent', color: timelineFilter === f ? '#FDF8F0' : '#B0A8A0', cursor: 'pointer', fontFamily: 'system-ui' }}>
                          {f === 'all' ? 'ALL' : f.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {/* List */}
                    <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {timelineLoading ? (
                        <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#B0A8A0', fontStyle: 'italic', margin: '8px 0' }}>loading...</p>
                      ) : (() => {
                        const filtered = timelineFilter === 'all' ? timelineEvents : timelineEvents.filter(e => e.event_type === timelineFilter)
                        if (filtered.length === 0) return <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#B0A8A0', fontStyle: 'italic', margin: '8px 0' }}>no memories yet</p>
                        return filtered.map(ev => (
                          <div key={ev.id} onClick={() => { setSelectedMemory(ev); setMetadata({ event_id: ev.id, event_type: ev.event_type, title: ev.title, description: ev.description, event_date: ev.event_date, image_url: ev.image_url || ev.photo_urls?.[0] || null }) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #EEE8DC', cursor: 'pointer' }}>
                            <div style={{ flexShrink: 0 }}>
                              {(ev.photo_urls?.[0] || ev.image_url) ? (
                                <img src={ev.photo_urls?.[0] || ev.image_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }} alt="" />
                              ) : (
                                <MemoryEventIcon event_type={ev.event_type} size={28} />
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#2A2420', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                              {ev.event_date && <div style={{ fontSize: 9, color: '#B0A8A0', fontFamily: 'system-ui', marginTop: 1 }}>{new Date(ev.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}
                {/* MEMORY — selected state */}
                {dropType === 'memory' && selectedMemory && (
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '0.5px solid #EEE8DC' }}>
                      <div style={{ flexShrink: 0 }}>
                        {(selectedMemory.photo_urls?.[0] || selectedMemory.image_url) ? (
                          <img src={selectedMemory.photo_urls?.[0] || selectedMemory.image_url} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }} alt="" />
                        ) : (
                          <MemoryEventIcon event_type={selectedMemory.event_type} size={32} />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2A2420' }}>{selectedMemory.title}</div>
                        {selectedMemory.event_date && <div style={{ fontSize: 9, color: '#B0A8A0', fontFamily: 'system-ui', marginTop: 1 }}>{new Date(selectedMemory.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                        {selectedMemory.description && <div style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#6B5E52', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 }}>{selectedMemory.description.length > 80 ? selectedMemory.description.slice(0, 80) + '…' : selectedMemory.description}</div>}
                      </div>
                    </div>
                    <button onClick={() => { setSelectedMemory(null); setMetadata(null) }} style={{ marginTop: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, color: '#B0A8A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'system-ui' }}>CHANGE</button>
                  </div>
                )}
              </div>
            </div>

            {/* Address side with Mail it stamp */}
            <div style={{ width: 120, flexShrink: 0, padding: '4px 10px 12px', borderLeft: '0.5px solid #D4C4A8', position: 'relative' }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#B0A898', marginBottom: 4 }}>TO</div>
              <div style={{ borderBottom: '0.5px solid #D4C4A8', paddingBottom: 4, marginBottom: 6 }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#2A2420' }}>{partnerName}</span>
              </div>
              <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 4, height: 12 }} />
              <div style={{ borderBottom: '0.5px solid #E8E0D4', marginBottom: 12, height: 12 }} />

              {/* Stamp — becomes Mail it button when content ready */}
              <div style={{ position: 'absolute', top: 8, right: 10 }}>
                <div onClick={canSend ? handleSend : undefined} style={{ width: 36, height: 42, position: 'relative', flexShrink: 0, cursor: canSend ? 'pointer' : 'default' }}>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 1,
                    border: `2px dotted ${canSend ? '#B8943A' : '#C8BFB0'}`,
                    background: canSend ? '#C9A96E' : '#F0EBE0',
                    overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', inset: 3, border: `0.5px solid ${canSend ? 'rgba(255,255,255,0.4)' : 'rgba(180,168,150,0.4)'}`, borderRadius: 1 }} />
                    <div style={{ position: 'absolute', top: 7, left: 0, right: 0, textAlign: 'center', fontSize: 6, fontWeight: 700, letterSpacing: 1, color: canSend ? '#FDF8F0' : '#B0A898', fontFamily: 'system-ui', zIndex: 1 }}>ABF</div>
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 14, height: 14, borderRadius: '50%', border: `1px solid ${canSend ? 'rgba(255,255,255,0.5)' : '#C8BFB0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: canSend ? '#FDF8F0' : 'transparent' }} />
                    </div>
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
  if (view === 'stack' && current && received.length > 0) {
    return (
      <div style={{ margin: '0 16px 16px' }}>
        <style>{POSTCARD_STYLES}</style>
        <div style={{ background: '#f5f0e4', border: '0.5px solid #c8b8a0', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div className="fc-rcv-stripe" />
          <div style={{ position: 'relative', zIndex: 2, margin: 5, background: '#f5f0e4' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '0.5px solid #ddd0bc' }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: '#c9a96e', fontStyle: 'italic' }}>from {partnerName} —</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {received.length > 1 && <span style={{ fontSize: 10, color: '#b0a8a0', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{currentIndex + 1} of {received.length}</span>}
                <span style={{ fontSize: 10, color: '#b0a8a0', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{formatTimeAgo(current.created_at)}</span>
                <button onClick={() => { setCardFlipped(false); setView('home') }} style={{ background: 'none', border: 'none', fontSize: 18, color: '#b0a8a0', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </div>
            </div>
            {/* Body */}
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, padding: '8px 10px', fontFamily: 'Georgia, serif', fontSize: 14, color: '#2a2015', lineHeight: 1.65, backgroundImage: 'repeating-linear-gradient(transparent, transparent 21px, #d8ccba 21px, #d8ccba 22px)', backgroundSize: '100% 22px', minHeight: 72 }}>
                {renderFlirtContent(current)}
              </div>
              {/* Address col with ABF stamp */}
              <div style={{ width: 82, flexShrink: 0, borderLeft: '0.5px solid #c8b8a0', padding: '8px 7px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: 2, color: '#b0a090', fontFamily: 'system-ui', marginBottom: 2 }}>To</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2a2015' }}>{userName}</div>
                {/* ABF coral stamp */}
                <svg style={{ position: 'absolute', top: 6, right: 6 }} width="44" height="52" viewBox="0 0 44 52" fill="none">
                  <circle cx="4" cy="5" r="4" fill="#f5f0e4"/>
                  <circle cx="11" cy="1" r="4" fill="#f5f0e4"/>
                  <circle cx="22" cy="1" r="4" fill="#f5f0e4"/>
                  <circle cx="33" cy="1" r="4" fill="#f5f0e4"/>
                  <circle cx="40" cy="5" r="4" fill="#f5f0e4"/>
                  <circle cx="4" cy="47" r="4" fill="#f5f0e4"/>
                  <circle cx="11" cy="51" r="4" fill="#f5f0e4"/>
                  <circle cx="22" cy="51" r="4" fill="#f5f0e4"/>
                  <circle cx="33" cy="51" r="4" fill="#f5f0e4"/>
                  <circle cx="40" cy="47" r="4" fill="#f5f0e4"/>
                  <circle cx="1" cy="13" r="4" fill="#f5f0e4"/>
                  <circle cx="1" cy="22" r="4" fill="#f5f0e4"/>
                  <circle cx="1" cy="31" r="4" fill="#f5f0e4"/>
                  <circle cx="1" cy="40" r="4" fill="#f5f0e4"/>
                  <circle cx="43" cy="13" r="4" fill="#f5f0e4"/>
                  <circle cx="43" cy="22" r="4" fill="#f5f0e4"/>
                  <circle cx="43" cy="31" r="4" fill="#f5f0e4"/>
                  <circle cx="43" cy="40" r="4" fill="#f5f0e4"/>
                  <rect x="4" y="4" width="36" height="44" rx="1" fill="#c4694f"/>
                  <rect x="8" y="8" width="28" height="36" rx="0.5" fill="none" stroke="rgba(253,248,244,0.3)" strokeWidth="0.6"/>
                  <path d="M22 52 m-12 0 a12 12 0 0 1 24 0" fill="none" id="rcvArc"/>
                  <text fontSize="4" fontWeight="700" letterSpacing="1" fontFamily="system-ui" fill="rgba(253,248,244,0.75)">
                    <textPath href="#rcvArc" startOffset="50%" textAnchor="middle">ALWAYS BE FLIRTING</textPath>
                  </text>
                  <circle cx="22" cy="23" r="6" fill="none" stroke="rgba(253,248,244,0.4)" strokeWidth="0.8"/>
                  <path d="M22 25.5C22 25.5 19.5 23 19.5 21.2C19.5 20 20.6 19.1 21.6 20.2 21.9 20.5 22 21 22 21 22 21 22.1 20.5 22.4 20.2 23.4 19.1 24.5 20 24.5 21.2 24.5 23 22 25.5 22 25.5Z" fill="white"/>
                  <text x="22" y="35" textAnchor="middle" fontSize="5" fontFamily="system-ui" fontWeight="700" letterSpacing="1.5" fill="rgba(253,248,244,0.85)">ABF</text>
                  <text x="22" y="40" textAnchor="middle" fontSize="3.5" fontFamily="system-ui" fill="rgba(253,248,244,0.55)">2026</text>
                </svg>
              </div>
            </div>
            {/* Tap reactions — replacing hold mechanic */}
            <div style={{ padding: '7px 10px', borderTop: '0.5px solid #ddd0bc', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
              <span style={{ fontSize: 10, color: '#c8b8a0', fontFamily: 'system-ui', letterSpacing: '0.06em', marginRight: 8 }}>react</span>
              {reactionSaved ? (
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, fontStyle: 'italic', color: '#c4694f' }}>{reactionSaved === 'this_is_so_you' ? 'this is so you' : reactionSaved === 'made_my_day' ? 'made my day' : 'saving this'}</span>
              ) : (
                <>
                  <button onClick={() => saveReaction('this_is_so_you')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#8b7355', fontFamily: 'Georgia, serif', fontStyle: 'italic', cursor: 'pointer', padding: '3px 6px', borderRadius: 3 }}>this is so you</button>
                  <span style={{ color: '#ddd0bc', fontSize: 10 }}> · </span>
                  <button onClick={() => saveReaction('made_my_day')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#8b7355', fontFamily: 'Georgia, serif', fontStyle: 'italic', cursor: 'pointer', padding: '3px 6px', borderRadius: 3 }}>made my day</button>
                  <span style={{ color: '#ddd0bc', fontSize: 10 }}> · </span>
                  <button onClick={() => saveReaction('saving_this')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#8b7355', fontFamily: 'Georgia, serif', fontStyle: 'italic', cursor: 'pointer', padding: '3px 6px', borderRadius: 3 }}>saving this</button>
                </>
              )}
            </div>
            {/* Nav */}
            {received.length > 1 && (
              <div style={{ display: 'flex', gap: 12, padding: '4px 10px 8px' }}>
                {currentIndex > 0 && <button onClick={() => setCurrentIndex(i => i - 1)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#b0a8a0', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', padding: 0 }}>← prev</button>}
                {currentIndex < received.length - 1 && <button onClick={() => setCurrentIndex(i => i + 1)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#b0a8a0', cursor: 'pointer', fontFamily: 'Georgia, serif', fontStyle: 'italic', padding: 0 }}>next →</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // SENT STATE
  if (view === 'sent') {
    return (
      <div style={{ margin: '0 16px 16px' }}>
        <style>{POSTCARD_STYLES}</style>
        <div style={{ background: '#f5f0e4', border: '0.5px solid #c8b8a0', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid #ddd0bc' }}>
            <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 3, color: '#c8b8a0', fontFamily: 'system-ui' }}>SENT</span>
            <button onClick={() => { setCardFlipped(false); setView('home') }} style={{ background: 'none', border: 'none', fontSize: 18, color: '#b0a8a0', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
          </div>
          {sent.map(f => (
            <div key={f.id} style={{ padding: '10px 12px', borderBottom: '0.5px solid #EEE8DC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: '#C9A96E', textTransform: 'uppercase', marginBottom: 2 }}>{f.type}</div>
                <div style={{ fontSize: 13, color: '#2A2420', fontFamily: f.type === 'word' || f.type === 'memory' ? 'Georgia, serif' : 'system-ui', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.type === 'song' ? (f.metadata?.track_name || 'Song') : f.type === 'found' ? (f.metadata?.title || f.metadata?.domain || 'Link') : f.type === 'photo' ? 'Photo' : f.type === 'gif' ? 'GIF' : f.content?.substring(0, 60)}
                </div>
                <div style={{ fontSize: 10, color: '#B0A8A0', fontFamily: 'Georgia, serif', fontStyle: 'italic', marginTop: 2 }}>{formatTimeAgo(f.created_at)}</div>
              </div>
              <div style={{ fontSize: 10, fontFamily: 'system-ui', padding: '2px 8px', borderRadius: 100, flexShrink: 0, background: f.reaction ? 'rgba(201,169,110,0.15)' : '#f0ebe0', color: f.reaction ? '#a07a30' : '#b0a090', border: f.reaction ? 'none' : '0.5px solid #ddd0bc' }}>
                {f.reaction ? 'reacted' : 'delivered'}
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
