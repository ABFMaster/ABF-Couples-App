'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const MIN_ROUNDS = { 30: 2, 60: 3, 90: 4 }

function RabbitHolePlayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  const [gamePhase, setGamePhase] = useState('loading_initial')
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [session, setSession] = useState(null)
  const [currentRound, setCurrentRound] = useState(null)
  const [roundNumber, setRoundNumber] = useState(1)
  const [hole, setHole] = useState(null)
  const [myThread, setMyThread] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('your partner')
  const [isUser1, setIsUser1] = useState(false)
  const [findText, setFindText] = useState('')
  const [myFinds, setMyFinds] = useState([])
  const [partnerFinds, setPartnerFinds] = useState([])
  const [newPartnerFind, setNewPartnerFind] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [signalingReady, setSignalingReady] = useState(false)
  const [iAmReady, setIAmReady] = useState(false)
  const [partnerIsReady, setPartnerIsReady] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerExpired, setTimerExpired] = useState(false)
  const [tellMoreSent, setTellMoreSent] = useState({})
  const [showInstructions, setShowInstructions] = useState(true)
  const [noraNudge, setNoraNudge] = useState(null)
  const [loadingNudge, setLoadingNudge] = useState(false)
  const timerRef = useRef(null)
  const pollRef = useRef(null)
  const prevPartnerCountRef = useRef(0)
  const coupleRef = useRef(null)
  const gamePhaseRef = useRef('loading_initial')

  useEffect(() => {
    const init = async () => {
      setGamePhase('loading_initial')
      gamePhaseRef.current = 'loading_initial'
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

      if (!sessionIdParam) { router.push('/game-room/lobby?mode=rabbit-hole'); return }

      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionIdParam)
        .maybeSingle()

      if (!sess || !['active', 'completed'].includes(sess.status)) {
        router.push('/game-room/lobby?mode=rabbit-hole')
        return
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      if (sess.started_at && sess.started_at < twentyFourHoursAgo) {
        router.push('/game-room/lobby?mode=rabbit-hole')
        return
      }

      setSession(sess)
      setRoundNumber(1)
      setMyThread(null)
      setMyFinds([])
      setIAmReady(false)
      setPartnerIsReady(false)
      setNoraNudge(null)

      // Set timer
      if (sess.expires_at) {
        const remaining = Math.max(0, new Date(sess.expires_at) - new Date())
        if (remaining <= 0) setTimerExpired(true)
        else setTimeLeft(Math.floor(remaining / 1000))
      }

      // Get current active round or start round 1
      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sess.id)
        .order('round_number', { ascending: false })

      let activeRound = rounds?.find(r => r.status === 'active')
      const latestRoundNum = rounds?.length > 0 ? rounds[0].round_number : 0
      let loadedRoundNum = 1

      if (!activeRound) {
        const isHostUser = sess.host_user_id === user.id
        if (isHostUser) {
          // Host generates round 1
          const holeRes = await fetch('/api/game-room/generate-hole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sess.id, coupleId: couple.id, roundNumber: 1 }),
          })
          const holeData = await holeRes.json()
          setHole(holeData)
          setMyThread(user1 ? holeData.thread_user1 : holeData.thread_user2)
          setRoundNumber(1)
          const { data: newRound } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('session_id', sess.id)
            .eq('round_number', 1)
            .maybeSingle()
          activeRound = newRound
        } else {
          // Partner polls for round 1 to appear
          setGamePhase('loading_initial')
          gamePhaseRef.current = 'loading_initial'
          const pollForRound = setInterval(async () => {
            const { data: round1 } = await supabase
              .from('game_rounds')
              .select('*')
              .eq('session_id', sess.id)
              .eq('round_number', 1)
              .maybeSingle()
            if (round1) {
              clearInterval(pollForRound)
              const { data: updatedSess } = await supabase
                .from('game_sessions')
                .select('*')
                .eq('id', sess.id)
                .maybeSingle()
              setHole({
                topic: updatedSess?.hole_topic,
                entry: updatedSess?.hole_entry,
                nora_send_off: updatedSess?.nora_send_off,
                thread_user1: round1.user1_thread,
                thread_user2: round1.user2_thread,
              })
              setMyThread(user1 ? round1.user1_thread : round1.user2_thread)
              setRoundNumber(1)
              setCurrentRound(round1)
              setGamePhase('playing')
              gamePhaseRef.current = 'playing'
              const initMinRounds = MIN_ROUNDS[sess.timer_minutes] || 3
              if (1 >= initMinRounds) {
                setGamePhase('choice')
                gamePhaseRef.current = 'choice'
              }
            }
          }, 2000)
          return
        }
      } else {
        // Load existing round
        const rNum = activeRound.round_number
        loadedRoundNum = rNum
        setRoundNumber(rNum)
        setIAmReady(user1 ? activeRound.user1_ready : activeRound.user2_ready)
        setPartnerIsReady(user1 ? activeRound.user2_ready : activeRound.user1_ready)
        setMyThread(user1 ? activeRound.user1_thread : activeRound.user2_thread)

        // Load session hole data
        const holeRes = await fetch('/api/game-room/generate-hole', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sess.id, coupleId: couple.id, roundNumber: rNum }),
        })
        const holeData = await holeRes.json()
        setHole(holeData)
      }

      setCurrentRound(activeRound)

      // Load finds for current round
      const { data: finds } = await supabase
        .from('game_finds')
        .select('*')
        .eq('session_id', sess.id)
        .order('created_at', { ascending: true })

      if (finds?.length > 0) {
        const mine = finds.filter(f => f.user_id === user.id)
        const theirs = finds.filter(f => f.user_id !== user.id)
        setMyFinds(mine)
        setPartnerFinds(theirs)
        prevPartnerCountRef.current = theirs.length
        if (mine.length > 0) setShowInstructions(false)
      }

      setGamePhase('playing')
      gamePhaseRef.current = 'playing'
      const initMinRounds = MIN_ROUNDS[sess.timer_minutes] || 3
      if (loadedRoundNum >= initMinRounds) {
        setGamePhase('choice')
        gamePhaseRef.current = 'choice'
      }
    }
    init()
  }, [router])

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setTimerExpired(true)
          setLoadingNudge(true)
          fetch('/api/game-room/nora-nudge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session?.id,
              coupleId,
              roundNumber,
              currentThread: myThread,
              finds: myFinds,
            }),
          })
            .then(r => r.json())
            .then(d => { if (d.nudge) setNoraNudge(d.nudge) })
            .catch(() => {})
            .finally(() => setLoadingNudge(false))
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null]) // eslint-disable-line

  // Poll for partner finds + round ready state
  useEffect(() => {
    if (!session?.id || !userId) return
    pollRef.current = setInterval(async () => {
      // Poll session status — detect when partner navigates to debrief
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('status, id')
        .eq('id', session.id)
        .maybeSingle()
      if (sess?.status === 'completed' || sess?.status === 'expired') {
        clearInterval(pollRef.current)
        router.push(`/game-room/rabbit-hole/debrief?sessionId=${sess.id}`)
        return
      }

      // Poll finds
      const { data: finds } = await supabase
        .from('game_finds')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true })

      if (finds?.length > 0) {
        const theirs = finds.filter(f => f.user_id !== userId)
        if (theirs.length > prevPartnerCountRef.current) {
          const newest = theirs[theirs.length - 1]
          setNewPartnerFind(newest)
          setTimeout(() => setNewPartnerFind(null), 8000)
          prevPartnerCountRef.current = theirs.length
        }
        setPartnerFinds(theirs)
      }

      // Poll round ready state — only for non-final rounds
      const currentMinRounds = MIN_ROUNDS[session?.timer_minutes] || 3
      if (gamePhaseRef.current !== 'choice') {
        const { data: round } = await supabase
          .from('game_rounds')
          .select('user1_ready, user2_ready, status')
          .eq('session_id', session.id)
          .eq('round_number', roundNumber)
          .maybeSingle()

        if (round) {
          const couple = coupleRef.current
          if (couple) {
            const user1 = couple.user1_id === userId
            setPartnerIsReady(user1 ? round.user2_ready : round.user1_ready)

            if (round.user1_ready && round.user2_ready && round.status === 'completed') {
              clearInterval(pollRef.current)
              if (session?.host_user_id === userId) {
                setGamePhase('loading_round')
                gamePhaseRef.current = 'loading_round'
                await loadNextRound(roundNumber + 1)
              }
            }
          }
        }
      }

    }, 4000)
    return () => clearInterval(pollRef.current)
  }, [session, userId, roundNumber]) // eslint-disable-line

  // Partner only — watches current_round in DB, advances when host generates next round
  useEffect(() => {
    if (!session?.id || !userId || session?.host_user_id === userId) return
    const couple = coupleRef.current
    if (!couple) return
    const user1 = couple.user1_id === userId
    const partnerRoundPoll = setInterval(async () => {
      if (gamePhaseRef.current !== 'playing' && gamePhaseRef.current !== 'choice') return
      const { data: sess } = await supabase
        .from('game_sessions')
        .select('current_round')
        .eq('id', session.id)
        .maybeSingle()
      if (sess?.current_round > roundNumber) {
        clearInterval(partnerRoundPoll)
        setGamePhase('loading_round')
        gamePhaseRef.current = 'loading_round'
        const nextRoundNum = sess.current_round
        const { data: newRound } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('session_id', session.id)
          .eq('round_number', nextRoundNum)
          .maybeSingle()
        if (newRound) {
          setRoundNumber(nextRoundNum)
          setMyThread(user1 ? newRound.user1_thread : newRound.user2_thread)
          setHole(prev => ({ ...prev, nora_nudge: null }))
          setIAmReady(false)
          setPartnerIsReady(false)
          setShowInstructions(false)
          setCurrentRound(newRound)
          const nextMinRounds = MIN_ROUNDS[session?.timer_minutes] || 3
          if (nextRoundNum >= nextMinRounds) {
            setGamePhase('choice')
            gamePhaseRef.current = 'choice'
          } else {
            setGamePhase('playing')
            gamePhaseRef.current = 'playing'
          }
        }
      }
    }, 2000)
    return () => clearInterval(partnerRoundPoll)
  }, [session, userId, roundNumber])

  const loadNextRound = async (nextRoundNum) => {
    if (!session || !coupleId) return
    setGamePhase('loading_round')
    gamePhaseRef.current = 'loading_round'
    try {
      const couple = coupleRef.current
      const user1 = couple?.user1_id === userId
      const isHostUser = session.host_user_id === userId

      if (isHostUser) {
        // Host generates the next round
        const holeRes = await fetch('/api/game-room/generate-hole', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, coupleId, roundNumber: nextRoundNum }),
        })
        const holeData = await holeRes.json()
        setRoundNumber(nextRoundNum)
        setMyThread(user1 ? holeData.thread_user1 : holeData.thread_user2)
        setHole(prev => ({ ...prev, nora_nudge: holeData.nora_nudge }))
        setIAmReady(false)
        setPartnerIsReady(false)
        setShowInstructions(false)
        const { data: newRound } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('session_id', session.id)
          .eq('round_number', nextRoundNum)
          .maybeSingle()
        setCurrentRound(newRound)
        // Write current_round to DB so partner knows to advance
        await supabase
          .from('game_sessions')
          .update({ current_round: nextRoundNum })
          .eq('id', session.id)
      }
    } catch {} finally {
      const nextMinRounds = MIN_ROUNDS[session?.timer_minutes] || 3
      if (nextRoundNum >= nextMinRounds) {
        setGamePhase('choice')
        gamePhaseRef.current = 'choice'
      } else {
        setGamePhase('playing')
        gamePhaseRef.current = 'playing'
      }
    }
  }

  const handleDropFind = async () => {
    if (!findText.trim() || submitting) return
    setSubmitting(true)
    setShowInstructions(false)
    try {
      const { data } = await supabase
        .from('game_finds')
        .insert({
          session_id: session.id,
          couple_id: coupleId,
          user_id: userId,
          find_text: findText.trim(),
          round_number: roundNumber,
          round: roundNumber,
        })
        .select('*')
        .maybeSingle()
      if (data) {
        setMyFinds(prev => [...prev, data])
        setFindText('')
      }
    } catch {} finally { setSubmitting(false) }
  }

  const handleSignalReady = async () => {
    if (signalingReady || iAmReady) return
    setSignalingReady(true)
    try {
      const res = await fetch('/api/game-room/round-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, coupleId, userId, roundNumber }),
      })
      const data = await res.json()
      setIAmReady(true)
      if (data.bothReady) {
        if (roundNumber >= minRounds) {
          setGamePhase('choice')
          gamePhaseRef.current = 'choice'
          setIAmReady(false)
          setPartnerIsReady(false)
        } else if (session?.host_user_id === userId) {
          setGamePhase('loading_round')
          gamePhaseRef.current = 'loading_round'
          await loadNextRound(roundNumber + 1)
        }
      }
    } catch {} finally { setSignalingReady(false) }
  }

  const handleTellMeMore = async (findId) => {
    if (tellMoreSent[findId]) return
    setTellMoreSent(prev => ({ ...prev, [findId]: true }))
    try {
      const couple = coupleRef.current
      if (couple) {
        const partnerUserId = couple.user1_id === userId ? couple.user2_id : couple.user1_id
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: partnerUserId,
            title: userName || 'Your partner',
            body: 'Tell me more',
            url: '/game-room/rabbit-hole/play',
          }),
        })
      }
    } catch {}
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const timerMinutes = session?.timer_minutes || 60
  const minRounds = MIN_ROUNDS[timerMinutes] || 3

  const handleKeepGoing = async () => {
    if (signalingReady) return
    setSignalingReady(true)
    try {
      await loadNextRound(roundNumber + 1)
    } finally {
      setSignalingReady(false)
    }
  }

  const handleBringItHome = async () => {
    if (signalingReady) return
    setSignalingReady(true)
    setGamePhase('loading_debrief')
    gamePhaseRef.current = 'loading_debrief'
    try {
      await supabase
        .from('game_sessions')
        .update({ status: 'completed' })
        .eq('id', session?.id)
      router.push(`/game-room/rabbit-hole/debrief?sessionId=${session?.id}`)
    } catch {
      setGamePhase('choice')
      gamePhaseRef.current = 'choice'
    } finally {
      setSignalingReady(false)
    }
  }

  if (gamePhase === 'loading_initial' || gamePhase === 'loading_round' || gamePhase === 'loading_debrief') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>
            {gamePhase === 'loading_debrief' ? 'Nora is closing the loop...' : gamePhase === 'loading_round' ? 'Nora is sending you deeper...' : 'Nora is opening the rabbit hole...'}
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Timer bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button onClick={() => router.push('/game-room/lobby?mode=rabbit-hole')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer', padding: 0 }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', color: '#9CA3AF', textTransform: 'uppercase' }}>Round {roundNumber}</span>
            {timerExpired ? (
              <div style={{ background: '#EEF2FF', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, color: '#4338CA' }}>
                Don't let me stop you ✦
              </div>
            ) : timeLeft !== null ? (
              <div style={{ background: timeLeft < 300 ? '#FEF2F2' : '#EEF2FF', borderRadius: '20px', padding: '6px 14px', fontSize: '14px', fontWeight: 600, color: timeLeft < 300 ? '#DC2626' : '#4338CA' }}>
                ⏱ {formatTime(timeLeft)}
              </div>
            ) : null}
          </div>
        </div>

        {/* NORA HOST intro — only on round 1 */}
        {roundNumber === 1 && showInstructions && (
          <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0 }}>Nora · Your host</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', lineHeight: 1.6, margin: '0 0 10px', fontStyle: 'italic' }}>
              I picked this topic. I know how it ends — I just don't know how you'll get there. Go follow your thread, drop what you find, and I'll bring it all together when you're ready.
            </p>
            <p style={{ fontSize: '13px', color: '#7C3AED', margin: 0 }}>Drop finds as you go. When you're done with this round, tap <strong>Ready for next →</strong></p>
          </div>
        )}

        {/* Nora nudge — subsequent rounds */}
        {roundNumber > 1 && hole?.nora_nudge && (
          <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0 }}>Nora · Round {roundNumber}</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{hole.nora_nudge}</p>
          </div>
        )}

        {/* THE DROP — entry point */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '24px', marginBottom: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A5B4FC' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Nora · The Drop</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#FFFFFF', lineHeight: 1.6, margin: '0 0 10px', fontStyle: 'italic' }}>{hole?.entry}</p>
            {hole?.nora_send_off && roundNumber === 1 && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0, fontStyle: 'italic' }}>{hole.nora_send_off}</p>
            )}
          </div>
        </div>

        {/* YOUR THREAD */}
        <div style={{ background: '#FFFFFF', border: '2px solid #4338CA', borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>Your thread — Round {roundNumber} 🕳️</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.55, margin: 0 }}>{myThread}</p>
        </div>

        {/* NEW PARTNER FIND — theatre */}
        {newPartnerFind && (
          <div style={{ background: '#F5F3FF', border: '2px solid #7C3AED', borderRadius: '20px', padding: '20px', marginBottom: '20px', animation: 'slideIn 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED', margin: '0 0 10px' }}>🕳️ {partnerName} dropped a find!</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.55, margin: '0 0 14px' }}>{newPartnerFind.find_text}</p>
            <button
              onClick={() => handleTellMeMore(newPartnerFind.id)}
              disabled={tellMoreSent[newPartnerFind.id]}
              style={{ background: tellMoreSent[newPartnerFind.id] ? '#EDE9FE' : '#7C3AED', color: tellMoreSent[newPartnerFind.id] ? '#7C3AED' : '#FFFFFF', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: tellMoreSent[newPartnerFind.id] ? 'default' : 'pointer' }}
            >
              {tellMoreSent[newPartnerFind.id] ? 'Sent ✓' : 'Tell me more'}
            </button>
          </div>
        )}

        {/* FIND HISTORY */}
        {(myFinds.length > 0 || partnerFinds.length > 0) && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 700 }}>Finds so far</p>
            {[...myFinds.map(f => ({ ...f, mine: true })), ...partnerFinds.map(f => ({ ...f, mine: false }))]
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
              .map((f) => (
                <div key={f.id} style={{ background: f.mine ? '#EEF2FF' : '#F5F3FF', border: `0.5px solid ${f.mine ? '#C7D2FE' : '#C4B5FD'}`, borderRadius: '16px', padding: '14px 18px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: f.mine ? '#4338CA' : '#7C3AED', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>{f.mine ? 'You' : partnerName} · R{f.round_number || 1}</p>
                    {!f.mine && !tellMoreSent[f.id] && (
                      <button onClick={() => handleTellMeMore(f.id)} style={{ background: 'none', border: '0.5px solid #7C3AED', borderRadius: '12px', padding: '3px 10px', fontSize: '11px', color: '#7C3AED', cursor: 'pointer' }}>Tell me more</button>
                    )}
                    {!f.mine && tellMoreSent[f.id] && <span style={{ fontSize: '11px', color: '#7C3AED' }}>Sent ✓</span>}
                  </div>
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1A1A1A', lineHeight: 1.5, margin: 0 }}>{f.find_text}</p>
                </div>
              ))}
          </div>
        )}

        {/* DROP A FIND */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 12px' }}>
            Drop a find {myFinds.length > 0 ? `(${myFinds.length} dropped)` : ''}
          </p>
          <textarea
            value={findText}
            onChange={e => setFindText(e.target.value)}
            placeholder="Found something? Paste or type it here..."
            style={{ width: '100%', background: '#FAF6F0', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '14px', fontSize: '14px', fontFamily: "'Fraunces', Georgia, serif", color: '#1A1A1A', resize: 'none', height: '90px', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
          />
          <button
            onClick={handleDropFind}
            disabled={!findText.trim() || submitting}
            style={{ width: '100%', marginTop: '10px', padding: '14px', background: findText.trim() ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0', color: findText.trim() ? '#FFFFFF' : '#B8A898', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: findText.trim() && !submitting ? 'pointer' : 'not-allowed', transition: 'all 150ms' }}
          >
            {submitting ? 'Dropping...' : 'Drop it 🕳️'}
          </button>
        </div>

        {/* READY / CHOICE / DEBRIEF */}
        {gamePhase === 'choice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={handleKeepGoing}
              disabled={signalingReady}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#FFFFFF', border: '1.5px solid #FFFFFF', color: '#1E1B4B', fontSize: '15px', cursor: 'pointer', fontFamily: "'Fraunces', Georgia, serif", opacity: signalingReady ? 0.5 : 1, fontWeight: 600 }}
            >
              Keep going →
            </button>
            <button
              onClick={handleBringItHome}
              disabled={signalingReady}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #4A3728 0%, #2A1E14 100%)', border: '1.5px solid #D4A853', color: '#D4A853', fontSize: '15px', cursor: 'pointer', fontFamily: "'Fraunces', Georgia, serif", opacity: signalingReady ? 0.5 : 1 }}
            >
              Bring it home ✦
            </button>
          </div>
        )}
        {gamePhase !== 'choice' && (
          <div style={{ marginBottom: '16px' }}>
            {/* Both ready status */}
            {(iAmReady || partnerIsReady) && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1, background: iAmReady ? '#EEF2FF' : '#F9FAFB', border: `1.5px solid ${iAmReady ? '#4338CA' : '#E8DDD0'}`, borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: iAmReady ? '#4338CA' : '#9CA3AF', margin: 0, fontWeight: 600 }}>{iAmReady ? '✓ Ready' : 'Still going'}</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>You</p>
                </div>
                <div style={{ flex: 1, background: partnerIsReady ? '#EEF2FF' : '#F9FAFB', border: `1.5px solid ${partnerIsReady ? '#4338CA' : '#E8DDD0'}`, borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: partnerIsReady ? '#4338CA' : '#9CA3AF', margin: 0, fontWeight: 600 }}>{partnerIsReady ? '✓ Ready' : 'Still going'}</p>
                  <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '2px 0 0' }}>{partnerName}</p>
                </div>
              </div>
            )}

            {!iAmReady ? (
              <button
                onClick={handleSignalReady}
                disabled={signalingReady}
                style={{ width: '100%', padding: '14px', background: '#FFFFFF', border: '2px solid #4338CA', borderRadius: '30px', fontSize: '15px', fontWeight: 600, color: '#4338CA', cursor: signalingReady ? 'not-allowed' : 'pointer', opacity: signalingReady ? 0.7 : 1 }}
              >
                {signalingReady ? 'Signaling...' : 'Ready for next →'}
              </button>
            ) : !partnerIsReady ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Waiting for {partnerName}...
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Timer expired nudge */}
        {timerExpired && (
          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(212,168,83,0.08)', borderRadius: '12px', border: '1px solid rgba(212,168,83,0.2)' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '8px' }}>NORA</p>
            {loadingNudge ? (
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: 'rgba(245,236,215,0.5)', fontStyle: 'italic' }}>Nora is thinking...</p>
            ) : noraNudge ? (
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#F5ECD7', lineHeight: 1.5, fontStyle: 'italic' }}>{noraNudge}</p>
            ) : (
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#F5ECD7', lineHeight: 1.5 }}>Time's up — but don't let me stop you. Keep going or wrap up when you're ready.</p>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default function RabbitHolePlayPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RabbitHolePlayContent />
    </Suspense>
  )
}
