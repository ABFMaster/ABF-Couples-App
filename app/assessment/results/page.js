'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { scoreAttachmentStyle, scoreConflictStyle, generateModuleInsights, ASSESSMENT_ATTRIBUTION } from '@/lib/relationship-questions'

const filterAnswers = (answers, keys) =>
  Object.fromEntries(Object.entries(answers || {}).filter(([k]) => keys.includes(k)))

export default function AssessmentResults() {
  const router = useRouter()
  const [assessment, setAssessment] = useState(null)
  const [partnerAssessment, setPartnerAssessment] = useState(null)
  const [userName, setUserName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [loading, setLoading] = useState(true)
  const [noraSummary, setNoraSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [coupleInsight, setCoupleInsight] = useState(null)

  useEffect(() => {
    async function load() {
      console.log('[Results] load function fired')
      try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('[Results] auth user:', user?.id)
      if (authError || !user) { console.log('[Results] redirecting to:', '/login'); router.push('/login'); return }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, partner_id, couple_id')
        .eq('user_id', user.id)
        .single()

      console.log('[Results] profile:', profile)
      if (profile) {
        setUserName(profile.display_name || 'You')
      } else {
        setUserName('You')
      }

      // Check sessionStorage first to avoid race condition
      let cachedAssessment = null
      try {
        const cached = sessionStorage.getItem('abf_assessment_results')
        if (cached) {
          cachedAssessment = JSON.parse(cached)
          sessionStorage.removeItem('abf_assessment_results')
        }
      } catch(e) {}

      console.log('[Results] cached assessment:', cachedAssessment ? 'found' : 'not found')
      if (cachedAssessment) {
        setAssessment(cachedAssessment)
      } else {
        const { data: myAssessment } = await supabase
          .from('relationship_assessments')
          .select('*')
          .eq('user_id', user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()

        console.log('[Results] DB assessment:', myAssessment?.id)
        if (!myAssessment) { console.log('[Results] redirecting to:', '/assessment'); router.push('/assessment'); return }
        setAssessment(myAssessment)
      }

      let partnerData = null
      let partnerProfile = null
      if (profile.partner_id) {
        const { data: pp } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', profile.partner_id)
          .single()
        partnerProfile = pp
        if (partnerProfile) setPartnerName(partnerProfile.name || 'Your partner')

        const { data: partnerAss } = await supabase
          .from('relationship_assessments')
          .select('*')
          .eq('user_id', profile.partner_id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()
        if (partnerAss) { setPartnerAssessment(partnerAss); partnerData = partnerAss }
      }

      setLoading(false)

      // Generate Nora's personal summary
      const answers = myAssessment.answers || {}
      const attachmentRes = scoreAttachmentStyle(answers)
      const conflictRes = scoreConflictStyle(answers)
      const loveRes = generateModuleInsights('love_expression', filterAnswers(answers, ['le_1','le_2','le_3']))

      setLoadingSummary(true)
      try {
        const res = await fetch('/api/assessment/personal-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: profile?.display_name || 'You',
            attachment: { style: attachmentRes.primary, tagline: attachmentRes.profile.tagline },
            conflict: { style: conflictRes.primary, tagline: conflictRes.profile.tagline },
            love: { primary: loveRes.headline, description: loveRes.description }
          })
        })
        const data = await res.json()
        if (data.summary) setNoraSummary(data.summary)
      } catch(e) {
        setNoraSummary(null)
      }
      setLoadingSummary(false)

      // Generate couple insight if both completed
      if (partnerData) {
        try {
          const partnerAttachment = scoreAttachmentStyle(partnerData.answers || {})
          const partnerConflict = scoreConflictStyle(partnerData.answers || {})
          const partnerLove = generateModuleInsights('love_expression', filterAnswers(partnerData.answers || {}, ['le_1','le_2','le_3']))
          const insightRes = await fetch('/api/assessment/insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user1Name: profile.name || 'You',
              user2Name: partnerProfile?.name || 'Your partner',
              modules: [
                { title: 'Attachment', userPct: Math.round(attachmentRes.anxietyScore * 25), partnerPct: Math.round(partnerAttachment.anxietyScore * 25) },
                { title: 'Conflict', userPct: Math.round((conflictRes.tally[conflictRes.primary] / 3) * 100), partnerPct: Math.round((partnerConflict.tally[partnerConflict.primary] / 3) * 100) },
                { title: 'Love Expression', userPct: Math.round((loveRes.profile?.[0]?.count / 3) * 100), partnerPct: Math.round((partnerLove.profile?.[0]?.count / 3) * 100) },
              ]
            })
          })
          const insightData = await insightRes.json()
          if (insightData.insight) setCoupleInsight(insightData.insight)
        } catch(e) {}
      }
      } catch (err) {
        console.error('[AssessmentResults] load error:', err)
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #C4714A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const answers = assessment?.answers || {}
  const attachmentResult = scoreAttachmentStyle(answers)
  const conflictResult = scoreConflictStyle(answers)
  const loveResult = generateModuleInsights('love_expression', filterAnswers(answers, ['le_1','le_2','le_3']))

  const conflictLabels = { volatile: 'Volatile', validating: 'Validating', avoiding: 'Conflict-Avoiding' }
  const conflictColors = { volatile: { bg: '#FDF0EA', color: '#C4714A', border: '#E8C4A0' }, validating: { bg: '#EEF2EC', color: '#7A8C6E', border: '#B8C9B0' }, avoiding: { bg: '#F5F0EA', color: '#8B7355', border: '#D4C4A8' } }
  const loveLabels = { words: 'Words of Affirmation', time: 'Quality Time', touch: 'Physical Touch', service: 'Acts of Service', gifts: 'Thoughtful Gestures' }

  return (
    <div style={{ minHeight: '100vh', background: '#FAF6F0', paddingBottom: 80 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* NORA HERO — opening statement */}
      <div style={{ background: '#1C1410', padding: '32px 24px 36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4AA87', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.2em', color: '#C4AA87', fontWeight: 500 }}>NORA</span>
        </div>
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 34, fontWeight: 400, color: '#FAF6F0', margin: '0 0 20px', lineHeight: 1.2 }}>Here's what I see.</h1>
        {loadingSummary ? (
          <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
            <div style={{ height: 14, background: 'rgba(250,246,240,0.15)', borderRadius: 4, marginBottom: 10, width: '90%' }} />
            <div style={{ height: 14, background: 'rgba(250,246,240,0.15)', borderRadius: 4, marginBottom: 10, width: '75%' }} />
            <div style={{ height: 14, background: 'rgba(250,246,240,0.15)', borderRadius: 4, width: '60%' }} />
          </div>
        ) : noraSummary ? (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(250,246,240,0.85)', lineHeight: 1.75, margin: 0 }}>{noraSummary}</p>
        ) : (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(250,246,240,0.6)', lineHeight: 1.75, margin: 0, fontStyle: 'italic' }}>Nora is reading your results...</p>
        )}
      </div>

      {/* PARTNER BANNER */}
      {partnerName && (
        <div style={{ margin: '16px 24px 0', padding: '12px 16px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #E8DDD0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: partnerAssessment ? '#7A8C6E' : '#C4AA87', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.4 }}>
            {partnerAssessment
              ? `${partnerName} has completed their assessment. Nora can see your pairing.`
              : `Waiting for ${partnerName} to complete theirs.`}
          </span>
        </div>
      )}

      {/* RESULT CARDS */}
      <div style={{ padding: '24px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ATTACHMENT CARD */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8DDD0' }}>
          <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 16, textTransform: 'uppercase' }}>How You Attach</div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 30, fontWeight: 400, color: '#1C1410' }}>{attachmentResult.profile.label}</div>
          <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#C4714A', marginTop: 4, marginBottom: 16 }}>{attachmentResult.profile.tagline}</div>
          <div style={{ height: 1, background: '#E8DDD0', margin: '16px 0' }} />
          <p style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.6, margin: 0 }}>{attachmentResult.profile.summary}</p>
          <div style={{ marginTop: 16, padding: 14, background: '#FAF6F0', borderRadius: 8 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#C4AA87', marginBottom: 6, textTransform: 'uppercase' }}>• Nora</div>
            <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{attachmentResult.profile.coachInsight}</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 8, textTransform: 'uppercase' }}>Strengths</div>
            {attachmentResult.profile.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C4714A', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F' }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 6, textTransform: 'uppercase' }}>Growth Edge</div>
            <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.5, margin: 0 }}>{attachmentResult.profile.growth}</p>
          </div>
        </div>

        {/* CONFLICT CARD */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8DDD0' }}>
          <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 16, textTransform: 'uppercase' }}>How You Fight</div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 30, fontWeight: 400, color: '#1C1410' }}>{conflictResult.profile.label}</div>
          <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#C4714A', marginTop: 4, marginBottom: 16 }}>{conflictResult.profile.tagline}</div>
          <div style={{ height: 1, background: '#E8DDD0', margin: '16px 0' }} />
          <p style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.6, margin: 0 }}>{conflictResult.profile.summary}</p>
          <div style={{ marginTop: 16, padding: 14, background: '#FAF6F0', borderRadius: 8 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#C4AA87', marginBottom: 6, textTransform: 'uppercase' }}>• Nora</div>
            <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#1C1410', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{conflictResult.profile.coachInsight}</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 8, textTransform: 'uppercase' }}>Your Consistency</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(conflictResult.tally).filter(([,v]) => v > 0).map(([style, count]) => (
                <span key={style} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontFamily: 'DM Sans, sans-serif', background: conflictColors[style]?.bg, color: conflictColors[style]?.color, border: `1px solid ${conflictColors[style]?.border}` }}>
                  {conflictLabels[style]} × {count}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 6, textTransform: 'uppercase' }}>Growth Edge</div>
            <p style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.5, margin: 0 }}>{conflictResult.profile.growth}</p>
          </div>
        </div>

        {/* LOVE EXPRESSION CARD */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 24, border: '1px solid #E8DDD0' }}>
          <div style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 16, textTransform: 'uppercase' }}>How You Love</div>
          <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 30, fontWeight: 400, color: '#1C1410' }}>{loveResult.headline}</div>
          <div style={{ height: 1, background: '#E8DDD0', margin: '16px 0' }} />
          <p style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', lineHeight: 1.6, margin: '0 0 20px' }}>{loveResult.description}</p>
          <div style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#8B7355', marginBottom: 12, textTransform: 'uppercase' }}>Your Love Profile</div>
          {loveResult.profile?.map((item) => (
            <div key={item.language} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: '#6B5D4F', width: 150, flexShrink: 0 }}>{loveLabels[item.language]}</span>
              <div style={{ flex: 1, height: 6, background: '#F0EBE3', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: item.language === loveResult.primary ? '#C4714A' : '#C4AA87', width: `${item.percentage}%`, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', width: 32, textAlign: 'right' }}>{item.percentage}%</span>
            </div>
          ))}
          <p style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', fontStyle: 'italic', marginTop: 8, marginBottom: 0 }}>All five matter. This is just where you start.</p>
        </div>

        {/* COUPLE INSIGHT */}
        {coupleInsight && (
          <div style={{ background: '#1C1410', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C4AA87', flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.15em', color: '#C4AA87', textTransform: 'uppercase' }}>Nora on your pairing</span>
            </div>
            <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#FAF6F0', margin: '0 0 12px' }}>Your pairing.</h3>
            <p style={{ fontSize: 14, fontFamily: 'DM Sans, sans-serif', color: 'rgba(250,246,240,0.8)', lineHeight: 1.75, margin: 0 }}>{coupleInsight}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: '32px 24px 0' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '100%', background: '#C4714A', color: '#FAF6F0', border: 'none', borderRadius: 12, padding: 16, fontSize: 15, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}>
          Talk to Nora →
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ width: '100%', background: 'transparent', border: '1px solid #E8DDD0', borderRadius: 12, padding: 14, fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', cursor: 'pointer' }}>
          Help Nora know you even better
        </button>
        <p style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: '#8B7355', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>{ASSESSMENT_ATTRIBUTION}</p>
      </div>
    </div>
  )
}
