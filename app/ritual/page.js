'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getWeekStart } from '@/lib/dates'
import { getStarterRituals } from '@/lib/ritual-suggestions'

const NORA_WEEK_MESSAGES = {
  1: "Give this three weeks before you decide. That's the minimum for something to start feeling natural.",
  2: "Two weeks in. Research shows it takes about 21 days for something to feel automatic. You're most of the way there.",
  3: "Week three. If this has shown up in your week at all — even imperfectly — that's the ritual working.",
}

// ── Style helpers ─────────────────────────────────────────────────────────────

function NoraBlock({ text }) {
  return (
    <div style={{ background: '#F4FAF0', border: '0.5px solid #C4DDB4', borderRadius: '14px', padding: '18px 20px', marginBottom: '20px' }}>
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
    <button
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: '100%', padding: '14px', background: '#3D6B22', color: '#FAF6F0',
        border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
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
        width: '100%', padding: '12px', background: 'transparent',
        border: '0.5px solid #D4E8C4', borderRadius: '30px',
        color: '#7A8C6E', fontSize: '14px', cursor: 'pointer',
      }}
    >
      {children}
    </button>
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
  const [adoptionDone, setAdoptionDone] = useState(false)

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

  const refetch = () => {
    if (userId && coupleId) fetchRituals(userId, coupleId)
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
      await fetchRituals(userId, coupleId)
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
      setAdoptionDone(true)
      await fetchRituals(userId, coupleId)
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
      await fetchRituals(userId, coupleId)
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
        body: JSON.stringify({
          userId, coupleId,
          suggestionId: suggestion.id,
          title: suggestion.title,
          description: suggestion.description,
          frequency: suggestion.frequency,
          tier: suggestion.tier,
        }),
      })
      await fetchRituals(userId, coupleId)
    } catch {} finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid #3D6B22', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const activeRituals = rituals.filter(r => r.status !== 'retired')
  const adoptedRituals = activeRituals.filter(r => r.status === 'adopted')
  const discoveringRituals = activeRituals.filter(r => r.status === 'discovering')
  const pendingRituals = activeRituals.filter(r => r.status === 'pending')
  const needsDiscussionRituals = rituals.filter(r => r.needs_discussion === true)

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

        {/* PENDING — both users see, different UI */}
        {pendingRituals.map(r => (
          <div key={r.id} style={{ marginBottom: '24px' }}>
            {String(r.proposed_by) === String(userId) ? (
              // Proposer view — read only
              <div style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
                <SectionLabel text="PENDING CONFIRMATION" />
                <RitualAccentCard title={r.title} description={r.description} label={r.frequency} />
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', marginTop: '16px', marginBottom: 0 }}>
                  Waiting for {partnerName} to confirm
                </p>
              </div>
            ) : (
              // Partner view — confirm or discuss
              <div style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
                <SectionLabel text="PENDING CONFIRMATION" />
                <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#1A2E10', marginBottom: '16px', marginTop: 0, fontWeight: 400 }}>
                  {partnerName} wants to add a ritual
                </p>
                <NoraBlock text={`Rituals only work when you both want them. Take a look at what ${partnerName} is suggesting.`} />
                <div style={{ marginBottom: '16px' }}>
                  <RitualAccentCard title={r.title} description={r.description} label={r.frequency} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <PrimaryBtn onClick={() => handleConfirm(r.id, 'confirm')} disabled={submitting}>
                    I'm in — add it
                  </PrimaryBtn>
                  <GhostBtn onClick={() => handleConfirm(r.id, 'discuss')}>
                    Let's talk about it
                  </GhostBtn>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ADOPTED */}
        {adoptedRituals.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <SectionLabel text="ADOPTED" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {adoptedRituals.map(r => (
                <div key={r.id} style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '15px', color: '#1A2E10', fontWeight: 500, margin: 0 }}>{r.title}</p>
                    {r.frequency && <p style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#7A8C6E', textTransform: 'uppercase', marginTop: '4px', marginBottom: 0 }}>{r.frequency}</p>}
                  </div>
                  <StreakPill label={`${r.streak || 0} week${r.streak === 1 ? '' : 's'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISCOVERING */}
        {discoveringRituals.map(r => {
          const weekNum = Math.min(r.streak + 1, 3)
          const adoptionReady = r.streak >= 3
          return (
            <div key={r.id} style={{ marginBottom: '24px' }}>
              {adoptionReady ? (
                // Adoption prompt — persists after Friday Week 3
                <div style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <StreakPill label="3 weeks" />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <RitualAccentCard label={r.frequency} title={r.title} description={r.description} />
                  </div>
                  <NoraBlock text="Three weeks. That's not a habit yet — but it's becoming one. Want to make it official?" />
                  {adoptionDone
                    ? <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '14px', color: '#3D6B22', textAlign: 'center', fontStyle: 'italic' }}>Made it yours. ✓</p>
                    : <PrimaryBtn onClick={() => handleAdopt(r.id)} disabled={submitting}>Make it ours</PrimaryBtn>
                  }
                </div>
              ) : (
                // Still trying — Nora coaching, read only
                <div style={{ background: '#FFFFFF', border: '0.5px solid #D4E8C4', borderRadius: '14px', padding: '20px' }}>
                  <SectionLabel text="STILL TRYING" />
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <StreakPill label={`Week ${weekNum} of 3`} />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <RitualAccentCard label={r.frequency} title={r.title} description={r.description} />
                  </div>
                  <NoraBlock text={NORA_WEEK_MESSAGES[weekNum] || NORA_WEEK_MESSAGES[1]} />
                  <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '13px', color: '#7A8C6E', fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                    Check in with Nora on Friday
                  </p>
                </div>
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
                  <button
                    onClick={() => handleRevisit(r.id)}
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

        {/* EMPTY STATE */}
        {activeRituals.length === 0 && needsDiscussionRituals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0 24px' }}>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', color: '#1A2E10', fontWeight: 400, marginBottom: '8px' }}>
              No rituals yet
            </p>
            <p style={{ fontSize: '14px', color: '#7A8C6E', lineHeight: 1.6, marginBottom: '32px' }}>
              Rituals are the small things that make you you. Start with something you already do.
            </p>
          </div>
        )}

        {/* PROPOSE / DISCOVER */}
        {activeRituals.length > 0 && <Divider />}
        {nextSuggestion && (
          <div style={{ marginBottom: '16px' }}>
            <NoraBlock text={activeRituals.length > 0 ? `You have ${activeRituals.length} ritual${activeRituals.length === 1 ? '' : 's'} going. Ready to try another? Here's one that might fit.` : "Here's one to start with. This might fit."} />
            <div style={{ marginBottom: '16px' }}>
              <RitualAccentCard title={nextSuggestion.title} description={nextSuggestion.description} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PrimaryBtn onClick={() => handleSelectSuggestion(nextSuggestion)} disabled={submitting}>
                We'll try this one
              </PrimaryBtn>
              <GhostBtn onClick={handleNextSuggestion}>Show me another</GhostBtn>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
