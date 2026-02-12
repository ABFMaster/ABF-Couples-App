'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Question definitions
const QUESTIONS = [
  {
    id: 'love_languages',
    title: 'Love Languages',
    subtitle: 'How do you feel most loved?',
    why: 'This helps us suggest flirts your partner will love and understand how to connect with you.',
    type: 'love_languages',
    options: [
      { value: 'words', label: 'Words of Affirmation', icon: '💬', description: 'Compliments, encouragement, "I love you"s' },
      { value: 'time', label: 'Quality Time', icon: '⏰', description: 'Undivided attention, shared activities' },
      { value: 'acts', label: 'Acts of Service', icon: '🤲', description: 'Helpful actions, taking care of tasks' },
      { value: 'gifts', label: 'Receiving Gifts', icon: '🎁', description: 'Thoughtful presents, tokens of love' },
      { value: 'touch', label: 'Physical Touch', icon: '🤗', description: 'Hugs, holding hands, physical closeness' },
    ],
  },
  {
    id: 'communication_style',
    title: 'Communication Style',
    subtitle: 'Select 1-3 that best describe you',
    why: 'Understanding your style helps create better conversations and check-in questions.',
    type: 'multi_select_limit',
    limit: 3,
    options: [
      { value: 'direct', label: 'Direct', description: 'I say what I mean clearly and appreciate the same' },
      { value: 'emotional', label: 'Emotional', description: 'I express feelings openly and value emotional connection' },
      { value: 'analytical', label: 'Analytical', description: 'I like to think things through and discuss logically' },
      { value: 'patient', label: 'Patient', description: 'I prefer to listen and take time before responding' },
      { value: 'passionate', label: 'Passionate', description: 'I communicate with energy and enthusiasm' },
      { value: 'gentle', label: 'Gentle', description: 'I prefer soft, caring conversations' },
    ],
  },
  {
    id: 'conflict_style',
    title: 'Conflict Resolution',
    subtitle: 'When disagreements happen, I prefer to...',
    why: 'This helps your partner understand how to work through challenges together.',
    type: 'single_select',
    options: [
      { value: 'talk_immediately', label: 'Talk it out right away', description: "Let's address it now before it grows" },
      { value: 'need_space', label: 'Take some space first', description: 'I need time to process before discussing' },
      { value: 'write_it_out', label: 'Write it out', description: 'I express myself better in writing' },
      { value: 'avoid', label: 'Let it cool down', description: 'Small things often resolve themselves with time' },
    ],
  },
  {
    id: 'top_values',
    title: 'Your Core Values',
    subtitle: 'Select your top 3 values',
    why: 'Shared values create deeper connection. We use this for meaningful conversations.',
    type: 'multi_select_limit',
    limit: 3,
    options: [
      { value: 'honesty', label: 'Honesty' },
      { value: 'loyalty', label: 'Loyalty' },
      { value: 'family', label: 'Family' },
      { value: 'adventure', label: 'Adventure' },
      { value: 'creativity', label: 'Creativity' },
      { value: 'stability', label: 'Stability' },
      { value: 'growth', label: 'Growth' },
      { value: 'independence', label: 'Independence' },
      { value: 'compassion', label: 'Compassion' },
      { value: 'humor', label: 'Humor' },
      { value: 'faith', label: 'Faith' },
      { value: 'health', label: 'Health' },
      { value: 'success', label: 'Success' },
      { value: 'connection', label: 'Connection' },
      { value: 'freedom', label: 'Freedom' },
      { value: 'security', label: 'Security' },
      { value: 'respect', label: 'Respect' },
      { value: 'ambition', label: 'Ambition' },
      { value: 'kindness', label: 'Kindness' },
      { value: 'balance', label: 'Balance' },
    ],
  },
  {
    id: 'hobbies',
    title: 'Interests & Hobbies',
    subtitle: 'Select up to 7 that you enjoy most',
    why: 'We use this to suggest activities and conversation topics you both might enjoy.',
    type: 'multi_select_limit',
    limit: 7,
    options: [
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
    ],
  },
  {
    id: 'date_preferences',
    title: 'Ideal Date Activities',
    subtitle: 'Select up to 7 favorites',
    why: 'This powers personalized date ideas and suggestions for your partner.',
    type: 'multi_select_limit',
    limit: 7,
    options: [
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
    ],
  },
  {
    id: 'checkin_time',
    title: 'Check-in Preference',
    subtitle: 'When do you prefer to reflect on your day?',
    why: "We'll time your daily check-in reminders around your preference.",
    type: 'single_select',
    options: [
      { value: 'morning', label: '🌅 Morning', description: 'Start my day with connection' },
      { value: 'afternoon', label: '☀️ Afternoon', description: 'Midday pause to reconnect' },
      { value: 'evening', label: '🌆 Evening', description: 'Wind down together after work' },
      { value: 'night', label: '🌙 Night', description: 'Reflect before bed' },
    ],
  },
  {
    id: 'stress_response',
    title: 'Stress Support',
    subtitle: 'When I\'m stressed, what helps most is...',
    why: 'Your partner will know exactly how to support you during tough times.',
    type: 'text',
    placeholder: "e.g., A hug, space to decompress, someone to listen, help with tasks...",
  },
]

export default function ProfileOnboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    love_language_primary: null,
    love_language_secondary: null,
    communication_style: [],
    conflict_style: null,
    top_values: [],
    hobbies: [],
    date_preferences: [],
    preferred_checkin_time: null,
    stress_response: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      router.push('/login')
      return
    }

    setUser(user)

    // Check if already completed
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingProfile?.completed_at) {
      router.push('/dashboard')
      return
    }

    // Load any partial progress
    if (existingProfile) {
      setAnswers({
        love_language_primary: existingProfile.love_language_primary || null,
        love_language_secondary: existingProfile.love_language_secondary || null,
        communication_style: existingProfile.communication_style || [],
        conflict_style: existingProfile.conflict_style || null,
        top_values: existingProfile.top_values || [],
        hobbies: existingProfile.hobbies || [],
        date_preferences: existingProfile.date_preferences || [],
        preferred_checkin_time: existingProfile.preferred_checkin_time || null,
        stress_response: existingProfile.stress_response || '',
      })
    }

    setLoading(false)
  }

  const currentQuestion = QUESTIONS[currentStep]
  const totalSteps = QUESTIONS.length

  const handleLoveLanguageSelect = (value, isPrimary) => {
    if (isPrimary) {
      // If selecting as primary, remove from secondary if it was there
      setAnswers(prev => ({
        ...prev,
        love_language_primary: value,
        love_language_secondary: prev.love_language_secondary === value ? null : prev.love_language_secondary,
      }))
    } else {
      // Secondary - can't be same as primary
      if (value !== answers.love_language_primary) {
        setAnswers(prev => ({
          ...prev,
          love_language_secondary: prev.love_language_secondary === value ? null : value,
        }))
      }
    }
  }

  const handleSingleSelect = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelect = (field, value, limit = null) => {
    setAnswers(prev => {
      const current = prev[field] || []
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) }
      } else {
        if (limit && current.length >= limit) {
          return prev
        }
        return { ...prev, [field]: [...current, value] }
      }
    })
  }

  const handleTextChange = (field, value) => {
    setAnswers(prev => ({ ...prev, [field]: value }))
  }

  const canProceed = () => {
    const q = currentQuestion
    if (q.type === 'love_languages') {
      return answers.love_language_primary !== null
    }
    if (q.type === 'single_select') {
      const field = q.id === 'conflict_style' ? 'conflict_style' : 'preferred_checkin_time'
      return answers[field] !== null
    }
    if (q.type === 'multi_select' || q.type === 'multi_select_limit') {
      const field = q.id
      return answers[field]?.length > 0
    }
    if (q.type === 'text') {
      return answers.stress_response?.trim().length > 0
    }
    return true
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const profileData = {
        user_id: user.id,
        love_language_primary: answers.love_language_primary,
        love_language_secondary: answers.love_language_secondary,
        communication_style: answers.communication_style,
        conflict_style: answers.conflict_style,
        top_values: answers.top_values,
        hobbies: answers.hobbies,
        date_preferences: answers.date_preferences,
        preferred_checkin_time: answers.preferred_checkin_time,
        stress_response: answers.stress_response,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' })

      if (error) throw error

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-pink-500 text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl px-4 py-2 shadow-lg">
            <span className="font-bold">ABF</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip for now
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Your Profile</span>
            <span>{currentStep + 1} of {totalSteps}</span>
          </div>
          <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-purple-500 transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 animate-fadeIn">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {currentQuestion.title}
          </h2>
          <p className="text-gray-600 mb-2">{currentQuestion.subtitle}</p>
          <p className="text-sm text-pink-500 mb-6">{currentQuestion.why}</p>

          {/* Love Languages - Special handling */}
          {currentQuestion.type === 'love_languages' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Primary (most important):</p>
                <div className="grid gap-3">
                  {currentQuestion.options.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleLoveLanguageSelect(option.value, true)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        answers.love_language_primary === option.value
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <p className="font-medium text-gray-800">{option.label}</p>
                          <p className="text-sm text-gray-500">{option.description}</p>
                        </div>
                        {answers.love_language_primary === option.value && (
                          <span className="ml-auto text-pink-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {answers.love_language_primary && (
                <div className="animate-fadeIn">
                  <p className="text-sm font-medium text-gray-700 mb-3">Secondary (optional):</p>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.options
                      .filter(o => o.value !== answers.love_language_primary)
                      .map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleLoveLanguageSelect(option.value, false)}
                          className={`px-4 py-2 rounded-full text-sm transition-all ${
                            answers.love_language_secondary === option.value
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {option.icon} {option.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Single Select */}
          {currentQuestion.type === 'single_select' && (
            <div className="space-y-3">
              {currentQuestion.options.map(option => {
                const field = currentQuestion.id === 'conflict_style' ? 'conflict_style' : 'preferred_checkin_time'
                const isSelected = answers[field] === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSingleSelect(field, option.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{option.label}</p>
                        {option.description && (
                          <p className="text-sm text-gray-500">{option.description}</p>
                        )}
                      </div>
                      {isSelected && <span className="text-pink-500">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Multi Select */}
          {(currentQuestion.type === 'multi_select' || currentQuestion.type === 'multi_select_limit') && (
            <div>
              {currentQuestion.limit && (
                <p className="text-sm text-gray-500 mb-3">
                  Select up to {currentQuestion.limit} ({answers[currentQuestion.id]?.length || 0}/{currentQuestion.limit})
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {currentQuestion.options.map(option => {
                  const isSelected = answers[currentQuestion.id]?.includes(option.value)
                  const isDisabled = currentQuestion.limit &&
                    answers[currentQuestion.id]?.length >= currentQuestion.limit &&
                    !isSelected
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultiSelect(currentQuestion.id, option.value, currentQuestion.limit)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        isSelected
                          ? 'bg-pink-500 text-white'
                          : isDisabled
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-pink-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              {currentQuestion.id === 'communication_style' && (
                <div className="mt-4 space-y-2">
                  {currentQuestion.options
                    .filter(o => answers.communication_style?.includes(o.value))
                    .map(option => (
                      <p key={option.value} className="text-sm text-gray-500">
                        <span className="font-medium">{option.label}:</span> {option.description}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Text Input */}
          {currentQuestion.type === 'text' && (
            <textarea
              value={answers.stress_response}
              onChange={(e) => handleTextChange('stress_response', e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full p-4 border-2 border-pink-200 rounded-xl focus:border-pink-400 focus:outline-none resize-none h-32 transition-colors"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 border-2 border-pink-300 text-pink-600 rounded-2xl font-semibold hover:bg-pink-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className="flex-1 py-4 bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-500 hover:to-pink-600 transition-all"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </span>
            ) : currentStep === totalSteps - 1 ? (
              'Complete Profile'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
