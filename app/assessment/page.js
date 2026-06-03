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

// Filter out standalone modules (e.g. attachment_style) from the main assessment flow
const MAIN_MODULES = ASSESSMENT_MODULES.filter(m => !m.standalone)

const SPIN = `@keyframes spin { to { transform: rotate(360deg) } }`

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

  const currentModule = MAIN_MODULES[currentModuleIndex]
  const moduleQuestions = ASSESSMENT_QUESTIONS[currentModule?.id] || []
  const currentQuestion = moduleQuestions[currentQuestionIndex]
  const totalQuestions = MAIN_MODULES.reduce(
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
    } else if (currentModuleIndex < MAIN_MODULES.length - 1) {
      // Next module
      setCurrentModuleIndex(prev => prev + 1)
      setCurrentQuestionIndex(0)
      setModuleIntroShown(false)

      // Save progress
      await saveProgress()
    } else {
      // Assessment complete - pass current answers to avoid race condition
      const currentAnswer = answers[currentQuestion?.id]
      await completeAssessment(currentQuestion?.id, currentAnswer)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else if (currentModuleIndex > 0) {
      const prevModuleIndex = currentModuleIndex - 1
      const prevModuleQuestions = ASSESSMENT_QUESTIONS[MAIN_MODULES[prevModuleIndex].id]
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

    try {
      // Merge current answer to avoid race condition where state hasn't updated yet
      const finalAnswers = {
        ...answers,
        ...(currentQuestionId && currentAnswer !== undefined ? { [currentQuestionId]: currentAnswer } : {})
      }

      // Generate insights FIRST using the complete answer set
      const moduleResults = MAIN_MODULES.map(module => {
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
        const { error } = await supabase
          .from('relationship_assessments')
          .update({
            answers: finalAnswers,
            results,
            completed_at: completedAt,
            updated_at: completedAt,
          })
          .eq('id', existingAssessment.id)

        if (error) throw error

      } else if (user && couple) {
        const { error } = await supabase
          .from('relationship_assessments')
          .insert({
            user_id: user.id,
            couple_id: couple.id,
            answers: finalAnswers,
            results,
            completed_at: completedAt,
          })

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

        if (error) throw error

      } else {
        // No user or no couple and not in onboarding — shouldn't happen, log it
        console.warn('[Assessment] Skipped save: user=', !!user, 'couple=', !!couple, 'onboarding=', isOnboarding)
      }

      // Redirect ONLY after save is confirmed complete (no throw above)
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
      <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{SPIN}</style>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #C4714A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  // Shared header bar
  const headerBar = (
    <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {isOnboarding ? (
        <span style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase' }}>
          Step 2 of 4 — Assessment
        </span>
      ) : (
        <div />
      )}
      <button
        onClick={() => router.push(isOnboarding ? '/onboarding' : '/dashboard')}
        style={{ background: 'none', border: 'none', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#8B7355', cursor: 'pointer', padding: 0 }}
      >
        Exit
      </button>
    </div>
  )

  // Module Intro Screen
  if (!moduleIntroShown && currentModule) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <style>{SPIN}</style>
        {headerBar}
        <div style={{ padding: '24px 24px 120px' }}>

          {/* Module header card */}
          <div style={{ background: '#1C1410', borderRadius: 16, padding: '28px 24px', marginBottom: 32 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{currentModule.icon}</div>
            <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 28, fontWeight: 400, color: '#FAF6F0', margin: '0 0 8px' }}>
              {currentModule.title}
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(250,246,240,0.7)', lineHeight: 1.5, margin: 0 }}>
              {currentModule.description}
            </p>
          </div>

          {/* Progress text */}
          <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24, marginTop: 0 }}>
            Question 1 of {moduleQuestions.length}
          </p>

          {/* Begin button */}
          <button
            onClick={() => setModuleIntroShown(true)}
            style={{ width: '100%', background: '#C4714A', color: '#FAF6F0', border: 'none', borderRadius: 12, padding: 16, fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
          >
            Begin
          </button>

          {/* Attribution */}
          <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: '#8B7355', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
            {ASSESSMENT_ATTRIBUTION}
          </p>

        </div>
      </div>
    )
  }

  // Question Screen
  if (currentQuestion) {
    const isFirstQuestion = currentModuleIndex === 0 && currentQuestionIndex === 0
    const isLastQuestion = currentModuleIndex === MAIN_MODULES.length - 1 && currentQuestionIndex === moduleQuestions.length - 1
    const proceed = canProceed()

    return (
      <div style={{ minHeight: '100vh', background: '#FAF6F0' }}>
        <style>{SPIN}</style>
        {headerBar}

        {/* Progress bar */}
        <div style={{ width: '100%', height: 3, background: '#E8DDD0', marginBottom: 32 }}>
          <div style={{ height: '100%', background: '#C4714A', borderRadius: 2, width: `${progressPercentage}%`, transition: 'width 0.3s' }} />
        </div>

        <div style={{ padding: '0 24px 120px' }}>

          {/* Module label */}
          <p style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase', marginBottom: 12, marginTop: 0 }}>
            {currentModule.shortTitle} · {currentQuestionIndex + 1} of {moduleQuestions.length}
          </p>

          {/* Question text */}
          <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#1C1410', lineHeight: 1.4, marginBottom: 32, marginTop: 0 }}>
            {currentQuestion.question}
          </h2>

          {/* Scale / Choice options */}
          {(currentQuestion.type === 'scale' || currentQuestion.type === 'choice') && (
            <div>
              {currentQuestion.options.map(option => {
                const isSelected = answers[currentQuestion.id] === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestion.id, option.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      marginBottom: 10,
                      padding: '14px 18px',
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? '#C4714A' : '#E8DDD0'}`,
                      background: isSelected ? '#FDF8F4' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: '#1C1410',
                      lineHeight: 1.4,
                      boxSizing: 'border-box',
                    }}
                  >
                    {currentQuestion.type === 'scale' && (
                      <span style={{ fontSize: 11, color: '#8B7355', flexShrink: 0, minWidth: 16 }}>{option.value}</span>
                    )}
                    <span>{option.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Ranking */}
          {currentQuestion.type === 'ranking' && (
            <RankingQuestion
              question={currentQuestion}
              value={answers[currentQuestion.id] || {}}
              onChange={(rankings) => handleRankingAnswer(currentQuestion.id, rankings)}
            />
          )}

          {/* Save error */}
          {saveError && (
            <p style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#C4714A', textAlign: 'center', padding: 8, marginBottom: 12 }}>
              {saveError}
            </p>
          )}

        </div>

        {/* Fixed bottom nav */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FAF6F0', borderTop: '1px solid #E8DDD0', padding: '16px 24px', display: 'flex', gap: 12 }}>
          {!isFirstQuestion && (
            <button
              onClick={handlePrevious}
              style={{ flex: 1, padding: 14, border: '1.5px solid #E8DDD0', borderRadius: 10, background: 'transparent', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#6B5D4F', cursor: 'pointer' }}
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!proceed || isSubmitting}
            style={{
              flex: 2,
              padding: 14,
              background: (!proceed || isSubmitting) ? '#E8DDD0' : '#C4714A',
              color: (!proceed || isSubmitting) ? '#8B7355' : '#FAF6F0',
              border: 'none',
              borderRadius: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 500,
              cursor: (!proceed || isSubmitting) ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Saving...' : isLastQuestion ? 'See Results' : 'Next'}
          </button>
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
        <div style={{ minHeight: '100vh', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{SPIN}</style>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #C4714A', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        </div>
      }
    >
      <AssessmentContent />
    </Suspense>
  )
}

// Ranking Question Component — tap-to-rank
function RankingQuestion({ question, value, onChange }) {
  const [rankings, setRankings] = useState(value)

  // Reset rankings when question changes - defer to next tick to avoid sync setState warning
  useEffect(() => {
    const timer = setTimeout(() => setRankings(value || {}), 0)
    return () => clearTimeout(timer)
  }, [question.id, value])

  const handleTap = (optionValue) => {
    const currentRank = rankings[optionValue]

    if (currentRank !== undefined) {
      // Remove rank and shift all higher ranks down by one
      const newRankings = {}
      Object.entries(rankings).forEach(([key, rank]) => {
        if (key === optionValue) return
        newRankings[key] = rank > currentRank ? rank - 1 : rank
      })
      setRankings(newRankings)
      onChange(newRankings)
    } else {
      // Assign next available rank
      const nextRank = Object.keys(rankings).length + 1
      const newRankings = { ...rankings, [optionValue]: nextRank }
      setRankings(newRankings)
      onChange(newRankings)
    }
  }

  return (
    <div>
      {question.options.map(option => {
        const rank = rankings[option.value]
        const isRanked = rank !== undefined
        return (
          <div
            key={option.value}
            onClick={() => handleTap(option.value)}
            style={{
              padding: '14px 18px',
              borderRadius: 10,
              border: `1.5px solid ${isRanked ? '#C4714A' : '#E8DDD0'}`,
              background: isRanked ? '#FDF8F4' : '#FFFFFF',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: isRanked ? '#C4714A' : '#F5F0EA',
              color: isRanked ? '#FAF6F0' : '#8B7355',
              fontSize: isRanked ? 13 : 11,
              fontWeight: isRanked ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {isRanked ? rank : '—'}
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#1C1410' }}>
              {option.label}
            </span>
          </div>
        )
      })}
      <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: '#8B7355', fontStyle: 'italic', marginTop: 8 }}>
        Tap to rank in order of preference. Tap again to remove.
      </p>
    </div>
  )
}
