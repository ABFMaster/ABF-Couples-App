'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Constants (mirrored from settings/page.js) ────────────────────────────────

const HOBBIES = [
  { value: 'reading', label: '📚 Reading' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'cooking', label: '🍳 Cooking' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'music', label: '🎵 Music' },
  { value: 'movies', label: '🎬 Movies/TV' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'outdoors', label: '🏕️ Outdoors' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'art', label: '🎨 Art' },
  { value: 'photography', label: '📷 Photography' },
  { value: 'writing', label: '✍️ Writing' },
  { value: 'dancing', label: '💃 Dancing' },
  { value: 'crafts', label: '🧶 Crafts/DIY' },
  { value: 'gardening', label: '🌱 Gardening' },
  { value: 'pets', label: '🐾 Pets' },
  { value: 'technology', label: '💻 Technology' },
  { value: 'meditation', label: '🧘 Meditation' },
  { value: 'podcasts', label: '🎙️ Podcasts' },
  { value: 'board_games', label: '🎲 Board Games' },
  { value: 'wine', label: '🍷 Wine/Drinks' },
  { value: 'volunteering', label: '🤝 Volunteering' },
]

const DATE_PREFERENCES = [
  { value: 'dinner', label: '🍽️ Nice dinner out' },
  { value: 'home_cooking', label: '🏠 Cooking at home' },
  { value: 'movie_night', label: '🎬 Movie night' },
  { value: 'outdoor_adventure', label: '🥾 Outdoor adventure' },
  { value: 'museum', label: '🏛️ Museums/galleries' },
  { value: 'concert', label: '🎤 Concert/live music' },
  { value: 'coffee', label: '☕ Coffee date' },
  { value: 'picnic', label: '🧺 Picnic' },
  { value: 'spa', label: '💆 Spa day' },
  { value: 'game_night', label: '🎲 Game night' },
  { value: 'dancing', label: '💃 Dancing' },
  { value: 'travel', label: '✈️ Weekend getaway' },
  { value: 'stargazing', label: '⭐ Stargazing' },
  { value: 'beach', label: '🏖️ Beach day' },
  { value: 'workout', label: '🏋️ Working out together' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'sports_event', label: '🏟️ Sports event' },
  { value: 'lazy_day', label: '😴 Lazy day in' },
]

const CHECKIN_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

// ── Step Dots ─────────────────────────────────────────────────────────────────

function StepDots({ currentStep }) {
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '36px' }}>
      {[1, 2, 3, 4].map(n => (
        <div
          key={n}
          style={{
            height: '6px',
            width: n === currentStep ? '20px' : '6px',
            borderRadius: '3px',
            background: n <= currentStep ? '#C4714A' : '#E8DDD0',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ── Chip Button (multi-select) ─────────────────────────────────────────────────

function Chip({ label, selected, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 500,
        border: selected ? 'none' : '0.5px solid #E8DDD0',
        background: selected ? '#C4714A' : 'white',
        color: selected ? '#FAF6EF' : disabled ? '#C4B5A0' : '#5C3D2E',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !selected ? 0.5 : 1,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

// ── Connect Code generator (same charset as connect/page.js) ──────────────────

function generateConnectCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: 'white',
  border: '0.5px solid #E8DDD0',
  borderRadius: '12px',
  fontSize: '15px',
  color: '#1C1208',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'DM Sans', -apple-system, sans-serif",
}

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#7A6A54',
  letterSpacing: '0.04em',
  marginBottom: '6px',
  display: 'block',
}

const sectionLabelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#7A6A54',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: '0 0 10px',
}

// ── Main Onboarding Component (needs useSearchParams → must be in Suspense) ───

function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(null)
  const [user, setUser] = useState(null)

  // Step 1 state
  const [displayName, setDisplayName] = useState('')
  const [partnerDisplayName, setPartnerDisplayName] = useState('')
  const [step1Saving, setStep1Saving] = useState(false)
  const [step1Error, setStep1Error] = useState('')

  // Step 3 state
  const [checkinTime, setCheckinTime] = useState(null)
  const [hobbies, setHobbies] = useState([])
  const [datePrefs, setDatePrefs] = useState([])
  const [step3Saving, setStep3Saving] = useState(false)
  const [step3Error, setStep3Error] = useState('')

  // Step 4 state
  const [connectCode, setConnectCode] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [codeShared, setCodeShared] = useState(false)
  const [step4Loading, setStep4Loading] = useState(false)

  // ── On mount: determine starting step ──────────────────────────────────────

  useEffect(() => {
    determineStep()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const determineStep = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      const urlStep = parseInt(searchParams.get('step') || '0', 10)
      if (urlStep === 3 || urlStep === 4) {
        setStep(urlStep)
        if (urlStep === 4) await prepareStep4(authUser)
        return
      }

      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('id')
        .eq('user_id', authUser.id)
        .not('completed_at', 'is', null)
        .limit(1)
        .maybeSingle()

      if (assessment) {
        router.push('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, partner_display_name, hobbies, date_preferences, preferred_checkin_time')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (profile?.display_name) {
        setDisplayName(profile.display_name)
        setPartnerDisplayName(profile.partner_display_name || '')
        setHobbies(profile.hobbies || [])
        setDatePrefs(profile.date_preferences || [])
        setCheckinTime(profile.preferred_checkin_time || null)
        setStep(2)
        return
      }

      if (profile) {
        setHobbies(profile.hobbies || [])
        setDatePrefs(profile.date_preferences || [])
        setCheckinTime(profile.preferred_checkin_time || null)
      }

      setStep(1)
    } catch (err) {
      console.error('Error determining onboarding step:', err)
      setStep(1)
    }
  }

  // ── Step 4: prepare connect code ───────────────────────────────────────────

  const prepareStep4 = async (authUser) => {
    setStep4Loading(true)
    try {
      const uid = authUser?.id || user?.id
      if (!uid) return

      const { data: existing } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        .maybeSingle()

      if (existing?.connected_at) {
        router.push('/dashboard')
        return
      }

      if (existing?.connect_code) {
        setConnectCode(existing.connect_code)
      } else {
        const code = generateConnectCode()
        const { data: collision } = await supabase
          .from('couples')
          .select('id')
          .eq('connect_code', code)
          .maybeSingle()

        const finalCode = collision ? generateConnectCode() : code

        await supabase.from('couples').insert({
          user1_id: uid,
          connect_code: finalCode,
        })

        setConnectCode(finalCode)
      }
    } catch (err) {
      console.error('Error preparing step 4:', err)
    } finally {
      setStep4Loading(false)
    }
  }

  // ── Step 1 handler ─────────────────────────────────────────────────────────

  const handleStep1 = async () => {
    if (!displayName.trim()) {
      setStep1Error('Please enter your name')
      return
    }
    setStep1Saving(true)
    setStep1Error('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName.trim(),
          partner_display_name: partnerDisplayName.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) throw error

      await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      })

      setStep(2)
    } catch (err) {
      setStep1Error(err.message || 'Failed to save. Please try again.')
    } finally {
      setStep1Saving(false)
    }
  }

  // ── Step 3 handler ─────────────────────────────────────────────────────────

  const handleStep3 = async () => {
    setStep3Saving(true)
    setStep3Error('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          hobbies,
          date_preferences: datePrefs,
          preferred_checkin_time: checkinTime,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) throw error

      await prepareStep4(user)
      setStep(4)
    } catch (err) {
      setStep3Error(err.message || 'Failed to save. Please try again.')
    } finally {
      setStep3Saving(false)
    }
  }

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  const toggleHobby = (value) => {
    if (hobbies.includes(value)) {
      setHobbies(hobbies.filter(h => h !== value))
    } else if (hobbies.length < 3) {
      setHobbies([...hobbies, value])
    }
  }

  const toggleDatePref = (value) => {
    setDatePrefs(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  // ── Share / Copy code ──────────────────────────────────────────────────────

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(connectCode)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {}
  }

  const handleShareCode = async () => {
    const shareText = `Join me on ABF! Use code ${connectCode} at abf.app/connect`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join me on ABF!', text: shareText })
        setCodeShared(true)
      } catch {}
    } else {
      handleCopyCode()
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────

  if (step === null) {
    return (
      <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── Shared page wrapper ────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF6EF', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ padding: '48px 32px 64px', maxWidth: '400px', margin: '0 auto' }}>

        {/* Wordmark — step 1 only */}
        {step === 1 && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-block', background: '#C4714A', borderRadius: '16px', padding: '10px 20px' }}>
              <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#FAF6EF', fontWeight: 600, margin: 0 }}>ABF</p>
            </div>
          </div>
        )}

        <StepDots currentStep={step} />

        {/* ── STEP 1: Names ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              What should Nora call you?
            </h2>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 32px', lineHeight: 1.5 }}>
              This is how your partner will see you too.
            </p>

            {step1Error && (
              <div style={{ background: '#FFF0ED', border: '0.5px solid #E8C8B8', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#C4714A' }}>
                {step1Error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  disabled={step1Saving}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Partner's name <span style={{ fontWeight: 400, color: '#A09080' }}>(optional)</span></label>
                <input
                  type="text"
                  value={partnerDisplayName}
                  onChange={e => setPartnerDisplayName(e.target.value)}
                  placeholder="What do you call them?"
                  disabled={step1Saving}
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              onClick={handleStep1}
              disabled={step1Saving || !displayName.trim()}
              style={{
                width: '100%',
                padding: '16px',
                marginTop: '24px',
                background: (step1Saving || !displayName.trim()) ? '#E8DDD0' : '#C4714A',
                color: (step1Saving || !displayName.trim()) ? '#A09080' : '#FAF6EF',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                border: 'none',
                cursor: (step1Saving || !displayName.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {step1Saving ? 'Saving…' : "Let's go →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Assessment ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              One quick read before you begin.
            </h2>
            <p style={{ fontSize: '14px', color: '#7A6A54', margin: '0 0 28px', lineHeight: 1.6 }}>
              A short assessment helps Nora understand how you communicate and what you need. Takes about 5 minutes.
            </p>

            <div style={{ background: 'white', borderRadius: '16px', border: '0.5px solid #EDE5D8', padding: '20px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Love language insights',
                'Communication style profile',
                'Personalised Nora guidance',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(196, 113, 74, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="#C4714A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p style={{ fontSize: '14px', color: '#5C3D2E', margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.push('/assessment?onboarding=true')}
              style={{ width: '100%', padding: '16px', background: '#C4714A', color: '#FAF6EF', fontSize: '16px', fontWeight: 600, borderRadius: '14px', border: 'none', cursor: 'pointer' }}
            >
              Start assessment →
            </button>

            <button
              onClick={() => setStep(3)}
              style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', color: '#A09080', fontSize: '14px', border: 'none', cursor: 'pointer' }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 3: Preferences ───────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Tell Nora what you love.
            </h2>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 28px', lineHeight: 1.5 }}>
              This shapes your date suggestions and check-in timing.
            </p>

            {step3Error && (
              <div style={{ background: '#FFF0ED', border: '0.5px solid #E8C8B8', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#C4714A' }}>
                {step3Error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* Check-in time */}
              <div>
                <p style={sectionLabelStyle}>When to check in</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {CHECKIN_TIMES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCheckinTime(t.value)}
                      style={{
                        flex: 1,
                        padding: '12px 0',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        border: checkinTime === t.value ? 'none' : '0.5px solid #E8DDD0',
                        background: checkinTime === t.value ? '#C4714A' : 'white',
                        color: checkinTime === t.value ? '#FAF6EF' : '#5C3D2E',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', -apple-system, sans-serif",
                        transition: 'all 0.15s',
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hobbies */}
              <div>
                <p style={sectionLabelStyle}>
                  Top hobbies{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: '#A09080' }}>(pick up to 3)</span>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {HOBBIES.map(h => (
                    <Chip
                      key={h.value}
                      label={h.label}
                      selected={hobbies.includes(h.value)}
                      onClick={() => toggleHobby(h.value)}
                      disabled={!hobbies.includes(h.value) && hobbies.length >= 3}
                    />
                  ))}
                </div>
              </div>

              {/* Date preferences */}
              <div>
                <p style={sectionLabelStyle}>Date ideas you love</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DATE_PREFERENCES.map(d => (
                    <Chip
                      key={d.value}
                      label={d.label}
                      selected={datePrefs.includes(d.value)}
                      onClick={() => toggleDatePref(d.value)}
                    />
                  ))}
                </div>
              </div>

            </div>

            <button
              onClick={handleStep3}
              disabled={step3Saving}
              style={{
                width: '100%',
                padding: '16px',
                marginTop: '32px',
                background: step3Saving ? '#E8DDD0' : '#C4714A',
                color: step3Saving ? '#A09080' : '#FAF6EF',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                border: 'none',
                cursor: step3Saving ? 'not-allowed' : 'pointer',
              }}
            >
              {step3Saving ? 'Saving…' : 'Almost there →'}
            </button>

            <button
              onClick={async () => {
                await prepareStep4(user)
                setStep(4)
              }}
              style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'transparent', color: '#A09080', fontSize: '14px', border: 'none', cursor: 'pointer' }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 4: Invite partner ────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 400, color: '#1C1208', margin: '0 0 8px' }}>
              Bring them in.
            </h2>
            <p style={{ fontSize: '14px', color: '#A09080', margin: '0 0 28px', lineHeight: 1.5 }}>
              Share this code. They'll enter it at abf.app/connect and your profiles link automatically.
            </p>

            {step4Loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
              </div>
            ) : connectCode ? (
              <div>
                <div style={{ background: '#1C1208', borderRadius: '20px', padding: '32px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.16em', color: '#C4714A', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 600 }}>Connect Code</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: '42px', fontWeight: 400, color: '#F5ECD7', letterSpacing: '0.15em', margin: 0 }}>
                    {connectCode}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <button
                    onClick={handleCopyCode}
                    style={{ flex: 1, padding: '14px', background: 'white', border: '0.5px solid #E8DDD0', color: '#5C3D2E', fontSize: '14px', fontWeight: 600, borderRadius: '12px', cursor: 'pointer' }}
                  >
                    {codeCopied ? '✓ Copied' : 'Copy code'}
                  </button>
                  <button
                    onClick={handleShareCode}
                    style={{ flex: 1, padding: '14px', background: '#C4714A', color: '#FAF6EF', fontSize: '14px', fontWeight: 600, borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                  >
                    {codeShared ? '✓ Shared' : 'Share code'}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#C4714A', textAlign: 'center', padding: '32px 0' }}>
                Failed to generate a code. Please try again.
              </p>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              style={{ width: '100%', marginTop: '16px', padding: '14px', background: 'transparent', border: '0.5px solid #E8DDD0', color: '#7A6A54', fontSize: '14px', fontWeight: 500, borderRadius: '12px', cursor: 'pointer' }}
            >
              Explore solo first →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Page export: wraps with Suspense for useSearchParams ──────────────────────

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', background: '#FAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #E8DDD0', borderTopColor: '#C4714A', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  )
}
