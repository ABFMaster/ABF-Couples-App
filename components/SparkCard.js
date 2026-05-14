'use client'

import { useState, useEffect } from 'react'
import { Clock, Heart, Smile, Zap, HeartHandshake, Flame, Waves } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  onInvite,
}) {
  const [answerText, setAnswerText] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState(mine?.reaction_icon ?? null)
  const [selectedRating, setSelectedRating] = useState(mine?.question_rating ?? null)
  const [reactionComplete, setReactionComplete] = useState(false)

  useEffect(() => { if (mine?.reaction_icon && !selectedReaction) setSelectedReaction(mine.reaction_icon) }, [mine?.reaction_icon])

  useEffect(() => {
    if (selectedReaction && selectedRating) {
      const timer = setTimeout(() => setReactionComplete(true), 800)
      return () => clearTimeout(timer)
    }
  }, [selectedReaction, selectedRating])

  useEffect(() => {
    if (mine?.reaction_icon && mine?.question_rating) setReactionComplete(true)
  }, [mine?.reaction_icon, mine?.question_rating])

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
  else state = 'C'

  useEffect(() => {
    if (state !== 'C') return
    const t1 = setTimeout(() => setPartnerCardShown(true), 300)
    const t2 = setTimeout(() => setMyCardShown(true), 1800)
    const t3 = setTimeout(() => setNoraShown(true), 3200)
    const t4 = setTimeout(() => setPillsShown(true), 5000)
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/spark/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ sparkId: spark.id, reactionIcon: icon }),
      }).catch(() => {})
    }).catch(() => {})
  }

  const handleRating = (rating) => {
    triggerPulse(rating)
    setSelectedRating(rating)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      fetch('/api/spark/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ sparkId: spark.id, questionRating: rating }),
      }).catch(() => {})
    }).catch(() => {})
  }

  const revealStyle = (shown) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(24px)',
    transition: 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
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
      {spark.question.replace(/{partnerName}/g, partnerName || 'your partner')}
    </p>
  )

  const questionMuted = (
    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#7A6455', textAlign: 'center', lineHeight: 1.35, fontWeight: 400 }}>
      {spark.question.replace(/{partnerName}/g, partnerName || 'your partner')}
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
        <p style={{ fontSize: '13px', color: '#A09080', fontStyle: 'italic', textAlign: 'center', marginBottom: '12px' }}>Answer about {partnerName} — you'll see their answer after you both respond.</p>
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
          Your answer is in. Nora is holding it.
        </p>
        {onInvite && (
          <button
            onClick={async () => { await onInvite(); setInviteSent(true) }}
            disabled={inviteSent}
            style={{ background: 'none', border: 'none', fontSize: '13px', color: inviteSent ? '#B8A898' : '#C1440E', cursor: inviteSent ? 'default' : 'pointer', marginTop: '12px', padding: 0, fontWeight: 500 }}
          >
            {inviteSent ? '✓ Invited' : `Invite ${partnerName}`}
          </button>
        )}
        {mine?.nora_solo_insight && (
          <div style={{ marginTop: '16px', paddingLeft: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C1440E', flexShrink: 0 }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', margin: 0 }}>Nora</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#5C3D2E', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
              {mine.nora_solo_insight}
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
      <div style={{ marginBottom: '24px' }}>{questionMuted}</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {/* Partner's answer — the reveal, most visual weight */}
        <div style={{
          background: '#FFF8F4',
          borderRadius: '16px',
          padding: '22px 22px 20px',
          ...revealStyle(partnerCardShown)
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: '#C1440E', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>{partnerName}</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#2C1810', lineHeight: 1.6, margin: 0 }}>{theirs?.response_text}</p>
        </div>

        {/* Visual connector between the two answers */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 22px', ...revealStyle(myCardShown) }}>
          <div style={{ width: '1px', height: '20px', background: '#E8DDD0', marginLeft: '2px' }} />
        </div>

        {/* Your answer — contrast to partner's */}
        <div style={{
          background: '#FFFFFF',
          border: '0.5px solid #E8DDD0',
          borderLeft: '3px solid #C1440E',
          borderRadius: '0 14px 14px 0',
          padding: '18px 20px',
          ...revealStyle(myCardShown)
        }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: '#A0522D', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>You</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2C1810', lineHeight: 1.6, margin: 0 }}>{mine?.response_text}</p>
        </div>
      </div>

      {/* Nora — no card, just presence */}
      <div style={{ marginTop: '28px', paddingLeft: '4px', ...revealStyle(noraShown) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C1440E', flexShrink: 0 }} />
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#A0522D', textTransform: 'uppercase', margin: 0 }}>Nora</p>
        </div>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#5C3D2E', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
          {mine?.nora_reaction}
        </p>
      </div>

      {/* Separator */}
      <div style={{ height: '0.5px', background: '#E8DDD0', margin: '24px 0 0', ...revealStyle(pillsShown) }} />

      {/* Reactions — compact summary when complete, full tabs otherwise */}
      <div style={{ ...revealStyle(pillsShown), marginTop: '20px' }}>
        {reactionComplete ? (() => {
          const reactionObj = REACTIONS.find(r => r.key === activeReaction)
          const ratingObj = RATINGS.find(r => r.key === activeRating)
          const ReactionIcon = reactionObj?.icon
          const RatingIcon = ratingObj?.icon
          return (
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#A09080', fontStyle: 'italic', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0 }}>
              {ReactionIcon && <span style={{ color: '#C1440E' }}><ReactionIcon size={14} strokeWidth={1.75} /></span>}
              {reactionObj?.label}
              {reactionObj && ratingObj && <span style={{ color: '#E8DDD0' }}>·</span>}
              {RatingIcon && <span style={{ color: '#C1440E' }}><RatingIcon size={13} strokeWidth={1.75} /></span>}
              {ratingObj?.label}
            </p>
          )
        })() : (
          <>
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
                      gap: '10px',
                      width: '100%',
                      padding: '12px 18px',
                      background: isActive ? '#FFF8F4' : '#FFFFFF',
                      border: `0.5px solid ${isActive ? '#C1440E' : '#E8DDD0'}`,
                      borderRadius: '30px',
                      color: '#5C3D2E',
                      cursor: 'pointer',
                      transform: `scale(${scale})`,
                      transition: 'transform 75ms ease-out, border-color 150ms, background 150ms',
                    }}
                  >
                    <span style={{ color: '#C1440E' }}><Icon size={16} strokeWidth={1.75} /></span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{label}</span>
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
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
                      padding: '11px',
                      background: isActive ? '#FFF8F4' : '#FFFFFF',
                      border: `0.5px solid ${isActive ? '#C1440E' : '#E8DDD0'}`,
                      borderRadius: '30px',
                      color: '#5C3D2E',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      transform: `scale(${scale})`,
                      transition: 'transform 75ms ease-out, border-color 150ms, background 150ms',
                    }}
                  >
                    <span style={{ color: '#C1440E' }}><Icon size={14} strokeWidth={1.75} /></span>
                    {label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
