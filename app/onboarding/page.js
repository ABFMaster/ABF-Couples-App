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
  { value: 'morning', label: '🌅 Morning' },
  { value: 'afternoon', label: '☀️ Afternoon' },
  { value: 'evening', label: '🌆 Evening' },
]

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ currentStep }) {
  const steps = [
    { num: 1, label: 'Profile' },
    { num: 2, label: 'Assessment' },
    { num: 3, label: 'Preferences' },
    { num: 4, label: 'Invite' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step.num < currentStep
                  ? 'bg-coral-500 text-white'
                  : step.num === currentStep
                  ? 'bg-coral-500 text-white ring-4 ring-coral-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step.num < currentStep ? '✓' : step.num}
            </div>
            <span
              className={`text-xs font-medium ${
                step.num === currentStep ? 'text-coral-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-0.5 w-8 mb-4 transition-all ${
                step.num < currentStep ? 'bg-coral-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
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
      className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
        selected
          ? 'bg-coral-500 text-white shadow-sm'
          : disabled
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-coral-300 hover:bg-cream-50'
      }`}
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

// ── Main Onboarding Component (needs useSearchParams → must be in Suspense) ───

function OnboardingFlow() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState(null) // null = determining
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
  const [stressResponse, setStressResponse] = useState('')
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

      // URL param takes priority for steps 3 & 4 (returned from /assessment)
      const urlStep = parseInt(searchParams.get('step') || '0', 10)
      if (urlStep === 3 || urlStep === 4) {
        setStep(urlStep)
        if (urlStep === 4) await prepareStep4(authUser)
        return
      }

      // Check assessment completion
      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('id')
        .eq('user_id', authUser.id)
        .not('completed_at', 'is', null)
        .limit(1)
        .maybeSingle()

      if (assessment) {
        setStep(3)
        return
      }

      // Check if display_name is already set
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name, partner_display_name, hobbies, date_preferences, preferred_checkin_time, stress_response')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (profile?.display_name) {
        // Pre-fill preferences if they exist
        setDisplayName(profile.display_name)
        setPartnerDisplayName(profile.partner_display_name || '')
        setHobbies(profile.hobbies || [])
        setDatePrefs(profile.date_preferences || [])
        setCheckinTime(profile.preferred_checkin_time || null)
        setStressResponse(profile.stress_response || '')
        setStep(2)
        return
      }

      if (profile) {
        setHobbies(profile.hobbies || [])
        setDatePrefs(profile.date_preferences || [])
        setCheckinTime(profile.preferred_checkin_time || null)
        setStressResponse(profile.stress_response || '')
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

      // Check existing couple
      const { data: existing } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        .maybeSingle()

      if (existing?.connected_at) {
        // Already connected — skip to dashboard
        router.push('/dashboard')
        return
      }

      if (existing?.connect_code) {
        setConnectCode(existing.connect_code)
      } else {
        // Create a new couple record with a connect code
        const code = generateConnectCode()

        // Check for collision (unlikely)
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

      // Also update auth metadata
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
          stress_response: stressResponse,
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

  // ── Hobby multi-select (max 3) ─────────────────────────────────────────────

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
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Setting things up...</p>
        </div>
      </div>
    )
  }

  // ── Shared page shell ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-r from-coral-400 to-coral-500 text-white rounded-2xl px-6 py-3 shadow-lg">
          <h1 className="text-2xl font-bold tracking-wider">ABF</h1>
          <p className="text-xs tracking-wide opacity-90">ALWAYS BE FLIRTING</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* ── STEP 1: Welcome + Name ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-4xl">👋</span>
              <h2 className="text-2xl font-bold text-gray-900 mt-3">Welcome to ABF!</h2>
              <p className="text-gray-500 mt-1">Let's start with the basics.</p>
            </div>

            {step1Error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {step1Error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your name <span className="text-coral-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How should we call you?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-coral-300 focus:border-transparent"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Partner's name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={partnerDisplayName}
                  onChange={e => setPartnerDisplayName(e.target.value)}
                  placeholder="What do you call them?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-coral-300 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                />
              </div>
            </div>

            <button
              onClick={handleStep1}
              disabled={step1Saving || !displayName.trim()}
              className="mt-6 w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step1Saving ? 'Saving...' : "Let's Go →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Assessment intro ── */}
        {step === 2 && (
          <div className="text-center">
            <span className="text-4xl">💭</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-3">Tell us about yourself</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              A short relationship assessment helps your AI coach give you personalized guidance.
              It takes about 5 minutes.
            </p>

            <div className="mt-6 bg-cream-50 rounded-xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-coral-500 font-bold">✓</span> Love language insights
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-coral-500 font-bold">✓</span> Communication style profile
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-coral-500 font-bold">✓</span> Personalized AI coach advice
              </div>
            </div>

            <button
              onClick={() => router.push('/assessment?onboarding=true')}
              className="mt-6 w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3.5 rounded-xl transition-all"
            >
              Start Assessment →
            </button>

            <button
              onClick={() => setStep(3)}
              className="mt-3 w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 3: Preferences ── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <span className="text-4xl">❤️</span>
              <h2 className="text-2xl font-bold text-gray-900 mt-3">Your preferences</h2>
              <p className="text-gray-500 mt-1">Help us personalise your experience.</p>
            </div>

            {step3Error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {step3Error}
              </div>
            )}

            <div className="space-y-6">
              {/* Check-in time */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Preferred check-in time
                </p>
                <div className="flex gap-2">
                  {CHECKIN_TIMES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setCheckinTime(t.value)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        checkinTime === t.value
                          ? 'bg-coral-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-cream-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hobbies */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Top hobbies{' '}
                  <span className="text-gray-400 font-normal">(pick up to 3)</span>
                </p>
                <div className="flex flex-wrap gap-2">
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
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  Date ideas you love
                </p>
                <div className="flex flex-wrap gap-2">
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

              {/* Stress response */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  When stressed, I need…{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <textarea
                  value={stressResponse}
                  onChange={e => setStressResponse(e.target.value)}
                  placeholder="e.g., A hug, some space, words of reassurance…"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-coral-300 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleStep3}
              disabled={step3Saving}
              className="mt-6 w-full bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step3Saving ? 'Saving...' : 'Almost there →'}
            </button>

            <button
              onClick={async () => {
                await prepareStep4(user)
                setStep(4)
              }}
              className="mt-3 w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── STEP 4: Invite partner ── */}
        {step === 4 && (
          <div className="text-center">
            <span className="text-4xl">💌</span>
            <h2 className="text-2xl font-bold text-gray-900 mt-3">Invite your partner</h2>
            <p className="text-gray-500 mt-1">
              Share this code so they can join you on ABF.
            </p>

            {step4Loading ? (
              <div className="my-8">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-coral-500 border-t-transparent mx-auto" />
              </div>
            ) : connectCode ? (
              <div className="mt-6">
                <div className="bg-cream-50 border-2 border-coral-100 rounded-2xl py-6 px-4 mb-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Connect Code</p>
                  <div className="text-5xl font-bold text-coral-500 tracking-widest">
                    {connectCode}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCopyCode}
                    className="flex-1 bg-white border-2 border-coral-200 text-coral-600 hover:bg-cream-50 font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    {codeCopied ? '✓ Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={handleShareCode}
                    className="flex-1 bg-coral-500 hover:bg-coral-600 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                  >
                    {codeShared ? '✓ Shared!' : 'Share Code'}
                  </button>
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  They'll use "I Have a Code" at abf.app/connect
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-500 mt-4">Failed to generate a code. Please try again.</p>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className="mt-6 w-full border-2 border-coral-300 text-coral-600 hover:bg-cream-50 font-semibold py-3 rounded-xl transition-all"
            >
              Explore Solo First →
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
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-coral-500 border-t-transparent" />
        </div>
      }
    >
      <OnboardingFlow />
    </Suspense>
  )
}
