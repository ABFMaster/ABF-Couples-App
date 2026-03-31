'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function RabbitHoleDebriefContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [session, setSession] = useState(null)
  const [debrief, setDebrief] = useState(null)
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState('factual') // factual | truth | chat
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [savedToTimeline, setSavedToTimeline] = useState(false)
  const messagesEndRef = useRef(null)

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

      if (!sessionIdParam) { router.push('/game-room'); return }

      const { data: sess } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', sessionIdParam)
        .maybeSingle()

      if (!sess) { router.push('/game-room'); return }
      setSession(sess)

      const { data: finds } = await supabase
        .from('game_finds')
        .select('*')
        .eq('session_id', sess.id)
        .order('created_at', { ascending: true })

      const { data: rounds } = await supabase
        .from('game_rounds')
        .select('*')
        .eq('session_id', sess.id)
        .order('round_number', { ascending: true })

      const isHostUser = sess.host_user_id === user.id

      if (isHostUser) {
        // Host generates the debrief — single generation, clean data
        const debriefRes = await fetch('/api/game-room/generate-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sess.id, coupleId: couple.id }),
        })
        const debriefData = await debriefRes.json()

        if (debriefData.error) {
          setError(debriefData.error)
          setLoading(false)
          return
        }

        setDebrief(debriefData)
        const contextMsg = buildNoraContext(sess, finds, rounds, couple, user.id)
        setMessages([{ role: 'system_context', content: contextMsg }])
        setLoading(false)
        setTimeout(() => setPhase('truth'), 10000)
      } else {
        // Partner polls for debrief to be ready — reads from DB once generated
        const pollDebrief = setInterval(async () => {
          const { data: updatedSess } = await supabase
            .from('game_sessions')
            .select('debrief_generated, convergence, factual_close, debrief_questions')
            .eq('id', sess.id)
            .maybeSingle()

          if (updatedSess?.debrief_generated && updatedSess.convergence) {
            clearInterval(pollDebrief)
            setDebrief({
              convergence_reveal: updatedSess.convergence,
              factual_close: updatedSess.factual_close,
              questions: updatedSess.debrief_questions || [],
            })
            const contextMsg = buildNoraContext(sess, finds, rounds, couple, user.id)
            setMessages([{ role: 'system_context', content: contextMsg }])
            setLoading(false)
            setTimeout(() => setPhase('truth'), 10000)
          }
        }, 2000)
      }
    }
    init()
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const buildNoraContext = (sess, finds, rounds, couple) => {
    const user1Finds = finds?.filter(f => f.user_id === couple.user1_id).map(f => f.find_text).join(' | ') || 'Nothing'
    const user2Finds = finds?.filter(f => f.user_id === couple.user2_id).map(f => f.find_text).join(' | ') || 'Nothing'
    return `You are Nora — warm, witty, mischievous. You just ran a Rabbit Hole game session for a couple. Here is everything you know:

TOPIC: ${sess.hole_topic}
ENTRY POINT: ${sess.hole_entry}
ROUNDS PLAYED: ${rounds?.length || 1}

WHAT THEY FOUND:
Partner 1 found: ${user1Finds}
Partner 2 found: ${user2Finds}

FACTUAL CLOSE: ${sess.factual_close || 'Not available'}
HUMAN TRUTH: ${sess.convergence || 'Not available'}

You are now in the debrief phase. They've already seen the factual close and the human truth. They may want to:
- Go deeper on something they found
- Ask what actually happened next
- Connect it to something in their own lives
- Just react and talk

Be Nora — present, curious, warm. Reference what they actually found. This is the best part of the night.`
  }

  const handleSaveToTimeline = async () => {
    try {
      await supabase
        .from('timeline_events')
        .insert({
          couple_id: coupleId,
          event_type: 'custom',
          title: `Rabbit Hole: ${session?.hole_topic}`,
          description: session?.convergence,
          event_date: new Date().toISOString().split('T')[0],
          created_by: userId,
        })
      setSavedToTimeline(true)
    } catch {}
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatLoading(true)

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)

    try {
      // Build API messages — filter out system_context, use as system prompt
      const systemContext = messages.find(m => m.role === 'system_context')?.content || ''
      const chatMessages = newMessages
        .filter(m => m.role !== 'system_context')
        .map(m => ({ role: m.role, content: m.content }))

      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
        },
        body: JSON.stringify({
          messages: chatMessages,
          systemPrompt: systemContext,
          userId,
        }),
      })
      const data = await res.json()
      const reply = data.content || data.message || "I'm here — keep going."
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again." }])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#7A8C6E', fontStyle: 'italic' }}>Nora is pulling the threads together...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1A1A1A', marginBottom: '16px' }}>Something went wrong.</p>
          <button onClick={() => router.push('/game-room')} style={{ background: '#4338CA', color: '#FFFFFF', border: 'none', borderRadius: '30px', padding: '12px 24px', fontSize: '15px', cursor: 'pointer' }}>Back to Game Room</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '48px 24px 120px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)', borderRadius: '20px', padding: '28px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A5B4FC' }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', margin: 0 }}>Nora · The Convergence</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', margin: '0 0 4px' }}>{session?.hole_topic}</p>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#FFFFFF', lineHeight: 1.6, margin: 0 }}>
              {debrief?.convergence_reveal}
            </p>
          </div>
        </div>

        {/* PART 1 — Factual close */}
        {phase === 'factual' && (
          <div>
            <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#4338CA', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>What actually happened</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#1A1A1A', lineHeight: 1.65, margin: 0 }}>
                {debrief?.factual_close || debrief?.convergence_reveal}
              </p>
            </div>
          </div>
        )}

        {/* PART 2 — Human truth */}
        {phase === 'truth' && (
          <div>
            <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>The bigger picture</p>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '17px', color: '#1E1B4B', lineHeight: 1.65, margin: 0 }}>
                {debrief?.factual_close || debrief?.convergence_reveal}
              </p>
            </div>

            {/* Debrief questions */}
            {debrief?.questions?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 700 }}>Talk about this</p>
                {debrief.questions.map((q, i) => (
                  <div key={i} style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '18px 20px', marginBottom: '8px' }}>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#1A1A1A', lineHeight: 1.5, margin: 0 }}>{q}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setPhase('chat')}
              style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)', color: '#FFFFFF', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: '10px' }}
            >
              Ask Nora anything 🕳️
            </button>
            <button
              onClick={() => router.push('/game-room')}
              style={{ width: '100%', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Back to Game Room
            </button>
            {savedToTimeline ? (
              <p style={{ fontSize: '13px', color: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>Saved to your timeline ✓</p>
            ) : (
              <button
                onClick={handleSaveToTimeline}
                style={{ background: 'none', border: 'none', fontSize: '13px', color: 'rgba(0,0,0,0.4)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Save to our timeline
              </button>
            )}
          </div>
        )}

        {/* PART 3 — Inline Nora chat */}
        {phase === 'chat' && (
          <div>
            <div style={{ background: '#F5F3FF', border: '0.5px solid #C4B5FD', borderRadius: '20px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED' }} />
                <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7C3AED', textTransform: 'uppercase', margin: 0 }}>Nora</p>
              </div>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1E1B4B', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                I saw everything you found. What do you want to dig into?
              </p>
            </div>

            {/* Chat messages */}
            <div style={{ marginBottom: '16px' }}>
              {messages.filter(m => m.role !== 'system_context').map((msg, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    maxWidth: '85%',
                    background: msg.role === 'user' ? '#4338CA' : '#FFFFFF',
                    border: msg.role === 'user' ? 'none' : '0.5px solid #E8DDD0',
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '12px 16px',
                  }}>
                    <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: msg.role === 'user' ? '#FFFFFF' : '#1A1A1A', lineHeight: 1.55, margin: 0 }}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '18px 18px 18px 4px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7C3AED', animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
                placeholder="Ask Nora anything..."
                style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #E8DDD0', borderRadius: '16px', padding: '12px 16px', fontSize: '15px', fontFamily: "'Fraunces', Georgia, serif", color: '#1A1A1A', resize: 'none', height: '50px', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
              <button
                onClick={handleSendChat}
                disabled={!chatInput.trim() || chatLoading}
                style={{ width: '44px', height: '44px', borderRadius: '50%', background: chatInput.trim() ? '#4338CA' : '#E8DDD0', border: 'none', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <button
              onClick={() => router.push('/game-room')}
              style={{ width: '100%', marginTop: '16px', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', borderRadius: '30px', fontSize: '14px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Back to Game Room
            </button>
          </div>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  )
}

export default function RabbitHoleDebriefPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #4338CA', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <RabbitHoleDebriefContent />
    </Suspense>
  )
}
