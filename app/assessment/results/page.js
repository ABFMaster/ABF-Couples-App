'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ASSESSMENT_MODULES, ASSESSMENT_ATTRIBUTION } from '@/lib/relationship-questions'

export default function AssessmentResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [couple, setCouple] = useState(null)
  const [assessment, setAssessment] = useState(null)
  const [partnerAssessment, setPartnerAssessment] = useState(null)
  const [partnerName, setPartnerName] = useState('Partner')
  const [expandedModule, setExpandedModule] = useState(null)

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

        const partnerId = coupleData.user1_id === user.id ? coupleData.user2_id : coupleData.user1_id

        // Get partner name
        if (partnerId) {
          const { data: partnerProfile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', partnerId)
            .single()

          setPartnerName(partnerProfile?.first_name || 'Partner')

          // Get partner's assessment
          const { data: partnerData } = await supabase
            .from('relationship_assessments')
            .select('*')
            .eq('user_id', partnerId)
            .eq('couple_id', coupleData.id)
            .not('completed_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

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
          .single()

        if (assessmentData) {
          setAssessment(assessmentData)
        } else {
          // No completed assessment, redirect to start
          router.push('/assessment')
          return
        }
      }

      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
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
        return 'text-rose-600'
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
        return 'bg-rose-100'
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
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B9D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg">Loading your results...</p>
        </div>
      </div>
    )
  }

  if (!assessment?.results) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-7xl mb-6">📋</div>
          <h2 className="text-3xl font-bold text-[#2D3648] mb-3">No Results Yet</h2>
          <p className="text-[#6B7280] mb-8">Complete the relationship assessment to see your personalized insights.</p>
          <button
            onClick={() => router.push('/assessment')}
            className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Start Assessment
          </button>
        </div>
      </div>
    )
  }

  const { results } = assessment
  const moduleResults = results.modules || []

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white py-12">
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

          <h1 className="text-4xl font-bold mb-2">Your Relationship Insights</h1>
          <p className="text-white/80 text-lg">
            Completed {new Date(assessment.completed_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>

          {/* Overall Score */}
          <div className="mt-8 bg-white/20 rounded-2xl p-6 backdrop-blur-sm">
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
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-amber-800 font-medium">Waiting for {partnerName}</p>
              <p className="text-amber-600 text-sm">Invite them to complete the assessment to compare results</p>
            </div>
          </div>
        </div>
      )}

      {/* Module Results */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-[#2D3648] mb-6">Your Results by Dimension</h2>

        <div className="space-y-4">
          {moduleResults.map((moduleResult, index) => {
            const moduleConfig = ASSESSMENT_MODULES.find(m => m.id === moduleResult.moduleId)
            if (!moduleConfig) return null

            const isExpanded = expandedModule === moduleResult.moduleId
            const partnerModuleResult = partnerAssessment?.results?.modules?.find(
              m => m.moduleId === moduleResult.moduleId
            )

            return (
              <div
                key={moduleResult.moduleId}
                className="bg-white rounded-2xl shadow-sm border border-[#E5E2DD] overflow-hidden"
              >
                {/* Module Header */}
                <button
                  onClick={() => setExpandedModule(isExpanded ? null : moduleResult.moduleId)}
                  className="w-full p-6 text-left hover:bg-[#F8F6F3] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${moduleConfig.bgColor} flex items-center justify-center`}>
                        <span className="text-2xl">{moduleConfig.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#2D3648]">{moduleResult.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStrengthBg(moduleResult.strengthLevel)} ${getStrengthColor(moduleResult.strengthLevel)}`}>
                            {getStrengthLabel(moduleResult.strengthLevel)}
                          </span>
                          <span className="text-[#6B7280] text-sm">{moduleResult.percentage}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Score comparison if partner has completed */}
                      {partnerModuleResult && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-[#9CA3AF]">{partnerName}</p>
                          <p className="text-sm font-medium text-[#6B7280]">{partnerModuleResult.percentage}%</p>
                        </div>
                      )}
                      <svg
                        className={`w-6 h-6 text-[#9CA3AF] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 h-2 bg-[#F8F6F3] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${moduleConfig.color} transition-all duration-500`}
                      style={{ width: `${moduleResult.percentage}%` }}
                    />
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
                                <span className="text-[#FF6B9D] mt-1">•</span>
                                <span className="text-[#6B7280]">{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Partner comparison */}
                      {partnerModuleResult && (
                        <div className="mt-6 bg-purple-50 rounded-xl p-5">
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
            className="flex-1 border-2 border-[#FF6B9D] text-[#FF6B9D] px-6 py-4 rounded-xl font-semibold hover:bg-[#FFF4F8] transition-colors"
          >
            Retake Assessment
          </button>
          <button
            onClick={() => router.push('/ai-coach')}
            className="flex-1 bg-gradient-to-r from-[#FF6B9D] to-[#C9184A] text-white px-6 py-4 rounded-xl font-semibold hover:opacity-90 transition-opacity"
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
