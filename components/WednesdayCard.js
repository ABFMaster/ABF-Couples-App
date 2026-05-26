'use client'
import { useState, useEffect } from 'react'

export default function WednesdayCard({ userId, coupleId, userName, partnerName, session }) {
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId || !coupleId || !session) return
    fetch(`/api/wednesday/today?coupleId=${coupleId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
      .then(r => r.json())
      .then(d => {
        setEntry(d.entry)
        if (d.entry?.mySentAt) setSubmitted(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, coupleId, session])

  const handleSend = async () => {
    if (!notice.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/wednesday/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ coupleId, notice, partnerName })
      })
      setSubmitted(true)
      setEntry(prev => ({ ...prev, myNotice: notice, mySentAt: new Date().toISOString() }))
    } catch {}
    setSubmitting(false)
  }

  if (loading || !entry) return null

  const isRevealed = entry.status === 'revealed'

  // PRE-SEND VIEW
  if (!submitted && !isRevealed) {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>The Notice · Wednesday</span>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1A1A1A', lineHeight: 1.7, margin: '0 0 4px' }}>
            What's one thing you've noticed about {partnerName} this week
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: '#1A1A1A', lineHeight: 1.7, margin: '0 0 16px' }}>
            that you haven't said out loud?
          </p>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          <textarea
            value={notice}
            onChange={e => setNotice(e.target.value)}
            placeholder={`Something specific about ${partnerName}...`}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #E8E0D8', borderRadius: 10, fontSize: 14, resize: 'none', background: '#FFF8F4', color: '#1A1A1A', lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'Georgia, serif' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: '#B0A8A0' }}>Sends directly to {partnerName}</span>
            <button
              onClick={handleSend}
              disabled={!notice.trim() || submitting}
              style={{ background: notice.trim() ? '#C4694F' : '#E8E0D8', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 100, fontSize: 14, cursor: notice.trim() ? 'pointer' : 'default', fontWeight: 500, transition: 'background 0.15s' }}
            >{submitting ? 'Sending...' : `Send to ${partnerName}`}</button>
          </div>
        </div>
      </div>
    )
  }

  // POST-SEND, WAITING FOR PARTNER OR REVEAL
  if (submitted && !isRevealed) {
    const partnerSent = !!entry.partnerSentAt
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>The Notice · Wednesday</span>
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.7, margin: '0 0 6px' }}>
          Sent to {partnerName}.
        </p>
        {partnerSent ? (
          <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0 }}>Nora reveals tonight at 7pm.</p>
        ) : (
          <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0 }}>{partnerName} hasn't sent theirs yet. Nora reveals tonight at 7pm either way.</p>
        )}
      </div>
    )
  }

  // REVEAL VIEW
  if (isRevealed) {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>The Notice · Wednesday</span>
          </div>

          {/* What you sent to partner */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#B0A8A0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>You noticed about {partnerName}</div>
            {entry.myNotice
              ? <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.7, margin: 0, background: '#FFF8F4', padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #C9A96E' }}>"{entry.myNotice}"</p>
              : <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0, fontStyle: 'italic' }}>You didn't send one today.</p>
            }
          </div>

          {/* What partner sent to you */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#B0A8A0', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{partnerName} noticed about you</div>
            {entry.partnerNotice
              ? <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.7, margin: 0, background: '#FFF8F4', padding: '12px 14px', borderRadius: 10, borderLeft: '3px solid #C4694F' }}>"{entry.partnerNotice}"</p>
              : <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0, fontStyle: 'italic' }}>{partnerName} didn't send one today.</p>
            }
          </div>
        </div>

        {/* Nora synthesis */}
        {entry.nora_synthesis && (
          <div style={{ background: '#1C1F3A', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E' }}></div>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Nora</span>
            </div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: 'white', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>{entry.nora_synthesis}</p>
          </div>
        )}
      </div>
    )
  }

  return null
}
