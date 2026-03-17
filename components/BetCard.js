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

export default function BetCard({ bet, mine, theirs, partnerId, partnerName, userId, coupleId }) {
  const [localMine, setLocalMine] = useState(mine)
  const [localTheirs, setLocalTheirs] = useState(theirs)
  const [actualText, setActualText] = useState('')
  const [predictionText, setPredictionText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedReaction, setSelectedReaction] = useState(mine?.reaction_icon ?? null)
  const [selectedRating, setSelectedRating] = useState(mine?.question_rating ?? null)

  const hasSubmitted = !!(localMine?.prediction && localMine?.actual_answer)
  const partnerSubmitted = !!(localTheirs?.prediction && localTheirs?.actual_answer)
  const bothSubmitted = hasSubmitted && partnerSubmitted
  const noraReaction = localMine?.nora_reaction

  let state
  if (!hasSubmitted) state = 'A'
  else if (!bothSubmitted) state = 'B'
  else if (!noraReaction) state = 'NORA_LOADING'
  else state = 'D'

  const activeReaction = localMine?.reaction_icon || selectedReaction
  const activeRating = localMine?.question_rating || selectedRating
  const isSealed = !!(activeReaction && activeRating)

  // Animation states — pre-set if component mounts already in State D
  const initiallyInD = !!(
    mine?.prediction && mine?.actual_answer &&
    theirs?.prediction && theirs?.actual_answer &&
    mine?.nora_reaction
  )
  const [panel1Shown, setPanel1Shown] = useState(initiallyInD)
  const [panel2Shown, setPanel2Shown] = useState(initiallyInD)
  const [panel3Shown, setPanel3Shown] = useState(initiallyInD)
  const [panel4Shown, setPanel4Shown] = useState(initiallyInD)
  const [noraShown, setNoraShown] = useState(initiallyInD)
  const [pillsShown, setPillsShown] = useState(initiallyInD)
  const animationFired = useRef(initiallyInD)

  // Reaction pill tap pulse
  const [pulsingDown, setPulsingDown] = useState(null)
  const [pulsingUp, setPulsingUp] = useState(null)

  useEffect(() => {
    if (state !== 'D') return
    if (animationFired.current) return
    animationFired.current = true
    const t1 = setTimeout(() => setPanel1Shown(true), 50)
    const t2 = setTimeout(() => setPanel2Shown(true), 200)
    const t3 = setTimeout(() => setPanel3Shown(true), 350)
    const t4 = setTimeout(() => setPanel4Shown(true), 500)
    const t5 = setTimeout(() => setNoraShown(true), 650)
    const t6 = setTimeout(() => setPillsShown(true), 950)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6) }
  }, [state])

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/bet/today?userId=${userId}&bet=true`)
      const data = await res.json()
      if (data.theirs) setLocalTheirs(data.theirs)
      if (data.mine) setLocalMine(prev => ({ ...prev, ...data.mine }))
    } catch {}
  }, [userId])

  useEffect(() => {
    if (state !== 'B' && state !== 'NORA_LOADING') return
    const interval = setInterval(poll, state === 'NORA_LOADING' ? 2000 : 8000)
    return () => clearInterval(interval)
  }, [state, poll])

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

  const revealStyle = (shown) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
  })

  const questionEl = (
    <p
      className="text-[22px] text-neutral-900 leading-snug text-center"
      style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
    >
      {bet.question}
    </p>
  )

  const questionSmall = (
    <p
      className="text-[15px] text-neutral-400 leading-snug text-center"
      style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
    >
      {bet.question}
    </p>
  )

  // State A — Enter both answers at once
  if (state === 'A') {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <div className="mb-6">{questionEl}</div>

        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 mb-3">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-0.5">Your answer</p>
          <p className="text-[12px] text-neutral-400 mb-2">Answer for yourself — who do you think it is?</p>
          <textarea
            value={actualText}
            onChange={e => setActualText(e.target.value)}
            placeholder="Give your honest answer..."
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-[#E8614D] transition-colors"
          />
        </div>

        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 mb-4">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-0.5">Your bet</p>
          <p className="text-[12px] text-neutral-400 mb-2">What will {partnerName} say?</p>
          <textarea
            value={predictionText}
            onChange={e => setPredictionText(e.target.value)}
            placeholder="Predict their answer..."
            rows={3}
            className="w-full bg-white border border-neutral-200 rounded-lg p-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-[#E8614D] transition-colors"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!actualText.trim() || !predictionText.trim() || submitting}
          className="w-full py-3 bg-[#E8614D] text-white text-[15px] font-semibold rounded-full active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Lock in my bet
        </button>
      </div>
    )
  }

  // State B — Waiting for partner
  if (state === 'B') {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <div className="mb-5">{questionSmall}</div>

        <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4 mb-2">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2">Your answer</p>
          <p className="text-[15px] text-neutral-800 leading-relaxed">{localMine?.actual_answer}</p>
        </div>

        <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4 mb-4">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2">
            Your bet on {partnerName}
          </p>
          <p className="text-[15px] text-neutral-800 leading-relaxed">{localMine?.prediction}</p>
        </div>

        <div className="flex items-center gap-2 text-neutral-400">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-pulse flex-shrink-0" />
          <p className="text-[13px]">{partnerName} is thinking…</p>
        </div>
      </div>
    )
  }

  // NORA_LOADING — Both submitted, waiting for Nora reaction
  if (state === 'NORA_LOADING') {
    return (
      <div className="flex items-center justify-center py-12">
        <p
          className="text-[18px] text-neutral-400 animate-pulse"
          style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
        >
          Nora is reading the room…
        </p>
      </div>
    )
  }

  // State D — Full reveal with sequential animations
  const reactionObj = REACTIONS.find(r => r.key === activeReaction)
  const ratingObj = RATINGS.find(r => r.key === activeRating)
  const ReactionIcon = reactionObj?.icon
  const RatingIcon = ratingObj?.icon

  return (
    <div>
      <div className="mb-5">{questionEl}</div>

      {/* 2x2 reveal grid — panels stagger 150ms apart */}
      <div className="grid grid-cols-2 gap-2">
        <div style={revealStyle(panel1Shown)} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2 leading-tight">
            {partnerName} said
          </p>
          <p className="text-[14px] text-neutral-800 leading-relaxed">{localTheirs?.actual_answer}</p>
        </div>
        <div style={revealStyle(panel2Shown)} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2 leading-tight">
            You bet {partnerName} would say
          </p>
          <p className="text-[14px] text-neutral-800 leading-relaxed">{localMine?.prediction}</p>
        </div>
        <div style={revealStyle(panel3Shown)} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2 leading-tight">
            You said
          </p>
          <p className="text-[14px] text-neutral-800 leading-relaxed">{localMine?.actual_answer}</p>
        </div>
        <div style={revealStyle(panel4Shown)} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2 leading-tight">
            {partnerName} bet you would say
          </p>
          <p className="text-[14px] text-neutral-800 leading-relaxed">{localTheirs?.prediction}</p>
        </div>
      </div>

      {/* Nora reaction — 600ms after first panel */}
      {noraReaction && (
        <div style={{ marginTop: '1.25rem', ...revealStyle(noraShown) }} className="flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#E8614D] animate-pulse flex-shrink-0 mt-1.5" />
          <div>
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
            <p
              className="text-[13px] text-neutral-500 italic leading-relaxed mt-0.5"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {noraReaction}
            </p>
          </div>
        </div>
      )}

      {/* Reaction + rating pills — 300ms after Nora */}
      <div style={revealStyle(pillsShown)}>
        {isSealed ? (
          <div className="mt-5">
            {ReactionIcon && (
              <div className="flex items-center gap-2">
                <span className="text-[#E8614D]"><ReactionIcon size={16} strokeWidth={1.75} /></span>
                <span className="text-[13px] text-neutral-500">{reactionObj.label}</span>
              </div>
            )}
            {RatingIcon && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[#E8614D]"><RatingIcon size={14} strokeWidth={1.75} /></span>
                <span className="text-[13px] text-neutral-500">{ratingObj.label}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2.5">
                How did this land?
              </p>
              <div className="flex flex-col gap-2">
                {REACTIONS.map(({ icon: Icon, key, label }) => {
                  const scale = pulsingDown === key ? 0.97 : pulsingUp === key ? 1.02 : 1
                  return (
                    <button
                      key={key}
                      onClick={() => handleReaction(key)}
                      style={{ transform: `scale(${scale})`, transition: 'transform 75ms ease-out' }}
                      className={`w-full py-2.5 px-4 rounded-full border flex items-center gap-2 transition-colors ${
                        activeReaction === key
                          ? 'bg-[#E8614D] border-[#E8614D] text-white'
                          : 'bg-white border-neutral-200 text-neutral-500'
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      <span className="text-[13px] font-medium">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2.5">
                Was this the right depth?
              </p>
              <div className="flex gap-2">
                {RATINGS.map(({ icon: Icon, key, label }) => {
                  const scale = pulsingDown === key ? 0.97 : pulsingUp === key ? 1.02 : 1
                  return (
                    <button
                      key={key}
                      onClick={() => handleRating(key)}
                      style={{ transform: `scale(${scale})`, transition: 'transform 75ms ease-out' }}
                      className={`flex-1 py-2.5 rounded-full border flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                        activeRating === key
                          ? 'bg-[#E8614D] border-[#E8614D] text-white'
                          : 'bg-white border-neutral-200 text-neutral-500'
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.75} />
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
