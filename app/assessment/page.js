'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  ASSESSMENT_ATTRIBUTION,
} from '@/lib/relationship-questions'

function AssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === 'true'
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)

  // Assessment state
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [moduleIntroShown, setModuleIntroShown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingAssessment, setExistingAssessment] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleData) {
        setCouple(coupleData)

        // Check for existing assessment
        const { data: existing } = await supabase
          .from('relationship_assessments')
          .select('*')
          .eq('user_id', user.id)
          .eq('couple_id', coupleData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existing) {
          setExistingAssessment(existing)
          // Load existing answers if assessment is incomplete
          if (!existing.completed_at && existing.answers) {
            setAnswers(existing.answers)
          }
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

  const currentModule = ASSESSMENT_MODULES[currentModuleIndex]
  const moduleQuestions = ASSESSMENT_QUESTIONS[currentModule?.id] || []
  const currentQuestion = moduleQuestions[currentQuestionIndex]
  const totalQuestions = ASSESSMENT_MODULES.reduce(
    (sum, mod) => sum + (ASSESSMENT_QUESTIONS[mod.id]?.length || 0),
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
    } else if (currentModuleIndex < ASSESSMENT_MODULES.length - 1) {
      // Next module
      setCurrentModuleIndex(prev => prev + 1)
      setCurrentQuestionIndex(0)
      setModuleIntroShown(false)

      // Save progress
      await saveProgress()
    } else {
      // Assessment complete - pass current answers to avoid race condition
      // The current question's answer is already in state, but we pass it explicitly
      // to ensure it's included even if React hasn't re-rendered yet
      const currentAnswer = answers[currentQuestion?.id]
      await completeAssessment(currentQuestion?.id, currentAnswer)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else if (currentModuleIndex > 0) {
      const prevModuleIndex = currentModuleIndex - 1
      const prevModuleQuestions = ASSESSMENT_QUESTIONS[ASSESSMENT_MODULES[prevModuleIndex].id]
      setCurrentModuleIndex(prevModuleIndex)
      setCurrentQuestionIndex(prevModuleQuestions.length - 1)
      setModuleIntroShown(true)
    }
  }

  const saveProgress = async () => {
    if (!user || !couple) return

    try {
      if (existingAssessment && !existingAssessment.completed_at) {
        await supabase
          .from('relationship_assessments')
          .update({ answers, updated_at: new Date().toISOString() })
          .eq('id', existingAssessment.id)
      } else {
        const { data } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            couple_id: couple.id,
            answers,
          })
          .select()
          .maybeSingle()

        if (data) setExistingAssessment(data)
      }
    } catch (err) {
      console.error('Error saving progress:', err)
    }
  }

  const completeAssessment = async (currentQuestionId, currentAnswer) => {
    setIsSubmitting(true)
    setSaveError(null)

    if (isOnboarding) {
      console.log('[Assessment] onboarding=true detected')
      console.log('[Assessment] Saving assessment for user:', user?.id, '| couple:', couple?.id ?? 'none')
    }

    try {
      // Merge current answer to avoid race condition where state hasn't updated yet
      const finalAnswers = {
        ...answers,
        ...(currentQuestionId && currentAnswer !== undefined ? { [currentQuestionId]: currentAnswer } : {})
      }

      // Generate insights FIRST using the complete answer set
      const moduleResults = ASSESSMENT_MODULES.map(module => {
        const moduleAnswers = {}
        ASSESSMENT_QUESTIONS[module.id].forEach(q => {
          if (finalAnswers[q.id] !== undefined) {
            moduleAnswers[q.id] = finalAnswers[q.id]
          }
        })
        return generateModuleInsights(module.id, moduleAnswers)
      })

      // Calculate overall score
      const overallPercentage = Math.round(
        moduleResults.reduce((sum, r) => sum + (r?.percentage || 0), 0) / moduleResults.length
      )

      const results = {
        modules: moduleResults,
        overallPercentage,
        completedAt: new Date().toISOString(),
      }

      const completedAt = new Date().toISOString()

      // Single database operation - either update or insert with ALL data
      if (existingAssessment) {
        // Update existing assessment with all data at once
        const { error } = await supabase
          .from('relationship_assessments')
          .update({
            answers: finalAnswers,
            results,
            completed_at: completedAt,
            updated_at: completedAt,
          })
          .eq('id', existingAssessment.id)

        if (isOnboarding) console.log('[Assessment] Save result (update):', error ?? 'OK')
        if (error) throw error

      } else if (user && couple) {
        // Insert with couple_id when couple exists
        const { error } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            couple_id: couple.id,
            answers: finalAnswers,
            results,
            completed_at: completedAt,
          })

        if (isOnboarding) console.log('[Assessment] Save result (insert with couple):', error ?? 'OK')
        if (error) throw error

      } else if (user && isOnboarding) {
        // Onboarding path: no couple yet — save without couple_id so the
        // assessment row exists before partner is invited
        const { error } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            answers: finalAnswers,
            results,
            completed_at: completedAt,
          })

        if (isOnboarding) console.log('[Assessment] Save result (insert solo/onboarding):', error ?? 'OK')
        if (error) throw error

      } else {
        // No user or no couple and not in onboarding — shouldn't happen, log it
        console.warn('[Assessment] Skipped save: user=', !!user, 'couple=', !!couple, 'onboarding=', isOnboarding)
      }

      // Redirect ONLY after save is confirmed complete (no throw above)
      if (isOnboarding) {
        console.log('[Assessment] Redirecting to /onboarding?step=3')
      }
      router.push(isOnboarding ? '/onboarding?step=3' : '/assessment/results')

    } catch (err) {
      console.error('[Assessment] Error completing assessment:', err)
      if (isOnboarding) {
        setSaveError('Failed to save your assessment. Please try again.')
      }
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg">Loading assessment...</p>
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
            className="h-full bg-gradient-to-r from-[#E8614D] to-[#C44A38] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Onboarding step indicator */}
          {isOnboarding && (
            <div className="text-center mb-4">
              <span className="inline-block bg-coral-100 text-coral-700 text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                STEP 2 OF 4 — ASSESSMENT
              </span>
            </div>
          )}

          {/* Back button */}
          <button
            onClick={() => router.push(isOnboarding ? '/onboarding' : '/dashboard')}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] mb-8 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Exit Assessment</span>
          </button>

          {/* Module card */}
          <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className={`bg-gradient-to-r ${currentModule.color} p-8 text-white`}>
              <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
                <span>Module {currentModuleIndex + 1} of {ASSESSMENT_MODULES.length}</span>
              </div>
              <div className="text-6xl mb-4">{currentModule.icon}</div>
              <h1 className="text-3xl font-bold mb-2">{currentModule.title}</h1>
            </div>

            {/* Description */}
            <div className="p-8">
              <p className="text-[#6B7280] text-lg leading-relaxed mb-8">
                {currentModule.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">
                  {moduleQuestions.length} questions in this section
                </span>
                <button
                  onClick={() => setModuleIntroShown(true)}
                  className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
                >
                  Begin
                </button>
              </div>
            </div>
          </div>

          {/* Module indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {ASSESSMENT_MODULES.map((mod, idx) => (
              <div
                key={mod.id}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === currentModuleIndex
                    ? 'bg-[#E8614D] scale-125'
                    : idx < currentModuleIndex
                    ? 'bg-[#E8614D]/50'
                    : 'bg-[#E5E2DD]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Question Screen
  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-[#F8F6F3]">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E5E2DD] z-50">
          <div
            className="h-full bg-gradient-to-r from-[#E8614D] to-[#C44A38] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Onboarding step indicator */}
          {isOnboarding && (
            <div className="text-center mb-4">
              <span className="inline-block bg-coral-100 text-coral-700 text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                STEP 2 OF 4 — ASSESSMENT
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${currentModule.bgColor} flex items-center justify-center`}>
                <span className="text-xl">{currentModule.icon}</span>
              </div>
              <div>
                <p className={`text-sm font-medium ${currentModule.textColor}`}>
                  {currentModule.shortTitle}
                </p>
                <p className="text-[#9CA3AF] text-sm">
                  Question {currentQuestionIndex + 1} of {moduleQuestions.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(isOnboarding ? '/onboarding' : '/dashboard')}
              className="text-[#9CA3AF] hover:text-[#6B7280] text-sm transition-colors"
            >
              Save & Exit
            </button>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-[#E5E2DD] mb-8">
            <h2 className="text-2xl font-bold text-[#2D3648] mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>

            {/* Answer options based on question type */}
            {currentQuestion.type === 'scale' || currentQuestion.type === 'choice' ? (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.value
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(currentQuestion.id, option.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-[#E8614D] bg-[#FDF6EF]'
                          : 'border-[#E5E2DD] hover:border-[#E8614D]/50 hover:bg-[#F8F6F3]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#E8614D] bg-[#E8614D]'
                              : 'border-[#E5E2DD]'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-lg ${isSelected ? 'text-[#2D3648] font-medium' : 'text-[#6B7280]'}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : currentQuestion.type === 'ranking' ? (
              <RankingQuestion
                question={currentQuestion}
                value={answers[currentQuestion.id] || {}}
                onChange={(rankings) => handleRankingAnswer(currentQuestion.id, rankings)}
              />
            ) : null}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentModuleIndex === 0 && currentQuestionIndex === 0}
              className="flex items-center gap-2 text-[#6B7280] hover:text-[#2D3648] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : currentModuleIndex === ASSESSMENT_MODULES.length - 1 &&
                currentQuestionIndex === moduleQuestions.length - 1 ? (
                <>
                  <span>See Results</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

          {/* Save error (onboarding mode) */}
          {saveError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl text-center">
              {saveError}
            </div>
          )}

          {/* Attribution */}
          <p className="text-center text-[#9CA3AF] text-xs mt-12">
            {ASSESSMENT_ATTRIBUTION}
          </p>
        </div>
      </div>
    )
  }

  return null
}

// Page export — wraps AssessmentContent in Suspense (required for useSearchParams)
export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4" />
            <p className="text-[#6B7280] text-lg">Loading assessment...</p>
          </div>
        </div>
      }
    >
      <AssessmentContent />
    </Suspense>
  )
}

// Ranking Question Component
function RankingQuestion({ question, value, onChange }) {
  const [rankings, setRankings] = useState(value)

  // Reset rankings when question changes - defer to next tick to avoid sync setState warning
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

  const getRank = (optionValue) => rankings[optionValue] || null

  return (
    <div>
      <p className="text-[#6B7280] text-sm mb-4">
        Rank these from 1 (most important) to {question.options.length} (least important)
      </p>
      <div className="space-y-3">
        {question.options.map((option) => {
          const rank = getRank(option.value)
          return (
            <div
              key={option.value}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                rank ? 'border-[#E8614D] bg-[#FDF6EF]' : 'border-[#E5E2DD]'
              }`}
            >
              <select
                value={rank || ''}
                onChange={(e) => handleRankChange(option.value, e.target.value ? parseInt(e.target.value) : null)}
                className="w-16 h-10 text-center rounded-lg border border-[#E5E2DD] bg-white text-[#2D3648] font-semibold focus:outline-none focus:border-[#E8614D]"
              >
                <option value="">-</option>
                {question.options.map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1}
                  </option>
                ))}
              </select>
              <span className={`flex-1 ${rank ? 'text-[#2D3648] font-medium' : 'text-[#6B7280]'}`}>
                {option.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
