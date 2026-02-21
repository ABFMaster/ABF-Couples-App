'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  PROFILE_MODULES,
  PROFILE_QUESTIONS,
  generateProfileInsights,
  PROFILE_ATTRIBUTION,
} from '@/lib/individual-profile-questions'

export default function ProfileAssessmentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  // Assessment state
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [moduleIntroShown, setModuleIntroShown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingProfile, setExistingProfile] = useState(null)

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check for existing profile assessment (single source of truth)
      const { data: existing } = await supabase
        .from('relationship_assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        setExistingProfile(existing)
        // Load existing answers if profile is incomplete
        if (!existing.completed_at && existing.answers) {
          setAnswers(existing.answers)
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentModule = PROFILE_MODULES[currentModuleIndex]
  const moduleQuestions = PROFILE_QUESTIONS[currentModule?.id] || []
  const currentQuestion = moduleQuestions[currentQuestionIndex]
  const totalQuestions = PROFILE_MODULES.reduce(
    (sum, mod) => sum + (PROFILE_QUESTIONS[mod.id]?.length || 0),
    0
  )

  // Calculate overall progress
  const answeredQuestions = Object.keys(answers).length
  const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100)

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleRankingAnswer = (questionId, rankings) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: rankings,
    }))
  }

  const canProceed = () => {
    if (!currentQuestion) return false
    const answer = answers[currentQuestion.id]
    if (currentQuestion.type === 'ranking') {
      return answer && Object.keys(answer).length === currentQuestion.options.length
    }
    return answer !== undefined
  }

  const handleNext = async () => {
    if (currentQuestionIndex < moduleQuestions.length - 1) {
      // Next question in module
      setCurrentQuestionIndex(prev => prev + 1)
    } else if (currentModuleIndex < PROFILE_MODULES.length - 1) {
      // Next module
      setCurrentModuleIndex(prev => prev + 1)
      setCurrentQuestionIndex(0)
      setModuleIntroShown(false)

      // Save progress
      await saveProgress()
    } else {
      // Assessment complete - pass current answers to avoid race condition
      const currentAnswer = answers[currentQuestion?.id]
      await completeProfile(currentQuestion?.id, currentAnswer)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else if (currentModuleIndex > 0) {
      const prevModuleIndex = currentModuleIndex - 1
      const prevModuleQuestions = PROFILE_QUESTIONS[PROFILE_MODULES[prevModuleIndex].id]
      setCurrentModuleIndex(prevModuleIndex)
      setCurrentQuestionIndex(prevModuleQuestions.length - 1)
      setModuleIntroShown(true)
    }
  }

  const saveProgress = async () => {
    if (!user) return

    try {
      if (existingProfile && !existingProfile.completed_at) {
        await supabase
          .from('relationship_assessments')
          .update({ answers, updated_at: new Date().toISOString() })
          .eq('id', existingProfile.id)
      } else {
        const { data } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            answers,
          })
          .select()
          .maybeSingle()

        if (data) setExistingProfile(data)
      }
    } catch (err) {
      console.error('Error saving progress:', err)
    }
  }

  const completeProfile = async (currentQuestionId, currentAnswer) => {
    setIsSubmitting(true)

    try {
      // Merge current answer to avoid race condition
      const finalAnswers = {
        ...answers,
        ...(currentQuestionId && currentAnswer !== undefined ? { [currentQuestionId]: currentAnswer } : {})
      }

      // Generate insights for each module FIRST
      const moduleResults = PROFILE_MODULES.map(module => {
        const moduleAnswers = {}
        PROFILE_QUESTIONS[module.id].forEach(q => {
          if (finalAnswers[q.id] !== undefined) {
            moduleAnswers[q.id] = finalAnswers[q.id]
          }
        })
        return generateProfileInsights(module.id, moduleAnswers)
      })

      // Calculate overall percentage
      const overallPercentage = Math.round(
        moduleResults.reduce((sum, r) => sum + (r?.percentage || 0), 0) / moduleResults.length
      )

      const results = {
        modules: moduleResults,
        overallPercentage,
        completedAt: new Date().toISOString(),
      }

      const completedAt = new Date().toISOString()

      // Single database operation - either update or insert
      if (existingProfile) {
        // Update existing assessment with all data at once
        const { error } = await supabase
          .from('relationship_assessments')
          .update({
            answers: finalAnswers,
            results,
            completed_at: completedAt,
            updated_at: completedAt,
          })
          .eq('id', existingProfile.id)

        if (error) {
          console.error('[Profile] Error updating assessment:', error)
          throw error
        }
      } else if (user) {
        // Insert new assessment with all data at once
        const { error } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            answers: finalAnswers,
            results,
            completed_at: completedAt,
          })

        if (error) {
          console.error('[Profile] Error inserting assessment:', error)
          throw error
        }
      }

      // Navigate to results
      router.push('/profile/results')
    } catch (err) {
      console.error('Error completing profile:', err)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Module Intro Screen
  if (!moduleIntroShown && currentModule) {
    return (
      <div className="min-h-screen bg-[#F8F6F3]">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E5E2DD] z-50">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Header with back button */}
        <div className="max-w-2xl mx-auto px-4 pt-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                saveProgress()
                router.push('/dashboard')
              }}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Dashboard</span>
            </button>
            <span className="text-[#9CA3AF] text-sm">
              {progressPercentage}% complete
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-4 pt-8 pb-16">
          <div className="max-w-lg w-full text-center">
            {/* Module icon */}
            <div className={`w-24 h-24 rounded-3xl ${currentModule.bgColor} flex items-center justify-center mx-auto mb-6`}>
              <span className="text-5xl">{currentModule.icon}</span>
            </div>

            {/* Module number */}
            <p className="text-[#9CA3AF] text-sm font-medium mb-2">
              MODULE {currentModuleIndex + 1} OF {PROFILE_MODULES.length}
            </p>

            {/* Module title */}
            <h1 className="text-3xl font-bold text-[#2D3648] mb-4">
              {currentModule.title}
            </h1>

            {/* Module description */}
            <p className="text-[#6B7280] text-lg mb-8">
              {currentModule.description}
            </p>

            {/* Question count */}
            <p className="text-[#9CA3AF] text-sm mb-8">
              {PROFILE_QUESTIONS[currentModule.id]?.length || 6} questions
            </p>

            {/* Start button */}
            <button
              onClick={() => setModuleIntroShown(true)}
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Begin
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Question Screen
  if (currentQuestion) {
    const moduleProgress = ((currentQuestionIndex + 1) / moduleQuestions.length) * 100

    return (
      <div className="min-h-screen bg-[#F8F6F3]">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E5E2DD] z-50">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handlePrevious}
              disabled={currentModuleIndex === 0 && currentQuestionIndex === 0}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <div className="text-center">
              <p className="text-[#9CA3AF] text-sm">
                {currentModule.title}
              </p>
              <p className="text-[#2D3648] font-medium">
                {currentQuestionIndex + 1} of {moduleQuestions.length}
              </p>
            </div>

            <button
              onClick={() => {
                saveProgress()
                router.push('/dashboard')
              }}
              className="text-[#6B7280] hover:text-[#2D3648] transition-colors"
            >
              Save & Exit
            </button>
          </div>

          {/* Module progress */}
          <div className="h-1 bg-[#E5E2DD] rounded-full mb-8">
            <div
              className={`h-full bg-gradient-to-r ${currentModule.color} rounded-full transition-all duration-300`}
              style={{ width: `${moduleProgress}%` }}
            />
          </div>

          {/* Question */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E2DD] p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-[#2D3648] mb-6">
              {currentQuestion.text}
            </h2>

            {/* Answer options */}
            {currentQuestion.type === 'single' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestion.id, option.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      answers[currentQuestion.id] === option.value
                        ? 'border-[#FF6B9D] bg-[#FFF4F8]'
                        : 'border-[#E5E2DD] hover:border-[#FF6B9D]/50'
                    }`}
                  >
                    <span className="text-[#2D3648]">{option.label}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'ranking' && (
              <RankingQuestion
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(rankings) => handleRankingAnswer(currentQuestion.id, rankings)}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : currentModuleIndex === PROFILE_MODULES.length - 1 &&
                currentQuestionIndex === moduleQuestions.length - 1 ? (
                'See My Profile'
              ) : (
                <>
                  <span>Continue</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Attribution */}
          <p className="text-center text-[#9CA3AF] text-xs mt-8">
            {PROFILE_ATTRIBUTION}
          </p>
        </div>
      </div>
    )
  }

  return null
}

// Ranking Question Component
function RankingQuestion({ question, value, onChange }) {
  const [rankings, setRankings] = useState(value || {})

  // Reset rankings when question changes
  useEffect(() => {
    const timer = setTimeout(() => setRankings(value || {}), 0)
    return () => clearTimeout(timer)
  }, [question.id, value])

  const handleRankChange = (optionValue, rank) => {
    const newRankings = { ...rankings }

    // Remove any existing assignment of this rank
    Object.keys(newRankings).forEach(key => {
      if (newRankings[key] === rank) {
        delete newRankings[key]
      }
    })

    // Assign new rank
    if (rank) {
      newRankings[optionValue] = rank
    } else {
      delete newRankings[optionValue]
    }

    setRankings(newRankings)
    onChange(newRankings)
  }

  const getRankForOption = (optionValue) => {
    return rankings[optionValue] || null
  }

  return (
    <div className="space-y-4">
      <p className="text-[#6B7280] text-sm mb-4">
        Rank from 1 (most important) to {question.options.length} (least important)
      </p>
      {question.options.map((option) => {
        const currentRank = getRankForOption(option.value)
        return (
          <div
            key={option.value}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#E5E2DD] bg-white"
          >
            <select
              value={currentRank || ''}
              onChange={(e) => handleRankChange(option.value, e.target.value ? parseInt(e.target.value) : null)}
              className="w-16 h-10 rounded-lg border border-[#E5E2DD] text-center text-[#2D3648] font-medium focus:outline-none focus:border-[#FF6B9D]"
            >
              <option value="">-</option>
              {Array.from({ length: question.options.length }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            <span className="flex-1 text-[#2D3648]">{option.label}</span>
          </div>
        )
      })}
    </div>
  )
}
