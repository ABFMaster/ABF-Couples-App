'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ASSESSMENT_MODULES,
  ASSESSMENT_QUESTIONS,
  generateModuleInsights,
  ASSESSMENT_ATTRIBUTION,
} from '@/lib/relationship-questions'

export default function AssessmentPage() {
  const router = useRouter()
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

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

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
          .single()

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
      // Assessment complete
      await completeAssessment()
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
          .single()

        if (data) setExistingAssessment(data)
      }
    } catch (err) {
      console.error('Error saving progress:', err)
    }
  }

  const completeAssessment = async () => {
    setIsSubmitting(true)

    try {
      // First, ensure all answers (including the last one) are saved to the database
      if (user && couple) {
        if (existingAssessment && !existingAssessment.completed_at) {
          await supabase
            .from('relationship_assessments')
            .update({ answers, updated_at: new Date().toISOString() })
            .eq('id', existingAssessment.id)
        } else if (!existingAssessment) {
          const { data } = await supabase
            .from('relationship_assessments')
            .insert({
              user_id: user.id,
              couple_id: couple.id,
              answers,
            })
            .select()
            .single()

          if (data) setExistingAssessment(data)
        }
      }

      // Now generate insights using the complete answer set
      const moduleResults = ASSESSMENT_MODULES.map(module => {
        const moduleAnswers = {}
        ASSESSMENT_QUESTIONS[module.id].forEach(q => {
          if (answers[q.id] !== undefined) {
            moduleAnswers[q.id] = answers[q.id]
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

      // Save completed assessment
      if (existingAssessment) {
        await supabase
          .from('relationship_assessments')
          .update({
            answers,
            results,           // Legacy column name (if exists)
            module_results: results,  // New column name
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingAssessment.id)
      } else if (user && couple) {
        await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            couple_id: couple.id,
            answers,
            results,           // Legacy column name (if exists)
            module_results: results,  // New column name
            completed_at: new Date().toISOString(),
          })
      }

      // Navigate to results
      router.push('/assessment/results')
    } catch (err) {
      console.error('Error completing assessment:', err)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mx-auto mb-4"></div>
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
            className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
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
                  className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
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
                    ? 'bg-[#FF6B9D] scale-125'
                    : idx < currentModuleIndex
                    ? 'bg-[#FF6B9D]/50'
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
            className="h-full bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-12">
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
              onClick={() => router.push('/dashboard')}
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
                          ? 'border-[#FF6B9D] bg-[#FFF4F8]'
                          : 'border-[#E5E2DD] hover:border-[#FF6B9D]/50 hover:bg-[#F8F6F3]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-[#FF6B9D] bg-[#FF6B9D]'
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
              className="flex items-center gap-2 bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-6 py-3 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
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

// Ranking Question Component
function RankingQuestion({ question, value, onChange }) {
  const [rankings, setRankings] = useState(value)

  // Reset rankings when question changes
  useEffect(() => {
    setRankings(value || {})
  }, [question.id])

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
                rank ? 'border-[#FF6B9D] bg-[#FFF4F8]' : 'border-[#E5E2DD]'
              }`}
            >
              <select
                value={rank || ''}
                onChange={(e) => handleRankChange(option.value, e.target.value ? parseInt(e.target.value) : null)}
                className="w-16 h-10 text-center rounded-lg border border-[#E5E2DD] bg-white text-[#2D3648] font-semibold focus:outline-none focus:border-[#FF6B9D]"
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
