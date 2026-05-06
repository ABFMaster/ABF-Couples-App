'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function reset() {
    setIsOpen(false)
    setType(null)
    setMessage('')
    setSubmitting(false)
    setSubmitted(false)
  }

  async function handleSubmit() {
    if (!type) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: couple } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      await supabase.from('feedback').insert({
        user_id: user.id,
        couple_id: couple?.id || null,
        type,
        message: message || null,
        page_url: window.location.pathname,
      })

      setSubmitted(true)
      setTimeout(() => reset(), 1500)
    } catch (err) {
      console.error('[FeedbackButton] submit error:', err)
      setSubmitting(false)
    }
  }

  const typeButtons = [
    { key: 'bug', emoji: '🐛', label: 'Bug' },
    { key: 'suggestion', emoji: '💡', label: 'Idea' },
    { key: 'positive', emoji: '❤️', label: 'Good' },
  ]

  return (
    <>
      {!isOpen && (
        <div
          onClick={() => setIsOpen(true)}
          style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 25, background: '#1C1208', color: '#FAF6EF', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: 500, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', cursor: 'pointer', userSelect: 'none' }}
        >
          Feedback
        </div>
      )}

      {isOpen && (
        <>
          <div onClick={reset} style={{ position: 'fixed', inset: 0, background: 'rgba(28,18,8,0.4)', zIndex: 40 }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#FAF6EF', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px' }}>
            <div style={{ width: '40px', height: '4px', background: '#EDE5D8', borderRadius: '2px', margin: '0 auto 16px' }} />

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16px', color: '#C4714A', margin: 0 }}>✓ Got it. Thank you.</p>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16px', color: '#1C1208', margin: '0 0 4px' }}>Quick feedback</p>
                <p style={{ fontSize: '12px', color: '#A09080', margin: '0 0 16px' }}>One tap is enough</p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {typeButtons.map(btn => (
                    <button
                      key={btn.key}
                      onClick={() => setType(btn.key)}
                      style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 500, border: '0.5px solid #EDE5D8', cursor: 'pointer', background: type === btn.key ? '#1C1208' : 'white', color: type === btn.key ? 'white' : '#1C1208' }}
                    >
                      {btn.emoji} {btn.label}
                    </button>
                  ))}
                </div>

                {(type === 'bug' || type === 'suggestion') && (
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={type === 'bug' ? 'What happened? What were you doing?' : 'What would make this better?'}
                    rows={3}
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '0.5px solid #EDE5D8', background: 'white', fontSize: '13px', outline: 'none', marginTop: '12px', resize: 'none', boxSizing: 'border-box' }}
                  />
                )}

                {type && (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#C4714A', color: 'white', fontSize: '14px', fontWeight: 500, marginTop: '16px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                  >
                    {submitting ? 'Sending…' : 'Send'}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
