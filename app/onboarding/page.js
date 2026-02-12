'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const questions = [
  // Category 1: Communication
  {
    id: 'q1',
    category: 'Communication',
    emoji: '💬',
    question: 'How do you prefer to discuss important topics?',
    options: [
      { value: 'A', label: 'Right away when they come up' },
      { value: 'B', label: "After I've had time to think about it" },
      { value: 'C', label: "When we're both calm and relaxed" },
      { value: 'D', label: 'Through a mix of talking and messaging' },
    ],
  },
  {
    id: 'q2',
    category: 'Communication',
    emoji: '💬',
    question: "When your partner shares a problem, what's your first instinct?",
    options: [
      { value: 'A', label: 'Offer solutions and advice' },
      { value: 'B', label: 'Listen and validate their feelings' },
      { value: 'C', label: 'Share a similar experience' },
      { value: 'D', label: 'Ask questions to understand better' },
    ],
  },
  {
    id: 'q3',
    category: 'Communication',
    emoji: '💬',
    question: 'How often do you like checking in about your day?',
    options: [
      { value: 'A', label: 'Multiple times throughout the day' },
      { value: 'B', label: 'Once in the morning and evening' },
      { value: 'C', label: 'Mainly at the end of the day' },
      { value: 'D', label: 'When something important happens' },
    ],
  },
  // Category 2: Conflict Resolution
  {
    id: 'q4',
    category: 'Conflict Resolution',
    emoji: '🤝',
    question: "When you disagree, what's your typical approach?",
    options: [
      { value: 'A', label: 'Talk it through immediately' },
      { value: 'B', label: 'Take space, then discuss later' },
      { value: 'C', label: 'Try to find a compromise quickly' },
      { value: 'D', label: 'Let minor things go, address major issues' },
    ],
  },
  {
    id: 'q5',
    category: 'Conflict Resolution',
    emoji: '🤝',
    question: "During a disagreement, you're most likely to:",
    options: [
      { value: 'A', label: 'Express your feelings openly' },
      { value: 'B', label: 'Focus on finding a solution' },
      { value: 'C', label: 'Try to understand their perspective first' },
      { value: 'D', label: 'Need time alone to process' },
    ],
  },
  {
    id: 'q6',
    category: 'Conflict Resolution',
    emoji: '🤝',
    question: 'After a conflict, you feel reconnected when:',
    options: [
      { value: 'A', label: 'We talk through what happened' },
      { value: 'B', label: 'We do something fun together' },
      { value: 'C', label: 'We give each other physical affection' },
      { value: 'D', label: "We both say we're sorry and move on" },
    ],
  },
  // Category 3: Emotional Intimacy & Trust
  {
    id: 'q7',
    category: 'Emotional Intimacy',
    emoji: '💕',
    question: 'How comfortable are you sharing your deepest feelings?',
    options: [
      { value: 'A', label: "Very comfortable - I'm an open book" },
      { value: 'B', label: 'Comfortable with some topics, not all' },
      { value: 'C', label: 'It takes time for me to open up' },
      { value: 'D', label: 'I prefer showing love through actions' },
    ],
  },
  {
    id: 'q8',
    category: 'Emotional Intimacy',
    emoji: '💕',
    question: 'You feel most loved when your partner:',
    options: [
      { value: 'A', label: 'Tells you verbally' },
      { value: 'B', label: 'Spends quality time with you' },
      { value: 'C', label: 'Does thoughtful things for you' },
      { value: 'D', label: 'Shows physical affection' },
    ],
  },
  {
    id: 'q9',
    category: 'Emotional Intimacy',
    emoji: '💕',
    question: "When you're stressed, you prefer your partner to:",
    options: [
      { value: 'A', label: 'Give you space to work through it' },
      { value: 'B', label: "Talk with you about what's wrong" },
      { value: 'C', label: 'Distract you with something fun' },
      { value: 'D', label: 'Simply be present without pressure' },
    ],
  },
  // Category 4: Values & Future Goals
  {
    id: 'q10',
    category: 'Values & Goals',
    emoji: '🎯',
    question: "What's most important to you in life?",
    options: [
      { value: 'A', label: 'Career and personal achievement' },
      { value: 'B', label: 'Family and close relationships' },
      { value: 'C', label: 'Adventure and new experiences' },
      { value: 'D', label: 'Security and stability' },
    ],
  },
  {
    id: 'q11',
    category: 'Values & Goals',
    emoji: '🎯',
    question: 'In 5 years, you see yourself:',
    options: [
      { value: 'A', label: 'In the same place, deeper roots' },
      { value: 'B', label: 'Exploring new opportunities or locations' },
      { value: 'C', label: 'Focused on family growth (kids, etc.)' },
      { value: 'D', label: 'Building financial security and comfort' },
    ],
  },
  {
    id: 'q12',
    category: 'Values & Goals',
    emoji: '🎯',
    question: 'How do you approach big life decisions?',
    options: [
      { value: 'A', label: 'Research thoroughly, then decide' },
      { value: 'B', label: 'Trust my gut feeling' },
      { value: 'C', label: 'Discuss extensively with my partner' },
      { value: 'D', label: 'Consider practical factors first' },
    ],
  },
  // Category 5: Affection & Quality Time
  {
    id: 'q13',
    category: 'Affection & Quality Time',
    emoji: '🥰',
    question: 'Your ideal date night is:',
    options: [
      { value: 'A', label: 'Staying in - cooking, movies, games' },
      { value: 'B', label: 'Going out - dinner, activities, events' },
      { value: 'C', label: 'Something active and adventurous' },
      { value: 'D', label: 'Whatever feels spontaneous that day' },
    ],
  },
  {
    id: 'q14',
    category: 'Affection & Quality Time',
    emoji: '🥰',
    question: 'How much physical affection do you like daily?',
    options: [
      { value: 'A', label: 'A lot - frequent hugs, kisses, touching' },
      { value: 'B', label: 'Moderate - regular but not constant' },
      { value: 'C', label: 'Some - morning/evening connection' },
      { value: 'D', label: 'Varies - depends on my mood/energy' },
    ],
  },
  {
    id: 'q15',
    category: 'Affection & Quality Time',
    emoji: '🥰',
    question: 'Quality time together means:',
    options: [
      { value: 'A', label: 'Doing activities side by side' },
      { value: 'B', label: 'Deep conversations and connection' },
      { value: 'C', label: 'Trying new experiences together' },
      { value: 'D', label: 'Relaxing without needing to do anything' },
    ],
  },
  // Category 6: Support & Partnership
  {
    id: 'q16',
    category: 'Support & Partnership',
    emoji: '💪',
    question: 'When your partner is struggling, you:',
    options: [
      { value: 'A', label: 'Jump in to help solve the problem' },
      { value: 'B', label: 'Listen and offer emotional support' },
      { value: 'C', label: 'Give them space unless they ask' },
      { value: 'D', label: 'Check in regularly and offer help' },
    ],
  },
  {
    id: 'q17',
    category: 'Support & Partnership',
    emoji: '💪',
    question: 'In a partnership, you believe in:',
    options: [
      { value: 'A', label: 'Equal division of all responsibilities' },
      { value: 'B', label: "Playing to each person's strengths" },
      { value: 'C', label: 'Traditional roles and expectations' },
      { value: 'D', label: 'Flexibility - adjust as needs change' },
    ],
  },
  {
    id: 'q18',
    category: 'Support & Partnership',
    emoji: '💪',
    question: 'You feel like a team when:',
    options: [
      { value: 'A', label: 'We tackle challenges together' },
      { value: 'B', label: "We celebrate each other's wins" },
      { value: 'C', label: 'We make decisions jointly' },
      { value: 'D', label: 'We can rely on each other completely' },
    ],
  },
]

const categories = [
  { name: 'Communication', emoji: '💬', questions: ['q1', 'q2', 'q3'] },
  { name: 'Conflict Resolution', emoji: '🤝', questions: ['q4', 'q5', 'q6'] },
  { name: 'Emotional Intimacy', emoji: '💕', questions: ['q7', 'q8', 'q9'] },
  { name: 'Values & Goals', emoji: '🎯', questions: ['q10', 'q11', 'q12'] },
  { name: 'Affection & Quality Time', emoji: '🥰', questions: ['q13', 'q14', 'q15'] },
  { name: 'Support & Partnership', emoji: '💪', questions: ['q16', 'q17', 'q18'] },
]

export default function Onboarding() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState('')
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [partnerCompleted, setPartnerCompleted] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get couple data
      const { data: coupleData, error: coupleError } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      if (coupleError || !coupleData) {
        router.push('/connect')
        return
      }

      setCouple(coupleData)

      // Check if user already completed onboarding
      const { data: existingResponse } = await supabase
        .from('onboarding_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('couple_id', coupleData.id)
        .single()

      if (existingResponse) {
        // Check if user has completed their individual profile
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('completed_at')
          .eq('user_id', user.id)
          .single()

        // If couples onboarding done but profile not complete, redirect to profile onboarding
        if (!userProfile?.completed_at) {
          router.push('/profile-onboarding')
          return
        }

        setAlreadyCompleted(true)

        // Check if partner completed
        const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id
        const { data: partnerResponse } = await supabase
          .from('onboarding_responses')
          .select('*')
          .eq('user_id', partnerId)
          .eq('couple_id', coupleData.id)
          .single()

        if (partnerResponse) {
          setPartnerCompleted(true)
        }
      }

      setLoading(false)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const answeredCount = Object.keys(answers).length
  const progressPercent = (answeredCount / 18) * 100

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (answeredCount < 18) {
      setError('Please answer all 18 questions before submitting.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Insert the response
      const { error: insertError } = await supabase
        .from('onboarding_responses')
        .insert({
          user_id: user.id,
          couple_id: couple.id,
          answers: answers,
          completed_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }

      // After couples onboarding, redirect to individual profile onboarding
      router.push('/profile-onboarding')
    } catch (err) {
      setError('Failed to save your answers. Please try again.')
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

  // Already completed - show waiting screen or redirect
  if (alreadyCompleted) {
    if (partnerCompleted) {
      router.push('/results')
      return null
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-2xl font-bold text-pink-600 mb-4">
            You're All Done!
          </h2>
          <p className="text-gray-600 mb-6">
            We're waiting for your partner to complete their 18 questions. Once they're done, you'll both be able to see your compatibility results!
          </p>
          <div className="animate-pulse">
            <div className="flex justify-center gap-2">
              <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animation-delay-200"></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animation-delay-400"></div>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-8 text-pink-500 hover:text-pink-600 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-gradient-to-r from-pink-400 to-pink-500 text-white rounded-xl px-4 py-2">
              <h1 className="text-lg font-bold tracking-wider">ABF</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Progress</p>
              <p className="text-lg font-bold text-pink-600">{answeredCount}/18</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-pink-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pink-400 to-pink-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-pink-600 mb-2">
            18 Questions
          </h2>
          <p className="text-gray-600">
            Answer honestly - there are no right or wrong answers!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {categories.map((category, catIndex) => (
            <div key={category.name} className="mb-8">
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4 sticky top-24 bg-gradient-to-r from-pink-50/95 to-pink-100/95 backdrop-blur-sm py-2 px-3 rounded-xl -mx-3">
                <span className="text-2xl">{category.emoji}</span>
                <h3 className="text-xl font-bold text-pink-600">{category.name}</h3>
                <span className="ml-auto text-sm text-gray-500">
                  {category.questions.filter(q => answers[q]).length}/3
                </span>
              </div>

              {/* Questions in this category */}
              {category.questions.map((questionId, qIndex) => {
                const question = questions.find(q => q.id === questionId)
                const questionNumber = catIndex * 3 + qIndex + 1

                return (
                  <div
                    key={questionId}
                    className={`bg-white rounded-2xl shadow-md p-6 mb-4 transition-all duration-300 ${
                      answers[questionId] ? 'ring-2 ring-pink-300' : ''
                    }`}
                  >
                    <p className="text-gray-500 text-sm mb-2">Question {questionNumber}</p>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {question.question}
                    </h4>

                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            answers[questionId] === option.value
                              ? 'bg-pink-100 border-2 border-pink-400'
                              : 'bg-gray-50 border-2 border-transparent hover:bg-pink-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={questionId}
                            value={option.value}
                            checked={answers[questionId] === option.value}
                            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                            className="sr-only"
                          />
                          <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-3 transition-all ${
                            answers[questionId] === option.value
                              ? 'border-pink-500 bg-pink-500 text-white'
                              : 'border-gray-300'
                          }`}>
                            {option.value}
                          </span>
                          <span className={`flex-1 ${
                            answers[questionId] === option.value
                              ? 'text-pink-700 font-medium'
                              : 'text-gray-700'
                          }`}>
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Submit Button */}
          <div className="sticky bottom-4 pt-4">
            <button
              type="submit"
              disabled={answeredCount < 18 || submitting}
              className={`w-full py-4 rounded-full font-bold text-lg shadow-lg transition-all transform ${
                answeredCount < 18
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-400 to-pink-500 text-white hover:from-pink-500 hover:to-pink-600 hover:scale-[1.02]'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Saving...
                </span>
              ) : answeredCount < 18 ? (
                `Answer ${18 - answeredCount} more question${18 - answeredCount === 1 ? '' : 's'}`
              ) : (
                'Submit My Answers'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
