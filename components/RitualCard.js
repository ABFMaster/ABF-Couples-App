'use client'

import { useState, useEffect } from 'react'
import { RITUAL_SUGGESTIONS, getStarterRituals } from '@/lib/ritual-suggestions'
import { getWeekStart } from '@/lib/dates'

const TIER1 = RITUAL_SUGGESTIONS.filter(r => r.tier === 1)

const NORA_WEEK_MESSAGES = {
  1: "Give this three weeks before you decide. That's the minimum for something to start feeling natural. Check in here each Friday and let Nora know how it's going.",
  2: "Two weeks in. Research shows it takes about 21 days for something to feel automatic. You're most of the way there. Keep going.",
  3: "Week three. If this has shown up in your week at all — even imperfectly — that's the ritual working. One more week and you can make it official.",
}

// ─── Shared style helpers ─────────────────────────────────────────────────────

const WRAPPER = {
  background: '#FAF6F0',
  border: '0.5px solid #E8DDD0',
  borderRadius: '20px',
  padding: '28px 20px',
}

function RitualLabel() {
  return (
    <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#2D5016', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
      The Ritual
    </p>
  )
}

function NoraBlock({ text }) {
  return (
    <div style={{ background: '#F4FAF0', border: '0.5px solid #C4DDB4', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3D6B22', flexShrink: 0 }} />
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#2D5016', textTransform: 'uppercase' }}>Nora</p>
      </div>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#2D5016', fontStyle: 'italic', lineHeight: 1.65 }}>
        {text}
      </p>
    </div>
  )
}

function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: '100%',
        padding: '14px',
        background: '#3D6B22',
        color: '#FAF6F0',
        border: 'none',
        borderRadius: '30px',
        fontSize: '15px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'opacity 150ms',
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px',
        background: 'transparent',
        border: '0.5px solid #D4E8C4',
        borderRadius: '30px',
        color: '#7A8C6E',
        fontSize: '14px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function StreakPill({ label }) {
  return (
    <span style={{ background: '#EAF5E0', border: '0.5px solid #C4DDB4', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: '#2D5016' }}>
      {label}
    </span>
  )
}

function SectionLabel({ text }) {
  return (
    <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7A8C6E', textTransform: 'uppercase', marginBottom: '10px' }}>
      {text}
    </p>
  )
}

function Divider() {
  return <div style={{ borderTop: '0.5px solid #E8EEE2', margin: '20px 0' }} />
}

function RitualAccentCard({ label, title, description }) {
  return (
    <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
      {label && <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</p>}
      {title && <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A2E10', lineHeight: 1.55, fontWeight: 500 }}>{title}</p>}
      {description && <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginTop: '6px' }}>{description}</p>}
    </div>
  )
}

// Suggestion cycling UI — used in State 1 suggestion mode, retired mode, and State 3 discover mode
function SuggestionCycle({ index, onNext, onSelect, submitting, usedIds = [] }) {
  const available = TIER1.filter(s => !usedIds.includes(s.id))
  const list = available.length > 0 ? available : TIER1
  const suggestion = list[index % list.length]
  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <RitualAccentCard
          label={suggestion.frequency}
          title={suggestion.title}
          description={suggestion.description}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <PrimaryBtn onClick={() => onSelect(suggestion)} disabled={submitting}>
          We'll try this one
        </PrimaryBtn>
        <GhostBtn onClick={onNext}>Show me another</GhostBtn>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RitualCard({ userId, coupleId, partnerName }) {
  const [loading, setLoading] = useState(true)
  const [rituals, setRituals] = useState([])
  const [completions, setCompletions] = useState([])
  const [hasRituals, setHasRituals] = useState(false)

  // State 1 — own ritual entry
  const [textarea1, setTextarea1] = useState('')
  const [textarea2, setTextarea2] = useState('')
  const [suggestionMode, setSuggestionMode] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(0)

  // State 2 — discovering / check-in flow
  const [checkinResult, setCheckinResult] = useState(null) // 'completed' | 'missed' | 'retired'
  const [updatedStreak, setUpdatedStreak] = useState(null)
  const [adoptionReady, setAdoptionReady] = useState(false)
  // Separate suggestion index for retired mode so it doesn't share with State 1
  const [retiredSuggestionIndex, setRetiredSuggestionIndex] = useState(0)

  // State 3 — library + discover more
  const [discoverMode, setDiscoverMode] = useState(false)
  const [discoverIndex, setDiscoverIndex] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(null)
  const [discussConfirmed, setDiscussConfirmed] = useState(false)
  const [nextSuggestion, setNextSuggestion] = useState(null)
  const [usedSuggestionIds, setUsedSuggestionIds] = useState([])

  useEffect(() => {
    fetch(`/api/ritual/status?userId=${userId}&coupleId=${coupleId}`)
      .then(r => r.json())
      .then(data => {
        setHasRituals(data.hasRituals || false)
        setRituals(data.rituals || [])
        setCompletions(data.completions || [])
        const pending = (data.rituals || []).find(
          r => r.status === 'pending' && String(r.proposed_by) !== String(userId) && !r.needs_discussion
        )
        setPendingConfirmation(pending || null)
        const used = data.usedSuggestionIds || []
        setUsedSuggestionIds(used)
        const tier1 = getStarterRituals()
        setNextSuggestion(tier1.find(s => !used.includes(s.id)) || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId, coupleId])

  // ─── Derived state ──────────────────────────────────────────────────────────

  const activeRituals = rituals.filter(r => r.status !== 'retired')
  const discoveringRituals = activeRituals.filter(r => r.status === 'discovering')
  const adoptedRituals = activeRituals.filter(r => r.status === 'adopted')
  const restingRituals = activeRituals.filter(r => r.status === 'resting')
  const needsDiscussionRituals = rituals.filter(r => r.needs_discussion === true)

  let appState
  if (loading) appState = 'LOADING'
  else if (!hasRituals || activeRituals.length === 0) appState = 'NONE'
  else if (discoveringRituals.length > 0) appState = 'DISCOVERING'
  else appState = 'LIBRARY'

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const refetchAndCheckPending = async () => {
    const res = await fetch(`/api/ritual/status?userId=${userId}&coupleId=${coupleId}`)
    const data = await res.json()
    setHasRituals(data.hasRituals || false)
    setRituals(data.rituals || [])
    setCompletions(data.completions || [])
    const nextPending = (data.rituals || []).find(
      r => r.status === 'pending' && String(r.proposed_by) !== String(userId) && !r.needs_discussion
    )
    setPendingConfirmation(nextPending || null)
    const used = data.usedSuggestionIds || []
    setUsedSuggestionIds(used)
    const tier1 = getStarterRituals()
    setNextSuggestion(tier1.find(s => !used.includes(s.id)) || null)
  }

  const handleConfirmPending = async (action) => {
    if (submitting || !pendingConfirmation) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId: pendingConfirmation.id, action }),
      })
      if (action === 'discuss') {
        setDiscussConfirmed(true)
        setTimeout(() => {
          setDiscussConfirmed(false)
          refetchAndCheckPending()
        }, 3000)
      } else {
        await refetchAndCheckPending()
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleRevisit = async (ritual) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId: ritual.id, action: 'confirm' }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals(prev => prev.map(r => r.id === data.ritual.id ? data.ritual : r))
        setHasRituals(true)
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleNextLibrarySuggestion = () => {
    const tier1 = getStarterRituals()
    const currentIdx = nextSuggestion ? tier1.findIndex(s => s.id === nextSuggestion.id) : -1
    const rest = [...tier1.slice(currentIdx + 1), ...tier1.slice(0, currentIdx + 1)]
    setNextSuggestion(rest.find(s => !usedSuggestionIds.includes(s.id)) || null)
  }

  const handleAddOwn = async () => {
    if (!textarea1.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          title: textarea1.trim(),
          description: textarea2.trim() || null,
          frequency: 'weekly',
          tier: 1,
        }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals([data.ritual])
        setHasRituals(true)
        setSuggestionMode(false)
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleSelectSuggestion = async (suggestion) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          suggestionId: suggestion.id,
          title: suggestion.title,
          description: suggestion.description,
          frequency: suggestion.frequency,
          tier: suggestion.tier,
        }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals(prev => [data.ritual, ...prev.filter(r => r.id !== data.ritual.id)])
        setHasRituals(true)
        setSuggestionMode(false)
        setCheckinResult(null)
        setAdoptionReady(false)
        // If pending, show confirmation prompt to partner
        if (data.ritual.status === 'pending') {
          setPendingConfirmation(null) // partner will see it on their next load
        }
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleCheckin = async (completed, ritual) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          ritualId: ritual.id,
          completed,
          weekStart: getWeekStart(),
        }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals(prev => prev.map(r => r.id === data.ritual.id ? data.ritual : r))
        setUpdatedStreak(data.ritual.streak)
        if (completed && data.ritual.streak >= 3) {
          setAdoptionReady(true)
        }
      }
      setCheckinResult(completed ? 'completed' : 'missed')
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleRetire = async (ritual) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          ritualId: ritual.id,
          completed: false,
          weekStart: getWeekStart(),
        }),
      })
      setRituals(prev => prev.map(r => r.id === ritual.id ? { ...r, status: 'retired' } : r))
      setCheckinResult('retired')
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleAdopt = async (ritual) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId: ritual.id }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals(prev => prev.map(r => r.id === data.ritual.id ? data.ritual : r))
        setCheckinResult(null)
        setAdoptionReady(false)
        setUpdatedStreak(null)
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  const handleDiscoverMore = async (suggestion) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/ritual/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          suggestionId: suggestion.id,
          title: suggestion.title,
          description: suggestion.description,
          frequency: suggestion.frequency,
          tier: suggestion.tier,
        }),
      })
      const data = await res.json()
      if (data.ritual) {
        setRituals(prev => [...prev.filter(r => r.id !== data.ritual.id), data.ritual])
        setDiscoverMode(false)
        setCheckinResult(null)
        setAdoptionReady(false)
        setUpdatedStreak(null)
        if (suggestion.id) {
          const newUsed = [...usedSuggestionIds, suggestion.id]
          setUsedSuggestionIds(newUsed)
          const tier1 = getStarterRituals()
          setNextSuggestion(tier1.find(s => !newUsed.includes(s.id)) || null)
        }
      }
    } catch {} finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  // STATE 4 — Loading
  if (appState === 'LOADING') {
    return (
      <div style={WRAPPER}>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center' }}>
          Nora is checking in...
        </p>
      </div>
    )
  }

  // STATE 0 — Pending confirmation (takes priority over all other states)
  if (pendingConfirmation) {
    if (discussConfirmed) {
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '16px', color: '#2D5016', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.6, padding: '20px 0' }}>
            Flagged for discussion. You'll see it on your home page until you two sort it out.
          </p>
        </div>
      )
    }
    return (
      <div style={WRAPPER}>
        <RitualLabel />
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#1A2E10', textAlign: 'center', marginBottom: '20px', fontWeight: 400 }}>
          {partnerName} wants to add a ritual
        </p>
        <NoraBlock text={`Rituals only work when you both want them. Take a look at what ${partnerName} is suggesting and let Nora know where you stand.`} />
        <div style={{ marginBottom: '20px' }}>
          <RitualAccentCard
            title={pendingConfirmation.title}
            description={pendingConfirmation.description}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PrimaryBtn onClick={() => handleConfirmPending('confirm')} disabled={submitting}>
            I'm in — add it
          </PrimaryBtn>
          <GhostBtn onClick={() => handleConfirmPending('discuss')}>
            Let's talk about it
          </GhostBtn>
        </div>
      </div>
    )
  }

  // STATE 1 — No rituals
  if (appState === 'NONE') {
    // Suggestion cycling mode
    if (suggestionMode) {
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#1A2E10', textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>
            Try something together
          </p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginBottom: '20px' }}>
            Something from Nora's list.
          </p>
          <SuggestionCycle
            index={suggestionIndex}
            onNext={() => setSuggestionIndex(prev => (prev + 1) % TIER1.length)}
            onSelect={handleSelectSuggestion}
            submitting={submitting}
            usedIds={usedSuggestionIds}
          />
          <div style={{ marginTop: '10px' }}>
            <GhostBtn onClick={() => setSuggestionMode(false)}>Add something we already do</GhostBtn>
          </div>
        </div>
      )
    }

    // Default: own ritual entry
    return (
      <div style={WRAPPER}>
        <RitualLabel />
        <NoraBlock text="Before I start suggesting things — tell me something you two already do together. Could be tiny, could be weird. Cook dinner together on Thursday. The Sunday walk. Anything that's become a thing." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {/* Card 1 */}
          <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '4px' }}>
              What do you do together?
            </p>
            <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginBottom: '10px' }}>
              A habit, a tradition, something that repeats and feels like yours.
            </p>
            <textarea
              value={textarea1}
              onChange={e => setTextarea1(e.target.value)}
              placeholder="We cook dinner together every Thursday night..."
              style={{
                width: '100%',
                background: '#FAF6F0',
                border: '0.5px solid #D4E8C4',
                borderRadius: '10px',
                padding: '12px',
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: '14px',
                color: '#1A2E10',
                resize: 'none',
                height: '80px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Card 2 */}
          <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '4px' }}>
              What makes it feel like yours?{' '}
              <span style={{ color: '#B8A898', fontSize: '10px', letterSpacing: 'normal', textTransform: 'none' }}>optional</span>
            </p>
            <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginBottom: '10px' }}>
              Why does it stick? What does it give you?
            </p>
            <textarea
              value={textarea2}
              onChange={e => setTextarea2(e.target.value)}
              placeholder="It's the one hour where we're not thinking about anything else..."
              style={{
                width: '100%',
                background: '#FAF6F0',
                border: '0.5px solid #D4E8C4',
                borderRadius: '10px',
                padding: '12px',
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: '14px',
                color: '#1A2E10',
                resize: 'none',
                height: '60px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PrimaryBtn onClick={handleAddOwn} disabled={!textarea1.trim() || submitting}>
            Add to our library
          </PrimaryBtn>
          <GhostBtn onClick={() => setSuggestionMode(true)}>
            We don't have one yet — suggest something
          </GhostBtn>
        </div>
      </div>
    )
  }

  // STATE 2 — Discovering
  if (appState === 'DISCOVERING') {
    const ritual = discoveringRituals[0]
    const weekNum = Math.min(ritual.streak + 1, 3)

    // Retired → suggestion cycling
    if (checkinResult === 'retired') {
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#1A2E10', textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>
            Try something together
          </p>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginBottom: '20px' }}>
            No worries. Let's find something that fits better.
          </p>
          <SuggestionCycle
            index={retiredSuggestionIndex}
            onNext={() => setRetiredSuggestionIndex(prev => (prev + 1) % TIER1.length)}
            onSelect={handleSelectSuggestion}
            submitting={submitting}
          />
        </div>
      )
    }

    // Adoption prompt (after week 3 completion)
    if (checkinResult === 'completed' && adoptionReady) {
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <StreakPill label="3 weeks" />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <RitualAccentCard label={ritual.frequency} title={ritual.title} description={ritual.description} />
          </div>
          <NoraBlock text="Three weeks. That's not a habit yet — but it's becoming one. Want to make it official?" />
          <PrimaryBtn onClick={() => handleAdopt(ritual)} disabled={submitting}>
            Make it ours
          </PrimaryBtn>
        </div>
      )
    }

    // Completed confirmation (streak < 3)
    if (checkinResult === 'completed' && !adoptionReady) {
      const streak = updatedStreak ?? ritual.streak
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <StreakPill label={`${streak} ${streak === 1 ? 'week' : 'weeks'}`} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <RitualAccentCard label={ritual.frequency} title={ritual.title} description={ritual.description} />
          </div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center' }}>
            Logged. See you next Friday.
          </p>
        </div>
      )
    }

    // Missed confirmation
    if (checkinResult === 'missed') {
      return (
        <div style={WRAPPER}>
          <RitualLabel />
          <div style={{ marginBottom: '20px' }}>
            <RitualAccentCard label={ritual.frequency} title={ritual.title} description={ritual.description} />
          </div>
          <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center' }}>
            That's ok. The ritual is still there when you're ready.
          </p>
        </div>
      )
    }

    // Normal discovering view
    return (
      <div style={WRAPPER}>
        <RitualLabel />
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <StreakPill label={`Week ${weekNum} of 3`} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <RitualAccentCard label={ritual.frequency} title={ritual.title} description={ritual.description} />
        </div>
        <NoraBlock text={NORA_WEEK_MESSAGES[weekNum] || NORA_WEEK_MESSAGES[1]} />
        {(() => {
          const confirmedAt = ritual.partner_confirmed_at ? new Date(ritual.partner_confirmed_at) : null
          const confirmedWeek = confirmedAt ? confirmedAt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).slice(0, 10) : null
          const currentWeekStart = getWeekStart('America/Los_Angeles')
          const confirmedThisWeek = confirmedWeek && confirmedWeek >= currentWeekStart
          if (confirmedThisWeek) {
            return <p style={{ textAlign: 'center', fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic', padding: '8px 0' }}>Check back next Friday to see how this week went.</p>
          }
          return null
        })()}
        {(() => {
          const confirmedAt = ritual.partner_confirmed_at ? new Date(ritual.partner_confirmed_at) : null
          const confirmedWeek = confirmedAt ? confirmedAt.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }).slice(0, 10) : null
          const currentWeekStart = getWeekStart('America/Los_Angeles')
          const confirmedThisWeek = confirmedWeek && confirmedWeek >= currentWeekStart
          if (confirmedThisWeek) return null
          return <>
            <SectionLabel text="HOW DID THIS WEEK GO?" />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleCheckin(true, ritual)}
                disabled={submitting}
                style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '11px 8px', fontSize: '13px', color: '#3D6B22', cursor: 'pointer' }}
              >
                We did it
              </button>
              <button
                onClick={() => handleCheckin(false, ritual)}
                disabled={submitting}
                style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '11px 8px', fontSize: '13px', color: '#7A8C6E', cursor: 'pointer' }}
              >
                Not this week
              </button>
              <button
                onClick={() => handleRetire(ritual)}
                disabled={submitting}
                style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '11px 8px', fontSize: '13px', color: '#B8A898', cursor: 'pointer' }}
              >
                Not for us
              </button>
            </div>
          </>
        })()}
      </div>
    )
  }

  // STATE 3 — Library

  // Discover mode: suggestion cycling to add a new ritual
  if (discoverMode) {
    return (
      <div style={WRAPPER}>
        <RitualLabel />
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', color: '#1A2E10', textAlign: 'center', marginBottom: '8px', fontWeight: 400 }}>
          Discover a ritual
        </p>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginBottom: '20px' }}>
          Something to try together.
        </p>
        <SuggestionCycle
          index={discoverIndex}
          onNext={() => setDiscoverIndex(prev => (prev + 1) % TIER1.length)}
          onSelect={handleDiscoverMore}
          submitting={submitting}
        />
        <div style={{ marginTop: '10px' }}>
          <GhostBtn onClick={() => setDiscoverMode(false)}>Back to your rituals</GhostBtn>
        </div>
      </div>
    )
  }

  return (
    <div style={WRAPPER}>
      <RitualLabel />
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '18px', color: '#1A2E10', textAlign: 'center', marginBottom: '4px', fontWeight: 400 }}>
        Your rituals
      </p>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginBottom: '24px' }}>
        The small things that make you you.
      </p>

      {adoptedRituals.length > 0 && (
        <div>
          <SectionLabel text="ADOPTED" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {adoptedRituals.map(r => (
              <div
                key={r.id}
                style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#1A2E10', fontWeight: 500 }}>{r.title}</p>
                  {r.frequency && (
                    <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px' }}>{r.frequency}</p>
                  )}
                </div>
                <StreakPill label={r.source === 'existing' && !r.streak ? 'Ongoing' : `${r.streak || 0} week${r.streak === 1 ? '' : 's'}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {restingRituals.length > 0 && (
        <div>
          <Divider />
          <SectionLabel text="SEASONAL" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.6 }}>
            {restingRituals.map(r => (
              <div
                key={r.id}
                style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#1A2E10', fontWeight: 500 }}>{r.title}</p>
                  {r.frequency && (
                    <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px' }}>{r.frequency}</p>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: '#7A8C6E' }}>Resting</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {discoveringRituals.length > 0 && (
        <div>
          {(adoptedRituals.length > 0 || restingRituals.length > 0) && <Divider />}
          <SectionLabel text="STILL TRYING" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {discoveringRituals.map(r => (
              <div
                key={r.id}
                style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#1A2E10', fontWeight: 500 }}>{r.title}</p>
                  {r.frequency && (
                    <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px' }}>{r.frequency}</p>
                  )}
                </div>
                <StreakPill label={`Week ${Math.min(r.streak + 1, 3)} of 3`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {needsDiscussionRituals.length > 0 && (
        <div>
          <Divider />
          <SectionLabel text="NEEDS DISCUSSION" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {needsDiscussionRituals.map(r => (
              <div
                key={r.id}
                style={{ background: '#FFFFFF', borderLeft: '3px solid #C1440E', borderRadius: '0 12px 12px 0', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div>
                  <p style={{ fontSize: '14px', color: '#1A2E10', fontWeight: 500 }}>{r.title}</p>
                  {r.frequency && (
                    <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px' }}>{r.frequency}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRevisit(r)}
                  disabled={submitting}
                  style={{ fontSize: '12px', color: '#C1440E', background: 'transparent', border: '0.5px solid #C1440E', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
                >
                  Revisit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Divider />
      {nextSuggestion ? (
        <div>
          <div style={{ background: '#F4FAF0', border: '0.5px solid #C4DDB4', borderRadius: '14px', padding: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3D6B22', flexShrink: 0 }} />
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#2D5016', textTransform: 'uppercase', margin: 0 }}>Nora</p>
            </div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#2D5016', fontStyle: 'italic', lineHeight: 1.65, marginBottom: '16px', marginTop: 0 }}>
              {`You have ${activeRituals.length} ritual${activeRituals.length === 1 ? '' : 's'} going. Ready to try another? Here's one that fits.`}
            </p>
            <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '16px 18px', marginBottom: '16px' }}>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A2E10', lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{nextSuggestion.title}</p>
              {nextSuggestion.description && <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginTop: '6px', marginBottom: 0 }}>{nextSuggestion.description}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PrimaryBtn onClick={() => handleDiscoverMore(nextSuggestion)} disabled={submitting}>
                We'll try this one
              </PrimaryBtn>
              <GhostBtn onClick={handleNextLibrarySuggestion}>Show me another</GhostBtn>
            </div>
          </div>
          <a href="/ritual" style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#7A8C6E', textDecoration: 'none', padding: '8px 0' }}>
            See all rituals →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <GhostBtn onClick={() => setDiscoverMode(true)}>Discover another ritual</GhostBtn>
          <a href="/ritual" style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#7A8C6E', textDecoration: 'none', padding: '8px 0' }}>
            See all rituals →
          </a>
        </div>
      )}
    </div>
  )
}
