'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_MODULES, ASSESSMENT_ATTRIBUTION } from '@/lib/relationship-questions'

// Circular Progress Component with gradient
function CircularProgress({ percentage, color, size = 80, strokeWidth = 6, animate = true }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedPercentage / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage)
    }, animate ? 100 : 0)
    return () => clearTimeout(timer)
  }, [percentage, animate])

  // Parse gradient colors from Tailwind class
  const getGradientColors = (colorClass) => {
    const colorMap = {
      'from-coral-500 to-coral-500': ['#E8614D', '#f43f5e'],
      'from-indigo-500 to-violet-500': ['#5D55A0', '#3D3580'],
      'from-blue-500 to-cyan-500': ['#3b82f6', '#06b6d4'],
      'from-amber-500 to-orange-500': ['#f59e0b', '#f97316'],
      'from-emerald-500 to-teal-500': ['#10b981', '#14b8a6'],
    }
    return colorMap[colorClass] || ['#E8614D', '#C44A38']
  }

  const [startColor, endColor] = getGradientColors(color)
  const gradientId = `progress-gradient-${color?.replace(/\s/g, '-') || 'default'}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-[#2D3648]">{Math.round(animatedPercentage)}%</span>
      </div>
    </div>
  )
}

export default function AssessmentResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [partnerAssessment, setPartnerAssessment] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [expandedModule, setExpandedModule] = useState(null)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [animateCards, setAnimateCards] = useState(false)
  const [incompleteAssessment, setIncompleteAssessment] = useState(null)

  // Check if both partners have completed for language switching
  const bothCompleted = assessment && partnerAssessment

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle()

      if (coupleData) {
        const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id

        // Get partner name
        if (partnerId) {
          const { data: partnerProfile } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('user_id', partnerId)
            .maybeSingle()

          setPartnerName(partnerProfile?.display_name || 'Partner')

          // Get partner's assessment
          const { data: partnerData } = await supabase
            .from('relationship_assessments')
            .select('*')
            .eq('user_id', partnerId)
            .eq('couple_id', coupleData.id)
            .not('completed_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (partnerData) {
            setPartnerAssessment(partnerData)
          }
        }

        // Get user's assessment
        const { data: assessmentData } = await supabase
          .from('relationship_assessments')
          .select('*')
          .eq('user_id', user.id)
          .eq('couple_id', coupleData.id)
          .not('completed_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (assessmentData) {
          setAssessment(assessmentData)
        } else {
          // Check for incomplete assessment
          const { data: incompleteData } = await supabase
            .from('relationship_assessments')
            .select('*')
            .eq('user_id', user.id)
            .eq('couple_id', coupleData.id)
            .is('completed_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (incompleteData) {
            setIncompleteAssessment(incompleteData)
          }
        }
      }

      setLoading(false)
      // Trigger card animations after load
      setTimeout(() => setAnimateCards(true), 100)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleShare = async () => {
    const shareData = {
      title: 'My Relationship Assessment Results',
      text: `I scored ${assessment?.results?.overallPercentage || assessment?.module_results?.overallPercentage}% on my relationship health assessment!`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        setShowShareMenu(true)
        setTimeout(() => setShowShareMenu(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const getStrengthColor = (level) => {
    switch (level) {
      case 'strong':
        return 'text-emerald-600'
      case 'good':
        return 'text-blue-600'
      case 'developing':
        return 'text-amber-600'
      case 'growth_area':
        return 'text-coral-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStrengthBg = (level) => {
    switch (level) {
      case 'strong':
        return 'bg-emerald-100'
      case 'good':
        return 'bg-blue-100'
      case 'developing':
        return 'bg-amber-100'
      case 'growth_area':
        return 'bg-cream-100'
      default:
        return 'bg-gray-100'
    }
  }

  const getStrengthLabel = (level) => {
    switch (level) {
      case 'strong':
        return 'Strength'
      case 'good':
        return 'Good'
      case 'developing':
        return 'Developing'
      case 'growth_area':
        return 'Growth Area'
      default:
        return 'Unknown'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg">Loading your results...</p>
        </div>
      </div>
    )
  }

  // Support both column names: results (legacy) and module_results (new)
  const assessmentResults = assessment?.results || assessment?.module_results

  if (!assessmentResults) {
    // Calculate progress for incomplete assessment
    const answeredCount = incompleteAssessment?.answers
      ? Object.keys(incompleteAssessment.answers).length
      : 0
    const totalQuestions = 30 // 6 questions per module × 5 modules
    const progressPercent = Math.round((answeredCount / totalQuestions) * 100)

    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-7xl mb-6">{incompleteAssessment ? '📝' : '📋'}</div>
          <h2 className="text-3xl font-bold text-[#2D3648] mb-3">
            {incompleteAssessment ? 'Assessment In Progress' : 'No Results Yet'}
          </h2>
          <p className="text-[#6B7280] mb-6">
            {incompleteAssessment
              ? `You've completed ${progressPercent}% of the assessment. Pick up where you left off!`
              : 'Complete the relationship assessment to see your personalized insights.'
            }
          </p>

          {/* Progress bar for incomplete */}
          {incompleteAssessment && (
            <div className="mb-8">
              <div className="h-3 bg-[#E5E2DD] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#E8614D] to-[#C44A38] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-sm text-[#9CA3AF] mt-2">{answeredCount} of {totalQuestions} questions answered</p>
            </div>
          )}

          <button
            onClick={() => router.push('/assessment')}
            className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
          >
            {incompleteAssessment ? 'Continue Assessment' : 'Start Assessment'}
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="block mx-auto mt-4 text-[#6B7280] hover:text-[#2D3648] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const results = assessmentResults
  const moduleResults = results.modules || []

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                {bothCompleted ? 'Your Relationship Insights' : 'Your Assessment Results'}
              </h1>
              <p className="text-white/80 text-lg">
                Completed {new Date(assessment.completed_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>

          {/* Share confirmation toast */}
          {showShareMenu && (
            <div className="fixed top-4 right-4 bg-[#2D3648] text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
              Copied to clipboard!
            </div>
          )}

          {/* Celebration Message - different language based on partner completion */}
          <div className="mt-4 text-white/90 text-lg">
            {bothCompleted ? (
              // Couple language when both completed
              <>
                {results.overallPercentage >= 80 && "You and your partner have built something special together."}
                {results.overallPercentage >= 60 && results.overallPercentage < 80 && "Your relationship has a strong foundation with room to grow."}
                {results.overallPercentage >= 40 && results.overallPercentage < 60 && "Every relationship is a journey—you're both on the path to growth."}
                {results.overallPercentage < 40 && "Understanding where you are together is the first step forward."}
              </>
            ) : (
              // Individual language when partner hasn't completed
              <>
                {results.overallPercentage >= 80 && "You bring real strengths to your relationship."}
                {results.overallPercentage >= 60 && results.overallPercentage < 80 && "You have a solid foundation with room to grow."}
                {results.overallPercentage >= 40 && results.overallPercentage < 60 && "You're on the path to growth and self-awareness."}
                {results.overallPercentage < 40 && "Understanding yourself is the first step to a better relationship."}
              </>
            )}
          </div>

          {/* Overall Score */}
          <div className="mt-6 bg-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm mb-1">Overall Relationship Health</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">{results.overallPercentage}%</span>
                </div>
              </div>
              <div className="text-6xl">
                {results.overallPercentage >= 80 ? '🌟' :
                 results.overallPercentage >= 60 ? '💪' :
                 results.overallPercentage >= 40 ? '🌱' : '🔧'}
              </div>
            </div>
            <div className="mt-4 h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-1000"
                style={{ width: `${results.overallPercentage}%` }}
              />
            </div>

            {/* Strengths Summary */}
            {moduleResults.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {moduleResults
                  .filter(m => m.strengthLevel === 'strong')
                  .map(m => (
                    <span key={m.moduleId} className="bg-white/30 px-3 py-1 rounded-full text-sm">
                      {ASSESSMENT_MODULES.find(am => am.id === m.moduleId)?.icon} {m.title}
                    </span>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Partner Status */}
      {partnerAssessment ? (
        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-emerald-800 font-medium">{partnerName} has also completed the assessment!</p>
              <p className="text-emerald-600 text-sm">Compare your results below</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 -mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-amber-800 font-medium">These are your individual results</p>
              <p className="text-amber-600 text-sm">
                Once {partnerName} completes the assessment, you'll unlock couple comparisons and deeper insights
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Module Results */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-[#2D3648] mb-6">
          {bothCompleted ? 'Your Results by Dimension' : 'Your Individual Results'}
        </h2>

        <div className="space-y-4">
          {moduleResults.map((moduleResult, index) => {
            const moduleConfig = ASSESSMENT_MODULES.find(m => m.id === moduleResult.moduleId)
            if (!moduleConfig) return null

            const isExpanded = expandedModule === moduleResult.moduleId
            // Support both column names for partner data
            const partnerResults = partnerAssessment?.results || partnerAssessment?.module_results
            const partnerModuleResult = partnerResults?.modules?.find(
              m => m.moduleId === moduleResult.moduleId
            )

            return (
              <div
                key={moduleResult.moduleId}
                className={`bg-white rounded-2xl shadow-sm border border-[#E5E2DD] overflow-hidden transform transition-all duration-500 ${
                  animateCards
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
                style={{
                  transitionDelay: animateCards ? `${index * 100}ms` : '0ms'
                }}
              >
                {/* Module Header */}
                <button
                  onClick={() => setExpandedModule(isExpanded ? null : moduleResult.moduleId)}
                  className={`w-full p-6 text-left transition-colors ${isExpanded ? moduleConfig.bgColor : 'hover:bg-[#F8F6F3]'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${isExpanded ? 'bg-white/80' : moduleConfig.bgColor} flex items-center justify-center transition-colors`}>
                        <span className="text-2xl">{moduleConfig.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#2D3648]">{moduleResult.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStrengthBg(moduleResult.strengthLevel)} ${getStrengthColor(moduleResult.strengthLevel)}`}>
                            {getStrengthLabel(moduleResult.strengthLevel)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Circular Progress */}
                      <CircularProgress
                        percentage={moduleResult.percentage}
                        color={moduleConfig.color}
                        size={64}
                        strokeWidth={5}
                        animate={animateCards}
                      />
                      {/* Score comparison if partner has completed */}
                      {partnerModuleResult && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-[#9CA3AF]">{partnerName}</p>
                          <p className="text-sm font-medium text-[#6B7280]">{partnerModuleResult.percentage}%</p>
                        </div>
                      )}
                      <svg
                        className={`w-6 h-6 text-[#9CA3AF] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && moduleResult.insights && (
                  <div className="px-6 pb-6 border-t border-[#E5E2DD]">
                    <div className="pt-6">
                      {/* Insight headline */}
                      <h4 className="text-2xl font-bold text-[#2D3648] mb-3">
                        {moduleResult.insights.headline}
                      </h4>
                      <p className="text-[#6B7280] leading-relaxed mb-6">
                        {moduleResult.insights.description}
                      </p>

                      {/* Tips */}
                      {moduleResult.insights.tips && moduleResult.insights.tips.length > 0 && (
                        <div className="bg-[#F8F6F3] rounded-xl p-5">
                          <h5 className="font-semibold text-[#2D3648] mb-3 flex items-center gap-2">
                            <span>💡</span> Growth Tips
                          </h5>
                          <ul className="space-y-2">
                            {moduleResult.insights.tips.map((tip, tipIndex) => (
                              <li key={tipIndex} className="flex items-start gap-3">
                                <span className="text-[#E8614D] mt-1">•</span>
                                <span className="text-[#6B7280]">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Partner comparison */}
                      {partnerModuleResult && (
                        <div className="mt-6 bg-cream-100 rounded-xl p-5">
                          <h5 className="font-semibold text-[#2D3648] mb-3 flex items-center gap-2">
                            <span>👥</span> How You Compare
                          </h5>
                          <div className="flex items-center gap-6">
                            <div className="flex-1">
                              <p className="text-sm text-[#6B7280] mb-1">You</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${moduleConfig.color}`}
                                    style={{ width: `${moduleResult.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-[#2D3648]">{moduleResult.percentage}%</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-[#6B7280] mb-1">{partnerName}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-3 bg-white rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${moduleConfig.color}`}
                                    style={{ width: `${partnerModuleResult.percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-[#2D3648]">{partnerModuleResult.percentage}%</span>
                              </div>
                            </div>
                          </div>
                          {Math.abs(moduleResult.percentage - partnerModuleResult.percentage) > 20 && (
                            <p className="mt-3 text-sm text-purple-700">
                              You have different perspectives in this area—a great opportunity for understanding each other better!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/assessment')}
            className="flex-1 border-2 border-[#E8614D] text-[#E8614D] px-6 py-4 rounded-xl font-semibold hover:bg-[#FDF6EF] transition-colors"
          >
            Retake Assessment
          </button>
          <button
            onClick={() => router.push('/ai-coach')}
            className="flex-1 bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-6 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Get AI Coaching
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
