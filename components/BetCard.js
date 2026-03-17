'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, Smile, Zap, HeartHandshake, Flame, Waves } from 'lucide-react'

const REACTIONS = [
  { icon: Heart, key: 'heart', label: 'Loved it' },
  { icon: Smile, key: 'smile', label: 'Made me smile' },
  { icon: Zap, key: 'zap', label: 'Surprised me' },
  { icon: HeartHandshake, key: 'handshake', label: 'Felt so us' },
]

const RATINGS = [
  { icon: Flame, key: 'more', label: 'Keep it coming' },
  { icon: Waves, key: 'easier', label: 'Ease up a bit' },
]

const TRELLIS = [
  'repeating-linear-gradient(45deg, rgba(212,168,83,0.06) 0px, rgba(212,168,83,0.06) 1px, transparent 1px, transparent 8px)',
  'repeating-linear-gradient(-45deg, rgba(212,168,83,0.06) 0px, rgba(212,168,83,0.06) 1px, transparent 1px, transparent 8px)',
].join(', ')

function CardBack() {
  return (
    <div style={{
      height: '100%',
      background: '#2A1E14',
      backgroundImage: TRELLIS,
      border: '1.5px solid #D4A853',
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    }}>
      <div style={{ width: '20px', height: '20px', background: '#D4A853', transform: 'rotate(45deg)', opacity: 0.8 }} />
      <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', marginTop: '2px' }}>The Bet</p>
      <p style={{ fontSize: '11px', color: '#5A4A38', marginTop: '4px' }}>tap to reveal</p>
    </div>
  )
}

export default function BetCard({ bet, mine, theirs, partnerId, partnerName, userId, coupleId }) {
  const [localMine, setLocalMine] = useState(mine)
  const [localTheirs, setLocalTheirs] = useState(theirs)
  const [actualText, setActualText] = useState('')
  const [predictionText, setPredictionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState(mine?.reaction_icon ?? null)
  const [selectedRating, setSelectedRating] = useState(mine?.question_rating ?? null)
  const [actualFocused, setActualFocused] = useState(false)
  const [predictionFocused, setPredictionFocused] = useState(false)

  const hasSubmitted = !!(localMine?.prediction && localMine?.actual_answer)
  const partnerSubmitted = !!(localTheirs?.prediction && localTheirs?.actual_answer)
  const bothSubmitted = hasSubmitted && partnerSubmitted
  const noraReaction = localMine?.nora_reaction
  const noraReady = !!noraReaction

  let state
  if (!hasSubmitted) state = 'A'
  else if (!bothSubmitted) state = 'B'
  else state = 'D'

  const activeReaction = localMine?.reaction_icon || selectedReaction
  const activeRating = localMine?.question_rating || selectedRating
  const isSealed = !!(activeReaction && activeRating)

  // Pre-set all reveal states if mounting into a completed game
  const initiallyInD = !!(
    mine?.prediction && mine?.actual_answer &&
    theirs?.prediction && theirs?.actual_answer &&
    mine?.nora_reaction && mine?.nora_intro
  )
  const [revealStarted, setRevealStarted] = useState(initiallyInD)
  const [flipped, setFlipped] = useState([initiallyInD, initiallyInD, initiallyInD, initiallyInD])
  const [noraReactionShown, setNoraReactionShown] = useState(initiallyInD)
  const [pillsShown, setPillsShown] = useState(initiallyInD)
  const revealAnimFired = useRef(initiallyInD)

  // Reaction pill tap pulse
  const [pulsingDown, setPulsingDown] = useState(null)
  const [pulsingUp, setPulsingUp] = useState(null)

  const allFlipped = flipped.every(f => f)
  const flipCard = (i) => setFlipped(prev => { const next = [...prev]; next[i] = true; return next })

  // Sequential reveal after all cards flipped
  useEffect(() => {
    if (!allFlipped) return
    if (revealAnimFired.current) return
    revealAnimFired.current = true
    const t1 = setTimeout(() => setNoraReactionShown(true), 500)
    const t2 = setTimeout(() => setPillsShown(true), 800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [allFlipped])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/bet/today?userId=${userId}&bet=true`)
      const data = await res.json()
      if (data.theirs) setLocalTheirs(data.theirs)
      if (data.mine) setLocalMine(prev => ({ ...prev, ...data.mine }))
    } catch {}
  }, [userId])

  useEffect(() => {
    if (state === 'B') {
      const interval = setInterval(poll, 8000)
      return () => clearInterval(interval)
    }
    if (state === 'D' && !noraReady) {
      const interval = setInterval(poll, 2000)
      return () => clearInterval(interval)
    }
  }, [state, noraReady, poll])

  const triggerPulse = (key) => {
    setPulsingDown(key)
    setTimeout(() => { setPulsingDown(null); setPulsingUp(key) }, 75)
    setTimeout(() => setPulsingUp(null), 150)
  }

  const handleSubmit = async () => {
    if (!actualText.trim() || !predictionText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bet/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          betId: bet.id,
          userId,
          coupleId,
          prediction: predictionText.trim(),
          actualAnswer: actualText.trim(),
        }),
      })
      const data = await res.json()
      setLocalMine(prev => ({
        ...(prev || {}),
        prediction: predictionText.trim(),
        actual_answer: actualText.trim(),
        responded_at: new Date().toISOString(),
        ...(data.mine || {}),
        ...(data.noraReaction ? { nora_reaction: data.noraReaction } : {}),
        ...(data.noraIntro ? { nora_intro: data.noraIntro } : {}),
      }))
      if (data.theirs) setLocalTheirs(data.theirs)
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleReaction = (icon) => {
    triggerPulse(icon)
    setSelectedReaction(icon)
    fetch('/api/bet/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betId: bet.id, userId, reactionIcon: icon, questionRating: activeRating }),
    }).catch(() => {})
  }

  const handleRating = (rating) => {
    triggerPulse(rating)
    setSelectedRating(rating)
    fetch('/api/bet/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betId: bet.id, userId, reactionIcon: activeReaction, questionRating: rating }),
    }).catch(() => {})
  }

  const fadeStyle = (shown, duration = 500) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(8px)',
    transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
  })

  const textareaStyle = (focused) => ({
    width: '100%',
    background: '#1C1510',
    border: `1.5px solid ${focused ? '#D4A853' : '#3D2E1E'}`,
    borderRadius: '10px',
    padding: '12px',
    fontSize: '15px',
    color: '#F5ECD7',
    lineHeight: 1.5,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 150ms',
  })

  // State A
  if (state === 'A') {
    return (
      <div style={{ background: '#1C1510', borderRadius: '20px', padding: '24px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
          The Bet
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#F5ECD7', lineHeight: 1.35, textAlign: 'center', marginBottom: '24px', fontWeight: 400 }}>
          {bet.question}
        </p>

        <div style={{ background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '4px' }}>Your answer</p>
          <p style={{ fontSize: '12px', color: '#C4B49A', marginBottom: '10px' }}>Answer for yourself</p>
          <textarea
            value={actualText}
            onChange={e => setActualText(e.target.value)}
            placeholder="Give your honest answer..."
            rows={3}
            style={textareaStyle(actualFocused)}
            onFocus={() => setActualFocused(true)}
            onBlur={() => setActualFocused(false)}
            className="placeholder-[#5A4A38]"
          />
        </div>

        <div style={{ background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '4px' }}>Your bet</p>
          <p style={{ fontSize: '12px', color: '#C4B49A', marginBottom: '10px' }}>What will {partnerName} say?</p>
          <textarea
            value={predictionText}
            onChange={e => setPredictionText(e.target.value)}
            placeholder="Predict their answer..."
            rows={3}
            style={textareaStyle(predictionFocused)}
            onFocus={() => setPredictionFocused(true)}
            onBlur={() => setPredictionFocused(false)}
            className="placeholder-[#5A4A38]"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!actualText.trim() || !predictionText.trim() || submitting}
          style={{
            width: '100%',
            padding: '14px',
            background: '#D4A853',
            color: '#1C1510',
            fontSize: '15px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '30px',
            cursor: 'pointer',
            opacity: (!actualText.trim() || !predictionText.trim() || submitting) ? 0.4 : 1,
            transition: 'opacity 150ms',
          }}
        >
          Lock in my bet
        </button>
      </div>
    )
  }

  // State B
  if (state === 'B') {
    return (
      <div style={{ background: '#1C1510', borderRadius: '20px', padding: '24px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '12px' }}>
          The Bet
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#C4B49A', lineHeight: 1.35, textAlign: 'center', marginBottom: '20px', fontWeight: 400 }}>
          {bet.question}
        </p>

        <div style={{ background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '8px' }}>Your answer</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#F5ECD7', lineHeight: 1.45 }}>{localMine?.actual_answer}</p>
        </div>

        <div style={{ background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '8px' }}>
            Your bet on {partnerName}
          </p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#F5ECD7', lineHeight: 1.45 }}>{localMine?.prediction}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5A4A38', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: '#5A4A38' }}>{partnerName} is thinking…</p>
        </div>
      </div>
    )
  }

  // State D — Phase 1: Nora pre-reveal
  if (!revealStarted) {
    return (
      <div style={{ background: '#1C1510', borderRadius: '20px', padding: '24px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '24px' }}>
          The Bet
        </p>

        {!noraReady ? (
          <p
            className="animate-pulse"
            style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#F5ECD7', textAlign: 'center', lineHeight: 1.45, fontWeight: 400 }}
          >
            Nora is reading the room…
          </p>
        ) : (
          <>
            {localMine?.nora_intro && (
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#F5ECD7', textAlign: 'center', lineHeight: 1.45, marginBottom: '28px', fontWeight: 400 }}>
                {localMine.nora_intro}
              </p>
            )}
            <button
              onClick={() => setRevealStarted(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#D4A853',
                color: '#1C1510',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
              }}
            >
              Reveal the cards
            </button>
          </>
        )}
      </div>
    )
  }

  // State D — Phase 2: Card flip reveal
  const cards = [
    { label: `${partnerName} said`, text: localTheirs?.actual_answer },
    { label: `You bet ${partnerName} would say`, text: localMine?.prediction },
    { label: 'You said', text: localMine?.actual_answer },
    { label: `${partnerName} bet you would say`, text: localTheirs?.prediction },
  ]

  const reactionObj = REACTIONS.find(r => r.key === activeReaction)
  const ratingObj = RATINGS.find(r => r.key === activeRating)
  const ReactionIcon = reactionObj?.icon
  const RatingIcon = ratingObj?.icon

  return (
    <div style={{ background: '#1C1510', borderRadius: '20px', padding: '24px' }}>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#C4B49A', textAlign: 'center', lineHeight: 1.35, marginBottom: '20px', fontWeight: 400 }}>
        {bet.question}
      </p>

      {/* 2x2 flip card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {cards.map((card, i) => (
          <div key={i} style={{ height: '150px', perspective: '800px', WebkitPerspective: '800px' }}>
            <div
              onClick={() => !flipped[i] && flipCard(i)}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: flipped[i] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                cursor: flipped[i] ? 'default' : 'pointer',
              }}
            >
              {/* Front: card back design */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}>
                <CardBack />
              </div>
              {/* Back: answer content */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: '#2A1E14',
                border: '1.5px solid #3D2E1E',
                borderRadius: '14px',
                padding: '12px',
                overflow: 'hidden',
              }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '6px', lineHeight: 1.2 }}>
                  {card.label}
                </p>
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#F5ECD7', lineHeight: 1.45 }}>
                  {card.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nora reaction — fades in 500ms after all cards flipped */}
      {noraReaction && (
        <div style={{ marginTop: '20px', ...fadeStyle(noraReactionShown, 500) }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D4A853', flexShrink: 0, marginTop: '4px' }} />
            <div>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '4px' }}>Nora</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#C4B49A', fontStyle: 'italic', lineHeight: 1.5 }}>
                {noraReaction}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reaction + rating pills — fades in 300ms after Nora */}
      <div style={fadeStyle(pillsShown, 300)}>
        {isSealed ? (
          <div style={{ marginTop: '20px' }}>
            {ReactionIcon && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#D4A853' }}><ReactionIcon size={16} strokeWidth={1.75} /></span>
                <span style={{ fontSize: '13px', color: '#C4B49A' }}>{reactionObj.label}</span>
              </div>
            )}
            {RatingIcon && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#D4A853' }}><RatingIcon size={14} strokeWidth={1.75} /></span>
                <span style={{ fontSize: '13px', color: '#C4B49A' }}>{ratingObj.label}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A4A38', marginBottom: '10px', fontWeight: 600 }}>
                How did this land?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {REACTIONS.map(({ icon: Icon, key, label }) => {
                  const isActive = activeReaction === key
                  const scale = pulsingDown === key ? 0.97 : pulsingUp === key ? 1.02 : 1
                  return (
                    <button
                      key={key}
                      onClick={() => handleReaction(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 16px',
                        background: '#2A1E14',
                        border: `1.5px solid ${isActive ? '#D4A853' : '#3D2E1E'}`,
                        borderRadius: '30px',
                        color: isActive ? '#D4A853' : '#C4B49A',
                        cursor: 'pointer',
                        transform: `scale(${scale})`,
                        transition: 'transform 75ms ease-out, border-color 150ms, color 150ms',
                      }}
                    >
                      <span style={{ color: '#D4A853' }}><Icon size={16} strokeWidth={1.75} /></span>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5A4A38', marginBottom: '10px', fontWeight: 600 }}>
                Was this the right depth?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {RATINGS.map(({ icon: Icon, key, label }) => {
                  const isActive = activeRating === key
                  const scale = pulsingDown === key ? 0.97 : pulsingUp === key ? 1.02 : 1
                  return (
                    <button
                      key={key}
                      onClick={() => handleRating(key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        background: '#2A1E14',
                        border: `1.5px solid ${isActive ? '#D4A853' : '#3D2E1E'}`,
                        borderRadius: '30px',
                        color: isActive ? '#D4A853' : '#C4B49A',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transform: `scale(${scale})`,
                        transition: 'transform 75ms ease-out, border-color 150ms, color 150ms',
                      }}
                    >
                      <span style={{ color: '#D4A853' }}><Icon size={14} strokeWidth={1.75} /></span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
