'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { getTierLabel } from '@/lib/hot-take-questions'

function HotTakeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdFromUrl = searchParams.get('sessionId')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [session, setSession] = useState(null)
  const [together, setTogether] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [myAnswer, setMyAnswer] = useState(null)
  const [partnerAnswer, setPartnerAnswer] = useState(null)
  const [bothAnswered, setBothAnswered] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [noraComment, setNoraComment] = useState(null)
  const [agreed, setAgreed] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [isUser1, setIsUser1] = useState(false)
  const [summary, setSummary] = useState(null)
  const [answers, setAnswers] = useState([]) // all answers for summary
  const [showSummary, setShowSummary] = useState(false)
  const [tierPreference, setTierPreference] = useState(null) // null = not yet set
  const [noraInsight, setNoraInsight] = useState(null)
  const [loadingInsight, setLoadingInsight] = useState(false)
  const pollRef = useRef(null)
  const tierPollRef = useRef(null)
  const nextPollRef = useRef(null)
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

      const user1 = couple.user1_id === user.id
      setIsUser1(user1)

      const partnerId = user1 ? couple.user2_id : couple.user1_id
      const [{ data: myProfile }, { data: partnerProfile }] = await Promise.all([
        supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_profiles').select('display_name').eq('user_id', partnerId).maybeSingle(),
      ])
      if (myProfile?.display_name) setUserName(myProfile.display_name)
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      // Get active session — prefer sessionId from URL
      let sess = null
      if (sessionIdFromUrl) {
        const { data } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionIdFromUrl)
          .maybeSingle()
        sess = data
      } else {
        const { data } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('couple_id', couple.id)
          .eq('mode', 'hot-take')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        sess = data
      }

      if (!sess) { router.push('/game-room'); return }
      setSession(sess)
      setTogether(sess.together || false)

      setLoading(false)
    }
    init()
  }, [router])

  // Always-on session status watcher — detects abandoned regardless of answer state
  useEffect(() => {
    if (!session?.id) return
    const abandonPoll = setInterval(async () => {
      const { data: sessStatus } = await supabase
        .from('game_sessions')
        .select('status')
        .eq('id', session.id)
        .maybeSingle()
      if (sessStatus?.status === 'abandoned') {
        clearInterval(abandonPoll)
        router.push('/game-room')
      }
    }, 3000)
    return () => clearInterval(abandonPoll)
  }, [session])

  const handleStartGame = async (tiers) => {
    if (!session || !coupleId) return
    setTierPreference(tiers)
    clearInterval(tierPollRef.current)
    await supabase
      .from('hot_take_sessions')
      .delete()
      .eq('session_id', session.id)
    const res = await fetch('/api/game-room/hot-take/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, coupleId, tiers, count: 15 }),
    })
    const data = await res.json()
    setQuestions(data.questions || [])
  }

  const handleAnswer = async (answer) => {
    if (submitting || myAnswer !== null) return
    setSubmitting(true)
    setMyAnswer(answer)

    const currentQ = questions[currentIndex]
    try {
      const res = await fetch('/api/game-room/hot-take/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          coupleId,
          userId,
          questionId: currentQ.id,
          answer,
        }),
      })
      const data = await res.json()

      if (data.bothAnswered) {
        setBothAnswered(true)
        setPartnerAnswer(data.partnerAnswer)
        setNoraComment(data.noraComment)
        setAgreed(data.agreed)
        setAnswers(prev => [...prev, { question: currentQ, myAnswer: answer, partnerAnswer: data.partnerAnswer, agreed: data.agreed, noraComment: data.noraComment }])
        clearInterval(pollRef.current)
      }
    } catch {} finally { setSubmitting(false) }
  }

  // Poll for partner answer (remote mode)
  useEffect(() => {
    if (!session?.id || !userId || myAnswer === null || bothAnswered) return
    pollRef.current = setInterval(async () => {
      const { data: sessStatus } = await supabase
        .from('game_sessions')
        .select('status')
        .eq('id', session.id)
        .maybeSingle()
      if (sessStatus?.status === 'abandoned') {
        clearInterval(pollRef.current)
        router.push('/game-room')
        return
      }

      const currentQ = questions[currentIndex]
      if (!currentQ) return

      const { data: answerRow } = await supabase
        .from('hot_take_answers')
        .select('*')
        .eq('session_id', session.id)
        .eq('question_id', currentQ.id)
        .maybeSingle()

      if (answerRow) {
        const couple = coupleRef.current
        const user1 = couple?.user1_id === userId
        const partnerAns = user1 ? answerRow.user2_answer : answerRow.user1_answer

        // Wait for nora_comment to be written before triggering reveal
        if (partnerAns !== null && partnerAns !== undefined && answerRow.nora_comment !== null) {
          clearInterval(pollRef.current)
          setBothAnswered(true)
          setPartnerAnswer(partnerAns)
          setNoraComment(answerRow.nora_comment)
          setAgreed(answerRow.agreed)
          setAnswers(prev => [...prev, {
            question: questions[currentIndex],
            myAnswer,
            partnerAnswer: partnerAns,
            agreed: answerRow.agreed,
            noraComment: answerRow.nora_comment,
          }])
          setCountdown(null)
        }
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [session, userId, myAnswer, bothAnswered, together, currentIndex, questions])

  useEffect(() => {
    if (!bothAnswered || countdown === 0) return
    if (countdown === null) {
      setCountdown(3)
      return
    }
    const t = setTimeout(() => setCountdown(prev => prev - 1), 900)
    return () => clearTimeout(t)
  }, [bothAnswered, countdown])

  // Poll for tier selection by partner — advances both users when questions are locked
  useEffect(() => {
    if (!session?.id || tierPreference !== null || questions.length > 0) return
    tierPollRef.current = setInterval(async () => {
      const { data: htSession } = await supabase
        .from('hot_take_sessions')
        .select('questions')
        .eq('session_id', session.id)
        .maybeSingle()
      if (htSession?.questions?.length > 0) {
        clearInterval(tierPollRef.current)
        setQuestions(htSession.questions)
        setTierPreference('locked')
      }
    }, 2000)
    return () => clearInterval(tierPollRef.current)
  }, [session, tierPreference, questions.length])

  // Poll for partner advancing to next question or summary
  useEffect(() => {
    if (!session?.id || !bothAnswered || countdown !== 0) return
    nextPollRef.current = setInterval(async () => {
      const { data: htSession } = await supabase
        .from('hot_take_sessions')
        .select('current_index, show_summary')
        .eq('session_id', session.id)
        .maybeSingle()
      if (!htSession) return
      if (htSession.show_summary) {
        clearInterval(nextPollRef.current)
        setShowSummary(true)
        return
      }
      if (htSession.current_index > currentIndex) {
        clearInterval(nextPollRef.current)
        setCurrentIndex(htSession.current_index)
        setMyAnswer(null)
        setPartnerAnswer(null)
        setBothAnswered(false)
        setNoraComment(null)
        setAgreed(null)
        setCountdown(null)
      }
    }, 2000)
    return () => clearInterval(nextPollRef.current)
  }, [session, bothAnswered, countdown, currentIndex])

  const handleNext = async () => {
    clearInterval(nextPollRef.current)
    const isLast = currentIndex >= questions.length - 1
    if (isLast) {
      // Write show_summary to DB so partner navigates too
      await supabase
        .from('hot_take_sessions')
        .update({ show_summary: true })
        .eq('session_id', session.id)
      setShowSummary(true)
      return
    }
    const nextIndex = currentIndex + 1
    // Write new index to DB so partner advances
    await supabase
      .from('hot_take_sessions')
      .update({ current_index: nextIndex })
      .eq('session_id', session.id)
    setCurrentIndex(nextIndex)
    setMyAnswer(null)
    setPartnerAnswer(null)
    setBothAnswered(false)
    setNoraComment(null)
    setAgreed(null)
    setCountdown(null)
  }

  const handleSkip = () => {
    if (currentIndex >= questions.length - 1) {
      setShowSummary(true)
      return
    }
    setCurrentIndex(prev => prev + 1)
    setMyAnswer(null)
    setPartnerAnswer(null)
    setBothAnswered(false)
    setNoraComment(null)
    setAgreed(null)
    setCountdown(null)
  }

  const handleEndGame = async () => {
    if (!session?.id) return
    try {
      await supabase
        .from('game_sessions')
        .update({ status: 'abandoned' })
        .eq('id', session.id)
      router.push('/game-room')
    } catch {}
  }

  useEffect(() => {
    if (!showSummary || answers.length === 0) return
    const disagreedAnswers = answers.filter(a => !a.agreed)
    const surprisingOne = disagreedAnswers[0] || answers[answers.length - 1]
    if (!surprisingOne) return
    setLoadingInsight(true)
    fetch('/api/game-room/hot-take/summary-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surprisingQuestion: surprisingOne.question.text,
        myAnswer: surprisingOne.myAnswer,
        partnerAnswer: surprisingOne.partnerAnswer,
        userName,
        partnerName,
        allAnswers: answers,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.insight) setNoraInsight(d.insight) })
      .catch(() => {})
      .finally(() => setLoadingInsight(false))
  }, [showSummary])

  const agreedCount = answers.filter(a => a.agreed).length

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Tier selection screen
  if (tierPreference === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <div style={{ padding: '48px 24px 120px' }}>
          <button onClick={handleEndGame} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', padding: '0 0 24px' }}>End game</button>

          <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Hot Take</p>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 8px' }}>How deep are we going?</h1>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', margin: 0 }}>Pick a vibe. Nora picks the takes.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { tiers: [1], label: 'Warm Up', description: 'Fun, light, no wrong answers. Great for a first round.', icon: '☀️' },
              { tiers: [1, 2], label: 'Getting Real', description: 'Opinions start to matter. Things get interesting.', icon: '🌶️' },
              { tiers: [1, 2, 3], label: 'Go Deep', description: 'All tiers. Some of these will stay with you.', icon: '🕳️' },
              { tiers: [3], label: 'Just the Hard Ones', description: 'Tier 3 only. Not for the faint of heart.', icon: '🔥' },
            ].map(opt => (
              <button
                key={opt.label}
                onClick={() => handleStartGame(opt.tiers)}
                style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '20px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>{opt.icon}</div>
                <div>
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1A1A1A', margin: '0 0 4px' }}>{opt.label}</p>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Summary screen
  if (showSummary) {
    const disagreedAnswers = answers.filter(a => !a.agreed)
    const surprisingOne = disagreedAnswers[0] || answers[answers.length - 1]

    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <div style={{ padding: '48px 24px 120px' }}>
          <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 8px' }}>Nora · Round Complete</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '32px', fontWeight: 400, color: '#FFFFFF', margin: '0 0 4px' }}>{agreedCount}/{answers.length}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>
              {agreedCount === answers.length ? "You agreed on everything. Suspicious." : agreedCount >= answers.length * 0.7 ? "Mostly aligned. The gaps are the interesting part." : agreedCount >= answers.length * 0.5 ? "You two are more different than you admit." : "Chaos. Beautiful chaos."}
            </p>
          </div>

          {surprisingOne && (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 700 }}>The one that surprised me most</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.55, margin: '0 0 10px' }}>{surprisingOne.question.text}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, background: '#EEF2FF', borderRadius: '10px', padding: '8px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: '#4338CA', margin: '0 0 2px', fontWeight: 700 }}>You</p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', margin: 0 }}>{surprisingOne.myAnswer ? '👍 Agree' : '👎 Disagree'}</p>
                </div>
                <div style={{ flex: 1, background: '#F5F3FF', borderRadius: '10px', padding: '8px 12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: '#7C3AED', margin: '0 0 2px', fontWeight: 700 }}>{partnerName}</p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', margin: 0 }}>{surprisingOne.partnerAnswer ? '👍 Agree' : '👎 Disagree'}</p>
                </div>
              </div>
            </div>
          )}

          {(loadingInsight || noraInsight) && (
            <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '18px 20px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Nora</p>
              </div>
              {loadingInsight ? (
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: 'rgba(99,60,180,0.4)', fontStyle: 'italic', margin: 0 }}>Nora is reading the room...</p>
              ) : (
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{noraInsight}</p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => router.push('/game-room/lobby?mode=hot-take&forceNew=true')}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
            >
              Play another round 🔥
            </button>
            <button
              onClick={() => router.push('/game-room')}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Back to Game Room
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  if (!currentQ) return null

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={handleEndGame} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', padding: 0 }}>End game</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{currentIndex + 1} / {questions.length}</span>
            <button onClick={handleSkip} style={{ background: 'none', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '4px 12px', fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}>Skip</button>
          </div>
        </div>

        {/* Tier label */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', fontWeight: 700 }}>
            {getTierLabel(currentQ.tier)} · {currentQ.category.replace('_', ' ')}
          </span>
        </div>

        {/* The take */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '32px 24px', marginBottom: '24px', minHeight: '160px', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#FFFFFF', lineHeight: 1.55, margin: 0, position: 'relative' }}>
            {currentQ.text}
          </p>
        </div>

        {/* Answer buttons — before answering */}
        {myAnswer === null && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <button
              onClick={() => handleAnswer(true)}
              disabled={submitting}
              style={{ flex: 1, padding: '20px', background: '#FFFFFF', border: '2px solid #E8DDD0', borderRadius: '20px', fontSize: '28px', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <span>👍</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>Agree</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={submitting}
              style={{ flex: 1, padding: '20px', background: '#FFFFFF', border: '2px solid #E8DDD0', borderRadius: '20px', fontSize: '28px', cursor: 'pointer', transition: 'all 150ms', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <span>👎</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>Disagree</span>
            </button>
          </div>
        )}

        {/* Countdown overlay */}
        {bothAnswered && countdown !== null && countdown > 0 && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 200ms ease-out',
          }}>
            <p style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: '160px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1,
              animation: 'popIn 300ms cubic-bezier(0.22, 1, 0.36, 1)',
              key: countdown,
            }}>{countdown}</p>
            <p style={{ fontSize: '13px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', margin: '24px 0 0' }}>Get ready</p>
          </div>
        )}

        {/* My answer locked — waiting for partner */}
        {myAnswer !== null && !bothAnswered && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ background: myAnswer ? '#ECFDF5' : '#FEF2F2', border: `2px solid ${myAnswer ? '#6EE7B7' : '#FECACA'}`, borderRadius: '20px', padding: '20px', marginBottom: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 4px' }}>{myAnswer ? '👍' : '👎'}</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>You {myAnswer ? 'agree' : 'disagree'}</p>
            </div>
            {!together && (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Waiting for {partnerName}...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reveal — both answered */}
        {bothAnswered && countdown === 0 && (
          <div style={{ animation: 'slideIn 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
            {/* Answers side by side */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ flex: 1, background: myAnswer ? '#ECFDF5' : '#FEF2F2', border: `2px solid ${myAnswer ? '#6EE7B7' : '#FECACA'}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', margin: '0 0 4px' }}>{myAnswer ? '👍' : '👎'}</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>You</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{myAnswer ? 'Agree' : 'Disagree'}</p>
              </div>
              <div style={{ flex: 1, background: partnerAnswer ? '#ECFDF5' : '#FEF2F2', border: `2px solid ${partnerAnswer ? '#6EE7B7' : '#FECACA'}`, borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', margin: '0 0 4px' }}>{partnerAnswer ? '👍' : '👎'}</p>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '0 0 2px' }}>{partnerName}</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{partnerAnswer ? 'Agree' : 'Disagree'}</p>
              </div>
            </div>

            {/* Nora comment */}
            {noraComment && (
              <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', fontStyle: 'italic', margin: 0 }}>{noraComment}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
            >
              {currentIndex >= questions.length - 1 ? 'See the summary →' : 'Next take 🔥'}
            </button>
          </div>
        )}

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px' }}>
          {questions.slice(0, 15).map((_, i) => (
            <div key={i} style={{ width: i === currentIndex ? '16px' : '6px', height: '6px', borderRadius: '3px', background: i < currentIndex ? '#4338CA' : i === currentIndex ? '#4338CA' : '#E8DDD0', transition: 'all 300ms' }} />
          ))}
        </div>

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  )
}

export default function HotTakePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <HotTakeContent />
    </Suspense>
  )
}
