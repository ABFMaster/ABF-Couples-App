'use client'

// Shared-slot wrapper for "The Follow-Through". See Sessions/NOW_DO_THIS_DESIGN.md
// and Sessions/FOLLOW_THROUGH_GENERATION_SPEC.md for the full design.
//
// This does NOT add a new card to the dashboard. It wraps whatever today's
// scheduled activity card already is (Bet in v1) and, when there's an
// unresolved Follow-Through from the previous trigger, shows that instead —
// same slot, same size — until the user reports and taps through. The flip
// is a wipe, not a reveal: it only ever means "this closed, here's today."
// If there's nothing to show, this renders `children` directly, instantly.

import { useState, useEffect, useCallback } from 'react'

function ReportFace({ data, onDone, onFlip, activityLabel }) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pickSubmitting, setPickSubmitting] = useState(null)

  const submit = async (status) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onDone(status, note.trim() || null)
    } finally {
      setSubmitting(false)
    }
  }

  const pick = async (index) => {
    if (pickSubmitting !== null) return
    setPickSubmitting(index)
    try {
      await onDone('pick', null, index)
    } finally {
      setPickSubmitting(null)
    }
  }

  const wrapperStyle = {
    background: '#1C1510',
    borderRadius: '20px',
    padding: '24px',
    border: data.wildcard ? '1.5px solid #D4A853' : '0.5px solid #3D2E1E',
    boxShadow: '0 4px 24px rgba(28, 21, 16, 0.15)',
    position: 'relative',
  }

  // Partner-authored wildcard — I'm the one picking, nothing else to show
  if (data.candidatesForMeToPick?.length) {
    return (
      <div style={wrapperStyle}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>
          Tonight is a wildcard
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#F5ECD7', textAlign: 'center', lineHeight: 1.4, marginBottom: '20px' }}>
          Pick one for them tonight.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.candidatesForMeToPick.map((c, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={pickSubmitting !== null}
              style={{
                textAlign: 'left', padding: '14px 16px', background: '#2A1E14',
                border: '1.5px solid #3D2E1E', borderRadius: '14px', color: '#F5ECD7',
                fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', lineHeight: 1.4,
                cursor: pickSubmitting !== null ? 'default' : 'pointer',
                opacity: pickSubmitting !== null && pickSubmitting !== i ? 0.4 : 1,
              }}
            >
              {c.action_text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Awaiting partner's pick for me — nothing to do yet
  if (data.mine.status === 'awaiting_partner_pick') {
    return (
      <div style={wrapperStyle}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
          Tonight is a wildcard
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#C4B49A', textAlign: 'center', lineHeight: 1.4 }}>
          Someone is picking something for you tonight.
        </p>
      </div>
    )
  }

  const resolved = ['done', 'declined', 'expired'].includes(data.mine.status)

  // Not yet reported — the actual invitation
  if (!resolved) {
    return (
      <div style={wrapperStyle}>
        {data.wildcard && (
          <div style={{ position: 'absolute', top: '-1px', right: '14px', background: '#D4A853', color: '#1C1410', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: '0 0 8px 8px' }}>
            WILDCARD
          </div>
        )}
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginTop: data.wildcard ? '14px' : 0, marginBottom: '8px' }}>
          Follow-Through
        </p>
        {data.theirs?.status && data.theirs.status !== 'pending' && (
          <p style={{ fontSize: '11px', color: '#8A7A62', textAlign: 'center', marginBottom: '14px' }}>
            Already checked in on their side
          </p>
        )}
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#F5ECD7', textAlign: 'center', lineHeight: 1.4, marginBottom: '22px' }}>
          {data.mine.actionText}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button
            onClick={() => submit('done')}
            disabled={submitting}
            style={{ flex: 1, padding: '12px', background: '#D4A853', color: '#1C1410', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '30px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            Did it
          </button>
          <button
            onClick={() => submit('declined')}
            disabled={submitting}
            style={{ flex: 1, padding: '12px', background: '#2A1E14', color: '#C4B49A', fontSize: '13px', border: '0.5px solid #3D2E1E', borderRadius: '30px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            Didn&apos;t get to it
          </button>
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What happened? (optional)"
          rows={2}
          style={{ width: '100%', background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#F5ECD7', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
    )
  }

  // Reported — Tier 1 always, Tier 2 if both are in, then the tap-through
  return (
    <div style={wrapperStyle}>
      <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
        {data.bothReported ? 'Follow-Through — both in' : 'Follow-Through'}
      </p>

      {data.mine.soloReaction && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '18px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4A853', flexShrink: 0, marginTop: '5px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#C4B49A', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
            {data.mine.soloReaction}
          </p>
        </div>
      )}

      {!data.bothReported && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5A4A38', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: '#5A4A38', margin: 0 }}>Waiting on them to check in</p>
        </div>
      )}

      {data.bothReported && data.theirs?.directed === 'self' && data.theirs?.actionText && (
        <div style={{ background: '#2A1E14', border: '1px solid #3D2E1E', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#D4A853', textTransform: 'uppercase', marginBottom: '6px' }}>What they did</p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#F5ECD7', lineHeight: 1.5, margin: 0 }}>{data.theirs.actionText}</p>
        </div>
      )}

      {data.bothReported && data.mutualSynthesis && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '18px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D4A853', flexShrink: 0, marginTop: '5px' }} />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#C4B49A', fontStyle: 'italic', lineHeight: 1.55, margin: 0 }}>
            {data.mutualSynthesis}
          </p>
        </div>
      )}

      <button
        onClick={onFlip}
        style={{ width: '100%', padding: '12px', background: '#1C1410', color: '#FAF6F0', fontSize: '13px', fontWeight: 500, border: '1px solid #3D2E1E', borderRadius: '30px', cursor: 'pointer', marginTop: '4px' }}
      >
        See today&apos;s {activityLabel} →
      </button>
    </div>
  )
}

export default function FollowThroughCard({ userId, coupleId, children, activityLabel = 'Bet' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flipped, setFlipped] = useState(false)

  const load = useCallback(async () => {
    if (!userId || !coupleId) { setLoading(false); return }
    try {
      const res = await fetch(`/api/follow-through/today?userId=${userId}&coupleId=${coupleId}`)
      const json = await res.json()
      setData(json)
    } catch {
      setData({ active: false })
    } finally {
      setLoading(false)
    }
  }, [userId, coupleId])

  useEffect(() => { load() }, [load])

  if (loading || !data?.active) {
    return children
  }

  const handleReport = async (status, note, candidateIndex) => {
    const isPick = status === 'pick'
    await fetch('/api/follow-through/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isPick
          ? { action: 'pick', followThroughId: data.id, userId, coupleId, candidateIndex }
          : { action: 'report', followThroughId: data.id, userId, coupleId, status, note }
      ),
    })
    await load()
  }

  const handleFlip = async () => {
    setFlipped(true)
    fetch('/api/follow-through/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'moved_on', followThroughId: data.id, userId, coupleId }),
    }).catch(() => {})
  }

  return (
    <div style={{ perspective: '1200px' }}>
      <div
        style={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>
          <ReportFace data={data} onDone={handleReport} onFlip={handleFlip} activityLabel={activityLabel} />
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
