'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CHALLENGE_INSTRUCTIONS = {
  story: 'One of you take the lead — write together out loud.',
  pitch: 'One of you take the lead — make your case together.',
  rank: 'One of you drag to reorder. Discuss as you go.',
  memory: 'One of you take the lead — answer together.',
  plan: 'One of you take the lead — make it real together.',
}

const CHALLENGE_LABELS = {
  story: 'Story',
  pitch: 'Pitch',
  rank: 'Rank',
  memory: 'Memory',
  plan: 'Plan',
}

function RankInput({ items, onChange }) {
  const [ranked, setRanked] = useState(items)

  useEffect(() => {
    onChange(ranked.map((item, i) => `${i + 1}. ${item}`).join('\n'))
  }, [ranked])

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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#FFFFFF',
            border: '0.5px solid #E8DDD0',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: '#1E1B4B', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '600', flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ flex: 1, fontSize: '15px', color: '#1C1510' }}>{item}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button onClick={() => moveUp(index)} disabled={index === 0}
              style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.2 : 0.6, fontSize: '12px', padding: '2px 4px', lineHeight: 1 }}>▲</button>
            <button onClick={() => moveDown(index)} disabled={index === ranked.length - 1}
              style={{ background: 'none', border: 'none', cursor: index === ranked.length - 1 ? 'default' : 'pointer', opacity: index === ranked.length - 1 ? 0.2 : 0.6, fontSize: '12px', padding: '2px 4px', lineHeight: 1 }}>▼</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function RankInputPartial({ items, lockedPositions, onChange }) {
  const buildInitialRanked = () => {
    const result = []
    const freeItems = items.filter((_, i) => !lockedPositions[i + 1])
    let freeIndex = 0
    for (let i = 0; i < items.length; i++) {
      if (lockedPositions[i + 1]) {
        result.push({ item: lockedPositions[i + 1], locked: true, position: i + 1 })
      } else {
        result.push({ item: freeItems[freeIndex] || items[i], locked: false, position: i + 1 })
        freeIndex++
      }
    }
    return result
  }

  const [ranked, setRanked] = useState(buildInitialRanked)

  useEffect(() => {
    onChange(ranked.map(r => r.item))
  }, [ranked])

  function moveUp(index) {
    if (index === 0) return
    const reordered = [...ranked]
    let swapIndex = index - 1
    while (swapIndex >= 0 && reordered[swapIndex].locked) swapIndex--
    if (swapIndex < 0) return
    const temp = reordered[index]
    reordered[index] = { ...reordered[swapIndex], position: index + 1 }
    reordered[swapIndex] = { ...temp, position: swapIndex + 1 }
    setRanked(reordered)
  }

  function moveDown(index) {
    if (index === ranked.length - 1) return
    const reordered = [...ranked]
    let swapIndex = index + 1
    while (swapIndex < reordered.length && reordered[swapIndex].locked) swapIndex++
    if (swapIndex >= reordered.length) return
    const temp = reordered[index]
    reordered[index] = { ...reordered[swapIndex], position: index + 1 }
    reordered[swapIndex] = { ...temp, position: swapIndex + 1 }
    setRanked(reordered)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ranked.map((entry, index) => (
        <div
          key={entry.item}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: entry.locked ? '#ECFDF5' : '#FFFFFF',
            border: `1.5px solid ${entry.locked ? '#6EE7B7' : '#E8DDD0'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            opacity: entry.locked ? 0.85 : 1,
          }}
        >
          <span style={{
            width: '24px', height: '24px', borderRadius: '50%',
            background: entry.locked ? '#059669' : '#1E1B4B',
            color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '600', flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ flex: 1, fontSize: '15px', color: '#1C1510' }}>{entry.item}</span>
          {entry.locked ? (
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>✓ locked</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button onClick={() => moveUp(index)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '12px', padding: '2px 4px', lineHeight: 1 }}>▲</button>
              <button onClick={() => moveDown(index)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '12px', padding: '2px 4px', lineHeight: 1 }}>▼</button>
            </div>
          )}
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
  const isScribeFromUrl = searchParams.get('scribe') === 'true'

  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [currentRound, setCurrentRound] = useState(1)
  const [round, setRound] = useState(null)
  const [response, setResponse] = useState('')
  const [rankItems, setRankItems] = useState([])
  const [phase, setPhase] = useState('loading')
  const [noraVerdict, setNoraVerdict] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isScribe, setIsScribe] = useState(false)
  const [error, setError] = useState(null)
  const [sentences, setSentences] = useState([])
  const [currentTurnUserId, setCurrentTurnUserId] = useState(null)
  const [noraNudge, setNoraNudge] = useState(null)
  const [storyInput, setStoryInput] = useState('')
  const [storySubmitting, setStorySubmitting] = useState(false)
  const [userName, setUserName] = useState('')
  const [newLobbySession, setNewLobbySession] = useState(null)
  const [rankR1User1, setRankR1User1] = useState(null)
  const [rankR1User2, setRankR1User2] = useState(null)
  const [rankR2Submitted, setRankR2Submitted] = useState(false)
  const [rankAgreements, setRankAgreements] = useState([])
  const [rankDisagreements, setRankDisagreements] = useState([])
  const [rankNoAgreements, setRankNoAgreements] = useState([])
  const [rankFinal, setRankFinal] = useState([])
  const [rankNudge, setRankNudge] = useState(null)
  const [rankPhase, setRankPhase] = useState('ranking_r1')
  const [myRanking, setMyRanking] = useState([])
  const [rankSubmitting, setRankSubmitting] = useState(false)
  const [isUser1, setIsUser1] = useState(false)
  const pollRef = useRef(null)
  const completePollRef = useRef(null)

  useEffect(() => {
    async function init() {
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
      setIsUser1(couple.user1_id === user.id)

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const { data: partnerProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle()
      if (partnerProfile?.display_name) setPartnerName(partnerProfile.display_name)

      const { data: myProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle()
      if (myProfile?.display_name) setUserName(myProfile.display_name)
    }
    init()
  }, [router])

  // Generate round once we have userId and coupleId
  useEffect(() => {
    if (userId && coupleId && isScribe) generateRound(1)
  }, [userId, coupleId, isScribe])

  // Set scribe role from URL param — host always navigates with scribe=true
  useEffect(() => {
    if (!userId) return
    setIsScribe(isScribeFromUrl)
  }, [userId, isScribeFromUrl])

  // Poll for partner state changes
  useEffect(() => {
    if (!challengeSessionId || !currentRound) return
    pollRef.current = setInterval(async () => {
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

      if (challengeType === 'rank' && round) {
        const { data: rankRound } = await supabase
          .from('challenge_rounds')
          .select('rank_user1_r1, rank_user2_r1, rank_user1_r2, rank_user2_r2, rank_nora_interjection, rank_final, no_agreements, rank_round, nora_verdict')
          .eq('id', round.id)
          .maybeSingle()
        if (!rankRound) return

        // Round 1 both submitted — show partial reveal
        if (rankRound.rank_user1_r1 && rankRound.rank_user2_r1 && rankPhase === 'ranking_r1') {
          setRankR1User1(rankRound.rank_user1_r1)
          setRankR1User2(rankRound.rank_user2_r1)
          if (rankRound.rank_nora_interjection) setRankNudge(rankRound.rank_nora_interjection)
          if (rankRound.rank_round === 3) {
            setRankPhase('reveal_final')
          } else {
            setRankPhase('reveal_r1')
          }
        }

        // Round 2 both submitted — show final reveal
        if (rankRound.rank_user1_r2 && rankRound.rank_user2_r2 && rankPhase === 'ranking_r2') {
          if (rankRound.rank_final && rankRound.no_agreements) {
            setRankFinal(rankRound.rank_final)
            setRankNoAgreements(rankRound.no_agreements)
            setRankPhase('reveal_final')
          }
        }

        // Nora verdict ready
        if (rankRound.nora_verdict && phase !== 'verdict') {
          setNoraVerdict(rankRound.nora_verdict)
          setPhase('verdict')
        }

        return
      }

      if (challengeType === 'story' && round) {
        const { data: storyRound } = await supabase
          .from('challenge_rounds')
          .select('sentences, current_turn_user_id, nora_nudge, nora_verdict, story_complete')
          .eq('id', round.id)
          .maybeSingle()
        if (storyRound) {
          setSentences(storyRound.sentences || [])
          setCurrentTurnUserId(storyRound.current_turn_user_id)
          if (storyRound.nora_nudge) setNoraNudge(storyRound.nora_nudge)
          if (storyRound.nora_verdict && phase !== 'verdict') {
            setNoraVerdict(storyRound.nora_verdict)
            setPhase('verdict')
          }
        }
        return
      }

      // Check current round for verdict
      const { data: roundRow } = await supabase
        .from('challenge_rounds')
        .select('*')
        .eq('session_id', challengeSessionId)
        .eq('round_number', currentRound)
        .maybeSingle()

      // Watcher: advance from loading to challenge when round appears
      if (roundRow && !isScribe && phase === 'loading') {
        setRound(roundRow)
        if (challengeType === 'story') {
          setSentences(roundRow.sentences || [])
          setCurrentTurnUserId(roundRow.current_turn_user_id)
        }
        if (challengeType === 'rank') {
          try {
            const parsed = JSON.parse(roundRow.prompt)
            const items = parsed.items || []
            setRankItems(items)
            setMyRanking(items)
          } catch {
            setRankItems([])
            setMyRanking([])
          }
        }
        setPhase('challenge')
        return
      }

      if (roundRow?.nora_verdict && phase !== 'verdict' && phase !== 'complete') {
        setRound(roundRow)
        setNoraVerdict(roundRow.nora_verdict)
        setResponse(roundRow.couple_response || '')
        setPhase('verdict')
        return
      }

      // Check if session has advanced round or completed
      const { data: challengeSession } = await supabase
        .from('challenge_sessions')
        .select('current_round, status')
        .eq('id', challengeSessionId)
        .maybeSingle()

      if (!challengeSession) return

      if (challengeSession.status === 'complete' && phase !== 'complete') {
        clearInterval(pollRef.current)
        setPhase('complete')
        return
      }

      if (challengeSession.current_round > currentRound && phase === 'verdict') {
        clearInterval(pollRef.current)
        setCurrentRound(challengeSession.current_round)
        generateRound(challengeSession.current_round)
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [challengeSessionId, currentRound, phase])

  // Poll for partner starting a new lobby session — complete screen only
  useEffect(() => {
    if ((phase !== 'complete' && phase !== 'verdict') || !coupleId || !userId) return
    completePollRef.current = setInterval(async () => {
      const { data: lobbySess } = await supabase
        .from('game_sessions')
        .select('id, host_user_id')
        .eq('couple_id', coupleId)
        .eq('mode', 'challenge')
        .eq('status', 'lobby')
        .maybeSingle()
      if (lobbySess && lobbySess.host_user_id !== userId) {
        clearInterval(completePollRef.current)
        setNewLobbySession(lobbySess)
      }
    }, 3000)
    return () => clearInterval(completePollRef.current)
  }, [phase, coupleId, userId])

  async function generateRound(roundNumber) {
    clearInterval(pollRef.current)
    setPhase('loading')
    setResponse('')
    setNoraVerdict(null)
    setError(null)
    setSubmitted(false)

    try {
      const res = await fetch('/api/game-room/challenge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, challengeSessionId, challengeType, roundNumber }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const r = data.round
      setRound(r)

      if (challengeType === 'story') {
        setSentences(r.sentences || [])
        setCurrentTurnUserId(r.current_turn_user_id)
      }

      if (challengeType === 'rank') {
        try {
          const parsed = JSON.parse(r.prompt)
          const items = parsed.items || []
          setRankItems(items)
          setMyRanking(items)
        } catch {
          setRankItems([])
          setMyRanking([])
        }
      }

      setPhase('challenge')
    } catch {
      setError('Something went wrong loading the challenge.')
      setPhase('error')
    }
  }

  async function handleSubmit() {
    if (!response.trim() || submitting || submitted) return
    setSubmitting(true)
    setSubmitted(true)

    try {
      const res = await fetch('/api/game-room/challenge/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, coupleId, challengeSessionId,
          roundId: round.id, challengeType,
          prompt: round.prompt, coupleResponse: response,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setNoraVerdict(data.noraVerdict)
      setPhase('verdict')
    } catch {
      setError('Something went wrong submitting.')
      setSubmitted(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEndGame() {
    if (!sessionId) return
    try {
      await supabase
        .from('game_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId)
      router.push('/game-room')
    } catch {}
  }

  async function handleNext() {
    clearInterval(pollRef.current)
    try {
      const res = await fetch('/api/game-room/challenge/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, challengeSessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.complete) {
        setPhase('complete')
      } else {
        setCurrentRound(data.nextRound)
        generateRound(data.nextRound)
      }
    } catch {
      setError('Something went wrong advancing to the next round.')
    }
  }

  async function handleStorySentence() {
    if (!storyInput.trim() || storySubmitting) return
    setStorySubmitting(true)
    try {
      const res = await fetch('/api/game-room/challenge/story/submit-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: round.id,
          userId,
          coupleId,
          sentence: storyInput.trim(),
          challengeSessionId,
        }),
      })
      const data = await res.json()
      if (data.round) {
        setSentences(data.round.sentences || [])
        setCurrentTurnUserId(data.round.current_turn_user_id)
        if (data.noraNudge) setNoraNudge(data.noraNudge)
        setStoryInput('')
      }
      if (data.storyComplete) {
        const submitRes = await fetch('/api/game-room/challenge/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId, coupleId, challengeSessionId,
            roundId: round.id, challengeType,
            prompt: round.prompt, coupleResponse: '',
          }),
        })
        const submitData = await submitRes.json()
        if (submitData.noraVerdict) {
          setNoraVerdict(submitData.noraVerdict)
          setPhase('verdict')
        }
      }
    } catch {} finally {
      setStorySubmitting(false)
    }
  }

  async function handleRankSubmit(rankingArray, rankRound) {
    if (rankSubmitting) return
    setRankSubmitting(true)
    try {
      const res = await fetch('/api/game-room/challenge/rank/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: round.id,
          userId,
          coupleId,
          ranking: rankingArray,
          rankRound,
        }),
      })
      const data = await res.json()
      if (rankRound === 1) {
        if (data.perfectMatch) {
          setRankFinal(data.rankFinal || [])
          setRankNoAgreements([])
          setRankPhase('reveal_final')
        } else if (data.r1Complete) {
          setRankR1User1(data.round?.rank_user1_r1)
          setRankR1User2(data.round?.rank_user2_r1)
          if (data.round?.rank_nora_interjection) setRankNudge(data.round.rank_nora_interjection)
          setRankPhase('reveal_r1')
        }
      }
      if (rankRound === 2 && data.r2Complete) {
        setRankFinal(data.rankFinal || [])
        setRankNoAgreements(data.noAgreements || [])
        setRankPhase('reveal_final')
      }
    } catch {} finally {
      setRankSubmitting(false)
    }
  }

  async function handleRankFinalize() {
    try {
      const res = await fetch('/api/game-room/challenge/rank/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: round.id,
          coupleId,
          challengeSessionId,
          prompt: round.prompt,
        }),
      })
      const data = await res.json()
      if (data.noraVerdict) {
        setNoraVerdict(data.noraVerdict)
        setPhase('verdict')
      }
    } catch {}
  }

  function getRankPromptData() {
    if (!round) return { intro: '', prompt: '', items: [] }
    try { return JSON.parse(round.prompt) }
    catch { return { intro: '', prompt: round.prompt, items: [] } }
  }

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1C1510', opacity: 0.6 }}>Nora is preparing your challenge…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <p style={{ fontSize: '16px', color: '#C1440E', marginBottom: '16px' }}>{error}</p>
        <button onClick={() => generateRound(currentRound)}
          style={{ padding: '12px 24px', background: '#1E1B4B', color: '#FFFFFF', border: 'none', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    )
  }

  if (phase === 'complete') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '32px 24px', marginBottom: '24px', width: '100%', maxWidth: '400px' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>The Challenge</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '28px', color: '#FFFFFF', margin: '0 0 8px' }}>Challenge complete.</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', margin: 0 }}>
            {totalRounds === 1 ? 'One round. Well played.' : `${totalRounds} rounds. Nora's impressed.`}
          </p>
        </div>
        {newLobbySession ? (
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <div style={{ background: '#EEF2FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '16px 20px', marginBottom: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#1E1B4B', margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic' }}>
                  {partnerName} wants to play again
                </p>
              </div>
              <button
                onClick={() => router.push(`/game-room/lobby?mode=challenge`)}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}
              >
                Join {partnerName} →
              </button>
              <button
                onClick={() => router.push('/game-room')}
                style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
              >
                Back to Game Room
              </button>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <button
                onClick={() => router.push('/game-room/lobby?mode=challenge&forceNew=true')}
                style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}
              >
                Play another challenge →
              </button>
              <button
                onClick={() => router.push('/game-room')}
                style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
              >
                Back to Game Room
              </button>
            </div>
          )}
      </div>
    )
  }

  const rankData = challengeType === 'rank' ? getRankPromptData() : null

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ padding: '48px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={handleEndGame}
          style={{ background: 'none', border: 'none', fontSize: '13px', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}>
          End game
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{CHALLENGE_LABELS[challengeType]}</span>
          {totalRounds > 1 && (
            <span style={{ fontSize: '11px', background: '#1E1B4B', color: '#FFFFFF', padding: '3px 10px', borderRadius: '20px' }}>
              {currentRound} / {totalRounds}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '0 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Prompt card */}
        {phase !== 'verdict' && (
          <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            {challengeType === 'rank' && rankData?.intro && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontStyle: 'italic' }}>{rankData.intro}</p>
            )}
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', lineHeight: 1.5, color: '#FFFFFF', margin: '0 0 12px', position: 'relative' }}>
              {challengeType === 'rank' ? rankData?.prompt : round?.prompt}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {CHALLENGE_INSTRUCTIONS[challengeType]}
            </p>
          </div>
        )}

        {phase === 'challenge' && (
          <>
            {challengeType === 'rank' && (
              <div style={{ marginBottom: '24px' }}>

                {/* Round 1 — blind ranking */}
                {rankPhase === 'ranking_r1' && (
                  <div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', textAlign: 'center' }}>
                      Rank these independently — your partner won't see your order until you both submit.
                    </p>
                    <RankInput
                      items={rankItems}
                      onChange={(ordered) => setMyRanking(ordered.split('\n').map(s => s.replace(/^\d+\.\s/, '')))}
                    />
                    <button
                      onClick={() => handleRankSubmit(myRanking.length > 0 ? myRanking : rankItems, 1)}
                      disabled={rankSubmitting}
                      style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: rankSubmitting ? 'not-allowed' : 'pointer', opacity: rankSubmitting ? 0.7 : 1 }}>
                      {rankSubmitting ? 'Locking in...' : 'Lock in my ranking →'}
                    </button>
                    {rankSubmitting && (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                          Waiting for {partnerName}...
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Round 1 reveal — partial, disagreements hidden */}
                {rankPhase === 'reveal_r1' && rankR1User1 && rankR1User2 && (
                  <div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', textAlign: 'center' }}>Round 1 results — debate and resubmit</p>
                    {(() => {
                      const myR1 = isUser1 ? rankR1User1 : rankR1User2
                      const theirR1 = isUser1 ? rankR1User2 : rankR1User1
                      return myR1.map((item, i) => {
                        const agreed = theirR1[i] === item
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: agreed ? '#ECFDF5' : '#FEF2F2', border: `1.5px solid ${agreed ? '#6EE7B7' : '#FECACA'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: agreed ? '#059669' : '#DC2626', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ flex: 1, fontSize: '15px', color: '#1A1A1A', fontFamily: "'Fraunces', Georgia, serif" }}>{agreed ? item : item}</span>
                            <span style={{ fontSize: '18px' }}>{agreed ? '✓' : '?'}</span>
                            {!agreed && <span style={{ fontSize: '11px', color: '#DC2626', fontStyle: 'italic' }}>{partnerName} disagrees</span>}
                          </div>
                        )
                      })
                    })()}

                    {rankNudge && (
                      <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '12px', padding: '12px 16px', margin: '16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                          <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Nora</p>
                        </div>
                        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1E1B4B', fontStyle: 'italic', margin: 0 }}>{rankNudge}</p>
                      </div>
                    )}

                    <div style={{ marginTop: '20px' }}>
                      <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px', textAlign: 'center' }}>
                        Debate it — then lock in your final ranking below
                      </p>
                      <RankInputPartial
                        items={rankItems}
                        lockedPositions={(() => {
                          const myR1 = isUser1 ? rankR1User1 : rankR1User2
                          const theirR1 = isUser1 ? rankR1User2 : rankR1User1
                          const locked = {}
                          myR1?.forEach((item, i) => {
                            if (theirR1?.[i] === item) locked[i + 1] = item
                          })
                          return locked
                        })()}
                        onChange={(orderedArray) => setMyRanking(orderedArray)}
                      />
                      <button
                        onClick={() => handleRankSubmit(myRanking.length > 0 ? myRanking : rankItems, 2)}
                        disabled={rankSubmitting}
                        style={{ width: '100%', marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: rankSubmitting ? 'not-allowed' : 'pointer', opacity: rankSubmitting ? 0.7 : 1 }}>
                        {rankSubmitting ? 'Locking in...' : 'Final answer →'}
                      </button>
                      {rankSubmitting && (
                        <div style={{ textAlign: 'center', padding: '12px 0', color: '#9CA3AF', fontSize: '13px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            Waiting for {partnerName}...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Final reveal */}
                {rankPhase === 'reveal_final' && (
                  <div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '16px', textAlign: 'center' }}>Final results</p>
                    {rankFinal.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#059669', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{r.position}</span>
                        <span style={{ flex: 1, fontSize: '15px', color: '#1A1A1A', fontFamily: "'Fraunces', Georgia, serif" }}>{r.item}</span>
                        <span style={{ fontSize: '14px' }}>✓</span>
                      </div>
                    ))}
                    {rankNoAgreements.map((r, i) => (
                      <div key={i} style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DC2626', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{r.position}</span>
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>No agreement</span>
                        </div>
                        <div style={{ paddingLeft: '36px' }}>
                          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 2px' }}>You: <span style={{ color: '#1A1A1A' }}>{isUser1 ? r.user1Item : r.user2Item}</span></p>
                          <p style={{ fontSize: '13px', color: '#9CA3AF', margin: 0 }}>{partnerName}: <span style={{ color: '#1A1A1A' }}>{isUser1 ? r.user2Item : r.user1Item}</span></p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={handleRankFinalize}
                      style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                      Get Nora's verdict ✦
                    </button>
                  </div>
                )}

              </div>
            )}

            {challengeType === 'story' && (
              <div style={{ marginBottom: '24px' }}>
                {sentences.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>The story so far</p>
                    {sentences.map((s, i) => (
                      <div key={i} style={{ background: s.user_id === userId ? '#EEF2FF' : '#F5F0EA', border: `0.5px solid ${s.user_id === userId ? '#C7D2FE' : '#E8DDD0'}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                        <p style={{ fontSize: '10px', color: s.user_id === userId ? '#4338CA' : '#9CA3AF', margin: '0 0 4px', fontWeight: 700 }}>{s.user_id === userId ? 'You' : partnerName} · sentence {i + 1}</p>
                        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A1A1A', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {noraNudge && (
                  <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                      <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0, fontWeight: 700 }}>Nora</p>
                    </div>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1E1B4B', fontStyle: 'italic', margin: 0 }}>{noraNudge}</p>
                  </div>
                )}

                {currentTurnUserId === userId ? (
                  <div>
                    <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px', textAlign: 'center' }}>
                      {sentences.length === 0 ? 'Write the first sentence' : `Sentence ${sentences.length + 1} of 6 — your turn`}
                    </p>
                    <textarea
                      value={storyInput}
                      onChange={e => setStoryInput(e.target.value)}
                      placeholder="Continue the story..."
                      style={{ width: '100%', minHeight: '100px', padding: '16px', fontSize: '16px', lineHeight: '1.6', color: '#1C1510', background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
                    />
                    <button
                      onClick={handleStorySentence}
                      disabled={!storyInput.trim() || storySubmitting}
                      style={{ width: '100%', padding: '16px', background: storyInput.trim() ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0', color: storyInput.trim() ? '#FFFFFF' : '#B8A898', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: storyInput.trim() ? 'pointer' : 'not-allowed' }}>
                      {storySubmitting ? 'Submitting…' : sentences.length === 5 ? 'End the story ✦' : 'Add sentence →'}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9CA3AF', fontSize: '13px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                      {sentences.length === 0 ? `Waiting for ${partnerName} to start the story...` : `${partnerName} is writing sentence ${sentences.length + 1}...`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {challengeType === 'story' && null}

            {challengeType !== 'story' && challengeType !== 'rank' && isScribe && !submitted && (
              <>
                {challengeType === 'rank' ? (
                  <div style={{ marginBottom: '24px' }}>
                    <RankInput items={rankItems} onChange={setResponse} />
                  </div>
                ) : (
                  <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Write your answer here…"
                    style={{
                      width: '100%', minHeight: '160px', padding: '16px',
                      fontSize: '16px', lineHeight: '1.6', color: '#1C1510',
                      background: '#FFFFFF',
                      border: '0.5px solid #E8DDD0', borderRadius: '16px',
                      resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                      boxSizing: 'border-box', marginBottom: '16px',
                    }}
                  />
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!response.trim() || submitting}
                  style={{
                    width: '100%', padding: '16px',
                    background: response.trim() ? 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' : '#E8DDD0',
                    color: response.trim() ? '#FFFFFF' : '#B8A898',
                    border: 'none', borderRadius: '30px', fontSize: '15px',
                    fontWeight: 600, cursor: response.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit our answer'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '13px', color: '#9CA3AF', marginTop: '12px', fontStyle: 'italic' }}>
                  {partnerName} is watching — talk it through together
                </p>
              </>
            )}

            {challengeType !== 'story' && challengeType !== 'rank' && isScribe && submitted && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9CA3AF', fontSize: '14px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Waiting for Nora…
                </div>
              </div>
            )}

            {challengeType !== 'story' && challengeType !== 'rank' && !isScribe && (
              <div style={{ marginTop: '8px' }}>
                {challengeType === 'rank' && rankItems.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {rankItems.map((item, index) => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '12px', padding: '12px 16px', marginBottom: '8px' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1E1B4B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                          {index + 1}
                        </span>
                        <span style={{ flex: 1, fontSize: '15px', color: '#1C1510' }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: '#F5F0EA', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', margin: '0 0 4px' }}>
                    {partnerName} is the scribe
                  </p>
                  <p style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic', margin: 0 }}>
                    Talk it through together — they'll type what you decide
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#9CA3AF', fontSize: '13px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4338CA', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    Waiting for {partnerName} to submit…
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Verdict phase */}
        {phase === 'verdict' && (
          <div style={{ animation: 'slideIn 400ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: '0 0 12px' }}>Nora's verdict</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', lineHeight: 1.6, color: '#FFFFFF', margin: 0 }}>
                {noraVerdict}
              </p>
            </div>

            {challengeType === 'story' ? (
              <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 12px' }}>The story you wrote</p>
                {sentences.map((s, i) => (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <p style={{ fontSize: '10px', color: s.user_id === userId ? '#4338CA' : '#9CA3AF', margin: '0 0 2px', fontWeight: 700 }}>{s.user_id === userId ? 'You' : partnerName}</p>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A1A1A', lineHeight: 1.5, margin: 0 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 8px' }}>Your answer</p>
                <p style={{ fontSize: '15px', color: '#1C1510', lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0 }}>{response}</p>
              </div>
            )}

            {challengeType === 'plan' && (
              <div style={{ background: '#EEF2FF', border: '0.5px solid #C4B5FD', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '14px', color: '#1E1B4B', margin: 0 }}>Want to actually do this?</p>
                <button onClick={() => router.push('/dates')}
                  style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Plan it →
                </button>
              </div>
            )}

            <button
              onClick={handleNext}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
            >
              {currentRound >= totalRounds ? 'Finish ✦' : 'Next round →'}
            </button>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '14px', color: '#C1440E', marginTop: '16px', textAlign: 'center' }}>{error}</p>
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

export default function ChallengePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <ChallengePlayContent />
    </Suspense>
  )
}
