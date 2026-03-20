'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getStarterRituals } from '@/lib/ritual-suggestions'

const NORA_WEEK_MESSAGES = {
  1: "Give this three weeks before you decide. That's the minimum for something to start feeling natural.",
  2: "Two weeks in. Research shows it takes about 21 days for something to feel automatic. You're most of the way there.",
  3: "Week three. If this has shown up in your week at all — even imperfectly — that's the ritual working.",
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function NoraBlock({ text }) {
  return (
    <div style={{ background: '#F4FAF0', border: '0.5px solid #C4DDB4', borderRadius: '14px', padding: '18px 20px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3D6B22', flexShrink: 0 }} />
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#2D5016', textTransform: 'uppercase', margin: 0 }}>Nora</p>
      </div>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#2D5016', fontStyle: 'italic', lineHeight: 1.65, margin: 0 }}>
        {text}
      </p>
    </div>
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
    <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#7A8C6E', textTransform: 'uppercase', marginBottom: '10px', marginTop: 0 }}>
      {text}
    </p>
  )
}

function Divider() {
  return <div style={{ borderTop: '0.5px solid #E8EEE2', margin: '24px 0' }} />
}

function RitualAccentCard({ label, title, description }) {
  return (
    <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '18px 20px' }}>
      {label && <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>{label}</p>}
      {title && <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A2E10', lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{title}</p>}
      {description && <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginTop: '6px', marginBottom: 0 }}>{description}</p>}
    </div>
  )
}

function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={!!disabled} style={{ width: '100%', padding: '14px', background: '#3D6B22', color: '#FAF6F0', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'opacity 150ms' }}>
      {children}
    </button>
  )
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '12px', background: 'transparent', border: '0.5px solid #D4E8C4', borderRadius: '30px', color: '#7A8C6E', fontSize: '14px', cursor: 'pointer' }}>
      {children}
    </button>
  )
}

function DangerBtn({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={!!disabled} style={{ width: '100%', padding: '12px', background: 'transparent', border: '0.5px solid #E8C4C4', borderRadius: '30px', color: '#C1440E', fontSize: '14px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
      {children}
    </button>
  )
}

// Unified Nora + suggestion card
function NoraSuggestionCard({ noraText, suggestion, onSelect, onNext, submitting }) {
  return (
    <div style={{ background: '#F4FAF0', border: '0.5px solid #C4DDB4', borderRadius: '14px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3D6B22', flexShrink: 0 }} />
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#2D5016', textTransform: 'uppercase', margin: 0 }}>Nora</p>
      </div>
      <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#2D5016', fontStyle: 'italic', lineHeight: 1.65, marginBottom: '16px', marginTop: 0 }}>
        {noraText}
      </p>
      <div style={{ background: '#FFFFFF', borderLeft: '3px solid #3D6B22', borderRadius: '0 14px 14px 0', padding: '16px 18px', marginBottom: '16px' }}>
        <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', color: '#1A2E10', lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{suggestion.title}</p>
        {suggestion.description && <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginTop: '6px', marginBottom: 0 }}>{suggestion.description}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <PrimaryBtn onClick={() => onSelect(suggestion)} disabled={submitting}>We'll try this one</PrimaryBtn>
        <GhostBtn onClick={onNext}>Show me another</GhostBtn>
      </div>
    </div>
  )
}

// Inline edit form for custom rituals
function EditForm({ ritual, onSave, onCancel, submitting }) {
  const [title, setTitle] = useState(ritual.title || '')
  const [description, setDescription] = useState(ritual.description || '')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '6px', marginTop: 0 }}>Ritual name</p>
        <textarea
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1A2E10', resize: 'none', height: '60px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '6px', marginTop: 0 }}>Description <span style={{ color: '#B8A898', fontSize: '10px', letterSpacing: 'normal', textTransform: 'none' }}>optional</span></p>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ width: '100%', background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1A2E10', resize: 'none', height: '80px', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <PrimaryBtn onClick={() => onSave(title, description)} disabled={!title.trim() || submitting}>Save changes</PrimaryBtn>
        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RitualPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [partnerName, setPartnerName] = useState('your partner')
  const [rituals, setRituals] = useState([])
  const [usedSuggestionIds, setUsedSuggestionIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [nextSuggestion, setNextSuggestion] = useState(null)
  const [adoptionDone, setAdoptionDone] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')

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

      const partnerId = couple.user1_id === user.id ? couple.user2_id : couple.user1_id
      const { data: pProfile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', partnerId)
        .maybeSingle()
      if (pProfile?.display_name) setPartnerName(pProfile.display_name)

      await fetchRituals(user.id, couple.id)
    }
    init()
  }, [router])

  const fetchRituals = async (uid, cid) => {
    const res = await fetch(`/api/ritual/status?userId=${uid}&coupleId=${cid}`)
    const data = await res.json()
    setRituals(data.rituals || [])
    const used = data.usedSuggestionIds || []
    setUsedSuggestionIds(used)
    const tier1 = getStarterRituals()
    setNextSuggestion(tier1.find(s => !used.includes(s.id)) || null)
    setLoading(false)
  }

  const refetch = async () => {
    if (userId && coupleId) await fetchRituals(userId, coupleId)
  }

  const handleConfirm = async (ritualId, action) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId, action }),
      })
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleAdopt = async (ritualId) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId }),
      })
      setAdoptionDone(prev => ({ ...prev, [ritualId]: true }))
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleRevisit = async (ritualId) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId, action: 'confirm' }),
      })
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleRetire = async (ritualId) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/retire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId }),
      })
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleSaveEdit = async (ritualId, title, description) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, ritualId, title, description }),
      })
      setEditingId(null)
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleNextSuggestion = () => {
    const tier1 = getStarterRituals()
    const currentIdx = nextSuggestion ? tier1.findIndex(s => s.id === nextSuggestion.id) : -1
    const rest = [...tier1.slice(currentIdx + 1), ...tier1.slice(0, currentIdx + 1)]
    setNextSuggestion(rest.find(s => !usedSuggestionIds.includes(s.id)) || null)
  }

  const handleSelectSuggestion = async (suggestion) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, coupleId, suggestionId: suggestion.id, title: suggestion.title, description: suggestion.description, frequency: suggestion.frequency, tier: suggestion.tier }),
      })
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  const handleAddCustom = async () => {
    if (!customTitle.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/ritual/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          coupleId,
          title: customTitle.trim(),
          description: customDescription.trim() || null,
          frequency: 'weekly',
          tier: 1,
        }),
      })
      setCustomTitle('')
      setCustomDescription('')
      setShowCustomForm(false)
      await refetch()
    } catch {} finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #3D6B22', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const activeRituals = rituals.filter(r => r.status !== 'retired')
  const adoptedRituals = activeRituals.filter(r => r.status === 'adopted')
  const discoveringRituals = activeRituals.filter(r => r.status === 'discovering')
  const pendingRituals = activeRituals.filter(r => r.status === 'pending')
  const needsDiscussionRituals = rituals.filter(r => r.needs_discussion === true && r.status !== 'retired')
  const hasActiveRituals = adoptedRituals.length > 0 || discoveringRituals.length > 0

  const noraText = hasActiveRituals
    ? `You have ${adoptedRituals.length + discoveringRituals.length} ritual${adoptedRituals.length + discoveringRituals.length === 1 ? '' : 's'} going. These are yours now — want to try one from the library that's proven to stick?`
    : `Before suggesting something new — is there something you two already do together? Or try one from the library.`

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
      <div style={{ padding: '56px 24px 120px' }}>

        {/* Header */}
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: '0 0 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#7A8C6E', fontSize: '14px' }}>
          ← Back
        </button>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#2D5016', textTransform: 'uppercase', marginBottom: '8px', marginTop: 0 }}>Your shared life</p>
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '32px', fontWeight: 400, color: '#1A2E10', marginBottom: '32px', marginTop: 0 }}>
          The Ritual
        </h1>

        {/* PENDING */}
        {pendingRituals.map(r => (
          <div key={r.id} style={{ marginBottom: '24px', background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
            <SectionLabel text="PENDING CONFIRMATION" />
            {editingId === r.id ? (
              <EditForm ritual={r} onSave={(t, d) => handleSaveEdit(r.id, t, d)} onCancel={() => setEditingId(null)} submitting={submitting} />
            ) : (
              <>
                <RitualAccentCard title={r.title} description={r.description} label={r.frequency} />
                {!r.suggestion_id && (
                  <button onClick={() => setEditingId(r.id)} style={{ background: 'none', border: 'none', color: '#7A8C6E', fontSize: '12px', cursor: 'pointer', padding: '8px 0 0', textDecoration: 'underline' }}>
                    Edit
                  </button>
                )}
                {String(r.proposed_by) === String(userId) ? (
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                    Waiting for {partnerName} to confirm
                  </p>
                ) : (
                  <div style={{ marginTop: '16px' }}>
                    <NoraBlock text={`Rituals only work when you both want them. Take a look at what ${partnerName} is suggesting.`} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <PrimaryBtn onClick={() => handleConfirm(r.id, 'confirm')} disabled={submitting}>I'm in — add it</PrimaryBtn>
                      <GhostBtn onClick={() => handleConfirm(r.id, 'discuss')}>Let's talk about it</GhostBtn>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {/* ADOPTED */}
        {adoptedRituals.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel text="ADOPTED" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {adoptedRituals.map(r => (
                <div key={r.id} style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '12px', padding: '16px' }}>
                  {editingId === r.id ? (
                    <EditForm ritual={r} onSave={(t, d) => handleSaveEdit(r.id, t, d)} onCancel={() => setEditingId(null)} submitting={submitting} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '15px', color: '#1A2E10', fontWeight: 500, margin: 0 }}>{r.title}</p>
                        {r.frequency && <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px', marginBottom: 0 }}>{r.frequency}</p>}
                        {!r.suggestion_id && (
                          <button onClick={() => setEditingId(r.id)} style={{ background: 'none', border: 'none', color: '#7A8C6E', fontSize: '12px', cursor: 'pointer', padding: '4px 0 0', textDecoration: 'underline' }}>Edit</button>
                        )}
                      </div>
                      <StreakPill label={`${r.streak || 0} week${r.streak === 1 ? '' : 's'}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISCOVERING */}
        {discoveringRituals.map(r => {
          const weekNum = Math.min(r.streak + 1, 3)
          const adoptionReady = r.streak >= 3
          const retireRequested = !!r.retire_requested_by
          const iRequestedRetire = r.retire_requested_by === userId
          return (
            <div key={r.id} style={{ marginBottom: '24px', background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
              {editingId === r.id ? (
                <EditForm ritual={r} onSave={(t, d) => handleSaveEdit(r.id, t, d)} onCancel={() => setEditingId(null)} submitting={submitting} />
              ) : adoptionReady ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}><StreakPill label="3 weeks" /></div>
                  <div style={{ marginBottom: '16px' }}><RitualAccentCard label={r.frequency} title={r.title} description={r.description} /></div>
                  {!r.suggestion_id && <button onClick={() => setEditingId(r.id)} style={{ background: 'none', border: 'none', color: '#7A8C6E', fontSize: '12px', cursor: 'pointer', padding: '0 0 12px', textDecoration: 'underline' }}>Edit</button>}
                  <NoraBlock text="Three weeks. That's not a habit yet — but it's becoming one. Want to make it official?" />
                  {adoptionDone[r.id]
                    ? <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#3D6B22', textAlign: 'center', fontStyle: 'italic' }}>Made it yours. ✓</p>
                    : <PrimaryBtn onClick={() => handleAdopt(r.id)} disabled={submitting}>Make it ours</PrimaryBtn>
                  }
                </>
              ) : (
                <>
                  <SectionLabel text="STILL TRYING" />
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}><StreakPill label={`Week ${weekNum} of 3`} /></div>
                  <div style={{ marginBottom: '16px' }}><RitualAccentCard label={r.frequency} title={r.title} description={r.description} /></div>
                  {!r.suggestion_id && <button onClick={() => setEditingId(r.id)} style={{ background: 'none', border: 'none', color: '#7A8C6E', fontSize: '12px', cursor: 'pointer', padding: '0 0 12px', textDecoration: 'underline' }}>Edit</button>}
                  <NoraBlock text={NORA_WEEK_MESSAGES[weekNum] || NORA_WEEK_MESSAGES[1]} />
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginBottom: '16px' }}>
                    Check in with Nora on Friday
                  </p>
                  {retireRequested ? (
                    iRequestedRetire ? (
                      <p style={{ fontSize: '13px', color: '#C1440E', textAlign: 'center', fontStyle: 'italic' }}>
                        You flagged this to retire — waiting for {partnerName} to confirm
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '13px', color: '#C1440E', textAlign: 'center', fontStyle: 'italic', margin: '0 0 8px' }}>
                          {partnerName} wants to retire this ritual
                        </p>
                        <PrimaryBtn onClick={() => handleRetire(r.id)} disabled={submitting}>Confirm — retire it</PrimaryBtn>
                      </div>
                    )
                  ) : (
                    <DangerBtn onClick={() => handleRetire(r.id)} disabled={submitting}>Not for us</DangerBtn>
                  )}
                </>
              )}
            </div>
          )
        })}

        {/* NEEDS DISCUSSION */}
        {needsDiscussionRituals.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel text="NEEDS A CONVERSATION" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {needsDiscussionRituals.map(r => (
                <div key={r.id} style={{ background: '#FFFFFF', borderLeft: '3px solid #C1440E', borderRadius: '0 12px 12px 0', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '14px', color: '#1A2E10', fontWeight: 500, margin: 0 }}>{r.title}</p>
                    {r.frequency && <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px', marginBottom: 0 }}>{r.frequency}</p>}
                  </div>
                  <button onClick={() => handleRevisit(r.id)} disabled={submitting} style={{ fontSize: '12px', color: '#C1440E', background: 'transparent', border: '0.5px solid #C1440E', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
                    Revisit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {activeRituals.length === 0 && needsDiscussionRituals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#1A2E10', fontWeight: 400, marginBottom: '8px' }}>No rituals yet</p>
            <p style={{ fontSize: '14px', color: '#7A8C6E', lineHeight: 1.6, marginBottom: '32px' }}>
              Rituals are the small things that make you you. Start with something you already do.
            </p>
          </div>
        )}

        {/* NORA + SUGGESTION — unified card */}
        {nextSuggestion && (
          <>
            {hasActiveRituals && <Divider />}
            <NoraSuggestionCard
              noraText={noraText}
              suggestion={nextSuggestion}
              onSelect={handleSelectSuggestion}
              onNext={handleNextSuggestion}
              submitting={submitting}
            />
          </>
        )}

        <div style={{ marginTop: '16px' }}>
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: '0.5px solid #D4E8C4', borderRadius: '30px', color: '#7A8C6E', fontSize: '14px', cursor: 'pointer' }}
            >
              We already do something →
            </button>
          ) : (
            <div style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '16px', marginTop: 0 }}>Add your own ritual</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '6px', marginTop: 0 }}>What do you do together?</p>
                  <p style={{ fontSize: '13px', color: '#7A8C6E', lineHeight: 1.5, marginBottom: '10px', marginTop: 0 }}>A habit, a tradition, something that repeats and feels like yours.</p>
                  <textarea
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="We cook dinner together every Thursday night..."
                    style={{ width: '100%', background: '#FAF6F0', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1A2E10', resize: 'none', height: '80px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <p style={{ fontSize: '10px', letterSpacing: '0.14em', color: '#3D6B22', textTransform: 'uppercase', marginBottom: '6px', marginTop: 0 }}>What makes it feel like yours? <span style={{ color: '#B8A898', fontSize: '10px', letterSpacing: 'normal', textTransform: 'none' }}>optional</span></p>
                  <textarea
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    placeholder="It's the one hour where we're not thinking about anything else..."
                    style={{ width: '100%', background: '#FAF6F0', border: '0.5px solid #D4E8C4', borderRadius: '10px', padding: '12px', fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#1A2E10', resize: 'none', height: '60px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <PrimaryBtn onClick={handleAddCustom} disabled={!customTitle.trim() || submitting}>Add to our rituals</PrimaryBtn>
                <GhostBtn onClick={() => { setShowCustomForm(false); setCustomTitle(''); setCustomDescription('') }}>Cancel</GhostBtn>
              </div>
            </div>
          )}
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
