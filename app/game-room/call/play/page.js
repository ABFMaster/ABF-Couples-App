'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function CallPlayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const callSessionId = searchParams.get('callSessionId')

  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(5)
  const [round, setRound] = useState(null)
  const [isHotSeat, setIsHotSeat] = useState(false)
  const [phase, setPhase] = useState('loading')
  const [myAnswer, setMyAnswer] = useState(null)
  const [partnerAnswer, setPartnerAnswer] = useState(null)
  const [noraComment, setNoraComment] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [explanationSubmitted, setExplanationSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [verdict, setVerdict] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)
  const coupleRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: couple } = await supabase
        .from('couples')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()
      if (!couple) { router.push('/connect'); return }
      setCoupleId(couple.id)
      coupleRef.current = couple

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      if (myProfile?.display_name) setUserName(myProfile.display_name)
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      const { data: callSession } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', callSessionId)
        .maybeSingle()
      if (!callSession) { router.push('/game-room'); return }
      setCurrentRound(callSession.current_round)
      setTotalRounds(callSession.total_rounds)

      // Determine hot seat for round 1 — user1 is hot seat on odd rounds, user2 on even rounds
      const hotSeatUserId = callSession.current_round % 2 === 1 ? couple.user1_id : couple.user2_id
      setIsHotSeat(user.id === hotSeatUserId)

      // Host generates round 1
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('host_user_id')
        .eq('id', sessionId)
        .maybeSingle()

      setIsHost(sess?.host_user_id === user.id)

      if (sess?.host_user_id === user.id) {
        const res = await fetch('/api/game-room/call/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            coupleId: couple.id,
            callSessionId,
            roundNumber: callSession.current_round,
            hotSeatUserId,
          }),
        })
        const data = await res.json()
        if (data.round) setRound(data.round)
      }

      setLoading(false)
      setPhase('answering')
    }
    init()
  }, [router])

  // Poll for round, partner answer, and session status
  useEffect(() => {
    if (!callSessionId || !userId) return
    pollRef.current = setInterval(async () => {
      // Check for abandoned session
      const { data: sessStatus } = await supabase
        .from('game_sessions')
        .select('status')
        .eq('id', sessionId)
        .maybeSingle()
      if (sessStatus?.status === 'abandoned') {
        clearInterval(pollRef.current)
        router.push('/game-room')
        return
      }

      // Poll for round if not loaded yet
      if (!round) {
        const { data: callSession } = await supabase
          .from('call_sessions')
          .select('current_round')
          .eq('id', callSessionId)
          .maybeSingle()
        const { data: roundData } = await supabase
          .from('call_rounds')
          .select('*')
          .eq('session_id', callSessionId)
          .eq('round_number', callSession?.current_round || currentRound)
          .maybeSingle()
        if (roundData) setRound(roundData)
        return
      }

      // Poll for both answers
      if (phase === 'answering' && myAnswer !== null) {
        const { data: roundData } = await supabase
          .from('call_rounds')
          .select('*')
          .eq('id', round.id)
          .maybeSingle()
        if (roundData?.hot_seat_answer && roundData?.predictor_answer && roundData?.nora_comment) {
          clearInterval(pollRef.current)
          setPartnerAnswer(isHotSeat ? roundData.predictor_answer : roundData.hot_seat_answer)
          setNoraComment(roundData.nora_comment)
          const correct = roundData.correct
          if (correct) setScore(prev => prev + 1)
          setPhase('reveal')
        }
      }

      if (phase === 'reveal' && !isHost) {
        const { data: callSession } = await supabase
          .from('call_sessions')
          .select('current_round, status')
          .eq('id', callSessionId)
          .maybeSingle()
        if (callSession?.status === 'complete') {
          clearInterval(pollRef.current)
          loadVerdict()
          return
        }
        if (callSession?.current_round > currentRound) {
          const { data: nextRoundData } = await supabase
            .from('call_rounds')
            .select('*')
            .eq('session_id', callSessionId)
            .eq('round_number', callSession.current_round)
            .maybeSingle()
          if (!nextRoundData) return
          clearInterval(pollRef.current)
          const couple = coupleRef.current
          const hotSeatUserId = callSession.current_round % 2 === 1 ? couple.user1_id : couple.user2_id
          setPhase('loading_round')
          setTimeout(() => {
            setCurrentRound(callSession.current_round)
            setRound(nextRoundData)
            setMyAnswer(null)
            setPartnerAnswer(null)
            setNoraComment(null)
            setExplanation('')
            setExplanationSubmitted(false)
            setIsHotSeat(userId === hotSeatUserId)
            setPhase('answering')
          }, 1200)
        }
      }

      // Poll for explanation submitted — advance to next round
      if (phase === 'explanation') {
        const { data: roundData } = await supabase
          .from('call_rounds')
          .select('hot_seat_explanation, status')
          .eq('id', round.id)
          .maybeSingle()
        if (roundData?.hot_seat_explanation && roundData?.status === 'answered') {
          clearInterval(pollRef.current)
          setPhase('next')
        }
      }

      // Poll for next round
      if (phase === 'next') {
        const { data: callSession } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('id', callSessionId)
          .maybeSingle()
        if (callSession?.status === 'complete') {
          clearInterval(pollRef.current)
          loadVerdict()
          return
        }
        if (callSession?.current_round > currentRound) {
          const { data: nextRoundData } = await supabase
            .from('call_rounds')
            .select('*')
            .eq('session_id', callSessionId)
            .eq('round_number', callSession.current_round)
            .maybeSingle()
          if (!nextRoundData) return
          clearInterval(pollRef.current)
          const couple = coupleRef.current
          const hotSeatUserId = callSession.current_round % 2 === 1 ? couple.user1_id : couple.user2_id
          setCurrentRound(callSession.current_round)
          setRound(nextRoundData)
          setMyAnswer(null)
          setPartnerAnswer(null)
          setNoraComment(null)
          setExplanation('')
          setExplanationSubmitted(false)
          setIsHotSeat(userId === hotSeatUserId)
          setPhase('answering')
        }
      }
    }, 2000)
    return () => clearInterval(pollRef.current)
  }, [callSessionId, userId, round, phase, myAnswer, currentRound])

  const handleAnswer = async (option) => {
    if (myAnswer || submitting) return
    setSubmitting(true)
    setMyAnswer(option)
    try {
      await fetch('/api/game-room/call/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSessionId,
          roundId: round.id,
          userId,
          answer: option,
          isHotSeat,
        }),
      })
    } catch {} finally { setSubmitting(false) }
  }

  const handleExplanation = async () => {
    if (!explanation.trim() || explanationSubmitted) return
    setExplanationSubmitted(true)
    try {
      await fetch('/api/game-room/call/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId: round.id, explanation }),
      })
      setPhase('next')
    } catch {}
  }

  const handleSkipExplanation = async () => {
    if (explanationSubmitted) return
    setExplanationSubmitted(true)
    await fetch('/api/game-room/call/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: round.id, explanation: '—' }),
    })
  }

  const handleNext = async () => {
    const res = await fetch('/api/game-room/call/next', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSessionId, coupleId }),
    })
    const data = await res.json()
    if (data.complete) {
      loadVerdict()
    } else {
      setCurrentRound(data.nextRound)
      setRound(null)
      setMyAnswer(null)
      setPartnerAnswer(null)
      setNoraComment(null)
      setExplanation('')
      setExplanationSubmitted(false)
      const couple = coupleRef.current
      const hotSeatUserId = data.nextRound % 2 === 1 ? couple.user1_id : couple.user2_id
      setIsHotSeat(userId === hotSeatUserId)
      setPhase('answering')

      // Host generates next round
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('host_user_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (sess?.host_user_id === userId) {
        const genRes = await fetch('/api/game-room/call/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            coupleId,
            callSessionId,
            roundNumber: data.nextRound,
            hotSeatUserId,
          }),
        })
        const genData = await genRes.json()
        if (genData.round) setRound(genData.round)
      }
    }
  }

  const loadVerdict = async () => {
    setPhase('verdict_loading')
    const couple = coupleRef.current
    // Predictor is whoever is NOT the hot seat on the final round
    const finalHotSeatUserId = totalRounds % 2 === 1 ? couple.user1_id : couple.user2_id
    const predictorUserId = finalHotSeatUserId === couple.user1_id ? couple.user2_id : couple.user1_id
    const res = await fetch('/api/game-room/call/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSessionId, coupleId, score, totalRounds, predictorUserId }),
    })
    const data = await res.json()
    setVerdict(data.verdict)
    setPhase('verdict')
  }

  const handleEndGame = async () => {
    try {
      await supabase
        .from('game_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId)
      router.push('/game-room')
    } catch {}
  }

  if (loading || phase === 'loading' || phase === 'loading_round') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>Nora is reading the room...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (phase === 'verdict_loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>Nora is tallying the damage...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (phase === 'verdict') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <div style={{ padding: '48px 24px 120px' }}>
          <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Nora · The Verdict</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '48px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 4px' }}>{score}/{totalRounds}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>{verdict}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => router.push('/game-room/lobby?mode=the-call&forceNew=true')} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
              Play again 📞
            </button>
            <button onClick={() => router.push('/game-room')} style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}>
              Back to Game Room
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const options = round ? [
    { key: 'option_a', label: round.option_a },
    { key: 'option_b', label: round.option_b },
    { key: 'option_c', label: round.option_c },
  ] : []

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={handleEndGame} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', padding: 0 }}>End game</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Round {currentRound} of {totalRounds}</span>
            <span style={{ fontSize: '11px', background: '#1E1B4B', color: '#FFFFFF', padding: '3px 10px', borderRadius: '20px' }}>{score} correct</span>
          </div>
        </div>

        {/* Role indicator */}
        <div style={{ background: isHotSeat ? '#FEF3C7' : '#EEF2FF', border: `0.5px solid ${isHotSeat ? '#FDE68A' : '#C7D2FE'}`, borderRadius: '12px', padding: '10px 16px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: isHotSeat ? '#92400E' : '#3730A3', margin: 0 }}>
            {isHotSeat ? `🔥 You're in the hot seat — ${partnerName} is predicting you` : `🎯 You're predicting ${partnerName}`}
          </p>
        </div>

        {/* Scenario card */}
        {round ? (
          <>
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>
                {isHotSeat ? 'The scenario' : `What would ${partnerName} do?`}
              </p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', lineHeight: 1.5, color: '#FFFFFF', margin: 0 }}>{round.scenario}</p>
            </div>

            {/* Options */}
            {phase === 'answering' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {options.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(opt.key)}
                    disabled={!!myAnswer}
                    style={{
                      background: myAnswer === opt.key ? '#EEF2FF' : '#FFFFFF',
                      border: `2px solid ${myAnswer === opt.key ? '#4338CA' : '#E8DDD0'}`,
                      borderRadius: '16px',
                      padding: '18px 20px',
                      textAlign: 'left',
                      cursor: myAnswer ? 'default' : 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: myAnswer === opt.key ? '#4338CA' : '#1A1A1A', margin: 0, lineHeight: 1.5 }}>{isHotSeat ? opt.label : `${partnerName} would: ${opt.label}`}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Waiting for partner */}
            {phase === 'answering' && myAnswer && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Waiting for {partnerName}...
                </div>
              </div>
            )}

            {/* Reveal */}
            {phase === 'reveal' && (
              <div style={{ animation: 'slideIn 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, background: '#EEF2FF', border: '2px solid #4338CA', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: '#4338CA', margin: '0 0 6px', fontWeight: 700 }}>{isHotSeat ? 'You' : partnerName}</p>
                    <p style={{ fontSize: '13px', color: '#1A1A1A', margin: 0, fontWeight: 600 }}>{options.find(o => o.key === (isHotSeat ? myAnswer : partnerAnswer))?.label}</p>
                  </div>
                  <div style={{ flex: 1, background: round.correct ? '#ECFDF5' : '#FEF2F2', border: `2px solid ${round.correct ? '#6EE7B7' : '#FECACA'}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: round.correct ? '#065F46' : '#DC2626', margin: '0 0 6px', fontWeight: 700 }}>{isHotSeat ? partnerName : 'You'} {round.correct ? '✓' : '✗'}</p>
                    <p style={{ fontSize: '13px', color: '#1A1A1A', margin: 0, fontWeight: 600 }}>{options.find(o => o.key === (isHotSeat ? partnerAnswer : myAnswer))?.label}</p>
                  </div>
                </div>

                {/* Nora comment */}
                {noraComment && (
                  <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '14px 18px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                      <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Nora</p>
                    </div>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', fontStyle: 'italic', margin: 0 }}>{noraComment}</p>
                  </div>
                )}

                {/* Explanation — hot seat only */}
                {isHotSeat && !explanationSubmitted && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px', textAlign: 'center' }}>Tell {partnerName} why</p>
                    <textarea
                      value={explanation}
                      onChange={e => setExplanation(e.target.value)}
                      placeholder="One sentence..."
                      style={{ width: '100%', background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '14px', fontSize: '14px', fontFamily: "'Fraunces', Georgia, serif", color: '#1A1A1A', resize: 'none', height: '80px', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={handleSkipExplanation} style={{ flex: 1, padding: '12px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '13px', color: '#9CA3AF', cursor: 'pointer' }}>Skip</button>
                      <button onClick={handleExplanation} disabled={!explanation.trim()} style={{ flex: 2, padding: '12px', background: explanation.trim() ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0', color: explanation.trim() ? '#FFFFFF' : '#B8A898', border: 'none', borderRadius: '30px', fontSize: '13px', fontWeight: 600, cursor: explanation.trim() ? 'pointer' : 'not-allowed' }}>Send it</button>
                    </div>
                  </div>
                )}

                {/* Predictor or after explanation — Next button */}
                {isHost ? (
                  (!isHotSeat || explanationSubmitted) && (
                    <button onClick={handleNext} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>
                      {currentRound >= totalRounds ? 'See the verdict ✦' : 'Next round →'}
                    </button>
                  )
                ) : (
                  (!isHotSeat || explanationSubmitted) && (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                        Waiting for {partnerName}...
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: '14px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
              Nora is setting the scene...
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default function CallPlayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CallPlayContent />
    </Suspense>
  )
}
