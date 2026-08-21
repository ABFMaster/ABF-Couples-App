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

import { useState, useEffect, useCallback, cloneElement, isValidElement } from 'react'

function ReportFace({ data, onDone, onFlip, activityLabel, variant = 'standalone' }) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pickSubmitting, setPickSubmitting] = useState(null)
  // ROOT CAUSE FIX Aug 13 2026 — Matt reported tapping "Did it" (with a note
  // typed first), seeing it seemingly go through, then finding it reverted
  // to the unresolved entry card with the note gone when he came back later.
  // handleReport's fetch had no res.ok check, so any failed write (auth
  // hiccup, flaky connection — Matt's screenshot shows 1-2 signal bars) was
  // silently swallowed: load() would just re-fetch the still-unresolved row
  // and the note, which only ever lived in this component's local state,
  // was gone on next mount. Now a failed submit surfaces inline and keeps
  // the note in the box so the user can just retry instead of losing it.
  const [submitError, setSubmitError] = useState(false)

  // Blended (same-source, same-session) gets quieter chrome — it's appended
  // below the activity card the user is already looking at, not a takeover.
  // Wildcards always keep the full bold treatment regardless of variant;
  // that's a deliberate "this is a real event" signal per the design spec.
  const isBlended = variant === 'blended' && !data.wildcard

  const submit = async (status) => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(false)
    try {
      await onDone(status, note.trim() || null)
    } catch {
      setSubmitError(true)
    } finally {
      setSubmitting(false)
    }
  }

  const pick = async (index) => {
    if (pickSubmitting !== null) return
    setPickSubmitting(index)
    setSubmitError(false)
    try {
      await onDone('pick', null, index)
    } catch {
      setSubmitError(true)
    } finally {
      setPickSubmitting(null)
    }
  }

  const wrapperStyle = {
    background: '#1C1510',
    // Blended: square top corners so this fuses directly to the bottom of
    // the card above with zero gap, instead of reading as a second card.
    // A hairline top divider marks the transition without breaking the shape.
    borderRadius: isBlended ? '0 0 20px 20px' : '20px',
    borderTop: isBlended ? '1px solid rgba(212,168,83,0.12)' : undefined,
    padding: isBlended ? '16px' : '24px',
    border: data.wildcard ? '1.5px solid #D4A853' : (isBlended ? undefined : '0.5px solid #3D2E1E'),
    boxShadow: isBlended ? 'none' : '0 4px 24px rgba(28, 21, 16, 0.15)',
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
        {submitError && (
          <p style={{ fontSize: '11px', color: '#C4714A', textAlign: 'center', margin: '10px 0 0' }}>
            Didn&apos;t save — check your connection and try again.
          </p>
        )}
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
        <p style={{ fontSize: isBlended ? '9px' : '11px', letterSpacing: '0.2em', color: isBlended ? '#B99B6B' : '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginTop: data.wildcard ? '14px' : 0, marginBottom: isBlended ? '6px' : '8px' }}>
          Follow-Through
        </p>
        {data.theirs?.status && data.theirs.status !== 'pending' && (
          <p style={{ fontSize: '11px', color: '#8A7A62', textAlign: 'center', marginBottom: '14px' }}>
            Already checked in on their side
          </p>
        )}
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: isBlended ? '15px' : '18px', color: '#F5ECD7', textAlign: 'center', lineHeight: 1.4, marginBottom: isBlended ? '16px' : '22px' }}>
          {data.mine.actionText}
        </p>
        {/* Note field moved above the buttons — Did it/Didn't get to it submit
            immediately using whatever's in this box at tap time, so it has to
            come first or a note typed afterward never makes it into the
            report. The old order (buttons, then textarea below) visually
            implied you could add a note after tapping, which isn't how it
            actually works. */}
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="What happened? (optional)"
          rows={2}
          style={{ width: '100%', background: '#2A1E14', border: '1.5px solid #3D2E1E', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#F5ECD7', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '8px', marginBottom: submitError ? '8px' : 0 }}>
          <button
            onClick={() => submit('done')}
            disabled={submitting}
            style={{ flex: 1, padding: isBlended ? '10px' : '12px', background: '#D4A853', color: '#1C1410', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '30px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            Did it
          </button>
          <button
            onClick={() => submit('declined')}
            disabled={submitting}
            style={{ flex: 1, padding: isBlended ? '10px' : '12px', background: '#2A1E14', color: '#C4B49A', fontSize: '13px', border: '0.5px solid #3D2E1E', borderRadius: '30px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1 }}
          >
            Didn&apos;t get to it
          </button>
        </div>
        {submitError && (
          <p style={{ fontSize: '11px', color: '#C4714A', textAlign: 'center', margin: 0 }}>
            Didn&apos;t save — check your connection and try again.
          </p>
        )}
      </div>
    )
  }

  // Reported — Tier 1 always, Tier 2 if both are in, then the tap-through
  return (
    <div style={wrapperStyle}>
      <p style={{ fontSize: isBlended ? '9px' : '10px', letterSpacing: '0.14em', color: isBlended ? '#B99B6B' : '#D4A853', textTransform: 'uppercase', textAlign: 'center', marginBottom: isBlended ? '12px' : '16px' }}>
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

      {/* Other-directed: I did this FOR/TO my partner, so I already lived it
          with them in the real world — there's nothing left for me to wait
          on. Waiting on their report is only meaningful when it's actually
          new information I don't already have (self-directed actions, where
          I have no other way of knowing what they did). Closing this loop
          is their job, not something my own card should hold me in. */}
      {!data.bothReported && data.mine.directed !== 'other' && (
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

      {/* Blended mode has no "See today's X" continue button — the activity
          it would flip to is already visible right above this, not hidden
          behind it. That button only makes sense for the standalone
          carryover case, where the activity really is hidden until tapped. */}
      {variant !== 'blended' && (
        <button
          onClick={onFlip}
          style={{ width: '100%', padding: '12px', background: '#1C1410', color: '#FAF6F0', fontSize: '13px', fontWeight: 500, border: '1px solid #3D2E1E', borderRadius: '30px', cursor: 'pointer', marginTop: '4px' }}
        >
          See today&apos;s {activityLabel} →
        </button>
      )}
    </div>
  )
}

export default function FollowThroughCard({ userId, coupleId, session, children, activityLabel = 'Bet', currentSourceId = null }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [blendVisible, setBlendVisible] = useState(false)

  // Standalone flip phases: 'resting' (report card alone, self-sized --
  // today's activity isn't in the DOM at all) -> 'entering' (both faces
  // mount at rotateY(0), one paint) -> 'flipping' (transitions to 180deg)
  // -> 'settled' (drop the flip wrapper, render children alone). Today's
  // activity card only ever exists in the DOM for the brief entering/
  // flipping window around the actual transition, never just sitting there
  // hidden the whole time -- that hidden sibling was the source of the
  // sizing bugs, in both directions (it was inflating the resting card's
  // height; left as the old design, it would do the same in reverse once
  // resolved, with the now-hidden report face sitting behind the activity).
  const [phase, setPhase] = useState('resting')

  const load = useCallback(async () => {
    if (!userId || !coupleId) { setLoading(false); return }
    try {
      const res = await fetch(`/api/follow-through/today?coupleId=${coupleId}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      })
      const json = await res.json()
      setData(json)
    } catch {
      setData({ active: false })
    } finally {
      setLoading(false)
    }
  }, [userId, coupleId, session])

  useEffect(() => { load() }, [load])

  // Fresh row (a new id) always starts at rest, regardless of whatever
  // phase a previous row had settled into.
  useEffect(() => { setPhase('resting') }, [data?.id])

  // entering -> flipping is a two-frame handoff: the flip wrapper needs one
  // real paint at rotateY(0) before the transform change to 180deg so the
  // CSS transition actually has something to animate from, rather than
  // mounting already at its end state.
  useEffect(() => {
    if (phase !== 'entering') return
    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase('flipping'))
    })
    return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2) }
  }, [phase])

  // Same-source Follow-Throughs (generated from the activity currently in
  // `children` — e.g. tonight's Bet) don't swap the slot away; they blend
  // into it instead, appended below, so results stay visible. Only a
  // carried-over Follow-Through whose source no longer matches (a new day's
  // Bet has already been generated) takes over the slot standalone. Without
  // a refetch trigger, a same-session blend would otherwise only appear
  // after a full nav-away/back forced a fresh mount — poll while inactive so
  // it surfaces live instead. Scoped to callers that pass currentSourceId
  // (Bet, for now) so Spark/Wednesday/Thursday's existing mount-only-fetch
  // behavior stays untouched until this is validated and generalized.
  useEffect(() => {
    if (!currentSourceId) return
    if (!userId || !coupleId) return
    if (data?.active) return
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [currentSourceId, userId, coupleId, data?.active, load])

  const isBlend = !!(data?.active && currentSourceId && data.sourceId === currentSourceId)

  // ROOT CAUSE FIX Aug 12 2026 — the previous design gated the blend fade-in
  // almost entirely on the user tapping BOTH a reaction pill AND a rating
  // pill (a two-step optional interaction most people don't complete
  // quickly, if ever), with a tab-return or a 45-second timer as backup. In
  // practice the 45s timer was doing most of the work, which is exactly the
  // "Follow-Through shows up 45 seconds after the reveal" lag Matt flagged
  // via screenshot — and a tab-return signal doesn't fire at all for anyone
  // who just keeps reading in the foreground. Replaced with a single
  // `onRevealed` signal: each activity card now calls this the moment ITS
  // OWN reveal choreography finishes (BetCard/SparkCard's pillsShown;
  // Wednesday/Thursday still fire immediately on load, since neither has a
  // reveal animation to protect) — independent of whether the user ever
  // taps anything. Follow-Through then slides in shortly after, as a
  // continuation of the reveal moment itself rather than a delayed, separate
  // pop-in.
  const [revealed, setRevealed] = useState(false)
  const handleRevealed = useCallback(() => setRevealed(true), [])

  useEffect(() => {
    if (!isBlend) { setBlendVisible(false); setRevealed(false); return }
    if (!revealed) return
    const t = setTimeout(() => setBlendVisible(true), 500)
    return () => clearTimeout(t)
  }, [isBlend, revealed])

  const blendChildren = isBlend && isValidElement(children)
    ? cloneElement(children, { onRevealed: handleRevealed })
    : children

  // ROOT CAUSE FIX Aug 21 2026 — Matt reported the Spark and Notice cards'
  // reveal appearing to finish, then "quickly reloading" the same content
  // moments later. Root cause: this used to `return children` bare
  // whenever there was no active same-source Follow-Through yet, then
  // switch to `return <div>{blendChildren}{followThroughBlock}</div>`
  // (a NEW div ancestor around the same activity card) the moment isBlend
  // flipped true — which happens automatically, mid-session, via the
  // 8-second poll below once a Follow-Through generates for TODAY's Spark/
  // Notice/Bet (typically right around when the reveal itself completes,
  // since both are triggered by the same response-submission). Wrapping an
  // already-mounted child in a new parent type at the same tree position
  // is exactly what forces React to unmount + remount it — resetting
  // SparkCard/WednesdayCard's local reveal-animation state and re-running
  // their mount effects, which is what actually looked like a "reload."
  // The data itself never changed; only the DOM identity did. Fixed by
  // keeping the wrapper shape identical across both states — same outer
  // div always present once loading resolves, only its style/contents
  // vary — so the activity card's ancestor chain never changes shape and
  // React preserves its instance (and in-flight animation) across the
  // isBlend transition.
  if (loading) {
    return children
  }

  if (!data?.active) {
    return <div>{children}</div>
  }

  const handleReport = async (status, note, candidateIndex) => {
    const isPick = status === 'pick'
    const res = await fetch('/api/follow-through/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(
        isPick
          ? { action: 'pick', followThroughId: data.id, coupleId, candidateIndex }
          : { action: 'report', followThroughId: data.id, coupleId, status, note }
      ),
    })
    // ROOT CAUSE FIX Aug 13 2026 — this used to ignore the response entirely,
    // so a failed write (fetch only rejects on network failure, not on a
    // non-2xx status) still fell through to load(), which just re-fetched
    // the unchanged row and silently reverted the UI to "unresolved" with no
    // error shown. See matching comment in ReportFace's submit().
    if (!res.ok) throw new Error('Follow-Through report failed')
    await load()
  }

  const handleFlip = async () => {
    setPhase('entering')
    fetch('/api/follow-through/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ action: 'moved_on', followThroughId: data.id, coupleId }),
    }).catch(() => {})
  }

  if (isBlend) {
    // Wildcard days keep their own full card, gap included — that's a
    // deliberate "this is a bigger, separate moment" signal, not something
    // to fuse away. Everything else fuses into one continuous shape: shared
    // background + radius + overflow:hidden on the outer wrapper means Bet's
    // own rounded bottom corners get absorbed into the same shape instead of
    // leaving a visible seam, with zero gap between the two sections.
    const followThroughBlock = (
      <div
        style={{
          marginTop: data.wildcard ? '8px' : 0,
          opacity: blendVisible ? 1 : 0,
          transform: blendVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 900ms ease, transform 900ms ease',
        }}
      >
        <ReportFace data={data} onDone={handleReport} onFlip={handleFlip} activityLabel={activityLabel} variant="blended" />
      </div>
    )

    if (data.wildcard) {
      return (
        <>
          {blendChildren}
          {followThroughBlock}
        </>
      )
    }

    return (
      <div style={{ background: '#1C1510', borderRadius: '20px', overflow: 'hidden' }}>
        {blendChildren}
        {followThroughBlock}
      </div>
    )
  }

  // Resting: report card alone, in normal document flow — sized purely by
  // its own content. Today's activity card (children) isn't mounted at all,
  // so it can't influence this card's height regardless of how tall it is.
  if (phase === 'resting') {
    return <ReportFace data={data} onDone={handleReport} onFlip={handleFlip} activityLabel={activityLabel} variant="standalone" />
  }

  // Settled: the flip finished and this Follow-Through is done — drop the
  // flip wrapper entirely and render children alone, also in normal flow.
  // No lingering hidden report face to affect this card's sizing either.
  if (phase === 'settled') {
    return children
  }

  // entering / flipping: the brief transition window where both faces
  // genuinely need to coexist for the animation to work. This is the only
  // time today's activity card is mounted before it's actually showing.
  return (
    <div style={{ perspective: '1200px' }}>
      <div
        style={{
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
          transform: phase === 'flipping' ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget && phase === 'flipping') setPhase('settled') }}
      >
        <div style={{ backfaceVisibility: 'hidden' }}>
          <ReportFace data={data} onDone={handleReport} onFlip={handleFlip} activityLabel={activityLabel} variant="standalone" />
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
