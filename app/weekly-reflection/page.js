'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

export default function WeeklyReflectionPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reflection, setReflection] = useState(null)
  const [reacted, setReacted] = useState({})
  const [userId, setUserId] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [userName, setUserName] = useState('')
  const [isUser1, setIsUser1] = useState(null)
  const [partnerName, setPartnerName] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const uid = session.user.id
        setUserId(uid)

        const { data: couple } = await supabase
          .from('couples')
          .select('id, user1_id, user2_id')
          .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
          .maybeSingle()
        if (!couple) { setError('No couple found.'); setLoading(false); return }
        setCoupleId(couple.id)
        setIsUser1(couple.user1_id === uid)
        const partnerId = couple.user1_id === uid ? couple.user2_id : couple.user1_id
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', [uid, partnerId])
        const myProfile = profiles?.find(p => p.user_id === uid)
        const partnerProfile = profiles?.find(p => p.user_id === partnerId)
        setUserName(myProfile?.display_name || 'You')
        setPartnerName(partnerProfile?.display_name || 'Partner')

        const token = session.access_token

        // Check for existing reflection
        const statusRes = await fetch(`/api/reflection/status?userId=${uid}&coupleId=${couple.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const statusData = await statusRes.json()

        if (statusData.hasReflection) {
          setReflection(statusData.reflection)
          setReacted(statusData.reflection.moment_reactions || {})
          // Mark viewed. Was previously fire-and-forget with no res.ok check
          // — a failed write here (same silent-swallow shape as the cron
          // fix) leaves viewed_by_userX false forever, which is exactly what
          // produces an Us-tab red dot that never clears even after the
          // reflection has genuinely been read. Logged, not retried — a
          // stuck dot is low-stakes and self-heals next time this page loads.
          fetch('/api/reflection/viewed', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, coupleId: couple.id, weekStart: statusData.reflection.week_start })
          }).then(r => { if (!r.ok) console.error('[weekly-reflection] mark-viewed failed:', r.status) })
            .catch(err => console.error('[weekly-reflection] mark-viewed failed:', err))
        } else {
          // Generate
          setLoading(false)
          setGenerating(true)
          const genRes = await fetch('/api/reflection/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId: uid, coupleId: couple.id })
          })
          const genData = await genRes.json()
          if (genData.reflection) {
            setReflection(genData.reflection)
            setReacted(genData.reflection.moment_reactions || {})
            fetch('/api/reflection/viewed', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ userId: uid, coupleId: couple.id, weekStart: genData.reflection.week_start })
            }).then(r => { if (!r.ok) console.error('[weekly-reflection] mark-viewed failed:', r.status) })
              .catch(err => console.error('[weekly-reflection] mark-viewed failed:', err))
          } else {
            setError('Could not generate reflection. Try again later.')
          }
          setGenerating(false)
          return
        }
      } catch (err) {
        setError('Something went wrong.')
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleReact = async (momentIndex, reaction) => {
    if (reacted[momentIndex]) return
    const newReacted = { ...reacted, [momentIndex]: reaction }
    setReacted(newReacted)
    const { data: { session } } = await supabase.auth.getSession()
    fetch('/api/reflection/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify({ reflectionId: reflection?.id, coupleId, momentIndex, reaction })
    }).catch(() => {})
  }

  const getWeekLabel = (weekStart) => {
    if (!weekStart) return 'This Week'
    const d = new Date(weekStart + 'T12:00:00')
    return 'Week of ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  if (loading || generating) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C4714A', marginBottom: '20px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <p style={{ fontSize: '15px', color: '#7A6A54', fontFamily: 'Georgia, serif', fontStyle: 'italic', textAlign: 'center' }}>
          {generating ? 'Nora is thinking about your week.\nThis takes a moment.' : 'Loading your reflection…'}
        </p>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6EF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <p style={{ color: '#C4714A', fontSize: '15px', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>{error}</p>
        <button onClick={() => router.push('/us')} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#A09080', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
      </div>
    )
  }

  if (!reflection) return null

  const moments = reflection.moments || []

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6EF', fontFamily: 'DM Sans, sans-serif', paddingBottom: '100px' }}>
      {/* Header */}
      <div style={{ padding: '56px 24px 24px' }}>
        <button onClick={() => router.push('/us')} style={{ background: 'none', border: 'none', color: '#A09080', fontSize: '12px', cursor: 'pointer', padding: 0, marginBottom: '20px', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C4714A' }} />
          <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87' }}>Nora · {getWeekLabel(reflection.week_start)}</span>
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 300, color: '#1C1208', lineHeight: 1.3, margin: 0 }}>Weekly Reflection</h1>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* Opening */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, color: '#2D2418', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{reflection.opening}</p>
        </div>

        {/* Moments */}
        {moments.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4AA87', marginBottom: '12px' }}>Moments from this week</div>
            {moments.map((moment, i) => (
              <div key={i} style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '10px', border: '1px solid #EDE5D8' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2D2418', lineHeight: 1.5, margin: '0 0 12px' }}>{typeof moment === 'string' ? moment : moment.observation || moment.text || moment}</p>
                {(() => {
                  const moment = moments[i]
                  const subject = typeof moment === 'object' ? moment.subject : null
                  const canReact = !subject || (subject === 'user1' && isUser1 === true) || (subject === 'user2' && isUser1 === false)
                  if (!canReact) return null
                  return (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReact(i, 'lands')}
                        style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: reacted[i] === 'lands' ? '#C4714A' : '#EDE5D8', background: reacted[i] === 'lands' ? '#C4714A' : 'transparent', color: reacted[i] === 'lands' ? 'white' : '#A09080', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, transition: 'all 0.15s' }}
                      >lands</button>
                      <button
                        onClick={() => handleReact(i, 'not_quite')}
                        style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', border: '1px solid', borderColor: reacted[i] === 'not_quite' ? '#1C1208' : '#EDE5D8', background: reacted[i] === 'not_quite' ? '#1C1208' : 'transparent', color: reacted[i] === 'not_quite' ? 'white' : '#A09080', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, transition: 'all 0.15s' }}
                      >not quite</button>
                    </div>
                  )
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Week ahead */}
        {reflection.week_ahead && (
          <div style={{ background: '#1C1208', borderRadius: '14px', padding: '16px', marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', marginBottom: '8px' }}>Carry this forward</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#FAF6EF', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{reflection.week_ahead}</p>
          </div>
        )}

        {/* Couples Session invite — replaces the previous inline
            NoraCouplesChat widget (Aug 10 2026). Matt's directive: this is
            the trained-cadence entry point — "1 day a week, usually after
            the Sunday Weekly Reflection, for the couple to dedicate to a
            couples session via Nora." The light inline-chat pattern is
            still right for lower-stakes contexts (Rabbit Hole debrief
            still uses it), but the flagship weekly moment deserves the
            real surface, not a scaled-down stand-in. Seeds Couples Session
            with this week's actual pattern/opening via the `seed` param
            (mirrors ai-coach's ?seed= pattern) so Nora doesn't start cold —
            she already knows what to reference the moment they arrive. */}
        <div style={{ marginBottom: '16px', background: 'linear-gradient(160deg, #C4694F, #A8523D)', borderRadius: '14px', padding: '20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F0EAE0', border: '1.5px solid #C4694F' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#E8B04B', marginLeft: '-4px', border: '1.5px solid #C4694F' }} />
            </div>
            <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F5DDC8' }}>Nora · Together</span>
          </div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontStyle: 'italic', color: 'white', lineHeight: 1.5, margin: '0 0 16px' }}>
            You just reflected on your week. Want to talk any of it through, together?
          </p>
          <button
            onClick={() => {
              const seed = `You two just finished this week's reflection together. ${reflection.pattern || reflection.opening || "Something from this week is worth sitting with."} What's alive for you both right now?`
              router.push(`/couples-session?new=true&seed=${encodeURIComponent(seed)}`)
            }}
            style={{ background: 'white', color: '#A8523D', border: 'none', borderRadius: '100px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            Start your Sunday session →
          </button>
        </div>

        {/* History link */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => router.push('/weekly-reflection/history')} style={{ background: 'none', border: 'none', color: '#A09080', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Past reflections →</button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
