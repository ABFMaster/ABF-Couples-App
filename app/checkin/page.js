'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MOOD_OPTIONS, selectRotatingQuestion } from '@/lib/checkin-questions'

const FALLBACK_QUESTION = {
  id: 'grat_1',
  text: "What's one thing your partner did recently that made you smile?",
  type: 'text',
  placeholder: 'A moment that made you happy...',
  category: 'gratitude',
}

export default function DailyCheckinPage() {
  const router = useRouter()

  // State
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [streak, setStreak] = useState(0)

  // Form state
  const [step, setStep] = useState(1)
  const [mood, setMood] = useState(null)
  const [connectionScore, setConnectionScore] = useState(null)
  const [rotatingQuestion, setRotatingQuestion] = useState(null)
  const [rotatingAnswer, setRotatingAnswer] = useState('')

  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false)

  const activeQuestion = rotatingQuestion || FALLBACK_QUESTION

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get user's couple
      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      if (!coupleData) {
        // No couple - can't do check-in
        setLoading(false)
        return
      }

      setCouple(coupleData)

      // Get partner name
      const partnerId = coupleData.user1_id === user.id
        ? coupleData.user2_id
        : coupleData.user1_id

      if (partnerId) {
        const { data: partnerData } = await supabase
          .from('users')
          .select('name')
          .eq('id', partnerId)
          .single()

        if (partnerData?.name) {
          setPartnerName(partnerData.name.split(' ')[0])
        }
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingCheckin } = await supabase
        .from('daily_checkins')
        .select('id')
        .eq('user_id', user.id)
        .eq('check_date', today)
        .single()

      if (existingCheckin) {
        router.push('/checkin/complete')
        return
      }

      // Calculate current streak
      await calculateStreak(user.id)

      // Fetch data for smart question selection
      await selectQuestion(user.id, coupleData.id)

      setLoading(false)
    } catch (err) {
      console.error('Auth error:', err)
      setLoading(false)
    }
  }

  const calculateStreak = async (userId) => {
    // Get recent check-ins ordered by date
    const { data: checkins } = await supabase
      .from('daily_checkins')
      .select('check_date')
      .eq('user_id', userId)
      .order('check_date', { ascending: false })
      .limit(30)

    if (!checkins || checkins.length === 0) {
      setStreak(0)
      return
    }

    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check yesterday first (today's check-in would be new)
    let checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - 1)

    for (const checkin of checkins) {
      const checkinDate = new Date(checkin.check_date)
      checkinDate.setHours(0, 0, 0, 0)

      if (checkinDate.getTime() === checkDate.getTime()) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (checkinDate < checkDate) {
        // Gap in streak
        break
      }
    }

    setStreak(currentStreak)
  }

  const selectQuestion = async (userId, coupleId) => {
    try {
      // Fetch user's assessment
      const { data: assessment } = await supabase
        .from('relationship_assessments')
        .select('results')
        .eq('user_id', userId)
        .eq('couple_id', coupleId)
        .not('completed_at', 'is', null)
        .single()

      // Fetch user's profile
      const { data: profile } = await supabase
        .from('individual_profiles')
        .select('results')
        .eq('user_id', userId)
        .not('completed_at', 'is', null)
        .single()

      // Fetch recent check-ins for context
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: recentCheckins } = await supabase
        .from('daily_checkins')
        .select('mood, connection_score, question_id, question_response')
        .eq('user_id', userId)
        .gte('check_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('check_date', { ascending: false })

      // Get recently used question IDs
      const usedQuestionIds = (recentCheckins || [])
        .map(c => c.question_id)
        .filter(Boolean)

      // Select rotating question
      const result = selectRotatingQuestion(
        assessment,
        profile,
        null, // Partner profile - could fetch if needed
        recentCheckins,
        usedQuestionIds
      )

      const question = result?.question || result
      console.log('[Checkin] rotatingQuestion selected:', question)
      setRotatingQuestion(question)
    } catch (err) {
      console.error('Error selecting question:', err)
      // Use fallback gratitude question
      setRotatingQuestion({
        id: 'grat_1',
        text: "What's one thing your partner did recently that made you smile?",
        type: 'text',
        placeholder: 'A moment that made you happy...',
        category: 'gratitude',
      })
    }
  }

  const goToNextStep = () => {
    if (step >= 3) return

    setIsTransitioning(true)
    setTimeout(() => {
      setStep(step + 1)
      setIsTransitioning(false)
    }, 200)
  }

  const goToPrevStep = () => {
    if (step <= 1) return

    setIsTransitioning(true)
    setTimeout(() => {
      setStep(step - 1)
      setIsTransitioning(false)
    }, 200)
  }

  const handleMoodSelect = (moodValue) => {
    setMood(moodValue)
    // Auto-advance after brief delay
    setTimeout(() => goToNextStep(), 300)
  }

  const handleConnectionSelect = (score) => {
    setConnectionScore(score)
    // Auto-advance after brief delay
    setTimeout(() => goToNextStep(), 300)
  }

  const handleSubmit = async () => {
    if (!mood || !connectionScore) return

    setSubmitting(true)

    try {
      const today = new Date().toISOString().split('T')[0]

      const { error } = await supabase
        .from('daily_checkins')
        .insert({
          user_id: user.id,
          couple_id: couple.id,
          mood,
          connection_score: connectionScore,
          question_id: activeQuestion.id,
          question_text: activeQuestion.text,
          question_response: rotatingAnswer || null,
          check_date: today,
        })

      if (error) throw error

      router.push('/checkin/complete')
    } catch (err) {
      console.error('Error submitting check-in:', err)
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="animate-pulse text-[#2D3648]">Loading...</div>
      </div>
    )
  }

  // No couple - need to connect partner first
  if (!couple) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex flex-col items-center justify-center p-6">
        <div className="text-6xl mb-4">💕</div>
        <h1 className="text-2xl font-bold text-[#2D3648] mb-2">Connect with Your Partner</h1>
        <p className="text-[#6B7280] text-center mb-6">
          Daily check-ins help you and your partner stay connected.
          <br />Connect with your partner first to start checking in.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white font-medium"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F6F3]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#FF6B9D] to-[#C9184A] text-white p-6 pb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Dashboard</span>
        </button>

        <h1 className="text-2xl font-bold">Daily Check-in</h1>
        <p className="text-white/80 text-sm mt-1">
          {streak > 0 ? (
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span>{streak} day streak!</span>
            </span>
          ) : (
            'Start your streak today'
          )}
        </p>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'bg-white'
                  : s < step
                    ? 'bg-white/80'
                    : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        <p className="text-white/60 text-xs mt-2">Step {step} of 3</p>
      </div>

      {/* Content */}
      <div className="p-6 -mt-4">
        <div
          className={`transition-all duration-200 ${
            isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Step 1: Mood Selection */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-[#2D3648] mb-2">
                How are you feeling today?
              </h2>
              <p className="text-[#6B7280] text-sm mb-6">
                Take a moment to check in with yourself
              </p>

              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleMoodSelect(option.value)}
                    className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 ${
                      mood === option.value
                        ? 'bg-gradient-to-br from-[#FF6B9D] to-[#C9184A] scale-105 shadow-lg'
                        : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                    }`}
                  >
                    <span className="text-4xl mb-1">{option.emoji}</span>
                    <span
                      className={`text-xs font-medium ${
                        mood === option.value ? 'text-white' : 'text-[#6B7280]'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Connection Score */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-[#2D3648] mb-2">
                How connected do you feel to {partnerName}?
              </h2>
              <p className="text-[#6B7280] text-sm mb-6">
                Right now, in this moment
              </p>

              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => handleConnectionSelect(score)}
                    className={`relative w-14 h-14 rounded-full transition-all duration-200 ${
                      connectionScore === score
                        ? 'scale-110'
                        : 'hover:scale-105'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-full h-full transition-all duration-200 ${
                        connectionScore !== null && score <= connectionScore
                          ? 'fill-[#C9184A]'
                          : 'fill-gray-200 hover:fill-gray-300'
                      }`}
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {connectionScore === score && (
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-[#C9184A]">
                        {score === 1 && 'Distant'}
                        {score === 2 && 'A bit off'}
                        {score === 3 && 'Okay'}
                        {score === 4 && 'Close'}
                        {score === 5 && 'Very close'}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-xs text-[#9CA3AF] mt-8 px-2">
                <span>Distant</span>
                <span>Very close</span>
              </div>

              {/* Back button */}
              <button
                onClick={goToPrevStep}
                className="mt-6 text-[#6B7280] text-sm flex items-center gap-1 hover:text-[#2D3648] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
          )}

          {/* Step 3: Rotating Question */}
          {step === 3 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-[#2D3648] mb-2">
                {activeQuestion.text}
              </h2>
              <p className="text-[#6B7280] text-sm mb-6">
                {activeQuestion.type === 'text' && 'Share your thoughts'}
                {activeQuestion.type === 'choice' && 'Select what resonates'}
                {activeQuestion.type === 'scale' && 'Rate how you feel'}
              </p>

              {/* Text input */}
              {activeQuestion.type === 'text' && (
                <textarea
                  value={rotatingAnswer}
                  onChange={(e) => setRotatingAnswer(e.target.value)}
                  placeholder={activeQuestion.placeholder || 'Type your response...'}
                  className="w-full h-32 p-4 border border-gray-200 rounded-xl text-[#2D3648] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#FF6B9D] focus:border-transparent resize-none"
                />
              )}

              {/* Choice selection */}
              {activeQuestion.type === 'choice' && (
                <div className="space-y-2">
                  {activeQuestion.options.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRotatingAnswer(option.value)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        rotatingAnswer === option.value
                          ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white'
                          : 'bg-gray-50 text-[#2D3648] hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Scale selection */}
              {activeQuestion.type === 'scale' && activeQuestion.scale && (
                <div>
                  <div className="flex justify-center gap-3 mb-4">
                    {Array.from(
                      { length: activeQuestion.scale.max - activeQuestion.scale.min + 1 },
                      (_, i) => i + activeQuestion.scale.min
                    ).map((value) => (
                      <button
                        key={value}
                        onClick={() => setRotatingAnswer(String(value))}
                        className={`w-12 h-12 rounded-full font-bold transition-all ${
                          rotatingAnswer === String(value)
                            ? 'bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white scale-110'
                            : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200 hover:scale-105'
                        }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-[#9CA3AF] px-2">
                    <span>{activeQuestion.scale.minLabel}</span>
                    <span>{activeQuestion.scale.maxLabel}</span>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={goToPrevStep}
                  className="text-[#6B7280] text-sm flex items-center gap-1 hover:text-[#2D3648] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Complete Check-in'
                  )}
                </button>
              </div>

              {/* Skip option for rotating question */}
              {activeQuestion.type === 'text' && !rotatingAnswer && (
                <p className="text-center text-[#9CA3AF] text-xs mt-4">
                  This is optional - feel free to skip
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary footer when not on first step */}
      {step > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-100 p-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            {mood && (
              <div className="flex items-center gap-1">
                <span>{MOOD_OPTIONS.find(m => m.value === mood)?.emoji}</span>
                <span className="text-[#6B7280]">
                  {MOOD_OPTIONS.find(m => m.value === mood)?.label}
                </span>
              </div>
            )}
            {connectionScore && (
              <div className="flex items-center gap-1">
                <span className="text-[#C9184A]">{'❤️'.repeat(connectionScore)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
