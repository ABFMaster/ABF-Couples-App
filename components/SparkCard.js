'use client'

import { useState } from 'react'
import { Clock, Heart, Smile, Zap, HeartHandshake, Flame, Waves } from 'lucide-react'

const REACTIONS = [
  { icon: Heart, key: 'heart' },
  { icon: Smile, key: 'smile' },
  { icon: Zap, key: 'zap' },
  { icon: HeartHandshake, key: 'handshake' },
]

const RATINGS = [
  { icon: Flame, key: 'more', label: 'More' },
  { icon: Waves, key: 'easier', label: 'Easier' },
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
  const [selectedReaction, setSelectedReaction] = useState(null)
  const [selectedRating, setSelectedRating] = useState(null)

  const hasAnswered = !!mine?.responded_at
  const partnerAnswered = !!theirs?.responded_at
  const hasReacted = !!mine?.reaction_icon

  let state
  if (!hasAnswered) state = 'A'
  else if (!partnerAnswered) state = 'B'
  else if (!hasReacted) state = 'C'
  else state = 'D'

  const handleRespond = async () => {
    if (!answerText.trim()) return
    await onRespond(answerText.trim())
  }

  const handleReaction = async (icon) => {
    setSelectedReaction(icon)
    await onReact(icon, null)
  }

  const handleRating = async (rating) => {
    setSelectedRating(rating)
    await onReact(null, rating)
  }

  const activeReaction = mine?.reaction_icon || selectedReaction
  const activeRating = mine?.question_rating || selectedRating

  const questionEl = (
    <p
      className="text-[22px] text-neutral-900 leading-snug text-center"
      style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
    >
      {spark.question}
    </p>
  )

  if (state === 'A') {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        {!sparkIntroShown && (
          <p
            className="text-[13px] text-[#E8614D] italic text-center mb-5"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Starting you somewhere comfortable. Things will get more interesting.
          </p>
        )}
        <div className="mb-6">{questionEl}</div>
        <textarea
          value={answerText}
          onChange={e => setAnswerText(e.target.value)}
          placeholder="What comes to mind..."
          rows={4}
          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-[15px] text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none focus:border-[#E8614D] transition-colors"
        />
        <button
          onClick={handleRespond}
          disabled={!answerText.trim()}
          className="w-full mt-3 py-3 bg-[#E8614D] text-white text-[15px] font-semibold rounded-full active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Share my answer
        </button>
        {(mine?.skip_count == null || mine.skip_count < 2) && (
          <div className="text-center mt-3">
            <button
              onClick={onSkip}
              className="text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Not feeling this one
            </button>
          </div>
        )}
      </div>
    )
  }

  if (state === 'B') {
    return (
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
        <div className="mb-5">{questionEl}</div>
        <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2">Your answer</p>
          <p className="text-[15px] text-neutral-800 leading-relaxed">{mine?.response_text}</p>
        </div>
        <div className="flex items-center gap-2 mt-4 text-neutral-400">
          <Clock size={13} strokeWidth={2} />
          <p className="text-[13px]">{partnerName} hasn't answered yet</p>
        </div>
      </div>
    )
  }

  // State C and D
  return (
    <div>
      <div className="mb-5">{questionEl}</div>

      <div className="flex flex-col gap-3">
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2">You</p>
          <p className="text-[15px] text-neutral-800 leading-relaxed">{mine?.response_text}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400 mb-2">{partnerName}</p>
          <p className="text-[15px] text-neutral-800 leading-relaxed">{theirs?.response_text}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2.5">
          How did their answer land?
        </p>
        <div className="flex gap-2">
          {REACTIONS.map(({ icon: Icon, key }) => (
            <button
              key={key}
              onClick={() => handleReaction(key)}
              className={`flex-1 py-2.5 rounded-full border flex items-center justify-center transition-all active:scale-[0.95] ${
                activeReaction === key
                  ? 'bg-[#E8614D] border-[#E8614D] text-white'
                  : 'bg-white border-neutral-200 text-neutral-500'
              }`}
            >
              <Icon size={18} strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400 mb-2.5">
          How was the question?
        </p>
        <div className="flex gap-2">
          {RATINGS.map(({ icon: Icon, key, label }) => (
            <button
              key={key}
              onClick={() => handleRating(key)}
              className={`flex-1 py-2.5 rounded-full border flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-all active:scale-[0.95] ${
                activeRating === key
                  ? 'bg-[#E8614D] border-[#E8614D] text-white'
                  : 'bg-white border-neutral-200 text-neutral-500'
              }`}
            >
              <Icon size={14} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {state === 'D' && mine?.nora_reaction && (
        <div className="mt-5 flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#E8614D] animate-pulse flex-shrink-0 mt-1.5" />
          <div>
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
            <p
              className="text-[13px] text-neutral-500 italic leading-relaxed mt-0.5"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {mine.nora_reaction}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
