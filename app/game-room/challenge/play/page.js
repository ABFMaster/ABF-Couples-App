'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CHALLENGE_PROMPTS, MEMORY_LOCKED_COPY } from '@/lib/challenge-prompts'

const CHALLENGE_LABELS = {
  story: 'Story',
  pitch: 'Pitch',
  rank: 'Rank',
  memory: 'Memory',
  plan: 'Plan',
}

const CHALLENGE_INSTRUCTIONS = {
  story: 'One of you take the keyboard. Write together.',
  pitch: 'One of you take the keyboard. Make your case.',
  rank: 'Drag to reorder. Most at the top, least at the bottom.',
  memory: 'One of you take the keyboard. Answer together.',
  plan: 'One of you take the keyboard. Make it real.',
}

function RankInput({ items, onChange }) {
  const [ranked, setRanked] = useState(items)
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    onChange(ranked.map((item, i) => `${i + 1}. ${item}`).join('\n'))
  }, [ranked])

  function onDragStart(e, index) {
    setDragging(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, index) {
    e.preventDefault()
    if (dragging === null || dragging === index) return
    const reordered = [...ranked]
    const [moved] = reordered.splice(dragging, 1)
    reordered.splice(index, 0, moved)
    setDragging(index)
    setRanked(reordered)
  }

  function onDragEnd() {
    setDragging(null)
  }

  function moveUp(index) {
    if (index === 0) return
    const reordered = [...ranked]
    ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
    setRanked(reordered)
  }

  function moveDown(index) {
    if (index === ranked.length - 1) return
    const reordered = [...ranked]
    ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
    setRanked(reordered)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ranked.map((item, index) => (
        <div
          key={item}
          draggable
          onDragStart={e => onDragStart(e, index)}
          onDragOver={e => onDragOver(e, index)}
          onDragEnd={onDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: dragging === index ? '#F0EBE3' : '#FFFFFF',
            border: '0.5px solid #E8DDD0',
            borderRadius: '12px',
            padding: '12px 16px',
            cursor: 'grab',
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#1C1510',
            color: '#FAF6F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ flex: 1, fontSize: '15px', color: '#1C1510' }}>{item}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => moveUp(index)}
              disabled={index === 0}
              style={{
                background: 'none',
                border: 'none',
                cursor: index === 0 ? 'default' : 'pointer',
                opacity: index === 0 ? 0.2 : 0.6,
                fontSize: '12px',
                padding: '2px 4px',
                lineHeight: 1,
              }}
            >▲</button>
            <button
              onClick={() => moveDown(index)}
              disabled={index === ranked.length - 1}
              style={{
                background: 'none',
                border: 'none',
                cursor: index === ranked.length - 1 ? 'default' : 'pointer',
                opacity: index === ranked.length - 1 ? 0.2 : 0.6,
                fontSize: '12px',
                padding: '2px 4px',
                lineHeight: 1,
              }}
            >▼</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ChallengePlayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const challengeSessionId = searchParams.get('challengeSessionId')
  const challengeType = searchParams.get('type')
  const totalRounds = parseInt(searchParams.get('rounds') || '1')

  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [currentRound, setCurrentRound] = useState(1)
  const [round, setRound] = useState(null)
  const [response, setResponse] = useState('')
  const [rankItems, setRankItems] = useState([])
  const [phase, setPhase] = useState('loading')
  const [noraVerdict, setNoraVerdict] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('couple_id')
        .eq('id', user.id)
        .single()

      if (!profile?.couple_id) { router.push('/dashboard'); return }
      setCoupleId(profile.couple_id)
    }
    init()
  }, [])

  useEffect(() => {
    if (userId && coupleId) generateRound(1)
  }, [userId, coupleId])

  async function generateRound(roundNumber) {
    setPhase('loading')
    setResponse('')
    setNoraVerdict(null)
    setError(null)

    try {
      const res = await fetch('/api/game-room/challenge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          challengeSessionId,
          challengeType,
          roundNumber,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const r = data.round
      setRound(r)

      if (challengeType === 'rank') {
        try {
          const parsed = JSON.parse(r.prompt)
          setRankItems(parsed.items || [])
        } catch {
          setRankItems([])
        }
      }

      setPhase('challenge')
    } catch (err) {
      setError('Something went wrong loading the challenge.')
      setPhase('error')
    }
  }

  async function handleSubmit() {
    if (!response.trim() || submitting) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/game-room/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          challengeSessionId,
          roundId: round.id,
          challengeType,
          prompt: round.prompt,
          coupleResponse: response,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNoraVerdict(data.noraVerdict)
      setPhase('verdict')
    } catch (err) {
      setError('Something went wrong submitting your response.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext() {
    try {
      const res = await fetch('/api/game-room/challenge/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, challengeSessionId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.complete) {
        setComplete(true)
        setPhase('complete')
      } else {
        setCurrentRound(data.nextRound)
        generateRound(data.nextRound)
      }
    } catch (err) {
      setError('Something went wrong advancing to the next round.')
    }
  }

  function getRankPromptData() {
    if (!round) return { intro: '', prompt: '', items: [] }
    try {
      return JSON.parse(round.prompt)
    } catch {
      return { intro: '', prompt: round.prompt, items: [] }
    }
  }

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: '#1C1510', opacity: 0.5 }}>
          Nora is preparing your challenge…
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontSize: '16px', color: '#C1440E', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => generateRound(currentRound)} style={{ padding: '12px 24px', background: '#1C1510', color: '#FAF6F0', border: 'none', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '28px', color: '#1C1510', marginBottom: '12px' }}>
          Challenge complete.
        </p>
        <p style={{ fontSize: '16px', color: '#6B6560', marginBottom: '40px', maxWidth: '320px' }}>
          {totalRounds === 1 ? 'One round. Well played.' : `${totalRounds} rounds. Nora's impressed.`}
        </p>
        <button
          onClick={() => router.push('/game-room')}
          style={{ padding: '14px 32px', background: '#1C1510', color: '#FAF6F0', border: 'none', borderRadius: '14px', fontSize: '16px', cursor: 'pointer' }}
        >
          Back to Game Room
        </button>
      </div>
    )
  }

  const rankData = challengeType === 'rank' ? getRankPromptData() : null

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF6F0', paddingBottom: '40px' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => router.push('/game-room')}
          style={{ background: 'none', border: 'none', fontSize: '15px', color: '#6B6560', cursor: 'pointer', padding: 0 }}
        >
          ← Exit
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6B6560' }}>
            {CHALLENGE_LABELS[challengeType]}
          </span>
          {totalRounds > 1 && (
            <span style={{
              fontSize: '12px',
              background: '#1C1510',
              color: '#FAF6F0',
              padding: '3px 10px',
              borderRadius: '20px',
            }}>
              {currentRound} / {totalRounds}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '32px 24px 0', maxWidth: '480px', margin: '0 auto' }}>

        {/* Challenge prompt */}
        {phase !== 'verdict' && (
          <div style={{ marginBottom: '28px' }}>
            {challengeType === 'rank' && rankData?.intro && (
              <p style={{ fontSize: '14px', color: '#6B6560', marginBottom: '12px', fontStyle: 'italic' }}>
                {rankData.intro}
              </p>
            )}
            <p style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '22px',
              lineHeight: '1.4',
              color: '#1C1510',
              marginBottom: '8px',
            }}>
              {challengeType === 'rank' ? rankData?.prompt : round?.prompt}
            </p>
            <p style={{ fontSize: '13px', color: '#9B9590' }}>
              {CHALLENGE_INSTRUCTIONS[challengeType]}
            </p>
          </div>
        )}

        {/* Input area */}
        {phase === 'challenge' && (
          <>
            {challengeType === 'rank' ? (
              <div style={{ marginBottom: '24px' }}>
                <RankInput
                  items={rankItems}
                  onChange={setResponse}
                />
              </div>
            ) : (
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                placeholder="Write your answer here…"
                style={{
                  width: '100%',
                  minHeight: '160px',
                  padding: '16px',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#1C1510',
                  background: '#FFFFFF',
                  border: '0.5px solid #E8DDD0',
                  borderRadius: '16px',
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: '16px',
                }}
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={!response.trim() || submitting}
              style={{
                width: '100%',
                padding: '16px',
                background: response.trim() ? '#1C1510' : '#E8DDD0',
                color: response.trim() ? '#FAF6F0' : '#9B9590',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: response.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {submitting ? 'Submitting…' : 'Submit our answer'}
            </button>
          </>
        )}

        {/* Nora verdict */}
        {phase === 'verdict' && (
          <div>
            <div style={{
              background: '#1C1510',
              borderRadius: '20px',
              padding: '28px 24px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '12px', color: '#9B8B7A', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Nora's verdict
              </p>
              <p style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '18px',
                lineHeight: '1.6',
                color: '#FAF6F0',
              }}>
                {noraVerdict}
              </p>
            </div>

            {/* Their response recap */}
            <div style={{
              background: '#FFFFFF',
              border: '0.5px solid #E8DDD0',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '12px', color: '#9B9590', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Your answer
              </p>
              <p style={{ fontSize: '15px', color: '#1C1510', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {response}
              </p>
            </div>

            {/* Plan CTA */}
            {challengeType === 'plan' && (
              <div style={{
                background: '#F0EBE3',
                border: '0.5px solid #E8DDD0',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <p style={{ fontSize: '14px', color: '#1C1510', margin: 0 }}>Want to actually do this?</p>
                <button
                  onClick={() => router.push('/dates')}
                  style={{
                    padding: '8px 16px',
                    background: '#1C1510',
                    color: '#FAF6F0',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Plan it →
                </button>
              </div>
            )}

            <button
              onClick={handleNext}
              style={{
                width: '100%',
                padding: '16px',
                background: '#1C1510',
                color: '#FAF6F0',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {currentRound >= totalRounds ? 'Finish' : 'Next round →'}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '14px', color: '#C1440E', marginTop: '16px', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default function ChallengePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '20px', color: '#1C1510', opacity: 0.5 }}>Loading…</p>
      </div>
    }>
      <ChallengePlayContent />
    </Suspense>
  )
}
