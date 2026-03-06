'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PROFILE_MODULES, PROFILE_ATTRIBUTION } from '@/lib/individual-profile-questions'

// Circular Progress Component
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

  const getGradientColors = (colorClass) => {
    const colorMap = {
      'from-indigo-500 to-indigo-500': ['#6366f1', '#5D55A0'],
      'from-coral-500 to-coral-500': ['#f43f5e', '#E8614D'],
      'from-teal-500 to-cyan-500': ['#14b8a6', '#06b6d4'],
      'from-amber-500 to-yellow-500': ['#f59e0b', '#eab308'],
      'from-coral-500 to-red-500': ['#E8614D', '#ef4444'],
    }
    return colorMap[colorClass] || ['#E8614D', '#C44A38']
  }

  const [startColor, endColor] = getGradientColors(color)
  const gradientId = `profile-progress-${color?.replace(/\s/g, '-') || 'default'}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
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

function StrengthPill({ level }) {
  const config = {
    strong:  { label: 'Strong',  bg: 'bg-[#E8F5EC]', text: 'text-[#2D7A4F]' },
    good:    { label: 'Good',    bg: 'bg-[#EEF2FF]', text: 'text-[#4F46E5]' },
    growing: { label: 'Growing', bg: 'bg-[#FEF3F1]', text: 'text-[#E8614D]' },
    needs_attention: { label: 'Needs Work', bg: 'bg-[#FEF3F1]', text: 'text-[#E8614D]' },
  }
  const { label, bg, text } = config[level] || config.growing
  return (
    <span className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${bg} ${text}`}>
      {label}
    </span>
  )
}

export default function ProfileResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedModule, setExpandedModule] = useState(null)
  const [animateCards, setAnimateCards] = useState(true)

  const checkAuth = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get user's completed assessment (single source of truth)
      const { data: profileData } = await supabase
        .from('relationship_assessments')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
      }

      setLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#E8614D] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#6B7280] text-lg">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const results = profile?.results

  if (!results) {
    return (
      <div className="min-h-screen bg-[#F8F6F3] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-7xl mb-6">🪞</div>
          <h2 className="text-3xl font-bold text-[#2D3648] mb-3">No Profile Yet</h2>
          <p className="text-[#6B7280] mb-8">Complete your individual profile to discover insights about yourself.</p>
          <button
            onClick={() => router.push('/profile/assessment')}
            className="bg-gradient-to-r from-[#E8614D] to-[#C44A38] text-white px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Start Profile
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

  const moduleResults = profile?.results?.modules || []

  return (
    <div className="min-h-screen bg-[#F8F6F3] pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-[#252048] via-[#3E3585] to-[#6B4A72] text-white py-12">
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

          <h1 className="text-4xl font-bold mb-2">Your Personal Profile</h1>
          <p className="text-white/80 text-lg">
            Completed {new Date(profile.completed_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>

          {/* Profile summary */}
          <div className="mt-4 text-white/90 text-lg">
            Understanding yourself is the foundation for healthy relationships.
          </div>

          {/* Completion badge */}
          <div className="mt-6 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/90">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[14px] font-semibold text-white/90">Profile complete</span>
          </div>
        </div>
      </div>

      {/* Module Results */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-[#2D3648] mb-6">Your Dimensions</h2>

        <div className="space-y-4">
          {moduleResults.map((moduleResult, index) => {
            const moduleConfig = PROFILE_MODULES.find(m => m.id === moduleResult.moduleId)
            if (!moduleConfig) return null

            const isExpanded = expandedModule === moduleResult.moduleId

            return (
              <div
                key={moduleResult.moduleId}
                className="bg-white rounded-2xl shadow-sm border border-[#E5E2DD] overflow-hidden"
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
                        {moduleResult.insights?.headline && (
                          <p className="text-[#6B7280] text-sm mt-1">{moduleResult.insights.headline}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StrengthPill level={moduleResult.strengthLevel} />
                      <svg
                        className={`w-5 h-5 text-[#9CA3AF] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
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
                      <p className="text-[#6B7280] leading-relaxed mb-6">
                        {moduleResult.insights.description}
                      </p>

                      {/* Strengths */}
                      {moduleResult.insights.strengths && moduleResult.insights.strengths.length > 0 && (
                        <div className="mb-6">
                          <h5 className="font-semibold text-[#2D3648] mb-3 flex items-center gap-2">
                            <span>✨</span> Your Strengths
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {moduleResult.insights.strengths.map((strength, i) => (
                              <span
                                key={i}
                                className={`px-3 py-1 rounded-full text-sm ${moduleConfig.bgColor} text-[#2D3648]`}
                              >
                                {strength}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => router.push('/ai-coach')}
            className="w-full min-h-[54px] bg-[#E8614D] text-white rounded-xl font-semibold text-[16px] active:scale-[0.98] transition-transform"
          >
            Talk to Nora about this →
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="w-full min-h-[48px] bg-white border border-neutral-200 rounded-xl font-semibold text-[15px] text-neutral-600 active:scale-[0.98] transition-transform"
          >
            Back to Profile
          </button>
          <button
            onClick={() => router.push('/profile/assessment')}
            className="w-full py-3 text-[13px] font-medium text-neutral-400"
          >
            Retake assessment
          </button>
        </div>

        {/* Attribution */}
        <p className="text-center text-[#9CA3AF] text-xs mt-12">
          {PROFILE_ATTRIBUTION}
        </p>
      </div>
    </div>
  )
}
