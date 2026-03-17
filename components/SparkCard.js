'use client'

import { useState, useEffect } from 'react'
import { Clock, Heart, Smile, Zap, HeartHandshake, Flame, Waves } from 'lucide-react'

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

export default function SparkCard({
  spark,
  mine,
  theirs,
  partnerName,
  sparkIntroShown,
  onRespond,
  onSkip,
  onReact,
}) {
  const [answerText, setAnswerText] = useState('')
  const [selectedReaction, setSelectedReaction] = useState(mine?.reaction_icon ?? null)
  const [selectedRating, setSelectedRating] = useState(mine?.question_rating ?? null)

  // State C reveal animation states
  const [partnerCardShown, setPartnerCardShown] = useState(false)
  const [myCardShown, setMyCardShown] = useState(false)
  const [noraShown, setNoraShown] = useState(false)
  const [pillsShown, setPillsShown] = useState(false)

  // Reaction pill tap pulse
  const [pulsingDown, setPulsingDown] = useState(null)
  const [pulsingUp, setPulsingUp] = useState(null)

  const hasAnswered = !!mine?.responded_at
  const partnerAnswered = !!theirs?.responded_at

  const activeReaction = mine?.reaction_icon || selectedReaction
  const activeRating = mine?.question_rating || selectedRating

  let state
  if (!hasAnswered) state = 'A'
  else if (!partnerAnswered) state = 'B'
  else if (mine?.reaction_icon || (selectedReaction && selectedRating)) state = 'D'
  else state = 'C'

  useEffect(() => {
    if (state !== 'C') return
    const t1 = setTimeout(() => setPartnerCardShown(true), 0)
    const t2 = setTimeout(() => setMyCardShown(true), 150)
    const t3 = setTimeout(() => setNoraShown(true), 200)
    const t4 = setTimeout(() => setPillsShown(true), 400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [state])

  const triggerPulse = (key) => {
    setPulsingDown(key)
    setTimeout(() => { setPulsingDown(null); setPulsingUp(key) }, 75)
    setTimeout(() => setPulsingUp(null), 150)
  }

  const handleRespond = async () => {
    if (!answerText.trim()) return
    await onRespond(answerText.trim())
  }

  const handleReaction = (icon) => {
    triggerPulse(icon)
    setSelectedReaction(icon)
    onReact(icon, activeRating).catch(() => {})
  }

  const handleRating = (rating) => {
    triggerPulse(rating)
    setSelectedRating(rating)
    onReact(activeReaction, rating).catch(() => {})
  }

  const revealStyle = (shown) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(40px)',
    transition: 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
  })

  const wrapperStyle = {
    background: '#FAF6F0',
    border: '0.5px solid #E8DDD0',
    borderRadius: '20px',
    padding: '24px',
  }

  const sparkLabel = (
    <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#A0522D', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
      The Spark
    </p>
  )

  const questionLarge = (
    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '24px', color: '#2C1810', textAlign: 'center', lineHeight: 1.35, fontWeight: 400 }}>
      {spark.question}
    </p>
  )

  const questionMuted = (
    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#7A6455', textAlign: 'center', lineHeight: 1.35, fontWeight: 400 }}>
      {spark.question}
    </p>
  )

  if (state === 'A') {
    return (
      <div style={wrapperStyle}>
        {sparkLabel}
        {!sparkIntroShown && (
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#C1440E', fontStyle: 'italic', textAlign: 'center', marginBottom: '20px' }}>
            Starting you somewhere comfortable. Things will get more interesting.
          </p>
        )}
        <div style={{ marginBottom: '24px' }}>{questionLarge}</div>
        <textarea
          value={answerText}
          onChange={e => setAnswerText(e.target.value)}
          placeholder="What comes to mind..."
          rows={4}
          style={{
            width: '100%',
            background: '#FAF6F0',
            border: '0.5px solid #E8DDD0',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '15px',
            color: '#2C1810',
            fontFamily: "'Fraunces', Georgia, serif",
            lineHeight: 1.5,
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 150ms',
          }}
          onFocus={e => { e.target.style.borderColor = '#C1440E' }}
          onBlur={e => { e.target.style.borderColor = '#E8DDD0' }}
        />
        <button
          onClick={handleRespond}
          disabled={!answerText.trim()}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '14px',
            background: '#C1440E',
            color: '#FAF6F0',
            fontSize: '15px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '30px',
            cursor: !answerText.trim() ? 'not-allowed' : 'pointer',
            opacity: !answerText.trim() ? 0.4 : 1,
            transition: 'opacity 150ms',
          }}
        >
          Share my answer
        </button>
        {(mine?.skip_count == null || mine.skip_count < 2) && (
          <button
            onClick={onSkip}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              background: 'transparent',
              border: '0.5px solid #E8DDD0',
              borderRadius: '30px',
              color: '#B8A898',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Not feeling this one
          </button>
        )}
      </div>
    )
  }

  if (state === 'B') {
    return (
      <div style={wrapperStyle}>
        {sparkLabel}
        <div style={{ marginBottom: '20px' }}>{questionMuted}</div>
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderLeft: '3px solid #C1440E', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '8px' }}>Your answer</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.55 }}>{mine?.response_text}</p>
        </div>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#B8A898', fontStyle: 'italic', marginTop: '16px' }}>
          {partnerName} hasn't answered yet…
        </p>
      </div>
    )
  }

  if (state === 'D') {
    const reactionObj = REACTIONS.find(r => r.key === activeReaction)
    const ratingObj = RATINGS.find(r => r.key === activeRating)
    const ReactionIcon = reactionObj?.icon
    const RatingIcon = ratingObj?.icon
    return (
      <div style={wrapperStyle}>
        {sparkLabel}
        <div style={{ marginBottom: '20px' }}>{questionMuted}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderLeft: '3px solid #C1440E', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '8px' }}>You</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.55 }}>{mine?.response_text}</p>
          </div>
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '14px', padding: '18px 20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '8px' }}>{partnerName}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.55 }}>{theirs?.response_text}</p>
          </div>
        </div>
        {ReactionIcon && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#C1440E' }}><ReactionIcon size={16} strokeWidth={1.75} /></span>
            <span style={{ fontSize: '13px', color: '#5C3D2E' }}>{reactionObj.label}</span>
          </div>
        )}
        {RatingIcon && (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#C1440E' }}><RatingIcon size={14} strokeWidth={1.75} /></span>
            <span style={{ fontSize: '13px', color: '#5C3D2E' }}>{ratingObj.label}</span>
          </div>
        )}
        {mine?.nora_reaction && (
          <div style={{ marginTop: '20px', background: '#FFF8F4', border: '0.5px solid #E8C8B8', borderRadius: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C1440E', flexShrink: 0 }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase' }}>Nora</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#5C3D2E', lineHeight: 1.65, fontStyle: 'italic' }}>
              {mine.nora_reaction}
            </p>
          </div>
        )}
      </div>
    )
  }

  // State C — animated reveal
  return (
    <div style={wrapperStyle}>
      {sparkLabel}
      <div style={{ marginBottom: '20px' }}>{questionMuted}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Partner's answer first — moment of drama */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '14px', padding: '18px 20px', ...revealStyle(partnerCardShown) }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '8px' }}>{partnerName}</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.55 }}>{theirs?.response_text}</p>
        </div>
        {/* Your answer second */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderLeft: '3px solid #C1440E', borderRadius: '0 14px 14px 0', padding: '18px 20px', ...revealStyle(myCardShown) }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '8px' }}>You</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.55 }}>{mine?.response_text}</p>
        </div>
      </div>

      {/* Nora block — always in DOM, fades in 200ms after partner card */}
      <div style={{ marginTop: '16px', ...revealStyle(noraShown) }}>
        <div style={{ background: '#FFF8F4', border: '0.5px solid #E8C8B8', borderRadius: '14px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C1440E', flexShrink: 0 }} />
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase' }}>Nora</p>
          </div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#5C3D2E', lineHeight: 1.65, fontStyle: 'italic' }}>
            {mine?.nora_reaction}
          </p>
        </div>
      </div>

      {/* Pills — always in DOM, fades in 400ms after partner card */}
      <div style={revealStyle(pillsShown)}>
        <div style={{ marginTop: '20px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B8A898', marginBottom: '10px', fontWeight: 600 }}>
            How did their answer land?
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
                    background: '#FFFFFF',
                    border: `0.5px solid ${isActive ? '#C1440E' : '#E8DDD0'}`,
                    borderRadius: '30px',
                    color: '#5C3D2E',
                    cursor: 'pointer',
                    transform: `scale(${scale})`,
                    transition: 'transform 75ms ease-out, border-color 150ms',
                  }}
                >
                  <span style={{ color: '#C1440E' }}><Icon size={16} strokeWidth={1.75} /></span>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B8A898', marginBottom: '10px', fontWeight: 600 }}>
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
                    background: '#FFFFFF',
                    border: `0.5px solid ${isActive ? '#C1440E' : '#E8DDD0'}`,
                    borderRadius: '30px',
                    color: '#5C3D2E',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    transform: `scale(${scale})`,
                    transition: 'transform 75ms ease-out, border-color 150ms',
                  }}
                >
                  <span style={{ color: '#C1440E' }}><Icon size={14} strokeWidth={1.75} /></span>
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
