'use client'

import { useState, useEffect, useRef } from 'react'

export default function NoraConversation({
  conversationKey,
  systemPrompt,
  onComplete,
  completionTrigger,
  initialMessage,
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (initialMessage) {
      setMessages([{ role: 'assistant', content: initialMessage }])
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/nora-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          systemPrompt,
          conversationKey,
        }),
      })
      const data = await res.json()
      const content = data.content || ''

      const assistantMsg = { role: 'assistant', content }
      const finalMessages = [...nextMessages, assistantMsg]
      setMessages(finalMessages)

      if (!completedRef.current && completionTrigger && content.includes(completionTrigger)) {
        completedRef.current = true
        onComplete?.(finalMessages)
      }
    } catch (err) {
      console.error('[NoraConversation] send error:', err)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' ? (
              <div className="max-w-[85%]">
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <div className="w-2 h-2 rounded-full bg-[#F2A090]" />
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-neutral-100">
                  <p
                    className="text-[15px] text-neutral-800 leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                  >
                    {completionTrigger
                      ? msg.content.replace(completionTrigger, '').trim()
                      : msg.content}
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-[85%]">
                <div className="bg-[#E8614D] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                  <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <div className="w-2 h-2 rounded-full bg-[#F2A090] animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">Nora</span>
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-neutral-100">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-neutral-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Say something…"
            disabled={loading}
            className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2.5 text-[14px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[#E8614D] disabled:opacity-50 transition-colors"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-10 h-10 flex items-center justify-center bg-[#E8614D] text-white rounded-full disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
