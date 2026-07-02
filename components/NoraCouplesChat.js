'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function NoraCouplesChat({
  coupleId,
  contextType,
  contextId,
  contextSummary,
  userName,
  partnerName,
  userId,
  initialNoraMessage,
  mode = 'full',
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded || false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showContinue, setShowContinue] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const sessionRef = useRef(null)
  const isInitialLoad = useRef(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (expanded) {
      fetchMessages()
      if (!defaultExpanded) {
        setTimeout(() => inputRef.current?.focus(), 300)
      }
    }
  }, [expanded])

  useEffect(() => {
    if (messages.length > 0) {
      if (isInitialLoad.current) {
        isInitialLoad.current = false
      } else {
        scrollToBottom()
      }
    }
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length >= 2) setShowContinue(true)
  }, [messages])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      sessionRef.current = session
      const res = await fetch(
        `/api/nora-inline?coupleId=${coupleId}&contextType=${contextType}&contextId=${contextId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      const data = await res.json()
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages)
      } else if (initialNoraMessage) {
        setMessages([{
          id: 'opener',
          role: 'assistant',
          content: initialNoraMessage,
          created_at: new Date().toISOString(),
        }])
      }
    } catch {}
    setLoading(false)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)

    const optimistic = {
      id: 'opt-' + Date.now(),
      role: 'user',
      sender_id: userId,
      sender_name: userName,
      content: text,
      created_at: new Date().toISOString(),
      optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const session = sessionRef.current
      const res = await fetch('/api/nora-inline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          coupleId,
          contextType,
          contextId,
          message: text,
          userName,
          partnerName,
          contextSummary,
        }),
      })
      const data = await res.json()
      if (data.messages) {
        setMessages(data.messages)
      }
    } catch {
      setMessages(prev => prev.filter(m => !m.optimistic))
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleContinueInNora = () => {
    if (messages.length > 0) {
      const lastNora = [...messages].reverse().find(m => m.role === 'assistant')
      if (lastNora) {
        sessionStorage.setItem('nora_opener', lastNora.content)
      }
    }
    window.location.href = '/ai-coach?new=true'
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#C4714A',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 500,
        }}
      >
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C4714A', flexShrink: 0 }} />
        Talk to Nora →
      </button>
    )
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid #EDE5D8',
      borderRadius: '20px',
      overflow: 'hidden',
      marginTop: '8px',
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #F5EDE0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C4714A' }} />
          <span style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#C4714A',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 500,
          }}>Nora</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#C4AA87',
            fontSize: '18px',
            lineHeight: 1,
            padding: '0 2px',
          }}
        >×</button>
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: '380px',
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {loading && (
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            color: '#C4AA87',
            fontStyle: 'italic',
            textAlign: 'center',
            margin: 0,
          }}>
            Nora is thinking...
          </p>
        )}

        {messages.map((msg) => {
          const isNora = msg.role === 'assistant'
          const isMe = msg.sender_id === userId
          const senderLabel = isNora ? null : isMe ? 'You' : msg.sender_name || partnerName

          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isNora ? 'flex-start' : isMe ? 'flex-end' : 'flex-start',
            }}>
              {senderLabel && (
                <span style={{
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#C4AA87',
                  fontFamily: 'DM Sans, sans-serif',
                  marginBottom: '4px',
                  paddingLeft: isMe ? 0 : '2px',
                  paddingRight: isMe ? '2px' : 0,
                }}>
                  {senderLabel}
                </span>
              )}
              <div style={{
                maxWidth: '82%',
                padding: '12px 16px',
                borderRadius: isNora ? '4px 18px 18px 18px' : isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                background: isNora ? '#FAF6EF' : isMe ? '#1C1208' : '#F5EDE0',
                border: isNora ? '1px solid #EDE5D8' : 'none',
              }}>
                <p style={{
                  margin: 0,
                  fontFamily: isNora ? 'Georgia, serif' : 'DM Sans, sans-serif',
                  fontSize: '15px',
                  lineHeight: 1.55,
                  color: isNora ? '#2D2418' : isMe ? '#FAF6EF' : '#2D2418',
                  fontStyle: isNora ? 'italic' : 'normal',
                }}>
                  {msg.content}
                </p>
              </div>
            </div>
          )
        })}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div style={{
              padding: '14px 18px',
              borderRadius: '4px 18px 18px 18px',
              background: '#FAF6EF',
              border: '1px solid #EDE5D8',
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', display: 'inline-block', animation: 'noraDot 1.2s ease-in-out infinite', animationDelay: '0s' }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', display: 'inline-block', animation: 'noraDot 1.2s ease-in-out infinite', animationDelay: '0.2s' }} />
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#C4AA87', display: 'inline-block', animation: 'noraDot 1.2s ease-in-out infinite', animationDelay: '0.4s' }} />
              <style>{`@keyframes noraDot { 0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); } 30% { opacity: 1; transform: scale(1.1); } }`}</style>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Continue in Nora link */}
      {showContinue && (
        <div style={{ textAlign: 'center', padding: '0 16px 8px' }}>
          <button
            onClick={handleContinueInNora}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#C4AA87',
              fontFamily: 'DM Sans, sans-serif',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Take this further in Nora →
          </button>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid #F5EDE0',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Respond to Nora..."
          rows={1}
          style={{
            flex: 1,
            padding: '12px 14px',
            fontSize: '16px',
            fontFamily: 'DM Sans, sans-serif',
            color: '#1C1208',
            background: '#FAF6EF',
            border: '1px solid #EDE5D8',
            borderRadius: '14px',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
            minHeight: '46px',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: input.trim() && !sending ? '#C4714A' : '#EDE5D8',
            border: 'none',
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
