'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
      const { data: { session } } = await supabase.auth.getSession()

      // ROOT CAUSE FIX Aug 21 2026 — found live: every single message in
      // this component's history, including the very first turn, was
      // failing with a 500. Root cause: initialMessage is seeded into
      // local `messages` state as {role:'assistant', ...} purely for
      // display (so the opening line shows before the user has typed
      // anything), but nextMessages — built by appending the user's reply
      // to that seeded state — was sent to the API as-is. The Anthropic
      // Messages API requires the message array to start with role
      // 'user'; an assistant-first array is an invalid request (400),
      // which this route's outer catch flattens to a generic 500 with no
      // distinguishing detail. Since the seed is never actually part of
      // the real API conversation (the model doesn't need its own scripted
      // opener echoed back), strip a leading assistant message before
      // sending — display state is untouched, only the wire payload
      // changes. This affected every turn of every conversation this
      // component has ever run in production; the component was
      // effectively broken from turn one at every call site since launch.
      const apiMessages = nextMessages[0]?.role === 'assistant'
        ? nextMessages.slice(1)
        : nextMessages

      const res = await fetch('/api/nora-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt,
          conversationKey,
        }),
      })
      const data = await res.json()
      const content = data.content

      // ROOT CAUSE FIX Aug 21 2026 — found live during the Game Room
      // interests onboarding walkthrough: a transient failure here (the
      // route returns { error } with a non-2xx status on any noraChat()
      // failure) used to just console.error and silently return, leaving
      // the typing indicator disappear with no reply, no error shown, and
      // — since input was already cleared at the top of send() — the
      // user's typed answer gone with no way to recover it short of
      // retyping. Combined with this page having no draft-save until the
      // whole conversation completes, a single transient hiccup could
      // strand someone with real, if lower, odds of just giving up.
      // Now surfaces an inline error in the thread and restores the text
      // to the input so retrying is one tap, not a retype.
      if (!res.ok || !content) {
        console.error('[NoraConversation] empty response:', data)
        setMessages([...nextMessages, {
          role: 'assistant',
          content: "Sorry, that didn't go through — can you try sending it again?",
          isError: true,
        }])
        setInput(text)
        return
      }

      const assistantMsg = { role: 'assistant', content }
      const finalMessages = [...nextMessages, assistantMsg]
      setMessages(finalMessages)

      if (!completedRef.current && completionTrigger && content.includes(completionTrigger)) {
        completedRef.current = true
        onComplete?.(finalMessages)
      }
    } catch (err) {
      console.error('[NoraConversation] send error:', err)
      setMessages([...nextMessages, {
        role: 'assistant',
        content: "Sorry, that didn't go through — can you try sending it again?",
        isError: true,
      }])
      setInput(text)
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
                  <div className={`w-2 h-2 rounded-full ${msg.isError ? 'bg-neutral-300' : 'bg-[#F2A090]'}`} />
                  <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-neutral-400">{msg.isError ? 'Not sent' : 'Nora'}</span>
                </div>
                <div className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border ${msg.isError ? 'bg-neutral-50 border-neutral-200' : 'bg-white border-neutral-100'}`}>
                  <p
                    className={`text-[15px] leading-relaxed whitespace-pre-wrap ${msg.isError ? 'text-neutral-500 italic' : 'text-neutral-800'}`}
                    style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400 }}
                  >
                    {completionTrigger && !msg.isError
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
