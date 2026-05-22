'use client'
import { useState, useEffect } from 'react'

export default function ThursdayCard({ userId, coupleId, userName, partnerName, session }) {
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!userId || !coupleId || !session) return
    fetch(`/api/thursday/today?coupleId=${coupleId}`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    })
      .then(r => r.json())
      .then(d => {
        setEntry(d.entry)
        if (d.entry?.myResponse) setSubmitted(true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, coupleId, session])

  const handleSubmit = async () => {
    if (!response.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/thursday/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ coupleId, response })
      })
      setSubmitted(true)
      setEntry(prev => ({ ...prev, myResponse: response }))
    } catch {}
    setSubmitting(false)
  }

  if (loading || !entry) return null

  const isRevealed = entry.status === 'revealed'

  // PRE-RESPONSE VIEW
  if (!submitted && !isRevealed) {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Nora · Thursday</span>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#1A1A1A', lineHeight: 1.7, margin: '0 0 8px', fontStyle: 'italic' }}>{entry.myObservation}</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#C4694F', lineHeight: 1.7, margin: '0 0 16px' }}>{entry.myQuestion}</p>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="What comes up for you?"
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #E8E0D8', borderRadius: 10, fontSize: 14, resize: 'none', background: '#FFF8F4', color: '#1A1A1A', lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'system-ui' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: '#B0A8A0' }}>Nora reveals tonight at 7pm</span>
            <button
              onClick={handleSubmit}
              disabled={!response.trim() || submitting}
              style={{ background: response.trim() ? '#C4694F' : '#E8E0D8', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 100, fontSize: 14, cursor: response.trim() ? 'pointer' : 'default', fontWeight: 500, transition: 'background 0.15s' }}
            >{submitting ? 'Saving...' : 'Share with Nora'}</button>
          </div>
        </div>
      </div>
    )
  }

  // POST-RESPONSE, PRE-REVEAL VIEW
  if (submitted && !isRevealed) {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Nora · Thursday</span>
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: '#6B6560', lineHeight: 1.7, margin: '0 0 8px', fontStyle: 'italic' }}>Nora has what she needs.</p>
        <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0 }}>Check back tonight — she'll have something to show you both.</p>
      </div>
    )
  }

  // REVEAL VIEW
  if (isRevealed) {
    return (
      <div style={{ margin: '0 16px 16px', background: 'white', border: '0.5px solid #E8E0D8', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A96E' }}></div>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: '#C9A96E', textTransform: 'uppercase' }}>Nora · Thursday</span>
          </div>

          {/* My section */}
          <div style={{ background: '#FFF8F4', border: '0.5px solid #E8E0D8', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{userName}</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#6B6560', lineHeight: 1.6, margin: '0 0 8px', fontStyle: 'italic' }}>{entry.myObservation} {entry.myQuestion}</p>
            {entry.myResponse
              ? <p style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.6, margin: 0 }}>"{entry.myResponse}"</p>
              : <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0, fontStyle: 'italic' }}>Still thinking.</p>
            }
          </div>

          {/* Partner section */}
          <div style={{ background: '#FFF8F4', border: '0.5px solid #E8E0D8', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6560', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{partnerName}</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#6B6560', lineHeight: 1.6, margin: '0 0 8px', fontStyle: 'italic' }}>{entry.partnerObservation} {entry.partnerQuestion}</p>
            {entry.partnerResponse
              ? <p style={{ fontSize: 14, color: '#1A1A1A', lineHeight: 1.6, margin: 0 }}>"{entry.partnerResponse}"</p>
              : <p style={{ fontSize: 13, color: '#B0A8A0', margin: 0, fontStyle: 'italic' }}>Still thinking.</p>
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
